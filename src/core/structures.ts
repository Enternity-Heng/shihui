export type MatrixStyle='matrix'|'pmatrix'|'bmatrix'|'Bmatrix'|'vmatrix'|'Vmatrix';
export interface BuilderState {kind:'matrix'|'cases';rows:number;columns:number;style:MatrixStyle;cells:string[][];equations:string[]}
export const freshBuilder=():BuilderState=>({kind:'matrix',rows:2,columns:2,style:'pmatrix',cells:[['',''],['','']],equations:['','']});
// Track TeX grouping and environments before wrapping a fragment. Rendering alone
// would accept an injected column/row separator that escaped its intended cell.
export function checkFragment(source:string):string {
  if(source.length>4096||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source))throw new Error('数学片段过长或含控制字符。');
  let depth=0;const environments:string[]=[];
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(c==='\\'){
      const env=/^\\(begin|end)\{([a-zA-Z*]+)\}/.exec(source.slice(i));
      if(env){if(env[1]==='begin')environments.push(env[2]);else if(environments.pop()!==env[2])throw new Error('不能关闭单元格外的环境。');i+=env[0].length-1;continue;}
      if(source[i+1]==='\\'){if(!environments.length)throw new Error('请使用填写器新增行，不能在片段中插入外层换行。');i++;continue;}
      const command=/^\\[a-zA-Z]+/.exec(source.slice(i));
      if(command){if(/^\\(?:def|gdef|edef|xdef|let|newcommand|renewcommand|providecommand|cr|noalign|omit|multicolumn)$/.test(command[0]))throw new Error('填写器不接受结构或宏定义命令。');i+=command[0].length-1;continue;}
      i++;continue;
    }
    if(c==='%')throw new Error('填写器不接受 TeX 注释。');
    if(c==='{')depth++;
    if(c==='}'&&--depth<0)throw new Error('花括号不能越出当前片段。');
    if(c==='&'&&!environments.length)throw new Error('请使用填写器新增列，不能插入外层列分隔符。');
  }
  if(depth||environments.length)throw new Error('请补全片段的花括号或环境。');
  return source.trim();
}
export function validateBuilder(value:unknown):BuilderState {
  const b=value as BuilderState;
  if(!b||!['matrix','cases'].includes(b.kind)||!Number.isInteger(b.rows)||b.rows<1||b.rows>10||!Number.isInteger(b.columns)||b.columns<1||b.columns>10||!['matrix','pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix'].includes(b.style)||!Array.isArray(b.cells)||b.cells.length!==b.rows||b.cells.some(row=>!Array.isArray(row)||row.length!==b.columns||row.some(v=>typeof v!=='string'||v.length>4096))||!Array.isArray(b.equations)||b.equations.length>10||b.equations.some(v=>typeof v!=='string'||v.length>4096))throw new Error('填写器数据无效。');
  if(JSON.stringify(b).length>32768)throw new Error('填写内容过长。');
  return structuredClone(b);
}
export function buildStructure(value:BuilderState):string {
  const b=validateBuilder(value);let result:string;
  if(b.kind==='matrix')result=`\\begin{${b.style}}${b.cells.map(row=>row.map(v=>`{${checkFragment(v)||'0'}}`).join('&')).join('\\\\')}\\end{${b.style}}`;
  else{const rows=b.equations.slice(0,b.rows);if(rows.length!==b.rows||rows.some(v=>!v.trim()))throw new Error('请填写每一行方程。');result=`\\begin{cases}${rows.map(v=>`{${checkFragment(v)}}`).join('\\\\')}\\end{cases}`;}
  if(result.length>4096)throw new Error('生成源码超过 4096 个 UTF-16 单元。');return result;
}
