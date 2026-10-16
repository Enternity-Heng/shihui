import fs from 'node:fs/promises';
import path from 'node:path';
import * as ort from 'onnxruntime-node';
import {cropAndPad,fitImage,resizeGray,normalizeImage,decodeTokens,type GrayImage} from '../core/ocr';

const parentPort=process.parentPort;
async function recognize({root,image}:{root:string;image:GrayImage}){
  const sessions:ort.InferenceSession[]=[];
  try{
    const original=fitImage(cropAndPad(image));
    parentPort!.postMessage({stage:'正在加载离线模型…'});
    const options:ort.InferenceSession.SessionOptions={executionProviders:['cpu'],intraOpNumThreads:2,interOpNumThreads:1,logSeverityLevel:3};
    for(const name of ['image_resizer','encoder','decoder'])sessions.push(await ort.InferenceSession.create(path.join(root,`${name}.onnx`),options));
    const [resizer,encoder,decoder]=sessions;
    let current=original,ratio=1,width=original.width,height=original.height;
    const tensor=(img:GrayImage)=>new ort.Tensor('float32',normalizeImage(img),[1,1,img.height,img.width]);
    parentPort!.postMessage({stage:'正在读取公式图像…'});
    for(let attempt=0;attempt<10;attempt++){
      height=Math.max(1,Math.floor(height*ratio));
      current=cropAndPad(fitImage(resizeGray(original,width,height)));
      const output=await resizer.run({[resizer.inputNames[0]]:tensor(current)});
      const values=output[resizer.outputNames[0]].data as Float32Array;
      let best=0;for(let i=1;i<values.length;i++)if(values[i]>values[best])best=i;
      width=(best+1)*32;
      if(width===current.width)break;
      ratio=width/current.width;
    }
    const encoded=await encoder.run({[encoder.inputNames[0]]:tensor(current)});
    const context=encoded[encoder.outputNames[0]],ids=[1];
    let finished=false;
    for(let step=0;step<512;step++){
      const result=await decoder.run({x:new ort.Tensor('int64',BigInt64Array.from(ids,BigInt),[1,ids.length]),mask:new ort.Tensor('bool',new Uint8Array(ids.length).fill(1),[1,ids.length]),context});
      const logits=result[decoder.outputNames[0]],vocabSize=logits.dims[logits.dims.length-1];
      const values=logits.data as Float32Array,offset=values.length-vocabSize;
      let best=0;for(let i=1;i<vocabSize;i++)if(values[offset+i]>values[offset+best])best=i;
      if(best===2){finished=true;break;}
      ids.push(best);
      if(step%12===0)parentPort!.postMessage({stage:`正在生成 LaTeX…（${step+1}）`});
    }
    if(!finished)throw new Error('公式过长或无法可靠识别，请裁剪成单条公式后重试。');
    const tokenizer=JSON.parse(await fs.readFile(path.join(root,'tokenizer.json'),'utf8'));
    return decodeTokens(ids,tokenizer.model.vocab);
  }finally{for(const session of sessions)await session.release();}
}
parentPort.once('message',event=>{
  recognize(event.data).then(latex=>parentPort.postMessage({latex})).catch(error=>parentPort.postMessage({error:error instanceof Error?error.message:String(error)}));
});
