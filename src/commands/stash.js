import { command, arg, summary } from 'paparam'
import { capture } from '../lib/snapshot.js'
import { bold, cyan, yellow, gray, green, red } from '../lib/color.js'
import { activeSession } from '../lib/sessions.js'
import { doLeave } from './leave.js'
import { initStorageDir } from '../lib/config.js'

export const stashCmd = command(
  'stash',
  summary('Save current dev context and clean the working directory'),
  arg('[name]', 'Name for this stash (default: branch-timestamp)'),
  async (cmd) => {
    initStorageDir(cmd)
    try {
      const session = activeSession()

      if (session) {
        console.log(`\n  ${green('↓')} ${bold('Leaving session')} ${cyan(session)}\n`)
        const results = await doLeave(session)
        for (const { repoSlug, meta, error } of results) {
          if (error) {
            console.log(`    ${cyan(repoSlug)}  ${red('!')} ${gray(error.message)}`)
          } else {
            console.log(`    ${cyan(repoSlug)}  ${yellow(meta.branch)}`)
          }
        }
        if (results.length > 0) console.log()
        console.log(`  ${gray('Run')} wrn enter ${cyan(session)} ${gray('to resume.')}\n`)
      }

      const { name, meta } = capture(cmd.args.name)
      console.log(`\n  ${green('↓')} ${bold('Stashed')} ${cyan(name)}`)
      console.log(`    ${gray('branch')}    ${yellow(meta.branch)}`)
      console.log(
        `    ${gray('git')}       ${meta.stats.files} tracked, ${meta.stats.untracked} untracked`
      )
      console.log(
        `    ${gray('modules')}   ${meta.stats.links} symlinks, ${meta.stats.modified} modified files`
      )
      console.log(`\n  ${gray('Working directory is now clean.')}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
