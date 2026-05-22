import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

export function makeRepoSlug(repoRoot) {
  const basename = path.basename(repoRoot)
  const hash = createHash('sha1').update(repoRoot).digest('hex').slice(0, 6)
  return `${basename}-${hash}`
}

export function readMeta(stashDir) {
  return JSON.parse(fs.readFileSync(path.join(stashDir, 'meta.json'), 'utf8'))
}

export function deleteStash(stashDir) {
  fs.rmSync(stashDir, { recursive: true, force: true })
}
