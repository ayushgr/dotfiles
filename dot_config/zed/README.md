# Zed

`keymap.json`, `tasks.json` and the generated theme are managed here. `settings.json` is not, because Zed rewrites it; set its theme to `Dotfiles` once per device.

Zed's keymap editor writes to the deployed `keymap.json`. Copy such changes back with `chezmoi re-add`.

## Review notes

Notes on code for a coding agent that runs outside Zed. The pieces are `review-notes.sh`, two tasks in `tasks.json` and two bindings in `keymap.json`.

- `cmd-'` on a line or selection asks for a note in a terminal prompt and appends it, with the file location and the code, to `.review-notes.md` in the project root.
- `cmd-:` copies a prompt that points the agent at that file and tells it to empty the file when done. Nothing else clears the notes.
- The notes file is added to the repo's `.git/info/exclude` on the first note, so it never shows up in git.
- `cmd-'` first copies the selection, or the cursor's line, and the script reads the note's code from the clipboard. Each note therefore overwrites the clipboard.
- Zed gives a task no usable position on the old side of a diff view. There the script finds the text in the last commit and heads the note "old version of the code".
- `cmd-'` replaces Zed's default for toggling a diff hunk in a file editor.
