/* FizzCipher Bypasser – Floating Panel
 * Injects a toggleable floating widget into the current page.
 * Runs only in the top frame (not inside iframes).
 */
(function () {
  'use strict';

  // Only run in the top-level frame
  if (window !== window.top) return;

  // Skip extension pages and dev-tools
  const proto = location.protocol;
  if (proto === 'chrome-extension:' || proto === 'chrome:' || proto === 'devtools:' || proto === 'about:') return;

  var WIDGET_ID = 'fizz-float-root';
  var PANEL_URL  = (typeof chrome !== 'undefined' && chrome.runtime)
    ? chrome.runtime.getURL('options.html')
    : '';

  /** Minimum panel height when resizing (px) */
  var MIN_PANEL_HEIGHT = 300;
  /** Bottom viewport margin to clamp panel height during resize (px) */
  var PANEL_HEIGHT_MARGIN = 120;
  /** Height of drag bar + gap between panel and FAB button (px) */
  var DRAG_BAR_HEIGHT_WITH_GAP = 44;

  // Avoid double-injection
  if (document.getElementById(WIDGET_ID)) return;

  /* ── Styles ─────────────────────────────────────────────────── */
  var CSS = [
    /* root wrapper */
    '#fizz-float-root{',
    '  all:initial;',
    '  position:fixed;',
    '  bottom:24px;',
    '  right:24px;',
    '  z-index:2147483647;',
    '  display:flex;',
    '  flex-direction:column;',
    '  align-items:flex-end;',
    '  gap:12px;',
    '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '}',

    /* FAB toggle button */
    '#fizz-float-btn{',
    '  all:initial;',
    '  width:52px;',
    '  height:52px;',
    '  border-radius:50%;',
    '  background:#161b22;',
    '  border:2px solid #30363d;',
    '  cursor:pointer;',
    '  display:flex;',
    '  align-items:center;',
    '  justify-content:center;',
    '  box-shadow:0 4px 20px rgba(0,0,0,.55),0 0 0 1px rgba(88,166,255,.25);',
    '  transition:border-color .2s,box-shadow .2s,transform .15s;',
    '  flex-shrink:0;',
    '  position:relative;',
    '  color:#58a6ff;',
    '}',
    '#fizz-float-btn:hover{',
    '  border-color:#58a6ff;',
    '  box-shadow:0 6px 24px rgba(88,166,255,.35),0 0 0 1px rgba(88,166,255,.5);',
    '  transform:scale(1.08);',
    '}',
    '#fizz-float-btn:active{ transform:scale(0.96); }',

    /* FAB icon */
    '#fizz-float-btn svg{',
    '  display:block;',
    '  pointer-events:none;',
    '}',

    /* "pulse" ring when panel is closed */
    '#fizz-float-btn::after{',
    '  content:"";',
    '  position:absolute;',
    '  inset:-4px;',
    '  border-radius:50%;',
    '  border:2px solid rgba(88,166,255,.4);',
    '  animation:fizz-pulse 2.4s ease-out infinite;',
    '}',
    '#fizz-float-btn.open::after{ animation:none; border-color:transparent; }',

    '@keyframes fizz-pulse{',
    '  0%{ transform:scale(1); opacity:.7 }',
    '  70%{ transform:scale(1.35); opacity:0 }',
    '  100%{ transform:scale(1.35); opacity:0 }',
    '}',

    /* badge label */
    '#fizz-float-badge{',
    '  position:absolute;',
    '  top:-6px;',
    '  right:-6px;',
    '  background:#58a6ff;',
    '  color:#fff;',
    '  font-size:9px;',
    '  font-weight:700;',
    '  letter-spacing:.5px;',
    '  line-height:1;',
    '  padding:2px 5px;',
    '  border-radius:6px;',
    '  text-transform:uppercase;',
    '  white-space:nowrap;',
    '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '}',

    /* panel container */
    '#fizz-float-panel{',
    '  display:none;',
    '  flex-direction:column;',
    '  width:940px;',
    '  height:580px;',
    '  max-width:calc(100vw - 48px);',
    '  max-height:calc(100vh - 100px);',
    '  border-radius:10px;',
    '  overflow:hidden;',
    '  border:1px solid #30363d;',
    '  box-shadow:0 20px 60px rgba(0,0,0,.7),0 4px 20px rgba(0,0,0,.5),0 0 0 1px rgba(88,166,255,.12);',
    '  background:#0d1117;',
    '  position:relative;',
    '  transform-origin:bottom right;',
    '  animation:fizz-none 0s;',
    '}',
    '#fizz-float-panel.show{',
    '  display:flex;',
    '  animation:fizz-open .2s cubic-bezier(.34,1.15,.64,1);',
    '}',
    '#fizz-float-panel.hide{',
    '  animation:fizz-close .15s ease-in forwards;',
    '}',

    '@keyframes fizz-open{',
    '  from{ opacity:0; transform:scale(.93) translateY(12px) }',
    '  to{ opacity:1; transform:scale(1) translateY(0) }',
    '}',
    '@keyframes fizz-close{',
    '  from{ opacity:1; transform:scale(1) }',
    '  to{ opacity:0; transform:scale(.93) translateY(10px) }',
    '}',
    '@keyframes fizz-none{ from{} to{} }',

    /* drag handle (top bar) */
    '#fizz-float-drag{',
    '  height:32px;',
    '  min-height:32px;',
    '  background:#161b22;',
    '  border-bottom:1px solid #30363d;',
    '  display:flex;',
    '  align-items:center;',
    '  justify-content:space-between;',
    '  padding:0 12px;',
    '  cursor:grab;',
    '  user-select:none;',
    '  -webkit-user-select:none;',
    '}',
    '#fizz-float-drag:active{ cursor:grabbing; }',

    '#fizz-float-title{',
    '  display:flex;',
    '  align-items:center;',
    '  gap:8px;',
    '  font-size:12px;',
    '  font-weight:700;',
    '  color:#8b949e;',
    '  letter-spacing:.5px;',
    '  text-transform:uppercase;',
    '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  pointer-events:none;',
    '}',

    '#fizz-float-title img{',
    '  width:16px;',
    '  height:16px;',
    '  border-radius:3px;',
    '  pointer-events:none;',
    '}',

    '#fizz-float-drag-dots{',
    '  display:flex;',
    '  gap:3px;',
    '  pointer-events:none;',
    '}',
    '#fizz-float-drag-dots span{',
    '  width:4px;',
    '  height:4px;',
    '  border-radius:50%;',
    '  background:#30363d;',
    '}',

    /* close button inside drag bar */
    '#fizz-float-close{',
    '  all:initial;',
    '  width:22px;',
    '  height:22px;',
    '  border-radius:4px;',
    '  background:transparent;',
    '  border:1px solid transparent;',
    '  cursor:pointer;',
    '  display:flex;',
    '  align-items:center;',
    '  justify-content:center;',
    '  color:#6e7681;',
    '  transition:background .15s,border-color .15s,color .15s;',
    '}',
    '#fizz-float-close:hover{',
    '  background:#21262d;',
    '  border-color:#f85149;',
    '  color:#f85149;',
    '}',
    '#fizz-float-close svg{ display:block; pointer-events:none; }',

    /* iframe */
    '#fizz-float-iframe{',
    '  flex:1;',
    '  width:100%;',
    '  border:none;',
    '  display:block;',
    '  background:#0d1117;',
    '}',

    /* resize handle */
    '#fizz-float-resize{',
    '  position:absolute;',
    '  bottom:0;',
    '  left:0;',
    '  right:0;',
    '  height:6px;',
    '  cursor:ns-resize;',
    '  background:transparent;',
    '}',

    /* mobile adjustments */
    '@media(max-width:600px){',
    '  #fizz-float-root{ bottom:16px; right:16px; gap:8px; }',
    '  #fizz-float-panel{ width:calc(100vw - 32px); max-width:calc(100vw - 32px); height:70vh; border-radius:8px; }',
    '  #fizz-float-btn{ width:46px; height:46px; }',
    '}',
  ].join('\n');

  /* ── Icons ────────────────────────────────────────────────────── */
  var ICON_OPEN = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
  var ICON_CLOSE_BTN = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  /* ── DOM Construction ─────────────────────────────────────────── */
  function build() {
    // Inject CSS
    var style = document.createElement('style');
    style.id = 'fizz-float-css';
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);

    // Root
    var root = document.createElement('div');
    root.id = WIDGET_ID;

    // ── Panel ──
    var panel = document.createElement('div');
    panel.id = 'fizz-float-panel';

    // Drag bar
    var drag = document.createElement('div');
    drag.id = 'fizz-float-drag';

    var dots = document.createElement('div');
    dots.id = 'fizz-float-drag-dots';
    for (var i = 0; i < 6; i++) dots.appendChild(document.createElement('span'));

    var title = document.createElement('div');
    title.id = 'fizz-float-title';
    var iconImg = document.createElement('img');
    iconImg.src = (typeof chrome !== 'undefined' && chrome.runtime)
      ? chrome.runtime.getURL('assets/icons/icon16.png')
      : '';
    iconImg.alt = '';
    var titleText = document.createTextNode('FizzCipher Bypasser');
    title.appendChild(iconImg);
    title.appendChild(titleText);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'fizz-float-close';
    closeBtn.title = 'Close panel';
    closeBtn.innerHTML = ICON_CLOSE_BTN;

    drag.appendChild(dots);
    drag.appendChild(title);
    drag.appendChild(closeBtn);

    // Iframe
    var iframe = document.createElement('iframe');
    iframe.id = 'fizz-float-iframe';
    iframe.src = PANEL_URL;
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-storage-access-by-user-activation');

    // Resize handle
    var resizeHandle = document.createElement('div');
    resizeHandle.id = 'fizz-float-resize';

    panel.appendChild(drag);
    panel.appendChild(iframe);
    panel.appendChild(resizeHandle);

    // ── FAB Button ──
    var btn = document.createElement('button');
    btn.id = 'fizz-float-btn';
    btn.title = 'FizzCipher Bypasser – click to open/close';
    btn.innerHTML = ICON_OPEN + '<span id="fizz-float-badge">ACTIVE</span>';

    root.appendChild(panel);
    root.appendChild(btn);
    document.body.appendChild(root);

    /* ── State ────────────────────────────────────────────────── */
    var isOpen = false;
    var isDragging = false;
    var dragOffX = 0, dragOffY = 0;
    var panelW = 0, panelH = 0;

    function openPanel() {
      isOpen = true;
      panel.classList.remove('hide');
      panel.classList.add('show');
      btn.classList.add('open');
      btn.style.borderColor = '#388bfd';
      btn.style.boxShadow = '0 4px 20px rgba(88,166,255,.4),0 0 0 1px rgba(88,166,255,.6)';
    }

    function closePanel() {
      isOpen = false;
      panel.classList.remove('show');
      panel.classList.add('hide');
      btn.classList.remove('open');
      btn.style.borderColor = '';
      btn.style.boxShadow = '';
      panel.addEventListener('animationend', function onEnd() {
        panel.classList.remove('hide');
        panel.style.display = 'none';
        panel.removeEventListener('animationend', onEnd);
      });
    }

    btn.addEventListener('click', function () {
      if (isOpen) closePanel(); else openPanel();
    });

    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closePanel();
    });

    /* ── Drag ─────────────────────────────────────────────────── */
    drag.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      isDragging = true;
      var rect = root.getBoundingClientRect();
      dragOffX = e.clientX - rect.right;
      dragOffY = e.clientY - rect.bottom;
      panelW = panel.offsetWidth;
      panelH = panel.offsetHeight;
      // Temporarily switch to absolute positioning for drag
      root.style.bottom = 'auto';
      root.style.right  = 'auto';
      root.style.top    = rect.top + 'px';
      root.style.left   = rect.left + 'px';
      document.body.style.userSelect = 'none';
      iframe.style.pointerEvents = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var newLeft = e.clientX - dragOffX - panelW;
      var newTop  = e.clientY - dragOffY - panelH - DRAG_BAR_HEIGHT_WITH_GAP; // drag bar + gap
      // Clamp to viewport
      var maxLeft = window.innerWidth  - panelW - 52 - 12;
      var maxTop  = window.innerHeight - panelH - 52 - 12 - 44;
      newLeft = Math.max(8, Math.min(newLeft, maxLeft));
      newTop  = Math.max(8, Math.min(newTop, maxTop));
      root.style.left = newLeft + 'px';
      root.style.top  = newTop  + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = '';
      iframe.style.pointerEvents = '';
    });

    /* ── Resize (vertical) ───────────────────────────────────── */
    var isResizing = false;
    var resizeStartY = 0, resizeStartH = 0;

    resizeHandle.addEventListener('mousedown', function (e) {
      isResizing = true;
      resizeStartY = e.clientY;
      resizeStartH = panel.offsetHeight;
      iframe.style.pointerEvents = 'none';
      document.body.style.userSelect = 'none';
      e.stopPropagation();
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!isResizing) return;
      var delta = e.clientY - resizeStartY;
      var newH  = Math.max(MIN_PANEL_HEIGHT, Math.min(resizeStartH + delta, window.innerHeight - PANEL_HEIGHT_MARGIN));
      panel.style.height = newH + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (!isResizing) return;
      isResizing = false;
      iframe.style.pointerEvents = '';
      document.body.style.userSelect = '';
    });

    /* ── Persist visibility via storage ──────────────────────── */
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['extensionEnabled', 'fizzPanelOpen'], function (res) {
        // If the extension was previously paused/disabled, hide the FAB entirely
        if (res.extensionEnabled === false) {
          root.style.display = 'none';
          return;
        }
        // Restore last panel state
        if (res.fizzPanelOpen === true) {
          openPanel();
        }
      });

      // Listen for storage changes (e.g., toggling status from options page)
      chrome.storage.onChanged.addListener(function (changes) {
        if (changes.extensionEnabled) {
          root.style.display = changes.extensionEnabled.newValue === false ? 'none' : '';
        }
      });
    }
  }

  /* ── Entry ─────────────────────────────────────────────────────── */
  if (document.body) {
    build();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      if (!document.getElementById(WIDGET_ID)) build();
    });
  }
})();
