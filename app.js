/* ============================================================
   State
   ============================================================ */

const PRESETS = {
  classic:  { dim: 3, a: [2, 1, 2],  b: [3, -1, 1] },
  right:    { dim: 3, a: [1, 2, 2],  b: [2, -2, 1] },
  parallel: { dim: 3, a: [1, 2, -1], b: [2, 4, -2] },
  textbook: { dim: 2, a: [3, -2],    b: [1, 4] }
};

const DEFAULT_STATE = { op: 'dot', dim: 3, a: [2, 1, 2], b: [3, -1, 1] };
const STORE_KEY = 'vectorlab:state:v1';

function normalizeVec(value) {
  if (!Array.isArray(value)) return null;
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const n = Number(value[i]);
    out[i] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

function loadState() {
  let saved = null;
  try { saved = JSON.parse(safeStore(STORE_KEY) || 'null'); } catch (err) { saved = null; }

  const savedTheme = safeStore('vectorlab:theme');
  let theme = savedTheme;
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return {
    op: ['dot', 'cross', 'angle'].includes(saved && saved.op) ? saved.op : DEFAULT_STATE.op,
    dim: saved && saved.dim === 2 ? 2 : 3,
    a: normalizeVec(saved && saved.a) || DEFAULT_STATE.a.slice(),
    b: normalizeVec(saved && saved.b) || DEFAULT_STATE.b.slice(),
    lang: safeStore('vectorlab:lang') === 'ar' ? 'ar' : 'en',
    theme
  };
}

const state = loadState();

function persist() {
  safeStore(STORE_KEY, JSON.stringify({
    op: state.op,
    dim: state.dim,
    a: state.a.map(cleanNumber),
    b: state.b.map(cleanNumber)
  }));
}

/* ============================================================
   Computation
   ============================================================ */

function compute() {
  const dim = state.dim;
  const a = dim === 2 ? [state.a[0], state.a[1], 0] : state.a.slice();
  const b = dim === 2 ? [state.b[0], state.b[1], 0] : state.b.slice();

  const d = dot3(a, b);
  const ma = mag3(a);
  const mb = mag3(b);
  const c = cross3(a, b);
  const cm = mag3(c);
  const cos = ma > EPS && mb > EPS ? clamp(d / (ma * mb), -1, 1) : NaN;
  const theta = Number.isFinite(cos) ? Math.acos(cos) : NaN;
  const projScalar = mb > EPS ? d / mb : NaN;
  const projVec = mb > EPS
    ? [b[0] * d / (mb * mb), b[1] * d / (mb * mb), b[2] * d / (mb * mb)]
    : [0, 0, 0];

  return { a, b, d, ma, mb, c, cm, cos, theta, projScalar, projVec };
}

function degrees(theta) {
  return theta * 180 / Math.PI;
}

function angleNoteHTML(k) {
  if (!Number.isFinite(k.theta)) return t('needNonZero');
  const deg = degrees(k.theta);
  const thetaHtml = mathInline(`θ = ${fmt(deg, 2)}°`);

  if (deg < 1e-6) return t('angleZero');
  if (Math.abs(deg - 180) < 1e-6) return t('angleFlat');
  if (Math.abs(k.d) < 1e-9) return t('dotMeaningZero', { theta: thetaHtml });
  if (k.d > 0) return t('dotMeaningPos', { theta: thetaHtml });
  return t('dotMeaningNeg', { theta: thetaHtml });
}

function crossNoteHTML(k) {
  if (k.cm < 1e-9 && k.ma > EPS && k.mb > EPS) return t('crossParallelNote');
  let note = t('crossNote');
  if (state.dim === 2) note += ' ' + t('cross2dNote');
  return note;
}

/* ============================================================
   Step builders
   ============================================================ */

const step = (titleKey, math = '', text = '') => ({ title: t(titleKey), math, text });

const prod = (x, y) => `(${fmt(x)})(${fmt(y)})`;

const lines = (items) => items.map((line) => `<div class="math-line">${line}</div>`).join('');

function determinantHTML(a, b) {
  const cells = ['i', 'j', 'k', a[0], a[1], a[2], b[0], b[1], b[2]];
  const html = cells.map((cell, index) => {
    if (index < 3) return `<span class="uv">${cell}</span>`;
    const cls = index < 6 ? 'ta' : 'tb';
    return `<span class="${cls}">${fmt(Number(cell))}</span>`;
  }).join('');
  return `<div class="det" role="img" aria-label="${t('detAria')}">${html}</div>`;
}

function buildDotSteps(k) {
  const n = state.dim;
  const idx = n === 2 ? [0, 1] : [0, 1, 2];

  const formula = idx.map((i) => `${aSub(i + 1)}${bSub(i + 1)}`).join(' + ');
  const substitute = idx.map((i) => `(${fmt(k.a[i])})(${fmt(k.b[i])})`).join(' + ');
  const products = idx.map((i) => paren(k.a[i] * k.b[i])).join(' + ');

  return [
    step('stepFormula', `${MA} ${DOT} ${MB} = ${formula}`),
    step('stepSubstitute', `= ${substitute}`),
    step('stepCompute', `= ${products} = ${fmt(k.d)}`),
    step('stepResult', `${MA} ${DOT} ${MB} = ${fmt(k.d)}`),
    step('stepMeaning', '', angleNoteHTML(k))
  ];
}

function buildCrossSteps(k) {
  const n = state.dim;
  const a = k.a;
  const b = k.b;
  const c = k.c;

  if (n === 2) {
    const det = a[0] * b[1] - a[1] * b[0];
    return [
      step('stepFormula', `${MA} ${TIMES} ${MB} = (${aSub(1)}${bSub(2)} − ${aSub(2)}${bSub(1)})${u(2, 'vc')}`),
      step('stepSubstitute', `= (${prod(a[0], b[1])} − ${prod(a[1], b[0])})${u(2, 'vc')}`),
      step('stepResult', `= ${vecHTML(k.c, { dim: 3 })}`),
      step('stepAreas',
        lines([`|${MA} ${TIMES} ${MB}| = ${fmt(k.cm)}`, `½ |${MA} ${TIMES} ${MB}| = ${fmt(k.cm / 2)}`]),
        t('areaExplanation')),
      step('stepMeaning', '', crossNoteHTML(k))
    ];
  }

  const iComp = `${u(0, 'vc')}: ${prod(a[1], b[2])} − ${prod(a[2], b[1])} = ${fmt(c[0])}`;
  const jComp = `${u(1, 'vc')}: −[${prod(a[0], b[2])} − ${prod(a[2], b[0])}] = ${fmt(c[1])}`;
  const kComp = `${u(2, 'vc')}: ${prod(a[0], b[1])} − ${prod(a[1], b[0])} = ${fmt(c[2])}`;

  const checkA = `${MA} ${DOT} (${MA} ${TIMES} ${MB}) = ${a.map((n2, i) => prod(n2, c[i])).join(' + ')} = ${fmt(dot3(a, c))} <span class="tick">✓</span>`;
  const checkB = `${MB} ${DOT} (${MA} ${TIMES} ${MB}) = ${b.map((n2, i) => prod(n2, c[i])).join(' + ')} = ${fmt(dot3(b, c))} <span class="tick">✓</span>`;
  const angle = Number.isFinite(k.theta) ? fmt(degrees(k.theta), 2) + '°' : '—';

  return [
    step('stepDeterminant', determinantHTML(a, b)),
    step('stepExpand',
      `${MA} ${TIMES} ${MB} = ${u(0, 'vc')}(${aSub(2)}${bSub(3)} − ${aSub(3)}${bSub(2)}) − ${u(1, 'vc')}(${aSub(1)}${bSub(3)} − ${aSub(3)}${bSub(1)}) + ${u(2, 'vc')}(${aSub(1)}${bSub(2)} − ${aSub(2)}${bSub(1)})`),
    step('stepComponents', lines([iComp, jComp, kComp])),
    step('stepResult', `${MA} ${TIMES} ${MB} = ${vecHTML(c)}`),
    step('stepCheck', lines([checkA, checkB])),
    step('stepAreas',
      lines([
        `|${MA} ${TIMES} ${MB}| = √(${sq(c[0])} + ${sq(c[1])} + ${sq(c[2])}) ≈ ${fmt(k.cm)}`,
        `½ |${MA} ${TIMES} ${MB}| ≈ ${fmt(k.cm / 2)}`
      ]),
      `${t('areaExplanation')}  θ = ${angle}.`)
  ];
}

function buildAngleSteps(k) {
  if (!Number.isFinite(k.theta)) {
    return [step('stepResult', '', t('needNonZero'))];
  }

  const n = state.dim;
  const idx = n === 2 ? [0, 1] : [0, 1, 2];
  const deg = degrees(k.theta);

  const dotLine = `${MA} ${DOT} ${MB} = ${idx.map((i) => prod(k.a[i], k.b[i])).join(' + ')} = ${fmt(k.d)}`;
  const magA = `|${MA}| = √(${idx.map((i) => sq(k.a[i])).join(' + ')}) = ${fmt(k.ma)}`;
  const magB = `|${MB}| = √(${idx.map((i) => sq(k.b[i])).join(' + ')}) = ${fmt(k.mb)}`;
  const cosLine = `cos θ = ${fmt(k.d)} / (${fmt(k.ma)} ${TIMES} ${fmt(k.mb)}) = ${fmt(k.cos)}`;
  const thetaLine = `θ = cos⁻¹(${fmt(k.cos)}) = ${fmt(deg, 2)}°`;

  return [
    step('stepFormula', `cos θ = (${MA} ${DOT} ${MB}) / (|${MA}| |${MB}|)`),
    step('stepSubstitute', lines([dotLine, magA, magB])),
    step('stepCompute', lines([cosLine, thetaLine])),
    step('stepResult', `θ = ${fmt(deg, 2)}°`),
    step('stepClassify', '', angleNoteHTML(k))
  ];
}

/* ============================================================
   Render — result card
   ============================================================ */

function factHTML(label, value, extra = '') {
  return `<div class="fact">
    <span class="fact-label" dir="auto">${label}</span>
    <span class="fact-value" dir="ltr">${value}</span>
    ${extra ? `<span class="fact-sub">${extra}</span>` : ''}
  </div>`;
}

function renderResult(k) {
  const answerEl = $('#answer');
  const subEl = $('#answerSub');
  const factsEl = $('#facts');
  const noteEl = $('#noteText');
  const opPill = $('#opPill');

  const opKey = { dot: 'opDot', cross: 'opCross', angle: 'opAngle' }[state.op];
  opPill.textContent = t(opKey);

  if (state.op === 'dot') {
    answerEl.classList.remove('is-vector');
    answerEl.innerHTML = fmt(k.d);

    const idx = state.dim === 2 ? [0, 1] : [0, 1, 2];
    subEl.innerHTML = `${MA} ${DOT} ${MB} = ${idx.map((i) => `(${fmt(k.a[i])})(${fmt(k.b[i])})`).join(' + ')} = ${fmt(k.d)}`;

    factsEl.innerHTML = [
      factHTML(t('factMagA'), fmt(k.ma)),
      factHTML(t('factMagB'), fmt(k.mb)),
      factHTML(t('factTheta'), Number.isFinite(k.theta) ? `${fmt(degrees(k.theta), 2)}°` : '—'),
      factHTML(t('factProj'), Number.isFinite(k.projScalar) ? fmt(k.projScalar) : '—')
    ].join('');

    noteEl.innerHTML = angleNoteHTML(k);
  }

  if (state.op === 'cross') {
    answerEl.classList.add('is-vector');
    answerEl.innerHTML = vecHTML(k.c, { dim: 3 });

    subEl.innerHTML = `|${MA} ${TIMES} ${MB}| = ${fmt(k.cm)}`;

    factsEl.innerHTML = [
      factHTML(t('factCrossMag'), fmt(k.cm)),
      factHTML(t('factTriArea'), fmt(k.cm / 2)),
      factHTML(t('factTheta'), Number.isFinite(k.theta) ? `${fmt(degrees(k.theta), 2)}°` : '—'),
      factHTML(t('factMagA'), fmt(k.ma))
    ].join('');

    noteEl.innerHTML = crossNoteHTML(k);
  }

  if (state.op === 'angle') {
    answerEl.classList.remove('is-vector');
    if (Number.isFinite(k.theta)) {
      answerEl.innerHTML = `${fmt(degrees(k.theta), 2)}°`;
      subEl.innerHTML = `cos θ = ${fmt(k.d)} / (${fmt(k.ma)} ${TIMES} ${fmt(k.mb)}) = ${fmt(k.cos)}`;
      factsEl.innerHTML = [
        factHTML(t('factMagA'), fmt(k.ma)),
        factHTML(t('factMagB'), fmt(k.mb)),
        factHTML(t('factDot'), fmt(k.d)),
        factHTML(t('factRad'), fmt(k.theta, 4))
      ].join('');
    } else {
      answerEl.innerHTML = '—';
      subEl.innerHTML = '';
      factsEl.innerHTML = [
        factHTML(t('factMagA'), fmt(k.ma)),
        factHTML(t('factMagB'), fmt(k.mb))
      ].join('');
    }
    noteEl.innerHTML = angleNoteHTML(k);
  }

  renderSteps(k);
  renderLegend(k);
  updateCanvasAria(k);
}

function renderSteps(k) {
  let steps;
  if (state.op === 'dot') steps = buildDotSteps(k);
  else if (state.op === 'cross') steps = buildCrossSteps(k);
  else steps = buildAngleSteps(k);

  $('#steps').innerHTML = steps.map((item, index) => `
    <li class="step" style="--i:${index}">
      <span class="step-num">${index + 1}</span>
      <div class="step-content">
        <h3 class="step-title">${item.title}</h3>
        ${item.text ? `<p class="step-text">${item.text}</p>` : ''}
        ${item.math ? `<div class="math-block" dir="ltr">${item.math}</div>` : ''}
      </div>
    </li>`).join('');
}

function renderLegend(k) {
  const dim = state.dim;
  const items = [
    { color: 'var(--a)', label: 'A', value: tuple(k.a, dim) },
    { color: 'var(--b)', label: 'B', value: tuple(k.b, dim) }
  ];

  if (state.op === 'cross') {
    items.push({
      color: 'var(--coral)',
      label: 'A × B',
      value: dim === 2 ? `(${fmt(k.c[2])}) k` : tuple(k.c, 3)
    });
  }

  if (state.op === 'dot' && Number.isFinite(k.projScalar) && Math.abs(k.projScalar) > 1e-9) {
    items.push({ color: 'var(--violet)', label: t('projLabel'), value: fmt(k.projScalar) });
  }

  if (state.op === 'angle' && Number.isFinite(k.theta)) {
    items.push({ color: 'var(--violet)', label: 'θ', value: `${fmt(degrees(k.theta), 2)}°` });
  }

  $('#legend').innerHTML = items.map((item) => `
    <span class="legend-item">
      <span class="legend-dot" style="--dot:${item.color}"></span>
      <b dir="ltr">${item.label}</b>
      <span class="legend-val">${item.value}</span>
    </span>`).join('');
}

function updateCanvasAria(k) {
  const dim = state.dim;
  const desc = `${t('ariaCanvas')} A ${tuple(k.a, dim)}, B ${tuple(k.b, dim)}.`;
  $('#scene').setAttribute('aria-label', desc);
}

/* ============================================================
   Canvas — interactive orthographic 3D view
   ============================================================ */

const DEFAULT_VIEW = { az: -0.68, el: 0.36 };
const view = { ...DEFAULT_VIEW, zoom: 1 };

let W = 0;
let H = 0;

function palette() {
  if (state.theme === 'dark') {
    return {
      grid: 'rgba(238,243,248,0.07)',
      gridMajor: 'rgba(238,243,248,0.14)',
      axis: 'rgba(238,243,248,0.38)',
      axisSoft: 'rgba(238,243,248,0.17)',
      label: '#9fb0c0',
      a: '#e3b25c',
      b: '#3ac7b7',
      c: '#f07b6b',
      proj: '#b29cff',
      fill: 'rgba(240,123,107,0.17)',
      fillStroke: 'rgba(240,123,107,0.55)',
      tagBg: 'rgba(18,27,36,0.88)',
      ink: '#eef3f8'
    };
  }
  return {
    grid: 'rgba(24,33,44,0.075)',
    gridMajor: 'rgba(24,33,44,0.14)',
    axis: 'rgba(24,33,44,0.40)',
    axisSoft: 'rgba(24,33,44,0.17)',
    label: '#756d5e',
    a: '#b0761c',
    b: '#0e766e',
    c: '#cf5442',
    proj: '#7657b8',
    fill: 'rgba(207,84,66,0.16)',
    fillStroke: 'rgba(207,84,66,0.55)',
    tagBg: 'rgba(255,253,248,0.9)',
    ink: '#18212c'
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function draw() {
  const canvas = $('#scene');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  W = width;
  H = height;
  const P = palette();
  const k = compute();

  const cam = {
    right: [-Math.sin(view.az), Math.cos(view.az), 0],
    up: [
      -Math.cos(view.az) * Math.sin(view.el),
      -Math.sin(view.az) * Math.sin(view.el),
      Math.cos(view.el)
    ]
  };

  const extent = Math.max(1.4, k.ma, k.mb, state.op === 'cross' ? k.cm * 0.8 : 0) * 1.12;
  const scale = Math.min(width, height) * 0.41 / extent * view.zoom;
  const ox = width * 0.5;
  const oy = height * 0.57;

  const project = (p) => {
    const sx = p[0] * cam.right[0] + p[1] * cam.right[1] + p[2] * cam.right[2];
    const sy = p[0] * cam.up[0] + p[1] * cam.up[1] + p[2] * cam.up[2];
    return [ox + sx * scale, oy - sy * scale];
  };

  const origin = project([0, 0, 0]);

  const tag = (text, x, y, color) => {
    ctx.save();
    ctx.font = '600 11.5px Outfit, Cairo, "Segoe UI", system-ui, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const padX = 6;
    const boxW = textWidth + padX * 2;
    const boxH = 20;
    const bx = clamp(x - boxW / 2, 4, W - boxW - 4);
    const by = clamp(y - boxH / 2, 4, H - boxH - 4);
    roundRect(ctx, bx, by, boxW, boxH, 7);
    ctx.fillStyle = P.tagBg;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + boxW / 2, by + boxH / 2 + 0.5);
    ctx.restore();
  };

  const arrow = (to, color, label, options = {}) => {
    const [x1, y1] = origin;
    const [x2, y2] = project(to);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;
    const ux = dx / len;
    const uy = dy / len;
    const head = Math.min(11.5, len * 0.34);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = options.width || 2.6;
    ctx.lineCap = 'round';
    if (options.dash) ctx.setLineDash(options.dash);
    if (options.glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 7;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - ux * head * 0.55, y2 - uy * head * 0.55);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ux * head - uy * head * 0.44, y2 - uy * head + ux * head * 0.44);
    ctx.lineTo(x2 - ux * head + uy * head * 0.44, y2 - uy * head - ux * head * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (label) tag(label, x2 + ux * 17, y2 + uy * 17, color);
  };

  /* ground grid */
  let stepSize;
  if (extent <= 7) stepSize = 1;
  else if (extent <= 14) stepSize = 2;
  else {
    const rawStep = extent / 6;
    const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / pow;
    stepSize = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * pow;
  }
  const lineCount = Math.ceil(extent / stepSize);
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = P.grid;
  for (let i = -lineCount; i <= lineCount; i++) {
    const v = i * stepSize;
    const isMajor = i === 0;
    ctx.strokeStyle = isMajor ? P.gridMajor : P.grid;
    let p1 = project([v, -extent, 0]);
    let p2 = project([v, extent, 0]);
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();

    p1 = project([-extent, v, 0]);
    p2 = project([extent, v, 0]);
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
  ctx.restore();

  /* parallelogram (cross product area) */
  if (state.op === 'cross' && k.cm > 1e-6) {
    const a = k.a;
    const b = k.b;
    const pts = [
      project([0, 0, 0]),
      project(a),
      project([a[0] + b[0], a[1] + b[1], a[2] + b[2]]),
      project(b)
    ];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = P.fill;
    ctx.fill();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = P.fillStroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  /* projection of A on B (dot mode) */
  if (state.op === 'dot' && Number.isFinite(k.projScalar) && Math.abs(k.projScalar) > 1e-7) {
    const p = project(k.projVec);
    const aPoint = project(k.a);
    ctx.save();
    ctx.strokeStyle = P.proj;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(origin[0], origin[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();

    ctx.strokeStyle = P.axisSoft;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(aPoint[0], aPoint[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    ctx.restore();
    tag(t('projLabel'), (p[0] + origin[0]) / 2, (p[1] + origin[1]) / 2 - 13, P.proj);
  }

  /* axes */
  const axisLen = extent * 0.94;
  ctx.save();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = P.axisSoft;
  ctx.setLineDash([4, 5]);
  [[-axisLen * 0.5, 0, 0], [0, -axisLen * 0.5, 0], [0, 0, -axisLen * 0.35]].forEach((end) => {
    const p = project(end);
    ctx.beginPath();
    ctx.moveTo(origin[0], origin[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  });
  ctx.restore();

  arrow([axisLen, 0, 0], P.axis, null, { width: 1.2 });
  arrow([0, axisLen, 0], P.axis, null, { width: 1.2 });
  arrow([0, 0, axisLen], P.axis, null, { width: 1.2 });

  const axisLabel = (text, p) => {
    ctx.save();
    ctx.font = 'italic 600 13px "Cambria Math", "Times New Roman", serif';
    ctx.fillStyle = P.label;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, p[0], p[1]);
    ctx.restore();
  };
  axisLabel('i', project([axisLen * 1.06, 0, 0]));
  axisLabel('j', project([0, axisLen * 1.06, 0]));
  axisLabel('k', project([0, 0, axisLen * 1.06]));

  /* origin */
  ctx.save();
  ctx.fillStyle = P.axis;
  ctx.beginPath();
  ctx.arc(origin[0], origin[1], 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* angle arc */
  if (state.op === 'angle' && Number.isFinite(k.theta) && k.theta > 1e-5 && Math.abs(k.theta - Math.PI) > 1e-5) {
    const ua = unit3(k.a);
    const ub = unit3(k.b);
    const omega = k.theta;
    const radius = Math.min(k.ma, k.mb) * 0.38;
    const segments = 44;
    ctx.save();
    ctx.strokeStyle = P.proj;
    ctx.lineWidth = 1.7;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const tt = i / segments;
      const s1 = Math.sin((1 - tt) * omega) / Math.sin(omega);
      const s2 = Math.sin(tt * omega) / Math.sin(omega);
      const dir = [ua[0] * s1 + ub[0] * s2, ua[1] * s1 + ub[1] * s2, ua[2] * s1 + ub[2] * s2];
      const p = project([dir[0] * radius, dir[1] * radius, dir[2] * radius]);
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
    ctx.restore();

    const s1 = Math.sin(0.5 * omega) / Math.sin(omega);
    const s2 = Math.sin(0.5 * omega) / Math.sin(omega);
    const midDir = [ua[0] * s1 + ub[0] * s2, ua[1] * s1 + ub[1] * s2, ua[2] * s1 + ub[2] * s2];
    const mid = project([midDir[0] * radius * 1.16, midDir[1] * radius * 1.16, midDir[2] * radius * 1.16]);
    tag('θ', mid[0], mid[1], P.proj);
  }

  /* vectors */
  arrow(k.b, P.b, 'B', { glow: true });
  arrow(k.a, P.a, 'A', { glow: true });
  if (state.op === 'cross') {
    arrow(k.c, P.c, 'A × B', { glow: true, width: 2.8 });
  }
}

/* ============================================================
   Language, theme and live UI
   ============================================================ */

function updateInputAria() {
  $$('input[data-vec]').forEach((input) => {
    const axis = UNITS[Number(input.dataset.axis)];
    const key = input.dataset.vec === 'a' ? 'ariaInputA' : 'ariaInputB';
    input.setAttribute('aria-label', t(key, { axis }));
  });
}

function applyLang(options = {}) {
  const isArabic = state.lang === 'ar';
  document.documentElement.lang = state.lang;
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr';

  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });

  document.title = isArabic
    ? 'متجهات — حل ضرب المتجهات'
    : 'VectorLab — Vector Product Solver';

  $$('.lang-switch button').forEach((btn) => {
    const active = btn.dataset.lang === state.lang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  updateInputAria();
  safeStore('vectorlab:lang', state.lang);
  if (options.render !== false) {
    update();
    document.dispatchEvent(new Event('vectorlab:refresh'));
  }
}

function applyTheme(options = {}) {
  document.documentElement.dataset.theme = state.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', state.theme === 'dark' ? '#0c1219' : '#f5efe3');
  safeStore('vectorlab:theme', state.theme);
  $('#themeToggle').setAttribute('aria-label', t('ariaTheme'));
  if (options.render !== false) {
    draw();
    document.dispatchEvent(new Event('vectorlab:refresh'));
  }
}

function syncVectorInputs() {
  $$('input[data-vec]').forEach((input) => {
    const value = state[input.dataset.vec][Number(input.dataset.axis)];
    input.value = fmtInput(value ?? 0);
  });
}

function syncDimUI() {
  $('#workspace').dataset.dim = String(state.dim);
  $$('[data-dim-btn]').forEach((btn) => {
    const active = Number(btn.dataset.dimBtn) === state.dim;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  $$('.comp-k input').forEach((input) => { input.disabled = state.dim === 2; });
}

function syncOpUI() {
  $$('.op-btn').forEach((btn) => {
    const active = btn.dataset.op === state.op;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function setDim(dim) {
  state.dim = Number(dim) === 2 ? 2 : 3;
  syncDimUI();
  update();
}

function setOp(op) {
  state.op = ['dot', 'cross', 'angle'].includes(op) ? op : 'dot';
  syncOpUI();
  update();
}

function resetView() {
  view.az = DEFAULT_VIEW.az;
  view.el = DEFAULT_VIEW.el;
  view.zoom = 1;
  updateZoomLabel();
  draw();
}

function updateZoomLabel() {
  const label = $('#zoomLevel');
  if (label) label.textContent = `${Math.round(view.zoom * 100)}%`;
}

function zoomIn() {
  view.zoom = clamp(view.zoom * 1.2, 0.5, 4);
  updateZoomLabel();
  draw();
}

function zoomOut() {
  view.zoom = clamp(view.zoom / 1.2, 0.5, 4);
  updateZoomLabel();
  draw();
}

function resetZoom() {
  view.zoom = 1;
  updateZoomLabel();
  draw();
}

function randomVectors() {
  const makeVec = () => {
    const out = [0, 0, 0];
    const count = state.dim === 2 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      out[i] = Math.floor(Math.random() * 7) - 3;
    }
    if (out.slice(0, count).every((value) => value === 0)) out[0] = 1;
    if (state.dim === 2) out[2] = 0;
    return out;
  };

  state.a = makeVec();
  state.b = makeVec();
  syncVectorInputs();
  update();
}

let drawQueued = false;
function scheduleDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    draw();
  });
}

function update() {
  persist();
  const k = compute();
  renderResult(k);
  scheduleDraw();
}

/* ============================================================
   Copy + toast
   ============================================================ */

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) { /* fall through to legacy path */ }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch (err) {
    return false;
  }
}

let toastTimer = 0;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
}

/* ============================================================
   Events
   ============================================================ */

function bindEvents() {
  $$('.op-btn').forEach((btn) => {
    btn.addEventListener('click', () => setOp(btn.dataset.op));
  });

  $$('[data-dim-btn]').forEach((btn) => {
    btn.addEventListener('click', () => setDim(btn.dataset.dimBtn));
  });

  $$('input[data-vec]').forEach((input) => {
    input.addEventListener('input', () => {
      const value = parseFloat(input.value);
      state[input.dataset.vec][Number(input.dataset.axis)] = Number.isFinite(value) ? value : 0;
      update();
    });
    input.addEventListener('blur', () => {
      const value = parseFloat(input.value);
      if (!Number.isFinite(value)) {
        state[input.dataset.vec][Number(input.dataset.axis)] = 0;
        input.value = '0';
        update();
      }
    });
  });

  $$('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (!preset) return;
      state.a = [preset.a[0] ?? 0, preset.a[1] ?? 0, preset.a[2] ?? 0];
      state.b = [preset.b[0] ?? 0, preset.b[1] ?? 0, preset.b[2] ?? 0];
      state.dim = preset.dim;
      syncDimUI();
      syncVectorInputs();
      update();
    });
  });

  $('#swapBtn').addEventListener('click', () => {
    const temporary = state.a;
    state.a = state.b;
    state.b = temporary;
    syncVectorInputs();
    update();
  });

  $('#resetBtn').addEventListener('click', () => {
    state.a = DEFAULT_STATE.a.slice();
    state.b = DEFAULT_STATE.b.slice();
    state.dim = DEFAULT_STATE.dim;
    resetView();
    syncDimUI();
    syncVectorInputs();
    update();
  });

  $('#randomBtn').addEventListener('click', randomVectors);

  $('#copyBtn').addEventListener('click', async () => {
    const k = compute();
    let text = '';
    if (state.op === 'dot') {
      text = `A · B = ${fmt(k.d).replace('−', '-')}`;
    } else if (state.op === 'cross') {
      text = `A × B = ${vecText(k.c, 3)}`;
    } else {
      text = Number.isFinite(k.theta) ? `θ = ${fmt(degrees(k.theta), 2).replace('−', '-')}°` : '—';
    }

    const ok = await copyText(text);
    if (!ok) return;

    const label = $('#copyBtn span');
    label.textContent = t('copied');
    showToast(t('copiedToast'));
    setTimeout(() => { label.textContent = t('copy'); }, 1500);
  });

  $('#themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  });

  $$('.lang-switch button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.lang === state.lang) return;
      state.lang = btn.dataset.lang;
      applyLang();
    });
  });

  $('#viewReset').addEventListener('click', resetView);

  $('#zoomIn').addEventListener('click', zoomIn);
  $('#zoomOut').addEventListener('click', zoomOut);
  $('#zoomReset').addEventListener('click', resetZoom);

  const scene = $('#scene');
  let drag = null;

  scene.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, az: view.az, el: view.el };
    try { scene.setPointerCapture(event.pointerId); } catch (err) { /* no-op */ }
    scene.classList.add('dragging');
  });

  scene.addEventListener('pointermove', (event) => {
    if (!drag) return;
    view.az = drag.az - (event.clientX - drag.x) * 0.0085;
    view.el = clamp(drag.el + (event.clientY - drag.y) * 0.0085, -0.12, 1.35);
    draw();
  });

  const endDrag = (event) => {
    if (!drag) return;
    drag = null;
    scene.classList.remove('dragging');
    try { scene.releasePointerCapture(event.pointerId); } catch (err) { /* no-op */ }
  };
  scene.addEventListener('pointerup', endDrag);
  scene.addEventListener('pointercancel', endDrag);
  scene.addEventListener('dblclick', resetView);

  scene.addEventListener('wheel', (event) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    view.zoom = clamp(view.zoom * factor, 0.5, 4);
    updateZoomLabel();
    draw();
  }, { passive: false });
}

/* ============================================================
   Boot
   ============================================================ */

function init() {
  applyLang({ render: false });
  applyTheme({ render: false });
  syncVectorInputs();
  syncDimUI();
  syncOpUI();
  bindEvents();
  updateZoomLabel();
  update();

  const canvasWrap = $('.canvas-wrap');
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => draw()).observe(canvasWrap);
  } else {
    window.addEventListener('resize', draw);
  }
  requestAnimationFrame(draw);
}

init();
