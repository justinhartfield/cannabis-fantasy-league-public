/**
 * Cannabis Fantasy League - Embed Widget Script
 * Usage: <script src="https://cfl.weed.de/embed.js" async></script>
 * <div data-cfl-widget="leaderboard" data-type="manufacturer" data-limit="5" data-theme="dark"></div>
 */
(function() {
  'use strict';
  const CFL_BASE_URL = window.CFL_BASE_URL || 'https://cfl.weed.de';
  const CFL_WIDGET_CLASS = 'cfl-widget-container';
  const WIDGET_DEFAULTS = { 'leaderboard': { width: '320px', height: '400px' }, 'entity-badge': { width: '280px', height: 'auto' }, 'rank-badge': { width: '120px', height: '40px' } };

  function initWidgets() { document.querySelectorAll('[data-cfl-widget]').forEach(initWidget); }

  function initWidget(container) {
    if (container.classList.contains(CFL_WIDGET_CLASS)) return;
    const widgetType = container.getAttribute('data-cfl-widget');
    if (!widgetType) return;
    container.classList.add(CFL_WIDGET_CLASS);
    const entityType = container.getAttribute('data-type') || 'manufacturer';
    const entityId = container.getAttribute('data-id');
    const limit = container.getAttribute('data-limit') || '5';
    const theme = container.getAttribute('data-theme') || 'auto';
    const style = container.getAttribute('data-style') || 'standard';
    const customWidth = container.getAttribute('data-width');
    const customHeight = container.getAttribute('data-height');
    const showHeader = container.getAttribute('data-header') !== 'false';
    const showAttribution = container.getAttribute('data-attribution') !== 'false';
    let iframeUrl = '';
    const params = new URLSearchParams();
    params.set('theme', theme);
    switch (widgetType) {
      case 'leaderboard': iframeUrl = `${CFL_BASE_URL}/embed/leaderboard/${entityType}`; params.set('limit', limit); params.set('header', showHeader.toString()); params.set('attribution', showAttribution.toString()); break;
      case 'entity-badge': if (!entityId) { showError(container, 'Missing entity ID'); return; } iframeUrl = `${CFL_BASE_URL}/embed/entity/${entityType}/${entityId}`; params.set('style', style); params.set('attribution', showAttribution.toString()); break;
      case 'rank-badge': if (!entityId) { showError(container, 'Missing entity ID'); return; } iframeUrl = `${CFL_BASE_URL}/embed/entity/${entityType}/${entityId}`; params.set('style', 'minimal'); params.set('attribution', showAttribution.toString()); break;
      default: showError(container, 'Unknown widget type'); return;
    }
    iframeUrl += '?' + params.toString();
    const defaults = WIDGET_DEFAULTS[widgetType] || { width: '300px', height: '200px' };
    const width = customWidth || defaults.width;
    const height = customHeight || defaults.height;
    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.width = width;
    iframe.style.height = height;
    iframe.style.border = 'none';
    iframe.style.borderRadius = '12px';
    iframe.style.overflow = 'hidden';
    iframe.style.display = 'block';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', `CFL ${widgetType} Widget`);
    if (widgetType === 'entity-badge' && !customHeight) { iframe.style.minHeight = style === 'minimal' ? '40px' : style === 'compact' ? '60px' : '140px'; }
    container.innerHTML = '';
    container.style.display = 'inline-block';
    container.appendChild(iframe);
  }

  function showError(container, message) { container.innerHTML = `<div style="padding:16px;background:#1f2937;color:#9ca3af;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;text-align:center"><span style="color:#ef4444">⚠️</span> ${message}</div>`; }

  window.CFL = window.CFL || {
    init: function(container) { initWidget(container); },
    scan: function() { initWidgets(); },
    createLeaderboard: function(options) { const container = document.createElement('div'); container.setAttribute('data-cfl-widget', 'leaderboard'); container.setAttribute('data-type', options.type || 'manufacturer'); if (options.limit) container.setAttribute('data-limit', options.limit); if (options.theme) container.setAttribute('data-theme', options.theme); if (options.width) container.setAttribute('data-width', options.width); if (options.height) container.setAttribute('data-height', options.height); initWidget(container); return container; },
    createEntityBadge: function(options) { if (!options.id) return null; const container = document.createElement('div'); container.setAttribute('data-cfl-widget', 'entity-badge'); container.setAttribute('data-type', options.type || 'manufacturer'); container.setAttribute('data-id', options.id); if (options.style) container.setAttribute('data-style', options.style); if (options.theme) container.setAttribute('data-theme', options.theme); if (options.width) container.setAttribute('data-width', options.width); initWidget(container); return container; },
    getEmbedCode: function(widgetType, options) { let attrs = `data-cfl-widget="${widgetType}"`; if (options.type) attrs += ` data-type="${options.type}"`; if (options.id) attrs += ` data-id="${options.id}"`; if (options.limit) attrs += ` data-limit="${options.limit}"`; if (options.theme) attrs += ` data-theme="${options.theme}"`; if (options.style) attrs += ` data-style="${options.style}"`; return `<script src="${CFL_BASE_URL}/embed.js" async></script>\n<div ${attrs}></div>`; },
    baseUrl: CFL_BASE_URL
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWidgets); else initWidgets();
  if (typeof MutationObserver !== 'undefined') { const observer = new MutationObserver(function(mutations) { mutations.forEach(function(mutation) { mutation.addedNodes.forEach(function(node) { if (node.nodeType === 1) { if (node.hasAttribute && node.hasAttribute('data-cfl-widget')) initWidget(node); if (node.querySelectorAll) node.querySelectorAll('[data-cfl-widget]').forEach(initWidget); } }); }); }); observer.observe(document.body || document.documentElement, { childList: true, subtree: true }); }
})();

