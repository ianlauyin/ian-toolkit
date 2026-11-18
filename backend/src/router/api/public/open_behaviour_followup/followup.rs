use axum::Json;
use serde::Deserialize;

use crate::open_behaviour::Progress;
use crate::open_behaviour::ResolveError;

#[derive(Deserialize)]
pub(super) struct FollowupRequest {
    chat: String,
    text: String,
}

pub(super) async fn followup(
    Json(request): Json<FollowupRequest>,
) -> Result<Json<Progress>, ResolveError> {
    crate::open_behaviour::followup(&request.chat, &request.text).map(Json)
}
