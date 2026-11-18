use axum::Json;
use axum::extract::Query;
use serde::Deserialize;

use crate::open_behaviour::Progress;
use crate::open_behaviour::ResolveError;

#[derive(Deserialize)]
pub(super) struct ProgressRequest {
    chat: String,
}

pub(super) async fn progress(
    Query(request): Query<ProgressRequest>,
) -> Result<Json<Progress>, ResolveError> {
    crate::open_behaviour::progress(&request.chat).map(Json)
}
