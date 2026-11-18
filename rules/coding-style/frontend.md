# Coding style: frontend (SolidJS + TypeScript)

The website is `frontend/`.

## General

- Readability is more important than strict DRY. Do not add a helper, a generic type or an abstraction only to remove duplication.
- Do not write a comment in the code. A reference directive is not a comment.
- Put a decision in `catalog/frontend.md`.
- When the text is a reason and not a decision, add a test that fails when the code loses that reason.
- Use `interface` to declare an object shape. Do not use `type` for an object shape. Use `type` only for a union, an alias of a primitive, a mapped type, a tuple, a function type or a type that uses `keyof` or `typeof`.
- Do not use Logger. Do not use `console`.

## Imports

- Import a file from `frontend/src/component/` with the alias `component/`.
- Import a file from `frontend/src/util/` with the alias `util/`.
- Import a file from `frontend/src/module/` with the alias `module/`.
- The alias is in `frontend/tsconfig.json` and in `frontend/vite.config.ts`.
- Use a relative path for a file that is not in those three folders.

## Modules

- A module is one feature that more than one page uses. It has its own store and its own actions.
- Put each module in `frontend/src/module/{module}/`.
- Put the code of a module in `index.ts`. Put each type of the module in `types.ts`. Do not declare a type in `index.ts`.
- Declare the store type as `{Module}Store` at the top of `types.ts`. Create the store with `createStore` and this type. Do not export the setter.
- At the end of `index.ts`, export only `{Module}ModuleStore` and `{Module}ModuleAction`. `{Module}ModuleAction` is an object of the actions. Do not put a pure helper in it.
- A page or a component imports a module type from `types.ts` of the module.
- Only a page action or an app action calls a module action.
- Put a feature that one page uses in that page.

## Utils

- A pure helper has no store, no network call and no UI state.
- Put a pure helper that more than one file uses in `frontend/src/util/`. Keep a pure helper that only one file uses in that file.
- Name each file in `frontend/src/util/` for the data that its helpers handle. Export the helpers as named functions.
- A JSON call to the API is not a pure helper. The section Ajax gives its rules.

## Ajax

- Put each JSON call to the API in `frontend/src/util/ajax/`.
- The path of an ajax file after `frontend/src/util/ajax/` is the path of its handler file after `backend/src/router/`, with the extension `.ts`.
- One ajax file holds all JSON calls of one handler. A handler that has no JSON call has no ajax file. `mod.rs` and `state.rs` have no ajax file.
- Write each call as a named function. Build the name from the path of the ajax file after `frontend/src/util/ajax/api/public/`. Write the folder names and the file name in camelCase, and end the name with `Ajax`. Do not use only the file name.
- Declare `{Name}Request` and `{Name}Response` immediately before the function when the call has that value. `{Name}` is the function name without `Ajax`.
- A call with no request value has no request type. A call with no response value has no response type.
- A path parameter is an argument of the function. Do not put it in the request type.
- Put a type that more than one ajax file uses in `frontend/src/util/ajax/shared-types.ts`. Keep a type that only one file uses in that file.

## Pages

- The app entry is `frontend/src/index.tsx`. The app context is `frontend/src/context.ts`. The app types are in `frontend/src/types.ts`.
- Put each page in `frontend/src/page/{page}/`.
- The entry component of each page has an id selector.

## Context and actions

- The app and each page have a `context.ts` file. It holds the shared UI state and the shared UI actions.
- Keep the UI state in one store when the context has UI state. Create the store with `createStore` in the function that creates the context. Do not keep UI state in a module-level variable.
- Declare the store type at the top of `types.ts` in the same folder. Declare the type of the context value in that file too. Do not infer it with `ReturnType`.
- The type names are `{Page}PageStore` and `{Page}PageContext` for a page, and `AppContextValue` for the app.
- The context value has the store as `store` when the context has a store, each action, and each value that the store does not hold. A component reads the state from `store`. Do not return an accessor function for a field of the store.
- Write each page action and each app action as an arrow function. Do not use a `function` declaration.
- An action calls an ajax function or a module action directly. The context does not take an `api` argument.
- Keep the last saved value when a save fails.
- Set a page error to a sentence that starts with `Failed to`.
- Run work that a user does not start in the action of the owner. App startup runs in an app action. A page timer runs in a page action.

## Components

- Put UI primitives and controls that have no domain logic in `frontend/src/component/`.
- If only one component uses a sub-component, put the sub-component in the folder of that component.
- Put the constants before the component.
- Name the file `Xxx.tsx`. If the component has styles, use `Xxx/index.tsx` and `Xxx/index.css`.
- Put text from the user in text.

## Styles

- Each component `index.css` file has only one root selector.
- Nest each child selector in the block of its parent.
- Give the outermost tag of each page component and sub-component the class name `{page}-{component}-{sub-component}`.
- Give the outermost tag of each component in `frontend/src/component/` a class name with the `g-` prefix. Use the `g-` prefix also for the modifier classes on that tag.
- To override an internal part of a different component, put the `g-` class of that component in the selector.
- Take a color, a font, a radius, and a shadow from `frontend/src/style/tokens.css`.

## Build

- Build the page with `pnpm build` in `frontend`. The server serves `frontend/dist`.

## Tests

- Put the tests in `frontend/test/`. Do not put tests in `frontend/src/`.
- The path of a test file after `frontend/test/` is the path of its source file after `frontend/src/`, with `.test` before the extension.
- Name a test with the behaviour.
