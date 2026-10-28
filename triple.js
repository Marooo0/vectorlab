/* ============================================================
   VectorLab — three-vector mode
   (A × B) · C   and   A × (B × C)
   ============================================================ */

(function () {
  'use strict';

  const KEY3 = 'vectorlab:three:v1';
  const DEFAULT3 = { op: 'scalar', a: [2, 0, 1], b: [1, 3, 0], c: [0, 1, 2] };
  const PRESETS3 = {
    example:  { a: [2, 0, 1], b: [1, 3, 0], c: [0, 1, 2] },
    cube:     { a: [1, 0, 0], b: [0, 1, 0], c: [0, 0, 1] },
    coplanar: { a: [1, 0, 1], b: [0, 1, 1], c: [1, 1, 2] }
  };
  const OPS3 = ['scalar', 'vector'];
  const MC = '<span class="v tc">C</span>';

  /* ---------- state ---------- */

  function vec3(value, fallback) {
    if (!Array.isArray(value)) return fallback.slice();
    return [0, 1, 2].map((i) => (Number.isFinite(Number(value[i])) ? Number(value[i]) : 0));
  }

  function load() {
    let saved = null;
    try { saved = JSON.parse(safeStore(KEY3) || 'null'); } catch (err) { saved = null; }
    return {
      op: OPS3.includes(saved && saved.op) ? saved.op : DEFAULT3.op,
      a: vec3(saved && saved.a, DEFAULT3.a),
      b: vec3(saved && saved.b, DEFAULT3.b),
      c: vec3(saved && saved.c, DEFAULT3.c)
    };
  }

  const s3 = load();
  const DEFAULT_VIEW3 = { az: -0.68, el: 0.36 };
  const v3 = { ...DEFAULT_VIEW3, zoom: 1 };

  function persist3() {
    safeStore(KEY3, JSON.stringify({
      op: s3.op,
      a: s3.a.map(cleanNumber),
      b: s3.b.map(cleanNumber),
      c: s3.c.map(cleanNumber)
    }));
  }

  /* ---------- maths ---------- */

  function compute3() {
    const { a, b, c } = s3;
    const axb = cross3(a, b);
    const stp = dot3(axb, c);
    const bxc = cross3(b, c);
    const vtp = cross3(a, bxc);
    const ac = dot3(a, c);
    const ab = dot3(a, b);
    const bac = [0, 1, 2].map((i) => b[i] * ac - c[i] * ab);
    return { a, b, c, axb, stp, bxc, vtp, ac, ab, bac, vol: Math.abs(stp) };
  }

  /* ---------- markup helpers ---------- */

  const p3 = (x, y) => `(${fmt(x)})(${fmt(y)})`;
  const lines3 = (items) => items.map((line) => `<div class="math-line">${line}</div>`).join('');
  const step3 = (titleKey, math = '', text = '') => ({ title: t(titleKey), math, text });

  function crossLines(x, y, c) {
    return [
      `${u(0, 'vc')}: ${p3(x[1], y[2])} − ${p3(x[2], y[1])} = ${fmt(c[0])}`,
      `${u(1, 'vc')}: −[${p3(x[0], y[2])} − ${p3(x[2], y[0])}] = ${fmt(c[1])}`,
      `${u(2, 'vc')}: ${p3(x[0], y[1])} − ${p3(x[1], y[0])} = ${fmt(c[2])}`
    ];
  }

  function det3HTML(a, b, c) {
    const rows = [a, b, c];
    const cls = ['ta', 'tb', 'tc'];
    const cells = rows.map((row, r) => row.map((n) => `<span class="${cls[r]}">${fmt(n)}</span>`).join('')).join('');
    return `<div class="det" role="img" aria-label="${t('detAria')}">${cells}</div>`;
  }

  function noteHTML(k) {
    if (s3.op === 'scalar') {
      if (k.vol < 1e-9) return t('tripleCoplanar');
      const v = mathInline(`V = ${fmt(k.vol)}`);
      return t(k.stp > 0 ? 'tripleNotePos' : 'tripleNoteNeg', { v });
    }
    if (mag3(k.vtp) < 1e-9) return t('vectorTripleZero');
    return t('vectorTripleNote');
  }

  /* ---------- steps ---------- */

  function buildScalarSteps(k) {
    const { a, b, c } = k;
    return [
      step3('stepFormula', lines3([
        `(${MA} ${TIMES} ${MB}) ${DOT} ${MC} = `,
        det3HTML(a, b, c)
      ])),
      step3('stepAxB', lines3([...crossLines(a, b, k.axb), `${MA} ${TIMES} ${MB} = ${vecHTML(k.axb, { dim: 3 })}`])),
      step3('stepThenDot', `(${MA} ${TIMES} ${MB}) ${DOT} ${MC} = ${k.axb.map((n, i) => p3(n, c[i])).join(' + ')} = ${fmt(k.stp)}`),
      step3('stepResult', `(${MA} ${TIMES} ${MB}) ${DOT} ${MC} = ${fmt(k.stp)}`),
      step3('stepVolume',
        lines3([`V = |(${MA} ${TIMES} ${MB}) ${DOT} ${MC}| = ${fmt(k.vol)}`, `V / 6 = ${fmt(k.vol / 6)}`]),
        t('volumeExplanation'))
    ];
  }

  function buildVectorSteps(k) {
    const { a, b, c } = k;
    return [
      step3('stepBxC', lines3([...crossLines(b, c, k.bxc), `${MB} ${TIMES} ${MC} = ${vecHTML(k.bxc, { dim: 3 })}`])),
      step3('stepThenCross', lines3([...crossLines(a, k.bxc, k.vtp)])),
      step3('stepResult', `${MA} ${TIMES} (${MB} ${TIMES} ${MC}) = ${vecHTML(k.vtp, { dim: 3 })}`),
      step3('stepIdentity',
        lines3([
          `${MA} ${TIMES} (${MB} ${TIMES} ${MC}) = ${MB}(${MA} ${DOT} ${MC}) − ${MC}(${MA} ${DOT} ${MB})`,
          `${MA} ${DOT} ${MC} = ${fmt(k.ac)}  ,  ${MA} ${DOT} ${MB} = ${fmt(k.ab)}`,
          `= ${paren(k.ac)}${tuple(b, 3)} − ${paren(k.ab)}${tuple(c, 3)} = ${vecHTML(k.bac, { dim: 3 })} <span class="tick">✓</span>`
        ]),
        t('identityExplanation'))
    ];
  }

  /* ---------- render ---------- */

  function render3() {
    const k = compute3();
    const answerEl = $('#answer3');
    const subEl = $('#answerSub3');
    const factsEl = $('#facts3');
    const noteEl = $('#noteText3');

    $('#opPill3').textContent = s3.op === 'scalar' ? t('opScalarTriple') : t('opVectorTriple');

    if (s3.op === 'scalar') {
      answerEl.classList.remove('is-vector');
      answerEl.innerHTML = fmt(k.stp);
      subEl.innerHTML = `(${MA} ${TIMES} ${MB}) ${DOT} ${MC} = ${k.axb.map((n, i) => p3(n, k.c[i])).join(' + ')} = ${fmt(k.stp)}`;
      factsEl.innerHTML = [
        factHTML(t('factVolume'), fmt(k.vol)),
        factHTML(t('factBaseArea'), fmt(mag3(k.axb))),
        factHTML(t('factTetra'), fmt(k.vol / 6)),
        factHTML(t('factAxB'), tuple(k.axb, 3))
      ].join('');
    } else {
      answerEl.classList.add('is-vector');
      answerEl.innerHTML = vecHTML(k.vtp, { dim: 3 });
      subEl.innerHTML = `${MB} ${TIMES} ${MC} = ${vecHTML(k.bxc, { dim: 3 })}`;
      factsEl.innerHTML = [
        factHTML(t('factResultMag'), fmt(mag3(k.vtp))),
        factHTML(t('factBxC'), tuple(k.bxc, 3)),
        factHTML(t('factAC'), fmt(k.ac)),
        factHTML(t('factAB'), fmt(k.ab))
      ].join('');
    }
    noteEl.innerHTML = noteHTML(k);

    const steps = s3.op === 'scalar' ? buildScalarSteps(k) : buildVectorSteps(k);
    $('#steps3').innerHTML = steps.map((item, index) => `
      <li class="step" style="--i:${index}">
        <span class="step-num">${index + 1}</span>
        <div class="step-content">
          <h3 class="step-title">${item.title}</h3>
          ${item.text ? `<p class="step-text">${item.text}</p>` : ''}
          ${item.math ? `<div class="math-block" dir="ltr">${item.math}</div>` : ''}
        </div>
      </li>`).join('');

    renderLegend3(k);
    $('#scene3').setAttribute('aria-label',
      `${t('ariaCanvas3')} A ${tuple(k.a, 3)}, B ${tuple(k.b, 3)}, C ${tuple(k.c, 3)}.`);
  }

  function colors() {
    const dark = state.theme === 'dark';
    return { c3: dark ? '#7aa7ff' : '#2f6fd0' };
  }

  function renderLegend3(k) {
    const P = palette();
    const C3 = colors().c3;
    const items = [
      { color: P.a, label: 'A', value: tuple(k.a, 3) },
      { color: P.b, label: 'B', value: tuple(k.b, 3) },
      { color: C3, label: 'C', value: tuple(k.c, 3) }
    ];
    if (s3.op === 'scalar') {
      items.push({ color: P.proj, label: 'A × B', value: tuple(k.axb, 3) });
    } else {
      items.push({ color: P.proj, label: 'B × C', value: tuple(k.bxc, 3) });
      items.push({ color: P.c, label: 'A × (B × C)', value: tuple(k.vtp, 3) });
    }
    $('#legend3').innerHTML = items.map((item) => `
      <span class="legend-item">
        <span class="legend-dot" style="--dot:${item.color}"></span>
        <b dir="ltr">${item.label}</b>
        <span class="legend-val">${item.value}</span>
      </span>`).join('');
  }

  /* ---------- canvas ---------- */

  function draw3() {
    const canvas = $('#scene3');
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

    const P = palette();
    const C3 = colors().c3;
    const k = compute3();
    const { a, b, c } = k;
    const add = (...vs) => [0, 1, 2].map((i) => vs.reduce((sum, v) => sum + v[i], 0));

    const cam = {
      right: [-Math.sin(v3.az), Math.cos(v3.az), 0],
      up: [
        -Math.cos(v3.az) * Math.sin(v3.el),
        -Math.sin(v3.az) * Math.sin(v3.el),
        Math.cos(v3.el)
      ]
    };

    const reach = s3.op === 'scalar'
      ? mag3(add(a, b, c)) * 0.8
      : Math.max(mag3(k.bxc), mag3(k.vtp)) * 0.8;
    const extent = Math.max(1.4, mag3(a), mag3(b), mag3(c), reach) * 1.12;
    const scale = Math.min(width, height) * 0.41 / extent * v3.zoom;
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
      const boxW = ctx.measureText(text).width + 12;
      const boxH = 20;
      const bx = clamp(x - boxW / 2, 4, width - boxW - 4);
      const by = clamp(y - boxH / 2, 4, height - boxH - 4);
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
      if (options.glow) { ctx.shadowColor = color; ctx.shadowBlur = 7; }
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
      const raw = extent / 6;
      const pow = Math.pow(10, Math.floor(Math.log10(raw)));
      const norm = raw / pow;
      stepSize = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * pow;
    }
    const lineCount = Math.ceil(extent / stepSize);
    ctx.save();
    ctx.lineWidth = 1;
    for (let i = -lineCount; i <= lineCount; i++) {
      const v = i * stepSize;
      ctx.strokeStyle = i === 0 ? P.gridMajor : P.grid;
      let q1 = project([v, -extent, 0]);
      let q2 = project([v, extent, 0]);
      ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
      q1 = project([-extent, v, 0]);
      q2 = project([extent, v, 0]);
      ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
    }
    ctx.restore();

    const polygon = (pts, fill, stroke, dash) => {
      const proj = pts.map(project);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(proj[0][0], proj[0][1]);
      for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i][0], proj[i][1]);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) {
        ctx.setLineDash(dash || []);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    };

    const O = [0, 0, 0];

    if (s3.op === 'scalar' && k.vol > 1e-6) {
      /* parallelepiped */
      const ab = add(a, b);
      const ac = add(a, c);
      const bc = add(b, c);
      const abc = add(a, b, c);
      const faces = [
        [O, a, ab, b], [O, a, ac, c], [O, b, bc, c],
        [c, ac, abc, bc], [b, ab, abc, bc], [a, ab, abc, ac]
      ];
      faces.forEach((face) => polygon(face, P.fill, P.fillStroke, [5, 5]));
    } else if (s3.op === 'vector' && mag3(k.bxc) > 1e-6) {
      /* plane of B and C */
      polygon([O, b, add(b, c), c], P.fill, P.fillStroke, [5, 5]);
    }

    /* axes */
    const axisLen = extent * 0.94;
    ctx.save();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = P.axisSoft;
    ctx.setLineDash([4, 5]);
    [[-axisLen * 0.5, 0, 0], [0, -axisLen * 0.5, 0], [0, 0, -axisLen * 0.35]].forEach((end) => {
      const q = project(end);
      ctx.beginPath(); ctx.moveTo(origin[0], origin[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    });
    ctx.restore();

    arrow([axisLen, 0, 0], P.axis, null, { width: 1.2 });
    arrow([0, axisLen, 0], P.axis, null, { width: 1.2 });
    arrow([0, 0, axisLen], P.axis, null, { width: 1.2 });

    const axisLabel = (text, q) => {
      ctx.save();
      ctx.font = 'italic 600 13px "Cambria Math", "Times New Roman", serif';
      ctx.fillStyle = P.label;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, q[0], q[1]);
      ctx.restore();
    };
    axisLabel('i', project([axisLen * 1.06, 0, 0]));
    axisLabel('j', project([0, axisLen * 1.06, 0]));
    axisLabel('k', project([0, 0, axisLen * 1.06]));

    ctx.save();
    ctx.fillStyle = P.axis;
    ctx.beginPath();
    ctx.arc(origin[0], origin[1], 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* vectors */
    if (s3.op === 'scalar') {
      if (mag3(k.axb) > 1e-6) arrow(k.axb, P.proj, 'A × B', { width: 2.1, dash: [6, 5] });
    } else {
      if (mag3(k.bxc) > 1e-6) arrow(k.bxc, P.proj, 'B × C', { width: 2.1, dash: [6, 5] });
      if (mag3(k.vtp) > 1e-6) arrow(k.vtp, P.c, 'A × (B × C)', { glow: true, width: 2.8 });
    }
    arrow(c, C3, 'C', { glow: true });
    arrow(b, P.b, 'B', { glow: true });
    arrow(a, P.a, 'A', { glow: true });
  }

  /* ---------- controls ---------- */

  function syncInputs() {
    $$('input[data-vec3]').forEach((input) => {
      const value = s3[input.dataset.vec3][Number(input.dataset.axis)];
      input.value = fmtInput(value ?? 0);
      const key = { a: 'ariaInputA', b: 'ariaInputB', c: 'ariaInputC' }[input.dataset.vec3];
      input.setAttribute('aria-label', t(key, { axis: UNITS[Number(input.dataset.axis)] }));
    });
  }

  function syncOps() {
    $$('[data-op3]').forEach((btn) => {
      const active = btn.dataset.op3 === s3.op;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function update3() {
    persist3();
    render3();
    draw3();
  }

  function setOp3(op) {
    s3.op = OPS3.includes(op) ? op : 'scalar';
    syncOps();
    update3();
  }

  function zoomLabel() {
    const label = $('#zoomLevel3');
    if (label) label.textContent = `${Math.round(v3.zoom * 100)}%`;
  }

  function setZoom(value) {
    v3.zoom = clamp(value, 0.5, 4);
    zoomLabel();
    draw3();
  }

  function resetView3() {
    v3.az = DEFAULT_VIEW3.az;
    v3.el = DEFAULT_VIEW3.el;
    v3.zoom = 1;
    zoomLabel();
    draw3();
  }

  function randomVector() {
    const out = [0, 0, 0].map(() => Math.floor(Math.random() * 7) - 3);
    if (out.every((n) => n === 0)) out[0] = 1;
    return out;
  }

  function bind() {
    $$('[data-op3]').forEach((btn) => btn.addEventListener('click', () => setOp3(btn.dataset.op3)));

    $$('input[data-vec3]').forEach((input) => {
      input.addEventListener('input', () => {
        const value = parseFloat(input.value);
        s3[input.dataset.vec3][Number(input.dataset.axis)] = Number.isFinite(value) ? value : 0;
        update3();
      });
      input.addEventListener('blur', () => {
        if (!Number.isFinite(parseFloat(input.value))) {
          s3[input.dataset.vec3][Number(input.dataset.axis)] = 0;
          input.value = '0';
          update3();
        }
      });
    });

    $$('[data-preset3]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = PRESETS3[btn.dataset.preset3];
        if (!preset) return;
        s3.a = preset.a.slice();
        s3.b = preset.b.slice();
        s3.c = preset.c.slice();
        syncInputs();
        update3();
      });
    });

    $('#randomBtn3').addEventListener('click', () => {
      s3.a = randomVector();
      s3.b = randomVector();
      s3.c = randomVector();
      syncInputs();
      update3();
    });

    $('#resetBtn3').addEventListener('click', () => {
      s3.a = DEFAULT3.a.slice();
      s3.b = DEFAULT3.b.slice();
      s3.c = DEFAULT3.c.slice();
      resetView3();
      syncInputs();
      update3();
    });

    $('#copyBtn3').addEventListener('click', async () => {
      const k = compute3();
      const text = s3.op === 'scalar'
        ? `(A × B) · C = ${fmt(k.stp).replace('−', '-')}`
        : `A × (B × C) = ${vecText(k.vtp, 3)}`;
      if (!(await copyText(text))) return;
      const label = $('#copyBtn3 span');
      label.textContent = t('copied');
      showToast(t('copiedToast'));
      setTimeout(() => { label.textContent = t('copy'); }, 1500);
    });

    $('#zoomIn3').addEventListener('click', () => setZoom(v3.zoom * 1.2));
    $('#zoomOut3').addEventListener('click', () => setZoom(v3.zoom / 1.2));
    $('#zoomReset3').addEventListener('click', () => setZoom(1));
    $('#viewReset3').addEventListener('click', resetView3);

    const scene = $('#scene3');
    let drag = null;

    scene.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      drag = { x: event.clientX, y: event.clientY, az: v3.az, el: v3.el };
      try { scene.setPointerCapture(event.pointerId); } catch (err) { /* no-op */ }
      scene.classList.add('dragging');
    });
    scene.addEventListener('pointermove', (event) => {
      if (!drag) return;
      v3.az = drag.az - (event.clientX - drag.x) * 0.0085;
      v3.el = clamp(drag.el + (event.clientY - drag.y) * 0.0085, -0.12, 1.35);
      draw3();
    });
    const endDrag = (event) => {
      if (!drag) return;
      drag = null;
      scene.classList.remove('dragging');
      try { scene.releasePointerCapture(event.pointerId); } catch (err) { /* no-op */ }
    };
    scene.addEventListener('pointerup', endDrag);
    scene.addEventListener('pointercancel', endDrag);
    scene.addEventListener('dblclick', resetView3);
    scene.addEventListener('wheel', (event) => {
      event.preventDefault();
      setZoom(v3.zoom * (event.deltaY < 0 ? 1.12 : 0.89));
    }, { passive: false });

    /* language / theme changes from app.js */
    document.addEventListener('vectorlab:refresh', () => {
      syncInputs();
      render3();
      draw3();
    });

    const wrap = $('#viewThree .canvas-wrap');
    if ('ResizeObserver' in window) new ResizeObserver(() => draw3()).observe(wrap);
    else window.addEventListener('resize', draw3);
  }

  function init3() {
    syncInputs();
    syncOps();
    bind();
    zoomLabel();
    render3();
  }

  window.VectorLab3 = { setOp: setOp3, draw: draw3 };
  init3();
})();
