/**
 * Driver contract — mirrors laravel/pao's Contracts/Driver.
 *
 * A driver represents one wrapped tool (astro-build, astro-check, astro-dev).
 * `start()` installs hooks; `parse()` returns the structured payload at exit.
 */

export interface DriverResult {
  result: 'passed' | 'failed';
  [key: string]: unknown;
}

export interface Driver {
  name(): string;
  start(): void | Promise<void>;
  parse(): DriverResult | null | Promise<DriverResult | null>;
}
