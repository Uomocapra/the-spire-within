import test from 'node:test';
import assert from 'node:assert/strict';
import { mountHomeMotion } from '../dist/home-motion.js';

function fixture({reduced = false, supported = true} = {}) {
  const events = new Map(), mediaEvents = new Map(), frames = new Map();
  let nextFrame = 0, observer;
  const node = top => ({
    top, height: 100, isConnected: true,
    classList: {values: new Set(), add(c) { this.values.add(c); }, remove(c) { this.values.delete(c); }, contains(c) { return this.values.has(c); }},
    style: {values: new Map(), setProperty(k,v) { this.values.set(k,v); }, removeProperty(k) { this.values.delete(k); }},
    getBoundingClientRect() { return {top: this.top, bottom: this.top + this.height, height: this.height}; },
  });
  const hero = node(90); hero.height = 730;
  const lower = node(820), targets = [node(850), node(1100)];
  const root = node(0);
  root.querySelector = s => s === '.hero' ? hero : lower;
  root.querySelectorAll = () => targets;
  root.addEventListener = (k,v) => events.set('root:'+k,v);
  root.removeEventListener = k => events.delete('root:'+k);
  const media = {matches: reduced, addEventListener: (k,v) => mediaEvents.set(k,v), removeEventListener: k => mediaEvents.delete(k)};
  const view = {
    innerHeight: 800, innerWidth: 1440, matchMedia: () => media,
    addEventListener: (k,v) => events.set(k,v), removeEventListener: k => events.delete(k),
    requestAnimationFrame: fn => { frames.set(++nextFrame,fn); return nextFrame; }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: supported ? class {
      constructor(callback) { this.callback=callback; this.observed=new Set(); this.disconnected=false; observer=this; }
      observe(el) { this.observed.add(el); }
      unobserve(el) { this.observed.delete(el); }
      disconnect() { this.disconnected=true; this.observed.clear(); }
    } : undefined,
  };
  const flush = () => { const pending=[...frames.values()]; frames.clear(); pending.forEach(fn=>fn()); };
  return {root,hero,lower,targets,view,media,events,mediaEvents,frames,flush,get observer() { return observer; }};
}

test('scroll backgrounds reverse without a perpetual frame loop; cleanup releases observers and queued work', () => {
  const f=fixture(), dispose=mountHomeMotion(f.root,f.view);
  const original=f.root.style.values.get('--hero-opacity');
  f.hero.top=-500;f.lower.top=200;
  f.events.get('scroll')();f.events.get('scroll')();
  assert.equal(f.frames.size,1);
  f.flush();assert.equal(f.frames.size,0);
  assert.ok(Number(f.root.style.values.get('--hero-opacity'))<Number(original));
  f.hero.top=90;f.events.get('scroll')();f.flush();
  assert.equal(f.root.style.values.get('--hero-opacity'),original);
  f.events.get('scroll')();dispose();dispose();
  assert.equal(f.frames.size,0);assert.equal(f.events.size,0);assert.equal(f.mediaEvents.size,0);
  assert.equal(f.observer.disconnected,true);
  assert.equal(f.root.classList.contains('home-motion-ready'),false);
});

test('content reveals once and keyboard focus never lands on a hidden card', () => {
  const f=fixture(), dispose=mountHomeMotion(f.root,f.view);
  f.observer.callback([{target:f.targets[0],isIntersecting:true}]);
  assert.equal(f.targets[0].classList.contains('is-revealed'),true);
  assert.equal(f.observer.observed.has(f.targets[0]),false);
  f.events.get('root:focusin')({target:{closest:()=>f.targets[1]}});
  assert.equal(f.targets[1].classList.contains('is-revealed'),true);
  dispose();
});

test('reduced motion and unsupported browsers keep content visible; live preference changes cancel work', () => {
  for(const options of [{reduced:true},{supported:false}]) {
    const f=fixture(options),dispose=mountHomeMotion(f.root,f.view);
    assert.equal(f.root.classList.contains('home-motion-ready'),false);
    assert.equal(f.events.has('scroll'),false);dispose();
  }
  const f=fixture(),dispose=mountHomeMotion(f.root,f.view);
  f.events.get('scroll')();f.media.matches=true;f.mediaEvents.get('change')();
  assert.equal(f.frames.size,0);assert.equal(f.events.has('scroll'),false);
  assert.equal(f.root.classList.contains('home-motion-ready'),false);
  f.media.matches=false;f.mediaEvents.get('change')();
  assert.equal(f.events.has('scroll'),true);dispose();
});
