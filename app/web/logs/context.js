const HIDDEN_FIELDS = ["id"];
const MAP_FIELDS = ["context", "extra"];
const LAST_FIELD = "error_message";
export const PAGE_SIZES = [50, 100, 500, 1000];
const HKT_OFFSET_MS = 8 * 60 * 60 * 1000;

export function hktToday() {
  return new Date(Date.now() + HKT_OFFSET_MS).toISOString().slice(0, 10);
}

export function pageCount(total, pageSize) {
  return Math.max(1, Math.ceil(total / pageSize));
}

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const hasKeys = (value) => isObject(value) && Object.keys(value).length > 0;

// each field of an event owns a column, in the order that the page first sees it
// the context and the extra columns are after them, and the error_message column is the last one
export function logColumns(events) {
  const fields = new Set();
  for (const event of events) {
    for (const key of Object.keys(event)) {
      if (!HIDDEN_FIELDS.includes(key) && !MAP_FIELDS.includes(key) && key !== LAST_FIELD) fields.add(key);
    }
  }
  const keys = [...fields];
  for (const key of MAP_FIELDS) if (events.some((event) => hasKeys(event[key]))) keys.push(key);
  if (events.some((event) => LAST_FIELD in event)) keys.push(LAST_FIELD);
  return keys.map((key) => ({ label: key, key }));
}

// the filter can use a column, or one key of the context or the extra
export function filterFields(events) {
  const fields = new Set(logColumns(events).map((column) => column.label));
  for (const event of events) {
    for (const key of MAP_FIELDS) {
      if (isObject(event[key])) for (const sub of Object.keys(event[key])) fields.add(`${key}.${sub}`);
    }
  }
  return [...fields];
}

// a context or an extra cell is a list of [key, text], and a different cell is null
export function cellEntries(event, column) {
  const value = event[column.key];
  if (!MAP_FIELDS.includes(column.key) || !isObject(value)) return null;
  return Object.entries(value).map(([key, item]) => [key, typeof item === "object" ? JSON.stringify(item) : String(item)]);
}

export function cellText(event, column) {
  const entries = cellEntries(event, column);
  if (entries) return entries.map(([key, text]) => `${key}: ${text}`).join("\n");
  const value = event[column.key];
  if (value === undefined || value === null) return "";
  if (column.key === "ts") return String(value).slice(0, 19).replace("T", " ");
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

// onChange runs after each change of the state, so the page can render again
export function createLogs(api, onChange = () => {}) {
  const state = { servers: [], server: "", app: "", date: hktToday(), pageSize: PAGE_SIZES[0], filters: [], result: null, loading: false, loaded: false, error: "" };
  let requestId = 0;

  async function loadApps() {
    try {
      state.servers = await api.loadLogApps();
      state.server = state.servers[0]?.id ?? "";
      state.app = state.servers[0]?.apps[0]?.id ?? "";
      state.loaded = true;
      state.error = "";
    } catch (e) {
      state.error = `Failed to load the apps: ${e.message}`;
    }
    onChange();
    if (state.server && state.app) await show(state.server, state.app, state.date, 1);
  }

  function selectServer(server) {
    if (server === state.server) return;
    const item = state.servers.find((entry) => entry.id === server);
    return show(server, item?.apps[0]?.id ?? "", state.date, 1);
  }

  // a slow answer for an old tab or page does not replace a newer one
  async function show(server, app, date, page) {
    const id = ++requestId;
    state.server = server;
    state.app = app;
    state.date = date;
    if (!app) {
      state.result = null;
      state.loading = false;
      state.error = "";
      onChange();
      return;
    }
    state.loading = true;
    onChange();
    try {
      const result = await api.loadLogs({ server, app, date, page, page_size: state.pageSize, filters: JSON.stringify(state.filters) });
      if (id !== requestId) return;
      state.result = { ...result, server, app, date };
      state.error = "";
    } catch (e) {
      if (id !== requestId) return;
      state.result = null;
      state.error = `Failed to load the logs: ${e.message}`;
    }
    state.loading = false;
    onChange();
  }

  const reload = () => show(state.server, state.app, state.date, 1);

  // a new filter on a field replaces the old filter on that field
  function addFilter(field, value) {
    state.filters = [...state.filters.filter((f) => f.field !== field), { field, value }];
    return reload();
  }

  function removeFilter(index) {
    state.filters = state.filters.filter((_, i) => i !== index);
    return reload();
  }

  function setPageSize(pageSize) {
    state.pageSize = pageSize;
    return reload();
  }

  return { state, loadApps, selectServer, show, reload, addFilter, removeFilter, setPageSize };
}
