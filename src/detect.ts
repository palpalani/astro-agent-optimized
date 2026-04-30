/**
 * Agent detection — JS port of laravel/agent-detector.
 *
 * Mirrors PAO's detection: returns the agent name when running under a known
 * AI coding agent, otherwise null. Detection is env-var based and pure.
 */

export type AgentName =
  | 'claude-code'
  | 'cursor'
  | 'gemini-cli'
  | 'codex'
  | 'windsurf'
  | 'devin'
  | 'aider'
  | 'continue'
  | 'opencode';

export interface AgentResult {
  isAgent: boolean;
  name: AgentName | null;
}

const NOT_AGENT: AgentResult = { isAgent: false, name: null };

const SIGNATURES: Array<{ name: AgentName; vars: string[] }> = [
  { name: 'claude-code', vars: ['CLAUDECODE', 'CLAUDE_CODE'] },
  { name: 'cursor', vars: ['CURSOR_AGENT', 'CURSOR_TRACE_ID'] },
  { name: 'gemini-cli', vars: ['GEMINI_CLI'] },
  { name: 'codex', vars: ['CODEX_CLI', 'OPENAI_CODEX'] },
  { name: 'windsurf', vars: ['WINDSURF_AGENT', 'WINDSURF'] },
  { name: 'devin', vars: ['DEVIN'] },
  { name: 'aider', vars: ['AIDER_CHAT', 'AIDER'] },
  { name: 'continue', vars: ['CONTINUE_AGENT', 'CONTINUE_DEV'] },
  { name: 'opencode', vars: ['OPENCODE'] },
];

export function detect(env: NodeJS.ProcessEnv = process.env): AgentResult {
  if (env.AAO_DISABLE) {
    return NOT_AGENT;
  }

  if (env.AAO_FORCE) {
    return { isAgent: true, name: (env.AAO_FORCE as AgentName) ?? 'claude-code' };
  }

  for (const sig of SIGNATURES) {
    for (const v of sig.vars) {
      if (env[v]) {
        return { isAgent: true, name: sig.name };
      }
    }
  }

  return NOT_AGENT;
}
