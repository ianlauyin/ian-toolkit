use axum::Router;
use axum::routing::get;

use crate::router::api::public::logs_apps::list::list;
use crate::router::state::AppState;

mod list;

pub(super) fn router() -> Router<AppState> {
    Router::new().route("/logs-apps", get(list))
}
