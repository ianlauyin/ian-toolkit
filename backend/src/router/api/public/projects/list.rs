use std::fs;
use std::path::Path;

use axum::response::Response;
use serde::Serialize;
use serde_json::{Map, Value};

use ian_framework_rs::exception;
use ian_framework_rs::exception::Exception;
use ian_framework_rs::http::error_code;

use crate::env::PROJECTS_FILE;
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

fn read_projects(projects_file: &Path) -> Result<Map<String, Value>, Exception> {
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
