import { getQuestions, QUESTIONNAIRE_VERSION } from './questions.js';

export const AXES = [
  {pair: 'EI', left: '外向', right: '内向', label: '能量的来源', description: '从互动中获得活力，或在独处中恢复精力。'},
  {pair: 'SN', left: '实感', right: '直觉', label: '认识世界的方式', description: '关注具体经验，或着眼模式与可能。'},
  {pair: 'TF', left: '思考', right: '情感', label: '决定的依据', description: '优先分析逻辑，或衡量价值与人的感受。'},
  {pair: 'JP', left: '判断', right: '知觉', label: '与生活相处的节奏', description: '偏好计划与确定，或保持弹性与开放。'}
];

export function calculateResult(answers, length) {
  const questions = getQuestions(length);
  if (!Array.isArray(answers) || answers.length !== length || !Array.from(answers).every(a => Number.isInteger(a) && a >= -2 && a <= 2)) {
    throw new TypeError('Complete, valid answers required');
  }
  const dimensions = AXES.map((axis, i) => {
    const values = questions.flatMap((q, j) => q.axis === i ? [answers[j] * q.direction] : []);
    const sum = values.reduce((a, b) => a + b, 0);
    const tied = sum === 0;
    const leftPercent = Math.round(50 + 50 * sum / (values.length * 2));
    return {...axis, leftPercent, rightPercent: 100 - leftPercent, tied, lowConfidence: Math.abs(leftPercent - 50) < 10, letter: tied ? null : axis.pair[sum > 0 ? 0 : 1]};
  });
  const ties = dimensions.filter(d => d.tied).map(d => d.pair);
  const pattern = dimensions.map(d => d.letter || 'X').join('');
  // Exact ties preserve both possibilities. Their order is not a ranking.
  const candidates = dimensions.reduce((codes, d) => codes.flatMap(code =>
    [...(d.letter || d.pair)].map(letter => code + letter)), ['']);
  return {type: ties.length ? null : pattern, pattern, candidates, dimensions, ties, length};
}

export function validSession(value) {
  return Boolean(value && value.version === QUESTIONNAIRE_VERSION && [30, 50].includes(value.length) &&
    Array.isArray(value.answers) && value.answers.length === value.length &&
    Array.from(value.answers).every(a => a === null || (Number.isInteger(a) && a >= -2 && a <= 2)) &&
    Number.isInteger(value.index) && value.index >= 0 && value.index < value.length);
}
