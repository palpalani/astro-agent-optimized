/**
 * astro-dev driver — emits a single compact JSON line when the dev server is
 * ready, replacing Astro's multi-line banner.
 *
 * Dev sessions are interactive and long-lived, so the agent value here is
 * smaller than for `astro build`. We emit once on startup and stay quiet
 * unless something fails.
 */

import type { ViteDevServer } from 'vite';
import type { Driver, DriverResult } from './driver.js';

export class AstroDevDriver implements Driver {
  private server: ViteDevServer | null = null;
  private startedAt = Date.now();
  private parsed = false;

  name(): string {
    return 'astro-dev';
  }

  start(): void {
    // Hooks are wired by the integration entry.
  }

  onServer(server: ViteDevServer): void {
    this.server = server;
  }

  parse(): DriverResult | null {
    if (this.parsed || !this.server) {
      return null;
    }
    this.parsed = true;

    const config = this.server.config.server;
    const port = typeof config.port === 'number' ? config.port : null;
    const host =
      typeof config.host === 'string'
        ? config.host
        : config.host === true
          ? '0.0.0.0'
          : 'localhost';

    return {
      result: 'passed',
      duration_ms: Date.now() - this.startedAt,
      host,
      port,
      url: port ? `http://${host}:${port}/` : null,
    };
  }
}
