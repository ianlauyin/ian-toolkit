use std::path::Path;

use axum::Json;
use serde::Deserialize;

use crate::notes::task_prompt;
use crate::open_behaviour::PROJECTS_FILE;
use crate::open_behaviour::ResolveError;
use crate::open_behaviour::ResolveStart;
use crate::open_behaviour::project_root;
use crate::open_behaviour::read_projects;
use crate::open_behaviour::start_agent;

#[derive(Deserialize)]
pub(super) struct AssignRequest {
    tab: String,
    text: String,
}

pub(super) async fn assign(
    Json(request): Json<AssignRequest>,
) -> Result<Json<ResolveStart>, ResolveError> {
    let bad = |msg: &str| ResolveError::BadItem(msg.to_string());
    let home = std::env::var("HOME").unwrap_or_default();
    let text = request.text.trim();
    if text.is_empty() {
        return Err(bad("The note has no text."));
    }
    let projects = read_projects(Path::new(PROJECTS_FILE)).map_err(ResolveError::Failed)?;
    let root = projects
        .get(&request.tab)
        .and_then(|project| project_root(project, &home))
        .ok_or_else(|| bad("Unknown project."))?;
    let chat = start_agent(&root, &task_prompt(&request.tab, &root, text))
        .map_err(ResolveError::Failed)?;
    Ok(Json(ResolveStart::new(chat)))
}
