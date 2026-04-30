/**
 * astro-agent-optimised — Astro integration entry.
 *
 * Detects AI coding agents at config:setup time and, when present, swaps
 * verbose Astro/Vite logging for compact JSON. When no agent is detected,
 * the integration is a no-op so terminal users see normal output.
 *
 * Usage:
 *   import aao from 'astro-agent-optimised';
 *   export default defineConfig({ integrations: [aao()] });
 */

import type { AstroIntegration } from 'astro';
import { detect } from './detect.js';
import { Execution, emit } from './execution.js';
import { OutputCapture } from './output-capture.js';
import { AstroBuildDriver } from './drivers/astro-build.js';
import { AstroDevDriver } from './drivers/astro-dev.js';

export interface AaoOptions {
  /**
   * Force activation regardless of agent detection. Useful for testing.
   * @default false
   */
  force?: boolean;
}

export default function aao(options: AaoOptions = {}): AstroIntegration {
  const agent = options.force
    ? { isAgent: true, name: 'claude-code' as const }
    : detect();

  // No agent detected → return an inert integration. Terminal users keep their
  // normal Astro output, byte-for-byte.
  if (!agent.isAgent) {
    return { name: 'astro-agent-optimised', hooks: {} };
  }

  const buildDriver = new AstroBuildDriver();
  const devDriver = new AstroDevDriver();

  let activeDriver: AstroBuildDriver | AstroDevDriver | null = null;
  let emitted = false;

  return {
    name: 'astro-agent-optimised',
    hooks: {
      'astro:config:setup': ({ command, logger, updateConfig }) => {
        silenceLogger(logger);

        if (command === 'build') {
          activeDriver = buildDriver;
          // Capture stdout/stderr from now until process exit so Astro's
          // own banner and trailing CLI lines stay hidden. We emit our own
          // JSON via OutputCapture.writeRaw(), bypassing the buffer.
          OutputCapture.start();
          process.once('exit', (code) => {
            // If the build crashed before astro:build:done fired, we've
            // captured all the failure output but emitted nothing — the
            // agent would see an empty stdout. Synthesise a failure JSON.
            if (!emitted) {
              const captured = OutputCapture.snapshot();
              buildDriver.onFailure(
                new Error(`astro build exited with code ${code ?? 'unknown'}`),
              );
              buildDriver.onCaptured(captured);
              const result = buildDriver.parseSync();
              if (result) {
                emit(buildDriver.name(), result);
              }
            }
            OutputCapture.release();
          });
        } else if (command === 'dev') {
          activeDriver = devDriver;
        }

        updateConfig({
          vite: {
            logLevel: 'silent',
            customLogger: silentViteLogger(),
          },
        });
      },

      'astro:build:start': ({ logger }) => {
        silenceLogger(logger);
        buildDriver.onStart();
      },

      'astro:build:done': async ({ pages, dir, assets, logger }) => {
        silenceLogger(logger);
        buildDriver.onDone({ pages, dir, assets });
        // Snapshot the buffer so far for failure diagnostics, but keep
        // capture active for trailing CLI output.
        buildDriver.onCaptured(OutputCapture.snapshot());
        await emitFromExecution(buildDriver);
      },

      'astro:server:setup': ({ server, logger }) => {
        silenceLogger(logger);
        devDriver.onServer(server);
        process.nextTick(() => {
          emitFromExecution(devDriver);
        });
      },
    },
  };

  async function emitFromExecution(
    driver: AstroBuildDriver | AstroDevDriver,
  ): Promise<void> {
    if (!Execution.running()) {
      Execution.start(agent, driver);
    }
    if (driver !== activeDriver) {
      activeDriver = driver;
    }
    const result = await driver.parse();
    if (result) {
      emit(driver.name(), result);
      emitted = true;
    }
  }
}

/**
 * Replace the integration logger's methods with no-ops so hook execution
 * doesn't itself print noise. We keep `error` since fatal errors must surface.
 */
function silenceLogger(logger: { info: (m: string) => void; warn: (m: string) => void; debug: (m: string) => void }): void {
  logger.info = noop;
  logger.warn = noop;
  logger.debug = noop;
}

function noop(): void {
  // intentionally empty
}

function silentViteLogger() {
  return {
    info: noop,
    warn: noop,
    warnOnce: noop,
    error: (msg: string) => process.stderr.write(`${msg}\n`),
    clearScreen: noop,
    hasErrorLogged: () => false,
    hasWarned: false,
  };
}
