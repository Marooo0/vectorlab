/* ============================================================
   VectorLab — navigation (home / two vectors / three vectors)
   and full-screen graph
   ============================================================ */

(function () {
  'use strict';

  const views = {
    home: $('#viewHome'),
    two: $('#viewTwo'),
    three: $('#viewThree')
  };

  /* ---------- routing: #/  #/two/dot  #/three/scalar ---------- */

  function parseRoute(hash) {
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const page = parts[0] || 'home';
    if (!views[page]) return { page: 'home', op: null };
    return { page, op: parts[1] || null };
  }

  function show(route) {
    exitFullscreen();
    Object.keys(views).forEach((name) => { views[name].hidden = name !== route.page; });

    if (route.page === 'two' && ['dot', 'cross', 'angle'].includes(route.op)) setOp(route.op);
    if (route.page === 'three' && ['scalar', 'vector'].includes(route.op)) window.VectorLab3.setOp(route.op);

    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      if (route.page === 'two') draw();
      if (route.page === 'three') window.VectorLab3.draw();
    });
  }

  function onHashChange() {
    const hash = location.hash;
    /* in-page anchors such as #main are not routes */
    if (hash && !hash.startsWith('#/')) return;
    show(parseRoute(hash));
  }

  /* ---------- full screen ---------- */

  let fsPanel = null;

  function nativeFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function enterFullscreen(panel) {
    if (fsPanel && fsPanel !== panel) exitFullscreen();
    fsPanel = panel;
    panel.classList.add('is-fs');
    document.body.classList.add('fs-open');
    const request = panel.requestFullscreen || panel.webkitRequestFullscreen;
    if (request) {
      try {
        const result = request.call(panel);
        if (result && result.catch) result.catch(() => { /* CSS fallback stays active */ });
      } catch (err) { /* CSS fallback stays active */ }
    }
    syncFsButtons();
    redrawAll();
  }

  function exitFullscreen() {
    if (!fsPanel) return;
    const panel = fsPanel;
    fsPanel = null;
    panel.classList.remove('is-fs');
    document.body.classList.remove('fs-open');
    if (nativeFullscreenElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try {
        const result = exit.call(document);
        if (result && result.catch) result.catch(() => {});
      } catch (err) { /* no-op */ }
    }
    syncFsButtons();
    redrawAll();
  }

  function syncFsButtons() {
    $$('[data-fs-toggle]').forEach((btn) => {
      const active = !!fsPanel && fsPanel.contains(btn);
      const label = t(active ? 'exitFullscreen' : 'fullscreen');
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function redrawAll() {
    requestAnimationFrame(() => {
      draw();
      window.VectorLab3.draw();
    });
  }

  function onNativeChange() {
    /* user pressed Esc in native full screen */
    if (fsPanel && !nativeFullscreenElement() && fsPanel.dataset.nativeSeen === '1') {
      delete fsPanel.dataset.nativeSeen;
      exitFullscreen();
      return;
    }
    if (fsPanel && nativeFullscreenElement()) fsPanel.dataset.nativeSeen = '1';
    redrawAll();
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-fs-toggle]');
    if (!btn) return;
    const panel = btn.closest('.viz-panel');
    if (!panel) return;
    if (fsPanel === panel) exitFullscreen();
    else enterFullscreen(panel);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && fsPanel) exitFullscreen();
  });

  document.addEventListener('fullscreenchange', onNativeChange);
  document.addEventListener('webkitfullscreenchange', onNativeChange);
  document.addEventListener('vectorlab:refresh', syncFsButtons);

  /* ---------- boot ---------- */

  window.addEventListener('hashchange', onHashChange);
  syncFsButtons();
  show(parseRoute(location.hash.startsWith('#/') || !location.hash ? location.hash : ''));
})();
