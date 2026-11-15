import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, getQuestions, QUESTIONNAIRE_VERSION } from '../dist/questions.js';
import { calculateResult, validSession } from '../dist/scoring.js';

test('question banks are unique, balanced and nested', () => {
  assert.equal(QUESTIONS.length, 50);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, 50);
  assert.deepEqual(getQuestions(30), getQuestions(50).slice(0, 30));
  for (const n of [30, 50]) {
    const qs = getQuestions(n);
    const counts = [0, 1, 2, 3].map(a => qs.filter(q => q.axis === a).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
    for (let a = 0; a < 4; a++) {
      const axis = qs.filter(q => q.axis === a);
      assert.ok(axis.some(q => q.direction === 1));
      assert.ok(axis.some(q => q.direction === -1));
    }
  }
  assert.throws(() => getQuestions(31));
});

for (const length of [30, 50]) {
  test(`${length} answers can reach every personality, with correct reverse scoring`, () => {
    for (let mask = 0; mask < 16; mask++) {
      const letters = ['EI', 'SN', 'TF', 'JP'].map((pair, i) => pair[(mask >> i) & 1]);
      const answers = getQuestions(length).map(q => (((mask >> q.axis) & 1) ? -2 : 2) * q.direction);
      const result = calculateResult(answers, length);
      assert.equal(result.type, letters.join(''));
      assert.ok(result.dimensions.every(d => [0, 100].includes(d.leftPercent)));
      assert.equal(result.ties.length, 0);
    }
  });
}

test('neutral answers are openly marked as unresolved, not false certainty', () => {
  const result = calculateResult(Array(30).fill(0), 30);
  assert.equal(result.ties.length, 4);
  assert.equal(result.type, null);
  assert.equal(result.pattern, 'XXXX');
  assert.equal(new Set(result.candidates).size, 16);
  assert.ok(result.dimensions.every(d => d.leftPercent === 50 && d.tied));
});

test('a balanced axis stays unresolved regardless of which answer appeared first', () => {
  for (const length of [30, 50]) {
    const qs = getQuestions(length);
    const answers = qs.map(q => q.axis === 2 ? 0 : 2 * q.direction);
    const indices = qs.flatMap((q, i) => q.axis === 2 ? [i] : []);
    answers[indices[0]] = 2 * qs[indices[0]].direction;
    answers[indices[1]] = -2 * qs[indices[1]].direction;
    const first = calculateResult(answers, length);
    answers[indices[0]] *= -1; answers[indices[1]] *= -1;
    const second = calculateResult(answers, length);
    for (const result of [first, second]) {
      assert.equal(result.type, null);
      assert.equal(result.pattern, 'ESXJ');
      assert.deepEqual(result.candidates, ['ESTJ', 'ESFJ']);
      assert.equal(result.dimensions[2].letter, null);
      assert.deepEqual(result.ties, ['TF']);
    }
  }
});

test('incomplete or corrupt answers cannot produce a result', () => {
  for (const answers of [[], Array(29).fill(1), Array(30), Array(30).fill(null), Array(30).fill(3), Array(30).fill('1')]) {
    assert.throws(() => calculateResult(answers, 30));
  }
  assert.equal(validSession({version: QUESTIONNAIRE_VERSION, length: 30, answers: Array(30).fill(null), index: 0}), true);
  assert.equal(validSession({version: QUESTIONNAIRE_VERSION, length: 50, answers: Array(30).fill(0), index: 0}), false);
  assert.equal(validSession({version: QUESTIONNAIRE_VERSION, length: 30, answers: Array(30).fill(0), index: 99}), false);
  assert.equal(validSession({version: 1, length: 30, answers: Array(30).fill(0), index: 0}), false, 'old questionnaire answers must not be scored against rewritten questions');
  assert.equal(validSession({version: 2, length: 30, answers: Array(30).fill(0), index: 0}), false, 'previous scenario answers must not be reused after the logic revision');
  assert.equal(validSession({version: QUESTIONNAIRE_VERSION, length: 30, answers: Array(30), index: 0}), false);
  assert.equal(validSession(null), false);
});

test('scenario bank offers meaningful paired choices and preserves everyday anchors', () => {
  for (const q of QUESTIONS) {
    assert.ok(['spire', 'daily'].includes(q.kind));
    assert.ok(q.title && q.optionA && q.optionB && q.rationale);
    assert.notEqual(q.optionA, q.optionB);
  }
  for (const n of [30, 50]) {
    const qs = getQuestions(n);
    assert.ok(qs.filter(q => q.kind === 'spire').length > n / 2);
    assert.ok(qs.some(q => q.kind === 'daily'));
  }
});
