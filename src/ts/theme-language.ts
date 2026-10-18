(()=>{
 const root=document.documentElement, toggle=document.querySelector<HTMLElement>('[data-theme-toggle]'), system=matchMedia('(prefers-color-scheme: dark)');
 let explicit=false;
 try{explicit=['light','dark'].includes(localStorage.getItem('visual-edit-theme')??'');}catch(e){}
 function apply(theme:string|undefined){root.dataset.theme=theme;const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'#191817':'#F7F4EE';toggle?.setAttribute('aria-pressed',String(theme==='dark'));}
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
