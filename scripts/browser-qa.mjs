import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=resolve(import.meta.dirname,'../artifacts');await mkdir(out,{recursive:true});
const browser=await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:6112');
const cdp=await browser.newBrowserCDPSession();
const errors=[];const checks=[];
const url='http://127.0.0.1:4178/?qa='+Date.now();
let targetId,page;
const click=async(selector)=>{
  await page.locator(selector).evaluate(el=>el.click());
  if(selector==='[data-action="next"]')await page.waitForFunction(()=>document.querySelector('#question-dialog')?.open || document.querySelector('.result-code'),null,{polling:50});
};
try{
  ({targetId}=await cdp.send('Target.createTarget',{url,background:true}));
  for(let i=0;i<40;i++){page=browser.contexts()[0].pages().find(p=>p.url()===url);if(page)break;await new Promise(r=>setTimeout(r,100));}
  assert.ok(page,'Owned background page found');
  page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForSelector('.hero');
  await page.evaluate(()=>localStorage.removeItem('spire-personality-v3'));await page.reload();
  const pc=await page.context().newCDPSession(page);
  await pc.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
  await page.screenshot({path:resolve(out,'home-desktop.png'),fullPage:true});
  checks.push('Homepage: title, two mode buttons and four protagonists render');
  assert.equal(await page.locator('[data-length]').count(),2);
  assert.equal(await page.locator('.character-preview-grid .character-card').count(),4);
  await click('[data-action="start"]');await page.waitForSelector('.question-shell');
  assert.equal(await page.locator('.response-card').count(),2);
  assert.ok((await page.locator('.question-meta').textContent()).includes('尖塔情境'));
  // Verify default automatic advance then previous-answer preservation.
  await click('input[name="answer"][value="2"]');
  await page.waitForFunction(()=>document.querySelector('#question-dialog')?.open && document.querySelector('.question-meta b')?.textContent.startsWith('02'));
  await click('[data-action="previous"]');
  assert.equal(await page.locator('input[name=answer]:checked').getAttribute('value'),'2');
  await click('#auto-advance');
  await click('input[name="answer"][value="-1"]');
  await page.reload();await page.waitForSelector('.question-shell');
  assert.equal(await page.locator('input[name="answer"]:checked').getAttribute('value'),'-1');
  assert.equal(await page.locator('#auto-advance').isChecked(),false);
  await page.screenshot({path:resolve(out,'question-desktop.png'),fullPage:true});
  checks.push('Automatic advance, previous, changed answer and reload persistence');
  console.log('Homepage and question flow checked.');
  const directions=await page.evaluate(async()=> (await import('./questions.js')).getQuestions(30).map(q=>q.direction));
  for(let i=0;i<30;i++){
    await click(`input[name="answer"][value="${-directions[i]}"]`);
    await click('[data-action="next"]');
  }
  await page.waitForSelector('.result-code');
  assert.equal(await page.locator('.dimension').count(),4);
  await page.screenshot({path:resolve(out,'result-desktop.png'),fullPage:true});
  checks.push('30-question full journey produces a character and four dimension percentages');
  console.log('30-question journey checked.');
  // Capture the actual downloadable blob without adding test files to personal Downloads.
  await page.evaluate(()=>{const old=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.__cardDownload={url:this.href,name:this.download};return;}return old.call(this);};});
  await click('[data-action="download"]');
  await page.waitForFunction(()=>window.__cardDownload,{timeout:15000});
  const download=await page.evaluate(async()=>{const {url,name}=window.__cardDownload;const blob=await(await fetch(url)).blob();const image=await createImageBitmap(blob);return {name,type:blob.type,size:blob.size,width:image.width,height:image.height,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))};});
  assert.equal(download.type,'image/png');assert.equal(download.width,1000);assert.equal(download.height,1450);assert.ok(download.size>30000);
  await writeFile(resolve(out,'identity-card.png'),Buffer.from(download.bytes));
  checks.push(`Identity card: valid 1000×1450 PNG, ${download.size} bytes`);
  await click('[data-action="review"]');await page.waitForSelector('.question-shell');
  assert.equal(await page.locator('input[name="answer"]:checked').getAttribute('value'),'-1');
  await click('[data-action="home"]');await page.waitForSelector('.hero');
  await click('[data-length="50"]');await click('[data-action="start"]');
  await page.waitForSelector('dialog[open]');await click('[data-action="confirm-restart"]');await page.waitForSelector('.question-shell');
  for(let i=0;i<50;i++){await click('input[name="answer"][value="0"]');await click('[data-action="next"]');}
  await page.waitForSelector('.result-code');
  assert.equal(await page.locator('.result-code').textContent(),'XXXX');
  assert.ok(await page.locator('.tie-note').isVisible());
  assert.equal(await page.locator('.dimension-caption').filter({hasText:'两侧倾向接近'}).count(),4);
  assert.equal(await page.locator('.unresolved-result .character-card').count(),16);assert.equal(await page.locator('[data-action=download]').count(),0);
  checks.push('50-question full journey: 4-way tie stays XXXX without assigning a character');
  await page.evaluate(()=>location.hash='#archive');await page.waitForSelector('.archive-grid');
  assert.equal(await page.locator('.archive-grid .character-card').count(),16);
  await click('[data-filter="NT"]');assert.equal(await page.locator('.archive-grid .character-card').count(),4);
  await click('[data-filter="all"]');
  const imageStatus=await page.evaluate(async()=>{const {CHARACTERS}=await import('./characters.js');return Promise.all(Object.values(CHARACTERS).map(c=>new Promise(resolve=>{if(!c.image)return resolve({type:c.type,missing:true});const img=new Image();img.onload=()=>resolve({type:c.type,ok:true,width:img.naturalWidth});img.onerror=()=>resolve({type:c.type,ok:false});img.src='./'+c.image;})));});
  assert.ok(imageStatus.every(x=>x.ok||x.missing));
  checks.push({gallery:'16 types, 4 filtered NT entries, all declared local images load',images:imageStatus});
  const motionTypes=await page.evaluate(async()=>Object.keys((await import('./characters.js')).CHARACTERS));
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const type of motionTypes){
    await page.evaluate(t=>location.hash='#archive/'+t,type);
    await page.waitForFunction(t=>document.querySelector('.result-code')?.textContent===t,type);
    await page.waitForFunction(()=>{const i=document.querySelector('.result-art img');return i?.complete&&i.naturalWidth>0;});
    await click('[data-action="replay"]');
    const state=await page.locator('.motion-stage').evaluate(stage=>({name:getComputedStyle(stage.querySelector('img')).animationName,duration:getComputedStyle(stage.querySelector('img')).animationDuration,iterations:getComputedStyle(stage.querySelector('img')).animationIterationCount,svg:!!stage.querySelector('svg')}));
    assert.notEqual(state.name,'none',type);assert.equal(state.duration,'2.8s');assert.equal(state.iterations,'1');assert.ok(state.svg);
    if(['ESTP','INTP','ESFP'].includes(type)){
      await page.locator('.motion-stage').evaluate(stage=>stage.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=1050;}));
      await page.screenshot({path:resolve(out,'motion-'+type+'.png'),fullPage:false});
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});await click('[data-action="replay"]');
  assert.equal(await page.locator('.result-art img').evaluate(i=>getComputedStyle(i).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  checks.push('16 distinct finite portrait animations, replay, effect SVG and reduced-motion behavior verified');
  console.log('16 character animations and reduced-motion checked.');
  await pc.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const [hash,selector,name] of [['#home','.hero','home-mobile'],['#archive','.archive-grid','archive-mobile'],['#result','.result-code','result-mobile']]){
    await page.evaluate(hash=>location.hash=hash,hash);await page.waitForSelector(selector);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' has no horizontal overflow');
    await page.screenshot({path:resolve(out,name+'.png'),fullPage:true});
  }
  await click('[data-action="review"]');await page.waitForSelector('.question-shell');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:resolve(out,'question-mobile.png'),fullPage:true});
  checks.push('390px mobile homepage, archive, result and questionnaire: no horizontal overflow');
  await click('[data-action="show-map"]');await page.waitForFunction(()=>!document.querySelector('#question-dialog')?.open);
  await click('[data-action="about"]');assert.ok(await page.locator('#dialog').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('#dialog').isVisible(),false);
  await page.evaluate(()=>{localStorage.setItem('spire-personality-v3','{"length":999}');location.hash='#home';});await page.reload();await page.waitForSelector('.hero');assert.equal(await page.locator('.mode[aria-pressed="true"]').getAttribute('data-length'),'30');
  await page.evaluate(()=>localStorage.removeItem('spire-personality-v3'));
  assert.deepEqual(errors,[]);
  checks.push('About dialog Escape, corrupt local data recovery, no page errors');
  await writeFile(resolve(out,'browser-checks.json'),JSON.stringify({passed:true,checks,errors},null,2));
  console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{
  if(targetId){
    await cdp.send('Target.closeTarget',{targetId});
    let remaining=true;
    for(let i=0;i<40;i++){const targets=await cdp.send('Target.getTargets');remaining=targets.targetInfos.some(t=>t.targetId===targetId);if(!remaining)break;await new Promise(r=>setTimeout(r,100));}
    assert.equal(remaining,false);console.log('Owned background tab closed; shared browser preserved.');
  }
  await browser.close();
}
