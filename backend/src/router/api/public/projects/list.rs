use std::path::Path;

use axum::Json;
use serde::Serialize;

use crate::open_behaviour::PROJECTS_FILE;
use crate::open_behaviour::ResolveError;
use crate::open_behaviour::read_projects;

#[derive(Serialize)]
pub(super) struct Project {
    id: String,
    name: String,
}

pub(super) async fn list() -> Result<Json<Vec<Project>>, ResolveError> {
    let projects = read_projects(Path::new(PROJECTS_FILE)).map_err(ResolveError::Failed)?;
    Ok(Json(
        projects
            .keys()
            .map(|id| Project {
                id: id.clone(),
                name: id.clone(),
            })
            .collect(),
    ))
}
