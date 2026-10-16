import fs from 'node:fs';
import path from 'node:path';
function pe(filename){
  const data=fs.readFileSync(filename),start=data.readUInt32LE(60),optional=start+24,sections=optional+data.readUInt16LE(start+20),count=data.readUInt16LE(start+6);
  if(data.readUInt16LE(start+4)!==0x8664)throw new Error(`Not an x64 binary: ${filename}`);
  const at=rva=>{
    for(let i=0;i<count;i++){const section=sections+i*40,base=data.readUInt32LE(section+12),size=Math.max(data.readUInt32LE(section+8),data.readUInt32LE(section+16));if(rva>=base&&rva<base+size)return data.readUInt32LE(section+20)+rva-base;}
    throw new Error(`Invalid PE address in ${filename}`);
  };
  const string=rva=>{const offset=at(rva);return data.subarray(offset,data.indexOf(0,offset)).toString('ascii');};
  return {data,optional,at,string};
}
function exportsOf(filename){
  const {data,optional,at,string}=pe(filename),directory=at(data.readUInt32LE(optional+112));
  const count=data.readUInt32LE(directory+24),names=at(data.readUInt32LE(directory+32)),exports=new Set();
  for(let i=0;i<count;i++)exports.add(string(data.readUInt32LE(names+i*4)));
  return exports;
}
function importsOf(filename){
  const {data,optional,at,string}=pe(filename),imports=[];
  for(let entry=at(data.readUInt32LE(optional+120));data.readUInt32LE(entry+12);entry+=20){
    const name=string(data.readUInt32LE(entry+12)).toLowerCase(),functions=[];
    for(let thunk=at(data.readUInt32LE(entry)||data.readUInt32LE(entry+16));data.readBigUInt64LE(thunk);thunk+=8){
      const value=data.readBigUInt64LE(thunk);if((value&0x8000000000000000n)===0n)functions.push(string(Number(value)+2));
    }
    imports.push({name,functions});
  }
  return imports;
}
const root=path.resolve(import.meta.dirname,'../assets/vcruntime');
const symbols=new Map(fs.readdirSync(root).filter(name=>name.endsWith('.dll')).map(name=>[name.toLowerCase(),exportsOf(path.join(root,name))]));
const native=path.resolve(import.meta.dirname,'../node_modules/onnxruntime-node/bin/napi-v6/win32/x64');
for(const name of ['onnxruntime.dll','onnxruntime_binding.node',...symbols.keys()]){
  const filename=path.join(symbols.has(name)?root:native,name);
  for(const dependency of importsOf(filename)){
    if(!/^(?:msvcp|vcruntime|concrt)/.test(dependency.name))continue;
    const available=symbols.get(dependency.name);
    if(!available)throw new Error(`Missing bundled runtime DLL: ${dependency.name}`);
    for(const symbol of dependency.functions)if(!available.has(symbol))throw new Error(`Bundled ${dependency.name} lacks ${symbol} required by ${name}`);
  }
}
console.log('Windows x64 原生依赖与随包运行 DLL 的导出函数核验通过。');
