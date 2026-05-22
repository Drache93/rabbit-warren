import { test, hook } from 'brittle'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'wrn-test-export-'))
process.env.WRN_HOME = tmpHome

const { capture, restore, exportSession, importSession } = await import('../src/lib/snapshot.js')
const { makeRepoSlug } = await import('../src/lib/storage.js')
const {
  readSession,
  writeSession,
  getSessionStashDir,
  registerRepo,
  getSessionsDir
} = await import('../src/lib/sessions.js')

let repoDir

hook(() => {
  repoDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wrn-test-export-repo-')))
  execSync('git init', { cwd: repoDir })
  execSync('git config user.email "test@test.com"', { cwd: repoDir })
  execSync('git config user.name "Test"', { cwd: repoDir })
  fs.writeFileSync(path.join(repoDir, 'app.js'), 'const x = 1')
  execSync('git add .', { cwd: repoDir })
  execSync('git commit -m "init"', { cwd: repoDir })
})

function makeSession(name) {
  const slug = makeRepoSlug(repoDir)
  const stashDir = getSessionStashDir(name, slug)
  fs.writeFileSync(path.join(repoDir, 'app.js'), `// changes for ${name}`)
  capture(slug, repoDir, stashDir, name, { clean: true })
  registerRepo(name, slug, repoDir)
  return { slug, stashDir }
}

function cleanup(repoDir) {
  execSync('git reset --hard HEAD', { cwd: repoDir })
  execSync('git clean -fd', { cwd: repoDir })
}

test('exportSession creates a .wrn.tar.gz file', (t) => {
  t.teardown(() => cleanup(repoDir))

  const { slug } = makeSession('export-basic')
  const outPath = path.join(tmpHome, 'export-basic.wrn.tar.gz')

  const { name, outputPath } = exportSession('export-basic', outPath)

  t.is(name, 'export-basic')
  t.is(outputPath, outPath)
  t.ok(fs.existsSync(outPath), 'archive file should exist')
})

test('exportSession uses most recent session when no name given', (t) => {
  t.teardown(() => cleanup(repoDir))

  // ensure a known session exists and is the most recent
  writeSession({ name: 'older-session', timestamp: 1000, repos: {}, extras: [] })
  makeSession('recent-session')

  const outPath = path.join(tmpHome, 'recent-session.wrn.tar.gz')
  const { name } = exportSession(null, outPath)

  t.is(name, 'recent-session')
  t.ok(fs.existsSync(outPath), 'archive file should exist')
})

test('exportSession throws for unknown session', (t) => {
  t.exception(() => exportSession('no-such-session'), /not found/)
})

test('importSession restores session data from archive', (t) => {
  t.teardown(() => cleanup(repoDir))

  const sessionName = 'import-round-trip'
  const { slug } = makeSession(sessionName)
  const outPath = path.join(tmpHome, `${sessionName}.wrn.tar.gz`)
  exportSession(sessionName, outPath)

  // Remove the original session so we can import fresh
  fs.rmSync(path.join(getSessionsDir(), sessionName), { recursive: true, force: true })
  t.is(readSession(sessionName), null, 'session should be gone before import')

  const session = importSession(outPath)

  t.is(session.name, sessionName, 'imported session name should match')
  t.ok(session.repos[slug], 'imported session should contain the repo')
  t.ok(fs.existsSync(getSessionStashDir(sessionName, slug)), 'snapshot dir should be restored')
})

test('importSession throws when session already exists locally', (t) => {
  t.teardown(() => cleanup(repoDir))

  const sessionName = 'import-conflict'
  makeSession(sessionName)
  const outPath = path.join(tmpHome, `${sessionName}.wrn.tar.gz`)
  exportSession(sessionName, outPath)

  // session still exists — re-importing should fail
  t.exception(() => importSession(outPath), /already exists/)
})

test('export → import → restore round-trip preserves changes', (t) => {
  t.teardown(() => cleanup(repoDir))

  const sessionName = 'full-round-trip'
  const { slug, stashDir } = makeSession(sessionName)
  const outPath = path.join(tmpHome, `${sessionName}.wrn.tar.gz`)
  exportSession(sessionName, outPath)

  // Remove original session
  fs.rmSync(path.join(getSessionsDir(), sessionName), { recursive: true, force: true })

  importSession(outPath)

  // Restore should replay the captured change
  const restoredStashDir = getSessionStashDir(sessionName, slug)
  restore(null, repoDir, restoredStashDir)

  const content = fs.readFileSync(path.join(repoDir, 'app.js'), 'utf8')
  t.is(content, `// changes for ${sessionName}`, 'file content must match what was captured')
})

hook(() => {
  fs.rmSync(tmpHome, { recursive: true, force: true })
  fs.rmSync(repoDir, { recursive: true, force: true })
})
