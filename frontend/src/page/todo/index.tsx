import {onSettled} from "solid-js";

import {createTodoPage} from "./context";
import type {Card, Section} from "./types";
import "./index.css";

const TITLES: Record<Section, string> = {pending: "Pending", ongoing: "Ongoing", reviewing: "Reviewing"};

type Gap = {section: Section; gap: number};

export function TodoPage() {
    const page = createTodoPage();
    let board: HTMLDivElement | undefined;
    let addDialog: HTMLDialogElement | undefined;
    let addForm: HTMLFormElement | undefined;
    let addTitle: HTMLInputElement | undefined;
    let addDetail: HTMLTextAreaElement | undefined;
    let addDeadline: HTMLInputElement | undefined;
    let dragFrom: {section: Section; index: number} | null = null;
    let dropTo: Gap | null = null;

    onSettled(() => void page.load());

    function clearDropMarks() {
        board?.querySelectorAll(".todo-page-card").forEach(row => row.classList.remove("before", "after"));
        board?.querySelectorAll(".todo-page-section").forEach(section => section.classList.remove("drop-end"));
    }

    function column(section: Section) {
        return (
            <SectionColumn
                section={section}
                items={page.store.lists[section]}
                loaded={page.store.loaded}
                editing={page.store.editing?.section === section ? page.store.editing : null}
                onEdit={index => page.setEditing({section, index})}
                onDelete={(index, title) => {
                    if (confirm(`Delete "${title}"?`)) void page.remove(section, index);
                }}
                onSave={(index, fields) => {
                    void page.edit(section, index, fields);
                    page.setEditing(null);
                }}
                onCancel={() => page.setEditing(null)}
                onDragStart={index => {
                    dragFrom = {section, index};
                }}
                onDragEnd={() => {
                    dragFrom = null;
                    dropTo = null;
                    clearDropMarks();
                }}
                onGap={gap => {
                    dropTo = gap;
                }}
                onDrop={() => {
                    if (dragFrom !== null && dropTo !== null) {
                        void page.move(dragFrom.section, dragFrom.index, dropTo.section, dropTo.gap);
                    }
                    dragFrom = null;
                    dropTo = null;
                    clearDropMarks();
                }}
                dragReady={() => dragFrom !== null}
                clearDropMarks={clearDropMarks}
            />
        );
    }

    function openAdd() {
        addForm?.reset();
        addDialog?.showModal();
        addTitle?.focus();
    }

    function submitAdd(event: SubmitEvent) {
        event.preventDefault();
        void page.add("pending", {
            title: addTitle?.value ?? "",
            detail: addDetail?.value ?? "",
            deadline: addDeadline?.value ?? "",
        });
        addDialog?.close();
    }

    return (
        <div id="todo-page" class="todo-page" ref={board}>
            <div class="header">
                <h1>TODO</h1>
                <button class="g-button add-open" type="button" disabled={!page.store.loaded} onClick={openAdd}>
                    Add
                </button>
            </div>
            <p class="error" hidden={!page.store.error}>
                {page.store.error}
            </p>
            <div class="board">
                {column("pending")}
                {column("ongoing")}
                {column("reviewing")}
            </div>
            <dialog
                class="add-dialog"
                ref={addDialog}
                onClick={event => {
                    if (event.target === addDialog) addDialog?.close();
                }}
            >
                <form class="add-form" ref={addForm} onSubmit={submitAdd}>
                    <h2>New TODO</h2>
                    <input class="g-text-input title" type="text" autocomplete="off" placeholder="Title" required ref={addTitle} />
                    <textarea class="g-text-input detail" rows={4} placeholder="Detail" ref={addDetail} />
                    <label class="deadline">
                        Deadline (optional) <input class="g-text-input" type="date" ref={addDeadline} />
                    </label>
                    <span class="actions">
                        <button class="g-button g-danger cancel" type="button" onClick={() => addDialog?.close()}>
                            Cancel
                        </button>
                        <button class="g-button" type="submit">
                            Add
                        </button>
                    </span>
                </form>
            </dialog>
        </div>
    );
}

