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
wrn stash [name]       # save context, clean working directory
wrn pop [name]         # restore most recent (or named) stash
wrn swap <name>        # bidirectional swap — run again to swap back
wrn list               # see all stashes for this repo

wrn enter <name>       # start or resume a named session (restores all repos)
wrn leave              # snapshot all session repos and exit
wrn checkout <branch>  # git checkout, but snapshots into the session first
wrn link [package]     # npm link, but snapshots into the session after
```

### Stash flow

```sh
# deep in a debug session on feature/auth — changes everywhere
wrn stash && npm i

# working directory is now clean — switch branches safely
git checkout main

# pick up exactly where you left off - returns to feature/auth
wrn pop
```

### Session flow

Sessions let you name a working context that spans multiple repos. Enter a session, work across repos using the session-aware commands, then leave. Everything is snapshotted together and restored when you come back.

```sh
# start a cross-repo session
wrn enter auth-refactor

# work in your API repo — checkout snapshots current state first
cd ~/dev/api
wrn checkout feature/auth-v2

# link and snapshot the frontend repo
cd ~/dev/frontend
wrn link ../api

# urgent fix needed — snapshot all session repos and step out
wrn leave
#   ↓ Leaving session auth-refactor
#     api    feature/auth-v2
#     frontend  main

# later, restore everything exactly as you left it
wrn enter auth-refactor
#   ↑ Restoring session auth-refactor
#     api    feature/auth-v2  (switched)
#     frontend  main
```

---

## What gets stashed

| Thing                            | How                                      |
| -------------------------------- | ---------------------------------------- |
| Tracked file changes             | `git diff HEAD` patch                    |
| Untracked files                  | copied and removed from working dir      |
| Symlinked packages               | symlink targets saved as JSON            |
| Hand-edited `node_modules` files | individual files copied (no full copies) |

Stashes live at `~/.rabbit-warren/<repo>/` — outside the repo, safe from git.

Sessions are stored at `~/.rabbit-warren/sessions/<name>/` — one subdirectory per linked repo, plus a `session.json` index.

---

## Notes

- `stash` always leaves the working directory clean (`git status` shows nothing)
- `swap` is fully reversible — run `rabbit-warren swap <name>` again to undo
- Modified `node_modules` detection uses file mtimes relative to your lockfile
- Gitignored files (including `node_modules` itself) stay put after stash
