use axum::Router;
use axum::routing::get;

use crate::router::api::public::open_behaviour_progress::progress::progress;
use crate::router::state::AppState;

mod progress;

pub(super) fn router() -> Router<AppState> {
    Router::new().route("/open-behaviour-progress", get(progress))
}
