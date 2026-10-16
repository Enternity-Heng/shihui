import {contextBridge,ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('capture',{
  frame:()=>ipcRenderer.invoke('capture:frame'),
  select:(rect:{x:number;y:number;width:number;height:number})=>ipcRenderer.invoke('capture:select',rect),
  cancel:()=>ipcRenderer.invoke('capture:cancel')
});
