const {app,BrowserWindow,screen}=require('electron');
const path=require('node:path');
app.setPath('userData',path.resolve('.test-profile/editor'));
app.whenReady().then(async()=>{
  const editor=new BrowserWindow({width:600,height:400,title:'Math input integration editor',webPreferences:{sandbox:true}});
  await editor.loadFile(path.join(__dirname,'editor.html'));
  global.editorWindow=editor;
  const koffi=require('koffi');
  const user=koffi.load('user32.dll');
  const key=user.func('void __stdcall keybd_event(uint8_t key, uint8_t scan, uint32_t flags, uintptr_t extra)');
  const foreground=user.func('bool __stdcall SetForegroundWindow(uintptr_t hwnd)');
  const setCursor=user.func('bool __stdcall SetCursorPos(int x, int y)');
  const mouse=user.func('void __stdcall mouse_event(uint32_t flags, uint32_t dx, uint32_t dy, uint32_t data, uintptr_t extra)');
  global.focusEditor=async()=>{
    const old=screen.getCursorScreenPoint();
    editor.setAlwaysOnTop(true);editor.show();
    await new Promise(resolve=>setTimeout(resolve,100));
    const bounds=editor.getContentBounds();
    const point=screen.dipToScreenPoint({x:bounds.x+120,y:bounds.y+120});
    setCursor(point.x,point.y);mouse(2,0,0,0,0);mouse(4,0,0,0,0);
    await new Promise(resolve=>setTimeout(resolve,100));
    foreground(editor.getNativeWindowHandle().readBigUInt64LE());
    editor.setAlwaysOnTop(false);
    const restore=screen.dipToScreenPoint(old);setCursor(restore.x,restore.y);
  };
  global.pressKeys=async(keys)=>{
    for(const vk of keys){key(vk,0,0,0);await new Promise(resolve=>setTimeout(resolve,30));}
    for(const vk of [...keys].reverse()){key(vk,0,2,0);await new Promise(resolve=>setTimeout(resolve,30));}
  };
  global.pressHotkey=()=>global.pressKeys([0x11,0x12,0x4d]);
  const Rect=koffi.struct('TestExternalRect',{left:'int32_t',top:'int32_t',right:'int32_t',bottom:'int32_t'});
  const getRect=user.func('bool __stdcall GetWindowRect(uintptr_t hwnd, _Out_ TestExternalRect *rect)');
  const getText=user.func('int __stdcall GetWindowTextW(uintptr_t hwnd, _Out_ uint16_t *text, int count)');
  const isVisible=user.func('bool __stdcall IsWindowVisible(uintptr_t hwnd)');
  koffi.proto('bool __stdcall TestEnumProc(uintptr_t hwnd, intptr_t param)');
  const enumerate=user.func('bool __stdcall EnumWindows(TestEnumProc *callback, intptr_t param)');
  const position=user.func('bool __stdcall SetWindowPos(uintptr_t hwnd, uintptr_t after, int x, int y, int cx, int cy, uint32_t flags)');
  const getClass=user.func('int __stdcall GetClassNameW(uintptr_t hwnd, _Out_ uint16_t *text, int count)');
  const children=user.func('bool __stdcall EnumChildWindows(uintptr_t hwnd, TestEnumProc *callback, intptr_t param)');
  const sendMessage=user.func('uintptr_t __stdcall SendMessageTimeoutW(uintptr_t hwnd, uint32_t msg, uintptr_t wp, void *lp, uint32_t flags, uint32_t timeout, _Out_ uintptr_t *result)');
  global.findExternal=(title)=>{
    let found=0;
    enumerate((hwnd)=>{const buffer=Buffer.alloc(4096);const count=getText(hwnd,buffer,2048);const text=buffer.subarray(0,count*2).toString('utf16le');if(isVisible(hwnd)&&text.includes(title)){found=hwnd;return false;}return true;},0);
    return found;
  };
  global.focusExternal=async(title)=>{
    const hwnd=global.findExternal(title);if(!hwnd)throw new Error('No test window: '+title);
    const rect={};getRect(hwnd,rect);
    const old=screen.dipToScreenPoint(screen.getCursorScreenPoint());
    position(hwnd,18446744073709551615n,0,0,0,0,0x13);
    await new Promise(resolve=>setTimeout(resolve,100));
    const body=title.includes('MATH-COMPAT-NOTEPAD');
    if(body)await global.pressKeys([0x1b]);
    let point={x:rect.left+Math.min(250,(rect.right-rect.left)/2),y:rect.top+15};
    if(body)children(hwnd,child=>{const buffer=Buffer.alloc(512),size=getClass(child,buffer,256);if(isVisible(child)&&buffer.subarray(0,size*2).toString('utf16le')==='RichEditD2DPT'){const childRect={};getRect(child,childRect);point={x:childRect.left+20,y:childRect.top+20};return false;}return true;},0);
    setCursor(point.x,point.y);mouse(2,0,0,0,0);mouse(4,0,0,0,0);
    await new Promise(resolve=>setTimeout(resolve,100));foreground(hwnd);
    position(hwnd,18446744073709551614n,0,0,0,0,0x13);setCursor(old.x,old.y);
    return String(hwnd);
  };
  global.inspectExternal=(title)=>{
    const hwnd=global.findExternal(title),list=[];
    const inspect=hwnd=>{const buffer=Buffer.alloc(8192);let size=getClass(hwnd,buffer,4096);const cls=buffer.subarray(0,size*2).toString('utf16le');buffer.fill(0);const count=[0];sendMessage(hwnd,13,4096,buffer,2,500,count);list.push({hwnd:String(hwnd),cls,text:buffer.subarray(0,Math.min(Number(count[0])*2,8190)).toString('utf16le')});return true;};
    inspect(hwnd);children(hwnd,inspect,0);return list;
  };
});
app.on('window-all-closed',()=>app.quit());
