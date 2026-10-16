import {JsonFile} from './json-file';
import {FavoriteStore} from './library';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {CustomCommand,HistoryEntry,HistoryPage} from '../shared/types';
import {parseTemplate} from '../core/templates';
import {BUILTIN_COMMANDS} from '../core/catalog';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function validId(value:unknown):asserts value is string {if(typeof value!=='string'||!ID.test(value))throw new Error('记录标识无效。');}
export function validateCommand(input:unknown):CustomCommand {
  if(!input||typeof input!=='object')throw new Error('命令格式无效。');
  const c=input as CustomCommand;const name=typeof c.name==='string'?(c.name.startsWith('\\')?c.name:`\\${c.name}`):'';
  if(!/^\\[a-zA-Z]{1,32}$/.test(name)||BUILTIN_COMMANDS.some(v=>v.name===name))throw new Error('命令名应为 1～32 个英文字母，且不能与内置命令同名。');
  if(c.id)validId(c.id);
  if(typeof c.description!=='string'||c.description.length>128||!Array.isArray(c.keywords)||c.keywords.length>10||c.keywords.some(k=>typeof k!=='string'||k.length>32))throw new Error('说明最多 128 字，关键词最多 10 个、每个 32 字。');
  parseTemplate(c.template);
  return {id:c.id||randomUUID(),name,description:c.description,keywords:[...c.keywords],template:c.template};
}
function commandsCheck(value:unknown):CustomCommand[]{
  if(!Array.isArray(value)||value.length>200)throw new Error('命令数量超过 200 条。');
  const commands=value.map(validateCommand);if(new Set(commands.map(c=>c.id)).size!==commands.length||new Set(commands.map(c=>c.name)).size!==commands.length)throw new Error('命令重复。');return commands;
}
function historyCheck(value:unknown):HistoryEntry[]{
  if(!Array.isArray(value)||value.length>500)throw new Error('历史格式无效。');
  const entries=value.map(v=>{
    validId(v?.id);
    if(typeof v.source!=='string'||!v.source.trim()||v.source.length>4096||!['manual','file','clipboard','screen'].includes(v.origin)||typeof v.action!=='string'||v.action.length>64||!Number.isFinite(Date.parse(v.createdAt))||!Number.isFinite(Date.parse(v.updatedAt)))throw new Error('历史内容无效。');
    if(v.image!==undefined&&(!/^([0-9a-f-]{36})\.png$/.test(v.image)||!Number.isSafeInteger(v.imageBytes)||v.imageBytes<1||v.imageBytes>20*1024*1024))throw new Error('历史附图无效。');
    if(v.image)validId(v.image.slice(0,-4));
    return {id:v.id,source:v.source,createdAt:v.createdAt,updatedAt:v.updatedAt,origin:v.origin,action:v.action,...(v.image?{image:v.image,imageBytes:v.imageBytes}:{}),...(v.imageRemoved?{imageRemoved:true}:{})} as HistoryEntry;
  });
  if(new Set(entries.map(v=>v.id)).size!==entries.length)throw new Error('历史标识重复。');return entries;
}
export class UserStore {
  private commandsFile:JsonFile<CustomCommand[]>;private historyFile:JsonFile<HistoryEntry[]>;
  readonly library:FavoriteStore;
  private commands:CustomCommand[]=[];private entries:HistoryEntry[]=[];private queue:Promise<unknown>=Promise.resolve();
  private generationFile:JsonFile<{token:string}>;private generationToken:string=randomUUID();private generationError='';
  private epoch=0;enabled=true;private deleted=new Set<string>();warning='';
  constructor(readonly directory:string,private imageBudget=512*1024*1024){this.commandsFile=new JsonFile(path.join(directory,'commands.json'),commandsCheck);this.historyFile=new JsonFile(path.join(directory,'history.json'),historyCheck);this.library=new FavoriteStore(directory);this.generationFile=new JsonFile(path.join(directory,'history-generation.json'),v=>{const value=v as {token:string};validId(value?.token);return {token:value.token};});}
  private serial<T>(fn:()=>Promise<T>):Promise<T>{const task=this.queue.then(fn);this.queue=task.catch(()=>{});return task;}
  async init(){
    const generation=await this.generationFile.read({token:this.generationToken});this.generationToken=generation.token;try{await this.generationFile.write(generation,false);}catch(error){this.generationError=String(error);}

    this.commands=await this.commandsFile.read([]);this.entries=await this.historyFile.read([]);await this.library.init();this.warning=[this.commandsFile.warning,this.historyFile.warning,this.library.warning].filter(Boolean).join(' ');
    if(this.historyFile.writable)try{await this.serial(()=>this.cleanup());}catch(error){this.warning+=` 附图清理失败：${error instanceof Error?error.message:String(error)}`;}
  }
  barrier(persist=true){this.epoch++;if(!persist)return;this.generationToken=randomUUID();const token=this.generationToken;void this.serial(async()=>{try{await fs.rm(this.generationFile.file+'.bak',{force:true});await this.generationFile.write({token},false);this.generationError='';}catch(error){this.generationError=String(error);}});}
  historyGeneration(){return this.generationToken;}
  setEnabled(enabled:boolean){if(!enabled)this.barrier();this.enabled=enabled;}
  ticket(){return this.epoch;}
  async flush(){await this.queue;await this.library.flush();}
  listCommands(){return this.commands.map(c=>({...c,keywords:[...c.keywords]}));}
  listFavorites(){return this.library.snapshot().favorites;}
  saveFavorite(input:unknown){return this.library.saveFavorite(input);}
  deleteFavorite(id:unknown){return this.library.deleteFavorite(id);}
  source(id:unknown){validId(id);const entry=this.entries.find(e=>e.id===id);if(!entry)throw new Error('历史记录不存在。');return entry.source;}
  saveCommand(input:unknown){return this.serial(async()=>{
    const command=validateCommand(input);if(this.commands.some(c=>c.name===command.name&&c.id!==command.id))throw new Error('命令名已存在。');
    const next=this.commands.filter(c=>c.id!==command.id);next.push(command);commandsCheck(next);await this.commandsFile.write(next);this.commands=next;
  });}
  deleteCommand(id:unknown){validId(id);return this.serial(async()=>{const next=this.commands.filter(c=>c.id!==id);if(next.length===this.commands.length)throw new Error('命令不存在。');await this.commandsFile.write(next);this.commands=next;});}
  list(query:unknown,page:unknown):HistoryPage{
    if(typeof query!=='string'||query.length>256||!Number.isSafeInteger(page)||(page as number)<0||(page as number)>10000)throw new Error('历史查询参数无效。');
    const all=this.entries.filter(e=>e.source.toLowerCase().includes(query.toLowerCase()));const p=Math.min(page as number,Math.max(0,Math.ceil(all.length/30)-1));
    return {entries:all.slice(p*30,p*30+30).map(e=>({...e})),total:all.length,page:p};
  }
  detail(id:unknown){validId(id);return this.serial(async()=>{const entry=this.entries.find(e=>e.id===id);if(!entry)throw new Error('历史记录不存在。');let image:string|undefined;
    if(entry.image)try{await this.checkImageDirectory();const file=this.imagePath(entry.image),stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>20*1024*1024)throw new Error('附图无效或过大。');const handle=await fs.open(file,'r');try{const buffer=Buffer.alloc(stat.size+1);const {bytesRead}=await handle.read(buffer,0,buffer.length,0);if(bytesRead!==stat.size)throw new Error('附图在读取期间发生变化。');image=`data:image/png;base64,${buffer.subarray(0,bytesRead).toString('base64')}`;}finally{await handle.close();}}catch{ /* Missing attachment never prevents source recovery. */ }
    return {entry:{...entry},image};});}
  async record(source:string,origin:HistoryEntry['origin'],action:string,ticket:number,image?:Buffer){
    return this.serial(async()=>{
      const text=source.trim();if(!this.enabled||ticket!==this.epoch||!text||text.length>4096)return;
      if(!this.historyFile.writable)throw new Error(this.historyFile.warning);
      const key=text;if(this.deleted.has(key))return;
      const previous=this.entries.find(e=>e.source===text),now=new Date().toISOString();
      const entry:HistoryEntry={...(previous??{}),id:previous?.id??randomUUID(),source:text,createdAt:previous?.createdAt??now,updatedAt:now,origin:origin==='manual'&&previous?previous.origin:origin,action};
      if(image){if(image.length>20*1024*1024)throw new Error('历史附图超过 20 MB。');entry.image=`${randomUUID()}.png`;entry.imageBytes=image.length;delete entry.imageRemoved;
        await fs.mkdir(path.join(this.directory,'history-images'),{recursive:true});await this.checkImageDirectory();const file=this.imagePath(entry.image);await fs.writeFile(`${file}.tmp`,image);await fs.rename(`${file}.tmp`,file);
      }
      const next=[entry,...this.entries.filter(e=>e.id!==entry.id)].slice(0,500).map(e=>({...e}));
      let bytes=next.reduce((sum,e)=>sum+(e.imageBytes??0),0);for(let i=next.length-1;i>=0&&bytes>this.imageBudget;i--){if(next[i].image){bytes-=next[i].imageBytes??0;delete next[i].image;delete next[i].imageBytes;next[i].imageRemoved=true;}}
      await this.historyFile.write(next);this.entries=next;await this.cleanup();
    });
  }
  deleteHistory(id:unknown){validId(id);this.barrier();return this.serial(async()=>{if(this.generationError)throw new Error(this.generationError);const entry=this.entries.find(e=>e.id===id);if(!entry)throw new Error('历史记录不存在。');const next=this.entries.filter(e=>e.id!==id);await this.removeHistoryBackups();await this.historyFile.write(next,false);this.entries=next;await this.cleanup();});}
  clear(){this.barrier();return this.serial(async()=>{if(this.generationError)throw new Error(this.generationError);await this.removeHistoryBackups();await this.historyFile.write([],false);this.entries=[];await this.cleanup();});}
  private async removeHistoryBackups(){for(const name of await fs.readdir(this.directory))if(/^history\.json\.(?:bak(?:\.tmp)?|corrupt-\d+|recover\.tmp)$/.test(name))await fs.unlink(path.join(this.directory,name));}
  private async checkImageDirectory(){const directory=path.join(this.directory,'history-images');const stat=await fs.lstat(directory);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('历史附图目录不能是链接。');const real=await fs.realpath(directory),root=await fs.realpath(this.directory);if(path.dirname(real).toLowerCase()!==root.toLowerCase())throw new Error('历史附图目录越界。');}
  private imagePath(filename:string){if(!/^[0-9a-f-]{36}\.png$/.test(filename))throw new Error('图片标识无效。');validId(filename.slice(0,-4));return path.join(this.directory,'history-images',filename);}
  private async cleanup(){
    const dir=path.join(this.directory,'history-images');let names:string[];try{names=await fs.readdir(dir);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return;throw error;}
    await this.checkImageDirectory();
    const keep=new Set(this.entries.map(e=>e.image).filter(Boolean));
    for(const name of names)if(/^[0-9a-f-]{36}\.png(?:\.tmp)?$/.test(name)&&!keep.has(name))await fs.unlink(path.join(dir,name));
  }
}
