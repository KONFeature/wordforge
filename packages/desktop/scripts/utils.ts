import { $ } from 'bun';
import path from 'node:path';

const DESKTOP_DIR = path.resolve(import.meta.dir, '..');
const MCP_DIR = path.resolve(DESKTOP_DIR, '../mcp');

/**
 * Sidecar binary configurations per platform.
 * Maps Rust targets to bun binary output names.
 */
export const SIDECAR_BINARIES: Array<{
  rustTarget: string;
  bunTarget: string;
  extension: string;
}> = [
  {
    rustTarget: 'aarch64-apple-darwin',
    bunTarget: 'bun-darwin-arm64',
    extension: '',
  },
  {
    rustTarget: 'x86_64-apple-darwin',
    bunTarget: 'bun-darwin-x64',
    extension: '',
  },
  {
    rustTarget: 'x86_64-pc-windows-msvc',
    bunTarget: 'bun-windows-x64',
    extension: '.exe',
  },
  {
    rustTarget: 'x86_64-unknown-linux-gnu',
    bunTarget: 'bun-linux-x64',
    extension: '',
  },
  {
    rustTarget: 'aarch64-unknown-linux-gnu',
    bunTarget: 'bun-linux-arm64',
    extension: '',
  },
];

/**
 * Get the RUST_TARGET environment variable.
 */
export const RUST_TARGET = Bun.env.RUST_TARGET;

/**
 * Get the sidecar configuration for the current or specified Rust target.
 */
export function getCurrentSidecar(target = RUST_TARGET) {
  if (!target) {
    throw new Error('RUST_TARGET not set');
  }

  const binaryConfig = SIDECAR_BINARIES.find((b) => b.rustTarget === target);
  if (!binaryConfig) {
    throw new Error(
      `Sidecar configuration not available for Rust target '${target}'`,
    );
  }

  return binaryConfig;
}

/**
 * Get sidecar configuration based on the current platform (for local dev).
 */
export function getLocalSidecar() {
  const platform = process.platform;
  const arch = process.arch;

  let rustTarget: string;

  if (platform === 'darwin') {
    rustTarget =
      arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
  } else if (platform === 'linux') {
    rustTarget =
      arch === 'arm64'
        ? 'aarch64-unknown-linux-gnu'
        : 'x86_64-unknown-linux-gnu';
  } else if (platform === 'win32') {
    rustTarget = 'x86_64-pc-windows-msvc';
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return getCurrentSidecar(rustTarget);
}

/**
 * Get the sidecar output filename for Tauri.
 * Tauri expects: `{name}-{target}{extension}` format in the sidecars folder.
 */
export function getSidecarFilename(target: string): string {
  const config = getCurrentSidecar(target);
  return `wordforge-mcp-${target}${config.extension}`;
}

/**
 * Copy a built binary to the Tauri sidecars folder with the correct naming.
 */
export async function copyBinaryToSidecarFolder(
  source: string,
  target = RUST_TARGET,
) {
  if (!target) {
    throw new Error('RUST_TARGET not set');
  }

  await $`mkdir -p src-tauri/sidecars`;
  const filename = getSidecarFilename(target);
  const dest = `src-tauri/sidecars/${filename}`;
  await $`cp ${source} ${dest}`;

  console.log(`Copied ${source} to ${dest}`);
}

/**
 * Build the MCP package and return the path to the built binary.
 */
export async function buildMcpBinary(target?: string): Promise<string> {
  const config = target ? getCurrentSidecar(target) : getLocalSidecar();
  const rustTarget = target ?? config.rustTarget;
  const entrypoint = path.join(MCP_DIR, 'src/index.ts');
  const outDir = path.join(DESKTOP_DIR, 'src-tauri/sidecars');
  const outfile = path.join(outDir, getSidecarFilename(rustTarget));

  console.log(`Building MCP binary for ${config.bunTarget}...`);
  console.log(`  Entry: ${entrypoint}`);
  console.log(`  Output: ${outfile}`);

  await $`mkdir -p ${outDir}`;
  await $`bun build ${entrypoint} --compile --target=${config.bunTarget} --outfile=${outfile}`;

  console.log(`Built: ${outfile}`);
  return outfile;
}
