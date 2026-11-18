use axum::Router;

use crate::router::state::AppState;

mod logs_apps;
mod logs_events;
mod notes_assign;
mod open_behaviour_followup;
mod open_behaviour_progress;
pub(crate) mod page;
mod projects;

pub(super) fn router() -> Router<AppState> {
    Router::new()
        .merge(page::router())
        .merge(projects::router())
        .merge(notes_assign::router())
        .merge(logs_apps::router())
        .merge(logs_events::router())
        .merge(open_behaviour_progress::router())
        .merge(open_behaviour_followup::router())
}
