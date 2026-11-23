import assert from "node:assert/strict";
import {beforeEach, describe, it, vi} from "vitest";

const fake = vi.hoisted(() => ({
    notes: null as unknown,
    failProjects: false,
    failSave: false,
    saves: [] as {name: string; data: unknown}[],
}));

vi.mock("util/ajax/api/public/projects/list", () => ({
    projectsListAjax: async () => {
        if (fake.failProjects) throw new Error("db down");
        return [{id: "my-app", name: "my-app"}];
    },
}));

vi.mock("util/ajax/api/public/page/load", () => ({
    pageLoadAjax: async (_request: {name: string}) => fake.notes,
}));

vi.mock("util/ajax/api/public/page/save", () => ({
    pageSaveAjax: async (request: {name: string; data: unknown}) => {
        if (fake.failSave) throw new Error("db down");
        fake.saves.push(request);
        return null;
    },
}));

import {NotesPageContext} from "../../../src/page/notes/context";

beforeEach(() => {
    fake.notes = null;
    fake.failProjects = false;
    fake.failSave = false;
    fake.saves = [];
});

describe("notes", () => {
    it("adds a note and saves it", async () => {
        const notes = new NotesPageContext();
        await notes.load();
        assert.equal(await notes.addNote("my-app", "  Add a route.  "), true);
        assert.equal(notes.store.notes["my-app"][0].text, "Add a route.");
        assert.equal(fake.saves[0].name, "notes");
        assert.equal(await notes.addNote("my-app", "  "), false);
    });

    it("edits a note and keeps its id", async () => {
        const notes = new NotesPageContext();
        await notes.load();
        await notes.addNote("my-app", "Add a route.");
        const note = notes.store.notes["my-app"][0];
        assert.equal(await notes.editNote("my-app", note, "  Add two routes.  "), true);
        assert.deepEqual(notes.store.notes["my-app"], [{id: note.id, text: "Add two routes."}]);
        assert.equal(await notes.editNote("my-app", note, "  "), false);
        assert.equal(notes.store.notes["my-app"][0].text, "Add two routes.");
    });

    it("deletes a note", async () => {
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        const notes = new NotesPageContext();
        await notes.load();
        await notes.removeNote("my-app", {id: "n1", text: "x"});
        assert.deepEqual(notes.store.notes["my-app"], []);
    });

    it("shows the error when the load fails and keeps the notes", async () => {
        fake.failProjects = true;
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        const notes = new NotesPageContext();
        await notes.load();
        assert.equal(notes.store.loaded, false);
        assert.deepEqual(notes.store.notes, {});
        assert.equal(notes.store.error, "Failed to load the notes: db down");
    });

    it("keeps the last saved notes when a save fails", async () => {
        const notes = new NotesPageContext();
        await notes.load();
        await notes.addNote("my-app", "Add a route.");
        const note = notes.store.notes["my-app"][0];
        fake.failSave = true;
        assert.equal(await notes.addNote("my-app", "Second."), false);
        assert.equal(await notes.editNote("my-app", note, "Changed."), false);
        await notes.removeNote("my-app", note);
        assert.deepEqual(notes.store.notes["my-app"], [{id: note.id, text: "Add a route."}]);
        assert.equal(notes.store.error, "Failed to save: db down");
    });
});
