#!/usr/bin/env node
import { command, header, summary } from 'paparam'
import { stashCmd } from '../src/commands/stash.js'
import { popCmd } from '../src/commands/pop.js'
import { swapCmd } from '../src/commands/swap.js'
import { listCmd } from '../src/commands/list.js'

const main = command(
  'rabbithole',
  header('rabbithole — dev context stashing'),
  summary('Stash and restore full dev context: git changes, node_modules edits, and symlinks'),
  stashCmd,
  popCmd,
  swapCmd,
  listCmd,
  () => console.log(main.help())
)

main.parse(process.argv.slice(2))
