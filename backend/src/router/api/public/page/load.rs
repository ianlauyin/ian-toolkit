use axum::Json;
use axum::extract::Query;
use axum::extract::State;
use ian_framework_rs::exception;
use ian_framework_rs::exception::Exception;
use ian_framework_rs::http::error_code;
use serde::Deserialize;
use serde_json::Value;

use crate::router::api::public::page::name::check_name;
use crate::router::state::AppState;

#[derive(Deserialize)]
pub(super) struct LoadRequest {
    name: String,
}

pub(super) async fn load(
    State(state): State<AppState>,
    Query(request): Query<LoadRequest>,
) -> Result<Json<Value>, Exception> {
    check_name(&request.name)?;
    state
        .db
        .load_page(&request.name)
        .map(Json)
        .map_err(|message| exception!(code = error_code::BAD_GATEWAY, message))
}
