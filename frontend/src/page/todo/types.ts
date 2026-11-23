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
