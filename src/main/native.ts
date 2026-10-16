import koffi from 'koffi';
import { sendUnicodeOnce,sendPasteOnce,type KeyboardInputEvent } from '../core/keyboard';

type Handle = number | bigint;
export interface Target {
  hwnd: Handle; pid: number; thread: number; created: string; focus: Handle;
  title: string;
}

const user = koffi.load('user32.dll');
const kernel = koffi.load('kernel32.dll');
const Rectangle = koffi.struct('MathRect', {left:'int32_t',top:'int32_t',right:'int32_t',bottom:'int32_t'});
const GUI = koffi.struct('MathGuiThreadInfo', {
  cbSize:'uint32_t', flags:'uint32_t', hwndActive:'uintptr_t', hwndFocus:'uintptr_t',
  hwndCapture:'uintptr_t', hwndMenuOwner:'uintptr_t', hwndMoveSize:'uintptr_t', hwndCaret:'uintptr_t', rcCaret:Rectangle
});
const FileTime = koffi.struct('MathFileTime', {low:'uint32_t',high:'uint32_t'});
const Keyboard = koffi.struct('MathKeyboard', {wVk:'uint16_t',wScan:'uint16_t',dwFlags:'uint32_t',time:'uint32_t',dwExtraInfo:'uintptr_t'});
const Mouse = koffi.struct('MathMouse', {dx:'int32_t',dy:'int32_t',mouseData:'uint32_t',dwFlags:'uint32_t',time:'uint32_t',dwExtraInfo:'uintptr_t'});
const Hardware = koffi.struct('MathHardware', {uMsg:'uint32_t',wParamL:'uint16_t',wParamH:'uint16_t'});
const InputUnion = koffi.union('MathInputUnion', {ki:Keyboard,mi:Mouse,hi:Hardware});
const Input = koffi.struct('MathInput', {type:'uint32_t',data:InputUnion});

const foreground = user.func('uintptr_t __stdcall GetForegroundWindow()');
const isWindow = user.func('bool __stdcall IsWindow(uintptr_t hwnd)');
const setForeground = user.func('bool __stdcall SetForegroundWindow(uintptr_t hwnd)');
const getProcess = user.func('uint32_t __stdcall GetWindowThreadProcessId(uintptr_t hwnd, _Out_ uint32_t *pid)');
const getTitle = user.func('int __stdcall GetWindowTextW(uintptr_t hwnd, _Out_ uint16_t *text, int count)');
const guiInfo = user.func('bool __stdcall GetGUIThreadInfo(uint32_t thread, _Inout_ MathGuiThreadInfo *info)');
const getKey = user.func('int16_t __stdcall GetAsyncKeyState(int key)');
const sendInput = user.func('uint32_t __stdcall SendInput(uint32_t count, MathInput *inputs, int size)');
const openProcess = kernel.func('uintptr_t __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)');
const closeHandle = kernel.func('bool __stdcall CloseHandle(uintptr_t handle)');
const processTimes = kernel.func('bool __stdcall GetProcessTimes(uintptr_t handle, _Out_ MathFileTime *creation, _Out_ MathFileTime *exit, _Out_ MathFileTime *kernel, _Out_ MathFileTime *user)');
const getError = kernel.func('uint32_t __stdcall GetLastError()');
let insertionDiagnostic: Record<string,unknown> = {};
export function lastInsertionDiagnostics() { return insertionDiagnostic; }

