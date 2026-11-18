use std::path::Path;

use axum::Json;
use axum::extract::Query;
use serde::Deserialize;

use crate::logs::CONFIG_FILE;
use crate::logs::DAY_LIMIT;
use crate::logs::ENV_FILE;
use crate::logs::Filter;
use crate::logs::LogsPage;
use crate::logs::PAGE_SIZES;
use crate::logs::fetch;
use crate::logs::page_of;
use crate::logs::parse_events;
use crate::logs::read_config;
use crate::logs::read_env_value;
use crate::logs::valid_date;
use crate::open_behaviour::ResolveError;

#[derive(Deserialize)]
pub(super) struct LogsRequest {
    server: String,
    app: String,
    date: String,
    page: usize,
    page_size: Option<usize>,
    filters: Option<String>,
}

pub(super) async fn load(
    Query(request): Query<LogsRequest>,
) -> Result<Json<LogsPage>, ResolveError> {
    let bad = |msg: &str| ResolveError::BadItem(msg.to_string());
    if request.page == 0 {
        return Err(bad("Bad page."));
    }
    if !valid_date(&request.date) {
        return Err(bad("Bad date."));
    }
    let page_size = request.page_size.unwrap_or(PAGE_SIZES[0]);
    if !PAGE_SIZES.contains(&page_size) {
        return Err(bad("Bad page size."));
    }
    let filters: Vec<Filter> = match &request.filters {
        Some(text) => serde_json::from_str(text).map_err(|_| bad("Bad filters."))?,
        None => Vec::new(),
    };
    let config = read_config(Path::new(CONFIG_FILE)).map_err(ResolveError::Failed)?;
    let server = config
        .servers
        .iter()
        .find(|item| item.name == request.server)
        .ok_or_else(|| bad("Unknown server."))?;
    let server_app = server
        .apps
        .iter()
        .find(|(id, _)| *id == request.app)
        .map(|(_, name)| name.as_str())
        .ok_or_else(|| bad("Unknown app."))?;
    let key =
        read_env_value(Path::new(ENV_FILE), &server.key_name).map_err(ResolveError::Failed)?;
    let url = format!(
        "{}/log/{}?date={}&limit={DAY_LIMIT}",
        server.base_url.trim_end_matches('/'),
        server_app,
        request.date
    );
    let body = fetch(&url, &key).await.map_err(ResolveError::Failed)?;
    let events = parse_events(&body).map_err(ResolveError::Failed)?;
    Ok(Json(page_of(events, &filters, request.page, page_size)))
}
