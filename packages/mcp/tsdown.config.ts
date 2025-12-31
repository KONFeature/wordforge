import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['cjs'],
  outDir: 'dist',
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: false,
  minify: true,
  treeshake: true,
  skipNodeModulesBundle: false,
  noExternal: [/.*/],
});
