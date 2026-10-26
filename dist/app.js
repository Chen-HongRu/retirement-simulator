import { DEFAULTS, LIMITS, calculatePlan } from './model.js';
import { getLifestyle, renderAvatar } from './avatar.js';

const $ = (id) => document.getElementById(id);
const fields = Object.keys(DEFAULTS);
const money = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 });
let inputs = { ...DEFAULTS };
let comparison = null;
let liveTimer;
let toastTimer;
const setText = (id, value) => { $(id).textContent = value; };
const setValueUnit = (id, value, unit) => {
  const small = document.createElement('small');
  small.textContent = unit;
  $(id).replaceChildren(document.createTextNode(`${value} `), small);
};
const signed = (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${money.format(Math.abs(value))}`;

function quantize(key, value) {
  const { min, max, step } = LIMITS[key];
  const clamped = Math.max(min, Math.min(max, value));
  return Number((min + Math.round((clamped - min) / step) * step).toFixed(8));
}

function toast(message) {
  clearTimeout(toastTimer);
  setText('toast', message);
  $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4000);
}

function hydrateHash() {
  if (!location.hash || location.hash === '#playground' || location.hash === '#controls' || location.hash === '#how-it-works') return;
  const raw = location.hash.slice(1);
  if (!raw.includes('=')) return;
  const params = new URLSearchParams(raw);
  const next = { ...DEFAULTS };
  let warning = false;
  let recognized = false;
  for (const key of fields) {
    if (!params.has(key)) continue;
    recognized = true;
    const values = params.getAll(key);
    const value = values[0];
    // Only decimal numbers; no empty strings, hexadecimal, or coercion of text.
    if (values.length !== 1 || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
      warning = true;
      continue;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) { warning = true; continue; }
    next[key] = quantize(key, number);
    if (next[key] !== number) warning = true;
  }
  if (recognized) { inputs = next; render(); }
  if (warning) toast('链接中的部分参数无效，已恢复默认值或调整到可用范围。');
}

function chart(plan) {
  const rows = plan.trajectory;
  const old = comparison?.plan.trajectory;
  const all = old ? [...rows, ...old] : rows;
  const startAge = Math.min(...all.map((row) => row.age));
  const endAge = Math.max(...all.map((row) => row.age));
  const values = all.flatMap((row) => [row.assets / 10000, row.contributions / 10000]);
  let low = Math.min(0, ...values);
  let high = Math.max(0, ...values);
  if (high === low) high = low + 1;
  const span = high - low;
  high += span * 0.12;
  if (low < 0) low -= span * 0.08;
  const left = 62, right = 734, top = 17, bottom = 180;
  const x = (age) => startAge === endAge ? (left + right) / 2 : left + (age - startAge) / (endAge - startAge) * (right - left);
  const y = (value) => bottom - (value / 10000 - low) / (high - low) * (bottom - top);
  const path = (data, key) => data.map((row, i) => `${i ? 'L' : 'M'}${x(row.age).toFixed(2)},${y(row[key]).toFixed(2)}`).join(' ');
  let grid = '';
  for (let index = 0; index <= 3; index++) {
    const value = low + (high - low) * index / 3;
    const yy = y(value * 10000);
    grid += `<line x1="${left}" y1="${yy}" x2="${right}" y2="${yy}" stroke="#e7eae3"/><text x="${left - 10}" y="${yy + 4}" text-anchor="end">${money.format(value)}</text>`;
  }
  const tickCount = Math.min(4, endAge - startAge);
  const ages = tickCount === 0 ? [startAge] : [...new Set(Array.from({ length: tickCount + 1 }, (_, i) => Math.round(startAge + (endAge - startAge) * i / tickCount)))];
  for (const age of ages) grid += `<text x="${x(age)}" y="207" text-anchor="middle">${age} 岁</text>`;
  const first = rows[0], last = rows.at(-1);
  const area = `${path(rows, 'assets')} L${x(last.age)},${y(0)} L${x(first.age)},${y(0)} Z`;
  const oldPath = old ? `<path d="${path(old, 'assets')}" fill="none" stroke="#ce944d" stroke-width="2.5" stroke-dasharray="7 5"/><circle cx="${x(old.at(-1).age)}" cy="${y(old.at(-1).assets)}" r="4" fill="#ce944d"/>` : '';
  $('asset-chart').innerHTML = `<svg viewBox="0 0 760 220" role="img" aria-label="${startAge}至${endAge}岁资产轨迹，绿色为当前资产，灰色虚线为累计净投入${old ? '，橙色虚线为留住的方案' : ''}" xmlns="http://www.w3.org/2000/svg"><g font-family="inherit" font-size="11" fill="#7c877d">${grid}</g><path d="${area}" fill="#dcebe1" opacity=".7"/><path d="${path(rows, 'contributions')}" fill="none" stroke="#a5aaa1" stroke-width="2" stroke-dasharray="5 5"/>${oldPath}<path d="${path(rows, 'assets')}" fill="none" stroke="#4f8066" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x(last.age)}" cy="${y(last.assets)}" r="5" fill="#4f8066" stroke="#fff" stroke-width="2"/></svg>`;
}

