import type {TodoCard, TodoLists} from "util/todo";

export type Section = "pending" | "ongoing" | "reviewing";

export type Card = TodoCard;

export interface TodoEdit {
    section: Section;
    index: number;
}

export interface TodoPageStore {
    lists: TodoLists;
    loaded: boolean;
    error: string;
    editing: TodoEdit | null;
}

export interface TodoPageContext {
    store: TodoPageStore;
    load: () => Promise<void>;
    add: (section: Section, fields: Card) => Promise<void>;
    edit: (section: Section, index: number, fields: Card) => Promise<void>;
    remove: (section: Section, index: number) => Promise<void>;
    move: (fromSection: Section, from: number, toSection: Section, gap: number) => Promise<void>;
    setEditing: (editing: TodoEdit | null) => void;
}
