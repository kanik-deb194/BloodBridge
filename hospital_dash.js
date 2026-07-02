/* ============================================================
   BloodBridge — hospital_dash.js  (FULLY CORRECTED)
   API: hospital_api.php
   Session: role='blood-bank', sub_role='hospital'
   ============================================================ */
(function () {
  'use strict';

  const API = 'hospital_api.php';

  /* ── THEME ── */
  const html = document.documentElement;
  function getTheme() { return localStorage.getItem('bb-theme') || 'dark'; }
  function setTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem('bb-theme', t); }
  setTheme(getTheme());
  on('themeToggle', 'click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));

  /* ── SIDEBAR ── */
  const sidebar        = document.getElementById('sidebar');
  const hamburger      = document.getElementById('hamburger');
  const sidebarClose   = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function isMobile() { return window.innerWidth < 1024; }
  function openSidebar()  { sidebar.classList.add('open'); if(isMobile()){sidebarOverlay.classList.add('visible');document.body.style.overflow='hidden';} hamburger?.classList.add('open'); }
  function closeSidebar() { sidebar.classList.remove('open'); if(isMobile()){sidebarOverlay.classList.remove('visible');document.body.style.overflow='';} hamburger?.classList.remove('open'); }

  if (hamburger)      hamburger.addEventListener('click', () => { sidebar.classList.contains('open') ? closeSidebar() : openSidebar(); });
  if (sidebarClose)   sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  window.addEventListener('resize', () => { isMobile() ? closeSidebar() : openSidebar(); });
  if (!isMobile()) openSidebar();

  /* ── NAVIGATION ── */
  const VIEW_MAP = {
    dashboard:  'dashboardView',
    requests:   'requestsView',
    deliveries: 'deliveriesView',
    patients:   'patientsView',
    ratings:    'ratingsView',
    profile:    'profileView',
    emergency:  'emergencyRequestsView',
    promises:   'promisesView',
    inventory:  'inventoryView',
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
      case 'dashboard':  loadDashboard();   break;
      case 'requests':   loadRequests();    break;
      case 'deliveries': loadDeliveries();  break;
      case 'patients':   loadPatients();    break;
      case 'ratings':    loadRatingsPage(); break;
      case 'profile':    loadProfile();     break;
      case 'emergency':  loadEmergency();   break;
      case 'promises':   loadPromises();    break;
      case 'inventory':  loadInventoryHosp(); break;
    }
    localStorage.setItem('bbHospPage', sec);
  }
  document.querySelectorAll('.sidebar-link[data-section]').forEach(l =>
    l.addEventListener('click', e => { e.preventDefault(); navigateTo(l.getAttribute('data-section')); })
  );
  window.navigateTo = navigateTo;

  /* ── UTILS ── */
  function on(id, ev, fn) { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); }
  function txt(id, v)  { const el = document.getElementById(id); if (el) el.textContent = (v == null || v === '') ? '—' : v; }
  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = (v == null) ? '' : v; }
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtDate(ds, sh) {
    if (!ds) return '—';
    const d = new Date(ds); if (isNaN(d)) return ds;
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    return sh ? `${m} ${d.getDate()}` : `${m} ${d.getDate()}, ${d.getFullYear()}`;
  }
  function timeAgo(ds) {
    if (!ds) return '';
    const s = Math.floor((Date.now() - new Date(ds)) / 1000);
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    return `${Math.floor(s / 86400)} days ago`;
  }
  function stars(n) { return '⭐'.repeat(Math.max(0, Math.min(5, Math.round(n || 0)))); }
  function statusBadge(st) {
    const m = {
      pending: 'badge-warn', approved: 'badge-ok', in_transit: 'badge-blue',
      completed: 'badge-ok', rejected: 'badge-danger', cancelled: 'badge-danger',
      dispatched: 'badge-blue', delivered: 'badge-ok', passed: 'badge-ok',
      failed: 'badge-danger', quarantined: 'badge-danger'
    };
    return `<span class="status-badge ${m[st] || 'badge-warn'}">${esc((st || '—').replace(/_/g, ' '))}</span>`;
  }
  function urgencyBadge(u) {
    const m = { emergency: 'priority-critical', urgent: 'priority-high', normal: 'priority-medium' };
    return `<span class="${m[u] || 'priority-medium'}">${(u || 'normal').charAt(0).toUpperCase() + (u || 'normal').slice(1)}</span>`;
  }
  /* Discount based on days_until_expiry (expiry_alert field) */
  function stockBadge(cnt, max) {
    max = max || 50;
    const pct = max > 0 ? Math.round((cnt / max) * 100) : 0;
    if (cnt === 0) return { cls:'badge-critical', lbl:'Out of Stock', col:'#f87171', pct:2 };
    if (pct < 20)  return { cls:'badge-critical', lbl:'Critical',     col:'#f87171', pct };
    if (pct < 50)  return { cls:'badge-warn',     lbl:'Low Stock',    col:'#fbbf24', pct };
    return               { cls:'badge-ok',        lbl:'Good',         col:'#4ade80', pct };
  }

  async function apiFetch(action, method, body) {
    method = method || 'GET';
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(`${API}?action=${action}`, opts);
    const data = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
    if (!data.success && res.status === 401) throw new Error('AUTH_FAILED');
    if (!data.success) throw new Error(data.error || (data.errors || []).join(', ') || `HTTP ${res.status}`);
    return data;
  }

  /* ── TOAST ── */
  function showToast(msg, dur) {
    dur = dur || 3500;
    let t = document.getElementById('toastMessage');
    if (!t) { t = document.createElement('div'); t.id = 'toastMessage'; t.className = 'toast-message'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), dur);
  }

  /* ── REVEAL ── */
  function initReveal() {
    const els = document.querySelectorAll('.reveal:not(.visible)');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(e => e.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver(en => {
      en.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => obs.observe(e));
    /* Fallback: make remaining hidden elements visible after 1s */
    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.visible)').forEach(e => e.classList.add('visible'));
    }, 1000);
  }

  /* ── COUNTER ── */
  function animCount(el, target, dur) {
    if (!el) return; dur = dur || 900; let s = null;
    const step = ts => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / dur, 1);
      el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) requestAnimationFrame(step); else el.textContent = target;
    };
    requestAnimationFrame(step);
  }

  /* ── MODAL ── */
  const modal    = document.getElementById('globalModal');
  const mTitle   = document.getElementById('modalTitle');
  const mBody    = document.getElementById('modalBody');
  const mConfirm = document.getElementById('modalConfirmBtn');
  const mCancel  = document.getElementById('modalCancelBtn');
  const mClose   = document.getElementById('closeModalBtn');
  let   mAction  = null;

  function openModal(title, content, onConfirm, label) {
    if (!modal) return;
    mTitle.textContent = title;
    mBody.innerHTML    = content;
    if (mConfirm) mConfirm.textContent = label || 'Confirm';
    if (mConfirm) mConfirm.style.cssText = 'background:linear-gradient(135deg,#C0162C,#8B0020);color:#fff;border:none;padding:9px 22px;border-radius:50px;font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(192,22,44,.35);';
    if (mCancel)  mCancel.style.cssText  = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.25);color:var(--text-primary);padding:9px 22px;border-radius:50px;font-family:Outfit,sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;min-width:80px;';
    modal.style.display = 'flex';
    mAction = onConfirm || null;
  }
  function closeModal() { if (modal) modal.style.display = 'none'; mAction = null; }
  if (mClose)  mClose.addEventListener('click', closeModal);
  if (mCancel) mCancel.addEventListener('click', closeModal);
  if (mConfirm)mConfirm.addEventListener('click', () => { if (mAction) mAction(); closeModal(); });
  if (modal)   modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.style.display === 'flex') closeModal(); });

  function handleErr(err, silent) {
    if (err.message === 'AUTH_FAILED') {
      if (!silent) {
        showToast('⚠️ Session expired. Redirecting…', 3000);
        setTimeout(() => window.location.href = 'login.html', 3000);
      }
    }
  }

  const IS = 'background:var(--input-bg);border:1px solid var(--input-border);padding:8px 12px;border-radius:10px;width:100%;margin-top:5px;color:var(--text-primary);font-family:Outfit,sans-serif;font-size:.84rem;';

  let bankCache = [];
  async function getBanks() {
    if (bankCache.length) return bankCache;
    try { const d = await apiFetch('blood_banks'); bankCache = d.banks || []; } catch (_) {}
    return bankCache;
  }

  /* ══════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════ */
  async function loadDashboard() {
    try {
      const data = await apiFetch('dashboard');
      const h = data.hospital;
      const s = data.stats;

      /* ── Identity ── */
      document.querySelectorAll('.hospital-name').forEach(el => el.textContent = h.name);
      txt('greetName',       h.name);
      txt('hospitalLicense', h.registration_no);
      txt('sidebarName',     h.name);
      txt('sidebarRole',     'Hospital Admin');
      const sa = document.getElementById('sidebarAvatar');
      if (sa) sa.textContent = h.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

      /* ── Stats ── */
      animCount(document.getElementById('statOpenRequests'),       s.open_requests);
      animCount(document.getElementById('statPendingDeliveries'),  s.pending_deliveries);
      animCount(document.getElementById('statRegisteredPatients'), s.patients);

      /* ── Fetch admin warnings BEFORE rendering grid ── */
      let adminWarnings = [], warningCount = 0;
      try {
        const wData = await apiFetch('get_warnings');
        adminWarnings = wData.warnings || [];
        warningCount  = wData.warning_count || 0;
        window._pendingWarningsHosp = {};
        adminWarnings.forEach(w => { window._pendingWarningsHosp[w.id] = w.message || ''; });
      } catch(wErr) { handleErr(wErr, true); /* silent – don't redirect for sub-call */ }

      /* ── Critical alerts grid ── */
      const grid = document.getElementById('dashCriticalAlerts');
      if (grid) {
        const cards = [];

        /* Admin warning — show 1 with Respond button */
        if (adminWarnings.length) {
          const w = adminWarnings[0];
          const moreCount = warningCount - 1;
          cards.push(`
            <div class="alert-critical-card glass-card" style="border-left:4px solid #fbbf24;flex-wrap:wrap;gap:10px;">
              <span style="font-size:1.3rem;">⚠️</span>
              <div style="flex:1;min-width:180px;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <strong>Admin Warning</strong>
                  ${warningCount > 1 ? `<span style="background:rgba(251,191,36,.2);color:#fbbf24;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:50px;">${warningCount} total</span>` : ''}
                </div>
                <div style="font-size:.78rem;color:var(--text-muted);margin-top:3px;">${esc((w.message||'').slice(0,120))}</div>
                <div style="display:flex;align-items:center;gap:10px;margin-top:4px;flex-wrap:wrap;">
                  <span style="font-size:.68rem;color:var(--text-muted);">${fmtDate(w.sent_at, true)}</span>
                  ${moreCount > 0 ? `<button class="btn-ghost-sm" style="font-size:.68rem;padding:2px 8px;" onclick="openAllWarningsHosp()">+${moreCount} more</button>` : ''}
                </div>
              </div>
              <button class="btn-ghost-sm" style="background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.4);color:#fbbf24;flex-shrink:0;"
                onclick="openWarningResponseHosp(${w.id}, '${esc((w.message||'').slice(0,120)).replace(/'/g, "\\'")}')">
                📋 Respond
              </button>
            </div>`);
        }

        /* Critical unmatched request */
        const cr = data.crit_request;
        if (cr) {
          const mins = Math.max(0, Math.round((Date.now() - new Date(cr.requested_at)) / 60000));
          cards.push(`
            <div class="alert-critical-card glass-card">
              <div class="alert-icon-critical">⚠️</div>
              <div class="alert-critical-content">
                <div class="alert-critical-title">Request #REQ-${String(cr.id).padStart(4,'0')} (${esc(cr.urgency)}, ${esc(cr.blood_group)}) still unmatched</div>
                <p class="alert-critical-msg">Unmatched after ${mins} minute${mins !== 1 ? 's' : ''} — escalate to emergency dispatch</p>
              </div>
              <button class="critical-btn" onclick="openEscalateModal(${cr.id},'${esc(cr.blood_group)}')">Escalate</button>
            </div>`);
        }

        grid.innerHTML = cards.length
          ? cards.join('')
          : '<div class="alert-critical-card glass-card" style="grid-column:1/-1;justify-content:center;color:var(--text-muted);">✅ No critical alerts at this time.</div>';
      }

      /* ── Open requests table (#03 blood_request + request_timeline) ── */
      const tbody     = document.getElementById('dashRequestsBody');
      const countLabel= document.getElementById('openReqCountLabel');
      const reqs      = data.recent_requests || [];
      if (countLabel) countLabel.textContent = s.open_requests;
      if (tbody) {
        tbody.innerHTML = reqs.length
          ? reqs.map(r => `<tr>
              <td><strong>#REQ-${String(r.id).padStart(4,'0')}</strong>
                ${r.request_hash ? `<br><span style="font-size:.65rem;color:var(--text-muted);">#${esc(r.request_hash)}</span>` : ''}
              </td>
              <td>${esc(r.requester_name || '—')}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.7rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(r.blood_group)}</span></td>
              <td>${r.units_required}</td>
              <td>${urgencyBadge(r.urgency)}</td>
              <td>${statusBadge(r.timeline_status || r.status)}</td>
            </tr>`).join('')
          : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No open requests.</td></tr>';
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
              <button class="btn-ghost-sm" onclick="allocateBagHosp(${bag.id},'${esc(bag.bag_barcode)}')">Allocate</button>
            </div>`;
          }).join('')
          : '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:.82rem;">✅ No bags expiring within 7 days.</div>';
      }

    } catch (err) {
      handleErr(err);
      if (err.message !== 'AUTH_FAILED') showToast('❌ Dashboard error: ' + err.message, 5000);
    }
    initReveal();
  }

  window.openEscalateModal = (reqId, bloodGroup) => {
    openModal(`🚨 Escalate Request #REQ-${String(reqId).padStart(4,'0')}`,
      `<p><strong>Critical ${esc(bloodGroup)} request is unmatched.</strong></p>
       <p style="margin-top:10px;">This will notify the regional emergency coordinator and alert all nearby blood banks.</p>
       <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px;margin-top:12px;font-size:.82rem;">
         ⚠️ Emergency escalation triggers automated donor & bank notifications.
       </div>`,
      () => showToast('🚨 Escalation initiated. Coordinator notified.'),
      'Escalate Now');
  };

  /* ══════════════════════════════════════════════
     #03 REQUESTS PAGE — matches bank pattern
  ══════════════════════════════════════════════ */
  async function loadRequests() {
    const status = document.getElementById('reqFilterStatus')?.value || 'pending';
    const tbody  = document.getElementById('requestsTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:20px;">Loading...</td></tr>`;
    try {
      const data  = await apiFetch('requests&status=' + encodeURIComponent(status));
      const reqs  = data.requests || [];
      if (tbody) {
        tbody.innerHTML = reqs.length
          ? reqs.map(r => {
            const urgColor = r.urgency==='emergency'?'#ef4444':r.urgency==='urgent'?'#f59e0b':'#6b7280';
            return `<tr>
              <td><strong>#REQ-${String(r.id).padStart(4,'0')}</strong>
                ${r.request_hash ? `<br><span style="font-size:.65rem;color:var(--text-muted);">H: ${esc(r.request_hash).slice(0,8)}</span>` : ''}
              </td>
              <td>${esc(r.requester_name||'—')}</td>
              <td>${esc(r.requester_phone||'—')}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(r.blood_group)}</span></td>
              <td>${r.units_required}</td>
              <td><span style="color:${urgColor};font-weight:600;">${(r.urgency||'normal').toUpperCase()}</span></td>
              <td>${r.visible_to||'—'}</td>
              <td>${fmtDate(r.requested_at)}</td>
              <td>
                <span class="status-badge ${r.status==='approved'?'badge-ok':r.status==='rejected'?'badge-critical':r.status==='in_transit'?'badge-info':'badge-warn'}">${esc(r.status)}</span>
              </td>
              <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                  <button class="table-btn" onclick="trackRequest(${r.id})">📅 Track</button>
                </div>
              </td>
            </tr>`;
          }).join('')
          : `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:20px;">No requests found.</td></tr>`;
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  document.getElementById('reqFilterStatus')?.addEventListener('change', () => loadRequests());

  window.trackRequest = async (id) => {
    openModal('📅 Blood Request Timeline', '<div style="text-align:center;padding:16px;color:var(--text-muted);">Loading...</div>', null, 'Close');
    mConfirm.style.display = 'none';
    try {
      const data = await apiFetch('track_request&id=' + id);
      const r    = data.request;
      const tl   = data.timeline || [];

      const steps = ['pending', 'approved', 'processing', 'dispatched', 'delivered'];
      const curIdx = steps.indexOf(r.status);

      mBody.innerHTML = `
        <div style="margin-bottom:18px;">
          <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:4px;">Request #${r.id} · ${esc(r.blood_group)} · ${r.units_required} unit(s)</div>
          <div style="font-size:.82rem;">Blood Bank: <strong>${esc(r.blood_bank_name || '—')}</strong></div>
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

  /* ══════════════════════════════════════════════
     #06 DELIVERY SIMULATION PAGE
  ══════════════════════════════════════════════ */
  let simInterval = null;
  let simData = [];

  document.getElementById('simSpeedSelect')?.addEventListener('change', () => {
    if (simInterval) { pauseSimulation(); startSimulation(); }
  });

  async function loadDeliveries() {
    const list = document.getElementById('simPageDeliveryList');
    if (list) list.innerHTML = '<div style="padding:28px;text-align:center;color:var(--text-muted);"><div class="loader-spin" style="margin:0 auto 10px;"></div>Loading simulation...</div>';
    try {
      const data = await apiFetch('deliveries');
      simData = (data.bags || []).map(b => ({
        ...b,
        _simStatus: b.dispatch_status || b.bag_status || 'processing',
        _simStep: ['processing','dispatched','in_transit','delivered'].indexOf(b.dispatch_status || b.bag_status || 'processing'),
      }));
      renderSimPage(data);
    } catch (err) {
      handleErr(err);
      if (list) list.innerHTML = `<div style="padding:20px;color:#f87171;text-align:center;">⚠️ ${esc(err.message)}</div>`;
    }
  }

  function renderSimPage(data) {
    const total  = simData.length;
    const inTransit = simData.filter(b => b._simStatus !== 'delivered').length;
    const delivered = simData.filter(b => b._simStatus === 'delivered').length;
    txt('delTotal',     total);
    txt('delInTransit', inTransit);
    txt('delDelivered', delivered);
    const etas = simData.map(b => b.estimated_arrival ? Math.round((new Date(b.estimated_arrival) - Date.now()) / 60000) : null).filter(v => v !== null && v > 0);
    txt('delAvgEta', etas.length ? `${Math.round(etas.reduce((a,b) => a+b, 0) / etas.length)} min` : '—');

    const list = document.getElementById('simPageDeliveryList');
    if (!list) return;
    list.innerHTML = simData.length
      ? simData.map((b, i) => {
        const steps  = ['processing','dispatched','in_transit','delivered'];
        const curIdx = Math.max(0, b._simStep);
        const status = b._simStatus;
        const isDelivered = status === 'delivered';
        const etaMin = b.estimated_arrival ? Math.max(0, Math.round((new Date(b.estimated_arrival) - Date.now()) / 60000)) : null;
        return `<div class="sim-card ${isDelivered ? 'sim-delivered' : ''}">
          <div class="sim-card-head">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="sim-drone-icon">${isDelivered ? '✅' : '🚁'}</span>
              <div>
                <div class="sim-card-title">${esc(b.drone_code || 'Drone #' + (i+1))}</div>
                <div style="font-size:.72rem;color:var(--text-muted);">#${esc(b.bag_barcode || '—')} · ${esc(b.blood_group || '—')}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="sim-status-tag ${isDelivered ? 'sim-status-done' : etaMin !== null && etaMin <= 5 ? 'sim-status-urgent' : 'sim-status-live'}">
                ${isDelivered ? '✅ Delivered' : etaMin !== null ? `ETA ${etaMin} min` : status.replace(/_/g,' ')}
              </span>
              ${!isDelivered ? `<span class="sim-speed-badge">⏱ ${etaMin !== null ? etaMin + ' min' : '—'}</span>` : ''}
            </div>
          </div>
          <div class="sim-card-body">
            <div class="sim-info-row">
              <span class="sim-info-item"><span class="sim-info-icon">🏥</span> ${esc(b.source_bank_name || 'Blood Bank')}</span>
              <span class="sim-info-item"><span class="sim-info-icon">📦</span> ${b.volume_ml || 450} mL</span>
              ${b.culture_test_status ? `<span class="sim-info-item"><span class="sim-info-icon">🧪</span> ${esc(b.culture_test_status)}</span>` : ''}
              ${b.battery_level != null ? `<span class="sim-info-item"><span class="sim-info-icon">🔋</span> ${b.battery_level}%</span>` : ''}
            </div>
            <div class="sim-timeline">
              ${steps.map((s, idx) => `
                <div class="sim-tl-step ${idx < curIdx ? 'tl-done' : idx === curIdx ? 'tl-active' : 'tl-pending'}">
                  <div class="sim-tl-dot">${idx < curIdx ? '✓' : idx === curIdx ? '◉' : '○'}</div>
                  <div class="sim-tl-lbl">${s === 'in_transit' ? 'In Transit' : s.charAt(0).toUpperCase() + s.slice(1)}</div>
                </div>
              `).join('')}
              <div class="sim-tl-line-bg"></div>
            </div>
            ${!isDelivered ? `<div class="sim-progress-bar"><div class="sim-progress-fill" style="width:${Math.round((curIdx / (steps.length-1)) * 100)}%"></div></div>` : ''}
          </div>
        </div>`;
      }).join('')
      : '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:.9rem;">🚚 No deliveries to simulate. Data will appear once blood bags are dispatched to your facility.</div>';
    initReveal();
  }

  /* Simulation controls */
  function startSimulation() {
    if (simInterval) return;
    const sb = document.getElementById('simStartBtn'), pb = document.getElementById('simPauseBtn');
    if (sb) sb.disabled = true;
    if (pb) pb.disabled = false;
    const st = document.getElementById('simStatusText');
    if (st) st.textContent = 'Simulating';
    const sp = document.getElementById('simStatusPill');
    if (sp) sp.className = 'live-pill';
    const speed = parseInt(document.getElementById('simSpeedSelect')?.value || '1');
    simInterval = setInterval(() => {
      let changed = false;
      simData.forEach(b => {
        if (b._simStatus !== 'delivered') {
          if (Math.random() < 0.3 * speed) {
            const steps = ['processing','dispatched','in_transit','delivered'];
            const nextIdx = Math.min(b._simStep + 1, steps.length - 1);
            b._simStep = nextIdx;
            b._simStatus = steps[nextIdx];
            changed = true;
          }
        }
      });
      if (changed) renderSimPage();
    }, 3000 / speed);
  }

  function pauseSimulation() {
    clearInterval(simInterval);
    simInterval = null;
    const sb = document.getElementById('simStartBtn'), pb = document.getElementById('simPauseBtn');
    if (sb) sb.disabled = false;
    if (pb) pb.disabled = true;
    const st = document.getElementById('simStatusText');
    if (st) st.textContent = 'Paused';
    const sp = document.getElementById('simStatusPill');
    if (sp) sp.className = 'live-pill paused';
  }

  function resetSimulation() {
    pauseSimulation();
    simData.forEach(b => {
      b._simStatus = b.dispatch_status || b.bag_status || 'processing';
      b._simStep = ['processing','dispatched','in_transit','delivered'].indexOf(b.dispatch_status || b.bag_status || 'processing');
    });
    renderSimPage();
    showToast('⟳ Simulation reset to initial state.', 2000);
  }
  window.startSimulation   = startSimulation;
  window.pauseSimulation   = pauseSimulation;
  window.resetSimulation   = resetSimulation;

  /* ══════════════════════════════════════════════
     #15 PATIENTS PAGE
     patient_registry + users
  ══════════════════════════════════════════════ */
  async function loadPatients() {
    const tbody = document.getElementById('patientsTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>`;
    try {
      const data = await apiFetch('patients');
      const pts  = data.patients || [];
      if (tbody) {
        tbody.innerHTML = pts.length
          ? pts.map((p, i) => `<tr>
              <td>${i + 1}</td>
              <td><strong>${esc(p.full_name)}</strong></td>
              <td>${esc(p.national_id || '—')}</td>
              <td><span style="color:#FF6B6B;font-weight:700;">${esc(p.blood_group || '—')}</span></td>
              <td>${fmtDate(p.date_of_birth, true) || '—'}</td>
              <td>${esc(p.phone || '—')}</td>
              <td>${esc(p.address || '—')}</td>
              <td>${fmtDate(p.created_at, true)}</td>
            </tr>`).join('')
          : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No patients found.</td></tr>';
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  document.getElementById('newPatientBtn')?.addEventListener('click', openAddPatientModal);

  /* ══════════════════════════════════════════════
     #08 RATINGS PAGE
     bank_review + blood_bank
  ══════════════════════════════════════════════ */
  async function loadRatingsPage() {
    /* Populate blood bank dropdown */
    const sel = document.getElementById('ratingBankSelect');
    if (sel && sel.options.length <= 1) {
      try {
        const d       = await apiFetch('blood_banks');
        const grouped = d.grouped || {};
        const labels  = { blood_bank: '🩸 Blood Banks', hospital: '🏥 Hospitals', medical_college: '🎓 Medical Colleges' };
        let html = '<option value="">-- Select an institution --</option>';
        ['blood_bank','hospital','medical_college'].forEach(role => {
          const list = grouped[role] || [];
          if (list.length) {
            html += `<optgroup label="${labels[role]}">`;
            list.forEach(b => {
              html += `<option value="${b.id}">${esc(b.name)}${b.city ? ' (' + b.city + ')' : ''}</option>`;
            });
            html += '</optgroup>';
          }
        });
        sel.innerHTML = html || '<option value="">No institutions available</option>';
      } catch (e) { sel.innerHTML = '<option value="">Could not load institutions</option>'; }
    }

    /* Load my_reviews */
    const myList = document.getElementById('myReviewsList');
    if (myList) myList.innerHTML = '<div style="color:var(--text-muted);font-size:.82rem;text-align:center;padding:12px;"><div class="loader-spin" style="margin:0 auto 6px;"></div>Loading...</div>';
    try {
      const d    = await apiFetch('my_reviews');
      const revs = d.reviews || [];
      if (myList) {
        myList.innerHTML = revs.length
          ? revs.map(r => `
              <div style="padding:12px;border-bottom:1px solid var(--table-border);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                  <div>
                    <strong style="font-size:.84rem;">${esc(r.bank_name || 'Blood Bank')}</strong>
                    ${r.bank_city ? `<span style="font-size:.72rem;color:var(--text-muted);"> · ${esc(r.bank_city)}</span>` : ''}
                    <span style="margin-left:6px;">${stars(r.rating)}</span>
                  </div>
                  <span style="font-size:.72rem;color:var(--text-muted);">${timeAgo(r.updated_at || r.created_at)}</span>
                </div>
                ${r.review_text ? `<div style="font-size:.8rem;color:var(--text-muted);margin-top:4px;">"${esc(r.review_text)}"</div>` : ''}
                ${r.rating_avg != null ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:3px;">Bank avg: ${parseFloat(r.rating_avg).toFixed(1)} ⭐</div>` : ''}
              </div>`).join('')
          : '<div style="color:var(--text-muted);font-size:.82rem;text-align:center;padding:12px;">No reviews submitted yet.</div>';
      }
    } catch (_) {}
  }

  /* Star widget (#08) */
  const starWidget = document.getElementById('starRatingWidget');
  if (starWidget) {
    const ratingLabels = ['', '1 — Poor', '2 — Fair', '3 — Good', '4 — Very Good', '5 — Excellent'];
    starWidget.querySelectorAll('[data-star]').forEach(star => {
      star.addEventListener('click', () => {
        const v = parseInt(star.dataset.star);
        starWidget.dataset.rating = v;
        starWidget.querySelectorAll('[data-star]').forEach((s, i) => { s.style.opacity = i < v ? '1' : '0.3'; });
        txt('starRatingLabel', ratingLabels[v] || '');
      });
    });
  }

  on('submitRatingBtn', 'click', async () => {
    const sel    = document.getElementById('ratingBankSelect');
    const rating = parseInt(document.getElementById('starRatingWidget')?.dataset.rating || '5');
    const review = document.getElementById('ratingFeedbackText')?.value.trim();
    if (!sel?.value) { showToast('⚠️ Select a blood bank.'); return; }
    try {
      await apiFetch('rate_bank', 'POST', { blood_bank_id: parseInt(sel.value), rating, review_text: review });
      showToast('⭐ Review submitted! Blood bank rating updated.');
      const rt = document.getElementById('ratingFeedbackText'); if (rt) rt.value = '';
      loadRatingsPage();
    } catch (e) { showToast('❌ ' + e.message, 5000); }
  });

  /* ══════════════════════════════════════════════
     PROFILE PAGE
  ══════════════════════════════════════════════ */
  async function loadProfile() {
    try {
      const data = await apiFetch('profile');
      const p    = data.profile;
      const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const ava  = document.getElementById('profAvatar'); if (ava) ava.textContent = initials;
      txt('profNameDisplay', p.name);
      txt('profIdDisplay',   'ID: ' + String(p.id).padStart(6, '0'));
      txt('profCityDisplay', 'City: ' + (p.city || '—'));
      setVal('profId',      String(p.id).padStart(6, '0'));
      setVal('profRegNo',   p.registration_no || '');
      setVal('profName',    p.name);
      setVal('profEmail',   p.email || '');
      setVal('profPhone',   p.phone || '');
      setVal('profCity',    p.city || '');
      setVal('profAddress', p.address_line || '');
      txt('sidebarName', p.name);
    } catch (err) { handleErr(err); showToast('❌ Profile load failed: ' + err.message, 5000); }
  }

  /* Profile edit */
  const PROF_FIELDS = ['profName', 'profEmail', 'profPhone', 'profCity', 'profAddress'];
  let pOrig = {};
  function enableEdit()   { PROF_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; }); const eb = document.getElementById('editProfBtn'); if (eb) eb.style.display = 'none'; const sb = document.getElementById('saveProfBtn'); if (sb) sb.style.display = ''; const cb = document.getElementById('cancelProfBtn'); if (cb) cb.style.display = ''; const fa = document.getElementById('formBottomActions'); if (fa) fa.style.display = 'flex'; }
  function disableEdit()  { PROF_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; }); const eb = document.getElementById('editProfBtn'); if (eb) eb.style.display = ''; const sb = document.getElementById('saveProfBtn'); if (sb) sb.style.display = 'none'; const cb = document.getElementById('cancelProfBtn'); if (cb) cb.style.display = 'none'; const fa = document.getElementById('formBottomActions'); if (fa) fa.style.display = 'none'; }
  function saveOrig()     { PROF_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) pOrig[id] = el.value; }); }
  function restoreOrig()  { PROF_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) el.value = pOrig[id] || ''; }); }
  async function saveProfile() {
    const name  = document.getElementById('profName')?.value.trim();
    const email = document.getElementById('profEmail')?.value.trim();
    if (!name || name.length < 2)                              { showToast('⚠️ Name required.', 4000); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  { showToast('⚠️ Valid email required.', 4000); return; }
    try {
      await apiFetch('update_profile', 'POST', {
        name, email,
        phone:       document.getElementById('profPhone')?.value.trim(),
        city:        document.getElementById('profCity')?.value.trim(),
        address_line:document.getElementById('profAddress')?.value.trim()
      });
      disableEdit(); showToast('✅ Profile updated!');
      txt('profNameDisplay', name); txt('sidebarName', name);
      const ava = document.getElementById('profAvatar'); if (ava) ava.textContent = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const sa  = document.getElementById('sidebarAvatar'); if (sa) sa.textContent = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    } catch (e) { showToast('❌ ' + e.message, 5000); }
  }
  on('editProfBtn',    'click', () => { saveOrig(); enableEdit(); });
  on('cancelProfBtn',  'click', () => { restoreOrig(); disableEdit(); });
  on('cancelProfBtn2', 'click', () => { restoreOrig(); disableEdit(); });
  on('saveProfBtn',    'click', saveProfile);
  const pf = document.getElementById('profileForm');
  if (pf) pf.addEventListener('submit', e => { e.preventDefault(); saveProfile(); });

  /* ══════════════════════════════════════════════
     ACTION MODALS
  ══════════════════════════════════════════════ */

  /* #03 Submit blood request */
  async function openSubmitRequestModal() {
    const banks   = await getBanks();
    /* Build grouped optgroups for blood bank selector */
    const grouped2 = {};
    (banks || []).forEach(b => { (grouped2[b.role] = grouped2[b.role]||[]).push(b); });
    const rLabels = { blood_bank:'🩸 Blood Banks', hospital:'🏥 Hospitals', medical_college:'🎓 Medical Colleges' };
    let bankOpts = '';
    ['blood_bank','hospital','medical_college'].forEach(role => {
      const list = grouped2[role] || [];
      if (list.length) {
        bankOpts += `<optgroup label="${rLabels[role]}">`;
        list.forEach(b => { bankOpts += `<option value="${b.id}">${esc(b.name)}${b.city?' ('+b.city+')':''}</option>`; });
        bankOpts += '</optgroup>';
      }
    });
    if (!bankOpts) bankOpts = '<option value="">No institutions available</option>';
    openModal('📝 Submit Blood Request for Patient',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Blood Group *</label>
           <select id="reqBG" style="${IS}">
             <option value="">Select...</option>
             <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
             <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
           </select>
         </div>
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Units Required *</label>
           <select id="reqUnits" style="${IS}">
             <option value="1">1</option><option value="2">2</option>
             <option value="3">3</option><option value="4">4</option><option value="5">5</option>
           </select>
         </div>
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Urgency</label>
           <select id="reqUrgency" style="${IS}">
             <option value="normal">Normal</option>
             <option value="urgent">Urgent</option>
             <option value="emergency">Emergency</option>
           </select>
         </div>
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Blood Bank (optional)</label>
           <select id="reqBankId" style="${IS}">
             <option value="">Auto-assign</option>${bankOpts}
           </select>
         </div>
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Required By (date)</label>
           <input type="date" id="reqRequiredBy" style="${IS}">
         </div>
         <div style="grid-column:1/-1;">
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Clinical Notes</label>
           <textarea id="reqNotes" rows="2" placeholder="Additional notes..." style="${IS}resize:vertical;"></textarea>
         </div>
       </div>
       <div id="reqHashResult" style="margin-top:10px;font-size:.75rem;color:var(--text-muted);"></div>`,
      async () => {
        const bg = document.getElementById('reqBG')?.value;
        if (!bg) { showToast('⚠️ Blood group required.'); return; }
        try {
          const res = await apiFetch('submit_request', 'POST', {
            blood_group:   bg,
            units_required:parseInt(document.getElementById('reqUnits')?.value || 1),
            urgency:       document.getElementById('reqUrgency')?.value || 'normal',
            blood_bank_id: parseInt(document.getElementById('reqBankId')?.value || 0) || null,
            required_by:   document.getElementById('reqRequiredBy')?.value || '',
            notes:         document.getElementById('reqNotes')?.value.trim() || ''
          });
          showToast(`${res.message} Hash: ${res.hash}`);
          loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Submit Request');
  }

  /* #15 Register patient */
  function openAddPatientModal() {
    openModal('👤 Register Patient',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Full Name *</label>
           <input type="text" id="ptName" style="${IS}">
         </div>
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Blood Group *</label>
           <select id="ptBG" style="${IS}">
             <option value="">Select...</option>
             <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
             <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
           </select>
         </div>
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Phone</label>
           <input type="tel" id="ptPhone" style="${IS}">
         </div>
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">National ID</label>
           <input type="text" id="ptNatId" style="${IS}">
         </div>
         <div>
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Date of Birth</label>
           <input type="date" id="ptDob" style="${IS}">
         </div>
         <div style="grid-column:1/-1;">
           <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Address</label>
           <input type="text" id="ptAddress" style="${IS}">
         </div>
       </div>`,
      async () => {
        const name = document.getElementById('ptName')?.value.trim();
        const bg   = document.getElementById('ptBG')?.value;
        if (!name || name.length < 2) { showToast('⚠️ Patient name required.'); return; }
        if (!bg)                       { showToast('⚠️ Blood group required.');  return; }
        try {
          await apiFetch('add_patient', 'POST', {
            full_name:    name,
            blood_group:  bg,
            phone:        document.getElementById('ptPhone')?.value.trim(),
            national_id:  document.getElementById('ptNatId')?.value.trim(),
            date_of_birth:document.getElementById('ptDob')?.value,
            address:      document.getElementById('ptAddress')?.value.trim()
          });
          showToast('✅ Patient registered!');
          const pEl = document.getElementById('registeredPatients');
          if (pEl) pEl.textContent = parseInt(pEl.textContent || 0) + 1;
          if (document.getElementById('patientsView')?.classList.contains('active')) loadPatients();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Register Patient');
  }

  /* ── Wire action cards ── */
  const ACTION_MAP = {
    submitRequest:    openSubmitRequestModal,
    registerPatients: openAddPatientModal,
    incomingStatus:   () => navigateTo('deliveries'),
    rateBank:         () => navigateTo('ratings'),
    inventoryManager: () => navigateTo('inventory'),
  };
  document.querySelectorAll('.action-card[data-action]').forEach(card => {
    const a = card.getAttribute('data-action');
    card.addEventListener('click', () => ACTION_MAP[a] ? ACTION_MAP[a]() : showToast('🔧 Coming soon!'));
  });

  on('refreshRequestsBtn', 'click', () => loadDashboard());


  /* ══════════════════════════════════════════════
     ADMIN WARNING RESPONSE — hospital
  ══════════════════════════════════════════════ */
  window.openWarningResponseHosp = function(warningId, warningMsg) {
    openModal('📋 Respond to Admin Warning',
      `<div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;padding:12px;margin-bottom:16px;font-size:.82rem;">
        <strong style="color:#fbbf24;">⚠️ Warning:</strong>
        <div style="color:var(--text-muted);margin-top:4px;">${esc(warningMsg)}</div>
      </div>
      <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:14px;">Choose how you want to respond:</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button onclick="openAckHosp(${warningId})"
          style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25);cursor:pointer;text-align:left;width:100%;">
          <span style="font-size:1.4rem;">✅</span>
          <div><div style="font-weight:700;color:#4ade80;">Acknowledge Warning</div><div style="font-size:.75rem;color:var(--text-muted);">Confirm receipt. Dismisses from dashboard.</div></div>
        </button>
        <button onclick="openImproveHosp(${warningId})"
          style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.25);cursor:pointer;text-align:left;width:100%;">
          <span style="font-size:1.4rem;">📝</span>
          <div><div style="font-weight:700;color:#60a5fa;">Submit Improvement Plan</div><div style="font-size:.75rem;color:var(--text-muted);">Describe the steps you are taking.</div></div>
        </button>
        <button onclick="openAppealHosp(${warningId})"
          style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);cursor:pointer;text-align:left;width:100%;">
          <span style="font-size:1.4rem;">⚖️</span>
          <div><div style="font-weight:700;color:#f87171;">Appeal Warning</div><div style="font-size:.75rem;color:var(--text-muted);">Disagree? Submit an appeal.</div></div>
        </button>
      </div>`,
      null, 'Close'
    );
    if (mConfirm) mConfirm.style.display = 'none';
  };

  window.openAckHosp = function(warningId) {
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
    if (mConfirm) mConfirm.style.display = '';
  };

  window.openImproveHosp = function(warningId) {
    openModal('📝 Submit Improvement Plan',
      `<label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Improvement Plan *</label>
       <textarea id="impPlanHosp" rows="6" placeholder="Describe the steps you are taking..."
         style="${IS}resize:vertical;min-height:120px;"></textarea>
       <div style="font-size:.7rem;color:var(--text-muted);margin-top:6px;">Minimum 10 characters required.</div>`,
      async () => {
        const plan = document.getElementById('impPlanHosp')?.value.trim();
        if (!plan || plan.length < 10) { showToast('⚠️ Please write a detailed plan.'); return; }
        try {
          await apiFetch('submit_improvement', 'POST', { warning_id: warningId, plan });
          showToast('✅ Improvement plan submitted.');
          closeModal(); loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Submit Plan'
    );
    if (mConfirm) mConfirm.style.display = '';
  };

  window.openAppealHosp = function(warningId) {
    openModal('⚖️ Appeal Warning',
      `<label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Appeal Reason *</label>
       <textarea id="appReasonHosp" rows="6" placeholder="Explain why this warning should be reconsidered..."
         style="${IS}resize:vertical;min-height:120px;"></textarea>
       <div style="font-size:.7rem;color:var(--text-muted);margin-top:6px;">Minimum 10 characters required.</div>`,
      async () => {
        const reason = document.getElementById('appReasonHosp')?.value.trim();
        if (!reason || reason.length < 10) { showToast('⚠️ Please provide a detailed reason.'); return; }
        try {
          await apiFetch('appeal_warning', 'POST', { warning_id: warningId, reason });
          showToast('✅ Appeal submitted.');
          closeModal(); loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Submit Appeal'
    );
    if (mConfirm) mConfirm.style.display = '';
  };

  window.openAllWarningsHosp = async function() {
    openModal('⚠️ All Pending Warnings', '<div style="text-align:center;padding:16px;color:var(--text-muted);">Loading...</div>', null, 'Close');
    if (mConfirm) mConfirm.style.display = 'none';
    try {
      const data = await apiFetch('get_warnings');
      const warnings = data.warnings || [];
      if (!warnings.length) {
        mBody.innerHTML = '<div style="padding:20px;text-align:center;color:#4ade80;">✅ No pending warnings.</div>';
        return;
      }
      window._pendingWarningsHosp = {};
      warnings.forEach(w => { window._pendingWarningsHosp[w.id] = w.message || ''; });
      mBody.innerHTML = `<div id="awListHosp" style="display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;">
        ${warnings.map(w => `
          <div style="padding:14px;border-radius:10px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
              <div style="flex:1;">
                <div style="font-size:.82rem;color:var(--text-primary);">${esc(w.message||'')}</div>
                <div style="font-size:.68rem;color:var(--text-muted);margin-top:4px;">${fmtDate(w.sent_at)}</div>
              </div>
              <button class="btn-ghost-sm aw-btn-hosp" data-wid="${w.id}"
                style="background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.4);color:#fbbf24;flex-shrink:0;font-size:.72rem;">
                📋 Respond
              </button>
            </div>
          </div>`).join('')}
      </div>`;
      document.getElementById('awListHosp')?.addEventListener('click', function(e) {
        const btn = e.target.closest('.aw-btn-hosp');
        if (!btn) return;
        const wid = parseInt(btn.dataset.wid);
        const msg = (window._pendingWarningsHosp[wid] || '').slice(0, 120);
        closeModal();
        setTimeout(() => openWarningResponseHosp(wid, msg), 150);
      });
    } catch(e) {
      mBody.innerHTML = `<div style="color:#f87171;padding:12px;">❌ ${esc(e.message)}</div>`;
    }
  };

  /* ── Emergency Broadcasts ── */

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
      animateCounter('emStatActive', active);
      animateCounter('emStatTotal', broadcasts.length);
      animateCounter('emStatReached', totalReached);
      animateCounter('emStatIncoming', incoming.length);
    } catch (e) { /* stats fail silently */ }
  }

  function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    function tick(now) {
      const p = Math.min((now - startTime) / duration, 1);
      el.textContent = Math.round(start + (target - start) * easeOutCubic(p));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

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
      const list = data.requests || [];
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">✅ No pending emergency broadcasts.</td></tr>';
        return;
      }
      tbody.innerHTML = list.map((r, i) => {
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
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#f87171;padding:20px;">❌ ${esc(e.message)}</td></tr>`;
    }
  }

  window.approveEmerg = async function(id, bloodGroup) {
    openModal('🚨 Confirm Blood Supply',
      `<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.25);border-radius:12px;padding:16px 18px;">
        <div style="font-weight:700;color:#4ade80;font-size:.9rem;margin-bottom:8px;">✅ Confirm Blood Supply</div>
        <div style="font-size:.82rem;color:var(--text-muted);line-height:1.7;">
          You are confirming your hospital can supply
          <strong style="color:#4ade80;">${bloodGroup || 'the requested'}</strong> blood immediately.<br><br>
          🩸 The requester will be notified with your contact details.<br>
          ⚡ Please dispatch as quickly as possible.
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
    openModal('⏭️ Dismiss Emergency Broadcast',
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

  /* ── Promises ── */
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
  async function loadInventoryHosp(type, status, search, page) {
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
          return `<div class="glass-card inv-type-card" data-type="${g}" style="cursor:pointer;" onclick="document.getElementById('invTypeFilter').value='${g}';loadInventoryHosp()">
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
              <td>${bag.status==='available'?`<button class="table-btn" onclick="allocateBagHosp(${bag.id},'${esc(bag.bag_barcode)}')">Allocate</button>`:'—'}</td>
            </tr>`;
          }).join('')
          : `<tr><td colspan="9" class="td-load">No bags found.</td></tr>`;
      }

      txt('invTableCount', `Showing ${bags.length} of ${data.total_rows||0} records`);

      const pgDiv = document.getElementById('invPagination');
      if (pgDiv && data.total_rows) {
        const total = Math.ceil(data.total_rows / (data.limit||20));
        pgDiv.innerHTML = Array.from({length:total},(_,i)=>i+1)
          .map(i=>`<button class="page-btn ${i===page?'active':''}" onclick="loadInventoryHosp('','','',${i})">${i}</button>`)
          .join('');
      }
    } catch (err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="color:#f87171;padding:18px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
    initReveal();
  }

  window.loadInventoryHosp = loadInventoryHosp;

  window.allocateBagHosp = async (id, barcode) => {
    try {
      await apiFetch('allocate_bag', 'POST', { bag_id: id });
      showToast(`✅ Bag #${barcode} marked as reserved.`);
      loadDashboard();
    } catch (e) { showToast('❌ ' + e.message, 5000); }
  };

  /* ── INIT ── */
  function init() {
    initReveal();
    setupEmergencyEvents();

    /* Inventory listeners */
    on('invRefreshBtn', 'click', () => loadInventoryHosp());
    on('addBagBtn', 'click', () => {
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
          loadInventoryHosp();
        } catch (e) { showToast('❌ ' + e.message, 5000); }
      }, 'Add Bag');
    });
    on('invTypeFilter', 'change', () => loadInventoryHosp());
    on('invStatusFilter', 'change', () => loadInventoryHosp());
    let invTimer;
    document.getElementById('invSearchInput')?.addEventListener('input', () => {
      clearTimeout(invTimer); invTimer = setTimeout(() => loadInventoryHosp(), 400);
    });
    const saved = localStorage.getItem('bbHospPage');
    if (saved && document.querySelector(`.sidebar-link[data-section="${saved}"]`)) {
      navigateTo(saved);
    } else {
      loadDashboard();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();