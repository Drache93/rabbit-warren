import { command, arg, summary } from 'paparam'
import { restore } from '../lib/snapshot.js'
import { bold, cyan, green, gray, yellow, red } from '../lib/color.js'
import {
  activeSession,
  setActiveSession,
  readSession,
  getSessionStashDir
} from '../lib/sessions.js'

export const enterCmd = command(
  'enter',
  summary('Enter a named session, restoring all repos if it exists'),
  arg('<name>', 'Session name'),
  async (cmd) => {
    try {
      const name = cmd.args.name

      const current = activeSession()
      if (current && current !== name) {
        throw new Error(`Already in session "${current}". Run \`wrn leave\` first.`)
      }

      const session = readSession(name)
      setActiveSession(name)

      if (!session || Object.keys(session.repos).length === 0) {
        console.log(`\n  ${green('→')} ${bold('Session')} ${cyan(name)} ${gray('started')}\n`)
        return
      }

      console.log(`\n  ${green('↑')} ${bold('Restoring session')} ${cyan(name)}\n`)

      for (const { repoSlug, repoPath } of Object.values(session.repos)) {
        const stashDir = getSessionStashDir(name, repoSlug)
        try {
          const { meta, switched } = await restore(null, repoPath, stashDir)
          console.log(
            `    ${cyan(repoSlug)}  ${yellow(meta.branch)}${switched ? gray(' (switched)') : ''}`
          )
        } catch (err) {
          console.log(`    ${cyan(repoSlug)}  ${red('!')} ${gray(err.message)}`)
        }
      }

      console.log()
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
