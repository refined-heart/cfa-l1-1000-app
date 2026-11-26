import JSZip from 'jszip';
import { SUBJECTS, moduleNumber, noteFor } from './curriculum';

const VALID_SUBJECTS = new Set(SUBJECTS.map(x=>x.id));
const MAX_ZIP_BYTES=75*1024*1024;
const MAX_JSON_BYTES=7*1024*1024;
const MAX_ITEMS=10000;

function uniqueChoiceText(choices) {
  const keys = new Set(choices.map(x=>x.letter));
  return keys.size === choices.length;
}

export function plainText(html) {
  if (!html) return '';
  const node = document.createElement('div');
  node.innerHTML = String(html).replace(/<br\s*\/?\s*>/gi,'\n');
  node.querySelectorAll('script,style,iframe,object,embed').forEach(n=>n.remove());
  return (node.innerText || node.textContent || '').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
}

function normalizeQuestions(q, topic, quiz, stim, imageMap) {
  const type = String(q.type||'choice');
  const choices = Array.isArray(q.choices) ? q.choices.map(x=>({
    letter:String(x.letter||''), html:replaceImages(x.body_html||'',imageMap),
    feedbackHtml:replaceImages(x.feedback_html||'',imageMap), correct:!!x.is_correct
  })) : [];
  const right=q.correct_letter||choices.find(x=>x.correct)?.letter||null;
  const rightFeedback=choices.find(x=>x.letter===right)?.feedbackHtml||'';
  const feedback=replaceImages(q.feedback_html||rightFeedback||'',imageMap);
  const hasExplanation=!!plainText(feedback);
  const badChoices=(type==='choice' && (!right || !choices.length || !uniqueChoiceText(choices)));
  return {
    id:`practice:${q.item_id}`,
    itemId:String(q.item_id||''), qid:String(q.qid||''),
    type, subject:topic, module:quiz, moduleNo:moduleNumber(quiz),
    position:Number(q.position||0),
    stemHtml:replaceImages(q.stem_html||'',imageMap),
    stemText:plainText(q.stem_html||''),
    stimulusHtml:replaceImages(stim?.body_html||'',imageMap),
    stimulusTitle:stim?.title||'案例材料',
    choices, answer:right, feedbackHtml:feedback,
    hasExplanation, autoScore:type==='choice'&&!badChoices,
    hasPotentialIssue:badChoices || (!feedback && type!=='choice'),
  };
}
function replaceImages(html,map){
  let text=String(html||'');
  if(!text || !map) return text;
  for(const [url,data] of Object.entries(map)){
    if(text.includes(url)) text=text.split(url).join(data);
    const plain=url.split('?')[0];
    // Source sometimes omits the time-limited query string.
    if(text.includes(plain) && url !== plain) text=text.split(plain).join(data);
  }
  return text;
}

