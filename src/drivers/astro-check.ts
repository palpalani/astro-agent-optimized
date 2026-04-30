/**
 * astro-check driver — wraps `astro check` (a separate command that does NOT
 * fire integration hooks) by spawning the real binary, parsing its output,
 * and emitting compact JSON.
 *
 * Invoked from the `aao` CLI bin: `npx aao check`.
 */

import { spawn } from 'node:child_process';
import { clean, cleanLines } from '../output-cleaner.js';
import type { Driver, DriverResult } from './driver.js';

interface Diagnostic {
  file: string;
  line: number;
  col: number;
  severity: 'error' | 'warning' | 'hint';
  message: string;
  code?: string;
}

export class AstroCheckDriver implements Driver {
  private exitCode: number | null = null;
  private stdoutBuf = '';
  private stderrBuf = '';
  private startedAt = Date.now();

  constructor(private readonly args: string[] = []) {}

  name(): string {
    return 'astro-check';
  }

  async start(): Promise<void> {
    this.startedAt = Date.now();

    await new Promise<void>((resolve) => {
      // Use the local astro binary; npm/pnpm/yarn put it on PATH inside scripts
      // and `npx` invocations.
      const child = spawn('astro', ['check', ...this.args], {
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (chunk: Buffer) => {
        this.stdoutBuf += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        this.stderrBuf += chunk.toString('utf8');
      });
      child.on('close', (code) => {
        this.exitCode = code;
        resolve();
      });
      child.on('error', (err) => {
        this.stderrBuf += `\n${err.message}`;
        this.exitCode = 1;
        resolve();
      });
    });
  }

  parse(): DriverResult {
    const duration_ms = Date.now() - this.startedAt;
    const combined = `${this.stdoutBuf}\n${this.stderrBuf}`;
    const cleaned = clean(combined);
    const diagnostics = parseDiagnostics(cleaned);

    const errors = diagnostics.filter((d) => d.severity === 'error').length;
    const warnings = diagnostics.filter((d) => d.severity === 'warning').length;

    const result: DriverResult = {
      result: this.exitCode === 0 ? 'passed' : 'failed',
      duration_ms,
      errors,
      warnings,
      diagnostics: diagnostics.slice(0, 50),
    };

    if (diagnostics.length > 50) {
      result.truncated = true;
      result.total = diagnostics.length;
    }

    if (diagnostics.length === 0 && this.exitCode !== 0) {
      // Fall back to raw lines so the agent can still see what went wrong.
      result.raw = cleanLines(combined).slice(0, 30);
    }

    return result;
  }
}

/**
 * Parse `astro check` text output. Astro check uses the volar/svelte-style
 * diagnostic format roughly: `path/file.astro:LINE:COL - severity ts(CODE): message`.
 */
function parseDiagnostics(text: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  const lines = text.split('\n');
  // Pattern variants we tolerate:
  //   src/pages/index.astro:12:5 - error TS2345: Argument of type ...
  //   src/pages/index.astro:12:5 error: Argument of type ...
  const pattern =
    /^(.+?\.(?:astro|ts|tsx|js|jsx|md|mdx)):(\d+):(\d+)\s*[-–—]?\s*(error|warning|hint)(?:\s+(?:ts|TS)?(\w+))?:?\s*(.+)$/i;

  for (const line of lines) {
    const m = pattern.exec(line.trim());
    if (!m) continue;

    const [, file, lineStr, colStr, sev, code, message] = m;
    if (!file || !lineStr || !colStr || !sev || !message) continue;

    out.push({
      file,
      line: Number(lineStr),
      col: Number(colStr),
      severity: sev.toLowerCase() as Diagnostic['severity'],
      message: message.trim(),
      ...(code ? { code: code.toString() } : {}),
    });
  }
  return out;
}
