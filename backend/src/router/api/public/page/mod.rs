use axum::Router;
use axum::routing::get;

use crate::router::api::public::page::load::load;
use crate::router::api::public::page::save::save;
use crate::router::state::AppState;

mod load;
pub(crate) mod name;
mod save;

pub(super) fn router() -> Router<AppState> {
    Router::new().route("/page", get(load).put(save))
}
