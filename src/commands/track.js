import { command, arg, summary } from 'paparam'
import { capture } from '../lib/snapshot.js'
import { makeRepoSlug, deleteStash } from '../lib/storage.js'
import { getRepoRoot } from '../lib/git.js'
import { bold, cyan, green, gray, yellow } from '../lib/color.js'
import { activeSession, registerRepo, getSessionStashDir } from '../lib/sessions.js'

export const trackCmd = command(
  'track',
  summary('Track the curent repo in the active session'),
  arg('[path]'),
  async (cmd) => {
    try {
      const session = activeSession()

      if (!session) {
        console.log(`\n  ${gray('No active session.')}\n`)
        return
      }

      const repoRoot = getRepoRoot(cmd.args.path)
      const slug = makeRepoSlug(repoRoot)
      const stashDir = getSessionStashDir(session, slug)

      deleteStash(stashDir)
      const { meta } = await capture(slug, process.cwd(), stashDir, session)
      registerRepo(session, slug, repoRoot)

      console.log(
        `\n  ${green('↓')} ${bold('Tracked')} ${cyan(slug)} ${gray('in')} ${cyan(session)}\n`
      )
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
