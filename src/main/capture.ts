import {BrowserWindow,desktopCapturer,screen,ipcMain,type IpcMainInvokeEvent,type NativeImage} from 'electron';
import path from 'node:path';
import {cropRectangle} from '../core/capture';
type Frame={window:BrowserWindow;image:NativeImage;width:number;height:number};
export class ScreenCapture {
  private frames:Frame[]=[];private generation=0;private finish:((data:Buffer|null)=>void)|null=null;private reject:((error:Error)=>void)|null=null;
  constructor(){
    const find=(event:IpcMainInvokeEvent)=>{const frame=this.frames.find(f=>f.window.webContents===event.sender&&event.senderFrame===event.sender.mainFrame&&event.senderFrame.url==='mathapp://local/capture.html');if(!frame)throw new Error('非法截图调用。');return frame;};
    ipcMain.handle('capture:frame',event=>{const f=find(event);return {image:f.image.toDataURL(),width:f.width,height:f.height};});
    ipcMain.handle('capture:select',(event,rect)=>{const f=find(event);const area=cropRectangle(rect,{width:f.width,height:f.height},f.image.getSize());const png=f.image.crop(area).toPNG();if(png.length>20*1024*1024)throw new Error('选区超过 20 MB，请缩小区域。');this.finish?.(png);return true;});
    ipcMain.handle('capture:cancel',event=>{find(event);this.cancel();return true;});
  }
  cancel(){this.generation++;this.finish?.(null);}
  async run(main:BrowserWindow):Promise<Buffer|null>{
    if(this.finish)throw new Error('截图已经进行中。');
    const token=++this.generation;main.hide();
    let resolveResult!:(value:Buffer|null)=>void,rejectResult!:(error:Error)=>void;
    const result=new Promise<Buffer|null>((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
    // Attach rejection immediately, before native acquisition can yield.
    void result.catch(()=>{});
    this.finish=data=>resolveResult(data);this.reject=rejectResult;
    const changed=()=>this.reject?.(new Error('显示器配置发生变化，已取消截图。'));
    screen.on('display-added',changed);screen.on('display-removed',changed);screen.on('display-metrics-changed',changed);
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      await new Promise(resolve=>setTimeout(resolve,160));if(token!==this.generation)return null;
      const displays=screen.getAllDisplays();
      const sizes=displays.map(d=>({width:Math.ceil(d.bounds.width*d.scaleFactor),height:Math.ceil(d.bounds.height*d.scaleFactor)}));
      if(sizes.reduce((sum,s)=>sum+s.width*s.height,0)>64_000_000)throw new Error('屏幕总像素超过 6400 万，请减少显示器或降低分辨率后重试。');
      const acquire=desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:Math.max(...sizes.map(s=>s.width)),height:Math.max(...sizes.map(s=>s.height))},fetchWindowIcons:false});
      const sources=await Promise.race([acquire,new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('获取屏幕超过 10 秒，请重试。')),10000);}),result.then(()=>{throw new Error('截图已取消。');})]);
      clearTimeout(timer);if(token!==this.generation)return null;
      let pixels=0;
      for(const display of displays){
        const source=sources.find(s=>s.display_id===String(display.id));if(!source||source.thumbnail.isEmpty())throw new Error('无法获取显示器画面，请使用打开图片或剪贴板图片。');
        const size=source.thumbnail.getSize();pixels+=size.width*size.height;if(pixels>64_000_000)throw new Error('实际截图超过总像素限制。');
        const overlay=new BrowserWindow({x:display.bounds.x,y:display.bounds.y,width:display.bounds.width,height:display.bounds.height,frame:false,show:false,skipTaskbar:true,alwaysOnTop:true,resizable:false,movable:false,backgroundColor:'#101522',webPreferences:{preload:path.join(__dirname,'capture-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,zoomMode:'isolated',zoomFactor:1}});
        this.frames.push({window:overlay,image:source.thumbnail,width:display.bounds.width,height:display.bounds.height});
        overlay.webContents.setWindowOpenHandler(()=>({action:'deny'}));overlay.webContents.on('will-navigate',e=>e.preventDefault());
        overlay.on('closed',()=>{if(this.frames.some(f=>f.window===overlay))this.cancel();});
        overlay.webContents.on('render-process-gone',()=>this.reject?.(new Error('截图窗口异常，已取消。')));
        await overlay.loadURL('mathapp://local/capture.html');if(token!==this.generation)return null;
      }
      for(const f of this.frames)f.window.show();
      this.frames.find(f=>f.window.getBounds().x===screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds.x)?.window.focus();
      return await result;
    }catch(error){if(token!==this.generation)return null;throw error;}
    finally{
      clearTimeout(timer);this.generation++;this.finish=null;this.reject=null;
      screen.removeListener('display-added',changed);screen.removeListener('display-removed',changed);screen.removeListener('display-metrics-changed',changed);
      const frames=this.frames;this.frames=[];for(const f of frames)if(!f.window.isDestroyed())f.window.destroy();
    }
  }
}
