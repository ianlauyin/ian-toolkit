# Ian's ToolKit

Before you read or change a file in `backend/`, read `catalog/backend.md`.
Before you read or change a file in `frontend/`, read `catalog/frontend.md`.

## Rules

| File | When to read |
| --- | --- |
| `rules/debugging.md` | Before you fix a bug or find the cause of an error |
| `rules/env-file.md` | Before you read a file, run a command or use an env variable |
| `rules/git-convention.md` | Before you make a git commit |
| `rules/report.md` | Before you write a report |
| `rules/writing.md` | Before you write or update a markdown file |

## Coding style

Always value performance/efficiency/simplicity over strict correctness/defensive design, let me know if there is any trade off to make.

### frontend

- After a refactor, run `pnpm check` on `frontend/`, fix all the errors that it shows.

### backend

- Use JSON for the request and the response. Use a different format only for a route that needs a body that is not JSON.
- Do not put a secret, a token, a query string or an env value in a log message or an error message.
- After a refactor:
  1. cd to `backend/`.
  2. Run `cargo fmt` and `cargo test`, fix all the errors that they show.
  3. Run `ian-lint be ..`, fix all the errors that it shows.
