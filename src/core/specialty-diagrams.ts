import type {FlowPreview} from './flowchart';

export const DIAGRAM_KINDS={control:'控制框图',force:'受力图',genetics:'遗传杂交图'} as const;
export type DiagramKind=keyof typeof DIAGRAM_KINDS;
export interface ForceVector {label:string;magnitude:number|null;angle:number|null}
export interface DiagramState {
  kind:DiagramKind;
  control:{title:string;input:string;controller:string;plant:string;feedback:string;output:string;negative:boolean};
  force:{title:string;body:string;axes:boolean;values:boolean;forces:ForceVector[]};
  genetics:{title:string;parent1:string;parent2:string};
}
export function freshDiagram():DiagramState{return {kind:'control',control:{title:'单环负反馈系统',input:'R(s)',controller:'C(s)',plant:'G(s)',feedback:'H(s)',output:'Y(s)',negative:true},force:{title:'水平面上受拉力的物体',body:'物体',axes:true,values:true,forces:[{label:'重力 mg',magnitude:19.62,angle:270},{label:'支持力 N',magnitude:19.62,angle:90},{label:'拉力 F',magnitude:10,angle:0},{label:'摩擦力 f',magnitude:2,angle:180}]},genetics:{title:'单因子杂合子交配',parent1:'Aa',parent2:'Aa'}};}
function label(v:unknown,name:string,max=24){if(typeof v!=='string'||v.length>max||/[\x00-\x1f\x7f]/.test(v))throw Error(`${name}须为不超过 ${max} 个字符的单行文字。`);return v;}
export function validateDiagram(value:unknown):DiagramState {
  if(value===undefined)return freshDiagram();
  const v=value as DiagramState;if(!v||!Object.hasOwn(DIAGRAM_KINDS,v.kind)||!v.control||!v.force||!v.genetics)throw Error('专业绘图内容无效。');
  const c=v.control,f=v.force,g=v.genetics;
  if(typeof c.negative!=='boolean'||typeof f.axes!=='boolean'||typeof f.values!=='boolean'||!Array.isArray(f.forces)||f.forces.length<1||f.forces.length>8)throw Error('绘图开关或力的数量无效（1–8 个）。');
  const forces=f.forces.map((x,i)=>{if(!x||x.magnitude!==null&&(typeof x.magnitude!=='number'||!Number.isFinite(x.magnitude)||x.magnitude<=0||x.magnitude>1e6)||x.angle!==null&&(typeof x.angle!=='number'||!Number.isFinite(x.angle)||Math.abs(x.angle)>360))throw Error(`第 ${i+1} 个力须有正数大小（≤10⁶ N）和 −360° 至 360° 的方向角。`);return {label:label(x.label,`力 ${i+1} 名称`,16),magnitude:x.magnitude,angle:x.angle};});
  return {kind:v.kind,control:{title:label(c.title,'标题',40),input:label(c.input,'输入'),controller:label(c.controller,'控制器'),plant:label(c.plant,'对象'),feedback:label(c.feedback,'反馈'),output:label(c.output,'输出'),negative:c.negative},force:{title:label(f.title,'标题',40),body:label(f.body,'研究对象',12),axes:f.axes,values:f.values,forces},genetics:{title:label(g.title,'标题',40),parent1:label(g.parent1,'亲本一',4),parent2:label(g.parent2,'亲本二',4)}};
}
/** One/two autosomal loci, paired alleles in locus order. Repeated gametes retain probability. */
export function punnett(parent1:string,parent2:string){
  function pairs(parent:string){if(!/^[A-Za-z]{2}(?:[A-Za-z]{2})?$/.test(parent))throw Error('亲本须填写 Aa 或 AaBb 形式的 1–2 对等位基因。');const p=parent.match(/../g)!;if(p.some(x=>x[0].toUpperCase()!==x[1].toUpperCase())||new Set(p.map(x=>x[0].toUpperCase())).size!==p.length)throw Error('每对须为同一字母的等位基因，不同位点使用不同字母。');return p;}
  const a=pairs(parent1),b=pairs(parent2);if(a.length!==b.length||a.some((p,i)=>p[0].toUpperCase()!==b[i][0].toUpperCase()))throw Error('两个亲本的位点数量、字母及顺序须相同。');
  function gametes(p:string[]){return p.reduce<string[]>((out,pair)=>out.flatMap(x=>[x+pair[0],x+pair[1]]),['']);}
  const rows=gametes(a),columns=gametes(b),cells=rows.map(r=>columns.map(c=>[...r].map((x,i)=>[x,c[i]].sort((u,v)=>u===u.toUpperCase()&&v!==v.toUpperCase()?-1:u!==u.toUpperCase()&&v===v.toUpperCase()?1:0).join('')).join(''))),counts:Record<string,number>={};
  cells.flat().forEach(cell=>counts[cell]=(counts[cell]??0)+1);return {rows,columns,cells,counts,total:rows.length*columns.length};
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const text=(x:number,y:number,s:string,size=18,anchor='middle')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${escape(s)}</text>`;
function labelBlock(x:number,y:number,s:string,units:number,size=18,anchor='middle'){const lines=[''];let used=0;for(const ch of s){const n=ch.charCodeAt(0)>255?2:1;if(used+n>units){lines.push('');used=0;}lines[lines.length-1]+=ch;used+=n;}return lines.map((line,i)=>text(x,y+(i-(lines.length-1)/2)*(size+3),line,size,anchor)).join('');}
const path=(d:string,arrow=true,dash=false)=>`<path d="${d}" fill="none" stroke="currentColor" stroke-width="2"${arrow?' marker-end="url(#special-arrow)"':''}${dash?' stroke-dasharray="5 5"':''}/>`;
const rect=(x:number,y:number,w:number,h:number)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>`;
export function renderDiagram(value:unknown,fontSize=26,foreground='#111111'):FlowPreview {
  try{
    const s=validateDiagram(value);if(!Number.isFinite(fontSize)||fontSize<12||fontSize>72||!/^#[0-9a-f]{6}$/i.test(foreground))throw Error('绘图样式无效。');
    let body='',width=1000,height=500;
    if(s.kind==='control'){
      const c=s.control;if(Object.values(c).some(v=>typeof v==='string'&&!v.trim()))throw Error('请填写标题及全部框图标签。');
      body=text(500,40,c.title,23)+labelBlock(100,119,c.input,14,16)+path('M 42 180 H 174')+`<circle cx="195" cy="180" r="21" fill="none" stroke="currentColor" stroke-width="2"/>`+text(180,167,'+',16)+text(211,213,c.negative?'−':'+',16)+path('M 216 180 H 290')+text(250,160,'E(s)',15)+rect(290,143,200,74)+labelBlock(390,187,c.controller,18)+path('M 490 180 H 570')+rect(570,143,200,74)+labelBlock(670,187,c.plant,18)+path('M 770 180 H 960')+labelBlock(910,119,c.output,14,16)+`<circle cx="835" cy="180" r="4" fill="currentColor"/>`+path('M 835 180 V 325 H 650')+rect(410,288,240,74)+labelBlock(530,333,c.feedback,22)+path('M 410 325 H 195 V 201')+text(500,420,`Y/R = C·G / (1 ${c.negative?'+':'−'} C·G·H)`,20)+text(500,464,'单输入单输出 · 零初始条件 · 分母非零；此关系不保证稳定性',15);
    }else if(s.kind==='force'){
      const f=s.force;if(!f.title.trim()||!f.body.trim()||f.forces.some(v=>!v.label.trim()))throw Error('请填写标题、研究对象及每个力的名称。');if(f.forces.some(v=>v.magnitude===null||v.angle===null))throw Error('请填写每个外力的大小和方向角；未填完的内容仍可保存草稿。');width=900;height=880;body=labelBlock(450,38,f.title,76,22);
      if(f.axes)body+=path('M 210 350 H 700',true,true)+path('M 450 590 V 110',true,true)+text(710,340,'x',16)+text(467,110,'y',16);
      body+=`<circle cx="450" cy="350" r="26" fill="none" stroke="currentColor" stroke-width="2"/>`+text(450,80,`研究对象：${f.body}`,16);
      const max=Math.max(...f.forces.map(v=>v.magnitude!));
      f.forces.forEach(v=>{const angle=v.angle!*Math.PI/180,length=210*v.magnitude!/max,x=450+length*Math.cos(angle),y=350-length*Math.sin(angle);body+=path(`M 450 350 L ${x.toFixed(3)} ${y.toFixed(3)}`);});
      // A separate legend keeps every label readable even when vectors coincide or are very short.
      f.forces.forEach((v,i)=>{const angle=v.angle!*Math.PI/180,length=210*v.magnitude!/max,x=450+length*Math.cos(angle),y=350-length*Math.sin(angle);body+=text(x+14*Math.cos(angle),y-14*Math.sin(angle)-4,String(i+1),15);body+=labelBlock(60+(i%2)*420,650+Math.floor(i/2)*50,`${i+1}. ${v.label}${f.values?` = ${Number(v.magnitude!.toPrecision(6))} N`:''} · ${Number(v.angle!.toFixed(4))}°`,43,15,'start');});
      body+=text(450,602,'方向角从 +x 轴逆时针计算；箭长与力的大小成比例，仅绘制所填外力',15);
    }else{
      const g=s.genetics;if(!g.title.trim())throw Error('请填写标题。');const p=punnett(g.parent1,g.parent2),n=p.rows.length,cell=108,left=(1000-(n+1)*cell)/2,top=130;height=n===4?910:600;
      body=text(500,38,g.title,23)+text(500,78,`${g.parent1} × ${g.parent2}`,22)+text(500,110,'上方：亲本二配子；左侧：亲本一配子（重复配子保留等概率份额）',15);
      for(let r=0;r<=n;r++)for(let c=0;c<=n;c++){const x=left+c*cell,y=top+r*cell;body+=rect(x,y,cell,cell)+text(x+cell/2,y+cell/2+6,r===0?(c===0?'配子':p.columns[c-1]):c===0?p.rows[r-1]:p.cells[r-1][c-1],20);}
      const y=top+(n+1)*cell+38;Object.entries(p.counts).forEach(([genotype,count],i)=>body+=text(90+(i%3)*300,y+Math.floor(i/3)*28,`${genotype}：${count}/${p.total}`,17,'start'));
      body+=text(500,height-58,'常染色体、等概率分离；双位点独立分配，无连锁、选择或配子存活差异',15)+text(500,height-30,'格内为理论基因型份额；不推断显隐性、表型或实际后代数量',15);
    }
    const scale=fontSize/18,w=Math.ceil(width*scale),h=Math.ceil(height*scale);if(w>8192||h>8192||w*h>16000000)throw Error('绘图尺寸超过图片限制，请降低字号。');
    return {html:`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${DIAGRAM_KINDS[s.kind]}" width="${w}" height="${h}" viewBox="0 0 ${width} ${height}" style="color:${foreground};font-family:Consolas,'Microsoft YaHei',sans-serif;fill:currentColor"><defs><marker id="special-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>${body}</svg>`,width:w,height:h,errors:[]};
  }catch(error){return {html:'',width:0,height:0,errors:[error instanceof Error?error.message:String(error)]};}
}
export const DIAGRAM_PRESETS:{id:string;title:string;state:DiagramState}[]=[
  {id:'feedback',title:'单位负反馈',state:{...freshDiagram(),control:{...freshDiagram().control,controller:'2',plant:'1 / (s + 1)',feedback:'1'}}},
  {id:'positive-feedback',title:'正反馈符号对照',state:{...freshDiagram(),control:{...freshDiagram().control,title:'单环正反馈系统',negative:false}}},
  {id:'horizontal-force',title:'水平面拉力与摩擦',state:{...freshDiagram(),kind:'force'}},
  {id:'incline-force',title:'30° 斜面下滑物体',state:{...freshDiagram(),kind:'force',force:{title:'10 kg 物体沿 30° 斜面下滑',body:'物体',axes:true,values:true,forces:[{label:'重力 mg',magnitude:98.1,angle:270},{label:'支持力 N',magnitude:84.9571,angle:120},{label:'滑动摩擦力 f',magnitude:16.9914,angle:30}]}}},
  {id:'monohybrid',title:'Aa × Aa 单因子',state:{...freshDiagram(),kind:'genetics'}},
  {id:'dihybrid',title:'AaBb × AaBb 双因子',state:{...freshDiagram(),kind:'genetics',genetics:{title:'双因子独立分配',parent1:'AaBb',parent2:'AaBb'}}},
  {id:'testcross',title:'AaBb × aabb 测交',state:{...freshDiagram(),kind:'genetics',genetics:{title:'双因子测交',parent1:'AaBb',parent2:'aabb'}}}
];
