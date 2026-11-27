import React,{useRef,useState} from 'react';
import JSZip from 'jszip';
import PracticeApp from './App';
import {WordPopup,clickableWordAt} from './Dictionary';
import {EnglishArea,TutorialArea,OtherArea,EmptyCFAModule} from './StudyAreas';
import {WorkspaceProvider,useWorkspace} from './workspace-context';
import {downloadBlob,exportPracticeZip,loadPracticeFile,loadVocabularySource} from './lib/v3-data';
import {loadBank,loadState,makeBackup,saveState,validateBackup} from './lib/persistence';
import './workspace.css';

const AREAS=['现代数学','专业英语','金融学','CFA'];
const CFA=['CFA1 教程','CFA1 Practice','CFA2 教程','CFA2 Practice','CFA3 教程','CFA3 Practice'];
function WorkspaceShell(){
 const {ready,edits,course,notice,setNotice,importEdits}=useWorkspace();
 const [area,setArea]=useState('CFA'),[module,setModule]=useState('CFA1 Practice');
 const [word,setWord]=useState(''),[dataOpen,setDataOpen]=useState(false),[dataBusy,setDataBusy]=useState('');
 const backupInput=useRef(null);
 async function exportData(){
  try{setDataBusy('正在创建数据备份…');const zip=new JSZip();
   const [state,bank]=await Promise.all([loadState(),loadBank()]);
   zip.file('workspace-v3.json',JSON.stringify({schema:'cfa-workspace-v3',version:3,createdAt:new Date().toISOString(),edits,courseSources:course.sources},null,2));
   if(state)zip.file('progress-v2.json',JSON.stringify(makeBackup(state,bank),null,2));
   const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
   downloadBlob(blob,'CFA_Study_V3_Records_And_Annotations.zip');setDataBusy('备份已下载');
  }catch(err){setDataBusy('备份失败：'+err.message)}
 }
 async function importData(e){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{
   const zip=await JSZip.loadAsync(file),entry=zip.file('workspace-v3.json');
   if(!entry)throw new Error('不是 V3 工作空间备份 ZIP');
   const obj=JSON.parse(await entry.async('string'));
   if(obj?.schema!=='cfa-workspace-v3'||obj?.version!==3)throw new Error('V3 备份格式不匹配');
   if(!window.confirm('导入用户编辑层，并尝试恢复学习记录？当前同名编辑内容可能被替换。'))return;
   importEdits(obj.edits||{});
   const p=zip.file('progress-v2.json');
   if(p){const data=validateBackup(JSON.parse(await p.async('string')));await saveState(data);}
   setDataBusy('用户标注和学习记录已恢复。刷新网页后可以在 Practice 中查看全部进度。');
  }catch(err){setDataBusy('恢复失败：'+err.message)}
 }
 async function exportPractice(){
  try{
   setDataBusy('生成原始 Practice + 编辑层 ZIP…');
   const b=await exportPracticeZip({chinese:edits.chinese,words:edits.words,removedWords:edits.removedWords,moduleWords:edits.moduleWords,hiddenModuleWords:edits.hiddenModuleWords});
   downloadBlob(b,'practice_V3_Editable_Export.zip');setDataBusy('Practice ZIP 已导出；英文解析原样保留');
  }catch(err){setDataBusy('导出失败：'+err.message)}
 }
 function handleWordClick(e){
  if(word||e.defaultPrevented)return;
  const found=clickableWordAt(e);
  if(found){setWord(found);e.stopPropagation();}
 }
 return <div className="v3-shell" onClickCapture={handleWordClick}>
  <header className="v3-topbar">
   <div className="v3-mark">∑</div><div className="v3-brand"><strong>KNOWLEDGE STUDIO</strong><small>数学 · 英语 · 金融 · CFA</small></div>
   <div className="v3-compact-controls"><label><span>学习区</span><select aria-label="切换学习区" value={area} onChange={e=>setArea(e.target.value)}>{AREAS.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
    {area==='CFA'&&<label><span>课程</span><select aria-label="CFA 六个模块" value={module} onChange={e=>setModule(e.target.value)}>{CFA.map(a=><option key={a}>{a}</option>)}</select></label>}
    {area==='专业英语'&&<span className="v3-level">CFA1 金融英语</span>}
   </div>
   <button className="v3-utility" onClick={()=>setDataOpen(x=>!x)}>{dataOpen?'关闭数据管理':'导入 / 导出'}</button>
  </header>
  {notice&&<div className="v3-alert">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
  {dataOpen&&<div className="v3-data-panel"><div><h3>题库与学习记录 · 备份迁移</h3><p>数据在本机浏览器 IndexedDB 中，导出 ZIP 便于迁移；原始付费题库不上传公开 GitHub。</p></div>
   <div className="v3-inline"><button className="v3-primary" onClick={exportPractice}>导出编辑后 practice.zip</button><button onClick={exportData}>导出全部标注 + 学习记录 ZIP</button>
    <input ref={backupInput} hidden type="file" accept=".zip" onChange={importData}/><button onClick={()=>backupInput.current?.click()}>导入数据备份 ZIP</button>
    <button onClick={()=>{setArea('CFA');setModule('CFA1 教程');setDataOpen(false)}}>导入教程 ZIP</button><button onClick={()=>{setArea('专业英语');setDataOpen(false)}}>导入词库 ZIP</button>
   </div><p className="v3-muted">{dataBusy||'完整 Practice ZIP 导入入口位于 CFA1 Practice；编辑过的中文解析通过 _study/v3-overrides.json 附加保存，不覆盖原英文内容。'}</p></div>}
  <div className="v3-active-context"><span>{area}</span>{area==='CFA'&&<><span>／</span><strong>{module}</strong></>}{area==='专业英语'&&<><span>／</span><strong>CFA1 金融英语</strong></>}<span className="v3-v-label">V3 · Browser QA</span></div>
  <div className="v3-area-body">
   {area==='CFA'&&module==='CFA1 Practice'&&<PracticeApp/>}
   {area==='CFA'&&module==='CFA1 教程'&&<TutorialArea/>}
   {area==='CFA'&&!['CFA1 教程','CFA1 Practice'].includes(module)&&<EmptyCFAModule slot={module}/>}
   {area==='专业英语'&&<EnglishArea/>}
   {area==='现代数学'&&<OtherArea area={area}/>}
   {area==='金融学'&&<OtherArea area={area}/>}
  </div>
  {word&&<WordPopup word={word} onClose={()=>setWord('')}/>}
 </div>;
}
export default function Workspace(){return <WorkspaceProvider><WorkspaceShell/></WorkspaceProvider>}
