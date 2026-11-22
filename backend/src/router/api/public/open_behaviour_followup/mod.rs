mod followup;

use axum::Router;
use axum::routing::post;

use crate::router::api::public::open_behaviour_followup::followup::followup;
use crate::router::state::AppState;

pub(super) fn open_behaviour_followup() -> Router<AppState> {
    Router::new().route("/open-behaviour-followup", post(followup))
}
