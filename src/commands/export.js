import { command, arg, summary } from 'paparam'
import { exportStash } from '../lib/snapshot.js'
import { bold, cyan, gray, green } from '../lib/color.js'

export const exportCmd = command(
  'export',
  summary('Export a stash to a .wrn.tar.gz file for sharing'),
  arg('[name]', 'Stash to export (default: most recent)'),
  arg('[output]', 'Output path (default: ./<name>.wrn.tar.gz)'),
  async (cmd) => {
    try {
      const { name, outputPath } = exportStash(cmd.args.name, cmd.args.output)
      console.log(`\n  ${green('↗')} ${bold('Exported')} ${cyan(name)}`)
      console.log(`    ${gray('file')}      ${outputPath}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
