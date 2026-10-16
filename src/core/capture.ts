export function cropRectangle(rect:unknown,logical:{width:number;height:number},pixels:{width:number;height:number}){
  const r=rect as {x:number;y:number;width:number;height:number};
  if(!r||![r.x,r.y,r.width,r.height,logical.width,logical.height,pixels.width,pixels.height].every(Number.isFinite)||logical.width<=0||logical.height<=0||pixels.width<=0||pixels.height<=0||r.width<3||r.height<3||r.x<0||r.y<0||r.x+r.width>logical.width+1||r.y+r.height>logical.height+1)throw new Error('选区无效，请在同一显示器内框选至少 3×3 的区域。');
  const x=Math.max(0,Math.floor(r.x*pixels.width/logical.width)),y=Math.max(0,Math.floor(r.y*pixels.height/logical.height));
  const right=Math.min(pixels.width,Math.ceil((r.x+r.width)*pixels.width/logical.width)),bottom=Math.min(pixels.height,Math.ceil((r.y+r.height)*pixels.height/logical.height));
  if(right-x>8192||bottom-y>8192||(right-x)*(bottom-y)>16_000_000)throw new Error('选区图片过大，请仅截取一条公式。');
  return {x,y,width:right-x,height:bottom-y};
}
