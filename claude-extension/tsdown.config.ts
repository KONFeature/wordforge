import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  platform: "node",
  target: "node18",
  clean: true,
  sourcemap: false,
  minify: false,
  treeshake: true,
  skipNodeModulesBundle: false,
  noExternal: [/@modelcontextprotocol\/sdk/],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
