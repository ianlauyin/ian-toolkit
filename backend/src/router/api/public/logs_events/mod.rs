use axum::Router;
use axum::routing::get;

use crate::router::api::public::logs_events::load::load;
use crate::router::state::AppState;

mod load;

pub(super) fn router() -> Router<AppState> {
    Router::new().route("/logs-events", get(load))
}
