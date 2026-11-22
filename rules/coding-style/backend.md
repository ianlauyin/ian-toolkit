# Coding style: backend

After a refactor,
1. cd to `backend`.
2. Run `cargo fmt`.
3. run `ian-lint be ..`, fix all the errors that they show.

## General

- Return early when a check fails. Keep the success path at the end of the function.
- Use JSON for the request and the response. Use a different format only for a route that needs a body that is not JSON.
- When a macro has the same name as its module, import the module to use the macro. That import can stay next to an import of an item from that module.
- Do not put a secret, a token, a query string or an env value in the message.
- When another error is the cause, pass that error as `source`.
- When an input is invalid or an operation fails, return an `Exception`.
