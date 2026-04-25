# 🐇 rabbithole

You've been debugging for two hours. You're three `console.log`s deep into `node_modules`, you've got a symlinked local build of some lib, and you have twelve uncommitted files scattered everywhere.

Now something urgent just landed on a different branch.

**rabbithole** saves your whole mess — git changes, untracked files, hand-patched `node_modules`, symlinked local packages — and gets you out cleanly. Pop back in when you're done.

---

## Install

```sh
npm install -g rabbithole
```

Or link locally during development:

```sh
npm link
```

---

## Usage

```sh
rabbithole stash [name]    # save context, clean working directory
rabbithole pop [name]      # restore most recent (or named) stash
rabbithole swap <name>     # bidirectional swap — run again to swap back
rabbithole list            # see all stashes for this repo
```

### Typical flow

```sh
# deep in a debug session — changes everywhere
rabbithole stash debug-auth

# working directory is now clean — switch branches safely
git checkout main

# fix the urgent thing, come back...
git checkout feature/auth

# pick up exactly where you left off
rabbithole pop debug-auth
```

---

## What gets stashed

| Thing | How |
|---|---|
| Tracked file changes | `git diff HEAD` patch |
| Untracked files | copied and removed from working dir |
| Symlinked packages | symlink targets saved as JSON |
| Hand-edited `node_modules` files | individual files copied (no full copies) |

Stashes live at `~/.rabbithole/<repo>/` — outside the repo, safe from git.

---

## Notes

- `stash` always leaves the working directory clean (`git status` shows nothing)
- `swap` is fully reversible — run `rabbithole swap <name>` again to undo
- Modified `node_modules` detection uses file mtimes relative to your lockfile
- Gitignored files (including `node_modules` itself) stay put after stash
