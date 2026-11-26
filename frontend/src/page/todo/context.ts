import {pageLoadAjax} from "util/ajax/api/page/load";
import {pageSaveAjax} from "util/ajax/api/page/save";
import {normalize, type RawTodo, type TodoLists} from "util/todo";
import {flush} from "solid-js";
import {PageContext} from "ian-framework-fe";

import type {Card, Section, TodoEdit, TodoPageStore} from "./types";

const PAGE_NAME = "todo-items";

const emptyLists = (): TodoLists => ({pending: [], ongoing: [], reviewing: []});

const card = (title: string, detail: string, deadline: string): Card => ({
    title,
    detail: detail.trim(),
    deadline,
});

const reason = (error: unknown): string => (error instanceof Error ? error.message : "Unknown error");

const initialState: TodoPageStore = {
    lists: emptyLists(),
    loaded: false,
    error: "",
    editing: null,
};

export class TodoPageContext extends PageContext<TodoPageStore> {
    override get store() {
        return this.state;
    }
    private readonly setStore = this.setState;

    constructor() {
        super(structuredClone(initialState));
    }

    async load() {
        try {
            const data = await pageLoadAjax({name: PAGE_NAME});
            this.setStore(state => {
                state.lists = normalize(data as RawTodo);
            });
            this.setStore(state => {
                state.loaded = true;
            });
            this.setStore(state => {
                state.error = "";
            });
        } catch (error) {
            this.setStore(state => {
                state.error = `Failed to load my TODOs: ${reason(error)}`;
            });
        }
        flush();
    }

    async add(section: Section, fields: Card) {
        const trimmed = fields.title.trim();
        if (!trimmed) return;
        await this.save({
            ...this.store.lists,
            [section]: [...this.store.lists[section], card(trimmed, fields.detail, fields.deadline)],
        });
    }

    async edit(section: Section, index: number, fields: Card) {
        const trimmed = fields.title.trim();
        if (!trimmed) return;
        await this.save({
            ...this.store.lists,
            [section]: this.store.lists[section].with(index, card(trimmed, fields.detail, fields.deadline)),
        });
    }

    async remove(section: Section, index: number) {
        await this.save({...this.store.lists, [section]: this.store.lists[section].toSpliced(index, 1)});
    }

    async move(fromSection: Section, from: number, toSection: Section, gap: number) {
        if (fromSection === toSection) {
            if (gap === from || gap === from + 1) return;
            const items = this.store.lists[fromSection];
            const next = items.toSpliced(from, 1);
            next.splice(gap > from ? gap - 1 : gap, 0, items[from]);
            await this.save({...this.store.lists, [fromSection]: next});
            return;
        }
        const item = this.store.lists[fromSection][from];
        await this.save({
            ...this.store.lists,
            [fromSection]: this.store.lists[fromSection].toSpliced(from, 1),
            [toSection]: this.store.lists[toSection].toSpliced(gap, 0, item),
        });
    }

    setEditing(editing: TodoEdit | null) {
        this.setStore(state => {
            state.editing = editing;
        });
        flush();
    }

    private async save(next: TodoLists) {
        try {
            await pageSaveAjax({name: PAGE_NAME, data: next});
            this.setStore(state => {
                state.lists = next;
            });
            this.setStore(state => {
                state.error = "";
            });
        } catch (error) {
            this.setStore(state => {
                state.error = `Failed to save: ${reason(error)}`;
            });
        }
        flush();
    }
}
