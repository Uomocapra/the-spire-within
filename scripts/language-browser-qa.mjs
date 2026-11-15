import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {messages} from '../dist/locales/interface.js';
import {getQuestions} from '../dist/questions.js';
import {CHARACTERS} from '../dist/characters.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser = await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:6112');
const cdp = await browser.newBrowserCDPSession();
const base = 'http://lang-' + Date.now() + '.localhost:4178/';
const errors = [];
let targetId;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  ({targetId} = await cdp.send('Target.createTarget',{url:base,background:true}));
  let page;
  for(let i=0;i<80&&!page;i++) {
    page=browser.contexts()[0].pages().find(p=>p.url()===base);
    if(!page) await delay(100);
  }
  assert.ok(page);
  page.on('pageerror',e=>errors.push(e.message));
  const pc = await page.context().newCDPSession(page);
  pc.on('Page.screencastFrame',e=>pc.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{}));
  await pc.send('Page.startScreencast',{format:'jpeg',quality:1,everyNthFrame:1});
  await pc.send('Emulation.setDeviceMetricsOverride',{width:320,height:750,deviceScaleFactor:1,mobile:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  const click = selector=>page.locator(selector).first().evaluate(el=>el.click());
  const state = ()=>page.evaluate(()=>JSON.parse(localStorage.getItem('spire-personality-v3')));
  const choose = async (code,where='header')=>{
    await page.locator(where+' [data-language]').selectOption(code);
    await page.waitForFunction(v=>document.documentElement.lang===v,code==='zh'?'zh-CN':code,{polling:30});
  };
  async function fit(selector) {
    const metrics=await page.locator(selector).first().evaluate(el=>[el.scrollWidth,el.clientWidth]);
    assert.ok(metrics[0]<=metrics[1]+2,selector+' horizontal overflow '+metrics);
  }
  // A dedicated localhost subdomain isolates the run from existing browser saves.
  await page.waitForSelector('.hero');
  assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
  await choose('en'); await click('[data-length="50"]'); await click('[data-action="start"]');
  await page.waitForSelector('#question-dialog[open] .answer-option');
  await click('#auto-advance'); await click('input[value="-1"]'); await click('.stall-handle');
  const before=await state(); assert.equal(before.answers[0],-1);
  for (const [i,code] of ['zh','en','fr','ko'].entries()) {
    await choose(code,'#question-dialog');
    const pack=code==='zh'?null:await import('../dist/locales/'+code+'-content.js');
    const title=pack?pack.questions[0][1]:getQuestions(50)[0].text;
    assert.equal(await page.locator('#question-heading').textContent(),title);
    assert.equal(await page.locator('input[name="answer"]:checked').inputValue(),'-1');
    assert.equal(await page.locator('.stall-handle').getAttribute('aria-expanded'),'true');
    assert.deepEqual(await state(),before);
    await fit('.question-shell'); await fit('html');
    if(code==='fr') await page.screenshot({path:resolve(import.meta.dirname,'../artifacts/locale-fr-question.png'),timeout:6500});
    assert.equal(await page.locator('#answer-hint').textContent(),messages.answerHint[i]);
  }
  await click('[data-action="show-map"]'); await choose('fr');
  assert.equal(await page.locator('#question-dialog').evaluate(el=>el.open),false);
  assert.deepEqual(await state(),before);
  await click('.map-branch-spot'); assert.ok(await page.locator('#dialog .room-floor').textContent().then(x=>x.includes('Étage')));
  await click('#dialog [data-action="close-dialog"]');
  await click('[data-action="open-question"]'); await click('[data-action="next"]');
  await page.waitForFunction(()=>document.querySelector('#question-dialog')?.open && JSON.parse(localStorage.getItem('spire-personality-v3')).index===1);
  await page.reload({waitUntil:'domcontentloaded'}); await page.waitForSelector('#question-dialog[open]');
  assert.equal(await page.locator('html').getAttribute('lang'),'fr');
  assert.equal((await state()).answers[0],-1);
  for (const [i,code] of ['zh','en','fr','ko'].entries()) {
    await page.goto(base+'?lang='+code+'#archive',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.archive-grid .character-card');
    assert.equal(await page.locator('.archive-grid .character-card').count(),16);
    await fit('html'); await click('[href="#archive/INTJ"]'); await page.waitForSelector('.result-info');
    const pack=code==='zh'?null:await import('../dist/locales/'+code+'-content.js');
    assert.equal(await page.locator('.result-info h1').textContent(),(pack?.characters||CHARACTERS).INTJ.name);
    await fit('html');
    // Capture the site's real export and share actions without touching the desktop clipboard or download directory.
    await page.evaluate(()=>{
      window.drawn=[];const fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(txt,...args){window.drawn.push(txt);return fill.call(this,txt,...args)};
      HTMLAnchorElement.prototype.click=function(){window.cardFile=this.download};
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.shared=text}}});
    });
    await click('[data-action="download"]'); await page.waitForFunction(()=>window.cardFile);
    assert.ok((await page.evaluate(()=>window.drawn)).includes(messages.pngBrand[i]));
    await click('[data-action="share"]');assert.ok((await page.evaluate(()=>window.shared)).includes('?lang='+code+'#archive/INTJ'));
    await click('footer [data-action="about"]');assert.equal(await page.locator('#dialog-title').textContent(),messages.aboutTitle[i]);
    const gallery=await page.locator('a[href*="scene-credits.html"]').getAttribute('href');
    await page.goto(new URL(gallery,base).href,{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-language]');
    assert.equal(await page.locator('h1').textContent(),messages.galleryTitle[i]); assert.equal(await page.locator('figcaption').count(),24);
    // Exercise every answer via the normal inputs in both quiz lengths.
    for(const length of [30,50]) {
      await page.goto(base+'?lang='+code+'#home',{waitUntil:'domcontentloaded'});await page.waitForSelector('.hero');
      await page.evaluate(()=>localStorage.removeItem('spire-personality-v3'));
      await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.hero');
      await click('[data-length="'+length+'"]');await click('[data-action="start"]');
      await page.waitForSelector('#question-dialog[open]');
      await click('#auto-advance');
      for (const q of getQuestions(length)) {
        const expected=pack?pack.questions[q.id-1][1]:q.text;
        await page.waitForFunction(text=>document.querySelector('#question-dialog')?.open&&document.querySelector('#question-heading')?.textContent===text,expected,{polling:25,timeout:9000}).catch(async e=>{ console.error({code,length,expectedId:q.id,state:await state(),heading:await page.locator('#question-heading').allTextContents(),hash:page.url(),errors});throw e; });
        await click('input[value="'+(length===50?0:2*q.direction)+'"]'); await click('#next-question');
      }
      await page.waitForSelector('.result-code');
      assert.equal(await page.locator('.result-code').textContent(),length===50?'XXXX':'ESTJ');
      assert.equal(await page.locator('.dimension').count(),4);
      assert.equal(await page.locator('.encounter-stage').count(),0);
      assert.ok((await state()).answers.every(a=>a!==null));
    }
    console.log('PASS '+code+': gallery, archive, card, share, all 30 and 50 answers and both result layouts');
  }
  await pc.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await page.goto(base+'?lang=en',{waitUntil:'domcontentloaded'});await page.waitForSelector('.hero');await fit('html');
  await page.screenshot({path:resolve(import.meta.dirname,'../artifacts/locale-en-home.png'),timeout:6500});
  await choose('ko');await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector('.hero');
  assert.equal(await page.locator('html').getAttribute('lang'),'ko');
  assert.deepEqual(errors,[]);
  console.log('PASS persisted preference, selected answer, floor, seed, merchant tray, 320px and desktop; zero page errors');
} finally {
  if(targetId) await cdp.send('Target.closeTarget',{targetId});
  for(let i=0;i<30 && (await cdp.send('Target.getTargets')).targetInfos.some(t=>t.targetId===targetId);i++) await delay(50);
  assert.ok(!(await cdp.send('Target.getTargets')).targetInfos.some(t=>t.targetId===targetId));
  await cdp.detach();
  await browser.close(); // Disconnect this CDP client; the shared Chrome remains running.
}
