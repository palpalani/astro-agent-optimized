/**
 * Output capture — Node equivalent of PAO's CaptureFilter PHP stream filter.
 *
 * Monkey-patches `process.stdout.write` and `process.stderr.write` so the
 * wrapped tool's noisy progress output is buffered instead of printed.
 * Call `release()` to restore the originals and retrieve the captured text.
 *
 * Idempotent: a second `start()` while already active is a no-op.
 */

type WriteFn = typeof process.stdout.write;

let active = false;
let stdoutBuf = '';
let stderrBuf = '';
let originalStdoutWrite: WriteFn | null = null;
let originalStderrWrite: WriteFn | null = null;

export const OutputCapture = {
  start(): void {
    if (active) return;
    active = true;
    stdoutBuf = '';
    stderrBuf = '';

    originalStdoutWrite = process.stdout.write.bind(process.stdout);
    originalStderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      stdoutBuf += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
      const cb = rest.find((r) => typeof r === 'function') as ((err?: Error) => void) | undefined;
      if (cb) cb();
      return true;
    }) as WriteFn;

    process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      stderrBuf += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
      const cb = rest.find((r) => typeof r === 'function') as ((err?: Error) => void) | undefined;
      if (cb) cb();
      return true;
    }) as WriteFn;
  },

  /**
   * Read the buffered output without stopping capture or clearing the buffer.
   */
  snapshot(): string {
    return active ? `${stdoutBuf}\n${stderrBuf}` : '';
  },

  release(): { stdout: string; stderr: string } {
    if (!active) return { stdout: '', stderr: '' };
    active = false;

    if (originalStdoutWrite) process.stdout.write = originalStdoutWrite;
    if (originalStderrWrite) process.stderr.write = originalStderrWrite;
    originalStdoutWrite = null;
    originalStderrWrite = null;

    const result = { stdout: stdoutBuf, stderr: stderrBuf };
    stdoutBuf = '';
    stderrBuf = '';
    return result;
  },

  /**
   * Write directly to the real stdout, bypassing any active capture.
   * Used by the integration to emit its final JSON line.
   */
  writeRaw(text: string): void {
    const w = originalStdoutWrite ?? process.stdout.write.bind(process.stdout);
    w(text);
  },

  isActive(): boolean {
    return active;
  },
};
