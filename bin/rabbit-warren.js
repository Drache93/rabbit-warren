#!/usr/bin/env node
import { command, flag, header, summary } from 'paparam'
import { stashCmd } from '../src/commands/stash.js'
import { popCmd } from '../src/commands/pop.js'
import { applyCmd } from '../src/commands/apply.js'
import { checkoutCmd } from '../src/commands/checkout.js'
import { swapCmd } from '../src/commands/swap.js'
import { dropCmd } from '../src/commands/drop.js'
import { cleanCmd } from '../src/commands/clean.js'
import { trackCmd } from '../src/commands/track.js'
import { untrackCmd } from '../src/commands/untrack.js'
import { showCmd } from '../src/commands/show.js'
import { listCmd } from '../src/commands/list.js'
import { sessionCmd } from '../src/commands/session.js'
import { statusCmd } from '../src/commands/status.js'
import { exportCmd } from '../src/commands/export.js'
import { importCmd } from '../src/commands/import.js'

const main = command(
  'rabbit-warren',
  header('rabbit-warren — dev context stashing'),
  summary('Stash and restore full dev context: git changes, node_modules edits, and symlinks'),
  flag('--storage-dir|-d <dir>', 'Override storage directory (default: ~/.rabbit-warren)'),
  stashCmd,
  popCmd,
  applyCmd,
  checkoutCmd,
  swapCmd,
  dropCmd,
  cleanCmd,
  trackCmd,
  untrackCmd,
  showCmd,
  listCmd,
  sessionCmd,
  statusCmd,
  exportCmd,
  importCmd,
  () => console.log(main.help())
)

main.parse(process.argv.slice(2))
