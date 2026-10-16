import { app, BrowserWindow, clipboard, ClipboardItem, dialog, globalShortcut, ipcMain, Menu, nativeImage, protocol, screen, Tray, type IpcMainInvokeEvent } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { captureTarget, foregroundIsOwn, isForeground, insertText, insertImage, waitForModifiers, validTarget, nativeDiagnostics, lastInsertionDiagnostics, type Target } from './native';
import { DEFAULT_SHORTCUT,DEFAULT_PREFERENCES,readPreferences,validatePreferences,canonicalShortcut,writePreferences } from './settings';
import type { AppState, Conversion, RenderReply, ActionReply,Preferences,Operation,HistoryEntry } from '../shared/types';
import {Recognition} from './recognition';
import {UserStore} from './storage';
import {ScreenCapture} from './capture';
import {randomUUID} from 'node:crypto';
import {DraftStore,imageBuffer} from './drafts';
import {readLimited} from './json-file';
import {validatePseudocode,type PseudocodePreview} from '../core/pseudocode';
import {validateFlow,renderFlowchart} from '../core/flowchart';
import {validateDiagram,renderDiagram,DIAGRAM_KINDS} from '../core/specialty-diagrams';
import {PROFESSIONAL_CASES,caseText} from '../core/professional-cases';
import type {ReviewState,Conversion as AuxiliaryConversion} from '../shared/types';

