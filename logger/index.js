import debug from 'debug';

if (!process.env.DEBUG) {
  if (process.env.NODE_ENV === 'production') {
    debug.enable('app:error,app:warn');
  } else {
    debug.enable('app:error,app:warn,app:info');
  }
}

// === Log levels ===
export const warn = debug('app:warn');
export const info = debug('app:info');

// === By functionality ===
export const http = debug('app:http');
export const resource = debug('app:resource');
export const transform = debug('app:transform');
export const fs = debug('app:fs');

// === For tests ===
export const test = debug('app:test');
export const nock = debug('app:nock');
