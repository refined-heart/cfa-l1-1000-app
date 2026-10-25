import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src', 'data', 'questions.json.br');
const dst = path.join(root, 'src', 'data', 'questions.json');

if (!fs.existsSync(src)) throw new Error('Missing src/data/questions.json.br');
const json = zlib.brotliDecompressSync(fs.readFileSync(src));
fs.writeFileSync(dst, json);

const q = JSON.parse(json.toString('utf8'));
if (q.length !== 1000) throw new Error(`Expected 1000 questions, got ${q.length}`);
console.log(`Prepared questions.json: ${q.length} questions, ${json.length} bytes`);
