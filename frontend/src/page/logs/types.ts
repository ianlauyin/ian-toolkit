import type { LogEvent } from "util/log-event";

export interface LogApp {
  id: string;
  name: string;
}

export interface LogServer {
  id: string;
  name: string;
  apps: LogApp[];
}

export interface LogFilter {
  field: string;
  value: string;
}

export interface LogsResult {
  page: number;
  page_size: number;
  total: number;
  events: LogEvent[];
  server?: string;
  app?: string;
  date?: string;
}

export interface LogsPageStore {
  servers: LogServer[];
  server: string;
  app: string;
  date: string;
  pageSize: number;
  filters: LogFilter[];
  result: LogsResult | null;
  loading: boolean;
  loaded: boolean;
  error: string;
}

export interface LogsPageContext {
  store: LogsPageStore;
  loadApps: () => Promise<void>;
  selectServer: (server: string) => Promise<void> | undefined;
  show: (server: string, app: string, date: string, page: number) => Promise<void>;
  reload: () => Promise<void>;
  addFilter: (field: string, value: string) => Promise<void>;
  removeFilter: (index: number) => Promise<void>;
  setPageSize: (pageSize: number) => Promise<void>;
}
