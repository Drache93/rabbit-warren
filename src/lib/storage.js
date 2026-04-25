import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'

export function makeRepoSlug (repoRoot) {
  const basename = path.basename(repoRoot)
  const hash = createHash('sha1').update(repoRoot).digest('hex').slice(0, 6)
  return `${basename}-${hash}`
}

export function getStashDir (repoSlug, stashName) {
  return path.join(os.homedir(), '.rabbithole', repoSlug, stashName)
}

export function getRepoDir (repoSlug) {
  return path.join(os.homedir(), '.rabbithole', repoSlug)
}

export function readMeta (stashDir) {
  return JSON.parse(fs.readFileSync(path.join(stashDir, 'meta.json'), 'utf8'))
}

export function listStashes (repoSlug) {
  const repoDir = getRepoDir(repoSlug)
  if (!fs.existsSync(repoDir)) return []

  return fs.readdirSync(repoDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => {
      try {
        return readMeta(path.join(repoDir, e.name))
      } catch {
        return { name: e.name, branch: '?', timestamp: 0, stats: null }
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp)
}

export function mostRecentStash (repoSlug) {
  return listStashes(repoSlug)[0] || null
}

export function deleteStash (stashDir) {
  fs.rmSync(stashDir, { recursive: true, force: true })
}
