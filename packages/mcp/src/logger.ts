let debugEnabled = false;

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

export function debug(message: string, data?: unknown): void {
  if (!debugEnabled) return;
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.error(
      `[WordForge ${timestamp}] DEBUG: ${message}`,
      JSON.stringify(data, null, 2),
    );
  } else {
    console.error(`[WordForge ${timestamp}] DEBUG: ${message}`);
  }
}

export function info(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.error(
      `[WordForge ${timestamp}] INFO: ${message}`,
      JSON.stringify(data, null, 2),
    );
  } else {
    console.error(`[WordForge ${timestamp}] INFO: ${message}`);
  }
}

export function error(message: string, err?: unknown): void {
  const timestamp = new Date().toISOString();
  const errorDetails = formatError(err);
  console.error(`[WordForge ${timestamp}] ERROR: ${message}`);
  if (errorDetails) {
    console.error(errorDetails);
  }
}

function formatError(err: unknown): string | null {
  if (!err) return null;

  if (err instanceof Error) {
    const lines = [`  Message: ${err.message}`];
    if (err.cause) {
      lines.push(`  Cause: ${String(err.cause)}`);
    }
    if (err.stack) {
      lines.push(
        `  Stack: ${err.stack.split('\n').slice(1, 4).join('\n        ')}`,
      );
    }
    return lines.join('\n');
  }

  if (typeof err === 'object') {
    return `  Details: ${JSON.stringify(err, null, 2)}`;
  }

  return `  Details: ${String(err)}`;
}

export function connectionError(
  url: string,
  attempt: number,
  maxAttempts: number,
  err: unknown,
  nextRetryMs?: number,
): void {
  const timestamp = new Date().toISOString();
  console.error(
    `[WordForge ${timestamp}] CONNECTION ERROR (attempt ${attempt}/${maxAttempts})`,
  );
  console.error(`  URL: ${url}`);
  console.error(`  ${formatError(err)}`);
  if (nextRetryMs !== undefined) {
    console.error(`  Retrying in ${nextRetryMs}ms...`);
  }
}

export function fatalError(
  message: string,
  details: Record<string, unknown>,
): never {
  const timestamp = new Date().toISOString();
  console.error(`[WordForge ${timestamp}] FATAL: ${message}`);
  for (const [key, value] of Object.entries(details)) {
    console.error(
      `  ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`,
    );
  }
  process.exit(1);
}
