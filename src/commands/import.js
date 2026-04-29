import { command, arg, summary } from 'paparam'
import { importAndRestore } from '../lib/snapshot.js'
import { bold, cyan, yellow, gray, green } from '../lib/color.js'

export const importCmd = command(
  'import',
  summary('Import and apply a stash from a .wrn.tar.gz file'),
  arg('<file>', 'Path to the .wrn.tar.gz file'),
  async (cmd) => {
    try {
      const { name, meta, switched } = await importAndRestore(cmd.args.file)
      console.log(`\n  ${green('↙')} ${bold('Imported')} ${cyan(name)}`)
      console.log(
        `    ${gray('branch')}    ${yellow(meta.branch)}${switched ? gray(' (switched)') : ''}`
      )
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
