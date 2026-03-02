/**
 * Anti-Debugging Protection
 * Blocks DevTools and console access for extension pages
 * This must run before other scripts to be effective
 */

(function() {
  'use strict';
  
  // Only run in window context (not service workers)
  if (typeof window === 'undefined') {
    return;
  }
  
  // Block console methods - wrap in IIFE to prevent any errors from breaking the page
  (function() {
    try {
      const noop = function() {};
      const methods = ['log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml', 
                       'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd'];
      
      methods.forEach(method => {
        try {
          if (console && typeof console[method] === 'function') {
            // Try to get property descriptor safely
            let descriptor = null;
            try {
              descriptor = Object.getOwnPropertyDescriptor(console, method);
            } catch (e) {
              // Property might be protected, skip descriptor check
            }
            
            // Only try to override if descriptor is configurable or doesn't exist
            if (!descriptor || descriptor.configurable !== false) {
              try {
                Object.defineProperty(console, method, {
                  value: noop,
                  writable: false,
                  configurable: false
                });
              } catch (e) {
                // If defineProperty fails, try direct assignment (may also fail, but won't break)
                try {
                  console[method] = noop;
                } catch (e2) {
                  // Completely ignore - property is fully protected
                }
              }
            }
          }
        } catch (e) {
          // Silently ignore any errors for individual methods
        }
      });
    } catch (e) {
      // Completely fail silently if console object itself is protected
    }
  })();
  
  // Detect DevTools by window size difference
  let devtools = {open: false};
  const threshold = 160;
  
  const checkDevTools = function() {
    try {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          document.body.innerHTML = '';
          document.body.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff; font-size: 24px; font-family: monospace;';
          document.body.textContent = 'Debugging detected. This page cannot be inspected.';
          
          // Clear intervals
          for (let i = 1; i < 99999; i++) {
            try { 
              window.clearInterval(i); 
              window.clearTimeout(i); 
            } catch (e) {}
          }
        }
      } else {
        devtools.open = false;
      }
    } catch (e) {
      // Ignore errors
    }
  };
  
  setInterval(checkDevTools, 500);
  
  // Detect debugger statement
  function detectDebugger() {
    try {
      const start = Date.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = Date.now();
      if (end - start > 100) {
        document.body.innerHTML = '';
        document.body.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff; font-size: 24px; font-family: monospace;';
        document.body.textContent = 'Debugging detected. This page cannot be inspected.';
      }
    } catch (e) {
      // Ignore errors
    }
  }
  
  setInterval(detectDebugger, 1000);
  
  // Override toString to hide function code
  try {
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = function() {
      try {
        if (this === detectDebugger) {
          return 'function() { [native code] }';
        }
        return originalToString.call(this);
      } catch (e) {
        return originalToString.call(this);
      }
    };
  } catch (e) {
    // Ignore errors
  }
  
  // Disable right-click context menu
  if (document.addEventListener) {
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, true);
  }
  
  // Disable common debugger keyboard shortcuts
  if (document.addEventListener) {
    document.addEventListener('keydown', function(e) {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+C (Element Inspector)
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+S (Save Page)
      if (e.ctrlKey && (e.key === 'S' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, true);
  }
  
  // Block DevTools detection patterns
  try {
    Object.defineProperty(window, 'devtools', {
      get: function() { return { open: false }; },
      configurable: false,
      enumerable: false
    });
  } catch (e) {
    // Ignore errors
  }
  
  // Clear console periodically
  setInterval(function() {
    try {
      if (console.clear && typeof console.clear === 'function') {
        console.clear();
      }
    } catch (e) {
      // Ignore errors
    }
  }, 1000);
  
  // Note: Cannot override window.console entirely as it's non-configurable
  // Individual method overrides above are sufficient for blocking console output
  
})();
