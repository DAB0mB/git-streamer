import { nanoid } from 'nanoid';
import { Writable } from 'stream';

export * from 'generic-utils';
export * from 'util';

export const genToken = (size = 11) => {
  return nanoid(size);
};

export const nullStdout = new Writable();
nullStdout._write = () => {}; // noop
