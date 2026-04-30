# astro-agent-optimised

[![npm version](https://img.shields.io/npm/v/astro-agent-optimised.svg)](https://www.npmjs.com/package/astro-agent-optimised)
[![npm downloads](https://img.shields.io/npm/dw/astro-agent-optimised.svg)](https://www.npmjs.com/package/astro-agent-optimised)
[![bundle size](https://img.shields.io/bundlephobia/minzip/astro-agent-optimised)](https://bundlephobia.com/package/astro-agent-optimised)
[![license](https://img.shields.io/npm/l/astro-agent-optimised.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/astro-agent-optimised.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)](https://www.npmjs.com/package/astro-agent-optimised)
[![GitHub stars](https://img.shields.io/github/stars/palpalani/astro-agent-optimized?style=social)](https://github.com/palpalani/astro-agent-optimized)

> Agent-optimised output for Astro. Inspired by [laravel/pao](https://github.com/laravel/pao).

When `astro build` runs inside an AI coding agent (Claude Code, Cursor, Gemini CLI, Devin, Windsurf, ...), this integration replaces Astro's verbose human-readable output with one compact JSON line. Token usage drops dramatically. When you run `astro build` in your own terminal, **nothing changes** — you see exactly the output Astro normally produces.

```
Human terminal:                 AI agent (Claude Code, etc.):

13:34:35 [types] Generated      {"tool":"astro-build","result":"passed",
13:34:35 [build] output: ...     "duration_ms":264,"pages":1,"routes":[""],
13:34:35 [build] mode: ...       "bundle":{"files":1,"total_kb":0.3,
13:34:35 [build] directory: ...   "largest":[{"file":"dist/index.html",
... 15 more lines ...                          "kb":0.3}]}}
```

## Install

Install as a dev dependency with your package manager of choice — all four are equivalent.

```sh
# npm
npm install astro-agent-optimised --save-dev

# pnpm
pnpm add -D astro-agent-optimised

# bun
bun add -d astro-agent-optimised

# yarn
yarn add -D astro-agent-optimised
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import aao from 'astro-agent-optimised';

export default defineConfig({
  integrations: [aao()],
});
```

That's the entire setup. No flags, no config.

## What's covered (v0.1)

| Command       | Mechanism                  | Status |
|---------------|----------------------------|--------|
| `astro build` | Astro integration hooks    | ✅     |
| `astro dev`   | Astro integration hooks    | ✅     |
| `astro check` | `npx aao check` CLI wrapper | ✅     |

For `astro check`, use the bundled CLI — runnable without installing via your package manager's one-shot runner:

```sh
# npm
npx aao check

# pnpm
pnpm dlx aao check

# bun
bunx aao check
```

Inside an agent it emits compact JSON; outside an agent it transparently runs `astro check` with no changes.

## Detected agents

Detection is env-var based. The integration activates when any of these are set:

| Agent        | Variable(s)                       |
|--------------|-----------------------------------|
| Claude Code  | `CLAUDECODE`, `CLAUDE_CODE`       |
| Cursor       | `CURSOR_AGENT`, `CURSOR_TRACE_ID` |
| Gemini CLI   | `GEMINI_CLI`                      |
| Codex        | `CODEX_CLI`, `OPENAI_CODEX`       |
| Windsurf     | `WINDSURF_AGENT`, `WINDSURF`      |
| Devin        | `DEVIN`                           |
| Aider        | `AIDER_CHAT`, `AIDER`             |
| Continue     | `CONTINUE_AGENT`, `CONTINUE_DEV`  |
| OpenCode     | `OPENCODE`                        |

Override:

- `AAO_DISABLE=1` — turn off even when an agent is detected.
- `AAO_FORCE=1` — turn on even when no agent is detected (useful for testing).

## Output schema

Every emission is a single newline-terminated JSON object on stdout, prefixed with `tool`:

### `astro build`

```json
{
  "tool": "astro-build",
  "result": "passed",
  "duration_ms": 264,
  "pages": 1,
  "routes": ["/"],
  "bundle": {
    "files": 1,
    "total_kb": 0.3,
    "largest": [{ "file": "dist/index.html", "kb": 0.3 }]
  }
}
```

On failure:

```json
{
  "tool": "astro-build",
  "result": "failed",
  "duration_ms": 559,
  "error": "astro build exited with code 1",
  "raw": [
    "Could not resolve \"./nowhere.js\" from \"src/pages/broken.astro\"",
    "..."
  ]
}
```

### `astro dev`

```json
{
  "tool": "astro-dev",
  "result": "passed",
  "duration_ms": 142,
  "host": "localhost",
  "port": 4321,
  "url": "http://localhost:4321/"
}
```

### `aao check`

```json
{
  "tool": "astro-check",
  "result": "failed",
  "duration_ms": 2310,
  "errors": 2,
  "warnings": 0,
  "diagnostics": [
    {
      "file": "src/pages/index.astro",
      "line": 12,
      "col": 5,
      "severity": "error",
      "code": "2345",
      "message": "Argument of type 'string' is not assignable to parameter of type 'number'"
    }
  ]
}
```

## How it works

1. At `astro:config:setup`, the integration calls `detect()`. If no agent is found, it returns an inert integration — your terminal output is unchanged.
2. If an agent is detected, it patches `process.stdout.write` and `process.stderr.write` for the duration of the build, silences Vite's logger, and silences Astro's per-integration logger.
3. At `astro:build:done` (or on `process.exit` for failures), it emits a single compact JSON object via the original (uncaptured) stdout.

## Links

- npm: https://www.npmjs.com/package/astro-agent-optimised
- GitHub: https://github.com/palpalani/astro-agent-optimized
- Issues: https://github.com/palpalani/astro-agent-optimized/issues

## Acknowledgements

Architecture adapted from [Taylor Otwell](https://github.com/taylorotwell)'s [laravel/pao](https://github.com/laravel/pao) — the PHP original.

## License

MIT
