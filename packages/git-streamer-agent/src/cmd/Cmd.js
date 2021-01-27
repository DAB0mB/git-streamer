import execa from 'execa';
import { Writable } from 'stream';

import { nullStdout } from '../util';

class Cmd {
  constructor({ logPrefix, stdout = nullStdout, ...config } = {}) {
    this.config = config;

    logPrefix = [`[${this.bin}]`, logPrefix].filter(Boolean).join(' ');

    this.stdout = new Writable();
    this.stdout.end = () => {}; // Prevent one process from ending the stream for others
    this.stdout._write = (chunk, encoding, done) => {
      const fixed = chunk
        .toString()
        .trim()
        .split('\n')
        .map(l => `(${new Date().toISOString()}) ${logPrefix} ${l}`)
        .join('\n') + '\n';

      stdout.write(fixed, 'utf8', done);
    };
  } // test

  execa(args, config = {}) {
    return execa(this.bin, args, {
      ...this.config,
      ...config,
    });
  }

  async scope(fn, config) {
    const prevConfig = this.config;

    try {
      this.config = { ...this.config, ...config };

      await fn();
    }
    finally {
      this.config = prevConfig;
    }
  }
}

export default Cmd;
