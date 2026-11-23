import {For, createSignal, onSettled} from "solid-js";

import {NotesPageContext} from "./context";
import type {Note} from "./types";
import "./index.css";

const EMPTY: Note[] = [];

export function NotesPage() {
    const page = new NotesPageContext();

    const selected = () => page.store.tab || page.store.projects[0]?.id || "";

    onSettled(() => {
        void page.load();
    });

    async function submitAdd(event: SubmitEvent) {
        event.preventDefault();
        if (await page.addNote(selected(), page.store.addText)) page.setAddText("");
    }

    return (
        <div id="notes-page" class="notes-page">
            <h1>Notes</h1>
            <div class="notes-page-tabs">
                {page.store.projects.map(project => {
                    const count = (page.store.notes[project.id] ?? []).length;
                    return (
                        <button
                            type="button"
                            class={{"notes-page-on": project.id === selected()}}
                            onClick={() => {
                                page.setTab(project.id);
                                page.setAddText("");
                            }}
                        >
                            {project.name}
                            <span class="notes-page-badge" hidden={count === 0}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>
            <p class="notes-page-error" hidden={!page.store.error}>
                {page.store.error}
            </p>
            <form class="notes-page-add" hidden={!page.store.loaded || !selected()} onSubmit={event => void submitAdd(event)}>
                <label>
                    New note
                    <textarea
                        class="g-text-input"
                        rows={3}
                        placeholder="Write a note or a task"
                        value={page.store.addText}
                        onInput={event => page.setAddText(event.currentTarget.value)}
                        onKeyDown={event => {
                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                                event.currentTarget.form?.requestSubmit();
                            }
                        }}
                    />
                </label>
                <button class="g-button" type="submit" disabled={!page.store.addText.trim()}>
                    Add
                </button>
            </form>
            <div class="notes-page-list">
                <For each={page.store.notes[selected()] ?? EMPTY}>{note => <NoteCard tab={selected()} note={note} page={page} />}</For>
                {page.store.loaded && selected() && (page.store.notes[selected()] ?? EMPTY).length === 0 ? <p class="notes-page-empty">No note.</p> : null}
            </div>
        </div>
    );
}

function NoteCard(props: {tab: string; note: Note; page: NotesPageContext}) {
    const [editing, setEditing] = createSignal(false);
    const [editText, setEditText] = createSignal("");

    async function saveEdit(event: SubmitEvent) {
        event.preventDefault();
        if (await props.page.editNote(props.tab, props.note, editText())) setEditing(false);
    }

    return (
        <article class="notes-page-card">
            <p class="notes-page-text" hidden={editing()}>
                {props.note.text}
            </p>
            <form class="notes-page-edit-form" hidden={!editing()} onSubmit={event => void saveEdit(event)}>
                <textarea
                    class="g-text-input"
                    rows={3}
                    value={editText()}
                    onInput={event => setEditText(event.currentTarget.value)}
                    onKeyDown={event => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
                    }}
                />
                <div class="notes-page-actions">
                    <button class="g-button" type="submit">
                        Save
                    </button>
                    <button class="g-button cancel" type="button" onClick={() => setEditing(false)}>
                        Cancel
                    </button>
                </div>
            </form>
            <div class="notes-page-actions view-actions" hidden={editing()}>
                <button
                    class="g-button edit"
                    type="button"
                    onClick={() => {
                        setEditText(props.note.text);
                        setEditing(true);
                    }}
                >
                    Edit
                </button>
                <button class="g-button remove" type="button" onClick={() => void props.page.removeNote(props.tab, props.note)}>
                    Delete
                </button>
            </div>
        </article>
    );
}
