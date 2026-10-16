import {createFormulaGroup as group,type FormulaPlacement} from './formula-definition';

const physics=(section:string)=>({title:'OpenStax · University Physics Volume 2',url:`https://openstax.org/books/university-physics-volume-2/pages/${section}`,section});
const signals=(section:string)=>({title:section.toLowerCase().includes('discrete fourier')?'MIT 2.161 · Signal Processing':'MIT 6.003 · Signals and Systems',url:section.toLowerCase().includes('discrete fourier')?'https://ocw.mit.edu/courses/2-161-signal-processing-continuous-and-discrete-fall-2008/resources/lecture_11/':'https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/pages/lecture-notes/',section});
const control=(section:string)=>({title:'University of Michigan · Control Tutorials',url:`https://ctms.engin.umich.edu/CTMS/?example=Introduction&section=${section}`,section});
const communications=(section:string)=>({title:section.includes('modulation')?'MIT · Signals and Systems: Modulation':'MIT · Digital Communication Systems',url:section.includes('modulation')?'https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/pages/lecture-notes/':'https://ocw.mit.edu/courses/6-02-introduction-to-eecs-ii-digital-communication-systems-fall-2012/pages/readings/',section});
const statistics=(section:string,page:string)=>({title:'NIST/SEMATECH · e-Handbook of Statistical Methods',url:`https://www.itl.nist.gov/div898/handbook/${page}.htm`,section});
const openStatistics=(section:string)=>({title:'OpenStax · Introductory Statistics 2e',url:`https://openstax.org/books/introductory-statistics-2e/pages/${section}`,section});

