use std::path::Path;

use axum::Json;
use axum::response::Response;
use serde::Deserialize;

use ian_framework_rs::exception;
use ian_framework_rs::exception::Exception;
use ian_framework_rs::http::error_code;

use crate::env::PROJECTS_FILE;
use crate::env::REPO_ROOT;
use crate::notes::task_prompt;
use crate::open_behaviour::ResolveStart;
use crate::open_behaviour::project_root;
use crate::open_behaviour::read_projects;
use crate::open_behaviour::start_agent;
use crate::router::shown_result::shown_result;

#[derive(Deserialize)]
pub(super) struct AssignRequest {
    tab: String,
    text: String,
}

pub(super) async fn assign(Json(request): Json<AssignRequest>) -> Response {
    shown_result(start(&request))
}

fn start(request: &AssignRequest) -> Result<ResolveStart, Exception> {
    let text = request.text.trim();
    if text.is_empty() {
        return Err(exception!(
            code = error_code::BAD_REQUEST,
            "The note has no text."
        ));
    }
    let projects = read_projects(Path::new(PROJECTS_FILE))?;
    let root = projects
        .get(&request.tab)
        .and_then(|project| project_root(project, Path::new(REPO_ROOT)))
        .ok_or_else(|| exception!(code = error_code::BAD_REQUEST, "Unknown project."))?;
    let chat = start_agent(&root, &task_prompt(&request.tab, &root, text))?;
    Ok(ResolveStart::new(chat))
}
