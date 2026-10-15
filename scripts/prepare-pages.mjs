// Prepare a Pages snapshot without changing the maintained dist/ files.
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const [destination,base='/the-reference-edit/',revision='local']=process.argv.slice(2);
if(!destination||!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)||!/^[-a-zA-Z0-9]+$/.test(revision))throw Error('Usage: node scripts/prepare-pages.mjs OUTPUT /base/ REVISION');
const output=path.resolve(destination);
if(output===root||output.startsWith(root+path.sep))throw Error('Use an output directory outside the source checkout');
await mkdir(path.dirname(output),{recursive:true});await cp(path.join(root,'dist'),output,{recursive:true,errorOnExist:true,force:false});
const scoped=text=>text.replace(/(["'])(\/(?!\/)[^"'\\\s]*?)\1/g,(_,quote,url)=>quote+base+url.slice(1)+quote);
const htmlPath=path.join(output,'index.html'),original=await readFile(htmlPath,'utf8');
const html=scoped(original);
const records=text=>text.match(/<article\b[^>]*class="source"[\s\S]*?<\/article>/g);
if(JSON.stringify(records(html))!==JSON.stringify(records(original)))throw Error('Pages preparation changed a curated record');
await writeFile(htmlPath,html);
const manifestPath=path.join(output,'manifest.webmanifest'),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
for(const key of ['id','start_url','scope'])manifest[key]=base;
for(const [group,key] of [['icons','src'],['screenshots','src'],['shortcuts','url']])for(const item of manifest[group]||[])item[key]=base+item[key].replace(/^\//,'');
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
const workerPath=path.join(output,'sw.js');let worker=scoped(await readFile(workerPath,'utf8'));
const escaped=base.replaceAll('/','\\/');
worker=worker.replace('/^\\/images\\/',`/^${escaped}images\\/`);
worker=worker.replace(/const CACHE='[^']+'/,`const CACHE='reference-edit-pages-shell-${revision}'`);
worker=worker.replace("name.startsWith('visual-edit-shell-')","(name.startsWith('reference-edit-pages-shell-')||name.startsWith('reference-edit-phone-preview-shell-'))");
await writeFile(workerPath,worker);await writeFile(path.join(output,'.nojekyll'),'');
console.log(`Prepared ${output} for ${base} at ${revision}`);
