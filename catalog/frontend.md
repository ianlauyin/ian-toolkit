# Frontend

- The decision records a behaviour that the code does not show. 
- Update that row in the same change when you make a new decision, the entry moves, or you add or remove a feature. 
- When a code change would change the decision and you did not make that decision, stop and ask. Leave the decision as it is.

| path | description | decision |
| --- | --- | --- |
| `frontend/index.html` | App name | |
| `frontend/vite.config.ts` | Build and dev server | The build writes to `backend/frontend/dist`, because the server starts in `backend/` and reads `frontend/dist` from its working folder. |
| `frontend/src/index.tsx` | Page routes | The page does not use Logger. |
| `frontend/src/context.ts` | Version | The page reloads when `GET /version` returns a different version. |
| `frontend/src/component/Shell/` | Nav | |
| `frontend/src/style/tokens.css` | Design tokens | The page uses a warm ivory background, a clay accent, and serif headings. |
| `frontend/src/style/theme-dark.css` | Dark tokens | |
| `frontend/src/page/todo/` | TODO board | A save that has the list important or the list items, or a card field text, loads into Pending. |
| `frontend/src/page/notes/` | Notes page | |
