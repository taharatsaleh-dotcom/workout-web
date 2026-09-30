// Run: node build.js SUPABASE_URL SUPABASE_ANON_KEY
// Example: node build.js https://xyz.supabase.co eyJhbGci...

const fs = require('fs');
const path = require('path');

const SUPABASE_URL  = process.argv[2] || 'SUPABASE_URL_HERE';
const SUPABASE_KEY  = process.argv[3] || 'SUPABASE_ANON_KEY_HERE';

// ── Read original bundle ────────────────────────────────────────────────────

let bundle = fs.readFileSync(path.join(__dirname, 'bundle.html'), 'utf8');

// ── Sync layer (shared between both files) ──────────────────────────────────

function syncScript(username, role) {
  const isCoach = role === 'coach';
  const SESSION_MS = 90 * 24 * 60 * 60 * 1000;

  return `<script>
(function() {
  // ── Session ──────────────────────────────────────────────────────────────
  var USERNAME = '${username}';
  var ROLE     = '${role}';
  var SB_URL   = '${SUPABASE_URL}';
  var SB_KEY   = '${SUPABASE_KEY}';
  var SESSION_DURATION = ${SESSION_MS};
  var SKIP_KEYS = ['wt_session'];

  // Auto-login
  var session = { username: USERNAME, role: ROLE, name: '${isCoach ? 'Coach' : 'Takif'}', expires: Date.now() + SESSION_DURATION };
  localStorage.setItem('wt_session', JSON.stringify(session));
  window.__wtUser = session;

  // ── UK time helper ───────────────────────────────────────────────────────
  function ukNow() {
    return new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });
  }
  function ukTimestamp() {
    // ISO string adjusted to UK timezone offset for storage
    var now = new Date();
    var ukStr = now.toLocaleString('en-GB', { timeZone: 'Europe/London', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit' });
    // ukStr: "30/09/2026, 14:32:01"
    var p = ukStr.split(/[/, :]/);
    return p[2]+'-'+p[1]+'-'+p[0]+'T'+p[4]+':'+p[5]+':'+p[6]+'Z';
  }

  // ── Supabase helpers ─────────────────────────────────────────────────────
  function sbHeaders() {
    return { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
  }

  function sbUpsert(key, value) {
    if (!SB_URL || SB_URL === 'SUPABASE_URL_HERE') return;
    fetch(SB_URL + '/rest/v1/sync_data', {
      method: 'POST',
      headers: Object.assign({}, sbHeaders(), { 'Prefer': 'resolution=merge-duplicates' }),
      body: JSON.stringify({ username: USERNAME, key: key, value: value, updated_at: ukTimestamp() })
    }).catch(function(){});
  }

  function sbFetch(targetUser) {
    if (!SB_URL || SB_URL === 'SUPABASE_URL_HERE') return Promise.resolve([]);
    return fetch(SB_URL + '/rest/v1/sync_data?username=eq.' + targetUser + '&select=key,value', {
      headers: sbHeaders()
    }).then(function(r) { return r.json(); }).catch(function() { return []; });
  }

  // ── Hydrate localStorage from Supabase on load ───────────────────────────
  var _realSetItem = localStorage.setItem.bind(localStorage);
  var _realGetItem = localStorage.getItem.bind(localStorage);

  sbFetch(USERNAME).then(function(rows) {
    if (!Array.isArray(rows)) return;
    rows.forEach(function(row) {
      if (row.key && row.value !== undefined && !SKIP_KEYS.includes(row.key)) {
        _realSetItem(row.key, row.value);
      }
    });
    console.log('[sync] Loaded ' + rows.length + ' keys from Supabase for ' + USERNAME);
  });

  // ── Intercept localStorage.setItem to sync writes ────────────────────────
  localStorage.setItem = function(key, value) {
    _realSetItem(key, value);
    if (!SKIP_KEYS.includes(key)) {
      sbUpsert(key, value);
    }
  };

${isCoach ? `
  // ── Coach: floating "Takif's Log" button ─────────────────────────────────
  window.addEventListener('load', function() {
    // Inject coach panel styles
    var style = document.createElement('style');
    style.textContent = \`
      #takif-fab {
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        background: #f97316; color: #000; font-weight: 800; font-size: 13px;
        border: none; border-radius: 99px; padding: 12px 20px; cursor: pointer;
        box-shadow: 0 4px 20px rgba(249,115,22,0.4); letter-spacing: 0.3px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      #takif-fab:hover { opacity: .88; }
      #takif-panel {
        display: none; position: fixed; inset: 0; z-index: 99998;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
        align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      #takif-panel.open { display: flex; }
      #takif-panel-inner {
        background: #161616; border: 1px solid #2a2a2a; border-radius: 16px;
        width: 560px; max-width: 95vw; max-height: 80vh;
        display: flex; flex-direction: column; overflow: hidden;
      }
      #takif-panel-head {
        padding: 18px 20px; border-bottom: 1px solid #2a2a2a;
        display: flex; justify-content: space-between; align-items: center;
      }
      #takif-panel-head h2 { font-size: 16px; font-weight: 800; color: #f0f0f0; }
      #takif-panel-head span { font-size: 11px; color: #666; }
      #takif-close {
        background: none; border: none; color: #666; font-size: 20px;
        cursor: pointer; padding: 0 4px; line-height: 1;
      }
      #takif-close:hover { color: #f0f0f0; }
      #takif-body { padding: 16px 20px; overflow-y: auto; flex: 1; }
      .tk-session { background: #1e1e1e; border: 1px solid #2a2a2a; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
      .tk-session-head { font-size: 12px; font-weight: 700; color: #f97316; margin-bottom: 8px; }
      .tk-date { font-size: 10px; color: #666; margin-bottom: 8px; }
      .tk-ex { margin-bottom: 6px; }
      .tk-ex-name { font-size: 12px; font-weight: 700; color: #999; }
      .tk-set { font-size: 11px; color: #666; padding: 1px 0; }
      .tk-set b { color: #f0f0f0; }
      .tk-steps { font-size: 12px; color: #666; margin-top: 6px; }
      .tk-steps b { color: #22c55e; }
      #takif-empty { text-align: center; padding: 40px; color: #666; font-size: 13px; }
      #takif-refresh {
        background: none; border: 1px solid #2a2a2a; color: #999;
        border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      #takif-refresh:hover { border-color: #f97316; color: #f97316; }
    \`;
    document.head.appendChild(style);

    // FAB button
    var fab = document.createElement('button');
    fab.id = 'takif-fab';
    fab.textContent = 'Takif Log';
    document.body.appendChild(fab);

    // Panel
    var panel = document.createElement('div');
    panel.id = 'takif-panel';
    panel.innerHTML = \`
      <div id="takif-panel-inner">
        <div id="takif-panel-head">
          <div>
            <h2>Takif's Progress</h2>
            <span id="takif-sync-time">Loading...</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button id="takif-refresh">Refresh</button>
            <button id="takif-close">×</button>
          </div>
        </div>
        <div id="takif-body"><div id="takif-empty">Loading Takif's data...</div></div>
      </div>
    \`;
    document.body.appendChild(panel);

    function loadTakif() {
      document.getElementById('takif-empty').textContent = 'Loading...';
      document.getElementById('takif-body').innerHTML = '<div id="takif-empty">Loading Takif\\'s data...</div>';
      sbFetch('takif').then(function(rows) {
        var data = {};
        if (Array.isArray(rows)) {
          rows.forEach(function(r) {
            try { data[r.key] = JSON.parse(r.value); } catch { data[r.key] = r.value; }
          });
        }
        renderTakif(data);
        document.getElementById('takif-sync-time').textContent = 'Last synced: ' + ukNow() + ' (UK)';
      });
    }

    function renderTakif(data) {
      var body = document.getElementById('takif-body');
      var history = data['history'];
      var html = '';

      if (!history || !history.length) {
        body.innerHTML = '<div id="takif-empty">Takif hasn\\'t logged any sessions yet.</div>';
        return;
      }

      // Steps for today (UK date)
      var todayUK = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      var steps = data['steps_' + todayUK];
      if (steps) {
        html += '<div class="tk-session" style="border-color:#22c55e33"><div class="tk-session-head" style="color:#22c55e">Steps Today (UK)</div>';
        html += '<div class="tk-steps"><b>' + Number(steps).toLocaleString() + ' steps</b> of 10,000 target (' + Math.round(steps / 100) + '%)</div></div>';
      }

      history.forEach(function(session) {
        var dateStr = new Date(session.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
        html += '<div class="tk-session">';
        html += '<div class="tk-session-head">' + session.dayName + '</div>';
        html += '<div class="tk-date">' + dateStr + '</div>';
        var exs = Object.values(session.exercises || {});
        if (!exs.length) { html += '<div class="tk-set">No exercises logged.</div>'; }
        exs.forEach(function(ex) {
          html += '<div class="tk-ex"><div class="tk-ex-name">' + ex.name + '</div>';
          (ex.sets || []).forEach(function(s, i) {
            html += '<div class="tk-set">Set ' + (i+1) + ': <b>' + (s.weight ? s.weight + 'kg' : '—') + ' × ' + (s.reps || 'failure') + '</b>' + (s.done ? ' ✓' : '') + '</div>';
          });
          html += '</div>';
        });
        html += '</div>';
      });

      body.innerHTML = html;
    }

    fab.onclick = function() {
      panel.classList.add('open');
      loadTakif();
    };
    document.getElementById('takif-close').onclick = function() { panel.classList.remove('open'); };
    document.getElementById('takif-refresh').onclick = loadTakif;
    panel.onclick = function(e) { if (e.target === panel) panel.classList.remove('open'); };
  });
` : ''}
})();
</script>
`;
}

// ── Generate coach file ─────────────────────────────────────────────────────

function inject(html, script) {
  return html.replace('<body>\n', '<body>\n' + script + '\n');
}

const coachHtml = inject(bundle, syncScript('coach', 'coach'));
const takifHtml = inject(bundle, syncScript('takif', 'client'));

fs.writeFileSync(path.join(__dirname, 'index.html'), coachHtml);
fs.writeFileSync(path.join(__dirname, 'takif.html'), takifHtml);

console.log('Built index.html (coach) and takif.html (Takif)');
console.log('Supabase URL: ' + SUPABASE_URL);
