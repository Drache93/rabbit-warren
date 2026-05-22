import { command, arg, flag, summary } from 'paparam'
import { exportSession, capture } from '../lib/snapshot.js'
import { bold, cyan, gray, green } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import {
  activeSession,
  readSession,
  getSessionStashDir,
  deleteSession
} from '../lib/sessions.js'
import { makeRepoSlug, deleteStash } from '../lib/storage.js'
import { getRepoRoot } from '../lib/git.js'

export const exportCmd = command(
  'export',
  summary('Export a session to a .wrn.tar.gz file'),
  arg('[name]', 'Session to export (default: most recent)'),
  arg('[output]', 'Output path (default: ./<name>.wrn.tar.gz)'),
  flag('--current', 'Snapshot current state, export, then clean up (non-destructive)'),
  async (cmd) => {
    initStorageDir(cmd)
    try {
      if (cmd.flags.current) {
        // Snapshot all current repos without cleaning, export, then remove snapshots
        const name = cmd.args.name || activeSession() || 'default'
        const session = readSession(name)

        if (!session) {
          // No session exists — snapshot current repo as a one-off
          const repoRoot = getRepoRoot()
          const slug = makeRepoSlug(repoRoot)
          const stashDir = getSessionStashDir(name, slug)
          deleteStash(stashDir)
          capture(slug, repoRoot, stashDir, name, { clean: false })
        } else {
          for (const { repoSlug, repoPath } of Object.values(session.repos)) {
            const stashDir = getSessionStashDir(name, repoSlug)
            deleteStash(stashDir)
            capture(repoSlug, repoPath, stashDir, name, { clean: false })
          }
        }

        const { outputPath } = exportSession(name, cmd.args.output)
        deleteSession(name)

        console.log(`\n  ${green('↗')} ${bold('Exported')} ${cyan(name)} ${gray('(snapshot not kept)')}`)
        console.log(`    ${gray('file')}  ${outputPath}\n`)
        return
      }

      const { name, outputPath } = exportSession(cmd.args.name, cmd.args.output)
      console.log(`\n  ${green('↗')} ${bold('Exported')} ${cyan(name)}`)
      console.log(`    ${gray('file')}  ${outputPath}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
