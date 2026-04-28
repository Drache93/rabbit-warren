import { command, arg, summary } from 'paparam'
import { execSync } from 'node:child_process'
import { capture } from '../lib/snapshot.js'
import { makeRepoSlug, deleteStash } from '../lib/storage.js'
import { getRepoRoot } from '../lib/git.js'
import { bold, cyan, green, gray, yellow } from '../lib/color.js'
import { activeSession, registerRepo, getSessionStashDir } from '../lib/sessions.js'

export const linkCmd = command(
  'link',
  summary('Proxy for npm link — snapshots the repo into the active session after linking'),
  arg('[package]', 'Package to link (omit to register current package globally)'),
  async (cmd) => {
    try {
      const pkg = cmd.args.package
      const npmCmd = pkg ? `npm link ${pkg}` : 'npm link'

      try {
        execSync(npmCmd, { stdio: 'inherit' })
      } catch {
        throw new Error(`${npmCmd} failed`)
      }

      const session = activeSession()
      if (!session) return

      const repoRoot = getRepoRoot()
      const slug = makeRepoSlug(repoRoot)
      const stashDir = getSessionStashDir(session, slug)

      deleteStash(stashDir)
      const { meta } = await capture(slug, process.cwd(), stashDir, session)
      registerRepo(session, slug, repoRoot)

      console.log(`\n  ${green('↓')} ${bold('Snapshotted')} ${cyan(slug)} ${gray('into')} ${cyan(session)}`)
      console.log(`    ${yellow(meta.branch)}  ${gray(`${meta.stats.links} symlinks`)}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
