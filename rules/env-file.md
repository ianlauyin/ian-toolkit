# Env file

The values in `.env` are secrets. Do not read them. You can use them in a command.

- Do not read `.env` or a `.env.*` file. Do not show an env value. Do not write an env value in a file, a log, a commit, a doc, or a message.
- You can read `.env.example`. It has no real values.
- To use a variable, load `.env` in a subshell and hide the load output: `(set -a; source .env >/dev/null 2>&1; set +a; <command>)`.
- When the app loads `.env` itself, run the app. Do not load the file again.
- To see the names, print only the name before `=`. Do not print a full line.
- If an error can contain a value, show only the lines that you need and remove the values.
- In a file under `conf/`, write a secret as `env:NAME`. Do not write the value. Do not add a field for the variable name.
- Do not change a value in `.env`. Tell the user the variable name. You can add a name with an empty value. You can change `.env.example`.
