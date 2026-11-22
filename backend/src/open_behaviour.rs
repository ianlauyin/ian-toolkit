use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::{Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::{Map, Value, json};
use tokio::process::Command;

use ian_framework_rs::exception;
use ian_framework_rs::exception::Exception;
use ian_framework_rs::http::error_code;
use ian_framework_rs::mutex;

use crate::env::LOG_DIR;

static LOCAL_LOCK: Mutex<()> = Mutex::new(());

const TOOL_DETAILS: [&str; 6] = ["command", "path", "pattern", "globPattern", "query", "url"];
const LOCAL_BIN: &str = "cursor-agent";
const LOCAL_MODEL: &str = "claude-sonnet-5-5-medium";
const GROK_MODEL: &str = "grok-4.7-high";
pub(crate) const GROK_START: &str = "The local agent failed. A local Grok agent takes over now.";
const FOLLOWUP_MARK: &str = "\"type\":\"followup\"";

#[derive(Serialize)]
pub(crate) struct ResolveStart {
    chat: String,
}

impl ResolveStart {
    pub(crate) fn new(chat: String) -> Self {
        Self { chat }
    }
}

#[derive(Serialize, Debug, PartialEq)]
pub(crate) struct Progress {
    pub(crate) status: &'static str,
    pub(crate) steps: Vec<Step>,
}

#[derive(Serialize, Debug, PartialEq)]
pub(crate) struct Step {
    pub(crate) kind: &'static str,
    pub(crate) text: String,
}

pub(crate) fn local_lock() -> MutexGuard<'static, ()> {
    mutex::lock(&LOCAL_LOCK)
}

pub(crate) fn progress(chat: &str) -> Result<Progress, Exception> {
    if !valid_chat(chat) {
        return Err(exception!(code = error_code::BAD_REQUEST, "Bad chat id."));
    }
    let path = Path::new(LOG_DIR).join(format!("{chat}.log"));
    if !path.is_file() {
        return Err(exception!(
            code = error_code::BAD_REQUEST,
            "The chat has no log."
        ));
    }
    Ok(read_progress(&read_log(&path)))
}

pub(crate) fn followup(chat: &str, text: &str) -> Result<Progress, Exception> {
    if !valid_chat(chat) {
        return Err(exception!(code = error_code::BAD_REQUEST, "Bad chat id."));
    }
    let text = text.trim();
    if text.is_empty() {
        return Err(exception!(
            code = error_code::BAD_REQUEST,
            "The follow-up has no text."
        ));
    }
    let path = Path::new(LOG_DIR).join(format!("{chat}.log"));
    if !path.is_file() {
        return Err(exception!(
            code = error_code::BAD_REQUEST,
            "The chat has no log."
        ));
    }
    followup_local(&path, text)?;
    Ok(read_progress(&read_log(&path)))
}

pub(crate) fn followup_line(text: &str) -> String {
    json!({ "type": "followup", "text": text }).to_string()
}

pub(crate) fn followup_local(log_path: &Path, text: &str) -> Result<(), Exception> {
    let _guard = local_lock();
    let log = read_log(log_path);
    if !log_has_end(last_run(&log)) {
        return Err(exception!(
            code = error_code::BAD_REQUEST,
            "The agent is still working."
        ));
    }
    let session = local_session(&log).ok_or_else(|| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            "The local agent has no session."
        )
    })?;
    let model = if log.contains(GROK_START) {
        GROK_MODEL
    } else {
        LOCAL_MODEL
    };
    let root_path = log_path.with_extension("root");
    let root = fs::read_to_string(&root_path).map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to read {}: {e}", root_path.display())
        )
    })?;
    append_line(log_path, &followup_line(text))?;
    if let Err(error) = spawn_local(
        text,
        Path::new(root.trim()),
        log_path,
        model,
        Some(&session),
        false,
    ) {
        append_line(log_path, error.message())?;
        append_end(log_path, &failed_end("The follow-up failed."))?;
    }
    Ok(())
}

pub(crate) fn local_session(log: &str) -> Option<String> {
    let agent_log = log.rsplit_once(GROK_START).map_or(log, |(_, rest)| rest);
    agent_log
        .lines()
        .filter_map(|line| serde_json::from_str::<Value>(line).ok())
        .filter_map(|event| event["session_id"].as_str().map(str::to_string))
        .rfind(|id| valid_chat(id))
}

