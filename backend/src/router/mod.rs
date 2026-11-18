use axum::Router;
use axum::middleware::from_fn;
use ian_framework_rs::http::middleware;
use ian_framework_rs::http::router::health_router;
use ian_framework_rs::http::router::spa_router;
use ian_framework_rs::http::router::version_router;

use crate::router::json_message::json_message;
use crate::router::state::AppState;

pub(crate) mod api;
mod json_message;
pub(crate) mod state;

pub(crate) fn router(state: AppState) -> Router {
    Router::new()
        .nest("/api", api::router(state))
        .merge(spa_router().layer(from_fn(middleware::security_headers)))
        .merge(version_router())
        .merge(health_router())
        .layer(axum::middleware::map_response(json_message))
}
