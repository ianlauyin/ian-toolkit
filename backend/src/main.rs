mod db;
mod env;
mod notes;
mod open_behaviour;
pub(crate) mod router;

#[cfg(test)]
mod tests;

use std::sync::Arc;

use tokio::net::TcpListener;

use ian_framework_rs::exception;
use ian_framework_rs::exception::Exception;
use ian_framework_rs::http::error_code;

use crate::db::Db;
use crate::env::DATA_DIR;
use crate::router::state::AppState;

const ADDR: &str = "127.0.0.1:47322";

#[tokio::main]
async fn main() -> Result<(), Exception> {
    std::fs::create_dir_all(DATA_DIR).map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to create {DATA_DIR}: {e}")
        )
    })?;
    let db = Db::open(&format!("{DATA_DIR}/app.db"))?;
    let listener = TcpListener::bind(ADDR).await.map_err(|e| {
        exception!(
            code = error_code::INTERNAL_ERROR,
            format!("failed to bind {ADDR}: {e}")
        )
    })?;
    println!("listening on http://{ADDR}");
    axum::serve(listener, router::router(AppState { db: Arc::new(db) }))
        .await
        .map_err(|e| {
            exception!(
                code = error_code::INTERNAL_ERROR,
                format!("server failed: {e}")
            )
        })
}
