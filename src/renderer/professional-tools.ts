import {filterFormulas,matchingPlacements,formulaPlacements,PROFESSIONAL_FORMULAS,SUBJECT_NAMES,LEVEL_NAMES,type FormulaSubject,type FormulaLevel,type FormulaDefinition} from '../core/professional-formulas';
import {parseTemplate} from '../core/templates';
import {PSEUDOCODE_EXAMPLES,emptyPseudocode,type PseudocodeState} from '../core/pseudocode';
import {PseudocodeEditor} from './pseudocode-editor';
import {DEFAULT_IMAGE_STYLE} from '../core/image-style';
import type {SourceEditor} from './editor';
import type {initializePanelManager} from './panel-manager';
import type {ActionReply,AppState} from '../shared/types';
import './pseudocode.css';
const element=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
type Panels=ReturnType<typeof initializePanelManager>;
export function initializeProfessionalTools(editor:SourceEditor,isBusy:()=>boolean,notify:(message:string,error?:boolean)=>void,changed:()=>void,performAction:(callback:()=>Promise<ActionReply>)=>Promise<void>){
  element('templates-open').textContent='公式模板库';
  document.querySelector('.toolstrip')!.insertAdjacentHTML('afterbegin','<div class="work-modes" role="group" aria-label="工作模式"><button id="mode-formula" aria-pressed="true">公式</button><button id="mode-pseudocode" aria-pressed="false">伪代码</button></div>');
  document.body.insertAdjacentHTML('beforeend',`<section id="templates-panel" class="drawer professional-drawer" hidden aria-label="专业公式模板库">
    <div class="drawer-heading"><h2>公式模板库</h2><button id="templates-close" class="secondary">关闭</button></div>
    <p class="muted">按专业查找，插入后 Tab 填写变量。可同时选择多个专业；未勾选时显示全部。</p>
    <fieldset id="templates-subjects" class="subject-filters"><legend>专业模块</legend></fieldset>
    <label for="templates-query">搜索公式</label><input id="templates-query" placeholder="例如 梁弯曲、Arrhenius、NPV、米氏方程、PID" maxlength="256">
    <div class="setting-row"><label>主题<select id="templates-topic"><option value="">全部主题</option></select></label><label>难度<select id="templates-level"><option value="">全部难度</option><option value="basic">基础</option><option value="advanced">进阶</option></select></label></div>
    <div class="setting-row"><p id="templates-count" role="status"></p><button id="templates-chemical" class="secondary">化学表达式</button><button id="templates-pseudocode" class="secondary">打开伪代码编辑器</button></div>
    <div class="template-browser"><div id="templates-list" role="listbox" aria-label="公式列表" tabindex="0"></div><article id="templates-detail" aria-label="公式详情"><h3 id="template-title"></h3><p id="template-memberships" class="muted"></p><div id="template-preview" class="history-preview"></div><h4>变量说明</h4><dl id="template-fields"></dl><h4>适用条件</h4><p id="template-conditions"></p><h4>参考来源</h4><p id="template-reference"></p></article></div>
    <div id="templates-status" role="status" aria-live="polite"></div><div class="setting-row"><button id="template-insert" disabled>插入并填写</button><button id="template-rebind" class="secondary">使用当前位置</button></div>
  </section>
  <section id="pseudocode-panel" class="drawer professional-drawer" hidden aria-label="伪代码编辑器">
    <div class="drawer-heading"><h2>伪代码</h2><button id="pseudo-close" class="secondary">返回公式模式</button></div>
    <p class="muted">独立保存编辑内容 · Tab 缩进 · Shift+Tab 反缩进 · Enter 延续缩进 · Ctrl+Z 撤销</p>
    <div class="setting-row"><label>算法示例<select id="pseudo-example"></select></label><button id="pseudo-load" class="secondary">加载示例</button><label class="inline-check"><input id="pseudo-numbers" type="checkbox" checked>显示行号</label></div><p id="pseudo-description" class="muted"></p>
    <div class="pseudo-workspace"><section><label for="pseudo-source">伪代码源码</label><textarea id="pseudo-source" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="INPUT 数据\nFOR 每个元素\n  // 用 $…$ 嵌入公式\nEND FOR"></textarea><p id="pseudo-count" class="muted"></p></section>
    <section><p class="pseudo-preview-label">排版预览</p><div id="pseudo-preview" class="history-preview" aria-label="伪代码预览"></div><div id="pseudo-status" role="status" aria-live="polite"></div></section></div>
    <details><summary>语法提示与限制</summary><p>INPUT / OUTPUT 输入输出；FUNCTION / END FUNCTION 定义函数；IF / ELSE / END IF 条件；FOR / END FOR、WHILE / END WHILE 循环；RETURN 返回。// 后写注释。</p><p>每级两空格；结构不会自动补齐。用单个 $ 包围同一行中的公式，用 \\$ 输入美元符号。最多 16000 个 UTF-16 单元、200 行。不运行算法。</p></details>
    <div class="setting-row pseudo-actions"><button id="pseudo-copy-text" class="secondary">复制纯文本</button><button id="pseudo-copy-image" disabled>复制图片</button><button id="pseudo-save" class="secondary" disabled>保存 PNG</button></div>
  </section>`);
  for(const [subject,name] of Object.entries(SUBJECT_NAMES)){const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.name='formula-subject';checkbox.value=subject;label.append(checkbox,document.createTextNode(name));element('templates-subjects').append(label);}
  let panels:Panels;
  let selected:FormulaDefinition|undefined;
  let matches:FormulaDefinition[]=[];
  let target={version:editor.version,start:0,end:0};
  let generation=0;
  let previewGeneration=0;
  let pseudoValid=false;
  let pseudoPending=false;
  let pseudoTimer:ReturnType<typeof setTimeout>;
  let currentPreviewKey='';
  let lastPseudoState=emptyPseudocode();
  const source=element<HTMLTextAreaElement>('source');
  const pseudoSource=element<HTMLTextAreaElement>('pseudo-source');
  const numbers=element<HTMLInputElement>('pseudo-numbers');
  function status(id:string,message:string,error=false){element(id).textContent=message;element(id).classList.toggle('error',error);}
  const pseudocode=new PseudocodeEditor(pseudoSource,numbers,()=>{const state=pseudocode.state();const contentChanged=state.text!==lastPseudoState.text||state.lineNumbers!==lastPseudoState.lineNumbers;lastPseudoState=state;changed();if(contentChanged)schedulePseudo();},message=>status('pseudo-status',message,true));
  const checkedSubjects=()=>Array.from(document.querySelectorAll<HTMLInputElement>('input[name="formula-subject"]:checked')).map(input=>input.value as FormulaSubject);
  function bindTarget(){target={version:editor.version,start:source.selectionStart,end:source.selectionEnd};status('templates-status','插入位置已绑定当前源码选区。');}
  function topics(){const select=element<HTMLSelectElement>('templates-topic');const previous=select.value;const subjects=checkedSubjects();select.replaceChildren(new Option('全部主题',''));for(const topic of new Set(PROFESSIONAL_FORMULAS.flatMap(formulaPlacements).filter(placement=>!subjects.length||subjects.includes(placement.subject)).map(placement=>placement.topic)))select.add(new Option(topic,topic));select.value=Array.from(select.options).some(option=>option.value===previous)?previous:'';}
  async function detail(){
    const token=++generation;
    element<HTMLButtonElement>('template-insert').disabled=true;
    element('templates-detail').hidden=!selected;
    element('template-preview').replaceChildren();
    if(!selected)return;
    element('template-title').textContent=selected.title;
    element('template-memberships').textContent=formulaPlacements(selected).map(placement=>`${SUBJECT_NAMES[placement.subject]} · ${placement.topic} · ${LEVEL_NAMES[placement.level]}`).join('；');
    const parsed=parseTemplate(selected.template);
    const fields=element('template-fields');fields.replaceChildren();
    for(const field of selected.fields){const term=document.createElement('dt');const description=document.createElement('dd');const position=parsed.fields.find(candidate=>candidate.index===field.index)!;term.textContent=parsed.text.slice(position.start,position.end);description.textContent=field.description;fields.append(term,description);}
    element('template-conditions').textContent=selected.conditions;
    const reference=element('template-reference');reference.replaceChildren();const label=document.createElement('span');label.textContent=`${selected.reference.title} · ${selected.reference.section}`;const link=document.createElement('code');link.textContent=selected.reference.url;reference.append(label,link);
    try{const reply=await window.math.preview(parsed.text);if(token!==generation)return;if(reply.kind!=='unicode'&&reply.kind!=='formula')throw new Error('message'in reply?reply.message:'预览服务不可用。');element('template-preview').innerHTML=reply.html;element<HTMLButtonElement>('template-insert').disabled=isBusy();}
    catch(error){if(token===generation)status('templates-status',String(error),true);}
  }
  function selectFormula(index:number,focus=false){selected=matches[index];for(const [position,child] of Array.from(element('templates-list').children).entries()){child.setAttribute('aria-selected',String(position===index));(child as HTMLElement).tabIndex=position===index?0:-1;}if(focus)(element('templates-list').children[index] as HTMLElement)?.focus();void detail();}
  function search(){
    const previous=selected?.id;
    const filter={query:element<HTMLInputElement>('templates-query').value,subjects:checkedSubjects(),topic:element<HTMLSelectElement>('templates-topic').value,level:element<HTMLSelectElement>('templates-level').value as FormulaLevel|''};
    matches=filterFormulas(filter);
    const list=element('templates-list');list.replaceChildren();
    matches.forEach((formula,index)=>{const button=document.createElement('button');button.type='button';button.role='option';button.dataset.formulaId=formula.id;const title=document.createElement('strong');title.textContent=formula.title;const description=document.createElement('small');description.textContent=matchingPlacements(formula,filter).map(placement=>`${SUBJECT_NAMES[placement.subject]} · ${placement.topic} · ${LEVEL_NAMES[placement.level]}`).join('；');button.append(title,description);button.addEventListener('click',()=>selectFormula(index));button.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowDown')next=Math.min(matches.length-1,index+1);else if(event.key==='ArrowUp')next=Math.max(0,index-1);else if(event.key==='Home')next=0;else if(event.key==='End')next=matches.length-1;else return;event.preventDefault();selectFormula(next,true);});list.append(button);});
    element('templates-count').textContent=`${matches.length} 个模板`;
    if(!matches.length){const empty=document.createElement('p');empty.textContent='没有匹配模板，请调整专业、主题或关键词。';list.append(empty);}
    const subjects=checkedSubjects();element('templates-pseudocode').hidden=subjects.length>0&&!subjects.includes('computer');element('templates-chemical').hidden=subjects.length>0&&!subjects.includes('chemistry');
    selectFormula(Math.max(0,matches.findIndex(formula=>formula.id===previous)));
  }
  function openLibrary(){if(isBusy())return;editor.close();bindTarget();topics();search();panels.open('templates-panel');requestAnimationFrame(()=>element('templates-query').focus());}
  function pseudoButtons(){const busy=isBusy()||pseudoPending;for(const id of ['pseudo-copy-image','pseudo-save'])element<HTMLButtonElement>(id).disabled=busy||pseudocode.isComposing||!pseudoValid;for(const id of ['pseudo-copy-text','pseudo-load'])element<HTMLButtonElement>(id).disabled=busy||pseudocode.isComposing||(!pseudoSource.value.trim()&&id==='pseudo-copy-text');pseudoSource.disabled=busy;numbers.disabled=busy;}
  function schedulePseudo(){
    previewGeneration++;pseudoValid=false;clearTimeout(pseudoTimer);pseudoButtons();
    element('pseudo-count').textContent=`${pseudoSource.value.length} / 16000 · ${pseudoSource.value.split('\n').length} / 200 行`;
    const key=JSON.stringify([pseudoSource.value,numbers.checked]);if(currentPreviewKey!==key)element('pseudo-preview').replaceChildren();
    pseudoTimer=setTimeout(()=>void previewPseudo(),120);
  }
  async function previewPseudo(){
    const token=previewGeneration;const text=pseudoSource.value;const lineNumbers=numbers.checked;
    if(!text.trim()){status('pseudo-status','输入伪代码，或加载一个算法示例。');pseudoValid=false;pseudoButtons();return;}
    try{
      const result=await window.math.previewPseudocode(text,lineNumbers);if(token!==previewGeneration||pseudocode.isComposing)return;
      if(!('errors'in result))throw new Error((result as unknown as ActionReply).message||'预览服务不可用。');
      element('pseudo-preview').innerHTML=result.html;currentPreviewKey=JSON.stringify([text,lineNumbers]);pseudoValid=!result.errors.length;
      status('pseudo-status',result.errors.length?result.errors.map(error=>`${error.line?`第 ${error.line} 行：`:''}${error.message}`).join('\n'):'预览已更新 · 可复制文本、图片或保存 PNG。',!!result.errors.length);
    }catch(error){if(token===previewGeneration){pseudoValid=false;status('pseudo-status',String(error),true);}}
    if(token===previewGeneration)pseudoButtons();
  }
  function openPseudo(){if(isBusy())return;editor.close();panels.open('pseudocode-panel');schedulePseudo();requestAnimationFrame(()=>pseudoSource.focus());}
  function applyStyle(state:Pick<AppState,'imageStyle'>){const style=state.imageStyle;for(const id of ['pseudo-preview','template-preview'])Object.assign(element(id).style,{fontSize:`${style.fontSize}px`,color:style.foreground,background:style.background==='transparent'?'repeating-conic-gradient(#edf0f7 0% 25%,#fff 0% 50%) 0 0 / 16px 16px':style.background,padding:`${style.padding}px`});pseudoButtons();}
  const examples=element<HTMLSelectElement>('pseudo-example');for(const example of PSEUDOCODE_EXAMPLES)examples.add(new Option(example.title,example.id));
  function exampleDescription(){element('pseudo-description').textContent='所选示例：'+PSEUDOCODE_EXAMPLES.find(example=>example.id===examples.value)!.description;}
  examples.addEventListener('change',exampleDescription);exampleDescription();
  element('pseudo-load').addEventListener('click',()=>{if(isBusy()||pseudoPending)return;const example=PSEUDOCODE_EXAMPLES.find(candidate=>candidate.id===examples.value)!;if(pseudoSource.value.trim()&&pseudoSource.value!==example.source&&!confirm('用示例替换当前伪代码？可用 Ctrl+Z 撤销。'))return;pseudocode.load(example.source);});
  pseudoSource.addEventListener('compositionstart',()=>{previewGeneration++;pseudoValid=false;clearTimeout(pseudoTimer);pseudoButtons();});
  pseudoSource.addEventListener('compositionend',()=>{schedulePseudo();});
  for(const [id,action] of [['pseudo-copy-text','copy-text'],['pseudo-copy-image','copy-image'],['pseudo-save','save-png']] as const)element(id).addEventListener('click',()=>{
    if(isBusy()||pseudoPending||pseudocode.isComposing||action!=='copy-text'&&!pseudoValid)return;
    const text=pseudoSource.value;const lineNumbers=numbers.checked;pseudoPending=true;pseudoButtons();
    void performAction(async()=>{const reply=await window.math.outputPseudocode(text,lineNumbers,action);status('pseudo-status',reply.message,!reply.ok);return reply;}).finally(()=>{pseudoPending=false;pseudoButtons();});
  });
  element('templates-open').addEventListener('click',openLibrary);
  element('templates-chemical').addEventListener('click',()=>document.dispatchEvent(new Event('open-chemical-expression')));
  element('templates-close').addEventListener('click',()=>panels.close());
  element('templates-query').addEventListener('input',search);
  for(const id of ['templates-topic','templates-level'])element(id).addEventListener('change',search);
  for(const input of document.querySelectorAll<HTMLInputElement>('input[name="formula-subject"]'))input.addEventListener('change',()=>{topics();search();});
  element('template-rebind').addEventListener('click',bindTarget);
  element('template-insert').addEventListener('click',()=>{if(isBusy()||!selected)return;if(editor.insertTemplate(selected.template,target.version,target.start,target.end)){panels.close();editor.focusTemplate();}else status('templates-status','源码已变化，请点击“使用当前位置”重新绑定后插入。',true);});
  element('mode-pseudocode').addEventListener('click',openPseudo);element('templates-pseudocode').addEventListener('click',openPseudo);
  element('mode-formula').addEventListener('click',()=>{if(!isBusy()){panels.close();source.focus();}});
  element('pseudo-close').addEventListener('click',()=>{if(!pseudoPending)panels.close();});
  window.math.onState(applyStyle);applyStyle({imageStyle:DEFAULT_IMAGE_STYLE});void window.math.state().then(applyStyle);
  return {attachPanels(value:Panels){panels=value;},snapshot:()=>pseudocode.state(),isComposing:()=>pseudocode.isComposing,restore(state?:PseudocodeState){pseudocode.restore(state);lastPseudoState=pseudocode.state();schedulePseudo();},clear(){pseudocode.restore();lastPseudoState=pseudocode.state();schedulePseudo();}};
}
