import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: './src/index.ts',
    format: ['cjs'],
    outDir: 'dist',
    platform: 'node',
    target: 'node18',
    clean: true,
    sourcemap: false,
    minify: true,
    treeshake: true,
    skipNodeModulesBundle: false,
    noExternal: [/.*/],
  },
  {
    entry: { 'wordforge-mcp': './src/index.ts' },
    format: ['cjs'],
    outDir: '../php/assets/bin',
    platform: 'node',
    target: 'node18',
    clean: true,
    sourcemap: false,
    minify: true,
    treeshake: true,
    skipNodeModulesBundle: false,
    noExternal: [/.*/],
  },
]);
