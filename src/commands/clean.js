import path from 'node:path'
import os from 'node:os'
import { command, summary } from 'paparam'
import { bold, green } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import { getRepoRoot } from '../lib/git.js'
import { makeRepoSlug, deleteStash } from '../lib/storage.js'
import { capture } from '../lib/snapshot.js'

export const cleanCmd = command(
  'clean',
  summary('Reset working directory, discarding all changes'),
  async (cmd) => {
    initStorageDir(cmd)
    try {
      const repoRoot = getRepoRoot()
      const slug = makeRepoSlug(repoRoot)
      const tempDir = path.join(
        process.env.WRN_HOME || path.join(os.homedir(), '.rabbit-warren'),
        '__clean__',
        `${slug}-${Date.now()}`
      )

      capture(slug, repoRoot, tempDir, null, { clean: true })
      deleteStash(tempDir)

      console.log(`\n  ${green('✓')} ${bold('Working directory cleaned.')}\n`)
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
