import { DEFAULTS, LIMITS, calculatePlan } from './model.js';
import { ATLAS, getLifestyle, getPortraitState, renderAvatar } from './avatar.js';

const $ = (id) => document.getElementById(id);
const fields = Object.keys(DEFAULTS);
const money = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 });
let inputs = { ...DEFAULTS };
let comparison = null;
let liveTimer;
let toastTimer;
let portraitKey;
let popTimer;
let atlasImage;
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
  const portrait = getPortraitState({ age: plan.retirementAge, monthlySpending: plan.monthlySpending });
  $('controls').dataset.stage = String(portrait.column);
  $('controls').style.setProperty('--life-progress', Math.min(1, plan.monthlySpending / 18000));
  setText('stage-ghost', plan.monthlySpending > 0 ? lifestyle.label.slice(0, 2) : '开局');
  for (const stage of document.querySelectorAll('[data-lifestyle-index]')) {
    const index = Number(stage.dataset.lifestyleIndex);
    stage.classList.toggle('is-passed', index < portrait.column);
    if (index === portrait.column) stage.setAttribute('aria-current', 'step');
    else stage.removeAttribute('aria-current');
  }
  $('avatar').setAttribute('aria-valuenow', String(inputs.workYears));
  $('avatar').setAttribute('aria-valuetext', `再工作 ${inputs.workYears} 年，${plan.retirementAge} 岁退休`);
  setText('lifestyle-name', plan.monthlySpending > 0 ? lifestyle.label : '这会儿还躺不了');
  setText('lifestyle-description', plan.monthlySpending > 0 ? lifestyle.description : '退休的心有了，生活费还没到位。');
  setText('meme-status', plan.zeroReturn ? '实际收益为 0，保本退休暂时卡关。' : plan.monthlySpending === 0 ? '当前设定还没有可持续生活费。再调调？' : `${portrait.ageLabel}已就位 · ${plan.retirementAge >= 80 ? '钱攒到了，我也快成传说了。' : portrait.row === 2 ? '大爷只负责悠闲。' : portrait.row === 1 ? '班味正在散去。' : '年纪轻轻，先躺为敬。'}`);
  if (portraitKey !== portrait.key) {
    $('avatar').innerHTML = renderAvatar({ age: plan.retirementAge, monthlySpending: plan.monthlySpending });
    if (portraitKey !== undefined) {
      clearTimeout(popTimer);
      $('avatar').classList.remove('is-popping');
      void $('avatar').offsetWidth;
      $('avatar').classList.add('is-popping');
      popTimer = setTimeout(() => $('avatar').classList.remove('is-popping'), 380);
    }
    portraitKey = portrait.key;
  } else {
    $('avatar').firstElementChild.setAttribute('aria-label', `${portrait.age}岁的${portrait.ageLabel}，${lifestyle.label}，奶龙同人表情`);
  }
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

const dragonControl = $('avatar');
dragonControl.setAttribute('role', 'slider');
dragonControl.setAttribute('aria-label', '拖动奶龙调整工作年数');
dragonControl.setAttribute('aria-valuemin', '0');
dragonControl.setAttribute('aria-valuemax', '50');
dragonControl.tabIndex = 0;
let dragonDrag = null;
dragonControl.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary) return;
  dragonDrag = {
    pointerId: event.pointerId,
    x: event.clientX,
    years: inputs.workYears,
    travel: Math.max(200, dragonControl.getBoundingClientRect().width),
  };
  dragonControl.setPointerCapture(event.pointerId);
  dragonControl.classList.add('is-dragging');
});
dragonControl.addEventListener('pointermove', event => {
  if (!dragonDrag || event.pointerId !== dragonDrag.pointerId) return;
  inputs.workYears = quantize('workYears', dragonDrag.years + (event.clientX - dragonDrag.x) * 50 / dragonDrag.travel);
  render();
});
function finishDragonDrag(event) {
  if (!dragonDrag || event.pointerId !== dragonDrag.pointerId) return;
  dragonDrag = null;
  dragonControl.classList.remove('is-dragging');
  if (dragonControl.hasPointerCapture(event.pointerId)) dragonControl.releasePointerCapture(event.pointerId);
}
dragonControl.addEventListener('pointerup', finishDragonDrag);
dragonControl.addEventListener('pointercancel', finishDragonDrag);
dragonControl.addEventListener('lostpointercapture', finishDragonDrag);
dragonControl.addEventListener('keydown', event => {
  const step = event.shiftKey ? 5 : 1;
  let next;
  if (['ArrowLeft', 'ArrowDown'].includes(event.key)) next = inputs.workYears - step;
  else if (['ArrowRight', 'ArrowUp'].includes(event.key)) next = inputs.workYears + step;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = 50;
  else return;
  event.preventDefault();
  inputs.workYears = quantize('workYears', next);
  render();
});

