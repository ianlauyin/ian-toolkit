mod notes_assign;
mod open_behaviour_followup;
mod open_behaviour_progress;
pub(crate) mod page;
mod projects;

use axum::Router;

use crate::router::state::AppState;

pub(super) fn public() -> Router<AppState> {
    Router::new()
        .merge(page::page())
        .merge(projects::projects())
        .merge(notes_assign::notes_assign())
        .merge(open_behaviour_progress::open_behaviour_progress())
        .merge(open_behaviour_followup::open_behaviour_followup())
}
