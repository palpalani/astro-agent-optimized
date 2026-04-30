/**
 * Test helpers — port of PAO's `runWith()` Pest helper.
 *
 * Sets/clears agent env vars in scope so tests can simulate "running inside
 * Claude Code" without polluting the surrounding process.
 */

import { afterEach, beforeEach } from 'vitest';

const AGENT_VARS = [
  'CLAUDECODE',
  'CLAUDE_CODE',
  'CURSOR_AGENT',
  'CURSOR_TRACE_ID',
  'GEMINI_CLI',
  'CODEX_CLI',
  'OPENAI_CODEX',
  'WINDSURF_AGENT',
  'WINDSURF',
  'DEVIN',
  'AIDER_CHAT',
  'AIDER',
  'CONTINUE_AGENT',
  'CONTINUE_DEV',
  'OPENCODE',
  'AAO_DISABLE',
  'AAO_FORCE',
];

/**
 * Wipe all known agent env vars before each test in the calling describe block.
 */
export function withCleanEnv(): void {
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of AGENT_VARS) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of AGENT_VARS) {
      if (snapshot[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = snapshot[key];
      }
    }
  });
}

/**
 * Build a partial env that simulates running inside a given agent.
 */
export function agentEnv(agent: 'claude-code' | 'cursor' | 'gemini-cli' | 'devin'): NodeJS.ProcessEnv {
  switch (agent) {
    case 'claude-code':
      return { CLAUDECODE: '1' };
    case 'cursor':
      return { CURSOR_AGENT: '1' };
    case 'gemini-cli':
      return { GEMINI_CLI: '1' };
    case 'devin':
      return { DEVIN: '1' };
  }
}
