import {createFormulaGroup as group} from './formula-definition';

const economy=(section:string)=>({title:'OpenStax · Principles of Economics 3e',url:`https://openstax.org/books/principles-economics-3e/pages/${section}`,section});
const growth=(section:string)=>({title:'MIT 14.452 · Economic Growth',url:'https://ocw.mit.edu/courses/14-452-economic-growth-fall-2016/pages/lecture-notes/',section});
const finance=(section:string)=>({title:'OpenStax · Principles of Finance',url:`https://openstax.org/books/principles-finance/pages/${section}`,section});
const inventory=(section:string)=>({title:'MIT ESD.273J · Logistics and Supply Chain Management',url:'https://ocw.mit.edu/courses/esd-273j-logistics-and-supply-chain-management-fall-2009/pages/lecture-notes/',section});
const queues=(section:string)=>({title:'MIT 1.203J · Logistical and Transportation Planning Methods',url:'https://ocw.mit.edu/courses/1-203j-logistical-and-transportation-planning-methods-fall-2006/resources/lec5/',section});

export const ECONOMICS_FORMULAS=[
  ...group('economics','供需与弹性','basic',[
    ['linear-demand','线性需求函数','linear demand price quantity','{${1:Q_d}}={${2:a}}-{${3:b}}{${4:P}}','1:需求量；2:截距；3:价格系数；4:价格','局部线性需求模型、其他因素不变，b>0，仅在 P≥0 且 Q_d≥0 的范围使用。',economy('3-1-demand-supply-and-equilibrium-in-markets-for-goods-and-services')],
    ['price-elasticity','需求价格点弹性','point price elasticity demand','{${1:\\varepsilon_d}}=\\frac{d{${2:Q}}}{d{${3:P}}}\\frac{{${3}}}{{${2}}}','1:带符号的点弹性；2:需求量函数；3:价格','需求可微、P,Q>0；保留负号约定，普通向下倾斜需求为负，报告绝对值时另取模；不是弧弹性。',economy('5-1-price-elasticity-of-demand-and-price-elasticity-of-supply')],
    ['linear-equilibrium','线性供需均衡价格','linear supply demand equilibrium price','{${1:P^*}}=\\frac{{${2:a}}-{${3:c}}}{{${4:b}}+{${5:d}}}','1:均衡价格；2:需求截距；3:供给截距；4:需求斜率大小；5:供给斜率','设 Q_d=a−bP、Q_s=c+dP，b,d>0；均衡价格和数量须落在模型可行范围。',economy('3-1-demand-supply-and-equilibrium-in-markets-for-goods-and-services')],
    ['profit','利润恒等式','profit revenue total cost','{${1:\\pi}}={${2:R}}-{${3:C}}','1:利润；2:总收入；3:总成本','收入成本对应同一时期与口径；经济利润计机会成本，会计利润按会计成本定义。',economy('7-1-explicit-and-implicit-costs-and-accounting-and-economic-profit')],
    ['marginal-cost','边际成本','marginal cost derivative','{${1:MC}}({${2:Q}})=\\frac{d{${3:C}}({${2}})}{d{${2}}}','1:边际成本函数；2:产量；3:总成本函数','连续产量、成本可微；离散生产应采用差分增量成本，固定成本导数为零。',economy('7-3-costs-in-the-short-run')]
  ]),
  ...group('economics','生产与市场','advanced',[
    ['cobb-douglas','柯布—道格拉斯生产函数','Cobb Douglas production function','{${1:Y}}={${2:A}}{${3:K}}^{${4:\\alpha}}{${5:L}}^{${6:\\beta}}','1:产出；2:技术水平；3:资本投入；4:资本弹性；5:劳动投入；6:劳动弹性','A,K,L>0，α,β>0；规模报酬由 α+β 决定，不默认等于 1。',growth('Production functions and returns to scale')],
    ['marginal-labor','柯布—道格拉斯劳动边际产出','Cobb Douglas marginal product labor MPL','{${1:MPL}}={${2:\\beta}}{${3:A}}{${4:K}}^{${5:\\alpha}}{${6:L}}^{{${2}}-1}','1:劳动边际产出；2:劳动弹性；3:技术水平；4:资本；5:资本弹性；6:劳动','对 Y=AK^αL^β 在资本及技术固定时求偏导；A,K,L>0，β>0。',growth('Production functions: marginal products')],
    ['profit-optimum','利润内点一阶条件','profit maximization marginal revenue cost','{${1:MR}}({${2:Q^*}})={${3:MC}}({${2}})','1:边际收入函数；2:最优内点产量；3:边际成本函数','可微、无额外约束的利润内点必要条件；需进一步检查二阶条件、边界和停产选项，单凭等式不能保证最大值。',economy('9-2-how-a-profit-maximizing-monopoly-chooses-output-and-price')],
    ['lerner','勒纳加成指数','Lerner monopoly markup elasticity','\\frac{{${1:P}}-{${2:MC}}}{{${1}}}=-\\frac{1}{{${3:\\varepsilon_d}}}','1:价格；2:边际成本；3:带符号需求点弹性','单产品垄断、可微向下需求、内点利润最大化、P>0、ε_d<−1；不适用于任意观测企业的机械推断。',economy('9-2-how-a-profit-maximizing-monopoly-chooses-output-and-price')],
    ['budget','两商品预算约束','consumer budget constraint','{${1:p_x}}{${2:x}}+{${3:p_y}}{${4:y}}\\le{${5:I}}','1:商品 x 单价；2:x 数量；3:商品 y 单价；4:y 数量；5:可支配预算','单期、两商品、无借贷，价格>0、数量与预算≥0；不等式为可行集，等式为用尽预算的边界。',economy('2-1-how-individuals-make-choices-based-on-their-budget-constraint')]
  ]),
  ...group('economics','宏观核算','basic',[
    ['gdp','支出法 GDP','GDP expenditure identity','{${1:Y}}={${2:C}}+{${3:I}}+{${4:G}}+{${5:X}}-{${6:M}}','1:国内生产总值；2:消费；3:国内总投资；4:政府购买；5:出口；6:进口','同一核算期与价格口径；投资是实际资本形成，政府转移支付不直接计入 G，进口扣除避免计入国外产出。',economy('19-1-measuring-the-size-of-the-economy-gross-domestic-product')],
    ['nominal-gdp','当期价格 GDP','nominal GDP current prices','{${1:Y_N}}=\\sum_{${2:i}=1}^{${3:n}}{${4:p}}_{${2}}{${5:q}}_{${2}}','1:名义 GDP；2:最终产品指标；3:产品种类数；4:当期价格名称；5:当期产量名称','同一时期境内最终产品与服务；避免中间品重复，价格产量计量范围一致。',economy('19-1-measuring-the-size-of-the-economy-gross-domestic-product')],
    ['gdp-deflator','GDP 平减指数','GDP deflator nominal real','{${1:D}}=100\\frac{{${2:Y_N}}}{{${3:Y_R}}}','1:GDP 平减指数；2:名义 GDP；3:实际 GDP','相同产出范围及时期，Y_R>0；基年指数为 100，跨基年比较需链接口径。',economy('19-2-adjusting-nominal-values-to-real-values')],
    ['cpi','固定篮子消费价格指数','CPI Laspeyres fixed basket','{${1:CPI_t}}=100\\frac{\\sum_{${2:i}}{${3:p}}_{${2},${4:t}}{${5:q}}_{${2},0}}{\\sum_{${2}}{${3}}_{${2},0}{${5}}_{${2},0}}','1:当期价格指数；2:商品指标；3:价格名称；4:当期指标；5:基期篮子数量名称','教学用固定篮子 Laspeyres 形式，分母>0、基期指数 100；实际统计可能采用更新权重及其他链接规则。',economy('22-2-how-to-measure-changes-in-the-cost-of-living')],
    ['fisher','实际利率费雪关系','Fisher real nominal interest inflation','1+{${1:i}}=(1+{${2:r}})(1+{${3:\\pi}})','1:名义利率；2:实际利率；3:同一期通胀率','利率均为同一期间的小数有效率且>−1；预期通胀对应事前实际利率，实际通胀对应事后实际利率；非近似 i=r+π。',finance('7-4-applications-of-tvm-in-finance')]
  ]),
  ...group('economics','增长与货币','advanced',[
    ['growth-rate','离散增长率','discrete growth rate percentage change','{${1:g_t}}=\\frac{{${2:Y_t}}-{${3:Y_{t-1}}}}{{${3}}}','1:当期增长率；2:本期水平；3:上期水平','上期水平>0，口径及价格基准一致；公式给小数，百分数另乘 100%，不是对数增长率。',economy('19-3-tracking-real-gdp-over-time')],
    ['compound','单期复利终值','compound interest future value','{${1:FV}}={${2:PV}}(1+{${3:r}})^{${4:n}}','1:期末价值；2:期初价值；3:每期有效利率；4:期数','固定每期利率、无中途现金流，r>−1、n 为非负整数；名义年利率须先换算每期有效率。',finance('7-2-time-value-of-money-tvm-basics')],
    ['quantity','货币数量交换方程','quantity equation money velocity','{${1:M}}{${2:V}}={${3:P}}{${4:Y}}','1:货币量；2:收入流通速度；3:价格水平；4:实际产出','同一时期与货币口径，M>0，P 为基期等于 1 的价格水平比值（基期 100 的指数应先除以 100）；V=PY/M 的核算关系，只有额外假设流速与产出行为才产生因果预测。',economy('28-5-pitfalls-for-monetary-policy')],
    ['multiplier','简单支出乘数','Keynesian expenditure multiplier MPC','{${1:k}}=\\frac{1}{1-{${2:c}}}','1:支出乘数；2:边际消费倾向','简单封闭经济、固定价格、有闲置产能、无税收及进口漏出、投资与政府支出外生；0≤c<1，不代表实证乘数恒定。',economy('b-the-expenditure-output-model')],
    ['solow','索洛人均资本动态','Solow capital accumulation growth','\\dot{{${1:k}}}={${2:s}}{${3:f}}({${1}})-({${4:n}}+{${5:\\delta}}){${1}}','1:人均资本；2:储蓄率；3:人均生产函数；4:连续人口增长率；5:折旧率','无技术增长的连续时间 Solow 模型，规模报酬不变、s∈[0,1]、δ≥0；点为对时间求导，k 为每劳动者资本。',growth('Solow model without technological progress')]
  ]),
  ...group('economics','项目与决策','advanced',[
    ['present-value','单笔现金流现值','present value discounted cash flow','{${1:PV}}=\\frac{{${2:CF}}}{(1+{${3:r}})^{${4:n}}}','1:现值；2:第 n 期末现金流；3:每期贴现率；4:期数','同一币种与价格口径，r>−1、n≥0；现金流时点为期末，名义与实际贴现率须对应。',finance('7-2-time-value-of-money-tvm-basics')],
    ['npv','净现值','NPV net present value','{${1:NPV}}=\\sum_{${2:t}=0}^{${3:T}}\\frac{{${4:CF}}_{${2}}}{(1+{${5:r}})^{${2}}}','1:净现值；2:期数指标；3:末期；4:净现金流名称；5:每期贴现率','期末现金流、t=0 为当前，初始投入记负；r>−1、T 为非负整数，不含未列出的残值与风险调整。',finance('16-2-net-present-value-npv-method')],
    ['break-even','单产品盈亏平衡量','break even quantity contribution margin','{${1:Q^*}}=\\frac{{${2:F}}}{{${3:p}}-{${4:v}}}','1:盈亏平衡销量；2:固定成本；3:单价；4:单位变动成本','单产品、单价与单位变动成本恒定、产销一致，p>v、F≥0；整件销量需向上取整。',{title:'OpenStax · Principles of Accounting Volume 2',url:'https://openstax.org/books/principles-managerial-accounting/pages/3-2-calculate-a-break-even-point-in-units-and-dollars',section:'3.2 Break-Even Point in Units and Dollars'}],
    ['expected-payoff','离散决策期望收益','expected payoff decision probability','{${1:E}}=\\sum_{${2:i}=1}^{${3:n}}{${4:p}}_{${2}}{${5:R}}_{${2}}','1:期望收益；2:情景指标；3:情景数；4:情景概率名称；5:收益名称','互斥穷尽情景，p_i≥0、总和为 1；收益单位一致，此准则不包含风险厌恶或尾部损失约束。',finance('15-1-risk-and-return-to-an-individual-asset')],
    ['linear-program','线性规划标准最大化','linear programming LP standard form','\\max_{{${1:\\mathbf{x}}}\\ge0}{${2:\\mathbf{c}}}^{\\mathsf T}{${1}},\\quad {${3:A}}{${1}}\\le{${4:\\mathbf{b}}}','1:非负决策向量；2:目标系数向量；3:资源约束矩阵；4:资源上界向量','连续可分、线性目标与约束、矩阵维度匹配；不自动保证可行或有界，整数决策需额外限制。',{title:'MIT 15.053 · Optimization Methods in Management Science',url:'https://ocw.mit.edu/courses/15-053-optimization-methods-in-management-science-spring-2013/pages/lecture-notes/',section:'Linear programming formulations'}]
  ]),
  ...group('economics','运营管理','advanced',[
    ['eoq','经济订货批量','EOQ economic order quantity inventory','{${1:Q^*}}=\\sqrt{\\frac{2{${2:D}}{${3:S}}}{{${4:H}}}}','1:最优订货批量；2:每期需求量；3:每次订货固定成本；4:每单位每期持有成本','确定恒定需求、瞬时补货、不缺货、无数量折扣，D,S,H>0；需求与持有成本时间单位一致。',inventory('Inventory and EOQ Models')],
    ['reorder-point','确定需求再订货点','reorder point deterministic lead time','{${1:R}}={${2:d}}{${3:L}}','1:再订货库存位置；2:单位时间需求；3:交货提前期','需求与提前期确定且恒定、无安全库存；d≥0、L≥0，时间单位匹配，按库存位置而非仅在库量触发。',inventory('Inventory and EOQ Models: reorder point')],
    ['little','利特尔法则','Little law queue throughput lead time','{${1:L}}={${2:\\lambda}}{${3:W}}','1:系统平均在制品或顾客数；2:长期有效吞吐率；3:平均逗留时间','稳定长期平均、系统边界一致、均值有限；W 包括服务与等待，λ 是实际进入系统的有效流量，不限 M/M/1。',queues('Little’s law')],
    ['utilization','M/M/1 服务利用率','MM1 M/M/1 queue utilization','{${1:\\rho}}=\\frac{{${2:\\lambda}}}{{${3:\\mu}}}','1:单服务台利用率；2:泊松到达率；3:指数服务率','单服务台 M/M/1、无限等待空间、稳态需 0≤λ<μ；μ>0，两速率采用同一时间单位。',queues('Markovian birth-and-death queues: M/M/1')],
    ['pert','PERT 活动期望工期','PERT expected duration three point estimate','{${1:t_e}}=\\frac{{${2:a}}+4{${3:m}}+{${4:b}}}{6}','1:活动期望工期；2:乐观时间；3:最可能时间；4:悲观时间','经典 PERT 三点加权近似，0≤a≤m≤b、同一时间单位；单活动均值，不直接给出项目关键路径或按时完工概率。',{title:'MIT 1.040 · Project Management',url:'https://ocw.mit.edu/courses/1-040-project-management-spring-2004/97aa27438622aca8f4d56685302b2c98_l11dtrm2ilistic1.pdf',section:'Lecture 11, slide 44: PERT expected activity duration'}]
  ])
];
