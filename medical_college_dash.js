/* ============================================================
   BloodBridge — medical_college_dash.js
   API: mc_api.php
   All data fetched dynamically from the database.
   ============================================================ */
(function () {
  'use strict';

  const API = 'mc_api.php';

  /* ─────────────────────────────────────
     THEME
  ───────────────────────────────────── */
  const html = document.documentElement;
  function getTheme() { return localStorage.getItem('bb-theme') || 'dark'; }
  function setTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem('bb-theme', t); }
  setTheme(getTheme());
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  });

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
    if (hamburger) { hamburger.classList.add('open'); hamburger.setAttribute('aria-expanded', 'true'); }
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    if (isMobile()) {
      if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
      document.body.style.overflow = '';
    }
    if (hamburger) { hamburger.classList.remove('open'); hamburger.setAttribute('aria-expanded', 'false'); }
  }
  if (hamburger) hamburger.addEventListener('click', e => { e.stopPropagation(); sidebar?.classList.contains('open') ? closeSidebar() : openSidebar(); });
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  window.addEventListener('resize', () => { isMobile() ? closeSidebar() : openSidebar(); });
  if (!isMobile()) openSidebar();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isMobile()) closeSidebar(); });

  /* ─────────────────────────────────────
     NAVIGATION
  ───────────────────────────────────── */
  const VIEW_MAP = {
    dashboard:     'dashboardView',
    requests:      'requestsView',
    patients:      'patientsView',
    promises:      'promisesView',
    inventory:     'inventoryView',
    demand:        'demandView',
    map:           'mapView',
    profile:       'profileView',
    emergency:     'emergencyRequestsView',
  };

  function navigateTo(sec) {
    if (!VIEW_MAP[sec]) sec = 'dashboard';
    // Use only CSS class — CSS handles display:none/.active{display:block}
    // Never set inline display style as it conflicts with CSS specificity
    Object.values(VIEW_MAP).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    const target = document.getElementById(VIEW_MAP[sec]);
    if (target) target.classList.add('active');
    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));
    document.querySelector(`.sidebar-link[data-section="${sec}"]`)?.classList.add('active');
    if (isMobile()) closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    initReveal();
    switch (sec) {
      case 'dashboard':     loadDashboard();     break;
      case 'requests':      loadIncomingRequests(); loadRequests(); break;
      case 'patients':      loadPatients();      break;
      case 'demand':        loadDemand();        break;
      case 'map':           loadMap();           break;
      case 'profile':       loadProfile();       break;
      case 'promises':      loadPromises();      break;
      case 'emergency':     loadEmergency();     break;
      case 'inventory':     loadInventoryMc();    break;
    }
    localStorage.setItem('bbMcPage', sec);
  }
  window.navigateTo = navigateTo;

  document.querySelectorAll('.sidebar-link[data-section]').forEach(l =>
    l.addEventListener('click', e => { e.preventDefault(); navigateTo(l.dataset.section); })
  );

  /* ─────────────────────────────────────
     UTILITIES
  ───────────────────────────────────── */
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  function urgencyBadge(u) {
    const map = {
      emergency: 'badge-danger',
      critical:  'badge-critical',
      normal:    'badge-ok',
    };
    return map[u] || 'badge-warn';
  }
  function statusBadge(s) {
    const map = {
      pending:   'badge-warn',
      approved:  'badge-ok',
      delivered: 'badge-ok',
      cancelled: 'badge-danger',
      processing:'badge-info',
    };
    return map[s] || 'badge-warn';
  }

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
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(`${API}?action=${action}`, opts);
    const data = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
    if (!data.success && res.status === 401) {
      const e = new Error('AUTH_FAILED');
      e.session = data.session || {};
      throw e;
    }
    if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  /* ─────────────────────────────────────
     TOAST
  ───────────────────────────────────── */
  function showToast(msg, dur) {
    dur = dur || 3200;
    const t = document.getElementById('toastMessage');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
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
      { threshold: 0.05 }
    );
    els.forEach(e => obs.observe(e));
  }

  /* ─────────────────────────────────────
     ANIMATED COUNTER
  ───────────────────────────────────── */
  function animCount(el, target, isFloat) {
    if (!el) return;
    const dur = 900; let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const v = (1 - Math.pow(1 - p, 3)) * target;
      el.textContent = isFloat ? v.toFixed(1) : Math.floor(v);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = isFloat ? parseFloat(target).toFixed(1) : target;
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
      showToast('⚠️ Session expired. Redirecting to login...', 3000);
      setTimeout(() => window.location.href = 'login.html', 3000);
    }
  }

  /* ═══════════════════════════════════════════
     DASHBOARD
  ═══════════════════════════════════════════ */
  async function loadDashboard() {
    try {
      const data = await apiFetch('dashboard');
      const c = data.college;
      const s = data.stats;

      /* Identity */
      const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const sa = document.getElementById('sidebarAvatar');
      if (sa) sa.textContent = initials;

      /* Greeting */
      const greetEl = document.querySelector('.college-name');
      if (greetEl) greetEl.textContent = c.name;
      const idEl = document.querySelector('.college-id');
      if (idEl) idEl.textContent = `${c.city || ''} · Medical College`;

      /* Stats */
      animCount(document.getElementById('activeRequests'),   s.active_requests, false);
      animCount(document.getElementById('registeredPatients'),s.total_patients,  false);
      animCount(document.getElementById('avgRating'),        s.avg_rating,      true);

      /* Sidebar user info */
      txt('sidebarUserName', c.name);

      /* Fetch admin warnings BEFORE rendering alerts */
      let mcWarnings = [], mcWarningCount = 0;
      try {
        const wData = await apiFetch('get_warnings');
        mcWarnings = wData.warnings || [];
        mcWarningCount = wData.warning_count || 0;
        window._pendingWarningsMC = {};
        mcWarnings.forEach(w => { window._pendingWarningsMC[w.id] = w.message || ''; });
      } catch(_) {}

      /* Critical alerts section */
      const alertsGrid = document.querySelector('.alerts-grid');
      if (alertsGrid) {
        let html = '';

        /* Admin warning — show 1 with Respond button */
        if (mcWarnings.length) {
          const w = mcWarnings[0];
          const moreCount = mcWarningCount - 1;
          html += `<div class="alert-critical-card glass-card" style="border-left:4px solid #fbbf24;flex-wrap:wrap;gap:10px;">
            <span style="font-size:1.3rem;">⚠️</span>
            <div style="flex:1;min-width:180px;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong>Admin Warning</strong>
                ${mcWarningCount > 1 ? `<span style="background:rgba(251,191,36,.2);color:#fbbf24;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:50px;">${mcWarningCount} total</span>` : ''}
              </div>
              <div style="font-size:.78rem;color:var(--text-muted);margin-top:3px;">${esc((w.message||'').slice(0,120))}</div>
              <div style="display:flex;align-items:center;gap:10px;margin-top:4px;flex-wrap:wrap;">
                <span style="font-size:.68rem;color:var(--text-muted);">${fmtDate(w.sent_at, true)}</span>
                ${moreCount > 0 ? `<button class="btn-ghost-sm" style="font-size:.68rem;padding:2px 8px;" onclick="openAllWarningsMC()">+${moreCount} more</button>` : ''}
              </div>
            </div>
            <button class="btn-ghost-sm" style="background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.4);color:#fbbf24;flex-shrink:0;"
              onclick="openWarningResponseMC(${w.id}, '${esc((w.message||'').slice(0,120)).replace(/'/g, "\\'")}')">
              📋 Respond
            </button>
          </div>`;
        }

        /* Demand signal from DB */
        if (data.demand_signals && data.demand_signals.length) {
          const top = data.demand_signals[0];
          html += `<div class="alert-critical-card glass-card">
            <div class="alert-icon-critical">📈</div>
            <div class="alert-critical-content">
              <div class="alert-critical-title">⚠️ High demand: ${esc(top.blood_group)} blood — ${top.total_requests} request(s) this month</div>
              <p class="alert-critical-msg">${top.urgent > 0 ? top.urgent + ' critical/emergency.' : 'Monitor closely.'}</p>
            </div>
            <button class="critical-btn" onclick="navigateTo('demand')">View Analytics</button>
          </div>`;
        }
        if (!html) {
          html = `<div class="alert-critical-card glass-card" style="border-left:4px solid #4ade80;justify-content:center;">
            <span style="font-size:1.3rem;">✅</span>
            <span style="color:#4ade80;font-weight:600;margin-left:10px;">No critical alerts. All systems normal.</span>
          </div>`;
        }
        alertsGrid.innerHTML = html;
      }

      /* Recent delivery note — last delivered request */
      const delivNote = document.querySelector('.delivery-note');
      if (delivNote) {
        const delivered = (data.recent_requests || []).find(r => r.status === 'delivered');
        if (delivered) {
          delivNote.style.display = '';
          const dtEl = delivNote.querySelector('.delivery-title');
          if (dtEl) dtEl.innerHTML = `Blood request <strong>#${delivered.id}</strong> for patient <strong>${esc(delivered.patient_name || '—')}</strong> has been approved and delivered.`;
        } else {
          delivNote.style.display = 'none';
        }
      }

      /* Recent requests table */
      const tbody = document.querySelector('#dashboardView .data-table tbody');
      if (tbody) {
        const reqs = data.recent_requests || [];
        tbody.innerHTML = reqs.length
          ? reqs.map(r => `<tr>
              <td><strong>#${r.id}</strong></td>
              <td>${esc(r.patient_name || '—')}</td>
              <td><span style="color:#FF6B6B;font-weight:700;">${esc(r.blood_group)}</span></td>
              <td>${r.units_required}</td>
              <td><span class="status-badge ${urgencyBadge(r.urgency)}">${esc(r.urgency)}</span></td>
              <td><span class="status-badge ${statusBadge(r.status)}">${esc(r.status)}</span></td>
            </tr>`).join('')
          : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px;">No requests yet.</td></tr>`;
      }

      /* Patient registry summary */
      const alertList = document.querySelector('#dashboardView .alerts-card .alert-list');
      if (alertList) {
        const summary = data.patient_summary || [];
        const total   = summary.reduce((a, b) => a + parseInt(b.total), 0);
        const breakdown = summary.map(r => `${esc(r.blood_group)} (${r.total})`).join(', ') || '—';

        /* Most requested this month */
        const topDemand = (data.demand_signals || []).slice(0, 3)
          .map(d => `${esc(d.blood_group)} (${d.total_requests})`).join(' · ') || '—';

        alertList.innerHTML = `
          <div class="alert-item">
            <div class="alert-icon-wrap">👤</div>
            <div class="alert-body">
              <div class="alert-title">Total Registered: ${total}</div>
              <div class="alert-msg">Blood group breakdown: ${breakdown}</div>
            </div>
          </div>
          <div class="alert-item">
            <div class="alert-icon-wrap">📌</div>
            <div class="alert-body">
              <div class="alert-title">Most requested this month</div>
              <div class="alert-msg">${topDemand}</div>
            </div>
          </div>`;
      }

      /* Demand insight preview */
      const demandStats = document.querySelector('.demand-stats');
      if (demandStats) {
        const signals = data.demand_signals || [];
        demandStats.innerHTML = signals.length
          ? signals.slice(0, 3).map(d => {
            const lvl = d.urgent > 0 ? 'badge-danger' : parseInt(d.total_requests) >= 3 ? 'badge-warn' : 'badge-ok';
            const lbl = d.urgent > 0 ? 'Critical' : parseInt(d.total_requests) >= 3 ? 'High' : 'Moderate';
            return `<div class="demand-item">
              <span><strong>${esc(d.blood_group)}</strong></span>
              <span>${d.total_requests} request(s) this month</span>
              <span class="status-badge ${lvl}">${lbl}</span>
            </div>`;
          }).join('')
          : '<div style="color:var(--text-muted);font-size:.82rem;padding:8px;">No demand data this month.</div>';

        const insightNote = document.querySelector('.insight-note');
        if (insightNote && signals.length) {
          insightNote.textContent = `💡 Recommendation: Prioritize ${signals[0].blood_group} donor recruitment.`;
        }
      }

      /* Inventory summary table */
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

      /* Expiring soon list (≤7 days) */
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
              <button class="btn-ghost-sm" onclick="allocateBagMc(${bag.id},'${esc(bag.bag_barcode)}')">Allocate</button>
            </div>`;
          }).join('')
          : '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:.82rem;">✅ No bags expiring within 7 days.</div>';
      }

    } catch (err) {
      handleErr(err);
      // Always clear the spinner in alerts grid
      const alertsGrid = document.querySelector('.alerts-grid');
      if (alertsGrid) {
        const isAuth = err.message === 'AUTH_FAILED';
        alertsGrid.innerHTML = `<div class="alert-critical-card glass-card" style="grid-column:1/-1;border-left:4px solid #f87171;flex-direction:column;align-items:flex-start;gap:6px;">
          <div style="display:flex;align-items:center;gap:10px;width:100%;">
            <span style="font-size:1.3rem;">❌</span>
            <strong style="flex:1;">${isAuth ? 'Session expired — please log in again.' : 'Dashboard load failed: ' + esc(err.message)}</strong>
            ${isAuth
              ? `<button class="btn-ghost-sm" onclick="window.location.href='login.html'">Log In</button>`
              : `<button class="btn-ghost-sm" onclick="loadDashboard()">Retry</button>`}
          </div>
          ${!isAuth ? `<div style="font-size:.72rem;color:var(--text-muted);">Open mc_api.php?action=session_debug to check your session.</div>` : ''}
        </div>`;
      }
      if (err.message !== 'AUTH_FAILED') showToast('❌ Dashboard error: ' + err.message, 5000);
      console.error('Dashboard error:', err.message);
    }
    initReveal();
  }

  /* ═══════════════════════════════════════════
     BLOOD REQUESTS
  ═══════════════════════════════════════════ */
  /* Load incoming requests (assigned to this MC's blood bank) */
  async function loadIncomingRequests() {
    const status = document.getElementById('reqStatusFilter')?.value || 'pending';
    const tbody  = document.getElementById('requestsTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="td-load">Loading...</td></tr>`;
    try {
      const data  = await apiFetch('pending_requests&status=' + encodeURIComponent(status));
      const reqs  = data.requests || [];
      if (tbody) {
        tbody.innerHTML = reqs.length
          ? reqs.map(r => {
            const urgColor = r.urgency==='emergency'?'#ef4444':r.urgency==='urgent'?'#f59e0b':'#6b7280';
            const isPending = r.status === 'pending';
            const offerStatus = r.bank_offer_status;
            const offerCount  = r.bank_offer_count || 0;

            let actionHtml;
            if (!isPending) {
              actionHtml = `<span style="font-size:.72rem;color:var(--text-muted);">—</span>`;
            } else if (offerStatus === 'pending') {
              actionHtml = `
                <div style="display:flex;flex-direction:column;gap:3px;">
                  <span style="padding:4px 10px;border-radius:14px;font-size:.7rem;font-weight:700;
                    background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);color:#4ade80;">
                    ✅ Offered
                  </span>
                  <span style="font-size:.65rem;color:var(--text-muted);">Awaiting requester</span>
                </div>`;
            } else if (offerStatus === 'approved') {
              actionHtml = `
                <span style="padding:4px 10px;border-radius:14px;font-size:.7rem;font-weight:700;
                  background:rgba(74,222,128,.2);border:1px solid rgba(74,222,128,.5);color:#4ade80;">
                  🎯 Selected
                </span>`;
            } else if (offerStatus === 'rejected') {
              actionHtml = `
                <span style="padding:4px 10px;border-radius:14px;font-size:.7rem;font-weight:700;
                  background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171;">
                  ✕ Not Selected
                </span>`;
            } else {
              actionHtml = `
                <button class="table-btn" style="background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.4);color:#4ade80;"
                  onclick="approveReq(${r.id})">🩸 Offer Blood</button>
                <button class="table-btn" style="background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.4);color:#f87171;"
                  onclick="rejectReq(${r.id})">❌ Reject</button>`;
            }

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
          : `<tr><td colspan="9" class="td-load">No requests found.</td></tr>`;
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  /* Load submitted (outgoing) requests */
  async function loadRequests() {
    const tbody = document.getElementById('submittedRequestsTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted);">Loading...</td></tr>`;
    try {
      const data = await apiFetch('requests');
      const reqs = data.requests || [];
      if (tbody) {
        tbody.innerHTML = reqs.length
          ? reqs.map(r => `<tr>
              <td><strong>#${r.id}</strong></td>
              <td>${esc(r.patient_name || '—')}</td>
              <td><span style="color:#FF6B6B;font-weight:700;">${esc(r.blood_group)}</span></td>
              <td>${r.units_required}</td>
              <td><span class="status-badge ${urgencyBadge(r.urgency)}">${esc(r.urgency)}</span></td>
              <td><span class="status-badge ${statusBadge(r.status)}">${esc(r.status)}</span></td>
              <td>${fmtDate(r.requested_at)}</td>
              <td><button class="table-btn" onclick="trackRequest(${r.id})">Track</button></td>
            </tr>`).join('')
          : `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">No requests found.</td></tr>`;
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }
  window.loadRequests = loadRequests;

  /* Track request timeline */
  window.trackRequest = async (id) => {
    openModal('📅 Blood Request Timeline', '<div style="text-align:center;padding:16px;color:var(--text-muted);">Loading...</div>', null, 'Close');
    mConfirm.style.display = 'none';
    try {
      const data = await apiFetch(`track_request&id=${id}`);
      const r    = data.request;
      const tl   = data.timeline || [];

      const steps = ['pending', 'approved', 'processing', 'dispatched', 'delivered'];
      const curIdx = steps.indexOf(r.status);

      mBody.innerHTML = `
        <div style="margin-bottom:18px;">
          <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:4px;">Request #${r.id} · ${esc(r.blood_group)} · ${r.units_required} unit(s)</div>
          <div style="font-size:.82rem;">Patient: <strong>${esc(r.patient_name || '—')}</strong></div>
        </div>
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
          ${steps.map((s, i) => `
            <div style="text-align:center;flex:1;min-width:60px;">
              <div style="width:30px;height:30px;border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:.8rem;
                background:${i < curIdx ? '#4ade80' : i === curIdx ? '#fbbf24' : 'var(--border-color)'};
                color:${i <= curIdx ? '#000' : 'var(--text-muted)'};">
                ${i < curIdx ? '✓' : i === curIdx ? '⏳' : '○'}
              </div>
              <div style="font-size:.65rem;color:${i <= curIdx ? 'var(--text-primary)' : 'var(--text-muted)'};">${s}</div>
            </div>`).join('')}
        </div>
        ${tl.length
          ? `<div style="max-height:200px;overflow-y:auto;">
              ${tl.map(t => `<div style="padding:8px 0;border-bottom:1px solid var(--border-color);font-size:.8rem;">
                <strong>${esc(t.status)}</strong> · ${fmtDate(t.changed_at)}
                ${t.remarks ? `<div style="color:var(--text-muted);">${esc(t.remarks)}</div>` : ''}
              </div>`).join('')}
            </div>`
          : '<div style="color:var(--text-muted);font-size:.8rem;">No timeline entries yet.</div>'}`;
    } catch (e) {
      mBody.innerHTML = `<div style="color:#f87171;padding:12px;">❌ ${esc(e.message)}</div>`;
    }
  };

  /* Submit blood request */
  async function openSubmitRequest(patients) {
    const patientOptions = patients.length
      ? patients.map(p => `<option value="${p.id}">${esc(p.full_name)} (${esc(p.blood_group)})</option>`).join('')
      : '<option value="">No patients registered yet</option>';

    openModal('📝 Submit Blood Request',
      `<label style="display:block;margin-bottom:4px;">Patient</label>
       <select id="srPatient" style="${IS}margin-bottom:12px;">${patientOptions}</select>
       <label style="display:block;margin-bottom:4px;">Blood Group *</label>
       <select id="srBloodGroup" style="${IS}margin-bottom:12px;">
         <option value="">Select group</option>
         ${['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(g=>`<option>${g}</option>`).join('')}
       </select>
       <label style="display:block;margin-bottom:4px;">Units *</label>
       <input type="number" id="srUnits" min="1" max="20" value="1" style="${IS}margin-bottom:12px;">
       <label style="display:block;margin-bottom:4px;">Urgency</label>
       <select id="srUrgency" style="${IS}margin-bottom:12px;">
         <option value="normal">Normal</option>
         <option value="critical">Critical</option>
         <option value="emergency">Emergency</option>
       </select>
       <label style="display:block;margin-bottom:4px;">Required By (optional)</label>
       <input type="datetime-local" id="srRequiredBy" style="${IS}margin-bottom:12px;">
       <label style="display:block;margin-bottom:4px;">Notes</label>
       <textarea id="srNotes" rows="2" style="${IS}resize:vertical;"></textarea>`,
      async () => {
        const patientId  = document.getElementById('srPatient')?.value   || null;
        const bloodGroup = document.getElementById('srBloodGroup')?.value || '';
        const units      = parseInt(document.getElementById('srUnits')?.value || 1);
        const urgency    = document.getElementById('srUrgency')?.value   || 'normal';
        const requiredBy = document.getElementById('srRequiredBy')?.value || '';
        const notes      = document.getElementById('srNotes')?.value.trim() || '';

        if (!bloodGroup) { showToast('⚠️ Blood group is required.'); return; }
        try {
          const res = await apiFetch('submit_request', 'POST', {
            patient_id: patientId ? parseInt(patientId) : null,
            blood_group: bloodGroup, units, urgency,
            required_by: requiredBy, notes,
          });
          showToast(`✅ ${res.message}`);
          closeModal();
          loadIncomingRequests();
          loadRequests();
          loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Submit Request'
    );
  }

  /* ═══════════════════════════════════════════
     PATIENTS
  ═══════════════════════════════════════════ */
  async function loadPatients(search, bg, page) {
    search = search ?? document.getElementById('patSearch')?.value      ?? '';
    bg     = bg     ?? document.getElementById('patBloodFilter')?.value ?? '';
    page   = page   || 1;

    const tbody = document.getElementById('patientsTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Loading...</td></tr>`;

    try {
      const qs   = new URLSearchParams({ search, blood_group: bg, page }).toString();
      const data = await apiFetch('patients&' + qs);
      const pts  = data.patients || [];

      /* Summary cards */
      const summaryWrap = document.getElementById('patSummary');
      if (summaryWrap) {
        const s = data.summary || [];
        summaryWrap.innerHTML = s.map(r => `
          <div class="glass-card" style="padding:12px 16px;text-align:center;border-radius:12px;">
            <div style="font-size:1.1rem;font-weight:800;color:#FF6B6B;">${esc(r.blood_group)}</div>
            <div style="font-size:1.4rem;font-weight:800;">${r.total}</div>
            <div style="font-size:.7rem;color:var(--text-muted);">patients</div>
          </div>`).join('');
      }

      if (tbody) {
        tbody.innerHTML = pts.length
          ? pts.map(p => `<tr>
              <td>${p.national_id ? `<strong>${esc(p.national_id)}</strong>` : '—'}</td>
              <td>${esc(p.full_name)}</td>
              <td><span style="color:#FF6B6B;font-weight:700;">${esc(p.blood_group || '—')}</span></td>
              <td>${fmtDate(p.date_of_birth, true) || '—'}</td>
              <td>${esc(p.phone || '—')}</td>
              <td>${fmtDate(p.created_at, true)}</td>
            </tr>`).join('')
          : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No patients found.</td></tr>`;
      }

      txt('patTableCount', `Showing ${pts.length} of ${data.total_rows || 0}`);
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }
  window.loadPatients = loadPatients;

  /* Add patient modal */
  function openAddPatient() {
    openModal('👤 Register New Patient',
      `<label style="display:block;margin-bottom:4px;">Full Name *</label>
       <input type="text" id="apName" placeholder="Patient full name" style="${IS}margin-bottom:12px;">
       <label style="display:block;margin-bottom:4px;">Blood Group *</label>
       <select id="apBloodGroup" style="${IS}margin-bottom:12px;">
         <option value="">Select group</option>
         ${['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(g=>`<option>${g}</option>`).join('')}
       </select>
       <label style="display:block;margin-bottom:4px;">Phone *</label>
       <input type="tel" id="apPhone" placeholder="Phone number" style="${IS}margin-bottom:12px;">
       <label style="display:block;margin-bottom:4px;">National ID (optional)</label>
       <input type="text" id="apNationalId" placeholder="National ID" style="${IS}margin-bottom:12px;">
       <label style="display:block;margin-bottom:4px;">Date of Birth</label>
       <input type="date" id="apDob" style="${IS}margin-bottom:12px;">
       <label style="display:block;margin-bottom:4px;">Address</label>
       <input type="text" id="apAddress" placeholder="Address" style="${IS}">`,
      async () => {
        const name    = document.getElementById('apName')?.value.trim();
        const bg      = document.getElementById('apBloodGroup')?.value;
        const phone   = document.getElementById('apPhone')?.value.trim();
        const natId   = document.getElementById('apNationalId')?.value.trim();
        const dob     = document.getElementById('apDob')?.value;
        const address = document.getElementById('apAddress')?.value.trim();

        if (!name)  { showToast('⚠️ Full name required.'); return; }
        if (!bg)    { showToast('⚠️ Blood group required.'); return; }
        if (!phone) { showToast('⚠️ Phone required.'); return; }

        try {
          const res = await apiFetch('add_patient', 'POST', {
            full_name: name, blood_group: bg, phone,
            national_id: natId, date_of_birth: dob, address,
          });
          showToast(`✅ ${res.message}`);
          closeModal();
          loadPatients();
          loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Register Patient'
    );
  }

  /* ═══════════════════════════════════════════
     DEMAND ANALYTICS
  ═══════════════════════════════════════════ */
  async function loadDemand() {
    try {
      const data = await apiFetch('demand_analytics');
      const s = data.summary || {};

      /* Stat cards */
      txt('dStatTotal',    s.total_requests ?? '—');
      txt('dStatPending',  s.pending ?? '—');
      txt('dStatUrgent',   s.urgent ?? '—');
      txt('dStatFulfilled', s.fulfilled ?? '—');
      txt('dStatUnits',    s.total_units ?? '—');
      txt('dStatGroups',   s.unique_groups ?? '—');

      /* By blood group */
      const bgWrap = document.getElementById('demandByGroupWrap');
      if (bgWrap) {
        const bg = data.by_group || [];
        if (bg.length) {
          const maxV = Math.max(...bg.map(d => parseInt(d.total_requests)));
          bgWrap.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px;">
            ${bg.map(d => {
              const pct = maxV > 0 ? Math.round((parseInt(d.total_requests) / maxV) * 100) : 0;
              const urgColor = d.urgent > 0 ? '#ef4444' : '#6b7280';
              return `<div>
                <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:4px;">
                  <span style="font-weight:700;color:#FF6B6B;">${esc(d.blood_group)}</span>
                  <span style="color:var(--text-muted);">${d.total_requests} req · ${d.total_units} units ${d.urgent > 0 ? `<span style="color:#ef4444;">· ${d.urgent} urgent</span>` : ''}</span>
                </div>
                <div style="height:28px;background:var(--table-border);border-radius:6px;overflow:hidden;position:relative;">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#FF6B6B,${urgColor});border-radius:6px;transition:width 0.6s ease;"></div>
                </div>
              </div>`;
            }).join('')}
          </div>`;
        } else {
          bgWrap.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.82rem;">No requests this month.</div>';
        }
      }

      /* Monthly trend */
      const trWrap = document.getElementById('demandTrendWrap');
      if (trWrap) {
        const trend = data.trend || [];
        if (trend.length) {
          const maxV = Math.max(...trend.map(t => parseInt(t.total)));
          trWrap.innerHTML = `<div style="display:flex;align-items:flex-end;gap:8px;height:140px;padding:4px 0;">
            ${trend.map(t => {
              const pct = maxV > 0 ? Math.round((parseInt(t.total) / maxV) * 100) : 0;
              const urgPct = parseInt(t.urgent) > 0 ? Math.round((parseInt(t.urgent) / parseInt(t.total)) * 100) : 0;
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
                <div style="font-size:.6rem;color:var(--text-muted);">${t.total}</div>
                <div style="width:100%;position:relative;height:${pct}%;min-height:6px;background:linear-gradient(180deg,#FF6B6B,${parseInt(t.urgent)>0?'#ef4444':'#f59e0b'});border-radius:4px 4px 0 0;transition:height 0.5s ease;">
                  ${urgPct > 0 ? `<div style="position:absolute;top:0;left:0;right:0;height:${urgPct}%;background:#ef4444;border-radius:4px 4px 0 0;opacity:0.5;"></div>` : ''}
                </div>
                <div style="font-size:.58rem;color:var(--text-muted);text-align:center;white-space:nowrap;">${esc(t.month_label)}</div>
              </div>`;
            }).join('')}
          </div>`;
        } else {
          trWrap.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.82rem;">No trend data available.</div>';
        }
      }

      /* Status breakdown */
      const stWrap = document.getElementById('demandStatusWrap');
      if (stWrap) {
        const st = data.status_breakdown || [];
        if (st.length) {
          stWrap.innerHTML = st.map(s => {
            const colors = { pending: '#fbbf24', approved: '#4ade80', rejected: '#ef4444', processing: '#60a5fa', dispatched: '#a78bfa', delivered: '#34d399' };
            const color = colors[s.status] || '#6b7280';
            return `<div class="glass-card" style="padding:16px 22px;text-align:center;border-radius:14px;min-width:110px;flex:1;">
              <div style="font-size:1.6rem;font-weight:800;color:${color};">${s.total}</div>
              <div style="font-size:.72rem;color:var(--text-muted);text-transform:capitalize;">${esc(s.status)}</div>
            </div>`;
          }).join('');
        } else {
          stWrap.innerHTML = '<div style="padding:10px;text-align:center;color:var(--text-muted);font-size:.82rem;width:100%;">No data.</div>';
        }
      }
    } catch (err) {
      handleErr(err);
      ['dStatTotal','dStatPending','dStatUrgent','dStatFulfilled','dStatUnits','dStatGroups'].forEach(id => txt(id, '⚠️'));
    }
  }

  /* ═══════════════════════════════════════════
     DEMAND SIGNAL MAP (Leaflet)
  ═══════════════════════════════════════════ */
  let demandMapInstance = null;

  async function loadMap() {
    const container = document.getElementById('demandMapContainer');
    if (!container) return;

    /* Destroy previous map instance */
    if (demandMapInstance) {
      demandMapInstance.remove();
      demandMapInstance = null;
    }

    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">Loading map...</div>';

    try {
      const data = await apiFetch('demand_map');
      const mcLoc    = data.mc_location || {};
      const banks    = data.nearby_banks || [];
      const signals  = data.demand_signals || [];

      const lat = mcLoc.lat || 23.7642;
      const lng = mcLoc.lng || 90.3800;

      const map = L.map(container, {
        center: [lat, lng],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      /* MC location marker */
      const mcIcon = L.divIcon({
        html: '<div style="width:22px;height:22px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.3),0 2px 8px rgba(0,0,0,.25);border:2px solid #fff;"></div>',
        iconSize: [22,22],
        iconAnchor: [11,11],
        className: '',
      });
      L.marker([lat, lng], { icon: mcIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:Outfit,sans-serif;min-width:180px;">
            <div style="font-weight:700;font-size:.9rem;margin-bottom:4px;">📍 ${esc(mcLoc.name || 'Medical College')}</div>
            <div style="font-size:.75rem;color:#666;">${esc(mcLoc.address || '')}</div>
          </div>
        `, { closeButton: false });

      /* Nearby blood banks */
      const bankIcon = L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.2);"></div>',
        iconSize: [16,16],
        iconAnchor: [8,8],
        className: '',
      });
      banks.forEach(b => {
        const bLat = parseFloat(b.latitude);
        const bLng = parseFloat(b.longitude);
        if (!bLat || !bLng) return;
        L.marker([bLat, bLng], { icon: bankIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Outfit,sans-serif;min-width:160px;">
              <div style="font-weight:600;font-size:.85rem;">🏥 ${esc(b.name || 'Blood Bank')}</div>
              <div style="font-size:.72rem;color:#666;">${esc(b.address_line || '')}${b.city ? ', '+esc(b.city) : ''}</div>
              ${b.phone ? `<div style="font-size:.72rem;color:#666;">📞 ${esc(b.phone)}</div>` : ''}
              ${b.rating_avg ? `<div style="font-size:.72rem;color:#f59e0b;">⭐ ${parseFloat(b.rating_avg).toFixed(1)}</div>` : ''}
            </div>
          `, { closeButton: false });
      });

      /* Demand hotspot markers */
      const demandColors = { 'A+':'#ef4444','A-':'#f97316','B+':'#3b82f6','B-':'#06b6d4','O+':'#22c55e','O-':'#14b8a6','AB+':'#a855f7','AB-':'#ec4899' };
      const signalIcon = (color) => L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.2);"></div>`,
        iconSize: [14,14],
        iconAnchor: [7,7],
        className: '',
      });

      /* Place demand signals in a ring around the MC */
      const signalPositions = [
        { lat: 0.025, lng: 0.025 }, { lat: -0.025, lng: 0.02 }, { lat: 0.02, lng: -0.025 },
        { lat: -0.02, lng: -0.02 }, { lat: 0.03, lng: -0.01 }, { lat: -0.015, lng: 0.03 },
        { lat: 0.01, lng: 0.03 }, { lat: -0.025, lng: -0.015 },
      ];

      signals.forEach((s, i) => {
        const color = demandColors[s.blood_group] || '#f59e0b';
        const pos = signalPositions[i % signalPositions.length];
        const sLat = lat + pos.lat;
        const sLng = lng + pos.lng;
        L.marker([sLat, sLng], { icon: signalIcon(color) })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Outfit,sans-serif;min-width:170px;">
              <div style="font-weight:700;font-size:.9rem;margin-bottom:4px;">🩸 ${esc(s.blood_group)}</div>
              <div style="font-size:.75rem;color:#666;">
                ${s.total_requests} request(s) · ${s.total_units} units<br>
                ${parseInt(s.urgent) > 0 ? `<span style="color:#ef4444;">⚠️ ${s.urgent} urgent</span>` : '✅ No urgent'}
              </div>
            </div>
          `, { closeButton: false });
      });

      /* Fit bounds to show all markers */
      const allPoints = [[lat, lng], ...banks.filter(b => b.latitude && b.longitude).map(b => [parseFloat(b.latitude), parseFloat(b.longitude)])];
      if (allPoints.length > 1) {
        map.fitBounds(allPoints, { padding: [40, 40], maxZoom: 14 });
      }

      demandMapInstance = map;
      txt('mapLastUpdated', 'Updated: ' + new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }));

      /* Invalidate size after a short delay (fixes rendering in hidden divs) */
      setTimeout(() => map.invalidateSize(), 200);
    } catch (err) {
      handleErr(err);
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</div>`;
    }
  }

  window.loadMap = loadMap;

  /* ═══════════════════════════════════════════
     PROFILE
  ═══════════════════════════════════════════ */
  async function loadProfile() {
    try {
      const data = await apiFetch('profile');
      const p    = data.profile;
      const init = p.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

      const av = document.getElementById('profileAvatarFallback');
      if (av) av.textContent = init;

      const rating = parseFloat(p.rating_avg) || 0;
      const badge  = rating>=4.5?'Gold':rating>=3.5?'Silver':rating>=2.5?'Bronze':'Standard';
      const badgeIcon = rating>=4.5?'🏆':rating>=3.5?'🥈':rating>=2.5?'🥉':'🏛️';

      txt('profileCollegeName', p.name);
      txt('profileUID',         `UID: ${p.registration_no}-${new Date(p.created_at).getFullYear()}`);
      txt('profileRegNo',       p.registration_no);
      txt('profileEstYear',     new Date(p.created_at).getFullYear());
      txt('profileEmail',       p.email);
      txt('profilePhone',       p.phone||'—');
      txt('profileAddress',     [p.address_line,p.city,p.state].filter(Boolean).join(', ')||'—');
      txt('profileCountry',     p.country||'Bangladesh');
      txt('sidebarUserName',    p.name);

      const statusPill = document.getElementById('profileStatusPill');
      if (statusPill) {
        statusPill.textContent = p.status||'Active';
        statusPill.style.background = p.status==='active'?'rgba(74,222,128,0.2)':'rgba(239,68,68,0.2)';
        statusPill.style.color = p.status==='active'?'#4ade80':'#f87171';
      }

      const badgePill = document.getElementById('profileBadgePill');
      if (badgePill) badgePill.textContent = `${badgeIcon} ${badge} Badge — Verified Institution`;

      const badgeIconEl = document.getElementById('profileBadgeIcon');
      if (badgeIconEl) badgeIconEl.textContent = badgeIcon;

      txt('psrRequests', data.total_requests || '0');
      txt('psrPatients', data.total_patients  || '0');
      txt('psrPromises', data.total_promises  || '0');
      txt('psrRating',   rating.toFixed(1));

      const resp   = data.response_rate || 0;
      const fulf   = data.fulfillment_rate || 0;
      const qual   = data.quality_score || 0;
      txt('psmResponse',    resp > 0 ? resp + '%' : '—');
      txt('psmFulfillment', fulf > 0 ? fulf + '%' : '—');
      txt('psmQuality',     qual > 0 ? qual + '%' : '—');
      const rb = document.getElementById('psmResponseBar');
      if (rb) rb.style.width = resp + '%';
      const fb = document.getElementById('psmFulfillmentBar');
      if (fb) fb.style.width = fulf + '%';
      const qb = document.getElementById('psmQualityBar');
      if (qb) qb.style.width = qual + '%';

      const sa = document.getElementById('sidebarAvatar');
      if (sa) sa.textContent = init;

    } catch (err) {
      handleErr(err);
      showToast('❌ Profile load failed: ' + err.message, 5000);
    }
  }

  /* Edit profile */
  document.getElementById('editProfileBtn')?.addEventListener('click', async () => {
    try {
      const data = await apiFetch('profile');
      const p    = data.profile;
      openModal('✏️ Edit Profile',
        `<div style="display:flex;flex-direction:column;gap:16px;">
           <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
             <div style="grid-column:1/-1">
               <label style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;">College Name <span style="color:#f87171;">*</span></label>
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
            await apiFetch('update_profile', 'POST', {
              name, email,
              phone:        document.getElementById('epPhone')?.value.trim(),
              address_line: document.getElementById('epAddr')?.value.trim(),
              city:         document.getElementById('epCity')?.value.trim(),
              state:        document.getElementById('epState')?.value.trim(),
              country:      document.getElementById('epCountry')?.value.trim(),
            });
            showToast('✅ Profile updated!');
            closeModal();
            loadProfile();
          } catch (e) { showToast('❌ ' + e.message, 5000); }
        }, 'Save Changes'
      );
    } catch (e) { showToast('❌ ' + e.message, 5000); }
  });

  /* Rate a blood bank */
  async function openRateBank() {
    openModal('⭐ Rate a Blood Bank',
      '<div style="padding:16px;text-align:center;color:var(--text-muted);">Loading banks...</div>',
      null, 'Submit Rating'
    );
    try {
      const data  = await apiFetch('blood_banks');
      const banks = data.banks || [];

      if (!banks.length) {
        mBody.innerHTML = '<div style="color:#fbbf24;padding:12px;">No blood banks found.</div>';
        mConfirm.style.display = 'none';
        return;
      }

      mConfirm.style.display = '';
      mBody.innerHTML = `
        <label style="display:block;margin-bottom:4px;">Select Blood Bank *</label>
        <select id="rateBankId" style="${IS}margin-bottom:12px;">
          ${banks.map(b => `<option value="${b.id}">${esc(b.name)} — ${esc(b.city || '')} (${parseFloat(b.rating_avg||0).toFixed(1)}⭐)</option>`).join('')}
        </select>
        <label style="display:block;margin-bottom:4px;">Rating *</label>
        <select id="rateScore" style="${IS}margin-bottom:12px;">
          <option value="5">⭐⭐⭐⭐⭐ Excellent (5)</option>
          <option value="4">⭐⭐⭐⭐ Good (4)</option>
          <option value="3">⭐⭐⭐ Average (3)</option>
          <option value="2">⭐⭐ Poor (2)</option>
          <option value="1">⭐ Very Poor (1)</option>
        </select>
        <label style="display:block;margin-bottom:4px;">Comments</label>
        <textarea id="rateText" rows="3" placeholder="Your feedback..." style="${IS}resize:vertical;"></textarea>`;

      mAction = async () => {
        const bankId     = parseInt(document.getElementById('rateBankId')?.value || 0);
        const rating     = parseInt(document.getElementById('rateScore')?.value  || 5);
        const reviewText = document.getElementById('rateText')?.value.trim();
        if (!bankId) { showToast('⚠️ Select a bank.'); return; }
        try {
          await apiFetch('submit_rating', 'POST', { bank_id: bankId, rating, review_text: reviewText });
          showToast('✅ Rating submitted. Thank you!');
          closeModal();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      };
    } catch (e) {
      mBody.innerHTML = `<div style="color:#f87171;padding:12px;">❌ ${esc(e.message)}</div>`;
    }
  }

  /* ─────────────────────────────────────
     ACTION CARD HANDLERS
  ───────────────────────────────────── */
  const ACTION_MAP = {
    submitRequest:      async () => { const d = await apiFetch('patients&page=1'); openSubmitRequest(d.patients || []); },
    trackTimeline:      ()        => navigateTo('requests'),
    registerPatient:    ()        => openAddPatient(),
    manageRegistry:     ()        => navigateTo('patients'),
    viewDemandMap:      ()        => navigateTo('map'),
    rateBank:           ()        => openRateBank(),
    proximityAnalytics: ()        => navigateTo('demand'),
    inventoryManager:   ()        => navigateTo('inventory'),
  };

  document.querySelectorAll('.action-card[data-action]').forEach(card => {
    card.addEventListener('click', () => {
      const fn = ACTION_MAP[card.dataset.action];
      if (fn) fn();
      else showToast('Feature coming soon.');
    });
  });

  /* Dashboard button wiring */
  document.getElementById('refreshRequestsBtn')?.addEventListener('click',  () => loadDashboard());
  document.getElementById('viewAllRequestsLink')?.addEventListener('click', e => { e.preventDefault(); navigateTo('requests'); });
  document.getElementById('manageRegistryLink')?.addEventListener('click',  e => { e.preventDefault(); navigateTo('patients'); });
  document.getElementById('viewDemandMapBtn')?.addEventListener('click',    () => navigateTo('demand'));
  document.getElementById('viewDemandSignalBtn')?.addEventListener('click', () => navigateTo('demand'));

  /* Requests view filters */
  document.getElementById('reqStatusFilter')?.addEventListener('change', () => loadIncomingRequests());
  document.getElementById('addRequestPageBtn')?.addEventListener('click', async () => {
    const d = await apiFetch('patients&page=1').catch(() => ({ patients: [] }));
    openSubmitRequest(d.patients || []);
  });
  document.getElementById('refreshRequestsPageBtn')?.addEventListener('click', () => {
    loadIncomingRequests(); loadRequests();
  });
  document.getElementById('refreshDemandPageBtn')?.addEventListener('click', loadDemand);
  document.getElementById('refreshMapPageBtn')?.addEventListener('click', loadMap);

  /* Patients view filters */
  document.getElementById('patBloodFilter')?.addEventListener('change', () => loadPatients());
  let patTimer;
  document.getElementById('patSearch')?.addEventListener('input', () => {
    clearTimeout(patTimer); patTimer = setTimeout(() => loadPatients(), 400);
  });
  document.getElementById('addPatientBtn')?.addEventListener('click', () => openAddPatient());

  /* Logout */
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try { await apiFetch('logout', 'POST'); } catch (_) {}
    window.location.href = 'login.html';
  });


  /* ══════════════════════════════════════════════
     ADMIN WARNING RESPONSE — medical college
  ══════════════════════════════════════════════ */
  window.openWarningResponseMC = function(warningId, warningMsg) {
    openModal('📋 Respond to Admin Warning',
      `<div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;padding:12px;margin-bottom:16px;font-size:.82rem;">
        <strong style="color:#fbbf24;">⚠️ Warning:</strong>
        <div style="color:var(--text-muted);margin-top:4px;">${esc(warningMsg)}</div>
      </div>
      <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:14px;">Choose how you want to respond:</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button onclick="openAckMC(${warningId})"
          style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25);cursor:pointer;text-align:left;width:100%;">
          <span style="font-size:1.4rem;">✅</span>
          <div><div style="font-weight:700;color:#4ade80;">Acknowledge Warning</div><div style="font-size:.75rem;color:var(--text-muted);">Confirm receipt. Dismisses from dashboard.</div></div>
        </button>
        <button onclick="openImproveMC(${warningId})"
          style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.25);cursor:pointer;text-align:left;width:100%;">
          <span style="font-size:1.4rem;">📝</span>
          <div><div style="font-weight:700;color:#60a5fa;">Submit Improvement Plan</div><div style="font-size:.75rem;color:var(--text-muted);">Describe the steps you are taking.</div></div>
        </button>
        <button onclick="openAppealMC(${warningId})"
          style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);cursor:pointer;text-align:left;width:100%;">
          <span style="font-size:1.4rem;">⚖️</span>
          <div><div style="font-weight:700;color:#f87171;">Appeal Warning</div><div style="font-size:.75rem;color:var(--text-muted);">Disagree? Submit an appeal.</div></div>
        </button>
      </div>`,
      null, 'Close'
    );
    mConfirm.style.display = 'none';
  };

  window.openAckMC = function(warningId) {
    openModal('✅ Acknowledge Warning',
      `<div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.22);border-radius:10px;padding:14px;font-size:.83rem;">
        <p style="margin:0 0 8px;font-weight:600;color:#4ade80;">Acknowledge this warning.</p>
        <p style="margin:0;color:var(--text-muted);">It will be dismissed from your dashboard.</p>
      </div>`,
      async () => {
        try {
          await apiFetch('acknowledge_warning', 'POST', { warning_id: warningId });
          showToast('✅ Warning acknowledged.');
          closeModal(); loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Confirm Acknowledgement'
    );
    mConfirm.style.display = '';
  };

  window.openImproveMC = function(warningId) {
    openModal('📝 Submit Improvement Plan',
      `<label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Improvement Plan *</label>
       <textarea id="impPlanMC" rows="6" placeholder="Describe the steps you are taking..."
         style="${IS}resize:vertical;min-height:120px;"></textarea>
       <div style="font-size:.7rem;color:var(--text-muted);margin-top:6px;">Minimum 10 characters required.</div>`,
      async () => {
        const plan = document.getElementById('impPlanMC')?.value.trim();
        if (!plan || plan.length < 10) { showToast('⚠️ Please write a detailed plan.'); return; }
        try {
          await apiFetch('submit_improvement', 'POST', { warning_id: warningId, plan });
          showToast('✅ Improvement plan submitted.');
          closeModal(); loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Submit Plan'
    );
    mConfirm.style.display = '';
  };

  window.openAppealMC = function(warningId) {
    openModal('⚖️ Appeal Warning',
      `<label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Appeal Reason *</label>
       <textarea id="appReasonMC" rows="6" placeholder="Explain why this warning should be reconsidered..."
         style="${IS}resize:vertical;min-height:120px;"></textarea>
       <div style="font-size:.7rem;color:var(--text-muted);margin-top:6px;">Minimum 10 characters required.</div>`,
      async () => {
        const reason = document.getElementById('appReasonMC')?.value.trim();
        if (!reason || reason.length < 10) { showToast('⚠️ Please provide a detailed reason.'); return; }
        try {
          await apiFetch('appeal_warning', 'POST', { warning_id: warningId, reason });
          showToast('✅ Appeal submitted.');
          closeModal(); loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Submit Appeal'
    );
    mConfirm.style.display = '';
  };

  window.openAllWarningsMC = async function() {
    openModal('⚠️ All Pending Warnings', '<div style="text-align:center;padding:16px;color:var(--text-muted);">Loading...</div>', null, 'Close');
    mConfirm.style.display = 'none';
    try {
      const data = await apiFetch('get_warnings');
      const warnings = data.warnings || [];
      if (!warnings.length) {
        mBody.innerHTML = '<div style="padding:20px;text-align:center;color:#4ade80;">✅ No pending warnings.</div>';
        return;
      }
      window._pendingWarningsMC = {};
      warnings.forEach(w => { window._pendingWarningsMC[w.id] = w.message || ''; });
      mBody.innerHTML = `<div id="awListMC" style="display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;">
        ${warnings.map(w => `
          <div style="padding:14px;border-radius:10px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
              <div style="flex:1;">
                <div style="font-size:.82rem;color:var(--text-primary);">${esc(w.message||'')}</div>
                <div style="font-size:.68rem;color:var(--text-muted);margin-top:4px;">${fmtDate(w.sent_at)}</div>
              </div>
              <button class="btn-ghost-sm aw-btn-mc" data-wid="${w.id}"
                style="background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.4);color:#fbbf24;flex-shrink:0;font-size:.72rem;">
                📋 Respond
              </button>
            </div>
          </div>`).join('')}
      </div>`;
      document.getElementById('awListMC')?.addEventListener('click', function(e) {
        const btn = e.target.closest('.aw-btn-mc');
        if (!btn) return;
        const wid = parseInt(btn.dataset.wid);
        const msg = (window._pendingWarningsMC[wid] || '').slice(0, 120);
        closeModal();
        setTimeout(() => openWarningResponseMC(wid, msg), 150);
      });
    } catch(e) {
      mBody.innerHTML = `<div style="color:#f87171;padding:12px;">❌ ${esc(e.message)}</div>`;
    }
  };

  /* ── Emergency Broadcasts ── */
  async function loadEmergency() {
    loadIncomingEmergencyMc();
    loadSentBroadcastsMc();
    loadIncomingBroadcastsMc();
    loadEmergencyStatsMc();
  }

  async function loadEmergencyStatsMc() {
    try {
      const [sentData, incData, bcData] = await Promise.all([
        apiFetch('sent_broadcasts'),
        apiFetch('emergency_requests'),
        apiFetch('broadcasts_list'),
      ]);
      const broadcasts = sentData.broadcasts || [];
      const incoming = incData.requests || [];
      const fromBanks = bcData.broadcasts || [];
      const active = broadcasts.filter(b => b.status === 'pending').length;
      const totalReached = broadcasts.reduce((s, b) => s + (b.matched_donor_count || 0), 0);
      const st = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      st('mcEmStatActive', active);
      st('mcEmStatTotal', broadcasts.length);
      st('mcEmStatReached', totalReached);
      st('mcEmStatIncoming', incoming.length + fromBanks.length);
    } catch (e) { /* stats fail silently */ }
  }

  async function loadSentBroadcastsMc() {
    const tbody = document.getElementById('mcSentBroadcastsBody');
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

  async function loadIncomingBroadcastsMc() {
    const bcBody = document.getElementById('mcBroadcastsBody');
    if (!bcBody) return;
    bcBody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const bcData = await apiFetch('broadcasts_list');
      const bcs = bcData.broadcasts || [];
      if (!bcs.length) {
        bcBody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">✅ No active broadcasts from blood banks.</td></tr>';
        return;
      }
      bcBody.innerHTML = bcs.map((b, i) => {
        const rating = parseFloat(b.bank_rating) || 0;
        const stars = rating > 0 ? '⭐'.repeat(Math.round(rating)) : '';
        return `<tr>
          <td>${i + 1}</td>
          <td>
            <strong>${esc(b.bank_name || b.requester_name || 'Unknown')}</strong>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px;">${stars} ${rating > 0 ? rating.toFixed(1) : ''} ${esc(b.bank_city || '')}</div>
          </td>
          <td><span class="status-badge badge-danger">${esc(b.blood_group || '?')}</span></td>
          <td>${b.units || '—'}</td>
          <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(b.location || '')}">${esc(b.location || '—')}</td>
          <td>${b.recipients_reached || 0}</td>
          <td><span class="status-badge ${b.status === 'pending' ? 'badge-urgent' : 'badge-ok'}">${esc(b.status)}</span></td>
          <td>${fmtDate(b.broadcasted_at) || '—'}</td>
          <td>
            <button class="btn-primary btn-sm" onclick="approveEmerg(${b.id})">✅ Respond</button>
            <button class="btn-ghost-sm" style="margin-left:4px;" onclick="ignoreEmerg(${b.id})">✕ Ignore</button>
          </td>
        </tr>`;
      }).join('');
    } catch (e) {
      bcBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#f87171;padding:24px;">❌ ${esc(e.message)}</td></tr>`;
    }
  }

  async function loadIncomingEmergencyMc() {
    const vrBody = document.getElementById('emergencyRequestsBody');
    if (!vrBody) return;
    vrBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const vrData = await apiFetch('emergency_requests');
      const vrs = vrData.requests || [];
      if (!vrs.length) {
        vrBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">✅ No pending voice requests.</td></tr>';
        return;
      }
      vrBody.innerHTML = vrs.map((r, i) => {
        const canFulfill = r.can_fulfill === true || r.can_fulfill === 1;
        const actionHtml = canFulfill
          ? `<button class="btn-primary btn-sm" onclick="approveEmerg(${r.id}, '${esc(r.blood_group)}')"
               style="background:linear-gradient(135deg,#16a34a,#15803d);border-color:#16a34a;">
               ✅ Approve
             </button>
             <button class="btn-ghost-sm" style="margin-left:4px;" onclick="ignoreEmerg(${r.id})">✕ Ignore</button>`
          : `<span style="font-size:.7rem;color:#fbbf24;background:rgba(251,191,36,.1);
               border:1px solid rgba(251,191,36,.3);padding:4px 10px;border-radius:12px;display:inline-block;">
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
      vrBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#f87171;padding:24px;">❌ ${esc(e.message)}</td></tr>`;
    }
  }

  window.approveEmerg = async function(id, bloodGroup) {
    openModal('🚨 Confirm Blood Supply',
      `<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.25);border-radius:12px;padding:16px 18px;">
        <div style="font-weight:700;color:#4ade80;font-size:.9rem;margin-bottom:8px;">✅ Confirm Blood Supply</div>
        <div style="font-size:.82rem;color:var(--text-muted);line-height:1.7;">
          You are confirming your medical college can supply
          <strong style="color:#4ade80;">${bloodGroup || 'the requested'}</strong> blood immediately.<br><br>
          🩸 The requester will be notified with your contact details.<br>
          ⚡ Please respond as quickly as possible.
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
    openModal('⏭️ Dismiss Emergency',
      `<div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:12px;padding:16px 18px;">
        <div style="font-weight:700;color:#fbbf24;font-size:.9rem;margin-bottom:8px;">⏭️ Dismiss</div>
        <div style="font-size:.82rem;color:var(--text-muted);line-height:1.7;">
          This emergency will be dismissed from your queue.<br>
          The requester will not be notified.
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

  async function sendEmergencyBroadcastMc() {
    const bg = document.getElementById('mcEmBloodGroup').value;
    const units = parseInt(document.getElementById('mcEmUnits').value) || 1;
    const notes = document.getElementById('mcEmNotes').value.trim();
    const targets = Array.from(document.querySelectorAll('.em-targets-grid input[type="checkbox"]:checked')).map(cb => cb.value);

    if (!bg) { showToast('❌ Please select a blood group.', 3000); return; }
    if (!targets.length) { showToast('❌ Select at least one target recipient type.', 3000); return; }

    const btn = document.getElementById('mcSendEmergencyBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Sending...';

    try {
      const res = await apiFetch('send_emergency_broadcast', 'POST', {
        blood_group: bg, units, notes, targets,
      });
      showToast('✅ ' + (res.message || 'Broadcast sent!'), 5000);
      document.getElementById('mcEmBloodGroup').value = '';
      document.getElementById('mcEmUnits').value = '2';
      document.getElementById('mcEmNotes').value = '';
      document.querySelectorAll('.em-targets-grid input[type="checkbox"]').forEach(cb => cb.checked = true);
      loadEmergency();
    } catch (e) {
      showToast('❌ ' + e.message, 5000);
    } finally {
      btn.disabled = false;
      btn.textContent = '🚨 Send Emergency Broadcast';
    }
  }

  function setupMcEmergencyEvents() {
    document.getElementById('mcSendEmergencyBtn')?.addEventListener('click', sendEmergencyBroadcastMc);
    document.getElementById('mcRefreshSentBroadcastsBtn')?.addEventListener('click', () => { loadSentBroadcastsMc(); loadEmergencyStatsMc(); });
    document.getElementById('mcRefreshBroadcastsBtn')?.addEventListener('click', () => { loadIncomingBroadcastsMc(); loadEmergencyStatsMc(); });
    document.getElementById('mcRefreshVoiceBtn')?.addEventListener('click', () => { loadIncomingEmergencyMc(); loadEmergencyStatsMc(); });
  }



  /* ─────────────────────────────────────
     BLOOD REQUESTS — accept/reject (like bank portal)
  ───────────────────────────────────── */
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
          loadIncomingRequests(); loadRequests();
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
          loadIncomingRequests(); loadRequests();
        } catch (e) { showToast('❌ '+e.message, 5000); }
      },
      '✕ Yes, Reject'
    );
  };

  /* ─────────────────────────────────────
     PROMISES
  ───────────────────────────────────── */
  async function loadPromises(status) {
    status = status || document.getElementById('promiseStatusFilter')?.value || '';
    const tbody = document.getElementById('promiseTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="td-load">Loading...</td></tr>`;
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
          : `<tr><td colspan="7" class="td-load">No donation promises found.</td></tr>`;
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  /* Promise actions */
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

  /* ─────────────────────────────────────
     INVENTORY
  ───────────────────────────────────── */
  async function loadInventoryMc(type, status, search, page) {
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
          return `<div class="glass-card inv-type-card" data-type="${g}" style="cursor:pointer;" onclick="document.getElementById('invTypeFilter').value='${g}';loadInventoryMc()">
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
              <td>${bag.status==='available'?`<button class="table-btn" onclick="allocateBagMc(${bag.id},'${esc(bag.bag_barcode)}')">Allocate</button>`:'—'}</td>
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
          .map(i=>`<button class="page-btn ${i===page?'active':''}" onclick="loadInventoryMc('','','',${i})">${i}</button>`)
          .join('');
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
    initReveal();
  }

  window.loadInventoryMc = loadInventoryMc;

  window.allocateBagMc = async (id, barcode) => {
    try {
      await apiFetch('allocate_bag', 'POST', { bag_id: id });
      showToast(`✅ Bag #${barcode} marked as reserved.`);
      loadDashboard();
    } catch (e) { showToast('❌ ' + e.message, 5000); }
  };

  /* ─────────────────────────────────────
     INIT
  ───────────────────────────────────── */
  function init() {
    initReveal();
    setupMcEmergencyEvents();

    /* Promise event listeners */
    document.getElementById('promiseStatusFilter')?.addEventListener('change', () => loadPromises());
    document.getElementById('verifyPromiseBtn')?.addEventListener('click', async () => {
      const code   = document.getElementById('promiseCodeInput')?.value.trim();
      const resDiv = document.getElementById('promiseResult');
      if (!code) { showToast('⚠️ Enter a confirmation code.'); return; }
      if (resDiv) resDiv.innerHTML = '<div style="padding:8px;color:var(--text-muted);">Verifying...</div>';
      try {
        const data = await apiFetch('verify_promise','POST',{ confirmation_code:code });
        const pr   = data.promise;
        if (resDiv) resDiv.innerHTML = `
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

    /* Profile buttons */
    document.getElementById('rateBankBtn')?.addEventListener('click', openRateBank);
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
      openModal('🔒 Change Password',
        `<p style="font-size:.82rem;color:var(--text-muted);margin-bottom:16px;">Enter your new password below. Must be at least 8 characters.</p>
         <label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Current Password</label>
         <input type="password" id="cpCurrent" style="${IS}margin-bottom:12px;" placeholder="Enter current password">
         <label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">New Password</label>
         <input type="password" id="cpNew" style="${IS}margin-bottom:12px;" placeholder="Enter new password (min 8 chars)">
         <label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Confirm New Password</label>
         <input type="password" id="cpConfirm" style="${IS}" placeholder="Confirm new password">`,
        async () => {
          const current = document.getElementById('cpCurrent')?.value;
          const newPw   = document.getElementById('cpNew')?.value;
          const confirm = document.getElementById('cpConfirm')?.value;
          if (!current || !newPw || !confirm) { showToast('⚠️ All fields required.'); return; }
          if (newPw.length < 8) { showToast('⚠️ Password must be at least 8 characters.'); return; }
          if (newPw !== confirm) { showToast('⚠️ Passwords do not match.'); return; }
          try {
            await apiFetch('change_password', 'POST', { current_password: current, new_password: newPw });
            showToast('✅ Password changed successfully.');
            closeModal();
          } catch (e) { showToast('❌ ' + e.message, 5000); }
        }, 'Change Password'
      );
    });

    /* Inventory listeners */
    document.getElementById('invRefreshBtn')?.addEventListener('click', () => loadInventoryMc());
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
          loadInventoryMc();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Add Bag');
    });
    document.getElementById('invTypeFilter')?.addEventListener('change', () => loadInventoryMc());
    document.getElementById('invStatusFilter')?.addEventListener('change', () => loadInventoryMc());
    let invTimer;
    document.getElementById('invSearchInput')?.addEventListener('input', () => {
      clearTimeout(invTimer); invTimer = setTimeout(() => loadInventoryMc(), 400);
    });
    document.getElementById('viewFullInventoryLink')?.addEventListener('click', e => { e.preventDefault(); navigateTo('inventory'); });
    document.getElementById('refreshDashInvBtn')?.addEventListener('click', () => loadDashboard());

    const saved = localStorage.getItem('bbMcPage');
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

})();