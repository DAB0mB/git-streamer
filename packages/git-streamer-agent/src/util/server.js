import fetch from 'node-fetch';

import config from '../config';

export const warmUpLambda = () => {
  return fetch(`${config.httpServer}/ping`);
};

export const warmUpViewer = () => {
  return fetch(`${config.viewerUrl}/ping`);
};
