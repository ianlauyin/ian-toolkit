# Backend

- The decision records a behaviour that the code does not show. 
- Update that row in the same change when you make a new decision, the entry moves, or you add or remove a feature. 
- When a code change would change the decision and you did not make that decision, stop and ask. Leave the decision as it is.

| path | description | decision |
| --- | --- | --- |
| `backend/src/main.rs` | Local HTTP server | The server does not log. |
| `backend/src/router/mod.rs` | HTTP routes | `GET /health` returns `{"ok": true}`. `GET /version` returns the process version. A body that is not JSON returns 415. A JSON body without a necessary field returns 422. Each other `GET` returns a file from `frontend/dist`, or `index.html` when that file is missing. A missing `frontend/dist` returns 500. |
| `backend/src/router/api/mod.rs` | API checks | A request to `/api` that is not from the same origin returns 403. |
| `backend/src/router/api/public/page/` | Saved page data | |
| `backend/src/router/api/public/projects/list.rs` | Project list | The list follows the order of the keys in `conf/projects.json`. |
| `backend/src/router/api/public/notes_assign/assign.rs` | Note assign | |
| `backend/src/open_behaviour.rs` | Local agent run | The agent can edit files and run commands with no approval. The agent calls no subagent. The agent continues when the page closes or the server restarts. |
| `backend/src/router/api/public/open_behaviour_progress/progress.rs` | Agent progress | |
| `backend/src/router/api/public/open_behaviour_followup/followup.rs` | Agent follow-up | |
| `backend/src/router/api/public/logs_apps/list.rs` | Log apps | |
| `backend/src/router/api/public/logs_events/load.rs` | Log events | The events are newest first. A key in the field path can contain a dot. |
