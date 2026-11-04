/**
 * MoveAssist Multi-User Session Isolation Manager
 * Ensures independent SimulationEngine instances per client session.
 * SIH 2026 | PS SIH26113 | Team: BERSERK TECHIES | Team ID: TEAM-147
 */
(function () {
  'use strict';

  function generateSessionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
  }

  function getSessionId() {
    let sid = null;
    try {
      sid = sessionStorage.getItem('moveassist_session_id');
    } catch (e) {}

    if (!sid) {
      sid = generateSessionId();
      try {
        sessionStorage.setItem('moveassist_session_id', sid);
      } catch (e) {}
    }

    try {
      document.cookie = 'moveassist_session_id=' + encodeURIComponent(sid) + '; path=/; max-age=86400; SameSite=Lax';
    } catch (e) {}

    return sid;
  }

  // Intercept window.fetch globally to append session_id and headers for all /api/ requests
  const _originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    try {
      let url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : String(resource));
      if (url.includes('/api/')) {
        const sid = getSessionId();
        const delimiter = url.includes('?') ? '&' : '?';
        if (!url.includes('session_id=')) {
          url = url + delimiter + 'session_id=' + encodeURIComponent(sid);
        }
        init = init ? Object.assign({}, init) : {};
        init.headers = init.headers ? new Headers(init.headers) : new Headers();
        if (!init.headers.has('X-Session-ID')) {
          init.headers.set('X-Session-ID', sid);
        }
        if (typeof resource === 'string') {
          return _originalFetch.call(this, url, init);
        } else {
          return _originalFetch.call(this, new Request(url, init));
        }
      }
    } catch (e) {
      console.warn('[Session] Fetch interceptor warning:', e);
    }
    return _originalFetch.apply(this, arguments);
  };

  // Expose on window
  window.MoveAssistSession = {
    getSessionId: getSessionId
  };

  // Update download links once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const sid = getSessionId();
    const dlExcel = document.getElementById('btn-download-excel');
    if (dlExcel) {
      dlExcel.href = '/api/report/download?session_id=' + encodeURIComponent(sid);
    }
    const dlCsv = document.getElementById('btn-download-csv');
    if (dlCsv) {
      dlCsv.href = '/api/report/csv?session_id=' + encodeURIComponent(sid);
    }
  });
})();

