/**
 * Execution — singleton state coordinator. Mirrors PAO's Execution.php.
 *
 * Holds the active agent + driver for the current process run, and provides
 * a single `flush()` that the integration's exit hook calls to emit JSON.
 */

import type { AgentResult } from './detect.js';
import type { Driver, DriverResult } from './drivers/driver.js';
import { OutputCapture } from './output-capture.js';

let instance: Execution | null = null;

export class Execution {
  private constructor(
    public readonly agent: AgentResult,
    public readonly driver: Driver,
  ) {}

  static start(agent: AgentResult, driver: Driver): Execution {
    if (instance) {
      throw new Error('aao: Execution already started');
    }
    instance = new Execution(agent, driver);
    void driver.start();
    return instance;
  }

  static running(): boolean {
    return instance !== null;
  }

  static current(): Execution {
    if (!instance) {
      throw new Error('aao: Execution not started');
    }
    return instance;
  }

  static reset(): void {
    instance = null;
  }

  async flush(): Promise<void> {
    const result = await this.driver.parse();
    if (!result) {
      return;
    }
    emit(this.driver.name(), result);
  }
}

export function emit(tool: string, result: DriverResult): void {
  const payload = { tool, ...result };
  // Bypass active stdout capture so our own JSON always reaches the user.
  OutputCapture.writeRaw(`${JSON.stringify(payload)}\n`);
}
