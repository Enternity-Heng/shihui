import 'katex/dist/katex.min.css';
import './style.css';
import './workbench.css';
import type { AppState, MathBridge, RenderReply, ActionReply } from '../shared/types';
import {SourceEditor} from './editor';
import {initializePanels} from './panels';
import {DEFAULT_IMAGE_STYLE} from '../core/image-style';
import {initializeExtensions} from './extensions';
import {initializeUI} from './ui';
declare global { interface Window { math: MathBridge } }
const el = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const source = el<HTMLTextAreaElement>('source');
const preview = el('preview');
let appState: AppState;
let rendered: RenderReply | null = null;
let generation = 0;
let busy = false;
let booting=true;
let submitting = false;
let recognizing = false;
let composing = false;
let compositionEnded = 0;
let debounce: ReturnType<typeof setTimeout>;
function message(text:string,error = false) { const box = el('message'); box.textContent = text; box.classList.toggle('error',error); }
const editor=new SourceEditor(source,el('completion'),el<HTMLInputElement>('completion-query'),el('completion-list'),message);
const extensions=initializeExtensions(editor,()=>busy||booting,message,action);
initializePanels(editor,()=>busy||booting,message,reuseFavorite,()=>rendered&&(rendered.result.kind==='unicode'||rendered.result.kind==='formula')?rendered.result.source:null);
initializeUI();
const dirtySettings=new Set<string>();
el('settings').addEventListener('input',event=>{const id=(event.target as HTMLElement).id;if(id)dirtySettings.add(id);});
function setSetting(id:string,value:string|boolean){if(dirtySettings.has(id))return;const input=el<HTMLInputElement>(id);if(typeof value==='boolean')input.checked=value;else input.value=value;}
function buttons() {
  const valid = rendered?.result.kind === 'unicode' || rendered?.result.kind === 'formula';
  for (const id of ['copy-source','save-image','copy-image']) el<HTMLButtonElement>(id).disabled = busy || !valid;
  const primary = el<HTMLButtonElement>('primary');
  primary.disabled = busy || booting || !valid;
  const formula=rendered?.result.kind==='formula';
  primary.textContent = busy ? '处理中…' : formula ? (appState?.target?'插入图片 ⌃↵':'复制图片') : (appState?.target ? '插入符号 ↵' : '复制符号');
  source.disabled = busy||booting;
  for(const id of ['ocr-open','ocr-paste','ocr-toggle','capture-start','completion-open','templates-open','symbols-open'])el<HTMLButtonElement>(id).disabled=busy;
  el('ocr-cancel').hidden=!recognizing;
  el<HTMLButtonElement>('ocr-cancel').disabled=appState?.operation==='exporting';
  document.querySelectorAll<HTMLButtonElement>('[data-source]').forEach(button => button.disabled = busy);
  document.dispatchEvent(new Event('work-tools-busy'));
}
function updateState(next: AppState) {
  appState = next;
  el('target').textContent = next.target ? `将插入：${next.target}` : '从目标软件按快捷键呼出，即可插入符号';
  el('target').title = next.target ?? '';
  el('shortcut-badge').textContent = next.shortcut.replace('Control','Ctrl').split('+').join(' + ');
  setSetting('shortcut',next.shortcut);
  setSetting('capture-shortcut',next.captureShortcut);
  setSetting('history-enabled',next.historyEnabled);
  setSetting('autocomplete-enabled',next.autocomplete);editor.autocomplete=next.autocomplete;
  el('capture-start').title=next.captureShortcut+(next.captureRegistered?'':'（快捷键未注册，可点击）');
  const style=next.imageStyle;
  setSetting('image-font-size',String(style.fontSize));setSetting('image-foreground',style.foreground);setSetting('image-padding',String(style.padding));setSetting('image-scale',String(style.scale));
  setSetting('image-background',style.background==='transparent'?'transparent':style.background==='#ffffff'?'white':'custom');setSetting('image-background-color',style.background==='transparent'?'#ffffff':style.background);
  Object.assign(preview.style,{fontSize:`${style.fontSize}px`,color:style.foreground,background:style.background==='transparent'?'repeating-conic-gradient(#edf0f7 0% 25%,#fff 0% 50%) 0 0 / 16px 16px':style.background,padding:`${style.padding}px`});
  el('version').textContent = `v${next.version} · 离线运行`;
  if (next.notice) message(next.notice,true);
  buttons();
}
async function renderNow() {
  clearTimeout(debounce);
  const current = ++generation;
  rendered = null; buttons();
  el('count').textContent = `${source.value.length} / 4096`;
  el('plain').hidden = true;
  el('kind').textContent = source.value ? '计算中…' : '等待输入';
  el('kind').classList.remove('formula');
  // Never leave an old successful formula looking actionable.
  preview.replaceChildren();
  const loading = document.createElement('p'); loading.className = 'hint'; loading.textContent = source.value ? '正在排版…' : '输入 LaTeX，立即查看符号或公式。'; preview.append(loading);
  try {
    const reply = await window.math.render(source.value);
    if (current !== generation) return;
    if (!reply.result) throw new Error('计算服务暂时不可用，请重新输入。');
    rendered = reply;
    const result = reply.result;
    preview.replaceChildren();
    if (result.kind === 'unicode' || result.kind === 'formula') {
      // This is generated by our isolated, trust-disabled KaTeX worker, not input HTML.
      preview.innerHTML = result.html;
      el('kind').textContent = result.kind === 'unicode' ? '可输入的文字' : '排版公式';
      el('kind').classList.toggle('formula',result.kind === 'formula');
      if (result.kind === 'unicode') { el('plain').hidden = false; el('plain-value').textContent = result.text; }
      message(result.kind === 'unicode' ? (appState.target ? '回车插入符号；Ctrl+Enter 可改为插入图片。' : '点击“复制符号”，或回到目标软件按快捷键呼出。') : (appState.target?'按 Ctrl+Enter 插入图片，目标软件需支持图片粘贴。':'按 Ctrl+Enter 复制图片；要直接插入，请从目标软件按快捷键呼出。'));
    } else {
      const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = result.message; preview.append(hint);
      el('kind').textContent = result.kind === 'empty' ? '等待输入' : result.kind === 'incomplete' ? '等待补全' : '检查源码';
      message(result.kind === 'error' ? '源码尚不能转换，请检查提示。' : '本地处理 · 无需联网 · 历史仅保存在本机',result.kind === 'error');
    }
  } catch (error) { message(String(error),true); }
  buttons();
}
source.addEventListener('input',() => {
  generation++; rendered = null; buttons();
  el('plain').hidden = true;
  el('plain-value').textContent = '';
  preview.replaceChildren();
  el('kind').textContent = '等待排版…';
  el('count').textContent = `${source.value.length} / 4096`;
  el('ocr-image').hidden=true;el<HTMLImageElement>('ocr-image').removeAttribute('src');
  clearTimeout(debounce);
  debounce = setTimeout(() => void renderNow(),120);
});
source.addEventListener('compositionstart',() => { composing = true; });
source.addEventListener('compositionend',() => { composing = false; compositionEnded = Date.now(); });
source.addEventListener('keydown',event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey) {
    if (event.isComposing || composing || event.keyCode === 229 || Date.now() - compositionEnded < 80) return;
    event.preventDefault();
    if (!event.repeat && !busy) void submit(event.ctrlKey?'image':'text');
  }
});
async function submit(mode:'text'|'image') {
  if(submitting||busy)return;
  submitting=true;
  try{
  clearTimeout(debounce);
  if (!rendered) {
    const pending=renderNow(),requestedGeneration=generation;
    await pending;
    if(generation!==requestedGeneration)return;
  }
  if(busy)return;
  if(mode==='image'&&(rendered?.result.kind==='unicode'||rendered?.result.kind==='formula'))await imageAction();
  else if(rendered?.result.kind==='unicode')await primaryAction();
  else if(rendered?.result.kind==='formula')message('此公式需要图片排版，请按 Ctrl+Enter 插入图片。');
  }finally{submitting=false;}
}
document.addEventListener('keydown',event => {
  if(event.ctrlKey&&event.shiftKey&&!event.altKey&&event.code==='KeyV'&&!event.isComposing&&!composing){
    event.preventDefault();if(!event.repeat&&!busy)void recognizeImage('clipboard');return;
  }
  if (event.key === 'Escape' && !event.isComposing && !composing && !busy) {
    if (!el('favorites-panel').hidden) el('favorites-panel').hidden=true;
    else if (!el('history-panel').hidden) el('history-panel').hidden=true;
    else if (!el('settings').hidden) el('settings').hidden = true;
    else void extensions.beforeHide().then(()=>window.math.hide()).catch(error=>message(String(error),true));
  }
});
async function recognizeImage(input:'file'|'clipboard'|'screen'){
  if(busy||booting||!await extensions.captureAllowed())return;
  clearTimeout(debounce);generation++;recognizing=true;busy=true;buttons();
  message('正在识别图片，请稍候；可以点击“取消识别”。');
  el('ocr-panel').hidden=false;el('ocr-image').hidden=true;
  el('ocr-status').textContent=input==='file'?'请选择公式图片…':'正在读取剪贴板…';
  let status='',failed=false;
  try{
    const reply=await window.math.recognizeImage(input);
    status=reply.message;failed=!reply.ok;
    if(reply.ok&&typeof reply.latex==='string'){
      await extensions.recognized(reply,input);
      if(reply.thumbnail){el<HTMLImageElement>('ocr-image').src=reply.thumbnail;el('ocr-image').hidden=false;}
    }
  }catch(error){status=String(error);failed=true;}
  finally{
    recognizing=false;busy=false;el('ocr-status').textContent=failed?'识别未完成':'离线识别 · 图片不上传';
    await renderNow();message(status,failed);if(!extensions.hasReview())source.focus();buttons();
  }
}
el('ocr-toggle').addEventListener('click',()=>{el('ocr-panel').hidden=!el('ocr-panel').hidden;});
el('ocr-open').addEventListener('click',()=>void recognizeImage('file'));
el('ocr-paste').addEventListener('click',()=>void recognizeImage('clipboard'));
el('capture-start').addEventListener('click',()=>void recognizeImage('screen'));
el('completion-open').addEventListener('click',()=>editor.open());
el('symbols-open').addEventListener('click',()=>editor.open(false,true));
window.math.onCaptureRequested(()=>{if(!busy){el('settings').hidden=true;el('history-panel').hidden=true;el('favorites-panel').hidden=true;editor.close();void recognizeImage('screen');}});
el('ocr-cancel').addEventListener('click',()=>void window.math.cancelRecognition());
window.math.onRecognitionProgress(status=>{if(recognizing)el('ocr-status').textContent=status;});
async function action(callback:() => Promise<ActionReply>) {
  if (busy) return;
  busy = true; buttons();
  try { const result = await callback(); message(result.message,!result.ok); }
  catch (error) { message(String(error),true); }
  finally { busy = false; buttons(); }
}
async function reuseFavorite(text:string){
  if(busy||submitting)return;submitting=true;
  try{if(!editor.set(text,'favorite'))return;clearTimeout(debounce);const pending=renderNow(),version=generation;await pending;if(version!==generation||busy)return;if(rendered?.result.kind==='unicode'||rendered?.result.kind==='formula')await primaryAction();else message('收藏源码无法转换，请回填编辑后检查。',true);}finally{submitting=false;}
}
async function primaryAction() {
  const id = rendered?.id;
  if (id === undefined) return;
  if(rendered?.result.kind==='formula'){await imageAction();return;}
  await action(() => appState.target ? window.math.insert(id) : window.math.copy(id,'text'));
}
async function imageAction(){
  const id=rendered?.id;
  if(id===undefined)return;
  await action(()=>appState.target?window.math.insertImage(id):window.math.copy(id,'image'));
}
el('primary').addEventListener('click',() => void primaryAction());
for (const [id,type] of [['copy-source','source'],['copy-image','image']] as const) el(id).addEventListener('click',() => { if (rendered) { const id = rendered.id; void action(() => window.math.copy(id,type)); } });
el('save-image').addEventListener('click',() => { if (rendered) { const id = rendered.id; void action(() => window.math.save(id)); } });
el('hide').addEventListener('click',() => { if (!busy) void extensions.beforeHide().then(()=>window.math.hide()).catch(error=>message(String(error),true)); });
el('settings-toggle').addEventListener('click',() => {editor.close();el('history-panel').hidden=true;el('favorites-panel').hidden=true;el('settings').hidden = !el('settings').hidden; });
el('save-shortcut').addEventListener('click',() => void action(async() => {const r=await window.math.shortcut(el<HTMLInputElement>('shortcut').value.trim());if(r.ok)dirtySettings.delete('shortcut');return r;}));
el('save-capture-shortcut').addEventListener('click',()=>void action(async()=>{const r=await window.math.preferences({captureShortcut:el<HTMLInputElement>('capture-shortcut').value.trim()});if(r.ok)dirtySettings.delete('capture-shortcut');return r;}));
for(const [id,key] of [['history-enabled','historyEnabled'],['autocomplete-enabled','autocomplete']] as const)el(id).addEventListener('change',()=>void action(async()=>{const result=await window.math.preferences({[key]:el<HTMLInputElement>(id).checked});if(result.ok)dirtySettings.delete(id);updateState(await window.math.state());return result;}));
el('save-image-style').addEventListener('click',()=>void action(async()=>{const background=el<HTMLSelectElement>('image-background').value;const result=await window.math.preferences({imageStyle:{fontSize:Number(el<HTMLInputElement>('image-font-size').value),foreground:el<HTMLInputElement>('image-foreground').value,background:background==='transparent'?'transparent':background==='white'?'#ffffff':el<HTMLInputElement>('image-background-color').value,padding:Number(el<HTMLInputElement>('image-padding').value),scale:Number(el<HTMLSelectElement>('image-scale').value)}});el('settings-status').textContent=result.message;if(result.ok)for(const id of ['image-font-size','image-foreground','image-padding','image-scale','image-background','image-background-color'])dirtySettings.delete(id);updateState(await window.math.state());return result;}));
el('reset-image-style').addEventListener('click',()=>void action(async()=>{const result=await window.math.preferences({imageStyle:{...DEFAULT_IMAGE_STYLE}});el('settings-status').textContent=result.message;updateState(await window.math.state());return result;}));
document.querySelectorAll<HTMLButtonElement>('[data-source]').forEach(button => button.addEventListener('click',() => {
  if (busy) return;
  editor.set(button.dataset.source!,'example'); clearTimeout(debounce); void renderNow(); source.focus();
}));
window.math.onState(updateState);
window.math.onOpen(settings => {
  if(booting)return;
  if(extensions.panels.current()&&!settings)return;
  el('settings').hidden = !settings;
  if (settings) el<HTMLInputElement>('shortcut').focus(); else { source.focus(); source.select(); }
});
buttons();
void window.math.state().then(async value => {updateState(value);const restored=await extensions.restore(value.draftEnabled);booting=false;buttons();if(!extensions.panels.current()){source.focus();if(!restored)source.select();}await renderNow();}).catch(error=>{booting=false;buttons();message(String(error),true);});
