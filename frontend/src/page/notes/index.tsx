import { For, createEffect, createSignal, onCleanup, onSettled } from "solid-js";
import { assignKey } from "util/note";

import { createNotesPage } from "./context";
import type { Note, NotesPageContext } from "./types";
import "./index.css";

const EMPTY: Note[] = [];
const PROGRESS_MS = 3000;
const REPLY_STATUS = ["finished", "stopped"];
const PROGRESS_STATUS: Record<string, string> = {
  running: "The agent is working.",
  finished: "The agent finished.",
  failed: "The agent failed.",
  stopped: "The agent stopped before it finished.",
};

export default function NotesPage() {
  const page = createNotesPage();

  const selected = () => page.store.tab || page.store.projects[0]?.id || "";

  let timer: ReturnType<typeof setInterval> | undefined;
  onSettled(() => {
    void page.load().then(() => page.refreshProgress());
    timer = setInterval(() => void page.refreshProgress(), PROGRESS_MS);
  });
  onCleanup(() => {
    if (timer) clearInterval(timer);
  });

  async function submitAdd(event: SubmitEvent) {
    event.preventDefault();
    if (await page.addNote(selected(), page.store.addText)) page.setAddText("");
  }

  return (
    <div id="notes-page" class="notes-page">
      <h1>Notes</h1>
      <div class="notes-page-tabs">
        {page.store.projects.map((project) => {
          const count = (page.store.notes[project.id] ?? []).length;
          return (
            <button
              type="button"
              class={{ on: project.id === selected() }}
              onClick={() => {
                page.setTab(project.id);
                page.setAddText("");
              }}
            >
              {project.name}
              <span class="badge" hidden={count === 0}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <p class="error" hidden={!page.store.error}>
        {page.store.error}
      </p>
      <form class="notes-page-add" hidden={!page.store.loaded || !selected()} onSubmit={(event) => void submitAdd(event)}>
        <label>
          New note
          <textarea
            class="g-text-input"
            rows={3}
            placeholder="Write a note or a task"
            value={page.store.addText}
            onInput={(event) => page.setAddText(event.currentTarget.value)}
            onKeyDown={(event) => {
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
        <For each={page.store.notes[selected()] ?? EMPTY}>
          {(note) => <NoteCard tab={selected()} note={note} page={page} />}
        </For>
        {page.store.loaded && selected() && (page.store.notes[selected()] ?? EMPTY).length === 0 ? <p class="empty">No note.</p> : null}
      </div>
    </div>
  );
}

function NoteCard(props: {
  tab: string;
  note: Note;
  page: NotesPageContext;
}) {
  const [editing, setEditing] = createSignal(false);
  const [editText, setEditText] = createSignal("");
  const [followup, setFollowup] = createSignal("");
  const [sending, setSending] = createSignal(false);
  let steps: HTMLOListElement | undefined;
  let shownProgress = "";

  const key = () => assignKey(props.tab, props.note);
  const assign = () => props.page.store.assigns[key()] ?? "";
  const progress = () => props.page.store.progress[key()];
  const started = () => assign() !== "" && assign() !== "starting";
  const showFollowup = () => started() && REPLY_STATUS.includes(progress()?.status ?? "");

  createEffect(
    () => {
      const current = progress();
      return current ? `${current.status}/${current.steps.length}` : "";
    },
    (shown) => {
      if (!shown || shown === shownProgress || !steps) return;
      shownProgress = shown;
      steps.scrollTop = steps.scrollHeight;
    },
  );

  async function saveEdit(event: SubmitEvent) {
    event.preventDefault();
    if (await props.page.editNote(props.tab, props.note, editText())) setEditing(false);
  }

  async function sendFollowup(event: SubmitEvent) {
    event.preventDefault();
    if (sending() || !followup().trim()) return;
    setSending(true);
    const sent = await props.page.followup(key(), followup());
    setSending(false);
    if (sent) setFollowup("");
  }

  return (
    <article class="notes-page-card">
      <p class="text" hidden={editing()}>
        {props.note.text}
      </p>
      <form
        class="edit-form"
        hidden={!editing()}
        onSubmit={(event) => void saveEdit(event)}
      >
        <textarea
          class="g-text-input"
          rows={3}
          value={editText()}
          onInput={(event) => setEditText(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
          }}
        />
        <div class="actions">
          <button class="g-button" type="submit">
            Save
          </button>
          <button class="g-button cancel" type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </form>
      <div class="actions view-actions" hidden={editing()}>
        <button class="g-button assign" type="button" disabled={assign() !== ""} onClick={() => void props.page.assign(props.tab, props.note)}>
          {assign() === "" ? "Assign task" : assign() === "starting" ? "Starting…" : "Assigned"}
        </button>
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
      <p class="assign-chat" hidden={!started()}>
        The local agent {assign()} works in the project folder.
      </p>
      <div class="assign-progress" hidden={!progress()}>
        <p class={`state ${progress()?.status ?? ""}`}>
          {PROGRESS_STATUS[progress()?.status ?? ""] ?? `Failed to load the progress: ${progress()?.error ?? ""}`}
        </p>
        <ol class="steps" ref={steps}>
          {(progress()?.steps ?? []).map((step) => (
            <li class={step.kind}>{step.text}</li>
          ))}
        </ol>
        <form class="followup-form" hidden={!showFollowup()} onSubmit={(event) => void sendFollowup(event)}>
          <label>
            Follow-up
            <textarea
              class="g-text-input"
              rows={2}
              placeholder="Reply to the agent"
              value={followup()}
              onInput={(event) => setFollowup(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
              }}
            />
          </label>
          <button class="g-button" type="submit" disabled={sending() || !followup().trim()}>
            {sending() ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </article>
  );
}
