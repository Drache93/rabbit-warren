import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const SESSIONS_DIR = path.join(os.homedir(), '.rabbit-warren', 'sessions')
const CURRENT_FILE = path.join(SESSIONS_DIR, 'current')

export function getSessionStashDir(sessionName, repoSlug) {
  return path.join(SESSIONS_DIR, sessionName, repoSlug)
}

export function activeSession() {
  if (!fs.existsSync(CURRENT_FILE)) return null
  return fs.readFileSync(CURRENT_FILE, 'utf8').trim() || null
}

export function setActiveSession(name) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
  const session = readSession(name) || { name, timestamp: null, repos: {} }
  session.timestamp = Date.now()
  writeSession(session)
  fs.writeFileSync(CURRENT_FILE, name)
}

export function clearActiveSession() {
  if (fs.existsSync(CURRENT_FILE)) fs.unlinkSync(CURRENT_FILE)
}

export function readSession(name) {
  const file = path.join(SESSIONS_DIR, name, 'session.json')
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function writeSession(session) {
  const dir = path.join(SESSIONS_DIR, session.name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'session.json'), JSON.stringify(session, null, 2))
}

export function registerRepo(sessionName, repoSlug, repoPath) {
  let session = readSession(sessionName)
  if (!session) session = { name: sessionName, timestamp: Date.now(), repos: {} }
  session.repos[repoSlug] = { repoSlug, repoPath }
  writeSession(session)
}

export function updateSession(sessionName) {
  if (!session) throw new Error('No session found')
}

export function listSessions() {
  return fs
    .readdirSync(SESSIONS_DIR, { withFileTypes: true })
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
