import { bold } from 'chalk';

export default () => `
${bold('USAGE')}

    gits [path] [--version] [--help] [--salt <size>] [--no-copy] [--no-open] [--no-update] [--force-update] [--allow-write]

${bold('DESCRIPTION')}

    Creates a new and secured session; opens the browser, and copies the session URL to the clipboard. It will also lookup for updates, and if it detected any, Git Streamer will be updated automatically.

${bold('OPTIONS')}

    path
      The path to the git project you would like to stream. Defaults to cwd.

    salt <size>
      The salt size to add to the session ID. Longer is better. Defaults to 89.

    no-copy
      Do not copy the session URL to the clipboard.

    no-open
      Do not open the browser after creating the session.

    no-update
      Do not lookup for updates before creating a new session.

    force-update
      Force update to the latest version, regardless if it is installed already. Useful for fixing issues with binaries.

    allow-write
      Give the participants of the call direct write access via the hosted text editor.
`;
