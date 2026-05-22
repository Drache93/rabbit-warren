import { command, summary } from 'paparam'
import { bold, cyan, yellow, gray, green, dim } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import { activeSession, readSession } from '../lib/sessions.js'

export const statusCmd = command(
  'status',
  summary('Show current session state and tracked repos'),
  (cmd) => {
    initStorageDir(cmd)
    try {
      const name = activeSession()

      if (!name) {
        console.log(`\n  ${gray('No active session.')}\n`)
        return
      }

      const session = readSession(name)
      const repos = session ? Object.values(session.repos) : []
      const extras = session?.extras || []

      console.log(`\n  ${green('Session')} ${cyan(bold(name))}\n`)

      if (repos.length === 0 && extras.length === 0) {
        console.log(`  ${gray('Nothing tracked yet.')}\n`)
        return
      }

      if (repos.length > 0) {
        for (const { repoSlug, repoPath } of repos) {
          console.log(`  ${yellow(repoSlug)}  ${dim(repoPath)}`)
        }
      }

      if (extras.length > 0) {
        console.log()
        for (const { originalPath, isDir } of extras) {
          console.log(`  ${dim(isDir ? 'dir' : 'file')}  ${yellow(originalPath)}`)
        }
      }

      console.log()
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
