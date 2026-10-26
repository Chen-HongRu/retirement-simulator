const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const lifestyles = [
  { key: 'simple', label: '简简单单', description: '喜欢的书、一杯热茶，日子自有滋味。' },
  { key: 'everyday', label: '轻松日常', description: '给散步留点时间，也给自己一点小欢喜。' },
  { key: 'comfortable', label: '自在生活', description: '穿上舒服的衣服，把日常过成喜欢的样子。' },
  { key: 'refined', label: '精致时光', description: '认真挑一杯咖啡，慢慢享受眼前的风景。' },
  { key: 'explore', label: '随心探索', description: '带着好奇出门，把新的风景收进口袋。' },
];

export function getLifestyle(monthlySpending) {
  const spending = clamp(monthlySpending, 0, 1e9, 6000);
  const index = spending < 3000 ? 0 : spending < 6000 ? 1 : spending < 10000 ? 2 : spending < 18000 ? 3 : 4;
  return { ...lifestyles[index] };
}

export function renderAvatar({ age = 60, monthlySpending = 6000 } = {}) {
  const years = clamp(age, 18, 110, 60);
  const maturity = (years - 18) / 92;
  const style = getLifestyle(monthlySpending);
  const band = lifestyles.findIndex((item) => item.key === style.key);
  const gray = Math.round(61 + maturity * 130);
  const hair = `rgb(${gray},${Math.round(gray * 1.03)},${Math.round(gray * 0.97)})`;
  const creaseOpacity = Math.max(0, (years - 32) / 78).toFixed(3);
  const palette = [
    { shirt: '#8fcab7', detail: '#fff0b0', trousers: '#536d70' },
    { shirt: '#f58f73', detail: '#f9df8e', trousers: '#536d70' },
    { shirt: '#8fcab7', detail: '#f58f73', trousers: '#526b77' },
    { shirt: '#eabf73', detail: '#6cae9c', trousers: '#536d70' },
    { shirt: '#7cb9ac', detail: '#f58f73', trousers: '#526b77' },
  ][band];
  const book = `<g transform="rotate(-10 154 261)"><path d="M117 239q23-9 43 1 22-9 42-1v51q-21-7-42 2-21-9-43-2z" fill="${palette.detail}"/><path d="M160 241v49M128 251l21 2m-21 8 21 2m23-12 18-1m-18 10 18-1" fill="none" stroke-width="2.5"/></g>`;
  const cup = `<g transform="rotate(-8 148 252)"><path d="M127 239h36l-3 34q-14 8-28-1z" fill="#fff3d5"/><path d="M164 244q22-3 17 13-3 9-19 6" fill="none"/><path d="M137 229q-6-7 1-14m13 14q-6-7 1-14" fill="none" stroke="#78998a" stroke-width="3"/></g>`;
  const camera = `<g transform="rotate(-10 155 260)"><path d="M130 243h15l5-9h20l5 9h12v36h-57z" fill="#f8cf75"/><circle cx="160" cy="260" r="11" fill="#55797a"/><circle cx="160" cy="260" r="5" fill="#c6e5d6" stroke-width="2"/><path d="M137 249h6" fill="none" stroke-width="3"/></g>`;
  const scarf = band >= 2 ? `<path d="M202 193q26 14 53-1l-4 19q-25 10-48-1z" fill="${palette.detail}"/><path d="m239 210 14-3 16 45-19 6z" fill="${palette.detail}"/><path d="m255 247 8-3" fill="none" stroke-width="2.5"/>` : `<path d="m216 194 12 17 12-18" fill="#fff3d5"/>`;
  const bag = band === 1 || band === 4 ? `<g><path d="M326 302q0-20 16-20 15 0 16 20" fill="none"/><path d="M317 300h51l5 72q-29 8-60-1z" fill="${band === 4 ? '#efad76' : '#f3d589'}"/><path d="M329 301v12m27-12v12M326 339q13 8 33 0" fill="none" stroke-width="3"/></g>` : '';
  const prop = band === 0 || band === 2 ? book : band === 4 ? camera : cup;
  return `<svg class="avatar-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 460" role="img" aria-label="${Math.round(years)}岁，${style.label}，自在坐着享受生活的人物插画"><g stroke="#344746" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="243" cy="418" rx="135" ry="14" fill="#456f60" opacity=".12" stroke="none"/>
  <g aria-hidden="true"><path d="m184 316-13 92m126-92 17 92" fill="none" stroke="#745e47" stroke-width="12"/><path d="m181 354 122 1" fill="none" stroke="#a1805e" stroke-width="8"/><path d="M164 300q74-9 151 0l-2 22q-73 7-146 0z" fill="#d4aa75"/><path d="m179 308 121 1" fill="none" stroke="#b48d60" stroke-width="2"/></g>
  <path d="M210 279q-22 22-10 55l23 57 28-8-13-61 34-1 20 57 26-9-10-67q-1-25-30-27z" fill="${palette.trousers}"/>
  <path d="m238 322 3-20m29 17 14-14m-83 29 18-5" fill="none" stroke="#344746" stroke-width="3"/>
  <path d="m223 382 25-6 7 21-25 8zM290 372l24-8 11 18-23 13z" fill="#fff1d2"/>
  <path d="m228 396 26-7q11 11 22 14 9 3 7 13l-58 2q-9-9 3-22z" fill="#f4a486"/><path d="m300 386 21-12q15 7 30 7 10 0 12 12l-50 24q-10-3-13-31z" fill="#f4a486"/><path d="M228 410h51m37-1 44-20m-111 8 7 5m66-17 8 5" fill="none" stroke-width="3"/>
  <path d="M203 190q-37 3-48 34l24 23 13-13-5 56q42 18 103-1l-10-65 14 13 19-24q-20-23-52-25z" fill="${palette.shirt}"/>
  <path d="m191 232 1-12m84 6-3-13M204 278q29 7 65-1" fill="none" stroke-width="3"/>
  <path d="M214 165v31q14 18 35-1l-3-34" fill="#efbd98"/>
  ${scarf}
  <path d="M163 228q-23 19-19 37 3 13 19 10l43-15-6-17-35 8 16-13" fill="#f5c9a6"/>
  <path d="M300 223q22 27 6 47-13 14-43-2l-24-13 9-17 35 13-5-13" fill="#f5c9a6"/>
  ${prop}
  <path d="M188 251q12-16 20-11 8 5 2 13l-7 8m43-22q-8-7-13 0-3 6 5 13l13 8" fill="#f5c9a6"/>
  <path d="m192 251 10-4m38-1 8 4" fill="none" stroke-width="2.5"/>
  ${bag}
  <g transform="rotate(-6 232 134)"><ellipse cx="184" cy="139" rx="12" ry="16" fill="#f5c9a6"/><ellipse cx="278" cy="138" rx="12" ry="16" fill="#f5c9a6"/><path d="M190 112q-2-47 43-48 45 0 43 49l-2 36q-5 39-42 41-35-2-41-37z" fill="#f5c9a6"/>
  <path d="m187 137-7-25q-7-26 12-40 7-19 28-13 14-16 31-5 28-1 32 25 14 19-5 55l-6-26q-14 0-23-19-19 25-50 23z" fill="${hair}"/>
  <path d="M201 83q16-2 24-15m10 15q15-6 19-17" fill="none" stroke="#f9f3df" stroke-width="4" opacity="${(0.1 + maturity * 0.65).toFixed(3)}"/>
  <path d="m188 139-3-2m93 2 3-2" fill="none" stroke-width="2.5"/>
  <path d="M202 128q8-5 15-1m29 0q8-4 14 2" fill="none" stroke-width="3.5"/>
  <path d="M207 141q3-3 6 0m35 0q3-3 6 0" fill="none" stroke-width="5"/>
  <path d="m231 140-4 13 7 2" fill="none" stroke="#b97f62" stroke-width="2.7"/>
  <ellipse cx="204" cy="155" rx="10" ry="6" fill="#ec9e82" opacity=".55" stroke="none"/><ellipse cx="258" cy="155" rx="10" ry="6" fill="#ec9e82" opacity=".55" stroke="none"/>
  <path d="M216 164q15 15 30-1" fill="#fff6e2" stroke-width="3"/>
  <g fill="none" stroke="#bd886c" stroke-width="2" opacity="${creaseOpacity}"><path d="m196 141-5 2m7 5-5 3m70-10 6 2m-7 5 6 3M216 117q14-4 28 0m-29-7q13-3 25-1m-32 48-3 7m50-7 3 7m-35 13 13-1"/></g></g>
  ${band === 3 ? '<path d="m287 232 5 19" fill="none" stroke="#345d59" stroke-width="8"/><circle cx="291" cy="243" r="6" fill="#f7dfa0" stroke-width="2.5"/>' : ''}
  </g></svg>`;
}