pub(crate) fn start_agent(root: &Path, prompt: &str) -> Result<String, Exception> {
    let chat = new_chat()?;
    fs::create_dir_all(LOG_DIR).map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to create {LOG_DIR}: {e}")
        )
    })?;
    let log_path = Path::new(LOG_DIR).join(format!("{chat}.log"));
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&log_path)
        .map_err(|e| {
            exception!(
                code = error_code::INTERNAL_ERROR,
                format!("failed to create {}: {e}", log_path.display())
            )
        })?;
    let prompt_path = log_path.with_extension("prompt");
    fs::write(&prompt_path, prompt).map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to create {}: {e}", prompt_path.display())
        )
    })?;
    let root_path = log_path.with_extension("root");
    fs::write(&root_path, root.to_string_lossy().as_bytes()).map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to create {}: {e}", root_path.display())
        )
    })?;
    if let Err(error) = spawn_local(prompt, root, &log_path, LOCAL_MODEL, None, true) {
        append_line(&log_path, error.message())?;
        if !start_local(&log_path, GROK_START, GROK_MODEL) {
            return Err(error);
        }
    }
    Ok(chat)
}

pub(crate) fn valid_chat(chat: &str) -> bool {
    !chat.is_empty() && chat.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

pub(crate) fn start_grok_after_fail(log_path: &Path) {
    let log = read_log(log_path);
    if !log.contains(FOLLOWUP_MARK)
        && local_failed(last_run(&log))
        && !start_local(log_path, GROK_START, GROK_MODEL)
    {
        let _ = append_end(log_path, &failed_end("The agent failed."));
    }
}

pub(crate) fn local_failed(run: &str) -> bool {
    for event in run
        .lines()
        .filter_map(|line| serde_json::from_str::<Value>(line).ok())
    {
        match event["type"].as_str() {
            Some("result") => return event["is_error"] == true,
            Some("exit") => return event["code"].as_i64().is_some_and(|code| code != 0),
            _ => {}
        }
    }
    false
}

pub(crate) fn read_log(path: &Path) -> String {
    fs::read_to_string(path).unwrap_or_default()
}

pub(crate) fn log_has_end(log: &str) -> bool {
    log.contains("\"type\":\"result\"")
        || log.contains("\"type\": \"result\"")
        || log.contains("\"type\":\"exit\"")
        || log.contains("\"type\": \"exit\"")
}

pub(crate) fn last_run(log: &str) -> &str {
    let starts = [FOLLOWUP_MARK, GROK_START];
    match starts.iter().filter_map(|start| log.rfind(start)).max() {
        Some(at) => log[at..].split_once('\n').map_or("", |(_, rest)| rest),
        None => log,
    }
}

pub(crate) fn read_progress(log: &str) -> Progress {
    let mut status = "running";
    let mut steps = Vec::new();
    let mut waits_grok = true;
    let mut local_failed = false;
    for line in log.lines().map(str::trim).filter(|line| !line.is_empty()) {
        if line == GROK_START {
            status = "running";
            waits_grok = false;
            local_failed = false;
        }
        let Ok(event) = serde_json::from_str::<Value>(line) else {
            steps.push(Step {
                kind: "output",
                text: line.to_string(),
            });
            continue;
        };
        match (event["type"].as_str(), event["subtype"].as_str()) {
            (Some("assistant"), _) => {
                let text = message_text(&event);
                if !text.is_empty() {
                    steps.push(Step {
                        kind: "message",
                        text,
                    });
                }
            }
            (Some("tool_call"), Some("started")) => steps.push(Step {
                kind: "tool",
                text: tool_text(&event["tool_call"]),
            }),
            (Some("followup"), _) => {
                status = "running";
                waits_grok = false;
                steps.push(Step {
                    kind: "reply",
                    text: event["text"].as_str().unwrap_or("").to_string(),
                });
            }
            (Some("result"), _) if event["is_error"] == true => {
                if waits_grok {
                    local_failed = true;
                } else {
                    status = "failed";
                }
                if let Some(text) = event["result"].as_str() {
                    steps.push(Step {
                        kind: "output",
                        text: text.to_string(),
                    });
                }
            }
            (Some("result"), _) => status = "finished",
            (Some("exit"), _) if status == "running" => {
                let error_code = event["code"].as_i64().is_some_and(|code| code != 0);
                if !(waits_grok && (local_failed || error_code)) {
                    status = "stopped";
                }
            }
            _ => {}
        }
    }
    Progress { status, steps }
}

pub(crate) fn read_projects(projects_file: &Path) -> Result<Map<String, Value>, Exception> {
    let name = projects_file.display();
    let text = fs::read_to_string(projects_file).map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to read {name}: {e}")
        )
    })?;
    serde_json::from_str(&text).map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to parse {name}: {e}")
        )
    })
}

