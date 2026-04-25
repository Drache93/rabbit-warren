import { command, arg, summary } from 'paparam'
import { swap } from '../lib/snapshot.js'
import { bold, cyan, gray, green } from '../lib/color.js'

export const swapCmd = command(
  'swap',
  summary('Swap current dev context with a named stash (bidirectional)'),
  arg('<name>', 'Name of the stash to swap with'),
  async (cmd) => {
    try {
      const { swapped } = await swap(cmd.args.name)
      console.log(`\n  ${green('⇄')} ${bold('Swapped')} with ${cyan(swapped)}`)
      console.log(`    ${gray('Run again to swap back.')}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
