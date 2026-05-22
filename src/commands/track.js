import path from 'node:path'
import { command, arg, summary } from 'paparam'
import { capture } from '../lib/snapshot.js'
import { makeRepoSlug, deleteStash } from '../lib/storage.js'
import { getRepoRoot } from '../lib/git.js'
import { bold, cyan, green, gray, dim } from '../lib/color.js'
import {
  activeSession,
  registerRepo,
  getSessionStashDir,
  addExtra,
  captureExtra
} from '../lib/sessions.js'
import { initStorageDir } from '../lib/config.js'

export const trackCmd = command(
  'track',
  summary('Add a repo, file, or folder to the current session'),
  arg('[path]', 'Path to track (default: current directory)'),
  async (cmd) => {
    initStorageDir(cmd)
    try {
      const session = activeSession()
      if (!session) {
        console.log(`\n  ${gray('No active session.')}\n`)
        return
      }

      const targetPath = path.resolve(cmd.args.path || process.cwd())

      let repoRoot = null
      try {
        repoRoot = getRepoRoot(targetPath)
      } catch {
        // not a git repo — track as extra file/folder
      }

      if (repoRoot) {
        const slug = makeRepoSlug(repoRoot)
        const stashDir = getSessionStashDir(session, slug)
        deleteStash(stashDir)
        capture(slug, repoRoot, stashDir, session, { clean: false })
        registerRepo(session, slug, repoRoot)
        console.log(
          `\n  ${green('+')} ${bold('Tracking repo')} ${cyan(slug)} ${gray('in')} ${cyan(session)}\n`
        )
      } else {
        addExtra(session, targetPath)
        captureExtra(session, targetPath)
        console.log(
          `\n  ${green('+')} ${bold('Tracking')} ${dim(path.relative(process.cwd(), targetPath) || targetPath)} ${gray('in')} ${cyan(session)}\n`
        )
      }
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
