use axum::Json;
use axum::http::header::CONTENT_TYPE;
use axum::response::IntoResponse;
use axum::response::Response;
use serde_json::json;

pub(super) async fn json_message(res: Response) -> Response {
    let status = res.status();
    let is_json = res
        .headers()
        .get(CONTENT_TYPE)
        .is_some_and(|v| v.as_bytes().starts_with(b"application/json"));
    if !(status.is_client_error() || status.is_server_error()) || is_json {
        return res;
    }
    let body = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap_or_default();
    let mut msg = String::from_utf8_lossy(&body).trim_end().to_string();
    if msg.is_empty() {
        msg = status.canonical_reason().unwrap_or("Error").to_string();
    }
    (status, Json(json!({ "message": msg }))).into_response()
}
