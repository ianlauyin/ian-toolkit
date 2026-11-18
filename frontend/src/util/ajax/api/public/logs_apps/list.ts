import { ajax } from "ian-framework-fe";

export interface LogsAppsListApp {
  id: string;
  name: string;
}

export interface LogsAppsListResponse {
  id: string;
  name: string;
  apps: LogsAppsListApp[];
}

export const logsAppsListAjax = (): Promise<LogsAppsListResponse[]> =>
  ajax<null, LogsAppsListResponse[]>("/logs-apps", "GET");
