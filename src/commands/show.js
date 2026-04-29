import { command, arg, summary } from 'paparam'
import { getRepoRoot } from '../lib/git.js'
import { getStashDir, readMeta, makeRepoSlug } from '../lib/storage.js'
import { inspect } from '../lib/snapshot.js'
import { bold, cyan, green, yellow, red, gray, dim } from '../lib/color.js'

export const showCmd = command(
  'show',
  arg('[name]', 'name of the stash'),
  summary('Inspect a warren'),
  async (cmd) => {
    try {
      const repoRoot = getRepoRoot()
      const slug = makeRepoSlug(repoRoot)
      const meta = readMeta(getStashDir(slug, cmd.args.name))

      const stashed = inspect(cmd.args.name)

      const date = new Date(meta.timestamp).toLocaleString()
      const s = meta.stats
      const detail = s ? dim(`${s.files}t ${s.untracked ?? 0}u ${s.links}l ${s.modified}m`) : ''
      console.log(`  ${cyan(bold(meta.name))}  ${yellow(meta.branch)}  ${gray(date)}  ${detail}\n`)

      const colNames = [
        ...stashed.changes.map(c => c.filename),
        ...stashed.links.map(l => l.package)
      ]
      const termWidth = process.stdout.columns || 80
      const maxCol = Math.max(termWidth - 20, 24)
      const col = Math.min(colNames.reduce((m, n) => Math.max(m, n.length), 0) + 4, maxCol)

      const padName = (name) => {
        if (name.length > col - 2) {
          const available = col - 2
          const leftLen = Math.floor(available / 3)
          const rightLen = available - leftLen
          return name.slice(0, leftLen) + '…' + name.slice(-rightLen) + ' '
        }
        return (name + ' ').padEnd(col, '.')
      }

      if (stashed.changes.length > 0) {
        console.log(`  ${green('Changes')}`)
        for (const { filename, added, removed } of stashed.changes) {
          console.log(`    ${yellow(padName(filename))} ${green('+' + added)} ${red('-' + removed)}`)
        }
        console.log('')
      }

      if (stashed.untracked.length > 0) {
        console.log(`  ${green('Untracked')}`)
        for (const filename of stashed.untracked) {
          console.log(`    ${yellow(filename)}`)
        }
        console.log('')
      }

      if (stashed.modules.length > 0) {
        console.log(`  ${green('Modules')}`)
        for (const filename of stashed.modules) {
          console.log(`    ${yellow(filename)}`)
        }
        console.log('')
      }

      if (stashed.links.length > 0) {
        console.log(`  ${green('Links')}`)
        for (const { package: pkg, target } of stashed.links) {
          console.log(`    ${yellow(padName(pkg))} ${dim(target)}`)
        }
        console.log('')
      }
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
