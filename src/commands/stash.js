import { command, arg, flag, summary } from 'paparam'
import { capture } from '../lib/snapshot.js'
import { bold, cyan, yellow, gray, green } from '../lib/color.js'
import {
  activeSession,
  setActiveSession,
  getSessionStashDir,
  registerRepo
} from '../lib/sessions.js'
import { makeRepoSlug, deleteStash } from '../lib/storage.js'
import { getRepoRoot } from '../lib/git.js'
import { initStorageDir } from '../lib/config.js'

export const stashCmd = command(
  'stash',
  summary('Save current dev context to a named session (default: "default")'),
  arg('[name]', 'Session name (default: "default")'),
  flag('--deep', 'Also capture modified files in transitively linked deps'),
  (cmd) => {
    initStorageDir(cmd)
    try {
      const name = cmd.args.name || activeSession() || 'default'
      const repoRoot = getRepoRoot()
      const slug = makeRepoSlug(repoRoot)
      const stashDir = getSessionStashDir(name, slug)

      deleteStash(stashDir)
      const { meta } = capture(slug, repoRoot, stashDir, name, {
        clean: true,
        deep: !!cmd.flags.deep
      })
      registerRepo(name, slug, repoRoot)
      setActiveSession(name)

      console.log(`\n  ${green('↓')} ${bold('Stashed')} ${cyan(name)}`)
      console.log(`    ${gray('branch')}    ${yellow(meta.branch)}`)
      console.log(
        `    ${gray('git')}       ${meta.stats.files} tracked, ${meta.stats.untracked} untracked`
      )
      console.log(
        `    ${gray('modules')}   ${meta.stats.links} symlinks, ${meta.stats.modified} modified files`
      )
      if (meta.stats.deepDeps) {
        console.log(`    ${gray('deep')}      ${meta.stats.deepDeps} transitive deps`)
      }
      console.log(`\n  ${gray('Working directory is now clean.')}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
