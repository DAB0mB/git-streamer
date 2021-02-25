import fetch from 'node-fetch';

import config from '../config';

export const pingAwsRegions = async () => {
  const { randomStr } = require('.');

  const pings = await Promise.all(
    config.awsRegions.map(async (region) => {
      const then = Date.now();

      await fetch(`https://dynamodb.${region}.amazonaws.com/ping?x=${randomStr(13)}`);

      return {
        ping: Date.now() - then,
        name: region,
      };
    }),
  );

  const entries = pings.sort((a, b) => a.ping > b.ping ? 1 : -1);

  return entries;
};
