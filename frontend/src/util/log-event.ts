export interface LogColumn {
  label: string;
  key: string;
}

export type LogEvent = Record<string, unknown>;

const HIDDEN_FIELDS = ["id"];
const MAP_FIELDS = ["context", "extra"];
const LAST_FIELD = "error_message";
const HKT_OFFSET_MS = 8 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, "0");

const hktClock = (value: Date): string => {
  const time = new Date(value.getTime() + HKT_OFFSET_MS);
  return `${time.getUTCFullYear()}-${pad(time.getUTCMonth() + 1)}-${pad(time.getUTCDate())} ${pad(time.getUTCHours())}:${pad(time.getUTCMinutes())}:${pad(time.getUTCSeconds())}`;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasKeys = (value: unknown) => isObject(value) && Object.keys(value).length > 0;

export const logColumns = (events: LogEvent[]): LogColumn[] => {
  const fields = new Set<string>();
  for (const event of events) {
    for (const key of Object.keys(event)) {
      if (!HIDDEN_FIELDS.includes(key) && !MAP_FIELDS.includes(key) && key !== LAST_FIELD) fields.add(key);
    }
  }
  const keys = [...fields];
  for (const key of MAP_FIELDS) if (events.some((event) => hasKeys(event[key]))) keys.push(key);
  if (events.some((event) => LAST_FIELD in event)) keys.push(LAST_FIELD);
  return keys.map((key) => ({ label: key, key }));
};

export const filterFields = (events: LogEvent[]): string[] => {
  const fields = new Set(logColumns(events).map((column) => column.label));
  for (const event of events) {
    for (const key of MAP_FIELDS) {
      if (isObject(event[key])) for (const sub of Object.keys(event[key])) fields.add(`${key}.${sub}`);
    }
  }
  return [...fields];
};

export const cellEntries = (event: LogEvent, column: LogColumn): [string, string][] | null => {
  const value = event[column.key];
  if (!MAP_FIELDS.includes(column.key) || !isObject(value)) return null;
  return Object.entries(value).map(([key, item]) => [
    key,
    typeof item === "object" && item !== null ? JSON.stringify(item) : String(item),
  ]);
};

export const cellText = (event: LogEvent, column: LogColumn): string => {
  const entries = cellEntries(event, column);
  if (entries) return entries.map(([key, text]) => `${key}: ${text}`).join("\n");
  const value = event[column.key];
  if (value === undefined || value === null) return "";
  if (column.key === "ts") return value instanceof Date ? hktClock(value) : String(value).slice(0, 19).replace("T", " ");
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

export const pageCount = (total: number, pageSize: number): number => Math.max(1, Math.ceil(total / pageSize));
