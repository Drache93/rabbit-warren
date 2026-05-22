import path from 'path'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { command, arg, summary } from 'paparam'
import { bold, cyan, yellow, gray, green } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import { readSession, getSessionStashDir } from '../lib/sessions.js'
import { readMeta } from '../lib/storage.js'
import { walkFiles } from '../lib/modules.js'

function applyPatchForPath(patch, repoRoot, relPath) {
  if (!patch.trim()) return false
  const result = spawnSync('git', ['apply', `--include=${relPath}`], {
    cwd: repoRoot,
    input: patch,
    encoding: 'utf8'
  })
  return result.status === 0
}

export const checkoutCmd = command(
  'checkout',
  summary('Apply changes for a specific file or folder from a session snapshot'),
  arg('<session>', 'Session name'),
  arg('<path>', 'File or folder path relative to repo root'),
  (cmd) => {
    initStorageDir(cmd)
    try {
      const sessionName = cmd.args.session
      const targetPath = cmd.args.path

      const session = readSession(sessionName)
      if (!session) {
        console.log(`\n  ${gray('Session')} ${bold(sessionName)} ${gray('not found.')}\n`)
        return
      }

      let applied = false

      for (const { repoSlug, repoPath } of Object.values(session.repos)) {
        const stashDir = getSessionStashDir(sessionName, repoSlug)
        if (!fs.existsSync(stashDir)) continue

        const meta = readMeta(stashDir)
        const relPath = path.relative(repoPath, path.resolve(repoPath, targetPath))

        if (relPath.startsWith('..')) continue

        const patch = fs.readFileSync(path.join(stashDir, 'git.patch'), 'utf8')
        const patchApplied = applyPatchForPath(patch, repoPath, relPath)

        const untrackedDir = path.join(stashDir, 'untracked')
        const untrackedFiles = walkFiles(untrackedDir, untrackedDir).filter(
          (f) => f === relPath || f.startsWith(relPath + path.sep)
        )
        for (const relFile of untrackedFiles) {
          const src = path.join(untrackedDir, relFile)
          const dest = path.join(repoPath, relFile)
          fs.mkdirSync(path.dirname(dest), { recursive: true })
          fs.copyFileSync(src, dest)
        }

        if (patchApplied || untrackedFiles.length > 0) {
          console.log(
            `\n  ${green('→')} ${bold('Checked out')} ${cyan(targetPath)} ${gray('from')} ${cyan(sessionName)}`
          )
          console.log(`    ${gray('branch')}  ${yellow(meta.branch)}\n`)
          applied = true
          break
        }
      }

      if (!applied) {
        console.log(
          `\n  ${gray('No changes for')} ${bold(targetPath)} ${gray('found in session')} ${cyan(sessionName)}.\n`
        )
      }
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)
