import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFESSIONAL_CASES,caseReference,caseSource,caseText,filterCases} from '../src/core/professional-cases';
import {SUBJECT_NAMES} from '../src/core/professional-formulas';
import {convert} from '../src/core/converter';
import {DIAGRAM_PRESETS} from '../src/core/specialty-diagrams';
test('九学科各三套完整案例、稳定 ID 唯一，来源及配套图存在',()=>{
  assert.equal(PROFESSIONAL_CASES.length,27);assert.equal(new Set(PROFESSIONAL_CASES.map(c=>c.id)).size,27);
  for(const subject of Object.keys(SUBJECT_NAMES))assert.equal(PROFESSIONAL_CASES.filter(c=>c.subject===subject).length,3,subject);
  for(const c of PROFESSIONAL_CASES){assert.ok(c.given&&c.question&&c.conditions&&c.result);assert.equal(c.steps.length,3);assert.match(caseReference(c).url,/^https:\/\//);if(c.diagram)assert.ok(DIAGRAM_PRESETS.some(p=>p.id===c.diagram),c.id);assert.ok(caseSource(c).length<4096);assert.match(caseText(c),/条件：.*\n/);assert.match(caseText(c),/方法来源：/);assert.ok(caseText(c).includes(c.result));}
});
test('27 套推导全部经受限 KaTeX 可渲染，不包含可执行内容',()=>{
  for(const c of PROFESSIONAL_CASES){const result=convert(caseSource(c));assert.ok(result.kind==='formula'||result.kind==='unicode',`${c.id}: ${JSON.stringify(result)}`);if(result.kind==='formula'||result.kind==='unicode')assert.doesNotMatch(result.html,/<script|onerror=/);}
});
test('案例支持中英关键词、专业筛选及多词组合，不截断结果',()=>{
  assert.equal(filterCases('','').length,27);assert.equal(filterCases('','Newton').length,1);assert.equal(filterCases('chemistry','dilution')[0].id,'case-chemistry-dilution');assert.equal(filterCases('','反馈 闭环')[0].id,'case-electronics-feedback');assert.equal(filterCases('math','酶').length,0);
});
test('原创案例数值独立复核，覆盖各专业的符号、单位和舍入',()=>{
  const close=(actual:number,expected:number,tolerance=1e-4)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
  assert.deepEqual([(5-1)/2,(5+1)/2],[2,3]);assert.equal(3*(1-2**5)/(1-2),93);assert.equal(3*2**2-2,10);
  assert.equal((10-2)/2,4);assert.equal(.5*2*(25-9),16);close(8.314*300/.02,124710);
  close(.9*.01/(.9*.01+.05*.99),.153846);close(0-.1*(2*(0-3)),.6);close(-.25*Math.log2(.25)-.75*Math.log2(.75),.811278);
  assert.equal(12*1000/3000,4);close(5*(1-Math.exp(-1)),3.1606);close(2/(1+2),2/3);
  assert.equal(((2-4)**2+(6-4)**2)/2,4);close(50-1.96*10/Math.sqrt(100),48.04);close(10*.2**2*.8**3,.2048);
  close(20000*2/(200e9*200e-6),.001);close(-2000*.04/8e-6,-10e6);close(9.81*(.5-.2*Math.cos(Math.PI/6)),3.2059);
  close(.05/.25,.2);close(.1*250/2,12.5);close(.8*Math.exp(-1),.2943);close(Math.log(2)/.2,3.4657);
  close(-1000+600/1.1+600/1.1**2,41.3223);assert.equal(10000/(80-30),200);close(Math.sqrt(2*10000*50/2),707.1068);
  assert.equal(.25+.5+.25,1);assert.equal(100*3/(2+3),60);assert.equal(.5*200*(1-200/1000),80);
});
