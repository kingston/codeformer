#!/usr/bin/env node

import { Command } from 'commander';

import packageJson from '../package.json' with { type: 'json' };
import { setupExampleCommand } from './commands/example-command.js';

const program = new Command();

program
  .name('tool-template')
  .description(
    "CLI tool template - replace this description with your tool's purpose",
  )
  .version(packageJson.version);

setupExampleCommand(program);

program.parse(process.argv);
