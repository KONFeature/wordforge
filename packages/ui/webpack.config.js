const path = require('node:path');
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const wpScriptsPath = require.resolve(
  '@wordpress/scripts/config/webpack.config',
);
const webpack = require(
  require.resolve('webpack', { paths: [path.dirname(wpScriptsPath)] }),
);

module.exports = {
  ...defaultConfig,
  entry: {
    ...defaultConfig.entry,
    chat: './src/chat/index.tsx',
    settings: './src/settings/index.tsx',
    'chat-widget': './src/widget/index.tsx',
    'editor-sidebar': './src/editor/index.tsx',
  },
  resolve: {
    ...defaultConfig.resolve,
    alias: {
      ...(defaultConfig.resolve?.alias || {}),
      react: require.resolve('@wordpress/element'),
      'react-dom': require.resolve('@wordpress/element'),
    },
  },
  plugins: [
    ...(defaultConfig.plugins || []),
    new webpack.NormalModuleReplacementPlugin(
      /^node:child_process$/,
      path.resolve(__dirname, 'src/shims/node-child-process.js'),
    ),
  ],
  optimization: {
    ...defaultConfig.optimization,
    splitChunks: {
      cacheGroups: {
        wordforgeVendor: {
          test: /[\\/]node_modules[\\/](@opencode-ai|@tanstack|react-markdown|react-window)[\\/]/,
          name: 'wordforge-vendor',
          chunks: 'all',
          priority: 20,
          enforce: true,
        },
      },
    },
  },
};
