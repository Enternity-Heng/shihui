import {checkFragment} from './structures';

export const EXPRESSION_KINDS={quantity:'数值与单位',scientific:'科学记数法',derivation:'多行推导',piecewise:'分段函数',condition:'带条件表达式',chemistry:'化学表达式'} as const;
export type ExpressionKind=keyof typeof EXPRESSION_KINDS;
export interface ExpressionRow {left:string;relation:string;right:string;note:string}
export interface ExpressionState {kind:ExpressionKind;value:string;unit:string;mantissa:string;exponent:string;name:string;condition:string;conditionMath:boolean;chemical:string;rows:ExpressionRow[];pieces:ExpressionRow[]}
export const freshExpression=():ExpressionState=>({kind:'quantity',value:'9.81',unit:'m s^-2',mantissa:'6.02214076',exponent:'23',name:'f(x)',condition:'x>0',conditionMath:true,chemical:'2 H2(g) + O2(g) -> 2 H2O(l)',rows:[{left:'f(x)',relation:'=',right:'x^2',note:''},{left:'',relation:'=',right:'x\\cdot x',note:''}],pieces:[{left:'',relation:'=',right:'x',note:'x\\ge0'},{left:'',relation:'=',right:'-x',note:'x<0'}]});
export function validateExpression(value:unknown):ExpressionState {
  if(value===undefined)return freshExpression();const s=value as ExpressionState;
  const validRows=(rows:ExpressionRow[])=>Array.isArray(rows)&&rows.length>=1&&rows.length<=10&&rows.every(row=>row&&['left','relation','right','note'].every(key=>typeof row[key as keyof ExpressionRow]==='string'&&row[key as keyof ExpressionRow].length<=1024));
  if(!s||!Object.hasOwn(EXPRESSION_KINDS,s.kind)||['value','unit','mantissa','exponent','name','condition','chemical'].some(key=>typeof s[key as keyof ExpressionState]!=='string'||(s[key as keyof ExpressionState] as string).length>4096)||typeof s.conditionMath!=='boolean'||!validRows(s.rows)||!validRows(s.pieces)||JSON.stringify(s).length>32768)throw new Error('表达工具内容无效或超过容量限制。');
  const clean=(row:ExpressionRow)=>({left:row.left,relation:row.relation,right:row.right,note:row.note});
  return {kind:s.kind,value:s.value,unit:s.unit,mantissa:s.mantissa,exponent:s.exponent,name:s.name,condition:s.condition,conditionMath:s.conditionMath,chemical:s.chemical,rows:s.rows.map(clean),pieces:s.pieces.map(clean)};
}
const unitNames=['m','g','s','A','K','mol','cd','rad','sr','Hz','N','Pa','J','W','C','V','F','Ω','S','Wb','T','H','lm','lx','Bq','Gy','Sv','kat','L','l','min','h','d','eV','Da'];
const prefixes=['','q','r','y','z','a','f','p','n','µ','μ','u','m','c','d','da','h','k','M','G','T','P','E','Z','Y','R','Q'];
const units=new Set(unitNames.flatMap(unit=>prefixes.map(prefix=>prefix+unit)).concat(['kg','°C','°F','%','rpm']));
export function formatUnit(input:string):string {
  if(!input.trim())return '';if(input.length>160)throw new Error('单位最多 160 个字符。');
  const parts=input.trim().split('/');if(parts.length>2||parts.some(part=>!part.trim()))throw new Error('单位只接受一条分数线，或用负指数表示分母。');
  function side(text:string){return text.trim().split(/[\s·*]+/).map(token=>{if(token==='1')return '1';const match=/^([A-Za-zµμΩ°%]+)(?:\^([+-]?\d{1,2}))?$/.exec(token);if(!match||!units.has(match[1]))throw new Error(`不支持的单位“${token}”；示例：kg m s^-2、mol/L、°C。`);const symbol=match[1].replace(/[µμ]/g,'\\mu ').replace(/^u(?=[A-Za-z])/,'\\mu ').replace(/Ω/g,'\\Omega ').replace('°','{}^\\circ ').replace('%','\\%');return `\\mathrm{${symbol}}${match[2]?`^{${Number(match[2])}}`:''}`;}).join('\\,');}
  return parts.length===2?`\\frac{${side(parts[0])}}{${side(parts[1])}}`:side(parts[0]);
}
export function textInMath(value:string):string {
  if(/[\u0000-\u001f\u007f]/.test(value))throw new Error('文字说明不能含换行或控制字符。');
  const escapes:Record<string,string>={'\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','%':'\\%','&':'\\&','#':'\\#','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'};
  return `\\text{${value.replace(/[\\{}$%&#_^~]/g,char=>escapes[char])}}`;
}
const required=(value:string,label:string)=>{const fragment=checkFragment(value);if(!fragment)throw new Error(`请填写${label}。`);return `{${fragment}}`;};
export function buildExpression(value:ExpressionState):string {
  const s=validateExpression(value);let result:string;
  const condition=(text:string)=>s.conditionMath?required(text,'数学条件'):textInMath(text);
  if(s.kind==='quantity')result=required(s.value,'数值或变量')+(s.unit.trim()?`\\,${formatUnit(s.unit)}`:'');
  else if(s.kind==='scientific'){
    if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s.mantissa.trim()))throw new Error('尾数需为十进制数，例如 6.02；不会自动归一化。');
    if(!/^[+-]?\d{1,3}$/.test(s.exponent.trim()))throw new Error('指数需为 −999 至 999 的整数。');
    result=`{${s.mantissa.trim()}}\\times10^{${Number(s.exponent)}}`+(s.unit.trim()?`\\,${formatUnit(s.unit)}`:'');
  }else if(s.kind==='derivation'){
    result=`\\begin{aligned}${s.rows.map(row=>{if(!['=','\\approx','\\equiv','\\le','\\ge','\\Rightarrow'].includes(row.relation))throw new Error('请选择有效的推导关系。');return `${row.left.trim()?required(row.left,'左式'):''}&${row.relation}${required(row.right,'右式')}${row.note.trim()?`\\quad ${textInMath(row.note)}`:''}`;}).join('\\\\')}\\end{aligned}`;
  }else if(s.kind==='piecewise')result=`${required(s.name,'函数名')}=\\begin{cases}${s.pieces.map(row=>`${required(row.right,'分段表达式')}&${condition(row.note)}`).join('\\\\')}\\end{cases}`;
  else if(s.kind==='condition')result=`${required(s.value,'表达式')}\\quad\\left(${condition(s.condition)}\\right)`;
  else result=`\\ce{${checkFragment(s.chemical)||(()=>{throw new Error('请填写化学表达式。');})()}}`;
  if(result.length>4096)throw new Error('生成源码超过 4096 个 UTF-16 单元。');return result;
}
export const CHEMISTRY_EXAMPLES=[
  {title:'化学式与离子',source:'H2O, CO2, Fe^3+, SO4^2-'},
  {title:'同位素',source:'^{14}_{6}C -> ^{14}_{7}N + e-'},
  {title:'物态与沉淀',source:'Ag+(aq) + Cl-(aq) -> AgCl(s) v'},
  {title:'可逆反应',source:'N2(g) + 3 H2(g) <=> 2 NH3(g)'},
  {title:'反应条件',source:'2 H2O2 ->[MnO2] 2 H2O + O2 ^'},
  {title:'热分解',source:'CaCO3 ->[\\Delta] CaO + CO2 ^'},
  {title:'酸碱反应',source:'HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)'}
];
