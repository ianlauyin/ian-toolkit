# Backend

- The decision records a behaviour that the code does not show. 
- Update that row in the same change when you make a new decision, the entry moves, or you add or remove a feature. 
- When a code change would change the decision and you did not make that decision, stop and ask. Leave the decision as it is.

| path | description | decision |
| --- | --- | --- |
| `backend/src/main.rs` | Local HTTP server | The server does not log. Start the server in `backend/`, because the SPA folder `frontend/dist` is a path from the working folder. The frontend build writes that folder to `backend/frontend/dist`. |
| `backend/src/router/mod.rs` | HTTP routes | `GET /health` returns `{"ok": true}`. `GET /version` returns the process version. A body that is not JSON returns 415. A JSON body without a necessary field returns 422. Each other `GET` returns a file from `backend/frontend/dist`, or `index.html` when that file is missing. A missing `backend/frontend/dist` returns 500. |
| `backend/src/router/api/mod.rs` | API checks | A request to `/api` that is not from the same origin returns 403. |
| `backend/src/router/api/page/` | Saved page data | |
| `backend/src/env.rs` | Env values and data paths | |
| `backend/src/router/shown_result.rs` | Handler response | An `INTERNAL_ERROR` returns 500 with its message. Each other code keeps the response of `Exception`. |

