import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {JsonFile} from './json-file';
import type {Favorite,FavoriteCategory,FavoriteLibrary,ImportSummary} from '../shared/types';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const key=(s:string)=>s.trim().toLowerCase();
function id(v:unknown){if(typeof v!=='string'||!uuid.test(v))throw new Error('记录标识无效。');return v;}
function name(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f\u007f]/.test(v))throw new Error(`名称不能为空且最多 ${max} 个 UTF-16 单元。`);return v.trim();}
export function checkLibrary(input:unknown,legacy=true):FavoriteLibrary {
  if(input&&typeof input==='object'&&!Array.isArray(input)&&'version' in input&&input.version!==2)throw Object.assign(new Error('收藏库版本不受支持，已保留原文件。'),{code:'SCHEMA_VERSION'});
  const data=legacy&&Array.isArray(input)?{version:2,revision:0,categories:[],favorites:input}:input as FavoriteLibrary;
  if(!data||data.version!==2||!Number.isSafeInteger(data.revision)||data.revision<0||!Array.isArray(data.categories)||data.categories.length>50||!Array.isArray(data.favorites)||data.favorites.length>200)throw new Error('收藏库版本或数量无效（最多 50 类、200 条收藏）。');
  const categories:FavoriteCategory[]=data.categories.map(c=>{const n=name(c?.name,32);if(['全部','未分类'].includes(n))throw new Error('不能使用系统分类名称。');return {id:id(c.id),name:n};});
  const favorites:Favorite[]=data.favorites.map(f=>{if(typeof f?.source!=='string'||!f.source.trim()||f.source.length>4096||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(f.source)||!Number.isFinite(Date.parse(f.updatedAt)))throw new Error('收藏源码或时间无效。');const categoryId=f.categoryId??null;if(categoryId!==null&&!categories.some(c=>c.id===categoryId))throw new Error('收藏引用了不存在的分类。');return {id:id(f.id),name:name(f.name,64),source:f.source,updatedAt:f.updatedAt,categoryId};});
  for(const list of [categories,favorites])if(new Set(list.map(v=>v.id)).size!==list.length||new Set(list.map(v=>key(v.name))).size!==list.length)throw new Error('名称或标识重复。');
  return {version:2,revision:data.revision,categories,favorites};
}
export class FavoriteStore {
  private file:JsonFile<FavoriteLibrary>;private value:FavoriteLibrary={version:2,revision:0,categories:[],favorites:[]};private queue:Promise<unknown>=Promise.resolve();
  private plan:{summary:ImportSummary;next:FavoriteLibrary}|null=null;
  get warning(){return this.file.warning;}
  constructor(directory:string){this.file=new JsonFile(path.join(directory,'favorites.json'),checkLibrary);}
  async init(){this.value=await this.file.read(this.value);if(this.file.writable)try{const original=JSON.parse(await fs.readFile(this.file.file,'utf8'));if(Array.isArray(original)){await fs.copyFile(this.file.file,this.file.file+'.v1-backup');await this.file.write(this.value);}}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT'){this.file.writable=false;this.file.warning+=' 收藏格式迁移失败，原文件已保留。';}}}
  snapshot(){return structuredClone(this.value);}
  private serial<T>(fn:()=>Promise<T>){const p=this.queue.then(fn);this.queue=p.catch(()=>{});return p;}
  flush(){return this.queue;}
  private async write(next:FavoriteLibrary,destructive=false){next=checkLibrary({...next,revision:this.value.revision+1});if(destructive)await fs.rm(`${this.file.file}.bak`,{force:true});await this.file.write(next,!destructive);this.value=next;}
  saveFavorite(input:unknown){return this.serial(async()=>{const f=input as Favorite;if(!f||typeof f!=='object')throw new Error('收藏格式无效。');if(f.id&&!this.value.favorites.some(v=>v.id===f.id))throw new Error('收藏不存在。');const favorite={id:f.id||randomUUID(),name:f.name,source:f.source,categoryId:f.categoryId??null,updatedAt:new Date().toISOString()};await this.write({...this.value,favorites:[favorite,...this.value.favorites.filter(v=>v.id!==favorite.id)]});});}
  deleteFavorite(value:unknown){return this.serial(async()=>{id(value);if(!this.value.favorites.some(f=>f.id===value))throw new Error('收藏不存在。');await this.write({...this.value,favorites:this.value.favorites.filter(f=>f.id!==value)},true);});}
  saveCategory(value:{id:string;name:string}){return this.serial(async()=>{if(!value||typeof value!=='object')throw new Error('分类无效。');if(value.id&&!this.value.categories.some(c=>c.id===value.id))throw new Error('分类不存在。');const category={id:value.id||randomUUID(),name:value.name};await this.write({...this.value,categories:[...this.value.categories.filter(c=>c.id!==category.id),category]});});}
  deleteCategory(value:string){return this.serial(async()=>{id(value);if(!this.value.categories.some(c=>c.id===value))throw new Error('分类不存在。');await this.write({...this.value,categories:this.value.categories.filter(c=>c.id!==value),favorites:this.value.favorites.map(f=>f.categoryId===value?{...f,categoryId:null}:f)},true);});}
  preflight(input:unknown):ImportSummary {
    const incoming=checkLibrary(input,false),next=this.snapshot();let added=0,skipped=0,renamed=0;const addedCategories=next.categories.length;const map=new Map<string,string>();
    for(const c of incoming.categories){let match=next.categories.find(v=>key(v.name)===key(c.name));if(!match){match={id:randomUUID(),name:c.name};next.categories.push(match);}map.set(c.id,match.id);}
    for(const f of incoming.favorites){const base=key(f.name);if(next.favorites.some(v=>{if(v.source!==f.source)return false;const n=key(v.name);if(n===base)return true;const suffix=/ \(\d+\)$/.exec(n)?.[0];return !!suffix&&n===base.slice(0,64-suffix.length)+suffix;})){skipped++;continue;}
      let n=f.name,counter=2;while(next.favorites.some(v=>key(v.name)===key(n))){const suffix=` (${counter++})`;n=f.name.slice(0,64-suffix.length)+suffix;}
      if(n!==f.name)renamed++;next.favorites.push({...f,id:randomUUID(),name:n,categoryId:f.categoryId?map.get(f.categoryId)!:null});added++;
    }
    checkLibrary(next);const summary={id:randomUUID(),revision:this.value.revision,added,skipped,renamed,categories:next.categories.length-addedCategories};this.plan={summary,next};return {...summary};
  }
  commit(planId:string){return this.serial(async()=>{if(!this.plan||this.plan.summary.id!==planId||this.plan.summary.revision!==this.value.revision)throw new Error('收藏库已变化或导入预检过期，请重新选择文件。');const next=this.plan.next;await this.write(next);this.plan=null;});}
}
