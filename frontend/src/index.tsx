import { render } from "@solidjs/web";
import { SwitchRouter } from "ian-framework-fe";

import App from "./App";
import LogsPage from "./page/logs";
import NotesPage from "./page/notes";
import TodoPage from "./page/todo";
import "./index.css";

const pages = [
  { path: "/todo", component: TodoPage },
  { path: "/notes", component: NotesPage },
  { path: "/logs", component: LogsPage },
];

const root = document.getElementById("root");

if (root) {
  render(
    () => (
      <SwitchRouter isProtected={false} protectedRoutes={[]} publicRoutes={pages} unknown={() => "/todo"}>
        {(route) => <App>{route.children}</App>}
      </SwitchRouter>
    ),
    root,
  );
}
