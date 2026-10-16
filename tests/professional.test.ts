import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFESSIONAL_FORMULAS,PHYSICS_FORMULAS,COMPUTER_FORMULAS,ELECTRONICS_FORMULAS,STATISTICS_FORMULAS,MECHANICS_FORMULAS,CHEMISTRY_FORMULAS,ECONOMICS_FORMULAS,BIOLOGY_FORMULAS,SUBJECT_NAMES,filterFormulas,formulaPlacements,matchingPlacements} from '../src/core/professional-formulas';
import {ADDITIONAL_FORMULA_PLACEMENTS} from '../src/core/additional-formula-placements';
import {BUILTIN_COMMANDS,FORMULA_TEMPLATES} from '../src/core/catalog';
import {parseTemplate} from '../src/core/templates';
import {convert} from '../src/core/converter';
import {renderPseudocode,validatePseudocode,validatePseudocodeState,PSEUDOCODE_EXAMPLES,indentPseudocode,newlinePseudocode} from '../src/core/pseudocode';
import {validateWorkspace} from '../src/main/drafts';
import {freshBuilder} from '../src/core/structures';

test('235 个独立模板及九个专业模块的来源、字段和排版完整',()=>{
  assert.equal(PROFESSIONAL_FORMULAS.length,235);assert.equal(Object.keys(SUBJECT_NAMES).length,9);
  for(const formulas of [PHYSICS_FORMULAS,COMPUTER_FORMULAS,ELECTRONICS_FORMULAS,STATISTICS_FORMULAS,MECHANICS_FORMULAS,CHEMISTRY_FORMULAS,ECONOMICS_FORMULAS,BIOLOGY_FORMULAS])assert.equal(formulas.length,30);
  assert.equal(new Set(PROFESSIONAL_FORMULAS.map(formula=>formula.id)).size,235);
  for(const formula of PROFESSIONAL_FORMULAS){
    const parsed=parseTemplate(formula.template);const result=convert(parsed.text);
    assert.ok(result.kind==='unicode'||result.kind==='formula',`${formula.title}: ${'message'in result?result.message:''}`);
    assert.deepEqual([...new Set(parsed.fields.map(field=>field.index))].sort(),formula.fields.map(field=>field.index).sort(),formula.title);
    assert.ok(formula.fields.every(field=>field.description?.trim()),formula.title);
    assert.ok(formula.fields.length<=9&&formula.fields.every(field=>field.index>=1&&field.index<=9),formula.title);
    assert.ok(formula.conditions.trim()&&formula.reference.section.trim()&&formula.reference.url.startsWith('https://'),formula.title);
    const placements=formulaPlacements(formula);assert.equal(new Set(placements.map(placement=>placement.subject)).size,placements.length,formula.id);
  }
  for(const template of FORMULA_TEMPLATES)assert.equal(PROFESSIONAL_FORMULAS.find(formula=>formula.id===`math-${template.name.slice(1)}`)?.template,template.template);
  assert.equal(BUILTIN_COMMANDS.filter(candidate=>candidate.formula).length,10);
});
test('新增四专业六主题各五条，九个共享入口保留身份且联合去重',()=>{
  for(const subject of ['mechanics','chemistry','economics','biology'] as const){
    const filter={query:'',subjects:[subject],topic:'',level:'' as const};const formulas=filterFormulas(filter);
    const topics=new Set(formulas.flatMap(formula=>matchingPlacements(formula,filter).map(placement=>placement.topic)));
    assert.equal(formulas.length,30);assert.equal(topics.size,6);
    for(const topic of topics)assert.equal(filterFormulas({...filter,topic}).length,5,`${subject}/${topic}`);
    assert.ok(formulas.some(formula=>matchingPlacements(formula,filter).some(placement=>placement.level==='basic')));
    assert.ok(formulas.some(formula=>matchingPlacements(formula,filter).some(placement=>placement.level==='advanced')));
  }
  assert.equal(Object.keys(ADDITIONAL_FORMULA_PLACEMENTS).length,9);
  for(const [id,placements] of Object.entries(ADDITIONAL_FORMULA_PLACEMENTS)){
    const formula=PROFESSIONAL_FORMULAS.find(candidate=>candidate.id===id);assert.ok(formula,id);
    for(const placement of placements){const matches=filterFormulas({query:'',subjects:[placement.subject],topic:placement.topic,level:placement.level});assert.equal(matches.filter(candidate=>candidate===formula).length,1,id);}
  }
  assert.equal(filterFormulas({query:'',subjects:['physics','mechanics'],topic:'',level:''}).length,56);
  assert.equal(filterFormulas({query:'',subjects:['chemistry','biology'],topic:'',level:''}).length,59);
  assert.equal(filterFormulas({query:'',subjects:['mechanics','chemistry','economics','biology'],topic:'',level:''}).length,119);
  assert.equal(filterFormulas({query:'',subjects:['biology'],topic:'信息论',level:''}).length,0);
  assert.deepEqual(matchingPlacements(PROFESSIONAL_FORMULAS.find(formula=>formula.id==='physics-first-law')!,{subjects:['chemistry'],topic:'热力学与平衡',level:'advanced'}),[{subject:'chemistry',topic:'热力学与平衡',level:'advanced'}]);
});
test('四专业中英文术语、关键词交集和上下文搜索可用',()=>{
  for(const [subject,query,id] of [
    ['mechanics','Euler buckling','mechanics-euler-buckling'],['mechanics','土压力','mechanics-rankine'],['mechanics','Darcy Weisbach','mechanics-darcy-weisbach'],
    ['chemistry','Arrhenius','chemistry-arrhenius'],['chemistry','CSTR','chemistry-cstr'],['chemistry','Bragg','chemistry-bragg'],
    ['economics','NPV','economics-npv'],['economics','EOQ','economics-eoq'],['economics','供需 均衡','economics-linear-equilibrium'],
    ['biology','Michaelis Menten','biology-michaelis-menten'],['biology','SIR','biology-sir'],['biology','qPCR','biology-delta-delta-ct'],['biology','entropy','computer-entropy'],['biology','香农多样性','computer-entropy']
  ] as const)assert.ok(filterFormulas({query,subjects:[subject],topic:'',level:''}).some(formula=>formula.id===id),query);
  assert.equal(filterFormulas({query:'经济学与管理学',subjects:['economics'],topic:'',level:''}).length,30);
  assert.equal(filterFormulas({query:'生物学',subjects:['chemistry'],topic:'',level:''}).length,0);
});
test('新专业关键符号、模型边界与变换方向明确',()=>{
  const formula=(id:string)=>PROFESSIONAL_FORMULAS.find(candidate=>candidate.id===id)!;
  for(const [id,pattern] of [
    ['mechanics-effective-stress',/压应力为正/],['mechanics-darcy-weisbach',/Darcy.*Fanning/],['mechanics-rankine',/主动极限/],
    ['chemistry-equilibrium',/无量纲/],['chemistry-cstr',/−r_A>0/],['chemistry-buffer',/活度系数/],['chemistry-bragg',/2θ/],
    ['economics-price-elasticity',/保留负号/],['economics-quantity',/核算关系/],['economics-npv',/初始投入记负/],['economics-little',/W 包括服务与等待/],
    ['biology-delta-delta-ct',/效率近似相同/],['biology-membrane-nernst',/内减外/],['biology-sir',/频率依赖/],['biology-incidence',/不是人时/],['biology-evenness',/bit/]
  ] as const)assert.match(formula(id).conditions,pattern,id);
  assert.equal(parseTemplate(formula('economics-growth-rate').template).text,'{g_t}=\\frac{{Y_t}-{Y_{t-1}}}{{Y_{t-1}}}');
  assert.match(parseTemplate(formula('chemistry-cstr').template).text,/\\frac.*-\{r_A\}/);
  assert.match(parseTemplate(formula('biology-delta-delta-ct').template).text,/2\^\{-\\Delta\\Delta/);
});
test('共享统计公式保持原 ID 和唯一条目，专业主题筛选不串用归属',()=>{
  const base={query:'',topic:'',level:'' as const};
  const statistics=filterFormulas({...base,subjects:['statistics']});const computer=filterFormulas({...base,subjects:['computer']});
  assert.equal(statistics.length,30);
  const shared=statistics.filter(formula=>formula.subject!=='statistics');assert.equal(shared.length,6);
  for(const formula of shared)assert.equal(formula,PROFESSIONAL_FORMULAS.find(candidate=>candidate.id===formula.id));
  const union=filterFormulas({...base,subjects:['computer','statistics']});assert.equal(union.length,55);assert.equal(new Set(union.map(formula=>formula.id)).size,55);
  const bayes=computer.find(formula=>formula.id==='computer-bayes')!;
  assert.deepEqual(matchingPlacements(bayes,{subjects:['statistics'],topic:'概率与抽样',level:'basic'}),[{subject:'statistics',topic:'概率与抽样',level:'basic'}]);
  assert.equal(filterFormulas({...base,subjects:['computer'],topic:'概率与抽样'}).length,0);
  assert.equal(filterFormulas({...base,subjects:['statistics'],topic:'学习与优化'}).length,0);
  assert.equal(filterFormulas({...base,subjects:['statistics'],topic:'概率分布'}).length,5);
  assert.equal(filterFormulas({...base,subjects:['statistics'],topic:'回归与拟合'}).length,5);
  assert.equal(filterFormulas({...base,query:'normal distribution',subjects:['statistics']})[0].id,'math-normalpdf');
});
test('电子信息与统计模板按中英文检索，六主题各五条',()=>{
  for(const subject of ['electronics','statistics'] as const){const formulas=filterFormulas({query:'',subjects:[subject],topic:'',level:''});const topics=new Set(formulas.flatMap(formula=>matchingPlacements(formula,{subjects:[subject],topic:'',level:''}).map(placement=>placement.topic)));assert.equal(topics.size,6);for(const topic of topics)assert.equal(filterFormulas({query:'',subjects:[subject],topic,level:''}).length,5,topic);}
  for(const [subject,query,id] of [['electronics','PID','electronics-pid'],['electronics','Fourier CTFT','electronics-fourier'],['electronics','BPSK','electronics-bpsk'],['electronics','DFT','electronics-dft'],['statistics','Welch','statistics-welch'],['statistics','ANOVA','statistics-anova'],['statistics','Bayes','computer-bayes']] as const)assert.ok(filterFormulas({query,subjects:[subject],topic:'',level:''}).some(formula=>formula.id===id),query);
});
test('新专业明确概率、单位、变换和检验假设，Welch 不超过九个变量',()=>{
  const formula=(id:string)=>PROFESSIONAL_FORMULAS.find(candidate=>candidate.id===id)!;
  assert.match(formula('electronics-active-power').conditions,/有效值/);assert.match(formula('electronics-shannon').conditions,/而非 dB/);
  assert.match(formula('electronics-fourier').conditions,/Hz/);assert.match(formula('electronics-laplace').conditions,/收敛域/);
  assert.match(parseTemplate(formula('electronics-dft').template).text,/e\^\{-j2/);assert.match(parseTemplate(formula('electronics-idft').template).text,/e\^\{j2/);
  assert.match(formula('statistics-variance-interval').conditions,/下侧/);assert.match(formula('statistics-anova').conditions,/方差相等/);
  assert.match(formula('statistics-welch').conditions,/不要求等方差/);assert.equal(formula('statistics-welch').fields.length,9);
  assert.match(formula('statistics-clt').conditions,/独立同分布/);assert.match(formula('statistics-r-squared').conditions,/可为负/);
});
test('专业搜索支持中英文、多专业及超过 8 条结果',()=>{
  const find=(query:string)=>filterFormulas({query,subjects:[],topic:'',level:''});
  for(const [query,id] of [['SHM','physics-shm'],['Schrodinger','physics-schrodinger-stationary'],['Bayes','computer-bayes'],['attention','computer-attention']])assert.ok(find(query).some(formula=>formula.id===id),query);
  assert.equal(filterFormulas({query:'',subjects:['physics'],topic:'',level:''}).length,30);
  assert.equal(filterFormulas({query:'',subjects:['physics','computer'],topic:'',level:'advanced'}).length,25);
  assert.equal(filterFormulas({query:'',subjects:['computer'],topic:'深度学习',level:'advanced'}).length,5);
  assert.equal(find('不存在的公式').length,0);
});
test('物理约定、信息论单位及特殊公式结构保留',()=>{
  const formula=(id:string)=>PROFESSIONAL_FORMULAS.find(item=>item.id===id)!;
  assert.match(formula('physics-first-law').conditions,/对外做功/);
  assert.match(parseTemplate(formula('physics-first-law').template).text,/Q.*-.*W/);
  assert.match(formula('physics-faraday').conditions,/固定回路/);
  assert.match(parseTemplate(formula('physics-ampere-maxwell').template).text,/varepsilon_0/);
  assert.match(formula('computer-euler-planar').conditions,/无界外部面/);
  assert.match(formula('computer-layernorm').conditions,/不跨 batch/);
  for(const item of COMPUTER_FORMULAS.filter(item=>item.topic==='信息论'))assert.match(parseTemplate(item.template).text,/log_2/);
});
test('五个完整伪代码示例支持行内公式且行号只用于展示',()=>{
  assert.equal(PSEUDOCODE_EXAMPLES.length,5);
  for(const example of PSEUDOCODE_EXAMPLES){
    assert.match(example.source,/INPUT/);assert.match(example.source,/OUTPUT/);assert.match(example.source,/END FUNCTION/);
    const rendered=renderPseudocode(example.source,true);assert.deepEqual(rendered.errors,[],example.title);assert.match(rendered.html,/pseudo-number/);
    assert.doesNotMatch(renderPseudocode(example.source,false).html,/pseudo-number/);
  }
});
test('伪代码转义文本、保留缩进空行并报告数学错误行',()=>{
  const result=renderPseudocode('IF a < b\n  <img src=x onerror=alert(1)>\n\n  cost ← \\$5\n  $x^2$\n  $x\n  $$x$$',true);
  assert.equal(result.lines,7);assert.match(result.html,/&lt;img/);assert.doesNotMatch(result.html,/<img/);assert.match(result.html,/cost ← \$5/);
  assert.match(result.html,/  cost/);assert.match(result.html,/class="katex"/);assert.deepEqual(result.errors.map(error=>error.line),[6,7]);
  assert.match(renderPseudocode('$\\href{https://example.com}{x}$',false).errors[0].message,/不支持/);
  assert.deepEqual(renderPseudocode('$a+\\$+b$',false).errors,[]);
  assert.ok(renderPseudocode('$\\badcommand$',false).errors.length);
});
test('伪代码长度、行数、设置和控制字符边界',()=>{
  assert.doesNotThrow(()=>validatePseudocode('a'.repeat(16000),true));assert.throws(()=>validatePseudocode('a'.repeat(16001),true));
  assert.doesNotThrow(()=>validatePseudocode('\n'.repeat(199),false));assert.throws(()=>validatePseudocode('\n'.repeat(200),false));
  assert.throws(()=>validatePseudocode('a',1));assert.throws(()=>validatePseudocode('a\0',true));
  assert.deepEqual(validatePseudocodeState({text:'abc',start:-1,end:999,lineNumbers:false}),{text:'abc',start:0,end:3,lineNumbers:false});
});
test('缩进、反缩进、尾部换行选区与 Enter 光标',()=>{
  assert.deepEqual(indentPseudocode({text:'ab',start:1,end:1}),{text:'a  b',start:3,end:3});
  const selected={text:'one\n  two\nthree',start:0,end:10};
  const indented=indentPseudocode(selected);assert.equal(indented.text,'  one\n    two\nthree');assert.deepEqual(indentPseudocode(indented,true),selected);
  assert.deepEqual(indentPseudocode({text:'  abc',start:1,end:1},true),{text:'abc',start:0,end:0});
  assert.deepEqual(newlinePseudocode({text:'  IF x',start:6,end:6}),{text:'  IF x\n  ',start:9,end:9});
  assert.equal(newlinePseudocode({text:'\nx',start:0,end:0}).text,'\n\nx');
});
test('旧草稿默认空伪代码，新草稿保留状态，超限拒绝',()=>{
  const old={version:1,editor:{text:'x',start:1,end:1},builder:freshBuilder(),review:null,panel:null};
  assert.equal(validateWorkspace(old).pseudocode,undefined);assert.deepEqual(validatePseudocodeState(undefined),{text:'',start:0,end:0,lineNumbers:true});
  const pseudocode={text:'RETURN $x$',start:2,end:4,lineNumbers:false};
  const checked=validateWorkspace({...old,panel:'pseudocode-panel',pseudocode});assert.deepEqual(checked.pseudocode,pseudocode);assert.equal(checked.panel,'pseudocode-panel');
  assert.equal(validateWorkspace({...old,panel:'templates-panel'}).panel,null);
  assert.throws(()=>validateWorkspace({...old,pseudocode:{...pseudocode,text:'a'.repeat(16001)}}));
});
