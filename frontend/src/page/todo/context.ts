import { createStore, flush } from "solid-js";
import { pageLoadAjax } from "util/ajax/api/public/page/load";
import { pageSaveAjax } from "util/ajax/api/public/page/save";
import { normalize, type RawTodo, type TodoLists } from "util/todo";

import type { Card, Section, TodoEdit, TodoPageContext, TodoPageStore } from "./types";

const PAGE_NAME = "todo-items";

const emptyLists = (): TodoLists => ({ pending: [], ongoing: [], reviewing: [] });

const card = (title: string, detail: string, deadline: string): Card => ({
  title,
  detail: detail.trim(),
  deadline,
});

const reason = (error: unknown): string => (error instanceof Error ? error.message : "Unknown error");

export const createTodoPage = (): TodoPageContext => {
  const [store, setStore] = createStore<TodoPageStore>({
    lists: emptyLists(),
    loaded: false,
    error: "",
    editing: null,
  });

  const save = async (next: TodoLists) => {
    try {
      await pageSaveAjax({ name: PAGE_NAME, data: next });
      setStore((state) => {
        state.lists = next;
      });
      setStore((state) => {
        state.error = "";
      });
    } catch (error) {
      setStore((state) => {
        state.error = `Failed to save: ${reason(error)}`;
      });
    }
    flush();
  };

  const load = async () => {
    try {
      const data = await pageLoadAjax({ name: PAGE_NAME });
      setStore((state) => {
        state.lists = normalize(data as RawTodo);
      });
      setStore((state) => {
        state.loaded = true;
      });
      setStore((state) => {
        state.error = "";
      });
    } catch (error) {
      setStore((state) => {
        state.error = `Failed to load my TODOs: ${reason(error)}`;
      });
    }
    flush();
  };

  const add = async (section: Section, fields: Card) => {
    const trimmed = fields.title.trim();
    if (!trimmed) return;
    await save({
      ...store.lists,
      [section]: [...store.lists[section], card(trimmed, fields.detail, fields.deadline)],
    });
  };

  const edit = async (section: Section, index: number, fields: Card) => {
    const trimmed = fields.title.trim();
    if (!trimmed) return;
    await save({
      ...store.lists,
      [section]: store.lists[section].with(index, card(trimmed, fields.detail, fields.deadline)),
    });
  };

  const remove = async (section: Section, index: number) => {
    await save({ ...store.lists, [section]: store.lists[section].toSpliced(index, 1) });
  };

  const move = async (fromSection: Section, from: number, toSection: Section, gap: number) => {
    if (fromSection === toSection) {
      if (gap === from || gap === from + 1) return;
      const items = store.lists[fromSection];
      const next = items.toSpliced(from, 1);
      next.splice(gap > from ? gap - 1 : gap, 0, items[from]);
      await save({ ...store.lists, [fromSection]: next });
      return;
    }
    const item = store.lists[fromSection][from];
    await save({
      ...store.lists,
      [fromSection]: store.lists[fromSection].toSpliced(from, 1),
      [toSection]: store.lists[toSection].toSpliced(gap, 0, item),
    });
  };

  const setEditing = (editing: TodoEdit | null) => {
    setStore((state) => {
      state.editing = editing;
    });
    flush();
  };

  return { store, load, add, edit, remove, move, setEditing };
};
