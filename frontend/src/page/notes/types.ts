export interface Note {
    id: string;
    text: string;
}

export interface Step {
    kind: string;
    text: string;
}

export interface Progress {
    status: string;
    steps: Step[];
    error?: string;
}

export interface Project {
    id: string;
    name: string;
}

export interface NotesPageStore {
    projects: Project[];
    notes: Record<string, Note[]>;
    assigns: Record<string, string>;
    progress: Record<string, Progress>;
    loaded: boolean;
    error: string;
    tab: string;
    addText: string;
}

export interface NotesPageContext {
    store: NotesPageStore;
    load: () => Promise<void>;
    addNote: (tab: string, text: string) => Promise<boolean>;
    editNote: (tab: string, note: Note, text: string) => Promise<boolean>;
    removeNote: (tab: string, note: Note) => Promise<void>;
    assign: (tab: string, note: Note) => Promise<void>;
    followup: (key: string, text: string) => Promise<boolean>;
    refreshProgress: () => Promise<void>;
    setTab: (tab: string) => void;
    setAddText: (text: string) => void;
}
