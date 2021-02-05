#!/usr/bin/env node

import { GitStreamer } from '@git-streamer/agent';
import compareVersions from 'compare-versions';
import { copy } from 'copy-paste';
import execa from 'execa';
import findRoot from 'find-root';
import fs from 'fs-extra';
import minimist from 'minimist';
import open from 'open';
import path from 'path';
import readline from 'readline';

import pack from '../../package.json';
import { isProd } from '../config';
import help from '../help';
import { nullStdout, aliasArgv } from '../util';

// minimist doesn't support dash cased args
const argv = aliasArgv(process.argv.slice(2), {
  '--noopen': ['--no-open'],
  '--nocopy': ['--no-copy'],
  '--noupdate': ['--no-update'],
  '--forceupdate': ['--force-update'],
  '--allowwrite': ['--allow-write'],
});

let {
  _: [input],
  nocopy: noCopy = false,
  noopen: noOpen = false,
  salt: saltSize = 89,
  help: showHelp = false,
  allowwrite: allowWrite = false,
  noupdate: noUpdate = false,
  forceupdate: forceUpdate = false,
  config,
  version,
} = minimist(argv, {
  string: ['config'],
  number: ['salt'],
  boolean: ['allowwrite', 'nocopy', 'noopen', 'noupdate', 'forceupdate', 'help'],
});

if (showHelp) {
  console.log(help());

  process.exit(0);
}

if (version) {
  console.log(`git streamer version ${pack.version}`);

  process.exit(0);
}

const main = async () => {
  const root = findRoot(process.cwd());

  input ??= root;

  if (config) {
    config = path.resolve(process.cwd(), config);
  }
  else try {
    await fs.stat(`${root}/.gitsrc.js`);
    config = `${root}/.gitsrc.js`;
  }
  catch (e) {
    // File in default path not exist
  }

  const configBase = {
    input,
    saltSize,
    open: !noOpen,
    copy: !noCopy,
    allowWrite,
    noUpdate,
    forceUpdate,
    // Preserve original path
    __dirname: config ? path.dirname(config) : root,
  };

  if (config) {
    // Will throw an error if file not exist
    config = Object.assign(configBase, require(config));
  }
  else {
    config = configBase;
  }

  // Validate config.output schema
  if (typeof config.input != 'string') {
    throw TypeError('config.input must be a string');
  }

  config.input = path.resolve(config.__dirname, config.input);

  const shouldUpdate = config.forceUpdate || !config.noUpdate;

  if (shouldUpdate) {
    let didUpdate;

    checkingUpdates:
    try {
      const checkingUpdatesTimeout = setTimeout(() => {
        console.log('Checking for updates...');
      }, 2000);

      const latestVersion = await execa('npm', ['show', '@git-streamer/cli', 'version'])
        .then(cp => cp.stdout.split('\n')[0].trim());

      clearTimeout(checkingUpdatesTimeout);

      if (!forceUpdate && compareVersions.compare(pack.version, latestVersion, '>=')) {
        break checkingUpdates;
      }

      console.log(`Updating to v${latestVersion}...`);

      await execa('npm', ['install', '-g', '--prefer-online', '@git-streamer/cli'], {
        stdio: 'inherit',
      });

      didUpdate = true;
    }
    catch (e) {
      console.error(e.message || e);
      console.error('Failed to update! If this was intentional, run gits CLI with --noupdate option.');
      console.error('If the error persists, please contact the author.');

      process.exit(1);
    }

    console.log('Everything up-to-date.');

    if (didUpdate) {
      const forkArgv = new Set([process.argv[1], ...argv]);
      forkArgv.delete('--forceupdate');
      forkArgv.add('--noupdate');

      try {
        await execa(process.argv[0], [...forkArgv], {
          stdio: 'inherit',
        });
      }
      catch (e) {
        process.exit(1);
      }

      process.exit(0);
    }
  }

  const gits = new GitStreamer({ stdout: isProd ? nullStdout : process.stdout });
  gits.changeSettings(config);

  const warmupTimeout = setTimeout(() => {
    console.log('Warming up lambda; please be patient.');
  }, 3000);

  let stopWatching;
  gits.startWatching({ allowWrite })
    .then(({ url, stop }) => {
      clearTimeout(warmupTimeout);

      console.log(`Session running at: ${url}`);

      if (config.copy) {
        copy(url);
      }

      if (config.open) {
        // Async, run in background
        open(url);
      }

      stopWatching = stop;
    })
    .catch((e) => {
      console.error(e.stack);

      shutdown(1);
    });

  let shuttingDown;
  const shutdown = async (code = 0) => {
    if (shuttingDown) return;

    shuttingDown = true;

    if (stopWatching) try {
      const stopWatchingTimeout = setTimeout(() => {
        console.log('Gracefully shutting down; just a moment please.');
      }, 1000);

      await stopWatching();

      clearTimeout(stopWatchingTimeout);

      console.log('Session closed.');
    }
    catch (e) {
      console.error(e.stack);

      process.exit(1);
    }

    process.exit(code);
  };

  // Override default behavior of CTRL-C
  process.stdin.on('data', (d) => {
    const key = d.toString();

    if (key == '\u0003') {
      shutdown();
    }
  });

  // Every key stroke will be submitted this way
  process.stdin.setRawMode(true);

  // Will send SIGTERM to child processes, but still it's important to try and close as
  // much background processes as possible, some of them are detached
  process.on('SIGINT', shutdown);

  if (process.platform == 'win32') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('SIGINT', () => {
      process.emit('SIGINT');
    });
  }

};

main();
