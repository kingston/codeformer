#!/usr/bin/env node

import { Command } from 'commander';

import packageJson from '../package.json' with { type: 'json' };
import { setupRunCommand } from './commands/run.js';

const program = new Command();

program
  .name('codeformer')
  .description('TypeScript-based code transformation orchestrator')
  .version(packageJson.version);

setupRunCommand(program);

program.parse(process.argv);
