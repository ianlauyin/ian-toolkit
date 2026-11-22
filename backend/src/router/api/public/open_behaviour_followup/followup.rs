use axum::Json;
use axum::response::Response;
use serde::Deserialize;

use crate::router::shown_result::shown_result;

#[derive(Deserialize)]
pub(super) struct FollowupRequest {
    chat: String,
    text: String,
}

pub(super) async fn followup(Json(request): Json<FollowupRequest>) -> Response {
    shown_result(crate::open_behaviour::followup(
        &request.chat,
        &request.text,
    ))
}
