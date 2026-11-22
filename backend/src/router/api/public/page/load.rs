use axum::Json;
use axum::extract::Query;
use axum::extract::State;
use serde::Deserialize;
use serde_json::Value;

use ian_framework_rs::exception::Exception;

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
    state.db.load_page(&request.name).map(Json)
}
