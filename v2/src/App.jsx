import React,{useEffect,useMemo,useRef,useState} from 'react';
import DOMPurify from 'dompurify';
import {SUBJECTS,SUBJECT_INDEX,noteFor,titleFor} from './lib/curriculum';
import {parsePracticeZip,plainText,inspectQuestion,chineseFramework,sourceAnswerText} from './lib/practice';
import {loadBank,saveBank,clearBank,loadState,saveState,makeProfile,blankData,currentData,
 isProblem,isEasy,isWrong,isDue,createProgressUpdate,makeBackup,validateBackup,downloadText,exportCSV,summaryFor} from './lib/persistence';
import './styles.css';
import {useWorkspace} from './workspace-context';
import {ModuleGlossary} from './Dictionary';
import {exportPracticeZip,downloadBlob,savePracticeFile,parsePracticeOverlay} from './lib/v3-data';

const NAV=[['home','首页'],['practice','分类练习'],['wrong','错题本'],['stats','学习分析'],['settings','账户与设置']];
const F=['所有题目','未做题','错题','太简单','题目有问题','收藏','最近做对'];
const datefmt=(x)=>x?new Date(x).toLocaleString('zh-CN',{hour12:false}):'—';
const pct=(a,b)=>b?Math.round(a/b*100):0;
const short=(s,n=42)=>s.length>n?s.slice(0,n)+'…':s;
const safeHtml=(x)=>({__html:DOMPurify.sanitize(x||'',{ADD_ATTR:['target','align'],USE_PROFILES:{html:true}})});
const numfmt=n=>Number(n||0).toLocaleString('zh-CN');
const filenameStamp=()=>new Date().toISOString().slice(0,10);

function Badge({children,tone='neutral'}){return <span className={`badge ${tone}`}>{children}</span>}
function Icon({name}){const icons={home:'⌂',practice:'▣',wrong:'↺',stats:'▤',settings:'⚙',back:'←',next:'→',alert:'!',check:'✓',star:'☆',menu:'☰',upload:'⇧',download:'⇩'};return <span aria-hidden="true">{icons[name]||name}</span>}
function Html({value,className=''}){return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={safeHtml(value)}/>}
function Metric({label,value,extra}){return <div className="metric"><div className="metric-value">{value}</div><div className="metric-label">{label}</div>{extra&&<div className="metric-extra">{extra}</div>}</div>}
function Bar({n,d,color}){return <div className="bar"><div style={{width:`${pct(n,d)}%`,background:color||'var(--accent)'}}/></div>}
function Empty({title='暂无题目',hint='请更换筛选条件'}){return <div className="empty"><div className="empty-icon">⌕</div><b>{title}</b><p>{hint}</p></div>}
function Heading({overline,title,desc,actions}){return <div className="heading"><div><div className="overline">{overline}</div><h1>{title}</h1>{desc&&<p>{desc}</p>}</div>{actions&&<div className="heading-actions">{actions}</div>}</div>}
function SubjectPill({subject}){const s=SUBJECT_INDEX[subject];return <Badge tone="subtle">{s?.zh||subject}</Badge>}
function NoteCard({subject,module,compact=false}){const n=noteFor(subject,module);return <article className={`note-card ${compact?'compact':''}`}><div className="note-flag">知识体系 · 高观点</div><h3>{n.moduleZh}</h3><p>{n.overview}</p><div className="note-map"><b>知识脉络</b><span>{n.chain}</span></div><div className="note-edge"><b>适用边界</b> {n.boundaries}</div></article>}

