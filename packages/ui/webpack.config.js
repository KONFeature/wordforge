const defaultConfig = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaultConfig,
  entry: {
    ...defaultConfig.entry,
    chat: './src/chat/index.tsx',
    settings: './src/settings/index.tsx',
  },
};
