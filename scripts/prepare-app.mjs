import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src', 'app-parts');
const dest = path.join(root, 'App.js');

// The repository already tracks App.js. Never overwrite edits made during
// an online preview session just because npm install invokes "prepare".
if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
  console.log('Keeping the existing App.js (online edits are preserved)');
  process.exit(0);
}

// Legacy fallback: recover App.js from source fragments if it is absent.
const parts = ['App.part1.txt','App.part2.txt'].map(f => path.join(dir,f));
for (const part of parts) {
  if (!fs.existsSync(part)) throw new Error(`Missing app source part: ${part}`);
}
fs.writeFileSync(dest, parts.map(part => fs.readFileSync(part, 'utf8')).join(''));
console.log(`Recovered ${dest} from legacy parts`);
