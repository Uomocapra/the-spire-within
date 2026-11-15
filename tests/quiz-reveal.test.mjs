import test from 'node:test';
import assert from 'node:assert/strict';
import {playQuestionReveal} from '../dist/quiz-reveal.js';

function fixture(reduced=false) {
  const events=new Map(), timers=new Map(), mediaEvents=new Map();let id=0,ready=0;
  const attributes=new Map(), classes=new Set(), frontAttrs=new Map();
  const front={setAttribute:(k,v)=>frontAttrs.set(k,v),removeAttribute:k=>frontAttrs.delete(k)};
  const card={addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k)};
  const media={matches:reduced,addEventListener:(k,v)=>mediaEvents.set(k,v),removeEventListener:k=>mediaEvents.delete(k)};
  const dialog={isConnected:true,open:true,querySelector:s=>s==='.question-card'?card:front,
    classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),
    ownerDocument:{defaultView:{matchMedia:()=>media,setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id)}},
  };
  const finish=()=>events.get('animationend')?.({target:card,animationName:'question-card-reveal'});
  return {dialog,card,front,events,timers,mediaEvents,media,attributes,classes,frontAttrs,finish,start:()=>playQuestionReveal(dialog,()=>ready++),get ready(){return ready;}};
}

test('the card locks answers until its own finite flip ends and releases every listener',()=>{
  const f=fixture(),stop=f.start();assert.ok(f.frontAttrs.has('inert'));assert.equal(f.ready,0);
  f.events.get('animationend')({target:f.front,animationName:'unrelated'});assert.equal(f.ready,0);
  f.finish();assert.equal(f.ready,1);assert.equal(f.frontAttrs.size,0);assert.equal(f.timers.size,0);assert.equal(f.mediaEvents.size,0);assert.equal(f.events.size,0);assert.equal(f.classes.size,0);
  stop();assert.equal(f.ready,1);
});

test('closing or navigating away cancels the flip without a delayed ready/focus callback',()=>{
  const f=fixture(),stop=f.start();stop();assert.equal(f.ready,0);assert.equal(f.timers.size,0);assert.equal(f.frontAttrs.size,0);
  const removed=fixture();removed.start();removed.dialog.isConnected=false;removed.finish();assert.equal(removed.ready,0);
});

test('reduced motion is immediate, live changes finish safely, and a missing animation event has a fallback',()=>{
  const reduced=fixture(true);reduced.start();assert.equal(reduced.ready,1);assert.equal(reduced.timers.size,0);assert.equal(reduced.classes.size,0);
  const changed=fixture();changed.start();changed.media.matches=true;changed.mediaEvents.get('change')();assert.equal(changed.ready,1);assert.equal(changed.timers.size,0);
  const fallback=fixture();fallback.start();[...fallback.timers.values()][0]();assert.equal(fallback.ready,1);assert.equal(fallback.classes.size,0);
});
