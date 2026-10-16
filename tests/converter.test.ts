import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, normalizeSource } from '../src/core/converter';
for (const [input,expected] of [
  ['\\alpha+\\beta','α+β'],['\\infty','∞'],['x^2+y^2','x²+y²'],['x^{10}','x¹⁰'],['x_1','x₁'],
  ['\\alpha x','αx'],['\\leq\\geq\\neq','≤≥≠'],['\\{a,b\\}','{a,b}'],['{a+b}','a+b'],
  ['$\\alpha$','α'],['$$x^2$$','x²'],['\\(x\\)','x'],['\\[x\\]','x'],['\\partial f','∂f'],
  ['x_{max}','xₘₐₓ'],['x^{n+1}','xⁿ⁺¹'],['\\forall x\\in A','∀x∈A']
] as const) test(`文字：${input}`,() => {const result=convert(input);assert.equal(result.kind,'unicode');if(result.kind==='unicode')assert.equal(result.text,expected);});
for (const source of ['\\frac{1}{2}','\\sqrt{x}','\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}','\\text{a b}','\\hat{x}','\\mathbb{R}','x^a','{ab}^2','\\left(x\\right)','\\sin x']) test(`保留完整排版：${source}`,() => assert.equal(convert(source).kind,'formula'));
for (const source of ['\\alphax','\\notarealcommand','x^^2','x_1_2']) test(`不允许局部转换：${source}`,() => assert.equal(convert(source).kind,'error'));
for (const source of ['\\frac{a}{','\\alpha{','\\','$$x','\\(x']) test(`待补全：${source}`,() => assert.equal(convert(source).kind,'incomplete'));
test('空输入',() => {assert.equal(convert('').kind,'empty');assert.equal(convert('$$ $$').kind,'empty');});
test('长度和控制字符限制',() => {assert.equal(convert('a'.repeat(4097)).kind,'error');assert.equal(convert('a\0b').kind,'error');});
test('资源命令禁止，包括宏间接调用',() => {
  for(const input of ['\\href{https://example.com}{x}','\\includegraphics{https://example.com/a.png}','\\htmlClass{bad}{x}','\\def\\foo{\\href{https://example.com}{x}}\\foo']) assert.equal(convert(input).kind,'error');
});
test('宏展开有上限',() => assert.equal(convert('\\def\\a{\\a}\\a').kind,'error'));
test('宏环境不跨调用共享',() => {convert('\\gdef\\myalpha{a}\\myalpha');assert.equal(convert('\\myalpha').kind,'error');});
test('外层定界符不误删',() => assert.deepEqual(normalizeSource(' $$x$$ '),{source:'x',incomplete:false}));
test('错误文本保留为数据，不能生成可操作结果',() => {const result=convert('\\<img src=x onerror=alert(1)>');assert.equal(result.kind,'error');assert.ok(!('html' in result));});
