import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

export function captureVersions(nodeModulesPath) {
  if (!fs.existsSync(nodeModulesPath)) return []
  const versions = []

  const readVersion = (dir, name) => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      if (pkg.version) versions.push({ name, version: pkg.version })
    } catch {}
  }

  let entries
  try {
    entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true })
  } catch {
    return versions
  }

  for (const entry of entries) {
    if (entry.name === '.bin') continue
    if (entry.isSymbolicLink()) continue
    if (!entry.isDirectory()) continue

    const fullPath = path.join(nodeModulesPath, entry.name)

    if (entry.name.startsWith('@')) {
      let scoped
      try {
        scoped = fs.readdirSync(fullPath, { withFileTypes: true })
      } catch {
        continue
      }
      for (const s of scoped) {
        if (s.isSymbolicLink()) continue
        if (!s.isDirectory()) continue
        readVersion(path.join(fullPath, s.name), `${entry.name}/${s.name}`)
      }
    } else {
      readVersion(fullPath, entry.name)
    }
  }

  return versions
}

export function installVersions(versions, repoRoot) {
  const nodeModulesPath = path.join(repoRoot, 'node_modules')
  fs.rmSync(nodeModulesPath, { recursive: true, force: true })

  if (versions.length === 0) return

  const specs = versions.map(({ name, version }) => `${name}@${version}`).join(' ')
  execSync(`npm install --no-save --no-package-lock ${specs}`, {
    cwd: repoRoot,
    stdio: 'inherit'
  })
}
