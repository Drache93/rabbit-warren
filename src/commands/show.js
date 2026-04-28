import { command, arg, summary } from 'paparam'
import { getRepoRoot } from '../lib/git.js'
import { inspect } from '../lib/snapshot.js'
import { bold, cyan, yellow, gray, dim } from '../lib/color.js'

export const showCmd = command(
  'show',
  arg('[name]', 'name of the stash'),
  summary('Inspect a warren'),
  async (cmd) => {
    try {
      console.log(inspect(cmd.args.name))
      // const repoRoot = getRepoRoot()
      // const slug = makeRepoSlug(repoRoot)
      // const meta = readMeta(slug)

      // const date = new Date(meta.timestamp).toLocaleString()
      // const s = meta.stats
      // const detail = s ? dim(`${s.files}t ${s.untracked ?? 0}u ${s.links}l ${s.modified}m`) : ''
      // console.log(`  ${cyan(bold(meta.name))}  ${yellow(meta.branch)}  ${gray(date)}  ${detail}`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
