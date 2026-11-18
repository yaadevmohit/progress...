import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
mkdirSync('build', { recursive: true });
const output = resolve('build/growth-focus.zip');
execFileSync('zip', ['-FS', '-q', '-r', output, '.', '-x', '*.DS_Store'], { cwd: 'extension/growth-focus' });
console.log(`Extension package: ${output}`);
