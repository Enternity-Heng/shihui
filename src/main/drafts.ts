import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {imageSize} from 'image-size';
import {checkImageSize,OCR_MAX_BYTES} from '../core/ocr';
import {validateBuilder} from '../core/structures';
import {validatePseudocodeState} from '../core/pseudocode';
import {validateExpression} from '../core/expression-tools';
import {validateFlow} from '../core/flowchart';
import {validateDiagram} from '../core/specialty-diagrams';
import type {WorkspaceSnapshot,DraftStatus} from '../shared/types';
import {JsonFile} from './json-file';
interface DiskDraft {version:1;epoch:number;snapshot:WorkspaceSnapshot|null}
export function imageBuffer(image:string){
  if(typeof image!=='string'||image.length>Math.ceil(OCR_MAX_BYTES*4/3)+100||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]*={0,2}$/.test(image))throw new Error('草稿参考图无效或超过 20 MiB。');
  const data=Buffer.from(image.slice(image.indexOf(',')+1),'base64');if(data.length>OCR_MAX_BYTES)throw new Error('参考图过大。');const size=imageSize(data);if(!['png','jpg'].includes(size.type??''))throw new Error('参考图格式无效。');checkImageSize(size.width,size.height);return data;
}
export function validateWorkspace(input:unknown):WorkspaceSnapshot {
  const s=structuredClone(input) as WorkspaceSnapshot;
  if(!s||s.version!==1||!s.editor||typeof s.editor.text!=='string'||s.editor.text.length>4096)throw new Error('草稿源码无效。');
  const e=s.editor;e.start=Number.isSafeInteger(e.start)?Math.max(0,Math.min(e.text.length,e.start)):0;e.end=Number.isSafeInteger(e.end)?Math.max(e.start,Math.min(e.text.length,e.end)):e.start;
  s.builder=validateBuilder(s.builder);
  if(s.pseudocode!==undefined)s.pseudocode=validatePseudocodeState(s.pseudocode);
  if(s.expression!==undefined)s.expression=validateExpression(s.expression);
  if(s.flowchart!==undefined)s.flowchart=validateFlow(s.flowchart);
  if(s.diagram!==undefined)s.diagram=validateDiagram(s.diagram);
  if(e.linked){const l=e.linked;const valid=Array.isArray(l.fields)&&l.fields.length>0&&l.fields.length<=1024&&Number.isSafeInteger(l.start)&&Number.isSafeInteger(l.end)&&l.start>=0&&l.end<=e.text.length&&l.start<=l.end&&Number.isSafeInteger(l.cursor)&&l.cursor>=0&&l.cursor<=e.text.length&&l.fields.every(f=>Number.isInteger(f.index)&&f.index>=1&&f.index<=9&&Number.isInteger(f.start)&&Number.isInteger(f.end)&&f.start>=l.start&&f.end<=l.end&&f.start<=f.end);
    if(valid){const sorted=[...l.fields].sort((a,b)=>a.start-b.start||a.end-b.end);if(sorted.some((f,i)=>i&&f.start<sorted[i-1].end)||sorted.some(f=>e.text.slice(f.start,f.end)!==e.text.slice(sorted.find(g=>g.index===f.index)!.start,sorted.find(g=>g.index===f.index)!.end)))e.linked=null;}else e.linked=null;
  }
  if(s.review){const r=s.review;if(!/^[0-9a-f-]{36}$/.test(r.id)||typeof r.original!=='string'||r.original.length>4096||typeof r.source!=='string'||r.source.length>4096||!['file','clipboard','screen'].includes(r.origin)||!Number.isSafeInteger(r.baseVersion)||r.baseVersion<0)throw new Error('核对草稿无效。');if(r.image&&!/^asset:[a-f0-9]{64}\.img$/.test(r.image))imageBuffer(r.image);}
  if(![null,'builder-panel','review-panel','settings','favorites-panel','history-panel','pseudocode-panel','expression-panel','flowchart-panel','specialty-panel'].includes(s.panel))s.panel=null;
  const withoutImage=structuredClone(s);if(withoutImage.review)delete withoutImage.review.image;
  if(Buffer.byteLength(JSON.stringify(withoutImage))>256*1024)throw new Error('草稿 JSON 超过 256 KiB。');
  return {version:1,editor:e,builder:s.builder,review:s.review??null,panel:s.panel,...(s.pseudocode?{pseudocode:s.pseudocode}:{}),...(s.expression?{expression:s.expression}:{}),...(s.flowchart?{flowchart:s.flowchart}:{}),...(s.diagram?{diagram:s.diagram}:{})};
}
function diskCheck(v:unknown):DiskDraft{const d=v as DiskDraft;if(d&&d.version!==1)throw Object.assign(new Error('草稿版本不受支持，已保留原文件。'),{code:'SCHEMA_VERSION'});if(!d||!Number.isSafeInteger(d.epoch)||d.epoch<0)throw new Error('草稿版本无效。');return {version:1,epoch:d.epoch,snapshot:d.snapshot===null?null:validateWorkspace(d.snapshot)};}
export class DraftStore {
  private file:JsonFile<DiskDraft>;private value:WorkspaceSnapshot|null=null;private timer:ReturnType<typeof setTimeout>|null=null;private maximum:ReturnType<typeof setTimeout>|null=null;private queue:Promise<unknown>=Promise.resolve();private sequence=0;private savedSequence=0;
  epoch=0;enabled=true;
  constructor(readonly directory:string,private notify:(s:DraftStatus)=>void=()=>{}){this.file=new JsonFile(path.join(directory,'state.json'),diskCheck);}
  private report(state:DraftStatus['state'],message:string){this.notify({state,message,epoch:this.epoch});}
  async init(){const d=await this.file.read({version:1,epoch:0,snapshot:null});this.epoch=d.epoch;this.value=d.snapshot;if(this.value?.review?.image?.startsWith('asset:')){try{const filename=path.join(this.directory,this.value.review.image.slice(6)),stat=await fs.lstat(filename);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>OCR_MAX_BYTES)throw new Error('草稿附图无效。');const data=await fs.readFile(filename);const image=`data:image/${imageSize(data).type==='jpg'?'jpeg':'png'};base64,${data.toString('base64')}`;imageBuffer(image);this.value.review.image=image;}catch{delete this.value.review.image;this.file.warning+=' 草稿原图无法恢复，文字仍已保留。';}}return {snapshot:structuredClone(this.value),epoch:this.epoch,warning:this.file.warning};}
  snapshot(){return {snapshot:structuredClone(this.value),epoch:this.epoch,warning:this.file.warning};}
  accept(input:unknown,epoch:number){if(epoch!==this.epoch)throw new Error('草稿版本已过期。');if(!this.enabled)return;const snapshot=validateWorkspace(input);if(snapshot.review?.image?.startsWith('asset:'))throw new Error('不能提交内部附图路径。');this.value=snapshot;this.sequence++;this.report('saving','保存中…');if(this.timer)clearTimeout(this.timer);this.timer=setTimeout(()=>void this.flush().catch(()=>{}),500);if(!this.maximum)this.maximum=setTimeout(()=>void this.flush().catch(()=>{}),2000);}
  private stopTimers(){if(this.timer)clearTimeout(this.timer);if(this.maximum)clearTimeout(this.maximum);this.timer=this.maximum=null;}
  async flush(){this.stopTimers();const sequence=this.sequence,epoch=this.epoch,snapshot=structuredClone(this.value);const task=this.queue.then(async()=>{if(epoch!==this.epoch||!this.enabled||sequence===this.savedSequence)return;try{
      if(snapshot?.review?.image){const data=imageBuffer(snapshot.review.image),asset=createHash('sha256').update(data).digest('hex')+'.img';await fs.mkdir(this.directory,{recursive:true});const assetPath=path.join(this.directory,asset);let total=0;for(const entry of await fs.readdir(this.directory)){const stat=await fs.lstat(path.join(this.directory,entry));if(stat.isFile())total+=stat.size;}
        let exists=false;try{await fs.access(assetPath);exists=true;}catch{}if(!exists){if(total+data.length>64*1024*1024)throw new Error('草稿目录超过 64 MiB。');await fs.writeFile(assetPath+'.tmp',data);await fs.rename(assetPath+'.tmp',assetPath);}snapshot.review.image='asset:'+asset;
      }
      if(epoch!==this.epoch)return;await this.file.write({version:1,epoch,snapshot});this.savedSequence=sequence;await this.cleanup();if(sequence===this.sequence)this.report('saved','已保存');
    }catch(error){this.report('failed',`保存失败：${error instanceof Error?error.message:String(error)}`);throw error;}});this.queue=task.catch(()=>{});return task;}
  private async cleanup(){const keep=new Set<string>();for(const name of ['state.json','state.json.bak'])try{const d=diskCheck(JSON.parse(await fs.readFile(path.join(this.directory,name),'utf8')));const asset=d.snapshot?.review?.image;if(asset?.startsWith('asset:'))keep.add(asset.slice(6));}catch{}
    for(const name of await fs.readdir(this.directory))if(/^[a-f0-9]{64}\.img(?:\.tmp)?$/.test(name)&&!keep.has(name))await fs.unlink(path.join(this.directory,name));
  }
  async clear(force=false){this.stopTimers();if(force){this.file.writable=true;this.file.warning='';}else if(!this.file.writable){this.value=null;return this.epoch;}this.epoch++;this.sequence++;const epoch=this.epoch;this.value=null;const task=this.queue.then(async()=>{await fs.mkdir(this.directory,{recursive:true});await fs.rm(this.file.file+'.bak',{force:true});await this.file.write({version:1,epoch,snapshot:null},false);for(const name of await fs.readdir(this.directory))if(/^[a-f0-9]{64}\.img(?:\.tmp)?$/.test(name)||/^state\.json\.(?:corrupt-\d+|recover\.tmp|bak\.tmp)$/.test(name))await fs.unlink(path.join(this.directory,name));this.savedSequence=this.sequence;this.report('saved','草稿已清除');});this.queue=task.catch(()=>{});await task;return epoch;}
}
