import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export function getSessionsDir() {
  return path.join(process.env.WRN_HOME || path.join(os.homedir(), '.rabbit-warren'), 'sessions')
}

export function getSessionStashDir(sessionName, repoSlug) {
  return path.join(getSessionsDir(), sessionName, repoSlug)
}

export function activeSession() {
  const currentFile = path.join(getSessionsDir(), 'current')
  if (!fs.existsSync(currentFile)) return null
  return fs.readFileSync(currentFile, 'utf8').trim() || null
}

export function setActiveSession(name) {
  const sessionsDir = getSessionsDir()
  fs.mkdirSync(sessionsDir, { recursive: true })
  const session = readSession(name) || { name, timestamp: null, repos: {} }
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
  if (!session) session = { name: sessionName, timestamp: Date.now(), repos: {} }
  session.repos[repoSlug] = { repoSlug, repoPath }
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
        return { name: e.name, timestamp: 0, repos: {} }
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp)
}
