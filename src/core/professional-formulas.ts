import {FORMULA_TEMPLATES} from './catalog';
import {parseTemplate} from './templates';
import {createFormulaGroup as group,formulaPlacements,type FormulaDefinition,type FormulaSubject,type FormulaLevel,type FormulaPlacement} from './formula-definition';
import {ELECTRONICS_FORMULAS,NEW_STATISTICS_FORMULAS,STATISTICS_SHARED} from './engineering-statistics-formulas';
import {NEW_MECHANICS_FORMULAS} from './mechanics-formulas';
import {NEW_CHEMISTRY_FORMULAS} from './chemistry-formulas';
import {ECONOMICS_FORMULAS} from './economics-formulas';
import {NEW_BIOLOGY_FORMULAS} from './biology-formulas';
import {ADDITIONAL_FORMULA_PLACEMENTS,ADDITIONAL_FORMULA_ALIASES,ADDITIONAL_FORMULA_NOTES} from './additional-formula-placements';
export type {FormulaDefinition,FormulaSubject,FormulaLevel,FormulaPlacement} from './formula-definition';
export {formulaPlacements,ELECTRONICS_FORMULAS,ECONOMICS_FORMULAS};

export const SUBJECT_NAMES:Record<FormulaSubject,string>={math:'数学',physics:'物理',computer:'计算机',electronics:'电子信息与自动化',statistics:'统计学',mechanics:'机械、土木与工程力学',chemistry:'化学、化工与材料',economics:'经济学与管理学',biology:'生物学'};
export const LEVEL_NAMES:Record<FormulaLevel,string>={basic:'基础',advanced:'进阶'};
const physicsSource=(volume:number,section:string)=>({title:`OpenStax · University Physics Volume ${volume}`,url:`https://openstax.org/books/university-physics-volume-${volume}/pages/${section}`,section});
const csSource=(section:string)=>({title:section.includes('6.006')?'MIT · Introduction to Algorithms':'MIT · Mathematics for Computer Science',url:section.includes('6.006')?'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec3/':'https://ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/pages/readings/',section});
const d2lSource=(section:string)=>({title:'Dive into Deep Learning',url:`https://d2l.ai/${section==='chapter_preliminaries/information-theory'?'chapter_appendix-mathematics-for-deep-learning/information-theory':section}.html`,section:section.replace('chapter_preliminaries/information-theory','chapter_appendix-mathematics-for-deep-learning/information-theory')});
const mathFields=[
  ['未知量','二次项系数','一次项系数','常数项'],['直角边','直角边','斜边'],['第一项','第二项','非负整数指数','求和指标'],['自变量','函数'],['积分下限','积分上限','函数','积分变量'],['函数 u','函数 v'],['函数','自变量','展开中心','求和指标'],['首项','公比','项数','求和指标'],['密度函数名','自变量','均值','标准差'],['角度']
];
const mathConditions=['二次项系数不为 0；实数根要求判别式非负。','适用于欧氏平面内的直角三角形。','指数为非负整数。','函数在所求点可导。','被积函数在积分区间内可积；上下限为有向积分约定。','u、v 满足分部积分所需的可微与可积条件。','无穷展开需在收敛范围内且余项趋于 0；一般光滑函数不必等于其泰勒级数。','项数为正整数；公比不等于 1。','标准差大于 0，变量为实数。','角度以弧度计。'];
export const MATHEMATICS_FORMULAS:FormulaDefinition[]=FORMULA_TEMPLATES.map((candidate,index)=>({
  id:`math-${candidate.name.slice(1)}`,subject:'math',topic:index===8?'概率统计':index===0||index===2||index===7?'代数与数列':index===1?'几何':index===9?'复数':'微积分',level:'basic',
  title:candidate.description.split(' ')[0],aliases:[candidate.name,...candidate.keywords,...(index===8?['normal distribution','Gaussian probability density']:[])],template:candidate.template,
  fields:[...new Set(parseTemplate(candidate.template).fields.map(field=>field.index))].map(fieldIndex=>({index:fieldIndex,description:mathFields[index][fieldIndex-1]})),
  conditions:mathConditions[index],reference:{title:'OpenStax · 数学教材（代数、微积分与统计）',url:'https://openstax.org/subjects/math',section:candidate.description}
}));
export const PHYSICS_FORMULAS:FormulaDefinition[]=[
  ...group('physics','力学','basic',[
    ['newton','牛顿第二定律','Newton second law|F=ma','${1:\\mathbf{F}}_{\\mathrm{net}}={${2:m}}{${3:\\mathbf{a}}}','1:合外力矢量；2:质量；3:加速度矢量','惯性参考系、恒定质量、非相对论运动。',physicsSource(1,'5-3-newtons-second-law')],
    ['kinetic','动能','kinetic energy','${1:K}=\\frac{1}{2}{${2:m}}{${3:v}}^2','1:平动动能；2:质量；3:速率','质点的非相对论平动动能，不包含转动动能。',physicsSource(1,'7-2-kinetic-energy')],
    ['momentum','动量','momentum','${1:\\mathbf{p}}={${2:m}}{${3:\\mathbf{v}}}','1:动量矢量；2:质量；3:速度矢量','非相对论动量。',physicsSource(1,'9-1-linear-momentum')],
    ['gravitation','万有引力','Newton gravitation','${1:F}=G\\frac{{${2:m_1}}{${3:m_2}}}{{${4:r}}^2}','1:引力大小；2:第一物体质量；3:第二物体质量；4:中心间距','点质量或球对称物体的外部引力；r>0，力沿两者连线相互吸引。',physicsSource(1,'13-1-newtons-law-of-universal-gravitation')],
    ['mechanical-energy','机械能守恒','conservation mechanical energy','{${1:K_i}}+{${2:U_i}}={${3:K_f}}+{${4:U_f}}','1:初动能；2:初势能；3:末动能；4:末势能','所考察系统只有保守力做功，或非保守力总功为零。',physicsSource(1,'8-3-conservation-of-energy')]
  ]),
  ...group('physics','热学','basic',[
    ['ideal-gas','理想气体状态方程','ideal gas law','{${1:p}}{${2:V}}={${3:n}}R{${4:T}}','1:压强；2:体积；3:物质的量；4:绝对温度','平衡态理想气体；T 以 K 计，R 为摩尔气体常量。',physicsSource(2,'2-1-molecular-model-of-an-ideal-gas')],
    ['first-law','热力学第一定律','first law thermodynamics','\\Delta {${1:U}}={${2:Q}}-{${3:W}}','1:内能；2:系统吸收的热量；3:系统对外做的功','采用 Q>0 表示吸热，W>0 表示系统对外做功的约定。',physicsSource(2,'3-3-first-law-of-thermodynamics')],
    ['entropy-change','等温可逆过程熵变','isothermal reversible entropy','\\Delta {${1:S}}=\\frac{{${2:Q_{\\mathrm{rev}}}}}{{${3:T}}}','1:熵；2:可逆过程吸热；3:恒定绝对温度','可逆、等温过程，T>0；一般过程应使用 ∫δQ_rev/T。',physicsSource(2,'4-6-entropy')],
    ['carnot','卡诺效率','Carnot efficiency','${1:\\eta}=1-\\frac{{${2:T_c}}}{{${3:T_h}}}','1:热机效率；2:冷源绝对温度；3:热源绝对温度','两恒温热源间的可逆热机；T_h>T_c>0，温度以 K 计。',physicsSource(2,'4-5-the-carnot-cycle')],
    ['boltzmann','玻尔兹曼熵','Boltzmann entropy','${1:S}=k_{\\mathrm{B}}\\ln {${2:\\Omega}}','1:熵；2:对应宏观态的微观态数','等概率微观态，Ω 为正整数；k_B 为玻尔兹曼常量。',physicsSource(2,'4-7-entropy-on-a-microscopic-scale')]
  ]),
  ...group('physics','电磁学','basic',[
    ['coulomb','库仑定律','Coulomb law','${1:F}=\\frac{1}{4\\pi\\varepsilon_0}\\frac{|{${2:q_1}}{${3:q_2}}|}{{${4:r}}^2}','1:静电力大小；2:第一点电荷；3:第二点电荷；4:间距','SI 制、真空中的静止点电荷，r>0；同号相斥、异号相吸。',physicsSource(2,'5-3-coulombs-law')],
    ['lorentz','洛伦兹力','Lorentz force','${1:\\mathbf{F}}={${2:q}}\\left({${3:\\mathbf{E}}}+{${4:\\mathbf{v}}}\\times{${5:\\mathbf{B}}}\\right)','1:电磁力；2:电荷；3:电场；4:粒子速度；5:磁感应强度','SI 制，速度与场量在同一惯性系中测量。',physicsSource(2,'16-1-maxwells-equations-and-electromagnetic-waves')],
    ['gauss','高斯定律','Gauss law electric flux','\\oint_{${1:S}} {${2:\\mathbf{E}}}\\cdot d\\mathbf{A}=\\frac{{${3:Q_{\\mathrm{enc}}}}}{\\varepsilon_0}','1:闭合曲面；2:电场；3:曲面包围的总电荷','SI 制、真空形式，面积元沿闭合曲面外法线；Q_enc 包含全部电荷。',physicsSource(2,'6-2-explaining-gausss-law')],
    ['faraday','法拉第感应定律','Faraday induction','\\oint_{${1:C}}{${2:\\mathbf{E}}}\\cdot d\\mathbf{l}=-\\frac{d}{d{${3:t}}}\\int_{${4:S}}{${5:\\mathbf{B}}}\\cdot d\\mathbf{A}','1:闭合回路；2:电场；3:时间；4:以回路为边界的曲面；5:磁场','SI 制、固定回路与固定曲面；环向与法向遵循右手定则。',physicsSource(2,'13-1-faradays-law')],
    ['ampere-maxwell','安培—麦克斯韦定律','Ampere Maxwell displacement current','\\oint_{${1:C}}{${2:\\mathbf{B}}}\\cdot d\\mathbf{l}=\\mu_0{${3:I_{\\mathrm{enc}}}}+\\mu_0\\varepsilon_0\\frac{d{${4:\\Phi_E}}}{d{${5:t}}}','1:闭合回路；2:磁场；3:穿过曲面的电流；4:通过该曲面的电通量；5:时间','SI 制、真空形式、固定曲面与回路；电流和通量法向取向一致。',physicsSource(2,'16-1-maxwells-equations-and-electromagnetic-waves')]
  ]),
  ...group('physics','振动与光学','basic',[
    ['shm','简谐振动','SHM|simple harmonic motion','{${1:x}}({${2:t}})={${3:A}}\\cos({${4:\\omega}}{${2}}+{${5:\\varphi}})','1:位移函数；2:时间；3:振幅；4:角频率；5:初相位','无阻尼、无外驱动的线性简谐运动；角度以弧度计。',physicsSource(1,'15-1-simple-harmonic-motion')],
    ['wave-equation','一维波动方程','wave equation','\\frac{\\partial^2 {${1:u}}}{\\partial {${2:t}}^2}={${3:v}}^2\\frac{\\partial^2 {${1}}}{\\partial {${4:x}}^2}','1:波动场；2:时间；3:恒定波速；4:位置','均匀介质中的线性、无源、无耗散一维波动。',physicsSource(1,'16-2-mathematics-of-waves')],
    ['wave-speed','波速与频率关系','wave speed frequency wavelength','${1:v}={${2:f}}{${3:\\lambda}}','1:相速度；2:频率；3:波长','单色行波，f>0；色散介质中相速度可依赖频率。',physicsSource(1,'16-2-mathematics-of-waves')],
    ['young','杨氏双缝条纹间距','Young double slit interference','\\Delta {${1:y}}=\\frac{{${2:\\lambda}}{${3:L}}}{{${4:d}}}','1:屏上条纹坐标；2:波长；3:双缝至屏距离；4:双缝间距','相干单色光、近轴小角度、L 远大于 d；介质中的波长。',physicsSource(3,'3-1-youngs-double-slit-interference')],
    ['thin-lens','薄透镜公式','thin lens equation','\\frac{1}{{${1:f}}}=\\frac{1}{{${2:d_o}}}+\\frac{1}{{${3:d_i}}}','1:焦距；2:物距；3:像距','近轴薄透镜；会聚透镜 f>0，实物 d_o>0，实像 d_i>0，虚像 d_i<0。',physicsSource(3,'2-4-thin-lenses')]
  ]),
  ...group('physics','量子力学','advanced',[
    ['debroglie','德布罗意关系','de Broglie wavelength','${1:\\lambda}=\\frac{h}{{${2:p}}}','1:物质波波长；2:动量大小','自由粒子的确定非零动量；p 可使用相对论动量。',physicsSource(3,'6-5-de-broglies-matter-waves')],
    ['uncertainty','位置动量不确定关系','Heisenberg uncertainty','\\Delta {${1:x}}\\,\\Delta {${2:p_x}}\\ge\\frac{\\hbar}{2}','1:位置；2:对应方向的动量','Δ 表示同一量子态中测量分布的标准差，不是仪器误差。',physicsSource(3,'7-2-the-heisenberg-uncertainty-principle')],
    ['schrodinger-stationary','定态薛定谔方程','Schrodinger|Schrödinger|stationary','-\\frac{\\hbar^2}{2{${1:m}}}\\frac{d^2{${2:\\psi}}}{d{${3:x}}^2}+{${4:V}}{${2}}={${5:E}}{${2}}','1:粒子质量；2:定态波函数；3:位置；4:势能函数；5:能量本征值','一维、非相对论单粒子，势能不随时间变化；需另给边界条件。',physicsSource(3,'7-3-the-schrodinger-equation')],
    ['schrodinger-time','含时薛定谔方程','time dependent Schrodinger|Schrödinger','i\\hbar\\frac{\\partial{${1:\\Psi}}}{\\partial{${2:t}}}={${3:\\hat{H}}}{${1}}','1:波函数；2:时间；3:哈密顿算符','非相对论量子态演化；哈密顿算符及初始条件需另行指定。',physicsSource(3,'7-3-the-schrodinger-equation')],
    ['expectation','算符期望值','expectation value operator','\\langle {${1:A}}\\rangle=\\int_{-\\infty}^{\\infty}{${2:\\psi}}^*{${3:\\hat{A}}}{${2}}\\,d{${4:x}}','1:可观测量；2:归一化波函数；3:对应算符；4:积分变量','一维连续位置表象，波函数归一化，算符作用域合适。',physicsSource(3,'7-1-wave-functions')]
  ]),
  ...group('physics','狭义相对论','advanced',[
    ['lorentz-factor','洛伦兹因子','Lorentz factor gamma','${1:\\gamma}=\\frac{1}{\\sqrt{1-\\frac{{${2:v}}^2}{c^2}}}','1:洛伦兹因子；2:相对速度大小','惯性系间匀速运动，0≤v<c；c 为真空光速。',physicsSource(3,'5-3-time-dilation')],
    ['time-dilation','时间膨胀','time dilation','\\Delta {${1:t}}={${2:\\gamma}}\\Delta {${3:\\tau}}','1:观察系时间；2:洛伦兹因子；3:固有时间','两个事件在钟的静止系同地发生，γ 对应恒定相对速度。',physicsSource(3,'5-3-time-dilation')],
    ['length-contraction','长度收缩','length contraction','${1:L}=\\frac{{${2:L_0}}}{{${3:\\gamma}}}','1:运动长度；2:静止长度；3:洛伦兹因子','沿运动方向测量；运动系两端位置须同时测得。',physicsSource(3,'5-4-length-contraction')],
    ['rest-energy','静能','rest energy mass energy','${1:E_0}={${2:m}}c^2','1:静止能量；2:不变质量','m 为不变质量；运动粒子的总能量一般不等于静能。',physicsSource(3,'5-9-relativistic-energy')],
    ['energy-momentum','能量动量关系','energy momentum relation','{${1:E}}^2={${2:p}}^2c^2+{${3:m}}^2c^4','1:总能量；2:动量大小；3:不变质量','自由粒子或孤立系统的狭义相对论关系，适用于 m=0。',physicsSource(3,'5-9-relativistic-energy')]
  ])
];
export const COMPUTER_FORMULAS:FormulaDefinition[]=[
  ...group('computer','逻辑与集合','basic',[
    ['implication','蕴含等价式','implication logical equivalence','({${1:p}}\\Rightarrow{${2:q}})\\equiv(\\neg{${1}}\\lor{${2}})','1:命题 p；2:命题 q','经典二值命题逻辑中的实质蕴含。',csSource('Propositional Formulas')],
    ['demorgan','德摩根定律','De Morgan laws','\\neg({${1:p}}\\land{${2:q}})\\equiv(\\neg{${1}}\\lor\\neg{${2}})','1:命题 p；2:命题 q','经典二值命题逻辑；此模板展示合取的否定形式。',csSource('Propositional Formulas')],
    ['inclusion-exclusion','两集合容斥','inclusion exclusion','|{${1:A}}\\cup{${2:B}}|=|{${1}}|+|{${2}}|-|{${1}}\\cap{${2}}|','1:有限集合 A；2:有限集合 B','A、B 为有限集合，竖线表示基数。',csSource('Counting: Inclusion-Exclusion')],
    ['cartesian','笛卡尔积','Cartesian product','{${1:A}}\\times{${2:B}}=\\{({${3:a}},{${4:b}})\\mid {${3}}\\in{${1}},\\ {${4}}\\in{${2}}\\}','1:集合 A；2:集合 B；3:第一分量；4:第二分量','有序对构成的集合；分量顺序有意义。',csSource('Sets and Sequences')],
    ['power-set','幂集基数','power set cardinality','|\\mathcal{P}({${1:A}})|=2^{|{${1}}|}','1:有限集合','集合有限，P(A) 表示全部子集组成的幂集。',csSource('Sets and Counting')]
  ]),
  ...group('computer','算法与图论','basic',[
    ['big-o','大 O 定义','big O asymptotic complexity','{${1:f}}\\in O({${2:g}})\\iff\\exists c>0,\\exists n_0,\\forall n\\ge n_0:\\ |{${1}}(n)|\\le c|{${2}}(n)|','1:待界定函数；2:比较函数','定义最终成立的渐近上界；常数 c、n₀ 与 n 无关。',csSource('Asymptotic Notation')],
    ['binary-recurrence','二分查找递推','binary search recurrence','{${1:T}}(n)={${1}}(\\lfloor n/2\\rfloor)+\\Theta(1),\\quad {${1}}(0)=\\Theta(1)','1:最坏情况运行时间函数','每步保留至多一半区间，随机访问与比较为常数开销；渐近解 Θ(log n)。',csSource('Recurrences; MIT 6.006 Binary Search')],
    ['merge-recurrence','归并排序递推','merge sort recurrence','{${1:T}}(n)=2{${1}}(n/2)+\\Theta(n),\\quad {${1}}(1)=\\Theta(1)','1:运行时间函数','此形式假设 n 为 2 的幂、合并耗时 Θ(n)；渐近解 Θ(n log n)。',csSource('Recurrences; MIT 6.006 Merge Sort')],
    ['handshake','握手定理','handshaking lemma degree sum','\\sum_{${1:v}\\in {${2:V}}}\\deg({${1}})=2|{${3:E}}|','1:顶点指标；2:顶点集；3:边集','有限无向图；自环对度数贡献 2。',csSource('Simple Graphs')],
    ['euler-planar','连通平面图欧拉公式','Euler planar graph formula','|{${1:V}}|-|{${2:E}}|+{${3:F}}=2','1:顶点集；2:边集；3:面数','有限连通平面图，面数包含无界外部面。',csSource('Planar Graphs')]
  ]),
  ...group('computer','组合与概率','basic',[
    ['permutations','排列数','permutation arrangement','P({${1:n}},{${2:k}})=\\frac{{${1}}!}{({${1}}-{${2}})!}','1:元素总数；2:有序选取个数','互异元素，无放回；n、k 为整数，0≤k≤n。',csSource('Counting: Permutations')],
    ['combinations','组合数','combination binomial coefficient','\\binom{${1:n}}{${2:k}}=\\frac{{${1}}!}{{${2}}!({${1}}-{${2}})!}','1:元素总数；2:无序选取个数','互异元素，无放回；n、k 为整数，0≤k≤n。',csSource('Counting: Combinations')],
    ['conditional','条件概率','conditional probability','P({${1:A}}\\mid{${2:B}})=\\frac{P({${1}}\\cap{${2}})}{P({${2}})}','1:事件 A；2:条件事件 B','P(B)>0。',csSource('Conditional Probability')],
    ['total-probability','全概率公式','law total probability','P({${1:A}})=\\sum_{${3:i}=1}^{${4:n}}P({${1}}\\mid{${2:B}}_{${3}})P({${2}}_{${3}})','1:目标事件；2:划分事件族名称；3:求和指标；4:划分事件个数','B₁…Bₙ 互斥、完备，条件项要求 P(Bᵢ)>0。',csSource('Conditional Probability')],
    ['bayes','贝叶斯公式','Bayes theorem 贝叶斯定理','P({${1:A}}\\mid{${2:B}})=\\frac{P({${2}}\\mid{${1}})P({${1}})}{P({${2}})}','1:假设事件；2:观察事件','P(A)>0、P(B)>0；分母可用全概率展开。',csSource('Conditional Probability: Bayes Rule')]
  ]),
  ...group('computer','信息论','advanced',[
    ['entropy','熵','Shannon entropy information entropy','H({${1:X}})=-\\sum_{${2:x}}{${3:p}}({${2}})\\log_2{${3}}({${2}})','1:离散随机变量；2:取值指标；3:概率质量函数','离散分布，0 log₂0 取 0；单位为 bit，和式需收敛。',d2lSource('chapter_preliminaries/information-theory')],
    ['joint-entropy','联合熵','joint entropy','H({${1:X}},{${2:Y}})=-\\sum_{${3:x},${4:y}}{${5:p}}({${3}},{${4}})\\log_2{${5}}({${3}},{${4}})','1:随机变量 X；2:随机变量 Y；3:X 取值指标；4:Y 取值指标；5:联合概率质量函数','离散联合分布，单位 bit；0 log₂0 取 0。',d2lSource('chapter_preliminaries/information-theory')],
    ['cross-entropy','交叉熵','cross entropy','H({${1:p}},{${2:q}})=-\\sum_{${3:x}}{${1}}({${3}})\\log_2{${2}}({${3}})','1:目标分布；2:预测分布；3:取值指标','离散分布，单位 bit；p(x)>0 且 q(x)=0 时交叉熵为正无穷。',d2lSource('chapter_preliminaries/information-theory')],
    ['kl','KL 散度','KL divergence Kullback Leibler relative entropy','D_{\\mathrm{KL}}({${1:p}}\\|{${2:q}})=\\sum_{${3:x}}{${1}}({${3}})\\log_2\\frac{{${1}}({${3}})}{{${2}}({${3}})}','1:目标分布；2:参考分布；3:取值指标','离散分布，单位 bit；非对称，通常不是距离；p>0、q=0 的项为正无穷。',d2lSource('chapter_preliminaries/information-theory')],
    ['mutual-information','互信息','mutual information','I({${1:X}};{${2:Y}})=\\sum_{${3:x},${4:y}}{${5:p}}({${3}},{${4}})\\log_2\\frac{{${5}}({${3}},{${4}})}{p_{${1}}({${3}})p_{${2}}({${4}})}','1:变量 X；2:变量 Y；3:X 取值指标；4:Y 取值指标；5:联合概率质量函数','p_X、p_Y 是联合分布的边缘分布；离散形式，单位 bit。',d2lSource('chapter_preliminaries/information-theory')]
  ]),
  ...group('computer','学习与优化','advanced',[
    ['linear-regression','线性回归','linear regression','${1:\\hat{y}}={${2:\\mathbf{w}}}^{\\mathsf{T}}{${3:\\mathbf{x}}}+{${4:b}}','1:预测值；2:权重向量；3:特征向量；4:偏置','标量输出，权重与特征维数一致；此式是预测模型。',d2lSource('chapter_linear-regression/linear-regression')],
    ['mse','均方误差','MSE mean squared error loss','${1:L}=\\frac{1}{{${2:n}}}\\sum_{${3:i}=1}^{${2}}({${4:\\hat{y}}}_{${3}}-{${5:y}}_{${3}})^2','1:损失；2:样本数；3:样本指标；4:预测值名称；5:真实值名称','n 为正整数；采用 1/n 平均，不含可选的 1/2 系数。',d2lSource('chapter_linear-regression/linear-regression')],
    ['logistic','逻辑回归概率','logistic regression sigmoid','P({${1:y}}=1\\mid{${2:\\mathbf{x}}})=\\frac{1}{1+\\exp(-({${3:\\mathbf{w}}}^{\\mathsf{T}}{${2}}+{${4:b}}))}','1:二元标签；2:特征向量；3:权重向量；4:偏置','二分类标签取 0 或 1，使用 sigmoid 连接函数。',d2lSource('chapter_linear-classification/softmax-regression')],
    ['gradient','梯度下降','gradient descent optimization','{${1:\\theta}}_{${2:t}+1}={${1}}_{${2}}-{${3:\\eta}}\\nabla {${4:J}}({${1}}_{${2}})','1:参数；2:迭代指标；3:学习率；4:可微目标函数','η>0；全量梯度形式，收敛依赖目标函数与步长条件。',d2lSource('chapter_optimization/gd')],
    ['l2','L2 正则化目标','L2 regularization weight decay','{${1:J}}({${2:\\mathbf{w}}})={${3:L}}({${2}})+\\frac{{${4:\\lambda}}}{2}\\|{${2}}\\|_2^2','1:正则化目标；2:被正则化权重；3:数据损失；4:非负正则化系数','λ≥0，采用 λ/2 约定；是否包含偏置应由权重定义明确。',d2lSource('chapter_linear-regression/weight-decay')]
  ]),
  ...group('computer','深度学习','advanced',[
    ['softmax','Softmax','softmax normalized exponential','{${1:p}}_{${2:i}}=\\frac{\\exp({${3:z}}_{${2}})}{\\sum_{${4:j}=1}^{${5:K}}\\exp({${3}}_{${4}})}','1:输出概率名称；2:类别指标；3:logit 名称；4:求和指标；5:类别数','K 为正整数；数值实现通常先减去最大 logit，公式值不变。',d2lSource('chapter_linear-classification/softmax-regression')],
    ['backprop','反向传播链式法则','backpropagation chain rule','\\frac{\\partial{${1:L}}}{\\partial{${2:x}}}=\\sum_{${4:j}=1}^{${5:m}}\\frac{\\partial{${1}}}{\\partial{${3:h}}_{${4}}}\\frac{\\partial{${3:h}}_{${4}}}{\\partial{${2}}}','1:标量损失；2:输入变量；3:中间变量名称；4:中间变量指标；5:中间变量个数','可微复合函数；L 对 x 的依赖须全部经由列出的中间变量。',d2lSource('chapter_multilayer-perceptrons/backprop')],
    ['relu','ReLU','rectified linear unit activation','\\operatorname{ReLU}({${1:x}})=\\max(0,{${1}})','1:标量输入','向量输入时逐元素作用；x=0 处不可微，训练时需约定次梯度。',d2lSource('chapter_multilayer-perceptrons/mlp')],
    ['attention','缩放点积注意力','attention scaled dot product transformer','\\operatorname{Attention}({${1:Q}},{${2:K}},{${3:V}})=\\operatorname{softmax}\\left(\\frac{{${1}}{${2}}^{\\mathsf{T}}}{\\sqrt{{${4:d_k}}}}\\right){${3}}','1:查询矩阵；2:键矩阵；3:值矩阵；4:键向量维度','单头、无掩码形式；Q、K 特征维度为 d_k>0，K、V 的键数量一致；softmax 按每个查询的键方向计算。',d2lSource('chapter_attention-mechanisms-and-transformers/attention-scoring-functions')],
    ['layernorm','层归一化','layer normalization LayerNorm','{${1:y}}_{${2:i}}={${3:\\gamma}}_{${2}}\\frac{{${4:x}}_{${2}}-{${5:\\mu}}}{\\sqrt{{${6:\\sigma}}^2+{${7:\\epsilon}}}}+{${8:\\beta}}_{${2}}','1:输出名称；2:特征指标；3:可学习缩放；4:输入名称；5:归一化特征内均值；6:归一化特征内标准差；7:数值稳定常数；8:可学习平移','每个样本或 token 独立沿指定特征维度计算均值与总体方差；ε>0，不跨 batch 归一化。',d2lSource('chapter_attention-mechanisms-and-transformers/transformer')]
  ])
];
export const PROFESSIONAL_FORMULAS:FormulaDefinition[]=[...MATHEMATICS_FORMULAS,...PHYSICS_FORMULAS,...COMPUTER_FORMULAS,...ELECTRONICS_FORMULAS,...NEW_STATISTICS_FORMULAS,...NEW_MECHANICS_FORMULAS,...NEW_CHEMISTRY_FORMULAS,...ECONOMICS_FORMULAS,...NEW_BIOLOGY_FORMULAS].map(formula=>{
  const placements=[...(formula.alsoIn??[]),...(STATISTICS_SHARED[formula.id]?[STATISTICS_SHARED[formula.id]]:[]),...(ADDITIONAL_FORMULA_PLACEMENTS[formula.id]??[])];
  return placements.length?{...formula,alsoIn:placements,aliases:[...formula.aliases,...(ADDITIONAL_FORMULA_ALIASES[formula.id]??[])],conditions:formula.conditions+(ADDITIONAL_FORMULA_NOTES[formula.id]??'')}:formula;
});
export const STATISTICS_FORMULAS=PROFESSIONAL_FORMULAS.filter(formula=>formulaPlacements(formula).some(placement=>placement.subject==='statistics'));
export const MECHANICS_FORMULAS=PROFESSIONAL_FORMULAS.filter(formula=>formulaPlacements(formula).some(placement=>placement.subject==='mechanics'));
export const CHEMISTRY_FORMULAS=PROFESSIONAL_FORMULAS.filter(formula=>formulaPlacements(formula).some(placement=>placement.subject==='chemistry'));
export const BIOLOGY_FORMULAS=PROFESSIONAL_FORMULAS.filter(formula=>formulaPlacements(formula).some(placement=>placement.subject==='biology'));
export interface FormulaFilter {query:string;subjects:FormulaSubject[];topic:string;level:FormulaLevel|''}
export function matchingPlacements(formula:FormulaDefinition,filter:Omit<FormulaFilter,'query'>):FormulaPlacement[]{
  return formulaPlacements(formula).filter(placement=>(!filter.subjects.length||filter.subjects.includes(placement.subject))&&(!filter.topic||filter.topic===placement.topic)&&(!filter.level||filter.level===placement.level));
}
export function filterFormulas(filter:FormulaFilter):FormulaDefinition[]{
  const query=filter.query.trim().toLocaleLowerCase();
  const tokens=query.split(/\s+/).filter(Boolean);
  return PROFESSIONAL_FORMULAS.filter(formula=>{const placements=matchingPlacements(formula,filter);const text=[formula.title,...formula.aliases,...placements.flatMap(placement=>[SUBJECT_NAMES[placement.subject],placement.topic])].join(' ').toLocaleLowerCase();return placements.length>0&&tokens.every(token=>text.includes(token));})
    .map(formula=>({formula,score:query&&(formula.title.toLocaleLowerCase()===query||formula.aliases.some(alias=>alias.toLocaleLowerCase()===query))?0:1}))
    .sort((left,right)=>left.score-right.score).map(result=>result.formula);
}
