import fs from 'node:fs'
import path from 'node:path'

const SKIP_DIRS = new Set(['.git', '.cache', 'node_modules'])
const SKIP_EXTS = new Set(['.node'])

export function walkFiles (dir, base) {
  const results = []
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      results.push(...walkFiles(full, base))
    } else if (entry.isFile()) {
      if (SKIP_EXTS.has(path.extname(entry.name))) continue
      results.push(path.relative(base, full))
    }
  }
  return results
}

export function captureLinks (nodeModulesPath) {
  if (!fs.existsSync(nodeModulesPath)) return []
  const links = []

  const scan = (dir, prefix = '') => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const pkgName = prefix ? `${prefix}/${entry.name}` : entry.name
      const fullPath = path.join(dir, entry.name)
      if (entry.isSymbolicLink()) {
        const rawTarget = fs.readlinkSync(fullPath)
        const target = path.resolve(path.dirname(fullPath), rawTarget)
        links.push({ package: pkgName, target })
      } else if (entry.isDirectory() && entry.name.startsWith('@') && !prefix) {
        scan(fullPath, entry.name)
      }
    }
  }

  scan(nodeModulesPath)
  return links
}

export function restoreLinks (links, nodeModulesPath) {
  for (const { package: pkg, target } of links) {
    const linkPath = path.join(nodeModulesPath, pkg)
    try {
      fs.rmSync(linkPath, { recursive: true, force: true })
    } catch {}
    fs.mkdirSync(path.dirname(linkPath), { recursive: true })
    fs.symlinkSync(target, linkPath)
  }
}

export function captureModified (nodeModulesPath, lockfilePath) {
  if (!fs.existsSync(nodeModulesPath)) return []
  if (!lockfilePath || !fs.existsSync(lockfilePath)) return []

  const lockfileMtime = fs.statSync(lockfilePath).mtimeMs
  const modified = []

  const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    if (!entry.isDirectory()) continue

    const pkgDir = path.join(nodeModulesPath, entry.name)
    const files = walkFiles(pkgDir, nodeModulesPath)
    for (const relPath of files) {
      const fullPath = path.join(nodeModulesPath, relPath)
      try {
        const stat = fs.statSync(fullPath)
        if (stat.mtimeMs > lockfileMtime) modified.push(relPath)
      } catch {}
    }
  }

  return modified
}

export function copyModifiedFiles (relPaths, nodeModulesPath, destDir) {
  for (const relPath of relPaths) {
    const src = path.join(nodeModulesPath, relPath)
    const dest = path.join(destDir, relPath)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
  }
}

export function restoreModifiedFiles (srcDir, nodeModulesPath) {
  if (!fs.existsSync(srcDir)) return
  const files = walkFiles(srcDir, srcDir)
  for (const relPath of files) {
    const src = path.join(srcDir, relPath)
    const dest = path.join(nodeModulesPath, relPath)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
  }
}
