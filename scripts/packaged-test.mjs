import {_electron,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const executablePath=path.resolve(process.argv[2] ?? 'release/win-unpacked/MathInputAssistant.exe');
const env={...process.env,PATH:path.join(process.env.SystemRoot,'System32')};
delete env.ELECTRON_RUN_AS_NODE; delete env.MATH_INPUT_TEST; delete env.NODE_PATH;
const app=await _electron.launch({executablePath,args:[`--user-data-dir=${path.resolve('.test-profile/packaged')}`],env,timeout:30000});
try{
  const page=await app.firstWindow();
  page.setDefaultTimeout(15000);
  await expect(page.locator('#source')).toBeVisible();
  expect(await app.evaluate(({app})=>app.isPackaged)).toBe(true);
  expect(await app.evaluate(()=>typeof global.__mathTest)).toBe('undefined');
  const network=[];
  page.context().on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});
  // Deny internet at Chromium's network layer while preserving the local scheme.
  await page.context().route(/^https?:\/\//,route=>route.abort());
  await page.locator('#source').fill('\\alpha+\\beta');
  await expect(page.locator('#plain-value')).toHaveText('α+β');
  await page.locator('#primary').click();
  await expect(page.locator('#message')).toContainText('已复制数学符号');
  expect(await app.evaluate(async({clipboard})=>await clipboard.readText())).toBe('α+β');
  await page.locator('#source').fill('\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}');
  await expect(page.locator('#kind')).toHaveText('排版公式');
  await page.locator('#copy-image').click();
  await expect(page.locator('#message')).toContainText('已复制公式图片');
  expect(await app.evaluate(async({clipboard})=>await clipboard.has('image/png'))).toBe(true);
  expect(network).toEqual([]);
  await page.screenshot({path:'test-results/packaged.png'});
  await fs.writeFile('test-results/packaged-report.json',JSON.stringify({executablePath,packaged:true,noDevelopmentPath:true,networkRequests:network,checks:['原生模块启动','渲染 Worker','Unicode 转换及复制','矩阵排版与 PNG 复制','无测试后门','无 HTTP 资源请求']},null,2));
  console.log('Packaged smoke tests passed:',executablePath);
}finally{await app.close();}
