import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readSettings,writeSettings,validShortcut,DEFAULT_SHORTCUT } from '../src/main/settings';
test('缺少或损坏设置恢复默认，原子保存可读',() => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'math-input-settings-'));
  try {assert.equal(readSettings(dir),DEFAULT_SHORTCUT);fs.writeFileSync(path.join(dir,'settings.json'),'{bad');assert.equal(readSettings(dir),DEFAULT_SHORTCUT);writeSettings(dir,'Control+Shift+K');assert.equal(readSettings(dir),'Control+Shift+K');assert.equal(fs.existsSync(path.join(dir,'settings.json.tmp')),false);} finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('快捷键必须包含有效修饰键',()=>{assert.ok(validShortcut('Control+Alt+M'));assert.ok(validShortcut('Alt+F8'));for(const value of ['M','Shift+M','Control+Alt+Delete','Control+foo','a'.repeat(100)])assert.equal(validShortcut(value),false);});
