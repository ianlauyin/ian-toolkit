use axum::Router;
use axum::routing::post;

use crate::router::api::public::open_behaviour_followup::followup::followup;
use crate::router::state::AppState;

mod followup;

pub(super) fn router() -> Router<AppState> {
    Router::new().route("/open-behaviour-followup", post(followup))
}
