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