function render() {
  const plan = calculatePlan(inputs);
  for (const key of fields) {
    const slider = $(key);
    slider.value = inputs[key];
    const { min, max } = LIMITS[key];
    slider.style.setProperty('--progress', `${100 * (inputs[key] - min) / (max - min)}%`);
    slider.setAttribute('aria-valuetext', `${inputs[key]}${key === 'workYears' ? '年' : key === 'currentAge' ? '岁' : key.includes('Return') ? '%' : '元'}`);
  }
  $('income-number').value = inputs.monthlyIncome;
  $('assets-number').value = inputs.initialAssets / 10000;
  setValueUnit('workYears-value', inputs.workYears, '年');
  setValueUnit('currentAge-value', inputs.currentAge, '岁');
  setValueUnit('workReturn-value', inputs.workReturn, '%');
  setValueUnit('retirementReturn-value', inputs.retirementReturn, '%');
  setText('start-age-note', inputs.currentAge);
  setText('initial-note', `${money.format(inputs.initialAssets / 10000)} 万元`);
  for (const button of document.querySelectorAll('[data-years]')) button.setAttribute('aria-pressed', String(Number(button.dataset.years) === inputs.workYears));
  setText('retirement-age', plan.retirementAge);
  setText('age-stamp', plan.retirementAge);
  const lifestyle = getLifestyle(plan.monthlySpending);
  setText('lifestyle-name', lifestyle.label);
  setText('lifestyle-description', lifestyle.description);
  $('avatar').innerHTML = renderAvatar({ age: plan.retirementAge, monthlySpending: plan.monthlySpending });
  setText('monthly-spending', money.format(plan.monthlySpending));
  setValueUnit('retirement-assets', decimal.format(plan.retirementAssets / 10000), '万元');
  setText('saving-label', inputs.workYears === 0 ? (plan.monthlySaving < 0 ? '若工作每月动用资产' : '若工作每月可存') : plan.monthlySaving < 0 ? '每月动用资产' : '工作时每月存');
  setValueUnit('monthly-saving', money.format(Math.abs(plan.monthlySaving)), '元');
  setText('spending-caption', plan.zeroReturn ? '0% 实际收益无法在保本条件下永久支持正支出。' : '从现在到退休后，都维持这个生活预算。');
  setText('result-note', plan.zeroReturn ? '退休时资产为工作期积累额；它不是支持正支出的永久退休目标。' : '这是固定收益假设下的平衡点，实际生活和市场都会变化。');
  const savingPercent = plan.savingsRate * 100;
  $('saving-bar').style.width = `${Math.max(0, Math.min(100, savingPercent))}%`;
  setText('saving-percent', plan.monthlySaving < 0 ? '0% 用收入储蓄' : `${percent.format(savingPercent)}% 留给未来`);
  setText('spending-percent', plan.monthlySaving < 0 ? `支出为收入 ${percent.format(100 - savingPercent)}%` : `${percent.format(100 - savingPercent)}% 留给现在`);
  if (comparison) {
    const deltaSpend = plan.monthlySpending - comparison.plan.monthlySpending;
    const deltaAge = plan.retirementAge - comparison.plan.retirementAge;
    setText('insight-label', '和留住的方案比一比');
    setText('insight-main', `月支出 ${signed(deltaSpend)} 元`);
    setText('insight-detail', `当前 ${plan.retirementAge} 岁退休，比留住的方案${deltaAge > 0 ? `晚 ${deltaAge} 年` : deltaAge < 0 ? `早 ${Math.abs(deltaAge)} 年` : '退休年龄相同'}。${plan.zeroReturn ? '当前 0% 退休收益无法永久支持正支出。' : '两条曲线使用相同年龄与资产刻度。'}`);
  } else {
    setText('insight-label', '给未来的自己');
    setText('insight-main', plan.zeroReturn ? '保本与永久支出，需要正的实际收益。' : plan.monthlySaving < 0 ? '已有资产，也在为今天的生活出力。' : `每月留下 ${percent.format(savingPercent)}%，为未来多一点从容。`);
    setText('insight-detail', inputs.workYears === 0 ? '现在就退休，月支出由已有资产与假设收益决定；上方储蓄比例仅表示继续工作的假想情景。' : plan.monthlySaving < 0 ? `每月从已有资产动用 ${money.format(-plan.monthlySaving)} 元；曲线中的净投入会随之减少。` : '时间是你可以调节的另一种预算。试试少工作几年，会有什么不同？');
  }
  $('comparison-legend').hidden = !comparison;
  setText('compare', comparison ? '× 移除对比方案' : '＋ 留住这一版，对比看看');
  $('compare').setAttribute('aria-pressed', String(Boolean(comparison)));
  chart(plan);
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => setText('live-result', `${plan.retirementAge} 岁退休，可持续月支出 ${money.format(plan.monthlySpending)} 元，退休时资产 ${decimal.format(plan.retirementAssets / 10000)} 万元。${plan.zeroReturn ? '零实际收益无法永久支持正支出。' : ''}`), 300);
}

