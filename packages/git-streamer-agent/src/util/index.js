import { nanoid } from 'nanoid';

export * from 'generic-utils';
export * from 'util';

export * from './aws';
export * from './io';
export * from './server';

const letterRunes = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const randomStr = (length = 13) => {
  return Array.apply(null, { length }).map(() => letterRunes[(Math.random() * letterRunes.length) | 0]).join('');
};

export const genToken = (size = 11) => {
  return nanoid(size);
};
