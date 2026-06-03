import path from 'node:path'
import fs from 'node:fs'
import { arg, command, summary } from 'paparam'
import { bold, gray } from '../lib/color.js'
import { initStorageDir } from '../lib/config.js'
import { activeSession, getSessionStashDir, readSession } from '../lib/sessions.js'
import { spawn } from 'node:child_process'
import { inspect } from '../lib/snapshot.js'

export const diffCmd = command(
  'diff',
  summary('Compare stashed files with current state'),
  arg('[path]', 'Filter to files matching this path'),
  async (cmd) => {
    initStorageDir(cmd)
    try {
      const targetPath = cmd.args.path
      const name = activeSession()

      if (!name) {
        console.log(`\n  ${gray('No active session.')}\n`)
        return
      }

      const session = readSession(name)

      for (const { repoSlug, repoPath } of Object.values(session.repos)) {
        const stashDir = getSessionStashDir(name, repoSlug)
        if (!fs.existsSync(stashDir)) continue

        const { stashed } = inspect(stashDir)

        // Git-tracked changes: the patch is already a diff, just print it
        const patch = fs.readFileSync(path.join(stashDir, 'git.patch'), 'utf8')
        if (patch.trim()) {
          const section = targetPath ? extractPatchSection(patch, targetPath) : patch
          if (section) process.stdout.write(section)
        }

        // Untracked files: stashed copy vs current (or /dev/null if file is gone)
        const untrackedDir = path.join(stashDir, 'untracked')
        const untracked = targetPath
          ? stashed.untracked.filter((f) => f.includes(targetPath))
          : stashed.untracked
        for (const relPath of untracked) {
          const currentFile = path.join(repoPath, relPath)
          const stashedFile = path.join(untrackedDir, relPath)
          await runDiff(fs.existsSync(currentFile) ? currentFile : '/dev/null', stashedFile)
        }

        // node_modules modified: current vs stashed copy
        const modules = targetPath
          ? stashed.modules.filter((m) => m.includes(targetPath))
          : stashed.modules
        for (const m of modules) {
          const currentFile = path.join(repoPath, 'node_modules', m)
          const stashedFile = path.join(stashDir, 'node_modules', 'modified', m)
          await runDiff(currentFile, stashedFile)
        }
      }

      console.log()
    } catch (err) {
      console.error(`\n  ${bold('\x1b[31mError:\x1b[0m')} ${err.message}\n`)
      process.exit(1)
    }
  }
)

function extractPatchSection(patch, filterPath) {
  const lines = patch.split('\n')
  const sections = []
  let current = []
  let include = false

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      if (include && current.length) sections.push(current.join('\n'))
      current = [line]
      include = line.includes(filterPath)
    } else {
      current.push(line)
    }
  }
  if (include && current.length) sections.push(current.join('\n'))
  return sections.join('\n')
}

function runDiff(originalFile, editedFile) {
  return new Promise((resolve, reject) => {
    const diff = spawn('diff', ['--color=always', '-u', originalFile, editedFile], {
      stdio: 'inherit'
    })
    diff.on('error', reject)
    diff.on('close', (code) => {
      if (code === 0 || code === 1) resolve(code)
      else reject(new Error(`diff failed (exit ${code})`))
    })
  })
}
