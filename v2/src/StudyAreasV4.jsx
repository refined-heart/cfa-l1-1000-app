import React,{useEffect,useMemo,useRef,useState} from 'react';
import {marked} from 'marked';
import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import JSZip from 'jszip';
import {get,set} from 'idb-keyval';
import {useWorkspace} from './workspace-context';
import {WordPopup,SEED} from './Dictionary';
import {downloadBlob,cleanWord} from './lib/v3-data';
import {
 importCompleteCourse,materializeCourseMedia,openOriginalCourseEntry,downloadOriginalCourse,
 attachCourseAssetArchive,discardCourseRaw,
 inspectV5Book,loadV5Book,loadV5PdfBlob,V5_UNITS
} from './lib/study-v4';
import {OtherArea,EmptyCFAModule} from './StudyAreas';
import './study-v4.css';

function renderCourseMarkdown(source){
 const stash=[];
 const put=(formula,displayMode)=>{
  let rendered;
  try{rendered=katex.renderToString(formula,{throwOnError:false,displayMode,strict:'ignore'})}
  catch{rendered='<code>Formula unavailable</code>'}
  const key='COURSEMATH'+String(stash.length).padStart(6,'0')+'TOKEN';
  stash.push([key,rendered]);return key;
 };
 let text=String(source||'');
 text=text.replace(/\$\$([\s\S]+?)\$\$/g,(_,x)=>put(x,true));
 text=text.replace(/\\\[([\s\S]+?)\\\]/g,(_,x)=>put(x,true));
 text=text.replace(/\\\(([\s\S]+?)\\\)/g,(_,x)=>put(x,false));
 text=text.replace(/(^|[^$])\$([^$\n]+)\$(?!\$)/g,(_,pre,x)=>pre+put(x,false));
 let html=marked.parse(text,{gfm:true,breaks:true});
 for(const [token,rendered] of stash)html=html.replaceAll(token,rendered);
 return html;
}
const htmlSafe=(value,format='markdown')=>{
 const content=format==='html'?value:renderCourseMarkdown(value);
 return {__html:DOMPurify.sanitize(content,{USE_PROFILES:{html:true,mathMl:true,svg:true},ADD_ATTR:['target','align','class']})};
};
const pretty=x=>String(x||'').replace(/^0*\d+[_-]+/,'').replace(/_/g,' ');
const isPdf=x=>x==='pdf',isDocx=x=>x==='docx';
const natural=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});
function Action({children,onClick,solid=false,disabled=false}){return <button className={'sv4-action'+(solid?' primary':'')} onClick={onClick} disabled={disabled}>{children}</button>}
function Status({children}){return children?<div className="sv4-status">{children}</div>:null}
function Pill({children}){return <span className="sv4-pill">{children}</span>}
function Kicker({children}){return <div className="sv4-kicker">{children}</div>}
function NoMaterial({text}){return <div className="sv4-empty">{text}</div>}
function lessonGroup(doc){return doc.course||doc.section?.split('/')[0]||'原始课程'}
function lessonUnit(doc){return doc.unit||doc.section?.split('/')[1]||'章节资料'}
function byGroup(arr,key){return arr.reduce((acc,item)=>{const k=key(item);(acc[k]||(acc[k]=[])).push(item);return acc;},{});}
function lineText(v){return String(v||'').replace(/<[^>]+>/g,' ').replace(/[\*_#]/g,' ').replace(/\s+/g,' ').trim();}
function lessonQuestions(doc){
 const lines=String(doc?.body||'').split(/\r?\n/),out=[];
 for(let i=0;i<lines.length-3;i++){
  const m=lines[i].match(/^\s*(?:#{1,5}\s*)?(?:(?:Question|Q)\s*(\d+)[.:)]?|(\d+)[.)]|第(\d+)题)\s*(.+)/i);
  if(!m||!m[4])continue;
  let options=[],j=i+1;
  while(j<lines.length&&j<i+13){
   const c=lines[j].match(/^\s*(?:[-*]\s*)?([A-D])[.)：:]\s+(.+)/);
   if(c){options.push({letter:c[1],text:c[2]});j++;continue;}
   if(!lines[j].trim()){j++;continue;}
   break;
  }
  if(options.length>=3&&options.length<=4){
   const k=out.length+1,source=String(doc.answers||'');
   const ans=source.match(new RegExp('(?:Q(?:uestion)?\\s*'+k+'|^\\s*'+k+'\\s*[.):：])\\s*[:.：-]?\\s*([A-D])\\b','im'));
   out.push({stem:m[4],options,answer:ans?.[1]||'',id:k});
   i=j-1;
  }
 }
 return out.slice(0,90);
}
function LessonQuiz({doc}){
 const tests=useMemo(()=>lessonQuestions(doc),[doc?.id]);
 const [answers,setAnswers]=useState({}),[checked,setChecked]=useState({});
 useEffect(()=>{setAnswers({});setChecked({})},[doc?.id]);
 if(!tests.length)return <NoMaterial text="这一页没有能够可靠转换为 A/B/C/D 题的内容。原文课程仍完整保留；包含的参考答案在文末独立展开。"/>;
 return <div className="sv4-exam">{tests.map((q,i)=><article key={i} className="sv4-exam-item"><b>{q.id}. {lineText(q.stem)}</b>
  {q.options.map(o=><label key={o.letter}><input type="radio" name={'v4_'+doc.id+'_'+i} checked={answers[i]===o.letter} onChange={()=>setAnswers(p=>({...p,[i]:o.letter}))}/> <strong>{o.letter}.</strong> {lineText(o.text)}</label>)}
  <Action disabled={!answers[i]} onClick={()=>setChecked(p=>({...p,[i]:true}))}>Check · 检查这一题</Action>
  {checked[i]&&<p className="sv4-exam-response">{q.answer?'参考答案 '+q.answer+(q.answer===answers[i]?' · 正确':' · 请对照文末解析'):'原文未提供可可靠关联的题号答案，不自动判分。请阅读原始答案。'}</p>}
 </article>)}</div>;
}
function LessonReader({doc,edits,patch,onPrevious,onNext}){
 const [mode,setMode]=useState('lecture'),[docBody,setDocBody]=useState(''),[media,setMedia]=useState(null),[warning,setWarning]=useState(''),[showAnswer,setShowAnswer]=useState(false);
 const [note,setNote]=useState('');
 useEffect(()=>{setShowAnswer(false);setMode('lecture');setMedia(null);setWarning('');setNote(edits.lessonNotes[doc?.id]||'');
  if(!doc){setDocBody('');return;}
  let active=true,url=null;
  (async()=>{
   try{
    if(isPdf(doc.format)||isDocx(doc.format)){
     if(isPdf(doc.format)){
      const blob=await openOriginalCourseEntry(doc);url=URL.createObjectURL(blob);
      if(active)setMedia({url,kind:'pdf'});
     } else {
      const file=await openOriginalCourseEntry(doc);
      const mammoth=await import('mammoth/mammoth.browser');
      const result=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});
      if(active){setDocBody(result.value);setMedia({kind:'html'});setWarning('Word 已转换为网页正文；复杂版式请在原文附件核对。');}
     }
    } else {
     const res=await materializeCourseMedia(doc);
     if(active){setDocBody(res.source);if(res.warning)setWarning(res.warning);
      else if(res.imagesMissing.length)setWarning('缺少或未能匹配的图片：'+res.imagesMissing.slice(0,7).join('、'));}
    }
   }catch(err){if(active){setDocBody(doc.body||'');setWarning('部分资源无法显示：'+err.message+'。可重新导入原始 ZIP，或下载原文件。');}}
  })();
  return()=>{active=false;if(url)URL.revokeObjectURL(url);}
 },[doc?.id]);
 if(!doc)return null;
 const done=!!edits.lessonChecks[doc.id];
 const saveNote=s=>{setNote(s);patch(x=>({...x,lessonNotes:{...x.lessonNotes,[doc.id]:s}}));};
 const toggleDone=()=>patch(x=>({...x,lessonChecks:{...x.lessonChecks,[doc.id]:!x.lessonChecks[doc.id]}}));
 const downloadAttachment=async()=>{try{const b=await openOriginalCourseEntry(doc);downloadBlob(b,doc.path.split('/').pop())}catch(e){setWarning(e.message)}};
 return <section className="sv4-reader">
  <div className="sv4-reader-top"><div><Kicker>{doc.kind==='delivery'?'交付版原文':'课程原文'} · {lessonGroup(doc)} / {lessonUnit(doc)}</Kicker>
    <h2>{doc.title}</h2><small>{doc.path}</small></div>
   <div className="sv4-reader-controls"><Action onClick={onPrevious}>上一课</Action><Action onClick={onNext}>下一课</Action><Action solid onClick={toggleDone}>{done?'✓ 已学习':'标记学完'}</Action></div>
  </div>
  <div className="sv4-tabs">{[['lecture','讲义正文'],['quiz','课后练习'],['source','答案与原文'],['notes','我的笔记']].map(([key,label])=><button key={key} className={mode===key?'on':''} onClick={()=>setMode(key)}>{label}</button>)}</div>
  {warning&&<Status>{warning}</Status>}
  {mode==='lecture'&&<div className="sv4-paper">
   {isPdf(doc.format)&&media?.url?<iframe title={doc.title} className="sv4-pdf" src={media.url+'#toolbar=1&navpanes=1'}/>:
    <div className="lesson-body sv4-article" dangerouslySetInnerHTML={htmlSafe(docBody,doc.format==='html'||media?.kind==='html'?'html':'markdown')}/>}
   {(isPdf(doc.format)||isDocx(doc.format))&&<Action onClick={downloadAttachment}>下载这一课原文件</Action>}
   <p className="sv4-source-note">原资料优先：本文按上传来源和文件顺序呈现，不使用通用知识模板替代原始讲义。</p>
  </div>}
  {mode==='quiz'&&<div className="sv4-paper"><h3>先作答 · 后检查</h3><LessonQuiz doc={doc}/></div>}
  {mode==='source'&&<div className="sv4-paper"><h3>参考答案与原始文件</h3>
    <p>仅在此页展开答案；如果原始讲义的答案混在正文中而未识别，系统会明确提示，请核对原文。</p>
    <Action solid onClick={()=>setShowAnswer(v=>!v)}>{showAnswer?'隐藏文末答案':'Check · 展开原文答案'}</Action>
    {showAnswer&&(doc.answers?<div className="lesson-body sv4-article" dangerouslySetInnerHTML={htmlSafe(doc.answers)}/>:<Status>未识别出独立答案段落。原始文件不做自动删改，可下载原文件校验。</Status>)}
    <div className="sv4-inline"><Action onClick={downloadAttachment}>下载本课原始文件</Action><Pill>{doc.format||'markdown'}</Pill></div></div>}
  {mode==='notes'&&<div className="sv4-paper"><h3>逐课学习笔记</h3><textarea rows={10} value={note} onChange={e=>saveNote(e.target.value)} placeholder="先写核心定理 / 核心概念，再写公式推导、适用条件与易错点……"/><p>本地自动保存，支持工作空间数据 ZIP 备份。</p></div>}
 </section>;
}
export function TutorialArea(){
 const {course,applyCourse,edits,patch}=useWorkspace();
 const [source,setSource]=useState('delivery'),[courseName,setCourseName]=useState(''),[unitName,setUnitName]=useState(''),[query,setQuery]=useState(''),[chosen,setChosen]=useState('');
 const [busy,setBusy]=useState(''),[audit,setAudit]=useState(false);
 const file=useRef(null),assetFile=useRef(null);
 const docs=useMemo(()=>course.docs.filter(d=>d.kind===source),[course,source]);
 const groups=useMemo(()=>byGroup(docs,lessonGroup),[docs]);
 const categories=Object.keys(groups).sort(natural);
 const activeCourse=courseName&&categories.includes(courseName)?courseName:categories[0]||'';
 const units=useMemo(()=>[...new Set((groups[activeCourse]||[]).map(lessonUnit))].sort(natural),[groups,activeCourse]);
 const activeUnit=unitName&&units.includes(unitName)?unitName:units[0]||'';
 const listings=(groups[activeCourse]||[]).filter(d=>lessonUnit(d)===activeUnit);
 const filtered=listings.filter(d=>(d.title+' '+d.path).toLowerCase().includes(query.toLowerCase()));
 const current=filtered.find(d=>d.id===chosen)||filtered[0]||null;
 const sourceData=course.sources.find(s=>s.kind===source);
 const allDone=docs.filter(d=>edits.lessonChecks[d.id]).length;
 async function importZip(e){const f=e.target.files?.[0];e.target.value='';if(!f)return;
  try{setBusy('正在分析原始课程文件结构…');const part=await importCompleteCourse(f,source,setBusy);
   try{await applyCourse(part);}
   catch(storageError){
    // Prioritize usable lesson text over caching a 236-MB original ZIP.
    await discardCourseRaw(source);
    part.summary.originalArchiveSaved=false;
    part.summary.storageWarning='浏览器存储额度不足：课程目录已保存，但原始大 ZIP 未缓存，请保留本机原文件。';
    await applyCourse(part);
   }
   setCourseName('');setUnitName('');setChosen('');setQuery('');
   setBusy('已生成 '+part.docs.length+' 篇讲义，附图/媒体 '+part.summary.media+' 项，未渲染 '+part.summary.notRendered+' 项。');
   setAudit(true);
  }catch(err){setBusy('导入失败：'+err.message);}
 }
 async function attachAssets(e){
  const f=e.target.files?.[0];e.target.value='';if(!f)return;
  try{setBusy('正在读取图片/图表附件…');
   const result=await attachCourseAssetArchive(f,source);
   setBusy('已匹配 '+result.images+' 个图片资源。'+(result.warning||'切换课次可重新载入附件。'));
  }catch(e){setBusy('图片附件导入失败：'+e.message);}
 }
 async function exportZip(){try{const blob=await downloadOriginalCourse(source);downloadBlob(blob,source+'_Original_Course.zip')}catch(e){setBusy(e.message)}}
 function exportRecord(){
  const payload={schema:'study-v4-tutorial-progress',source,sourceData,
    notes:Object.fromEntries(docs.filter(d=>edits.lessonNotes[d.id]).map(d=>[d.id,edits.lessonNotes[d.id]])),
    completed:docs.filter(d=>edits.lessonChecks[d.id]).map(d=>d.id),createdAt:new Date().toISOString()};
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'CFA1_'+source+'_lesson_progress.json');
 }
 function changeSource(s){setSource(s);setCourseName('');setUnitName('');setChosen('');setQuery('');}
 return <section className="sv4-study">
  <div className="sv4-page-heading"><Kicker>CFA LEVEL I · 原始课程体系</Kicker><h1>CFA1 教程 · 课程化学习</h1><p>以你提供的两份原始课程 ZIP 为准：按课程、章节、课次组织讲义；练习答案不会作为题干提示。保留原附件与来源路径。</p></div>
  <div className="sv4-panel sv4-import-bar">
   <div className="sv4-inline"><strong>课程来源</strong><select value={source} onChange={e=>changeSource(e.target.value)}><option value="delivery">Course_Content_交付版</option><option value="source">Course_Content 原始版</option></select>
    <input type="file" accept=".zip" hidden ref={file} onChange={importZip}/><Action solid onClick={()=>file.current?.click()}>导入课程 ZIP</Action><input type="file" accept=".zip" hidden ref={assetFile} onChange={attachAssets}/><Action onClick={()=>assetFile.current?.click()}>补充导入图片 ZIP</Action>
    <Action onClick={exportZip} disabled={!sourceData}>导出原始 ZIP</Action><Action onClick={exportRecord} disabled={!docs.length}>导出学习笔记</Action></div>
   <div className="sv4-statbar"><Pill>{docs.length} 篇讲义</Pill><Pill>{categories.length} 门课程</Pill><Pill>已学 {allDone} 篇</Pill>
    <Pill>原附件 {sourceData?.media??'—'}</Pill><Pill>暂未渲染 {sourceData?.notRendered??'—'}</Pill>
    <Action onClick={()=>setAudit(x=>!x)}>导入审计 {audit?'收起':'展开'}</Action></div>
   <Status>{busy}</Status>
   {sourceData?.storageWarning&&<Status>{sourceData.storageWarning}</Status>}
   {audit&&sourceData&&<div className="sv4-audit"><h3>本来源完整性审计</h3><p>原始文件：{sourceData.filename}；ZIP 文件数：{sourceData.totalFiles??sourceData.sourceFiles}；讲义：{sourceData.count}；媒体资源：{sourceData.media??'未知'}；正文未自动渲染：{sourceData.notRendered??sourceData.skipped??'未知'}。未自动渲染不代表已处理，数据仍应在原 ZIP 中核对。</p>
    {(sourceData.skipped||[]).slice(0,80).map((x,i)=><p key={i}><code>{x.path}</code> · {x.reason}</p>)} </div>}
  </div>
  {!docs.length?<NoMaterial text="请选择并导入 Course_Content_交付版(1).zip 或 Course_Content(1).zip。导入后自动生成科目 → 章节 → 课次目录，而不是展示杂乱的文件清单。"/>:
   <div className="sv4-course-grid"><nav className="sv4-course-nav">
    <div className="sv4-nav-panel"><b>01 选择课程 / 科目</b><select value={activeCourse} onChange={e=>{setCourseName(e.target.value);setUnitName('');setChosen('')}}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
    <div className="sv4-nav-panel"><b>02 选择单元 / 章节</b><div className="sv4-unit-list">{units.map(u=><button key={u} className={u===activeUnit?'on':''} onClick={()=>{setUnitName(u);setChosen('')}}>{u}<small>{(groups[activeCourse]||[]).filter(d=>lessonUnit(d)===u).length} 课</small></button>)}</div></div>
    <div className="sv4-nav-panel"><b>03 选择课次</b><input type="search" placeholder="搜索这一章的课次" value={query} onChange={e=>{setQuery(e.target.value);setChosen('')}}/>
     <div className="sv4-lesson-list">{filtered.map(d=><button key={d.id} className={d.id===current?.id?'on':''} onClick={()=>setChosen(d.id)}><span>{edits.lessonChecks[d.id]?'✓ ':'○ '}{d.title}</span><small>{d.path.split('/').pop()}</small></button>)}</div></div>
   </nav>
   <main>{current?<LessonReader key={current.id} doc={current} edits={edits} patch={patch} onPrevious={()=>{const k=filtered.indexOf(current);if(k>0)setChosen(filtered[k-1].id)}} onNext={()=>{const k=filtered.indexOf(current);if(k>=0&&k<filtered.length-1)setChosen(filtered[k+1].id)}}/>:<NoMaterial text="没有匹配的课次，清除搜索后重试。"/>}</main></div>}
 </section>;
}
const V5_KEY='cfa-v4-v5-book-summary';
const normalizeEntry=w=>({word:w.word,zh:w.zh||'',en:w.en||'',ipaUK:w.ipaUK||'',ipaUS:w.ipaUS||'',source:w.source||'V5'});
export function EnglishArea(){
 const {edits,patch}=useWorkspace();
 const [book,setBook]=useState(null),[sourcePdf,setSourcePdf]=useState(''),[busy,setBusy]=useState(''),[tab,setTab]=useState('reading');
 const [unit,setUnit]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0),[word,setWord]=useState('');
 const input=useRef(null);
 useEffect(()=>{let alive=true;(async()=>{try{const x=await get(V5_KEY);if(alive&&x)setBook(x)}catch{}})();return()=>{alive=false}},[]);
 useEffect(()=>{let alive=true,url=null;(async()=>{
  if(!book?.pdf){setSourcePdf('');return;}
  try{const b=await loadV5PdfBlob(book.pdf);url=URL.createObjectURL(b);if(alive)setSourcePdf(url)}
  catch(e){if(alive)setBusy('V5 PDF 尚未缓存：'+e.message)}
 })();return()=>{alive=false;if(url)URL.revokeObjectURL(url)}},[book?.pdf,book?.importedAt]);
 async function importZip(e){const f=e.target.files?.[0];e.target.value='';if(!f)return;
  try{setBusy('正在检查 V5 全书结构…');const r=await inspectV5Book(f,setBusy);
   const {words,...summary}=r;
   patch(old=>({...old,words:{...words,...old.words},wordSources:[...(old.wordSources||[]),{filename:f.name,count:r.wordCount,at:new Date().toISOString()}]}));
   await set(V5_KEY,summary);setBook(summary);setUnit('');setQuery('');setPage(0);setTab('reading');
   setBusy('导入完成。原版 PDF '+(r.pdf?'已识别':'未识别')+'；提取词条 '+r.wordCount+' 个；结构化来源 '+r.structuredWords+' 个、词族 '+r.treeWords+' 个、A-Z 索引 '+r.indexWords+' 个。');
  }catch(err){setBusy('导入失败：'+err.message)}
 }
 async function exportOriginal(){try{const f=await get('cfa-v4-vocabulary-original');if(!f)throw new Error('原始 ZIP 未被缓存');downloadBlob(f,'CFA_Financial_English_V5_Original.zip')}catch(e){setBusy(e.message)}}
 async function exportEdits(){const zip=new JSZip();zip.file('vocabulary-edited.json',JSON.stringify({schema:'cfa-v4-english-overrides',version:4,words:edits.words,removedWords:edits.removedWords,at:new Date().toISOString()},null,2));
  downloadBlob(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),'Financial_English_V5_Editable_Vocabulary.zip');}
 const units=V5_UNITS;
 const activeUnit=unit||units[0];
 const unitKey=useMemo(()=>{
  const keys=Object.keys(book?.units||{});
  if(keys.includes(activeUnit))return activeUnit;
  const number=activeUnit.match(/Unit\s+(\d{2})/i)?.[1];
  if(number)return keys.find(k=>new RegExp('Unit\\s*'+number+'\\b','i').test(k))||activeUnit;
  return keys.find(k=>k.replace(/[\s·:：–—-]+/g,'').includes(activeUnit.replace(/[\s·:：–—-]+/g,'')))||activeUnit;
 },[book?.units,activeUnit]);
 const wordList=useMemo(()=>{
  const unitData=book?.units?.[unitKey]||[];
  const base=unitData.length?unitData:Object.keys(edits.words);
  return base.filter(w=>!edits.removedWords[w]&&(!query||[w,edits.words[w]?.zh,edits.words[w]?.en].join(' ').toLowerCase().includes(query.toLowerCase())));
 },[book,unitKey,edits,query]);
 const visible=wordList.slice(page*35,(page+1)*35);
 return <section className="sv4-study">
  <div className="sv4-page-heading"><Kicker>PROFESSIONAL ENGLISH · CFA LEVEL I · V5 ORIGINAL</Kicker><h1>金融英语 V5 · 完整教材</h1><p>按照原著教材阅读，而非只列单词：Unit 00–15、词根词缀、原版复杂例句、金融词族与词汇网络，结合双语词典与逐词编辑。</p></div>
  <div className="sv4-panel sv4-import-bar"><div className="sv4-inline"><input type="file" accept=".zip" ref={input} hidden onChange={importZip}/>
   <Action solid onClick={()=>input.current?.click()}>导入原始 V5 ZIP 教材</Action>
   <Action disabled={!book} onClick={exportOriginal}>导出 V5 原始资料</Action>
   <Action disabled={!book} onClick={exportEdits}>导出我编辑的词库</Action></div>
   <div className="sv4-statbar"><Pill>{book?.pdf?'原版 PDF 已识别':'等待导入原版教材'}</Pill><Pill>{book?.wordCount||0} 个已提取词条</Pill><Pill>Unit 00–15</Pill><Pill>学习例句与图表以原版 PDF 为准</Pill></div>
   <Status>{busy}</Status><Status>{book?.storageWarning}</Status></div>
  {!book?<NoMaterial text="请选择你上传的 CFA_Financial_English_Vocabulary_V5_Complete(1).zip。系统将以完整教材为主：保留 PDF 原版阅读，自动建立 Unit 课程目录和可编辑词汇索引。"/>:
  <div className="sv4-book">
   <div className="sv4-tabs">{[['reading','原版全书阅读'],['units','分 Unit 学习'],['dictionary','单词词典']].map(([k,label])=><button key={k} className={tab===k?'on':''} onClick={()=>{setTab(k);if(k==='dictionary'){setUnit('');setPage(0)}}}>{label}</button>)}</div>
   {tab==='reading'&&<div className="sv4-paper">
    <div className="sv4-reader-top"><div><h2>V5 原版全书</h2><p>浏览器 PDF 自带目录、搜索、缩放、打印功能；34 张词汇网络图和全部原始例句以原 PDF 为准，不删图、不改写例句。</p></div>
     <Pill>{book.pdf||'未找到 PDF'}</Pill></div>
    {sourcePdf?<iframe title="Financial English V5 Original Complete Book" className="sv4-pdf sv4-english-pdf" src={sourcePdf+'#toolbar=1&navpanes=1'}/>:
     <NoMaterial text="这份 ZIP 里没有识别到 PDF。请使用包含 V5 完整 PDF 的交付包；也可以在下面的 Unit 词族课程继续学习，未识别的内容不会被虚构。"/>}
    <p className="sv4-source-note">PDF 内的文字选择不能触发 App 单词弹窗；切换到「单词词典」可查看、补充音标和词根词缀。</p></div>}
   {tab==='units'&&<div className="sv4-unit-study"><aside><h3>教材教学目录</h3>{units.map(u=><button className={u===activeUnit?'on':''} key={u} onClick={()=>{setUnit(u);setPage(0);setQuery('')}}>{u}</button>)}</aside>
    <main><div className="sv4-paper"><Kicker>原版 V5 · UNIT</Kicker><h2>{activeUnit}</h2>
     <p>这一单元的正文、复杂例句、词汇网络图请从「原版全书阅读」进入；下方是从原始词族资料提取的可互动词条，不会用通用模板替代教材论述。</p>
     {book.units?.[unitKey]?.length?<p>本单元已提取 {book.units[activeUnit].length} 个词族词条，点击单词可查看或修改中英文解释及音标。</p>:<Status>该小节尚未在导入文件中找到独立词族条目；原 PDF 正文仍可阅读。</Status>}
     <div className="sv4-wordcards">{(book.units?.[unitKey]||[]).slice(0,300).map(w=><button key={w} onClick={()=>setWord(w)}><b>{w}</b><span>{edits.words[w]?.zh||'查看词条 / 补充中文'}</span></button>)}</div>
     {(book.units?.[unitKey]?.length||0)>300&&<p>本节词条较多，建议使用「单词词典」搜索全部词条。</p>}
    </div></main></div>}
   {tab==='dictionary'&&<div className="sv4-panel"><h2>V5 可编辑专业词典</h2>
     <div className="sv4-inline"><input value={query} placeholder="搜索英文、中文、金融术语" onChange={e=>{setQuery(e.target.value);setPage(0)}}/>
      <Action onClick={()=>{const w=cleanWord(window.prompt('输入英文词条（作为唯一键）')||'');if(w){setWord(w);}}}>新增英语单词</Action></div>
     <div className="sv4-wordcards">{visible.map(w=><button key={w} onClick={()=>setWord(w)}><b>{w}</b><span>{edits.words[w]?.zh||'待补充中文释义'}</span><small>{edits.words[w]?.ipaUK||edits.words[w]?.ipaUS||''}</small></button>)}</div>
     <div className="sv4-inline"><Pill>{wordList.length} 个匹配</Pill><Action disabled={!page} onClick={()=>setPage(p=>p-1)}>上一页</Action><Pill>{page+1} / {Math.max(1,Math.ceil(wordList.length/35))}</Pill><Action disabled={(page+1)*35>=wordList.length} onClick={()=>setPage(p=>p+1)}>下一页</Action></div>
    </div>}
   {word&&<WordPopup word={word} onClose={()=>setWord('')}/>}
  </div>}
 </section>;
}
export {OtherArea,EmptyCFAModule};