$('controls').addEventListener('submit', (event) => event.preventDefault());
for (const key of fields) $(key).addEventListener('input', (event) => {
  inputs[key] = quantize(key, Number(event.target.value));
  render();
});
for (const [id, key, multiplier] of [['income-number', 'monthlyIncome', 1], ['assets-number', 'initialAssets', 10000]]) {
  const commitValue = (event) => {
    const value = event.target.value.trim();
    if (value !== '' && Number.isFinite(Number(value))) inputs[key] = quantize(key, Number(value) * multiplier);
    else toast('请输入有效数字，已保留原来的设定。');
    render();
  };
  $(id).addEventListener('change', commitValue);
  $(id).addEventListener('blur', commitValue);
  $(id).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); commitValue(event); }
  });
}
for (const button of document.querySelectorAll('[data-years]')) button.addEventListener('click', () => {
  inputs.workYears = Number(button.dataset.years);
  render();
});
$('reset').addEventListener('click', () => {
  inputs = { ...DEFAULTS };
  comparison = null;
  if (location.hash.includes('=')) history.replaceState(null, '', location.pathname + location.search);
  render();
  toast('已恢复默认设定。');
});
$('compare').addEventListener('click', () => {
  comparison = comparison ? null : { inputs: Object.freeze({ ...inputs }), plan: structuredClone(calculatePlan(inputs)) };
  render();
});
$('share').addEventListener('click', async () => {
  const url = new URL(location.href);
  url.hash = new URLSearchParams(fields.map((key) => [key, String(inputs[key])])).toString();
  history.replaceState(null, '', url);
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url.href);
    toast('链接已复制，打开即可还原这组设定。');
  } catch {
    $('share-url').value = url.href;
    $('share-dialog').showModal();
    $('share-url').focus();
    $('share-url').select();
    toast('请复制弹窗中的链接。');
  }
});
window.addEventListener('hashchange', hydrateHash);
render();
hydrateHash();
