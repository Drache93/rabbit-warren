import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'

export function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()
  } catch {
    throw new Error('Not inside a git repository')
  }
}

export function currentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
}

export function capturePatch(repoRoot) {
  return execSync('git diff HEAD', { cwd: repoRoot, encoding: 'utf8' })
}

export function captureUntracked(repoRoot) {
  const out = execSync('git ls-files --others --exclude-standard', {
    cwd: repoRoot,
    encoding: 'utf8'
  })
  return out.split('\n').filter(Boolean)
}

export function cleanWorkingDirectory(repoRoot, links, modified) {
  execSync('git reset --hard HEAD', { cwd: repoRoot, encoding: 'utf8' })
  execSync('git clean -fd', { cwd: repoRoot, encoding: 'utf8' })

  for (const { package: pkgPath } of modified) {
    try {
      fs.rmSync(pkgPath, { recursive: true, force: true })
    } catch {}
  }
}

export function applyPatch(patch, repoRoot) {
  if (!patch.trim()) return
  const result = spawnSync('git', ['apply'], {
    cwd: repoRoot,
    input: patch,
    encoding: 'utf8'
  })
  if (result.status !== 0) {
    throw new Error(`git apply failed:\n${result.stderr}`)
  }
}

export function countChangedFiles(patch) {
  return (patch.match(/^diff --git /gm) || []).length
}
