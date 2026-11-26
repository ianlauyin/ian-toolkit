import {useLocation, useNavigate} from "@solidjs/router";
import type {JSX} from "@solidjs/web";
import {createEffect} from "solid-js";

import "./index.css";

const PAGES = [{path: "/todo", title: "TODO"}];

export interface Props {
    children?: JSX.Element;
}

export function Shell(props: Props) {
    const location = useLocation();
    const navigate = useNavigate();

    createEffect(
        () => location.pathname,
        pathname => {
            document.title = PAGES.find(page => page.path === pathname)?.title ?? "Ian Toolkit";
        }
    );

    const open = (event: MouseEvent, path: string) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        if (location.pathname === path) return;
        navigate(path);
    };

    return (
        <div class="g-shell">
            <nav class="g-nav">
                {PAGES.map(page => (
                    <a href={page.path} class={{"g-on": location.pathname === page.path}} onClick={event => open(event, page.path)}>
                        {page.title}
                    </a>
                ))}
            </nav>
            <main>{props.children}</main>
        </div>
    );
}