pub(crate) fn project_root(project: &Value, root: &Path) -> Option<PathBuf> {
    Some(root.join(project["path"].as_str()?))
}

fn failed_end(text: &str) -> String {
    json!({ "type": "result", "is_error": true, "result": text }).to_string()
}

fn new_chat() -> Result<String, Exception> {
    let time = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to read the time: {e}")
        )
    })?;
    Ok(format!("local-{}", time.as_nanos()))
}

fn start_local(log_path: &Path, start: &str, model: &str) -> bool {
    let _guard = local_lock();
    if read_log(log_path).contains(start) {
        return true;
    }
    if append_line(log_path, start).is_err() {
        return false;
    }
    let Ok(prompt) = fs::read_to_string(log_path.with_extension("prompt")) else {
        return false;
    };
    let Ok(root) = fs::read_to_string(log_path.with_extension("root")) else {
        return false;
    };
    match spawn_local(
        &prompt,
        Path::new(root.trim()),
        log_path,
        model,
        None,
        false,
    ) {
        Ok(()) => true,
        Err(error) => {
            let _ = append_line(log_path, error.message());
            false
        }
    }
}

fn spawn_local(
    prompt: &str,
    root: &Path,
    log_path: &Path,
    model: &str,
    session: Option<&str>,
    fallback: bool,
) -> Result<(), Exception> {
    let root = fs::canonicalize(root).map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to open {}: {e}", root.display())
        )
    })?;
    let log = fs::OpenOptions::new()
        .append(true)
        .open(log_path)
        .map_err(|e| {
            exception!(
                code = error_code::INTERNAL_ERROR,
                format!("failed to open {}: {e}", log_path.display())
            )
        })?;
    let err_log = log.try_clone().map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to open {}: {e}", log_path.display())
        )
    })?;
    let mut command = Command::new(LOCAL_BIN);
    command
        .args([
            "--print",
            "--output-format",
            "stream-json",
            "--force",
            "--trust",
            "--model",
            model,
            "--workspace",
        ])
        .arg(&root);
    if let Some(session) = session {
        command.args(["--resume", session]);
    }
    let mut child = command
        .arg(prompt)
        .current_dir(&root)
        .stdin(Stdio::null())
        .stdout(log)
        .stderr(err_log)
        .process_group(0)
        .spawn()
        .map_err(|e| {
            exception!(
                code = error_code::INTERNAL_ERROR,
                format!("failed to start {LOCAL_BIN}: {e}")
            )
        })?;
    let log_path = log_path.to_path_buf();
    tokio::spawn(async move {
        let code = child.wait().await.ok().and_then(|status| status.code());
        let _ = append_line(
            &log_path,
            &json!({ "type": "exit", "code": code }).to_string(),
        );
        if fallback {
            start_grok_after_fail(&log_path);
        }
    });
    Ok(())
}

fn append_end(path: &Path, line: &str) -> Result<(), Exception> {
    if log_has_end(last_run(&read_log(path))) {
        return Ok(());
    }
    append_line(path, line)
}

fn append_line(path: &Path, line: &str) -> Result<(), Exception> {
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|e| {
            exception!(
                code = error_code::INTERNAL_ERROR,
                format!("failed to open {}: {e}", path.display())
            )
        })?;
    writeln!(file, "{line}").map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to write {}: {e}", path.display())
        )
    })
}

fn message_text(event: &Value) -> String {
    let blocks = event["message"]["content"].as_array().into_iter().flatten();
    let texts: Vec<&str> = blocks
        .filter(|block| block["type"] == "text")
        .filter_map(|block| block["text"].as_str())
        .collect();
    texts.concat().trim().to_string()
}

fn tool_text(call: &Value) -> String {
    let tool = call
        .as_object()
        .and_then(|call| call.iter().find(|(key, _)| key.ends_with("ToolCall")));
    let Some((key, tool)) = tool else {
        return call["function"]["name"]
            .as_str()
            .unwrap_or("tool")
            .to_string();
    };
    let name = key.trim_end_matches("ToolCall");
    match TOOL_DETAILS
        .iter()
        .find_map(|field| tool["args"][*field].as_str())
    {
        Some(detail) => format!("{name}: {detail}"),
        None => name.to_string(),
    }
}
