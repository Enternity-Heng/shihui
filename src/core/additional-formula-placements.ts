import type {FormulaPlacement} from './formula-definition';

// Shared entries keep their existing source, fields and stable ID.
export const ADDITIONAL_FORMULA_PLACEMENTS:Record<string,FormulaPlacement[]>={
  'physics-newton':[{subject:'mechanics',topic:'静力与运动',level:'basic'}],
  'physics-kinetic':[{subject:'mechanics',topic:'静力与运动',level:'basic'}],
  'physics-momentum':[{subject:'mechanics',topic:'静力与运动',level:'basic'}],
  'physics-mechanical-energy':[{subject:'mechanics',topic:'静力与运动',level:'basic'}],
  'physics-ideal-gas':[{subject:'chemistry',topic:'计量与溶液',level:'basic'}],
  'physics-first-law':[{subject:'chemistry',topic:'热力学与平衡',level:'advanced'}],
  'statistics-binomial':[{subject:'biology',topic:'遗传与群体',level:'basic'}],
  'chemistry-fick':[{subject:'biology',topic:'细胞与酶',level:'advanced'}],
  'computer-entropy':[{subject:'biology',topic:'生态多样性',level:'advanced'}]
};
export const ADDITIONAL_FORMULA_ALIASES:Record<string,string[]>={
  'computer-entropy':['香农多样性','香农指数','Shannon diversity','Shannon Wiener diversity'],
  'statistics-binomial':['遗传计数','binomial inheritance count']
};
export const ADDITIONAL_FORMULA_NOTES:Record<string,string>={
  'computer-entropy':'生物学中可将 X 解释为抽样个体的物种，p 为相对丰度；本库仍用 log₂、单位 bit，与采用自然对数的生态教材结果相差 ln 2 因子。',
  'statistics-binomial':'遗传计数仅在每次试验独立且成功概率相同、试验次数固定时采用，不自动推断遗传模式。'
};
