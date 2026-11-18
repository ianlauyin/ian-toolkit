use std::path::Path;
use std::sync::Arc;

use tokio::net::TcpListener;

use crate::db::Db;
use crate::router::state::AppState;

mod db;
mod logs;
mod notes;
mod open_behaviour;
pub(crate) mod router;

#[cfg(test)]
mod test;

const ADDR: &str = "127.0.0.1:47322";
const DATA_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/data");

#[tokio::main]
async fn main() -> Result<(), String> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("..");
    std::env::set_current_dir(&root).map_err(|e| format!("failed to open the repo folder: {e}"))?;
    std::fs::create_dir_all(DATA_DIR).map_err(|e| format!("failed to create {DATA_DIR}: {e}"))?;
    let db = Db::open(&format!("{DATA_DIR}/app.db"))?;
    let listener = TcpListener::bind(ADDR)
        .await
        .map_err(|e| format!("failed to bind {ADDR}: {e}"))?;
    println!("listening on http://{ADDR}");
    axum::serve(listener, router::router(AppState { db: Arc::new(db) }))
        .await
        .map_err(|e| format!("server failed: {e}"))
}
