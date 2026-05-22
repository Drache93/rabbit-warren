import { test, hook } from 'brittle'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'wrn-test-snapshot-'))
process.env.WRN_HOME = tmpHome

const { capture, restore } = await import('../src/lib/snapshot.js')
const { makeRepoSlug } = await import('../src/lib/storage.js')
const { getSessionStashDir } = await import('../src/lib/sessions.js')

let repoDir

hook(() => {
  repoDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wrn-test-repo-')))
  execSync('git init', { cwd: repoDir })
  execSync('git config user.email "test@test.com"', { cwd: repoDir })
  execSync('git config user.name "Test"', { cwd: repoDir })
  fs.writeFileSync(path.join(repoDir, 'README.md'), 'hello')
  execSync('git add .', { cwd: repoDir })
  execSync('git commit -m "init"', { cwd: repoDir })
})

function stashDir(name) {
  return getSessionStashDir('test-session', makeRepoSlug(repoDir) + '-' + name)
}

function isDirty() {
  return execSync('git status --porcelain', { cwd: repoDir, encoding: 'utf8' }).trim() !== ''
}

test('capture with clean:true cleans working directory', (t) => {
  t.teardown(() => {
    execSync('git reset --hard HEAD', { cwd: repoDir })
    execSync('git clean -fd', { cwd: repoDir })
  })

  fs.writeFileSync(path.join(repoDir, 'README.md'), 'modified')
  const dir = stashDir('test-clean-true')
  capture('test-clean-true', repoDir, dir, null, { clean: true })
  t.ok(fs.existsSync(dir), 'stash dir should exist')
  t.is(isDirty(), false, 'working dir should be clean after capture with clean:true')
})

test('capture with clean:false leaves working directory dirty', (t) => {
  t.teardown(() => {
    execSync('git reset --hard HEAD', { cwd: repoDir })
    execSync('git clean -fd', { cwd: repoDir })
  })

  fs.writeFileSync(path.join(repoDir, 'README.md'), 'modified for clean:false')
  const dir = stashDir('test-clean-false')
  capture('test-clean-false', repoDir, dir, null, { clean: false })
  t.ok(fs.existsSync(dir), 'stash dir should exist')
  t.is(isDirty(), true, 'working dir should remain dirty after capture with clean:false')
  fs.rmSync(dir, { recursive: true, force: true })
})

test('capture writes meta.json with correct fields', (t) => {
  t.teardown(() => {
    execSync('git reset --hard HEAD', { cwd: repoDir })
    execSync('git clean -fd', { cwd: repoDir })
  })

  fs.writeFileSync(path.join(repoDir, 'README.md'), 'meta test')
  const dir = stashDir('test-meta')
  const { meta } = capture('test-meta', repoDir, dir, 'my-session', { clean: true })
  t.is(meta.name, 'test-meta')
  t.is(meta.repoPath, repoDir)
  t.is(meta.session, 'my-session')
  t.ok(typeof meta.branch === 'string')
  t.ok(typeof meta.timestamp === 'number')
})

test('capture throws if stash dir already exists', (t) => {
  t.teardown(() => {
    execSync('git reset --hard HEAD', { cwd: repoDir })
    execSync('git clean -fd', { cwd: repoDir })
  })

  const dir = stashDir('test-exists')
  fs.mkdirSync(dir, { recursive: true })
  t.exception(() => capture('test-exists', repoDir, dir), /already exists/)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('restore applies patch and restores file content', (t) => {
  t.teardown(() => {
    execSync('git reset --hard HEAD', { cwd: repoDir })
    execSync('git clean -fd', { cwd: repoDir })
  })

  fs.writeFileSync(path.join(repoDir, 'README.md'), 'restored content')
  const dir = stashDir('test-restore')
  capture('test-restore', repoDir, dir, null, { clean: true })
  t.is(fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8'), 'hello')
  restore(null, repoDir, dir)
  t.is(fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8'), 'restored content')
})

test('restore deletes stash dir after success', (t) => {
  t.teardown(() => {
    execSync('git reset --hard HEAD', { cwd: repoDir })
    execSync('git clean -fd', { cwd: repoDir })
  })

  fs.writeFileSync(path.join(repoDir, 'README.md'), 'for restore cleanup')
  const dir = stashDir('test-restore-cleanup')
  capture('test-restore-cleanup', repoDir, dir, null, { clean: true })
  restore(null, repoDir, dir)
  t.is(fs.existsSync(dir), false, 'stash dir should be deleted after restore')
})

test('restore throws if working directory is dirty', (t) => {
  t.teardown(() => {
    execSync('git reset --hard HEAD', { cwd: repoDir })
    execSync('git clean -fd', { cwd: repoDir })
  })

  fs.writeFileSync(path.join(repoDir, 'README.md'), 'dirty for restore')
  const dir = stashDir('test-restore-dirty')
  capture('test-restore-dirty', repoDir, dir, null, { clean: false })
  t.is(isDirty(), true)
  t.exception(() => restore(null, repoDir, dir), /Working directory is not clean/)
  fs.rmSync(dir, { recursive: true, force: true })
})

hook(() => {
  fs.rmSync(tmpHome, { recursive: true, force: true })
  fs.rmSync(repoDir, { recursive: true, force: true })
})
