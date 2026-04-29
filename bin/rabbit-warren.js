#!/usr/bin/env node
import { command, header, summary } from 'paparam'
import { stashCmd } from '../src/commands/stash.js'
import { popCmd } from '../src/commands/pop.js'
import { swapCmd } from '../src/commands/swap.js'
import { showCmd } from '../src/commands/show.js'
import { listCmd } from '../src/commands/list.js'
import { exportCmd } from '../src/commands/export.js'
import { importCmd } from '../src/commands/import.js'

const main = command(
  'rabbit-warren',
  header('rabbit-warren — dev context stashing'),
  summary('Stash and restore full dev context: git changes, node_modules edits, and symlinks'),
  stashCmd,
  popCmd,
  swapCmd,
  showCmd,
  listCmd,
  exportCmd,
  importCmd,
  () => console.log(main.help())
)

main.parse(process.argv.slice(2))
