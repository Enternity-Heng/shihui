import {_electron,expect} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
const exec=promisify(execFile);
const installDir=path.resolve('test-results/安装 生命周期');
const profile=path.resolve('.test-profile',`installed-${Date.now()}`);
const executablePath=path.join(installDir,'MathInputAssistant.exe');
const env={...process.env,PATH:path.join(process.env.SystemRoot,'System32')};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_PATH;delete env.MATH_INPUT_TEST;
let app,settingsFile,originalSettings,installed=false;
const shortcutBackups=[];
const checks=[];
async function installer(mode,baseline=false){const result=await exec('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/installer-test.ps1','-Mode',mode,...(baseline?['-Baseline']:[])],{windowsHide:true,timeout:120000});console.log(result.stdout.trim());checks.push(baseline?'install 1.4.0 baseline':mode);}
try{
  const locations=await exec('powershell.exe',['-NoProfile','-Command',"[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $paths=@(); foreach($n in @('数学输入助手','公式匣','式绘')){$paths+=(Join-Path ([Environment]::GetFolderPath('Desktop')) ($n+'.lnk'));$paths+=(Join-Path ([Environment]::GetFolderPath('StartMenu')) ('Programs\\'+$n+'.lnk'));$paths+=(Join-Path ([Environment]::GetFolderPath('StartMenu')) ('Programs\\'+$n+'\\'+$n+'.lnk'))}; ConvertTo-Json -InputObject $paths -Compress"],{windowsHide:true,encoding:'utf8'});
  for(const filename of JSON.parse(locations.stdout.replace(/^\uFEFF/,''))){try{shortcutBackups.push({filename,content:await fs.readFile(filename)});}catch(error){if(error.code!=='ENOENT')throw error;}}
  await installer('install',true);installed=true;
  app=await _electron.launch({executablePath,args:[`--user-data-dir=${profile}`],env,timeout:30000});
  let page=await app.firstWindow();await expect(page.locator('#source')).toBeVisible();expect(await app.evaluate(({app})=>app.getVersion())).toBe('1.4.0');
  settingsFile=path.join(await app.evaluate(({app})=>app.getPath('userData')),'settings.json');
  if(!settingsFile.startsWith(profile+path.sep))throw new Error('Unexpected settings location.');
  try{originalSettings=await fs.readFile(settingsFile);}catch(error){if(error.code!=='ENOENT')throw error;originalSettings=null;}
  const changed=await page.evaluate(()=>window.math.shortcut('Control+Shift+K'));expect(changed.ok).toBe(true);
  const oldFavorites=(await page.evaluate(()=>window.math.favorites())).favorites;for(const favorite of oldFavorites)if(favorite.name==='升级保留收藏')await page.evaluate(id=>window.math.deleteFavorite(id),favorite.id);
  expect((await page.evaluate(()=>window.math.saveFavorite({id:'',name:'升级保留收藏',source:'\\alpha'}))).ok).toBe(true);
  expect((await page.evaluate(()=>window.math.preferences({imageStyle:{fontSize:28,foreground:'#123456',background:'#ffffff',padding:24,scale:2}}))).ok).toBe(true);
  await page.locator('#source').fill('\\alpha');await expect(page.locator('#plain-value')).toHaveText('α');
  await app.close();app=null;
  await installer('upgrade');
  app=await _electron.launch({executablePath,args:[`--user-data-dir=${profile}`],env,timeout:30000});
  page=await app.firstWindow();await expect(page.locator('#source')).toBeVisible();
  expect(await app.evaluate(({app})=>app.getVersion())).toBe('1.5.0');expect(await app.evaluate(({app})=>app.getName())).toBe('式绘');expect((await page.evaluate(()=>window.math.state())).shortcut).toBe('Control+Shift+K');checks.push('settings preserved');
  expect((await page.evaluate(()=>window.math.state())).imageStyle.foreground).toBe('#123456');expect((await page.evaluate(()=>window.math.favorites())).favorites.some(f=>f.name==='升级保留收藏')).toBe(true);checks.push('favorites and image style preserved');
  await page.locator('#source').fill('\\frac{a}{b}');await expect(page.locator('#kind')).toHaveText('排版公式');
  await page.locator('#copy-image').click();await expect(page.locator('#message')).toContainText('已复制公式图片');checks.push('installed render and PNG');
  await app.evaluate(({dialog},imagePath)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[imagePath]});},path.resolve('tests/fixtures/ocr/hyperbola.png'));
  await page.locator('#ocr-toggle').click();await page.locator('#ocr-open').click();
  await expect(page.locator('#review-confirm')).toBeEnabled({timeout:100000});await page.locator('#review-confirm').click();await expect(page.locator('#message')).toContainText('识别结果已确认');
  expect(await page.locator('#source').inputValue()).toContain('frac');checks.push('installed offline OCR');
  await app.close();app=null;
  for(const script of ['scripts/expansion-test.mjs','scripts/recovery-test.mjs','scripts/favorites-styles-test.mjs']){const result=await exec(process.execPath,[script,executablePath],{windowsHide:true,timeout:180000,maxBuffer:1024*1024});console.log(result.stdout.trim());checks.push(`installed ${path.basename(script)}`);}
  await installer('uninstall');installed=false;
  expect(await fs.readFile(settingsFile,'utf8')).toContain('Control+Shift+K');checks.push('settings retained on uninstall');
  console.log('Installer lifecycle tests passed.');
}finally{
  if(app)await app.close();
  if(installed)await installer('uninstall');
  if(settingsFile&&originalSettings!==undefined){if(originalSettings===null)await fs.unlink(settingsFile).catch(()=>{});else await fs.writeFile(settingsFile,originalSettings);}
  for(const {filename,content} of shortcutBackups){await fs.mkdir(path.dirname(filename),{recursive:true});await fs.writeFile(filename,content);}
  await fs.writeFile('test-results/installer-report.json',JSON.stringify({checks,installDir},null,2));
}
