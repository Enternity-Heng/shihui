import fs from 'node:fs/promises';
import path from 'node:path';
const visited=new Set();
const records=[];
async function visit(name,from=process.cwd()) {
  let directory=from;
  let root;
  while(true){const candidate=path.join(directory,'node_modules',name);try{await fs.access(path.join(candidate,'package.json'));root=candidate;break;}catch{}const parent=path.dirname(directory);if(parent===directory)throw new Error(`Missing production dependency: ${name}`);directory=parent;}
  const metadata=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  const key=`${metadata.name}@${metadata.version}`;
  if(visited.has(key))return;visited.add(key);
  const files=(await fs.readdir(root)).filter(file=>/^(?:(?:licen[sc]e|copying|notice)(?:\.|$)|third[-_]?party.*notices?)/i.test(file));
  const texts=await Promise.all(files.map(file=>fs.readFile(path.join(root,file),'utf8')));
  records.push(`${key}\nLicense: ${typeof metadata.license==='string'?metadata.license:JSON.stringify(metadata.license)}\n${texts.join('\n') || 'Refer to package metadata for license details.'}`);
  for(const dependency of Object.keys(metadata.dependencies??{}))await visit(dependency,root);
  for(const dependency of Object.keys(metadata.optionalDependencies??{})){
    try { await visit(dependency,root); } catch(error) { if(!String(error).includes('Missing production dependency:'))throw error; }
  }
}
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
for(const name of Object.keys(pkg.dependencies))await visit(name);
records.push(await fs.readFile('assets/licenses/mhchem-NOTICE.txt','utf8')+'\n'+await fs.readFile('assets/licenses/Apache-2.0.txt','utf8'));
const electronLicense=await fs.readFile('node_modules/electron/dist/LICENSE','utf8');
records.push(`Electron ${pkg.devDependencies.electron}\n${electronLicense}\nChromium and bundled dependencies: see LICENSES.chromium.html shipped alongside the application executable.`);
for(const name of (await fs.readdir('assets/ocr')).filter(name=>/^(LICENSE-|THIRD-PARTY-)/.test(name)))records.push(`${name}\n${await fs.readFile(path.join('assets/ocr',name),'utf8')}`);
records.push('RapidLaTeXOCR offline models, release v0.0.0, MIT. Source: https://github.com/RapidAI/RapidLaTeXOCR. Model provenance and fixed SHA-256 values: resources/ocr/manifest.json. ONNX Runtime license and bundled notices are included above and in its package files.');
records.push('Microsoft Visual C++ Runtime 14.44.35211 x64: Copyright Microsoft Corporation. Distributed app-locally. Microsoft Software License Terms: LICENSE-Microsoft-VC.rtf alongside the executable. Source and fixed SHA-256 values: assets/vcruntime/manifest.json in the source archive.');
await fs.writeFile('THIRD-PARTY-NOTICES.txt',records.join('\n\n'+'='.repeat(72)+'\n\n'));
