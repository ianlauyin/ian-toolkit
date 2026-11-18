use axum::Router;
use axum::routing::get;

use crate::router::api::public::projects::list::list;
use crate::router::state::AppState;

mod list;

pub(super) fn router() -> Router<AppState> {
    Router::new().route("/projects", get(list))
}
