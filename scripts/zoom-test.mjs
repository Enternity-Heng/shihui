import {_electron,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const packaged=!!process.argv[2];
const executablePath=packaged?path.resolve(process.argv[2]):require('electron');
const env={...process.env,MATH_INPUT_TEST:packaged?'0':'1',MATH_INPUT_PROFILE:path.resolve('.test-profile/zoom')};
delete env.ELECTRON_RUN_AS_NODE;
await fs.mkdir('test-results',{recursive:true});
const launch=()=>_electron.launch({executablePath,args:packaged?[`--user-data-dir=${path.resolve('.test-profile/zoom-packaged')}`]:['.'],env,timeout:30000});
let app=await launch();
const checks=[];
const main=callback=>app.evaluate(callback);
const snapshot=()=>main(({BrowserWindow})=>{
  const win=BrowserWindow.getAllWindows().find(win=>win.webContents.getURL()==='mathapp://local/index.html');
  return {zoom:win.webContents.getZoomFactor(),size:win.getContentSize()};
});
try{
  let page=await app.firstWindow();page.setDefaultTimeout(15000);
  await expect(page.locator('#source')).toBeVisible();
  const initial=await snapshot();
  expect(initial.zoom).toBeCloseTo(1,6);
  const source='\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}';
  await page.locator('#source').fill(source);
  await expect(page.locator('#copy-image')).toBeEnabled();
  let referenceSize;
  for(const factor of [1,1.25]){
    await app.evaluate(({BrowserWindow},factor)=>{
      const win=BrowserWindow.getAllWindows().find(win=>win.webContents.getURL()==='mathapp://local/index.html');
      win.webContents.setZoomFactor(factor);
    },factor);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const baseline=await snapshot();
    const heading=await page.locator('h1').boundingBox();
    await main(({BrowserWindow})=>{
      const win=BrowserWindow.getAllWindows().find(win=>win.webContents.getURL()==='mathapp://local/index.html');
      global.__zoomSamples=[];
      global.__zoomTimer=setInterval(()=>global.__zoomSamples.push(win.webContents.getZoomFactor()),5);
    });
    try{
      for(let i=0;i<3;i++){
        await page.locator('#copy-image').click();
        await expect(page.locator('#message')).toContainText('已复制公式图片');
        const after=await snapshot();
        expect(after.zoom).toBeCloseTo(baseline.zoom,6);
        expect(after.size).toEqual(baseline.size);
        const afterHeading=await page.locator('h1').boundingBox();
        expect(afterHeading.height).toBeCloseTo(heading.height,1);
        expect(afterHeading.width).toBeCloseTo(heading.width,1);
        const png=await app.evaluate(async({clipboard})=>{
          const item=(await clipboard.read()).find(item=>item.types.includes('image/png'));
          return Array.from(new Uint8Array(await (await item.getType('image/png')).arrayBuffer()));
        });
        const buffer=Buffer.from(png),size=[buffer.readUInt32BE(16),buffer.readUInt32BE(20)];
        if(!referenceSize)referenceSize=size;
        expect(size).toEqual(referenceSize);
        await fs.writeFile('test-results/zoom-formula.png',buffer);
      }
      checks.push(`连续复制三次，主界面缩放 ${factor} 保持不变，PNG 尺寸一致`);
      const savePath=path.resolve('test-results/zoom-saved.png');
      await app.evaluate(({dialog},filePath)=>{
        global.__zoomOriginalDialog=dialog.showSaveDialog;
        dialog.showSaveDialog=async()=>({canceled:false,filePath});
      },savePath);
      try{
        await page.locator('#save-image').click();
        await expect(page.locator('#message')).toContainText('公式图片已保存');
        expect((await snapshot()).zoom).toBeCloseTo(factor,6);
        await main(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true,filePath:''});});
        await page.locator('#save-image').click();
        await expect(page.locator('#message')).toContainText('已取消保存');
        expect((await snapshot()).zoom).toBeCloseTo(factor,6);
      }finally{await main(({dialog})=>{dialog.showSaveDialog=global.__zoomOriginalDialog;});}
      checks.push(`保存及取消保存，主界面缩放 ${factor} 保持不变`);
      const samples=await main(()=>{clearInterval(global.__zoomTimer);return global.__zoomSamples;});
      expect(samples.length).toBeGreaterThan(0);
      expect(samples.every(value=>Math.abs(value-factor)<0.000001)).toBe(true);
    }finally{await main(()=>clearInterval(global.__zoomTimer));}
  }
  await page.locator('#source').fill('a'.repeat(500));
  await expect(page.locator('#copy-image')).toBeEnabled();
  await page.locator('#copy-image').click();
  await expect(page.locator('#message')).toContainText('超过尺寸限制');
  expect((await snapshot()).zoom).toBeCloseTo(1.25,6);
  checks.push('导出失败仍保持主界面缩放');
  // Simulate a zoom value persisted by the old, origin-shared exporter. Loading
  // the main page must still start at its own default scale.
  await main(async({BrowserWindow})=>{
    const sibling=new BrowserWindow({show:false,webPreferences:{sandbox:true}});
    try{await sibling.loadURL('mathapp://local/export.html');sibling.webContents.setZoomFactor(2);}
    finally{sibling.destroy();}
  });
  await app.close();
  app=await launch();
  page=await app.firstWindow();page.setDefaultTimeout(15000);
  await expect(page.locator('#source')).toBeVisible();
  expect((await snapshot()).zoom).toBeCloseTo(1,6);
  checks.push('旧版共享的 2 倍缩放不会污染新窗口启动');
  await page.screenshot({path:'test-results/zoom-fixed.png'});
  console.log('Zoom regression passed:',JSON.stringify({checks,pngSize:referenceSize}));
}finally{
  await app.close();
  await fs.writeFile('test-results/zoom-report.json',JSON.stringify({packaged,checks},null,2));
}
