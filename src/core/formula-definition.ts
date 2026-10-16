export type FormulaSubject='math'|'physics'|'computer'|'electronics'|'statistics'|'mechanics'|'chemistry'|'economics'|'biology';
export type FormulaLevel='basic'|'advanced';
export interface FormulaPlacement {subject:FormulaSubject;topic:string;level:FormulaLevel}
export interface FormulaDefinition extends FormulaPlacement {
  id:string;title:string;aliases:string[];template:string;
  fields:{index:number;description:string}[];conditions:string;reference:{title:string;url:string;section:string};
  alsoIn?:FormulaPlacement[];
}
export type FormulaRow=[string,string,string,string,string,string,FormulaDefinition['reference']];
export function createFormulaGroup(subject:FormulaSubject,topic:string,level:FormulaLevel,rows:FormulaRow[]):FormulaDefinition[]{
  return rows.map(([id,title,aliases,template,fields,conditions,reference])=>({id:`${subject}-${id}`,subject,topic,level,title,aliases:aliases.split('|'),template:template+'$0',fields:fields.split('；').map(field=>{const separator=field.indexOf(':');return {index:Number(field.slice(0,separator)),description:field.slice(separator+1)};}),conditions,reference}));
}
export function formulaPlacements(formula:FormulaDefinition):FormulaPlacement[]{
  return [{subject:formula.subject,topic:formula.topic,level:formula.level},...(formula.alsoIn??[])];
}
