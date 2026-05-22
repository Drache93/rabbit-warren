import { command, arg, summary } from 'paparam'
import { bold, gray, red } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import {
  activeSession,
  clearActiveSession,
  readSession,
  deleteSession,
  mostRecentSession
} from '../lib/sessions.js'

export const dropCmd = command(
  'drop',
  summary('Delete a session without restoring (defaults to current session)'),
  arg('[name]', 'Session name (default: current session)'),
  (cmd) => {
    initStorageDir(cmd)
    try {
      const name = cmd.args.name || activeSession() || mostRecentSession()?.name

      if (!name) {
        console.log(`\n  ${gray('No sessions found.')}\n`)
        return
      }

      if (!readSession(name)) {
        console.log(`\n  ${gray('Session')} ${bold(name)} ${gray('not found.')}\n`)
        return
      }

      if (activeSession() === name) clearActiveSession()
      deleteSession(name)

      console.log(`\n  ${red('x')} ${bold('Dropped session')} ${gray(name)}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
