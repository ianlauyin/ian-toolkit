# Coding style: frontend

After a refactor,
1. cd to `frontend`.
2. run `pnpm format`.
3. run `pnpm check`, fix all the errors that they show.
4. run `ian-lint fe ..`, fix all the errors that they show.

## General

- Return early when a check fails. Keep the success path at the end of the function.