app.setName('式绘');
// Preserve the existing profile across the product rename.
app.setPath('userData',path.join(app.getPath('appData'),'数学输入助手'));
const explicitDataDirectory=app.commandLine.getSwitchValue('user-data-dir');
if(explicitDataDirectory){if(!path.isAbsolute(explicitDataDirectory))throw new Error('--user-data-dir 必须为绝对路径。');app.setPath('userData',explicitDataDirectory);}
const testMode = process.env.MATH_INPUT_TEST === '1' && !app.isPackaged;
if (testMode && process.env.MATH_INPUT_PROFILE) app.setPath('userData',process.env.MATH_INPUT_PROFILE);
protocol.registerSchemesAsPrivileged([{scheme:'mathapp',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let window: BrowserWindow;
let tray: Tray;
let target: Target | null = null;
let shortcut = DEFAULT_SHORTCUT;
let registered = false;
let preferences:Preferences={...DEFAULT_PREFERENCES};
let captureRegistered=false;
let operation:Operation='idle';
let session=0;
let capture:ScreenCapture;
let store:UserStore;
let drafts:DraftStore;
let documentVersion=0;
let review:{id:string;original:string;image?:string;historyImage?:Buffer;origin:'file'|'clipboard'|'screen';ticket:number;baseVersion:number}|null=null;
let confirmingReview=false;
let confirmedReview:{id:string;source:string;result:ActionReply}|null=null;
const auxiliaryWorkers=new Set<Worker>();
let cancelAuxiliary:(()=>void)|null=null;
let cancelPseudocodePreview:(()=>void)|null=null;
function previewPseudocode(source:unknown,lineNumbers:unknown,cancelPrevious=true):Promise<PseudocodePreview>{
  validatePseudocode(source,lineNumbers);
  if(cancelPrevious)cancelPseudocodePreview?.();
  return new Promise(resolve=>{
    const worker=new Worker(path.join(__dirname,'render-worker.cjs'));auxiliaryWorkers.add(worker);let settled=false;
    const finish=(result:PseudocodePreview)=>{if(settled)return;settled=true;clearTimeout(timer);auxiliaryWorkers.delete(worker);void worker.terminate();if(cancelPseudocodePreview===cancel)cancelPseudocodePreview=null;resolve(result);};
    const fail=(message:string)=>finish({html:'',errors:[{line:0,message}],lines:0});
    const cancel=()=>fail('预览已更新。');if(cancelPrevious)cancelPseudocodePreview=cancel;
    const timer=setTimeout(()=>fail('伪代码排版超过 2 秒，请缩短内容。'),2000);
    worker.once('message',finish);worker.once('error',()=>fail('伪代码预览失败。'));worker.once('exit',()=>fail('伪代码预览已停止。'));
    worker.postMessage({kind:'pseudocode',source,lineNumbers});
  });
}
function previewSource(source:unknown):Promise<AuxiliaryConversion>{
  if(typeof source!=='string'||source.length>4096)return Promise.resolve({kind:'error',message:'源码最多 4096 个 UTF-16 单元。'});
  cancelAuxiliary?.();
  return new Promise(resolve=>{const worker=new Worker(path.join(__dirname,'render-worker.cjs'));auxiliaryWorkers.add(worker);let settled=false;const finish=(result:AuxiliaryConversion)=>{if(settled)return;settled=true;clearTimeout(timer);auxiliaryWorkers.delete(worker);void worker.terminate();if(cancelAuxiliary===cancel)cancelAuxiliary=null;resolve(result);};const cancel=()=>finish({kind:'incomplete',message:'预览已更新。'});cancelAuxiliary=cancel;const timer=setTimeout(()=>finish({kind:'error',message:'预览超过 2 秒，请简化公式。'}),2000);worker.once('message',finish);worker.once('error',()=>finish({kind:'error',message:'预览失败。'}));worker.once('exit',()=>finish({kind:'error',message:'预览已停止。'}));worker.postMessage(source);});
}
let notice = '';
let quitting = false;
let inserting = false;
let imageBusy = false;
const recognition=new Recognition();
let targetArmed = false;
let openedAt = 0;
let opening = false;
let revision = 0;
let cached: RenderReply | null = null;
let cancelWorker: (() => void) | null = null;
let monitor: ReturnType<typeof setInterval> | null = null;
const rendererRoot = path.resolve(__dirname,'../renderer');
const pageURL = 'mathapp://local/index.html';

function state(): AppState { return {...preferences,shortcut,registered,captureRegistered,operation:inserting?'inserting':imageBusy?operation:confirmingReview?'confirming':review?'reviewing':'idle',target:target?.title ?? null,notice,version:app.getVersion()}; }
function announce() { if(window&&!window.isDestroyed()&&!window.webContents.isCrashed())try{window.webContents.send('math:state-changed',state());}catch{/* Renderer is being replaced; next state request receives the latest value. */} }
function invalidateTarget(message = '') { target = null; targetArmed = false; if (message) notice = message; announce(); }
function show(settings = false, fromHotkey = false) {
  if (inserting || imageBusy) return;
  // Repeated shortcuts while this tool is active must not overwrite its target.
  if (fromHotkey && !foregroundIsOwn()) target = captureTarget();
  else if (!window.isVisible()) target = null;
  targetArmed = false;
  openedAt = Date.now();
  notice = !registered ? '快捷键已被占用，请在设置中更换；仍可从托盘打开。' : '';
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.workArea;
  const [width,height] = window.getSize();
  window.setPosition(Math.round(area.x + (area.width - width) / 2),Math.round(area.y + Math.max(0,(area.height - height) / 3)));
  window.show(); window.focus();
  window.webContents.send('math:open',settings);
  announce();
}
function hide() {
  if (inserting || imageBusy) return;
  target = null;
  window.hide();
  announce();
}
function register(value: string) {
  try { return globalShortcut.register(value,() => { void openFromHotkey(); }); } catch { return false; }
}
async function openFromHotkey() {
  if (opening || inserting || imageBusy) return;
  if (window.isVisible() && foregroundIsOwn()) { show(false,true); return; }
  opening = true;
  const previous = captureTarget();
  try {
    const released = await waitForModifiers();
    // Alt-based shortcuts can temporarily focus a native menu. Let key-up finish
    // before recording the editing control, while retaining the same target app.
    await new Promise(resolve => setTimeout(resolve,90));
    if (!released || !previous || !validTarget(previous) || !isForeground(previous)) {
      show(); notice = '呼出期间目标或按键状态发生变化，请手动复制或重新呼出。'; announce();
    } else show(false,true);
  } catch (error) { show(); notice = `无法捕获目标：${String(error)}`; announce(); }
  finally { opening = false; }
}
function trusted(event: IpcMainInvokeEvent) {
  if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== pageURL) throw new Error('非法调用来源。');
}
function replyError(message: string): ActionReply { return {ok:false,status:'failed',message}; }
async function remember(source:string,action:string,result:{ok:boolean;message:string;status?:string},ticket:number,origin:HistoryEntry['origin']='manual',image?:Buffer){
  if(result.ok&&result.status!=='canceled')try{await store.record(source,origin,action,ticket,image);}catch(error){result.message+=` 历史保存失败：${error instanceof Error?error.message:String(error)}`;}
  return result;
}
function requestCapture(){if(!imageBusy&&!inserting&&!opening&&!quitting)window.webContents.send('math:capture-requested');}
function updatePreferences(input:unknown){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['shortcut','captureShortcut','historyEnabled','autocomplete','draftEnabled','imageStyle'].includes(k)))throw new Error('设置参数无效。');
  const next=validatePreferences({...preferences,...input as object});
  const inputChanged=canonicalShortcut(next.shortcut)!==canonicalShortcut(preferences.shortcut)||('shortcut' in input&&!registered);
  const captureChanged=canonicalShortcut(next.captureShortcut)!==canonicalShortcut(preferences.captureShortcut)||('captureShortcut' in input&&!captureRegistered);
  // Reject swaps too: neither existing action may temporarily steal the other's binding.
  if(inputChanged&&canonicalShortcut(next.shortcut)===canonicalShortcut(preferences.captureShortcut)&&captureRegistered)throw new Error('该快捷键正在用于截图，请先为截图设置其他组合。');
  if(captureChanged&&canonicalShortcut(next.captureShortcut)===canonicalShortcut(preferences.shortcut)&&registered)throw new Error('该快捷键正在用于输入，请先为输入设置其他组合。');
  let addedInput=false,addedCapture=false;
  try{
    if(inputChanged){if(!register(next.shortcut))throw new Error('输入快捷键已被占用，原设置保持不变。');addedInput=true;}
    if(captureChanged){if(!globalShortcut.register(next.captureShortcut,requestCapture))throw new Error('截图快捷键已被占用，原设置保持不变。');addedCapture=true;}
    writePreferences(app.getPath('userData'),next);
  }catch(error){if(addedInput)globalShortcut.unregister(next.shortcut);if(addedCapture)globalShortcut.unregister(next.captureShortcut);throw error;}
  if(inputChanged&&registered)globalShortcut.unregister(preferences.shortcut);
  if(captureChanged&&captureRegistered)globalShortcut.unregister(preferences.captureShortcut);
  preferences=next;shortcut=next.shortcut;if(inputChanged)registered=true;if(captureChanged)captureRegistered=true;store.setEnabled(next.historyEnabled);notice='';announce();
  return {ok:true,message:'设置已更新。'};
}
function active(id: unknown) {
  if (!Number.isSafeInteger(id) || !cached || cached.id !== id || cached.id !== revision || !['unicode','formula'].includes(cached.result.kind)) throw new Error('内容已经变化，请等待当前预览完成。');
  return cached.result as Extract<Conversion,{html:string}>;
}
function renderSource(source: string, id: number): Promise<RenderReply> {
  cancelWorker?.();
  return new Promise(resolve => {
    const worker = new Worker(path.join(__dirname,'render-worker.cjs'));
    let settled = false;
    const finish = (result: Conversion) => {
      if (settled) return;
      settled = true; clearTimeout(timer); void worker.terminate();
      if (cancelWorker === cancel) cancelWorker = null;
      const reply = {id,result};
      if (revision === id) cached = reply;
      resolve(reply);
    };
    const timer = setTimeout(() => finish({kind:'error',message:'公式计算超过 2 秒，已停止。请缩短或简化公式。'}),2000);
    const cancel = () => finish({kind:'incomplete',message:'内容已更新。'});
    cancelWorker = cancel;
    worker.once('message',finish);
    worker.once('error',error => finish({kind:'error',message:`公式计算失败：${error.message}`}));
    worker.once('exit',code => { if (!settled) finish({kind:'error',message:`公式计算已停止（${code}）。`}); });
    worker.postMessage(source);
  });
}

