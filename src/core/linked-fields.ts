import type {Field} from './templates';
export interface LinkedState {fields:Field[];start:number;end:number;cursor:number}
export function linkEdit(before:string,after:string,selection:{start:number;end:number},nextSelection:{start:number;end:number},state:LinkedState):{text:string;start:number;end:number;state:LinkedState|null}{
  let left=0;while(left<before.length&&left<after.length&&before[left]===after[left])left++;
  let oldEnd=before.length,newEnd=after.length;while(oldEnd>left&&newEnd>left&&before[oldEnd-1]===after[newEnd-1]){oldEnd--;newEnd--;}
  // Prefer the field containing the pre-edit selection; diffing alone is ambiguous
  // for adjacent identical/empty mirrors and deletion of repeated characters.
  const active=state.fields.find(f=>selection.start>=f.start&&selection.end<=f.end&&left>=f.start&&oldEnd<=f.end);
  if(!active)return {text:after,...nextSelection,state:null};
  const delta=after.length-before.length,value=after.slice(active.start,active.end+delta);
  const replacements=state.fields.filter(f=>f.index===active.index).sort((a,b)=>a.start-b.start);
  let text='',pos=0;const fields:Field[]=[];
  for(const f of [...state.fields].sort((a,b)=>a.start-b.start)){
    text+=before.slice(pos,f.start);const start=text.length;text+=f.index===active.index?value:before.slice(f.start,f.end);fields.push({...f,start,end:text.length});pos=f.end;
  }
  text+=before.slice(pos);
  const activeNext=fields.find(f=>f.index===active.index&&fields.filter(g=>g.index===f.index&&g.start<f.start).length===replacements.indexOf(active))!;
  const shift=activeNext.start-active.start;
  const cursor=state.cursor+state.fields.filter(f=>f.index===active.index&&f.end<=state.cursor).reduce((sum,f)=>sum+value.length-(f.end-f.start),0);
  return {text,start:nextSelection.start+shift,end:nextSelection.end+shift,state:{fields:fields.sort((a,b)=>a.index-b.index||a.start-b.start),start:state.start,end:state.end+text.length-before.length,cursor}};
}
