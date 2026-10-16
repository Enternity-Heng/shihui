import {createFormulaGroup as group} from './formula-definition';

const chemistry=(section:string)=>({title:'OpenStax · Chemistry 2e',url:`https://openstax.org/books/chemistry-2e/pages/${section}`,section});
const reaction=(section:string)=>({title:'University of Michigan · Elements of Chemical Reaction Engineering',url:'https://public.websites.umich.edu/~elements/6e/expanded/index.html',section});
const transport=(section:string)=>({title:'MIT 10.302 · Transport Processes',url:'https://ocw.mit.edu/courses/10-302-transport-processes-fall-2004/pages/recitations/',section});
const materials=(section:string)=>({title:'University of Cambridge · DoITPoMS',url:section==='Phase diagrams: lever rule'?'https://www.doitpoms.ac.uk/tlplib/phase-diagrams/printall.php':'https://www.doitpoms.ac.uk/tlplib/',section});

export const NEW_CHEMISTRY_FORMULAS=[
  ...group('chemistry','计量与溶液','basic',[
    ['molarity','物质的量浓度','molarity molar concentration','{${1:c}}=\\frac{{${2:n}}}{{${3:V}}}','1:物质的量浓度；2:溶质物质的量；3:溶液体积','V>0，分母是溶液总体积而非溶剂体积；mol/L 与 mol/m³ 应明确换算。',chemistry('3-3-molarity')],
    ['mass-fraction','溶质质量分数','mass fraction weight percent','{${1:w}}=\\frac{{${2:m_s}}}{{${3:m}}}','1:溶质质量分数；2:溶质质量；3:溶液总质量','m>0、0≤m_s≤m；本式为 0…1 分数，表示质量百分数时乘 100%。',chemistry('3-4-other-units-for-solution-concentrations')],
    ['dilution','稀释守恒','dilution concentration volume','{${1:c_1}}{${2:V_1}}={${3:c_2}}{${4:V_2}}','1:初始浓度；2:取样体积；3:最终浓度；4:最终溶液体积','同一溶质稀释、无反应或损失；浓度与体积单位配套，V₂ 是最终体积而非加水体积。',chemistry('3-3-molarity')],
    ['extent','反应进度与组分量','reaction extent stoichiometry','{${1:n_i}}={${2:n_{i,0}}}+{${3:\\nu_i}}{${4:\\xi}}','1:组分当前物质的量；2:组分初始物质的量；3:有符号化学计量数；4:反应进度','封闭体系单个独立反应；反应物 ν_i<0、产物 ν_i>0，ξ 以 mol 计，组分量非负。',reaction('Chapter 4: Stoichiometry — extent of reaction')]
  ]),
  ...group('chemistry','热力学与平衡','advanced',[
    ['gibbs','吉布斯自由能变化','Gibbs free energy enthalpy entropy','\\Delta {${1:G}}=\\Delta {${2:H}}-{${3:T}}\\Delta {${4:S}}','1:吉布斯自由能；2:焓；3:绝对温度；4:熵','初末温度相同，T>0 K；恒温恒压下 ΔG<0 为自发方向判据，H 与 TS 单位一致。',chemistry('16-4-free-energy')],
    ['equilibrium','活度平衡常数','equilibrium constant activity product','{${1:K}}=\\prod_{${2:i}}{${3:a}}_{${2}}^{${4:\\nu}_{${2}}}','1:热力学平衡常数；2:参与反应物种指标；3:平衡活度名称；4:有符号计量数名称','活度为无量纲；产物 ν>0、反应物 ν<0，纯固体／纯液体活度通常取 1；给定温度和标准态。',chemistry('13-2-equilibrium-constants')],
    ['gibbs-equilibrium','标准自由能与平衡常数','standard Gibbs equilibrium ln K','\\Delta {${1:G}}^\\circ=-R{${2:T}}\\ln{${3:K}}','1:标准摩尔反应吉布斯能；2:绝对温度；3:无量纲热力学平衡常数','自然对数，T>0、K>0；R 的能量单位与 ΔG° 配套，标准态一致。',chemistry('16-4-free-energy')],
    ['vanthoff','积分范特霍夫方程','van t Hoff equilibrium temperature','\\ln\\frac{{${1:K_2}}}{{${2:K_1}}}=-\\frac{{${3:\\Delta H^\\circ}}}{R}\\left(\\frac{1}{{${4:T_2}}}-\\frac{1}{{${5:T_1}}}\\right)','1:温度 T₂ 的平衡常数；2:温度 T₁ 的平衡常数；3:标准摩尔反应焓；4:末温；5:初温','两温度间 ΔH° 近似恒定、同一反应和标准态；T 用 K，K₁,K₂>0，自然对数。',chemistry('16-4-free-energy')]
  ]),
  ...group('chemistry','动力学与反应器','advanced',[
    ['rate-law','幂律反应速率','reaction rate law orders','{${1:r}}={${2:k}}{${3:c_A}}^{${4:\\alpha}}{${5:c_B}}^{${6:\\beta}}','1:正向速率；2:速率常数；3:A 浓度；4:A 反应级数；5:B 浓度；6:B 反应级数','经验速率律，浓度非负且幂有定义；级数通常由实验确定，不直接等于反应方程计量数，k 单位随级数变化。',chemistry('12-3-rate-laws')],
    ['first-order','一级反应积分式','first order integrated rate decay','{${1:c_A}}({${2:t}})={${3:c_{A,0}}}e^{-{${4:k}}{${2}}}','1:反应物浓度函数；2:时间；3:初始浓度；4:一级速率常数','恒体积间歇体系、单一不可逆一级消耗、k 恒定且>0；t≥0，无流入流出。',chemistry('12-4-integrated-rate-laws')],
    ['arrhenius','阿伦尼乌斯方程','Arrhenius activation energy','{${1:k}}={${2:A}}\\exp\\left(-\\frac{{${3:E_a}}}{R{${4:T}}}\\right)','1:速率常数；2:指前因子；3:摩尔活化能；4:绝对温度','经验 Arrhenius 模型，T>0 K；E_a 与 R 的能量单位一致，温区内 A 和 E_a 近似不变。',chemistry('12-5-collision-theory')],
    ['cstr','理想 CSTR 体积','CSTR continuous stirred tank reactor design','{${1:V}}=\\frac{{${2:F_{A0}}}{${3:X}}}{-{${4:r_A}}}','1:反应器体积；2:入口 A 摩尔流量；3:A 转化率；4:出口状态下 A 生成速率（消耗时为负）','稳态、完全混合、单反应、无 A 的非反应损失；−r_A>0，0≤X<1；速率按反应器体积计。',reaction('Chapters 1–2: Mole balances and CSTR sizing')],
    ['pfr','理想 PFR 体积','PFR plug flow reactor design','{${1:V}}={${2:F_{A0}}}\\int_0^{${3:X}}\\frac{d{${4:x}}}{-{${5:r_A}}({${4}})}','1:反应器体积；2:入口 A 摩尔流量；3:出口转化率；4:转化率积分变量；5:A 生成速率函数','稳态理想活塞流、单反应、入口转化率为 0；−r_A>0，积分需有限；速率沿程变化须计入。',reaction('Chapters 1–2: Mole balances and PFR sizing')]
  ]),
  ...group('chemistry','电化学与分析','advanced',[
    ['nernst','电池能斯特方程','Nernst cell potential electrochemistry','{${1:E}}={${2:E^\\circ}}-\\frac{R{${3:T}}}{{${4:n}}F}\\ln{${5:Q}}','1:电池电势；2:标准电池电势；3:绝对温度；4:配平反应转移电子数；5:无量纲反应商','按所写总反应方向，n 为正整数、Q>0、T 用 K；F 为法拉第常量，采用自然对数与可逆平衡电势。',chemistry('17-4-potential-free-energy-and-equilibrium')],
    ['electrolysis','法拉第电解质量','Faraday electrolysis deposited mass','{${1:m}}=\\frac{{${2:M}}{${3:I}}{${4:t}}}{{${5:z}}F}','1:析出质量；2:摩尔质量；3:恒定电流；4:电解时间；5:每摩尔产物所需电子摩尔数','电流效率 100%、单一目标电极反应，I,t≥0、z>0；质量单位随摩尔质量，实际效率另乘系数。',chemistry('17-7-electrolysis')],
    ['beer-lambert','比尔—朗伯定律','Beer Lambert absorbance spectrophotometry','{${1:A}}=\\log_{10}\\frac{{${2:I_0}}}{{${3:I}}}={${4:\\varepsilon}}{${5:l}}{${6:c}}','1:吸光度；2:入射光强；3:透射光强；4:摩尔吸光系数；5:光程；6:浓度','单色光、均匀稀溶液、无显著散射及化学形态变化；常用十进对数，ε、l、c 单位配套，I₀,I>0。',{title:'NIST · Liquid absorbance standards',url:'https://nvlpubs.nist.gov/nistpubs/jres/76A/jresv76An5p469_A1b.pdf',section:'Absorbance and the monochromatic Beer–Lambert law'}],
    ['ph','氢离子活度 pH','pH hydrogen activity','{${1:\\mathrm{pH}}}=-\\log_{10}{${2:a_{\\mathrm{H^+}}}}','1:pH；2:氢离子无量纲活度','活度>0；用浓度替代活度是理想稀溶液近似，须除以标准浓度以形成无量纲量，pH 不必限于 0…14。',chemistry('14-2-ph-and-poh')],
    ['buffer','亨德森—哈塞尔巴尔赫式','Henderson Hasselbalch buffer','{${1:\\mathrm{pH}}}={${2:\\mathrm{p}K_a}}+\\log_{10}\\frac{{${3:a_{\\mathrm{A^-}}}}}{{${4:a_{\\mathrm{HA}}}}}','1:pH；2:−log₁₀K_a；3:共轭碱活度；4:弱酸活度','同一酸解离平衡、两活度>0；浓度比近似需足够稀且活度系数可抵消，缓冲能力另受总量限制。',chemistry('14-6-buffers')]
  ]),
  ...group('chemistry','传递与分离','advanced',[
    ['fick','一维菲克第一定律','Fick diffusion molar flux','{${1:J}}=-{${2:D}}\\frac{d{${3:c}}}{d{${4:x}}}','1:沿 x 的扩散摩尔通量；2:扩散系数；3:浓度；4:空间坐标','一维 Fick 扩散、D>0、通量相对所选静止或平均参照系；不包含额外对流项；负号表示沿浓度降低方向。',transport('Molecular diffusion: Fick’s law')],
    ['fourier-heat','一维傅里叶导热定律','Fourier heat conduction flux','{${1:q_x}}=-{${2:k}}\\frac{d{${3:T}}}{d{${4:x}}}','1:热流密度；2:导热系数；3:温度；4:空间坐标','各向同性局部导热、k>0，q 单位 W/m²；负号表示沿温度降低方向，非总热流率。',transport('Conduction: Fourier’s law')],
    ['convection','牛顿对流换热','Newton convection heat transfer','{${1:\\dot Q}}={${2:h}}{${3:A}}({${4:T_s}}-{${5:T_\\infty}})','1:从表面向流体的热流率；2:对流换热系数；3:换热面积；4:表面温度；5:主流温度','h 采用相应流动与几何条件的平均值，h,A>0；表面与主流温度视为均匀，不含辐射。',transport('Convective heat transfer coefficients')],
    ['raoult','拉乌尔定律','Raoult ideal solution vapor pressure','{${1:p_i}}={${2:x_i}}{${3:p_i^*}}','1:组分蒸气分压；2:液相摩尔分数；3:同温纯组分饱和蒸气压','理想液体溶液、理想气相、汽液平衡；x_i∈[0,1]，所有压强单位一致。',chemistry('11-4-colligative-properties')],
    ['relative-volatility','二元相对挥发度','relative volatility vapor liquid equilibrium','{${1:\\alpha}}=\\frac{{${2:y_A}}/(1-{${2}})}{{${3:x_A}}/(1-{${3}})}','1:A 相对 B 的挥发度；2:A 的气相摩尔分数；3:A 的液相摩尔分数','二元汽液平衡、0<x_A,y_A<1；α 随组成和温度可变，不默认恒定。',{title:'MIT 10.32 · Separation Processes',url:'https://ocw.mit.edu/courses/10-32-separation-processes-spring-2005/',section:'Vapor-liquid equilibrium and relative volatility'}]
  ]),
  ...group('chemistry','材料结构与性能','advanced',[
    ['bragg','布拉格衍射定律','Bragg diffraction lattice','{${1:n}}{${2:\\lambda}}=2{${3:d}}\\sin{${4:\\theta}}','1:衍射级数；2:波长；3:晶面间距；4:掠射角（布拉格角）','弹性相干散射、n 为正整数，λ,d>0；θ 不是仪器常报的 2θ，角度用 rad。',chemistry('10-6-lattice-structures-in-crystalline-solids')],
    ['crystal-density','立方晶胞理论密度','cubic unit cell theoretical density','{${1:\\rho}}=\\frac{{${2:Z}}{${3:M}}}{N_A{${4:a}}^3}','1:晶体密度；2:每晶胞化学式单元数；3:每摩尔化学式单元质量；4:立方晶胞边长','理想无缺陷立方晶体、Z 为正整数、a>0；N_A 为阿伏伽德罗常量，质量和长度单位配套。',chemistry('10-6-lattice-structures-in-crystalline-solids')],
    ['hall-petch','霍尔—佩奇关系','Hall Petch grain boundary strengthening','{${1:\\sigma_y}}={${2:\\sigma_0}}+{${3:k_y}}{${4:d}}^{-1/2}','1:屈服应力；2:晶格摩擦应力常数；3:材料强化系数；4:平均晶粒尺寸','经验关系，系数与晶粒长度单位匹配；适用标定材料与尺寸范围，超细纳米晶可偏离或反转。',{title:'MIT · David Roylance: Dislocations',url:'https://ocw.mit.edu/courses/3-91-mechanical-behavior-of-plastics-spring-2007/dd1eb1e4a4f711f006fb6db74900e3e9_21_dn.pdf',section:'Page 10, equation 7: Hall–Petch formula'}],
    ['thermal-strain','线性热应变','linear thermal expansion strain','{${1:\\varepsilon_T}}={${2:\\alpha}}{${3:\\Delta T}}','1:自由热应变；2:线膨胀系数；3:温度变化','小温变、α 近似恒定、自由无约束、各向同性；温差可用 K 或 °C，受约束时另有热应力。',{title:'MIT 3.11 · Mechanics of Materials',url:'https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/',section:'Constitutive relations: thermal strain'}],
    ['lever-rule','二元两相杠杆定则','binary phase lever rule phase fraction','{${1:f_\\alpha}}=\\frac{{${2:C_\\beta}}-{${3:C_0}}}{{${2}}-{${4:C_\\alpha}}}','1:α 相分数；2:β 相平衡组成；3:合金总组成；4:α 相平衡组成','二元平衡两相区同温系线，C_α<C₀<C_β；用质量分数组成得到质量相分数，用摩尔分数组成得到摩尔相分数。',materials('Phase diagrams: lever rule')]
  ])
];
