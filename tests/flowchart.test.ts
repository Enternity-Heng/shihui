import test from 'node:test';
import assert from 'node:assert/strict';
import {freshFlow,validateFlow,renderFlowchart,FLOW_EXAMPLES} from '../src/core/flowchart';
import {freshBuilder} from '../src/core/structures';
import {validateWorkspace} from '../src/main/drafts';
test('五个流程图示例支持顺序、分支与循环，布局总是有限',()=>{
  assert.equal(FLOW_EXAMPLES.length,5);for(const example of FLOW_EXAMPLES){const result=renderFlowchart(example.state);assert.deepEqual(result.errors,[],example.id);assert.match(result.html,/<svg/);assert.ok(result.width>0&&result.height>0);assert.doesNotMatch(result.html,/NaN|Infinity/);}
  const self=freshFlow();self.edges.push({from:'n2',to:'n2',label:'重试'});assert.deepEqual(renderFlowchart(self).errors,[]);
});
test('流程图文字只作为转义文本，不能生成 HTML、脚本或外部链接',()=>{
  const state=freshFlow();state.nodes[0].label='<script>alert(1)</script>';state.edges[0].label='" onload="x';const r=renderFlowchart(state);assert.deepEqual(r.errors,[]);assert.doesNotMatch(r.html,/<script|<foreignObject|<a |href=|onload="x/);assert.match(r.html,/&lt;script&gt;/);
});
test('跨越中间步骤的连线使用外侧路径，不穿过中间节点中心',()=>{
  const r=renderFlowchart(FLOW_EXAMPLES.find(example=>example.id==='approval')!.state,18);assert.deepEqual(r.errors,[]);
  assert.match(r.html,/text-anchor="end"/);assert.match(r.html,/text-anchor="start"/);
});
test('拒绝重复节点、悬空边、非法类型和过量内容，允许未完成文字保存但不导图',()=>{
  const state=freshFlow();assert.throws(()=>validateFlow({...state,nodes:[state.nodes[0],state.nodes[0]]}));assert.throws(()=>validateFlow({...state,edges:[{from:'missing',to:'n1',label:''}]}));
  assert.throws(()=>validateFlow({...state,nodes:[{id:'n',type:'script',label:'x'}]}));assert.throws(()=>validateFlow({...state,edges:Array(49).fill(state.edges[0])}));assert.throws(()=>validateFlow({...state,nodes:[{id:'n',type:'process',label:'x'.repeat(121)}]}));
  state.nodes[0].label='';assert.doesNotThrow(()=>validateFlow(state));assert.match(renderFlowchart(state).errors[0],/填写/);
});
test('字号与颜色影响真实 SVG 尺寸，拒绝非法样式和超限图片',()=>{
  const small=renderFlowchart(freshFlow(),18),large=renderFlowchart(freshFlow(),36,'#ff0000');assert.equal(large.width,small.width*2);assert.equal(large.height,small.height*2);assert.match(large.html,/#ff0000/);
  assert.ok(renderFlowchart(freshFlow(),1).errors.length);assert.ok(renderFlowchart(freshFlow(),26,'url(http://x)').errors.length);
  const nodes=Array.from({length:24},(_,i)=>({id:`n${i}`,type:'process' as const,label:'长'.repeat(120)}));const edges=nodes.slice(1).map((n,i)=>({from:nodes[i].id,to:n.id,label:''}));assert.match(renderFlowchart({nodes,edges},72).errors[0],/尺寸/);
});
test('流程图可随版本 1 草稿往返，旧草稿仍保持旧结构',()=>{
  const base={version:1,editor:{text:'x',start:1,end:1},builder:freshBuilder(),review:null,panel:null};assert.equal(validateWorkspace(base).flowchart,undefined);
  const restored=validateWorkspace({...base,panel:'flowchart-panel',flowchart:freshFlow()});assert.equal(restored.panel,'flowchart-panel');assert.deepEqual(restored.flowchart,freshFlow());
});
