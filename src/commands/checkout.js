import { command, arg, summary } from 'paparam'
import { execSync } from 'node:child_process'
import { capture } from '../lib/snapshot.js'
import { makeRepoSlug, deleteStash } from '../lib/storage.js'
import { getRepoRoot } from '../lib/git.js'
import { bold, cyan, green, gray, yellow } from '../lib/color.js'
import { activeSession, registerRepo, getSessionStashDir } from '../lib/sessions.js'

export const checkoutCmd = command(
  'checkout',
  summary('Proxy for git checkout — snapshots the repo into the active session first'),
  arg('<branch>', 'Branch to checkout'),
  async (cmd) => {
    try {
      const branch = cmd.args.branch
      const session = activeSession()

      if (!session) {
        try {
          execSync(`git checkout ${branch}`, { stdio: 'inherit' })
        } catch {
          throw new Error(`git checkout ${branch} failed`)
        }
        return
      }

      const repoRoot = getRepoRoot()
      const slug = makeRepoSlug(repoRoot)
      const stashDir = getSessionStashDir(session, slug)

      deleteStash(stashDir)
      const { meta } = await capture(slug, process.cwd(), stashDir, session)
      registerRepo(session, slug, repoRoot)

      try {
        execSync(`git checkout ${branch}`, { cwd: repoRoot, stdio: 'inherit' })
      } catch {
        throw new Error(`git checkout ${branch} failed`)
      }

      console.log(`\n  ${green('↓')} ${bold('Snapshotted')} ${cyan(slug)} ${gray('into')} ${cyan(session)}`)
      console.log(`    ${yellow(meta.branch)} ${gray('→')} ${yellow(branch)}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
