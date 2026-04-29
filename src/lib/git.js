import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'

export function getRepoRoot(cwd = process.cwd()) {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf8' }).trim()
  } catch {
    throw new Error('Not inside a git repository')
  }
}

export function currentBranch(cwd) {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim()
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

export function inspectPatch(patch) {
  const diff = []

  let file = null
  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git')) {
      if (file) diff.push(file)
      file = fileDiff(line)
      continue
    }

    if (line.startsWith('+++')) continue
    if (line.startsWith('---')) continue

    if (line.startsWith('+')) file.added++
    if (line.startsWith('-')) file.removed++
  }

  diff.push(file)

  return diff

  function fileDiff(line) {
    return {
      filename: line.match(/(?<=\sa)[^\s]*/)[0],
      added: 0,
      removed: 0
    }
  }
}

export function countChangedFiles(patch) {
  return (patch.match(/^diff --git /gm) || []).length
}

export function isWorkingDirClean(repoRoot) {
  const out = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' })
  return out.trim() === ''
}

export function checkoutBranch(branch, repoRoot) {
  execSync(`git checkout ${branch}`, { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' })
}
