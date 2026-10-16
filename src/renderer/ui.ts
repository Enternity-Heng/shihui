const icons:Record<string,string>={
  'mode-formula':'M18 4H6l7 8-7 8h12',
  'mode-pseudocode':'m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16',
  'mode-flowchart':'M8 3h8v5H8zM3 16h6v5H3zm12 0h6v5h-6zM12 8v4M6 16v-4h12v4',
  'specialty-open':'M4 19V5m0 14h16M8 15l4-6 7 3M8 15h.01M12 9h.01M19 12h.01',
  'templates-open':'M4 4h6v7H4zm10 0h6v7h-6zM4 15h6v5H4zm10 0h6v5h-6z',
  'cases-open':'M8 5H4v16h16V5h-4M8 3h8v4H8zm0 9h8m-8 4h5',
  'builder-open':'M7 3H3v18h4m10-18h4v18h-4M8 8h.01M16 8h.01M8 16h.01M16 16h.01',
  'expression-open':'M4 8h16M4 16h16M9 4v8m6 0v8',
  'capture-start':'M4 8V4h4m8 0h4v4m0 8v4h-4M8 20H4v-4M8 8h8v8H8z',
  'ocr-toggle':'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M8 8h.01',
  'favorites-toggle':'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
  'history-toggle':'M3 11a9 9 0 1 1 2 6M3 4v7h7m2-4v5l3 2',
  'settings-toggle':'M4 7h16M4 17h16M8 4v6m8 4v6',
  hide:'M6 6l12 12M18 6 6 18',
  'copy-source':'M9 8H5v12h12v-4M9 4h12v12H9z',
  'save-image':'M4 4h16v16H4zM8 4v6h8V4M8 20v-6h8v6',
  'copy-image':'M9 8H5v12h12v-4M9 4h12v12H9zM12 12l3-3 3 3',
};
export function initializeUI(){
  // Move the existing controls, preserving their listeners and stable IDs.
  const modes=document.querySelector<HTMLElement>('.work-modes')!;
  modes.append(document.getElementById('specialty-open')!);
  const tools=document.createElement('nav');tools.className='formula-tools';tools.setAttribute('aria-label','公式工具');
  for(const [id,description] of [['templates-open','按专业搜索公式，插入后联动填写变量'],['cases-open','浏览完整例题与推导，打开配套绘图'],['builder-open','逐格填写矩阵或方程组'],['expression-open','单位、化学式、分段函数与对齐表达式']]){const button=document.getElementById(id)!;button.title=description;tools.append(button);}
  document.querySelector('.editor')!.before(tools);
  const activeMode=()=>{const current=['pseudocode-panel','flowchart-panel','specialty-panel'].find(id=>!document.getElementById(id)!.hidden);for(const [id,panel] of [['mode-formula',undefined],['mode-pseudocode','pseudocode-panel'],['mode-flowchart','flowchart-panel'],['specialty-open','specialty-panel']])document.getElementById(id!)!.setAttribute('aria-pressed',String(current===panel));};
  document.addEventListener('workspace-panel-change',activeMode);activeMode();
  for(const [id,d] of Object.entries(icons)){const button=document.getElementById(id)!;const label=button.textContent!;button.setAttribute('aria-label',label);button.replaceChildren();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);button.append(svg);if(id==='hide'){button.setAttribute('aria-label','隐藏到托盘');}else{const span=document.createElement('span');span.textContent=label;button.append(span);}}
  const settings=document.getElementById('settings')!,heading=settings.querySelector('.drawer-heading')!,status=document.getElementById('settings-status')!,draft=document.getElementById('draft-settings')!;
  const tabs=document.createElement('div');tabs.className='settings-tabs';tabs.role='tablist';tabs.setAttribute('aria-label','设置分类');
  const sections=['通用设置','自定义命令','图片样式'].map((name,i)=>{const panel=document.createElement('section');panel.id=`settings-page-${i}`;panel.role='tabpanel';panel.setAttribute('aria-labelledby',`settings-tab-${i}`);const button=document.createElement('button');button.id=`settings-tab-${i}`;button.role='tab';button.textContent=name;button.setAttribute('aria-controls',panel.id);tabs.append(button);return {button,panel};});
  let current=0;for(const node of Array.from(settings.children)){if(node===heading||node===status||node===draft)continue;if(node.tagName==='H3'&&node.textContent==='自定义命令')current=1;if(node.tagName==='H3'&&node.textContent==='图片样式')current=2;sections[current].panel.append(node);}sections[0].panel.append(draft);
  settings.append(tabs,...sections.map(s=>s.panel),status);
  const select=(index:number,focus=false)=>{sections.forEach(({button,panel},i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;panel.hidden=i!==index;});if(focus)sections[index].button.focus();};
  sections.forEach(({button},i)=>{button.addEventListener('click',()=>select(i));button.addEventListener('keydown',event=>{let next=i;if(event.key==='ArrowRight')next=(i+1)%3;else if(event.key==='ArrowLeft')next=(i+2)%3;else if(event.key==='Home')next=0;else if(event.key==='End')next=2;else return;event.preventDefault();select(next,true);});});select(0);
  // Opening settings from the tray always makes the shortcut field reachable.
  window.math.onOpen(settingsRequested=>{if(settingsRequested)select(0);});
}
