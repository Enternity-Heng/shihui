import {EditHistory,type EditSnapshot} from '../core/editing';
import {BUILTIN_COMMANDS} from '../core/catalog';
import {commandRange,parseTemplate,searchCommands,type CommandCandidate,type Field} from '../core/templates';
import {linkEdit,type LinkedState} from '../core/linked-fields';
import type {CustomCommand} from '../shared/types';
export class SourceEditor {
  private history=new EditHistory();private previous:EditSnapshot;private before:EditSnapshot|null=null;private internal=false;private composing=false;private compositionBefore:EditSnapshot|null=null;
  private fields:Field[]=[];private fieldIndex=0;private finalCursor=0;private templateStart=0;private templateEnd=0;
  private items:CommandCandidate[]=[...BUILTIN_COMMANDS];private candidates:CommandCandidate[]=[];private selected=0;private range:{start:number;end:number}|null=null;private manual=false;
  private formulaOnly=false;
  private symbolOnly=false;
  autocomplete=true;
  version=0;
  get isComposing(){return this.composing;}
  snapshotState(){return {...this.snapshot(),linked:this.fields.length?{fields:this.fields.map(f=>({...f})),start:this.templateStart,end:this.templateEnd,cursor:this.finalCursor}:null};}
  restoreState(value:EditSnapshot&{linked?:LinkedState|null}){this.apply(value);if(value.linked){this.fields=value.linked.fields.map(f=>({...f}));this.templateStart=value.linked.start;this.templateEnd=value.linked.end;this.finalCursor=value.linked.cursor;this.fieldIndex=0;}this.history=new EditHistory();}
  insert(text:string,expected:number,start:number,end:number){if(this.source.disabled||this.isComposing||this.version!==expected){this.info('源码已变化或正在处理，请重新选择插入位置后打开填写器。',true);return false;}if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>this.source.value.length)return false;return this.set(this.source.value.slice(0,start)+text+this.source.value.slice(end),'structure',start+text.length);}
  insertTemplate(value:string,expected:number,start:number,end:number){
    if(this.source.disabled||this.isComposing||this.version!==expected){this.info('源码已变化或正在处理，请重新绑定插入位置。',true);return false;}
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>this.source.value.length)return false;
    try{
      const template=parseTemplate(value);
      const text=this.source.value.slice(0,start)+template.text+this.source.value.slice(end);
      if(!this.set(text,'template',start+template.cursor))return false;
      this.templateStart=start;this.templateEnd=start+template.text.length;this.finalCursor=start+template.cursor;
      this.fields=template.fields.map(field=>({...field,start:field.start+start,end:field.end+start}));this.fieldIndex=0;
      this.focusTemplate();this.source.dispatchEvent(new Event('editor-template-change',{bubbles:true}));return true;
    }catch(error){this.info(String(error),true);return false;}
  }
  focusTemplate(){this.source.focus();if(this.fields.length)this.selectField();else this.source.setSelectionRange(this.finalCursor,this.finalCursor);}
  private changed(){this.version++;this.source.dispatchEvent(new Event('editor-change',{bubbles:true}));}
  constructor(private source:HTMLTextAreaElement,private popup:HTMLElement,private search:HTMLInputElement,private list:HTMLElement,private info:(text:string,error?:boolean)=>void){
    this.previous=this.snapshot();
    source.addEventListener('beforeinput',event=>{
      if(event.inputType==='historyUndo'||event.inputType==='historyRedo'){event.preventDefault();this.restore(event.inputType==='historyRedo');return;}
      if(!this.composing)this.before=this.snapshot();
    });
    source.addEventListener('input',event=>{
      if(this.internal)return;if(this.composing){event.stopImmediatePropagation();return;}
      const before=this.before??this.previous;this.before=null;
      if(source.value.length>4096){event.stopImmediatePropagation();this.apply(before);this.info('源码不能超过 4096 个 UTF-16 单元，已保留原内容。',true);return;}
      if(before.text!==source.value){if(!this.adjustFields(before)){event.stopImmediatePropagation();return;}const kind=(event as InputEvent).inputType;this.history.push(before,kind==='insertText'||(before.start===before.end&&kind?.startsWith('deleteContent'))?'typing':'edit');this.changed();}
      this.previous=this.snapshot();this.suggest();
    });
    source.addEventListener('compositionstart',()=>{this.composing=true;this.compositionBefore=this.snapshot();this.close();});
    source.addEventListener('compositionend',()=>{this.composing=false;const old=this.compositionBefore;this.compositionBefore=null;this.before=null;if(old&&source.value.length>4096){this.apply(old);this.info('源码超过长度限制，已保留组字前内容。',true);return;}if(old&&old.text!==source.value){if(!this.adjustFields(old))return;this.history.push(old,'composition');this.changed();}this.previous=this.snapshot();this.internal=true;source.dispatchEvent(new Event('input',{bubbles:true}));this.internal=false;});
    source.addEventListener('keydown',event=>this.key(event));search.addEventListener('keydown',event=>this.key(event));
    search.addEventListener('input',()=>this.show(search.value));
    source.addEventListener('pointerdown',()=>this.history.breakGroup());
    source.addEventListener('focus',()=>this.history.breakGroup());
    source.addEventListener('click',()=>{this.cancelIfOutside();this.suggest();});
    source.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){this.history.breakGroup();this.cancelIfOutside();this.suggest();}});
    document.addEventListener('pointerdown',event=>{if(event.target!==source&&!popup.contains(event.target as Node)&&!(event.target as HTMLElement).closest('#completion-open,#templates-open,#symbols-open'))this.close();});
  }
  private snapshot():EditSnapshot{return {text:this.source.value,start:this.source.selectionStart,end:this.source.selectionEnd};}
  setCommands(commands:CustomCommand[]){this.items=[...BUILTIN_COMMANDS,...commands.map(c=>({...c,custom:true}))];this.close();}
  set(text:string,kind='replace',start=text.length,end=start){
    if(text.length>4096){this.info('源码不能超过 4096 个 UTF-16 单元。',true);return false;}
    this.history.push(this.snapshot(),kind);this.fields=[];this.apply({text,start,end});return true;
  }
  private apply(value:EditSnapshot){this.internal=true;this.source.value=value.text;this.source.setSelectionRange(value.start,value.end);this.before=null;this.previous=this.snapshot();this.close();this.changed();this.source.dispatchEvent(new Event('input',{bubbles:true}));this.internal=false;}
  private restore(redo:boolean){const snapshot=redo?this.history.redo(this.snapshot()):this.history.undo(this.snapshot());this.fields=[];if(snapshot)this.apply(snapshot);}
  close(){this.popup.hidden=true;this.candidates=[];this.manual=false;this.formulaOnly=false;this.symbolOnly=false;this.source.removeAttribute('aria-activedescendant');this.source.setAttribute('aria-expanded','false');}
  open(formulas=false,symbols=false){if(this.source.disabled)return;this.range=commandRange(this.source.value,this.source.selectionStart,this.source.selectionEnd)??{start:this.source.selectionStart,end:this.source.selectionEnd};this.manual=true;this.formulaOnly=formulas;this.symbolOnly=symbols;this.search.hidden=false;this.search.value='';this.search.placeholder=symbols?'中文搜索：阿尔法、不等于、属于、偏导、右箭头':formulas?'搜索公式模板，例如 求根、勾股、泰勒、正态分布':'搜索命令或中文关键词，例如 分式';this.show('');this.search.focus();}
  private suggest(){if(this.composing||this.source.disabled||!this.autocomplete){this.close();return;}const range=commandRange(this.source.value,this.source.selectionStart,this.source.selectionEnd);if(!range){this.close();return;}this.range=range;this.manual=false;this.search.hidden=true;this.show(range.query);}
  private show(query:string){
    this.candidates=searchCommands(this.symbolOnly?this.items.filter(item=>item.symbol):this.formulaOnly?this.items.filter(item=>item.formula):this.items,query);this.selected=0;this.list.replaceChildren();
    if(!this.candidates.length){if(this.manual){const empty=document.createElement('p');empty.textContent='没有匹配命令';this.list.append(empty);}else{this.close();return;}}
    this.candidates.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.role='option';button.id=`candidate-${index}`;const name=document.createElement('strong');name.textContent=item.name;const detail=document.createElement('span');detail.textContent=`${item.custom?'自定义 · ':''}${item.description}`;const sample=document.createElement('small');sample.textContent=parseTemplate(item.template).text;button.append(name,detail,sample);button.addEventListener('pointerdown',event=>event.preventDefault());button.addEventListener('click',()=>this.accept(index));this.list.append(button);});
    this.popup.hidden=false;const bounds=this.source.getBoundingClientRect();const height=Math.min(300,innerHeight-24);Object.assign(this.popup.style,{left:`${Math.max(12,bounds.left)}px`,width:`${Math.min(bounds.width,innerWidth-24)}px`,top:`${Math.max(12,Math.min(bounds.bottom+4,innerHeight-height-12))}px`,maxHeight:`${height}px`});this.source.setAttribute('aria-expanded','true');this.highlight();
  }
  private highlight(){Array.from(this.list.children).forEach((child,i)=>{child.classList.toggle('selected',i===this.selected);child.setAttribute('aria-selected',String(i===this.selected));});this.source.setAttribute('aria-activedescendant',`candidate-${this.selected}`);this.list.children[this.selected]?.scrollIntoView({block:'nearest'});}
  private accept(index:number){
    if(!this.range||!this.candidates[index])return;
    this.insertTemplate(this.candidates[index].template,this.version,this.range.start,this.range.end);
  }
  private selectField(){const field=this.fields[this.fieldIndex];this.source.setSelectionRange(field.start,field.end);this.previous=this.snapshot();this.info(`填写位置 ${this.fieldIndex+1}/${this.fields.length} · Tab 下一项 · Shift+Tab 上一项 · Esc 结束填写；Enter 使用当前内容。`);}
  private cancelIfOutside(){if(this.fields.length&&(this.source.selectionStart<this.templateStart||this.source.selectionEnd>this.templateEnd))this.fields=[];}
  private adjustFields(before:EditSnapshot):boolean{
    if(!this.fields.length)return true;
    const result=linkEdit(before.text,this.source.value,before,{start:this.source.selectionStart,end:this.source.selectionEnd},{fields:this.fields,start:this.templateStart,end:this.templateEnd,cursor:this.finalCursor});
    if(result.text.length>4096){this.fields=[];this.apply(before);this.info('变量联动后超过 4096 个 UTF-16 单元，已撤回本次修改。',true);return false;}
    this.source.value=result.text;this.source.setSelectionRange(result.start,result.end);
    if(result.state){this.fields=result.state.fields;this.templateEnd=result.state.end;this.finalCursor=result.state.cursor;}else this.fields=[];
    return true;
  }
  private key(event:KeyboardEvent){
    if(this.composing||event.isComposing||event.keyCode===229||this.source.disabled)return;
    const consume=()=>{event.preventDefault();event.stopImmediatePropagation();};
    if(event.ctrlKey&&!event.altKey&&(event.code==='KeyZ'||event.code==='KeyY')){consume();this.restore(event.code==='KeyY'||event.shiftKey);return;}
    if(event.ctrlKey&&event.code==='KeyA')this.history.breakGroup();
    if(event.ctrlKey&&!event.altKey&&event.code==='Space'){consume();this.open();return;}
    if(event.key==='Escape'&&(!this.popup.hidden||this.fields.length)){consume();this.close();this.fields=[];this.source.focus();return;}
    if(event.key==='Tab'&&this.fields.length&&event.target===this.source){consume();this.close();const ids=[...new Set(this.fields.map(f=>f.index))];const active=this.fields.find(f=>this.source.selectionStart>=f.start&&this.source.selectionEnd<=f.end)??this.fields[this.fieldIndex];const next=ids.indexOf(active.index)+(event.shiftKey?-1:1);if(next>=ids.length){this.source.setSelectionRange(this.finalCursor,this.finalCursor);this.fields=[];this.info('填写完成。');}else{this.fieldIndex=this.fields.findIndex(f=>f.index===ids[Math.max(0,next)]);this.selectField();}return;}
    if(!this.popup.hidden&&this.candidates.length){
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){consume();this.selected=(this.selected+(event.key==='ArrowDown'?1:-1)+this.candidates.length)%this.candidates.length;this.highlight();return;}
      if(event.key==='Tab'&&!event.shiftKey){consume();this.accept(this.selected);return;}
    }
    if(event.key==='Enter'&&event.target===this.source){this.close();this.fields=[];}
    if(event.key.startsWith('Arrow'))this.history.breakGroup();
  }
}
