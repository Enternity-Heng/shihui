import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
await fs.copyFile('README.md','release/使用说明.md');
await fs.copyFile('THIRD-PARTY-NOTICES.txt','release/THIRD-PARTY-NOTICES.txt');
await fs.copyFile('VALIDATION.md','release/测试记录.md');
await fs.writeFile('release/VERSION.txt',`${pkg.version}\nWindows x64\n`);
const sourceArchive=`${pkg.productName}-${pkg.version}-源码.zip`;
await promisify(execFile)('powershell.exe',['-NoProfile','-Command',"$ErrorActionPreference='Stop'; $paths=@('src','scripts','tests','docs','assets','package.json','package-lock.json','tsconfig.json','README.md','CONTRIBUTING.md','VALIDATION.md','LICENSE','THIRD-PARTY-NOTICES.txt','.gitignore','.gitattributes') | ForEach-Object { Join-Path $env:MATH_SOURCE_ROOT $_ }; Compress-Archive -LiteralPath $paths -DestinationPath (Join-Path $env:MATH_SOURCE_ROOT ('release\\'+$env:MATH_SOURCE_ARCHIVE)) -Force"],{windowsHide:true,env:{...process.env,MATH_SOURCE_ROOT:process.cwd(),MATH_SOURCE_ARCHIVE:sourceArchive}});
const artifacts=[`${pkg.productName}-${pkg.version}-Setup-x64.exe`,`${pkg.productName}-${pkg.version}-Windows-x64.zip`,sourceArchive];
for(const name of artifacts)await fs.access(path.join('release',name));
const lines=[];
for(const name of artifacts){const hash=crypto.createHash('sha256');for await(const chunk of (await import('node:fs')).createReadStream(path.join('release',name)))hash.update(chunk);lines.push(`${hash.digest('hex')}  ${name}`);}
await fs.writeFile('release/SHA256SUMS.txt',lines.join('\n')+'\n');
console.log('发布成品已生成：\n'+artifacts.join('\n'));
