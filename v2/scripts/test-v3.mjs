import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {normalizeWord,cleanWord,readVocabularyZip,readCourseZip,splitAnswer,parsePracticeOverlay} from '../src/lib/v3-data.js';

const v=normalizeWord({word:'convexity',zh:'凸性',en:'Second-order price sensitivity',ipaUK:'/kənˈveksɪti/'});
assert.equal(v.word,'convexity');assert.equal(v.zh,'凸性');assert.equal(cleanWord('Duration,'),'duration');
const s=splitAnswer('# Bond duration\nQuestion 1?\nA. one\nB. two\nC. three\n\n## Answer\nThe answer is B');
assert(!s.body.includes('The answer is B'));assert(s.answers.includes('The answer is B'));

const z=new JSZip();
z.file('entries.json',JSON.stringify({words:[{word:'duration',chinese:'久期',english:'Sensitivity to yield changes'},{word:'hedge',zh:'对冲',en:'Offset of risk'}]}));
const vocab=await readVocabularyZip(new File([await z.generateAsync({type:'uint8array'})],'vocab.zip'));
assert.equal(vocab.count,2);
assert.equal(vocab.words.duration.zh,'久期');

const c=new JSZip();c.file('Quant/01_Intro.md','# Learning rates\n\nRates are expressed in percent.\n\n## Answer\nExample: B');
const course=await readCourseZip(new File([await c.generateAsync({type:'uint8array'})],'course.zip'),'source');
assert.equal(course.docs.length,1);assert.equal(course.docs[0].hasAnswer,true);assert(!course.docs[0].body.includes('Example: B'));

const p=new JSZip();p.file('Fixed Income/module01.json',JSON.stringify({questions:[]}));
p.file('_study/v3-overrides.json',JSON.stringify({schema:'cfa-practice-overrides-v3',version:3,chinese:{'practice:q1':{text:'中文校订'}}}));
const overlay=await parsePracticeOverlay(new File([await p.generateAsync({type:'uint8array'})],'practice.zip'));
assert.equal(overlay.chinese['practice:q1'].text,'中文校订');
console.log('V3 ZIP tutorial, glossary, answer protection, and editable overlay tests: PASSED');
