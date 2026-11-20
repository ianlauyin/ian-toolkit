import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { cellText, filterFields, logColumns, pageCount } from "util/log-event";

describe("log events", () => {
  it("puts context and extra after the other fields, and error_message last", () => {
    const events = [
      { ts: "t1", id: "i1", level: "info", error_message: null, context: { ip: "1.1.1.1" }, extra: {} },
      { ts: "t2", id: "i2", level: "warn", error_message: "boom", context: { user_agent: "ua" }, extra: { code: 5, ok: false } },
    ];
    const columns = logColumns(events);
    assert.deepEqual(columns.map((c) => c.label), ["ts", "level", "context", "extra", "error_message"]);
    assert.equal(cellText(events[0], columns[4]), "");
    assert.equal(cellText(events[1], columns[4]), "boom");
    assert.equal(cellText({ ts: "2026-10-31T22:08:03.077818073+08:00" }, { key: "ts", label: "ts" }), "2026-10-31 22:08:03");
  });

  it("shows the minutes and seconds of a log time", () => {
    assert.equal(cellText({ ts: new Date("2026-11-20T23:26:13.144244269+08:00") }, { key: "ts", label: "ts" }), "2026-11-20 23:26:13");
    assert.equal(cellText({ ts: new Date("2026-11-20T00:05:09+08:00") }, { key: "ts", label: "ts" }), "2026-11-20 00:05:09");
  });

  it("shows each key of context and extra on its own line", () => {
    const event = { context: { ip: "1.1.1.1", user_agent: "ua" }, extra: { code: 5, ok: false } };
    assert.equal(cellText(event, { key: "context", label: "context" }), "ip: 1.1.1.1\nuser_agent: ua");
    assert.equal(cellText(event, { key: "extra", label: "extra" }), "code: 5\nok: false");
    assert.equal(cellText({ extra: {} }, { key: "extra", label: "extra" }), "");
  });

  it("makes no column for an empty context or extra", () => {
    assert.deepEqual(
      logColumns([{ ts: "t1", level: "info", context: {}, extra: {} }]).map((c) => c.label),
      ["ts", "level"],
    );
  });

  it("gives the columns and each context and extra key as filter fields", () => {
    const events = [
      { ts: "t1", context: { ip: "1.1.1.1" }, extra: {} },
      { ts: "t2", context: { ip: "2.2.2.2" }, extra: { code: 5 } },
    ];
    assert.deepEqual(filterFields(events), ["ts", "context", "extra", "context.ip", "extra.code"]);
  });

  it("counts the pages", () => {
    assert.equal(pageCount(0, 50), 1);
    assert.equal(pageCount(50, 50), 1);
    assert.equal(pageCount(51, 50), 2);
  });
});
