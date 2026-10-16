import {_electron,chromium,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),executablePath=require('electron');
const env={...process.env,MATH_INPUT_TEST:'1',MATH_INPUT_PROFILE:path.resolve('.test-profile/compat')};delete env.ELECTRON_RUN_AS_NODE;
const app=await _electron.launch({executablePath,args:['.'],env});
const helper=await _electron.launch({executablePath,args:['tests/fixtures/editor.cjs'],env});
let browser,wordProcess;
const records=[];
try{
  const ui=await app.firstWindow();await expect(ui.locator('#source')).toBeVisible();
  await expect.poll(async()=>await helper.evaluate(()=>!!global.focusExternal)).toBe(true);
  await helper.evaluate(()=>global.editorWindow.hide());
  let hotkeyKeys=[0x11,0x12,0x4d];
  async function insert(title,beforeHotkey){
    await app.evaluate(()=>global.__mathTest.hide());
    await helper.evaluate((_electron,title)=>global.focusExternal(title),title);
    if(beforeHotkey)await beforeHotkey();
    await expect.poll(async()=>await app.evaluate(()=>global.__mathTest.captureTarget()?.title)).toContain(title);
    await helper.evaluate((_electron,keys)=>global.pressKeys(keys),hotkeyKeys);
    await expect(ui.locator('#target')).toContainText(title);
    await ui.locator('#source').fill('\\alpha+\\beta');
    await expect(ui.locator('#plain-value')).toHaveText('α+β');
    await expect(ui.locator('#primary')).toBeEnabled();
    await ui.locator('#source').press('Enter');
    await expect.poll(async()=>await app.evaluate(()=>global.__mathTest.state().target)).toBeNull();
    const status=await ui.locator('#message').textContent();
    console.log(title+': '+status);
    if(!status.includes('已发送文字'))console.log(await app.evaluate(()=>{
      const detail=global.__mathTest.lastInsertionDiagnostics();
      const koffi=require('koffi'),user=koffi.load('user32.dll');
      const getClass=user.func('int __stdcall GetClassNameW(uintptr_t hwnd, _Out_ uint16_t *buffer, int size)');
      for(const key of ['originalFocus','currentFocus']){const buffer=Buffer.alloc(1024);const size=getClass(BigInt(detail[key]),buffer,512);detail[key+'Class']=buffer.subarray(0,size*2).toString('utf16le');}
      return detail;
    }));
    expect(status).toContain('已发送文字');
  }
  browser=await chromium.launch({channel:'msedge',headless:false});
  const page=await browser.newPage();
  await fs.writeFile('test-results/browser-fixture.html','<!doctype html><title>MATH-COMPAT-EDGE</title><textarea id="editor" autofocus style="width:90%;height:300px;font-size:24px"></textarea>');
  await page.goto(pathToFileURL(path.resolve('test-results/browser-fixture.html')).href);
  await page.locator('#editor').click();
  await insert('MATH-COMPAT-EDGE');
  await expect(page.locator('#editor')).toHaveValue('α+β');
  records.push({application:'Microsoft Edge',version:browser.version(),result:'pass',text:'α+β'});
  await browser.close();browser=null;

  const notepadFile=path.resolve(`test-results/MATH-COMPAT-NOTEPAD-${Date.now()}.txt`);
  const notepadTitle=path.basename(notepadFile,'.txt');
  await fs.writeFile(notepadFile,'MATH-TEST:','utf8');
  expect((await ui.evaluate(()=>window.math.shortcut('Control+Shift+K'))).ok).toBe(true);
  hotkeyKeys=[0x11,0x10,0x4b];
  spawn('notepad.exe',[notepadFile],{windowsHide:false,stdio:'ignore'}).unref();
  await expect.poll(async()=>await helper.evaluate((_electron,title)=>!!global.findExternal(title),notepadTitle),{timeout:15000}).toBe(true);
  await insert(notepadTitle,async()=>{
    await promisify(execFile)('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','tests/fixtures/notepad.ps1','-Title',notepadTitle,'-Mode','focus'],{windowsHide:true});
  });
  const notepadContent=await promisify(execFile)('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','tests/fixtures/notepad.ps1','-Title',notepadTitle,'-Mode','read'],{windowsHide:true});
  expect(JSON.parse(notepadContent.stdout).text).toContain('α+β');
  await helper.evaluate(()=>global.pressKeys([0x11,0x53]));
  await expect.poll(async()=>await fs.readFile(notepadFile,'utf8')).toContain('α+β');
  records.push({application:'Windows 记事本',shortcut:'Control+Shift+K',result:'pass',text:(await fs.readFile(notepadFile,'utf8')).trim(),note:'此 WinUI 版本使用含 Alt 热键时出现菜单焦点干扰，使用不含 Alt 的快捷键验证。'});
  await helper.evaluate(()=>global.pressKeys([0x11,0x57]));
  expect((await ui.evaluate(()=>window.math.shortcut('Control+Alt+M'))).ok).toBe(true);
  hotkeyKeys=[0x11,0x12,0x4d];

  // New, unsaved Word document in its own COM session. No existing document is touched.
  wordProcess=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','tests/fixtures/word.ps1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  const lines=createInterface({input:wordProcess.stdout});
  const queue=[];let waiting;
  lines.on('line',line=>{try{const data=JSON.parse(line);if(waiting){const resolve=waiting;waiting=null;resolve(data);}else queue.push(data);}catch{}});
  const next=()=>queue.length?Promise.resolve(queue.shift()):new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Word COM timeout')),30000);waiting=data=>{clearTimeout(timer);resolve(data);};});
  const ready=await next();
  if(ready.error)throw new Error(ready.error);
  await insert('Word',async()=>{wordProcess.stdin.write('focus\n');await next();});
  let contents;
  await expect.poll(async()=>{wordProcess.stdin.write('read\n');contents=await next();return contents.text;}).toContain('MATH-TEST:α+β');
  records.push({application:'Microsoft Word 普通文本区',version:ready.version,result:'pass',text:contents.text.trim()});
  wordProcess.stdin.end('close\n');
  console.log('Compatibility tests passed:',JSON.stringify(records));
}finally{
  if(wordProcess && !wordProcess.stdin.destroyed && !wordProcess.stdin.writableEnded)wordProcess.stdin.end('close\n');
  if(browser)await browser.close();
  await helper.close();await app.close();
  await fs.writeFile('test-results/compatibility-report.json',JSON.stringify(records,null,2));
}
