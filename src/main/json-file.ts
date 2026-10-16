import fs from 'node:fs/promises';
import path from 'node:path';
const LIMIT=8*1024*1024;
export async function readLimited(file:string){const handle=await fs.open(file,'r');try{const stat=await handle.stat();if(!stat.isFile()||stat.size>LIMIT)throw new Error('数据文件超过 8 MiB。');const data=Buffer.alloc(stat.size+1);let count=0;while(count<data.length){const result=await handle.read(data,count,data.length-count,count);if(!result.bytesRead)break;count+=result.bytesRead;}if(count!==stat.size)throw new Error('数据文件在读取期间发生变化。');return JSON.parse(data.subarray(0,count).toString('utf8'));}finally{await handle.close();}}
export class JsonFile<T>{
  warning='';writable=true;
  constructor(readonly file:string,private check:(v:unknown)=>T){}
  async read(fallback:T):Promise<T>{
    try{return this.check(await readLimited(this.file));}catch(error){
      if((error as NodeJS.ErrnoException).code==='SCHEMA_VERSION'){this.writable=false;this.warning=error instanceof Error?error.message:'数据版本不受支持。';return fallback;}
      if((error as NodeJS.ErrnoException).code==='ENOENT'){try{const backup=this.check(await readLimited(`${this.file}.bak`));await fs.copyFile(`${this.file}.bak`,`${this.file}.recover.tmp`);await fs.rename(`${this.file}.recover.tmp`,this.file);this.warning='已从备份恢复缺失的数据文件。';return backup;}catch(backupError){if((backupError as NodeJS.ErrnoException).code==='ENOENT')return fallback;this.writable=false;this.warning='主文件缺失且备份无效，已暂停写入。';return fallback;}}
      this.warning=`${path.basename(this.file)} 损坏或无法读取，原文件已保留。`;
      try{const backup=this.check(await readLimited(`${this.file}.bak`));await fs.copyFile(this.file,`${this.file}.corrupt-${Date.now()}`);await fs.copyFile(`${this.file}.bak`,`${this.file}.recover.tmp`);await fs.rename(`${this.file}.recover.tmp`,this.file);this.warning+='已恢复有效备份。';return backup;}
      catch{this.writable=false;this.warning+='无法恢复，已暂停写入以保护原数据。';return fallback;}
    }
  }
  async write(value:T,backup=true){
    if(!this.writable)throw new Error(this.warning);
    this.check(value);const json=JSON.stringify(value);if(Buffer.byteLength(json)>LIMIT)throw new Error('数据文件超过 8 MiB。');
    await fs.mkdir(path.dirname(this.file),{recursive:true});const tmp=`${this.file}.tmp`;
    const file=await fs.open(tmp,'w');try{await file.writeFile(json,'utf8');await file.sync();}finally{await file.close();}
    if(backup){try{this.check(await readLimited(this.file));await fs.copyFile(this.file,`${this.file}.bak.tmp`);await fs.rename(`${this.file}.bak.tmp`,`${this.file}.bak`);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
    await fs.rename(tmp,this.file);
  }
}
