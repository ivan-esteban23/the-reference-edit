(()=>{
 const root=document.documentElement, toggle=document.querySelector<HTMLElement>('[data-theme-toggle]'), system=matchMedia('(prefers-color-scheme: dark)');
 let explicit=false;
 try{explicit=['light','dark'].includes(localStorage.getItem('visual-edit-theme')??'');}catch(e){}
 function apply(theme:string|undefined){root.dataset.theme=theme;const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'#151513':'#f3f0e9';toggle?.setAttribute('aria-pressed',String(theme==='dark'));}
 apply(root.dataset.theme);
 toggle?.addEventListener('click',()=>{explicit=true;const next=root.dataset.theme==='dark'?'light':'dark';apply(next);try{localStorage.setItem('visual-edit-theme',next);}catch(e){}});
 const followSystem=()=>{if(!explicit)apply(system.matches?'dark':'light');};
 if(system.addEventListener)system.addEventListener('change',followSystem);else system.addListener(followSystem);
 window.addEventListener('storage',event=>{if(event.key!=='visual-edit-theme'&&event.key!==null)return;explicit=event.newValue==='light'||event.newValue==='dark';if(explicit)apply(event.newValue??undefined);else followSystem();});
})();
(()=>{
 const select=document.querySelector<HTMLSelectElement>('#language'), code=document.querySelector<HTMLElement>('.language-code');
 if(!select||!code)return;
 const short:Record<string,string>={'zh-Hans':'简体','zh-Hant':'繁體','ja':'日本語','ko':'한국어','es':'ES','en':'EN'};
 const sync=()=>{code.dataset.code=short[select.value]||select.value.toUpperCase();};
 select.addEventListener('change',sync);window.addEventListener('visual-edit:languagechange',sync);window.addEventListener('popstate',sync);sync();
})();
(()=>{
 const root=document.documentElement, toggle=document.querySelector<HTMLButtonElement>('[data-text-size-toggle]');
 if(!toggle)return;
 const steps=['','large','xlarge'] as const;
 const apply=(mode:string)=>{if(mode==='large'||mode==='xlarge')root.dataset.textSize=mode;else delete root.dataset.textSize;toggle.setAttribute('aria-pressed',String(mode==='large'||mode==='xlarge'));};
 apply(root.dataset.textSize||'');
 toggle.addEventListener('click',()=>{const cur=root.dataset.textSize||'';const next=steps[(steps.indexOf(cur as typeof steps[number])+1)%steps.length]??'';apply(next);try{if(next)localStorage.setItem('visual-edit-text-size',next);else localStorage.removeItem('visual-edit-text-size');}catch(e){}});
 window.addEventListener('storage',event=>{if(event.key!=='visual-edit-text-size'&&event.key!==null)return;apply(event.newValue||'');});
})();

(()=>{
 const root=document.documentElement,cover=document.querySelector<HTMLImageElement>('.cover-frame img');
 const activate=()=>{if(root.dataset.fontsReady)return;root.dataset.fontsReady='true';document.fonts?.load('400 1rem Newsreader');document.fonts?.load('400 1rem Inter');};
 if(!cover||cover.complete)activate();
 else{cover.addEventListener('load',activate,{once:true});cover.addEventListener('error',activate,{once:true});}
})();