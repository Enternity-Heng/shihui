import katex from 'katex';
import type {EditSnapshot} from './editing';

export interface PseudocodeState extends EditSnapshot {lineNumbers:boolean}
export interface PseudocodePreview {html:string;errors:{line:number;message:string}[];lines:number}
export const MAX_PSEUDOCODE=16000;
export const MAX_PSEUDOCODE_LINES=200;
export const emptyPseudocode=():PseudocodeState=>({text:'',start:0,end:0,lineNumbers:true});
export function validatePseudocode(text:unknown,lineNumbers:unknown):asserts text is string {
  if(typeof text!=='string'||text.length>MAX_PSEUDOCODE)throw new Error('伪代码最多 16000 个 UTF-16 单元。');
  if(typeof lineNumbers!=='boolean')throw new Error('行号设置必须为开关。');
  if(text.split(/\r\n?|\n/).length>MAX_PSEUDOCODE_LINES)throw new Error('伪代码最多 200 行。');
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))throw new Error('伪代码包含不支持的控制字符。');
}
export function validatePseudocodeState(value:unknown):PseudocodeState {
  if(value===undefined)return emptyPseudocode();
  if(!value||typeof value!=='object')throw new Error('伪代码草稿无效。');
  const state=value as PseudocodeState;
  validatePseudocode(state.text,state.lineNumbers);
  const start=Number.isSafeInteger(state.start)?Math.max(0,Math.min(state.text.length,state.start)):0;
  const end=Number.isSafeInteger(state.end)?Math.max(start,Math.min(state.text.length,state.end)):start;
  return {text:state.text,start,end,lineNumbers:state.lineNumbers};
}
function escapeText(text:string){return text.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));}
const keywords=/\b(FUNCTION|PROCEDURE|INPUT|OUTPUT|IF|THEN|ELSE|ELSEIF|FOR|TO|WHILE|DO|END|RETURN|AND|OR|NOT|IN|BREAK|CONTINUE)\b/g;
function plainHtml(text:string){
  const comment=text.indexOf('//');
  const code=comment<0?text:text.slice(0,comment);
  return escapeText(code).replace(keywords,'<strong class="pseudo-keyword">$1</strong>')+(comment<0?'':`<span class="pseudo-comment">${escapeText(text.slice(comment))}</span>`);
}
export function renderPseudocode(text:string,lineNumbers:boolean):PseudocodePreview {
  validatePseudocode(text,lineNumbers);
  const errors:PseudocodePreview['errors']=[];
  const lines=text.replace(/\r\n?/g,'\n').split('\n');
  const rows=lines.map((line,index)=>{
    let html='',plain='',position=0;
    const flush=()=>{html+=plainHtml(plain);plain='';};
    try{
      while(position<line.length){
        if(line[position]==='\\'&&line[position+1]==='$'){plain+='$';position+=2;continue;}
        if(line[position]!=='$'){plain+=line[position++];continue;}
        flush();
        if(line[position+1]==='$')throw new Error('请用单个 $ 包围行内公式，不支持 $$。');
        let end=position+1;
        while(end<line.length){if(line[end]==='$'){let slashes=0;for(let back=end-1;back>position&&line[back]==='\\';back--)slashes++;if(slashes%2===0)break;}end++;}
        if(end===line.length)throw new Error('行内公式缺少结束的 $；公式不能跨行。');
        const source=line.slice(position+1,end);
        if(!source.trim())throw new Error('行内公式不能为空。');
        if(source.length>4096)throw new Error('单条公式最多 4096 个 UTF-16 单元。');
        let denied=false;
        const formula=katex.renderToString(source,{displayMode:false,throwOnError:true,maxExpand:1000,maxSize:20,strict:'warn',trust:()=>{denied=true;return false;},output:'html'});
        if(denied)throw new Error('公式不支持外部链接、图片或 HTML 扩展。');
        html+=formula;position=end+1;
      }
      flush();
    }catch(error){errors.push({line:index+1,message:(error instanceof Error?error.message:String(error)).replace(/^KaTeX parse error:\s*/,'')});html=`<span class="pseudo-error">${escapeText(line)}</span>`;}
    return `<div class="pseudo-line">${lineNumbers?`<span class="pseudo-number" aria-hidden="true">${index+1}</span>`:''}<span class="pseudo-code">${html||'&#8203;'}</span></div>`;
  });
  const html=`<div class="pseudocode-document">${rows.join('')}</div>`;
  if(html.length>2_000_000)throw new Error('伪代码排版结果过大，请缩短内容。');
  return {html,errors,lines:lines.length};
}
export function indentPseudocode(state:EditSnapshot,outdent=false):EditSnapshot {
  const begin=state.start===0?0:state.text.lastIndexOf('\n',state.start-1)+1;
  const stop=state.end>state.start&&state.text[state.end-1]==='\n'?state.end-1:state.end;
  if(!outdent&&state.start===state.end)return {text:state.text.slice(0,state.start)+'  '+state.text.slice(state.end),start:state.start+2,end:state.end+2};
  const nextNewline=state.text.indexOf('\n',stop);
  const lineEnd=nextNewline<0?state.text.length:nextNewline;
  const segment=state.text.slice(begin,lineEnd);
  const lines=segment.split('\n');
  const removed=lines.map(line=>outdent?(line.startsWith('\t')?1:Math.min(2,/^ */.exec(line)![0].length)):0);
  const replacement=lines.map((line,index)=>outdent?line.slice(removed[index]):'  '+line).join('\n');
  const firstDelta=outdent?-Math.min(removed[0],state.start-begin):2;
  const totalDelta=replacement.length-segment.length;
  const newStart=Math.max(begin,state.start+firstDelta);
  return {text:state.text.slice(0,begin)+replacement+state.text.slice(lineEnd),start:newStart,end:Math.max(newStart,state.end+totalDelta)};
}
export function newlinePseudocode(state:EditSnapshot):EditSnapshot {
  const begin=state.start===0?0:state.text.lastIndexOf('\n',state.start-1)+1;
  const indentation=/^[ \t]*/.exec(state.text.slice(begin,state.start))![0];
  const insertion='\n'+indentation;
  return {text:state.text.slice(0,state.start)+insertion+state.text.slice(state.end),start:state.start+insertion.length,end:state.start+insertion.length};
}
export const PSEUDOCODE_EXAMPLES=[
  {id:'binary-search',title:'二分查找',description:'在升序数组中查找目标，使用从 0 开始的下标；未找到时返回 −1。',source:'INPUT A: 升序数组, target: 目标值\nOUTPUT 目标下标，未找到返回 -1\nFUNCTION BinarySearch(A, target)\n  left ← 0\n  right ← length(A) - 1\n  WHILE left ≤ right\n    mid ← left + floor((right - left) / 2)\n    IF A[mid] = target\n      RETURN mid\n    ELSE IF A[mid] < target\n      left ← mid + 1\n    ELSE\n      right ← mid - 1\n    END IF\n  END WHILE\n  RETURN -1\nEND FUNCTION'},
  {id:'merge-sort',title:'归并排序',description:'递归拆分后稳定合并，返回升序数组；切片左闭右开。',source:'INPUT A: 数组\nOUTPUT 升序数组\nFUNCTION MergeSort(A)\n  IF length(A) ≤ 1\n    RETURN A\n  END IF\n  mid ← floor(length(A) / 2)\n  left ← MergeSort(A[0:mid])\n  right ← MergeSort(A[mid:length(A)])\n  result ← []\n  i ← 0\n  j ← 0\n  WHILE i < length(left) AND j < length(right)\n    IF left[i] ≤ right[j]\n      append(result, left[i])\n      i ← i + 1\n    ELSE\n      append(result, right[j])\n      j ← j + 1\n    END IF\n  END WHILE\n  RETURN result + left[i:length(left)] + right[j:length(right)]\nEND FUNCTION'},
  {id:'bfs',title:'BFS 广度优先搜索',description:'使用先进先出队列遍历起点可达顶点；入队时标记，避免重复入队。',source:'INPUT G: 邻接表, start: 起点\nOUTPUT 起点可达顶点的广度优先顺序\nFUNCTION BFS(G, start)\n  queue ← empty queue\n  visited ← {start}\n  order ← []\n  enqueue(queue, start)\n  WHILE queue is not empty\n    vertex ← dequeue(queue)\n    append(order, vertex)\n    FOR neighbor IN G[vertex]\n      IF neighbor NOT IN visited\n        add(visited, neighbor)\n        enqueue(queue, neighbor)\n      END IF\n    END FOR\n  END WHILE\n  RETURN order\nEND FUNCTION'},
  {id:'dfs',title:'DFS 深度优先搜索',description:'递归遍历起点可达顶点；visited 和 order 由内部访问过程共享。',source:'INPUT G: 邻接表, start: 起点\nOUTPUT 起点可达顶点的深度优先顺序\nFUNCTION DFS(G, start)\n  visited ← empty set\n  order ← []\n  PROCEDURE Visit(vertex)\n    add(visited, vertex)\n    append(order, vertex)\n    FOR neighbor IN G[vertex]\n      IF neighbor NOT IN visited\n        Visit(neighbor)\n      END IF\n    END FOR\n  END PROCEDURE\n  Visit(start)\n  RETURN order\nEND FUNCTION'},
  {id:'gradient-descent',title:'梯度下降',description:'使用固定学习率执行指定次数的全量梯度更新；不保证对任意目标收敛。',source:'INPUT $J$: 可微目标函数, $\\theta_0$: 初值, $\\eta > 0$: 学习率, steps: 迭代次数\nOUTPUT 更新后的参数 $\\theta$\nFUNCTION GradientDescent(J, initial, eta, steps)\n  $\\theta \\leftarrow \\theta_0$\n  FOR iteration ← 1 TO steps\n    // 在当前参数处计算完整梯度\n    $g \\leftarrow \\nabla J(\\theta)$\n    $\\theta \\leftarrow \\theta - \\eta g$\n  END FOR\n  RETURN $\\theta$\nEND FUNCTION'}
];
