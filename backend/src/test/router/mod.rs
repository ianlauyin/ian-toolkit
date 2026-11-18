use std::sync::Arc;

use axum::Router;
use axum::body::Body;
use axum::http::Request;
use axum::http::StatusCode;
use axum::http::header::CONTENT_TYPE;
use serde_json::Value;
use serde_json::json;
use tower::ServiceExt;

use crate::db::Db;
use crate::router::router;
use crate::router::state::AppState;

mod api;

fn test_app() -> Router {
    router(AppState {
        db: Arc::new(Db::open(":memory:").unwrap()),
    })
}

async fn send(app: &Router, req: Request<Body>) -> (StatusCode, String) {
    let res = app.clone().oneshot(req).await.unwrap();
    let status = res.status();
    let body = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, String::from_utf8(body.to_vec()).unwrap())
}

fn get(uri: &str) -> Request<Body> {
    Request::get(uri)
        .header("sec-fetch-site", "same-origin")
        .body(Body::empty())
        .unwrap()
}

fn put_json(body: &str) -> Request<Body> {
    Request::put("/api/page")
        .header("sec-fetch-site", "same-origin")
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(body.to_string()))
        .unwrap()
}

fn error_of(body: &str) -> Value {
    serde_json::from_str::<Value>(body).unwrap()["message"].clone()
}

#[tokio::test]
async fn health_returns_ok() {
    let (status, body) = send(&test_app(), get("/health")).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        serde_json::from_str::<Value>(&body).unwrap(),
        json!({ "ok": true })
    );
}

#[tokio::test]
async fn save_then_load_page() {
    let app = test_app();
    assert_eq!(
        send(&app, get("/api/page?name=todo-items")).await,
        (StatusCode::OK, "null".to_string())
    );
    let saved = send(
        &app,
        put_json(r#"{"name":"todo-items","data":{"items":[{"text":"a"}]}}"#),
    )
    .await;
    assert_eq!(saved, (StatusCode::OK, "null".to_string()));
    let (status, body) = send(&app, get("/api/page?name=todo-items")).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        serde_json::from_str::<Value>(&body).unwrap(),
        json!({ "items": [{ "text": "a" }] })
    );
}

#[tokio::test]
async fn bad_requests_return_json_errors() {
    let app = test_app();
    let (status, body) = send(&app, get("/api/page?name=a_b")).await;
    assert_eq!(
        (status, error_of(&body)),
        (StatusCode::BAD_REQUEST, json!("Bad name."))
    );

    let (status, body) = send(&app, get("/api/page")).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(error_of(&body).is_string());

    let (status, body) = send(&app, get("/api/open-behaviour-progress?chat=..%2Fapp")).await;
    assert_eq!(
        (status, error_of(&body)),
        (StatusCode::BAD_REQUEST, json!("Bad chat id."))
    );

    let followup = Request::post("/api/open-behaviour-followup")
        .header("sec-fetch-site", "same-origin")
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(
            r#"{"chat":"../app","text":"Also fix the test."}"#,
        ))
        .unwrap();
    let (status, body) = send(&app, followup).await;
    assert_eq!(
        (status, error_of(&body)),
        (StatusCode::BAD_REQUEST, json!("Bad chat id."))
    );

    let empty_followup = Request::post("/api/open-behaviour-followup")
        .header("sec-fetch-site", "same-origin")
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(r#"{"chat":"local-1","text":"  "}"#))
        .unwrap();
    let (status, body) = send(&app, empty_followup).await;
    assert_eq!(
        (status, error_of(&body)),
        (StatusCode::BAD_REQUEST, json!("The follow-up has no text."))
    );

    let empty_note = Request::post("/api/notes-assign")
        .header("sec-fetch-site", "same-origin")
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(r#"{"tab":"my-app","text":"  "}"#))
        .unwrap();
    let (status, body) = send(&app, empty_note).await;
    assert_eq!(
        (status, error_of(&body)),
        (StatusCode::BAD_REQUEST, json!("The note has no text."))
    );

    let (status, body) = send(
        &app,
        get("/api/logs-events?server=one&app=my-app&date=2026-10-31&page=0"),
    )
    .await;
    assert_eq!(
        (status, error_of(&body)),
        (StatusCode::BAD_REQUEST, json!("Bad page."))
    );

    let (status, body) = send(
        &app,
        get("/api/logs-events?server=one&app=my-app&date=2026-10-31&page=1&page_size=10"),
    )
    .await;
    assert_eq!(
        (status, error_of(&body)),
        (StatusCode::BAD_REQUEST, json!("Bad page size."))
    );

    let (status, body) = send(
        &app,
        get("/api/logs-events?server=one&app=my-app&date=2026-10-31&page=1&filters=not-json"),
    )
    .await;
    assert_eq!(
        (status, error_of(&body)),
        (StatusCode::BAD_REQUEST, json!("Bad filters."))
    );

    let text = Request::put("/api/page")
        .header("sec-fetch-site", "same-origin")
        .body(Body::from(r#"{"name":"a","data":1}"#))
        .unwrap();
    let (status, body) = send(&app, text).await;
    assert_eq!(status, StatusCode::UNSUPPORTED_MEDIA_TYPE);
    assert!(error_of(&body).is_string());

    let (status, body) = send(&app, put_json(r#"{"name":"a"}"#)).await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert!(error_of(&body).is_string());

    let (status, body) = send(
        &test_app(),
        Request::get("/api/page?name=todo-items")
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    assert!(error_of(&body).is_string());
}
