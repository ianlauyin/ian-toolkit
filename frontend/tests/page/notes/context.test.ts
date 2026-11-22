import assert from "node:assert/strict";
import {beforeEach, describe, it, vi} from "vitest";
import {assignKey} from "util/note";

const fake = vi.hoisted(() => ({
    notes: null as unknown,
    assigns: null as unknown,
    progress: {} as Record<string, {status: string; steps: {kind: string; text: string}[]}>,
    progressCalls: 0,
    failProjects: false,
    failSave: false,
    failAssign: false,
    failFollowup: false,
    hangAssign: false,
    saves: [] as {name: string; data: unknown}[],
    assignments: [] as {tab: string; text: string}[],
    followups: [] as {chat: string; text: string}[],
}));

vi.mock("util/ajax/api/public/projects/list", () => ({
    projectsListAjax: async () => {
        if (fake.failProjects) throw new Error("db down");
        return [{id: "my-app", name: "my-app"}];
    },
}));

vi.mock("util/ajax/api/public/page/load", () => ({
    pageLoadAjax: async (request: {name: string}) => (request.name === "notes" ? fake.notes : fake.assigns),
}));

vi.mock("util/ajax/api/public/page/save", () => ({
    pageSaveAjax: async (request: {name: string; data: unknown}) => {
        if (fake.failSave) throw new Error("db down");
        fake.saves.push(request);
        return null;
    },
}));

vi.mock("util/ajax/api/public/notes_assign/assign", () => ({
    notesAssignAssignAjax: async (request: {tab: string; text: string}) => {
        if (fake.hangAssign) await new Promise(() => {});
        if (fake.failAssign) throw new Error("no agent");
        fake.assignments.push(request);
        return {chat: "chat_1"};
    },
}));

vi.mock("util/ajax/api/public/open_behaviour_progress/progress", () => ({
    openBehaviourProgressProgressAjax: async (request: {chat: string}) => {
        fake.progressCalls += 1;
        if (!fake.progress[request.chat]) throw new Error("The chat has no log.");
        return fake.progress[request.chat];
    },
}));

vi.mock("util/ajax/api/public/open_behaviour_followup/followup", () => ({
    openBehaviourFollowupFollowupAjax: async (request: {chat: string; text: string}) => {
        if (fake.failFollowup) throw new Error("The agent is still working.");
        fake.followups.push(request);
        return {status: "running", steps: [{kind: "reply", text: request.text}]};
    },
}));

import {createNotesPage} from "../../../src/page/notes/context";

beforeEach(() => {
    fake.notes = null;
    fake.assigns = null;
    fake.progress = {};
    fake.progressCalls = 0;
    fake.failProjects = false;
    fake.failSave = false;
    fake.failAssign = false;
    fake.failFollowup = false;
    fake.hangAssign = false;
    fake.saves = [];
    fake.assignments = [];
    fake.followups = [];
});

