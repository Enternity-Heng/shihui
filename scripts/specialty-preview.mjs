import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {freshBuilder} from '../src/core/structures.ts';
import {freshDiagram,DIAGRAM_PRESETS} from '../src/core/specialty-diagrams.ts';
const require=createRequire(import.meta.url),profile=path.resolve('.test-profile/cases-diagrams-preview');
async function createOnce(file,value){try{await fs.writeFile(file,JSON.stringify(value,null,2),{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}}
await fs.mkdir(path.join(profile,'workspace'),{recursive:true});
await createOnce(path.join(profile,'settings.json'),{shortcut:'Control+Alt+Shift+F13',captureShortcut:'Control+Alt+Shift+F14'});
const diagram=freshDiagram();diagram.control=DIAGRAM_PRESETS.find(p=>p.id==='feedback').state.control;diagram.force=DIAGRAM_PRESETS.find(p=>p.id==='incline-force').state.force;diagram.genetics=DIAGRAM_PRESETS.find(p=>p.id==='dihybrid').state.genetics;
const source='T(s)=\\frac{2}{s+3}';
await createOnce(path.join(profile,'workspace/state.json'),{version:1,epoch:0,snapshot:{version:1,editor:{text:source,start:source.length,end:source.length,linked:null},builder:freshBuilder(),review:null,panel:'specialty-panel',diagram}});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.MATH_INPUT_TEST;delete env.MATH_INPUT_PROFILE;
function launch(){const child=spawn(require('electron'),['.',`--user-data-dir=${profile}`],{cwd:process.cwd(),env,detached:true,stdio:'ignore',windowsHide:true});child.unref();return child.pid;}
const pid=launch();await new Promise(resolve=>setTimeout(resolve,3000));launch();
console.log(JSON.stringify({pid,profile,message:'已启动案例与专业绘图试用窗口；已有试用资料不会覆盖。'}));