export default function App(){
 const {edits,setChinese,resetChinese,importEdits}=useWorkspace();
 const [editChineseId,setEditChineseId]=useState(null),[draftChinese,setDraftChinese]=useState('');
 const [bank,setBank]=useState(null),[state,setState]=useState(null),[translations,setTranslations]=useState({});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[toast,setToast]=useState('');
 const [route,setRoute]=useState({page:'home'}),[subject,setSubject]=useState('Fixed Income'),[activeModule,setActiveModule]=useState('');
 const [session,setSession]=useState(null),[index,setIndex]=useState(0),[sessionAnswers,setSessionAnswers]=useState({});
 const [filters,setFilters]=useState({subject:'all',module:'all',status:'所有题目',query:''});
 const [flagging,setFlagging]=useState(null),[reason,setReason]=useState(''),[profileName,setProfileName]=useState('');
 const [zhBusy,setZhBusy]=useState(false),[zhStatus,setZhStatus]=useState('');
 const [showEnglish,setShowEnglish]=useState(false),[answerStart,setAnswerStart]=useState(Date.now());
 const zipInput=useRef(null), importInput=useRef(null), screenTop=useRef(null), toastTimer=useRef(null);
 useEffect(()=>{(async()=>{
  try{const [b,s,t]=await Promise.all([loadBank(),loadState(),import('./lib/persistence').then(x=>x.loadTranslations())]);setBank(b);setState(s);setTranslations(t);}
  catch(e){console.error(e);setBank(null);setState(prev=>prev||initialState());showToast('本地存储不可用：请在正常 HTTPS 预览网址打开，而非浏览器隐私/文件预览模式');}
  finally{setLoading(false);}
 })();},[]);
 useEffect(()=>{if(!state||loading)return;saveState(state).catch(console.error);},[state,loading]);
 function showToast(message){setToast(message);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),4500)}
 const pdata=useMemo(()=>state?currentData(state):blankData(),[state]);
 const qMap=useMemo(()=>Object.fromEntries((bank?.questions||[]).map(q=>[q.id,q])),[bank]);
 const qs=bank?.questions||[];
 const stats=useMemo(()=>summaryFor(bank,pdata),[bank,pdata]);
 const groups=useMemo(()=>SUBJECTS.map(s=>({ ...s,questions:qs.filter(q=>q.subject===s.id),modules:bank?.modules.filter(m=>m.subject===s.id)||[]})),[bank]);
 const wrong=useMemo(()=>qs.filter(q=>isWrong(pdata,q.id)),[bank,pdata]);
 const bad=useMemo(()=>qs.filter(q=>isProblem(pdata,q.id)),[bank,pdata]);
 const currentProfile=state?.profiles.find(x=>x.id===state.activeProfileId);
 function patchData(fn){setState(prev=>({...prev,profilesData:{...prev.profilesData,[prev.activeProfileId]:fn(prev.profilesData[prev.activeProfileId]||blankData())}}));}
 function go(page,opts={}){setRoute({page,...opts});setSession(null);setIndex(0);setSessionAnswers({});setZhStatus('');setShowEnglish(false);setAnswerStart(Date.now());screenTop.current?.scrollIntoView({block:'start',behavior:'instant'});}
 function start(ids,title,mode='normal',from='practice',goIndex=0){
  if(!ids?.length){showToast('当前分组没有符合条件的题目');return;}
  setSession({ids,title,mode,from});setIndex(goIndex);setSessionAnswers({});setRoute({page:'question'});setShowEnglish(false);setAnswerStart(Date.now());screenTop.current?.scrollIntoView({block:'start',behavior:'instant'});
 }
 function openSingle(q,from='stats'){start([q.id],`题号 ${q.qid||q.itemId}`,'detail',from)}
 function answer(q,choice){
  if(sessionAnswers[q.id])return;
  const correct=q.autoScore?(q.answer===choice):null;
  const elapsed=Date.now()-answerStart;
  setSessionAnswers(prev=>({...prev,[q.id]:choice}));
  patchData(data=>createProgressUpdate(data,q.id,choice,correct,session?.mode==='wrong',elapsed));
 }
 function reveal(q){if(sessionAnswers[q.id])return;setSessionAnswers(prev=>({...prev,[q.id]:'已查看参考答案'}));patchData(data=>createProgressUpdate(data,q.id,'open',null,false,Date.now()-answerStart));}
 function step(delta){setIndex(i=>Math.min(session.ids.length-1,Math.max(0,i+delta)));setShowEnglish(false);setZhStatus('');setAnswerStart(Date.now());screenTop.current?.scrollIntoView({block:'start',behavior:'instant'});}
 function toggleEasy(q){patchData(d=>{const easy={...d.easy};if(easy[q.id])delete easy[q.id];else easy[q.id]=true;return {...d,easy};});showToast(pdata.easy[q.id]?'已取消“太简单”':'已标为“太简单”，以后不进入首页重复练习')}
 function toggleStar(q){patchData(d=>{const stars={...d.stars};if(stars[q.id])delete stars[q.id];else stars[q.id]=true;return {...d,stars};});}
 function mastered(q){patchData(d=>({...d,answers:{...d.answers,[q.id]:{...(d.answers[q.id]||{}),mastered:true,completed:true}}}));showToast('已标记掌握，从错题本移出，历史记录仍保留')}
 function unmastered(q){patchData(d=>({...d,answers:{...d.answers,[q.id]:{...(d.answers[q.id]||{}),mastered:false}}}));}
 function saveFlag(){if(!flagging)return;const q=flagging;
  patchData(d=>({...d,flags:{...d.flags,[q.id]:{reason:reason.trim()||'题干/答案存在问题（待复核）',exclude:true,at:new Date().toISOString()}}}));
  setFlagging(null);setReason('');showToast('已标记问题题并从错题本/重复练习移出，可在统计页面查看');}
 function removeFlag(q){patchData(d=>{const f={...d.flags};delete f[q.id];return {...d,flags:f};});showToast('已撤销问题题排除标记')}
 async function downloadPractice(){
  try{setBusy('生成包含中文解析与词典修改的 ZIP…');
   const file=await exportPracticeZip({chinese:edits.chinese,words:edits.words,removedWords:edits.removedWords,
    moduleWords:edits.moduleWords,hiddenModuleWords:edits.hiddenModuleWords});
   downloadBlob(file,'practice_V3_Editable_Export.zip');
   showToast('已导出原题 ZIP + 中文解析/词汇修改层（英文原文未改动）');
  }catch(err){showToast('导出失败：'+err.message)}
  finally{setBusy('')}
 }
 function downloadJSON(){const obj=makeBackup(state,bank);downloadText(`CFA_V2_All_Profiles_${filenameStamp()}.json`,JSON.stringify(obj,null,2));showToast('已导出全部账户的学习记录（不含题库）');}
 function downloadCSV(){if(!bank)return showToast('请先导入题库');downloadText(`CFA_V2_${currentProfile?.name||'profile'}_${filenameStamp()}.csv`,exportCSV(bank,pdata),'text/csv;charset=utf-8');}
 async function importProgress(e){const f=e.target.files?.[0];e.target.value='';if(!f)return;
  try{if(f.size>12*1024*1024)throw new Error('学习记录文件超过 12MB');
   const object=validateBackup(JSON.parse(await f.text()));
   if(!window.confirm('将恢复备份中的账户与记录，覆盖当前所有账户的学习记录。题库不会变更。继续吗？'))return;
   setState(object);showToast('账户与学习记录恢复成功');go('home');
  }catch(err){showToast(`导入失败：${err.message}`)}
 }
 async function importZip(e){const f=e.target.files?.[0];e.target.value='';if(!f)return;
  try{setBusy('解析 practice.zip…');const b=await parsePracticeZip(f,setBusy);await saveBank(b);setBank(b);
   await savePracticeFile(f);const overlay=await parsePracticeOverlay(f);if(overlay)importEdits(overlay);
   setBusy('');showToast(`成功导入 ${b.stats.count} 道题，包含 ${b.modules.length} 个模块`);go('home');
  }catch(err){setBusy('');showToast(`导入失败：${err.message}`)}
 }
 async function resetBank(){if(!window.confirm('移除本机的 practice.zip 题目缓存？所有账户学习记录会保留，重新导入同一题库即可恢复。'))return;
  await clearBank();setBank(null);go('home');showToast('已移除本机缓存题库');}
 function createProfile(){const n=profileName.trim();if(!n)return showToast('请输入账户名称');if(state.profiles.length>=5)return showToast('最多支持 5 个学习账户');
  if(state.profiles.some(p=>p.name===n))return showToast('账户名称不能重复');
  const p=makeProfile(n);setState(s=>({...s,profiles:[...s.profiles,p],profilesData:{...s.profilesData,[p.id]:blankData()},activeProfileId:p.id}));setProfileName('');showToast(`已创建并切换到 ${n}`)}
 function renameProfile(id){const p=state.profiles.find(p=>p.id===id);const n=window.prompt('修改学习账户名称',p?.name||'')?.trim();if(!n)return;
  setState(s=>({...s,profiles:s.profiles.map(p=>p.id===id?{...p,name:n.slice(0,50)}:p)}))}
 function deleteProfile(id){if(state.profiles.length<=1)return showToast('至少保留一个账户');if(!window.confirm('删除此账户及全部学习记录？建议先导出备份。'))return;
  setState(s=>{const profiles=s.profiles.filter(p=>p.id!==id),profilesData={...s.profilesData};delete profilesData[id];return {...s,profiles,profilesData,activeProfileId:s.activeProfileId===id?profiles[0].id:s.activeProfileId}});}
 function translate(q){
  if(translations[q.id])return setZhStatus('已缓存此题中文翻译');
  const T=globalThis.Translator;
  if(!T?.create){setZhStatus('当前浏览器未提供内置英→中翻译。高观点讲义与英文原始解析仍可使用；逐题译文待人工校译。');return;}
  const text=sourceAnswerText(q);
  setZhBusy(true);setZhStatus('正在准备本地翻译模型（首次使用可能下载语言包）…');
  // Create synchronously in the user's click handler: Chrome requires user activation
  // when an on-device translation language pack must be downloaded.
  let translatorPromise;
  try{translatorPromise=T.create({sourceLanguage:'en',targetLanguage:'zh',monitor(m){m.addEventListener('downloadprogress',ev=>setZhStatus(`正在下载翻译模型 ${Math.round(ev.loaded*100)}%`));}})}
  catch(e){setZhBusy(false);setZhStatus(`浏览器翻译不可用：${e.message}`);return;}
  (async()=>{try{const translator=await translatorPromise;
    const chunks=text.match(/[\s\S]{1,1800}/g)||[];let result='';
    for(let i=0;i<Math.min(chunks.length,12);i++){setZhStatus(`正在翻译第 ${i+1}/${Math.min(chunks.length,12)} 段…`);result+=await translator.translate(chunks[i])+'\n';}
    translator.destroy?.();
    if(!result.trim())throw new Error('翻译未返回内容');
    const next={...translations,[q.id]:result.trim()};setTranslations(next);
    const pers=await import('./lib/persistence');await pers.saveTranslations(next);
    setZhStatus('已生成本机机器译文，可与英文原文核对；金融术语需人工校译');
   }catch(e){setZhStatus(`自动翻译不可用：${e.message}。可继续看高观点讲义与英文依据。`)}finally{setZhBusy(false)}})();
 }
 if(loading)return <div className="boot"><div className="spinner"/><h2>正在读取 CFA V2 学习空间</h2><p>本地题库 · 多账户进度 · 隐私优先</p></div>;
 const currentQuestion=session? qMap[session.ids[index]]:null;
 return <div className="app-shell" ref={screenTop}>
   <header className="topbar"><div className="brand" onClick={()=>go('home')} role="button" tabIndex={0}><span className="logo">C</span><div><strong>CFA STUDY</strong><small>Practice V2 · Deep Learning</small></div></div>
    <div className="top-right"><span className="version">Version 2.0 · {bank?`${numfmt(qs.length)}题`:'等待题库'}</span><select aria-label="切换账户" value={state.activeProfileId} onChange={e=>setState(s=>({...s,activeProfileId:e.target.value}))}>{state.profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="btn btn-small btn-outline" onClick={()=>go('settings')}>账户设置</button></div></header>
   <div className="main-layout"><aside className="sidebar"><div className="sidebar-title">学习空间</div>{NAV.map(([page,label])=><button key={page} className={`side-item ${route.page===page?'active':''}`} onClick={()=>go(page)}><Icon name={page}/>{label}{page==='wrong'&&wrong.length>0&&<span className="count">{wrong.length}</span>}</button>)}<div className="sidebar-footer"><b>题库 V2</b><span>{bank?`已导入 ${numfmt(qs.length)} 题`:'尚未导入 practice.zip'}</span><div className="side-mini-bar"><span style={{width:`${stats.doneRate*100}%`}}/></div><small>{pct(stats.done,stats.all)}% 已完成</small></div></aside>
   <main className="content">
    {!bank&&route.page!=='settings'?<section className="import-hero"><div className="big-emoji">▣</div><div className="overline">V2 全新题库 · 从真实来源导入</div><h1>导入你的 practice.zip，开始分章节学习</h1><p>将读取 10 科模块与模拟卷、英文原题、原始解析及案例材料。题库缓存只存储在当前浏览器，不会上传到公开 GitHub 仓库。</p><div className="hero-actions"><button className="btn btn-primary" onClick={()=>zipInput.current?.click()} disabled={!!busy}><Icon name="upload"/> {busy||'选择 practice.zip 导入题库'}</button><button className="btn btn-soft" onClick={()=>go('settings')}>管理账户和学习记录</button></div><div className="import-tips"><b>已确认文件结构</b><span>2,318 道题 · 10 科 1,958 题 · 模拟考试 360 题</span><span>选择题、开放题、表格、案例材料都将保留</span></div></section>:
    <>
      {route.page==='home'&&<>
       <Heading overline={`WELCOME BACK / ${currentProfile?.name||'学习账户'}`} title="以知识体系，重建每一道题" desc="V2：英文原始解析 + 中文高观点 + 分小节错题 + 可审计的学习记录。" actions={<button className="btn btn-primary" onClick={()=>go('practice')}>开始练习 <Icon name="next"/></button>}/>
       <div className="metrics"><Metric label="已完成" value={`${numfmt(stats.done)}/${numfmt(stats.all)}`} extra={`${pct(stats.done,stats.all)}% 完成率`}/><Metric label="最近正确率" value={`${pct(stats.correct,stats.scored)}%`} extra={`客观题判分 ${numfmt(stats.scored)} 道`}/><Metric label="待复习错题" value={numfmt(stats.wrong)} extra="按科目和小节重做"/><Metric label="标记太简单" value={numfmt(stats.easy)} extra="不再参与重复推荐"/></div>
       <div className="home-grid"><div className="panel"><div className="panel-head"><div><h2>按科目继续学习</h2><p>题目沿原始模块顺序整理，模拟卷单独分组。</p></div><button className="link" onClick={()=>go('practice')}>查看全部模块 →</button></div><div className="subject-grid">{groups.filter(g=>g.questions.length).map(g=>{const done=g.questions.filter(q=>pdata.answers[q.id]?.completed).length,w=g.questions.filter(q=>isWrong(pdata,q.id)).length;return <button key={g.id} className="subject-card" onClick={()=>{setSubject(g.id);go('practice',{subject:g.id})}}><span className="subject-dot" style={{background:g.color}}/><span className="subject-name">{g.zh}</span><small>{g.short} · {g.questions.length} 题 · {g.modules.length} 节</small><Bar n={done} d={g.questions.length} color={g.color}/><span className="card-foot">已做 {done} <em>错题 {w}</em></span></button>})}</div></div>
        <div className="right-stack"><div className="panel quick"><h2>快速开始</h2><p>系统默认排除“太简单”和“题目有问题”的题。</p><button className="btn btn-primary full" onClick={()=>start(qs.filter(q=>q.autoScore&&isDue(pdata,q.id)&&!pdata.answers[q.id]?.completed).slice(0,20).map(q=>q.id),'未做题 · 顺序练习','normal','home')}>▶ 练习前 20 道未做题</button><button className="btn btn-outline full" onClick={()=>start([...qs].filter(q=>q.autoScore&&isDue(pdata,q.id)).sort(()=>Math.random()-.5).slice(0,10).map(q=>q.id),'随机 10 题','normal','home')}>随机 10 题</button><button className="btn btn-soft full" onClick={()=>go('wrong')}>↺ 错题按章节重做（{stats.wrong}）</button></div><div className="panel"><h2>学习提醒</h2><p className="soft-text">原题英文解析与中文知识讲义分开呈现。机器翻译如可用会单独标注，避免将自动生成内容误当官方答案。</p><button className="link" onClick={()=>go('settings')}>导出学习记录、切换账户 →</button></div></div></div>
      </>}
      {route.page==='practice'&&<>
       <Heading overline="PRACTICE / CURRICULUM" title="科目与知识点练习" desc="先选科目，再按原始 Module 逐节做题；题干区不提前泄露考点和答案。"/>
       <div className="subject-selector">{groups.filter(g=>g.questions.length).map(g=><button key={g.id} className={`subject-tab ${subject===g.id?'active':''}`} onClick={()=>{setSubject(g.id);setActiveModule('')}}>{g.zh}<small>{g.questions.length}</small></button>)}</div>
       {(()=>{const g=groups.find(x=>x.id===subject)||groups.find(x=>x.questions.length);if(!g)return null;const sg=SUBJECT_INDEX[g.id];return <>
        <div className="topic-intro"><div className="topic-intro-head"><span className="overline">SUBJECT / {sg.short}</span><Badge>{g.modules.length} 小节</Badge></div><h2>{sg.zh}</h2><p>{sg.overview}</p><div className="flow-line"><b>知识脉络</b>{sg.roadmap}</div></div>
        <div className="module-list">{g.modules.map(m=>{const mm=g.questions.filter(q=>q.module===m.title),done=mm.filter(q=>pdata.answers[q.id]?.completed).length,w=mm.filter(q=>isWrong(pdata,q.id)).length,active=activeModule===m.title;return <article className="module-item" key={m.title}>
         <div className="module-top" onClick={()=>setActiveModule(active?'':m.title)}><div className="module-number">{String(m.number||'M').padStart(2,'0')}</div><div className="module-title"><strong>{titleFor(g.id,m.title)}</strong><small>{m.title} · {mm.length} 题</small></div><div className="module-mini"><small>已做 {done} · 错题 {w}</small><Bar n={done} d={mm.length}/></div><span className="caret">{active?'⌃':'⌄'}</span></div>
         {active&&<div className="module-body"><NoteCard subject={g.id} module={m.title}/><ModuleGlossary subject={g.id} module={m.title} questions={mm}/><div className="button-row"><button className="btn btn-primary" onClick={()=>start(mm.filter(q=>isDue(pdata,q.id)).map(q=>q.id),titleFor(g.id,m.title),'normal','practice')}>本节全部可练（{mm.filter(q=>isDue(pdata,q.id)).length}）</button><button className="btn btn-outline" onClick={()=>start(mm.filter(q=>isDue(pdata,q.id)&&!pdata.answers[q.id]?.completed).map(q=>q.id),'本节未做题','normal','practice')}>仅未做</button><button className="btn btn-soft" onClick={()=>start(mm.filter(q=>isWrong(pdata,q.id)).map(q=>q.id),'本节错题重做','wrong','wrong')}>本节错题重做（{w}）</button><button className="btn btn-ghost" onClick={()=>start(mm.map(q=>q.id),'本节完整题目（含排除题）','detail','practice')}>查看全部题目</button></div></div>}
        </article>})}</div>
       </>})()}
      </>}
      {route.page==='wrong'&&<>
       <Heading overline="ERROR REVIEW / BY MODULE" title="分小节错题本" desc="按十科和 Module 分类，不再把全部错题混在一组。题目有缺陷时，可以直接标记并排除。" actions={<Badge tone="danger">{wrong.length} 道待复习</Badge>}/>
       {wrong.length===0?<Empty title="当前没有需要重做的错题" hint="新做错的题目会自动归入对应小节；标记有问题/太简单的题不会混入。"/>:<div className="wrong-groups">{groups.filter(g=>wrong.some(q=>q.subject===g.id)).map(g=><div className="wrong-subject" key={g.id}><h2><span className="subject-dot" style={{background:g.color}}/>{g.zh}<Badge>{wrong.filter(q=>q.subject===g.id).length} 题</Badge></h2>{g.modules.filter(m=>wrong.some(q=>q.subject===g.id&&q.module===m.title)).map(m=>{const mm=wrong.filter(q=>q.subject===g.id&&q.module===m.title);return <section key={m.title} className="wrong-module"><div className="wrong-module-head"><div><b>{titleFor(g.id,m.title)}</b><small>Module {m.number} · {mm.length} 道错题</small></div><button className="btn btn-small btn-primary" onClick={()=>start(mm.map(q=>q.id),`错题重做 · ${titleFor(g.id,m.title)}`,'wrong','wrong')}>重做本节</button></div><div className="wrong-items">{mm.map(q=><div key={q.id} className="wrong-item"><button className="wrong-item-text" onClick={()=>openSingle(q,'wrong')}><b>{q.qid}</b><span>{short(plainText(q.stemHtml),78)}</span></button><div className="inline-actions"><button onClick={()=>{setFlagging(q);setReason('')}} title="题目有问题，标记并移出">有问题 · 移出</button><button onClick={()=>mastered(q)} title="我已掌握，移出错题">已掌握</button></div></div>)}</div></section>})}</div>)}</div>}
      </>}
      {route.page==='question'&&currentQuestion&&<>
       <div className="question-nav"><button className="btn btn-ghost" onClick={()=>go(session.from||'practice')}>← 返回{session.from==='wrong'?'错题本':session.from==='stats'?'统计':session.from==='home'?'首页':'章节'}</button><div className="question-progress"><b>{session.title}</b><span>{index+1} / {session.ids.length}</span></div></div>
       <Bar n={index+1} d={session.ids.length}/>
       <div className="question-grid"><article className="question-card"><div className="question-top"><div className="tags"><SubjectPill subject={currentQuestion.subject}/><Badge>{titleFor(currentQuestion.subject,currentQuestion.module)}</Badge>{isEasy(pdata,currentQuestion.id)&&<Badge tone="info">太简单</Badge>}{isProblem(pdata,currentQuestion.id)&&<Badge tone="danger">题目有问题</Badge>}</div><code className="qid">{currentQuestion.qid}</code></div>
        {currentQuestion.stimulusHtml&&<div className="stimulus"><div className="stimulus-label">案例材料 / {currentQuestion.stimulusTitle}</div><Html value={currentQuestion.stimulusHtml}/></div>}
        <Html value={currentQuestion.stemHtml} className="question-stem"/>
        {currentQuestion.autoScore?<div className="options">{currentQuestion.choices.map(c=>{const selected=sessionAnswers[currentQuestion.id]===c.letter,answered=!!sessionAnswers[currentQuestion.id];return <button className={`option ${selected?'selected':''} ${answered&&c.letter===currentQuestion.answer?'correct':''} ${answered&&selected&&currentQuestion.answer!==c.letter?'incorrect':''}`} disabled={answered} key={c.letter} onClick={()=>answer(currentQuestion,c.letter)}><span className="letter">{c.letter}</span><Html value={c.html}/>{answered&&c.letter===currentQuestion.answer&&<span className="opt-check">✓</span>}</button>})}</div>:
         <div className="open-answer"><Badge tone="warning">开放题 / 匹配题</Badge><p>此题原始格式为 {currentQuestion.type}，无法按 A/B/C 自动判分。请先自行作答，再揭示源文件的参考答案。</p><button className="btn btn-outline" onClick={()=>reveal(currentQuestion)}>显示参考答案与中文知识脉络</button></div>}
        {!sessionAnswers[currentQuestion.id]&&<p className="after-hint">完成选择后才展开答案与解析，避免提前泄题。</p>}
        {sessionAnswers[currentQuestion.id]&&<div className="answer-panel"><div className="answer-result"><div><Badge tone={currentQuestion.autoScore?(sessionAnswers[currentQuestion.id]===currentQuestion.answer?'success':'danger'):'info'}>{currentQuestion.autoScore?(sessionAnswers[currentQuestion.id]===currentQuestion.answer?'回答正确':'回答错误'):'已查看参考答案'}</Badge><h3>{currentQuestion.autoScore?`正确答案：${currentQuestion.answer}`:'开放题 · 参考依据'}</h3></div><small>来源：practice.zip</small></div>
         <div className="answer-columns"><div className="answer-section chinese"><h4>中文解析 · 知识结构版 <Badge tone="warning">非人工逐题校译</Badge></h4><pre>{edits.chinese[currentQuestion.id]?.text||chineseFramework(currentQuestion)}</pre>
           <div className="v3-inline"><small className="v3-muted">{edits.chinese[currentQuestion.id]?'已保存的个人中文解析':'原理脉络初稿 · 可自主深度校订'}</small>
            <button onClick={()=>{setEditChineseId(currentQuestion.id);setDraftChinese(edits.chinese[currentQuestion.id]?.text||chineseFramework(currentQuestion))}}>编辑中文解析</button>
            {edits.chinese[currentQuestion.id]&&<button onClick={()=>{if(window.confirm('清除本题个人中文解析，恢复知识结构初稿？'))resetChinese(currentQuestion.id)}}>恢复初稿</button>}
           </div>
           {editChineseId===currentQuestion.id&&<div className="v3-edit-explanation"><p>中文为独立可编辑层；原英文解答完整保留、不会覆盖。</p><textarea rows={13} value={draftChinese} onChange={e=>setDraftChinese(e.target.value)} placeholder="写清楚题目逻辑、为什么选、为什么不选、第一性原理、延伸题型。"/><div className="v3-inline"><button className="v3-primary" onClick={()=>{setChinese(currentQuestion.id,draftChinese);setEditChineseId(null);showToast('本题中文解析已保存')}}>保存这道题的中文解析</button><button onClick={()=>setEditChineseId(null)}>取消</button></div></div>}
          </div>
         <div className="answer-section high-level"><h4>高观点与题目脉络</h4><p>{inspectQuestion(currentQuestion).overview}</p><div className="logic-chain">{inspectQuestion(currentQuestion).chain}</div><p className="boundary"><b>命题路径：</b>{inspectQuestion(currentQuestion).path}</p></div></div>
         <div className="answer-section translation"><div className="translation-title"><h4>逐题中文译文（可选，本机生成）</h4><button className="btn btn-small btn-outline" disabled={zhBusy} onClick={()=>translate(currentQuestion)}>{zhBusy?'翻译中…':translations[currentQuestion.id]?'已翻译 · 查看':'尝试英译中'}</button></div>
          {translations[currentQuestion.id]?<pre>{translations[currentQuestion.id]}</pre>:<p>若 Chrome 桌面版支持内置翻译，可把原始英文解析翻译成中文并缓存在本机；暂不支持的浏览器保留英文来源和中文知识结构。翻译稿应核查金融术语。</p>}
          {zhStatus&&<p className="status-message">{zhStatus}</p>}
         </div>
         <div className="answer-section"><div className="translation-title"><h4>英文原始解析 · Source explanation</h4><button className="link" onClick={()=>setShowEnglish(s=>!s)}>{showEnglish?'收起英文原文':'展开英文原文'}</button></div>
          {showEnglish&&currentQuestion.feedbackHtml&&<Html value={currentQuestion.feedbackHtml}/>} {showEnglish&&!currentQuestion.feedbackHtml&&<div className="notice danger">原始 JSON 中此题未提供完整的英文解析。不要将任何自动讲义视为官方逐题解答。</div>}
         </div>
         <div className="answer-actions"><button className={`btn btn-small ${pdata.stars[currentQuestion.id]?'btn-soft':'btn-outline'}`} onClick={()=>toggleStar(currentQuestion)}>{pdata.stars[currentQuestion.id]?'★ 已收藏':'☆ 收藏'}</button><button className={`btn btn-small ${pdata.easy[currentQuestion.id]?'btn-soft':'btn-outline'}`} onClick={()=>toggleEasy(currentQuestion)}>{pdata.easy[currentQuestion.id]?'取消太简单':'太简单 · 不再重复'}</button><button className="btn btn-small btn-outline" onClick={()=>{setFlagging(currentQuestion);setReason(pdata.flags[currentQuestion.id]?.reason||'')}}>{isProblem(pdata,currentQuestion.id)?'修改问题标记':'题目有问题 · 排除'}</button>{isProblem(pdata,currentQuestion.id)&&<button className="link danger" onClick={()=>removeFlag(currentQuestion)}>撤销排除</button>}{isWrong(pdata,currentQuestion.id)&&<button className="btn btn-small btn-soft" onClick={()=>mastered(currentQuestion)}>已掌握 · 移出错题</button>}</div>
         <label className="personal-note"><span>个人笔记 / 用自己的话复述这道题</span><textarea placeholder="写下你自己的推导、公式、错因或更正建议（仅保存在当前账户）" value={pdata.notes[currentQuestion.id]||''} maxLength={3000} onChange={e=>{const text=e.target.value;patchData(d=>({...d,notes:{...d.notes,[currentQuestion.id]:text}}))}}/></label>
        </div>}
        <div className="question-controls"><button className="btn btn-outline" disabled={index===0} onClick={()=>step(-1)}>← 上一题</button><button className="btn btn-primary" disabled={!sessionAnswers[currentQuestion.id]||index===session.ids.length-1} onClick={()=>step(1)}>下一题 →</button></div>
       </article><aside className="question-sidebar"><NoteCard subject={currentQuestion.subject} module={currentQuestion.module} compact/><div className="panel micro"><h3>题目状态</h3><p>已作答 <b>{pdata.answers[currentQuestion.id]?.attempts||0}</b> 次</p><p>是否错题：<b>{isWrong(pdata,currentQuestion.id)?'是':'否'}</b></p><p>是否排除：<b>{isProblem(pdata,currentQuestion.id)?'是':'否'}</b></p><p>标记太简单：<b>{isEasy(pdata,currentQuestion.id)?'是':'否'}</b></p></div></aside></div>
      </>}
      {route.page==='stats'&&<>
       <Heading overline="PROGRESS / ANALYTICS" title="学习统计与题目追踪" desc="统计不是只展示百分比：可以直接进入每一道题，分析错因、复练记录和被排除的题目。" actions={<button className="btn btn-outline" onClick={downloadCSV}>导出当前账户 CSV</button>}/>
       <div className="metrics"><Metric label="已做题" value={`${numfmt(stats.done)}/${numfmt(stats.all)}`}/><Metric label="客观题正确率" value={`${pct(stats.correct,stats.scored)}%`}/><Metric label="待复习错题" value={stats.wrong}/><Metric label="问题题/排除" value={stats.flagged}/><Metric label="太简单" value={stats.easy}/></div>
       <div className="panel"><h2>按科目完成情况</h2><div className="stats-subjects">{groups.filter(g=>g.questions.length).map(g=>{const done=g.questions.filter(q=>pdata.answers[q.id]?.completed).length,wrongN=g.questions.filter(q=>isWrong(pdata,q.id)).length;return <div className="stats-subject" key={g.id}><div><b>{g.zh}</b><small>{done}/{g.questions.length} · 错题 {wrongN}</small></div><Bar n={done} d={g.questions.length} color={g.color}/><button className="link" onClick={()=>setFilters({...filters,subject:g.id,module:'all'})}>查看题目 →</button></div>})}</div></div>
       <div className="panel"><div className="panel-head"><div><h2>题目明细检索</h2><p>点击任意题目进入题目内部；问题题与太简单题不会从统计里消失。</p></div></div>
        <div className="filter-grid"><select value={filters.subject} onChange={e=>setFilters({...filters,subject:e.target.value,module:'all'})}><option value="all">全部科目</option>{groups.filter(g=>g.questions.length).map(g=><option value={g.id} key={g.id}>{g.zh}</option>)}</select>
         <select value={filters.module} onChange={e=>setFilters({...filters,module:e.target.value})}><option value="all">全部小节</option>{(bank?.modules||[]).filter(m=>filters.subject==='all'||m.subject===filters.subject).map(m=><option value={`${m.subject}|${m.title}`} key={`${m.subject}|${m.title}`}>{titleFor(m.subject,m.title)}</option>)}</select>
         <select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}>{F.map(s=><option key={s}>{s}</option>)}</select>
         <input type="search" placeholder="搜索题号、题干英文关键词" value={filters.query} onChange={e=>setFilters({...filters,query:e.target.value})}/></div>
        <QuestionSearchTable qs={qs} pdata={pdata} filters={filters} onOpen={q=>openSingle(q,'stats')} onEasy={toggleEasy} onFlag={q=>{setFlagging(q);setReason('')}}/>
       </div>
      </>}
      {route.page==='settings'&&<>
       <Heading overline="PROFILES / PORTABILITY" title="多账户、备份与跨平台迁移" desc="最多 5 个独立学习账户；导出的 JSON 可以在其他电脑浏览器导入，按题号恢复全部学习记录。"/>
       <div className="settings-grid"><div className="panel"><h2>学习账户 <Badge>{state.profiles.length}/5</Badge></h2><p>各账户的错题、已做题、太简单、收藏与备注完全独立。</p>
        <div className="profiles">{state.profiles.map(p=>{const d=state.profilesData[p.id]||blankData();return <div className={`profile-row ${p.id===state.activeProfileId?'current':''}`} key={p.id}><div className="avatar">{p.name[0]}</div><div className="profile-main"><strong>{p.name}</strong><small>{Object.keys(d.answers).length} 题已做 · 创建于 {p.createdAt.slice(0,10)}</small></div>{p.id===state.activeProfileId?<Badge tone="success">使用中</Badge>:<button className="btn btn-small btn-soft" onClick={()=>setState(s=>({...s,activeProfileId:p.id}))}>切换</button>}<button className="mini" title="重命名" onClick={()=>renameProfile(p.id)}>✎</button><button className="mini danger" title="删除账户" onClick={()=>deleteProfile(p.id)}>×</button></div>})}</div>
        <div className="create-profile"><input value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="新账户名称（例如：第二轮复习）" maxLength={50}/><button className="btn btn-primary" disabled={state.profiles.length>=5} onClick={createProfile}>＋ 新建账户</button></div></div>
        <div className="panel"><h2>跨平台学习记录</h2><p>默认导出全部账户，不含题库原文。换浏览器或换电脑后，先导入同一份 <code>practice.zip</code>，再导入记录 JSON，即可恢复进度。</p><div className="stack-buttons"><button className="btn btn-primary" onClick={downloadJSON}><Icon name="download"/> 导出全部账户 · JSON 备份</button><button className="btn btn-outline" onClick={downloadCSV}><Icon name="download"/> 导出当前账户 · CSV 分析</button><button className="btn btn-soft" onClick={()=>importInput.current?.click()}><Icon name="upload"/> 导入学习记录 · JSON</button></div><div className="info-line">跨设备是**手动备份与恢复**，不等于自动云同步。JSON 里的原始题号保持稳定，供以后迁移到 Android V2。</div></div></div>
       <div className="panel"><h2>题库管理、可编辑解析与校勘</h2><p>本题库来自你上传的 <code>practice.zip</code>。保留 10 个科目及模拟考试原始组织方式，支持含表格、案例材料和开放题。</p>
        <div className="bank-meta"><Badge>{bank?`${bank.stats.count} 题`:'未导入'}</Badge><Badge>{bank?`${bank.modules.length} 模块`:'无模块'}</Badge><Badge>{bank?`${bank.stats.autoScored} 可自动判分`:'—'}</Badge><Badge>{bank?`${bank.stats.manual} 开放/不完整题`:'—'}</Badge></div>
        <div className="button-row"><button className="btn btn-primary" onClick={downloadPractice}>导出题库 ZIP（含中文解析修改）</button><button className="btn btn-outline" onClick={()=>zipInput.current?.click()}>重新导入 practice.zip</button>{bank&&<button className="btn btn-ghost" onClick={resetBank}>移除本机题库缓存</button>}<button className="btn btn-soft" onClick={()=>{setFilters({subject:'all',module:'all',status:'题目有问题',query:''});go('stats')}}>查看问题题（{bad.length}）</button></div>
        <div className="notice">受版权和隐私考虑，V2 在你的浏览器里导入题目，没有将这份上传资料发布到公开 GitHub 仓库。上传的原始英文答案并不等于逐题中文人工校译；需要进一步复核或翻译的题会如实标识。</div>
       </div>
       <div className="panel"><h2>规则与数据安全</h2><p>“题目有问题”会保留标记与学习历史，但立即从错题本及日常重复练习中排除；“太简单”会从重复推荐中排除，仍可从统计或“查看全部题目”进入。多账户记录只在当前浏览器保存，清除站点数据可能导致记录丢失，建议定期导出备份。</p></div>
      </>}
    </>}
   </main></div>
   <nav className="mobile-tabs">{NAV.map(([p,l])=><button key={p} className={route.page===p?'active':''} onClick={()=>go(p)}><span><Icon name={p}/></span>{l.replace('账户与','')}</button>)}</nav>
   <input type="file" accept=".zip,application/zip" ref={zipInput} onChange={importZip} hidden/>
   <input type="file" accept=".json,application/json" ref={importInput} onChange={importProgress} hidden/>
   {toast&&<div className="toast" role="status">{toast}</div>}
   {flagging&&<div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={()=>setFlagging(null)}>×</button><div className="overline">QUESTION QUALITY CONTROL</div><h2>标记这道题有问题</h2><p>题号：<b>{flagging.qid}</b>。保存后立即从错题本、未做题推荐和随机复习中排除，但仍保留历史与统计，之后可撤销。</p><label>问题原因</label><select value={reason} onChange={e=>setReason(e.target.value)}><option value="">选择常见问题或自行填写</option><option value="题干与选项错位">题干与选项错位</option><option value="答案存在争议或明显错误">答案存在争议或明显错误</option><option value="缺少关键信息/图片">缺少关键信息/图片</option><option value="题目数据或格式损坏">题目数据或格式损坏</option><option value="题目过时/不适用">题目过时/不适用</option></select><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="补充题目具体问题" rows={3}/><div className="button-row"><button className="btn btn-primary" onClick={saveFlag}>确认标记并移出错题</button><button className="btn btn-outline" onClick={()=>setFlagging(null)}>取消</button></div></div></div>}
 </div>;
}

