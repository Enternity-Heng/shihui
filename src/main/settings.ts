import fs from 'node:fs';
import path from 'node:path';
import type {Preferences} from '../shared/types';
import {DEFAULT_IMAGE_STYLE,validateImageStyle} from '../core/image-style';
export const DEFAULT_SHORTCUT='Control+Alt+M';
export const DEFAULT_PREFERENCES:Preferences={shortcut:DEFAULT_SHORTCUT,captureShortcut:'Control+Alt+S',historyEnabled:true,autocomplete:true,draftEnabled:true,imageStyle:{...DEFAULT_IMAGE_STYLE}};
export function canonicalShortcut(value:string){return value.toLowerCase().replace(/ctrl/g,'control').split('+').sort().join('+');}
export function validShortcut(value:string):boolean {
  if(value.length>=80||!/^(?:(?:Control|Ctrl|Alt|Shift|Super)\+){1,3}(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space)$/i.test(value)||!/(?:Control|Ctrl|Alt|Super)\+/i.test(value))return false;
  const parts=value.toLowerCase().replace(/ctrl/g,'control').split('+');return new Set(parts).size===parts.length;
}
export function validatePreferences(value:unknown):Preferences {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('设置格式无效。');
  const v=value as Record<string,unknown>,out={...DEFAULT_PREFERENCES};
  for(const key of ['shortcut','captureShortcut'] as const)if(v[key]!==undefined){if(typeof v[key]!=='string'||!validShortcut(v[key]))throw new Error('快捷键格式无效。');out[key]=v[key];}
  for(const key of ['historyEnabled','autocomplete','draftEnabled'] as const)if(v[key]!==undefined){if(typeof v[key]!=='boolean')throw new Error('设置开关格式无效。');out[key]=v[key];}
  out.imageStyle=v.imageStyle===undefined?{...DEFAULT_IMAGE_STYLE}:validateImageStyle(v.imageStyle);
  if(canonicalShortcut(out.shortcut)===canonicalShortcut(out.captureShortcut))throw new Error('输入与截图快捷键不能相同。');
  return out;
}
export function readPreferences(directory:string):{value:Preferences;warning?:string}{
  const file=path.join(directory,'settings.json');
  try{if(fs.statSync(file).size>65536)throw new Error('设置文件超过 64 KiB。');return {value:validatePreferences(JSON.parse(fs.readFileSync(file,'utf8')))};}
  catch(error){return {value:{...DEFAULT_PREFERENCES},...((error as NodeJS.ErrnoException).code==='ENOENT'?{}:{warning:'设置无法读取，已使用默认值；原文件已保留。'})};}
}
export function readSettings(directory:string):string{return readPreferences(directory).value.shortcut;}
export function writePreferences(directory:string,value:Preferences){
  const checked=validatePreferences(value);fs.mkdirSync(directory,{recursive:true});
  const file=path.join(directory,'settings.json');fs.writeFileSync(`${file}.tmp`,JSON.stringify(checked,null,2),'utf8');fs.renameSync(`${file}.tmp`,file);
}
export function writeSettings(directory:string,shortcut:string){writePreferences(directory,{...readPreferences(directory).value,shortcut});}
