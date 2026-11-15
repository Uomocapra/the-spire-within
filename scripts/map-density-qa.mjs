import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:6112'),cdp=await browser.newBrowserCDPSession();
let targetId,page,passed=false;
const checks=[],errors=[],pause=ms=>new Promise(r=>setTimeout(r,ms)),out=resolve(import.meta.dirname,'../artifacts');
try{
 const url='http://127.0.0.1:4178/?density-qa='+Date.now();({targetId}=await cdp.send('Target.createTarget',{url,background:true}));
 for(let i=0;i<50;i++){page=browser.contexts()[0].pages().find(p=>p.url()===url);if(page)break;await pause(100);}
 assert.ok(page);page.on('pageerror',e=>errors.push(e.message));await page.waitForSelector('.hero');await page.emulateMedia({reducedMotion:'reduce'});
 const pc=await page.context().newCDPSession(page);pc.on('Page.screencastFrame',e=>pc.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{}));await pc.send('Page.startScreencast',{format:'jpeg',quality:1,everyNthFrame:1});
 const click=s=>page.locator(s).evaluate(el=>el.click());
 const ready=()=>page.waitForFunction(()=>document.querySelector('#question-dialog')?.open&&!document.querySelector('#question-dialog.is-revealing'),null,{polling:50});
 for(const length of [30,50]){
  await page.evaluate(length=>{const answers=Array(length).fill(null);answers.fill(1,0,9);localStorage.setItem('spire-personality-v3',JSON.stringify({version:3,length,answers,index:9,autoAdvance:false,mapSeed:length===30?88291:7182}));location.hash='#test';},length);await page.reload();await ready();
  for(const [width,height]of [[1440,1080],[390,844],[320,568]]){
   await pc.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   await page.screenshot({path:resolve(out,`density-${length}-${width}-question.png`),fullPage:false});
   await click('[data-action="show-map"]');await pause(80);
   await page.locator('.spire-map').evaluate(async(root,length)=>{const {positionJourney}=await import('./journey-map.js');positionJourney(root,length,9);},length);
   const geometry=await page.evaluate(()=>{
    const box=s=>document.querySelector(s).getBoundingClientRect();
    const main=box('.map-node:not(.is-finish) .map-original-icon'),branch=box('.map-branch-spot .map-original-icon'),title=box('.map-active-title'),viewport=box('.map-viewport');
    return {mainSize:main.width,branchSize:branch.width,hitSize:box('.map-node:not(.is-finish)').width,titleAboveMap:title.bottom<=viewport.top,overflow:document.documentElement.scrollWidth>innerWidth+1,inlineLabels:document.querySelectorAll('.map-node-label,.map-chapter,.map-player-caption').length};
   });
   assert.equal(geometry.mainSize,geometry.branchSize);assert.equal(geometry.titleAboveMap,true);assert.equal(geometry.overflow,false);assert.equal(geometry.inlineLabels,0);
   assert.equal(geometry.mainSize,width<500?29:32,'Map icons are half their previous size');assert.ok(geometry.hitSize>=44,'Touch targets remain usable');
   await page.screenshot({path:resolve(out,`density-${length}-${width}-middle.png`),fullPage:false});
   await page.locator('.map-viewport').evaluate(el=>el.scrollTop=0);
   await page.screenshot({path:resolve(out,`density-${length}-${width}-top.png`),fullPage:false});
   checks.push({length,width,...geometry});
   await click('[data-action="open-question"]');await ready();
  }
 }
 // Render the exact SVG presentation over transparent pixels, keeping its
 // original PNG embedded only for this read-only alpha check.
 const transparency=await page.evaluate(async()=>{
  const {journeyIcon}=await import('./journey-map.js'),results=[];
  for(const kind of ['event','battle','elite','fire','shop','summit']){
   const holder=document.createElement('div');holder.innerHTML=journeyIcon(kind);const svg=holder.firstElementChild;svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.style.color='#26383b';
   const node=svg.querySelector('image'),blob=await(await fetch(node.getAttribute('href'))).blob();
   const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});node.setAttribute('href',data);
   const rendered=new Image();rendered.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.outerHTML);await rendered.decode();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=100;const ctx=canvas.getContext('2d');ctx.drawImage(rendered,0,0);const pixels=ctx.getImageData(0,0,100,100).data;
   let cornerAlpha=0,inkPixels=0;
   for(let y=0;y<100;y++)for(let x=0;x<100;x++){const alpha=pixels[(y*100+x)*4+3];if((x<5||x>=95)&&(y<5||y>=95))cornerAlpha=Math.max(cornerAlpha,alpha);if(alpha>128)inkPixels++;}
   results.push({kind,cornerAlpha,inkPixels});
  }return results;
 });
 for(const icon of transparency){assert.equal(icon.cornerAlpha,0,icon.kind+' has no opaque background');assert.ok(icon.inkPixels>100,icon.kind+' retains its original silhouette');}
 checks.push({transparency});
 // The heading follows arrival as well as returning to a previous floor.
 await click('input[value="1"]');await click('[data-action="next"]');await ready();
 assert.equal(await page.locator('.map-active-title').textContent(),await page.locator('.map-node.is-current').getAttribute('data-map-title'));
 await click('[data-action="previous"]');await ready();assert.match(await page.locator('.map-active-subtitle').textContent(),/第 10 层/);
 assert.deepEqual(errors,[]);passed=true;console.log(JSON.stringify({passed,checks,errors}));
}finally{
 if(targetId)await cdp.send('Target.closeTarget',{targetId});let remaining=true;for(let i=0;i<40;i++){remaining=(await cdp.send('Target.getTargets')).targetInfos.some(t=>t.targetId===targetId);if(!remaining)break;await pause(100);}
 await writeFile(resolve(out,'map-density-checks.json'),JSON.stringify({passed,checks,errors,taskTabsRemaining:remaining?1:0},null,2));await cdp.detach();await browser.close();assert.equal(remaining,false);
}
