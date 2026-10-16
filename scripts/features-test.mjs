import {_electron,expect as baseExpect} from '@playwright/test';
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),expect=baseExpect.configure({timeout:15000});
const packaged=!!process.argv[2],profile=path.resolve('.test-profile',`features-${Date.now()}`),env={...process.env,MATH_INPUT_TEST:packaged?'0':'1',MATH_INPUT_PROFILE:profile};delete env.ELECTRON_RUN_AS_NODE;
await fs.mkdir('test-results',{recursive:true});
let app,ui,keyFixture;const checks=[],errors=[],diagnostics=[];
async function launch(){app=await _electron.launch({executablePath:packaged?path.resolve(process.argv[2]):require('electron'),args:packaged?[`--user-data-dir=${profile}`]:['.'],env,timeout:30000});app.process().stderr.on('data',chunk=>diagnostics.push(chunk.toString()));ui=await app.firstWindow();ui.on('pageerror',e=>errors.push(e.message));await expect(ui.locator('#source')).toBeVisible();expect(await app.evaluate(({app})=>app.getPath('userData'))).toBe(profile);}
const record=label=>{checks.push(label);console.log('PASS '+label);};
try{
  await launch();const source=ui.locator('#source');
  await source.fill('\\alp');await expect(ui.locator('#completion')).toBeVisible();await source.press('Tab');await expect(source).toHaveValue('\\alpha');
  await source.press('Control+z');await expect(source).toHaveValue('\\alp');await source.press('Control+y');await expect(source).toHaveValue('\\alpha');
  record('前缀补全与整次撤销、重做');
  await source.fill('\\fra');await source.press('Tab');await expect(source).toHaveValue('\\frac{a}{b}');
  expect(await source.evaluate(e=>e.value.slice(e.selectionStart,e.selectionEnd))).toBe('a');
  await source.pressSequentially('x+1');await source.press('Tab');expect(await source.evaluate(e=>e.value.slice(e.selectionStart,e.selectionEnd))).toBe('b');
  await source.pressSequentially('y');await source.press('Tab');await expect(source).toHaveValue('\\frac{x+1}{y}');
  await source.press('Control+Enter');await expect(ui.locator('#message')).toContainText('已复制公式图片');record('模板占位符填写、Tab 跳转与立即提交当前图片');
  await source.fill('');await ui.locator('#templates-open').click();await ui.locator('#templates-query').fill('勾股');await expect(ui.locator('#template-insert')).toBeEnabled();await ui.locator('#template-insert').click();
  await expect(source).toHaveValue('a^{2}+b^{2}=c^{2}');await source.pressSequentially('3');await source.press('Tab');await source.pressSequentially('4');await source.press('Tab');await source.pressSequentially('5');await source.press('Tab');await expect(source).toHaveValue('3^{2}+4^{2}=5^{2}');await expect(ui.locator('#plain-value')).toHaveText('3²+4²=5²');record('公式模板入口、中文搜索与三字段填写');
  await source.fill('x'.repeat(4097));await expect(source).toHaveValue('3^{2}+4^{2}=5^{2}');record('超过源码长度限制保留原内容');
  await source.fill('a+\\alphax+b');await source.evaluate(e=>{e.setSelectionRange(6,6);e.dispatchEvent(new Event('click'));});await source.press('Tab');await expect(source).toHaveValue('a+\\alpha+b');record('光标中部补全替换整个命令并保留两侧内容');
  await ui.locator('#completion-open').click();await ui.locator('#completion-query').fill('分式');await expect(ui.locator('#completion-list button').first()).toContainText('frac');await ui.locator('#completion-query').press('Escape');record('可点击手动补全和中文关键词搜索');
  await ui.locator('#settings-toggle').click();await ui.locator('#settings-tab-1').click();
  await ui.locator('#command-name').fill('RR');await ui.locator('#command-description').fill('<img src=x onerror=alert(1)> 实数');await ui.locator('#command-keywords').fill('集合 实数');await ui.locator('#command-template').fill('\\mathbb{R}');await ui.locator('#command-save').click();await expect(ui.locator('#settings-status')).toContainText('命令已保存');await expect(ui.locator('#command-list img')).toHaveCount(0);
  const command=(await ui.evaluate(()=>window.math.commands())).commands[0];
  await ui.locator('#settings-close').click();await source.fill('\\RR');await source.press('Tab');await expect(source).toHaveValue('\\mathbb{R}');await expect(ui.locator('#copy-source')).toBeEnabled();await ui.locator('#copy-source').click();
  await expect(ui.locator('#message')).toContainText('已复制 LaTeX');record('自定义命令展开、持久保存及说明 HTML 转义');
  const originalHistory=await ui.evaluate(()=>window.math.history('',0));expect(originalHistory.total).toBe(2);
  await app.evaluate(({dialog})=>{global.__save=dialog.showSaveDialog;dialog.showSaveDialog=async()=>({canceled:true});});
  await ui.locator('#save-image').click();await expect(ui.locator('#message')).toContainText('已取消保存');expect((await ui.evaluate(()=>window.math.history('',0))).total).toBe(2);await app.evaluate(({dialog})=>{dialog.showSaveDialog=global.__save;});record('取消保存不新增历史');
  await ui.locator('#history-toggle').click();await expect(ui.locator('.history-entry')).toHaveCount(2);await ui.locator('.history-entry').first().getByText('公式预览',{exact:true}).click();await expect(ui.locator('.history-preview .katex').first()).toBeVisible();await ui.locator('.history-entry').last().getByText('回填编辑',{exact:true}).click();await expect(source).toHaveValue('\\frac{x+1}{y}');await source.press('Control+z');await expect(source).toHaveValue('\\mathbb{R}');record('历史独立预览、回填与回填撤销');
  const evil=await ui.evaluate(()=>window.math.historyDetail('../settings.json'));expect(evil.ok).toBe(false);expect((await ui.evaluate(()=>window.math.preferences({shortcut:'Control+Alt+S'}))).ok).toBe(false);record('伪造标识与双快捷键冲突被拒绝');
  // Capture a real on-screen formula fixture; no fixture screenshot substitutes for desktop acquisition.
  const fixture=await app.browserWindow(ui).then(()=>app.evaluate(async({BrowserWindow},file)=>{const w=new BrowserWindow({width:640,height:380,x:80,y:80,show:true,webPreferences:{sandbox:true}});await w.loadFile(file);global.__featureFixture=w;return true;},path.resolve('tests/fixtures/screen-formula.html')));
  await app.evaluate(()=>global.__featureFixture.focus());
  await app.evaluate(async({clipboard})=>{await clipboard.writeText('capture-clipboard-sentinel');});
  keyFixture=await _electron.launch({executablePath:require('electron'),args:['tests/fixtures/editor.cjs'],env,timeout:30000});await expect.poll(()=>keyFixture.evaluate(()=>typeof global.pressKeys)).toBe('function');
  await app.evaluate(()=>global.__featureFixture.focus());await keyFixture.evaluate(()=>global.pressKeys([0x11,0x12,0x53]));
  await expect.poll(()=>app.windows().filter(w=>w.url().includes('/capture.html')).length).toBeGreaterThan(0);
  let overlay=app.windows().find(w=>w.url().includes('/capture.html'));await expect(overlay.locator('#screen')).toHaveAttribute('src',/^data:image/);await expect(overlay.locator('#screen')).toHaveJSProperty('complete',true);
  expect(await overlay.evaluate(()=>typeof window.math)).toBe('undefined');
  const bad=await overlay.evaluate(async()=>{try{await window.capture.select({x:-1,y:0,width:30,height:30});return false;}catch{return true;}});expect(bad).toBe(true);
  await overlay.keyboard.press('Escape').catch(error=>{if(!overlay.isClosed())throw error;});await expect.poll(()=>app.windows().filter(w=>w.url().includes('/capture.html')).length).toBe(0);await expect(source).toBeEnabled();await expect(source).toHaveValue('\\mathbb{R}');record('真实截图遮罩、接口隔离、非法选区与 Esc 恢复');
  await keyFixture.close();keyFixture=null;record('Ctrl+Alt+S 真实系统全局快捷键启动截图');
  await app.evaluate(({desktopCapturer})=>{global.__originalSources=desktopCapturer.getSources;desktopCapturer.getSources=async()=>[];});
  await ui.locator('#capture-start').click();await expect(ui.locator('#message')).toContainText('无法获取显示器');await expect(source).toBeEnabled();await expect(source).toHaveValue('\\mathbb{R}');await app.evaluate(({desktopCapturer})=>{desktopCapturer.getSources=global.__originalSources;});record('获取屏幕失败恢复窗口并保留源码');
  // Read physical fixture content bounds before hiding the main window.
  const bounds=await app.evaluate(()=>global.__featureFixture.getContentBounds());
  await app.evaluate(()=>{global.__featureFixture.setAlwaysOnTop(true,'screen-saver');global.__featureFixture.focus();});await expect.poll(()=>app.evaluate(()=>global.__featureFixture.isFocused())).toBe(true);await ui.evaluate(()=>document.getElementById('capture-start').click());await expect.poll(()=>app.windows().filter(w=>w.url().includes('/capture.html')).length).toBeGreaterThan(0);
  overlay=app.windows().find(w=>w.url().includes('/capture.html'));
  const screenBounds=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/capture.html')).getBounds());
  void overlay.evaluate(async rect=>await window.capture.select(rect),{x:bounds.x-screenBounds.x+50,y:bounds.y-screenBounds.y+60,width:540,height:200}).catch(error=>{if(!overlay.isClosed())throw error;});
  await expect(ui.locator('#review-confirm')).toBeEnabled({timeout:100000});await ui.locator('#review-confirm').click();await expect(ui.locator('#message')).toContainText('识别结果已确认');expect(await source.inputValue()).toMatch(/frac|x|y/);await expect(ui.locator('#ocr-image')).toBeVisible();
  expect(await app.evaluate(async({clipboard})=>await clipboard.readText())).toBe('capture-clipboard-sentinel');
  const recognized=(await ui.evaluate(()=>window.math.history('',0))).entries.find(e=>e.origin==='screen');expect(recognized.image).toBeTruthy();record('真实屏幕裁剪 → 离线识别 → 带原图历史，剪贴板不变');
  if(!packaged){await app.evaluate(async()=>{const s=global.__mathTest.store,t=s.ticket();await s.clear();await s.record('LATE','screen','识别',t);});expect((await ui.evaluate(()=>window.math.history('',0))).total).toBe(0);record('清空后迟到任务不能使历史复活');}
  else {await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});});expect((await ui.evaluate(()=>window.math.clearHistory())).ok).toBe(true);}
  // Persist a source independently of its command definition before restart.
  await source.fill('\\mathbb{R}');await expect(ui.locator('#copy-source')).toBeEnabled();await ui.locator('#copy-source').click();await expect(ui.locator('#message')).toContainText('已复制 LaTeX');
  await app.evaluate(()=>global.__featureFixture.close());
  await ui.setViewportSize({width:640,height:540});await ui.locator('#settings-toggle').click();await ui.screenshot({path:'test-results/features-settings.png'});await ui.locator('#settings-close').click();await ui.screenshot({path:'test-results/features-interface.png'});
  await app.close();app=null;await launch();expect((await ui.evaluate(()=>window.math.commands())).commands[0].id).toBe(command.id);expect((await ui.evaluate(()=>window.math.history('',0))).total).toBe(1);
  await ui.evaluate(id=>window.math.deleteCommand(id),command.id);await ui.locator('#history-toggle').click();await ui.locator('.history-entry').first().getByText('回填编辑',{exact:true}).click();await expect(ui.locator('#source')).toHaveValue('\\mathbb{R}');await expect(ui.locator('#preview .katex')).toBeVisible();record('重启恢复命令和历史，删除命令后历史仍可渲染');
  expect(errors).toEqual([]);
}catch(error){if(app&&!packaged){try{const image=await app.evaluate(()=>global.__mathTest.lastRecognitionImage);if(image)await fs.writeFile('test-results/features-recognition-input.png',Buffer.from(image,'base64'));}catch{}}throw error;}finally{if(keyFixture)await keyFixture.close();if(app)await app.close();await fs.writeFile(`test-results/${packaged?'features-packaged':'features'}-report.json`,JSON.stringify({packaged,checks,errors,profile,diagnostics},null,2));}
