(()=>{
 type State='loading'|'ready'|'error'|'empty';
 interface EditorialEntry{
  id:string;city:string;context:string;caption:string;disclosure:string;
  image:string;imageType:string;source:string;width:number;height:number;assetStatus:string;
 }
 interface Card{
  entry:EditorialEntry;image:HTMLImageElement;city:HTMLHeadingElement;
  context:HTMLParagraphElement;caption:HTMLParagraphElement;disclosure:HTMLParagraphElement;missing:HTMLParagraphElement;
 }
 const gridElement=document.querySelector<HTMLElement>('#editorial-grid'),statusElement=document.querySelector<HTMLElement>('#editorial-status'),retryElement=document.querySelector<HTMLElement>('#editorial-retry');
 if(!gridElement||!statusElement||!retryElement)throw Error('Editorial gallery markup is missing');
 const grid=gridElement,status=statusElement,retry=retryElement;
 // Pages preparation scopes this URL. JSON image paths stay canonical; resolve them against the catalog's app root explicitly.
 const catalogURL=new URL('/data/references.json',location.href),appRoot=new URL('../',catalogURL);
 let state:State='loading',cards:Card[]=[],requestId=0;
 const messages:Partial<Record<State,string>>={loading:'Loading editorial studies…',error:'Editorial studies are unavailable. Try again when connected.',empty:'No editorial studies are available yet.'};
 function localize(){
  status.hidden=state==='ready';status.textContent=t(messages[state]||'');retry.hidden=state!=='error';retry.textContent=t('Try again');
  for(const card of cards){const {entry,image,city,context,caption,disclosure,missing}=card;
   city.textContent=t(entry.city);context.textContent=t(entry.context);caption.textContent=t(entry.caption);disclosure.textContent=t(entry.disclosure);
   image.alt=t(entry.city)+'. '+t(entry.caption);missing.textContent=t('Image unavailable. The editorial caption is still available below.');
  }
 }
 function render(entries:EditorialEntry[]){
  grid.replaceChildren();cards=[];
  entries.forEach((entry,index)=>{
   const figure=document.createElement('figure');figure.className='editorial-card';figure.dataset.referenceId=entry.id;
   const frame=document.createElement('div');frame.className='editorial-image';frame.style.setProperty('--editorial-ratio',entry.width+' / '+entry.height);
   const image=document.createElement('img');image.width=entry.width;image.height=entry.height;image.decoding='async';
   const missing=document.createElement('p');missing.className='editorial-image-error';missing.hidden=true;
   image.addEventListener('error',()=>{image.hidden=true;missing.hidden=false;});
   image.src=new URL(entry.image.slice(1),appRoot).href;frame.append(image,missing);
   const body=document.createElement('figcaption'),line=document.createElement('div');line.className='editorial-cityline';
   const city=document.createElement('h3'),number=document.createElement('span');number.className='editorial-number';number.textContent=String(index+1).padStart(2,'0');number.setAttribute('aria-hidden','true');line.append(city,number);
   const context=document.createElement('p'),caption=document.createElement('p'),disclosure=document.createElement('p');context.className='editorial-context';caption.className='editorial-caption';disclosure.className='editorial-disclosure';
   body.append(line,context,caption,disclosure);figure.append(frame,body);grid.append(figure);cards.push({entry,image,city,context,caption,disclosure,missing});
  });
 }
 async function load(){
  const restoreFocus=document.activeElement===retry,id=++requestId;state='loading';localize();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
   const response=await fetch(catalogURL,{signal:controller.signal});if(!response.ok)throw Error('Catalog unavailable');
   const data=await response.json() as {version?:unknown;references?:unknown};if(data.version!==1||!Array.isArray(data.references))throw Error('Invalid catalog');
   const ids=new Set<string>();for(const entry of data.references as {id?:unknown}[]){if(!entry||typeof entry.id!=='string'||!entry.id.trim()||ids.has(entry.id))throw Error('Invalid IDs');ids.add(entry.id);}
   const entries=(data.references as EditorialEntry[]).filter(entry=>entry.assetStatus==='available');
   for(const entry of entries){
    if(!['city','context','caption','disclosure'].every(key=>typeof entry[key as keyof EditorialEntry]==='string'&&String(entry[key as keyof EditorialEntry]).trim())||entry.imageType!=='ai-generated'||entry.source!=='Created with ChatGPT'||entry.disclosure!=='AI-generated editorial illustration · Created with ChatGPT · Not documentary photography'||!Number.isInteger(entry.width)||entry.width<=0||!Number.isInteger(entry.height)||entry.height<=0||typeof entry.image!=='string'||!/^\/images\/references\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:jpg|jpeg|png|webp|avif)$/.test(entry.image))throw Error('Invalid reference');
   }
   if(id!==requestId)return;render(entries);state=entries.length?'ready':'empty';
  }catch(error){if(id!==requestId)return;render([]);state='error';}
  finally{clearTimeout(timer);if(id===requestId){localize();if(restoreFocus){const target=state==='error'?retry:document.querySelector<HTMLElement>('#editorial-title');if(target&&target!==retry)target.setAttribute('tabindex','-1');target?.focus({preventScroll:true});}}}
 }
 retry.addEventListener('click',load);window.addEventListener('visual-edit:languagechange',localize);requestAnimationFrame(()=>setTimeout(load,0));
})();
