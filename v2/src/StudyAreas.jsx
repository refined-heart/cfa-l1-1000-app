import React,{useEffect,useMemo,useRef,useState} from 'react';
import {marked} from 'marked';
import DOMPurify from 'dompurify';
import JSZip from 'jszip';
import {useWorkspace} from './workspace-context';
import {SEED,WordPopup} from './Dictionary';
import {cleanWord,downloadBlob,exportCourseData,loadVocabularySource,readCourseZip,loadPracticeFile} from './lib/v3-data';

const stripTags=x=>String(x||'').replace(/<[^>]*>/g,' ').replace(/[#*_[\]'`]/g,' ');
const safeHtml=source=>({__html:DOMPurify.sanitize(marked.parse(source||'',{breaks:true,gfm:true}),{USE_PROFILES:{html:true},ADD_ATTR:['align','target']})});
const DEFS=['现代数学','专业英语','金融学','CFA'];
const CFA_MODS=['CFA1 教程','CFA1 Practice','CFA2 教程','CFA2 Practice','CFA3 教程','CFA3 Practice'];
const STEMS={
 '现代数学':['数理逻辑与集合论','分析与极限','线性代数与泛函','概率与随机过程','统计推断与贝叶斯'],
 '金融学':['货币与贴现','资产与或有索取权','无套利定价','组合与风险管理','市场与金融机构']
};
function exportText(name,value,mime='application/json'){
 const blob=new Blob([value],{type:mime});downloadBlob(blob,name);
}
function QuizFromMarkdown({doc,answers}){
 const [selected,setSelected]=useState({}),[show,setShow]=useState(false);
 useEffect(()=>{setSelected({});setShow(false)},[doc?.id]);
 // Extract only explicit A/B/C blocks when a question stem is present.
 const tests=useMemo(()=>{
  if(!doc)return [];
  const source=doc.body||'',lines=source.split(/\r?\n/),items=[];
  for(let i=0;i<lines.length-3;i++){
   if(!/^\s*(?:Q(?:uestion)?[\s.:\d-]+|第[一二三四五六七八九十\d]+题|.{5,140}\?)\s*/i.test(lines[i]))continue;
   const start=i;let c=[],j=i+1;
   while(j<lines.length&&c.length<5){
    const m=lines[j].match(/^\s*(?:[-*]\s*)?([A-D])[.)：:]\s*(.+)/);
    if(m){c.push({letter:m[1],text:m[2]});j++;}
    else if(!lines[j].trim()){j++;if(c.length>=3)break;}
    else break;
   }
   if(c.length>=3){
    const stem=lines.slice(start,i+1).join(' ').replace(/^\s*[-#*]+\s*/,'');
    const answerMatch=String(answers||'').match(new RegExp('(?:Q(?:uestion)?\\s*'+(items.length+1)+'\\s*[:：.\\-]?\\s*|'+(items.length+1)+'\\s*[.:：]\\s*)([A-D])\\b','i'));
    items.push({stem,choices:c,answer:answerMatch?.[1]?.toUpperCase()||''});
    i=j-1;
   }
  }
  return items.slice(0,80);
 },[doc]);
 if(!tests.length)return <p className="v3-muted">该文档未识别出可安全自动判分的 A/B/C 选择题。原资料中如含答案，统一折叠在文末，避免提前泄题。</p>;
 return <section className="v3-panel"><h3>本课自测 · 先选择，再核对</h3>
  {tests.map((t,i)=><div className="v3-test" key={i}><strong>{i+1}. {t.stem}</strong>
   <div className="v3-test-options">{t.choices.map(c=><label key={c.letter}><input type="radio" name={'lesson-test-'+i} checked={selected[i]===c.letter} onChange={()=>setSelected(o=>({...o,[i]:c.letter}))}/><b>{c.letter}.</b> {c.text}</label>)}</div>
   {show&&<p className="v3-feedback">{t.answer?('参考答案：'+t.answer+' · '+(selected[i]===t.answer?'回答正确':'请对照文末解析')):'原文未能可靠关联此题答案；请查看文末参考答案，不做自动计分。'}</p>}
  </div>)}
  <button className="v3-primary" disabled={!Object.keys(selected).length} onClick={()=>setShow(true)}>Check Answer · 核对本课答案</button>
 </section>;
}
export function TutorialArea(){
 const {course,applyCourse,edits,patch}=useWorkspace();
 const [source,setSource]=useState('delivery'),[query,setQuery]=useState(''),[selected,setSelected]=useState(null),[busy,setBusy]=useState(''),[showAnswer,setShowAnswer]=useState(false),[pickedWord,setPickedWord]=useState('');
 const inRef=useRef(null),fileRef=useRef(null);
 const docs=useMemo(()=>course.docs.filter(d=>d.kind===source&&(!query||(d.title+' '+d.path).toLowerCase().includes(query.toLowerCase()))),[course,source,query]);
 const current=docs.find(d=>d.id===selected)||docs[0]||null;
 const stats=course.sources.find(s=>s.kind===source);
 useEffect(()=>{setShowAnswer(false)},[current?.id]);
 async function importCourse(event){
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{setBusy('读取课程压缩包…');const part=await readCourseZip(file,source,setBusy);
   if(!part.docs.length)throw new Error('没有提取出 Markdown / JSON / HTML 课程正文。请检查该压缩包的内容结构。');
   await applyCourse(part);setSelected(part.docs[0].id);setBusy('');}
  catch(err){setBusy('');window.alert('教程导入失败：'+err.message)}
 }
 const note=current?edits.lessonNotes[current.id]||'':'';
 function saveNote(text){patch(e=>({...e,lessonNotes:{...e.lessonNotes,[current.id]:text}}));}
 const mark=current?edits.lessonChecks[current.id]:null;
 const idx=docs.findIndex(d=>d.id===current?.id);
 async function downloadCourse(){
  try{setBusy('正在导出课程结构…');downloadBlob(await exportCourseData(course),'CFA_V3_Tutorial_Export.zip')}
  catch(err){window.alert(err.message)}finally{setBusy('')}
 }
 return <section className="v3-study-page">
  <div className="v3-heading"><div><small>CFA LEVEL I · CURRICULUM</small><h1>CFA1 教程</h1><p>按来源课程目录学习；答案与解析默认隐藏，先自行选择或推导，再 Check。</p></div></div>
  <div className="v3-panel"><div className="v3-row"><div><b>课程资料来源</b><p>可以分别导入两个 ZIP，源文档独立保存，不混淆原文件。</p></div><select value={source} onChange={e=>{setSource(e.target.value);setSelected(null);setQuery('')}}><option value="delivery">Course_Content_交付版</option><option value="source">Course_Content</option></select></div>
   <div className="v3-inline"><input ref={inRef} type="file" accept=".zip" hidden onChange={importCourse}/><button className="v3-primary" onClick={()=>inRef.current?.click()}>＋ 导入当前来源 ZIP</button>
    {course.docs.length>0&&<button onClick={downloadCourse}>导出课程结构 ZIP</button>}</div>
   <p className="v3-muted">{busy|| (stats?('当前来源已导入 '+stats.count+' 篇文档，跳过 '+stats.skipped+' 项；'+stats.filename):'尚未导入此来源的课程 ZIP。')}</p>
  </div>
  <div className="v3-tutorial-layout">
   <aside className="v3-tutorial-side"><input type="search" placeholder="搜索课程、章节、讲义" value={query} onChange={e=>setQuery(e.target.value)}/>
    <p>{docs.length} 篇文档</p><div className="v3-lesson-list">{docs.slice(0,2000).map((d,i)=><button key={d.id} className={current?.id===d.id?'active':''} onClick={()=>setSelected(d.id)}><small>{d.section}</small><span>{d.title}</span></button>)}</div>
   </aside>
   <div className="v3-lesson-main">{!current?<div className="v3-panel"><h2>导入课程 ZIP 后开始学习</h2><p>该模块支持 Markdown / JSON / HTML 课程资料。图像及复杂交互组件可能需要后续单独适配。</p></div>:<>
    <div className="v3-row"><div><small>{current.section}</small><h2>{current.title}</h2><p>原始文件：{current.path}</p></div><div className="v3-inline"><button disabled={idx<=0} onClick={()=>setSelected(docs[idx-1].id)}>上一课</button><button disabled={idx>=docs.length-1} onClick={()=>setSelected(docs[idx+1].id)}>下一课</button></div></div>
    <div className="v3-panel"><div className="v3-lesson-body lesson-body" dangerouslySetInnerHTML={current.format==='html'?{__html:DOMPurify.sanitize(current.body)}:safeHtml(current.body)}/></div>
    <QuizFromMarkdown doc={current} answers={current.answers}/>
    <div className="v3-panel"><div className="v3-row"><div><h3>文末答案与原文解析</h3><p>默认不展示，点击后才揭示。</p></div><button className="v3-primary" onClick={()=>setShowAnswer(x=>!x)}>{showAnswer?'隐藏答案':'Check / 显示文末答案'}</button></div>
     {showAnswer&&(current.answers?<div className="lesson-body" dangerouslySetInnerHTML={current.format==='html'?{__html:DOMPurify.sanitize(current.answers)}:safeHtml(current.answers)}/>:<p className="v3-muted">该课程文件没有检测到独立的答案章节，无法可靠分离参考答案；请以原文为准。</p>)}
    </div>
    <div className="v3-panel"><h3>课后个人笔记</h3><textarea rows={5} value={note} onChange={e=>saveNote(e.target.value)} placeholder="总结学习结论、公式推导、待补充问题。自动本地保存。"/>
     <div className="v3-inline"><button onClick={()=>patch(e=>({...e,lessonChecks:{...e.lessonChecks,[current.id]:!mark}}))}>{mark?'✓ 已完成本课（点击取消）':'标记本课已学习'}</button><small className="v3-muted">点击正文中的英文单词可查看词典弹窗。</small></div>
    </div></>}
   </div>
  </div>
 </section>;
}
export function EnglishArea(){
 const {edits,importWords,saveWord,deleteWord}=useWorkspace();
 const [query,setQuery]=useState(''),[word,setWord]=useState(''),[message,setMessage]=useState(''),[page,setPage]=useState(0),[draft,setDraft]=useState('');
 const input=useRef(null),file=useRef(null);
 const entries=useMemo(()=>{
  const all={...Object.fromEntries(Object.entries(SEED).map(([word,v])=>[word,{word,zh:v[0],en:v[1],source:'内置示范词条'}])),...edits.words};
  return Object.values(all).filter(w=>!edits.removedWords[w.word]&&(!query||[w.word,w.zh,w.en].join(' ').toLowerCase().includes(query.toLowerCase())))
   .sort((a,b)=>a.word.localeCompare(b.word));
 },[edits,query]);
 async function importFile(e){
  const f=e.target.files?.[0];e.target.value='';if(!f)return;
  try{setMessage('正在解析词汇来源…');const r=await importWords(f,setMessage);
   setMessage('已识别 '+r.count+' 个词条；扫描 '+r.filesScanned+' 个 CSV/JSON/TSV，识别 '+r.filesAccepted+' 个结构化词表。'+(r.count?'':' 原始包可能以网页/程序形式存储词条，当前未能自动识别；可导入标准 CSV/JSON 或人工补充。'));
  }catch(err){setMessage('导入失败：'+err.message)}
 }
 function exportWordsZip(){
  const zip=new JSZip();
  zip.file('vocabulary-edited.json',JSON.stringify({schema:'cfa-v3-vocabulary',version:3,words:edits.words,removedWords:edits.removedWords,updatedAt:new Date().toISOString()},null,2));
  zip.generateAsync({type:'blob',compression:'DEFLATE'}).then(b=>downloadBlob(b,'CFA_V3_Editable_Vocabulary.zip'));
 }
 return <section className="v3-study-page">
  <div className="v3-heading"><div><small>PROFESSIONAL ENGLISH · CFA</small><h1>CFA 一级金融英语</h1><p>核心词汇、音标、词根词缀、派生屈折、短语及近反义对照，支持自定义词条。</p></div></div>
  <div className="v3-panel"><div className="v3-row"><div><h3>词库导入与导出</h3><p>选择 CFA_Financial_English_Vocabulary_V5_Complete.zip。系统扫描其中结构化 JSON / CSV / TSV 词表；不能识别的字段不臆造。</p></div><b>{entries.length} 个可用词条</b></div>
   <div className="v3-inline"><input ref={input} type="file" accept=".zip" hidden onChange={importFile}/>
    <button className="v3-primary" onClick={()=>input.current?.click()}>导入 V5 词库 ZIP</button>
    <button onClick={exportWordsZip}>导出已编辑词库 ZIP</button></div><p className="v3-muted">{message}</p>
  </div>
  <div className="v3-panel"><div className="v3-inline"><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}} placeholder="搜索英文单词、中文释义、英文定义"/>
   <input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="新增词条英文主键"/><button onClick={()=>{const w=cleanWord(draft);if(!w)return;saveWord({word:w,zh:'',en:'',source:'手动新增'});setWord(w);setDraft('')}}>新增词条</button></div>
   <table className="v3-word-table"><thead><tr><th>英文 Word</th><th>中文意思</th><th>英文定义</th><th>管理</th></tr></thead><tbody>{entries.slice(page*50,(page+1)*50).map(w=><tr key={w.word}><td><button className="v3-link" onClick={()=>setWord(w.word)}>{w.word}</button></td><td>{w.zh||'待补充'}</td><td>{w.en?.slice(0,180)||'待补充'}</td><td><button onClick={()=>setWord(w.word)}>编辑</button> <button className="v3-danger" onClick={()=>{if(window.confirm('删除词条 '+w.word+'？'))deleteWord(w.word)}}>删除</button></td></tr>)}</tbody></table>
   <div className="v3-inline"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>上一页</button><span>{page+1} / {Math.max(1,Math.ceil(entries.length/50))}</span><button disabled={(page+1)*50>=entries.length} onClick={()=>setPage(p=>p+1)}>下一页</button></div>
  </div>
  {word&&<WordPopup word={word} onClose={()=>setWord('')}/>}
 </section>;
}
export function OtherArea({area,slot}){
 const tracks=STEMS[area]||[];
 return <section className="v3-study-page"><div className="v3-heading"><div><small>KNOWLEDGE WORKSPACE / {area}</small><h1>{area}</h1><p>这是四大学习区的独立入口。目前先搭好课程组织结构；尚未导入这一学习区的专用教材。</p></div></div>
   <div className="v3-panel"><h2>课程主线</h2><div className="v3-other-grid">{tracks.map((x,i)=><article key={x}><small>{String(i+1).padStart(2,'0')}</small><h3>{x}</h3><p>待导入教材和练习后开放</p></article>)}</div></div>
  </section>;
}
export function EmptyCFAModule({slot}){
 return <section className="v3-study-page"><div className="v3-heading"><div><small>CFA STUDY · SIX MODULES</small><h1>{slot}</h1><p>六个模块的导航已就位。当前只提供 CFA1教程和 CFA1 Practice 的实际材料，其余模块暂不伪造题库。</p></div></div>
  <div className="v3-panel"><h2>{slot} · 等待学习资料</h2><p>后续接入相应级别的官方授权或用户提供的内容时，沿用 V3 的题目、答案隐藏、词典、错题记录、导入导出机制。</p></div>
 </section>;
}
