/**
 * astro-build driver — captures `astro build` lifecycle and emits compact JSON.
 *
 * Hooks `astro:build:start` (record t0) and `astro:build:done` (read pages,
 * walk assets, compute bundle size). Mirrors PAO's PHPStan driver pattern of
 * "let the tool run, parse its result, emit summary."
 */

import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { cleanLines } from '../output-cleaner.js';
import type { Driver, DriverResult } from './driver.js';

interface BuildDoneOptions {
  pages: { pathname: string }[];
  dir: URL;
  assets: Map<string, URL[]>;
}

export class AstroBuildDriver implements Driver {
  private startedAt: number | null = null;
  private done: BuildDoneOptions | null = null;
  private failure: Error | null = null;
  private captured = '';

  name(): string {
    return 'astro-build';
  }

  start(): void {
    // Hooks are wired by the integration entry; nothing to do here.
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onDone(opts: BuildDoneOptions): void {
    this.done = opts;
  }

  onFailure(err: unknown): void {
    this.failure = err instanceof Error ? err : new Error(String(err));
  }

  onCaptured(text: string): void {
    this.captured = text;
  }

  /**
   * Synchronous parse for the failure path — used by process.exit handlers
   * where we cannot await.
   */
  parseSync(): DriverResult | null {
    const duration_ms =
      this.startedAt !== null ? Date.now() - this.startedAt : 0;

    if (this.failure) {
      const result: DriverResult = {
        result: 'failed',
        duration_ms,
        error: this.failure.message,
      };
      const raw = this.relevantRaw();
      if (raw.length) result.raw = raw;
      return result;
    }
    return null;
  }

  async parse(): Promise<DriverResult | null> {
    const sync = this.parseSync();
    if (sync) return sync;

    const duration_ms =
      this.startedAt !== null ? Date.now() - this.startedAt : 0;

    if (!this.done) {
      return null;
    }

    const bundle = await summariseAssets(this.done.assets);

    return {
      result: 'passed',
      duration_ms,
      pages: this.done.pages.length,
      routes: this.done.pages.map((p) => p.pathname).slice(0, 50),
      bundle,
    };
  }

  /**
   * Best-effort surfacing of error/warning lines from captured output.
   * Drops Astro's [build]/[types]/[vite] info chatter — keeps anything that
   * looks like an error or stack frame, capped at 30 lines.
   */
  private relevantRaw(): string[] {
    if (!this.captured) return [];
    return cleanLines(this.captured)
      .filter(
        (l) =>
          !/^\d{2}:\d{2}:\d{2}\s+\[(build|types|vite|content|config)\]/.test(l) &&
          !/^✓ Completed in/.test(l),
      )
      .slice(0, 30);
  }
}

async function summariseAssets(
  assets: Map<string, URL[]>,
): Promise<{ files: number; total_kb: number; largest: { file: string; kb: number }[] }> {
  const sizes: { file: string; bytes: number }[] = [];

  for (const urls of assets.values()) {
    for (const url of urls) {
      try {
        const path = fileURLToPath(url);
        const s = await stat(path);
        if (s.isFile()) {
          sizes.push({ file: path, bytes: s.size });
        }
      } catch {
        // Asset URL may not be a local file (e.g. external) — skip silently.
      }
    }
  }

  const totalBytes = sizes.reduce((sum, s) => sum + s.bytes, 0);
  const largest = sizes
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5)
    .map((s) => ({ file: shortenPath(s.file), kb: round(s.bytes / 1024) }));

  return {
    files: sizes.length,
    total_kb: round(totalBytes / 1024),
    largest,
  };
}

function shortenPath(p: string): string {
  const i = p.indexOf('/dist/');
  return i >= 0 ? p.slice(i + 1) : p;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
