import {symbols} from './converter';
import type {CommandCandidate} from './templates';
import {SYMBOL_NAMES} from './symbol-names';
export const FORMULA_TEMPLATES:CommandCandidate[]=[
  ['quadratic','求根公式 一元二次方程','{${1:x}}=\\frac{-{${3:b}}\\pm\\sqrt{{${3}}^2-4{${2:a}}{${4:c}}}}{2{${2}}}$0'],
  ['pythagorean','勾股定理 直角三角形','${1:a}^{2}+${2:b}^{2}=${3:c}^{2}$0'],
  ['binomial','二项式定理 组合数 展开','({${1:a}}+{${2:b}})^{${3:n}}=\\sum_{${4:k}=0}^{${3}}\\binom{${3}}{${4}}{${1}}^{${3}-${4}}{${2}}^{${4}}$0'],
  ['derivative','导数 求导 微分','\\frac{d}{d{${1:x}}}\\left({${2:f}}({${1}})\\right)={${2}}\u0027({${1}})$0'],
  ['definite','定积分 上下限 被积函数','\\int_{${1:a}}^{${2:b}} {${3:f}}({${4:x}})\\,d{${4}}$0'],
  ['parts','分部积分 积分法','\\int {${1:u}}\\,d{${2:v}}={${1}}{${2}}-\\int {${2}}\\,d{${1}}$0'],
  ['taylor','泰勒展开 幂级数','{${1:f}}({${2:x}})=\\sum_{${4:n}=0}^{\\infty}\\frac{{${1}}^{(${4})}({${3:a}})}{{${4}}!}({${2}}-{${3}})^{${4}}$0'],
  ['geometric','等比数列 有限求和','\\sum_{${4:k}=0}^{${3:n}-1}{${1:a}}{${2:r}}^{${4}}=\\frac{{${1}}(1-{${2}}^{${3}})}{1-{${2}}}\\quad({${2}}\\ne1)$0'],
  ['normalpdf','正态分布 高斯概率密度','{${1:f}}({${2:x}})=\\frac{1}{{${4:\\sigma}}\\sqrt{2\\pi}}\\exp\\left(-\\frac{({${2}}-{${3:\\mu}})^2}{2{${4}}^2}\\right)$0'],
  ['eulerformula','欧拉公式 复数','e^{i{${1:\\theta}}}=\\cos{${1}}+i\\sin{${1}}$0']
].map(([name,description,template])=>({name:`\\${name}`,description,keywords:description.split(' '),template,formula:true}));
export const BUILTIN_COMMANDS:CommandCandidate[]=[
  ...FORMULA_TEMPLATES,
  ...Object.entries(symbols).map(([name,value])=>({name:`\\${name}`,description:`${value} ${SYMBOL_NAMES[name]??''}`.trim(),keywords:[value,...(SYMBOL_NAMES[name]??'').split(' ')],template:`\\${name}`,symbol:value})),
  ...[
    ['frac','分式 分数','\\frac{${1:a}}{${2:b}}$0'],['sqrt','根式 平方根','\\sqrt{${1:x}}$0'],
    ['sup','上标 幂 指数','${1:x}^{${2:2}}$0'],['sub','下标','${1:x}_{${2:i}}$0'],
    ['sumlimits','求和 上下限','\\sum_{${1:i=1}}^{${2:n}} ${3:a_i}$0'],['intlimits','定积分 上下限','\\int_{${1:a}}^{${2:b}} ${3:f(x)}\\,d${4:x}$0'],
    ['matrix','矩阵','\\begin{pmatrix}${1:a}&${2:b}\\\\${3:c}&${4:d}\\end{pmatrix}$0'],
    ['mathbb','黑板粗体 实数集合','\\mathbb{${1:R}}$0'],['text','文字 文本','\\text{${1:文字}}$0'],
    ['sin','正弦','\\sin ${1:x}$0'],['cos','余弦','\\cos ${1:x}$0'],['log','对数','\\log_{${1:a}} ${2:x}$0'],
    ['lim','极限','\\lim_{${1:x\\to 0}} ${2:f(x)}$0']
  ].map(([name,description,template])=>({name:`\\${name}`,description,keywords:description.split(' '),template}))
];
