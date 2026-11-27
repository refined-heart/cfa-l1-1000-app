import React,{useEffect,useMemo,useState} from 'react';
import {useWorkspace} from './workspace-context';
import {cleanWord} from './lib/v3-data';

export const SEED={
 'asset':['资产','A resource controlled by an entity from which economic benefits are expected.'],
 'liability':['负债','A present obligation expected to require a future transfer of economic resources.'],
 'equity':['权益','The residual claim on assets after deducting liabilities.'],
 'yield':['收益率','Income or return expressed relative to a price, value, or investment base.'],
 'duration':['久期','A bond price sensitivity measure with respect to changes in yield.'],
 'convexity':['凸性','A second-order measure of the curvature of the price–yield relationship.'],
 'discount':['折现','To convert a future cash flow into its present value using a discount rate.'],
 'arbitrage':['套利','A trading strategy aiming to earn a profit from pricing inconsistencies.'],
 'hedge':['对冲','A position intended to offset exposure to a specified financial risk.'],
 'spread':['利差','The difference between two rates, yields or prices.'],
 'coupon':['票息','Interest paid by a bond according to its stated coupon terms.'],
 'notional':['名义本金','A reference amount used to calculate derivative cash flows.'],
 'volatility':['波动率','A measure of dispersion or variability in returns or prices.'],
 'maturity':['到期日','The date on which a financial instrument becomes due or is redeemed.'],
 'derivative':['衍生工具','A contract whose value depends on an underlying variable.'],
 'forward':['远期合约','An agreement to transact an underlying at a future date at a specified price.'],
 'variance':['方差','The expected squared deviation of a random variable from its mean.'],
 'residual':['残差','The difference between an observed value and a fitted value.'],
 'regression':['回归','A statistical method for modeling relationships between variables.'],
 'fiduciary':['受托责任的','Relating to duties owed by one party when acting on behalf of another.'],
 'accrual':['权责发生制项目','Recognition of income or expense when earned or incurred rather than when cash moves.'],
 'impairment':['减值','Recognition of a loss in the recoverable or carrying value of an asset.']
};
const STOP=new Set('the this that these those with from what which when where whose while have has had will would should could their there than then also only most least likely more less some into upon over under after before based using given following whether between among other each many same both does were been being versus such terms term number amount question answer option choice correct select calculate'.split(' '));
const seed=(word)=>{const v=SEED[word];return v?{word,zh:v[0],en:v[1],source:'内置示范词条（非上传资料）'}:null};
const fields=[
 ['word','英文单词'],['zh','中文意思'],['en','英文解释'],['ipaUK','英音音标 IPA'],['ipaUS','美音音标 IPA'],
 ['roots','词根 / 前缀 / 后缀（有依据时填写）'],['derivation','派生词 / 词族'],['inflections','屈折形式'],['phrases','短语 / 搭配'],['synonyms','近义词'],['antonyms','反义词']
];
export function clickableWordAt(e){
 const el=e.target instanceof Element?e.target:null;
 if(!el?.closest('.rich-text,.lesson-body,.word-scope'))return '';
 if(el.closest('button,a,input,textarea,select,[contenteditable]'))return '';
 const getRange=document.caretRangeFromPoint?.bind(document);
 let node=null,offset=0;
 if(getRange){const r=getRange(e.clientX,e.clientY);node=r?.startContainer;offset=r?.startOffset||0;}
 else if(document.caretPositionFromPoint){const r=document.caretPositionFromPoint(e.clientX,e.clientY);node=r?.offsetNode;offset=r?.offset||0;}
 if(node?.nodeType!==3)return '';
 const value=node.textContent||'';
 const pattern=/[A-Za-z][A-Za-z'-]*/g;
 let found;
 while((found=pattern.exec(value))){
  if(offset>=found.index&&offset<=found.index+found[0].length){
   return cleanWord(found[0].replace(/(?:'s|’s)$/i,''));
  }
 }
 return '';
}
function getSpeech(word,region){
 if(!('speechSynthesis' in window))return false;
 window.speechSynthesis.cancel();
 const utter=new SpeechSynthesisUtterance(word);
 utter.lang=region==='uk'?'en-GB':'en-US';utter.rate=.82;
 const voices=window.speechSynthesis.getVoices();
 utter.voice=voices.find(v=>v.lang.toLowerCase()===(region==='uk'?'en-gb':'en-us'))||null;
 window.speechSynthesis.speak(utter);return true;
}
export function WordPopup({word,onClose,moduleKey}){
 const {edits,saveWord,deleteWord,addModuleWord}=useWorkspace();
 const [remote,setRemote]=useState(null),[status,setStatus]=useState(''),[edit,setEdit]=useState(false),[form,setForm]=useState({});
 const local=edits.removedWords[word]?null:edits.words[word]||seed(word);
 useEffect(()=>{
  setRemote(null);setStatus('');setEdit(false);
  setForm({word,...local});
 },[word,edits.words[word]]);
 useEffect(()=>{
  if(!word||local?.en)return;
  let active=true;const c=new AbortController();
  setStatus('正在查询公开英英词典…');
  fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word),{signal:c.signal})
   .then(r=>{if(!r.ok)throw new Error('无公开释义');return r.json()})
   .then(arr=>{
    if(!active)return;
    const obj=Array.isArray(arr)?arr[0]:null;
    const defs=(obj?.meanings||[]).flatMap(m=>(m.definitions||[]).map(d=>({pos:m.partOfSpeech,text:d.definition,syn:d.synonyms||[],ant:d.antonyms||[]}))).slice(0,6);
    setRemote({
     en:defs.map(d=>(d.pos?'['+d.pos+'] ':'')+d.text).join('\n'),
     ipaUK:obj?.phonetics?.find(p=>p.audio?.includes('uk'))?.text||'',
     ipaUS:obj?.phonetics?.find(p=>p.audio?.includes('us'))?.text||obj?.phonetic||'',
     synonyms:[...new Set(defs.flatMap(d=>d.syn))].slice(0,12).join('; '),
     antonyms:[...new Set(defs.flatMap(d=>d.ant))].slice(0,12).join('; ')
    });setStatus('英英定义来自公开词典；中文和词源未凭空补全');
   }).catch(e=>{if(active)setStatus('未查到公共词典释义：可手动补充');});
  return()=>{active=false;c.abort()};
 },[word]);
 if(!word)return null;
 const base={word,zh:'',en:'',ipaUK:'',ipaUS:'',roots:'',derivation:'',inflections:'',phrases:'',synonyms:'',antonyms:''};
 const view={...base,...remote,...local},formNow={...base,...form};
 return <div className="v3-modal-wrap" onClick={onClose} role="presentation"><div className="v3-dict-card" role="dialog" aria-modal="true" aria-label="英语单词词典" onClick={e=>e.stopPropagation()}>
  <div className="v3-dict-head"><div><small>PROFESSIONAL ENGLISH · 词条</small><h2>{word}</h2></div><button className="v3-plain" onClick={onClose} aria-label="关闭">✕</button></div>
  {!edit?<><div className="v3-pron"><span>UK: {view.ipaUK||'待补充'}</span><button onClick={()=>getSpeech(word,'uk')}>▶ 英音</button><span>US: {view.ipaUS||'待补充'}</span><button onClick={()=>getSpeech(word,'us')}>▶ 美音</button></div>
   {fields.slice(1).map(([k,label])=><div key={k} className="v3-word-field"><strong>{label}</strong><p>{view[k]||'词库尚未提供，可编辑补充'}</p></div>)}
   <p className="v3-muted">{local?.source?'来源：'+local.source:'未在本地词库收录'}。{status}</p>
   <div className="v3-inline"><button className="v3-primary" onClick={()=>{setForm(view);setEdit(true)}}>编辑 / 补充词条</button>
    {moduleKey&&<button onClick={()=>{addModuleWord(moduleKey,word);onClose()}}>加入本节词汇</button>}
    {edits.words[word]&&<button className="v3-danger" onClick={()=>{if(window.confirm('确认删除该词条的本地自定义记录？')){deleteWord(word);onClose()}}}>删除词条</button>}
   </div></>:
   <div className="v3-word-edit">{fields.map(([k,label])=><label key={k}>{label}{k==='word'?<input value={formNow.word||''} readOnly/>:<textarea rows={k==='en'||k==='zh'?3:2} value={formNow[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/>}</label>)}
    <div className="v3-inline"><button className="v3-primary" onClick={()=>{saveWord(formNow);setEdit(false)}}>保存中文 / 英文词条</button><button onClick={()=>setEdit(false)}>取消</button></div>
    <p className="v3-muted">编辑仅写入个人浏览器，能通过 V3 数据 ZIP 导出。已有英语原题和解析不会修改。</p></div>}
 </div></div>;
}
export function ModuleGlossary({questions,subject,module}){
 const {edits,saveWord,addModuleWord,removeModuleWord}=useWorkspace();
 const [word,setWord]=useState(''),[draft,setDraft]=useState(''),[detail,setDetail]=useState(null),[expanded,setExpanded]=useState(false);
 const key='practice:'+subject+'|'+module;
 const list=useMemo(()=>{
  const counts={};
  for(const q of questions||[]){
   for(const m of [q.stemText||'',...(q.choices||[]).map(c=>c.html||''),q.feedbackHtml||''].join(' ').replace(/<[^>]+>/g,' ').toLowerCase().matchAll(/\b[a-z]{4,}\b/g)){
    const w=m[0];if(!STOP.has(w)&&(SEED[w]||edits.words[w]))counts[w]=(counts[w]||0)+1;
   }
  }
  const selected=new Set(edits.moduleWords[key]||[]);
  const hidden=new Set(edits.hiddenModuleWords[key]||[]);
  const out=[...new Set([...selected,...Object.keys(counts).sort((a,b)=>(counts[b]-counts[a]))])]
   .filter(w=>!hidden.has(w)&&!edits.removedWords[w]&&(edits.words[w]||SEED[w]));
  return out.slice(0,expanded?100:18);
 },[questions,edits,key,expanded]);
 return <section className="v3-module-glossary"><div className="v3-row"><div><h3>本节专业英语 · Vocabulary</h3><p>英文词汇 → 中文意思 → 英文解释；可逐个编辑、补充或从本节移出。</p></div><button onClick={()=>setExpanded(x=>!x)}>{expanded?'收起':'查看更多'}</button></div>
   <div className="v3-vocab-grid">{list.map(w=>{const v=edits.words[w]||seed(w)||{};return <div key={w} className="v3-vocab-item"><button className="v3-vocab-word" onClick={()=>setWord(w)}>{w}</button><small>{v.zh||'待补充中文'}</small><p>{v.en||'待补充英文解释'}</p><button className="v3-x" title="从本小节移除" onClick={()=>removeModuleWord(key,w)}>×</button></div>})}</div>
   {!list.length&&<p className="v3-muted">尚无本节词条。导入金融英语词库后会自动匹配单词，也可在下方手动新增。</p>}
   <div className="v3-inline"><input placeholder="输入英语单词，例如 duration" value={draft} onChange={e=>setDraft(e.target.value)}/><button onClick={()=>{const w=cleanWord(draft);if(!w)return;addModuleWord(key,w);saveWord({word:w,zh:'',en:'',source:'本节新增'});setWord(w);setDraft('')}}>新增 / 编辑单词</button></div>
   {word&&<WordPopup word={word} moduleKey={key} onClose={()=>setWord('')}/>}
 </section>;
}
