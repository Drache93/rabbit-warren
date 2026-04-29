import { command, arg, summary } from 'paparam'
import { getRepoRoot } from '../lib/git.js'
import {
  makeRepoSlug,
  getStashDir,
  listStashes,
  mostRecentStash,
  deleteStash
} from '../lib/storage.js'
import { bold, green, gray, red, dim } from '../lib/color.js'

export const dropCmd = command(
  'drop',
  summary('Drop a stash (most recent if no name given)'),
  arg('[name]', 'Name of the stash to restore'),
  async (cmd) => {
    try {
      const repoRoot = getRepoRoot()
      const slug = makeRepoSlug(repoRoot)
      const stashes = listStashes(slug)

      if (stashes.length === 0) {
        console.log(`\n  ${gray('No stashes found for this repo.')}\n`)
        return
      }

      const name = cmd.args.name || mostRecentStash(slug).name

      if (cmd.args.name && stashes.findIndex((s) => s.name === name) === -1) {
        console.log(`\n  ${gray('Stash')} ${bold(dim(name))} ${gray('not found.')}\n`)
        return
      }

      deleteStash(getStashDir(slug, name))

      console.log(`\n  ${red('x')} ${bold('Deleted')} ${gray(name)}\n`)
    } catch (err) {
      console.log(err)
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
