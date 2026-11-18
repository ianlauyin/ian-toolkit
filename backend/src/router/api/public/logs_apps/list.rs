use std::path::Path;

use axum::Json;
use serde::Serialize;

use crate::logs::CONFIG_FILE;
use crate::logs::read_config;
use crate::open_behaviour::ResolveError;

#[derive(Serialize)]
pub(super) struct LogApp {
    id: String,
    name: String,
}

#[derive(Serialize)]
pub(super) struct LogServer {
    id: String,
    name: String,
    apps: Vec<LogApp>,
}

pub(super) async fn list() -> Result<Json<Vec<LogServer>>, ResolveError> {
    let config = read_config(Path::new(CONFIG_FILE)).map_err(ResolveError::Failed)?;
    Ok(Json(
        config
            .servers
            .into_iter()
            .map(|server| LogServer {
                id: server.name.clone(),
                name: server.name,
                apps: server
                    .apps
                    .into_iter()
                    .map(|(id, _)| LogApp {
                        name: id.clone(),
                        id,
                    })
                    .collect(),
            })
            .collect(),
    ))
}
