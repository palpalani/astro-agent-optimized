import { describe, expect, it } from 'vitest';
import aao from '../src/index.js';
import { withCleanEnv } from './helpers.js';

describe('integration entry', () => {
  withCleanEnv();

  it('returns a no-op integration when no agent is detected', () => {
    const integration = aao();
    expect(integration.name).toBe('astro-agent-optimised');
    expect(integration.hooks).toEqual({});
  });

  it('returns a wired integration when an agent is detected', () => {
    process.env.CLAUDECODE = '1';
    const integration = aao();
    expect(integration.name).toBe('astro-agent-optimised');
    expect(integration.hooks['astro:config:setup']).toBeTypeOf('function');
    expect(integration.hooks['astro:build:start']).toBeTypeOf('function');
    expect(integration.hooks['astro:build:done']).toBeTypeOf('function');
    expect(integration.hooks['astro:server:setup']).toBeTypeOf('function');
  });

  it('honours the force option', () => {
    const integration = aao({ force: true });
    expect(integration.hooks['astro:build:done']).toBeTypeOf('function');
  });
});
