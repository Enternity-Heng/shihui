export interface EditSnapshot {text:string;start:number;end:number}
export class EditHistory {
  private undoStack:EditSnapshot[]=[];private redoStack:EditSnapshot[]=[];private lastTime=0;private group='';
  push(before:EditSnapshot,kind:string,now=Date.now()){
    if(kind!=='typing'||this.group!=='typing'||now-this.lastTime>500)this.undoStack.push({...before});
    if(this.undoStack.length>100)this.undoStack.shift();this.redoStack=[];this.group=kind;this.lastTime=now;
  }
  breakGroup(){this.group='';}
  undo(current:EditSnapshot){const previous=this.undoStack.pop();if(previous)this.redoStack.push({...current});this.breakGroup();return previous;}
  redo(current:EditSnapshot){const next=this.redoStack.pop();if(next)this.undoStack.push({...current});this.breakGroup();return next;}
}
