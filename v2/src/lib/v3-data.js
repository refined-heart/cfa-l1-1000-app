import JSZip from 'jszip';
import {get,set} from 'idb-keyval';

export const OVERLAY_PATH='_study/v3-overrides.json';
const PRACTICE_FILE='cfa-v3-practice-original-zip';
const COURSE_KEY='cfa-v3-course-lessons';
const ENGLISH_KEY='cfa-v3-english-source';
const MAX_DOCS=2800;
const MAX_DOC_SIZE=1800000;
const MAX_TOTAL_TEXT=47000000;

export const cleanWord=w=>String(w||'').toLowerCase().normalize('NFKC').trim().replace(/^[^a-z]+|[^a-z]+$/g,'');
const first=(o,keys)=>{for(const k of keys){const v=o?.[k];if(typeof v==='string'&&v.trim())return v.trim();}return '';};
function arrayText(v){return Array.isArray(v)?v.map(x=>typeof x==='string'?x:first(x,['word','text','name','value'])).filter(Boolean).join('; '):typeof v==='string'?v:'';}
export function normalizeWord(raw){
 if(typeof raw==='string')return {word:cleanWord(raw),zh:'',en:'',ipaUK:'',ipaUS:'',roots:'',derivation:'',inflections:'',phrases:'',synonyms:'',antonyms:'',source:'手动'};
 const word=cleanWord(first(raw,['word','lemma','term','headword','vocabulary','entry','token','english_word','englishWord','Word','英文','单词','英文单词']));
 if(!word||word.length>65||!/[a-z]/.test(word))return null;
 return {
  word,
  zh:first(raw,['zh','chinese','chineseMeaning','meaning_zh','definition_zh','translation','cn','中文','中文释义','释义','meaning_cn','中文解释','chinese_definition','translation_zh','chinese_definition_short']),
  en:first(raw,['en','english','englishMeaning','definition_en','definition','meaning','gloss','英文释义','英文解释','english_definition','definitionEnglish','english_definition_short']),
  ipaUK:first(raw,['ipaUK','uk_ipa','ipa_uk','phonetic_uk','britishIPA','british_ipa','ipaBrE','uk','英音']),
  ipaUS:first(raw,['ipaUS','us_ipa','ipa_us','phonetic_us','americanIPA','american_ipa','ipaAmE','us','美音']),
  roots:arrayText(raw.roots||raw.etymology||raw.morphemes||raw.affixes||raw.词根词缀),
  derivation:arrayText(raw.derivation||raw.derivatives||raw.word_family||raw.派生),
  inflections:arrayText(raw.inflections||raw.forms||raw.屈折),
  phrases:arrayText(raw.phrases||raw.collocations||raw.短语),
  synonyms:arrayText(raw.synonyms||raw.近义词),
  antonyms:arrayText(raw.antonyms||raw.反义词),
  source:first(raw,['source','provenance'])||'导入词库'
 };
}
function parseDelimited(source,delimiter){
 const rows=[];let cell='',row=[],quoted=false;
 for(let i=0;i<source.length;i++){const ch=source[i],next=source[i+1];
  if(ch==='"'&&quoted&&next==='"'){cell+='"';i++;continue}
  if(ch==='"'){quoted=!quoted;continue}
  if(!quoted&&ch===delimiter){row.push(cell);cell='';continue}
  if(!quoted&&(ch==='\n'||ch==='\r')){row.push(cell);cell='';if(row.some(x=>x.trim()))rows.push(row);row=[];if(ch==='\r'&&next==='\n')i++;continue}
  cell+=ch;
 }
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)return [];
 const keys=rows.shift().map(x=>x.trim().replace(/^\uFEFF/,''));
 return rows.map(cols=>Object.fromEntries(keys.map((k,i)=>[k,cols[i]||''])));
}
function flattenWordRows(v,depth=0){
 if(depth>5||!v)return [];
 if(Array.isArray(v))return v.flatMap(x=>flattenWordRows(x,depth+1));
 if(typeof v!=='object')return [];
 if(['word','lemma','term','headword','英文','单词','english_word'].some(k=>typeof v[k]==='string'))return [v];
 const out=[];
 for(const [k,val] of Object.entries(v)){
  if(!Array.isArray(val)&&!(val&&typeof val==='object'))continue;
  if(['entries','words','vocabulary','lexicon','items','data','dictionary','terms','wordList','word_list','rows','units','sections','groups','chapters'].includes(k)||depth<=1)out.push(...flattenWordRows(val,depth+1));
 }
 return out;
}
function parseMarkdownVocabulary(source){
 const lines=String(source).split(/\r?\n/),out=[];
 let header=null;
 for(const line of lines){
  if(!line.trim().startsWith('|')){header=null;continue}
  const cols=line.split('|').slice(1,-1).map(x=>x.trim());
  if(cols.some(x=>!x))continue;
  if(!header){
   if(cols.some(x=>/^(word|english|lemma|term|单词|英文|词条)$/i.test(x)))header=cols;
   continue;
  }
  if(cols.every(x=>/^[-:\s]+$/.test(x)))continue;
  const row=Object.fromEntries(header.map((k,i)=>[k,cols[i]||'']));
  if(row.word||row.英文||row.单词||row.lemma||row.english)out.push(row);
 }
 return out;
}

