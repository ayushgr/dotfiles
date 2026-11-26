# Antigravity CLI (`agy`)

Only the status line script and accent color file are tracked here; `~/.gemini/antigravity-cli/settings.json` is mutated interactively by `/config` and `/statusline` and is left per-device.

## Theme accent

`agy`'s `Terminal` color scheme uses ANSI blue (slots 4 and 12) for its main UI chrome. `theme-accent.tmpl` writes the active chezmoi theme's `accent` hex to `~/.gemini/antigravity-cli/theme-accent` (updated by `theme.sh`), and the `agy()` wrapper in `.zshrc` temporarily remaps slots 4 and 12 via OSC 4 while `agy` is running and resets them on exit via OSC 104.

## Setup (once per device)

Inside `agy`:

- Status line: `/statusline ~/.gemini/antigravity-cli/statusline.sh`
- Theme: `/config` → Color Scheme → `Terminal` (follows Ghostty's ANSI palette)
