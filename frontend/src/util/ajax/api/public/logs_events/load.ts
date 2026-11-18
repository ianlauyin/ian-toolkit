import { ajax } from "ian-framework-fe";

export interface LogsEventsLoadRequest {
  server: string;
  app: string;
  date: string;
  page: number;
  page_size: number;
  filters: string;
}

export interface LogsEventsLoadResponse {
  page: number;
  page_size: number;
  total: number;
  events: Record<string, any>[];
}

export const logsEventsLoadAjax = (request: LogsEventsLoadRequest): Promise<LogsEventsLoadResponse> =>
  ajax<LogsEventsLoadRequest, LogsEventsLoadResponse>("/logs-events", "GET", request);