describe("notes", () => {
    it("adds a note and saves it", async () => {
        const notes = createNotesPage();
        await notes.load();
        assert.equal(await notes.addNote("my-app", "  Add a route.  "), true);
        assert.equal(notes.store.notes["my-app"][0].text, "Add a route.");
        assert.equal(fake.saves[0].name, "notes");
        assert.equal(await notes.addNote("my-app", "  "), false);
    });

    it("edits a note and keeps its id and its task", async () => {
        const notes = createNotesPage();
        await notes.load();
        await notes.addNote("my-app", "Add a route.");
        const note = notes.store.notes["my-app"][0];
        await notes.assign("my-app", note);
        assert.equal(await notes.editNote("my-app", note, "  Add two routes.  "), true);
        assert.deepEqual(notes.store.notes["my-app"], [{id: note.id, text: "Add two routes."}]);
        assert.equal(notes.store.assigns[assignKey("my-app", note)], "chat_1");
        assert.equal(await notes.editNote("my-app", note, "  "), false);
        assert.equal(notes.store.notes["my-app"][0].text, "Add two routes.");
    });

    it("assigns a note and saves the chat", async () => {
        const notes = createNotesPage();
        await notes.load();
        await notes.addNote("my-app", "Add a route.");
        const note = notes.store.notes["my-app"][0];
        await notes.assign("my-app", note);
        await notes.assign("my-app", note);
        assert.deepEqual(fake.assignments, [{tab: "my-app", text: "Add a route."}]);
        assert.equal(notes.store.assigns[assignKey("my-app", note)], "chat_1");
        assert.deepEqual(fake.saves.at(-1), {name: "notes-assigns", data: {[assignKey("my-app", note)]: "chat_1"}});
    });

    it("keeps the note open when the start fails", async () => {
        const notes = createNotesPage();
        await notes.load();
        await notes.addNote("my-app", "Add a route.");
        fake.failAssign = true;
        await notes.assign("my-app", notes.store.notes["my-app"][0]);
        assert.deepEqual(notes.store.assigns, {});
        assert.match(notes.store.error, /no agent/);
    });

    it("removes the assign when the agent fails", async () => {
        const key = "my-app/n1";
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        fake.assigns = {[key]: "c1"};
        fake.progress = {c1: {status: "failed", steps: []}};
        const notes = createNotesPage();
        await notes.load();
        await notes.refreshProgress();
        assert.deepEqual(notes.store.notes["my-app"], [{id: "n1", text: "x"}]);
        assert.deepEqual(notes.store.assigns, {});
        assert.equal(notes.store.progress[key].status, "failed");
        await notes.assign("my-app", {id: "n1", text: "x"});
        assert.equal(notes.store.assigns[key], "chat_1");
    });

    it("deletes a note with its assign", async () => {
        const key = "my-app/n1";
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        fake.assigns = {[key]: "c1"};
        const notes = createNotesPage();
        await notes.load();
        await notes.removeNote("my-app", {id: "n1", text: "x"});
        assert.deepEqual(notes.store.notes["my-app"], []);
        assert.deepEqual(notes.store.assigns, {});
    });

    it("shows the error when the load fails and keeps the notes", async () => {
        fake.failProjects = true;
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        const notes = createNotesPage();
        await notes.load();
        assert.equal(notes.store.loaded, false);
        assert.deepEqual(notes.store.notes, {});
        assert.equal(notes.store.error, "Failed to load the notes: db down");
    });

    it("keeps the last saved notes when a save fails", async () => {
        const notes = createNotesPage();
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

    it("keeps the note open when the assign save fails", async () => {
        const notes = createNotesPage();
        await notes.load();
        await notes.addNote("my-app", "Add a route.");
        fake.failSave = true;
        await notes.assign("my-app", notes.store.notes["my-app"][0]);
        assert.deepEqual(notes.store.assigns, {});
        assert.equal(notes.store.error, "Failed to save: db down");
    });

    it("does not remove a stopped assign and keeps a failed assign when the save fails", async () => {
        const key = "my-app/n1";
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        fake.assigns = {[key]: "c1"};
        fake.progress = {c1: {status: "stopped", steps: []}};
        const notes = createNotesPage();
        await notes.load();
        await notes.refreshProgress();
        assert.deepEqual(notes.store.assigns, {[key]: "c1"});
        assert.deepEqual(fake.saves, []);

        fake.progress = {c1: {status: "failed", steps: []}};
        fake.failSave = true;
        const again = createNotesPage();
        await again.load();
        await again.refreshProgress();
        assert.deepEqual(again.store.assigns, {[key]: "c1"});
        assert.equal(again.store.error, "Failed to save: db down");
        const calls = fake.progressCalls;
        await again.refreshProgress();
        assert.equal(fake.progressCalls, calls);
    });

    it("sends a follow-up and sends nothing when the reply cannot start", async () => {
        const key = "my-app/n1";
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        fake.assigns = {[key]: "c1"};
        fake.progress = {c1: {status: "finished", steps: []}};
        const notes = createNotesPage();
        await notes.load();
        fake.hangAssign = true;
        const starting = notes.assign("my-app", {id: "n1-start", text: "y"});
        assert.equal(await notes.followup(key, "   "), false);
        assert.equal(await notes.followup("my-app/missing", "More."), false);
        assert.equal(await notes.followup("my-app/n1-start", "More."), false);
        assert.equal(await notes.followup(key, "  More.  "), true);
        assert.deepEqual(fake.followups, [{chat: "c1", text: "More."}]);
        const kept = notes.store.progress[key];
        fake.failFollowup = true;
        assert.equal(await notes.followup(key, "Again."), false);
        assert.equal(notes.store.error, "Failed to send the follow-up: The agent is still working.");
        assert.deepEqual(notes.store.progress[key], kept);
        void starting;
    });

    it("does not save a starting assign, so a reload can assign the note", async () => {
        fake.notes = {
            "my-app": [
                {id: "n1", text: "x"},
                {id: "n2", text: "y"},
            ],
        };
        fake.assigns = {"my-app/n2": "c2"};
        const notes = createNotesPage();
        await notes.load();
        fake.hangAssign = true;
        const pending = notes.assign("my-app", {id: "n1", text: "x"});
        assert.equal(notes.store.assigns["my-app/n1"], "starting");
        await notes.removeNote("my-app", {id: "n2", text: "y"});
        assert.deepEqual(fake.saves.at(-1), {name: "notes-assigns", data: {}});
        fake.hangAssign = false;
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        fake.assigns = {};
        const again = createNotesPage();
        await again.load();
        await again.assign("my-app", {id: "n1", text: "x"});
        assert.equal(again.store.assigns["my-app/n1"], "chat_1");
        void pending;
    });

    it("loads the new steps after a follow-up", async () => {
        const key = "my-app/n1";
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        fake.assigns = {[key]: "c1"};
        fake.progress = {c1: {status: "finished", steps: []}};
        const notes = createNotesPage();
        await notes.load();
        assert.equal(await notes.followup(key, "More."), true);
        assert.equal(notes.store.progress[key].status, "running");
        fake.progress.c1 = {status: "finished", steps: [{kind: "message", text: "Done."}]};
        await notes.refreshProgress();
        assert.equal(notes.store.progress[key].status, "finished");
        assert.equal(notes.store.progress[key].steps[0].text, "Done.");
    });

    it("does not load the progress of an ended agent again", async () => {
        const key = "my-app/n1";
        fake.notes = {"my-app": [{id: "n1", text: "x"}]};
        fake.assigns = {[key]: "c1"};
        for (const status of ["finished", "failed", "stopped", "error"]) {
            fake.progressCalls = 0;
            fake.progress = {c1: {status, steps: []}};
            const notes = createNotesPage();
            await notes.load();
            await notes.refreshProgress();
            const calls = fake.progressCalls;
            await notes.refreshProgress();
            assert.equal(fake.progressCalls, calls);
        }
    });
});
