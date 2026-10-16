import {_electron,expect as baseExpect} from '@playwright/test';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),packaged=!!process.argv[2];
const expect=baseExpect.configure({timeout:100000});
const env={...process.env,MATH_INPUT_TEST:packaged?'0':'1',MATH_INPUT_PROFILE:path.resolve('.test-profile',`ocr-${Date.now()}`)};delete env.ELECTRON_RUN_AS_NODE;
if(packaged)env.PATH=path.join(process.env.SystemRoot,'System32');
const app=await _electron.launch({executablePath:packaged?path.resolve(process.argv[2]):require('electron'),args:packaged?[`--user-data-dir=${path.resolve('.test-profile',`ocr-packaged-${Date.now()}`)}`]:['.'],env,timeout:30000});
const checks=[];
try{
  const ui=await app.firstWindow();ui.setDefaultTimeout(100000);
  await expect(ui.locator('#source')).toBeVisible();
  await ui.context().route(/^https?:\/\//,route=>route.abort());
  await ui.locator('#ocr-toggle').click();
  await expect(ui.locator('#ocr-open')).toBeVisible();
  const sourcePath=path.resolve('tests/fixtures/ocr/hyperbola.png');
  await app.evaluate(({dialog},sourcePath)=>{global.__originalOpen=dialog.showOpenDialog;dialog.showOpenDialog=async()=>({canceled:false,filePaths:[sourcePath]});},sourcePath);
  await ui.locator('#source').fill('ORIGINAL');
  await ui.locator('#ocr-open').click();
  await expect(ui.locator('#review-confirm')).toBeEnabled();await ui.locator('#review-confirm').click();await expect(ui.locator('#message')).toContainText('识别结果已确认');
  const latex=await ui.locator('#source').inputValue();
  console.log('Real formula recognition:',latex);
  expect(latex).toContain('frac');expect(latex).toMatch(/x\s*\^/);expect(latex).toMatch(/y\s*\^/);expect(latex).toMatch(/=\s*1/);
  await expect(ui.locator('#kind')).toHaveText('排版公式');
  await expect(ui.locator('#ocr-image')).toBeVisible();
  await ui.screenshot({path:'test-results/ocr-interface.png'});
  checks.push('真实上游双曲线图片识别为包含分式及上下标的 LaTeX，并可排版预览');
  if(packaged){
    const root=path.dirname(path.resolve(process.argv[2]));
    const manifest=JSON.parse(await fs.readFile('assets/vcruntime/manifest.json','utf8'));
    for(const file of manifest.files.filter(file=>file.name.endsWith('.dll'))){
      const expected=await fs.readFile(path.join('assets/vcruntime',file.name));
      for(const directory of [root,path.join(root,'resources/app.asar.unpacked/node_modules/onnxruntime-node/bin/napi-v6/win32/x64')])expect((await fs.readFile(path.join(directory,file.name))).equals(expected)).toBe(true);
    }
    checks.push('分发包包含正确版本的五个运行 DLL，并覆盖原生模块的依赖搜索目录');
  }
  await ui.locator('#copy-image').click();await expect(ui.locator('#message')).toContainText('已复制公式图片');
  await ui.locator('#source').fill('ORIGINAL-CLIPBOARD');
  await ui.locator('#source').press('Control+Shift+V');
  await expect(ui.locator('#review-confirm')).toBeEnabled();await ui.locator('#review-confirm').click();await expect(ui.locator('#message')).toContainText('识别结果已确认');
  console.log('Clipboard round trip:',await ui.locator('#source').inputValue());
  expect(await ui.locator('#source').inputValue()).toContain('frac');
  checks.push('Ctrl+Shift+V 识别真实系统剪贴板中的 PNG，结果回填源码');
  await ui.locator('#source').fill('DO-NOT-LOSE');
  await ui.locator('#ocr-open').click();
  await ui.locator('#ocr-cancel').click();
  await expect(ui.locator('#message')).toContainText('已取消识别');
  await expect(ui.locator('#source')).toHaveValue('DO-NOT-LOSE');
  checks.push('取消正在进行的识别，保留原源码并恢复控件');
  for(const [filename,expected] of [['quadratic.png',['\\sqrt','\\pm','\\frac']],['circle.png',['x','y','=']]]){
    const imagePath=path.resolve('tests/fixtures/ocr',filename);
    await app.evaluate(({dialog},imagePath)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[imagePath]});},imagePath);
    await ui.locator('#ocr-open').click();await expect(ui.locator('#review-confirm')).toBeEnabled();await ui.locator('#review-confirm').click();await expect(ui.locator('#message')).toContainText('识别结果已确认');
    const result=await ui.locator('#source').inputValue();console.log(filename+':',result);
    for(const token of expected)expect(result).toContain(token);
    await expect(ui.locator('#preview .katex')).toBeVisible();
  }
  checks.push('取消后可继续识别求根公式和圆方程，根式、正负号及上下标进入可渲染源码');
  const jpegPath=path.resolve('test-results/ocr-formula.jpg');
  const jpeg=await app.evaluate(({nativeImage},sourcePath)=>Array.from(nativeImage.createFromPath(sourcePath).toJPEG(90)),sourcePath);
  await fs.writeFile(jpegPath,Buffer.from(jpeg));
  await app.evaluate(({dialog},jpegPath)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[jpegPath]});},jpegPath);
  await ui.locator('#ocr-open').click();await expect(ui.locator('#review-confirm')).toBeEnabled();await ui.locator('#review-confirm').click();await expect(ui.locator('#message')).toContainText('识别结果已确认');
  expect(await ui.locator('#source').inputValue()).toContain('frac');
  checks.push('JPEG 图片可识别');
  await ui.locator('#source').fill('DO-NOT-LOSE');
  const badPath=path.resolve('test-results/ocr-bad-image.png');
  const oversized=Buffer.from(await fs.readFile(sourcePath));oversized.writeUInt32BE(8192,16);oversized.writeUInt32BE(8192,20);
  for(const [buffer,expected] of [[oversized,'图片过大'],[Buffer.from('this is not a PNG image file'),'无法读取图片']]){
    await fs.writeFile(badPath,buffer);
    await app.evaluate(({dialog},badPath)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[badPath]});},badPath);
    await ui.locator('#ocr-open').click();await expect(ui.locator('#message')).toContainText(expected);
    await expect(ui.locator('#source')).toHaveValue('DO-NOT-LOSE');
  }
  checks.push('拒绝超大像素声明和伪造图片，在解码前限制尺寸并保留原源码');
  await app.evaluate(async({clipboard})=>{await clipboard.writeText('not an image');});
  await ui.locator('#ocr-paste').click();
  await expect(ui.locator('#message')).toContainText('剪贴板没有图片');
  await expect(ui.locator('#source')).toHaveValue('DO-NOT-LOSE');
  checks.push('空图片剪贴板错误可恢复，原源码不丢失');
  await app.evaluate(({dialog})=>{dialog.showOpenDialog=async()=>({canceled:true,filePaths:[]});});
  await ui.locator('#ocr-open').click();await expect(ui.locator('#message')).toContainText('已取消打开图片');
  await expect(ui.locator('#source')).toHaveValue('DO-NOT-LOSE');
  checks.push('取消文件选择保留原源码');
  console.log('OCR checks passed:',JSON.stringify(checks));
}finally{
  await app.close();await fs.writeFile('test-results/ocr-report.json',JSON.stringify({packaged,checks},null,2));
}
