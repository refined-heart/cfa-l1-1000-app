import JSZip from 'jszip';
import {get,set} from 'idb-keyval';
import {splitAnswer,normalizeWord,readVocabularyZip,cleanWord} from './v3-data';

const DOC_EXT=/\.(md|markdown|html?|json|txt|pdf|docx)$/i;
const MEDIA_EXT=/\.(png|jpe?g|gif|webp|svg|bmp|pdf|mp3|mp4|woff2?)$/i;
const ZIP_EXT=/\.zip$/i;
const textExt=/\.(md|markdown|html?|json|txt)$/i;
const IMAGE_EXT=/\.(png|jpe?g|gif|webp|svg|bmp)$/i;
const V4_COURSE='cfa-v4-full-course-';
const V4_VOCAB='cfa-v4-vocabulary-original';
const assetCache=new Map();
const zipCache=new Map();
const safePath=p=>String(p||'').replace(/\\/g,'/').replace(/^\.?\//,'').replace(/\/+/g,'/');
const basename=p=>safePath(p).split('/').pop();
const removeExt=p=>safePath(p).replace(/\.[^.\/]+$/,'');
const textTrim=x=>String(x||'').replace(/\0/g,'').trim();
const human=x=>x.replace(/\.[^.]+$/,'').replace(/^0*\d+[_ .-]+/,'').replace(/_/g,' ').trim();
function asString(v){if(typeof v==='string')return v;return '';}
function plainJson(o,level=0){
 if(level>10||o==null)return '';
 if(typeof o==='string')return o;
 if(Array.isArray(o))return o.map(v=>plainJson(v,level+1)).filter(Boolean).join('\n\n');
 if(typeof o!=='object')return '';
 const preferred=['heading','title','subtitle','markdown','body_markdown','content_markdown','body_md','text','html','body_html','body','content','description','explanation','learning_objectives','learning_outcomes','blocks','sections','paragraphs','children'];
 const pieces=[];
 for(const k of preferred){if(k in o){const v=plainJson(o[k],level+1);if(v)pieces.push((k==='title'||k==='heading')?'## '+v:v);}}
 // Keep unusual JSON formats as an intact source file; do not flatten question databases into prose.
 return pieces.join('\n\n');
}
function sortPaths(a,b){return a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});}
function mediaType(p){
 const e=basename(p).split('.').pop().toLowerCase();
 return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',bmp:'image/bmp',pdf:'application/pdf',mp3:'audio/mpeg',mp4:'video/mp4'})[e]||'application/octet-stream';
}
function docTitle(raw,path){
 const h=String(raw||'').match(/^\s*#{1,3}\s+(.+?)\s*$/m);
 return human(h?.[1]||basename(path));
}
function courseCategory(path){
 const p=safePath(path).split('/').filter(Boolean);
 // User source folders are the primary curriculum hierarchy, not a generated one.
 const folders=p.slice(0,-1).filter(s=>!/^(__MACOSX|_assets|assets)$/i.test(s));
 const meaningful=folders.filter(s=>!/^(Course_Content|delivery|content|courses|pages)$/i.test(s));
 return {course:human(meaningful[0]||folders[0]||'未归类课程'),
         unit:human(meaningful[1]||folders[1]||'原始章节'),
         hierarchy:folders.map(human)};
}
function shouldIgnore(p){
 return /(^|\/)(__MACOSX|node_modules|\.git|\.DS_Store)(\/|$)/i.test(p);
}
function formatRank(p){return /\.(md|markdown)$/i.test(p)?0:/\.html?$/i.test(p)?1:/\.json$/i.test(p)?2:3;}
function isBodyJson(o){return o&&typeof o==='object'&&(!Array.isArray(o))&&(['content','body','text','blocks','sections','markdown','html','description','learning_outcomes','learning_objectives'].some(k=>o[k]!==undefined));}
export async function importCompleteCourse(file,kind,progress=()=>{}){
 if(!file||!ZIP_EXT.test(file.name))throw new Error('请选择课程 ZIP 原文件');
 const zip=await JSZip.loadAsync(file);
 const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir&&!shouldIgnore(n));
 const supported=names.filter(n=>DOC_EXT.test(n)).sort((a,b)=>formatRank(a)-formatRank(b)||sortPaths(a,b));
 const counts={totalFiles:names.length,documents:0,media:names.filter(x=>MEDIA_EXT.test(x)).length,
  other:names.filter(x=>!DOC_EXT.test(x)&&!MEDIA_EXT.test(x)).length,paired:0,notRendered:0,
  skipped:[],sourceSize:file.size,sourceName:file.name};
 const docs=[],seen=new Set();
 for(let i=0;i<supported.length;i++){
  const path=supported[i],entry=zip.file(path),size=Number(entry?._data?.uncompressedSize||0),base=removeExt(path);
  if(i%35===0)progress('课程结构化：'+(i+1)+' / '+supported.length+' 文件');
  if(seen.has(base)&&textExt.test(path)){counts.paired++;continue}
  if(size>12*1024*1024){
   counts.notRendered++;counts.skipped.push({path,reason:'单文件超过 12MB，保留在原包中，可单独查看/下载'});continue;
  }
  try{
   const ext=path.split('.').pop().toLowerCase();
   let raw='',sourceFormat=ext;
   if(/^(md|markdown|txt|html|htm)$/.test(ext))raw=await entry.async('string');
   if(ext==='json'){
    const source=await entry.async('string');
    const obj=JSON.parse(source);
    if(!isBodyJson(obj)){
     counts.notRendered++;counts.skipped.push({path,reason:'结构化 JSON 资源，不作为普通课程讲义；原包保留'});continue;
    }
    raw=plainJson(obj);sourceFormat='markdown';
    if(raw.length<35){
      counts.notRendered++;counts.skipped.push({path,reason:'未能可靠提取 JSON 中的课程正文，原包保留'});continue;
    }
   }
   if(ext==='docx'||ext==='pdf'){
    const meta=courseCategory(path);
    docs.push({id:kind+':'+path,kind,path,title:human(basename(path)),course:meta.course,unit:meta.unit,hierarchy:meta.hierarchy,
      body:'',answers:'',hasAnswer:false,format:ext,hasAssets:false,size,displayMode:'original'});
    counts.documents++;seen.add(base);continue;
   }
   if(!textTrim(raw))continue;
   if(ext==='html'||ext==='htm'){
     raw=raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
     // HTML is preserved, including tables and original asset references.
     sourceFormat='html';
   }
   const meta=courseCategory(path);
   const isHtml=sourceFormat==='html';
   // We only auto-separate explicit answer headings in Markdown / plain text.
   const segmented=isHtml?{body:raw,answers:'',hasAnswer:false}:splitAnswer(raw);
   docs.push({id:kind+':'+path,kind,path,title:docTitle(raw,path),course:meta.course,unit:meta.unit,hierarchy:meta.hierarchy,
    body:segmented.body,answers:segmented.answers,hasAnswer:segmented.hasAnswer,format:sourceFormat,
    hasAssets:/(!\[[^\]]*\]\([^)]*\)|<img\b)/i.test(raw),size,displayMode:'lesson'});
   counts.documents++;seen.add(base);
  }catch(e){
   counts.notRendered++;counts.skipped.push({path,reason:'解析错误：'+String(e.message||e).slice(0,110)});
  }
 }
 docs.sort((a,b)=>sortPaths(a.path,b.path));
 if(!docs.length)throw new Error('ZIP 未识别出任何可阅读的课程文件；请使用原始课程包');
 const summary={...counts,count:docs.length,skippedCount:counts.skipped.length,
  // This count makes omissions explicit rather than claiming full import.
  coverage:Math.round(100*counts.documents/Math.max(1,supported.length)),
  filename:file.name,kind,importedAt:new Date().toISOString(),sourceFiles:supported.length};
 try{await set(V4_COURSE+kind,file);summary.originalArchiveSaved=true;}
 catch(e){summary.originalArchiveSaved=false;summary.storageWarning='浏览器配额不足：原始大 ZIP 未缓存，请自行保留该文件；文档目录已导入。'}
 zipCache.set(kind,zip);
 return {kind,docs,summary};
}
export async function loadCourseArchive(kind){
 if(zipCache.has(kind))return zipCache.get(kind);
 const file=await get(V4_COURSE+kind);
 if(!file)return null;
 const zip=await JSZip.loadAsync(file);zipCache.set(kind,zip);return zip;
}
function findAssetPath(zip,docPath,src){
 const clean=decodeURIComponent(String(src||'').split('?')[0].split('#')[0]).replace(/^file:\/\/\//,'').replace(/^\/+/,'').replace(/\\/g,'/');
 if(!clean||/^(https?:|data:|blob:)/i.test(clean))return null;
 const parent=docPath.split('/').slice(0,-1).join('/');
 const parts=[clean,parent+'/'+clean,parent+'/assets/'+basename(clean),parent+'/_assets/'+basename(clean)];
 for(const p of parts){const n=safePath(p);if(zip.file(n))return n;}
 const matches=Object.keys(zip.files).filter(p=>basename(p).toLowerCase()===basename(clean).toLowerCase()&&IMAGE_EXT.test(p));
 if(matches.length===1)return matches[0];
 return matches.find(p=>p.toLowerCase().includes('/assets/'))||matches[0]||null;
}
export async function materializeCourseMedia(doc,progress=()=>{}){
 const zip=await loadCourseArchive(doc.kind);
 if(!zip)return {source:doc.body,imagesResolved:0,imagesMissing:[],warning:'原始课程 ZIP 未缓存。重新导入来源 ZIP，可恢复图片与附件。'};
 const source=String(doc.body||''),references=new Set();
 for(const m of source.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g))references.add(m[1]);
 for(const m of source.matchAll(/<img[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi))references.add(m[1]);
 const replacements=new Map(),missing=[];
 let n=0;
 for(const src of references){
  if(/^(data:|blob:|https?:)/i.test(src))continue;
  if(++n>125){missing.push(src+'（图片超过 125 项，本页按需查看原始包）');continue;}
  const path=findAssetPath(zip,doc.path,src);
  if(!path){missing.push(src);continue;}
  try {
   const b64=await zip.file(path).async('base64');
   replacements.set(src,'data:'+mediaType(path)+';base64,'+b64);
  } catch {missing.push(src);}
 }
 let body=source;
 for(const [src,d] of replacements)body=body.split(src).join(d);
 return {source:body,imagesResolved:replacements.size,imagesMissing:missing};
}
export async function openOriginalCourseEntry(doc){
 const zip=await loadCourseArchive(doc.kind);
 if(!zip)throw new Error('当前浏览器缺少原始课程 ZIP，请重新导入');
 const entry=zip.file(doc.path);
 if(!entry)throw new Error('原始压缩包缺少该文件');
 const bytes=await entry.async('uint8array');
 return new Blob([bytes],{type:mediaType(doc.path)});
}
export async function downloadOriginalCourse(kind){
 const file=await get(V4_COURSE+kind);
 if(!file)throw new Error('原始 ZIP 不在缓存中；请在文件夹中找回原 ZIP，或重新导入');
 return file;
}
export const V5_UNITS=[
 '学习路线与编校原则','Unit 00 · 屈折语法：从词元到句法形式','词根词缀：常用构词规则',
 'Unit 01 · 金融基础：价值、资本、投资与产权','Unit 02 · 财务会计：确认、计量、报告与三表',
 'Unit 03 · 经济学：生产、消费、市场与货币','Unit 04 · 公司金融：治理、融资、资源配置',
 'Unit 05 · 权益投资：股权、估值、研究与交易','Unit 06 · 固定收益：债权、信用、现金流与利率风险',
 'Unit 07 · 衍生品：承诺、或有索取、对冲与结算','Unit 08 · 另类投资：私募、实物与数字资产',
 'Unit 09 · 数量方法：概率、统计、估计与检验','Unit 10 · 投资组合：风险、配置、优化与绩效',
 'Unit 11 · 职业道德：信任、披露、责任与监管','Unit 12 · 通用学术英语：词缀、逻辑与题干谓词',
 'Unit 13 · Python 与数据科学英语','Unit 14 · 财务建模与实务英语','Unit 15 · 教材新增跨科词族专题',
 '课程术语词典：按科目组织','金融缩写与货币代码','A 基础常用：A–Z 索引',
 'B 核心金融与学术：A–Z 索引','C 进阶与低频专业：A–Z 索引'
];
function extractTexEntries(tex){
 const out={},units={};let unit='综合 / 索引';
 const pattern=/\\section\{([^}]+)\}|\\subsection\{([^}]+)\}|\\treeword\{([^}]+)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g;
 let m;
 while((m=pattern.exec(tex))){
  if(m[1]){unit=m[1];if(!units[unit])units[unit]=[];continue;}
  if(m[2]){continue;}
  const w=cleanWord(m[3]);if(!w||w.length>55)continue;
  const tail=tex.slice(pattern.lastIndex,Math.min(tex.length,pattern.lastIndex+550));
  const ipa=tail.match(/\\ipapair\{([^}]+)\}\{([^}]+)\}/);
  const leaf=tail.match(/\\leaf\{([^}]+)\}/);
  const cleanTex=s=>String(s||'').replace(/\\allowbreak\{\}/g,'').replace(/\\textbar/g,'|').replace(/\\[a-z]+\b\{?/g,'').replace(/[\{\}]/g,'').trim();
  const next={word:w,zh:cleanTex(m[6]),en:'',ipaUK:cleanTex(ipa?.[1]),ipaUS:cleanTex(ipa?.[2]),
   roots:'',derivation:'',inflections:cleanTex(leaf?.[1]),phrases:'',synonyms:'',antonyms:'',
   source:'V5 LaTeX 原始词族 · '+unit};
  if(!out[w])out[w]=next;
  if(!units[unit])units[unit]=[];
  if(!units[unit].includes(w))units[unit].push(w);
 }
 return {words:out,units};
}
export async function inspectV5Book(file,progress=()=>{}){
 const zip=await JSZip.loadAsync(file),files=Object.keys(zip.files).filter(x=>!zip.files[x].dir&&!shouldIgnore(x));
 const pdf=files.filter(n=>/\.pdf$/i.test(n)).sort((a,b)=>/v5/i.test(b)-/v5/i.test(a))[0]||'';
 const tex=files.filter(n=>/\.tex$/i.test(n)).sort((a,b)=>/v5/i.test(b)-/v5/i.test(a))[0]||'';
 const docx=files.filter(n=>/\.docx$/i.test(n)).sort((a,b)=>/v5/i.test(b)-/v5/i.test(a))[0]||'';
 const parsed=await readVocabularyZip(file,progress);
 let texEntries={words:{},units:{}};
 if(tex){
  progress('正在读取 V5 原始词族和章节…');
  const src=await zip.file(tex).async('string');
  texEntries=extractTexEntries(src);
 }
 const words={...texEntries.words,...parsed.words};
 const r={fileName:file.name,files:files.length,pdf,tex,docx,
  words,wordCount:Object.keys(words).length,
  units:texEntries.units,structuredWords:parsed.count,treeWords:Object.keys(texEntries.words).length,
  sourceType:pdf?'V5 原版 PDF 教材':docx?'V5 Word 教材':tex?'V5 TeX 原文':'无可视化教材',
  importedAt:new Date().toISOString()};
 zipCache.set('v5',zip);
 try{await set(V4_VOCAB,file);r.originalArchiveSaved=true;}
 catch(e){r.originalArchiveSaved=false;r.storageWarning='本地容量不足：请保留原始 V5 ZIP，以便下次重新导入。';}
 return r;
}
export async function loadV5Book(){
 const file=await get(V4_VOCAB);if(!file)return null;
 const z=await JSZip.loadAsync(file);zipCache.set('v5',z);
 const files=Object.keys(z.files);
 return {pdf:files.find(n=>/\.pdf$/i.test(n))||'',docx:files.find(n=>/\.docx$/i.test(n))||'',tex:files.find(n=>/\.tex$/i.test(n))||'',fileName:file.name||'V5'};
}
export async function loadV5PdfBlob(path){
 let zip=zipCache.get('v5');
 if(!zip){await loadV5Book();zip=zipCache.get('v5');}
 if(!zip||!zip.file(path))throw new Error('V5 原版 PDF 未在本地缓存中，请重新导入 ZIP');
 return new Blob([await zip.file(path).async('uint8array')],{type:'application/pdf'});
}
export function wordUnitMap(words){
 return Object.fromEntries(Object.entries(words||{}).reduce((acc,[key,value])=>{
  const source=value.source||'';
  const unit=(source.match(/Unit\s*\d{2}[^·]*/i)||[])[0]||'综合 / 索引';
  let row=acc.find(x=>x[0]===unit);if(!row){row=[unit,[]];acc.push(row);}
  row[1].push(key);return acc;
 },[]));
}
