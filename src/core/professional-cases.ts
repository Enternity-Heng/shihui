import {PROFESSIONAL_FORMULAS,SUBJECT_NAMES,type FormulaSubject} from './professional-formulas';
export interface CaseStep {explanation:string;latex:string}
export interface ProfessionalCase {id:string;subject:FormulaSubject;title:string;aliases:string[];given:string;question:string;conditions:string;steps:CaseStep[];result:string;formulaId:string;diagram?:string;reference?:{title:string;url:string;section:string}}
const L=String.raw;
type CaseRow=[string,string,string,string,string,string,[string,string][],string,string,string?];
function group(subject:FormulaSubject,rows:CaseRow[]):ProfessionalCase[]{return rows.map(([id,title,aliases,given,question,conditions,steps,result,formulaId,diagram])=>({id:`case-${subject}-${id}`,subject,title,aliases:aliases.split('|'),given,question,conditions,steps:steps.map(([explanation,latex])=>({explanation,latex})),result,formulaId,diagram}));}
/** Original worked examples. References document the underlying method, not the numerical exercises. */
export const PROFESSIONAL_CASES:ProfessionalCase[]=[
  ...group('math',[
    ['quadratic','二次方程的两根','quadratic roots|求根','方程 x²−5x+6=0。','求全部实数根并检验。','实数域；二次项系数非零。',[
      ['识别系数并计算判别式。',L`a=1,\quad b=-5,\quad c=6,\quad \Delta=b^2-4ac=1`],
      ['代入求根公式。',L`x=\frac{5\pm\sqrt{1}}{2}\in\{2,3\}`],
      ['将根回代原式。',L`2^2-5\cdot2+6=0,\quad 3^2-5\cdot3+6=0`]
    ],'两个实数根分别为 2、3。','math-quadratic'],
    ['geometric','等比数列的前五项和','geometric series|数列求和','首项 a=3，公比 r=2，项数 n=5。','计算前五项和。','有限等比数列，n 为正整数；r≠1。',[
      ['列出通项与求和范围。',L`a_k=3\cdot2^{k-1},\quad k=1,\ldots,5`],
      ['使用有限等比求和式。',L`S_5=\frac{3(1-2^5)}{1-2}=93`],
      ['逐项复核。',L`3+6+12+24+48=93`]
    ],'前五项和为 93。','math-geometric'],
    ['derivative','多项式在指定点的斜率','derivative slope|求导','f(x)=x³−2x，考察 x=2。','计算切线斜率和切线方程。','实数多项式在所求点可导；切线使用一阶局部近似。',[
      ['逐项求导。',L`f'(x)=3x^2-2`],['计算点值与导数值。',L`f(2)=4,\quad f'(2)=10`],['使用点斜式。',L`y-4=10(x-2)\quad\Rightarrow\quad y=10x-16`]
    ],'切线斜率 10，切线方程 y=10x−16。','math-derivative']
  ]),
  ...group('physics',[
    ['force','水平面物体的加速度','Newton acceleration|牛顿|摩擦','物体质量 2 kg；向右拉力 10 N，向左滑动摩擦力 2 N；g=9.81 m/s²。','求水平加速度，并画出作用于物体的外力。','惯性系、质量恒定；水平面上无竖直加速度，摩擦力已给定。',[
      ['竖直方向平衡。',L`N=mg=2\cdot9.81=19.62\,\mathrm{N}`],['取向右为正，合成水平外力。',L`F_x=10-2=8\,\mathrm{N}`],['由牛顿第二定律计算。',L`a_x=\frac{F_x}{m}=\frac{8}{2}=4\,\mathrm{m\,s^{-2}}`]
    ],'加速度为向右 4 m/s²；外力为重力、支持力、拉力与摩擦力。','physics-newton','horizontal-force'],
    ['kinetic','物体加速所需净功','kinetic work energy|动能定理','质量 2 kg，速率从 3 m/s 增加到 5 m/s。','计算平动动能变化与合外力净功。','恒定质量、非相对论质点；不含转动动能，以合外力净功计算。',[
      ['计算初末动能。',L`K_1=\tfrac12\cdot2\cdot3^2=9\,\mathrm{J},\quad K_2=\tfrac12\cdot2\cdot5^2=25\,\mathrm{J}`],['作动能差。',L`\Delta K=25-9=16\,\mathrm{J}`],['应用动能定理。',L`W_{\mathrm{net}}=\Delta K=16\,\mathrm{J}`]
    ],'合外力所做净功为 16 J。','physics-kinetic'],
    ['gas','理想气体等温膨胀终态','ideal gas isothermal|气体','1 mol 理想气体，温度 300 K，体积从 0.010 m³ 变到 0.020 m³；R=8.314 J/(mol·K)。','求初末压强。','两个平衡态、物质的量不变、等温理想气体；压强为绝对压强。',[
      ['用理想气体式求初态压强。',L`p_1=\frac{nRT}{V_1}=249420\,\mathrm{Pa}`],['保持 n、T 不变。',L`p_1V_1=p_2V_2`],['代入终态体积。',L`p_2=\frac{249420\cdot0.010}{0.020}=124710\,\mathrm{Pa}`]
    ],'初态 249.42 kPa，终态 124.71 kPa。','physics-ideal-gas']
  ]),
  ...group('computer',[
    ['bayes','分类告警的后验概率','Bayes classification|贝叶斯|误报','异常占 1%；异常时告警概率 0.90，正常时告警概率 0.05。','已发生告警时，求样本属于异常的概率。','两类互斥且完备；上述频率作为概率模型，告警概率非零。',[
      ['用全概率展开告警概率。',L`P(B)=0.90\cdot0.01+0.05\cdot0.99=0.0585`],['用贝叶斯公式反推。',L`P(A\mid B)=\frac{0.90\cdot0.01}{0.0585}\approx0.153846`],['将后验概率转换为百分比。',L`P(A\mid B)\approx15.38\%`]
    ],'告警后的异常概率约为 15.38%，不同于异常时的检出率。','computer-bayes'],
    ['gradient','一维目标的一次梯度下降','gradient descent|优化|学习率','J(θ)=(θ−3)²，θ₀=0，学习率 η=0.1。','计算一次更新及更新前后目标值。','可微标量目标，全量梯度；这里只展示一次更新，不承诺任意步长收敛。',[
      ['求梯度并在初值处取值。',L`J'(\theta)=2(\theta-3),\quad J'(0)=-6`],['沿负梯度更新。',L`\theta_1=0-0.1(-6)=0.6`],['比较目标值。',L`J(0)=9,\quad J(0.6)=(-2.4)^2=5.76`]
    ],'一次更新得到 θ₁=0.6，目标值从 9 降至 5.76。','computer-gradient'],
    ['entropy','二元信源的信息熵','entropy bit|信息论','离散信源取 0、1，概率分别为 1/4、3/4。','计算每个符号的平均信息量。','符号分布固定；以 2 为对数底，单位 bit；不是实际压缩文件长度。',[
      ['写出离散熵定义。',L`H(X)=-\sum_xp(x)\log_2p(x)`],['代入两项概率。',L`H(X)=-\tfrac14\log_2\tfrac14-\tfrac34\log_2\tfrac34`],['计算并与二元最大熵比较。',L`H(X)\approx0.811278\,\mathrm{bit}<1\,\mathrm{bit}`]
    ],'该信源每符号熵约为 0.8113 bit。','computer-entropy']
  ]),
  ...group('electronics',[
    ['divider','无负载电阻分压','voltage divider|电路','输入 12 V，上端电阻 R₁=2 kΩ，下端 R₂=1 kΩ。','求下端输出电压与串联电流。','线性理想电阻，输出开路，无负载电流；电压参考下端地。',[
      ['计算等效串联电阻。',L`R=R_1+R_2=3000\,\Omega`],['用欧姆定律求电流。',L`I=\frac{12}{3000}=0.004\,\mathrm{A}=4\,\mathrm{mA}`],['计算下端输出。',L`U_o=IR_2=4\,\mathrm{V}`]
    ],'串联电流 4 mA，输出 4 V。','electronics-divider'],
    ['rc','RC 电路的一个时间常数','RC charging|充电|暂态','电阻 1 kΩ，电容 100 μF；电容初始电压 0，输入为 5 V 直流阶跃。','求时间常数及 t=τ 时的电容电压。','理想串联 RC，t≥0；忽略信号源内阻和电容漏电。',[
      ['统一到 SI 单位。',L`R=1000\,\Omega,\quad C=100\times10^{-6}\,\mathrm{F}`],['计算时间常数。',L`\tau=RC=0.1\,\mathrm{s}`],['代入充电响应。',L`u_C(\tau)=5(1-e^{-1})\approx3.1606\,\mathrm{V}`]
    ],'τ=0.1 s，经过一个时间常数时电压约为 3.16 V。','electronics-rc-step'],
    ['feedback','比例控制的单位负反馈','feedback closed loop|闭环|自动控制','C(s)=2，G(s)=1/(s+1)，H(s)=1，输入通道为标准负反馈。','求闭环传递函数和单位阶跃稳态输出。','单输入单输出 LTI、零初始条件；本例闭环极点 −3，稳定。',[
      ['组成前向通道。',L`C(s)G(s)=\frac{2}{s+1}`],['化简标准负反馈关系。',L`T(s)=\frac{CG}{1+CGH}=\frac{2}{s+3}`],['稳定条件下求单位阶跃稳态值。',L`y(\infty)=T(0)=\frac23`]
    ],'闭环 T(s)=2/(s+3)，单位阶跃稳态输出为 2/3。','electronics-feedback','feedback']
  ]),
  ...group('statistics',[
    ['summary','小样本均值与样本方差','mean sample variance|描述统计','观测值为 2、4、6，共 3 个，无缺失值。','求算术平均、样本方差和样本标准差。','各观测等权；样本方差用 n−1 作分母，不能当总体方差。',[
      ['计算平均值。',L`\bar x=\frac{2+4+6}{3}=4`],['对离均差平方求和。',L`\sum_i(x_i-\bar x)^2=4+0+4=8`],['使用 Bessel 校正。',L`s^2=\frac{8}{3-1}=4,\quad s=2`]
    ],'均值 4，样本方差 4，样本标准差 2。','statistics-variance'],
    ['interval','已知总体标准差的均值区间','confidence interval z|置信区间','正态总体独立样本，n=100，样本均值 50，已知总体标准差 σ=10。','求总体均值的双侧 95% 置信区间。','σ 是已知总体标准差；使用 z₀.₉₇₅≈1.96，不是未知方差的 t 区间。',[
      ['计算均值标准误。',L`\mathrm{SE}=\frac{10}{\sqrt{100}}=1`],['计算误差限。',L`E=1.96\cdot1=1.96`],['形成区间。',L`[\bar x-E,\bar x+E]=[48.04,51.96]`]
    ],'95% 置信区间为 [48.04, 51.96]；95% 描述重复抽样方法的覆盖率。','statistics-z-interval'],
    ['binomial','五次独立试验的成功次数','binomial PMF|二项分布','5 次相互独立试验，每次成功概率 0.2。','求恰好成功 2 次的概率。','各次概率相同且独立；只计成功次数，顺序不区分。',[
      ['指定二项分布。',L`X\sim\mathrm{Bin}(5,0.2)`],['计算成功位置的组合数。',L`\binom52=10`],['代入概率质量函数。',L`P(X=2)=10(0.2)^2(0.8)^3=0.2048`]
    ],'恰好成功两次的概率为 0.2048，即 20.48%。','statistics-binomial']
  ]),
  ...group('mechanics',[
    ['bar','等截面直杆的应力与伸长','axial stress elongation|拉杆','轴向拉力 20 kN；杆长 2 m，截面积 200 mm²，杨氏模量 200 GPa。','求平均拉应力、轴向应变及伸长。','均匀直杆、中心受拉、小变形线弹性；忽略自重和局部应力集中。',[
      ['将截面积换算到 m² 并求应力。',L`A=2\times10^{-4}\,\mathrm{m^2},\quad\sigma=\frac{20000}{A}=100\,\mathrm{MPa}`],['由单轴胡克定律求应变。',L`\varepsilon=\frac{\sigma}{E}=\frac{100\times10^6}{200\times10^9}=5\times10^{-4}`],['计算轴向伸长。',L`\delta=\varepsilon L=0.001\,\mathrm{m}=1\,\mathrm{mm}`]
    ],'拉应力 100 MPa，应变 0.0005，伸长 1 mm。','mechanics-axial-extension'],
    ['bending','梁截面上缘的弯曲正应力','beam bending stress|梁','弯矩 Mz=2 kN·m，截面二次矩 Iz=8×10⁻⁶ m⁴，考察 y=0.04 m 的上缘点。','按指定弯矩正号约定计算轴向正应力。','Euler–Bernoulli 梁、线弹性局部弯曲；正 Mz 使 y>0 一侧受压。',[
      ['统一弯矩单位。',L`M_z=2000\,\mathrm{N\,m}`],['代入带符号弯曲应力式。',L`\sigma_x=-\frac{M_zy}{I_z}=-\frac{2000\cdot0.04}{8\times10^{-6}}`],['解释应力符号。',L`\sigma_x=-10^7\,\mathrm{Pa}=-10\,\mathrm{MPa}`]
    ],'该上缘点为 10 MPa 压应力。','mechanics-bending-stress'],
    ['incline','斜面下滑物体的受力与加速度','inclined plane friction|斜面','质量 10 kg，斜面向右上方倾斜 30°；物体正下滑，动摩擦系数 0.2，g=9.81 m/s²。','求支持力、滑动摩擦力及沿斜面加速度。','质点、固定直斜面、库仑滑动摩擦；无垂直斜面的加速度，斜面方向取下滑为正。',[
      ['沿垂直斜面的方向平衡。',L`N=mg\cos30^\circ\approx84.9571\,\mathrm{N}`],['滑动摩擦力沿斜面向上。',L`f=\mu_kN\approx16.9914\,\mathrm{N}`],['沿斜面使用牛顿第二定律。',L`a=g(\sin30^\circ-0.2\cos30^\circ)\approx3.2059\,\mathrm{m\,s^{-2}}`]
    ],'N≈84.96 N，f≈16.99 N，加速度沿斜面向下约 3.206 m/s²。','physics-newton','incline-force']
  ]),
  ...group('chemistry',[
    ['molarity','由溶质物质的量配制溶液','molarity solution|浓度','溶质 0.050 mol，配制后溶液总体积为 250 mL。','计算物质的量浓度并换算 SI 单位。','溶质完全进入溶液且无损失；体积是溶液最终总体积。',[
      ['将体积转换为 L。',L`V=0.250\,\mathrm{L}`],['按定义求浓度。',L`c=\frac{0.050}{0.250}=0.200\,\mathrm{mol\,L^{-1}}`],['将 L 换算为 m³。',L`c=200\,\mathrm{mol\,m^{-3}}`]
    ],'浓度为 0.200 mol/L，等于 200 mol/m³。','chemistry-molarity'],
    ['dilution','储备液稀释的取样体积','dilution stock|稀释','储备液 2.0 mol/L，目标为 250 mL、0.10 mol/L 的同种溶质溶液。','计算应取储备液体积。','稀释不发生反应或损失；定容至最终 250 mL，不能把它当成加水体积。',[
      ['写出稀释前后物质的量守恒。',L`c_1V_1=c_2V_2`],['用一致的体积单位代入。',L`V_1=\frac{0.10\cdot250}{2.0}=12.5\,\mathrm{mL}`],['核对溶质物质的量。',L`n=2.0\cdot0.0125=0.025\,\mathrm{mol}`]
    ],'取 12.5 mL 储备液，再稀释并定容至 250 mL。','chemistry-dilution'],
    ['decay','一级反应的浓度与半衰期','first order kinetics|半衰期','恒体积体系初始浓度 0.80 mol/L，一级速率常数 k=0.20 min⁻¹。','求 5 min 后浓度与半衰期。','单一不可逆一级消耗、温度及 k 恒定，无流入流出；时间以 min 计。',[
      ['代入一级积分速率式。',L`c(5)=0.80e^{-0.20\cdot5}\approx0.2943\,\mathrm{mol\,L^{-1}}`],['令浓度降至初值一半。',L`\tfrac12=e^{-kt_{1/2}}`],['求半衰期。',L`t_{1/2}=\frac{\ln2}{0.20}\approx3.4657\,\mathrm{min}`]
    ],'5 min 后浓度约 0.2943 mol/L，半衰期约 3.466 min。','chemistry-first-order']
  ]),
  ...group('economics',[
    ['npv','两期项目现金流的净现值','NPV cash flow|贴现','当前投入 1000 元，第 1、2 年末各净流入 600 元，年贴现率 10%，无其他现金流。','计算净现值。','期末现金流口径一致，初始投入为负；给定贴现率的教学算例。',[
      ['列出带符号现金流。',L`CF_0=-1000,\quad CF_1=CF_2=600`],['将两期现金流贴现到当前。',L`NPV=-1000+\frac{600}{1.1}+\frac{600}{1.1^2}`],['合计现值。',L`NPV\approx41.3223\,\text{元}`]
    ],'按给定贴现率，净现值约 41.32 元；本例不另计风险、税或残值。','economics-npv'],
    ['break-even','单产品盈亏平衡销量','break even contribution|保本','固定成本 10000 元，每件售价 80 元，单位变动成本 30 元。','求保本销量并检验利润。','单产品、产销一致、价格成本恒定；销量按整件计，贡献毛益为正。',[
      ['计算单位贡献毛益。',L`p-v=80-30=50\,\text{元/件}`],['计算保本销量。',L`Q^*=\frac{10000}{50}=200\,\text{件}`],['核对收入与总成本。',L`\pi=80\cdot200-(10000+30\cdot200)=0`]
    ],'销量 200 件时收入等于总成本，利润为零。','economics-break-even'],
    ['eoq','恒定需求下的经济订货批量','EOQ inventory|库存','年需求 D=10000 件，每次订货成本 S=50 元，每件年持有成本 H=2 元。','求连续最优批量及相关年成本。','确定恒定需求、瞬时补货、不缺货、无数量折扣；忽略与批量无关的采购成本。',[
      ['代入 EOQ。',L`Q^*=\sqrt{\frac{2DS}{H}}=\sqrt{500000}\approx707.1068\,\text{件}`],['计算最优点订货成本与持有成本。',L`\frac{D}{Q^*}S=\frac{Q^*}{2}H\approx707.1068\,\text{元/年}`],['合计相关年成本。',L`C(Q^*)\approx1414.2136\,\text{元/年}`]
    ],'连续解约 707.11 件；若只允许整件，应比较邻近整数的成本。','economics-eoq']
  ]),
  ...group('biology',[
    ['cross','单因子杂交的基因型份额','Punnett monohybrid|孟德尔|杂交','两个亲本均为 Aa，A 与 a 是同一常染色体位点的一对等位基因。','列出后代理论基因型份额。','等概率分离、随机受精，无选择、突变或配子存活差异；不由字母大小推定真实表型。',[
      ['每个亲本的配子概率。',L`P(A)=P(a)=\tfrac12`],['独立组合配子。',L`P(AA)=\tfrac14,\quad P(Aa)=\tfrac14+\tfrac14=\tfrac12`],['求剩余基因型并检查归一。',L`P(aa)=\tfrac14,\quad \tfrac14+\tfrac12+\tfrac14=1`]
    ],'AA、Aa、aa 的理论份额为 1/4、1/2、1/4；不保证有限后代数量恰为该比例。','biology-hardy-weinberg','monohybrid'],
    ['enzyme','米氏动力学的初始速率','Michaelis Menten enzyme|酶动力学','Vmax=100 μmol/min，Km=2 mmol/L，底物浓度 S=3 mmol/L。','求初始反应速率及最大速率的占比。','单底物、初速、底物远多于酶，稳态近似，无协同效应与产物逆反应。',[
      ['Km 与底物浓度使用相同单位。',L`K_m+S=5\,\mathrm{mmol\,L^{-1}}`],['代入米氏方程。',L`v_0=\frac{V_{\max}S}{K_m+S}=\frac{100\cdot3}{2+3}=60\,\mathrm{\mu mol\,min^{-1}}`],['求最大速率占比。',L`\frac{v_0}{V_{\max}}=0.60`]
    ],'初始速率 60 μmol/min，为最大速率的 60%。','biology-michaelis-menten'],
    ['growth','密度制约下的瞬时种群增长','logistic population growth|生态','当前 N=200，环境容纳量 K=1000，内禀增长率 r=0.5 年⁻¹。','求当前时刻的增长速率。','连续单种群逻辑斯蒂模型；K、r 恒定，无时间滞后或随机扰动，不将瞬时速率当成年净增量。',[
      ['求剩余容纳比例。',L`1-\frac NK=1-\frac{200}{1000}=0.8`],['计算瞬时速率。',L`\frac{dN}{dt}=rN(1-N/K)=0.5\cdot200\cdot0.8=80\,\text{个体/年}`],['求当前人均瞬时增长率。',L`\frac1N\frac{dN}{dt}=0.4\,\mathrm{yr^{-1}}`]
    ],'当前瞬时增长速率为 80 个体/年；未来一年增长量需积分或求解模型。','biology-logistic-growth']
  ])
];
PROFESSIONAL_CASES.find(c=>c.id==='case-biology-cross')!.reference={title:'OpenStax · Biology 2e',url:'https://openstax.org/books/biology-2e/pages/12-3-laws-of-inheritance',section:'12.3 Laws of Inheritance — monohybrid crosses'};
export function caseReference(c:ProfessionalCase){const formula=PROFESSIONAL_FORMULAS.find(f=>f.id===c.formulaId);if(!formula)throw Error(`案例关联公式不存在：${c.formulaId}`);return c.reference??formula.reference;}
export function caseSource(c:ProfessionalCase){return `\\begin{aligned}${c.steps.map(step=>`&${step.latex}`).join('\\\\')}\\end{aligned}`;}
export function caseText(c:ProfessionalCase){const ref=caseReference(c);return `${SUBJECT_NAMES[c.subject]} · ${c.title}\n\n已知：${c.given}\n问题：${c.question}\n条件：${c.conditions}\n\n${c.steps.map((s,i)=>`${i+1}. ${s.explanation}\n   ${s.latex}`).join('\n')}\n\n结论：${c.result}\n\n方法来源：${ref.title} · ${ref.section}\n${ref.url}\n本题数值和讲解为项目原创教学案例；修改源码不会自动重算。`;}
export function filterCases(subject:string,query:string){const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);return PROFESSIONAL_CASES.filter(c=>(!subject||c.subject===subject)&&words.every(word=>[c.title,SUBJECT_NAMES[c.subject],...c.aliases,c.given,c.question].join(' ').toLocaleLowerCase().includes(word)));}