$('randomize').addEventListener('click', () => {
  const pick = (values) => values[Math.floor(Math.random() * values.length)];
  inputs = {
    monthlyIncome: pick([6000, 10000, 15000, 20000, 30000, 50000]),
    workYears: pick([5, 10, 15, 20, 25, 30, 35, 40]),
    currentAge: pick([22, 25, 30, 35, 40]),
    initialAssets: pick([0, 0, 100000, 500000, 1000000]),
    workReturn: pick([0, 0, 1, 2]),
    retirementReturn: pick([1, 1.5, 2, 2.5, 3]),
  };
  render();
  toast('随机设定已抽到，看看这回是什么龙生。');
});

async function loadAtlas() {
  if (!atlasImage) {
    atlasImage = new Image();
    atlasImage.src = ATLAS.src;
  }
  try { await atlasImage.decode(); }
  catch { atlasImage = null; throw new Error('图片暂时没有加载好，请稍后重试。'); }
  return atlasImage;
}

$('export-card').addEventListener('click', async () => {
  const button = $('export-card');
  if (button.disabled) return;
  button.disabled = true;
  const snapshot = { ...inputs };
  try {
    const plan = calculatePlan(snapshot);
    const portrait = getPortraitState({ age: plan.retirementAge, monthlySpending: plan.monthlySpending });
    const image = await loadAtlas();
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器暂不支持保存图片。');
    const font = '"PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#fff5d6';
    ctx.fillRect(0, 0, 900, 1200);
    ctx.strokeStyle = '#28251f';
    ctx.lineWidth = 5;
    ctx.strokeRect(27, 27, 846, 1146);
    ctx.fillStyle = '#28251f';
    ctx.textAlign = 'center';
    ctx.font = `900 56px ${font}`;
    ctx.fillText('奶龙退休变身器', 450, 110);
    ctx.font = `500 25px ${font}`;
    ctx.fillText(`${snapshot.currentAge} 岁出发，再上 ${snapshot.workYears} 年班`, 450, 158);
    ctx.fillStyle = '#f7cc35';
    ctx.fillRect(230, 185, 440, 65);
    ctx.strokeRect(230, 185, 440, 65);
    ctx.fillStyle = '#28251f';
    ctx.font = `800 34px ${font}`;
    ctx.fillText(`${plan.retirementAge} 岁 · ${portrait.ageLabel}`, 450, 230);
    const width = image.naturalWidth / ATLAS.columns;
    const height = image.naturalHeight / ATLAS.rows;
    ctx.drawImage(image, portrait.column * width, portrait.row * height, width, height, 200, 270, 500, 500 * height / width);
    ctx.font = `900 42px ${font}`;
    ctx.fillText(plan.monthlySpending > 0 ? portrait.lifestyle.label : '这会儿还躺不了', 450, 800);
    ctx.font = `500 25px ${font}`;
    ctx.fillText(plan.monthlySpending > 0 ? portrait.lifestyle.description : '退休的心有了，生活费还没到位。', 450, 846);
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(82, 882, 736, 160);
    ctx.strokeRect(82, 882, 736, 160);
    ctx.fillStyle = '#28251f';
    ctx.font = `500 23px ${font}`;
    ctx.fillText('可持续月支出 · 今天的购买力', 450, 922);
    ctx.font = `900 61px ${font}`;
    ctx.fillText(`¥ ${money.format(plan.monthlySpending)} / 月`, 450, 995);
    ctx.font = `500 20px ${font}`;
    ctx.fillText(`税后月薪 ¥${money.format(snapshot.monthlyIncome)} · 已有资产 ${money.format(snapshot.initialAssets / 10000)} 万`, 450, 1081);
    ctx.fillText(`实际年收益假设：工作期 ${snapshot.workReturn}% / 退休后 ${snapshot.retirementReturn}%`, 450, 1116);
    ctx.font = `400 15px ${font}`;
    ctx.fillStyle = '#756f60';
    ctx.fillText('奶龙同人整活 · 非官方 · 固定收益情景，不代表真实退休保障', 450, 1153);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('图片生成失败，请重试。');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `我的龙生-${plan.retirementAge}岁-${money.format(plan.monthlySpending).replaceAll(',', '')}元.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('龙生表情卡已生成，去相册或下载文件里看看。');
  } catch (error) {
    toast(error.message || '图片暂时没准备好，请重试。');
  } finally { button.disabled = false; }
});

render();
hydrateHash();
