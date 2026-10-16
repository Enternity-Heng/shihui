import './capture.css';
declare global {interface Window {capture:{frame():Promise<{image:string;width:number;height:number}>;select(rect:{x:number;y:number;width:number;height:number}):Promise<boolean>;cancel():Promise<boolean>}}}
const image=document.getElementById('screen') as HTMLImageElement,selection=document.getElementById('selection')!,tip=document.getElementById('tip')!;
let start:{x:number;y:number}|null=null,rect:{x:number;y:number;width:number;height:number}|null=null,submitting=false;
void window.capture.frame().then(frame=>{image.src=frame.image;}).catch(()=>void window.capture.cancel());
document.addEventListener('contextmenu',event=>{event.preventDefault();void window.capture.cancel();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')void window.capture.cancel();});
document.addEventListener('pointerdown',event=>{if(event.button!==0||submitting)return;start={x:event.clientX,y:event.clientY};rect=null;selection.hidden=false;(event.target as HTMLElement).setPointerCapture?.(event.pointerId);});
document.addEventListener('pointermove',event=>{if(!start||submitting)return;const x=Math.max(0,Math.min(innerWidth,event.clientX)),y=Math.max(0,Math.min(innerHeight,event.clientY));rect={x:Math.min(start.x,x),y:Math.min(start.y,y),width:Math.abs(x-start.x),height:Math.abs(y-start.y)};Object.assign(selection.style,{left:`${rect.x}px`,top:`${rect.y}px`,width:`${rect.width}px`,height:`${rect.height}px`});tip.textContent=`${Math.round(rect.width)} × ${Math.round(rect.height)} · 松开自动识别 · Esc 取消`;});
document.addEventListener('pointerup',()=>{if(submitting)return;start=null;if(!rect||rect.width<3||rect.height<3){selection.hidden=true;tip.textContent='选区太小，请重新拖动框选。';return;}submitting=true;void window.capture.select(rect).catch(error=>{tip.textContent=String(error);selection.hidden=true;submitting=false;});});
