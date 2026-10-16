import test from 'node:test';
import assert from 'node:assert/strict';
import { sendUnicodeOnce,unicodeEvents,sendPasteOnce } from '../src/core/keyboard';
test('补充平面字符按 UTF-16 代理对完整发送',()=>{
  const events=unicodeEvents('𝛼');
  assert.equal(events.length,4);
  assert.deepEqual(events.map(event=>event.data.ki.wScan),[0xd835,0xd835,0xdefc,0xdefc]);
  assert.deepEqual(events.map(event=>event.data.ki.dwFlags),[4,6,4,6]);
});
for(const sent of [0,1,3])test(`故障注入：只发送 ${sent} 个事件时不重试`,()=>{
  let calls=0;
  const result=sendUnicodeOnce('αβ',()=>{calls++;return {sent,error:5};});
  assert.equal(calls,1);assert.equal(result.ok,false);assert.match(result.message,/可能已有部分内容写入/);assert.match(result.message,/不会自动重试/);
});
test('拒绝可能触发提交或导航的控制字符',()=>{
  for(const input of ['α\n','α\r','α\t','α\0'])assert.equal(sendUnicodeOnce(input,()=>{throw new Error('Must not send');}).ok,false);
});
test('完整发送也不承诺目标控件已接收',()=>assert.match(sendUnicodeOnce('α',events=>({sent:events.length,error:0})).message,/可能不接受/));
test('图片插入只发送一次 Ctrl+V，不发送回车或 Unicode 文字',()=>{
  let calls=0;
  const reply=sendPasteOnce(events=>{calls++;assert.deepEqual(events.map(event=>[event.data.ki.wVk,event.data.ki.dwFlags]),[[0x11,0],[0x56,0],[0x56,2],[0x11,2]]);return {sent:4,error:0};});
  assert.equal(reply.ok,true);assert.equal(calls,1);
});
for(const sent of [0,1,2,3])test(`图片粘贴部分发送 ${sent}：不重试粘贴，只释放已注入按键`,()=>{
  const batches:number[][]=[];
  const reply=sendPasteOnce(events=>{
    batches.push(events.map(event=>event.data.ki.dwFlags));
    if(batches.length===1)return {sent,error:5};
    assert.ok(events.every(event=>event.data.ki.dwFlags===2));
    return {sent:events.length,error:0};
  });
  assert.equal(reply.ok,false);assert.match(reply.message,/不会自动重试/);assert.match(reply.message,/剪贴板/);
  assert.equal(batches.length,sent===0?1:2);
});
