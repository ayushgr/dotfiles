# Claude Code mods

Mods change Claude Code's own interface. Each is a folder here and is loaded by listing its deployed path in `CLAUDE_CODE_PLUGIN_DIRS` in `.zprofile` (colon-separated).

- `turn-stats` replaces the `(shift+tab to cycle)` hint under the prompt with the session's model time and tool calls, e.g. `4 min · 80 tools`.

## Editing a mod

- Check it with `claude plugin validate <folder>` and `claude plugin test <folder>`, then apply.
- A running session reloads the deployed folder on change. New terminals pick up changes to the variable.
- Claude writes `tsconfig.json` and `.claude-plugin/types/` into the deployed folder. They are generated and not tracked here.
