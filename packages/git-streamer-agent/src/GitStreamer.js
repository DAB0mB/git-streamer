import combineErrors from 'combine-errors';
import { createServer } from 'http';
import fetch from 'node-fetch';
import io from 'socket.io-client';

import Git from './cmd/Git';
import config from './config';
import { genToken, promisify } from './util';

class GitStreamer {
  static State = {
    stopped: 0,
    started: 1,
  }

  constructor({ stdout = process.stdout } = {}) {
    this.state = GitStreamer.State.stopped;
    this.stdout = stdout;
  }

  changeSettings(settings = {}) {
    if (this.state !== GitStreamer.State.stopped) {
      throw Error('You cannot change settings while recording. Be sure to call GitStreamer.stop() first.');
    }

    if (typeof settings.input == 'string') {
      this.input = settings.input;
    }

    if (typeof settings.saltSize == 'number') {
      this.saltSize = settings.saltSize;
    }
  }

  async startWatching({ allowWrite, region } = {}) {
    if (typeof this.input != 'string') {
      throw Error('Cannot start recording! settings.input was not provided.');
    }

    if (this.state === GitStreamer.State.started) {
      throw Error('Seems like there is a recording already in progress. Did you forget to call GitStreamer.stop()?');
    }

    this.state = GitStreamer.State.started;

    const { sessionId, agentToken } = await fetch(`${config.httpServer}/session`, {
      method: 'POST',
      body: JSON.stringify({ salt: genToken(this.saltSize) }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(res => res.json());

    const server = createServer((req, res) => {
      if (req.method !== 'GET' && req.url !== `/session/${sessionId}`) {
        res.statusCode = 403;
        res.end('Forbidden.');
        return;
      }

      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      });
      res.end(agentToken);
    });

    await promisify(server.listen.bind(server))(config.port);

    const sock = io(`${config.wsServer}/agent`, {
      query: {
        sessionId,
        agentToken,
        allowWrite,
        region,
        agentUrl: `http://localhost:${server.address().port}`,
      },
    });

    await new Promise((resolve, reject) => {
      const onConnect = (sessionId) => {
        sock.off('connect', onConnect);
        sock.off('connect_error', onError);
        resolve(sessionId);
      };

      const onError = (e) => {
        sock.off('connect', onConnect);
        sock.off('connect_error', onError);
        reject(e);
      };

      sock.on('connect', onConnect);
      sock.on('connect_error', onError);
    });

    const gitDir = await new Git({ cwd: this.input, logPrefix: `[${sessionId}]`, stdout: this.stdout }).getProjectDir();
    const git = new Git({ cwd: gitDir, logPrefix: `[${sessionId}]`, stdout: this.stdout, sock });

    const stopWatchingProject = await git.startWatchingProject(sock);

    return {
      url: `${config.viewerUrl}/session/${sessionId}`,
      stop: async () => {
        await this.stopWatching({ stopWatchingProject, server, sock });
      },
    };
  }

  async stopWatching({ stopWatchingProject, server, sock }) {
    if (this.state === GitStreamer.State.stopped) {
      throw Error('It does not seem like the recorder was ever started. Did you forget to call GitStreamer.start()?');
    }

    // Remains for legacy reasons, but can still be used in the future
    const errors = [];

    await stopWatchingProject().then(() => null, e => errors.push(e));
    await promisify(server.close.bind(server))().then(() => null, e => errors.push(e));

    try {
      sock.disconnect();
    }
    catch (e) {
      errors.push(e);
    }

    if (errors.length) {
      throw combineErrors(errors);
    }

    this.state = GitStreamer.State.stopped;
  }
}

export default GitStreamer;
