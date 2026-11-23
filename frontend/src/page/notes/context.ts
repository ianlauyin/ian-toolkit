import {notesAssignAssignAjax} from "util/ajax/api/public/notes_assign/assign";
import {openBehaviourFollowupFollowupAjax} from "util/ajax/api/public/open_behaviour_followup/followup";
import {openBehaviourProgressProgressAjax} from "util/ajax/api/public/open_behaviour_progress/progress";
import {pageLoadAjax} from "util/ajax/api/public/page/load";
import {pageSaveAjax} from "util/ajax/api/public/page/save";
import {projectsListAjax} from "util/ajax/api/public/projects/list";
import {assignKey} from "util/note";
import {flush} from "solid-js";
import {PageContext} from "ian-framework-fe";

import type {Note, NotesPageStore, Progress} from "./types";

const NOTES_PAGE = "notes";
const ASSIGNS_PAGE = "notes-assigns";
const ENDED = ["finished", "failed", "stopped", "error"];

type NotesMap = Record<string, Note[]>;
type Assigns = Record<string, string>;

const reason = (error: unknown): string => (error instanceof Error ? error.message : "Unknown error");

const savedAssigns = (assigns: Assigns): Assigns => Object.fromEntries(Object.entries(assigns).filter(([, value]) => value && value !== "starting"));

const initialState: NotesPageStore = {
    projects: [],
    notes: {},
    assigns: {},
    progress: {},
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

    private refreshing = false;

    async load() {
        try {
            const [projects, notes, assigns] = await Promise.all([projectsListAjax(), pageLoadAjax({name: NOTES_PAGE}), pageLoadAjax({name: ASSIGNS_PAGE})]);
            this.setStore(state => {
                state.projects = projects;
            });
            this.setStore(state => {
                state.notes = (notes ?? {}) as NotesMap;
            });
            this.setStore(state => {
                state.assigns = (assigns ?? {}) as Assigns;
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
        const key = assignKey(tab, note);
        const next = {...this.store.notes, [tab]: (this.store.notes[tab] ?? []).filter(item => item.id !== note.id)};
        const {[key]: _removed, ...assigns} = this.store.assigns;
        try {
            await pageSaveAjax({name: NOTES_PAGE, data: next});
            this.setStore(state => {
                state.notes = next;
            });
            if (key in this.store.assigns) {
                await pageSaveAjax({name: ASSIGNS_PAGE, data: savedAssigns(assigns)});
                this.setStore(state => {
                    state.assigns = assigns;
                });
            }
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

    async assign(tab: string, note: Note) {
        const key = assignKey(tab, note);
        if (this.store.assigns[key]) return;
        const {[key]: _ended, ...progress} = this.store.progress;
        this.setStore(state => {
            state.assigns = {...this.store.assigns, [key]: "starting"};
        });
        this.setStore(state => {
            state.progress = progress;
        });
        flush();
        let chat: string;
        try {
            ({chat} = await notesAssignAssignAjax({tab, text: note.text}));
        } catch (error) {
            const {[key]: _starting, ...rest} = this.store.assigns;
            this.setStore(state => {
                state.assigns = rest;
            });
            this.setStore(state => {
                state.error = `Failed to assign the task: ${reason(error)}`;
            });
            flush();
            return;
        }
        const next = {...this.store.assigns, [key]: chat};
        try {
            await pageSaveAjax({name: ASSIGNS_PAGE, data: savedAssigns(next)});
            this.setStore(state => {
                state.assigns = next;
            });
            this.setStore(state => {
                state.error = "";
            });
        } catch (error) {
            const {[key]: _chat, ...rest} = this.store.assigns;
            this.setStore(state => {
                state.assigns = rest;
            });
            this.setStore(state => {
                state.error = `Failed to save: ${reason(error)}`;
            });
        }
        flush();
    }

    async followup(key: string, text: string) {
        const chat = this.store.assigns[key];
        const trimmed = text.trim();
        if (!chat || chat === "starting" || !trimmed) return false;
        try {
            const progress = await openBehaviourFollowupFollowupAjax({chat, text: trimmed});
            this.setStore(state => {
                state.progress = {...this.store.progress, [key]: progress};
            });
            this.setStore(state => {
                state.error = "";
            });
            flush();
            return true;
        } catch (error) {
            this.setStore(state => {
                state.error = `Failed to send the follow-up: ${reason(error)}`;
            });
            flush();
            return false;
        }
    }

    async refreshProgress() {
        const running = Object.entries(this.store.assigns).filter(([key, chat]) => chat !== "starting" && !ENDED.includes(this.store.progress[key]?.status));
        if (this.refreshing || running.length === 0) return;
        this.refreshing = true;
        const loaded = await Promise.all(
            running.map(async ([key, chat]) => {
                try {
                    return [key, await openBehaviourProgressProgressAjax({chat})] as const;
                } catch (error) {
                    return [key, {status: "error", steps: [], error: reason(error)} satisfies Progress] as const;
                }
            })
        );
        this.setStore(state => {
            state.progress = {...this.store.progress, ...Object.fromEntries(loaded)};
        });
        const failed = loaded.filter(([, progress]) => progress.status === "failed").map(([key]) => key);
        if (failed.length > 0) {
            const remove = (assigns: Assigns) => Object.fromEntries(Object.entries(assigns).filter(([key]) => !failed.includes(key)));
            try {
                await pageSaveAjax({name: ASSIGNS_PAGE, data: savedAssigns(remove(this.store.assigns))});
                this.setStore(state => {
                    state.assigns = remove(this.store.assigns);
                });
            } catch (error) {
                this.setStore(state => {
                    state.error = `Failed to save: ${reason(error)}`;
                });
            }
        }
        this.refreshing = false;
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
