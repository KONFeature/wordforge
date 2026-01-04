#!/usr/bin/env bun

import {
  RUST_TARGET,
  buildMcpBinary,
  getLocalSidecar,
  getSidecarFilename,
} from './utils';

const target = RUST_TARGET;

if (target) {
  console.log(`Building MCP sidecar for target: ${target}`);
  await buildMcpBinary(target);
} else {
  console.log('No RUST_TARGET set, building for local platform...');
  const config = getLocalSidecar();
  await buildMcpBinary(config.rustTarget);
}

console.log('MCP sidecar build complete!');
