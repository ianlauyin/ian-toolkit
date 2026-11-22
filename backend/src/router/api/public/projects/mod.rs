mod list;

use axum::Router;
use axum::routing::get;

use crate::router::api::public::projects::list::list;
use crate::router::state::AppState;

pub(super) fn projects() -> Router<AppState> {
    Router::new().route("/projects", get(list))
}
