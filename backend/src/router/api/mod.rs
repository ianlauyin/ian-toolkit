use axum::Router;
use axum::middleware::from_fn;
use ian_framework_rs::http::middleware;

use crate::router::state::AppState;

pub(crate) mod public;

pub(super) fn router(state: AppState) -> Router {
    Router::new()
        .merge(public::router())
        .layer(from_fn(middleware::require_same_origin))
        .layer(from_fn(middleware::no_store))
        .layer(from_fn(middleware::security_headers))
        .with_state(state)
}
