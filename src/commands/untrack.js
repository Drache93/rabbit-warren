import path from 'node:path'
import { command, arg, summary } from 'paparam'
import { bold, cyan, gray, red } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import { getRepoRoot } from '../lib/git.js'
import { makeRepoSlug, deleteStash } from '../lib/storage.js'
import {
  activeSession,
  readSession,
  removeRepo,
  removeExtra,
  getSessionStashDir
} from '../lib/sessions.js'

export const untrackCmd = command(
  'untrack',
  summary('Remove a repo, file, or folder from the current session'),
  arg('<path>', 'Path to untrack'),
  (cmd) => {
    initStorageDir(cmd)
    try {
      const session = activeSession()
      if (!session) {
        console.log(`\n  ${gray('No active session.')}\n`)
        return
      }

      const targetPath = path.resolve(cmd.args.path)
      const sessionData = readSession(session)

      let repoRoot = null
      try {
        repoRoot = getRepoRoot(targetPath)
      } catch {
        // not a git repo
      }

      if (repoRoot) {
        const slug = makeRepoSlug(repoRoot)
        if (!sessionData?.repos[slug]) {
          console.log(
            `\n  ${gray('Repo')} ${bold(slug)} ${gray('is not tracked in session')} ${cyan(session)}.\n`
          )
          return
        }
        deleteStash(getSessionStashDir(session, slug))
        removeRepo(session, slug)
        console.log(`\n  ${red('−')} ${bold('Untracked repo')} ${cyan(slug)}\n`)
      } else {
        const matched = sessionData?.extras?.find((e) => e.originalPath === targetPath)
        if (!matched) {
          console.log(
            `\n  ${gray('Path')} ${bold(targetPath)} ${gray('is not tracked in session')} ${cyan(session)}.\n`
          )
          return
        }
        removeExtra(session, targetPath)
        console.log(`\n  ${red('−')} ${bold('Untracked')} ${cyan(targetPath)}\n`)
      }
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
