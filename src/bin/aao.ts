#!/usr/bin/env node
/**
 * `aao` CLI — minimal wrapper for tools that don't fire Astro integration
 * hooks. v0.1 supports only `aao check` (wraps `astro check`).
 *
 * Usage:
 *   npx aao check
 *   npx aao check --root ./apps/web
 */

import { detect } from '../detect.js';
import { emit } from '../execution.js';
import { AstroCheckDriver } from '../drivers/astro-check.js';

const [, , subcommand, ...rest] = process.argv;

async function main(): Promise<number> {
  if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return 0;
  }

  if (subcommand === 'version' || subcommand === '--version' || subcommand === '-v') {
    process.stdout.write('aao 0.1.0\n');
    return 0;
  }

  if (subcommand !== 'check') {
    process.stderr.write(`aao: unknown subcommand "${subcommand}"\n`);
    printHelp();
    return 2;
  }

  const agent = detect();

  // When no agent is present, just exec `astro check` transparently —
  // mirrors PAO's "human terminal output is unchanged" guarantee.
  if (!agent.isAgent) {
    const { spawn } = await import('node:child_process');
    return new Promise<number>((resolve) => {
      const child = spawn('astro', ['check', ...rest], { stdio: 'inherit' });
      child.on('close', (code) => resolve(code ?? 0));
      child.on('error', () => resolve(1));
    });
  }

  const driver = new AstroCheckDriver(rest);
  await driver.start();
  const result = driver.parse();
  emit(driver.name(), result);
  return result.result === 'failed' ? 1 : 0;
}

function printHelp(): void {
  process.stdout.write(
    [
      'aao — Astro Agent-Optimised output',
      '',
      'Usage:',
      '  aao check [...args]   Run `astro check` with compact JSON output',
      '  aao --version',
      '  aao --help',
      '',
      'For `astro build` and `astro dev`, install the integration:',
      '  import aao from "astro-agent-optimised";',
      '  export default defineConfig({ integrations: [aao()] });',
      '',
    ].join('\n'),
  );
}

main().then(
  (code) => {
    process.exit(code);
  },
  (err: unknown) => {
    process.stderr.write(`aao: ${(err as Error).message}\n`);
    process.exit(1);
  },
);
