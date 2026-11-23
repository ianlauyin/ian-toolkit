import {pageLoadAjax} from "util/ajax/api/public/page/load";
import {pageSaveAjax} from "util/ajax/api/public/page/save";
import {projectsListAjax} from "util/ajax/api/public/projects/list";
import {flush} from "solid-js";
import {PageContext} from "ian-framework-fe";

import type {Note, NotesPageStore} from "./types";

const NOTES_PAGE = "notes";

type NotesMap = Record<string, Note[]>;

const reason = (error: unknown): string => (error instanceof Error ? error.message : "Unknown error");

const initialState: NotesPageStore = {
    projects: [],
    notes: {},
    loaded: false,
    error: "",
    tab: "",
    addText: "",
};

export class NotesPageContext extends PageContext<NotesPageStore> {
    readonly store = this.state;
    private readonly setStore = this.setState;

    constructor() {
        super(structuredClone(initialState));
    }

    async load() {
        try {
            const [projects, notes] = await Promise.all([projectsListAjax(), pageLoadAjax({name: NOTES_PAGE})]);
            this.setStore(state => {
                state.projects = projects;
            });
            this.setStore(state => {
                state.notes = (notes ?? {}) as NotesMap;
            });
            this.setStore(state => {
                state.loaded = true;
            });
            this.setStore(state => {
                state.error = "";
            });
        } catch (error) {
            this.setStore(state => {
                state.error = `Failed to load the notes: ${reason(error)}`;
            });
        }
        flush();
    }

    async addNote(tab: string, text: string) {
        const trimmed = text.trim();
        if (!trimmed) return false;
        const next = {...this.store.notes, [tab]: [...(this.store.notes[tab] ?? []), {id: crypto.randomUUID(), text: trimmed}]};
        try {
            await pageSaveAjax({name: NOTES_PAGE, data: next});
            this.setStore(state => {
                state.notes = next;
            });
            this.setStore(state => {
                state.error = "";
            });
            flush();
            return true;
        } catch (error) {
            this.setStore(state => {
                state.error = `Failed to save: ${reason(error)}`;
            });
            flush();
            return false;
        }
    }

    async editNote(tab: string, note: Note, text: string) {
        const trimmed = text.trim();
        if (!trimmed) return false;
        const items = (this.store.notes[tab] ?? []).map(item => (item.id === note.id ? {...item, text: trimmed} : item));
        const next = {...this.store.notes, [tab]: items};
        try {
            await pageSaveAjax({name: NOTES_PAGE, data: next});
            this.setStore(state => {
                state.notes = next;
            });
            this.setStore(state => {
                state.error = "";
            });
            flush();
            return true;
        } catch (error) {
            this.setStore(state => {
                state.error = `Failed to save: ${reason(error)}`;
            });
            flush();
            return false;
        }
    }

    async removeNote(tab: string, note: Note) {
        const next = {...this.store.notes, [tab]: (this.store.notes[tab] ?? []).filter(item => item.id !== note.id)};
        try {
            await pageSaveAjax({name: NOTES_PAGE, data: next});
            this.setStore(state => {
                state.notes = next;
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

    setTab(tab: string) {
        this.setStore(state => {
            state.tab = tab;
        });
        flush();
    }

    setAddText(text: string) {
        this.setStore(state => {
            state.addText = text;
        });
        flush();
    }
}
