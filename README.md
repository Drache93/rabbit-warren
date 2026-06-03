# 🐇 rabbit-warren

You've been debugging for two hours. You're three `console.log`s deep into `node_modules`, you've got a symlinked local build of some lib, and you have twelve uncommitted files scattered everywhere.

Now something urgent just landed on a different branch.

**rabbit-warren** saves your whole mess — git changes, untracked files, branch, hand-patched `node_modules`, symlinked local packages — and gets you out cleanly. Pop back in when you're done.

---

## Install

```sh
npm install -g rabbit-warren
```

Or link locally during development:

```sh
npm link
```

---

## Usage

```sh
# Core
wrn stash [name]       # save context and clean working directory
wrn pop [name]         # restore and delete session
wrn apply [name]       # restore without deleting
wrn swap <name>        # save current session, switch to another

# Inspect
wrn list               # list all sessions
wrn show [name]        # inspect a session's contents
wrn status             # show current session and tracked repos
wrn session            # print current session name
wrn diff [path]        # compare stashed files with current state

# Manage
wrn drop [name]        # delete session without restoring
wrn clean              # reset working directory, no save
wrn track [path]       # add a repo, file, or folder to current session
wrn untrack <path>     # remove from current session
wrn checkout <session> <path>  # apply a specific file from a session

# Share
wrn export [name]      # export session to .wrn.tar.gz
wrn import <file>      # import and apply session from archive
```

### Stash flow

```sh
# deep in a debug session on feature/auth — changes everywhere
wrn stash

# working directory is now clean — switch branches safely
git checkout main

# pick up exactly where you left off, returns to feature/auth
wrn pop
```

> `npm install` is not needed after stash — it runs automatically if `node_modules` were modified.

### Session flow

Every stash belongs to a named session. Multiple repos can live in the same session. Stashing always targets the active session (or `default` if none is set).

```sh
# name your session when you stash
wrn stash auth-refactor

# add another repo to the same session (no clean, just snapshot)
cd ~/dev/frontend
wrn track

# urgent fix needed — update snapshot for this repo and step away
wrn stash

# later, restore all repos in the session
wrn pop auth-refactor
```

Use `swap` to juggle two sessions without losing either:

```sh
wrn swap hotfix        # saves auth-refactor, restores hotfix
wrn swap auth-refactor # saves hotfix, restores auth-refactor
```

### Sharing sessions

```sh
# export a stored session
wrn export auth-refactor           # → auth-refactor.wrn.tar.gz

# snapshot current state, export, and discard the snapshot
wrn export --current

# import and apply on another machine
wrn import auth-refactor.wrn.tar.gz
```

---

## What gets stashed

| Thing                            | How                                      |
| -------------------------------- | ---------------------------------------- |
| Tracked file changes             | `git diff HEAD` patch                    |
| Untracked files                  | copied and removed from working dir      |
| Symlinked packages               | symlink targets saved as JSON            |
| Hand-edited `node_modules` files | individual files copied (no full copies) |

Sessions live at `~/.rabbit-warren/sessions/<name>/` — outside the repo, safe from git. One subdirectory per tracked repo plus a `session.json` index.

---

## Notes

- `stash` always leaves the working directory clean (`git status` shows nothing)
- `npm install` runs automatically after stash when `node_modules` were modified
- Modified `node_modules` detection uses file mtimes relative to your lockfile
- Gitignored files (including `node_modules` itself) stay put unless modified
- `stash --deep` also captures modified files in transitively linked dependencies
