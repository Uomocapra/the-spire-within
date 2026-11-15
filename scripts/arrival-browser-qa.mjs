import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:6112');
const cdp=await browser.newBrowserCDPSession(), pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let id,page,allow=false,passed=false;const pending=[],checks=[],errors=[],requests=[];
try {
 const url='http://127.0.0.1:4178/?arrival-qa='+Date.now();({targetId:id}=await cdp.send('Target.createTarget',{url,background:true}));
 for(let i=0;i<50;i++){page=browser.contexts()[0].pages().find(p=>p.url()===url);if(page)break;await pause(100);}await page.waitForSelector('.hero');
 const pc=await page.context().newCDPSession(page);pc.on('Page.screencastFrame',e=>pc.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{}));await pc.send('Page.startScreencast',{format:'jpeg',quality:1,everyNthFrame:1});
 await pc.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pc.send('Network.enable');await pc.send('Network.setCacheDisabled',{cacheDisabled:true});await page.emulateMedia({reducedMotion:'no-preference'});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.route('**/assets/ai-scenes/merchant.webp',r=>{if(allow)return r.continue();pending.push(r);});
 await page.evaluate(()=>localStorage.removeItem('spire-personality-v3'));await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.hero');
 const click=s=>page.locator(s).evaluate(el=>el.click());const opened=()=>page.waitForFunction(()=>document.querySelector('#question-dialog')?.open&&!document.querySelector('#question-dialog.is-revealing'),null,{polling:20});
 assert.match(await page.locator('.hero').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),/ai-scenes\/home\.webp/);
 await page.screenshot({path:'artifacts/ink-home-mobile.png'});
 await page.evaluate(()=>{
   window.phases=[];let seen=null;
   window.inkFrames=[];window.inkEnds=[];
   function sampleInk(){
     const node=document.querySelector('.map-node.is-inking');
     if(node){
       const stroke=node.querySelector('.arrival-stroke'),rect=stroke.getBoundingClientRect();
       window.inkFrames.push({index:Number(node.dataset.node),offset:parseFloat(getComputedStyle(stroke).strokeDashoffset),visible:getComputedStyle(stroke).visibility==='visible'&&rect.top>=0&&rect.bottom<=innerHeight&&!document.querySelector('#question-dialog[open]')});
     }
     requestAnimationFrame(sampleInk);
   }
   requestAnimationFrame(sampleInk);
   document.addEventListener('animationend',e=>{if(e.animationName==='map-circle-arrive')window.inkEnds.push({index:Number(e.target.closest('.map-node').dataset.node),t:performance.now()});},true);
   new MutationObserver(()=>{const d=document.querySelector('#question-dialog.is-revealing[open]');if(!d||d===seen)return;seen=d;const rect=d.querySelector('.encounter-stage').getBoundingClientRect();window.phases.push({phase:'background',t:performance.now(),room:d.querySelector('.encounter-stage').dataset.room,opacity:getComputedStyle(d.querySelector('.question-card')).opacity,inert:d.querySelector('.question-shell').inert,width:rect.width,height:rect.height,full:!!d.querySelector('.encounter-photo')});}).observe(document.body,{subtree:true,attributes:true,childList:true});
   for(const [name,event]of [['flip','animationstart'],['ready','animationend']])document.addEventListener(event,e=>{if(e.animationName==='question-card-reveal')window.phases.push({phase:name,t:performance.now()});});
 });
 await click('[data-action="start"]');await page.waitForSelector('#question-dialog.is-revealing');
 await page.locator('.encounter-preview').evaluate(i=>i.decode());
 await opened();assert.ok(pending.length>0,'The original picture is still unavailable');
 await page.waitForFunction(()=>window.phases.some(p=>p.phase==='ready'),null,{polling:20,timeout:3000});
 let phases=await page.evaluate(()=>window.phases);let [bg,flip,ready]=phases;
 assert.equal(bg.phase,'background');assert.equal(bg.opacity,'0');assert.equal(bg.inert,true);assert.equal(bg.full,false);assert.ok(bg.width>=320&&bg.height===844);assert.equal(flip.phase,'flip');assert.equal(ready.phase,'ready');assert.ok(flip.t-bg.t>=430,'Scene is presented before the flip');
 assert.equal(await page.locator('.encounter-photo').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'question-heading');
 assert.ok(requests.some(u=>u.endsWith('/assets/ai-scenes/relic.webp')),'Next room requested before first answer');checks.push({coldScene:bg.room,hold:Math.round(flip.t-bg.t),total:Math.round(ready.t-bg.t),lateImageDidNotDelayQuestion:true});
 allow=true;await Promise.all(pending.splice(0).map(r=>r.continue().catch(()=>{})));await page.waitForSelector('.encounter-photo');await page.screenshot({path:'artifacts/arrival-mobile-ready.png'});
 await click('input[name="answer"][value="1"]');await page.waitForFunction(()=>window.phases.filter(p=>p.phase==='background').length===2,null,{polling:20});await opened();
 phases=await page.evaluate(()=>window.phases);const next=phases.filter(p=>p.phase==='background')[1];assert.equal(next.room,'relic');assert.equal(next.full,true);assert.equal(next.opacity,'0');checks.push({nextRoom:next.room,decodedOnArrival:next.full});
 const evidence=await page.evaluate(()=>({frames:window.inkFrames,ends:window.inkEnds,backdrops:window.phases.filter(p=>p.phase==='background')}));
 for(const index of [0,1]){
   const drawing=evidence.frames.filter(f=>f.index===index&&f.visible&&f.offset>0&&f.offset<100);
   assert.ok(drawing.length>=2,'Several visible frames draw the ink circle on the destination');
   assert.ok(evidence.ends.find(e=>e.index===index).t<=evidence.backdrops[index].t,'Room opens after the circle finishes');
   checks.push({floor:index+1,visibleInkFrames:drawing.length});
 }
 assert.equal(await page.locator('.encounter-stage').evaluate(el=>getComputedStyle(el,'::before').content),'none');
 assert.equal(await page.locator('.encounter-preview').evaluate(el=>getComputedStyle(el).objectFit),'cover');
 await click('[data-action="previous"]');await page.waitForSelector('#question-dialog.is-revealing');await page.locator('#question-dialog').evaluate(d=>d.close());await pause(1600);assert.equal(await page.locator('#question-dialog[open]').count(),0);checks.push('Closing during the entrance cancels the flip and later focus');
 await page.emulateMedia({reducedMotion:'reduce'});await click('[data-action="open-question"]');await opened();assert.equal(await page.locator('.question-card').evaluate(el=>el.getAnimations().length),0);checks.push('Reduced motion shows an immediately usable question');
 await page.emulateMedia({reducedMotion:'no-preference'});await click('[data-action="next"]');await page.waitForSelector('.map-node.is-inking');await click('[data-action="home"]');await pause(900);assert.equal(await page.locator('.hero').count(),1);assert.equal(await page.locator('#question-dialog[open]').count(),0);checks.push('Leaving during the ink stroke cancels the next room');
 assert.deepEqual(errors,[]);passed=true;console.log(JSON.stringify({passed,checks}));
} finally {
 allow=true;await Promise.all(pending.splice(0).map(r=>r.continue().catch(()=>{})));if(id)await cdp.send('Target.closeTarget',{targetId:id});let remains=true;for(let i=0;i<40;i++){remains=(await cdp.send('Target.getTargets')).targetInfos.some(t=>t.targetId===id);if(!remains)break;await pause(100);}await writeFile('artifacts/arrival-checks.json',JSON.stringify({passed,checks,errors,taskTabsRemaining:remains?1:0},null,2));await cdp.detach();await browser.close();assert.equal(remains,false);
}
