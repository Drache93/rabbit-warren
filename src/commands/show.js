import { command, arg, flag, summary } from 'paparam'
import { inspect } from '../lib/snapshot.js'
import { bold, cyan, green, yellow, red, gray, dim } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import { mostRecentSession, readSession, getSessionStashDir } from '../lib/sessions.js'

export const showCmd = command(
  'show',
  summary('Inspect a session (default: most recent)'),
  arg('[name]', 'Session name (default: most recent)'),
  flag('--json [field]', 'Output as JSON, optionally filtered to a field'),
  (cmd) => {
    initStorageDir(cmd)
    try {
      const name = cmd.args.name || mostRecentSession()?.name
      if (!name) {
        console.log(`\n  ${gray('No sessions found.')}\n`)
        return
      }

      if (/[/\\]/.test(name)) throw new Error('Name cannot contain path separators.')
      if (/[<>:"|?*\x00-\x1f]/.test(name)) throw new Error('Name contains invalid characters.')

      const session = readSession(name)
      if (!session) {
        console.log(`\n  ${gray('Session')} ${bold(name)} ${gray('not found.')}\n`)
        return
      }

      const repoEntries = Object.entries(session.repos)
      const repoDetails = repoEntries.map(([repoSlug, { repoPath }]) => {
        const stashDir = getSessionStashDir(name, repoSlug)
        try {
          return { repoSlug, repoPath, ...inspect(stashDir) }
        } catch {
          return { repoSlug, repoPath, meta: null, stashed: null }
        }
      })

      const fullOutput = {
        name: session.name,
        timestamp: session.timestamp,
        repos: repoDetails.map(({ repoSlug, repoPath, meta, stashed }) => ({
          slug: repoSlug,
          path: repoPath,
          branch: meta?.branch,
          stats: meta?.stats,
          changes: stashed?.changes,
          untracked: stashed?.untracked,
          links: stashed?.links,
          modules: stashed?.modules
        })),
        extras: session.extras || []
      }

      if (cmd.flags.json !== undefined) {
        const field = typeof cmd.flags.json === 'string' ? cmd.flags.json : null
        const out = field ? fullOutput[field] : fullOutput
        console.log(JSON.stringify(out, null, 2))
        return
      }

      console.log(
        `\n  ${green('Session')} ${bold(cyan(name))}  ${gray(new Date(session.timestamp).toLocaleString())}\n`
      )

      for (const { repoSlug, meta, stashed } of repoDetails) {
        if (!meta || !stashed) {
          console.log(`  ${cyan(repoSlug)}  ${gray('(no snapshot)')}`)
          continue
        }
        printRepo(repoSlug, meta, stashed)
      }

      if ((session.extras || []).length > 0) {
        console.log(`  ${green('Extras')}`)
        for (const { originalPath, isDir } of session.extras) {
          console.log(`    ${dim(isDir ? 'dir' : 'file')}  ${yellow(originalPath)}`)
        }
        console.log()
      }

      console.log(`  ${dim('t=tracked  u=untracked  l=symlinks  m=modified')}`)
      console.log()
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)

function printRepo(repoSlug, meta, stashed) {
  const date = new Date(meta.timestamp).toLocaleString()
  const s = meta.stats
  const detail = s ? dim(`${s.files}t ${s.untracked ?? 0}u ${s.links}l ${s.modified}m`) : ''
  console.log(`  ${cyan(bold(repoSlug))}  ${yellow(meta.branch)}  ${gray(date)}  ${detail}\n`)

  const colNames = [
    ...stashed.changes.map((c) => c.filename),
    ...stashed.links.map((l) => l.package)
  ]
  const termWidth = process.stdout.columns || 80
  const maxCol = Math.max(termWidth - 20, 24)
  const col = Math.min(colNames.reduce((m, n) => Math.max(m, n.length), 0) + 4, maxCol)

  const padName = (n) => {
    if (n.length > col - 2) {
      const available = col - 2
      const leftLen = Math.floor(available / 3)
      const rightLen = available - leftLen
      return n.slice(0, leftLen) + '…' + n.slice(-rightLen) + ' '
    }
    return (n + ' ').padEnd(col, '.')
  }

  if (stashed.changes.length > 0) {
    console.log(`  ${green('Changes')}`)
    for (const { filename, added, removed } of stashed.changes) {
      console.log(`    ${yellow(padName(filename))} ${green('+' + added)} ${red('-' + removed)}`)
    }
    console.log()
  }

  if (stashed.untracked.length > 0) {
    console.log(`  ${green('Untracked')}`)
    for (const filename of stashed.untracked) {
      console.log(`    ${yellow(filename)}`)
    }
    console.log()
  }

  if (stashed.modules.length > 0) {
    console.log(`  ${green('Modules')}`)
    for (const filename of stashed.modules) {
      console.log(`    ${yellow(filename)}`)
    }
    console.log()
  }

  if (stashed.links.length > 0) {
    console.log(`  ${green('Links')}`)
    for (const { package: pkg, target } of stashed.links) {
      console.log(`    ${yellow(padName(pkg))} ${dim(target)}`)
    }
    console.log()
  }
}
