import { command, arg, summary } from 'paparam'
import { restore } from '../lib/snapshot.js'
import { bold, cyan, yellow, gray, green, red } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import {
  activeSession,
  clearActiveSession,
  readSession,
  getSessionStashDir,
  deleteSession,
  restoreExtras
} from '../lib/sessions.js'

export const popCmd = command(
  'pop',
  summary('Restore a session and remove it (defaults to current session)'),
  arg('[name]', 'Session name (default: current session)'),
  (cmd) => {
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

      console.log(`\n  ${green('↑')} ${bold('Restoring session')} ${cyan(name)}\n`)

      const repos = Object.values(session.repos)
      for (const { repoSlug, repoPath } of repos) {
        const stashDir = getSessionStashDir(name, repoSlug)
        try {
          const { meta, switched } = restore(null, repoPath, stashDir)
          console.log(
            `    ${cyan(repoSlug)}  ${yellow(meta.branch)}${switched ? gray(' (switched)') : ''}`
          )
        } catch (err) {
          console.log(`    ${cyan(repoSlug)}  ${red('!')} ${gray(err.message)}`)
        }
      }

      restoreExtras(name)

      clearActiveSession()
      deleteSession(name)

      console.log()
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
