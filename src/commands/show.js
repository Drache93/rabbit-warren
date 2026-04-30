import path from 'path'

import { command, arg, summary, validate } from 'paparam'
import { getRepoRoot } from '../lib/git.js'
import { getStashDir, readMeta, makeRepoSlug } from '../lib/storage.js'
import { inspect } from '../lib/snapshot.js'
import { bold, cyan, green, yellow, red, gray, dim } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import { getSessionsDir, readSession } from '../lib/sessions.js'

export const showCmd = command(
  'show',
  arg('[name]', 'name of the stash or session'),
  summary('Inspect a warren'),
  (cmd) => {
    initStorageDir(cmd)
    try {
      const name = cmd.args.name
      const session = readSession(name)
      if (session) {
        console.log(`  ${green('Session: ')}${bold(session.name)}`)
        console.log()

        for (const [repo, status] of Object.entries(session.repos)) {
          const dir = path.join(getSessionsDir(), session.name, repo)
          const root = status.repoPath
          printStashed(repo, root, dir)
        }

        console.log()
        console.log(`  ${dim('t=tracked  u=untracked  l=symlinks  m=modified r=repos')}`)
        console.log()

        return
      }

      if (!name || !name.trim()) throw new Error('Name cannot be empty.')
      if (/[/\\]/.test(name)) throw new Error('Name cannot contain path separators.')
      if (/[<>:"|?*\x00-\x1f]/.test(name)) throw new Error('Name contains invalid characters.')

      printStashed(name)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)

function printStashed(name, root, dir) {
  const repoRoot = getRepoRoot(root)
  const slug = makeRepoSlug(repoRoot)
  const meta = readMeta(dir || getStashDir(slug, name))

  const stashed = inspect(name, root, dir)

  const date = new Date(meta.timestamp).toLocaleString()
  const s = meta.stats
  const detail = s ? dim(`${s.files}t ${s.untracked ?? 0}u ${s.links}l ${s.modified}m`) : ''
  console.log(`  ${cyan(bold(meta.name))}  ${yellow(meta.branch)}  ${gray(date)}  ${detail}\n`)

  const colNames = [
    ...stashed.changes.map((c) => c.filename),
    ...stashed.links.map((l) => l.package)
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
}