function QuestionSearchTable({qs,pdata,filters,onOpen,onEasy,onFlag}){
 const [page,setPage]=useState(1);useEffect(()=>setPage(1),[filters]);
 const filtered=useMemo(()=>qs.filter(q=>{
  if(filters.subject!=='all'&&q.subject!==filters.subject)return false;
  if(filters.module!=='all'&&`${q.subject}|${q.module}`!==filters.module)return false;
  const s=filters.status;
  if(s==='未做题'&&pdata.answers[q.id])return false;
  if(s==='错题'&&!isWrong(pdata,q.id))return false;
  if(s==='太简单'&&!isEasy(pdata,q.id))return false;
  if(s==='题目有问题'&&!isProblem(pdata,q.id))return false;
  if(s==='收藏'&&!pdata.stars[q.id])return false;
  if(s==='最近做对'&&pdata.answers[q.id]?.lastCorrect!==true)return false;
  const search=filters.query.toLowerCase().trim();if(search&&!(`${q.qid} ${q.stemText||''} ${q.module}`).toLowerCase().includes(search))return false;
  return true;
 }),[qs,pdata,filters]);
 const perPage=40,shown=filtered.slice((page-1)*perPage,page*perPage);
 return <><div className="table-count">当前筛选：{filtered.length} 道题 <span>点击题号可直接查看并练习</span></div>
  {!shown.length?<Empty/>:<div className="table-scroll"><table className="question-table"><thead><tr><th>题号</th><th>科目 / 小节</th><th>题干</th><th>状态</th><th>操作</th></tr></thead><tbody>{shown.map(q=>{const r=pdata.answers[q.id];return <tr key={q.id}><td><button className="link strong" onClick={()=>onOpen(q)}>{q.qid||q.itemId}</button></td><td><small>{SUBJECT_INDEX[q.subject]?.zh}<br/>{titleFor(q.subject,q.module)}</small></td><td><button className="table-stem" onClick={()=>onOpen(q)}>{short(plainText(q.stemHtml),90)}</button></td><td>{isProblem(pdata,q.id)?<Badge tone="danger">问题题</Badge>:isEasy(pdata,q.id)?<Badge tone="info">太简单</Badge>:isWrong(pdata,q.id)?<Badge tone="danger">错题</Badge>:r?<Badge tone={r.lastCorrect===true?'success':'warning'}>{r.lastCorrect===true?'最近做对':'已做'}</Badge>:<Badge>未做</Badge>}</td><td><div className="row-actions"><button className="mini" onClick={()=>onEasy(q)} title="标记太简单">{isEasy(pdata,q.id)?'取消简单':'太简单'}</button><button className="mini" onClick={()=>onFlag(q)} title="题目问题">⚑</button></div></td></tr>})}</tbody></table></div>}
  {filtered.length>perPage&&<div className="pagination"><button className="btn btn-small btn-outline" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>上一页</button><span>{page}/{Math.ceil(filtered.length/perPage)}</span><button className="btn btn-small btn-outline" onClick={()=>setPage(p=>Math.min(Math.ceil(filtered.length/perPage),p+1))} disabled={page*perPage>=filtered.length}>下一页</button></div>}
 </>
}
