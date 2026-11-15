import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:6112');
const cdp=await browser.newBrowserCDPSession();
const checks=[],errors=[];let targetId,page;
const out=resolve(import.meta.dirname,'../artifacts');await mkdir(out,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const click=s=>page.locator(s).evaluate(el=>el.click());
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('spire-personality-v3')));
const opened=index=>page.waitForFunction(index=>document.querySelector('#question-dialog')?.open && !document.querySelector('#question-dialog.is-revealing') && !document.querySelector('.is-travelling') && JSON.parse(localStorage.getItem('spire-personality-v3')).index===index,index,{polling:50,timeout:10000});
const overflow=async label=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' no horizontal overflow');
const screenshot=name=>process.env.MAP_QA_SCREENSHOTS==='0'?Promise.resolve():page.screenshot({path:resolve(out,'map-'+name+'.png'),fullPage:false});
try{
 const url='http://127.0.0.1:4178/?map-qa='+Date.now();
 ({targetId}=await cdp.send('Target.createTarget',{url,background:true}));
 for(let i=0;i<50;i++){page=browser.contexts()[0].pages().find(p=>p.url()===url);if(page)break;await pause(100);}
 assert.ok(page,'Owned background task tab');page.on('pageerror',e=>errors.push(e.message));
 await page.waitForSelector('.hero');await page.evaluate(()=>localStorage.removeItem('spire-personality-v3'));await page.reload();await page.waitForSelector('.hero');
 const pc=await page.context().newCDPSession(page);
 // Request compositor frames for this background page without activating its tab/window.
 pc.on('Page.screencastFrame',event=>pc.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{}));
 await pc.send('Page.startScreencast',{format:'jpeg',quality:1,everyNthFrame:1});
 await pc.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await click('[data-action="start"]');await opened(0);await screenshot('desktop-question');
 const beforeBrowsing=await state();
 await click('#question-dialog .stall-handle');
 assert.equal(await page.locator('#question-dialog .stall-handle').getAttribute('aria-expanded'),'true');
 await page.locator('#question-dialog .stall-goods img').evaluate(image=>image.decode());
 await click('#question-dialog .stall-handle');
 assert.deepEqual(await state(),beforeBrowsing,'Browsing the merchant never answers the question');
 const originalSeed=(await state()).mapSeed;
 const originalRoute=await page.locator('.map-route').evaluateAll(paths=>paths.map(p=>p.getAttribute('d')));
 assert.ok(Number.isInteger(originalSeed)&&originalSeed>0);
 await click('[data-action="show-map"]');await pause(100);assert.equal(await page.locator('#question-dialog').evaluate(el=>el.open),false);
 await page.locator('.map-branch-spot').first().evaluate(el=>el.click());
 await page.locator('.room-preview .room-image').evaluate(image=>image.decode());
 await click('#dialog [data-action="close-dialog"]');
 assert.deepEqual(await state(),beforeBrowsing,'Closing a side room preserves the current node and its answer');
 assert.equal(await page.locator('[data-node="0"]').isEnabled(),true);assert.equal(await page.locator('[data-node="1"]').isEnabled(),false);
 await overflow('Desktop');await screenshot('desktop-route');
 await pc.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await page.locator('.spire-map').evaluate(async root=>{const {positionJourney}=await import('./journey-map.js');positionJourney(root,30,0);});
 await overflow('Mobile');await screenshot('mobile-route');
 await click('[data-node="0"]');await opened(0);await screenshot('mobile-question');
 await click('input[value="2"]');
 await page.waitForSelector('.map-quiz-page.is-travelling');
 const firstTop=await page.locator('.map-player').evaluate(el=>parseFloat(el.style.top));
 await page.evaluate(()=>{
   document.querySelector('#next-question').click();document.querySelector('#next-question').click();
   const radio=document.querySelector('input[value="-2"]');radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));
   document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 });
 await page.waitForFunction(top=>parseFloat(document.querySelector('.map-player').style.top)<top,firstTop,{polling:50,timeout:4000});
 const nextTop=await page.locator('.map-player').evaluate(el=>parseFloat(el.style.top));
 assert.ok(nextTop<firstTop,`Traveller moves up (${firstTop} -> ${nextTop})`);await screenshot('mobile-travel');
 await opened(1);let saved=await state();assert.equal(saved.answers[0],2);assert.equal(saved.answers[1],null);assert.equal(saved.index,1);
 checks.push('Default answer closes modal, moves traveller up curved route and opens exactly one next question despite rapid extra input');
 await click('#auto-advance');await click('input[value="1"]');await pause(500);assert.equal((await state()).index,1);
 await click('[data-action="show-map"]');await pause(100);assert.equal(await page.locator('[data-node="1"]').evaluate(el=>el.classList.contains('is-answered')),true);assert.equal(await page.locator('[data-node="2"]').isEnabled(),true);
 await click('[data-node="0"]');await opened(0);assert.equal(await page.locator('input:checked[name=answer]').inputValue(),'2');
 await click('[data-action="show-map"]');await pause(100);await click('[data-node="1"]');await opened(1);
 await click('[data-action="next"]');await page.waitForSelector('.map-quiz-page.is-travelling');await page.reload();await opened(2);
 saved=await state();assert.equal(saved.answers[1],1);assert.equal(saved.answers[2],null);assert.equal(saved.autoAdvance,false);
 assert.equal(saved.mapSeed,originalSeed);
 assert.deepEqual(await page.locator('.map-route').evaluateAll(paths=>paths.map(p=>p.getAttribute('d'))),originalRoute);
 checks.push('Manual advance, freshly answered map unlock, previous-node replay and reload during movement retain exact progress');
 await click('input[value="-1"]');await click('[data-action="next"]');await page.waitForSelector('.map-quiz-page.is-travelling');
 await click('[data-action="home"]');await page.waitForSelector('.hero');await pause(1100);assert.equal(await page.locator('#question-dialog').count(),0);
 await click('[data-action="start"]');await opened(3);assert.equal((await state()).answers[3],null);
 checks.push('Leaving during travel cancels pending movement and popup; resume opens the next unanswered node');
 await page.locator('#question-dialog').evaluate(el=>el.close());await pause(100);assert.equal(await page.locator('#question-dialog').evaluate(el=>el.open),false);await click('[data-action="open-question"]');await opened(3);

 async function seed(length,answers=Array(length).fill(null),index=0){
   await page.evaluate(({length,answers,index})=>{localStorage.setItem('spire-personality-v3',JSON.stringify({version:3,length,answers,index,autoAdvance:false}));location.hash='#test';},{length,answers,index});
   await page.reload();await opened(index);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await seed(30);
 const directions=await page.evaluate(async()=> (await import('./questions.js')).getQuestions(30).map(q=>q.direction));
 for(let i=0;i<30;i++){
   await opened(i);await click('input[value="'+(-directions[i])+'"]');await click('[data-action="next"]');
 }
 await page.waitForSelector('.result-code');assert.equal(await page.locator('.result-code').textContent(),'INFP');assert.equal(await page.locator('.dimension').count(),4);
 assert.equal(await page.locator('.result-page .room-scene, .encounter-stage').count(),0,'The character reveal opens without a room backdrop');
 checks.push('All 30 nodes and summit complete under reduced motion, producing the expected INFP and four dimensions');
 await seed(50);
 for(let i=0;i<50;i++) {await opened(i);await click('input[value="0"]');await click('[data-action="next"]');}
 await page.waitForSelector('.result-code');assert.equal(await page.locator('.result-code').textContent(),'XXXX');assert.equal(await page.locator('.archive-grid .character-card').count(),16);
 assert.equal(await page.locator('.result-page .room-scene, .encounter-stage').count(),0,'The tied result opens without a room backdrop');
 checks.push('All 50 nodes and summit complete; neutral result retains XXXX and 16 candidates');
 const campfireAnswers=Array(30).fill(null);campfireAnswers.fill(1,0,15);await seed(30,campfireAnswers,15);
 assert.equal(await page.locator('#question-heading').textContent(),'下一处营火可以休息，也可以强化卡牌。还没走到那里，你通常怎样处理这个待定选择？');
 await screenshot('mobile-campfire');await click('[data-action="show-map"]');await pause(100);await screenshot('mobile-campfire-route');
 await pc.send('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});await click('[data-action="open-question"]');await opened(15);await overflow('Small mobile');
 const box=await page.locator('#question-dialog').boundingBox();assert.ok(box.x>=0&&box.width<=320&&box.y>=0&&box.height<=568);
 await page.locator('#next-question').evaluate(el=>el.scrollIntoView({block:'nearest'}));
 const nextBox=await page.locator('#next-question').boundingBox();assert.ok(nextBox.y>=0&&nextBox.y+nextBox.height<=568);await screenshot('small-mobile-question');
 checks.push('Campfire wording unchanged; 390px and 320px dialogs fit, scroll and expose answer/advance controls');
 // The normal-motion final step travels to the summit before revealing the result.
 await pc.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
 await seed(30,Array(30).fill(1),29);await page.emulateMedia({reducedMotion:'no-preference'});
 await click('[data-action="next"]');await page.waitForSelector('.is-travelling');assert.equal(await page.locator('.result-code').count(),0);
 await screenshot('desktop-summit-travel');await page.waitForSelector('.result-code');checks.push('Normal-motion summit reveals result only after the final journey');
 await seed(30,Array(30).fill(1),29);await click('[data-action="show-map"]');await click('[data-node="30"]');
 await page.waitForSelector('[data-node="30"].is-inking');assert.equal(await page.locator('.result-code').count(),0);
 await page.waitForSelector('.result-code');assert.equal(await page.locator('.result-page .room-scene, .encounter-stage').count(),0);checks.push('Opening an unlocked summit from the map draws the ink circle before the direct result');
 const previousSeed=(await state()).mapSeed;
 await click('[data-action="restart"]');await click('[data-action="confirm-restart"]');await opened(0);
 assert.notEqual((await state()).mapSeed,previousSeed);assert.ok((await state()).answers.every(a=>a===null));
 checks.push('New journeys get new random map seeds; reload during movement keeps the same seed and route geometry');
 assert.deepEqual(errors,[]);console.log('PASS: map quiz browser flow, 30/50 complete, desktop/mobile, persistence, cancellation, reduced motion; no page errors.');
}catch(error){console.error('MAP_QA_FAILURE:',error.stack);if(page)console.error(await page.evaluate(()=>({hash:location.hash,open:document.querySelector('#question-dialog')?.open,revealing:!!document.querySelector('.is-revealing'),inert:document.querySelector('.question-shell')?.hasAttribute('inert'),index:JSON.parse(localStorage.getItem('spire-personality-v3'))?.index,travelling:!!document.querySelector('.is-travelling')})).catch(()=>null));throw error;}finally{
 if(targetId)await cdp.send('Target.closeTarget',{targetId});
 let remaining=true;
 for(let i=0;i<40;i++){const targets=await cdp.send('Target.getTargets');remaining=targets.targetInfos.some(t=>t.targetId===targetId);if(!remaining)break;await pause(100);}
 await writeFile(resolve(out,'map-browser-checks.json'),JSON.stringify({passed:checks.length===8&&errors.length===0,checks,errors,taskTabsRemaining:remaining?1:0},null,2));
 await cdp.detach();await browser.close();
 assert.equal(remaining,false,'Owned task tab closed');
}