export const ELECTRONICS_FORMULAS=[
  ...group('electronics','电路基础','basic',[
    ['ohm','欧姆定律','Ohm law voltage current resistance','{${1:U}}={${2:I}}{${3:R}}','1:电阻两端电压；2:电流；3:电阻','线性电阻、被动符号约定；电流流入电压正端，R≥0。',physics('9-4-ohms-law')],
    ['kcl','基尔霍夫电流定律','KCL Kirchhoff current law','\\sum_{${1:k}=1}^{${2:n}}{${3:I}}_{${1}}=0','1:支路指标；2:节点支路数；3:带符号的支路电流名称','集总电路节点无净电荷积累；统一约定流入为正、流出为负。',physics('10-3-kirchhoffs-rules')],
    ['kvl','基尔霍夫电压定律','KVL Kirchhoff voltage law','\\sum_{${1:k}=1}^{${2:n}}{${3:U}}_{${1}}=0','1:回路元件指标；2:元件数；3:沿选定绕行方向的电压变化名称','集总电路、回路不链接未计入模型的时变磁通；升压为正、降压为负。',physics('10-3-kirchhoffs-rules')],
    ['divider','电阻分压','voltage divider','{${1:U_o}}={${2:U_i}}\\frac{{${3:R_2}}}{{${4:R_1}}+{${3}}}','1:下端电阻两端的输出电压；2:串联两电阻的输入电压；3:下端电阻；4:上端电阻','两只串联电阻，输出无负载或负载已计入等效电阻；分母不为零。',physics('10-2-resistors-in-series-and-parallel')],
    ['rc-step','RC 充电响应','RC charging step response time constant','{${1:u_C}}({${2:t}})={${3:U}}\\left(1-e^{-{${2}}/({${4:R}}{${5:C}})}\\right)','1:电容电压函数；2:阶跃后时间；3:直流阶跃幅值；4:串联电阻；5:电容','理想串联 RC、初始电容电压为 0，R,C>0、t≥0；时间常数 τ=RC。',physics('10-5-rc-circuits')]
  ]),
  ...group('electronics','交流与暂态','basic',[
    ['rlc-impedance','串联 RLC 阻抗','RLC impedance reactance','{${1:Z}}={${2:R}}+j\\left({${3:\\omega}}{${4:L}}-\\frac{1}{{${3}}{${5:C}}}\\right)','1:复阻抗；2:串联电阻；3:角频率；4:电感；5:电容','正弦稳态，采用 e^{jωt} 约定，j²=−1；ω,L,C>0，ω 的单位 rad/s。',physics('15-3-rlc-series-circuits-with-ac')],
    ['phasor-ohm','相量欧姆定律','phasor Ohm law','{${1:\\underline{U}}}={${2:Z}}{${3:\\underline{I}}}','1:电压相量；2:复阻抗；3:电流相量','线性集总电路正弦稳态；电压、电流相量统一使用有效值或统一使用峰值，不混用。',physics('15-3-rlc-series-circuits-with-ac')],
    ['active-power','交流有功功率','AC active real power RMS','{${1:P}}={${2:U_{\\mathrm{rms}}}}{${3:I_{\\mathrm{rms}}}}\\cos{${4:\\varphi}}','1:平均有功功率；2:电压有效值；3:电流有效值；4:电压超前电流的相位角','同频正弦稳态、被动符号约定；φ 用弧度，不能将峰值直接代入有效值公式。',physics('15-4-power-in-an-ac-circuit')],
    ['resonance','LC 谐振角频率','LC resonance angular frequency','{${1:\\omega_0}}=\\frac{1}{\\sqrt{{${2:L}}{${3:C}}}}','1:谐振角频率；2:电感；3:电容','理想串联 RLC 的电抗抵消频率，L,C>0；单位 rad/s，普通频率 f₀=ω₀/(2π)。',physics('15-5-resonance-in-an-ac-circuit')],
    ['rl-step','RL 电流阶跃响应','RL current step response time constant','{${1:i}}({${2:t}})=\\frac{{${3:U}}}{{${4:R}}}\\left(1-e^{-{${4}}{${2}}/{${5:L}}}\\right)','1:电感电流函数；2:阶跃后时间；3:直流阶跃幅值；4:串联电阻；5:电感','理想串联 RL、初始电感电流为 0，R,L>0、t≥0；时间常数 τ=L/R。',physics('14-4-rl-circuits')]
  ]),
  ...group('electronics','信号与变换','advanced',[
    ['convolution','连续时间卷积','continuous convolution LTI','{${1:y}}({${2:t}})=\\int_{-\\infty}^{\\infty}{${3:x}}({${4:\\tau}}){${5:h}}({${2}}-{${4}})\\,d{${4}}','1:输出信号；2:时间；3:输入信号；4:积分变量；5:冲激响应','线性时不变系统的零状态响应；积分按适当意义存在。',signals('Convolution and impulse response')],
    ['fourier','连续傅里叶变换','Fourier transform CTFT','{${1:X}}({${2:f}})=\\int_{-\\infty}^{\\infty}{${3:x}}({${4:t}})e^{-j2\\pi{${2}}{${4}}}\\,d{${4}}','1:频谱函数；2:频率；3:时间信号；4:时间积分变量','采用频率 f（Hz）及负指数约定，j²=−1；不是以角频率 ω 表示的版本，积分需存在或作广义解释。',signals('Continuous-time Fourier transform')],
    ['laplace','双边拉普拉斯变换','bilateral Laplace transform','{${1:X}}({${2:s}})=\\int_{-\\infty}^{\\infty}{${3:x}}({${4:t}})e^{-{${2}}{${4}}}\\,d{${4}}','1:变换函数；2:复频率；3:原信号；4:积分变量','双边变换；必须同时说明收敛域，不能仅凭代数表达式确定原信号。',signals('Laplace transform and region of convergence')],
    ['z-transform','双边 Z 变换','bilateral Z transform','{${1:X}}({${2:z}})=\\sum_{${4:n}=-\\infty}^{\\infty}{${3:x}}[{${4}}]{${2}}^{-{${4}}}','1:变换函数；2:复变量；3:离散序列；4:整数时间指标','双边变换；需给出收敛域，z=0、∞ 是否包含由序列决定。',signals('Z transform and region of convergence')],
    ['sampling','理想采样率条件','sampling theorem Nyquist Shannon aliasing','{${1:f_s}}>2{${2:f_{\\max}}}','1:采样频率；2:信号最高频率','严格带限、均匀理想采样、理想重建的充分条件；单位 Hz，实际系统还需抗混叠滤波和过渡带。',signals('Sampling and reconstruction')]
  ]),
  ...group('electronics','自动控制','advanced',[
    ['transfer','传递函数','transfer function SISO','{${1:G}}({${2:s}})=\\frac{{${3:Y}}({${2}})}{{${4:U}}({${2}})}','1:传递函数；2:拉普拉斯复变量；3:输出变换；4:输入变换','线性时不变、单输入单输出、零初始条件；在变换与比值有定义处成立。',control('SystemModeling')],
    ['feedback','负反馈闭环传递函数','negative feedback closed loop','{${1:T}}({${2:s}})=\\frac{{${3:G}}({${2}})}{1+{${3}}({${2}}){${4:H}}({${2}})}','1:闭环参考输入至输出的传递函数；2:复变量；3:前向通道传递函数；4:反馈通道传递函数','标准单环负反馈、零初始条件；分母不为零处的表达式，本式不保证闭环稳定。',control('ControlSystemDesign')],
    ['pid','连续 PID 控制律','PID proportional integral derivative','{${1:u}}({${3:t}})={${4:K_p}}{${2:e}}({${3}})+{${5:K_i}}\\int_0^{${3}}{${2}}({${7:\\tau}})\\,d{${7}}+{${6:K_d}}\\frac{d{${2}}({${3}})}{d{${3}}}','1:控制输出；2:参考值减测量值的误差；3:时间；4:比例增益；5:积分增益；6:微分增益；7:积分变量','理想并联连续形式、积分初值为 0；实际实现需考虑微分滤波、饱和与积分抗饱和，不提供整定结果。',control('ControlPID')],
    ['state-space','连续状态空间模型','state space LTI','\\begin{aligned}\\dot{{${1:\\mathbf{x}}}}&={${2:A}}{${1}}+{${3:B}}{${4:\\mathbf{u}}}\\\\{${5:\\mathbf{y}}}&={${6:C}}{${1}}+{${7:D}}{${4}}\\end{aligned}','1:状态向量；2:状态矩阵；3:输入矩阵；4:输入向量；5:输出向量；6:输出矩阵；7:直通矩阵','连续线性时不变模型，矩阵维度匹配；各向量为时间函数，初始状态另给。',control('SystemModeling')],
    ['second-order','标准二阶系统','second order damping natural frequency','{${1:G}}({${2:s}})=\\frac{{${3:\\omega_n}}^2}{{${2}}^2+2{${4:\\zeta}}{${3}}{${2}}+{${3}}^2}','1:传递函数；2:复变量；3:无阻尼自然角频率；4:阻尼比','单位静态增益、无零点标准形式，ω_n>0；ζ>0 时渐近稳定，0<ζ<1 为欠阻尼。',control('SystemAnalysis')]
  ]),
  ...group('electronics','通信原理','advanced',[
    ['am','常规调幅信号','AM amplitude modulation','{${1:s}}({${2:t}})={${3:A_c}}[1+{${4:k_a}}{${5:m}}({${2}})]\\cos(2\\pi{${6:f_c}}{${2}})','1:调幅信号；2:时间；3:载波幅值；4:幅度灵敏度；5:基带消息；6:载波频率','带载波双边带 AM，载波频率以 Hz 计；常规包络检波避免过调制需 |k_a m(t)|≤1，等号为边界。',communications('Amplitude modulation')],
    ['fm','调频信号','FM frequency modulation','{${1:s}}({${2:t}})={${3:A_c}}\\cos\\left(2\\pi{${4:f_c}}{${2}}+2\\pi{${5:k_f}}\\int_0^{${2}}{${6:m}}({${7:\\tau}})\\,d{${7}}\\right)','1:调频信号；2:时间；3:载波幅值；4:载波频率；5:频率灵敏度；6:基带消息；7:积分变量','初相位取 0，f_c 以 Hz 计，k_f 以 Hz/消息单位计；瞬时频率为 f_c+k_f m(t)。',communications('Angle and frequency modulation')],
    ['bpsk','相干 BPSK 误码率','BPSK BER bit error probability AWGN','{${1:P_b}}=\\frac{1}{2}\\operatorname{erfc}\\left(\\sqrt{\\frac{{${2:E_b}}}{{${3:N_0}}}}\\right)','1:比特错误概率；2:每比特能量；3:噪声功率谱密度参数','等概率、未编码、理想相干 BPSK，AWGN 双边噪声功率谱密度为 N₀/2；E_b≥0、N₀>0。',communications('Chapter 9: binary signaling over AWGN')],
    ['shannon','香农信道容量','Shannon channel capacity AWGN','{${1:C}}={${2:B}}\\log_2\\left(1+\\frac{{${3:S}}}{{${4:N}}}\\right)','1:容量（bit/s）；2:带宽（Hz）；3:接收信号平均功率；4:同一带宽内噪声平均功率','带宽受限 AWGN 信道、平均功率约束；B>0、S≥0、N>0，S/N 使用线性功率比而非 dB。',communications('Shannon capacity for a band-limited AWGN channel')],
    ['nyquist-rate','奈奎斯特无噪声码率','Nyquist noiseless data rate','{${1:R_b}}\\le 2{${2:B}}\\log_2{${3:M}}','1:理想比特率上界（bit/s）；2:理想低通信道带宽（Hz）；3:每符号可区分电平数','理想无噪声、带限、零码间干扰的实低通信道；M≥2 为整数，本式不考虑噪声和编码开销。',communications('Nyquist symbol rate and bits per symbol')]
  ]),
  ...group('electronics','数字信号处理','advanced',[
    ['dft','离散傅里叶变换','DFT discrete Fourier transform','{${1:X}}[{${2:k}}]=\\sum_{${3:n}=0}^{${4:N}-1}{${5:x}}[{${3}}]e^{-j2\\pi{${2}}{${3}}/{${4}}}','1:频域序列；2:频率指标；3:时间指标；4:变换点数；5:时域序列','N 为正整数，k=0…N−1；采用正变换不归一化、负指数，j²=−1。',signals('Discrete Fourier transform')],
    ['idft','离散傅里叶逆变换','IDFT inverse discrete Fourier transform','{${1:x}}[{${2:n}}]=\\frac{1}{{${3:N}}}\\sum_{${4:k}=0}^{${3}-1}{${5:X}}[{${4}}]e^{j2\\pi{${4}}{${2}}/{${3}}}','1:时域序列；2:时间指标；3:变换点数；4:频率指标；5:频域序列','与本库 DFT 配对；逆变换含 1/N，n=0…N−1，j²=−1。',signals('Inverse discrete Fourier transform')],
    ['discrete-convolution','离散时间线性卷积','discrete linear convolution','{${1:y}}[{${2:n}}]=\\sum_{${3:k}=-\\infty}^{\\infty}{${4:x}}[{${3}}]{${5:h}}[{${2}}-{${3}}]','1:输出序列；2:整数时间指标；3:求和指标；4:输入序列；5:冲激响应','离散 LTI 系统的零状态响应，和式需收敛；这是线性卷积，不是有限点循环卷积。',signals('Discrete-time convolution')],
    ['fir','FIR 滤波器传递函数','FIR finite impulse response filter','{${1:H}}({${2:z}})=\\sum_{${3:k}=0}^{${4:M}}{${5:b}}_{${3}}{${2}}^{-{${3}}}','1:传递函数；2:Z 变换变量；3:延迟指标；4:滤波器阶数；5:抽头系数名称','因果 M 阶 FIR，M≥0 为整数、共 M+1 个抽头；零初始状态。',signals('Difference equations and system functions')],
    ['iir','IIR 差分方程','IIR infinite impulse response difference equation','{${1:y}}[{${2:n}}]=\\sum_{${3:k}=0}^{${4:M}}{${5:b}}_{${3}}{${6:x}}[{${2}}-{${3}}]-\\sum_{${3}=1}^{${7:N}}{${8:a}}_{${3}}{${1}}[{${2}}-{${3}}]','1:输出序列；2:时间指标；3:求和指标；4:前馈阶数；5:前馈系数名称；6:输入序列；7:反馈阶数；8:反馈系数名称','采用 a₀=1 的归一化约定，M≥0、N≥1 为整数；初始状态需另给，系数不自动保证稳定。',signals('Linear constant-coefficient difference equations')]
  ])
];

