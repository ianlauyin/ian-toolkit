use axum::extract::Query;
use axum::response::Response;
use serde::Deserialize;

use crate::router::shown_result::shown_result;

#[derive(Deserialize)]
pub(super) struct ProgressRequest {
    chat: String,
}

pub(super) async fn progress(Query(request): Query<ProgressRequest>) -> Response {
    shown_result(crate::open_behaviour::progress(&request.chat))
}
