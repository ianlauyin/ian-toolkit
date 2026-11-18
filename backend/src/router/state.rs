use std::sync::Arc;

use crate::db::Db;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) db: Arc<Db>,
}
