export interface KeyboardInputEvent { type:number; data:{ki:{wVk:number;wScan:number;dwFlags:number;time:number;dwExtraInfo:number}} }
type Transport = (events:KeyboardInputEvent[]) => {sent:number;error:number};
export function unicodeEvents(text: string): KeyboardInputEvent[] {
  const events: KeyboardInputEvent[] = [];
  for (let i = 0; i < text.length; i++) {
    for (const flags of [0x0004,0x0004 | 0x0002]) events.push({type:1,data:{ki:{wVk:0,wScan:text.charCodeAt(i),dwFlags:flags,time:0,dwExtraInfo:0}}});
  }
  return events;
}
export function sendUnicodeOnce(text: string, send:Transport) {
  if (!text || /[\u0000-\u001f\u007f]/.test(text)) return {ok:false,message:'文本为空或含有控制字符，已取消插入。'};
  const events = unicodeEvents(text);
  const {sent,error} = send(events);
  if (sent !== events.length) return {ok:false,message:`输入未全部发送（${sent}/${events.length}，系统码 ${error}）。可能已有部分内容写入，请检查原文；不会自动重试。`};
  return {ok:true,message:'已发送文字；特殊控件可能不接受模拟输入。'};
}
function virtualKey(key:number,up=false):KeyboardInputEvent {
  return {type:1,data:{ki:{wVk:key,wScan:0,dwFlags:up?2:0,time:0,dwExtraInfo:0}}};
}
export function sendPasteOnce(send:Transport) {
  const modifier=0x11,key=0x56;
  const events=[virtualKey(modifier),virtualKey(key),virtualKey(key,true),virtualKey(modifier,true)];
  const {sent,error}=send(events);
  if(sent!==events.length){
    // Release only injected keys that did not receive their key-up. This is
    // cleanup, never another paste attempt.
    if(sent>0&&sent<4){
      const release=sent===2?[virtualKey(key,true),virtualKey(modifier,true)]:[virtualKey(modifier,true)];
      send(release);
    }
    return {ok:false,message:`图片粘贴请求未全部发送（${sent}/4，系统码 ${error}）。不会自动重试；请检查目标内容，图片已留在剪贴板。`};
  }
  return {ok:true,message:'已发送图片粘贴请求；若目标未接收，图片仍在剪贴板，可手动粘贴。'};
}
