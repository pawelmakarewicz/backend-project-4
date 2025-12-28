#!/usr/bin/env node
import { Command } from 'commander';
import pageLoader from '../index.js';

const program = new Command();
program
  .description('Page loader utility')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output dir', process.cwd())
  .arguments('<url>')
  .action((url, { output }) => {
    pageLoader(url, output)
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  });
program.parse();
