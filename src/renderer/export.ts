import 'katex/dist/katex.min.css';
import './export.css';
import './pseudocode.css';
import type {ImageStyle} from '../shared/types';
declare global { interface Window { prepareFormula(html: string,style:ImageStyle): Promise<{width:number;height:number}> } }
window.prepareFormula = async (html,style) => {
  const formula = document.getElementById('formula')!;
  const background=style.background==='transparent'?'transparent':style.background;
  document.documentElement.style.background=background;document.body.style.background=background;
  Object.assign(formula.style,{background,color:style.foreground,fontSize:`${style.fontSize}px`,padding:`${style.padding}px`});
  formula.innerHTML = html;
  await document.fonts.ready;
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const bounds = formula.getBoundingClientRect();
  return {width:Math.ceil(bounds.width),height:Math.ceil(bounds.height)};
};
