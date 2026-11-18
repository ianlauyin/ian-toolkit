use std::path::Path;

pub(crate) fn task_prompt(tab: &str, root: &Path, text: &str) -> String {
    format!(
        "Do one task in the project `{tab}`. The project is at `{root}`.\n\n\
         The task, from the notes of the user:\n\n{text}\n\n\
         Obey `AGENTS.md`.",
        root = root.display(),
    )
}