async function exportImage(html: string) {
  const style={...preferences.imageStyle};
  const exportWindow = new BrowserWindow({width:1400,height:600,show:false,useContentSize:true,transparent:style.background==='transparent',backgroundColor:style.background==='transparent'?'#00000000':style.background,
    webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,zoomMode:'isolated',zoomFactor:1}});
  lockWindow(exportWindow);
  try {
    await exportWindow.loadURL('mathapp://local/export.html');
    const size = await Promise.race([
      exportWindow.webContents.executeJavaScript(`window.prepareFormula(${JSON.stringify(html)},${JSON.stringify(style)})`),
      new Promise<never>((_resolve,reject) => setTimeout(() => reject(new Error('图片字体或布局准备超时。')),5000))
    ]) as {width:number;height:number};
    const width = Math.ceil(size.width), height = Math.ceil(size.height);
    const pixelWidth = width * style.scale, pixelHeight = height * style.scale;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || pixelWidth > 8192 || pixelHeight > 8192 || pixelWidth * pixelHeight > 16_000_000) throw new Error('图片超过尺寸限制，请缩短公式（单边 8192 像素，总计 1600 万像素）。');
    exportWindow.webContents.setZoomFactor(style.scale);
    exportWindow.setContentSize(pixelWidth,pixelHeight);
    await exportWindow.webContents.executeJavaScript('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    let image;
    try{image=await exportWindow.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true});}
    catch{await new Promise(resolve=>setTimeout(resolve,120));image=await exportWindow.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true});}
    if (image.isEmpty()) throw new Error('图片捕获为空，请重新尝试。');
    return image.resize({width:pixelWidth,height:pixelHeight,quality:'best'});
  } finally { if (!exportWindow.isDestroyed()) exportWindow.destroy(); }
}
function lockWindow(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  win.webContents.on('will-navigate',event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback) => callback(false));
}
function installIPC() {
  const handle = (channel:string, callback:(...args:any[]) => unknown) => ipcMain.handle(channel,async (event,...args) => {
    trusted(event);
    try { const result=await callback(...args);if(result&&typeof result==='object'&&'ok' in result){const r=result as {ok:boolean;status?:string;canceled?:boolean};return {...result,status:r.status??(r.ok?(r.canceled?'canceled':'completed'):'failed')};}return result; }
    catch (error) { return replyError(error instanceof Error ? error.message : String(error)); }
  });
  handle('math:state',state);
  handle('math:editor-version',(version:unknown)=>{if(!Number.isSafeInteger(version)||(version as number)<documentVersion)throw new Error('编辑版本无效。');documentVersion=version as number;});
  handle('math:preview',source=>previewSource(source));
  handle('math:case-copy',async(id:unknown)=>{if(inserting||imageBusy)return replyError('已有操作进行中。');const entry=PROFESSIONAL_CASES.find(c=>c.id===id);if(!entry)throw Error('案例不存在。');await clipboard.writeText(caseText(entry));return {ok:true,message:'已复制案例全文（含条件、步骤、结论及方法来源）。'};});
  handle('math:diagram-preview',value=>renderDiagram(value??null,preferences.imageStyle.fontSize,preferences.imageStyle.foreground));
  handle('math:diagram-output',async(value:unknown,action:unknown)=>{
    if(inserting||imageBusy)return replyError('已有操作进行中。');
    const diagram=validateDiagram(value??null);if(!['copy-source','copy-image','save-png'].includes(action as string))throw Error('专业绘图输出动作无效。');
    imageBusy=true;operation='exporting';announce();
    try{
      if(action==='copy-source'){await clipboard.writeText(JSON.stringify(diagram,null,2));return {ok:true,message:'已复制可编辑的专业绘图内容，可粘贴恢复。'};}
      const result=renderDiagram(diagram,preferences.imageStyle.fontSize,preferences.imageStyle.foreground);if(result.errors.length)throw Error(result.errors.join('\n'));
      const image=await exportImage(result.html),title=DIAGRAM_KINDS[diagram.kind];
      if(action==='copy-image'){await clipboard.write([new ClipboardItem({'image/png':new Blob([new Uint8Array(image.toPNG())],{type:'image/png'})})]);return {ok:true,message:`已复制${title}图片。`};}
      const chosen=await dialog.showSaveDialog(window,{title:`保存${title}`,defaultPath:`${title}.png`,filters:[{name:'PNG 图片',extensions:['png']}]});
      if(chosen.canceled||!chosen.filePath)return {ok:true,status:'canceled',message:'已取消保存。'};
      await fs.writeFile(chosen.filePath,image.toPNG());return {ok:true,message:`${title} PNG 已保存。`};
    }finally{imageBusy=false;operation='idle';announce();}
  });
  handle('math:flowchart-preview',value=>renderFlowchart(value??null,preferences.imageStyle.fontSize,preferences.imageStyle.foreground));
  handle('math:flowchart-output',async(value:unknown,action:unknown)=>{
    if(inserting||imageBusy)return replyError('已有操作进行中。');
    const flow=validateFlow(value??null);if(!['copy-source','copy-image','save-png'].includes(action as string))throw Error('流程图输出动作无效。');
    imageBusy=true;operation='exporting';announce();
    try{
      if(action==='copy-source'){await clipboard.writeText(JSON.stringify(flow,null,2));return {ok:true,message:'已复制可编辑的流程图内容，可粘贴恢复。'};}
      const result=renderFlowchart(flow,preferences.imageStyle.fontSize,preferences.imageStyle.foreground);if(result.errors.length)throw Error(result.errors.join('\n'));
      const image=await exportImage(result.html);
      if(action==='copy-image'){await clipboard.write([new ClipboardItem({'image/png':new Blob([new Uint8Array(image.toPNG())],{type:'image/png'})})]);return {ok:true,message:'已复制流程图图片。'};}
      const chosen=await dialog.showSaveDialog(window,{title:'保存流程图图片',defaultPath:'流程图.png',filters:[{name:'PNG 图片',extensions:['png']}]});
      if(chosen.canceled||!chosen.filePath)return {ok:true,status:'canceled',message:'已取消保存。'};
      await fs.writeFile(chosen.filePath,image.toPNG());return {ok:true,message:'流程图 PNG 已保存。'};
    }finally{imageBusy=false;operation='idle';announce();}
  });
  handle('math:pseudocode-preview',(source,lineNumbers)=>previewPseudocode(source,lineNumbers));
  handle('math:pseudocode-output',async(source:unknown,lineNumbers:unknown,action:unknown)=>{
    if(inserting||imageBusy)return replyError('已有操作进行中。');
    validatePseudocode(source,lineNumbers);
    if(!source.trim())throw new Error('请先输入伪代码。');
    if(!['copy-text','copy-image','save-png'].includes(action as string))throw new Error('伪代码输出动作无效。');
    imageBusy=true;operation='exporting';announce();
    try{
      if(action==='copy-text'){await clipboard.writeText(source);return {ok:true,message:'已复制伪代码文本（保留公式定界符，不含展示行号）。'};}
      const result=await previewPseudocode(source,lineNumbers,false);
      if(result.errors.length)throw new Error(result.errors.map(error=>`${error.line?`第 ${error.line} 行：`:''}${error.message}`).join('\n'));
      const image=await exportImage(result.html);
      if(action==='copy-image'){
        await clipboard.write([new ClipboardItem({'image/png':new Blob([new Uint8Array(image.toPNG())],{type:'image/png'})})]);
        return {ok:true,message:'已复制伪代码图片，可粘贴到支持图片的软件。'};
      }
      const chosen=await dialog.showSaveDialog(window,{title:'保存伪代码图片',defaultPath:'算法伪代码.png',filters:[{name:'PNG 图片',extensions:['png']}]});
      if(chosen.canceled||!chosen.filePath)return {ok:true,status:'canceled',message:'已取消保存。'};
      await fs.writeFile(chosen.filePath,image.toPNG());return {ok:true,message:'伪代码 PNG 已保存。'};
    }finally{imageBusy=false;operation='idle';announce();}
  });
  handle('math:draft',()=>drafts.snapshot());
  handle('math:save-draft',(snapshot,epoch)=>{if(confirmedReview&&snapshot?.review?.id===confirmedReview.id){snapshot=structuredClone(snapshot);snapshot.review=null;snapshot.editor={text:confirmedReview!.source,start:confirmedReview!.source.length,end:confirmedReview!.source.length};if(snapshot.panel==='review-panel')snapshot.panel=null;}drafts.accept(snapshot,epoch);return {ok:true,message:'草稿已接收。'};});
  handle('math:flush-draft',async()=>{await drafts.flush();return {ok:true,message:'草稿已保存。'};});
  handle('math:clear-draft',async()=>{const epoch=await drafts.clear(true);return {ok:true,epoch,message:'草稿已清除。'};});
  handle('math:review-image',(id:string)=>{if(review?.id!==id)throw new Error('核对会话已过期。');return {image:review.image};});
  handle('math:restore-review',(value:ReviewState)=>{if(review||confirmingReview||imageBusy)throw new Error('已有核对会话。');if(!value||typeof value.original!=='string'||value.original.length>4096||!['file','clipboard','screen'].includes(value.origin))throw new Error('核对数据无效。');if(value.image)imageBuffer(value.image);invalidateTarget();review={id:randomUUID(),original:value.original,image:value.image,historyImage:value.image?nativeImage.createFromBuffer(imageBuffer(value.image)).toPNG():undefined,origin:value.origin,ticket:value.historyGeneration===store.historyGeneration()?store.ticket():-1,baseVersion:documentVersion};return {ok:true,reviewId:review.id,message:'已恢复待核对结果。'};});
  handle('math:discard-review',(id:string)=>{if(confirmingReview)throw new Error('正在确认，请稍候。');if(review?.id===id)review=null;return {ok:true,message:'已放弃识别结果。'};});
  handle('math:confirm-review',async(id:string,source:string)=>{
    if(confirmedReview?.id===id){if(confirmedReview.source!==source)throw new Error('此结果已确认，不能重复应用不同内容。');return confirmedReview.result;}
    if(!review||review.id!==id||confirmingReview)throw new Error('核对会话已过期或正在确认。');const current=review;if(documentVersion!==current.baseVersion)throw new Error('原编辑源码已变化，请先处理原稿后重新识别。');
    confirmingReview=true;try{const converted=await previewSource(source);if(converted.kind!=='unicode'&&converted.kind!=='formula')throw new Error('请先修正核对源码。');if(review!==current||documentVersion!==current.baseVersion)throw new Error('核对期间原稿发生变化。');const result:ActionReply={ok:true,status:'completed',message:'识别结果已确认，可继续编辑。'};confirmedReview={id,source,result};review=null;await remember(source,'核对后识别',result,current.ticket,current.origin,current.historyImage);return result;}finally{confirmingReview=false;}
  });
  handle('math:recognize-image',async(source:unknown)=>{
    if(source!=='file'&&source!=='clipboard'&&source!=='screen')throw new Error('图片来源无效。');
    if(inserting||imageBusy||review||confirmingReview)return replyError('请先确认或放弃当前识别结果。');
    const ticket=store.ticket(),token=++session;
    imageBusy=true;operation=source==='screen'?'capturing':'recognizing';invalidateTarget();cancelWorker?.();revision++;cached=null;
    try{
      const input=source==='screen'?await capture.run(window):source;
      if(input===null||token!==session)return {ok:true,canceled:true,status:'canceled',message:'已取消截图，原源码保持不变。'};
      operation='recognizing';announce();if(source==='screen'&&!quitting){window.show();window.focus();}
      const reply=await recognition.run(window,app.isPackaged?path.join(process.resourcesPath,'ocr'):path.resolve('assets/ocr'),input);
      if(token!==session)return {ok:true,canceled:true,status:'canceled',message:'已取消识别，原源码保持不变。'};
      if(reply.latex&&reply.status==='completed'){review={id:randomUUID(),original:reply.latex,image:recognition.referenceImage,historyImage:recognition.inputImage,origin:source,ticket,baseVersion:documentVersion};reply.reviewId=review.id;reply.historyGeneration=store.historyGeneration();reply.message='识别完成，请核对后确认应用。';}
      return reply;
    }finally{if(testMode&&recognition.inputImage&&(globalThis as any).__mathTest)(globalThis as any).__mathTest.lastRecognitionImage=recognition.inputImage.toString('base64');recognition.inputImage=undefined;imageBusy=false;operation='idle';if(source==='screen'&&!quitting){window.show();window.focus();}announce();}
  });
  handle('math:cancel-recognition',()=>{if(!imageBusy||!['capturing','recognizing'].includes(operation))return replyError('当前没有可取消的识别；已完成的结果正在保存时请稍候。');session++;store.barrier();capture.cancel();recognition.cancelCurrent();return {ok:true,message:'正在取消识别…'};});
  handle('math:preferences',async input=>{const result=updatePreferences(input);if(drafts.enabled!==preferences.draftEnabled){drafts.enabled=preferences.draftEnabled;if(!drafts.enabled)await drafts.clear(true);}return result;});
  handle('math:commands',()=>({commands:store.listCommands(),warning:store.warning}));
  handle('math:favorites',()=>({...store.library.snapshot(),warning:store.warning||store.library.warning}));
  handle('math:save-category',async value=>{await store.library.saveCategory(value);return {ok:true,message:'分类已保存。'};});
  handle('math:delete-category',async id=>{await store.library.deleteCategory(id);return {ok:true,message:'分类已删除，收藏已移至未分类。'};});
  handle('math:export-favorites',async()=>{const chosen=await dialog.showSaveDialog(window,{title:'备份收藏与分类',defaultPath:'数学收藏备份.json',filters:[{name:'收藏备份',extensions:['json']}]});if(chosen.canceled||!chosen.filePath)return {ok:true,status:'canceled',message:'已取消备份。'};await fs.writeFile(chosen.filePath,JSON.stringify(store.library.snapshot(),null,2),'utf8');return {ok:true,message:'收藏与分类已备份。'};});
  handle('math:import-favorites',async()=>{const chosen=await dialog.showOpenDialog(window,{title:'导入收藏与分类',properties:['openFile'],filters:[{name:'收藏备份',extensions:['json']}]});if(chosen.canceled||!chosen.filePaths[0])return {ok:true,status:'canceled',message:'已取消导入。'};const summary=store.library.preflight(await readLimited(chosen.filePaths[0]));return {ok:true,message:'请核对导入摘要。',summary};});
  handle('math:commit-favorites-import',async id=>{await store.library.commit(id);return {ok:true,message:'收藏与分类已合并导入。'};});
  handle('math:save-favorite',async value=>{await store.saveFavorite(value);return {ok:true,message:'收藏已保存。'};});
  handle('math:delete-favorite',async id=>{await store.deleteFavorite(id);return {ok:true,message:'收藏已删除。'};});
  handle('math:save-command',async value=>{await store.saveCommand(value);return {ok:true,message:'命令已保存。'};});
  handle('math:delete-command',async id=>{await store.deleteCommand(id);return {ok:true,message:'命令已删除。'};});
  handle('math:history',(query,page)=>store.list(query,page));
  handle('math:history-detail',id=>store.detail(id));
  let previewBusy=false;
  handle('math:history-preview',async id=>{
    if(previewBusy)throw new Error('预览进行中，请稍后。');const source=store.source(id);previewBusy=true;
    try{return await new Promise<Conversion>((resolve)=>{const worker=new Worker(path.join(__dirname,'render-worker.cjs'));let settled=false;const finish=(value:Conversion)=>{if(settled)return;settled=true;clearTimeout(timer);void worker.terminate();resolve(value);};const timer=setTimeout(()=>finish({kind:'error',message:'历史预览超过 2 秒。'}),2000);worker.once('message',finish);worker.once('error',()=>finish({kind:'error',message:'历史预览失败。'}));worker.once('exit',()=>finish({kind:'error',message:'历史预览已停止。'}));worker.postMessage(source);});}finally{previewBusy=false;}
  });
  handle('math:delete-history',async id=>{await store.deleteHistory(id);return {ok:true,message:'记录已删除。'};});
  handle('math:clear-history',async()=>{const result=await dialog.showMessageBox(window,{type:'question',buttons:['取消','清空历史'],defaultId:0,cancelId:0,message:'清空全部历史和附图？此操作无法撤销。'});if(result.response!==1)return {ok:true,status:'canceled',message:'已取消清空。'};await store.clear();return {ok:true,message:'历史已清空。'};});
  handle('math:render',async (source:unknown) => {
    if (inserting || imageBusy) throw new Error('操作进行中，请稍后。');
    const id = ++revision;
    cached = null;
    if (typeof source !== 'string' || source.length > 4096) {
      cancelWorker?.();
      return {id,result:{kind:'error',message:'源码必须是文字，且不能超过 4096 个 UTF-16 单元。'}};
    }
    return renderSource(source,id);
  });
  handle('math:insert',async (id:unknown) => {
    if (inserting || imageBusy) return replyError('已有操作进行中。');
    const current = active(id);
    if (current.kind !== 'unicode') return replyError('此公式需要图片排版，请复制图片。');
    if (!target || !validTarget(target)) return replyError('没有有效的插入目标，请在目标软件里按快捷键重新呼出。');
    const captured = target;
    const ticket=store.ticket();
    inserting = true;
    window.hide();
    try {
      const result = await insertText(captured,current.text);
      target = null;
      if (!result.ok) { notice = result.message; window.show(); window.focus(); announce(); }
      return await remember(current.source,'已发送文字插入请求',result,ticket);
    } finally { inserting = false; announce(); }
  });
  handle('math:copy',async (id:unknown,type:unknown) => {
    if (inserting || imageBusy) return replyError('已有操作进行中。');
    const current = active(id);
    const ticket=store.ticket();
    if (type === 'source'||(type==='text'&&current.kind==='unicode')) {imageBusy=true;operation='exporting';try{await clipboard.writeText(type==='source'?current.source:(current as Extract<Conversion,{text:string}>).text);return await remember(current.source,'复制', {ok:true,message:type==='source'?'已复制 LaTeX 源码。':'已复制数学符号。'},ticket);}finally{imageBusy=false;operation='idle';}}
    if (type !== 'image') throw new Error('不支持的复制类型。');
    imageBusy = true;
    operation='exporting';
    try {
      const image = await exportImage(current.html);
      active(id);
      await clipboard.write([new ClipboardItem({'image/png':new Blob([new Uint8Array(image.toPNG())],{type:'image/png'})})]);
      return await remember(current.source,'复制图片',{ok:true,message:'已复制公式图片，可粘贴到支持图片的软件。'},ticket);
    } finally { imageBusy = false; }
  });
  handle('math:insert-image',async (id:unknown) => {
    if(inserting||imageBusy)return replyError('已有操作进行中。');
    const current=active(id);
    if(!target||!validTarget(target))return replyError('没有有效的插入目标，请回到目标软件重新按快捷键呼出，或使用“复制图片”。');
    const captured=target;
    const ticket=store.ticket();operation='exporting';
    imageBusy=true;
    try{
      const image=await exportImage(current.html);
      active(id);
      if(target!==captured||!validTarget(captured)||!foregroundIsOwn())return replyError('生成图片期间目标发生变化，已取消插入；请重新呼出或复制图片。');
      inserting=true;
      window.hide();
      let result:{ok:boolean;message:string};
      try{
        result=await insertImage(captured,async()=>{
          active(id);
          await clipboard.write([new ClipboardItem({'image/png':new Blob([new Uint8Array(image.toPNG())],{type:'image/png'})})]);
        });
      }catch(error){result=replyError(`图片插入失败：${error instanceof Error?error.message:String(error)}`);}
      target=null;
      if(!result.ok){notice=result.message;window.show();window.focus();}
      return await remember(current.source,'已发送图片插入请求',result,ticket);
    }finally{inserting=false;imageBusy=false;announce();}
  });
  handle('math:save',async (id:unknown) => {
    if (inserting || imageBusy) return replyError('已有操作进行中。');
    const current = active(id);
    const ticket=store.ticket();operation='exporting';
    imageBusy = true;
    try {
      const image = await exportImage(current.html);
      const chosen = await dialog.showSaveDialog(window,{title:'保存公式图片',defaultPath:'数学公式.png',filters:[{name:'PNG 图片',extensions:['png']}]});
      if (chosen.canceled || !chosen.filePath) return {ok:true,status:'canceled',message:'已取消保存。'};
      active(id);
      await fs.writeFile(chosen.filePath,image.toPNG());
      return await remember(current.source,'保存 PNG',{ok:true,message:'公式图片已保存。'},ticket);
    } finally { imageBusy = false; }
  });
  handle('math:shortcut',(value:unknown)=>updatePreferences({shortcut:value}));
  ipcMain.on('math:hide',event => { try { trusted(event as unknown as IpcMainInvokeEvent); hide(); } catch { /* Reject untrusted fire-and-forget IPC without crashing. */ } });
}

