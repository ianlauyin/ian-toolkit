# Coding style: backend (Rust + Axum)

The backend crate is `backend/`. Its source is in `backend/src/`.

## General

- Readability is more important than strict DRY. Do not add a helper, a generic type or an abstraction only to remove duplication.
- Do not write a comment in the code.
- Put a decision in `catalog/backend.md`.
- When the text is a reason and not a decision, add a test that fails when the code loses that reason.
- Do not write doc comments. This includes `///` and `//!`.
- Run `cargo fmt` and `cargo clippy --all-targets` after you change the code. Fix all warnings.
- Do not add a logger. Do not add the log route. The server writes one listen line with `println` and writes no request log.

## Handlers

- Use JSON for the request and the response.
- Validate the input at the start of the handler. When a check fails, return the error immediately.
- Write a bad-request message as a short sentence. Start the sentence with a capital letter. End the sentence with a period.
- Start the text of a failed read or a failed write with `failed to`.

## Configuration

- Read `conf/projects.json` and `conf/log-server.json` from the repo root.
- Read the log server key from `.env` at the repo root.
- Do not put the key in an error message.
- The bind address is a constant in `backend/src/main.rs`.

## State

- The API router and its sub-routers share one state in `backend/src/router/state.rs`.
- Put in the state only the values that the handlers use.

## Router layout

- The `mod.rs` at the root of the router declares the sub-routers and has the router function. This function merges the sub-routers and writes each layer that more than one sub-router uses.
- Give each static segment its own folder with the segment as its name. Stop after two folders. A route with more static segments stays in the folder of the second segment. Do not make a folder for a path parameter.
- When a segment contains `-`, the folder name uses `_` in place of `-`.
- Each folder is a sub-router. Its `mod.rs` declares the handler modules and the child sub-routers, and has the sub-router function. This function builds the routes of the segment and merges the child sub-routers.
- Put each handler in its own file in the folder of its route. The file name is the handler name.
- Do not put a handler or a helper in a `mod.rs`.

## API router

The segment folders start in `backend/src/router/api/public/`. The folder name `public` is not a URL segment. Mount each API route at its path under `/api`.

- Do not put the same-origin layer on the SPA.
- Write a layer that only one sub-router uses in its sub-router function. Do not share a layer function or a layer constant between two routers.
- Put a helper that the handlers of one sub-router use in its folder. Put a helper that more than one sub-router uses in `backend/src/`.

## Errors

- Use `ian_framework_rs::exception::Exception` for an error whose text `Exception` returns.
- Create that error with the `exception!` macro, a code from `error_code` and a message.
- Write the `exception!` call where the error occurs. Do not add a private function that only makes an error.
- Convert a foreign error with `map_err`. It does not convert to `Exception` with `?`.
- A 500 whose text the page shows is the JSON response `{"message": "<reason>"}`. Do not use `Exception` for that response. `Exception` hides the text of a 500.

## Imports

- Put the imports in three groups, in this order, with one blank line between them:
  1. `std`.
  2. External crates, including `ian_framework_rs`.
  3. `crate::` paths and the child modules of the file.
- Put the `mod` lines after the imports.
- In a file two or more levels deep, use `crate::` paths. Do not use `super::super::`.
- Do not use `self` in an import. To use a module and an item of that module, import only the module.
- If a project module has the same name as an `ian_framework_rs` module, import the items of the project module directly. Do not import the project module. Do not give an alias to the `ian_framework_rs` module.
- Do not re-export an item with `pub(crate) use`. Import the item from its module.

## Files

Put the items of a source file in this order:

1. Imports and constants.
2. Each public type, its inherent `impl` block with the public methods first, and its trait impls.
3. The private types, the private functions and their impl blocks.

## Split a file

- Change `a.rs` to a folder `a/` with `mod.rs`. Do not keep `a.rs` next to `a/`.
- Split by job. Keep the entry point, the flow and the private code of the flow in `mod.rs`.
- Use `pub(crate) mod` only for a child that code outside the folder uses.
- Give a method or a field of a child that `mod.rs` uses the visibility `pub(super)`. Do not add a constructor only for this.
- A split does not change logic.

## Safety

- In request-time code, do not use `unwrap`, `expect`, `panic!`, `unreachable!`, `todo!` or an index that can be out of range. Use `get` or return an error. Request-time code is all code that runs after startup, including handlers and background tasks.
- Do not show a secret, a token or a query string in `Debug` output or in an error message.

## Tests

- Write tests only for functions that hold important logic. Test each edge case of those functions. Do not test a trivial function, a getter or a pass-through.
- Do not use a real project name or a real customer name. Use `my-app` as the main app id.
- Put the tests in `backend/src/test/`. The path of a test file after `backend/src/test/` is the path of its source file after `backend/src/`.
- Each test folder has a `mod.rs` that declares its child modules.
- Keep all test-only code in `backend/src/test/`. The `#[cfg(test)] mod test;` line in `backend/src/main.rs` is the only test item in the production code.
- A test reaches the tested item with a `crate::` path. When a test needs a private item, change the item to `pub(crate)`. Do not use `pub`.
- Keep each test helper in the test file that uses it. Put a helper that two or more test files use in the `mod.rs` of the parent test folder. Those files use it with a `crate::test::` path.
