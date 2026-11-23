export interface Note {
    id: string;
    text: string;
}

export interface Project {
    id: string;
    name: string;
}

export interface NotesPageStore {
    projects: Project[];
    notes: Record<string, Note[]>;
    loaded: boolean;
    error: string;
    tab: string;
    addText: string;
}
