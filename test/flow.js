import { test, hook } from 'brittle'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'wrn-test-flow-'))
process.env.WRN_HOME = tmpHome

const { capture, restore } = await import('../src/lib/snapshot.js')
const { makeRepoSlug, deleteStash } = await import('../src/lib/storage.js')
const { setActiveSession, activeSession, clearActiveSession, registerRepo, getSessionStashDir } =
  await import('../src/lib/sessions.js')

let repoDir

hook(() => {
  repoDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wrn-test-flow-repo-')))
  execSync('git init', { cwd: repoDir })
  execSync('git config user.email "test@test.com"', { cwd: repoDir })
  execSync('git config user.name "Test"', { cwd: repoDir })
  fs.writeFileSync(path.join(repoDir, 'app.js'), 'const x = 1')
  execSync('git add .', { cwd: repoDir })
  execSync('git commit -m "init"', { cwd: repoDir })
})

function isClean() {
  return execSync('git status --porcelain', { cwd: repoDir, encoding: 'utf8' }).trim() === ''
}

test('stash -> track -> pop cycle preserves changes', async (t) => {
  const slug = makeRepoSlug(repoDir)
  const sessionName = 'test-session'
  const stashDir = getSessionStashDir(sessionName, slug)

  // 1. Make a change (simulate in-progress work)
  fs.writeFileSync(path.join(repoDir, 'app.js'), 'const x = 42 // my change')
  t.is(isClean(), false, 'repo should be dirty before track')

  // 2. Enter session
  setActiveSession(sessionName)
  t.is(activeSession(), sessionName)

  // 3. Track: capture without cleaning (the fix)
  capture(slug, repoDir, stashDir, sessionName, { clean: false })
  registerRepo(sessionName, slug, repoDir)

  // 4. Working dir must still be dirty after track
  t.is(isClean(), false, 'working dir must stay dirty after track (the bug was it got wiped)')

  // 5. Leave: delete old snapshot, re-capture with clean:true
  deleteStash(stashDir)
  capture(slug, repoDir, stashDir, sessionName, { clean: true })
  t.is(isClean(), true, 'working dir should be clean after leave')

  // 6. Clear session
  clearActiveSession()
  t.is(activeSession(), null)

  // 7. Enter again: restore
  restore(null, repoDir, stashDir)

  // 8. The change must be back
  const content = fs.readFileSync(path.join(repoDir, 'app.js'), 'utf8')
  t.is(content, 'const x = 42 // my change', 'change must be restored after re-entering session')
})

hook(() => {
  fs.rmSync(tmpHome, { recursive: true, force: true })
  fs.rmSync(repoDir, { recursive: true, force: true })
})
