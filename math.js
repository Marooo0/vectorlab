'use strict';

/* VectorLab — shared helpers, maths and math markup */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const EPS = 1e-10;

function safeStore(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (err) { /* storage unavailable */ }
  return null;
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (m, key) => (vars && key in vars ? vars[key] : m));
}

function t(key, vars) {
  const dict = I18N[state.lang] || I18N.en;
  return fill(dict[key] ?? I18N.en[key] ?? key, vars);
}

/* ---------- vector maths ---------- */

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];

const mag3 = (v) => Math.hypot(v[0], v[1], v[2]);

function unit3(v) {
  const m = mag3(v);
  return m < EPS ? [0, 0, 0] : [v[0] / m, v[1] / m, v[2] / m];
}

/* ---------- formatting ---------- */

function cleanNumber(n) {
  return Math.abs(n) < 5e-11 ? 0 : n;
}

function fmt(n, digits = 4) {
  if (!Number.isFinite(n)) return '—';
  const value = cleanNumber(n);
  let str = String(Number(value.toFixed(digits)));
  if (str === '-0') str = '0';
  return str.replace('-', '−');
}

function paren(n) {
  const value = cleanNumber(n);
  return value < 0 ? `(${fmt(value)})` : fmt(value);
}

function fmtInput(n) {
  return Number.isFinite(n) ? String(Number(n.toFixed(6))) : '';
}

function tuple(v, dim) {
  return '(' + v.slice(0, dim).map((n) => fmt(n)).join(', ') + ')';
}

/* ---------- math markup ---------- */

const MA = '<span class="v ta">A</span>';
const MB = '<span class="v tb">B</span>';
const DOT = '<span class="op">·</span>';
const TIMES = '<span class="op">×</span>';
const UNITS = ['i', 'j', 'k'];

const u = (index, cls = '') => `<span class="uv ${cls}">${UNITS[index]}</span>`;
const aSub = (i) => `<span class="v ta">a</span><sub>${i}</sub>`;
const bSub = (i) => `<span class="v tb">b</span><sub>${i}</sub>`;
const sq = (n) => `${paren(n)}<sup>2</sup>`;

function vecHTML(v, opts = {}) {
  const dim = opts.dim ?? state.dim;
  const unitClass = opts.unitClass || 'vc';
  const parts = [];

  for (let i = 0; i < dim; i++) {
    const n = cleanNumber(v[i]);
    if (Math.abs(n) < 1e-9) continue;
    const abs = Math.abs(n);
    const coef = Math.abs(abs - 1) < 1e-9 ? '' : fmt(abs);
    parts.push({
      sign: n < 0 ? '−' : '+',
      text: `${coef}<span class="uv ${unitClass}">${UNITS[i]}</span>`
    });
  }

  if (!parts.length) return '<span class="vec-zero">0</span>';
  return parts.map((part, index) => {
    if (index === 0) return (part.sign === '−' ? '−' : '') + part.text;
    return ` ${part.sign} ${part.text}`;
  }).join('');
}

function vecText(v, dim = state.dim) {
  const parts = [];
  for (let i = 0; i < dim; i++) {
    const n = cleanNumber(v[i]);
    if (Math.abs(n) < 1e-9) continue;
    const abs = Math.abs(n);
    const coef = Math.abs(abs - 1) < 1e-9 ? '' : fmt(abs).replace('−', '-');
    parts.push({
      sign: n < 0 ? '-' : '+',
      text: `${coef}${UNITS[i]}`
    });
  }
  if (!parts.length) return '0';
  return parts.map((part, index) => {
    if (index === 0) return (part.sign === '-' ? '-' : '') + part.text;
    return ` ${part.sign} ${part.text}`;
  }).join('');
}

function mathInline(html) {
  return `<span class="math-inline" dir="ltr">${html}</span>`;
}
