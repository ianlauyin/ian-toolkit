import {render} from "@solidjs/web";
import {KeyedRouter, type KeyedRoutes} from "ian-framework-fe";

import {App} from "./App";
import {TodoPage} from "./page/todo";
import "./index.css";

const keyed: KeyedRoutes<"open">[] = [
    {
        key: "open",
        routes: [
            {
                path: "/",
                component: App,
                children: [{path: "/todo", component: TodoPage}],
            },
        ],
    },
];

const root = document.getElementById("root");

export const dispose = root ? render(() => <KeyedRouter activeKeys={["open"]} keyed={keyed} fallbackPath="/todo" />, root) : undefined;
