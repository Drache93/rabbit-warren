import { command, summary } from 'paparam'
import { bold, cyan, gray } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import { activeSession } from '../lib/sessions.js'

export const sessionCmd = command(
  'session',
  summary('Show the current session name'),
  (cmd) => {
    initStorageDir(cmd)
    const name = activeSession()
    if (name) {
      console.log(`\n  ${cyan(bold(name))}\n`)
    } else {
      console.log(`\n  ${gray('(no active session)')}\n`)
    }
  }
)
