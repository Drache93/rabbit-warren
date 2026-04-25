import { command, arg, summary } from 'paparam'
import { restore } from '../lib/snapshot.js'
import { bold, cyan, yellow, gray, green } from '../lib/color.js'

export const popCmd = command(
  'pop',
  summary('Restore a stash (most recent if no name given)'),
  arg('[name]', 'Name of the stash to restore'),
  async (cmd) => {
    try {
      const { name, meta } = await restore(cmd.args.name)
      console.log(`\n  ${green('↑')} ${bold('Restored')} ${cyan(name)}`)
      console.log(`    ${gray('branch')}    ${yellow(meta.branch)}`)
      console.log(
        `    ${gray('git')}       ${meta.stats.files} tracked, ${meta.stats.untracked ?? 0} untracked`
      )
      console.log(
        `    ${gray('modules')}   ${meta.stats.links} symlinks, ${meta.stats.modified} modified files\n`
      )
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