async function start() {
  await protocol.handle('mathapp', async request => {
    const url = new URL(request.url);
    if (url.hostname !== 'local' || request.method !== 'GET') return new Response('Forbidden',{status:403});
    const filename = path.resolve(rendererRoot,`.${decodeURIComponent(url.pathname)}`);
    if (!filename.startsWith(rendererRoot + path.sep)) return new Response('Forbidden',{status:403});
    const mime:Record<string,string> = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.png':'image/png'};
    try { return new Response(new Uint8Array(await fs.readFile(filename)),{headers:{'Content-Type':mime[path.extname(filename)] ?? 'application/octet-stream','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'"}}); }
    catch { return new Response('Not found',{status:404}); }
  });
  const icon = nativeImage.createFromPath(path.join(__dirname,'icon.png'));
  window = new BrowserWindow({width:780,height:640,minWidth:640,minHeight:540,show:false,title:'式绘',icon,autoHideMenuBar:true,backgroundColor:'#f5f7fb',
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,zoomMode:'isolated',zoomFactor:1}});
  lockWindow(window);
  window.webContents.on('render-process-gone',()=>{invalidateTarget();session++;revision++;cached=null;documentVersion=0;review=null;confirmingReview=false;confirmedReview=null;cancelWorker?.();cancelAuxiliary?.();capture?.cancel();recognition.cancelCurrent();if(!quitting)setTimeout(()=>{if(!window.isDestroyed())void window.loadURL(pageURL);},100);});
  window.on('close',event => { if (!quitting) { event.preventDefault();void drafts?.flush().then(()=>hide()).catch(error=>{notice=String(error);announce();}); } });
  const loaded=readPreferences(app.getPath('userData'));preferences=loaded.value;shortcut=preferences.shortcut;
  store=new UserStore(app.getPath('userData'));await store.init();store.setEnabled(preferences.historyEnabled);
  drafts=new DraftStore(path.join(app.getPath('userData'),'workspace'),value=>{if(window&&!window.isDestroyed())window.webContents.send('math:draft-status',value);});await drafts.init();drafts.enabled=preferences.draftEnabled;if(!drafts.enabled)await drafts.clear();
  capture=new ScreenCapture();
  installIPC();
  registered = register(shortcut);
  try{captureRegistered=globalShortcut.register(preferences.captureShortcut,requestCapture);}catch{captureRegistered=false;}
  tray = new Tray(icon.resize({width:24,height:24}));
  tray.setToolTip('式绘 · 公式、算法与科学绘图');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'打开输入框',click:() => show()},{label:'截图识别',click:requestCapture},{label:'设置快捷键',click:() => show(true)},{type:'separator'},{label:'退出',click:() => app.quit()}]));
  tray.on('double-click',() => show());
  await window.loadURL(pageURL);
  // A fresh launch is visible; hiding it leaves the app available in the tray.
  show(!registered);
  notice=[notice,loaded.warning,store.warning,!captureRegistered?'截图快捷键被占用，请在设置中更换；仍可使用按钮或托盘。':''].filter(Boolean).join(' ');announce();
  monitor = setInterval(() => {
    if (!target || !window.isVisible() || inserting) return;
    if (!validTarget(target)) { invalidateTarget('原窗口已关闭，请重新使用快捷键呼出。'); return; }
    const own = foregroundIsOwn();
    if (!targetArmed && own) targetArmed = true;
    else if ((targetArmed && !own) || (!targetArmed && Date.now() - openedAt > 800)) invalidateTarget('检测到外部焦点变化，已取消原插入目标。请重新使用快捷键呼出。');
  },100);
  if (testMode) {
    (globalThis as any).__mathTest = {window,state,show,hide,captureTarget,nativeDiagnostics,lastInsertionDiagnostics,exportImage,store,capture,requestCapture,
      bind:() => { target = captureTarget(); return target; }};
  }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',() => { if (window) show(); });
  app.on('before-quit',event => {if(quitting)return;event.preventDefault();quitting=true;session++;store?.barrier(false);cancelWorker?.();cancelAuxiliary?.();capture?.cancel();recognition.cancelCurrent();review=null;if(monitor)clearInterval(monitor);void Promise.allSettled([store?.flush(),drafts?.flush()]).finally(()=>app.quit());});
  app.on('will-quit',() => globalShortcut.unregisterAll());
  app.on('window-all-closed',() => {});
  void app.whenReady().then(start).catch(error => { dialog.showErrorBox('式绘启动失败',String(error)); app.exit(1); });
}
