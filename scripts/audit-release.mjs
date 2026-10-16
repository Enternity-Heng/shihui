import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {listPackage,extractFile} from '@electron/asar';
const pkg=JSON.parse(await fs.readFile('package.json','utf8')),asar=path.resolve('release/win-unpacked/resources/app.asar');
const names=listPackage(asar),forbidden=names.filter(n=>/(^|[\\/])(\.test-profile|test-results|history-images|.implementation-baseline)([\\/]|$)|(^|[\\/])(history|favorites|settings|commands|history-generation|state)\.json$/.test(n));
if(forbidden.length)throw new Error('Personal data paths in app.asar');
if(JSON.parse(extractFile(asar,'package.json').toString()).version!==pkg.version)throw new Error('Packaged version mismatch');
if(JSON.parse(extractFile(asar,'package.json').toString()).productName!==pkg.productName)throw new Error('Packaged product name mismatch');
const metadata=JSON.parse((await promisify(execFile)('powershell.exe',['-NoProfile','-Command',"[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); (Get-Item -LiteralPath $env:MATH_AUDIT_EXE).VersionInfo | Select-Object ProductName,ProductVersion | ConvertTo-Json -Compress"],{windowsHide:true,encoding:'utf8',env:{...process.env,MATH_AUDIT_EXE:path.resolve('release/win-unpacked/MathInputAssistant.exe')}})).stdout.replace(/^\uFEFF/,''));
if(metadata.ProductName!==pkg.productName||!metadata.ProductVersion.startsWith(pkg.version))throw new Error('Executable product metadata mismatch');
for(const file of ['dist/main/main.cjs','dist/main/preload.cjs','dist/main/capture-preload.cjs','dist/renderer/index.html','dist/renderer/capture.html'])if(!extractFile(asar,path.normalize(file)).equals(await fs.readFile(file)))throw new Error(`Packaged build differs from workspace: ${file}`);
for(const name of await fs.readdir('dist/renderer/assets')){const file=path.join('dist/renderer/assets',name);if(!extractFile(asar,path.normalize(file)).equals(await fs.readFile(file)))throw new Error(`Packaged renderer asset differs: ${name}`);}
const sums=(await fs.readFile('release/SHA256SUMS.txt','utf8')).trim().split(/\r?\n/);const verified=[];
for(const line of sums){const match=/^([a-f0-9]{64})  (.+)$/.exec(line);if(!match||path.basename(match[2])!==match[2])throw new Error('Invalid checksum entry');const hash=crypto.createHash('sha256');for await(const chunk of createReadStream(path.join('release',match[2])))hash.update(chunk);if(hash.digest('hex')!==match[1])throw new Error(`Checksum mismatch: ${match[2]}`);verified.push(match[2]);}
if(verified.length!==3)throw new Error('Expected three distribution artifacts');
const zipReport=await promisify(execFile)('powershell.exe',['-NoProfile','-File','scripts/audit-archives.ps1'],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024});
const report={version:pkg.version,asarEntries:names.length,personalDataPaths:forbidden.length,verified,archives:JSON.parse(zipReport.stdout.replace(/^\uFEFF/,''))};
await fs.writeFile('test-results/release-audit.json',JSON.stringify(report,null,2));console.log('PASS final build identity, archive privacy and SHA-256:',JSON.stringify(report));
