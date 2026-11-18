import type { JSX } from "@solidjs/web";
import { Errored, onSettled } from "solid-js";
import Shell from "component/Shell";

import { createApp } from "./context";

export default function App(props: { children?: JSX.Element }) {
  const app = createApp();
  onSettled(() => app.start());
  return (
    <Errored
      fallback={(_error, reset) => (
        <div class="boot">
          <p>Something went wrong.</p>
          <button class="g-button" type="button" onClick={() => reset()}>
            Retry
          </button>
        </div>
      )}
    >
      <Shell>{props.children}</Shell>
    </Errored>
  );
}
