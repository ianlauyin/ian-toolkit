use std::path::Path;
use std::process::Stdio;

use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

pub(crate) const CONFIG_FILE: &str =
    concat!(env!("CARGO_MANIFEST_DIR"), "/../conf/log-server.json");
pub(crate) const ENV_FILE: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../.env");
pub(crate) const PAGE_SIZES: [usize; 4] = [50, 100, 500, 1000];
pub(crate) const DAY_LIMIT: usize = 1000;
const FETCH_SECONDS: &str = "20";

#[derive(Deserialize)]
pub(crate) struct Filter {
    pub(crate) field: String,
    pub(crate) value: String,
}

#[derive(Serialize, Debug, PartialEq)]
pub(crate) struct LogsPage {
    page: usize,
    page_size: usize,
    pub(crate) total: usize,
    pub(crate) events: Vec<Value>,
}

pub(crate) struct Config {
    pub(crate) servers: Vec<Server>,
}

pub(crate) struct Server {
    pub(crate) name: String,
    pub(crate) base_url: String,
    pub(crate) key_name: String,
    pub(crate) apps: Vec<(String, String)>,
}

pub(crate) fn valid_date(date: &str) -> bool {
    date.len() == 10
        && date.char_indices().all(|(i, c)| {
            if i == 4 || i == 7 {
                c == '-'
            } else {
                c.is_ascii_digit()
            }
        })
}

pub(crate) fn read_config(path: &Path) -> Result<Config, String> {
    let text = std::fs::read_to_string(path)
        .map_err(|e| format!("failed to read conf/log-server.json: {e}"))?;
    let json: Value = serde_json::from_str(&text)
        .map_err(|e| format!("failed to parse conf/log-server.json: {e}"))?;
    let map = json
        .as_object()
        .ok_or("conf/log-server.json is not an object")?;
    let mut servers = Vec::new();
    for (name, value) in map {
        let entry = value
            .as_object()
            .ok_or_else(|| format!("{name} in conf/log-server.json is not an object"))?;
        let text_field = |key: &str| -> Result<String, String> {
            entry
                .get(key)
                .and_then(Value::as_str)
                .map(str::to_string)
                .ok_or_else(|| format!("{name} in conf/log-server.json has no {key}"))
        };
        let key_name = text_field("api_key")?
            .strip_prefix("env:")
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .ok_or_else(|| format!("api_key of {name} in conf/log-server.json is not env:NAME"))?;
        let apps = entry
            .get("apps")
            .and_then(Value::as_object)
            .ok_or_else(|| format!("{name} in conf/log-server.json has no apps"))?;
        let apps = apps
            .iter()
            .filter_map(|(id, app_name)| Some((id.clone(), app_name.as_str()?.to_string())))
            .collect();
        servers.push(Server {
            name: name.clone(),
            base_url: text_field("base_url")?,
            key_name,
            apps,
        });
    }
    Ok(Config { servers })
}

pub(crate) fn read_env_value(path: &Path, name: &str) -> Result<String, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("failed to read .env: {e}"))?;
    let value = text.lines().find_map(|line| {
        let line = line.trim().trim_start_matches("export ").trim_start();
        let value = line.strip_prefix(name)?.trim_start().strip_prefix('=')?;
        Some(value.trim().trim_matches(['"', '\'']).to_string())
    });
    value
        .filter(|v| !v.is_empty())
        .ok_or_else(|| format!("{name} has no value in .env"))
}

pub(crate) fn fetch_command(url: &str) -> std::process::Command {
    let mut command = std::process::Command::new("curl");
    command.args([
        "-sS",
        "--max-time",
        FETCH_SECONDS,
        "-H",
        "@-",
        "-w",
        "\n%{http_code}",
        url,
    ]);
    command
}

pub(crate) async fn fetch(url: &str, key: &str) -> Result<String, String> {
    let mut child = Command::from(fetch_command(url))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to start curl: {e}"))?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(format!("Authorization: Bearer {key}\n").as_bytes())
            .await
            .map_err(|e| format!("failed to send the key to curl: {e}"))?;
    }
    let out = child
        .wait_with_output()
        .await
        .map_err(|e| format!("curl failed: {e}"))?;
    if !out.status.success() {
        return Err(format!(
            "failed to reach the log server: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let (body, status) = text
        .rsplit_once('\n')
        .ok_or("the log server gave no status")?;
    match status {
        "200" => Ok(body.to_string()),
        "401" => Err("The log server key is not correct.".to_string()),
        "403" => Err("The log server key cannot read this app.".to_string()),
        _ => Err(format!("The log server returned {status}: {}", body.trim())),
    }
}

pub(crate) fn parse_events(body: &str) -> Result<Vec<Value>, String> {
    let json: Value = serde_json::from_str(body)
        .map_err(|e| format!("failed to parse the log server response: {e}"))?;
    json["events"]
        .as_array()
        .cloned()
        .ok_or_else(|| "the log server response has no events".to_string())
}

pub(crate) fn page_of(
    mut events: Vec<Value>,
    filters: &[Filter],
    page: usize,
    page_size: usize,
) -> LogsPage {
    events.retain(|event| filters.iter().all(|filter| matches(event, filter)));
    let total = events.len();
    let events = events
        .into_iter()
        .skip((page - 1) * page_size)
        .take(page_size)
        .collect();
    LogsPage {
        page,
        page_size,
        total,
        events,
    }
}

fn matches(event: &Value, filter: &Filter) -> bool {
    match_path(event, &filter.field, &filter.value)
}

fn match_path(value: &Value, path: &str, expected: &str) -> bool {
    if path.is_empty() {
        return match value {
            Value::Null => false,
            Value::String(text) => text == expected,
            other => {
                let text = other.to_string();
                text == expected
            }
        };
    }
    let parsed;
    let value = match value {
        Value::String(text) => match serde_json::from_str(text) {
            Ok(json) => {
                parsed = json;
                &parsed
            }
            Err(_) => return false,
        },
        other => other,
    };
    let Value::Object(map) = value else {
        return false;
    };
    map.iter().any(|(key, child)| {
        if path == key {
            return match_path(child, "", expected);
        }
        path.strip_prefix(key.as_str())
            .and_then(|rest| rest.strip_prefix('.'))
            .is_some_and(|rest| match_path(child, rest, expected))
    })
}
