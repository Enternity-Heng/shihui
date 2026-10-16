import type {CustomCommand,HistoryEntry,ActionReply,Favorite,FavoriteCategory} from '../shared/types';
import {parseTemplate} from '../core/templates';
import type {SourceEditor} from './editor';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
function check<T>(result:T):T{if(result&&typeof result==='object'&&'ok' in result&&(result as unknown as ActionReply).ok===false)throw new Error((result as unknown as ActionReply).message);return result;}
export function initializePanels(editor:SourceEditor,isBusy:()=>boolean,notify:(text:string,error?:boolean)=>void,reuse:(source:string)=>Promise<void>,currentSource:()=>string|null){
  let commands:CustomCommand[]=[],page=0,total=0,historyGeneration=0;let queryTimer:ReturnType<typeof setTimeout>;
  const status=(id:string,text:string,error=false)=>{el(id).textContent=text;el(id).classList.toggle('error',error);};
  const run=async(id:string,callback:()=>Promise<unknown>)=>{try{await callback();}catch(error){status(id,error instanceof Error?error.message:String(error),true);}};
  let favorites:Favorite[]=[],categories:FavoriteCategory[]=[],favoriteSource:string|null=null;
  el('favorite-form').insertAdjacentHTML('beforebegin','<div class="setting-row"><button id="favorites-export" class="secondary">备份收藏</button><button id="favorites-import" class="secondary">导入备份</button></div><details id="category-manager"><summary>管理分类</summary><label for="category-edit-id">现有分类</label><select id="category-edit-id"><option value="">新建分类</option></select><label for="category-name">分类名称</label><input id="category-name" maxlength="32" placeholder="例如 线性代数"><div class="setting-row"><button id="category-save">保存分类</button><button id="category-delete" class="secondary">删除分类</button></div></details>');
  el('favorite-name').insertAdjacentHTML('afterend','<label for="favorite-category">收藏分类</label><select id="favorite-category"><option value="">未分类</option></select>');
  el('favorites-query').insertAdjacentHTML('beforebegin','<label for="favorites-category-filter">按分类筛选</label><select id="favorites-category-filter"><option value="all">全部</option><option value="">未分类</option></select>');
  function options(select:HTMLSelectElement,all=false,newCategory=false){const selected=select.value;select.replaceChildren();if(all)select.add(new Option('全部','all'));select.add(new Option(newCategory?'新建分类':'未分类',''));for(const c of categories)select.add(new Option(c.name,c.id));select.value=Array.from(select.options).some(o=>o.value===selected)?selected:all?'all':'';}
  const resetFavorite=()=>{favoriteSource=null;el<HTMLInputElement>('favorite-id').value='';el<HTMLInputElement>('favorite-name').value='';el('favorite-save').textContent='保存当前公式';};
  function drawFavorites(){
    const query=el<HTMLInputElement>('favorites-query').value.toLowerCase();el('favorites-list').replaceChildren();
    const filter=el<HTMLSelectElement>('favorites-category-filter').value;
    for(const favorite of favorites.filter(f=>(filter==='all'||(f.categoryId??'')===filter)&&`${f.name}\n${f.source}`.toLowerCase().includes(query))){
      const row=document.createElement('article');row.className='history-entry';const title=document.createElement('strong');title.textContent=favorite.name;const code=document.createElement('code');code.textContent=favorite.source;const actions=document.createElement('div');actions.className='history-actions';
      const button=(label:string,fn:()=>Promise<unknown>)=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.onclick=()=>void run('favorites-status',async()=>{b.disabled=true;try{await fn();}finally{b.disabled=false;}});actions.append(b);};
      button('一键使用',async()=>{if(isBusy())throw new Error('正在处理其他操作，请稍后。');el('favorites-panel').hidden=true;await reuse(favorite.source);});
      button('回填编辑',async()=>{if(isBusy())throw new Error('正在处理其他操作，请稍后。');editor.set(favorite.source,'favorite');el('favorites-panel').hidden=true;el<HTMLTextAreaElement>('source').focus();});
      button('改名',async()=>{favoriteSource=favorite.source;el<HTMLInputElement>('favorite-id').value=favorite.id;el<HTMLInputElement>('favorite-name').value=favorite.name;el<HTMLSelectElement>('favorite-category').value=favorite.categoryId??'';el('favorite-save').textContent='保存名称';el<HTMLInputElement>('favorite-name').focus();});
      button('删除',async()=>{check(await window.math.deleteFavorite(favorite.id));await loadFavorites();if(el<HTMLInputElement>('favorite-id').value===favorite.id)resetFavorite();});
      const category=document.createElement('select');category.setAttribute('aria-label',`${favorite.name} 的分类`);options(category);category.value=favorite.categoryId??'';category.addEventListener('change',()=>void run('favorites-status',async()=>{category.disabled=true;try{check(await window.math.saveFavorite({...favorite,categoryId:category.value||null}));await loadFavorites();}finally{category.disabled=false;}}));row.append(title,code,category,actions);el('favorites-list').append(row);
    }
    if(!el('favorites-list').children.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='暂无匹配收藏。输入公式后填写名称并保存。';el('favorites-list').append(empty);}
  }
  async function loadFavorites(){const reply=check(await window.math.favorites());favorites=reply.favorites;categories=reply.categories;options(el('favorite-category'));options(el('favorites-category-filter'),true);options(el('category-edit-id'),false,true);if(reply.warning)status('favorites-status',reply.warning,true);drawFavorites();}
  el('favorites-category-filter').addEventListener('change',drawFavorites);
  el('category-edit-id').addEventListener('change',()=>{el<HTMLInputElement>('category-name').value=categories.find(c=>c.id===el<HTMLSelectElement>('category-edit-id').value)?.name??'';});
  el('category-save').addEventListener('click',()=>void run('favorites-status',async()=>{check(await window.math.saveCategory({id:el<HTMLSelectElement>('category-edit-id').value,name:el<HTMLInputElement>('category-name').value}));await loadFavorites();status('favorites-status','分类已保存。');}));
  el('category-delete').addEventListener('click',()=>void run('favorites-status',async()=>{const id=el<HTMLSelectElement>('category-edit-id').value;if(!id)throw new Error('请先选择一个分类。');if(!confirm('删除分类并把其中收藏移至未分类？公式不会删除。'))return;check(await window.math.deleteCategory(id));await loadFavorites();el<HTMLInputElement>('category-name').value='';status('favorites-status','分类已删除，公式已保留。');}));
  el('favorites-export').addEventListener('click',()=>void run('favorites-status',async()=>{const r=check(await window.math.exportFavorites());status('favorites-status',r.message);}));
  el('favorites-import').addEventListener('click',()=>void run('favorites-status',async()=>{const r=check(await window.math.importFavorites());if(!r.summary){status('favorites-status',r.message);return;}const s=r.summary;if(!confirm(`合并导入：新增 ${s.added} 条收藏、${s.categories} 个分类，跳过 ${s.skipped} 条，重名调整 ${s.renamed} 条。继续？`))return;const result=check(await window.math.commitFavoritesImport(s.id));await loadFavorites();status('favorites-status',result.message);}));
  el('favorites-toggle').addEventListener('click',()=>{editor.close();el('settings').hidden=true;el('history-panel').hidden=true;el('favorites-panel').hidden=false;void run('favorites-status',loadFavorites);});
  el('favorites-close').addEventListener('click',()=>{el('favorites-panel').hidden=true;});
  el('favorites-query').addEventListener('input',drawFavorites);el('favorite-new').addEventListener('click',resetFavorite);
  el('favorite-form').addEventListener('submit',event=>{event.preventDefault();void run('favorites-status',async()=>{const source=favoriteSource??currentSource();if(!source)throw new Error('请先输入并预览一个有效公式，再保存收藏。');const reply=check(await window.math.saveFavorite({id:el<HTMLInputElement>('favorite-id').value,name:el<HTMLInputElement>('favorite-name').value,source,categoryId:el<HTMLSelectElement>('favorite-category').value||null}));status('favorites-status',reply.message);resetFavorite();await loadFavorites();});});
  const newCommand=()=>{for(const id of ['command-id','command-name','command-description','command-keywords','command-template'])(el(id) as HTMLInputElement).value='';el('command-preview').textContent='';};
  async function reloadCommands(){
    const reply=check(await window.math.commands());commands=reply.commands;editor.setCommands(commands);el('command-list').replaceChildren();
    if(reply.warning)status('settings-status',reply.warning,true);
    for(const command of commands){const row=document.createElement('div');row.className='command-row';const label=document.createElement('span');label.textContent=`${command.name} · ${command.description}`;const edit=document.createElement('button');edit.textContent='编辑';edit.className='secondary';edit.onclick=()=>{el<HTMLInputElement>('command-id').value=command.id;el<HTMLInputElement>('command-name').value=command.name;el<HTMLInputElement>('command-description').value=command.description;el<HTMLInputElement>('command-keywords').value=command.keywords.join(' ');el<HTMLTextAreaElement>('command-template').value=command.template;preview();};const remove=document.createElement('button');remove.textContent='删除';remove.className='secondary';remove.onclick=()=>void run('settings-status',async()=>{const result=check(await window.math.deleteCommand(command.id));status('settings-status',result.message);await reloadCommands();if(el<HTMLInputElement>('command-id').value===command.id)newCommand();});row.append(label,edit,remove);el('command-list').append(row);}
  }
  function preview(){try{el('command-preview').textContent=`展开结果：${parseTemplate(el<HTMLTextAreaElement>('command-template').value).text}`;}catch(error){el('command-preview').textContent=error instanceof Error?error.message:String(error);}}
  el('command-template').addEventListener('input',preview);el('command-new').addEventListener('click',newCommand);
  el('command-form').addEventListener('submit',event=>{event.preventDefault();void run('settings-status',async()=>{
    const command:CustomCommand={id:el<HTMLInputElement>('command-id').value,name:el<HTMLInputElement>('command-name').value.trim(),description:el<HTMLInputElement>('command-description').value.trim(),keywords:el<HTMLInputElement>('command-keywords').value.split(/[\s,，]+/).filter(Boolean),template:el<HTMLTextAreaElement>('command-template').value};
    const result=check(await window.math.saveCommand(command));status('settings-status',result.message);newCommand();await reloadCommands();
  });});
  async function loadHistory(){
    const token=++historyGeneration,result=check(await window.math.history(el<HTMLInputElement>('history-query').value,page));if(token!==historyGeneration)return;page=result.page;total=result.total;
    el('history-list').replaceChildren();el('history-count').textContent=`${total} 条 · 第 ${page+1}/${Math.max(1,Math.ceil(total/30))} 页`;
    el<HTMLButtonElement>('history-prev').disabled=page===0;el<HTMLButtonElement>('history-next').disabled=(page+1)*30>=total;
    if(!total){const empty=document.createElement('p');empty.className='muted';empty.textContent='还没有历史记录。成功复制、插入、导出或识别后会显示在这里。';el('history-list').append(empty);}
    result.entries.forEach(entry=>addHistory(entry));
  }
  function addHistory(entry:HistoryEntry){
    const row=document.createElement('article');row.className='history-entry';const code=document.createElement('code');code.textContent=entry.source;
    const meta=document.createElement('p');meta.className='muted';meta.textContent=`${new Date(entry.updatedAt).toLocaleString()} · ${{manual:'手动公式',file:'图片文件',clipboard:'剪贴板',screen:'截图'}[entry.origin]} · ${entry.action}${entry.imageRemoved?' · 原图已清理':''}`;
    const actions=document.createElement('div');actions.className='history-actions';const previewBox=document.createElement('div');previewBox.className='history-preview';previewBox.hidden=true;
    const button=(label:string,callback:()=>Promise<unknown>)=>{const b=document.createElement('button');b.textContent=label;b.className='secondary';b.onclick=()=>void run('history-status',async()=>{b.disabled=true;try{await callback();}finally{b.disabled=false;}});actions.append(b);};
    button('回填编辑',async()=>{if(isBusy())throw new Error('正在处理其他操作，请稍后回填。');const detail=check(await window.math.historyDetail(entry.id));if(isBusy())throw new Error('正在处理其他操作，请稍后回填。');if(editor.set(detail.entry.source,'history')){el('history-panel').hidden=true;el('settings').hidden=true;const image=el<HTMLImageElement>('ocr-image');image.hidden=!detail.image;if(detail.image){image.src=detail.image;el('ocr-panel').hidden=false;}else image.removeAttribute('src');el<HTMLTextAreaElement>('source').focus();notify('已回填历史公式，可继续编辑。');}});
    button('公式预览',async()=>{const result=check(await window.math.historyPreview(entry.id));previewBox.hidden=false;if(result.kind==='unicode'||result.kind==='formula')previewBox.innerHTML=result.html;else previewBox.textContent=result.message;});
    if(entry.image)button('查看原图',async()=>{const detail=check(await window.math.historyDetail(entry.id));if(!detail.image)throw new Error('原图已清理或无法读取，源码仍可回填。');previewBox.replaceChildren();const image=document.createElement('img');image.alt='识别时使用的原图';image.src=detail.image;previewBox.append(image);previewBox.hidden=false;});
    button('删除',async()=>{check(await window.math.deleteHistory(entry.id));await loadHistory();});
    row.append(code,meta,actions,previewBox);el('history-list').append(row);
  }
  el('history-toggle').addEventListener('click',()=>{editor.close();el('settings').hidden=true;el('favorites-panel').hidden=true;el('history-panel').hidden=false;void run('history-status',loadHistory);});
  el('history-close').addEventListener('click',()=>{el('history-panel').hidden=true;});
  el('settings-close').addEventListener('click',()=>{el('settings').hidden=true;});
  el('history-query').addEventListener('input',()=>{clearTimeout(queryTimer);page=0;queryTimer=setTimeout(()=>void run('history-status',loadHistory),150);});
  el('history-prev').addEventListener('click',()=>{if(page>0)page--;void run('history-status',loadHistory);});
  el('history-next').addEventListener('click',()=>{if((page+1)*30<total)page++;void run('history-status',loadHistory);});
  el('history-clear').addEventListener('click',()=>void run('history-status',async()=>{const reply=check(await window.math.clearHistory());status('history-status',reply.message);await loadHistory();}));
  void run('settings-status',reloadCommands);
}
