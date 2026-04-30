/**
 * Output cleaner — direct TypeScript port of laravel/pao's OutputCleaner.php.
 *
 * Strips ANSI escapes, control characters, box-drawing, replacement chars,
 * and collapses whitespace so the surviving text is dense and tokeniser-cheap.
 */

// eslint-disable-next-line no-control-regex
const ANSI = /\x1B\[[0-9;]*[A-Za-z]/g;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g;
const REPLACEMENT = /�/gu;
const BOX_DRAWING =
  /[─-╿▀-▟■▪◆→←↑↓✕✗✘➔▶►⚠✖✔●✕⨯▕]+/gu;
const ELLIPSIS = /\.{3,}/g;
const HORIZONTAL_WS = /[ \t]+/g;
const BLANK_LINES = /\n\s*\n/g;

export function clean(output: string): string {
  return output
    .replace(ANSI, '')
    .replace(CONTROL, '')
    .replace(REPLACEMENT, '')
    .replace(BOX_DRAWING, '')
    .replace(ELLIPSIS, '..')
    .replace(HORIZONTAL_WS, ' ')
    .replace(BLANK_LINES, '\n');
}

/**
 * Clean and split into trimmed, non-empty lines.
 * Useful for `raw` arrays attached to driver output.
 */
export function cleanLines(output: string): string[] {
  return clean(output)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
}
