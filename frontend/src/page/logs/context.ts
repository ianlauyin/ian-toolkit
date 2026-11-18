import { createStore, flush } from "solid-js";
import { logsAppsListAjax } from "util/ajax/api/public/logs_apps/list";
import { logsEventsLoadAjax } from "util/ajax/api/public/logs_events/load";

import type { LogFilter, LogsPageContext, LogsPageStore, LogsResult } from "./types";

export const PAGE_SIZES = [50, 100, 500, 1000];
const HKT_OFFSET_MS = 8 * 60 * 60 * 1000;

const hktToday = (): string => new Date(Date.now() + HKT_OFFSET_MS).toISOString().slice(0, 10);

const reason = (error: unknown): string => (error instanceof Error ? error.message : "Unknown error");

export const createLogsPage = (): LogsPageContext => {
  const [store, setStore] = createStore<LogsPageStore>({
    servers: [],
    server: "",
    app: "",
    date: hktToday(),
    pageSize: PAGE_SIZES[0],
    filters: [],
    result: null,
    loading: false,
    loaded: false,
    error: "",
  });
  let requestId = 0;

  const show = async (server: string, app: string, date: string, page: number) => {
    const id = ++requestId;
    setStore((state) => {
      state.server = server;
    });
    setStore((state) => {
      state.app = app;
    });
    setStore((state) => {
      state.date = date;
    });
    if (!app) {
      setStore((state) => {
        state.result = null;
      });
      setStore((state) => {
        state.loading = false;
      });
      setStore((state) => {
        state.error = "";
      });
      flush();
      return;
    }
    setStore((state) => {
      state.loading = true;
    });
    flush();
    try {
      const result = await logsEventsLoadAjax({
        server,
        app,
        date,
        page,
        page_size: store.pageSize,
        filters: JSON.stringify(store.filters),
      });
      if (id !== requestId) return;
      const next: LogsResult = { ...result, server, app, date };
      setStore((state) => {
        state.result = next;
      });
      setStore((state) => {
        state.error = "";
      });
    } catch (error) {
      if (id !== requestId) return;
      setStore((state) => {
        state.result = null;
      });
      setStore((state) => {
        state.error = `Failed to load the logs: ${reason(error)}`;
      });
    }
    setStore((state) => {
      state.loading = false;
    });
    flush();
  };

  const loadApps = async () => {
    try {
      const servers = await logsAppsListAjax();
      setStore((state) => {
        state.servers = servers;
      });
      setStore((state) => {
        state.server = servers[0]?.id ?? "";
      });
      setStore((state) => {
        state.app = servers[0]?.apps[0]?.id ?? "";
      });
      setStore((state) => {
        state.loaded = true;
      });
      setStore((state) => {
        state.error = "";
      });
    } catch (error) {
      setStore((state) => {
        state.error = `Failed to load the apps: ${reason(error)}`;
      });
    }
    flush();
    if (store.server && store.app) await show(store.server, store.app, store.date, 1);
  };

  const selectServer = (server: string) => {
    if (server === store.server) return;
    const item = store.servers.find((entry) => entry.id === server);
    return show(server, item?.apps[0]?.id ?? "", store.date, 1);
  };

  const reload = () => show(store.server, store.app, store.date, 1);

  const addFilter = (field: string, value: string) => {
    const filters: LogFilter[] = [...store.filters.filter((filter) => filter.field !== field), { field, value }];
    setStore((state) => {
      state.filters = filters;
    });
    flush();
    return reload();
  };

  const removeFilter = (index: number) => {
    setStore((state) => {
      state.filters = store.filters.filter((_, item) => item !== index);
    });
    flush();
    return reload();
  };

  const setPageSize = (pageSize: number) => {
    setStore((state) => {
      state.pageSize = pageSize;
    });
    flush();
    return reload();
  };

  return { store, loadApps, selectServer, show, reload, addFilter, removeFilter, setPageSize };
};
