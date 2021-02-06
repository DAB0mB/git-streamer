import { Writable } from 'stream';

export const nullStdout = new Writable();
nullStdout._write = () => {}; // noop
