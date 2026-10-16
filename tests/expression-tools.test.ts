import test from 'node:test';
import assert from 'node:assert/strict';
import {freshExpression,validateExpression,buildExpression,formatUnit,textInMath,CHEMISTRY_EXAMPLES,EXPRESSION_KINDS} from '../src/core/expression-tools';
import {convert} from '../src/core/converter';
import {freshBuilder} from '../src/core/structures';
import {validateWorkspace} from '../src/main/drafts';
const rendered=(source:string)=>{const result=convert(source);assert.ok(result.kind==='formula'||result.kind==='unicode',`${source}: ${'message'in result?result.message:''}`);return result;};
test('六种表达工具均可排版，推导与分段的行内容独立',()=>{
  const state=freshExpression();for(const kind of Object.keys(EXPRESSION_KINDS) as (keyof typeof EXPRESSION_KINDS)[])rendered(buildExpression({...state,kind}));
  assert.equal(buildExpression({...state,kind:'piecewise'}),'{f(x)}=\\begin{cases}{x}&{x\\ge0}\\\\{-x}&{x<0}\\end{cases}');
  assert.match(buildExpression({...state,kind:'derivation'}),/aligned/);assert.equal(state.pieces.length,2);
});
test('单位保持正体、分式与微前缀，不把单位当变量或转换数值',()=>{
  assert.equal(formatUnit('kg m s^-2'),'\\mathrm{kg}\\,\\mathrm{m}\\,\\mathrm{s}^{-2}');
  assert.equal(formatUnit('mol/L'),'\\frac{\\mathrm{mol}}{\\mathrm{L}}');
  assert.equal(formatUnit('um'),formatUnit('µm'));assert.match(formatUnit('kΩ'),/\\Omega/);
  for(const unit of ['°C','%','µmol L^-1','m/s^2','MPa','1/s'])rendered(buildExpression({...freshExpression(),unit}));
  for(const unit of ['m/s/kg','m//s','m^100','\\href{x}{y}','<img>','whatever','m/'])assert.throws(()=>formatUnit(unit),unit);
});
test('科学记数法保留尾数，不接受表达式指数或过长输入',()=>{
  const s={...freshExpression(),kind:'scientific' as const,mantissa:'-0.005',exponent:'-3'};
  assert.match(buildExpression(s),/\{-0\.005\}\\times10\^\{-3\}/);
  for(const [mantissa,exponent] of [['x','3'],['1','1/2'],['1','1000'],['1e5','2'],['NaN','2']])assert.throws(()=>buildExpression({...s,mantissa,exponent}));
});
test('推导说明转义、分段条件可用数学或文字，不允许越出结构',()=>{
  const s=freshExpression();s.kind='derivation';s.rows[0].note='A&B_1 <img> 50%';const result=rendered(buildExpression(s));assert.match(result.html,/&lt;img&gt;/);assert.doesNotMatch(result.html,/<img/);
  s.rows[0].right='x&y';assert.throws(()=>buildExpression(s));s.rows[0].right='x\\\\y';assert.throws(()=>buildExpression(s));
  s.kind='piecewise';s.conditionMath=false;s.pieces[0].note='条件 A&B';rendered(buildExpression(s));assert.match(textInMath('a{b}'),/\\\{/);
  s.kind='condition';s.condition='参数 > 0';rendered(buildExpression(s));
});
test('化学式、物态、同位素、反应条件与七个示例通过真实受限渲染',()=>{
  for(const example of CHEMISTRY_EXAMPLES)rendered(buildExpression({...freshExpression(),kind:'chemistry',chemical:example.source}));
  for(const source of ['\\ce{Fe^3+ + SCN- <=> FeSCN^2+}','\\ce{^{235}_{92}U}','\\pu{1.2e3 kJ/mol}'])assert.equal(rendered(source).kind,'formula');
  const denied=convert('\\ce{H2O}\\href{https://example.com}{x}');assert.equal(denied.kind,'error');
  assert.throws(()=>buildExpression({...freshExpression(),kind:'chemistry',chemical:'H2O}\\end{cases}'}));
  assert.equal(convert('\\ce{H2O}').kind,'formula');assert.equal(convert('\\unknownChemicalCommand').kind,'error');
});
test('表达工具容量及旧草稿兼容，新快照保留填写状态',()=>{
  const base={version:1,editor:{text:'x',start:1,end:1},builder:freshBuilder(),review:null,panel:null};
  assert.equal(validateWorkspace(base).expression,undefined);assert.deepEqual(validateExpression(undefined),freshExpression());
  assert.deepEqual(validateWorkspace({...base,panel:'expression-panel',expression:freshExpression()}).expression,freshExpression());
  assert.throws(()=>validateExpression({...freshExpression(),rows:Array(11).fill(freshExpression().rows[0])}));
  assert.throws(()=>buildExpression({...freshExpression(),value:'a'.repeat(4096)}));
});