export async function readVocabularyZip(file,onProgress=()=>{}){
 const zip=await JSZip.loadAsync(file);
 const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir&&/\.(json|jsonl|csv|tsv|md|markdown)$/i.test(n)&&!n.includes('node_modules/')&&!n.startsWith('__MACOSX/'));
 const words=new Map(),details=[];let accepted=0;
 for(let i=0;i<names.length;i++){
  const name=names[i],entry=zip.file(name);if(!entry||entry._data?.uncompressedSize>18000000)continue;
  if(i%30===0)onProgress('扫描词典文件 '+(i+1)+'/'+names.length);
  try{
   const text=await entry.async('string');
   const rows=name.toLowerCase().endsWith('.json')?flattenWordRows(JSON.parse(text)):
    name.toLowerCase().endsWith('.jsonl')?text.split(/\r?\n/).filter(Boolean).flatMap(x=>{try{return flattenWordRows(JSON.parse(x))}catch{return []}}):
    /\.md|\.markdown$/i.test(name)?parseMarkdownVocabulary(text):parseDelimited(text,name.toLowerCase().endsWith('.tsv')?'\t':',');
   let added=0;
   for(const raw of rows){const w=normalizeWord(raw);if(!w)continue;
    const old=words.get(w.word);
    if(!old) {words.set(w.word,w);added++;}
    else words.set(w.word,{...old,...Object.fromEntries(Object.entries(w).filter(([k,v])=>v&&(!old[k]||k==='source'&&old[k]==='导入词库')))});
   }
   if(added){accepted++;details.push({file:name,count:added});}
  }catch(err){details.push({file:name,error:String(err?.message||err).slice(0,150)});}
 }
 return {words:Object.fromEntries(words),filesScanned:names.length,filesAccepted:accepted,count:words.size,details:details.slice(0,40)};
}
export async function saveVocabularySource(blob){await set(ENGLISH_KEY,blob);}
export async function loadVocabularySource(){return get(ENGLISH_KEY);}
export async function savePracticeFile(file){await set(PRACTICE_FILE,file);}
export async function loadPracticeFile(){return get(PRACTICE_FILE);}
export async function parsePracticeOverlay(file){
 const zip=await JSZip.loadAsync(file),entry=zip.file(OVERLAY_PATH);
 if(!entry)return null;
 const obj=JSON.parse(await entry.async('string'));
 if(obj?.schema!=='cfa-practice-overrides-v3')throw new Error('压缩包中的 V3 修改记录版本不兼容');
 return obj;
}
export async function exportPracticeZip(edits){
 const blob=await loadPracticeFile();
 if(!blob)throw new Error('未保存原始 practice.zip。请重新导入一次题库。');
 const zip=await JSZip.loadAsync(blob);
 zip.file(OVERLAY_PATH,JSON.stringify({schema:'cfa-practice-overrides-v3',version:3,exportedAt:new Date().toISOString(),...edits},null,2));
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
}
export function downloadBlob(file,name){
 const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(u),4000);
}
function mdTitle(s,name){
 const m=String(s).match(/^#{1,3}\s+(.+)$/m);
 return m?.[1]?.trim()||name.split('/').pop().replace(/\.(md|markdown|json|html)$/i,'').replace(/^\d+[_-]+/,'').replaceAll('_',' ');
}
function textOfJson(obj){
 if(typeof obj==='string')return obj;
 if(!obj||typeof obj!=='object')return '';
 const fields=['markdown','content_md','body_md','bodyMarkdown','lesson_markdown','html','body_html','body','content','text','lesson','lecture','description'];
 for(const f of fields)if(typeof obj[f]==='string'&&obj[f].length>80)return obj[f];
 if(Array.isArray(obj.blocks))return obj.blocks.map(b=>textOfJson(b)).filter(Boolean).join('\n\n');
 if(Array.isArray(obj.sections))return obj.sections.map(b=>textOfJson(b)).filter(Boolean).join('\n\n');
 return '';
}
export function splitAnswer(source){
 const lines=String(source||'').split(/\r?\n/);
 const answerTitle=/^(?:answer|solutions?|explanations?|correct answer|参考答案|答案解析|答案|解答|解析)(?:\s|[:：]|$)/i;
 const inline=/^\s*(?:(?:\*\*)?\s*(?:correct\s+answer|answer\s+key|参考答案|正确答案|答案解析)\s*[:：])/i;
 const body=[],answers=[];
 let inAnswer=false,answerLevel=Infinity;
 for(const line of lines){
  const h=line.match(/^\s*(#{1,6})\s+(.+)$/),level=h?h[1].length:Infinity;
  if(h){
   if(inAnswer&&level<=answerLevel){inAnswer=false;answerLevel=Infinity;}
   if(answerTitle.test(h[2].replace(/\*\*/g,'').trim())){
    inAnswer=true;answerLevel=level;
   }
  }
  if(!inAnswer&&inline.test(line)){answers.push(line);continue;}
  if(inAnswer)answers.push(line);else body.push(line);
 }
 return {body:body.join('\n'),answers:answers.join('\n'),hasAnswer:answers.length>0};
}
function titleSort(a,b){return a.path.localeCompare(b.path,undefined,{numeric:true,sensitivity:'base'});}
export async function readCourseZip(file,kind='source',onProgress=()=>{}){
 const zip=await JSZip.loadAsync(file);
 const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir&&/\.(md|markdown|json|html)$/i.test(n)&&!n.includes('/__MACOSX/')&&!n.startsWith('__MACOSX/')&&!n.includes('node_modules/'));
 const mdPaths=new Set(names.filter(n=>/\.(md|markdown)$/i.test(n)).map(n=>n.replace(/\.(md|markdown)$/i,'')));
 const docs=[],seen=new Set();let byteCount=0,skipped=0;
 const ordered=names.sort((a,b)=>{
  const rank=p=>/\.(md|markdown)$/i.test(p)?0:/\.html$/i.test(p)?1:2;
  return rank(a)-rank(b)||a.localeCompare(b);
 });
 for(let i=0;i<ordered.length;i++){
  if(docs.length>=MAX_DOCS||byteCount>=MAX_TOTAL_TEXT){skipped+=ordered.length-i;break}
  const path=ordered[i],entry=zip.file(path),size=entry?._data?.uncompressedSize||0;
  if(size>MAX_DOC_SIZE){skipped++;continue}
  const key=path.replace(/\.(md|markdown|json|html)$/i,'');
  if(seen.has(key)){skipped++;continue}
  if(i%30===0)onProgress('提取教程文档 '+(i+1)+'/'+ordered.length);
  try{
   let raw=await entry.async('string');
   if(path.endsWith('.json')){const obj=JSON.parse(raw);raw=textOfJson(obj);if(!raw||raw.length<60){skipped++;continue}}
   if(path.endsWith('.html'))raw=raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
   if(!raw||!raw.trim()){skipped++;continue}
   const length=raw.length;if(byteCount+length>MAX_TOTAL_TEXT){skipped++;continue}
   byteCount+=length;seen.add(key);
   const {body,answers,hasAnswer}=splitAnswer(raw);
   docs.push({id:kind+':'+key,path,kind,title:mdTitle(raw,path),body,answers,hasAnswer,
     format:/\.html$/i.test(path)?'html':'markdown',length,
     section:path.split('/').filter(Boolean).slice(0,3).join(' / ')||'未分类'});
  }catch{skipped++;}
 }
 docs.sort(titleSort);
 return {kind,docs,summary:{count:docs.length,bytes:byteCount,skipped,sourceFiles:names.length,filename:file.name||kind,importedAt:new Date().toISOString()}};
}
export async function loadCourse(){return (await get(COURSE_KEY))||{docs:[],sources:[]};}
export async function saveCourse(x){await set(COURSE_KEY,x);}
export function mergeCourse(old,part){
 const other=old?.docs||[],next=other.filter(d=>d.kind!==part.kind).concat(part.docs);
 return {docs:next,sources:(old?.sources||[]).filter(s=>s.kind!==part.kind).concat([{kind:part.kind,...part.summary}])};
}
export async function exportCourseData(course){
 const zip=new JSZip();zip.file('manifest.json',JSON.stringify({schema:'cfa-course-v3',sources:course.sources,exportedAt:new Date().toISOString()},null,2));
 for(const d of course.docs)zip.file('lessons/'+encodeURIComponent(d.kind)+'/'+encodeURIComponent(d.id)+'.json',JSON.stringify(d));
 return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
