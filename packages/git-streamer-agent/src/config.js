import path from 'path';

const config = {
  isDev: /^dev/.test(process.env.NODE_ENV),
  isTest: /^test/.test(process.env.NODE_ENV),
  isProd: /^prod/.test(process.env.NODE_ENV),
};

config.env = (
  config.isDev ? 'dev' :
  config.isTest ? 'test' :
  config.isProd ? 'prod' :
  'prod'
);

config.isProd = config.env == 'prod';

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
}
catch (e) {
  // not found
}

try {
  require('dotenv').config({ path: path.resolve(__dirname, `../.env.${config.env}`) });
}
catch (e) {
  // not found
}

Object.assign(config, {
  port: process.env.PORT,
  httpServer: process.env.HTTP_SERVER,
  wsServer: process.env.WS_SERVER,
  viewerUrl: process.env.VIEWER_URL,
  gitsRegistryUrl: process.env.GITS_REGISTRY_URL,
});

module.exports = config;
