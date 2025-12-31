const defaultConfig = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaultConfig,
  entry: {
    ...defaultConfig.entry,
    chat: './src/chat/index.tsx',
    settings: './src/settings/index.tsx',
    'chat-widget': './src/widget/index.tsx',
  },
  resolve: {
    ...defaultConfig.resolve,
    alias: {
      ...(defaultConfig.resolve?.alias || {}),
      // Map 'react' imports to @wordpress/element for TanStack Query compatibility
      react: require.resolve('@wordpress/element'),
      'react-dom': require.resolve('@wordpress/element'),
    },
  },
};
