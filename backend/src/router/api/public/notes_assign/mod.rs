use axum::Router;
use axum::routing::post;

use crate::router::api::public::notes_assign::assign::assign;
use crate::router::state::AppState;

mod assign;

pub(super) fn router() -> Router<AppState> {
    Router::new().route("/notes-assign", post(assign))
}
