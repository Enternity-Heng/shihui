import {_electron} from '@playwright/test';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),executablePath=require('electron');
const env={...process.env,MATH_INPUT_TEST:'1',MATH_INPUT_PROFILE:path.resolve('.test-profile/debug')};delete env.ELECTRON_RUN_AS_NODE;
const app=await _electron.launch({executablePath,args:['.'],env});
const editor=await _electron.launch({executablePath,args:['tests/fixtures/editor.cjs'],env});
try{
const page=await app.firstWindow();const edit=await editor.firstWindow();
await edit.waitForSelector('#editor');
while(!await editor.evaluate(()=>!!global.pressHotkey))await new Promise(resolve=>setTimeout(resolve,50));
await app.evaluate(()=>global.__mathTest.hide());
await editor.evaluate(()=>global.focusEditor());
await edit.locator('#editor').click();
console.log('before',await app.evaluate(()=>({state:global.__mathTest.state(),target:global.__mathTest.captureTarget(),visible:global.__mathTest.window.isVisible()})));
await editor.evaluate(()=>global.pressHotkey());
await new Promise(resolve=>setTimeout(resolve,500));
console.log('after',await app.evaluate(()=>({state:global.__mathTest.state(),target:global.__mathTest.captureTarget(),visible:global.__mathTest.window.isVisible()})));
console.log('dom',await page.locator('#target').textContent());
}finally{await editor.close();await app.close();}
