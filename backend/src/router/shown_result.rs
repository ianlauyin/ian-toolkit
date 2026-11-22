use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::response::Response;
use serde::Serialize;
use serde_json::json;

use ian_framework_rs::exception::Exception;
use ian_framework_rs::http::error_code;

pub(crate) fn shown_result<T: Serialize>(result: Result<T, Exception>) -> Response {
    match result {
        Ok(value) => Json(value).into_response(),
        Err(exception) if exception.code() == error_code::INTERNAL_ERROR => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "message": exception.message() })),
        )
            .into_response(),
        Err(exception) => exception.into_response(),
    }
}
