export const SUBJECTS = [
  {id:'Ethical and Professional Standards',zh:'职业道德',short:'Ethics',color:'#5947a7',overview:'职业道德不是背规则，而是分析委托代理关系中“谁承担信任义务、信息不对称在哪里、哪种行为损害客户利益”。',roadmap:'职业伦理与信任 → 准则体系 → I—VII 各项适用 → GIPS → 复杂情景归责',boundaries:'先识别适用法律及各项标准；更严格的适用规则优先。区分推荐、研究、披露、交易、私人利益与雇主义务。'},
  {id:'Quantitative Methods',zh:'数量分析',short:'Quant',color:'#0b7285',overview:'把金融不确定性化为“随机变量—分布—样本—估计—检验—预测”的映射。CFA 数量题不是孤立公式，而是问“这个统计量在什么假设下成立”。',roadmap:'收益率与时间价值 → 分布和概率 → 推断与假设检验 → 回归与模型评价',boundaries:'先看变量的定义与单位、抽样假设、参数是否已知、单/双侧检验；估计与检验的目标不同。'},
  {id:'Economics',zh:'经济学',short:'Economics',color:'#bd6200',overview:'经济学研究约束下的最优化及市场均衡：微观侧是成本与需求决定行为，宏观侧是政策与预期改变价格和跨期资源配置。',roadmap:'企业决策与市场结构 → 商业周期 → 财政货币政策 → 国际贸易资本流动 → 汇率',boundaries:'区分水平与变化率、名义与实际、短期与长期、政策传导与预期反应。'},
  {id:'Financial Statement Analysis',zh:'财务报表',short:'FSA',color:'#1b6d49',overview:'财报是把现实经营映射到会计账簿的规则系统：三大报表通过利润、现金、资产负债和权益勾稽，计量选择影响可比性和预测。',roadmap:'报表框架 → 利润/资产负债/现金流 → 存货/长期资产/税 → 报告质量 → 比率与预测',boundaries:'每题先判断 GAAP/IFRS、报表位置、会计政策及是否现金流；净利润不等于经营现金流。'},
  {id:'Corporate Issuers',zh:'公司发行人',short:'Corporate',color:'#6b5487',overview:'公司的每一项融资或投资决策最终都应回到企业价值：未来自由现金流的风险调整现值，而非会计利润或 IRR 的表面大小。',roadmap:'组织和治理 → 营运资本 → NPV 与资本配置 → 资本结构与融资成本 → 商业模式',boundaries:'区分股东价值和债权价值、经营杠杆和财务杠杆、项目 IRR 与价值创造。'},
  {id:'Equity',zh:'股权投资',short:'Equity',color:'#c13c51',overview:'股票是剩余现金流的索取权，股价反映未来现金流分布与折现率；市场结构、信息效率和估值模型是三个不同层次。',roadmap:'交易与市场结构 → 指数编制 → 市场效率 → 公司与行业分析 → 股权现金流估值',boundaries:'区分市场价格与内在价值、盈利增长与股东现金流增长、价格加权与市值加权。'},
  {id:'Fixed Income',zh:'固定收益',short:'Fixed Income',color:'#345f9d',overview:'债券价值是分期现金流在一条期限结构上的折现；价格对利率是一阶久期、二阶凸性，对信用是违约概率和回收率的函数。',roadmap:'契约与现金流 → 定价和收益率 → 即期与远期曲线 → 久期凸性 → 信用风险 → 证券化',boundaries:'收益率不是回报率；Mac/Mod/Effective/KRD 使用前提不同；含权债可能出现负凸性。'},
  {id:'Derivatives',zh:'衍生品',short:'Derivatives',color:'#714e9b',overview:'衍生品的价格来自无套利复制：一份未来状态依赖现金流可由基础资产与无风险头寸复制，合约价格、合约价值及保证金是不同概念。',roadmap:'承诺与或有索取 → 持有成本与复制 → 远期期货互换 → 期权与平价 → 二叉树',boundaries:'定价时先画现金流，分清多空与标的、交易成本、股息/收益、期货逐日盯市。'},
  {id:'Alternative Investments',zh:'另类投资',short:'Alternatives',color:'#96622f',overview:'另类资产的本质是非标准化现金流、流动性溢价、杠杆及管理人代理问题的组合，低相关可能被估值平滑误导。',roadmap:'特征与结构 → 绩效与费用 → 私募股债 → 房地产基建 → 商品与对冲基金 → 数字资产',boundaries:'IRR 与现金时点高度相关；毛收益与净收益不同；contango 并不等于“看涨”。'},
  {id:'Portfolio Management',zh:'组合管理',short:'Portfolio',color:'#19746d',overview:'从单个资产到组合，决定风险的是整个协方差矩阵而非单个波动率；系统性风险、资产配置和绩效评价组成一致框架。',roadmap:'组合收益与风险 → 分散化与有效前沿 → CAPM 与因子 → IPS 和组合构建 → 行为偏差与风险管理',boundaries:'CAL、CML、SML 的横纵轴与适用证券不同；区分总风险与系统风险。'},
  {id:'Mock Exams',zh:'模拟考试',short:'Mock',color:'#4b5563',overview:'模拟考试是跨学科检验：从题干筛出目标变量、关键假设和计算/判断路径，再用结果回推薄弱模块。',roadmap:'跨学科题干识别 → 约束与假设 → 选择判断与单位检查 → 错因归类 → 回溯对应模块',boundaries:'模拟试题跨科混排，优先依题干与原题编号判断归类，不应以整套试卷代替知识点复习。'}
];
export const SUBJECT_INDEX=Object.fromEntries(SUBJECTS.map(x=>[x.id,x]));

