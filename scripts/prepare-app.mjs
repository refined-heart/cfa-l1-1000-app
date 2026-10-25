import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src', 'app-parts');
const dest = path.join(root, 'App.js');
const parts = ['App.part1.txt','App.part2.txt'].map(f => path.join(dir,f));

for (const p of parts) {
  if (!fs.existsSync(p)) throw new Error(`Missing app source part: ${p}`);
}

fs.writeFileSync(dest, parts.map(p => fs.readFileSync(p,'utf8')).join(''));
console.log(`Prepared ${dest}`);
