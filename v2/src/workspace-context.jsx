import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {get,set} from 'idb-keyval';
import {loadCourse,saveCourse,mergeCourse,readVocabularyZip,saveVocabularySource} from './lib/v3-data';

const KEY='cfa-v3-workspace-edits';
const empty={version:3,chinese:{},words:{},removedWords:{},moduleWords:{},hiddenModuleWords:{},lessonNotes:{},lessonChecks:{},wordSources:[]};
const Context=createContext(null);
function merge(base,other){
 const o=other||{};
 return {...base,...o,chinese:{...base.chinese,...o.chinese},words:{...base.words,...o.words},
  removedWords:{...base.removedWords,...o.removedWords},moduleWords:{...base.moduleWords,...o.moduleWords},
  hiddenModuleWords:{...base.hiddenModuleWords,...o.hiddenModuleWords},
  lessonNotes:{...base.lessonNotes,...o.lessonNotes},lessonChecks:{...base.lessonChecks,...o.lessonChecks},
  wordSources:o.wordSources||base.wordSources};
}
export function WorkspaceProvider({children}){
 const [edits,setEdits]=useState(empty),[course,setCourse]=useState({docs:[],sources:[]});
 const [ready,setReady]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;(async()=>{
  try{const [e,c]=await Promise.all([get(KEY),loadCourse()]);
   if(active){setEdits(merge(empty,e));setCourse(c);}
  }catch(err){console.error('V3 storage error',err);if(active)setNotice('浏览器存储不可用；请启用本站的 IndexedDB');}
  finally{if(active)setReady(true)}
 })();return()=>{active=false}},[]);
 useEffect(()=>{if(ready)set(KEY,edits).catch(err=>{console.error(err);setNotice('写入学习词典失败，请检查浏览器存储额度')})},[edits,ready]);
 function patch(fn){setEdits(old=>merge(empty,fn(old)))}
 const setChinese=(id,text)=>patch(e=>({...e,chinese:{...e.chinese,[id]:{text,updatedAt:new Date().toISOString()}}}));
 const resetChinese=id=>patch(e=>{const chinese={...e.chinese};delete chinese[id];return {...e,chinese}});
 const saveWord=w=>patch(e=>{const word=String(w.word||'').toLowerCase().trim();
  if(!word)return e;
  const words={...e.words,[word]:{...w,word,source:w.source||'用户编辑',editedAt:new Date().toISOString()}};
  const removedWords={...e.removedWords};delete removedWords[word];
  return {...e,words,removedWords};
 });
 const deleteWord=(word)=>patch(e=>{const key=String(word||'').toLowerCase().trim();
  const words={...e.words};delete words[key];
  return {...e,words,removedWords:{...e.removedWords,[key]:true}};
 });
 const addModuleWord=(moduleKey,word)=>patch(e=>{
  const a=new Set(e.moduleWords[moduleKey]||[]);a.add(word);
  const hiddenModuleWords={...e.hiddenModuleWords};
  hiddenModuleWords[moduleKey]=(hiddenModuleWords[moduleKey]||[]).filter(x=>x!==word);
  return {...e,moduleWords:{...e.moduleWords,[moduleKey]:[...a]},hiddenModuleWords};
 });
 const removeModuleWord=(moduleKey,word)=>patch(e=>{
  const a=new Set(e.hiddenModuleWords[moduleKey]||[]);a.add(word);
  return {...e,hiddenModuleWords:{...e.hiddenModuleWords,[moduleKey]:[...a]}};
 });
 const importEdits=overlay=>patch(e=>merge(e,{
   chinese:overlay?.chinese||{},words:overlay?.words||{},
   removedWords:overlay?.removedWords||{},moduleWords:overlay?.moduleWords||{},
   hiddenModuleWords:overlay?.hiddenModuleWords||{},lessonNotes:overlay?.lessonNotes||{},lessonChecks:overlay?.lessonChecks||{}
 }));
 const applyCourse=async part=>{const next=mergeCourse(course,part);await saveCourse(next);setCourse(next);return next};
 async function importWords(file,onProgress){
  const parsed=await readVocabularyZip(file,onProgress);
  if(parsed.count){
   patch(old=>({...old,words:{...parsed.words,...old.words},wordSources:[...(old.wordSources||[]),{filename:file.name,count:parsed.count,at:new Date().toISOString()}]}));
   try{await saveVocabularySource(file)}catch(e){console.warn('Could not cache original word source archive',e)}
  }
  return parsed;
 }
 const value=useMemo(()=>({ready,edits,course,notice,setNotice,patch,setChinese,resetChinese,saveWord,deleteWord,
  addModuleWord,removeModuleWord,importEdits,applyCourse,importWords}),[ready,edits,course,notice]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkspace(){
 const data=useContext(Context);
 if(!data)throw new Error('WorkspaceProvider missing');
 return data;
}
