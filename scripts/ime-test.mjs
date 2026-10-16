import {_electron,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),env={...process.env,MATH_INPUT_TEST:'1',MATH_INPUT_PROFILE:path.resolve('.test-profile/ime')};delete env.ELECTRON_RUN_AS_NODE;
let app,fixture,switched=false,ui;const report={passed:false,method:'真实 Windows 键盘事件与当前中文输入法',observations:[]};
try{
  app=await _electron.launch({executablePath:require('electron'),args:['.'],env,timeout:30000});ui=await app.firstWindow();await expect(ui.locator('#source')).toBeVisible();
  fixture=await _electron.launch({executablePath:require('electron'),args:['tests/fixtures/editor.cjs'],env,timeout:30000});await expect.poll(()=>fixture.evaluate(()=>typeof global.pressKeys)).toBe('function');
  await ui.evaluate(()=>{window.__ime={start:0,end:0,keys:[]};const source=document.getElementById('source');source.addEventListener('compositionstart',()=>window.__ime.start++);source.addEventListener('compositionend',()=>window.__ime.end++);source.addEventListener('keydown',event=>window.__ime.keys.push({key:event.key,composing:event.isComposing}));});
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/index.html'));w.setTitle('MATH-IME-1.3.0');w.show();w.focus();});await fixture.evaluate(()=>global.focusExternal('MATH-IME-1.3.0'));await ui.locator('#source').click();
  await app.evaluate(async({clipboard})=>await clipboard.writeText('ime-must-not-submit'));
  const type=async()=>{for(const key of [0x4e,0x49,0x48,0x41,0x4f])await fixture.evaluate((_electron,key)=>global.pressKeys([key]),key);};
  await type();let observed=await ui.evaluate(()=>({...window.__ime,value:document.getElementById('source').value}));report.observations.push(observed);
  if(!observed.start){await fixture.evaluate(()=>global.pressKeys([0x10]));switched=true;await ui.locator('#source').fill('');await ui.locator('#source').click();await type();observed=await ui.evaluate(()=>({...window.__ime,value:document.getElementById('source').value}));report.observations.push(observed);}
  expect(observed.start).toBeGreaterThan(0);
  await fixture.evaluate(()=>global.pressKeys([0x09]));expect(await app.evaluate(async({clipboard})=>await clipboard.readText())).toBe('ime-must-not-submit');
  await fixture.evaluate(()=>global.pressKeys([0x0d]));expect(await app.evaluate(async({clipboard})=>await clipboard.readText())).toBe('ime-must-not-submit');
  const final=await ui.evaluate(()=>({...window.__ime,value:document.getElementById('source').value}));report.observations.push(final);expect(final.end).toBeGreaterThan(0);report.passed=true;console.log('PASS 真实中文输入法组字期间 Tab / Enter 不触发公式提交');
}catch(error){report.error=String(error);throw error;}
finally{if(switched&&fixture&&ui&&!ui.isClosed()){await ui.locator('#source').click().catch(()=>{});await fixture.evaluate(()=>global.pressKeys([0x10])).catch(()=>{});}if(fixture)await fixture.close();if(app)await app.close();await fs.writeFile('test-results/ime-report.json',JSON.stringify(report,null,2));}
