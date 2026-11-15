import test from 'node:test';
import assert from 'node:assert/strict';
import {messages} from '../dist/locales/interface.js';
import {QUESTIONS} from '../dist/questions.js';
import {CHARACTERS} from '../dist/characters.js';

test('interface translations preserve every format argument', () => {
  const slots = value => [...value.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
  for (const [key, entries] of Object.entries(messages)) {
    assert.equal(entries.length,4,key);
    for (const value of entries) {
      assert.ok(value.trim(),key);
      assert.deepEqual(slots(value),slots(entries[0]),key);
    }
  }
});

for (const code of ['en','fr','ko']) {
  test(code + ' covers the full quiz and character archive', async () => {
    const pack = await import('../dist/locales/'+code+'-content.js');
    assert.equal(pack.questions.length,QUESTIONS.length);
    for (const question of QUESTIONS) {
      const row=pack.questions[question.id-1];
      assert.equal(row.length,4);
      assert.ok(row.every(text=>typeof text==='string' && text.trim()),'Question '+question.id);
      assert.notEqual(row[2],row[3]);
    }
    assert.deepEqual(Object.keys(pack.characters).sort(), Object.keys(CHARACTERS).sort());
    for(const [type,record] of Object.entries(pack.characters)) {
      assert.equal(record.tags.length,3,type);
      for(const key of ['name','title','quote','summary','lore','reading','strength','growth','act','kind','association']) {
        assert.ok(record[key]?.trim(),type+' '+key);
      }
      assert.ok(!('type' in record || 'image' in record || 'sources' in record),type+' keeps its original identity');
    }
  });
}
