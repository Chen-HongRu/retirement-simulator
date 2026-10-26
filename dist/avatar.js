// Fifteen ImageGen sprites: spending changes columns, retirement age changes rows.
export const ATLAS = Object.freeze({
  src: './assets/nailong-life-atlas.png',
  columns: 5,
  rows: 3,
  width: 1619,
  height: 971,
});

const lifestyles = [
  { key: 'noodles', label: '泡面自由', description: '班可以不上，调料包必须全放。', threshold: 3000 },
  { key: 'tea', label: '奶茶自由', description: '今天的 KPI：珍珠一颗都不剩。', threshold: 6000 },
  { key: 'camping', label: '公园常驻', description: '工位已搬到公园，会议改成晒太阳。', threshold: 10000 },
  { key: 'chill', label: '躺平大户', description: '你先上班，我的咖啡还没喝完。', threshold: 18000 },
  { key: 'king', label: '龙王退休', description: '这个班，谁爱上谁上。', threshold: Infinity },
];

const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export function getLifestyle(monthlySpending) {
  const amount = Math.max(0, finite(monthlySpending, 0));
  const index = lifestyles.findIndex(item => amount < item.threshold);
  return { ...lifestyles[index], index };
}

export function getPortraitState({ age, monthlySpending }) {
  const normalizedAge = Math.round(Math.max(18, Math.min(110, finite(age, 22))));
  const row = normalizedAge < 40 ? 0 : normalizedAge < 60 ? 1 : 2;
  const lifestyle = getLifestyle(monthlySpending);
  return {
    row,
    column: lifestyle.index,
    age: normalizedAge,
    ageLabel: ['青年龙', '中年龙', '大爷龙'][row],
    lifestyle,
    key: `${row}-${lifestyle.index}`,
  };
}

export function renderAvatar(input) {
  const state = getPortraitState(input);
  const x = state.column * 100 / (ATLAS.columns - 1);
  const y = state.row * 100 / (ATLAS.rows - 1);
  const ratio = (ATLAS.width / ATLAS.columns) / (ATLAS.height / ATLAS.rows);
  return `<div class="dragon-sprite" role="img" aria-label="${state.age}岁的${state.ageLabel}，${state.lifestyle.label}，奶龙同人表情" data-column="${state.column}" data-row="${state.row}" style="--sprite-x:${x}%;--sprite-y:${y}%;--sprite-ratio:${ratio}"></div>`;
}
