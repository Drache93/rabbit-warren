import { command, arg, summary } from 'paparam'
import { restore } from '../lib/snapshot.js'
import { bold, cyan, yellow, gray, green, red } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import {
  activeSession,
  setActiveSession,
  readSession,
  getSessionStashDir,
  restoreExtras
} from '../lib/sessions.js'

export const applyCmd = command(
  'apply',
  summary('Restore a session without removing it (defaults to current session)'),
  arg('[name]', 'Session name (default: current session)'),
  async (cmd) => {
    initStorageDir(cmd)
    try {
      const name = cmd.args.name || activeSession()
      if (!name) {
        console.log(`\n  ${gray('No active session. Provide a session name.')}\n`)
        return
      }

      const session = readSession(name)
      if (!session) {
        console.log(`\n  ${gray('Session')} ${bold(name)} ${gray('not found.')}\n`)
        return
      }

      console.log(`\n  ${green('↑')} ${bold('Applying session')} ${cyan(name)}\n`)

      for (const { repoSlug, repoPath } of Object.values(session.repos)) {
        const stashDir = getSessionStashDir(name, repoSlug)
        try {
          const { meta, switched } = restore(null, repoPath, stashDir, { keep: true })
          console.log(
            `    ${cyan(repoSlug)}  ${yellow(meta.branch)}${switched ? gray(' (switched)') : ''}`
          )
        } catch (err) {
          console.log(`    ${cyan(repoSlug)}  ${red('!')} ${gray(err.message)}`)
        }
      }

      restoreExtras(name, { keep: true })
      setActiveSession(name)

      console.log()
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
