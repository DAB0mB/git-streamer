import chokidar from 'chokidar';
import fs from 'fs-extra';
import ignore from 'ignore';
import path from 'path';

import Cmd from './Cmd';

class Git extends Cmd {
  static get ROOT() {
    return '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
  }

  get bin() {
    return 'git';
  }

  constructor(config) {
    super(config);

    this.projectsDirsCache = {};
  }

  async getProjectDir() {
    const { cwd } = this.config;

    if (this.projectsDirsCache[cwd]) {
      return this.projectsDirsCache[cwd];
    }

    const { stdout: projectDir } = await this.execa(['rev-parse', '--show-toplevel']);

    this.projectsDirsCache[cwd] = projectDir;

    return projectDir;
  }

  async getIgnore(...extra) {
    const projectDir = await this.getProjectDir();

    let gitignoreRaw;
    try {
      gitignoreRaw = (await fs.readFile(`${projectDir}/.gitignore`)).toString();
    }
    catch (e) {
      gitignoreRaw = '';
    }

    const gitignored = gitignoreRaw.split(/ *\n/).filter(Boolean).concat(['.gits', ...extra]);

    return ignore().add(gitignored);
  }

  async getDiff(targetRef, sourceRef, options) {
    if (typeof sourceRef == 'object') {
      options = sourceRef;
      sourceRef = 'HEAD';
    }

    sourceRef = sourceRef ?? 'HEAD';

    const { binary } = options ?? {};

    const { stdout } = await this.execa([
      'diff',
      binary && '--binary',
      targetRef,
      sourceRef,
    ].filter(Boolean), {
      stripFinalNewline: false,
    });

    return stdout;
  }

  async startWatchingProject(sock) {
    let { stdout: head } = await this.execa(['rev-parse', '--short', 'HEAD']);
    let { stdout: branch } = await this.execa(['rev-parse', '--abbrev-ref', 'HEAD']);
    let { stdout: rootStat } = await this.execa(['diff', Git.ROOT, '--stat=999', '--stat-graph-width=10']);
    let { stdout: modStat } = await this.execa(['diff', 'HEAD', '--stat']);
    const gitIgnore = await this.getIgnore();
    const projectDir = await this.getProjectDir();
    const { allowWrite } = sock.io.opts.query;

    const watcher = chokidar.watch(projectDir, {
      ignoreInitial: true,
      ignored: (file) => {
        const relativeFile = path.relative(projectDir, file);

        if (relativeFile && gitIgnore.ignores(relativeFile)) {
          return file;
        }
      },
    });

    let gitChangeTimeout = 0;
    let projectChanged = false;
    let gitChanged = false;

    watcher.on('all', async (event, file) => {
      if (!['add', 'change', 'unlink'].includes(event)) return;

      file = path.relative(projectDir, file);

      if (/^.git/.test(file)) {
        gitChanged = true;
      }
      else {
        projectChanged = true;
      }

      clearTimeout(gitChangeTimeout);

      gitChangeTimeout = setTimeout(async () => {
        if (gitChanged) {
          const { stdout: commit } = await this.execa(['rev-parse', '--short', 'HEAD']);

          if (commit !== head) {
            head = commit;
            branch = await this.execa(['rev-parse', '--abbrev-ref', 'HEAD']).then(cp => cp.stdout);
            rootStat = await this.execa(['diff', Git.ROOT, '--stat=999', '--stat-graph-width=10']).then(cp => cp.stdout);
            this.stdout.write('--stat-- root\n');
            this.stdout.write(rootStat);
            sock.emit('stat', 'root', rootStat);
          }
        }

        if (projectChanged) {
          modStat = await this.execa(['diff', 'HEAD', '--stat']).then(cp => cp.stdout);
          if (modStat.trim()) {
            this.stdout.write('--stat-- mod\n');
            this.stdout.write(modStat);
          }
          else {
            this.stdout.write('--stat-- mod (empty)\n');
          }
          sock.emit('stat', 'mod', modStat);
        }

        gitChanged = false;
        projectChanged = false;
      }, 1000);
    });

    await new Promise((resolve, reject) => {
      const onReady = () => {
        watcher.off('ready', onReady);
        watcher.off('error', onError);
        resolve();
      };

      const onError = (e) => {
        watcher.off('ready', onReady);
        watcher.off('error', onError);
        reject(e);
      };

      watcher.on('ready', onReady);
      watcher.on('error', onError);
    });

    this.stdout.write(`Started watching project: ${projectDir}`);

    sock.on('view', (viewId) => {
      this.stdout.write(`--view-- ${viewId}\n`);
      sock.emit('stat', 'root', rootStat, viewId);
      sock.emit('stat', 'mod', modStat, viewId);
    });

    sock.on('file', async (file, viewId) => {
      this.stdout.write(`--file-- ${file}\n`);

      let { stdout: diff } = await this.execa([
        'diff',
        '-U9999999', // Show all lines, don't skip anything
        '--format=', // Don't show commit description
        'HEAD',
        file,
      ], {
        stripFinalNewline: false,
      });

      if (diff.trim()) {
        this.stdout.write(diff);

        return sock.emit('diff', file, diff, viewId);
      }

      const contents = await fs.readFile(path.resolve(this.config.cwd, file), 'utf8');
      const lines = contents.split('\n');

      diff = [
        `diff --git a/${file} b/${file}`,
        `index 0000000 ${head} 100644`,
        `--- a/${file}`,
        `+++ b/${file}`,
        '@@ -0,0 +0,0 @@',
        ...lines.map(l => ' ' + l),
      ].join('\n');

      this.stdout.write(diff);

      sock.emit('diff', file, diff, viewId);
    });

    sock.on('archive', async (requestId) => {
      const archive = this.execa(['archive', '--format=zip', branch]);
      let ack = Promise.resolve();

      archive.stdout.on('data', (buffer) => {
        ack = new Promise((resolve) => {
          ack.then(() => {
            sock.emit('archive', buffer, requestId, resolve);
          });
        });
      });

      archive.stdout.on('end', () => {
        ack.then(() => {
          sock.emit('archive', null, requestId);
        });
      });
    });

    if (allowWrite) {
      sock.on('writefile', (file, contents) => {
        const writePath = path.resolve(projectDir, file);

        // Prevent unwanted injections
        if (/^\./.test(path.relative(projectDir, writePath))) {
          return;
        }

        fs.writeFile(writePath, contents.toString());
      });
    }

    return async () => {
      await this.stopWatchingProject({ watcher, projectDir });
    };
  }

  async stopWatchingProject({ watcher, projectDir }) {
    await watcher.close();

    this.stdout.write(`Stopped watching project: ${projectDir}`);
  }
}

export default Git;