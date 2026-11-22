import {notesAssignAssignAjax} from "util/ajax/api/public/notes_assign/assign";
import {openBehaviourFollowupFollowupAjax} from "util/ajax/api/public/open_behaviour_followup/followup";
import {openBehaviourProgressProgressAjax} from "util/ajax/api/public/open_behaviour_progress/progress";
import {pageLoadAjax} from "util/ajax/api/public/page/load";
import {pageSaveAjax} from "util/ajax/api/public/page/save";
import {projectsListAjax} from "util/ajax/api/public/projects/list";
import {assignKey} from "util/note";
import {createStore, flush} from "solid-js";

import type {Note, NotesPageContext, NotesPageStore, Progress} from "./types";

const NOTES_PAGE = "notes";
const ASSIGNS_PAGE = "notes-assigns";
const ENDED = ["finished", "failed", "stopped", "error"];

type NotesMap = Record<string, Note[]>;
type Assigns = Record<string, string>;

const reason = (error: unknown): string => (error instanceof Error ? error.message : "Unknown error");

const savedAssigns = (assigns: Assigns): Assigns => Object.fromEntries(Object.entries(assigns).filter(([, value]) => value && value !== "starting"));

export const createNotesPage = (): NotesPageContext => {
    const [store, setStore] = createStore<NotesPageStore>({
        projects: [],
        notes: {},
        assigns: {},
        progress: {},
        loaded: false,
        error: "",
        tab: "",
        addText: "",
    });
    let refreshing = false;

    const load = async () => {
        try {
            const [projects, notes, assigns] = await Promise.all([projectsListAjax(), pageLoadAjax({name: NOTES_PAGE}), pageLoadAjax({name: ASSIGNS_PAGE})]);
            setStore(state => {
                state.projects = projects;
            });
            setStore(state => {
                state.notes = (notes ?? {}) as NotesMap;
            });
            setStore(state => {
                state.assigns = (assigns ?? {}) as Assigns;
            });
            setStore(state => {
                state.loaded = true;
            });
            setStore(state => {
                state.error = "";
            });
        } catch (error) {
            setStore(state => {
                state.error = `Failed to load the notes: ${reason(error)}`;
            });
        }
        flush();
    };

    const addNote = async (tab: string, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return false;
        const next = {...store.notes, [tab]: [...(store.notes[tab] ?? []), {id: crypto.randomUUID(), text: trimmed}]};
        try {
            await pageSaveAjax({name: NOTES_PAGE, data: next});
            setStore(state => {
                state.notes = next;
            });
            setStore(state => {
                state.error = "";
            });
            flush();
            return true;
        } catch (error) {
            setStore(state => {
                state.error = `Failed to save: ${reason(error)}`;
            });
            flush();
            return false;
        }
    };

    const editNote = async (tab: string, note: Note, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return false;
        const items = (store.notes[tab] ?? []).map(item => (item.id === note.id ? {...item, text: trimmed} : item));
        const next = {...store.notes, [tab]: items};
        try {
            await pageSaveAjax({name: NOTES_PAGE, data: next});
            setStore(state => {
                state.notes = next;
            });
            setStore(state => {
                state.error = "";
            });
            flush();
            return true;
        } catch (error) {
            setStore(state => {
                state.error = `Failed to save: ${reason(error)}`;
            });
            flush();
            return false;
        }
    };

    const removeNote = async (tab: string, note: Note) => {
        const key = assignKey(tab, note);
        const next = {...store.notes, [tab]: (store.notes[tab] ?? []).filter(item => item.id !== note.id)};
        const {[key]: _removed, ...assigns} = store.assigns;
        try {
            await pageSaveAjax({name: NOTES_PAGE, data: next});
            setStore(state => {
                state.notes = next;
            });
            if (key in store.assigns) {
                await pageSaveAjax({name: ASSIGNS_PAGE, data: savedAssigns(assigns)});
                setStore(state => {
                    state.assigns = assigns;
                });
            }
            setStore(state => {
                state.error = "";
            });
        } catch (error) {
            setStore(state => {
                state.error = `Failed to save: ${reason(error)}`;
            });
        }
        flush();
    };

    const assign = async (tab: string, note: Note) => {
        const key = assignKey(tab, note);
        if (store.assigns[key]) return;
        const {[key]: _ended, ...progress} = store.progress;
        setStore(state => {
            state.assigns = {...store.assigns, [key]: "starting"};
        });
        setStore(state => {
            state.progress = progress;
        });
        flush();
        let chat: string;
        try {
            ({chat} = await notesAssignAssignAjax({tab, text: note.text}));
        } catch (error) {
            const {[key]: _starting, ...rest} = store.assigns;
            setStore(state => {
                state.assigns = rest;
            });
            setStore(state => {
                state.error = `Failed to assign the task: ${reason(error)}`;
            });
            flush();
            return;
        }
        const next = {...store.assigns, [key]: chat};
        try {
            await pageSaveAjax({name: ASSIGNS_PAGE, data: savedAssigns(next)});
            setStore(state => {
                state.assigns = next;
            });
            setStore(state => {
                state.error = "";
            });
        } catch (error) {
            const {[key]: _chat, ...rest} = store.assigns;
            setStore(state => {
                state.assigns = rest;
            });
            setStore(state => {
                state.error = `Failed to save: ${reason(error)}`;
            });
        }
        flush();
    };

    const followup = async (key: string, text: string) => {
        const chat = store.assigns[key];
        const trimmed = text.trim();
        if (!chat || chat === "starting" || !trimmed) return false;
        try {
            const progress = await openBehaviourFollowupFollowupAjax({chat, text: trimmed});
            setStore(state => {
                state.progress = {...store.progress, [key]: progress};
            });
            setStore(state => {
                state.error = "";
            });
            flush();
            return true;
        } catch (error) {
            setStore(state => {
                state.error = `Failed to send the follow-up: ${reason(error)}`;
            });
            flush();
            return false;
        }
    };

    const refreshProgress = async () => {
        const running = Object.entries(store.assigns).filter(([key, chat]) => chat !== "starting" && !ENDED.includes(store.progress[key]?.status));
        if (refreshing || running.length === 0) return;
        refreshing = true;
        const loaded = await Promise.all(
            running.map(async ([key, chat]) => {
                try {
                    return [key, await openBehaviourProgressProgressAjax({chat})] as const;
                } catch (error) {
                    return [key, {status: "error", steps: [], error: reason(error)} satisfies Progress] as const;
                }
            })
        );
        setStore(state => {
            state.progress = {...store.progress, ...Object.fromEntries(loaded)};
        });
        const failed = loaded.filter(([, progress]) => progress.status === "failed").map(([key]) => key);
        if (failed.length > 0) {
            const remove = (assigns: Assigns) => Object.fromEntries(Object.entries(assigns).filter(([key]) => !failed.includes(key)));
            try {
                await pageSaveAjax({name: ASSIGNS_PAGE, data: savedAssigns(remove(store.assigns))});
                setStore(state => {
                    state.assigns = remove(store.assigns);
                });
            } catch (error) {
                setStore(state => {
                    state.error = `Failed to save: ${reason(error)}`;
                });
            }
        }
        refreshing = false;
        flush();
    };

    const setTab = (tab: string) => {
        setStore(state => {
            state.tab = tab;
        });
        flush();
    };

    const setAddText = (text: string) => {
        setStore(state => {
            state.addText = text;
        });
        flush();
    };

    return {store, load, addNote, editNote, removeNote, assign, followup, refreshProgress, setTab, setAddText};
};
