import { spawnSync } from 'node:child_process';

const steps = [
  ['typecheck', 'npm', ['run', 'typecheck']],
  ['lint', 'npm', ['run', 'lint']],
  ['test', 'npm', ['test']],
];

let failed = false;
for (const [name, command, args] of steps) {
  process.stdout.write(`\n==> verify: ${name}\n`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.stderr.write(`\nverify: ${name} failed\n`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
