import { describe, expect, it } from 'vitest';
import { detect } from '../src/detect.js';
import { agentEnv, withCleanEnv } from './helpers.js';

describe('detect', () => {
  withCleanEnv();

  it('returns no-agent when env is clean', () => {
    expect(detect({})).toEqual({ isAgent: false, name: null });
  });

  it.each([
    ['claude-code', 'CLAUDECODE'],
    ['claude-code', 'CLAUDE_CODE'],
    ['cursor', 'CURSOR_AGENT'],
    ['cursor', 'CURSOR_TRACE_ID'],
    ['gemini-cli', 'GEMINI_CLI'],
    ['codex', 'CODEX_CLI'],
    ['windsurf', 'WINDSURF_AGENT'],
    ['devin', 'DEVIN'],
    ['opencode', 'OPENCODE'],
  ])('detects %s via %s', (name, key) => {
    const r = detect({ [key]: '1' });
    expect(r.isAgent).toBe(true);
    expect(r.name).toBe(name);
  });

  it('honours AAO_DISABLE even when an agent var is set', () => {
    expect(detect({ CLAUDECODE: '1', AAO_DISABLE: '1' })).toEqual({
      isAgent: false,
      name: null,
    });
  });

  it('reads from process.env by default', () => {
    Object.assign(process.env, agentEnv('claude-code'));
    expect(detect().isAgent).toBe(true);
  });
});