// Chinese module labels are curated from the supplied practice.zip module titles.
const MODULE_ZH={
'Equity':['市场组织与交易结构','证券市场指数','市场有效性','股权证券概览','公司分析：历史与现状','行业与竞争分析','公司分析：预测','股权估值：概念与基础工具'],
'Ethical and Professional Standards':['伦理与投资行业信任','道德守则及职业行为准则','准则 I—VII 的实施指引','全球投资业绩标准 GIPS','职业道德情景应用'],
'Financial Statement Analysis':['财务报表分析导论','利润表分析','资产负债表分析','现金流量表分析（一）','现金流量表分析（二）','存货分析','长期资产分析','长期负债与所有者权益','所得税分析','财务报告质量','财务分析工具与比率','财务报表预测建模'],
'Fixed Income':['固定收益工具特征','债券现金流结构与种类','固定收益发行与交易','公司债市场','政府债市场','债券估值：价格与收益率','固定利率债收益率与利差','浮息产品收益率与利差','期限结构：即期、平价与远期曲线','利率风险与收益','债券久期度量与性质','债券凸性与组合','曲线久期与经验风险指标','信用风险','政府发行人信用分析','公司发行人信用分析','固定收益证券化','资产支持证券 ABS','抵押贷款支持证券 MBS'],
'Derivatives':['衍生工具与市场特征','远期承诺与或有索取权','衍生品用途、风险及发行人和投资者','无套利、复制与持有成本','远期价格与价值、不同到期日','期货定价与估值','利率互换和其他互换','期权定价与估值','看涨看跌平价与期权复制','单期二叉树衍生品估值'],
'Economics':['企业与市场结构','商业周期','财政政策','货币政策','地缘政治','国际贸易','资本流动与外汇市场','汇率计算'],
'Alternative Investments':['另类投资特征、方法和结构','另类投资业绩与收益率','私募资本：股权与债务','房地产与基础设施','自然资源','对冲基金','数字资产导论'],
'Corporate Issuers':['组织形式、发行人特征与所有权','投资者与其他利益相关方','公司治理：冲突、机制与风险','营运资本与流动性','资本投资与资本配置','资本结构','商业模式'],
'Portfolio Management':['组合风险与收益（一）','组合风险与收益（二）','组合管理概论','组合规划与构建','个人行为偏差','风险管理导论'],
'Quantitative Methods':['收益率与利率','货币时间价值','资产收益的统计度量','概率树与条件期望','投资组合数学','模拟方法','估计与统计推断','假设检验','参数与非参数独立性检验','一元线性回归','大数据技术导论'],
};
const MODULE_SPECIFIC={
'Fixed Income:9':{view:'从整条贴现曲线而非一个 YTM 定价：P=ΣCF_t·DF(t)，DF(t) 与即期利率绑定，远期利率由跨期零套利条件确定。',chain:'债券现金流 → 每期即期利率 → 折现因子 → 无套利价格 → 远期利率'},
'Fixed Income:11':{view:'债券价格是收益率的可微函数。久期是对利率的一阶敏感度；Macaulay 是现金流加权时间，Modified 是价格弹性，两者不可混用。',chain:'P(y) → -P′(y)/P → Modified duration → 小幅利率冲击'},
'Fixed Income:12':{view:'凸性是债券价格函数的二阶曲率，与久期构成 Taylor 二阶展开。嵌入赎回权会改变分布尾部并导致有效凸性转负。',chain:'P(y) → 一阶久期 → 二阶凸性 → 大幅利率情景 / 组合凸性'},
'Fixed Income:13':{view:'关键利率久期与有效久期都是从收益率曲线扰动出发的方向导数；当曲线非平行移动时，一个 YTM 久期无法刻画风险。',chain:'期限结构 → 节点冲击 → 重定价 → KRD 向量 → 曲线风险'},
'Financial Statement Analysis:4':{view:'经营现金流不等于净利润。间接法从利润出发，还原非现金损益与经营性营运资本变化；增加应收往往消耗现金。',chain:'NI → 调整非现金项目 → 调整营运资本 → CFO'},
'Financial Statement Analysis:5':{view:'直接法把经营现金流分解为客户收款与供应商/员工付款；间接法则通过账面净利润重构现金，二者最终 CFO 应相等。',chain:'客户收款-现金支出 ↔ 利润+非现金调整-净营运资本增加'},
'Financial Statement Analysis:6':{view:'存货计价是流量与存量勾稽：期初存货 + 采购 - 期末存货 = COGS；FIFO 与加权平均影响毛利率、所得税与营运资本。',chain:'存货流转假设 → COGS / 期末存货 → 利润、比率、现金税负'},
'Quantitative Methods:7':{view:'样本均值通过抽样分布连接未知总体参数；置信区间是程序的覆盖率陈述，不是“参数随机落入固定区间”的频率主义概率。',chain:'样本统计量 → 抽样分布 → 标准误 → 区间估计'},
'Quantitative Methods:8':{view:'检验不是证明 H0，而是在指定显著性水平控制 I 类错误；检验功效取决于样本量、效应量与备择下分布。',chain:'H0/H1 → 统计量与自由度 → p-value → 决策与功效'},
'Quantitative Methods:10':{view:'OLS 是投影问题：回归残差与解释变量正交。SST=SSR+SSE 依赖含截距 OLS；t/F 检验的有效性依赖误差假设。',chain:'拟合投影 → SSE/SSR/SST → β估计方差 → t/F 检验与 R²'},
'Derivatives:4':{view:'一价定律要求等价未来现金流具有同一现值。期货、远期及期权估值根基都是复制，而不是简单猜涨跌。',chain:'现金流复制 → 无套利 → 持有成本 → 理论远期价'},
'Derivatives:8':{view:'期权是非线性或有索取权，价格由状态依赖支付和定价核决定；正 Gamma 的价值来自凸性，不能仅用 Delta 线性近似。',chain:'支付函数 → 无套利定价 → Delta/Gamma/Vega → 对冲与风险'},
'Derivatives:9':{view:'看涨看跌平价是两组到期支付逐状态相同的复制恒等式。到期支付而非期权名称决定组合价值。',chain:'逐状态拆现金流 → C+PV(K)=P+S（无股息欧式）→ 合成头寸'},
'Portfolio Management:1':{view:'组合方差由协方差矩阵决定：σp²=wᵀΣw。相关系数变化改变有效前沿，分散化不消除系统性风险。',chain:'单资产分布 → 协方差 → 组合方差 → 分散化'},
'Portfolio Management:2':{view:'CML 是市场组合和无风险资产的效率边界；SML 则把预期收益与 β 连接；二者横坐标不同。',chain:'均值方差最优 → 两基金分离 → CAPM → SML 的定价关系'},
'Equity:8':{view:'股权价格是未来所有者现金流的风险调整现值；DDM、FCFE、剩余收益与倍数法只是对同一价值来源的不同表达。',chain:'业务预测 → 可分配现金流 → 股权资本成本 → 内在价值 → 安全边际'},
'Alternative Investments:2':{view:'私募资本管理人控制现金流时点，IRR 易受融资与退出时点影响。绩效需要 IRR、MOIC、DPI、TVPI、费用与流动性一起看。',chain:'Capital calls → Distributions → IRR/MOIC → 净费后收益'},
'Corporate Issuers:5':{view:'NPV 最大化来自可加性与财富最大化；IRR 是非线性百分比指标，在规模、时点或多重根下可能误导互斥项目选择。',chain:'项目现金流 → 资本成本 → NPV → 互斥项目比较'},
'Corporate Issuers:6':{view:'MM 无税模型中杠杆改变股东风险但不产生免费价值。计入税盾、破产成本和信息不对称后才有权衡与融资优序。',chain:'资本结构 → 股权要求收益率 → WACC → 税盾 / 财务困境成本'},
'Economics:8':{view:'远期汇率关系来自两个货币市场投资策略的无套利平价，而不是未来即期汇率预测。注意直接/间接标价及升贴水方向。',chain:'两个货币的货币时间价值 → 利率平价 → 远期点数 → 汇率换算'},
};
export function moduleNumber(text){const m=String(text||'').match(/Module\s+(\d+)/i);return m?Number(m[1]):0;}
export function titleFor(subject, moduleName){
  if(subject==='Mock Exams') return moduleName.replace('2026 CFA Program LI ','');
  const n=moduleNumber(moduleName), arr=MODULE_ZH[subject]||[];
  return arr[n-1]||String(moduleName).replace(/^Module \d+[:_ ]*/, '');
}
export function noteFor(subject,moduleName){
 const id=moduleNumber(moduleName),s=SUBJECT_INDEX[subject]||SUBJECT_INDEX['Mock Exams'];
 const specific=MODULE_SPECIFIC[`${subject}:${id}`];
 return {overview:specific?.view||`${titleFor(subject,moduleName)}是“${s.zh}”体系的一环。${s.overview}`,
 chain:specific?.chain||s.roadmap, boundaries:s.boundaries,
 moduleZh:titleFor(subject,moduleName),subjectZh:s.zh};
}