export async function parsePracticeZip(file,onProgress=()=>{}) {
  if(!file || file.size>MAX_ZIP_BYTES) throw new Error('ZIP 文件过大，已超过 75 MB 安全上限');
  onProgress('解压并读取题库结构…');
  const zip=await JSZip.loadAsync(file);
  const files=Object.keys(zip.files).filter(n=>!zip.files[n].dir);
  const jsonNames=files.filter(n=>n.endsWith('.json')&&!n.startsWith('LaTeX/')&&!n.includes('/__MACOSX/'));
  if(!jsonNames.length) throw new Error('没有找到模块 JSON 文件，请选择原始 practice.zip');
  const all=[],modules=[], imageMap={};
  if(zip.file('LaTeX/images/map.json')){
    try{
      const src=JSON.parse(await zip.file('LaTeX/images/map.json').async('string'));
      for(const [url,winPath] of Object.entries(src)){
        const name=String(winPath).replace(/\\/g,'/').split('/').pop();
        const img=zip.file(`LaTeX/images/${name}`);
        if(img){const b64=await img.async('base64'); imageMap[url]=`data:image/png;base64,${b64}`;}
      }
    }catch(e){console.warn('Image map could not be imported:',e);}
  }
  onProgress(`发现 ${jsonNames.length} 个题目模块，正在核对题号与答案…`);
  const seen=new Set();
  for(const path of jsonNames){
    const entry=zip.file(path);if(entry._data?.uncompressedSize>MAX_JSON_BYTES) throw new Error(`单模块文件过大：${path}`);
    let d;
    try{d=JSON.parse(await entry.async('string'));}catch{throw new Error(`JSON 解析失败：${path}`);}
    if(!Array.isArray(d.questions)) continue;
    const topic=path.split('/')[0];
    if(!VALID_SUBJECTS.has(topic)) continue;
    const quiz=String(d.quiz||path.split('/').pop().replace(/\.json$/,''));
    const stimuli=d.stimuli||{};
    for(const q of d.questions){
      if(!q.item_id || seen.has(String(q.item_id))) throw new Error(`题号缺失/重复：${q.item_id||path}`);
      seen.add(String(q.item_id));
      const item=normalizeQuestions(q,topic,quiz,q.stimulus_id?stimuli[String(q.stimulus_id)]:null,imageMap);
      all.push(item);
      if(all.length>MAX_ITEMS)throw new Error('题量超过上限，请检查输入文件');
    }
    modules.push({subject:topic,title:quiz,number:moduleNumber(quiz),count:d.questions.length});
  }
  const rank=Object.fromEntries(SUBJECTS.map((s,i)=>[s.id,i]));
  all.sort((a,b)=>(rank[a.subject]-rank[b.subject])||a.moduleNo-b.moduleNo||a.module.localeCompare(b.module)||a.position-b.position);
  modules.sort((a,b)=>(rank[a.subject]-rank[b.subject])||a.number-b.number||a.title.localeCompare(b.title));
  const bySubject=Object.fromEntries(SUBJECTS.map(x=>[x.id,all.filter(q=>q.subject===x.id).length]));
  const countChoice=all.filter(q=>q.autoScore).length;
  const countOpen=all.filter(q=>!q.autoScore).length;
  if(all.length<500) throw new Error(`只解析到 ${all.length} 题；请检查是否选择了完整的 practice.zip`);
  onProgress(`完成：${all.length} 题，${modules.length} 个模块`);
  return {
    version:2,id:'practice-2026-v2',name:'2026 CFA Level I · Practice',source:'practice.zip',
    importedAt:new Date().toISOString(),questions:all,modules,
    stats:{count:all.length,autoScored:countChoice,manual:countOpen,bySubject},
  };
}

export function inspectQuestion(q){
  const note=noteFor(q.subject,q.module);
  const stem=plainText(q.stemHtml);
  const kind=/\b(calculate|compute|what is the value|closest to|approximately|determine the price|estimate)\b/i.test(stem)?'计算/估值':
    /\b(most likely|least likely|most appropriate|best|least appropriate)\b/i.test(stem)?'最佳判断/排除':
    /\b(which|what|how|why|define|describes)\b/i.test(stem)?'概念辨析/应用':'情景应用/模型选择';
  return {type:kind, ...note,
    path:`${note.subjectZh} → ${note.moduleZh} → ${kind} → 正确选项的经济含义与适用边界`};
}

export function sourceAnswerText(q){
  const expl=plainText(q.feedbackHtml);
  const opt=q.choices.find(c=>c.letter===q.answer);
  return expl || (opt ? `The correct choice is ${q.answer}: ${plainText(opt.html)}` : 'No English explanation was supplied.');
}

export function chineseFramework(q){
 const n=inspectQuestion(q);
 const correct=q.choices.find(c=>c.letter===q.answer);
 const opt=correct?plainText(correct.html).replace(/^[A-Z]\.\s*/,''):'';
 const limitations=(!q.hasExplanation?'原始文件中缺少可用的英文依据，不能凭空给出逐题证明。':'原题英文解析保留在下方，可逐句核查来源。');
 const answer=q.answer?`原题参考答案为 ${q.answer}${opt?`（原文选项：${opt}）`:''}。`:'';
 return `${answer}\n识别：这是“${n.moduleZh}”中的${n.type}问题。\n高观点：${n.overview}\n推理次序：${n.chain}。\n易错边界：${n.boundaries}\n来源说明：${limitations}`;
}
