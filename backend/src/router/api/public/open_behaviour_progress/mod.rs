mod progress;

use axum::Router;
use axum::routing::get;

use crate::router::api::public::open_behaviour_progress::progress::progress;
use crate::router::state::AppState;

pub(super) fn open_behaviour_progress() -> Router<AppState> {
    Router::new().route("/open-behaviour-progress", get(progress))
}
