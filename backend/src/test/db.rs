use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::Arc;

use serde_json::{Value, json};

use crate::db::*;

#[test]
fn load_page_without_save_returns_null() {
    let db = Db::open(":memory:").unwrap();
    assert_eq!(db.load_page("todo-items").unwrap(), Value::Null);
}

#[test]
fn save_page_replaces_last_save() {
    let db = Db::open(":memory:").unwrap();
    db.save_page("todo-items", &json!({ "items": [{ "text": "a" }] }))
        .unwrap();
    db.save_page("todo-items", &json!({ "items": [] })).unwrap();
    assert_eq!(db.load_page("todo-items").unwrap(), json!({ "items": [] }));
}

#[test]
fn a_poisoned_lock_still_loads_the_page() {
    let db = Arc::new(Db::open(":memory:").unwrap());
    db.save_page("todo-items", &json!({ "items": [] })).unwrap();
    let cloned = Arc::clone(&db);
    let panicked = catch_unwind(AssertUnwindSafe(|| {
        let _guard = cloned.lock();
        panic!("request");
    }));
    assert!(panicked.is_err());
    assert_eq!(db.load_page("todo-items").unwrap(), json!({ "items": [] }));
}
