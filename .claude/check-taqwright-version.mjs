#!/usr/bin/env node
// SessionStart hook: report whether the installed @taqwright/taqwright matches
// the latest published version. REPORT ONLY — never installs anything.
// Prints a single JSON object (systemMessage + SessionStart additionalContext).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PKG = '@taqwright/taqwright';
const root = dirname(dirname(fileURLToPath(import.meta.url))); // repo root (.claude/..)
const installedPath = join(root, 'taqwright-tests', 'node_modules', PKG, 'package.json');

function emit(msg) {
  process.stdout.write(
    JSON.stringify({
      systemMessage: msg,
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: msg },
    }),
  );
  process.exit(0);
}

let installed;
try {
  installed = JSON.parse(readFileSync(installedPath, 'utf8')).version;
} catch {
  emit(`taqwright: version check skipped — ${PKG} not installed under taqwright-tests/`);
}

let latest;
try {
  latest = execSync(`npm view ${PKG} version`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 20000,
  }).trim();
} catch {
  emit(`taqwright: installed ${installed} (latest-version check skipped — registry unreachable)`);
}

if (installed === latest) {
  emit(`taqwright: up to date (${installed})`);
} else {
  emit(
    `taqwright: UPGRADE AVAILABLE — installed ${installed}, latest ${latest}. ` +
      `To update: cd taqwright-tests && npm install ${PKG}@${latest} (manual — verify + run the suite before committing).`,
  );
}
