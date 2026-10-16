export interface Field {index:number;start:number;end:number}
export interface ParsedTemplate {text:string;fields:Field[];cursor:number}
export function parseTemplate(template:string):ParsedTemplate {
  if(typeof template!=='string'||!template.trim()||template.length>4096)throw new Error('模板不能为空，且不能超过 4096 个 UTF-16 单元。');
  let text='',i=0,cursor=-1;const fields:Field[]=[];
  const parts: Array<string|{index:number}|{cursor:true}>=[], definitions=new Map<number,string>();
  const literal=(value:string)=>{parts.push(value);};
  while(i<template.length){
    if(template[i]==='\\'&&(template.startsWith('${',i+1)||template.startsWith('$0',i+1))){literal(template.slice(i+1,i+3));i+=3;continue;}
    if(template.startsWith('$0',i)){if(cursor>=0)throw new Error('$0 只能出现一次。');cursor=0;parts.push({cursor:true});i+=2;continue;}
    if(template.startsWith('${',i)){
      const reference=/^\$\{([1-9])\}/.exec(template.slice(i));
      if(reference){parts.push({index:Number(reference[1])});i+=reference[0].length;continue;}
      const match=/^\$\{([1-9]):/.exec(template.slice(i));if(!match)throw new Error('占位符应为 ${1:默认内容} 或 ${1}，编号限 1～9。');
      const index=Number(match[1]);
      i+=match[0].length;let depth=0,value='',closed=false;
      while(i<template.length){
        const c=template[i++];
        if(c==='\\'&&i<template.length&&'{}\\'.includes(template[i])){value+=c+template[i++];continue;}
        if(c==='$'&&template[i]==='{')throw new Error('不支持嵌套占位符。');
        if(c==='{')depth++;
        if(c==='}'){if(depth===0){closed=true;break;}depth--;}
        value+=c;
      }
      if(!closed)throw new Error('占位符缺少配对的右花括号。');
      if(definitions.has(index)&&definitions.get(index)!==value)throw new Error('同编号变量的默认内容必须一致。');
      definitions.set(index,value);parts.push({index});continue;
    }
    literal(template[i++]);
  }
  cursor=-1;
  for(const part of parts){if(typeof part==='string')text+=part;else if('cursor' in part)cursor=text.length;else{const value=definitions.get(part.index);if(value===undefined)throw new Error(`变量 ${part.index} 未定义。`);fields.push({index:part.index,start:text.length,end:text.length+value.length});text+=value;}}
  if(text.length>4096)throw new Error('展开后的模板超过 4096 个 UTF-16 单元。');
  return {text,fields:fields.sort((a,b)=>a.index-b.index),cursor:cursor<0?text.length:cursor};
}
export interface CommandCandidate {name:string;description:string;keywords:string[];template:string;custom?:boolean;formula?:boolean;symbol?:string}
export function searchCommands(items:CommandCandidate[],query:string):CommandCandidate[]{
  const q=query.replace(/^\\/,'').trim();const lower=q.toLocaleLowerCase();
  const score=(item:CommandCandidate)=>{if(item.name===`\\${q}`)return 0;if(item.name.slice(1).startsWith(q))return 1;if(item.name.toLowerCase().slice(1).startsWith(lower))return 2;if(item.keywords.some(k=>k.toLowerCase()===lower))return 3;const text=[item.name,item.description,...item.keywords].join(' ').toLowerCase();return lower.split(/\s+/).every(token=>text.includes(token))?4:99;};
  return items.map(item=>({item,score:score(item)})).filter(v=>v.score<99).sort((a,b)=>a.score-b.score||(a.item.name<b.item.name?-1:a.item.name>b.item.name?1:0)).slice(0,8).map(v=>v.item);
}
export function commandRange(text:string,start:number,end=start):{start:number;end:number;query:string}|null {
  if(start!==end)return null;
  const match=/\\([a-zA-Z]*)$/.exec(text.slice(0,start));if(!match)return null;
  const begin=start-match[0].length;let preceding=0;for(let i=begin-1;i>=0&&text[i]==='\\';i--)preceding++;
  if(preceding%2)return null;
  return {start:begin,end:start+(/^[a-zA-Z]*/.exec(text.slice(start))?.[0].length??0),query:match[1]};
}
