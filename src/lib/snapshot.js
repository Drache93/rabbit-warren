import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'
import {
  getRepoRoot,
  currentBranch,
  capturePatch,
  applyPatch,
  inspectPatch,
  countChangedFiles,
  captureUntracked,
  cleanWorkingDirectory,
  isWorkingDirClean,
  checkoutBranch
} from './git.js'
import {
  captureLinks,
  restoreLinks,
  captureModified,
  copyModifiedFiles,
  restoreModifiedFiles,
  walkFiles
} from './modules.js'
import { makeRepoSlug, readMeta, deleteStash } from './storage.js'
import { getSessionsDir, getSessionStashDir, readSession, mostRecentSession } from './sessions.js'
import { captureVersions } from './lockfile.js'

function findLockfile(repoRoot) {
  for (const name of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']) {
    const p = path.join(repoRoot, name)
    if (fs.existsSync(p)) return p
  }
  return null
}

function copyUntrackedFiles(files, repoRoot, destDir) {
  for (const relPath of files) {
    const src = path.join(repoRoot, relPath)
    const dest = path.join(destDir, relPath)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    try {
      fs.copyFileSync(src, dest)
    } catch {}
  }
}

function restoreUntrackedFiles(srcDir, repoRoot) {
  if (!fs.existsSync(srcDir)) return
  const files = walkFiles(srcDir, srcDir)
  for (const relPath of files) {
    const src = path.join(srcDir, relPath)
    const dest = path.join(repoRoot, relPath)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
  }
}

// Recursively collect all transitively linked dep paths (deduped by resolved path)
function collectDeepDeps(links, visited = new Set()) {
  const deps = []
  for (const { target } of links) {
    if (visited.has(target)) continue
    visited.add(target)
    const nmPath = path.join(target, 'node_modules')
    if (!fs.existsSync(nmPath)) continue
    const depLinks = captureLinks(nmPath)
    deps.push({ depPath: target, depSlug: makeRepoSlug(target), links: depLinks })
    deps.push(...collectDeepDeps(depLinks, visited))
  }
  return deps
}

export function capture(
  stashName,
  cwd = process.cwd(),
  stashDir,
  session = null,
  { clean = true, deep = false } = {}
) {
  const repoRoot = getRepoRoot(cwd)
  const branch = currentBranch(repoRoot)
  const slug = makeRepoSlug(repoRoot)
  const nodeModulesPath = path.join(repoRoot, 'node_modules')
  const lockfilePath = findLockfile(repoRoot)

  const name = stashName || `${branch.replace(/\//g, '-')}-${Date.now()}`
  const dir = stashDir || getSessionStashDir(session || 'default', slug)

  if (fs.existsSync(dir)) {
    throw new Error(`Stash "${name}" already exists`)
  }

  const patch = capturePatch(repoRoot)
  const untracked = captureUntracked(repoRoot)
  const links = captureLinks(nodeModulesPath)
  const modified = captureModified(nodeModulesPath)
  const versions = captureVersions(nodeModulesPath)

  const meta = {
    name,
    branch,
    timestamp: Date.now(),
    repoPath: repoRoot,
    repoSlug: slug,
    session,
    stats: {
      files: countChangedFiles(patch),
      untracked: untracked.length,
      links: links.length,
      modified: modified.length,
      modules: versions.length
    }
  }

  fs.mkdirSync(path.join(dir, 'node_modules', 'modified'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'untracked'), { recursive: true })

  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))
  fs.writeFileSync(path.join(dir, 'git.patch'), patch)
  fs.writeFileSync(path.join(dir, 'node_modules', 'links.json'), JSON.stringify(links, null, 2))
  fs.writeFileSync(path.join(dir, 'modules.json'), JSON.stringify(versions, null, 2))

  if (lockfilePath) {
    fs.copyFileSync(lockfilePath, path.join(dir, path.basename(lockfilePath)))
  }

  if (untracked.length > 0) {
    copyUntrackedFiles(untracked, repoRoot, path.join(dir, 'untracked'))
  }

  if (modified.length > 0) {
    copyModifiedFiles(modified, nodeModulesPath, path.join(dir, 'node_modules', 'modified'))
  }

  if (deep && links.length > 0) {
    const deepDeps = collectDeepDeps(links)
    if (deepDeps.length > 0) {
      const deepDir = path.join(dir, 'deep')
      fs.mkdirSync(deepDir, { recursive: true })
      const deepMeta = []
      for (const { depPath, depSlug, links: depLinks } of deepDeps) {
        const depDir = path.join(deepDir, depSlug)
        fs.mkdirSync(path.join(depDir, 'modified'), { recursive: true })
        const depNm = path.join(depPath, 'node_modules')
        const depModified = captureModified(depNm)
        fs.writeFileSync(path.join(depDir, 'links.json'), JSON.stringify(depLinks, null, 2))
        if (depModified.length > 0) {
          copyModifiedFiles(depModified, depNm, path.join(depDir, 'modified'))
        }
        deepMeta.push({ depPath, depSlug })
      }
      fs.writeFileSync(path.join(deepDir, 'meta.json'), JSON.stringify(deepMeta, null, 2))
      meta.stats.deepDeps = deepDeps.length
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))
    }
  }

  if (clean) cleanWorkingDirectory(repoRoot, links, modified)

  return { name, meta, dir, slug }
}

