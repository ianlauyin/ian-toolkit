import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  servers: [] as { id: string; name: string; apps: { id: string; name: string }[] }[],
  failApps: false,
  failLogs: false,
  calls: [] as { server: string; app: string; date: string; page: number; page_size: number; filters: string }[],
  resolvers: [] as (() => void)[],
  hold: false,
}));

vi.mock("util/ajax/api/public/logs_apps/list", () => ({
  logsAppsListAjax: async () => {
    if (fake.failApps) throw new Error("down");
    return fake.servers;
  },
}));

vi.mock("util/ajax/api/public/logs_events/load", () => ({
  logsEventsLoadAjax: (params: (typeof fake.calls)[number]) => {
    if (fake.failLogs) return Promise.reject(new Error("down"));
    if (fake.hold) {
      return new Promise((resolve) => {
        fake.resolvers.push(() => resolve({ page: params.page, page_size: 50, total: 1, events: [] }));
      });
    }
    fake.calls.push(params);
    return Promise.resolve({ page: params.page, page_size: params.page_size, total: 120, events: [] });
  },
}));

import { createLogsPage } from "../../../src/page/logs/context";

const twoServers = [
  {
    id: "one",
    name: "one",
    apps: [
      { id: "my-app", name: "my-app" },
      { id: "other-app", name: "other-app" },
    ],
  },
  { id: "two", name: "two", apps: [{ id: "third-app", name: "third-app" }] },
];

beforeEach(() => {
  fake.servers = twoServers;
  fake.failApps = false;
  fake.failLogs = false;
  fake.calls = [];
  fake.resolvers = [];
  fake.hold = false;
});

describe("createLogsPage", () => {
  it("selects the first server and its first app", async () => {
    const logs = createLogsPage();
    await logs.loadApps();
    assert.equal(logs.store.server, "one");
    assert.equal(logs.store.app, "my-app");
    assert.equal(fake.calls[0].page, 1);
    assert.equal(logs.store.result?.total, 120);
  });

  it("loads another page and another app", async () => {
    const logs = createLogsPage();
    await logs.loadApps();
    await logs.show("one", "my-app", logs.store.date, 2);
    assert.equal(logs.store.result?.page, 2);
    await logs.show("one", "other-app", "2026-10-30", 1);
    assert.deepEqual(fake.calls.at(-1), {
      server: "one",
      app: "other-app",
      date: "2026-10-30",
      page: 1,
      page_size: 50,
      filters: "[]",
    });
  });

  it("selects the first app of a server and keeps the filters", async () => {
    const logs = createLogsPage();
    await logs.loadApps();
    await logs.addFilter("level", "warn");
    await logs.show("one", "other-app", logs.store.date, 2);
    await logs.selectServer("two");
    assert.equal(logs.store.server, "two");
    assert.equal(logs.store.app, "third-app");
    assert.deepEqual(logs.store.filters, [{ field: "level", value: "warn" }]);
    assert.equal(fake.calls.at(-1)?.page, 1);
    assert.equal(fake.calls.at(-1)?.server, "two");
    assert.equal(fake.calls.at(-1)?.filters, '[{"field":"level","value":"warn"}]');
    const calls = fake.calls.length;
    await logs.selectServer("two");
    assert.equal(fake.calls.length, calls);
  });

  it("does not load events for a server that has no app", async () => {
    fake.servers = [
      { id: "one", name: "one", apps: [{ id: "my-app", name: "my-app" }] },
      { id: "two", name: "two", apps: [] },
    ];
    const logs = createLogsPage();
    await logs.loadApps();
    assert.equal(fake.calls.length, 1);
    await logs.selectServer("two");
    assert.equal(logs.store.server, "two");
    assert.equal(logs.store.app, "");
    assert.equal(logs.store.result, null);
    assert.equal(fake.calls.length, 1);
  });

  it("loads page 1 again when the rows or the filters change", async () => {
    const logs = createLogsPage();
    await logs.loadApps();
    await logs.show("one", "my-app", logs.store.date, 2);
    await logs.setPageSize(100);
    assert.deepEqual([fake.calls.at(-1)?.page, fake.calls.at(-1)?.page_size], [1, 100]);
    await logs.addFilter("level", "warn");
    await logs.addFilter("level", "error");
    assert.deepEqual(logs.store.filters, [{ field: "level", value: "error" }]);
    assert.equal(fake.calls.at(-1)?.filters, '[{"field":"level","value":"error"}]');
    await logs.removeFilter(0);
    assert.equal(fake.calls.at(-1)?.filters, "[]");
  });

  it("keeps the newest answer when an old answer is slow", async () => {
    fake.hold = true;
    fake.servers = [{ id: "one", name: "one", apps: [{ id: "my-app", name: "my-app" }] }];
    const logs = createLogsPage();
    const first = logs.show("one", "my-app", "2026-10-30", 1);
    const second = logs.show("one", "my-app", "2026-10-30", 2);
    fake.resolvers[1]();
    await second;
    fake.resolvers[0]();
    await first;
    assert.equal(logs.store.result?.page, 2);
  });

  it("does not load events when there is no app", async () => {
    fake.servers = [];
    const logs = createLogsPage();
    await logs.loadApps();
    assert.equal(logs.store.app, "");
    assert.equal(logs.store.loaded, true);
    assert.equal(fake.calls.length, 0);
  });

  it("shows the error when the apps fail to load", async () => {
    fake.failApps = true;
    const logs = createLogsPage();
    await logs.loadApps();
    assert.equal(logs.store.loaded, false);
    assert.equal(logs.store.error, "Failed to load the apps: down");
  });

  it("shows the error when the load fails", async () => {
    fake.failLogs = true;
    const logs = createLogsPage();
    await logs.show("one", "my-app", "2026-10-30", 1);
    assert.match(logs.store.error, /down/);
    assert.equal(logs.store.result, null);
  });
});
