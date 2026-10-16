import {EditHistory,type EditSnapshot} from '../core/editing';
import {emptyPseudocode,indentPseudocode,newlinePseudocode,validatePseudocode,type PseudocodeState} from '../core/pseudocode';

export class PseudocodeEditor {
  private history=new EditHistory();
  private previous:EditSnapshot={text:'',start:0,end:0};
  private before:EditSnapshot|null=null;
  private composing=false;
  private compositionBefore:EditSnapshot|null=null;
  get isComposing(){return this.composing;}
  constructor(private source:HTMLTextAreaElement,private numbers:HTMLInputElement,private changed:()=>void,private error:(message:string)=>void){
    source.addEventListener('beforeinput',event=>{
      if(event.inputType==='historyUndo'||event.inputType==='historyRedo'){event.preventDefault();this.restoreHistory(event.inputType==='historyRedo');return;}
      if(!this.composing)this.before=this.snapshot();
    });
    source.addEventListener('input',event=>{
      if(this.composing)return;
      const before=this.before??this.previous;this.before=null;
      if(!this.check()){this.apply(before);return;}
      if(before.text!==source.value){this.history.push(before,(event as InputEvent).inputType==='insertText'?'typing':'edit');this.previous=this.snapshot();this.changed();}
    });
    source.addEventListener('compositionstart',()=>{this.composing=true;this.compositionBefore=this.snapshot();});
    source.addEventListener('compositionend',()=>{this.composing=false;const before=this.compositionBefore??this.previous;this.compositionBefore=null;this.before=null;if(!this.check()){this.apply(before);return;}if(source.value!==before.text){this.history.push(before,'composition');this.previous=this.snapshot();this.changed();}});
    source.addEventListener('keydown',event=>{
      if(this.composing||event.isComposing||event.keyCode===229||source.disabled)return;
      const consume=()=>{event.preventDefault();event.stopImmediatePropagation();};
      if(event.ctrlKey&&!event.altKey&&(event.code==='KeyZ'||event.code==='KeyY')){consume();this.restoreHistory(event.code==='KeyY'||event.shiftKey);return;}
      if(event.key==='Tab'){consume();this.replace(indentPseudocode(this.snapshot(),event.shiftKey),'indent');return;}
      if(event.key==='Enter'&&!event.altKey&&!event.ctrlKey&&!event.metaKey){consume();this.replace(newlinePseudocode(this.snapshot()),'newline');return;}
      if(event.key.startsWith('Arrow'))this.history.breakGroup();
    });
    source.addEventListener('pointerdown',()=>this.history.breakGroup());
    source.addEventListener('select',()=>{if(!this.composing)this.changed();});
    numbers.addEventListener('change',()=>this.changed());
  }
  snapshot():EditSnapshot{return {text:this.source.value,start:this.source.selectionStart,end:this.source.selectionEnd};}
  state():PseudocodeState{return {...this.snapshot(),lineNumbers:this.numbers.checked};}
  private check(){try{validatePseudocode(this.source.value,this.numbers.checked);return true;}catch(error){this.error(error instanceof Error?error.message:String(error));return false;}}
  private apply(snapshot:EditSnapshot){this.source.value=snapshot.text;this.source.setSelectionRange(snapshot.start,snapshot.end);this.previous=this.snapshot();this.before=null;}
  private replace(snapshot:EditSnapshot,kind:string){try{validatePseudocode(snapshot.text,this.numbers.checked);}catch(error){this.error(String(error));return;}this.history.push(this.snapshot(),kind);this.apply(snapshot);this.changed();}
  private restoreHistory(redo:boolean){const state=redo?this.history.redo(this.snapshot()):this.history.undo(this.snapshot());if(state){this.apply(state);this.changed();}}
  load(text:string){this.replace({text,start:0,end:0},'example');this.source.focus();}
  restore(state:PseudocodeState=emptyPseudocode()){this.numbers.checked=state.lineNumbers;this.apply(state);this.history=new EditHistory();}
}
