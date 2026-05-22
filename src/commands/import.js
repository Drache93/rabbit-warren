import { command, arg, summary } from 'paparam'
import { importSession, restore } from '../lib/snapshot.js'
import { bold, cyan, yellow, gray, green, red } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import { getSessionStashDir } from '../lib/sessions.js'

export const importCmd = command(
  'import',
  summary('Import a session from a .wrn.tar.gz file and apply it'),
  arg('<file>', 'Path to the .wrn.tar.gz file'),
  async (cmd) => {
    initStorageDir(cmd)
    try {
      const session = importSession(cmd.args.file)
      if (!session) throw new Error('Invalid session archive')

      console.log(`\n  ${green('↙')} ${bold('Imported session')} ${cyan(session.name)}\n`)

      for (const { repoSlug, repoPath } of Object.values(session.repos)) {
        const stashDir = getSessionStashDir(session.name, repoSlug)
        try {
          const { meta, switched } = restore(null, repoPath, stashDir)
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
