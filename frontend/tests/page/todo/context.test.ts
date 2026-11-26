import assert from "node:assert/strict";
import {beforeEach, describe, it, vi} from "vitest";

const fake = vi.hoisted(() => ({
    saved: null as unknown,
    failLoad: false,
    failSave: false,
    saves: [] as {name: string; data: unknown}[],
}));

vi.mock("util/ajax/api/page/load", () => ({
    pageLoadAjax: async () => {
        if (fake.failLoad) throw new Error("db down");
        return fake.saved;
    },
}));

vi.mock("util/ajax/api/page/save", () => ({
    pageSaveAjax: async (request: {name: string; data: unknown}) => {
        if (fake.failSave) throw new Error("db down");
        fake.saves.push(request);
        return null;
    },
}));

import {TodoPageContext} from "../../../src/page/todo/context";

const card = (title: string, detail = "", deadline = "") => ({title, detail, deadline});
const titles = (todo: TodoPageContext, section: "pending" | "ongoing" | "reviewing") => todo.store.lists[section].map(item => item.title);

beforeEach(() => {
    fake.saved = null;
    fake.failLoad = false;
    fake.failSave = false;
    fake.saves = [];
});

describe("TodoPageContext", () => {
    it("shows the error when the load fails", async () => {
        fake.failLoad = true;
        const todo = new TodoPageContext();
        await todo.load();
        assert.equal(todo.store.loaded, false);
        assert.equal(todo.store.error, "Failed to load my TODOs: db down");
    });

    it("saves the full lists as todo-items on add", async () => {
        fake.saved = {pending: [card("a")]};
        const todo = new TodoPageContext();
        await todo.load();
        await todo.add("ongoing", {title: "  b  ", detail: " d ", deadline: "2026-12-01"});
        assert.deepEqual(fake.saves, [{name: "todo-items", data: {pending: [card("a")], ongoing: [card("b", "d", "2026-12-01")], reviewing: []}}]);
    });

    it("does not add or change a TODO with an empty title", async () => {
        fake.saved = {pending: [card("a")]};
        const todo = new TodoPageContext();
        await todo.load();
        await todo.add("pending", {title: "   ", detail: "x", deadline: ""});
        await todo.edit("pending", 0, {title: "", detail: "x", deadline: ""});
        assert.deepEqual(fake.saves, []);
        assert.deepEqual(titles(todo, "pending"), ["a"]);
    });

    it("edits the title, the detail and the deadline, and clears the deadline", async () => {
        fake.saved = {pending: [card("a", "", "2026-12-01"), card("b")]};
        const todo = new TodoPageContext();
        await todo.load();
        await todo.edit("pending", 0, {title: " c ", detail: " d ", deadline: ""});
        assert.deepEqual(todo.store.lists.pending, [card("c", "d", ""), card("b")]);
    });

    it("removes a TODO", async () => {
        fake.saved = {pending: [card("a"), card("b")]};
        const todo = new TodoPageContext();
        await todo.load();
        await todo.remove("pending", 0);
        assert.deepEqual(titles(todo, "pending"), ["b"]);
    });

    it("moves a TODO to a gap in the same column", async () => {
        fake.saved = {pending: [card("a"), card("b"), card("c")]};
        const todo = new TodoPageContext();
        await todo.load();
        await todo.move("pending", 0, "pending", 3);
        assert.deepEqual(titles(todo, "pending"), ["b", "c", "a"]);
        await todo.move("pending", 2, "pending", 0);
        assert.deepEqual(titles(todo, "pending"), ["a", "b", "c"]);
        await todo.move("pending", 1, "pending", 1);
        await todo.move("pending", 1, "pending", 2);
        assert.equal(fake.saves.length, 2);
    });

    it("moves a TODO to a gap in another column and keeps its detail and deadline", async () => {
        fake.saved = {pending: [card("a"), card("b", "d", "2026-12-01")], ongoing: [card("c")]};
        const todo = new TodoPageContext();
        await todo.load();
        await todo.move("pending", 1, "ongoing", 0);
        assert.deepEqual(todo.store.lists.ongoing, [card("b", "d", "2026-12-01"), card("c")]);
        assert.deepEqual(titles(todo, "pending"), ["a"]);
        await todo.move("ongoing", 0, "reviewing", 0);
        assert.deepEqual(titles(todo, "reviewing"), ["b"]);
    });

    it("keeps the last saved lists when a save fails", async () => {
        fake.saved = {pending: [card("a")]};
        const todo = new TodoPageContext();
        await todo.load();
        fake.failSave = true;
        await todo.add("pending", {title: "b", detail: "", deadline: ""});
        assert.deepEqual(titles(todo, "pending"), ["a"]);
        assert.equal(todo.store.error, "Failed to save: db down");
    });
});
