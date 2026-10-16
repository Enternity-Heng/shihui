export function initializePanelManager(){
  const panels=Array.from(document.querySelectorAll<HTMLElement>('.drawer'));
  const triggers:Record<string,string>={settings:'settings-toggle','favorites-panel':'favorites-toggle','history-panel':'history-toggle','builder-panel':'builder-open','review-panel':'review-open','templates-panel':'templates-open','pseudocode-panel':'mode-pseudocode','expression-panel':'expression-open','flowchart-panel':'mode-flowchart','specialty-panel':'specialty-open','cases-panel':'cases-open'};
  let current:HTMLElement|null=null,returnFocus:HTMLElement|null=null;
  const notify=()=>document.dispatchEvent(new Event('workspace-panel-change'));
  const sync=(preferred?:HTMLElement)=>{const visible=panels.filter(p=>!p.hidden);const next=preferred&&!preferred.hidden?preferred:visible.at(-1)??null;if(next===current)return;
    if(next){returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;for(const p of panels)if(p!==next)p.hidden=true;current=next;for(const p of panels){p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');}document.querySelector<HTMLElement>('.app')!.inert=true;requestAnimationFrame(()=>{if(current===next)(next.querySelector<HTMLElement>('input:not([type=hidden]),textarea,button,select')??next).focus();});}
    else{const previous=current;current=null;document.querySelector<HTMLElement>('.app')!.inert=false;const trigger=previous?document.getElementById(triggers[previous.id]):null;(returnFocus?.isConnected&&!returnFocus.closest('[hidden]')?returnFocus:trigger??document.getElementById('source'))?.focus();}
    for(const [panel,trigger] of Object.entries(triggers))document.getElementById(trigger)?.setAttribute('aria-expanded',String(current?.id===panel));notify();
  };
  const observer=new MutationObserver(records=>{const preferred=records.map(r=>r.target as HTMLElement).filter(p=>!p.hidden).at(-1);sync(preferred);});for(const p of panels)observer.observe(p,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('keydown',event=>{if(!current||event.isComposing)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();current.hidden=true;sync();return;}if(event.key==='Tab'){const focusable=Array.from(current.querySelectorAll<HTMLElement>('button,input:not([type=hidden]),textarea,select,[tabindex="0"]')).filter(e=>!(e as HTMLButtonElement).disabled&&e.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
  // Existing settings markup lives inside .app; move all dialogs out before using inert.
  for(const p of panels)document.body.append(p);
  return {open(id:string){const panel=document.getElementById(id)!;panel.hidden=false;sync(panel);},close(){if(current){current.hidden=true;sync();}},current:()=>current?.id??null};
}
