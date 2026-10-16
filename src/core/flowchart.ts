export const FLOW_TYPES={start:'开始／结束',process:'处理',decision:'判断',io:'输入／输出'} as const;
export interface FlowNode {id:string;type:keyof typeof FLOW_TYPES;label:string}
export interface FlowEdge {from:string;to:string;label:string}
export interface FlowState {nodes:FlowNode[];edges:FlowEdge[]}
export interface FlowPreview {html:string;width:number;height:number;errors:string[]}
export const freshFlow=():FlowState=>({nodes:[{id:'n1',type:'start',label:'开始'},{id:'n2',type:'process',label:'处理任务'},{id:'n3',type:'start',label:'结束'}],edges:[{from:'n1',to:'n2',label:''},{from:'n2',to:'n3',label:''}]});
export function validateFlow(input:unknown):FlowState {
  if(input===undefined)return freshFlow();const s=input as FlowState;
  const text=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u0009\u000b-\u001f\u007f]/.test(v);
  if(!s||!Array.isArray(s.nodes)||s.nodes.length<1||s.nodes.length>24||!Array.isArray(s.edges)||s.edges.length>48||s.nodes.some(n=>!n||!/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(n.id)||!Object.hasOwn(FLOW_TYPES,n.type)||!text(n.label,120))||s.edges.some(e=>!e||typeof e.from!=='string'||typeof e.to!=='string'||!text(e.label,40))||JSON.stringify(s).length>32768)throw new Error('流程图最多 24 个节点、48 条连线；节点文字 120 字符、连线文字 40 字符。');
  if(new Set(s.nodes.map(n=>n.id)).size!==s.nodes.length)throw new Error('流程图节点编号重复。');
  if(s.edges.some(e=>!s.nodes.some(n=>n.id===e.from)||!s.nodes.some(n=>n.id===e.to)))throw new Error('连线引用了不存在的节点。');
  return {nodes:s.nodes.map(({id,type,label})=>({id,type,label})),edges:s.edges.map(({from,to,label})=>({from,to,label}))};
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function wrap(text:string,max:number):string[]{
  const result:string[]=[];for(const paragraph of text.split('\n')){let line='',length=0;for(const char of paragraph){const width=char.charCodeAt(0)<128?.58:1;if(length+width>max&&line){result.push(line);line='';length=0;}line+=char;length+=width;}result.push(line);}return result;
}
export function renderFlowchart(input:unknown,fontSize=26,foreground='#111111'):FlowPreview {
  try{
    const s=validateFlow(input);if(s.nodes.some(n=>!n.label.trim()))throw new Error('请填写所有节点的文字。');
    if(!Number.isFinite(fontSize)||fontSize<12||fontSize>72||!/^#[0-9a-f]{6}$/i.test(foreground))throw new Error('流程图图片样式无效。');
    const scale=fontSize/18,nw=240,margin=100,gapX=90,gapY=100;
    const lines=new Map(s.nodes.map(n=>[n.id,wrap(n.label,n.type==='decision'?11:19)]));
    const nodeHeight=(n:FlowNode)=>Math.max(n.type==='decision'?100:72,(lines.get(n.id)!.length*24+32)*(n.type==='decision'?1.4:1));
    const rank=new Map(s.nodes.map(n=>[n.id,0]));const indegree=new Map(s.nodes.map(n=>[n.id,s.edges.filter(e=>e.to===n.id&&e.from!==e.to).length]));
    const queue=s.nodes.filter(n=>indegree.get(n.id)===0).map(n=>n.id);const visited=new Set<string>();
    while(queue.length){const id=queue.shift()!;visited.add(id);for(const edge of s.edges.filter(e=>e.from===id&&e.to!==id)){rank.set(edge.to,Math.max(rank.get(edge.to)!,rank.get(id)!+1));indegree.set(edge.to,indegree.get(edge.to)!-1);if(indegree.get(edge.to)===0)queue.push(edge.to);}}
    // Cyclic components follow node order; returning links use an outside lane.
    let nextRank=visited.size?Math.max(...Array.from(visited,id=>rank.get(id)!))+1:0;
    for(const n of s.nodes)if(!visited.has(n.id))rank.set(n.id,nextRank++);
    const groups=new Map<number,FlowNode[]>();for(const n of s.nodes){const r=rank.get(n.id)!;groups.set(r,[...(groups.get(r)??[]),n]);}
    const maxColumns=Math.max(...Array.from(groups.values(),g=>g.length));
    const width=margin*2+maxColumns*nw+(maxColumns-1)*gapX;
    const points=new Map<string,{x:number;y:number;h:number}>();let y=margin;
    for(const [,group] of [...groups].sort((a,b)=>a[0]-b[0])){const rowWidth=group.length*nw+(group.length-1)*gapX;const height=Math.max(...group.map(nodeHeight));group.forEach((n,i)=>points.set(n.id,{x:(width-rowWidth)/2+i*(nw+gapX),y,h:nodeHeight(n)}));y+=height+gapY;}
    const height=y-gapY+margin;
    let shapes='',arrows='';
    for(const [i,edge] of s.edges.entries()){
      const from=points.get(edge.from)!,to=points.get(edge.to)!;const x1=from.x+nw/2,y1=from.y+from.h,x2=to.x+nw/2,y2=to.y;
      let path:string,labelX:number,labelY:number;const returning=y2<=y1,skipping=!returning&&rank.get(edge.to)!-rank.get(edge.from)!>1;
      if(skipping){const lane=width-24-(i%6)*11;path=`M${from.x+nw},${from.y+from.h/2} H${lane} V${to.y+to.h/2} H${to.x+nw+5}`;labelX=lane-10;labelY=(from.y+to.y)/2;}
      else if(y2>y1){const mid=(y1+y2)/2;path=`M${x1},${y1} V${mid} H${x2} V${y2-5}`;labelX=(x1+x2)/2;labelY=mid-9;}
      else{const lane=24+(i%6)*11;path=edge.from===edge.to?`M${from.x},${from.y+from.h/2} H${lane} V${from.y-35} H${x1} V${from.y-5}`:`M${from.x},${from.y+from.h/2} H${lane} V${to.y+to.h/2} H${to.x-5}`;labelX=lane+10;labelY=(from.y+to.y)/2-10;}
      arrows+=`<path d="${path}" fill="none" stroke-width="1.7" marker-end="url(#flow-arrow)"/>`;
      if(edge.label)arrows+=`<text x="${labelX}" y="${labelY}" text-anchor="${returning?'start':skipping?'end':'middle'}" stroke="none" font-size="14">${wrap(edge.label,returning||skipping?8:12).map((line,index)=>`<tspan x="${labelX}" dy="${index?18:0}">${escape(line)}</tspan>`).join('')}</text>`;
    }
    for(const n of s.nodes){const {x,y,h}=points.get(n.id)!;let shape:string;
      if(n.type==='decision')shape=`<polygon points="${x+nw/2},${y} ${x+nw},${y+h/2} ${x+nw/2},${y+h} ${x},${y+h/2}"/>`;
      else if(n.type==='io')shape=`<polygon points="${x+20},${y} ${x+nw},${y} ${x+nw-20},${y+h} ${x},${y+h}"/>`;
      else shape=`<rect x="${x}" y="${y}" width="${nw}" height="${h}" rx="${n.type==='start'?h/2:5}"/>`;
      shapes+=`<g fill="none" stroke-width="1.7">${shape}</g>`;const text=lines.get(n.id)!;
      shapes+=`<text x="${x+nw/2}" y="${y+h/2-(text.length-1)*12+6}" text-anchor="middle" stroke="none">${text.map((line,i)=>`<tspan x="${x+nw/2}" dy="${i?24:0}">${escape(line)}</tspan>`).join('')}</text>`;
    }
    const w=Math.ceil(width*scale),h=Math.ceil(height*scale);
    if(w>8192||h>8192||w*h>16_000_000)throw new Error('流程图超过图片尺寸限制，请减少节点或文字。');
    return {width:w,height:h,errors:[],html:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${width} ${height}" role="img" aria-label="流程图" style="display:block;font-family:Segoe UI,Microsoft YaHei,sans-serif;font-size:18px;fill:${foreground};stroke:${foreground}"><defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${foreground}" stroke="none"/></marker></defs>${arrows}${shapes}</svg>`};
  }catch(error){return {html:'',width:0,height:0,errors:[error instanceof Error?error.message:String(error)]};}
}
export const FLOW_EXAMPLES:{id:string;title:string;state:FlowState}[]=[
  {id:'basic',title:'顺序处理',state:freshFlow()},
  {id:'decision',title:'条件判断',state:{nodes:[{id:'a',type:'start',label:'开始'},{id:'b',type:'decision',label:'条件满足？'},{id:'c',type:'process',label:'执行方案一'},{id:'d',type:'process',label:'执行方案二'},{id:'e',type:'start',label:'结束'}],edges:[{from:'a',to:'b',label:''},{from:'b',to:'c',label:'是'},{from:'b',to:'d',label:'否'},{from:'c',to:'e',label:''},{from:'d',to:'e',label:''}]}},
  {id:'loop',title:'算法循环',state:{nodes:[{id:'a',type:'start',label:'开始'},{id:'b',type:'io',label:'输入数据'},{id:'c',type:'decision',label:'还有元素？'},{id:'d',type:'process',label:'处理当前元素\n移到下一个'},{id:'e',type:'io',label:'输出结果'},{id:'f',type:'start',label:'结束'}],edges:[{from:'a',to:'b',label:''},{from:'b',to:'c',label:''},{from:'c',to:'d',label:'是'},{from:'d',to:'c',label:'继续'},{from:'c',to:'e',label:'否'},{from:'e',to:'f',label:''}]}},
  {id:'experiment',title:'实验步骤',state:{nodes:[{id:'a',type:'start',label:'实验开始'},{id:'b',type:'process',label:'准备样品与对照'},{id:'c',type:'process',label:'按实验方案处理'},{id:'d',type:'io',label:'记录观察和测量数据'},{id:'e',type:'process',label:'整理结果与误差说明'},{id:'f',type:'start',label:'结束'}],edges:[{from:'a',to:'b',label:''},{from:'b',to:'c',label:''},{from:'c',to:'d',label:''},{from:'d',to:'e',label:''},{from:'e',to:'f',label:''}]}},
  {id:'approval',title:'管理审批',state:{nodes:[{id:'a',type:'io',label:'提交申请'},{id:'b',type:'decision',label:'资料齐全？'},{id:'c',type:'process',label:'补充资料'},{id:'d',type:'process',label:'审核并记录结果'},{id:'e',type:'start',label:'流程结束'}],edges:[{from:'a',to:'b',label:''},{from:'b',to:'c',label:'否'},{from:'c',to:'a',label:'重新提交'},{from:'b',to:'d',label:'是'},{from:'d',to:'e',label:''}]}}
];
