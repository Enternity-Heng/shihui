import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pipeline} from 'node:stream/promises';
const root=path.resolve(import.meta.dirname,'../assets/ocr');
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
async function hash(filename){const digest=crypto.createHash('sha256');for await(const chunk of createReadStream(filename))digest.update(chunk);return digest.digest('hex');}
for(const file of manifest.files){
  if(!/^[a-z_]+\.(onnx|json)$/.test(file.name)||!/^[a-f0-9]{64}$/.test(file.sha256))throw new Error('Invalid OCR manifest.');
  const filename=path.join(root,file.name);
  try{await fs.access(filename);}catch{
    if(process.argv.includes('--check'))throw new Error(`Missing OCR model: ${file.name}. Run npm run setup:ocr before building.`);
    console.log(`下载离线公式模型：${file.name}`);
    const response=await fetch(`https://github.com/RapidAI/RapidLaTeXOCR/releases/download/${manifest.release}/${file.name}`,{signal:AbortSignal.timeout(180000)});
    if(!response.ok||!response.body)throw new Error(`Model download failed: HTTP ${response.status}`);
    const temporary=filename+'.download';
    await pipeline(response.body,createWriteStream(temporary));
    if(await hash(temporary)!==file.sha256)throw new Error(`Model checksum mismatch: ${file.name}`);
    await fs.rename(temporary,filename);
  }
  if(await hash(filename)!==file.sha256)throw new Error(`OCR model checksum mismatch: ${file.name}. Restore the model from the release source archive.`);
}
console.log('离线识别模型校验通过。');
const runtimeRoot=path.resolve(import.meta.dirname,'../assets/vcruntime');
const runtime=JSON.parse(await fs.readFile(path.join(runtimeRoot,'manifest.json'),'utf8'));
for(const file of runtime.files){
  if(!/^[a-zA-Z0-9_.-]+$/.test(file.name)||await hash(path.join(runtimeRoot,file.name))!==file.sha256)throw new Error(`Bundled Windows runtime checksum mismatch: ${file.name}`);
}
console.log('随应用分发的 Windows 运行组件校验通过。');
