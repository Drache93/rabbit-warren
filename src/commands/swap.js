import { command, arg, summary } from 'paparam'
import { capture, restore } from '../lib/snapshot.js'
import { bold, cyan, yellow, gray, green, red } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import {
  activeSession,
  setActiveSession,
  readSession,
  getSessionStashDir
} from '../lib/sessions.js'
import { deleteStash } from '../lib/storage.js'

export const swapCmd = command(
  'swap',
  summary('Save current session and switch to another'),
  arg('<name>', 'Session to swap to'),
  async (cmd) => {
    initStorageDir(cmd)
    try {
      const current = activeSession()
      if (!current) {
        console.log(`\n  ${gray('No active session to swap from.')}\n`)
        return
      }

      const target = cmd.args.name
      const targetSession = readSession(target)
      if (!targetSession) {
        console.log(`\n  ${gray('Session')} ${bold(target)} ${gray('not found.')}\n`)
        return
      }

      const currentSession = readSession(current)

      console.log(`\n  ${green('⇄')} ${bold('Swapping')} ${cyan(current)} ${gray('→')} ${cyan(target)}\n`)

      // Re-capture all repos in current session (update snapshots, clean working dirs)
      if (currentSession) {
        for (const { repoSlug, repoPath } of Object.values(currentSession.repos)) {
          const stashDir = getSessionStashDir(current, repoSlug)
          deleteStash(stashDir)
          try {
            capture(repoSlug, repoPath, stashDir, current, { clean: true })
            console.log(`    ${gray('saved')}    ${cyan(repoSlug)}`)
          } catch (err) {
            console.log(`    ${red('!')} ${gray(err.message)}`)
          }
        }
      }

      console.log()

      // Apply target session (keep its snapshot data intact)
      for (const { repoSlug, repoPath } of Object.values(targetSession.repos)) {
        const stashDir = getSessionStashDir(target, repoSlug)
        try {
          const { meta, switched } = restore(null, repoPath, stashDir, { keep: true })
          console.log(
            `    ${gray('restored')} ${cyan(repoSlug)}  ${yellow(meta.branch)}${switched ? gray(' (switched)') : ''}`
          )
        } catch (err) {
          console.log(`    ${red('!')} ${gray(err.message)}`)
        }
      }

      setActiveSession(target)

      console.log()
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
