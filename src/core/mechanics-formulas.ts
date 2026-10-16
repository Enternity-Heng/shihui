import {createFormulaGroup as group} from './formula-definition';

const solid=(section:string)=>({title:'MIT 1.050 · Engineering Mechanics for Structures',url:'https://ocw.mit.edu/courses/1-050-solid-mechanics-fall-2004/pages/readings/',section});
const material=(section:string)=>({title:'MIT 3.11 · Mechanics of Materials',url:'https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/',section});
const fluid=(section:string)=>({title:'MIT 1.060 · Engineering Mechanics II',url:'https://ocw.mit.edu/courses/1-060-engineering-mechanics-ii-spring-2006/pages/lecture-notes/',section});
const soil=(section:string)=>({title:'MIT 1.361 · Advanced Soil Mechanics',url:'https://ocw.mit.edu/courses/1-361-advanced-soil-mechanics-fall-2004/pages/lecture-notes/',section});
const dynamics=(section:string)=>({title:'MIT 2.003SC · Engineering Dynamics',url:'https://ocw.mit.edu/courses/2-003sc-engineering-dynamics-fall-2011/',section});

export const NEW_MECHANICS_FORMULAS=[
  ...group('mechanics','静力与运动','basic',[
    ['moment','力对点的矩','moment torque cross product','{${1:\\mathbf{M}_O}}={${2:\\mathbf{r}}}\\times{${3:\\mathbf{F}}}','1:力对参考点的矩；2:参考点到作用点的位置矢量；3:力矢量','右手坐标系；叉乘次序为位置矢量在前，单位 N·m。',solid('Chapter 2: Static Equilibrium — Force and Moment')]
  ]),
  ...group('mechanics','材料与变形','basic',[
    ['normal-stress','轴向平均正应力','axial normal stress','{${1:\\sigma}}=\\frac{{${2:N}}}{{${3:A}}}','1:平均正应力；2:轴力；3:横截面积','中心轴向受力、远离局部应力集中；A>0，拉应力取正。',solid('Chapter 4: Stress')],
    ['strain','轴向工程应变','engineering strain extension','{${1:\\varepsilon}}=\\frac{{${2:\\Delta L}}}{{${3:L_0}}}','1:工程应变；2:长度增量；3:原始长度','L₀>0；以原长为分母，不是真应变；伸长取正。',solid('Chapter 6: Strain')],
    ['hooke','单轴胡克定律','Hooke Young modulus elasticity','{${1:\\sigma}}={${2:E}}{${3:\\varepsilon}}','1:单轴正应力；2:杨氏模量；3:轴向应变','单轴线弹性、小变形、无温度或初始应变，E>0；超出弹性范围不适用。',solid('Chapter 7: Material Properties')],
    ['axial-extension','等截面杆轴向变形','axial bar elongation','{${1:\\delta}}=\\frac{{${2:N}}{${3:L}}}{{${4:E}}{${5:A}}}','1:轴向伸长；2:恒定轴力；3:杆长；4:杨氏模量；5:面积','均匀等截面直杆、线弹性小变形，E,A,L>0；拉力和伸长取正。',solid('Chapters 5–7: Axial deformation')],
    ['poisson','泊松比','Poisson ratio lateral strain','{${1:\\nu}}=-\\frac{{${2:\\varepsilon_\\perp}}}{{${3:\\varepsilon_\\parallel}}}','1:泊松比；2:横向应变；3:纵向应变','单轴加载、小变形，纵向应变不为零；各向同性稳定线弹性体通常 −1<ν<0.5。',material('Constitutive relations: Poisson effect')]
  ]),
  ...group('mechanics','梁与扭转','advanced',[
    ['bending-stress','梁弯曲正应力','beam flexure bending stress','{${1:\\sigma_x}}=-\\frac{{${2:M_z}}{${3:y}}}{{${4:I_z}}}','1:轴向正应力；2:弯矩；3:到中性轴的有向距离；4:截面二次矩','Euler–Bernoulli 梁、线弹性纯弯或局部弯曲；定义正 M_z 使 y>0 一侧受压，I_z>0。',solid('Chapter 9: Stresses — Beams in Bending')],
    ['beam-shear','梁横向剪应力','beam transverse shear VQ It','{${1:\\tau}}=\\frac{{${2:V}}{${3:Q}}}{{${4:I}}{${5:b}}}','1:剪应力大小；2:剪力大小；3:截取面积对中性轴的静矩大小；4:全截面二次矩；5:该高度截面宽度','细长梁、线弹性、远离集中载荷；I,b>0，采用大小形式；不适用于任意厚壁复杂截面的精确分布。',material('Beam bending: transverse shear stress')],
    ['torsion-stress','圆轴扭转剪应力','circular shaft torsion shear','{${1:\\tau}}=\\frac{{${2:T}}{${3:r}}}{{${4:J}}}','1:剪应力大小；2:扭矩大小；3:距轴心半径；4:极惯性矩','均匀圆或圆环截面、Saint-Venant 线弹性扭转，J>0；非圆截面不能直接套用。',solid('Chapter 8: Shafts in Torsion')],
    ['torsion-angle','圆轴扭转角','shaft angle twist','{${1:\\theta}}=\\frac{{${2:T}}{${3:L}}}{{${4:G}}{${5:J}}}','1:扭转角；2:恒定扭矩；3:轴长；4:剪切模量；5:极惯性矩','等截面圆轴、G,J>0、小变形线弹性；θ 单位 rad，符号按扭矩方向。',solid('Chapter 8: Stresses/Deflections — Shafts in Torsion')],
    ['euler-buckling','欧拉柱临界力','Euler buckling critical load','{${1:P_{\\mathrm{cr}}}}=\\frac{\\pi^2{${2:E}}{${3:I}}}{({${4:K}}{${5:L}})^2}','1:临界轴压大小；2:杨氏模量；3:屈曲方向最小截面二次矩；4:有效长度系数；5:实际柱长','理想细长直柱、中心受压、线弹性、理想端约束；E,I,K,L>0，不包含初弯曲或屈服折减。',material('Beam bending: Euler buckling')]
  ]),
  ...group('mechanics','流体与水力','basic',[
    ['continuity','不可压缩流连续方程','incompressible continuity flow rate','{${1:A_1}}{${2:v_1}}={${3:A_2}}{${4:v_2}}','1:入口面积；2:入口截面平均流速；3:出口面积；4:出口截面平均流速','稳态、不可压缩、单入口单出口、无泄漏；速度按流量方向取值。',fluid('Mass conservation and control volumes')],
    ['bernoulli','伯努利方程','Bernoulli head energy','\\frac{{${1:p}}}{{${2:\\rho}}{${3:g}}}+\\frac{{${4:v}}^2}{2{${3}}}+{${5:z}}={${6:H}}','1:压强；2:流体密度；3:重力加速度；4:速度；5:高程；6:总水头常量','沿同一流线的稳态不可压缩无黏流、仅重力体力、无泵及涡轮；ρ,g>0，忽略损失。',fluid('Bernoulli equation')],
    ['hydrostatic','静水压强','hydrostatic pressure depth','{${1:p}}={${2:p_0}}+{${3:\\rho}}{${4:g}}{${5:h}}','1:深处压强；2:自由液面压强；3:恒定密度；4:重力加速度；5:向下为正的深度','静止不可压缩流体、重力均匀；绝对压强与表压不能混用。',fluid('Hydrostatics')],
    ['reynolds','雷诺数','Reynolds number inertia viscosity','{${1:\\mathrm{Re}}}=\\frac{{${2:\\rho}}{${3:v}}{${4:D}}}{{${5:\\mu}}}','1:雷诺数；2:密度；3:特征速度；4:特征长度；5:动力黏度','ρ,D,μ>0，v 为非负速率；圆管可用内径和平均速度，不同几何的转捩阈值不同。',fluid('Lecture 16: Fluid friction')],
    ['darcy-weisbach','达西沿程水头损失','Darcy Weisbach head loss friction','{${1:h_f}}={${2:f_D}}\\frac{{${3:L}}}{{${4:D}}}\\frac{{${5:v}}^2}{2{${6:g}}}','1:沿程水头损失；2:达西摩阻系数；3:管长；4:管内径；5:平均速度；6:重力加速度','稳态圆管满管流，D,g>0；使用 Darcy 系数而非 Fanning 系数，f_D=4f_F；不含局部损失。',fluid('Lecture 16: Darcy–Weisbach friction factor')]
  ]),
  ...group('mechanics','结构与土力','advanced',[
    ['joint-equilibrium','平面桁架节点平衡','truss joint equilibrium statics','\\sum {${1:F_x}}=0,\\qquad\\sum {${2:F_y}}=0','1:节点各力的水平分量；2:节点各力的竖直分量','理想铰接平面桁架、节点加载、杆为二力杆；杆力先统一假设拉向，负值表示受压。',solid('Chapters 2–3: Equilibrium and truss member forces')],
    ['unit-load','梁单位荷载位移法','unit load virtual work beam deflection','{${1:\\delta}}=\\int_0^{${2:L}}\\frac{{${3:M}}({${4:x}}){${5:m}}({${4}})}{{${6:E}}{${7:I}}}\\,d{${4}}','1:指定方向位移；2:积分杆长；3:实际荷载弯矩函数；4:杆轴坐标；5:单位广义荷载产生的弯矩函数；6:杨氏模量；7:截面二次矩','线弹性小变形、仅计弯曲能；m 按目标自由度施加单位力或力矩，多杆需逐杆求和，忽略轴向和剪切贡献。',solid('Chapter 10: Deflections Due to Bending — energy methods')],
    ['effective-stress','饱和土有效应力','Terzaghi effective stress pore pressure',"{${1:\\sigma'}}={${2:\\sigma}}-{${3:u}}",'1:有效法向应力；2:总法向应力；3:孔隙水压力','饱和土 Terzaghi 标量形式；土力学压应力为正，孔压与应力采用同一参考压强；不直接用于非饱和土。',soil('Part IV-1: Effective Stress Principle')],
    ['mohr-coulomb','莫尔—库仑抗剪强度','Mohr Coulomb shear strength',"{${1:\\tau_f}}={${2:c'}}+{${3:\\sigma_n'}}\\tan{${4:\\varphi'}}",'1:破坏面抗剪强度；2:有效黏聚力；3:有效法向压应力；4:有效内摩擦角','排水有效应力强度参数，压应力取正；适用所标定应力范围，φ 用弧度；不混用总应力不排水参数。',soil('Parts III-2 and IV-4: Stress-Strain-Strength')],
    ['rankine','朗肯主动土压力系数','Rankine active earth pressure coefficient','{${1:K_a}}=\\tan^2\\left(\\frac{\\pi}{4}-\\frac{{${2:\\varphi}}}{2}\\right)','1:主动土压力系数；2:有效内摩擦角','无黏性土、水平填土、光滑竖直墙、达到主动极限状态；0≤φ<π/2，角度用 rad；地下水压力另计。',soil('Parts III-3 and IV-5: Lateral Earth Pressures')]
  ]),
  ...group('mechanics','机械传动与振动','advanced',[
    ['gear-ratio','外啮合齿轮传动比','external gears transmission ratio','{${1:i}}=\\frac{{${2:\\omega_1}}}{{${3:\\omega_2}}}=-\\frac{{${4:z_2}}}{{${5:z_1}}}','1:有向角速度传动比；2:主动轮角速度；3:从动轮角速度；4:从动轮齿数；5:主动轮齿数','一对平行轴外啮合齿轮、无滑动，角速度采用同一正方向；负号表示反转，齿数为正整数。',dynamics('Rigid-body kinematics: rolling without slip')],
    ['shaft-power','转轴功率','shaft rotational power torque','{${1:P}}={${2:T}}{${3:\\omega}}','1:机械功率；2:轴向有符号扭矩；3:角速度','转动机械瞬时功率；扭矩与角速度共轴，ω 必须用 rad/s；并非以 rpm 直接相乘。',dynamics('Work and energy: power of a torque')],
    ['natural-frequency','单自由度固有角频率','SDOF natural angular frequency spring mass','{${1:\\omega_n}}=\\sqrt{\\frac{{${2:k}}}{{${3:m}}}}','1:固有角频率；2:线性弹簧刚度；3:等效质量','无阻尼线性单自由度系统，k,m>0；单位 rad/s，频率 Hz 需再除以 2π。',dynamics('Free vibration of a spring-mass system')],
    ['critical-damping','临界黏性阻尼系数','critical viscous damping SDOF','{${1:c_{\\mathrm{cr}}}}=2\\sqrt{{${2:k}}{${3:m}}}','1:临界阻尼系数；2:线性刚度；3:质量','线性单自由度黏性阻尼模型，k,m>0；阻尼比 ζ=c/c_cr。',dynamics('Damped free vibration')],
    ['forced-vibration','单自由度受迫振动方程','SDOF forced vibration equation','{${1:m}}\\ddot{{${2:x}}}+{${3:c}}\\dot{{${2}}}+{${4:k}}{${2}}={${5:F}}({${6:t}})','1:质量；2:相对静平衡位置的位移；3:黏性阻尼；4:刚度；5:外力函数；6:时间','惯性系、线性单自由度、m,k>0、c≥0；点表示对时间求导，初始条件另给，不含基座运动项。',dynamics('Forced vibration of spring-mass-damper systems')]
  ])
];
