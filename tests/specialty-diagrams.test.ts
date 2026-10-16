import test from 'node:test';
import assert from 'node:assert/strict';
import {DIAGRAM_PRESETS,freshDiagram,validateDiagram,renderDiagram,punnett} from '../src/core/specialty-diagrams';
import {validateWorkspace} from '../src/main/drafts';
import {freshBuilder} from '../src/core/structures';
test('七个专业预设可验证并生成有限 SVG，正负反馈符号一致',()=>{
  assert.equal(DIAGRAM_PRESETS.length,7);for(const p of DIAGRAM_PRESETS){const r=renderDiagram(p.state);assert.deepEqual(r.errors,[],p.id);assert.doesNotMatch(r.html,/NaN|Infinity/);assert.match(r.html,/<svg/);}
  const s=freshDiagram();assert.match(renderDiagram(s).html,/1 \+ C·G·H/);s.control.negative=false;assert.match(renderDiagram(s).html,/1 − C·G·H/);
});
test('杂交配子保留重复概率，单因子、双因子及测交份额正确',()=>{
  assert.deepEqual(punnett('Aa','Aa').counts,{AA:1,Aa:2,aa:1});assert.deepEqual(punnett('aa','AA').counts,{Aa:4});
  const d=punnett('AaBb','AaBb');assert.equal(d.total,16);assert.equal(d.counts.AaBb,4);assert.equal(d.counts.aabb,1);assert.equal(Object.values(d.counts).reduce((s,x)=>s+x,0),16);
  assert.deepEqual(punnett('AaBb','aabb').counts,{AaBb:4,Aabb:4,aaBb:4,aabb:4});assert.deepEqual(punnett('aA','aA').counts,{aa:1,Aa:2,AA:1});
  for(const [a,b] of [['AB','Aa'],['AaBb','BbAa'],['Aa','AaBb'],['AaAa','AaAa'],['<x','Aa']])assert.throws(()=>punnett(a,b));
});
test('受力角度从 +x 逆时针；按最大力比例缩放，方向与大小开关一致',()=>{
  const s=freshDiagram();s.kind='force';s.force.forces=[{label:'向右',magnitude:10,angle:0},{label:'向上',magnitude:5,angle:90}];let r=renderDiagram(s,18);assert.match(r.html,/M 450 350 L 660\.000 350\.000/);assert.match(r.html,/M 450 350 L 450\.000 245\.000/);assert.match(r.html,/10 N/);s.force.values=false;r=renderDiagram(s);assert.doesNotMatch(r.html,/10 N/);
});
test('所有标签转义，不能通过主进程绘图通道注入 HTML 或样式',()=>{
  const s=freshDiagram();s.control.controller='<img src=x onerror=x>';s.control.title='<script>alert(1)</script>';const r=renderDiagram(s);assert.deepEqual(r.errors,[]);assert.match(r.html,/&lt;script&gt;/);assert.doesNotMatch(r.html,/<script|<img|<foreignObject|href=/);assert.ok(renderDiagram(s,26,'url(x)').errors.length);
});
test('拒绝恶意输入、非有限数及过量外力；未完成数字允许存草稿并停止导图',()=>{
  assert.throws(()=>validateDiagram(null));const s=freshDiagram();assert.throws(()=>validateDiagram({...s,kind:'svg'}));for(const n of [0,-1,1e7,Infinity,NaN])assert.throws(()=>validateDiagram({...s,force:{...s.force,forces:[{label:'力',magnitude:n,angle:0}]}}));assert.throws(()=>validateDiagram({...s,force:{...s.force,forces:Array(9).fill(s.force.forces[0])}}));
  s.kind='force';s.force.forces[0].magnitude=null;assert.doesNotThrow(()=>validateDiagram(s));assert.match(renderDiagram(s).errors[0],/未填完/);
  assert.ok(renderDiagram(freshDiagram(),1).errors.length);assert.ok(renderDiagram(freshDiagram(),Infinity).errors.length);
});
test('绘图随 v1 草稿往返，旧草稿兼容，浏览案例面板不持久保存',()=>{
  const base={version:1,editor:{text:'x',start:1,end:1},builder:freshBuilder(),review:null,panel:null};assert.equal(validateWorkspace(base).diagram,undefined);const diagram=freshDiagram();diagram.kind='genetics';diagram.genetics.parent1='AaBb';diagram.genetics.parent2='aabb';const restored=validateWorkspace({...base,panel:'specialty-panel',diagram});assert.deepEqual(restored.diagram,diagram);assert.equal(restored.panel,'specialty-panel');assert.equal(validateWorkspace({...base,panel:'cases-panel'}).panel,null);
});