function equal(a: Handle, b: Handle) { return BigInt(a) === BigInt(b); }
function identity(hwnd: Handle): {pid:number;thread:number;created:string} | null {
  if (!isWindow(hwnd)) return null;
  const pid = [0];
  const thread = getProcess(hwnd, pid) as number;
  if (!thread || !pid[0] || pid[0] === process.pid) return null;
  const handle = openProcess(0x1000, false, pid[0]) as Handle;
  if (!handle) return null;
  const creation: Record<string, number> = {}, exit = {}, kt = {}, ut = {};
  try {
    if (!processTimes(handle, creation, exit, kt, ut)) return null;
    return {pid:pid[0], thread, created:`${creation.high}:${creation.low}`};
  } finally { closeHandle(handle); }
}
function focus(thread: number): Handle {
  const info: Record<string, unknown> = {cbSize:koffi.sizeof(GUI)};
  return guiInfo(thread, info) ? info.hwndFocus as Handle : 0;
}
export function captureTarget(): Target | null {
  const hwnd = foreground() as Handle;
  const info = identity(hwnd);
  if (!info) return null;
  const buffer = Buffer.alloc(2048);
  const count = getTitle(hwnd, buffer, 1024) as number;
  const title = count ? buffer.subarray(0,count * 2).toString('utf16le') : `应用 ${info.pid}`;
  return {hwnd, ...info, focus:focus(info.thread), title};
}
export function validTarget(target: Target): boolean {
  const current = identity(target.hwnd);
  return !!current && current.pid === target.pid && current.thread === target.thread && current.created === target.created;
}
export function isForeground(target: Target): boolean { return equal(foreground(), target.hwnd); }
export function foregroundIsOwn(): boolean {
  const pid = [0];
  getProcess(foreground(), pid);
  return pid[0] === process.pid;
}
export async function waitForModifiers(timeout = 1200): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while ([0x10,0x11,0x12,0x5b,0x5c].some(key => (getKey(key) & 0x8000) !== 0)) {
    if (Date.now() > deadline) return false;
    await new Promise(resolve => setTimeout(resolve,20));
  }
  return true;
}
async function restoreInputTarget(target: Target): Promise<{ok:boolean;message:string}> {
  if (!validTarget(target)) return {ok:false,message:'原窗口已关闭或身份发生变化，请重新呼出输入框。'};
  const until = Date.now() + 1200;
  const modifiers = [0x10,0x11,0x12,0x5b,0x5c,0x0d];
  while (modifiers.some(k => (getKey(k) & 0x8000) !== 0)) {
    if (Date.now() > until) return {ok:false,message:'请松开回车和修饰键后再试。'};
    await new Promise(resolve => setTimeout(resolve,20));
  }
  if (!validTarget(target) || !setForeground(target.hwnd)) return {ok:false,message:'无法恢复原窗口，已取消自动输入。'};
  const focusDeadline = Date.now() + 600;
  let nowFocus: Handle = 0;
  do {
    await new Promise(resolve => setTimeout(resolve,30));
    if (!isForeground(target) || !validTarget(target)) return {ok:false,message:'目标焦点发生变化，已取消插入。'};
    nowFocus = focus(target.thread);
    if (target.focus && equal(nowFocus,target.focus)) break;
  } while (Date.now() < focusDeadline);
  insertionDiagnostic = {originalFocus:String(target.focus),currentFocus:String(nowFocus),originalStillExists:!!isWindow(target.focus),targetTitle:target.title};
  if (!target.focus || !equal(nowFocus, target.focus)) return {ok:false,message:'原输入控件的焦点发生变化，请重新呼出或手动复制。'};
  return {ok:true,message:''};
}
function transmit(events:KeyboardInputEvent[]) {
  return {sent:sendInput(events.length,events,koffi.sizeof(Input)) as number,error:getError() as number};
}
export async function insertText(target: Target, text: string): Promise<{ok:boolean;message:string}> {
  if (!text || /[\u0000-\u001f\u007f]/.test(text)) return {ok:false,message:'文本含有控制字符，已取消插入。'};
  const ready=await restoreInputTarget(target);
  if(!ready.ok)return ready;
  return sendUnicodeOnce(text,transmit);
}
export async function insertImage(target:Target,writeClipboard:()=>Promise<void>):Promise<{ok:boolean;message:string}> {
  await writeClipboard();
  const ready=await restoreInputTarget(target);
  if(!ready.ok)return {ok:false,message:`${ready.message} 图片已复制，可手动粘贴。`};
  if(!validTarget(target)||!isForeground(target)||!equal(focus(target.thread),target.focus))return {ok:false,message:'目标焦点发生变化，已取消自动粘贴；图片仍在剪贴板。'};
  return sendPasteOnce(transmit);
}
export function nativeDiagnostics() { return {inputSize:koffi.sizeof(Input),guiSize:koffi.sizeof(GUI)}; }
