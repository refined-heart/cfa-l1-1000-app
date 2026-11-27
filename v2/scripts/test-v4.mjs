import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {importCompleteCourse,inspectV5Book,materializeCourseMedia} from '../src/lib/study-v4.js';

function archive(name,build){
 const zip=new JSZip();build(zip);
 return zip.generateAsync({type:'uint8array'}).then(bytes=>{
  bytes.name=name;bytes.size=bytes.byteLength;return bytes;
 });
}
const c=await archive('Course_Content_交付版.zip',zip=>{
 zip.file('Economics/01 Demand/0001_Introduction.md',
   '# Demand Analysis\n\nWhat is elasticity?\n\nA. Price effect\nB. Quantity effect\nC. Both\n\n## Answer\nB. Quantity effect\n\nThe reasoning is here.');
 zip.file('Economics/01 Demand/0001_Introduction.json',JSON.stringify({title:'Intro',body:'duplicate Markdown companion'}));
 zip.file('Economics/01 Demand/img.png',new Uint8Array([137,80,78,71]));
 zip.file('Economics/01 Demand/0002_Curve.md','# Demand curve\n\n![Supply and demand](img.png)');
 zip.file('Fixed Income/01 Bond/0001_Original.pdf',new Uint8Array([37,80,68,70]));
 zip.file('Economics/resources.json',JSON.stringify({foo:[1,2,3]}));
 zip.file('FSA/Chapter 9/Lesson_Quiz.json',JSON.stringify({title:'FSA Quiz',questions:[{question:'Which is correct?',choices:['red','green','blue'],answer:'B',explanation:'Green is correct.'}]}));
});
const parsed=await importCompleteCourse(c,'delivery',()=>{});
assert.equal(parsed.docs.length,4,'Four distinct lecture documents');
assert.equal(parsed.summary.paired,1,'Duplicate .json companion counted without double lesson');
assert.equal(parsed.summary.media>=2,true);
assert.equal(parsed.summary.notRendered>=1,true,'Unrecognized JSON is accounted for');
const demand=parsed.docs.find(d=>d.title==='Demand Analysis');
assert.ok(demand);
assert.ok(demand.course.toLowerCase().includes('economics'));
assert.ok(!demand.body.includes('B. Quantity effect\n\nThe reasoning'));
assert.ok(demand.answers.includes('The reasoning is here'));
const jsonQ=parsed.docs.find(d=>d.path.endsWith('Lesson_Quiz.json'));
assert.ok(jsonQ,'Structured JSON quiz retained');
assert.ok(jsonQ.body.includes('Which is correct?'));
assert.ok(!jsonQ.body.includes('Green is correct.'));
assert.ok(jsonQ.answers.includes('Green is correct.'));
const image=parsed.docs.find(d=>d.title==='Demand curve');
const body=await materializeCourseMedia(image);
assert.equal(body.imagesResolved,1,'Relative image resolved from original ZIP');
assert.ok(body.source.includes('data:image/png;base64,'));

const v=await archive('V5.zip',zip=>{
 zip.file('V5/Financial_English_V5.tex',
  '\\section{Unit 06 固定收益：债权、信用、现金流与利率风险}\n' +
  '\\treeword{yield}{n.}{语料词}{收益率}\n' +
  '{\\color{muted}\\ipapair{/jiːld/}{/jiːld/}{}\\par}\n' +
  '\\leaf{n. yield / yields}\n' +
  '\\treeword{coupon}{n.}{语料词}{票息}\n' +
  '\\clearpage\\section{A 基础常用：A--Z 索引}\n' +
  '\\textbf{asset}\\newline {\\scriptsize n.} & 资产 & {\\small 词元：asset}\\\\[1pt]\n');
 zip.file('V5/Financial_English_V5.pdf',new Uint8Array([37,80,68,70]));
});
const book=await inspectV5Book(v,()=>{});
assert.equal(book.treeWords,2);
assert.ok(book.indexWords>=1,'V5 A-Z index entries extracted');
assert.ok(book.pdf.endsWith('.pdf'));
assert.ok(book.words.yield.zh.includes('收益率'));
assert.ok(Object.values(book.units).some(x=>x.includes('coupon')));
console.log('V4 import smoke tests passed:',JSON.stringify({
 courseDocs:parsed.docs.length,imagesResolved:body.imagesResolved,v5Words:book.wordCount,
 sourceFileCount:parsed.summary.totalFiles
}));