export function restore(_stashName, cwd = process.cwd(), stashDir, { keep = false } = {}) {
  const repoRoot = getRepoRoot(cwd)
  const nodeModulesPath = path.join(repoRoot, 'node_modules')

  if (!stashDir) throw new Error('stashDir is required')
  if (!fs.existsSync(stashDir)) throw new Error('Snapshot not found')

  const meta = readMeta(stashDir)
  const dir = stashDir

  if (!isWorkingDirClean(repoRoot)) {
    throw new Error('Working directory is not clean. Run `wrn stash` or `git stash` first.')
  }

  const currentBranchName = currentBranch(repoRoot)
  const switched = meta.branch !== currentBranchName
  if (switched) checkoutBranch(meta.branch, repoRoot)

  const patch = fs.readFileSync(path.join(dir, 'git.patch'), 'utf8')
  if (patch.trim()) applyPatch(patch, repoRoot)

  restoreUntrackedFiles(path.join(dir, 'untracked'), repoRoot)

  const links = JSON.parse(fs.readFileSync(path.join(dir, 'node_modules', 'links.json'), 'utf8'))
  if (links.length > 0) restoreLinks(links, nodeModulesPath)

  restoreModifiedFiles(path.join(dir, 'node_modules', 'modified'), nodeModulesPath)

  const deepPath = path.join(dir, 'deep')
  if (fs.existsSync(deepPath)) {
    const deepMeta = JSON.parse(fs.readFileSync(path.join(deepPath, 'meta.json'), 'utf8'))
    for (const { depPath, depSlug } of deepMeta) {
      const depDir = path.join(deepPath, depSlug)
      const depNm = path.join(depPath, 'node_modules')
      const linksFile = path.join(depDir, 'links.json')
      if (fs.existsSync(linksFile)) {
        const depLinks = JSON.parse(fs.readFileSync(linksFile, 'utf8'))
        if (depLinks.length > 0) restoreLinks(depLinks, depNm)
      }
      restoreModifiedFiles(path.join(depDir, 'modified'), depNm)
    }
  }

  if (!keep) deleteStash(dir)

  return { name: meta.name, meta, switched }
}

export function inspect(stashDir) {
  if (!fs.existsSync(stashDir)) throw new Error('Snapshot not found')
  const meta = readMeta(stashDir)

  const stashed = { branch: meta.branch, changes: [], untracked: [], modules: [], links: [] }

  const patch = fs.readFileSync(path.join(stashDir, 'git.patch'), 'utf8')
  if (patch.trim()) stashed.changes = inspectPatch(patch)

  stashed.links = JSON.parse(
    fs.readFileSync(path.join(stashDir, 'node_modules', 'links.json'), 'utf8')
  )
  stashed.untracked = walkFiles(path.join(stashDir, 'untracked'), path.join(stashDir, 'untracked'))
  stashed.modules = walkFiles(
    path.join(stashDir, 'node_modules', 'modified'),
    path.join(stashDir, 'node_modules', 'modified')
  )

  return { meta, stashed }
}

export function exportSession(sessionName, outputPath) {
  const sessionsDir = getSessionsDir()
  let name

  if (sessionName) {
    name = sessionName
    if (!fs.existsSync(path.join(sessionsDir, name))) throw new Error(`Session "${name}" not found`)
  } else {
    const session = mostRecentSession()
    if (!session) throw new Error('No sessions found')
    name = session.name
  }

  const out = outputPath || path.join(process.cwd(), `${name}.wrn.tar.gz`)
  execSync(`tar -czf "${out}" -C "${sessionsDir}" "${name}"`)
  return { name, outputPath: out }
}

export function importSession(tarPath) {
  const sessionsDir = getSessionsDir()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrn-import-'))
  let sessionName
  try {
    execSync(`tar -xzf "${tarPath}" -C "${tempDir}"`)
    const [extracted] = fs.readdirSync(tempDir)
    sessionName = extracted
    const destDir = path.join(sessionsDir, sessionName)
    if (fs.existsSync(destDir)) throw new Error(`Session "${sessionName}" already exists locally`)
    fs.mkdirSync(sessionsDir, { recursive: true })
    fs.renameSync(path.join(tempDir, extracted), destDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
  return readSession(sessionName)
}
