use axum::Json;
use axum::extract::State;
use ian_framework_rs::exception;
use ian_framework_rs::exception::Exception;
use ian_framework_rs::http::error_code;
use serde::Deserialize;
use serde_json::Value;

use crate::router::api::public::page::name::check_name;
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
    state
        .db
        .save_page(&request.name, &request.data)
        .map(Json)
        .map_err(|message| exception!(code = error_code::BAD_GATEWAY, message))
}
