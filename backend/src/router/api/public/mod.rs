pub(crate) mod page;
mod projects;

use axum::Router;

use crate::router::state::AppState;

pub(super) fn public() -> Router<AppState> {
    Router::new()
        .merge(page::page())
        .merge(projects::projects())
}
