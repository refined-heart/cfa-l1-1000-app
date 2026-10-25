import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = path.join(root, 'src', 'data', 'questions.json');
if (!fs.existsSync(p)) throw new Error('questions.json missing; run npm run prepare:data');

const q = JSON.parse(fs.readFileSync(p, 'utf8'));
const bad = q.filter(x => !x.id || !x.subject || !x.section || !x.stem || !x.answer ||
  !x.options?.A || !x.options?.B || !x.options?.C);
const subjects = new Map();
for (const x of q) subjects.set(x.subject, (subjects.get(x.subject) || 0) + 1);

console.log('总题数:', q.length);
for (const [k,v] of subjects) console.log(k, v, '题');
console.log('数据不完整:', bad.length);
if (q.length !== 1000 || bad.length) process.exit(1);
