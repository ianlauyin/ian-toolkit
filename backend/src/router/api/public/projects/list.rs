use std::path::Path;

use axum::response::Response;
use serde::Serialize;

use crate::env::PROJECTS_FILE;
use crate::open_behaviour::read_projects;
use crate::router::shown_result::shown_result;

#[derive(Serialize)]
pub(super) struct Project {
    id: String,
    name: String,
}

pub(super) async fn list() -> Response {
    shown_result(read_projects(Path::new(PROJECTS_FILE)).map(|projects| {
        projects
            .keys()
            .map(|id| Project {
                id: id.clone(),
                name: id.clone(),
            })
            .collect::<Vec<_>>()
    }))
}