function SectionColumn(props: {
    section: Section;
    items: Card[];
    loaded: boolean;
    editing: {section: Section; index: number} | null;
    onEdit: (index: number) => void;
    onDelete: (index: number, title: string) => void;
    onSave: (index: number, fields: Card) => void;
    onCancel: () => void;
    onDragStart: (index: number) => void;
    onDragEnd: () => void;
    onGap: (gap: Gap) => void;
    onDrop: () => void;
    dragReady: () => boolean;
    clearDropMarks: () => void;
}) {
    let view: HTMLElement | undefined;

    return (
        <section
            class="todo-page-section"
            ref={view}
            onDragOver={event => {
                if (!props.dragReady() || (event.target as HTMLElement).closest(".todo-page-card")) return;
                event.preventDefault();
                props.onGap({section: props.section, gap: props.items.length});
                props.clearDropMarks();
                view?.classList.add("drop-end");
            }}
            onDrop={event => {
                event.preventDefault();
                props.onDrop();
            }}
        >
            <h2>{TITLES[props.section]}</h2>
            <ul class="list" hidden={!props.loaded || props.items.length === 0}>
                {props.items.map((item, index) =>
                    props.editing?.section === props.section && props.editing.index === index ? (
                        <EditCard item={item} onSave={fields => props.onSave(index, fields)} onCancel={props.onCancel} />
                    ) : (
                        <CardRow
                            item={item}
                            onEdit={() => props.onEdit(index)}
                            onDelete={() => props.onDelete(index, item.title)}
                            onDragStart={() => props.onDragStart(index)}
                            onDragEnd={props.onDragEnd}
                            onGap={after => props.onGap({section: props.section, gap: index + (after ? 1 : 0)})}
                            dragReady={props.dragReady}
                            clearDropMarks={props.clearDropMarks}
                        />
                    )
                )}
            </ul>
            <div class="drop-zone">Drop a card here</div>
        </section>
    );
}

function CardRow(props: {
    item: Card;
    onEdit: () => void;
    onDelete: () => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    onGap: (after: boolean) => void;
    dragReady: () => boolean;
    clearDropMarks: () => void;
}) {
    let row: HTMLLIElement | undefined;

    return (
        <li
            class="todo-page-card"
            ref={row}
            onDragStart={event => {
                event.dataTransfer?.setData("text/plain", props.item.title);
                if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
                props.onDragStart();
                row?.classList.add("dragging");
            }}
            onDragOver={event => {
                if (!props.dragReady() || !row) return;
                event.preventDefault();
                const box = row.getBoundingClientRect();
                const after = event.clientY > box.top + box.height / 2;
                props.onGap(after);
                props.clearDropMarks();
                row.classList.add(after ? "after" : "before");
            }}
            onDragEnd={() => {
                if (row) row.draggable = false;
                row?.classList.remove("dragging");
                props.onDragEnd();
            }}
        >
            <div
                class="handle"
                title="Drag to reorder or move"
                onMouseDown={() => {
                    if (row) row.draggable = true;
                }}
                onMouseUp={() => {
                    if (row) row.draggable = false;
                }}
            >
                ⋮⋮⋮
            </div>
            <div class="body">
                <span class="title">{props.item.title}</span>
                <p class="detail" hidden={!props.item.detail}>
                    {props.item.detail}
                </p>
                <p class="deadline" hidden={!props.item.deadline}>
                    Deadline: {props.item.deadline}
                </p>
                <span class="actions">
                    <button class="g-button g-small" type="button" onClick={props.onEdit}>
                        Edit
                    </button>
                    <button class="g-button g-small g-danger" type="button" onClick={props.onDelete}>
                        Delete
                    </button>
                </span>
            </div>
        </li>
    );
}

function EditCard(props: {item: Card; onSave: (fields: Card) => void; onCancel: () => void}) {
    let title: HTMLInputElement | undefined;
    let detail: HTMLTextAreaElement | undefined;
    let deadline: HTMLInputElement | undefined;

    function fields(): Card {
        return {title: title?.value ?? "", detail: detail?.value ?? "", deadline: deadline?.value ?? ""};
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter" && event.target !== detail) props.onSave(fields());
        if (event.key === "Escape") props.onCancel();
    }

    return (
        <li class="todo-page-edit-card" onKeyDown={onKeyDown}>
            <input
                class="g-text-input title"
                type="text"
                autocomplete="off"
                placeholder="Title"
                ref={element => {
                    title = element;
                    element.value = props.item.title;
                    element.focus();
                }}
            />
            <textarea
                class="g-text-input detail"
                rows={3}
                placeholder="Detail"
                ref={element => {
                    detail = element;
                    element.value = props.item.detail;
                }}
            />
            <label class="deadline">
                Deadline (optional){" "}
                <input
                    class="g-text-input"
                    type="date"
                    ref={element => {
                        deadline = element;
                        element.value = props.item.deadline;
                    }}
                />
            </label>
            <span class="actions">
                <button class="g-button g-small" type="button" onClick={() => props.onSave(fields())}>
                    Save
                </button>
                <button class="g-button g-small g-danger" type="button" onClick={props.onCancel}>
                    Cancel
                </button>
            </span>
        </li>
    );
}
