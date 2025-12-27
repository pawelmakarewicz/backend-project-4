#!/usr/bin/env node
import { Command } from 'commander';
import pageLoader from '../app.js';

const program = new Command();
program
  .arguments('<url>')
  .action((url, { output }) => {
    pageLoader({ url, output })
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  });
program.parse();
