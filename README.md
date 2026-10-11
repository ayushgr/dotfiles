# dotfiles

My Dotfiles. Managed with [chezmoi](https://www.chezmoi.io/). macOS only.

## Setup Instructions

1. Install Homebrew
1. `brew install chezmoi`
1. `chezmoi init https://github.com/ayushgr/dotfiles.git`
1. `chezmoi apply`
1. `./install.sh` — installs packages and apps via Homebrew. Deliberately simple and manual; not run by chezmoi.

Language toolchains (Rust, Node, etc.) are installed per device, not from this repo.

## Shell Layout

| File | Runs for | Holds | Managed |
|---|---|---|---|
| `~/.zshenv` | every zsh, including scripts | whatever installers add (e.g. rustup's `~/.cargo/env`) | no — per device |
| `~/.zprofile` | login shells (each new terminal tab) | PATH and exported environment | yes |
| `~/.zshrc` | interactive shells | prompt, plugins, completions, aliases, keybindings | yes |

Each managed file sources a device-specific sibling at the end, for anything that differs per machine (e.g. work setup):

- `~/.zprofile.local` — device PATH entries and environment variables
- `~/.zshrc.local` — device aliases, functions, tool init

These `.local` files are never version controlled.

## Structural Rules

1. All aliases are set in `.zshrc`.
1. All abbreviations are set in `dot_config/zsh-abbr/private_user-abbreviations`. Edit the repo file, not `abbr add`.
1. Never alias a core command (`cd`, `ls`, `cat`, `find`, ...). Scripts and coding agents inherit aliases and break. Use an abbreviation instead — abbreviations only expand when typed at the prompt.
1. Zsh plugins are listed in `.zsh_plugins.txt` and loaded by antidote. Update them with `antidote update`.
1. Files that are imported manually into apps (not read from `~/.config` at runtime) live in `dot_config/imports/`.

## Themes

One palette drives the colors of Ghostty, herdr and Zed, and through Ghostty's ANSI palette everything that runs in the terminal (prompt, Claude status line, bat, delta, fzf, eza).

- A theme is a palette file in `.chezmoidata/themes/<name>.toml`: an `appearance` (`dark` or `light`) plus the same set of color slots in every theme. To add a theme, copy an existing file and change the name in its `[themes.<name>]` header.
- The default theme is the name in `.chezmoidata/theme.toml`. Each device can override it in `.chezmoidata/theme_local.toml`, which is not version controlled.
- `./theme.sh <name>` switches: it writes `.chezmoidata/theme_local.toml`, applies the generated files and reloads Ghostty and herdr. `./theme.sh` alone picks from a list, previewing each theme as it is highlighted. Like `install.sh`, the script stays in this repo and is not deployed, so run it from here (`chezmoi cd`).
- The generated files are templates that read the active palette: `dot_config/ghostty/themes/current.tmpl`, `dot_config/herdr/config.toml.tmpl`, `dot_config/zed/themes/dotfiles.json.tmpl` and `dot_claude/themes/dotfiles.json.tmpl`. Apps point at these fixed names, so a switch only changes file contents.
- Terminal programs must use ANSI colors 0-15 only, never 256-color indices or hex values, or they stop following the theme.
- Claude Code's own UI is its built-in dark or light preset, chosen by the active theme's `appearance`, plus what `dot_claude/themes/dotfiles.json.tmpl` overrides with ANSI slots (its warning color). Select `Dotfiles` in `/theme` once per device.
- Zed's `settings.json` is not managed here (Zed rewrites it). Set its theme to `Dotfiles` once per device.

## Claude Code mods

Mods change Claude Code's own interface. Each is a folder in `dot_claude/mods/<name>/` and is loaded by listing its deployed path in `CLAUDE_CODE_PLUGIN_DIRS` in `.zprofile` (colon-separated).

- `turn-stats` replaces the `(shift+tab to cycle)` hint under the prompt with the session's model time and tool calls, e.g. `4 min · 80 tools`.
- Check a mod after editing with `claude plugin validate <folder>` and `claude plugin test <folder>`, then apply. A running session reloads the deployed folder on change; new terminals pick up changes to the variable.
- Claude writes `tsconfig.json` and `.claude-plugin/types/` into the deployed folder. They are generated and not tracked here.

## Working in this repo

- Edit files here (the chezmoi source), then `chezmoi diff` and `chezmoi apply`.
- Before applying on a device, run `chezmoi diff` and ask the user about any local changes before proceeding. Use `chezmoi apply --error-on-conflict` so apply never prompts.
- If `chezmoi apply` says a target "has changed since chezmoi last wrote it", run `chezmoi diff <target>` first. Installers often append lines (PATH exports) to `~/.zshrc` or `~/.zprofile`; move those into the matching `.local` file (or drop them), then `chezmoi apply --force <target>`.
- chezmoi does not delete a target when its source file is removed. When deleting a file from the repo, delete the deployed copy too, and list it in the commit message so other devices can do the same.
- Commit messages that need follow-up on other devices include a "Steps for other devices" section.
