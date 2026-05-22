import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'

export function getSessionsDir() {
  return path.join(process.env.WRN_HOME || path.join(os.homedir(), '.rabbit-warren'), 'sessions')
}

export function getSessionStashDir(sessionName, repoSlug) {
  return path.join(getSessionsDir(), sessionName, repoSlug)
}

export function getExtrasDir(sessionName) {
  return path.join(getSessionsDir(), sessionName, '__extras__')
}

export function activeSession() {
  const currentFile = path.join(getSessionsDir(), 'current')
  if (!fs.existsSync(currentFile)) return null
  return fs.readFileSync(currentFile, 'utf8').trim() || null
}

export function setActiveSession(name) {
  const sessionsDir = getSessionsDir()
  fs.mkdirSync(sessionsDir, { recursive: true })
  const session = readSession(name) || { name, timestamp: null, repos: {}, extras: [] }
  session.timestamp = Date.now()
  writeSession(session)
  fs.writeFileSync(path.join(sessionsDir, 'current'), name)
}

export function clearActiveSession() {
  const currentFile = path.join(getSessionsDir(), 'current')
  if (fs.existsSync(currentFile)) fs.unlinkSync(currentFile)
}

export function readSession(name) {
  const file = path.join(getSessionsDir(), name, 'session.json')
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function writeSession(session) {
  const dir = path.join(getSessionsDir(), session.name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'session.json'), JSON.stringify(session, null, 2))
}

export function registerRepo(sessionName, repoSlug, repoPath) {
  let session = readSession(sessionName)
  if (!session) session = { name: sessionName, timestamp: Date.now(), repos: {}, extras: [] }
  session.repos[repoSlug] = { repoSlug, repoPath }
  writeSession(session)
}

export function removeRepo(sessionName, repoSlug) {
  const session = readSession(sessionName)
  if (!session) return
  delete session.repos[repoSlug]
  writeSession(session)
}

export function listSessions() {
  const sessionsDir = getSessionsDir()
  if (!fs.existsSync(sessionsDir)) return []
  return fs
    .readdirSync(sessionsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      try {
        return readSession(e.name)
      } catch {
        return { name: e.name, timestamp: 0, repos: {}, extras: [] }
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp)
}

export function mostRecentSession() {
  return listSessions()[0] || null
}

export function deleteSession(name) {
  const dir = path.join(getSessionsDir(), name)
  fs.rmSync(dir, { recursive: true, force: true })
}

// extras: arbitrary files/folders tracked beyond git repos

export function addExtra(sessionName, absPath) {
  const stat = fs.statSync(absPath)
  let session = readSession(sessionName)
  if (!session) session = { name: sessionName, timestamp: Date.now(), repos: {}, extras: [] }
  if (!session.extras) session.extras = []
  const isDir = stat.isDirectory()
  if (!session.extras.find((e) => e.originalPath === absPath)) {
    session.extras.push({ originalPath: absPath, isDir })
  }
  writeSession(session)
}

export function removeExtra(sessionName, absPath) {
  const session = readSession(sessionName)
  if (!session || !session.extras) return
  session.extras = session.extras.filter((e) => e.originalPath !== absPath)
  writeSession(session)
  const hash = createHash('sha1').update(absPath).digest('hex').slice(0, 8)
  fs.rmSync(path.join(getExtrasDir(sessionName), hash), { recursive: true, force: true })
}

export function captureExtra(sessionName, absPath) {
  const stat = fs.statSync(absPath)
  const isDir = stat.isDirectory()
  const hash = createHash('sha1').update(absPath).digest('hex').slice(0, 8)
  const extraDir = path.join(getExtrasDir(sessionName), hash)
  fs.rmSync(extraDir, { recursive: true, force: true })
  fs.mkdirSync(extraDir, { recursive: true })
  fs.writeFileSync(path.join(extraDir, 'meta.json'), JSON.stringify({ originalPath: absPath, isDir }))
  if (isDir) {
    fs.cpSync(absPath, path.join(extraDir, 'data'), { recursive: true })
  } else {
    fs.copyFileSync(absPath, path.join(extraDir, 'data'))
  }
}

export function restoreExtras(sessionName, { keep = false } = {}) {
  const extrasDir = getExtrasDir(sessionName)
  if (!fs.existsSync(extrasDir)) return
  const entries = fs.readdirSync(extrasDir, { withFileTypes: true }).filter((e) => e.isDirectory())
  for (const entry of entries) {
    const extraDir = path.join(extrasDir, entry.name)
    const meta = JSON.parse(fs.readFileSync(path.join(extraDir, 'meta.json'), 'utf8'))
    if (meta.isDir) {
      fs.mkdirSync(meta.originalPath, { recursive: true })
      fs.cpSync(path.join(extraDir, 'data'), meta.originalPath, { recursive: true })
    } else {
      fs.mkdirSync(path.dirname(meta.originalPath), { recursive: true })
      fs.copyFileSync(path.join(extraDir, 'data'), meta.originalPath)
    }
    if (!keep) fs.rmSync(extraDir, { recursive: true, force: true })
  }
}
