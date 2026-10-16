import {clipboard,dialog,nativeImage,utilityProcess,type BrowserWindow} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {imageSize} from 'image-size';
import {OCR_MAX_BYTES,OCR_TIMEOUT_MS,checkImageSize,grayscaleBGRA} from '../core/ocr';
import type {OcrReply} from '../shared/types';

export class Recognition {
  inputImage:Buffer|undefined;
  referenceImage:string|undefined;
  private cancel:(()=>void)|null=null;
  private stopped=false;
  cancelCurrent(){this.stopped=true;this.cancel?.();}
  async run(window:BrowserWindow,root:string,source:'file'|'clipboard'|Buffer):Promise<OcrReply>{
    this.stopped=false;
    this.inputImage=undefined;
    this.referenceImage=undefined;
    let data:Buffer;
    if(Buffer.isBuffer(source)){data=source;}else if(source==='file'){
      const chosen=await dialog.showOpenDialog(window,{title:'选择一张公式图片',properties:['openFile'],filters:[{name:'公式图片',extensions:['png','jpg','jpeg']}]});
      if(chosen.canceled||!chosen.filePaths[0])return {ok:true,status:'canceled',canceled:true,message:'已取消打开图片。'};
      const file=await fs.open(chosen.filePaths[0],'r');
      try{
        const stat=await file.stat();
        if(!stat.isFile()||stat.size>OCR_MAX_BYTES)throw new Error('请选择不超过 20 MB 的 PNG 或 JPEG 图片。');
        const buffer=Buffer.alloc(stat.size+1);let bytesRead=0;
        while(bytesRead<buffer.length){const chunk=await file.read(buffer,bytesRead,buffer.length-bytesRead,bytesRead);if(!chunk.bytesRead)break;bytesRead+=chunk.bytesRead;}
        if(bytesRead>stat.size)throw new Error('图片文件发生变化，请重新选择。');
        data=buffer.subarray(0,bytesRead);
      }finally{await file.close();}
    }else{
      const item=(await clipboard.read()).find(item=>item.types.includes('image/png')||item.types.includes('image/jpeg'));
      if(!item)throw new Error('剪贴板没有图片。请先截图或复制一张公式图片。');
      const blob=await item.getType(item.types.includes('image/png')?'image/png':'image/jpeg');
      if(blob.size>OCR_MAX_BYTES)throw new Error('剪贴板图片超过 20 MB，请先裁剪公式。');
      data=Buffer.from(await blob.arrayBuffer());
    }
    if(this.stopped)return {ok:true,status:'canceled',canceled:true,message:'已取消识别，原源码保持不变。'};
    if(data.length<16||data.length>OCR_MAX_BYTES)throw new Error('图片为空或超过 20 MB。');
    let dimensions;
    try{dimensions=imageSize(data);}catch{throw new Error('无法读取图片，请选择有效的 PNG 或 JPEG 图片。');}
    if(!['png','jpg'].includes(dimensions.type??''))throw new Error('目前支持 PNG、JPEG 和剪贴板截图。');
    checkImageSize(dimensions.width,dimensions.height);
    const image=nativeImage.createFromBuffer(data);
    if(image.isEmpty())throw new Error('无法解码图片，请另存为 PNG 或 JPEG 后重试。');
    const {width,height}=image.getSize();checkImageSize(width,height);
    this.inputImage=image.toPNG();
    this.referenceImage=`data:image/${dimensions.type==='jpg'?'jpeg':'png'};base64,${data.toString('base64')}`;
    const gray=grayscaleBGRA(image.toBitmap(),width,height);
    const scale=Math.min(1,420/width,110/height);
    const thumbnail=image.resize({width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))}).toDataURL();
    return new Promise(resolve=>{
      // Native inference lives in its own OS process: cancellation or a native
      // runtime fault must never terminate the input tool.
      const worker=utilityProcess.fork(path.join(__dirname,'ocr-worker.cjs'),[],{serviceName:'数学公式离线识别',stdio:'ignore'});
      let settled=false;
      const finish=(reply:OcrReply)=>{
        if(settled)return;settled=true;clearTimeout(timer);this.cancel=null;
        worker.kill();resolve(reply);
      };
      const timer=setTimeout(()=>finish({ok:false,status:'failed',message:'识别超过 90 秒，已停止。请裁剪成一条清晰公式后重试。'}),OCR_TIMEOUT_MS);
      this.cancel=()=>finish({ok:true,status:'canceled',canceled:true,message:'已取消识别，原源码保持不变。'});
      worker.on('message',message=>{
        if(settled)return;
        if(typeof message.stage==='string')window.webContents.send('math:recognition-progress',message.stage);
        else if(typeof message.latex==='string'&&message.latex.trim()&&message.latex.length<=4096)finish({ok:true,status:'completed',latex:message.latex,thumbnail,message:'已识别到 LaTeX，请对照原图核对符号和上下标。'});
        else finish({ok:false,status:'failed',message:`识别失败：${String(message.error??'结果为空或超过长度限制')}`});
      });
      worker.once('error',()=>finish({ok:false,status:'failed',message:'离线识别进程异常，请重新选择图片。'}));
      worker.once('exit',()=>finish({ok:false,status:'failed',message:'识别进程已停止，请重新选择图片。'}));
      worker.once('spawn',()=>{if(!settled)worker.postMessage({root,image:gray});});
    });
  }
}
