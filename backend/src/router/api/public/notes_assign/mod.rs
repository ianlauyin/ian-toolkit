mod assign;

use axum::Router;
use axum::routing::post;

use crate::router::api::public::notes_assign::assign::assign;
use crate::router::state::AppState;

pub(super) fn notes_assign() -> Router<AppState> {
    Router::new().route("/notes-assign", post(assign))
}