export const STATISTICS_SHARED:Record<string,FormulaPlacement>={
  'math-normalpdf':{subject:'statistics',topic:'概率分布',level:'basic'},
  'computer-conditional':{subject:'statistics',topic:'概率与抽样',level:'basic'},
  'computer-total-probability':{subject:'statistics',topic:'概率与抽样',level:'basic'},
  'computer-bayes':{subject:'statistics',topic:'概率与抽样',level:'basic'},
  'computer-linear-regression':{subject:'statistics',topic:'回归与拟合',level:'advanced'},
  'computer-mse':{subject:'statistics',topic:'回归与拟合',level:'advanced'}
};
export const NEW_STATISTICS_FORMULAS=[
  ...group('statistics','描述统计','basic',[
    ['mean','样本均值','sample mean average','{${1:\\bar{x}}}=\\frac{1}{{${2:n}}}\\sum_{${3:i}=1}^{${2}}{${4:x}}_{${3}}','1:样本均值符号；2:样本量；3:样本指标；4:观测值名称','n≥1 为整数；算术平均，不是加权平均；缺失值处理需先明确。',statistics('1.3.5.1 Measures of Location','eda/section3/eda351')],
    ['variance','样本方差','sample variance unbiased Bessel','{${1:s}}^2=\\frac{1}{{${2:n}}-1}\\sum_{${3:i}=1}^{${2}}({${4:x}}_{${3}}-{${5:\\bar{x}}})^2','1:样本标准差名称；2:样本量；3:样本指标；4:观测值名称；5:样本均值','n≥2，采用 n−1 分母；无偏性需独立同分布且总体方差有限。',statistics('1.3.5.6 Measures of Scale','eda/section3/eda356')],
    ['stddev','样本标准差','sample standard deviation','{${1:s}}=\\sqrt{\\frac{1}{{${2:n}}-1}\\sum_{${3:i}=1}^{${2}}({${4:x}}_{${3}}-{${5:\\bar{x}}})^2}','1:样本标准差；2:样本量；3:样本指标；4:观测值名称；5:样本均值','n≥2，是样本方差的非负平方根；标准差本身一般不是总体标准差的无偏估计。',statistics('1.3.5.6 Measures of Scale','eda/section3/eda356')],
    ['covariance','样本协方差','sample covariance','{${1:s_{xy}}}=\\frac{1}{{${2:n}}-1}\\sum_{${3:i}=1}^{${2}}({${4:x}}_{${3}}-{${5:\\bar{x}}})({${6:y}}_{${3}}-{${7:\\bar{y}}})','1:样本协方差；2:成对样本量；3:配对指标；4:x 观测名称；5:x 样本均值；6:y 观测名称；7:y 样本均值','n≥2，使用相同配对观测和 n−1 分母；无偏性需独立同分布配对且二阶矩有限。',openStatistics('12-3-the-regression-equation')],
    ['pearson','皮尔逊相关系数','Pearson correlation coefficient','{${1:r}}=\\frac{\\sum_{${2:i}=1}^{${3:n}}({${4:x}}_{${2}}-{${5:\\bar{x}}})({${6:y}}_{${2}}-{${7:\\bar{y}}})}{\\sqrt{\\sum_{${2}=1}^{${3}}({${4}}_{${2}}-{${5}})^2\\sum_{${2}=1}^{${3}}({${6}}_{${2}}-{${7}})^2}}','1:样本相关系数；2:配对指标；3:样本量；4:x 观测名称；5:x 均值；6:y 观测名称；7:y 均值','成对观测、n≥2，两变量均须有非零样本变异；衡量线性关联，不表示因果关系。',openStatistics('12-3-the-regression-equation')]
  ]),
  ...group('statistics','概率分布','basic',[
    ['binomial','二项分布概率质量','binomial distribution PMF','P({${1:X}}={${2:k}})=\\binom{${3:n}}{${2}}{${4:p}}^{${2}}(1-{${4}})^{{${3}}-{${2}}}','1:成功次数随机变量；2:成功次数；3:试验次数；4:单次成功概率','n≥0 为整数、k=0…n、0≤p≤1；各次伯努利试验独立且成功概率相同。',openStatistics('4-3-binomial-distribution')],
    ['poisson','泊松分布概率质量','Poisson distribution PMF','P({${1:X}}={${2:k}})=\\frac{e^{-{${3:\\lambda}}}{${3}}^{${2}}}{{${2}}!}','1:计数随机变量；2:计数值；3:该区间内平均计数','λ>0，k 为非负整数；λ=0 的退化情形单独定义为 P(X=0)=1。',openStatistics('4-6-poisson-distribution')],
    ['exponential','指数分布概率密度','exponential distribution rate PDF','{${1:f}}({${2:x}})=\\begin{cases}{${3:\\lambda}}e^{-{${3}}{${2}}},&{${2}}\\ge0\\\\0,&{${2}}<0\\end{cases}','1:概率密度函数；2:取值；3:速率参数','λ>0；使用速率参数化，均值为 1/λ，不是以均值作为参数的版本。',openStatistics('5-3-the-exponential-distribution')],
    ['uniform','均匀分布概率密度','uniform distribution PDF','{${1:f}}({${2:x}})=\\begin{cases}\\frac{1}{{${4:b}}-{${3:a}}},&{${3}}\\le{${2}}\\le{${4}}\\\\0,&\\text{otherwise}\\end{cases}','1:概率密度函数；2:取值；3:区间左端点；4:区间右端点','连续均匀分布，a<b；单个端点的密度定义不改变概率。',openStatistics('5-2-the-uniform-distribution')]
  ]),
  ...group('statistics','概率与抽样','basic',[
    ['standard-error','均值标准误估计','standard error mean SEM','\\widehat{\\operatorname{SE}}({${1:\\bar{x}}})=\\frac{{${2:s}}}{\\sqrt{{${3:n}}}}','1:样本均值；2:样本标准差；3:样本量','独立同分布抽样、n≥2；这是均值标准误的估计，不是观测值标准差；相关样本需另行处理。',statistics('1.3.5.2 Confidence Limits for the Mean','eda/section3/eda352')],
    ['clt','中心极限定理','CLT central limit theorem','\\frac{\\sqrt{{${1:n}}}({${2:\\bar{X}}}-{${3:\\mu}})}{{${4:\\sigma}}}\\xrightarrow{d}\\mathcal{N}(0,1)','1:趋于无穷的样本量；2:随机样本均值；3:总体均值；4:总体标准差','经典独立同分布版本，有限总体均值及方差 0<σ²<∞；分布收敛不代表任意有限样本量下精确正态。',openStatistics('7-1-the-central-limit-theorem-for-sample-means-averages')]
  ]),
  ...group('statistics','参数估计','advanced',[
    ['likelihood','独立样本似然函数','likelihood iid density','{${1:\\mathcal{L}}}({${2:\\theta}};{${3:\\mathbf{x}}})=\\prod_{${4:i}=1}^{${5:n}}{${6:f}}({${7:x}}_{${4}}\\mid{${2}})','1:似然函数；2:待估参数；3:完整观测向量；4:观测指标；5:样本量；6:概率质量或密度函数；7:单个观测名称','独立同分布样本；观测固定、参数可变，似然不是参数的后验概率密度。',statistics('8.4.1.2 Maximum likelihood estimation','apr/section4/apr412')],
    ['mle','最大似然估计','MLE maximum likelihood estimation','{${1:\\hat{\\theta}}}=\\operatorname*{arg\\,max}_{${2:\\theta}\\in{${3:\\Theta}}}{${4:\\mathcal{L}}}({${2}};{${5:\\mathbf{x}}})','1:参数估计值；2:待优化参数；3:参数空间；4:似然函数；5:固定观测向量','最大值需存在；可能有多个最大化解，需另定选取规则；不自动保证无偏性。',statistics('8.4.1.2 Maximum likelihood estimation','apr/section4/apr412')],
    ['z-interval','已知方差均值置信区间','Z interval known variance confidence interval','\\left[{${1:\\bar{x}}}-z_{1-{${4:\\alpha}}/2}\\frac{{${2:\\sigma}}}{\\sqrt{{${3:n}}}},{${1}}+z_{1-{${4}}/2}\\frac{{${2}}}{\\sqrt{{${3}}}}\\right]','1:样本均值；2:已知总体标准差；3:样本量；4:显著性水平','双侧 1−α 区间；0<α<1，σ>0，z_p 为标准正态下侧 p 分位数；正态总体独立抽样时精确，非正态大样本时近似。',statistics('7.2.2 Are the data consistent with the assumed mean?','prc/section2/prc22')],
    ['t-interval','未知方差均值置信区间','Student t interval unknown variance confidence interval','\\left[{${1:\\bar{x}}}-t_{1-{${4:\\alpha}}/2,{${3:n}}-1}\\frac{{${2:s}}}{\\sqrt{{${3}}}},{${1}}+t_{1-{${4}}/2,{${3}}-1}\\frac{{${2}}}{\\sqrt{{${3}}}}\\right]','1:样本均值；2:样本标准差；3:样本量；4:显著性水平','双侧 1−α 区间；正态总体独立抽样、n≥2、0<α<1，t_{p,ν} 为自由度 ν 的下侧 p 分位数；大样本非正态时是近似。',statistics('1.3.5.2 Confidence Limits for the Mean','eda/section3/eda352')],
    ['variance-interval','正态总体方差置信区间','chi square variance confidence interval','\\left[\\frac{({${2:n}}-1){${1:s}}^2}{\\chi^2_{1-{${3:\\alpha}}/2,{${2}}-1}},\\frac{({${2}}-1){${1}}^2}{\\chi^2_{{${3}}/2,{${2}}-1}}\\right]','1:以 n−1 为分母的样本标准差；2:样本量；3:显著性水平','正态总体独立抽样，n≥2、0<α<1；χ²_{p,ν} 定义为下侧 p 分位数，因此大分位数在区间下限的分母。',statistics('1.3.5.8 Chi-Square Test for the Variance','eda/section3/eda358')]
  ]),
  ...group('statistics','检验与方差分析','advanced',[
    ['one-sample-t','单样本 t 检验统计量','one sample Student t test','{${1:t}}=\\frac{{${2:\\bar{x}}}-{${3:\\mu_0}}}{{${4:s}}/\\sqrt{{${5:n}}}}','1:检验统计量；2:样本均值；3:原假设总体均值；4:样本标准差；5:样本量','独立正态样本，n≥2、s>0；原假设下服从 t_{n−1}，单侧或双侧拒绝域须另给；非正态大样本下是近似。',statistics('1.3.5.2 Confidence Limits for the Mean','eda/section3/eda352')],
    ['welch','Welch 双样本 t 检验','Welch unequal variance t test Satterthwaite','\\begin{aligned}{${1:t}}&=\\frac{{${2:\\bar{x}_1}}-{${3:\\bar{x}_2}}-{${8:\\delta_0}}}{\\sqrt{{${4:s_1}}^2/{${6:n_1}}+{${5:s_2}}^2/{${7:n_2}}}}\\\\{${9:\\nu}}&=\\frac{({${4}}^2/{${6}}+{${5}}^2/{${7}})^2}{({${4}}^2/{${6}})^2/({${6}}-1)+({${5}}^2/{${7}})^2/({${7}}-1)}\\end{aligned}','1:检验统计量；2:第一组均值；3:第二组均值；4:第一组标准差；5:第二组标准差；6:第一组样本量；7:第二组样本量；8:原假设均值差；9:Welch–Satterthwaite 近似自由度','两组独立样本、组内独立，n₁,n₂≥2，合成标准误>0；不要求等方差；正态总体或足够大样本，t 分布及自由度为近似。',statistics('7.3.1 Do two processes have the same mean?','prc/section3/prc31')],
    ['chi-independence','列联表独立性检验','chi square independence contingency table','\\chi^2=\\sum_{${3:i}=1}^{${1:r}}\\sum_{${4:j}=1}^{${2:c}}\\frac{({${5:O}}_{${3}${4}}-{${6:E}}_{${3}${4}})^2}{{${6}}_{${3}${4}}}','1:行数；2:列数；3:行指标；4:列指标；5:观测频数名称；6:原假设期望频数名称','独立分类观测，r,c≥2；Eᵢⱼ=行合计×列合计/总样本量且均>0，自由度 (r−1)(c−1)；稀疏表的卡方近似可能不可靠。',openStatistics('11-3-test-of-independence')],
    ['chi-gof','卡方拟合优度统计量','chi square goodness of fit test','\\chi^2=\\sum_{${1:i}=1}^{${2:k}}\\frac{({${3:O}}_{${1}}-{${4:E}}_{${1}})^2}{{${4}}_{${1}}}','1:类别指标；2:类别数；3:观测频数名称；4:原假设期望频数名称','独立观测、互斥完备类别，各 Eᵢ>0 且计数充分；通常自由度 k−1−m，m 是从本样本估计的分布参数数目，需满足适用的正则条件。',statistics('1.3.5.15 Chi-Square Goodness-of-Fit Test','eda/section3/eda35f')],
    ['anova','单因素方差分析 F 统计量','ANOVA one way analysis variance F test','{${1:F}}=\\frac{{${2:SS_{\\mathrm{between}}}}/({${4:k}}-1)}{{${3:SS_{\\mathrm{within}}}}/({${5:N}}-{${4}})}','1:F 统计量；2:组间平方和；3:组内平方和；4:组数；5:总样本量','独立观测、组内正态、各组总体方差相等，N>k≥2 且组内平方和>0；原假设各组均值相等，自由度 (k−1,N−k)。',statistics('3.2.3.1 One-Way ANOVA','ppc/section2/ppc231')]
  ]),
  ...group('statistics','回归与拟合','advanced',[
    ['ols-slope','简单线性回归斜率','OLS simple linear regression slope least squares','{${1:\\hat{\\beta}_1}}=\\frac{\\sum_{${7:i}=1}^{${6:n}}({${2:x}}_{${7}}-{${4:\\bar{x}}})({${3:y}}_{${7}}-{${5:\\bar{y}}})}{\\sum_{${7}=1}^{${6}}({${2}}_{${7}}-{${4}})^2}','1:斜率估计；2:x 观测名称；3:y 观测名称；4:x 样本均值；5:y 样本均值；6:成对样本量；7:配对指标','含截距的简单普通最小二乘拟合；分母>0；估计公式本身不要求正态误差，统计推断需额外假设。',statistics('4.1.4.1 Linear Least Squares Regression','pmd/section1/pmd141')],
    ['r-squared','决定系数','R squared coefficient determination','{${1:R}}^2=1-\\frac{\\sum_{${6:i}=1}^{${5:n}}({${2:y}}_{${6}}-{${3:\\hat{y}}}_{${6}})^2}{\\sum_{${6}=1}^{${5}}({${2}}_{${6}}-{${4:\\bar{y}}})^2}','1:决定系数名称；2:真实值名称；3:拟合值名称；4:真实值样本均值；5:样本量；6:样本指标','总平方和>0；含截距 OLS 的训练集 R² 通常在 [0,1]，其他模型或测试集可为负，不能据此声称因果。',openStatistics('12-3-the-regression-equation')],
    ['residual','回归残差','regression residual','{${1:e}}_{${2:i}}={${3:y}}_{${2}}-{${4:\\hat{y}}}_{${2}}','1:残差名称；2:观测指标；3:实际观测值名称；4:相应预测值名称','采用观测减拟合的符号约定；残差不同于不可观测的总体误差项。',statistics('4.1.4.1 Linear Least Squares Regression','pmd/section1/pmd141')]
  ])
];
