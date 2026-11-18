import { createEffect, createSignal, onSettled } from "solid-js";

import { cellEntries, cellText, filterFields, logColumns, pageCount, type LogEvent } from "util/log-event";

import { PAGE_SIZES, createLogsPage } from "./context";
import type { LogsResult } from "./types";
import "./index.css";

export default function LogsPage() {
  const [displayed, setDisplayed] = createSignal<LogsResult | null>(null);
  const [field, setField] = createSignal("");
  const [value, setValue] = createSignal("");
  const page = createLogsPage();
  let modal: HTMLDialogElement | undefined;
  let modalText: HTMLPreElement | undefined;

  createEffect(
    () => ({ loading: page.store.loading, result: page.store.result }),
    (state) => {
      if (!state.loading) setDisplayed(state.result);
    },
  );

  onSettled(() => void page.loadApps());

  const apps = () => page.store.servers.find((item) => item.id === page.store.server)?.apps ?? [];
  const statusText = () => {
    const state = page.store;
    if (state.loading) return "Loading…";
    if (!state.result) return "";
    return `Page ${state.result.page} of ${pageCount(state.result.total, state.result.page_size)} · ${state.result.total} events`;
  };
  const pages = () => {
    const result = page.store.result;
    return result ? pageCount(result.total, result.page_size) : 1;
  };
  const fields = () => {
    const result = page.store.result;
    return result ? filterFields(result.events) : [];
  };

  function openCell(event: MouseEvent) {
    const cell = (event.target as HTMLElement).closest("td, th");
    if (!cell || cell.scrollWidth <= cell.clientWidth || !modal || !modalText) return;
    modalText.textContent = cell.textContent;
    modal.showModal();
  }

  function submitFilter(event: SubmitEvent) {
    event.preventDefault();
    const name = field().trim();
    const text = value();
    if (!name || !text) return;
    setField("");
    setValue("");
    void page.addFilter(name, text);
  }

  return (
    <div id="logs-page" class="logs-page">
      <h1>Logs</h1>
      <div class="logs-page-tabs logs-page-servers">
        {page.store.loaded
          ? page.store.servers.map((item) => (
              <button type="button" class={{ on: item.id === page.store.server }} onClick={() => void page.selectServer(item.id)}>
                {item.name}
              </button>
            ))
          : null}
      </div>
      <div class="logs-page-tabs logs-page-apps">
        {page.store.loaded
          ? apps().map((item) => (
              <button
                type="button"
                class={{ on: item.id === page.store.app }}
                onClick={() => void page.show(page.store.server, item.id, page.store.date, 1)}
              >
                {item.name}
              </button>
            ))
          : null}
      </div>
      <p class="error" hidden={!page.store.error}>
        {page.store.error}
      </p>
      <form
        class="logs-page-bar logs-page-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void page.reload();
        }}
      >
        <label>
          Date (HKT)
          <input
            class="g-text-input date"
            type="date"
            value={page.store.date}
            onChange={(event) => {
              if (event.currentTarget.value) void page.show(page.store.server, page.store.app, event.currentTarget.value, 1);
            }}
          />
        </label>
        <label>
          Rows
          <select
            class="g-text-input page-size"
            value={page.store.pageSize}
            onChange={(event) => void page.setPageSize(Number(event.currentTarget.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option value={size}>{size} rows</option>
            ))}
          </select>
        </label>
        <button class="g-button refresh" disabled={page.store.loading}>
          Refresh
        </button>
      </form>
      <form class="logs-page-bar logs-page-filters" onSubmit={submitFilter}>
        <input
          class="g-text-input field"
          list="logs-page-fields"
          placeholder="Field"
          autocomplete="off"
          value={field()}
          onInput={(event) => setField(event.currentTarget.value)}
        />
        <datalist id="logs-page-fields">
          {fields().map((name) => (
            <option value={name} />
          ))}
        </datalist>
        <input
          class="g-text-input value"
          placeholder="Value"
          autocomplete="off"
          value={value()}
          onInput={(event) => setValue(event.currentTarget.value)}
        />
        <button class="g-button add-filter">Add filter</button>
        <span class="pills">
          {page.store.filters.map((filter, index) => (
            <span class="pill">
              <b>{filter.field}</b>
              {`: ${filter.value}`}
              <button type="button" title="Remove filter" onClick={() => void page.removeFilter(index)}>
                ×
              </button>
            </span>
          ))}
        </span>
      </form>
      <div class="logs-page-bar logs-page-pager">
        <button
          class="g-button prev"
          type="button"
          disabled={page.store.loading || (page.store.result?.page ?? 1) <= 1}
          onClick={() => void page.show(page.store.server, page.store.app, page.store.date, (page.store.result?.page ?? 1) - 1)}
        >
          Previous
        </button>
        <span class="status">{statusText()}</span>
        <button
          class="g-button next"
          type="button"
          disabled={page.store.loading || (page.store.result?.page ?? pages()) >= pages()}
          onClick={() => void page.show(page.store.server, page.store.app, page.store.date, (page.store.result?.page ?? 1) + 1)}
        >
          Next
        </button>
      </div>
      <div class="logs-page-list" onClick={openCell}>
        <EventTable result={displayed} />
      </div>
      <dialog
        class="logs-page-modal"
        ref={modal}
        onClick={(event) => {
          if (event.target === modal || (event.target as HTMLElement).closest(".close")) modal?.close();
        }}
      >
        <button class="g-button close" type="button">
          Close
        </button>
        <pre class="text" ref={modalText} />
      </dialog>
    </div>
  );
}

function EventTable(props: { result: () => LogsResult | null }) {
  const columns = () => {
    const result = props.result();
    return result && result.events.length > 0 ? logColumns(result.events) : [];
  };
  return (
    <>
      {props.result() && props.result()?.events.length === 0 ? <p class="empty">No log.</p> : null}
      {columns().length > 0 ? (
        <table>
          <thead>
            <tr>
              {columns().map((column) => (
                <th data-column={column.label}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(props.result()?.events ?? []).map((event) => (
              <tr class={typeof event.level === "string" ? event.level : ""}>
                {columns().map((column) => (
                  <td data-column={column.label}>
                    <Cell event={event} column={column} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}

function Cell(props: { event: LogEvent; column: { label: string; key: string } }) {
  const entries = () => cellEntries(props.event, props.column);
  return (
    <>
      {entries()
        ? entries()?.map(([key, text], index) => (
            <>
              {index ? "\n" : null}
              <b>{key}</b>
              {`: ${text}`}
            </>
          ))
        : cellText(props.event, props.column)}
    </>
  );
}
