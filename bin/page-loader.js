#!/usr/bin/env node
import { Command } from 'commander';
import pageLoader from '../lib/pageLoader.js';

const program = new Command();
program
  .description('Page loader utility')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output dir', process.cwd())
  .arguments('<url>')
  .action((url, options) => {
    pageLoader(url, options.output);
  });
program.parse();
