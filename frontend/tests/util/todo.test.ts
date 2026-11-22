import assert from "node:assert/strict";
import {describe, it} from "vitest";
import {normalize} from "util/todo";

const card = (title: string, detail = "", deadline = "") => ({title, detail, deadline});

describe("normalize", () => {
    it("returns three empty lists when there is no data", () => {
        assert.deepEqual(normalize(null), {pending: [], ongoing: [], reviewing: []});
    });

    it("fills the missing detail and deadline", () => {
        assert.deepEqual(normalize({ongoing: [{title: "a"}]}).ongoing, [card("a")]);
    });

    it("loads the old lists as pending, with text as title", () => {
        const lists = normalize({important: [{text: "a"}], pending: [{text: "b"}]});
        assert.deepEqual(lists.pending, [card("a"), card("b")]);
        assert.deepEqual(normalize({items: [{text: "c"}]}).pending, [card("c")]);
    });
});
