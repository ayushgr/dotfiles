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

## Working in this repo

- Edit files here (the chezmoi source), then `chezmoi diff` and `chezmoi apply`.
- If `chezmoi apply` says a target "has changed since chezmoi last wrote it", run `chezmoi diff <target>` first. Installers often append lines (PATH exports) to `~/.zshrc` or `~/.zprofile`; move those into the matching `.local` file (or drop them), then `chezmoi apply --force <target>`.
- chezmoi does not delete a target when its source file is removed. When deleting a file from the repo, delete the deployed copy too, and list it in the commit message so other devices can do the same.
- Commit messages that need follow-up on other devices include a "Steps for other devices" section.
