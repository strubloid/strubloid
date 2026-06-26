import { execFileSync } from 'node:child_process';

export default function globalSetup() {
  execFileSync('npx', ['prisma', 'db', 'push'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: 'file:./prisma/test.db',
    },
    stdio: 'inherit',
  });
}
