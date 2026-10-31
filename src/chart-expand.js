let expanded=null,active=null,muted=[];
function release(){for(const [node,value] of muted)node.inert=value;muted=[];active?.classList.remove('chart-expanded');active?.removeAttribute('role');active?.removeAttribute('aria-modal');active=null;document.body.classList.remove('chart-is-expanded');}
function focusables(){return [...(active?.querySelectorAll('button,input,select,a[href],summary,[tabindex="0"]')||[])].filter(e=>!e.disabled&&e.getClientRects().length);}
function close(){const key=expanded;expanded=null;release();document.querySelector(`[data-chart-expand="${key}"]`)?.focus({preventScroll:true});}
function expand(panel,key,focus=true){release();expanded=key;active=panel;panel.classList.add('chart-expanded');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',panel.querySelector('h2')?.textContent||'Chart');document.body.classList.add('chart-is-expanded');for(let node=panel;node.parentElement&&node!==document.body;node=node.parentElement){for(const sibling of node.parentElement.children)if(sibling!==node){muted.push([sibling,sibling.inert]);sibling.inert=true;}}if(focus)panel.querySelector('.chart-collapse')?.focus({preventScroll:true});}
document.addEventListener('keydown',event=>{if(!active)return;if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const items=focusables(),first=items[0],last=items.at(-1);if(event.shiftKey&&(document.activeElement===first||!active.contains(document.activeElement))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||!active.contains(document.activeElement))){event.preventDefault();first?.focus();}}});
export function bindChartExpand(root){
 release();const panels=[...root.querySelectorAll('.portfolio-chart,.allocation-panel,.income-panel')];let found=false;
 for(const panel of panels){const key=panel.classList.contains('portfolio-chart')?'performance':panel.classList.contains('allocation-panel')?'allocation':'income',head=panel.querySelector('.panel-head');if(!head)continue;
 const button=document.createElement('button');button.type='button';button.className='secondary chart-expand';button.dataset.chartExpand=key;button.textContent='⛶';button.setAttribute('aria-label','Expand '+(panel.querySelector('h2')?.textContent||'chart'));button.title='Expand chart';button.onclick=()=>expand(panel,key);head.append(button);
 const collapse=document.createElement('button');collapse.type='button';collapse.className='secondary chart-collapse';collapse.textContent='✕ Close';collapse.onclick=close;panel.prepend(collapse);
 if(expanded===key){expand(panel,key,false);found=true;}
 }
 if(expanded&&!found){expanded=null;release();}
}
