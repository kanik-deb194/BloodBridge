/* ============================================================
   BloodBridge – Blood Bank Dashboard (Fully Dynamic, DB-Connected)
   All sections load fresh DB data on every visit.
   ============================================================ */
/* ============================================================
   BloodBridge — bankdash.js  (FIXED — all IDs match HTML)
   API: bank_api.php
   ============================================================ */
(function () {
  'use strict';

  const API = 'bank_api.php';

  /* ─────────────────────────────────────
     THEME
  ───────────────────────────────────── */
  const html = document.documentElement;
  const THEME_KEY = 'bb-theme';
  function applyTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
  function getTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; }
  applyTheme(getTheme());
  const ttEl = document.getElementById('themeToggle');
  if (ttEl) {
    ttEl.addEventListener('click', () => applyTheme(getTheme() === 'dark' ? 'light' : 'dark'));
    ttEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); } });
  }

  /* ─────────────────────────────────────
     SIDEBAR
  ───────────────────────────────────── */
  const sidebar        = document.getElementById('sidebar');
  const hamburger      = document.getElementById('hamburger');
  const sidebarClose   = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function isMobile() { return window.innerWidth < 1024; }
  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add('open');
    if (isMobile()) {
      if (sidebarOverlay) sidebarOverlay.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
    if (hamburger) {
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
    }
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    if (isMobile()) {
      if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
      document.body.style.overflow = '';
    }
    if (hamburger) {
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  }
  hamburger?.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  sidebarClose?.addEventListener('click', closeSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  window.addEventListener('resize', () => { isMobile() ? closeSidebar() : openSidebar(); });
  if (!isMobile()) openSidebar();

  /* ─────────────────────────────────────
     NAVIGATION
  ───────────────────────────────────── */
  const VIEW_MAP = {
    dashboard:   'dashboardView',
    inventory:   'inventoryView',
    expiry:      'expiryView',
    coldchain:   'coldchainView',
    quarantine:  'quarantineView',
    promises:    'promisesView',
    ratings:     'ratingsView',
    leaderboard: 'leaderboardView',
    drones:      'dronesView',
    profile:     'profileView',
    requests:         'requestsView',
    emergency:        'emergencyRequestsView',
  };

  function navigateTo(sec) {
    if (!VIEW_MAP[sec]) sec = 'dashboard';
    Object.values(VIEW_MAP).forEach(id => {
      document.getElementById(id)?.classList.remove('active');
    });
    document.getElementById(VIEW_MAP[sec])?.classList.add('active');
    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));
    document.querySelector(`.sidebar-link[data-section="${sec}"]`)?.classList.add('active');
    if (isMobile()) closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    initReveal();
    switch (sec) {
      case 'dashboard':   loadDashboard();     break;
      case 'inventory':   loadInventory();     break;
      case 'expiry':      loadExpiry();        break;
      case 'coldchain':   loadColdChain();     break;
      case 'quarantine':  loadQuarantine();    break;
      case 'promises':    loadPromises();      break;
      case 'ratings':     loadRatings();       break;
      case 'leaderboard': loadLeaderboard();   break;
      case 'drones':      loadDrones(); setTimeout(function(){ if(window._initDroneSim) window._initDroneSim(); }, 100); break;
      case 'profile':     loadProfile();       break;
      case 'requests':    loadRequests();      break;
      case 'emergency':   loadEmergency();     break;
    }
    localStorage.setItem('bbBankPage', sec);
  }
  window.navigateTo = navigateTo;

  /* Sidebar links */
  document.querySelectorAll('.sidebar-link[data-section]').forEach(l =>
    l.addEventListener('click', e => { e.preventDefault(); navigateTo(l.dataset.section); })
  );

  /* Action cards on dashboard */
  const ACTION_MAP = {
    coldChainMonitor:  'coldchain',
    expiryDashboard:   'expiry',
    verifyPromise:     'promises',
    manageQuarantine:  'quarantine',
    viewRatings:       'ratings',
    donorLeaderboard:  'leaderboard',
    manageDrones:      'drones',
  };
  document.querySelectorAll('.action-card[data-action]').forEach(card => {
    card.addEventListener('click', () => {
      const sec = ACTION_MAP[card.dataset.action];
      if (sec) navigateTo(sec);
    });
  });

  /* Quick-link buttons inside dashboard cards */
  document.getElementById('refreshInventoryBtn')?.addEventListener('click', () => navigateTo('inventory'));
  document.getElementById('viewFullInventoryLink')?.addEventListener('click', e => { e.preventDefault(); navigateTo('inventory'); });
  document.getElementById('viewAllExpiryLink')?.addEventListener('click', e => { e.preventDefault(); navigateTo('expiry'); });
  document.getElementById('viewAllRatingsBtn')?.addEventListener('click', () => navigateTo('ratings'));
  document.getElementById('manageDronesQuickBtn')?.addEventListener('click', () => navigateTo('drones'));

  /* ─────────────────────────────────────
     UTILITIES
  ───────────────────────────────────── */
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function txt(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = (v == null) ? '—' : v;
  }
  function fmtDate(ds, short) {
    if (!ds) return '—';
    const d = new Date(ds);
    if (isNaN(d)) return String(ds);
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    return short ? `${m} ${d.getDate()}` : `${m} ${d.getDate()}, ${d.getFullYear()}`;
  }
  function timeAgo(ds) {
    if (!ds) return '';
    const s = Math.floor((Date.now() - new Date(ds)) / 1000);
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }
  function stars(n) { return '⭐'.repeat(Math.max(0, Math.min(5, Math.round(n || 0)))); }
  function stockBadge(cnt, max) {
    max = max || 50;
    const pct = max > 0 ? Math.round((cnt / max) * 100) : 0;
    if (cnt === 0) return { cls:'badge-critical', lbl:'Out of Stock', col:'#f87171', pct:2 };
    if (pct < 20)  return { cls:'badge-critical', lbl:'Critical',     col:'#f87171', pct };
    if (pct < 50)  return { cls:'badge-warn',     lbl:'Low Stock',    col:'#fbbf24', pct };
    return               { cls:'badge-ok',        lbl:'Good',         col:'#4ade80', pct };
  }
  const IS = 'background:var(--input-bg);border:1px solid var(--input-border);padding:8px 12px;border-radius:10px;width:100%;margin-top:5px;color:var(--text-primary);font-family:Outfit,sans-serif;font-size:.84rem;';

  /* ─────────────────────────────────────
     API FETCH
  ───────────────────────────────────── */
  async function apiFetch(action, method, body) {
    method = method || 'GET';
    const opts = { method, headers: { 'Content-Type':'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(`${API}?action=${action}`, opts);
    const data = await res.json().catch(() => ({ success:false, error:`HTTP ${res.status}` }));
    if (!data.success && res.status === 401) {
      const e = new Error('AUTH_FAILED');
      e.hint = data.hint || '';
      e.session = data.session || {};
      throw e;
    }
    if (!data.success) throw new Error(data.error || data.errors?.join(', ') || `HTTP ${res.status}`);
    return data;
  }

  /* ─────────────────────────────────────
     TOAST  — uses id="toastMessage" from HTML
  ───────────────────────────────────── */
  function showToast(msg, dur) {
    dur = dur || 3200;
    const t = document.getElementById('toastMessage');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), dur);
  }
  window.showToast = showToast;

  /* ─────────────────────────────────────
     SCROLL REVEAL
  ───────────────────────────────────── */
  function initReveal() {
    const els = document.querySelectorAll('.reveal:not(.visible)');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('visible')); return; }
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.05, rootMargin: '0px 0px -36px 0px' }
    );
    els.forEach(e => obs.observe(e));
  }

  /* ─────────────────────────────────────
     ANIMATED COUNTER
  ───────────────────────────────────── */
  function animCount(el, target, dur) {
    if (!el) return;
    dur = dur || 800; let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.floor((1 - Math.pow(1-p, 3)) * target);
      if (p < 1) requestAnimationFrame(step); else el.textContent = target;
    };
    requestAnimationFrame(step);
  }

  /* ─────────────────────────────────────
     MODAL
  ───────────────────────────────────── */
  const modal    = document.getElementById('globalModal');
  const mTitle   = document.getElementById('modalTitle');
  const mBody    = document.getElementById('modalBody');
  const mConfirm = document.getElementById('modalConfirmBtn');
  const mCancel  = document.getElementById('modalCancelBtn');
  const mClose   = document.getElementById('closeModalBtn');
  let   mAction  = null;

  function openModal(title, content, onConfirm, label) {
    if (!modal) return;
    mTitle.textContent   = title;
    mBody.innerHTML      = content;
    mConfirm.textContent = label || 'Confirm';
    mConfirm.style.display = '';
    mConfirm.style.cssText = 'background:linear-gradient(135deg,#C0162C,#8B0020);color:#fff;border:none;padding:9px 22px;border-radius:50px;font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(192,22,44,.35);';
    if (mCancel) mCancel.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.25);color:var(--text-primary);padding:9px 22px;border-radius:50px;font-family:Outfit,sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;min-width:80px;';
    modal.style.display  = 'flex';
    mAction = onConfirm || null;
  }
  function closeModal() { if (modal) modal.style.display = 'none'; mAction = null; }
  mClose?.addEventListener('click', closeModal);
  mCancel?.addEventListener('click', closeModal);
  mConfirm?.addEventListener('click', () => { if (mAction) mAction(); });
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.style.display === 'flex') closeModal();
  });

  function handleErr(err) {
    if (err.message === 'AUTH_FAILED') {
      showToast('⚠️ Session expired. Redirecting...', 3000);
      setTimeout(() => window.location.href = 'login.html', 3000);
    }
  }

  /* ═══════════════════════════════════════════
     DASHBOARD
     HTML IDs used:
       greetName, bankLicense, bankCity, goldPillText
       unitsInStock, avgRating, expiryAlerts, badgeStatus
       sidebarName, sidebarAvatar, topBadge
       criticalAlertsGrid
       dashInventoryTbody
       expiringList
       dashReviewsList
       dashDroneList
  ═══════════════════════════════════════════ */
  async function loadDashboard() {
    try {
      const data = await apiFetch('dashboard');
      const b = data.bank, s = data.stats;

      /* Identity */
      const initials = b.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      txt('greetName',   b.name);
      txt('bankLicense', b.registration_no || '—');
      txt('bankCity',    [b.city, b.country].filter(Boolean).join(', ') || '—');
      txt('goldPillText',`${b.badge_status} Badge Status · Trusted Partner`);
      txt('sidebarName', b.name);
      txt('topBadge',    `🏆 ${b.badge_status} Status`);

      const sa = document.getElementById('sidebarAvatar');
      if (sa) sa.textContent = initials;

      /* Stats */
      animCount(document.getElementById('unitsInStock'), parseInt(s.units_in_stock) || 0);
      const rEl = document.getElementById('avgRating');
      if (rEl) rEl.textContent = parseFloat(s.rating_avg || 0).toFixed(1);
      animCount(document.getElementById('expiryAlerts'), parseInt(s.expiry_alerts) || 0);
      txt('badgeStatus', s.badge_status || '—');

      /* Critical alert banners */
      const alertGrid = document.getElementById('criticalAlertsGrid');
      if (alertGrid) {
        let banners = '';
        if (data.crit_temp) {
          const t = data.crit_temp;
          banners += `<div class="alert-critical-card glass-card" style="border-left:4px solid #f87171;">
            <span style="font-size:1.3rem;">🌡️</span>
            <div style="flex:1;">
              <strong>Cold Chain Alert</strong>
              <div style="font-size:.78rem;color:var(--text-muted);margin-top:3px;">
                Sensor <strong>${esc(t.sensor_id)}</strong> at ${parseFloat(t.temperature_celsius).toFixed(1)}°C · ${timeAgo(t.recorded_at)}
              </div>
            </div>
            <button class="btn-ghost-sm" onclick="navigateTo('coldchain')">Handle Now</button>
          </div>`;
        }
        if (data.admin_warnings && data.admin_warnings.length) {
          const w = data.admin_warnings[0];
          const warningCount = data.warning_count || 1;
          const moreCount = warningCount - 1;
          /* Store full warning objects keyed by id */
          window._pendingWarningsBank = {};
          data.admin_warnings.forEach(wr => { window._pendingWarningsBank[wr.id] = wr; });
          const hasPlan = w.admin_improvement_plan && w.admin_improvement_plan.trim().length > 0;
          const borderColor = hasPlan ? '#4ade80' : '#fbbf24';
          const cardTitle = hasPlan ? 'Admin Warning + Improvement Plan' : 'Admin Warning';
          const previewMsg = w.message ? (w.message.length > 100 ? w.message.slice(0,100)+'...' : w.message) : '';
          banners += `<div class="alert-critical-card glass-card" style="border-left:4px solid ${borderColor};flex-wrap:wrap;gap:10px;">
            <span style="font-size:1.3rem;">${hasPlan ? '📈' : '⚠️'}</span>
            <div style="flex:1;min-width:180px;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong style="color:${hasPlan ? '#4ade80' : '#fbbf24'}">${cardTitle}</strong>
                ${warningCount > 1 ? `<span style="background:rgba(251,191,36,.2);color:#fbbf24;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:50px;">${warningCount} total</span>` : ''}
              </div>
              <div style="font-size:.78rem;color:var(--text-muted);margin-top:3px;">${esc(previewMsg)}</div>
              ${hasPlan ? `<div style="font-size:.72rem;color:#4ade80;margin-top:4px;">📈 Admin has sent an improvement plan — tap View Details to read it</div>` : ''}
              <div style="display:flex;align-items:center;gap:10px;margin-top:4px;flex-wrap:wrap;">
                <span style="font-size:.68rem;color:var(--text-muted);">${fmtDate(w.sent_at,true)}</span>
                ${moreCount > 0 ? `<button class="btn-ghost-sm" style="font-size:.68rem;padding:2px 8px;" onclick="openAllWarningsBank()">+${moreCount} more</button>` : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
              <button class="btn-ghost-sm" style="background:rgba(96,165,250,.12);border-color:rgba(96,165,250,.4);color:#60a5fa;"
                onclick="viewWarningDetailsBank(${w.id})">
                📄 View Details
              </button>
              <button class="btn-ghost-sm" style="background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.4);color:#fbbf24;"
                onclick="openWarningResponseBank(${w.id})">
                📋 Respond
              </button>
            </div>
          </div>`;
        }
        if (s.crit_expiry > 0) {
          banners += `<div class="alert-critical-card glass-card" style="border-left:4px solid #fbbf24;">
            <span style="font-size:1.3rem;">📅</span>
            <div style="flex:1;">
              <strong>${s.crit_expiry} blood bag${s.crit_expiry > 1 ? 's' : ''} expiring within 7 days</strong>
              <div style="font-size:.78rem;color:var(--text-muted);margin-top:3px;">Auto-alert dispatched to hospitals.</div>
            </div>
            <button class="btn-ghost-sm" onclick="navigateTo('expiry')">View</button>
          </div>`;
        }
        if (!banners) {
          banners = `<div class="alert-critical-card glass-card" style="border-left:4px solid #4ade80;justify-content:center;">
            <span style="font-size:1.3rem;">✅</span>
            <span style="color:#4ade80;font-weight:600;">No critical alerts. All systems normal.</span>
          </div>`;
        }
        alertGrid.innerHTML = banners;
      }

      /* Inventory by blood group table */
      const invTbody = document.getElementById('dashInventoryTbody');
      if (invTbody) {
        const GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
        const map = {};
        (data.inventory || []).forEach(r => { map[r.blood_group] = r; });
        invTbody.innerHTML = GROUPS.map(g => {
          const r  = map[g] || { total:0, expiring7:0 };
          const sb = stockBadge(parseInt(r.total) || 0);
          return `<tr>
            <td><strong>${g}</strong></td>
            <td>${r.total || 0}</td>
            <td>${r.expiring7 || 0}</td>
            <td><span class="status-badge ${sb.cls}">${sb.lbl}</span></td>
          </tr>`;
        }).join('');
      }

      /* Expiring soon list */
      const expDiv = document.getElementById('expiringList');
      if (expDiv) {
        const bags = data.expiring_soon || [];
        expDiv.innerHTML = bags.length
          ? bags.map(bag => {
            const d   = parseInt(bag.days_left) || 0;
            const col = d <= 2 ? '#f87171' : '#fbbf24';
            return `<div class="exp-item" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border-color);">
              <span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:800;background:rgba(192,22,44,.14);color:#FF6B6B;flex-shrink:0;">${esc(bag.blood_group)}</span>
              <div style="flex:1;">
                <div style="font-size:.82rem;font-weight:600;">#${esc(bag.bag_barcode)}</div>
                <div style="font-size:.72rem;color:${col};font-weight:700;">${d}d left · ${esc(bag.storage_location || '—')}</div>
              </div>
              <button class="btn-ghost-sm" onclick="allocateBag(${bag.id},'${esc(bag.bag_barcode)}')">Allocate</button>
            </div>`;
          }).join('')
          : '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:.82rem;">✅ No bags expiring within 7 days.</div>';
      }

      /* Recent reviews */
      const revDiv = document.getElementById('dashReviewsList');
      if (revDiv) {
        const revs = data.reviews || [];
        revDiv.innerHTML = revs.length
          ? revs.map(r => `<div class="dash-rev-item" style="padding:8px 12px;border-bottom:1px solid var(--border-color);">
              <span style="font-weight:700;">${stars(r.rating)}</span>
              <span style="color:var(--text-muted);font-size:.76rem;margin-left:6px;">"${esc((r.review_text||'No comment').slice(0,70))}" — ${esc(r.reviewer_name||'Anonymous')}</span>
            </div>`).join('')
          : '<div style="color:var(--text-muted);font-size:.79rem;padding:12px;text-align:center;">No reviews yet.</div>';
      }

      /* Active drones */
      const drDiv = document.getElementById('dashDroneList');
      if (drDiv) {
        const drs = data.drones || [];
        drDiv.innerHTML = drs.length
          ? drs.map(d => {
            const sc  = d.status === 'idle' ? 'badge-ok' : (d.status === 'in_flight' || d.status === 'en_route') ? 'badge-info' : 'badge-warn';
            const lbl = d.dispatch_status ? d.dispatch_status.replace(/_/g,' ') : d.status;
            return `<div class="drone-row" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border-color);">
              <strong style="flex:1;">${esc(d.drone_code)}</strong>
              <span style="color:var(--text-muted);font-size:.76rem;">${lbl} · 🔋${d.battery_level ?? '--'}%</span>
              <span class="status-badge ${sc}">${d.estimated_arrival ? 'ETA '+fmtDate(d.estimated_arrival,true) : esc(d.status)}</span>
            </div>`;
          }).join('')
          : '<div style="color:var(--text-muted);font-size:.79rem;padding:12px;text-align:center;">No drones registered.</div>';
      }

    } catch (err) {
      /* Always clear the spinner so the page doesn't stay stuck */
      const alertGrid = document.getElementById('criticalAlertsGrid');
      if (alertGrid) {
        const isAuth = err.message === 'AUTH_FAILED';
        const hint   = err.hint   ? `<div style="font-size:.72rem;color:#fbbf24;margin-top:4px;">Hint: ${esc(err.hint)}</div>` : '';
        const sesInf = err.session && Object.keys(err.session).length
          ? `<pre style="font-size:.65rem;color:var(--text-muted);margin-top:6px;overflow:auto;">${esc(JSON.stringify(err.session,null,2))}</pre>`
          : '';
        alertGrid.innerHTML = `<div class="alert-critical-card glass-card" style="grid-column:1/-1;border-left:4px solid #f87171;flex-direction:column;align-items:flex-start;gap:6px;">
          <div style="display:flex;align-items:center;gap:10px;width:100%;">
            <span style="font-size:1.3rem;">❌</span>
            <strong style="flex:1;">${isAuth ? 'Session expired — please log in again.' : 'Dashboard load failed: ' + esc(err.message)}</strong>
            ${isAuth
              ? `<button class="btn-ghost-sm" onclick="window.location.href='login.html'">Log In</button>`
              : `<button class="btn-ghost-sm" onclick="loadDashboard()">Retry</button>`}
          </div>
          ${hint}${sesInf}
        </div>`;
      }
      /* Also show visible name fallback */
      txt('greetName',   'Your Bank');
      txt('bankLicense', '—');
      txt('bankCity',    '—');
      console.error('Dashboard error:', err.message);
    }
    initReveal();
  }

  window.allocateBag = async (id, barcode) => {
    try {
      await apiFetch('allocate_bag', 'POST', { bag_id: id });
      showToast(`✅ Bag #${barcode} marked as reserved.`);
      loadDashboard();
    } catch (e) { showToast('❌ ' + e.message, 5000); }
  };

  /* Logout */
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try { await apiFetch('logout', 'POST'); } catch(_) {}
    window.location.href = 'login.html';
  });

  /* ═══════════════════════════════════════════
     INVENTORY
  ═══════════════════════════════════════════ */
  async function loadInventory(type, status, search, page) {
    type   = type   ?? document.getElementById('invTypeFilter')?.value   ?? '';
    status = status ?? document.getElementById('invStatusFilter')?.value ?? '';
    search = search ?? document.getElementById('invSearchInput')?.value  ?? '';
    page   = page   || 1;

    const tbody = document.getElementById('inventoryTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="td-load"><div class="loader-spin" style="margin:0 auto 6px;"></div>Loading...</td></tr>`;

    try {
      const qs   = new URLSearchParams({ type, status, search, page }).toString();
      const data = await apiFetch('inventory&' + qs);
      const t    = data.totals || {};

      /* Type grid */
      const grid   = document.getElementById('invTypeGrid');
      const GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
      const map    = {};
      (data.by_group || []).forEach(r => { map[r.blood_group] = r; });
      const maxV = Math.max(50, ...Object.values(map).map(r => parseInt(r.total)||0));
      if (grid) {
        grid.innerHTML = GROUPS.map(g => {
          const r   = map[g] || { total:0, expiring7:0 };
          const cnt = parseInt(r.total) || 0;
          const sb  = stockBadge(cnt, maxV);
          return `<div class="glass-card inv-type-card" data-type="${g}" style="cursor:pointer;" onclick="document.getElementById('invTypeFilter').value='${g}';loadInventory()">
            <div class="itc-label">${g}</div>
            <div class="itc-val">${cnt}</div>
            <div class="itc-sub">units available</div>
            <div class="itc-bar"><div class="itc-fill" style="width:${sb.pct}%;background:${sb.col};height:4px;border-radius:3px;"></div></div>
            <span class="status-badge ${sb.cls}">${sb.lbl}</span>
          </div>`;
        }).join('');
      }

      animCount(document.getElementById('invTotalUnits'), parseInt(t.total)       || 0);
      animCount(document.getElementById('invExpiring7'),  parseInt(t.expiring7)   || 0);
      animCount(document.getElementById('invQuarantined'),parseInt(t.quarantined) || 0);
      animCount(document.getElementById('invReady'),      parseInt(t.available)   || 0);

      const bags = data.bags || [];
      if (tbody) {
        tbody.innerHTML = bags.length
          ? bags.map(bag => {
            const dLeft = parseInt(bag.days_to_expiry) || 0;
            const sc  = bag.status === 'available'
              ? (dLeft<=2?'badge-critical':dLeft<=7?'badge-warn':'badge-ok')
              : bag.status === 'quarantined' ? 'badge-danger' : 'badge-warn';
            const lbl = bag.status === 'available'
              ? (dLeft<=2?'Critical':dLeft<=7?'Expiring Soon':'Available')
              : (bag.status||'—');
            return `<tr>
              <td><strong>#${esc(bag.bag_barcode)}</strong></td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(bag.blood_group)}</span></td>
              <td>${esc(bag.donor_name||'—')}</td>
              <td>${fmtDate(bag.collection_date,true)}</td>
              <td style="color:${dLeft<=2?'#f87171':dLeft<=7?'#fbbf24':'inherit'};font-weight:${dLeft<=7?700:400}">
                ${fmtDate(bag.expiry_date)} <span style="font-size:.66rem;">(${dLeft}d)</span>
              </td>
              <td>${esc(bag.storage_location||'—')}</td>
              <td>${bag.volume_ml||450}</td>
              <td><span class="status-badge ${sc}">${lbl}</span></td>
              <td>${bag.status==='available'?`<button class="table-btn" onclick="allocateBag(${bag.id},'${esc(bag.bag_barcode)}')">Allocate</button>`:'—'}</td>
            </tr>`;
          }).join('')
          : `<tr><td colspan="9" class="td-load">No bags found.</td></tr>`;
      }

      txt('invTableCount', `Showing ${bags.length} of ${data.total_rows||0} records`);

      /* Pagination */
      const pgDiv = document.getElementById('invPagination');
      if (pgDiv && data.total_rows) {
        const total = Math.ceil(data.total_rows / (data.limit||20));
        pgDiv.innerHTML = Array.from({length:total},(_,i)=>i+1)
          .map(i=>`<button class="page-btn ${i===page?'active':''}" onclick="loadInventory('','','',${i})">${i}</button>`)
          .join('');
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  window.loadInventory = loadInventory;

  document.getElementById('invRefreshBtn')?.addEventListener('click', () => loadInventory());
  document.getElementById('addBagBtn')?.addEventListener('click', () => {
    openModal('🩸 Add New Blood Bag', `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div><label class="form-lbl" style="display:block;margin-bottom:4px;">Bag Barcode *</label>
          <input id="addBagBarcode" class="form-input" placeholder="e.g. BAG-001" style="width:100%;"></div>
        <div><label class="form-lbl" style="display:block;margin-bottom:4px;">Blood Group *</label>
          <select id="addBagGroup" class="form-select" style="width:100%;">
            <option value="">Select</option>
            <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
            <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
          </select></div>
        <div><label class="form-lbl" style="display:block;margin-bottom:4px;">Donor Name</label>
          <input id="addBagDonor" class="form-input" placeholder="Optional" style="width:100%;"></div>
        <div><label class="form-lbl" style="display:block;margin-bottom:4px;">Expiry Date *</label>
          <input type="date" id="addBagExpiry" class="form-input" style="width:100%;"></div>
        <div><label class="form-lbl" style="display:block;margin-bottom:4px;">Storage Location</label>
          <input id="addBagStorage" class="form-input" placeholder="e.g. Freezer A1" style="width:100%;"></div>
      </div>
    `, async () => {
      const barcode = document.getElementById('addBagBarcode')?.value.trim();
      const group   = document.getElementById('addBagGroup')?.value;
      const donor   = document.getElementById('addBagDonor')?.value.trim();
      const expiry  = document.getElementById('addBagExpiry')?.value;
      const storage = document.getElementById('addBagStorage')?.value.trim();
      if (!barcode) { showToast('⚠️ Bag barcode is required.', 3000); return; }
      if (!group)   { showToast('⚠️ Blood group is required.', 3000); return; }
      if (!expiry)  { showToast('⚠️ Expiry date is required.', 3000); return; }
      try {
        await apiFetch('add_bag', 'POST', {
          bag_barcode: barcode, blood_group: group,
          donor_name: donor, expiry_date: expiry, storage_location: storage
        });
        showToast('✅ Bag added successfully!', 3000);
        closeModal();
        loadInventory();
      } catch (e) { showToast('❌ ' + e.message, 5000); }
    }, 'Add Bag');
  });
  document.getElementById('invTypeFilter')?.addEventListener('change', () => loadInventory());
  document.getElementById('invStatusFilter')?.addEventListener('change', () => loadInventory());
  let invTimer;
  document.getElementById('invSearchInput')?.addEventListener('input', () => {
    clearTimeout(invTimer); invTimer = setTimeout(() => loadInventory(), 400);
  });

  /* ═══════════════════════════════════════════
     EXPIRY ALERTS
  ═══════════════════════════════════════════ */
  async function loadExpiry(filter) {
    filter = filter || 'all';
    const list = document.getElementById('expiryAlertsList');
    if (list) list.innerHTML = '<div class="exp-loading"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading alerts…</div>';
    try {
      const data = await apiFetch('expiry&urgency=' + filter);
      animCount(document.getElementById('expCriticalCount'),  parseInt(data.critical)        || 0);
      animCount(document.getElementById('expWarningCount'),   parseInt(data.warning)         || 0);
      animCount(document.getElementById('expNoticeCount'),    parseInt(data.notice)          || 0);
      animCount(document.getElementById('expAllocatedToday'), parseInt(data.allocated_today) || 0);

      const bags = data.bags || [];
      if (!list) return;

      if (!bags.length) {
        list.innerHTML = `<div class="exp-empty">
          <div class="exp-empty-icon">✅</div>
          <div class="exp-empty-title">No expiry alerts</div>
          <div class="exp-empty-sub">All blood bags are safe for the selected filter. Great inventory management!</div>
        </div>`;
        return;
      }

      list.innerHTML = bags.map((bag, i) => {
        const d       = parseInt(bag.days_left) || 0;
        const rowCls  = d<=2 ? 'exp-row-critical' : d<=5 ? 'exp-row-warning' : 'exp-row-notice';
        const daysCls = d<=2 ? 'exp-days-critical' : d<=5 ? 'exp-days-warning' : 'exp-days-notice';
        const pillCls = d<=2 ? 'exp-pill-critical' : d<=5 ? 'exp-pill-warning' : 'exp-pill-notice';
        const pillTxt = d<=2 ? '🔴 Critical' : d<=5 ? '🟠 Warning' : '🟡 Notice';
        const effExp  = bag.effective_expiry || bag.expiry_date;
        const collDate = bag.collection_date ? fmtDate(bag.collection_date) : '—';
        return `<div class="exp-row ${rowCls}">
          <div class="exp-row-num">${i+1}</div>
          <div><span class="exp-row-group">${esc(bag.blood_group)}</span></div>
          <div class="exp-row-barcode">
            ${esc(bag.bag_barcode)}
            <span>${bag.volume_ml||450}mL · ${esc(bag.storage_location||'—')}</span>
          </div>
          <div class="exp-row-loc">${esc(bag.storage_location||'—')}</div>
          <div class="exp-row-date">${collDate}</div>
          <div class="exp-row-date">${fmtDate(effExp)}</div>
          <div style="text-align:center;">
            <div class="exp-days-badge ${daysCls}">
              <span class="days-num">${d}</span>
              <span class="days-unit">DAYS</span>
            </div>
          </div>
          <div style="text-align:center;">
            <span class="exp-status-pill ${pillCls}">${pillTxt}</span>
          </div>
          <div style="text-align:center;">
            <button class="exp-alloc-btn" onclick="allocateBag(${bag.id},'${esc(bag.bag_barcode)}')">Allocate</button>
          </div>
        </div>`;
      }).join('');

    } catch (err) {
      handleErr(err);
      if (list) list.innerHTML = `<div class="exp-empty"><div class="exp-empty-icon">⚠️</div><div class="exp-empty-title">Error loading alerts</div><div class="exp-empty-sub">${esc(err.message)}</div></div>`;
    }
  }

  document.getElementById('ackAllAlertsBtn')?.addEventListener('click', () =>
    showToast('✅ All alerts acknowledged.')
  );

  /* Wire new filter buttons */
  document.querySelectorAll('.exp-filter-btn[data-urgency]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.exp-filter-btn[data-urgency]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadExpiry(btn.dataset.urgency);
    })
  );

  /* Keep old filter-btn[data-urgency] wiring for backward compatibility */
  document.querySelectorAll('.filter-btn[data-urgency]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-urgency]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadExpiry(btn.dataset.urgency);
    })
  );

  /* ═══════════════════════════════════════════
     COLD CHAIN
  ═══════════════════════════════════════════ */
  async function loadColdChain(sensor) {
    sensor = sensor || '';
    const tbody = document.getElementById('tempLogTbody');
    const fGrid = document.getElementById('freezerGrid');
    if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="td-load">Loading...</td></tr>`;
    try {
      const data = await apiFetch('coldchain' + (sensor ? `&sensor=${encodeURIComponent(sensor)}` : ''));
      txt('ccNormal',   data.normal   || 0);
      txt('ccWarning',  data.warning  || 0);
      txt('ccCritical', data.critical || 0);
      txt('ccSensors',  (data.sensors||[]).length);

      const ccFilter = document.getElementById('ccUnitFilter');
      if (ccFilter && data.sensor_list?.length) {
        const cur = ccFilter.value;
        ccFilter.innerHTML = '<option value="">All Units</option>' +
          data.sensor_list.map(s => `<option value="${esc(s)}" ${s===cur?'selected':''}>${esc(s)}</option>`).join('');
      }

      if (fGrid) {
        const sensors = data.sensors || [];
        fGrid.innerHTML = sensors.length
          ? sensors.map(s => {
            const temp = parseFloat(s.avg_temp);
            const ok   = temp >= 2 && temp <= 6;
            const warn = temp > 6  && temp <= 8;
            const cls  = !ok&&!warn ? 'fc-critical' : warn ? 'fc-warn' : 'fc-ok';
            const col  = !ok&&!warn ? '#f87171'     : warn ? '#fbbf24' : '#4ade80';
            const lbl  = !ok&&!warn ? '🚨 Alert'    : warn ? '⚠️ Warning' : '✅ Normal';
            return `<div class="freezer-card ${cls}" style="padding:16px;border-radius:12px;background:var(--card-bg);border:1px solid var(--border-color);">
              <div class="fc-name" style="font-weight:700;font-size:.9rem;margin-bottom:6px;">${esc(s.sensor_id)}</div>
              <div class="fc-temp" style="font-size:2rem;font-weight:800;color:${col};">${temp}°C</div>
              <div style="font-size:.7rem;color:var(--text-muted);">Range: ${parseFloat(s.min_temp).toFixed(1)}–${parseFloat(s.max_temp).toFixed(1)}°C</div>
              <div style="margin-top:8px;"><span class="status-badge ${!ok&&!warn?'badge-danger':warn?'badge-warn':'badge-ok'}">${lbl}</span></div>
              <div style="font-size:.67rem;color:var(--text-muted);margin-top:4px;">Last: ${timeAgo(s.last_reading)}</div>
            </div>`;
          }).join('')
          : '<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-muted);">No sensor data available.</div>';
      }

      const logs = data.logs || [];
      if (tbody) {
        tbody.innerHTML = logs.length
          ? logs.map(l => {
            const temp = parseFloat(l.temperature_celsius);
            const sc   = l.is_alert ? (temp>8?'badge-danger':'badge-warn') : 'badge-ok';
            return `<tr>
              <td>${fmtDate(l.recorded_at)}</td>
              <td>${esc(l.sensor_id)}</td>
              <td style="color:${l.is_alert?'#f87171':'#4ade80'};font-weight:700;">${temp.toFixed(1)}°C</td>
              <td><span class="status-badge ${sc}">${l.is_alert?'⚠️ Alert':'Normal'}</span></td>
            </tr>`;
          }).join('')
          : `<tr><td colspan="4" class="td-load">No temperature logs found.</td></tr>`;
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  document.getElementById('ccUnitFilter')?.addEventListener('change', () =>
    loadColdChain(document.getElementById('ccUnitFilter').value)
  );

  /* ═══════════════════════════════════════════
     QUARANTINE
  ═══════════════════════════════════════════ */
  async function loadQuarantine(risk, search) {
    risk   = risk   || 'all';
    search = search || '';
    const tbody = document.getElementById('quarantineTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="td-load">Loading...</td></tr>`;
    try {
      const data = await apiFetch(`quarantine&risk=${risk}&search=${encodeURIComponent(search)}`);
      animCount(document.getElementById('qActiveCount'),   parseInt(data.active)   || 0);
      animCount(document.getElementById('qPendingCount'),  parseInt(data.pending)  || 0);
      animCount(document.getElementById('qClearedCount'),  parseInt(data.cleared)  || 0);
      animCount(document.getElementById('qDisposedCount'), parseInt(data.disposed) || 0);

      const bags = data.bags || [];
      if (tbody) {
        tbody.innerHTML = bags.length
          ? bags.map(bag => {
            const rCls = bag.pathogen_detected ? 'badge-danger' : 'badge-warn';
            const rLbl = bag.pathogen_detected ? 'High Risk'    : 'Medium';
            const sCls = bag.status==='quarantined' ? 'badge-danger' : bag.status==='discarded' ? 'badge-critical' : 'badge-ok';
            return `<tr>
              <td><strong>#${esc(bag.bag_barcode)}</strong></td>
              <td>${esc(bag.blood_group)}</td>
              <td>${esc(bag.result?'Culture Test':'Initial QC')}</td>
              <td><span class="status-badge ${rCls}">${rLbl}</span></td>
              <td><span class="status-badge ${sCls}">${esc(bag.status||'—')}</span></td>
              <td>${fmtDate(bag.created_at,true)}</td>
              <td>${esc(bag.technician_name||'—')}</td>
              <td>${bag.status==='quarantined'
                ?`<button class="table-btn" onclick="showToast('Lab review required for bag #${esc(bag.bag_barcode)}')">Review</button>`
                :'—'}</td>
            </tr>`;
          }).join('')
          : `<tr><td colspan="8" class="td-load">No quarantine records found.</td></tr>`;
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  document.querySelectorAll('.filter-btn[data-risk]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-risk]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadQuarantine(btn.dataset.risk, document.getElementById('quarantineSearch')?.value||'');
    })
  );
  let qTimer;
  document.getElementById('quarantineSearch')?.addEventListener('input', () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() =>
      loadQuarantine(
        document.querySelector('.filter-btn[data-risk].active')?.dataset.risk||'all',
        document.getElementById('quarantineSearch').value
      ), 400);
  });

  /* ═══════════════════════════════════════════
     VERIFY PROMISES
  ═══════════════════════════════════════════ */
  async function loadPromises(status) {
    status = status || document.getElementById('promiseStatusFilter')?.value || '';
    const tbody = document.getElementById('promiseTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="td-load">Loading...</td></tr>`;
    try {
      const data = await apiFetch('promises&status=' + encodeURIComponent(status));
      const promises = data.promises || [];
      if (tbody) {
        tbody.innerHTML = promises.length
          ? promises.map(p => {
            const sc = p.status==='fulfilled'?'badge-ok':p.status==='pending'?'badge-warn':'badge-critical';
            const isPending = p.status === 'pending';
            return `<tr>
              <td><strong>${esc(p.confirmation_code)}</strong></td>
              <td>${esc(p.donor_name||'—')}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(p.blood_group||'—')}</span></td>
              <td>${fmtDate(p.promise_time)}</td>
              <td><span class="status-badge ${sc}">${esc(p.status)}</span></td>
              <td>${p.fulfilled_at ? fmtDate(p.fulfilled_at) : '—'}</td>
              <td>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${isPending ? `
                    <button class="table-btn" style="background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.4);color:#4ade80;"
                      onclick="markPromiseFulfilled(${p.id},'${esc(p.donor_name||'Donor')}')">✅ Fulfilled</button>
                    <button class="table-btn" style="background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.4);color:#f87171;"
                      onclick="markPromiseBroken(${p.id},'${esc(p.donor_name||'Donor')}')">❌ Broken</button>
                    <button class="table-btn"
                      onclick="reschedulePromise(${p.id},'${esc(p.donor_name||'Donor')}')">📅 Reschedule</button>
                  ` : `<span style="font-size:.72rem;color:var(--text-muted);">${p.status==='fulfilled'?'✅ Done':'❌ Broken'}</span>`}
                </div>
              </td>
            </tr>`;
          }).join('')
          : `<tr><td colspan="6" class="td-load">No donation promises found.</td></tr>`;
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  document.getElementById('promiseStatusFilter')?.addEventListener('change', () => loadPromises());

  document.getElementById('verifyPromiseBtn')?.addEventListener('click', async () => {
    const code   = document.getElementById('promiseCodeInput')?.value.trim();
    const resDiv = document.getElementById('promiseResult');
    if (!code) { showToast('⚠️ Enter a confirmation code.'); return; }
    if (resDiv) resDiv.innerHTML = '<div style="padding:8px;color:var(--text-muted);">Verifying...</div>';
    try {
      const data = await apiFetch('verify_promise','POST',{ confirmation_code:code });
      const pr   = data.promise;
      resDiv.innerHTML = `
        <div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.22);border-radius:11px;padding:14px;">
          <div style="color:#4ade80;font-weight:700;margin-bottom:7px;">✅ Promise Found</div>
          <div style="font-size:.82rem;display:flex;flex-direction:column;gap:4px;">
            <span>Donor: <strong>${esc(pr.donor_name)}</strong></span>
            <span>Blood Group: <strong>${esc(pr.blood_group||'—')}</strong></span>
            <span>Status: <strong>${esc(pr.status)}</strong></span>
            <span>Promised: ${fmtDate(pr.promise_time)}</span>
            ${pr.fulfilled_at?`<span>Fulfilled: ${fmtDate(pr.fulfilled_at)}</span>`:''}
          </div>
        </div>`;
    } catch (e) {
      if (resDiv) resDiv.innerHTML = `<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);border-radius:11px;padding:12px;color:#f87171;">❌ ${esc(e.message)}</div>`;
    }
  });
  document.getElementById('promiseCodeInput')?.addEventListener('keydown', e => {
    if (e.key==='Enter') document.getElementById('verifyPromiseBtn')?.click();
  });



  /* ═══════════════════════════════════════════
     RATINGS & REVIEWS
  ═══════════════════════════════════════════ */
  async function loadRatings(search, rating) {
    search = search ?? document.getElementById('reviewSearch')?.value       ?? '';
    rating = rating ?? document.getElementById('reviewRatingFilter')?.value ?? 0;
    const list = document.getElementById('reviewsList');
    if (list) list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">Loading...</div>';
    try {
      const data  = await apiFetch(`ratings&search=${encodeURIComponent(search)}&rating=${rating}`);
      const sum   = data.summary || {};
      const total = parseInt(sum.total) || 0;

      const avgRating = parseFloat(sum.avg||0);
      txt('ratingBigNumber', avgRating.toFixed(1));
      txt('ratingStarsBig', stars(avgRating));
      txt('ratingTotalCount',  `Based on ${total} review${total!==1?'s':''}`);

      const t = total || 1;
      ['5','4','3','2','1'].forEach(n => {
        const cnt = parseInt(sum['r'+n]) || 0;
        const pct = Math.round((cnt/t)*100);
        const bar = document.getElementById('rb'+n);
        const lbl = document.getElementById('rp'+n);
        if (bar) bar.style.width = pct+'%';
        if (lbl) lbl.textContent = pct+'%';
      });

      const revs = data.reviews || [];
      if (list) {
        list.innerHTML = revs.length
          ? revs.map(r => `
            <div class="review-card" style="padding:16px;border-bottom:1px solid var(--border-color);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                <div>
                  <span style="font-weight:700;">${esc(r.reviewer_name||'Anonymous')}</span>
                  <span style="margin-left:8px;">${stars(r.rating)}</span>
                  <div style="font-size:.7rem;color:var(--text-muted);margin-top:2px;">${esc(r.reviewer_type||'')}</div>
                </div>
                <div style="font-size:.7rem;color:var(--text-muted);">${timeAgo(r.created_at)}</div>
              </div>
              ${r.review_text
                ?`<div style="font-size:.83rem;color:var(--text-secondary);">"${esc(r.review_text)}"</div>`
                :`<div style="font-size:.83rem;color:var(--text-sub);font-style:italic;">No comment provided.</div>`}
            </div>`).join('')
          : '<div style="padding:20px;text-align:center;color:var(--text-muted);">No reviews found.</div>';
      }
    } catch (err) {
      handleErr(err);
      if (list) list.innerHTML = `<div style="padding:20px;color:#f87171;text-align:center;">⚠️ ${esc(err.message)}</div>`;
    }
  }

  let revTimer;
  document.getElementById('reviewSearch')?.addEventListener('input', () => {
    clearTimeout(revTimer); revTimer = setTimeout(() => loadRatings(), 400);
  });
  document.getElementById('reviewRatingFilter')?.addEventListener('change', () => loadRatings());

  document.getElementById('openGiveReviewBtn')?.addEventListener('click', async () => {
    openModal('✍️ Give Review',
      '<div style="padding:16px;text-align:center;color:var(--text-muted);"><div class="loader-spin" style="margin:0 auto 6px;"></div>Loading form data...</div>',
      null, 'Submit Review'
    );
    try {
      const data     = await apiFetch('review_form_data');
      const donors   = data.promise_donors || [];
      const entities = data.entities       || [];

      if (!donors.length) {
        mBody.innerHTML = `<div style="color:#fbbf24;padding:12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:10px;font-size:.84rem;">
          ⚠️ No eligible donors found. Only donors who have made a donation promise to this blood bank can be used to submit reviews.
        </div>`;
        mConfirm.style.display = 'none';
        return;
      }

      mConfirm.style.display = '';
      mBody.innerHTML = `
        <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:14px;">Select a promise donor and the entity to review.</p>
        <label class="form-lbl" style="display:block;margin-bottom:4px;">Promise Donor *</label>
        <select id="reviewDonorId" style="${IS}margin-bottom:12px;">
          ${donors.map(d=>`<option value="${d.donor_user_id}">${esc(d.donor_name)} (${esc(d.blood_group||'—')}) · ${esc(d.status)}</option>`).join('')}
        </select>
        <label class="form-lbl" style="display:block;margin-bottom:4px;">Entity to Review *</label>
        <select id="reviewEntityId" style="${IS}margin-bottom:12px;">
          ${entities.map(e=>`<option value="${e.id}_${esc(e.entity_type)}">${esc(e.name)} (${esc(e.entity_type)})</option>`).join('')}
        </select>
        <label class="form-lbl" style="display:block;margin-bottom:4px;">Rating *</label>
        <select id="reviewRating" style="${IS}margin-bottom:12px;">
          <option value="5">⭐⭐⭐⭐⭐ — Excellent (5)</option>
          <option value="4">⭐⭐⭐⭐ — Good (4)</option>
          <option value="3">⭐⭐⭐ — Average (3)</option>
          <option value="2">⭐⭐ — Poor (2)</option>
          <option value="1">⭐ — Very Poor (1)</option>
        </select>
        <label class="form-lbl" style="display:block;margin-bottom:4px;">Review Text</label>
        <textarea id="reviewText" rows="3" placeholder="Write your review..." style="${IS}resize:vertical;"></textarea>`;

      mAction = async () => {
        const donorId    = document.getElementById('reviewDonorId')?.value;
        const entityRaw  = document.getElementById('reviewEntityId')?.value;
        const rating     = parseInt(document.getElementById('reviewRating')?.value || 5);
        const reviewText = document.getElementById('reviewText')?.value.trim();
        if (!donorId||!entityRaw) { showToast('⚠️ Select donor and entity.'); return; }
        const [entityId, entityType] = entityRaw.split('_');
        try {
          await apiFetch('submit_review','POST',{
            donor_user_id: parseInt(donorId), entity_id: parseInt(entityId),
            entity_type: entityType, rating, review_text: reviewText,
          });
          showToast('✅ Review submitted successfully!');
          closeModal();
          loadRatings();
        } catch (e) { showToast('❌ '+e.message, 5000); }
      };
    } catch (e) {
      mBody.innerHTML = `<div style="color:#f87171;padding:12px;">❌ ${esc(e.message)}</div>`;
    }
  });

  /* ═══════════════════════════════════════════
     DONOR LEADERBOARD
  ═══════════════════════════════════════════ */
  async function loadLeaderboard(period, search, bg) {
    period = period || document.querySelector('.period-btn.active')?.dataset.period || 'monthly';
    search = search || document.getElementById('lbSearch')?.value      || '';
    bg     = bg     || document.getElementById('lbBloodFilter')?.value || '';
    const tbody = document.getElementById('leaderboardTbody');
    const top3  = document.getElementById('top3Showcase');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="td-load">Loading...</td></tr>`;
    if (top3)  top3.innerHTML  = '<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-muted);"><div class="loader-spin" style="margin:0 auto 6px;"></div>Loading...</div>';
    try {
      const data = await apiFetch(`leaderboard&period=${period}&search=${encodeURIComponent(search)}&blood_group=${encodeURIComponent(bg)}`);
      const lb   = data.leaderboard || [];

      if (top3) {
        const medals = ['🥇','🥈','🥉'];
        const ranks  = ['rank-1','rank-2','rank-3'];
        top3.innerHTML = lb.slice(0,3).length
          ? lb.slice(0,3).map((d,i) => {
            const trust = parseInt(d.trust_score)||0;
            const tsColor = trust>=80 ? '#4ade80' : trust>=60 ? '#facc15' : trust>=40 ? '#fb923c' : '#f87171';
            return `<div class="top3-card ${ranks[i]}" style="padding:20px;text-align:center;border-radius:14px;background:var(--card-bg);border:1px solid var(--border-color);">
              <div style="font-size:2rem;">${medals[i]}</div>
              <div style="font-weight:700;margin-top:8px;">${esc(d.family_name||d.full_name)}</div>
              <div style="font-size:.8rem;color:#FF6B6B;">${esc(d.blood_group||'—')}</div>
              <div style="font-size:1.6rem;font-weight:800;margin-top:6px;color:${tsColor};">${trust}</div>
              <div style="font-size:.72rem;color:var(--text-muted);">Trust Score</div>
            </div>`;
          }).join('')
          : '<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-muted);">No donations recorded for this period.</div>';
      }

      if (tbody) {
        tbody.innerHTML = lb.length
          ? lb.map((d,i) => {
            const total = parseInt(d.total_donations)||0;
            const trust = parseInt(d.trust_score)||0;
            const badge = total>=50?'🏆 Legend':total>=25?'🌟 Life Saver':total>=10?'💪 Regular Hero':'🩸 First Drop';
            const tsColor = trust>=80 ? '#4ade80' : trust>=60 ? '#facc15' : trust>=40 ? '#fb923c' : '#f87171';
            return `<tr>
              <td><strong>#${i+1}</strong></td>
              <td>${esc(d.family_name||d.full_name)}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(d.blood_group||'—')}</span></td>
              <td><strong>${total}</strong></td>
              <td><strong style="color:${tsColor};">${trust}</strong></td>
              <td>${d.donations_period}</td>
              <td>${badge}</td>
            </tr>`;
          }).join('')
          : `<tr><td colspan="7" class="td-load">No donors found.</td></tr>`;
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  document.querySelectorAll('.period-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadLeaderboard(btn.dataset.period);
    })
  );
  let lbTimer;
  document.getElementById('lbSearch')?.addEventListener('input', () => {
    clearTimeout(lbTimer); lbTimer = setTimeout(() => loadLeaderboard(), 400);
  });
  document.getElementById('lbBloodFilter')?.addEventListener('change', () => loadLeaderboard());

  /* ═══════════════════════════════════════════
     DRONES
  ═══════════════════════════════════════════ */
  async function loadDrones() {
    const tbody     = document.getElementById('activeDeliveriesTbody');
    const fleetGrid = document.getElementById('droneFleetGrid');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="td-load">Loading...</td></tr>`;
    try {
      const data = await apiFetch('drones');
      const fs   = data.fleet_stats || {};
      animCount(document.getElementById('droneAvail'),      parseInt(fs.available)        || 0);
      animCount(document.getElementById('dronesInFlight'),  parseInt(fs.in_flight)        || 0);
      animCount(document.getElementById('droneCharging'),   parseInt(fs.charging)         || 0);
      animCount(document.getElementById('droneMaint'),      parseInt(fs.maintenance)      || 0);
      animCount(document.getElementById('droneDelivToday'), parseInt(fs.deliveries_today) || 0);

      if (fleetGrid) {
        const fleet = data.fleet || [];
        fleetGrid.innerHTML = fleet.length
          ? fleet.map(d => {
            const batt    = d.battery_level || 0;
            const battCol = batt<20?'#f87171':batt<50?'#fbbf24':'#4ade80';
            const sc      = d.status==='idle'?'badge-ok':(d.status==='in_flight'||d.status==='en_route')?'badge-info':'badge-warn';
            return `<div class="drone-fleet-card glass-card" style="padding:16px;border-radius:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="font-weight:700;">${esc(d.drone_code)}</div>
                <span class="status-badge ${sc}">${esc(d.status)}</span>
              </div>
              <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:8px;">Max: ${d.max_weight_kg||'—'}kg</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:.72rem;color:var(--text-muted);">Battery</span>
                <div style="flex:1;height:6px;background:var(--border-color);border-radius:5px;">
                  <div style="height:100%;width:${batt}%;background:${battCol};border-radius:5px;"></div>
                </div>
                <span style="font-size:.72rem;font-weight:700;color:${battCol};">${batt}%</span>
              </div>
              ${d.status==='idle'
                ?`<button class="btn-ghost-sm" style="width:100%;margin-top:10px;" onclick="openDispatchModal(${d.id},'${esc(d.drone_code)}')">🚁 Dispatch</button>`
                :''}
            </div>`;
          }).join('')
          : '<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-muted);">No drones registered.</div>';
      }

      const dispatches = data.dispatches || [];
      if (tbody) {
        tbody.innerHTML = dispatches.length
          ? dispatches.map(d => {
            const eta = d.estimated_arrival
              ? `${Math.max(0,Math.round((new Date(d.estimated_arrival)-Date.now())/60000))} min`
              : '—';
            return `<tr>
              <td>#DD-${String(d.id).padStart(4,'0')}</td>
              <td>${esc(d.drone_code)}</td>
              <td>${esc(d.blood_group||'—')}</td>
              <td>${d.units_required||'—'}</td>
              <td>${fmtDate(d.created_at,true)}</td>
              <td>${eta}</td>
              <td><span class="status-badge badge-info">${esc((d.status||'').replace(/_/g,' '))}</span></td>
            </tr>`;
          }).join('')
          : `<tr><td colspan="7" class="td-load">No active dispatches.</td></tr>`;
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  window.openDispatchModal = (droneId, droneCode) => {
    openModal(`🚁 Dispatch Drone — ${esc(droneCode)}`,
      `<p style="font-size:.83rem;margin-bottom:14px;">Dispatch <strong>${esc(droneCode)}</strong> to a blood request.</p>
       <label class="form-lbl" style="display:block;margin-bottom:4px;">Blood Request ID *</label>
       <input type="number" id="dispReqId" placeholder="Enter request ID" style="${IS}">`,
      async () => {
        const reqId = parseInt(document.getElementById('dispReqId')?.value||0);
        if (!reqId) { showToast('⚠️ Request ID required.'); return; }
        try {
          const r = await apiFetch('dispatch_drone','POST',{ drone_id:droneId, blood_request_id:reqId });
          showToast(r.message); closeModal(); loadDrones();
        } catch (e) { showToast('❌ '+e.message, 5000); }
      },'Dispatch Now'
    );
  };

  document.getElementById('dispatchDronePageBtn')?.addEventListener('click', () =>
    showToast('Select an available drone from the fleet below and click Dispatch.')
  );

  /* ═══════════════════════════════════════════
     BLOOD REQUESTS
  ═══════════════════════════════════════════ */
  async function loadRequests() {
    const status = document.getElementById('reqStatusFilter')?.value || 'pending';
    const tbody  = document.getElementById('reqTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="td-load">Loading...</td></tr>`;
    try {
      const data  = await apiFetch('pending_requests&status=' + encodeURIComponent(status));
      const reqs  = data.requests || [];
      if (tbody) {
        tbody.innerHTML = reqs.length
          ? reqs.map(r => {
            const urgColor = r.urgency==='emergency'?'#ef4444':r.urgency==='urgent'?'#f59e0b':'#6b7280';
            const visMap   = { donor_recipient:'Donor', blood_bank:'Bank', both:'Both' };
            const isPending = r.status === 'pending';
            const offerStatus = r.bank_offer_status; /* null | 'pending' | 'approved' | 'rejected' */
            const offerCount  = r.bank_offer_count || 0;

            /* ── Action buttons based on offer state ── */
            let actionHtml;
            if (!isPending) {
              /* Request already fully fulfilled or rejected — no action */
              actionHtml = `<span style="font-size:.72rem;color:var(--text-muted);">—</span>`;
            } else if (offerStatus === 'pending') {
              /* This bank already offered — show waiting state */
              actionHtml = `
                <div style="display:flex;flex-direction:column;gap:3px;">
                  <span style="padding:4px 10px;border-radius:14px;font-size:.7rem;font-weight:700;
                    background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);color:#4ade80;">
                    ✅ Offered
                  </span>
                  <span style="font-size:.65rem;color:var(--text-muted);">Awaiting requester</span>
                </div>`;
            } else if (offerStatus === 'approved') {
              /* This bank was selected by requester */
              actionHtml = `
                <span style="padding:4px 10px;border-radius:14px;font-size:.7rem;font-weight:700;
                  background:rgba(74,222,128,.2);border:1px solid rgba(74,222,128,.5);color:#4ade80;">
                  🎯 Selected
                </span>`;
            } else if (offerStatus === 'rejected') {
              /* Requester chose another bank */
              actionHtml = `
                <span style="padding:4px 10px;border-radius:14px;font-size:.7rem;font-weight:700;
                  background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171;">
                  ✕ Not Selected
                </span>`;
            } else {
              /* Not offered yet — show Offer + Reject buttons */
              actionHtml = `
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button onclick="approveReq(${r.id})"
                    style="display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:20px;
                    font-size:.72rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;
                    white-space:nowrap;border:1.5px solid rgba(74,222,128,.5);
                    background:rgba(74,222,128,.15);color:#4ade80;
                    box-shadow:0 2px 8px rgba(74,222,128,.15);transition:all .18s;">
                    🩸 Offer Blood
                  </button>
                  <button onclick="rejectReq(${r.id})"
                    style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:20px;
                    font-size:.72rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;
                    white-space:nowrap;border:1.5px solid rgba(239,68,68,.4);
                    background:rgba(239,68,68,.1);color:#f87171;transition:all .18s;">
                    ✕ Reject
                  </button>
                </div>`;
            }

            /* ── Offer count badge ── */
            const offerBadge = offerCount > 0
              ? `<br><span style="font-size:.65rem;color:#60a5fa;">🏥 ${offerCount} bank${offerCount>1?'s':''} offered</span>`
              : '';

            return `<tr>
              <td><strong>#REQ-${String(r.id).padStart(4,'0')}</strong></td>
              <td>${esc(r.requester_name||'—')}</td>
              <td>${esc(r.requester_phone||'—')}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(r.blood_group)}</span></td>
              <td>${r.units_required}</td>
              <td><span style="color:${urgColor};font-weight:600;">${(r.urgency||'normal').toUpperCase()}</span></td>
              <td>${visMap[r.visible_to]||r.visible_to||'—'}</td>
              <td>${fmtDate(r.requested_at,true)}</td>
              <td>
                <span class="status-badge ${r.status==='approved'?'badge-ok':r.status==='rejected'?'badge-critical':'badge-warn'}">${esc(r.status)}</span>
                ${offerBadge}
              </td>
              <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                  ${actionHtml}
                </div>
              </td>
            </tr>`;
          }).join('')
          : `<tr><td colspan="10" class="td-load">No requests found.</td></tr>`;
      }

    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  document.getElementById('reqStatusFilter')?.addEventListener('change', () => loadRequests());


  window.approveReq = async function(requestId) {
    const reqLabel = '#REQ-' + String(requestId).padStart(4,'0');
    openModal(
      '🩸 Offer Blood for Request',
      `<div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25);border-radius:12px;padding:16px 18px;margin-bottom:14px;">
        <div style="font-weight:700;color:#4ade80;font-size:.9rem;margin-bottom:8px;">📋 ${reqLabel}</div>
        <div style="font-size:.82rem;color:var(--text-muted);line-height:1.7;">
          🩸 You are offering blood stock to fulfil this request.<br>
          ✅ Make sure you have sufficient blood stock available.<br>
          👤 The requester will review all offers and select from them.<br>
          ⏳ Your offer stays active until the requester decides.
        </div>
      </div>
      <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Notes (optional)</label>
      <input type="text" id="offerNotesInput" placeholder="e.g. Stock available for immediate pickup..."
        style="width:100%;padding:9px 12px;border-radius:10px;background:var(--input-bg);border:1px solid var(--input-border);
               color:var(--text-primary);font-family:Outfit,sans-serif;font-size:.82rem;box-sizing:border-box;">`,
      async () => {
        const notes = document.getElementById('offerNotesInput')?.value.trim() || '';
        try {
          const r = await apiFetch('accept_request','POST',{ request_id:requestId, notes });
          showToast('🩸 ' + (r.message||'Offer submitted! Awaiting requester selection.'), 4000);
          loadRequests();
        } catch (e) { showToast('❌ '+e.message, 5000); }
      },
      '🩸 Yes, Offer Blood'
    );
  };

  window.rejectReq = async function(requestId) {
    const reqLabel = '#REQ-' + String(requestId).padStart(4,'0');
    openModal(
      '✕ Reject Blood Request',
      `<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:12px;padding:16px 18px;margin-bottom:14px;">
        <div style="font-weight:700;color:#f87171;font-size:.9rem;margin-bottom:6px;">📋 ${reqLabel}</div>
        <div style="font-size:.82rem;color:var(--text-muted);">The requester will be notified with your reason.</div>
      </div>
      <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Reason for rejection</label>
      <textarea id="rejectReasonInput" rows="3" placeholder="e.g. Insufficient stock of this blood group..."
        style="width:100%;padding:10px 12px;border-radius:10px;background:var(--input-bg);border:1px solid var(--input-border);
               color:var(--text-primary);font-family:Outfit,sans-serif;font-size:.82rem;resize:vertical;box-sizing:border-box;"></textarea>`,
      async () => {
        const reason = document.getElementById('rejectReasonInput')?.value.trim() || 'No reason provided';
        try {
          const r = await apiFetch('reject_request','POST',{ request_id:requestId, reason });
          showToast(r.message||'✅ Request rejected.', 3000);
          loadRequests();
        } catch (e) { showToast('❌ '+e.message, 5000); }
      },
      '✕ Yes, Reject'
    );
  };

  /* ═══════════════════════════════════════════
     PROFILE
  ═══════════════════════════════════════════ */
  async function loadProfile() {
    try {
      const data = await apiFetch('profile');
      const p    = data.profile;
      const init = p.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

      const av = document.getElementById('profileAvatarFallback');
      const img = document.getElementById('profileAvatarImg');
      if (av) av.textContent = init;
      if (p.profile_picture && img) {
        img.src = p.profile_picture;
        img.style.display = 'block';
        if (av) av.style.display = 'none';
      } else {
        if (img) img.style.display = 'none';
        if (av) av.style.display = 'flex';
      }

      const rating = parseFloat(p.rating_avg) || 0;
      const badge  = rating>=4.5?'Gold':rating>=3.5?'Silver':rating>=2.5?'Bronze':'Standard';
      const badgeIcon = rating>=4.5?'🏆':rating>=3.5?'🥈':rating>=2.5?'🥉':'✨';

      txt('profileBankName', p.name);
      txt('profileUID',      `UID: ${p.registration_no}-${new Date(p.created_at).getFullYear()}`);
      txt('profileRole',     p.role.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()));
      txt('profileLicense',  p.registration_no);
      txt('profileRegNo',    p.registration_no);
      txt('profileEstYear',  new Date(p.created_at).getFullYear());
      txt('profileEmail',    p.email);
      txt('profilePhone',    p.phone||'—');
      txt('profileAddress',  [p.address_line,p.city,p.state].filter(Boolean).join(', ')||'—');
      txt('profileCountry',  p.country||'Bangladesh');
      txt('sidebarName',     p.name);
      txt('topBadge',        `${badgeIcon} ${badge} Status`);

      const statusPill = document.getElementById('profileStatusPill');
      if (statusPill) {
        statusPill.textContent = p.status||'Active';
        statusPill.style.background = p.status==='active'?'rgba(74,222,128,0.2)':'rgba(239,68,68,0.2)';
        statusPill.style.color = p.status==='active'?'#4ade80':'#f87171';
      }

      const badgePill = document.getElementById('profileBadgePill');
      if (badgePill) badgePill.textContent = `${badgeIcon} ${badge} Badge — Verified Partner`;

      const badgeIconEl = document.getElementById('profileBadgeIcon');
      if (badgeIconEl) badgeIconEl.textContent = badgeIcon;

      txt('psrBags',     data.total_bags     || '0');
      txt('psrDrones',   data.active_drones  || '0');
      txt('psrPromises', data.total_promises || '0');
      txt('psrRating',   rating.toFixed(1));

      txt('psmQuality',  '98%');
      txt('psmDelivery', '—');
      txt('psmUtilization', '—');

    } catch (err) {
      handleErr(err);
      showToast('❌ Profile load failed: '+err.message, 5000);
    }
  }

  document.getElementById('editProfileBtn')?.addEventListener('click', async () => {
    try {
      const data = await apiFetch('profile');
      const p    = data.profile;
      openModal('✏️ Edit Profile',
        `<div style="display:flex;flex-direction:column;gap:16px;">
           <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
             <div style="grid-column:1/-1">
               <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">Bank Name <span style="color:#f87171;">*</span></label>
               <input type="text" id="epName" value="${esc(p.name)}" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
             </div>
             <div>
               <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">Email <span style="color:#f87171;">*</span></label>
               <input type="email" id="epEmail" value="${esc(p.email)}" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
             </div>
             <div>
               <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">Phone</label>
               <input type="tel" id="epPhone" value="${esc(p.phone||'')}" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
             </div>
             <div>
               <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">City</label>
               <input type="text" id="epCity" value="${esc(p.city||'')}" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
             </div>
             <div>
               <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">State</label>
               <input type="text" id="epState" value="${esc(p.state||'')}" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
             </div>
             <div>
               <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">Country</label>
               <input type="text" id="epCountry" value="${esc(p.country||'Bangladesh')}" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
             </div>
             <div style="grid-column:1/-1">
               <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">Address</label>
               <input type="text" id="epAddr" value="${esc(p.address_line||'')}" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
             </div>
           </div>
           <div style="font-size:0.75rem;color:var(--text-muted);padding:10px 14px;background:rgba(251,191,36,0.08);border-radius:10px;border-left:3px solid #fbbf24;">🔒 Password changes are handled separately via the Password button.</div>
         </div>`,
        async () => {
          const name  = document.getElementById('epName')?.value.trim();
          const email = document.getElementById('epEmail')?.value.trim();
          if (!name||name.length<2) { showToast('⚠️ Name required.'); return; }
          if (!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('⚠️ Valid email required.'); return; }
          try {
            await apiFetch('update_profile','POST',{
              name, email,
              phone:        document.getElementById('epPhone')?.value.trim(),
              address_line: document.getElementById('epAddr')?.value.trim(),
              city:         document.getElementById('epCity')?.value.trim(),
              state:        document.getElementById('epState')?.value.trim(),
              country:      document.getElementById('epCountry')?.value.trim(),
            });
            showToast('✅ Profile updated!'); closeModal(); loadProfile();
          } catch (e) { showToast('❌ '+e.message, 5000); }
        },'Save Changes'
      );
    } catch (e) { showToast('❌ '+e.message, 5000); }
  });

  document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
    openModal('🔒 Change Password',
      `<div style="display:flex;flex-direction:column;gap:14px;">
         <div>
           <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">Current Password</label>
           <input type="password" id="cpCurrent" autocomplete="current-password" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
         </div>
         <div>
           <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">New Password</label>
           <input type="password" id="cpNew" autocomplete="new-password" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
         </div>
         <div>
           <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">Confirm New Password</label>
           <input type="password" id="cpConfirm" autocomplete="new-password" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:10px;padding:10px 14px;font-size:0.85rem;font-family:'Outfit',sans-serif;color:var(--text-primary);outline:none;box-sizing:border-box;">
         </div>
         <div style="font-size:0.75rem;color:var(--text-muted);padding:8px 12px;background:rgba(251,191,36,0.08);border-radius:8px;border-left:3px solid #fbbf24;">🔒 Password must be at least 6 characters.</div>
       </div>`,
      async () => {
        const current = document.getElementById('cpCurrent')?.value;
        const newPass = document.getElementById('cpNew')?.value;
        const confirm = document.getElementById('cpConfirm')?.value;
        if (!current || !newPass || !confirm) { showToast('⚠️ All fields are required.'); return; }
        if (newPass !== confirm) { showToast('⚠️ New passwords do not match.'); return; }
        if (newPass.length < 6) { showToast('⚠️ Password must be at least 6 characters.'); return; }
        try {
          const res = await apiFetch('change_password', 'POST', { current_password: current, new_password: newPass, confirm_password: confirm });
          showToast('✅ ' + (res.message || 'Password changed!'));
          closeModal();
          document.getElementById('cpCurrent').value = '';
          document.getElementById('cpNew').value = '';
          document.getElementById('cpConfirm').value = '';
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      },
      '🔒 Change Password'
    );
  });
  /* ══════════════════════════════════════════════
     ADMIN WARNING RESPONSE — blood bank
  ══════════════════════════════════════════════ */
  /* View full warning details (read-only) */
  window.viewWarningDetailsBank = function(warningId) {
    const w = (window._pendingWarningsBank || {})[warningId] || {};
    const msg  = w.message || '';
    const plan = w.admin_improvement_plan || '';
    const msgSection = msg ? `
      <div style="margin-bottom:${plan ? '16px' : '0'}">
        <div style="font-size:.7rem;font-weight:700;color:#fbbf24;letter-spacing:.05em;margin-bottom:8px;">WARNING MESSAGE</div>
        <div style="padding:14px;border-radius:10px;background:rgba(251,191,36,.06);
             border-left:3px solid #fbbf24;font-size:.84rem;color:var(--text-primary);
             line-height:1.7;white-space:pre-wrap;word-break:break-word;">${esc(msg)}</div>
      </div>` : '';
    const planSection = plan ? `
      <div>
        <div style="font-size:.7rem;font-weight:700;color:#4ade80;letter-spacing:.05em;margin-bottom:8px;">IMPROVEMENT PLAN FROM ADMIN</div>
        <div style="padding:14px;border-radius:10px;background:rgba(74,222,128,.07);
             border-left:3px solid #4ade80;font-size:.84rem;color:var(--text-primary);
             line-height:1.7;white-space:pre-wrap;word-break:break-word;">${esc(plan)}</div>
      </div>` : '';
    openModal('⚠️ Admin Warning Details',
      `<div style="max-height:60vh;overflow-y:auto;padding-right:4px;">${msgSection}${planSection}</div>`,
      null, null
    );
  };

  window.openWarningResponseBank = function(warningId) {
    const w = (window._pendingWarningsBank || {})[warningId] || {};
    const msg = w.message || '';
    const plan = w.admin_improvement_plan || '';
    const planSection = plan ? `
      <div style="margin-top:12px;padding:12px 14px;border-radius:10px;
           background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.25);border-left:3px solid #4ade80;">
        <div style="font-size:.7rem;font-weight:700;color:#4ade80;letter-spacing:.05em;margin-bottom:6px;">IMPROVEMENT PLAN FROM ADMIN</div>
        <div style="font-size:.81rem;color:var(--text-primary);white-space:pre-wrap;word-break:break-word;line-height:1.6;">${esc(plan)}</div>
      </div>` : '';
    openModal('📋 Respond to Admin Warning',
      `<div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;padding:12px;margin-bottom:4px;font-size:.82rem;">
        <strong style="color:#fbbf24;">⚠️ Warning Message:</strong>
        <div style="color:var(--text-primary);margin-top:6px;line-height:1.6;white-space:pre-wrap;word-break:break-word;">${esc(msg)}</div>
      </div>
      ${planSection}
      <p style="font-size:.82rem;color:var(--text-muted);margin:14px 0 10px;">Choose how you want to respond:</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button onclick="openAckBank(${warningId})"
          style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25);cursor:pointer;text-align:left;width:100%;">
          <span style="font-size:1.4rem;">✅</span>
          <div>
            <div style="font-weight:700;color:#4ade80;">Acknowledge Warning</div>
            <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px;">Confirm you received and understood it. Dismisses from dashboard.</div>
          </div>
        </button>
        <button onclick="openAppealBank(${warningId})"
          style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);cursor:pointer;text-align:left;width:100%;">
          <span style="font-size:1.4rem;">⚖️</span>
          <div>
            <div style="font-weight:700;color:#f87171;">Appeal Warning</div>
            <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px;">Disagree? Submit an appeal for admin review.</div>
          </div>
        </button>
      </div>`,
      null, 'Close'
    );
    mConfirm.style.display = 'none';
  };

  window.openAckBank = function(warningId) {
    openModal('✅ Acknowledge Warning',
      `<div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.22);border-radius:10px;padding:14px;font-size:.83rem;">
        <p style="margin:0 0 8px;font-weight:600;color:#4ade80;">Acknowledge this warning.</p>
        <p style="margin:0;color:var(--text-muted);">This confirms you have read and understood the warning. It will be dismissed from your dashboard.</p>
      </div>`,
      async () => {
        try {
          await apiFetch('acknowledge_warning', 'POST', { warning_id: warningId });
          showToast('✅ Warning acknowledged. Removed from dashboard.');
          closeModal(); loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Confirm Acknowledgement'
    );
    mConfirm.style.display = '';
  };


  window.openAppealBank = function(warningId) {
    openModal('⚖️ Appeal Warning',
      `<label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Appeal Reason *</label>
       <textarea id="appReasonBank" rows="6" placeholder="e.g. The warning was based on outdated data. Our audit on..."
         style="${IS}resize:vertical;min-height:120px;"></textarea>
       <div style="font-size:.7rem;color:var(--text-muted);margin-top:6px;">Minimum 10 characters required.</div>`,
      async () => {
        const reason = document.getElementById('appReasonBank')?.value.trim();
        if (!reason || reason.length < 10) { showToast('⚠️ Please provide a detailed appeal reason.'); return; }
        try {
          await apiFetch('appeal_warning', 'POST', { warning_id: warningId, reason });
          showToast('✅ Appeal submitted. Admin will review your case.');
          closeModal(); loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Submit Appeal'
    );
    mConfirm.style.display = '';
  };

  window.openAllWarningsBank = async function() {
    openModal('⚠️ All Pending Warnings', '<div style="text-align:center;padding:16px;color:var(--text-muted);">Loading...</div>', null, 'Close');
    mConfirm.style.display = 'none';
    try {
      const data = await apiFetch('get_warnings');
      const warnings = (data.warnings || []);
      if (!warnings.length) {
        mBody.innerHTML = '<div style="padding:20px;text-align:center;color:#4ade80;">✅ No pending warnings.</div>';
        return;
      }
      window._pendingWarningsBank = {};
      warnings.forEach(w => { window._pendingWarningsBank[w.id] = w; });
      mBody.innerHTML = `<div id="awListBank" style="display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;">
        ${warnings.map(w => {
          const hasPlan = w.admin_improvement_plan && w.admin_improvement_plan.trim().length > 0;
          return `
          <div style="padding:14px;border-radius:10px;background:rgba(251,191,36,.06);
               border:1px solid ${hasPlan ? 'rgba(74,222,128,.3)' : 'rgba(251,191,36,.2)'};
               border-left:3px solid ${hasPlan ? '#4ade80' : '#fbbf24'};">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
              <div style="flex:1;">
                <div style="font-size:.82rem;color:var(--text-primary);">${esc(w.message||'')}</div>
                ${hasPlan ? `<div style="font-size:.72rem;color:#4ade80;margin-top:4px;">📈 Improvement plan included — tap View Details</div>` : ''}
                <div style="font-size:.68rem;color:var(--text-muted);margin-top:4px;">${fmtDate(w.sent_at)}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
                <button class="btn-ghost-sm aw-view-btn-bank" data-wid="${w.id}"
                  style="background:rgba(96,165,250,.12);border-color:rgba(96,165,250,.4);color:#60a5fa;font-size:.72rem;">
                  📄 View Details
                </button>
                <button class="btn-ghost-sm aw-btn-bank" data-wid="${w.id}"
                  style="background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.4);color:#fbbf24;font-size:.72rem;">
                  📋 Respond
                </button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
      document.getElementById('awListBank')?.addEventListener('click', function(e) {
        const viewBtn = e.target.closest('.aw-view-btn-bank');
        if (viewBtn) {
          const wid = parseInt(viewBtn.dataset.wid);
          viewWarningDetailsBank(wid);
          return;
        }
        const btn = e.target.closest('.aw-btn-bank');
        if (!btn) return;
        const wid = parseInt(btn.dataset.wid);
        closeModal();
        setTimeout(() => openWarningResponseBank(wid), 150);
      });
    } catch(e) {
      mBody.innerHTML = `<div style="color:#f87171;padding:12px;">❌ ${esc(e.message)}</div>`;
    }
  };


  /* ══════════════════════════════════════════════
     PROMISE ACTION MODALS
  ══════════════════════════════════════════════ */
  window.markPromiseFulfilled = function(promiseId, donorName) {
    openModal('✅ Mark Promise Fulfilled',
      `<div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.22);border-radius:10px;padding:14px;font-size:.83rem;">
        <p style="margin:0 0 8px;font-weight:600;color:#4ade80;">Confirm donation received.</p>
        <p style="margin:0;color:var(--text-muted);">Mark <strong>${esc(donorName)}</strong>'s promise as fulfilled. Their trust score will increase by +5.</p>
      </div>`,
      async () => {
        try {
          await apiFetch('update_promise_status', 'POST', { promise_id: promiseId, status: 'fulfilled' });
          showToast('✅ Promise marked as fulfilled. Donor trust score +5.');
          closeModal(); loadPromises();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Confirm Fulfilled'
    );
  };

  window.markPromiseBroken = function(promiseId, donorName) {
    openModal('❌ Mark Promise Broken',
      `<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);border-radius:10px;padding:14px;font-size:.83rem;">
        <p style="margin:0 0 8px;font-weight:600;color:#f87171;">Donor did not show up?</p>
        <p style="margin:0;color:var(--text-muted);">Mark <strong>${esc(donorName)}</strong>'s promise as broken. Their trust score will decrease by -10.</p>
      </div>`,
      async () => {
        try {
          await apiFetch('update_promise_status', 'POST', { promise_id: promiseId, status: 'broken' });
          showToast('❌ Promise marked as broken. Donor trust score -10.');
          closeModal(); loadPromises();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Confirm Broken'
    );
  };

  window.reschedulePromise = function(promiseId, donorName) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    openModal('📅 Reschedule Promise',
      `<p style="font-size:.82rem;color:var(--text-muted);margin-bottom:14px;">Set a new donation date for <strong>${esc(donorName)}</strong>.</p>
       <label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">New Date *</label>
       <input type="date" id="rescheduleDate" min="${minDate}"
         style="${IS}margin-bottom:6px;">
       <div style="font-size:.7rem;color:var(--text-muted);">Must be a future date. Status will reset to pending.</div>`,
      async () => {
        const newDate = document.getElementById('rescheduleDate')?.value;
        if (!newDate) { showToast('⚠️ Please select a date.'); return; }
        try {
          await apiFetch('reschedule_promise', 'POST', { promise_id: promiseId, new_date: newDate });
          showToast('📅 Promise rescheduled successfully.');
          closeModal(); loadPromises();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Reschedule'
    );
  };

  /* ── Emergency Broadcasts ── */
  /* ── EMERGENCY BROADCAST ── */
  async function loadEmergency() {
    loadIncomingEmergency();
    loadSentBroadcasts();
    loadEmergencyStats();
  }

  async function loadEmergencyStats() {
    try {
      const [sentData, incData] = await Promise.all([
        apiFetch('sent_broadcasts'),
        apiFetch('emergency_requests'),
      ]);
      const broadcasts = sentData.broadcasts || [];
      const incoming = incData.requests || [];
      const active = broadcasts.filter(b => b.status === 'pending').length;
      const totalReached = broadcasts.reduce((s, b) => s + (b.matched_donor_count || 0), 0);
      setText('emStatActive', active);
      setText('emStatTotal', broadcasts.length);
      setText('emStatReached', totalReached);
      setText('emStatIncoming', incoming.length);
    } catch (e) { /* stats fail silently */ }
  }

  async function loadSentBroadcasts() {
    const tbody = document.getElementById('sentBroadcastsBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;">Loading...</td></tr>';
    try {
      const data = await apiFetch('sent_broadcasts');
      const list = data.broadcasts || [];
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;">📭 No broadcasts sent yet.</td></tr>';
        return;
      }
      tbody.innerHTML = list.map((b, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><span class="status-badge badge-danger">${esc(b.blood_group || '?')}</span></td>
          <td>${b.units || '—'}</td>
          <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(b.notes || '')}">${esc(b.notes || '—')}</td>
          <td>${b.matched_donor_count || 0}</td>
          <td><span class="status-badge ${b.status === 'pending' ? 'badge-urgent' : b.status === 'fulfilled' ? 'badge-ok' : 'badge-blue'}">${esc(b.status)}</span></td>
          <td>${fmtDate(b.sent_at) || '—'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#f87171;padding:20px;">❌ ${esc(e.message)}</td></tr>`;
    }
  }

  async function loadIncomingEmergency() {
    const tbody = document.getElementById('emergencyRequestsBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">Loading...</td></tr>';
    try {
      const data = await apiFetch('emergency_requests');
      const list = (data.requests || []);
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">✅ No pending emergency broadcasts.</td></tr>';
        return;
      }
      tbody.innerHTML = list.map((r, i) => {
        /* can_fulfill: PHP tells us if we have this blood group in stock */
        const canFulfill = r.can_fulfill === true || r.can_fulfill === 1;

        const actionHtml = canFulfill
          ? `<button class="btn-primary btn-sm" onclick="approveEmerg(${r.id}, '${esc(r.blood_group)}')"
               style="background:linear-gradient(135deg,#16a34a,#15803d);border-color:#16a34a;">
               ✅ Approve
             </button>
             <button class="btn-ghost-sm" style="margin-left:4px;" onclick="ignoreEmerg(${r.id})">✕ Ignore</button>`
          : `<span style="font-size:.7rem;color:#fbbf24;background:rgba(251,191,36,.1);
               border:1px solid rgba(251,191,36,.3);padding:4px 10px;border-radius:12px;
               display:inline-block;">
               ⚠️ No ${esc(r.blood_group)} stock
             </span>
             <button class="btn-ghost-sm" style="margin-left:4px;" onclick="ignoreEmerg(${r.id})">✕ Ignore</button>`;

        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${esc(r.requester_name || r.user_name || 'Unknown')}</strong></td>
          <td><span class="status-badge badge-danger">${esc(r.blood_group || '?')}</span></td>
          <td>${esc(r.location || '—')}</td>
          <td>${esc(r.phone || '—')}</td>
          <td><span class="status-badge ${r.status === 'pending' ? 'badge-urgent' : 'badge-ok'}">${esc(r.status)}</span></td>
          <td>${fmtDate(r.requested_at) || '—'}</td>
          <td>${actionHtml}</td>
        </tr>`;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#f87171;padding:20px;">❌ ${esc(e.message)}</td></tr>`;
    }
  }

  window.approveEmerg = async function(id, bloodGroup) {
    openModal(
      '🚨 Confirm Emergency Fulfillment',
      `<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.25);border-radius:12px;padding:16px 18px;">
        <div style="font-weight:700;color:#4ade80;font-size:.9rem;margin-bottom:8px;">✅ Confirm Blood Supply</div>
        <div style="font-size:.82rem;color:var(--text-muted);line-height:1.7;">
          You are confirming that your blood bank can supply
          <strong style="color:#4ade80;">${bloodGroup || 'the requested'}</strong> blood immediately.<br><br>
          🩸 The requester will be notified with your contact details.<br>
          ⚡ This is an emergency — please dispatch as quickly as possible.
        </div>
      </div>`,
      async () => {
        try {
          const res = await apiFetch('emergency_approve', 'POST', { request_id: id });
          showToast('✅ ' + (res.message || 'Approved — requester notified!'));
          loadEmergency();
        } catch(e) { showToast('❌ ' + e.message, 5000); }
      },
      '✅ Yes, I Can Supply'
    );
  };

  window.ignoreEmerg = async function(id) {
    openModal(
      '⏭️ Dismiss Emergency Broadcast',
      `<div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:12px;padding:16px 18px;">
        <div style="font-weight:700;color:#fbbf24;font-size:.9rem;margin-bottom:8px;">⏭️ Dismiss This Request</div>
        <div style="font-size:.82rem;color:var(--text-muted);line-height:1.7;">
          This request will be dismissed from your queue.<br>
          The requester will not be notified of this action.
        </div>
      </div>`,
      async () => {
        try {
          const res = await apiFetch('emergency_ignore', 'POST', { request_id: id });
          showToast('⏭️ ' + (res.message || 'Dismissed'));
          loadEmergency();
        } catch(e) { showToast('❌ ' + e.message, 5000); }
      },
      '⏭️ Yes, Dismiss'
    );
  };

  async function sendEmergencyBroadcast() {
    const bg = document.getElementById('emBloodGroup').value;
    const units = parseInt(document.getElementById('emUnits').value) || 1;
    const notes = document.getElementById('emNotes').value.trim();
    const targets = Array.from(document.querySelectorAll('.em-targets-grid input[type="checkbox"]:checked')).map(cb => cb.value);

    if (!bg) { showToast('❌ Please select a blood group.', 3000); return; }
    if (!targets.length) { showToast('❌ Select at least one target recipient type.', 3000); return; }

    const btn = document.getElementById('sendEmergencyBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Sending...';

    try {
      const res = await apiFetch('send_emergency_broadcast', 'POST', {
        blood_group: bg, units, notes, targets,
      });
      showToast('✅ ' + (res.message || 'Broadcast sent!'), 5000);
      document.getElementById('emBloodGroup').value = '';
      document.getElementById('emUnits').value = '2';
      document.getElementById('emNotes').value = '';
      document.querySelectorAll('.em-targets-grid input[type="checkbox"]').forEach(cb => cb.checked = true);
      loadEmergency();
    } catch (e) {
      showToast('❌ ' + e.message, 5000);
    } finally {
      btn.disabled = false;
      btn.textContent = '🚨 Send Emergency Broadcast';
    }
  }

  function setupEmergencyEvents() {
    document.getElementById('sendEmergencyBtn')?.addEventListener('click', sendEmergencyBroadcast);
    document.getElementById('refreshSentBroadcastsBtn')?.addEventListener('click', () => { loadSentBroadcasts(); loadEmergencyStats(); });
    document.getElementById('refreshIncomingEmergBtn')?.addEventListener('click', () => { loadIncomingEmergency(); loadEmergencyStats(); });
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */
  function init() {
    initReveal();
    setupEmergencyEvents();
    const saved = localStorage.getItem('bbBankPage');
    if (saved && document.querySelector(`.sidebar-link[data-section="${saved}"]`)) {
      navigateTo(saved);
    } else {
      loadDashboard();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ══════════════════════════════════════════════════════════
     DRONE DELIVERY SIMULATION ENGINE
  ══════════════════════════════════════════════════════════ */
  (function() {
    'use strict';

    /* ── State ── */
    var state = {
      running  : false,
      paused   : false,
      progress : 0,       // 0 → 1
      startTime: null,
      pauseAt  : null,
      duration : 0,       // ms for full flight
      animFrame: null,
      battery  : 100,
      altitude : 0,
      phase    : 'ready', // ready | ascending | cruising | descending | delivered
      totalDist: 0,
    };

    /* ── DOM refs ── */
    function $$(id) { return document.getElementById(id); }
    var canvas, ctx, W, H;

    /* Bézier control points (relative 0-1) */
    var P0, P1, P2, P3; // cubic bezier: start, ctrl1, ctrl2, end

    /* City background dots */
    var cityDots = [];

    function initCanvas() {
      canvas = $$('droneSimCanvas');
      if (!canvas) return false;
      ctx    = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
      buildCityDots();
      return true;
    }

    function resize() {
      if (!canvas) return;
      var wrap = canvas.parentElement;
      W = canvas.width  = wrap.offsetWidth;
      H = canvas.height = wrap.offsetHeight;
      setPoints();
      buildCityDots();
      if (!state.running) drawIdle();
    }

    function setPoints() {
      var pad = W * 0.12;
      P0 = { x: pad,         y: H * 0.72 };  // origin  (bottom-left)
      P3 = { x: W - pad,     y: H * 0.72 };  // dest    (bottom-right)
      P1 = { x: W * 0.3,     y: H * 0.18 };  // ctrl1   (top-left arc)
      P2 = { x: W * 0.7,     y: H * 0.18 };  // ctrl2   (top-right arc)
    }

    function buildCityDots() {
      cityDots = [];
      var n = Math.floor(W / 28);
      for (var i = 0; i < n; i++) {
        cityDots.push({
          x: Math.random() * W,
          y: H * 0.55 + Math.random() * H * 0.38,
          r: Math.random() * 2.5 + 0.8,
          a: Math.random() * 0.18 + 0.04,
          h: Math.random() * 22 + 6,   // building height
        });
      }
    }

    /* ── Bezier helpers ── */
    function bezier(t, p0, p1, p2, p3) {
      var u = 1 - t;
      return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
    }
    function bezierPt(t) {
      return {
        x: bezier(t, P0.x, P1.x, P2.x, P3.x),
        y: bezier(t, P0.y, P1.y, P2.y, P3.y),
      };
    }
    function bezierAngle(t) {
      var dt = 0.001;
      var a  = bezierPt(Math.max(0, t - dt));
      var b  = bezierPt(Math.min(1, t + dt));
      return Math.atan2(b.y - a.y, b.x - a.x);
    }

    /* ── Draw functions ── */
    function drawBackground() {
      ctx.clearRect(0, 0, W, H);

      /* Sky gradient */
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0,   'rgba(10,4,8,0)');
      sky.addColorStop(0.5, 'rgba(192,22,44,0.04)');
      sky.addColorStop(1,   'rgba(10,4,8,0)');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      /* Horizon line */
      ctx.beginPath();
      ctx.moveTo(0, H * 0.7);
      ctx.lineTo(W, H * 0.7);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      /* City silhouette */
      cityDots.forEach(function(d) {
        ctx.fillStyle = 'rgba(255,255,255,' + d.a + ')';
        ctx.fillRect(d.x - d.r, H * 0.7 - d.h, d.r * 2, d.h);
        /* window lights */
        ctx.fillStyle = 'rgba(255,220,100,0.15)';
        ctx.fillRect(d.x - d.r * 0.4, H * 0.7 - d.h * 0.7, d.r * 0.8, d.r * 0.8);
      });

      /* Grid lines */
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.lineWidth   = 0.5;
      for (var gx = 0; gx < W; gx += 60) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (var gy = 0; gy < H; gy += 60) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
    }

    function drawPath(progress) {
      /* Dashed full path */
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      for (var ti = 0; ti <= 100; ti++) {
        var pt = bezierPt(ti / 100);
        ti === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(192,22,44,0.2)';
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      if (progress <= 0) return;

      /* Completed path — glowing red */
      var grad = ctx.createLinearGradient(P0.x, 0, P3.x, 0);
      grad.addColorStop(0,        'rgba(192,22,44,0.9)');
      grad.addColorStop(progress, 'rgba(255,100,120,1)');
      grad.addColorStop(1,        'rgba(192,22,44,0)');

      ctx.beginPath();
      for (var ti2 = 0; ti2 <= Math.round(progress * 100); ti2++) {
        var pt2 = bezierPt(ti2 / 100);
        ti2 === 0 ? ctx.moveTo(pt2.x, pt2.y) : ctx.lineTo(pt2.x, pt2.y);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 3;
      ctx.shadowColor = 'rgba(192,22,44,0.8)';
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      /* Trail particles */
      if (progress > 0.02) {
        for (var tp = 0; tp < 4; tp++) {
          var trailT  = Math.max(0, progress - tp * 0.025);
          var trailPt = bezierPt(trailT);
          ctx.beginPath();
          ctx.arc(trailPt.x, trailPt.y, 3 - tp * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,100,120,' + (0.6 - tp * 0.14) + ')';
          ctx.fill();
        }
      }
    }

    function drawMarkers() {
      /* Origin pulse */
      drawPulseMarker(P0.x, P0.y, '#4ade80', '🏥');
      /* Destination pulse */
      drawPulseMarker(P3.x, P3.y, '#f87171', '🏨');
    }

    var pulseT = 0;
    function drawPulseMarker(x, y, color, icon) {
      /* Expanding rings */
      for (var ri = 0; ri < 3; ri++) {
        var phase = (pulseT + ri * 0.33) % 1;
        var r     = 12 + phase * 28;
        var alpha = (1 - phase) * 0.45;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = color.replace(')', ',' + alpha + ')').replace('rgb', 'rgba');
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }
      /* Center dot */
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle   = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 10;
      ctx.fill();
      ctx.shadowBlur  = 0;

      /* Icon above */
      ctx.font      = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon, x, y - 16);
    }

    function moveDroneIcon(progress) {
      var wrap = $$('droneIconWrap');
      if (!wrap || !canvas) return;
      var rect = canvas.getBoundingClientRect();
      var parentRect = canvas.parentElement.getBoundingClientRect();
      var pt   = bezierPt(progress);
      var scaleX = W / canvas.offsetWidth;
      var scaleY = H / canvas.offsetHeight;
      wrap.style.left = (pt.x / scaleX) + 'px';
      wrap.style.top  = (pt.y / scaleY) + 'px';

      /* Tilt based on angle */
      var angle = bezierAngle(progress) * (180 / Math.PI);
      var icon  = $$('droneIcon');
      if (icon) icon.style.transform = 'rotate(' + (angle * 0.3) + 'deg)';
    }

    function drawIdle() {
      if (!ctx) return;
      drawBackground();
      drawPath(0);
      drawMarkers();
      moveDroneIcon(0);
    }

    /* ── Telemetry update ── */
    function updateTelemetry(progress, elapsed) {
      var spd   = parseFloat($$('simSpeed')?.value || 80);
      var dist  = state.totalDist * progress;
      var rem   = state.totalDist * (1 - progress);
      var eta   = spd > 0 ? rem / spd * 3600 : 0; // seconds remaining
      var etaM  = Math.floor(eta / 60);
      var etaS  = Math.floor(eta % 60);

      /* Battery drain: starts 100%, ends ~25% */
      state.battery = Math.max(25, 100 - progress * 75);
      var battPct   = Math.round(state.battery);
      var battColor = battPct > 50 ? '#4ade80' : battPct > 25 ? '#fbbf24' : '#f87171';

      /* Altitude: ascend first 20%, cruise 60-80%, descend last 20% */
      if      (progress < 0.2)  state.altitude = Math.round((progress / 0.2) * 120);
      else if (progress < 0.8)  state.altitude = 120;
      else                      state.altitude = Math.round(((1 - progress) / 0.2) * 120);

      /* Phase */
      var statusTxt;
      if      (progress < 0.05) { state.phase = 'ascending';  statusTxt = '🛫 Ascending';  }
      else if (progress < 0.15) { state.phase = 'ascending';  statusTxt = '↑ Climbing';   }
      else if (progress < 0.85) { state.phase = 'cruising';   statusTxt = '✈ In Flight';  }
      else if (progress < 0.95) { state.phase = 'descending'; statusTxt = '↓ Descending'; }
      else                      { state.phase = 'delivering'; statusTxt = '📦 Delivering'; }

      setText('simBattery',  battPct + '%');
      setText('simSpeedVal', Math.round(spd * (state.phase==='cruising' ? 1 : 0.6)) + ' km/h');
      setText('simDistance', dist.toFixed(1) + ' km');
      setText('simETA',      etaM + ':' + (etaS < 10 ? '0' : '') + etaS);
      setText('simAltitude', state.altitude + ' m');
      setText('simStatus',   statusTxt);

      var bf = $$('simBattFill');
      if (bf) { bf.style.width = battPct + '%'; bf.style.background = battColor; }

      /* Progress bar */
      var pct = Math.round(progress * 100);
      setText('simProgressPct', pct + '%');
      var pf = $$('simProgressFill');
      var pd = $$('simProgressDot');
      if (pf) pf.style.width = pct + '%';
      if (pd) pd.style.left  = pct + '%';
    }

    function setText(id, val) {
      var el = $$(id); if (el) el.textContent = val;
    }

    function addLog(msg, cls) {
      var log = $$('droneSimLog');
      if (!log) return;
      var entry = document.createElement('div');
      entry.className = 'drone-log-entry' + (cls ? ' ' + cls : '');
      var now = new Date();
      var time = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
      entry.textContent = '[' + time + '] ' + msg;
      log.insertBefore(entry, log.firstChild);
      /* Keep last 20 entries */
      while (log.children.length > 20) log.removeChild(log.lastChild);
    }

    /* ── Animation loop ── */
    function tick(ts) {
      if (!state.running || state.paused) return;
      if (!state.startTime) state.startTime = ts;
      var elapsed  = ts - state.startTime;
      state.progress = Math.min(1, elapsed / state.duration);

      pulseT = (ts * 0.001) % 1;

      drawBackground();
      drawPath(state.progress);
      drawMarkers();
      moveDroneIcon(state.progress);
      updateTelemetry(state.progress, elapsed);

      if (state.progress >= 1) {
        onDelivered();
        return;
      }

      /* Phase-change logs */
      var prev = state._lastPhase;
      if (state.phase !== prev) {
        state._lastPhase = state.phase;
        if (state.phase === 'cruising')   addLog('✈️ Cruising altitude 120m reached.', 'log-success');
        if (state.phase === 'descending') addLog('↓ Beginning descent to destination.', 'log-warn');
      }

      state.animFrame = requestAnimationFrame(tick);
    }

    function onDelivered() {
      state.running  = false;
      state.progress = 1;

      moveDroneIcon(1);
      setText('simStatus', '✅ Delivered!');
      setText('simETA',    '00:00');

      /* Package drop animation */
      var dest   = bezierPt(1);
      var pkg    = $$('dronePackage');
      var wrap   = $$('droneIconWrap');
      if (pkg && wrap) {
        pkg.style.display = 'block';
        pkg.style.left    = wrap.style.left;
        pkg.style.top     = wrap.style.top;
        setTimeout(function() { if (pkg) pkg.style.display = 'none'; }, 800);
      }

      addLog('✅ Blood package delivered successfully!', 'log-success');
      addLog('📦 ' + ($$('simUnits')?.value||1) + ' unit(s) of ' + ($$('simBloodType')?.value||'O+') + ' delivered to ' + ($$('simTo')?.value||'Hospital') + '.', 'log-success');

      setBtns(false);
      var sd = $$('droneSimStartBtn');
      if (sd) { sd.textContent = '▶ Fly Again'; sd.disabled = false; }

      /* Celebration pulse on canvas */
      var flashes = 0;
      var flashInt = setInterval(function() {
        drawBackground(); drawPath(1); drawMarkers(); moveDroneIcon(1);
        if (flashes++ > 5) clearInterval(flashInt);
      }, 300);
    }

    function setBtns(running) {
      var sb = $$('droneSimStartBtn');
      var pb = $$('droneSimPauseBtn');
      var rb = $$('droneSimResetBtn');
      if (sb) sb.disabled = running;
      if (pb) pb.disabled = !running;
      if (rb) rb.disabled = false;
    }

    /* ── Controls ── */
    function startSim() {
      if (!initCanvas()) { showToast('⚠️ Simulation canvas not found.'); return; }

      var spd  = parseFloat($$('simSpeed')?.value  || 80);   // km/h
      var from = $$('simFrom')?.value  || 'Blood Bank';
      var to   = $$('simTo')?.value    || 'Hospital';
      var bg   = $$('simBloodType')?.value || 'O+';
      var units = $$('simUnits')?.value || 1;

      /* Simulate ~8km distance */
      state.totalDist  = 6 + Math.random() * 4;
      state.duration   = (state.totalDist / spd) * 3600 * 1000 / 60; /* compress 60x for sim */
      state.duration   = Math.max(12000, Math.min(30000, state.duration)); /* 12–30s */

      state.running    = true;
      state.paused     = false;
      state.progress   = 0;
      state.startTime  = null;
      state.battery    = 100;
      state.altitude   = 0;
      state._lastPhase = '';

      /* Update labels */
      setText('simOriginLabel', '🏥 ' + from.split(',')[0]);
      setText('simDestLabel',   '🏨 ' + to.split(',')[0]);
      setText('simFromShort',   from.split(',')[0]);
      setText('simToShort',     to.split(',')[0]);

      setBtns(true);
      var sb = $$('droneSimStartBtn');
      if (sb) { sb.textContent = '▶ Start'; }

      /* Log */
      var log = $$('droneSimLog');
      if (log) log.innerHTML = '';
      addLog('🚁 Drone dispatched from ' + from.split(',')[0] + '.', 'log-success');
      addLog('📦 Carrying ' + units + ' unit(s) of ' + bg + ' blood.');
      addLog('📍 Destination: ' + to.split(',')[0]);
      addLog('⚡ Battery: 100% · Speed: ' + spd + ' km/h · Est. dist: ' + state.totalDist.toFixed(1) + ' km');

      /* Drone icon classes */
      var icon = $$('droneIcon');
      if (icon) icon.classList.add('flying');

      state.animFrame = requestAnimationFrame(tick);
    }

    function pauseSim() {
      if (!state.running) return;
      if (!state.paused) {
        state.paused  = true;
        state.pauseAt = performance.now();
        cancelAnimationFrame(state.animFrame);
        var pb = $$('droneSimPauseBtn');
        if (pb) pb.textContent = '▶ Resume';
        addLog('⏸ Simulation paused.', 'log-warn');
      } else {
        /* Resume — offset startTime so progress continues correctly */
        var pausedFor   = performance.now() - state.pauseAt;
        state.startTime += pausedFor;
        state.paused    = false;
        var pb = $$('droneSimPauseBtn');
        if (pb) pb.textContent = '⏸ Pause';
        addLog('▶ Simulation resumed.');
        state.animFrame = requestAnimationFrame(tick);
      }
    }

    function resetSim() {
      cancelAnimationFrame(state.animFrame);
      state.running  = false;
      state.paused   = false;
      state.progress = 0;
      state.battery  = 100;
      state.altitude = 0;

      setBtns(false);
      var sb = $$('droneSimStartBtn');
      var pb = $$('droneSimPauseBtn');
      if (sb) { sb.textContent = '▶ Start'; sb.disabled = false; }
      if (pb) pb.textContent = '⏸ Pause';

      setText('simBattery',     '100%');
      setText('simSpeedVal',    '0 km/h');
      setText('simDistance',    '0.0 km');
      setText('simETA',         '--:--');
      setText('simAltitude',    '0 m');
      setText('simStatus',      'Ready');
      setText('simProgressPct', '0%');

      var bf = $$('simBattFill');
      if (bf) { bf.style.width = '100%'; bf.style.background = '#4ade80'; }
      var pf = $$('simProgressFill'); if (pf) pf.style.width = '0%';
      var pd = $$('simProgressDot');  if (pd) pd.style.left  = '0%';

      var icon = $$('droneIcon');
      if (icon) { icon.classList.remove('flying'); icon.style.transform = ''; }

      var log = $$('droneSimLog');
      if (log) log.innerHTML = '<div class="drone-log-entry">🟢 Simulation reset. Configure and press Start.</div>';

      if (initCanvas()) { drawIdle(); }

      addLog('↺ Simulation reset.');
    }

    /* ── Idle animation loop ── */
    var idleFrame;
    function idleTick(ts) {
      if (state.running) return;
      pulseT = (ts * 0.001) % 1;
      if (ctx) { drawBackground(); drawPath(0); drawMarkers(); moveDroneIcon(0); }
      idleFrame = requestAnimationFrame(idleTick);
    }

    /* ── Wire buttons ── */
    function wireDroneSim() {
      if (!$$('droneSimCanvas')) return;
      if (!initCanvas()) return;

      $$('droneSimStartBtn')?.addEventListener('click', startSim);
      $$('droneSimPauseBtn')?.addEventListener('click', pauseSim);
      $$('droneSimResetBtn')?.addEventListener('click', resetSim);

      /* Start idle pulse animation */
      idleFrame = requestAnimationFrame(idleTick);
    }

    /* Wire when drone section is loaded */
    /* Expose so navigateTo can call it */
    window._initDroneSim = wireDroneSim;

  })(); /* end simulation IIFE */

})();