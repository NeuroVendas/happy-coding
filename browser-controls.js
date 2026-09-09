'use strict';

// The web/PWA is the Happy Coding workspace; the Electron build is the browser.
// Do not pretend the web shell can host arbitrary sites in internal tabs.
(() => {
  const DESKTOP = /Electron\//i.test(navigator.userAgent);
  const ROOT_CLASS = DESKTOP ? 'hc-desktop-host' : 'hc-web-host';
  document.documentElement.classList.add(ROOT_CLASS);

  function applyHostLayout() {
    if (document.getElementById('hc-host-layout')) return;
    const style = document.createElement('style');
    style.id = 'hc-host-layout';
    style.textContent = `
      html.hc-desktop-host .browser-chrome{display:none!important}
      html.hc-desktop-host .workspace{min-height:100vh!important}
      html.hc-desktop-host .sidebar{top:0!important;height:100vh!important}
      html.hc-web-host .tabs-row{display:none!important}
      html.hc-web-host .workspace{min-height:calc(100vh - 62px)!important}
      html.hc-web-host .sidebar{top:62px!important;height:calc(100vh - 62px)!important}
    `;
    (document.head || document.documentElement).append(style);
  }
  applyHostLayout();

  // In Desktop, the native Happy Coding chrome owns tabs, back/forward,
  // reload, address bar and tab restoration. The page must not create a
  // second fake browser UI on top of it.
  if (DESKTOP) return;

  const byId = id => document.getElementById(id);
  let restoringSearch = false;

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

  function restoreSearch(query) {
    const input = byId('addressInput');
    const form = byId('addressForm');
    if (!(input instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) return;
    restoringSearch = true;
    input.value = query;
    form.requestSubmit();
    queueMicrotask(() => { restoringSearch = false; });
  }

  // Web-mode arrows remain useful for workspace/search history.
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const query = searchFromForm(form);
    if (!query || restoringSearch) return;
    history.pushState({hcBrowser:{kind:'search',query}}, '', `#search=${encodeURIComponent(query)}`);
  }, true);

  window.addEventListener('popstate', event => {
    const nav = event.state?.hcBrowser;
    if (nav?.kind === 'search' && nav.query) queueMicrotask(() => restoreSearch(String(nav.query)));
  });

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    if (target.id === 'backBtn') {
      event.preventDefault();event.stopImmediatePropagation();history.back();return;
    }
    if (target.id === 'forwardBtn') {
      event.preventDefault();event.stopImmediatePropagation();history.forward();return;
    }
    if (target.id === 'reloadBtn') {
      event.preventDefault();event.stopImmediatePropagation();
      const nav = history.state?.hcBrowser;
      if (nav?.kind === 'search' && nav.query) restoreSearch(String(nav.query));
      else location.reload();
    }
  }, true);
})();
