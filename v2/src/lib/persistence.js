import {get,set,del} from 'idb-keyval';
const BANK_KEY='cfa-v2-bank';
const STATE_KEY='cfa-v2-progress';
const TRANSLATION_KEY='cfa-v2-translations';

const newId=()=>`u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
export const makeProfile=(name='默认账户')=>({id:newId(),name,createdAt:new Date().toISOString()});
export const blankData=()=>({answers:{},flags:{},easy:{},stars:{},notes:{},translations:{}});
export function initialState(){const p=makeProfile();return {schemaVersion:2,activeProfileId:p.id,profiles:[p],profilesData:{[p.id]:blankData()}};}
export function currentData(state){return state.profilesData[state.activeProfileId]||blankData();}
export async function loadBank(){return await get(BANK_KEY)||null;}
export async function saveBank(bank){await set(BANK_KEY,bank);}
export async function clearBank(){await del(BANK_KEY);}
export async function loadState(){
 const state=await get(STATE_KEY);
 if(!state||state.schemaVersion!==2||!Array.isArray(state.profiles))return initialState();
 return state;
}
export async function saveState(state){await set(STATE_KEY,state);}
export async function clearState(){await del(STATE_KEY);}
export async function loadTranslations(){return await get(TRANSLATION_KEY)||{};}
export async function saveTranslations(x){await set(TRANSLATION_KEY,x);}

function recordOf(data,qid){return data.answers[qid]||null;}
export function isProblem(data,qid){return !!data.flags[qid]?.exclude;}
export function isEasy(data,qid){return !!data.easy[qid];}
export function isWrong(data,qid){
 const r=recordOf(data,qid);
 return !!r?.wrongEver && !r?.mastered && !isProblem(data,qid) && !isEasy(data,qid);
}
export function isDue(data,qid){
 const r=recordOf(data,qid);
 return !isEasy(data,qid)&&!isProblem(data,qid)&&!r?.mastered;
}
export function createProgressUpdate(data,qid,answer,correct,review=false,elapsedMs=0){
 const old=data.answers[qid]||{};
 const next={
  ...old,
  attempts:(old.attempts||0)+1,
  lastAnswer:answer,lastCorrect:correct, completed:true,
  wrongEver:old.wrongEver||correct===false,
  mastered:old.mastered||false,
  reviewStreak: review?(correct ? (old.reviewStreak||0)+1 : 0) : (old.reviewStreak||0),
  at:new Date().toISOString(),
  totalSeconds:(old.totalSeconds||0)+Math.round(Math.max(0,elapsedMs)/1000),
  history:[...(old.history||[]),{at:new Date().toISOString(),choice:answer,correct,review,ms:elapsedMs}].slice(-100),
 };
 return {...data,answers:{...data.answers,[qid]:next}};
}
export function makeBackup(state,bank){
 return {
  format:'cfa-l1-progress',version:2,exportedAt:new Date().toISOString(),
  bank:{id:bank?.id||null,count:bank?.stats?.count||null},
  profiles:state.profiles,activeProfileId:state.activeProfileId,profilesData:state.profilesData,
  note:'本文件仅含学习记录与个人标注，不含完整题库。跨设备导入前需在新设备上导入相同的 practice.zip。',
 };
}
export function validateBackup(obj){
 if(!obj||obj.format!=='cfa-l1-progress'||obj.version!==2)throw new Error('不是 V2 学习记录文件');
 if(!Array.isArray(obj.profiles)||!obj.profiles.length||obj.profiles.length>5)throw new Error('账户数量超出允许范围（1–5）');
 if(!obj.profilesData||typeof obj.profilesData!=='object')throw new Error('备份缺少账户记录');
 for(const p of obj.profiles){
  if(!p.id||!p.name||typeof p.name!=='string'||p.name.length>50||!obj.profilesData[p.id])throw new Error('账户数据格式不正确');
  const d=obj.profilesData[p.id];
  for(const k of ['answers','flags','easy','stars','notes'])if(!d[k]||typeof d[k]!=='object'||Array.isArray(d[k]))throw new Error(`备份字段无效：${k}`);
  if(Object.keys(d.answers).length>15000)throw new Error('学习记录题量超出上限');
 }
 return {schemaVersion:2,profiles:obj.profiles,activeProfileId:obj.profiles.some(p=>p.id===obj.activeProfileId)?obj.activeProfileId:obj.profiles[0].id,profilesData:obj.profilesData};
}
export function downloadText(filename,text,mime='application/json;charset=utf-8'){
 const blob=new Blob([text],{type:mime}); const u=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=u;a.download=filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function csv(s){return '"'+String(s??'').replace(/"/g,'""').replace(/^([=+\-@])/,'\'$1')+'"';}
export function exportCSV(bank,data){
 const rows=[['科目','章节','题号','状态','练习次数','最近正确','总耗时(秒)','太简单','题目有问题','问题原因','收藏','最近作答时间']];
 for(const q of bank?.questions||[]){
  const r=data.answers[q.id],f=data.flags[q.id];
  if(!r&&!data.easy[q.id]&&!f&&!data.stars[q.id])continue;
  rows.push([q.subject,q.module,q.qid||q.itemId,r?.mastered?'已掌握':isWrong(data,q.id)?'错题':r?'已做':'未做',r?.attempts||0,r?.lastCorrect??'',r?.totalSeconds||0,!!data.easy[q.id],!!f?.exclude,f?.reason||'',!!data.stars[q.id],r?.at||'']);
 }
 return '\ufeff'+rows.map(r=>r.map(csv).join(',')).join('\r\n');
}
export function summaryFor(bank,data){
 const items=bank?.questions||[];
 const results={all:items.length,done:0,correct:0,attempts:0,wrong:0,flagged:0,easy:0,starred:0,minutes:0};
 for(const q of items){
  const r=data.answers[q.id]; if(r){results.done++;results.attempts+=r.attempts||0; if(r.lastCorrect===true) results.correct++; results.minutes+=(r.totalSeconds||0)/60;}
  if(isWrong(data,q.id)) results.wrong++;
  if(isProblem(data,q.id))results.flagged++;
  if(isEasy(data,q.id))results.easy++;
  if(data.stars[q.id])results.starred++;
 }
 return {...results,doneRate:results.all?results.done/results.all:0,accuracy:results.done?results.correct/results.done:0};
}
