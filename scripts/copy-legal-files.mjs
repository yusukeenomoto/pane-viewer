import { copyFileSync } from 'node:fs';

for (const name of ['LICENSE', 'THIRD-PARTY-NOTICES.md']) {
  copyFileSync(new URL(`../${name}`, import.meta.url), new URL(`../dist/${name}`, import.meta.url));
}
