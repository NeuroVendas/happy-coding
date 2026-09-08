'use strict';

// Makes the browser-like controls in the web/PWA shell perform real actions.
// In the Electron build, window.open() is already intercepted by the native
// shell and becomes a real Happy Coding tab. In a normal browser/PWA it falls
// back to an actual browser tab/window.
(() => {
  const HOME = new URL('./', location.href).href;
  let restoringSearch = false;

  const byId = id => document.getElementById(id);
  const notify = message => {
    if (typeof window.toast === 'function') window.toast(message);
  };

  function looksLikeAddress(value) {
    const v = String(value || '').trim();
    if (!v || v === 'happy://home') return true;
    if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return true;
    return /^([a-z0-9-]+\.)+[a-z]{2,}(?::\d{1,5})?(\/.*)?$/i.test(v);
  }

  function searchFromForm(form) {
    if (!form) return '';
    if (form.id === 'universalSearch') return String(byId('searchInput')?.value || '').trim();
    if (form.id === 'addressForm') {
      const value = String(byId('addressInput')?.value || '').trim();
      return value && !looksLikeAddress(value) ? value : '';
    }
    return '';
  }

  function openRealTab(url = HOME) {
    const opened = window.open(url, '_blank', 'noopener');
    if (!opened && !/Electron/i.test(navigator.userAgent)) {
      notify('O navegador bloqueou a nova aba. Permita pop-ups para o Happy Coding.');
    }
  }

  function goHome() {
    const home = document.querySelector('[data-view="home"]');
    if (home instanceof HTMLElement) home.click();
    else location.href = HOME;
  }

  function restoreSearch(query) {
    const input = byId('addressInput');
    const form = byId('addressForm');
    if (!(input instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) return;
    restoringSearch = true;
    input.value = query;
    form.requestSubmit();
    queueMicrotask(() => { restoringSearch = false; });
  }

  // Give searches their own browser-history entry. This is what makes the
  // visible back/forward arrows useful after performing searches.
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const query = searchFromForm(form);
    if (!query || restoringSearch) return;
    history.pushState({hcBrowser:{kind:'search',query}}, '', `#search=${encodeURIComponent(query)}`);
  }, true);

  window.addEventListener('popstate', event => {
    const nav = event.state?.hcBrowser;
    if (nav?.kind === 'search' && nav.query) {
      queueMicrotask(() => restoreSearch(String(nav.query)));
    }
  });

  // Capture these clicks before the old prototype handlers in app.js.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!(target instanceof HTMLButtonElement)) return;

    if (target.id === 'backBtn') {
      event.preventDefault();
      event.stopImmediatePropagation();
      history.back();
      return;
    }
    if (target.id === 'forwardBtn') {
      event.preventDefault();
      event.stopImmediatePropagation();
      history.forward();
      return;
    }
    if (target.id === 'reloadBtn') {
      event.preventDefault();
      event.stopImmediatePropagation();
      const nav = history.state?.hcBrowser;
      if (nav?.kind === 'search' && nav.query) restoreSearch(String(nav.query));
      else location.reload();
      return;
    }
    if (target.id === 'newTabBtn') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openRealTab(HOME);
      return;
    }
    if (target.id === 'happyTab') {
      event.preventDefault();
      event.stopImmediatePropagation();
      goHome();
      return;
    }
    if (target.id === 'godotTab') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openRealTab('https://docs.godotengine.org/');
    }
  }, true);

  // The x glyphs in the old mock tabs implied a close button but were only
  // decorative. Hide them until the native tab strip owns close behavior.
  for (const id of ['happyTab', 'godotTab']) {
    const tab = byId(id);
    const last = tab?.lastElementChild;
    if (last) {
      last.setAttribute('hidden', '');
      last.setAttribute('aria-hidden', 'true');
    }
  }

  const newTab = byId('newTabBtn');
  if (newTab) {
    newTab.title = 'Nova aba';
    newTab.setAttribute('aria-label', 'Nova aba');
  }
  const godot = byId('godotTab');
  if (godot) godot.title = 'Abrir Godot Docs em nova aba';
})();
