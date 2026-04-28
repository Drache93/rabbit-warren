import { command, summary } from 'paparam'
import { capture } from '../lib/snapshot.js'
import { deleteStash } from '../lib/storage.js'
import { bold, cyan, green, gray, yellow, red } from '../lib/color.js'
import {
  activeSession,
  clearActiveSession,
  readSession,
  getSessionStashDir
} from '../lib/sessions.js'

export async function doLeave(name) {
  const session = readSession(name)
  const repos = session ? Object.values(session.repos) : []
  const results = []

  for (const { repoSlug, repoPath } of repos) {
    const stashDir = getSessionStashDir(name, repoSlug)
    deleteStash(stashDir)
    try {
      const { meta } = await capture(repoSlug, repoPath, stashDir, name)
      results.push({ repoSlug, meta, error: null })
    } catch (err) {
      results.push({ repoSlug, meta: null, error: err })
    }
  }

  clearActiveSession()
  return results
}

export const leaveCmd = command(
  'leave',
  summary('Save all session repos and exit the current session'),
  async () => {
    try {
      const name = activeSession()
      if (!name) {
        console.log(`\n  ${gray('No active session.')}\n`)
        return
      }

      console.log(`\n  ${green('↓')} ${bold('Leaving session')} ${cyan(name)}\n`)

      const results = await doLeave(name)

      for (const { repoSlug, meta, error } of results) {
        if (error) {
          console.log(`    ${cyan(repoSlug)}  ${red('!')} ${gray(error.message)}`)
        } else {
          console.log(`    ${cyan(repoSlug)}  ${yellow(meta.branch)}`)
        }
      }

      if (results.length > 0) console.log()
      console.log(`  ${gray('Run')} wrn enter ${cyan(name)} ${gray('to resume.')}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
