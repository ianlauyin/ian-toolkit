use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use serde_json::Value;

use ian_framework_rs::exception::Exception;

use crate::router::api::page::name::check_name;
use crate::router::state::AppState;

#[derive(Deserialize)]
pub(super) struct SaveRequest {
    name: String,
    data: Value,
}

pub(super) async fn save(
    State(state): State<AppState>,
    Json(request): Json<SaveRequest>,
) -> Result<Json<()>, Exception> {
    check_name(&request.name)?;
    state.db.save_page(&request.name, &request.data).map(Json)
}
