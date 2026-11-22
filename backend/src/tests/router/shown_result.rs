use axum::body::to_bytes;
use axum::http::StatusCode;
use axum::response::Response;
use serde_json::Value;

use ian_framework_rs::exception;
use ian_framework_rs::http::error_code;

use crate::router::shown_result::shown_result;

async fn status_and_message(response: Response) -> (StatusCode, Value) {
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body: Value = serde_json::from_slice(&bytes).unwrap();
    (status, body["message"].clone())
}

#[tokio::test]
async fn a_failed_run_returns_its_text() {
    let result: Result<(), _> = Err(exception!(
        code = error_code::INTERNAL_ERROR,
        "failed to start the agent"
    ));
    assert_eq!(
        status_and_message(shown_result(result)).await,
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Value::from("failed to start the agent")
        )
    );
}

#[tokio::test]
async fn a_bad_request_keeps_its_status() {
    let result: Result<(), _> = Err(exception!(code = error_code::BAD_REQUEST, "Bad chat id."));
    assert_eq!(
        status_and_message(shown_result(result)).await,
        (StatusCode::BAD_REQUEST, Value::from("Bad chat id."))
    );
}
