import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../dist/characters.js';
import { motionMarkup, motionLabel, playMotion } from '../dist/motions.js';

test('every result has a distinct decorative signature action', () => {
  const types = Object.keys(CHARACTERS);
  assert.equal(new Set(types.map(motionLabel)).size, 16);
  assert.equal(new Set(types.map(motionMarkup)).size, 16);
  for (const type of types) {
    assert.match(motionMarkup(type), /aria-hidden="true"/);
    assert.match(motionMarkup(type), /viewBox="0 0 320 320"/);
  }
  assert.equal(motionMarkup('toString'), '');
  assert.equal(motionLabel('XXXX'), '');
});

test('replay restarts, and reduced motion or a removed card stays still', () => {
  const calls = [];
  const stage = {matches: () => true, isConnected: true, dataset: {motion: 'ESTP'},
    classList: {remove: c => calls.push(['remove', c]), add: c => calls.push(['add', c])},
    get offsetWidth() { calls.push(['layout']); return 300; }};
  assert.equal(playMotion(stage), true);
  assert.deepEqual(calls.map(c => c[0]), ['remove', 'layout', 'add']);
  const original = globalThis.matchMedia;
  try {
    globalThis.matchMedia = () => ({matches: true});
    calls.length = 0;
    assert.equal(playMotion(stage), false);
    assert.deepEqual(calls.map(c => c[0]), ['remove']);
  } finally { if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia; }
  stage.isConnected = false;
  assert.equal(playMotion(stage), false);
  assert.equal(playMotion(null), false);
});
