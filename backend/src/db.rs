use std::sync::{Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OptionalExtension, params};
use serde_json::Value;

use ian_framework_rs::exception;
use ian_framework_rs::exception::Exception;
use ian_framework_rs::http::error_code;

const SCHEMA: &str = "CREATE TABLE IF NOT EXISTS page (name TEXT PRIMARY KEY, data TEXT NOT NULL, saved_at INTEGER NOT NULL)";

pub(crate) struct Db {
    conn: Mutex<Connection>,
}

impl Db {
    pub(crate) fn open(path: &str) -> Result<Self, Exception> {
        let conn = Connection::open(path).map_err(|e| {
            exception!(
                code = error_code::INTERNAL_ERROR,
                format!("failed to open {path}: {e}")
            )
        })?;
        conn.execute_batch(SCHEMA).map_err(|e| {
            exception!(
                code = error_code::INTERNAL_ERROR,
                format!("failed to create table page: {e}")
            )
        })?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub(crate) fn load_page(&self, name: &str) -> Result<Value, Exception> {
        let data: Option<String> = self
            .lock()
            .query_row("SELECT data FROM page WHERE name = ?1", [name], |row| {
                row.get(0)
            })
            .optional()
            .map_err(|e| exception!(code = error_code::BAD_GATEWAY, e.to_string()))?;
        match data {
            Some(data) => serde_json::from_str(&data)
                .map_err(|e| exception!(code = error_code::BAD_GATEWAY, e.to_string())),
            None => Ok(Value::Null),
        }
    }

    pub(crate) fn save_page(&self, name: &str, data: &Value) -> Result<(), Exception> {
        let saved_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        self.lock()
            .execute(
                "INSERT INTO page (name, data, saved_at) VALUES (?1, ?2, ?3) \
                 ON CONFLICT (name) DO UPDATE SET data = ?2, saved_at = ?3",
                params![name, data.to_string(), saved_at],
            )
            .map(|_| ())
            .map_err(|e| exception!(code = error_code::BAD_GATEWAY, e.to_string()))
    }

    pub(crate) fn lock(&self) -> MutexGuard<'_, Connection> {
        self.conn.lock().unwrap_or_else(|e| e.into_inner())
    }
}
