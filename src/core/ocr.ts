// Preprocessing follows RapidLaTeXOCR (MIT); see assets/ocr/LICENSE-RapidLaTeXOCR.txt.
export const OCR_MAX_BYTES=20*1024*1024;
export const OCR_MAX_PIXELS=16_000_000;
export const OCR_TIMEOUT_MS=90_000;
export interface GrayImage {width:number;height:number;pixels:Uint8Array}
export function checkImageSize(width:number,height:number){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width>8192||height>8192||width*height>OCR_MAX_PIXELS)throw new Error('图片过大或尺寸无效：单边最多 8192 像素，总计 1600 万像素。');
}
export function grayscaleBGRA(bitmap:Uint8Array,width:number,height:number):GrayImage {
  checkImageSize(width,height);
  if(bitmap.length!==width*height*4)throw new Error('图片像素数据不完整。');
  const pixels=new Uint8Array(width*height);
  for(let i=0;i<pixels.length;i++){
    const p=i*4,a=bitmap[p+3]/255;
    // NativeImage's little-endian bitmap is premultiplied BGRA.
    pixels[i]=Math.min(255,Math.round(.114*bitmap[p]+.587*bitmap[p+1]+.299*bitmap[p+2]+255*(1-a)));
  }
  return {width,height,pixels};
}
export function cropAndPad(image:GrayImage):GrayImage {
  const {width,height,pixels}=image;
  let min=255,max=0;
  for(const value of pixels){min=Math.min(min,value);max=Math.max(max,value);}
  if(max-min<12)throw new Error('图片中没有可辨认的公式，请截取清晰的数学内容。');
  const normalized=Uint8Array.from(pixels,value=>Math.round((value-min)*255/(max-min)));
  let sum=0;for(const value of normalized)sum+=value;
  const invert=sum/normalized.length<128;
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const index=y*width+x;
    if(invert)normalized[index]=255-normalized[index];
    if(normalized[index]<128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
  if(right<left||bottom<top)throw new Error('图片中没有可辨认的公式。');
  const w=Math.ceil((right-left+1)/32)*32,h=Math.ceil((bottom-top+1)/32)*32;
  const result=new Uint8Array(w*h).fill(255);
  for(let y=top;y<=bottom;y++)result.set(normalized.subarray(y*width+left,y*width+right+1),(y-top)*w);
  return {width:w,height:h,pixels:result};
}
export function resizeGray(image:GrayImage,width:number,height:number):GrayImage {
  width=Math.max(1,Math.floor(width));height=Math.max(1,Math.floor(height));
  const pixels=new Uint8Array(width*height);
  for(let y=0;y<height;y++){
    const py=Math.max(0,(y+.5)*image.height/height-.5),y0=Math.floor(py),y1=Math.min(y0+1,image.height-1),dy=py-y0;
    for(let x=0;x<width;x++){
      const px=Math.max(0,(x+.5)*image.width/width-.5),x0=Math.floor(px),x1=Math.min(x0+1,image.width-1),dx=px-x0;
      const a=image.pixels[y0*image.width+x0]*(1-dx)+image.pixels[y0*image.width+x1]*dx;
      const b=image.pixels[y1*image.width+x0]*(1-dx)+image.pixels[y1*image.width+x1]*dx;
      pixels[y*width+x]=Math.round(a*(1-dy)+b*dy);
    }
  }
  return {width,height,pixels};
}
export function fitImage(image:GrayImage):GrayImage {
  const ratio=Math.max(image.width/672,image.height/192,1);
  const resized=ratio>1?resizeGray(image,image.width/ratio,image.height/ratio):image;
  const width=Math.max(32,resized.width),height=Math.max(32,resized.height);
  if(width===resized.width&&height===resized.height)return resized;
  const pixels=new Uint8Array(width*height).fill(255);
  for(let y=0;y<resized.height;y++)pixels.set(resized.pixels.subarray(y*resized.width,(y+1)*resized.width),y*width);
  return {width,height,pixels};
}
export function normalizeImage(image:GrayImage){return Float32Array.from(image.pixels,value=>(value/255-.7931)/.1738);}
export function decodeTokens(ids:number[],vocabulary:Record<string,number>):string {
  const tokens=new Map(Object.entries(vocabulary).map(([text,id])=>[id,text]));
  const source=ids.filter(id=>id>2).map(id=>{
    const text=tokens.get(id);if(text===undefined)throw new Error('识别模型输出了未知字符。');return text;
  }).join('').replaceAll('Ġ',' ').trim();
  if(!source||source.length>4096||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source))throw new Error('未能得到有效 LaTeX，请裁剪清晰公式后重试。');
  return source;
}
