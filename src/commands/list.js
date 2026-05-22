import { command, summary } from 'paparam'
import { listSessions, activeSession } from '../lib/sessions.js'
import { green, bold, cyan, gray, dim } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'

export const listCmd = command('list', summary('List all sessions'), (cmd) => {
  initStorageDir(cmd)
  try {
    const sessions = listSessions()
    const current = activeSession()

    if (sessions.length === 0) {
      console.log(`\n  ${gray('No sessions found.')}\n`)
      return
    }

    console.log()
    for (const session of sessions) {
      const date = new Date(session.timestamp).toLocaleString()
      const repoCount = Object.keys(session.repos || {}).length
      const extraCount = (session.extras || []).length
      const detail = dim(`${repoCount}r${extraCount ? ` ${extraCount}x` : ''}`)
      const marker = session.name === current ? green('* ') : '  '
      console.log(`${marker}${cyan(bold(session.name))}  ${gray(date)}  ${detail}`)
    }

    console.log()
    console.log(`  ${dim('r=repos  x=extras  * = active')}`)
    console.log()
  } catch (err) {
    console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
    process.exit(1)
  }
})
