/* ============================================================
   BloodBridge — delivery_staff_dash.js  (FIXED & COMPLETE)
   Pattern-matched to lab_technician_dash.js (working reference)
   ============================================================ */

(function () {
  'use strict';

  const API = 'delivery_api.php';

  /* ── HTML ESCAPE ── */
  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── UNIFIED API FETCH (mirrors lab_technician_dash.js) ── */
  async function apiFetch(action, method, body) {
    method = method || 'GET';
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(`${API}?action=${action}`, opts);
    const data = await res.json().catch(() => ({ success: false, error: 'HTTP ' + res.status }));
    if (!data.success && res.status === 401) throw new Error('AUTH_FAILED');
    if (!data.success) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  function handleErr(err) {
    if (err.message === 'AUTH_FAILED') {
      showToast('⚠️ Session expired. Redirecting…', 3000);
      setTimeout(() => window.location.href = 'login.html', 3000);
    }
  }

  /* ── THEME ── */
  const html      = document.documentElement;
  const THEME_KEY = 'bb-theme';
  function applyTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
  function getTheme()    { return localStorage.getItem(THEME_KEY) || 'dark'; }
  applyTheme(getTheme());
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', () => applyTheme(getTheme() === 'dark' ? 'light' : 'dark'));

  /* ── SIDEBAR ── */
  const hamburger      = document.getElementById('hamburger');
  const sidebar        = document.getElementById('sidebar');
  const sidebarClose   = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function isMobile()   { return window.innerWidth < 1024; }
  function openSidebar() {
    sidebar.classList.add('open');
    if(isMobile()){ sidebarOverlay.classList.add('visible'); document.body.style.overflow = 'hidden'; }
    hamburger && hamburger.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    if(isMobile()){ sidebarOverlay.classList.remove('visible'); document.body.style.overflow = ''; }
    hamburger && hamburger.classList.remove('open');
  }
  if (hamburger)      hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  if (sidebarClose)   sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  window.addEventListener('resize', () => { isMobile() ? closeSidebar() : openSidebar(); });
  if (!isMobile()) openSidebar();

  /* ── NAVIGATION ── */
  const VIEW_MAP = {
    dashboard : 'dashboardView',
    deliveries: 'deliveriesView',
    escorts   : 'escortsView',
    drones    : 'dronesView',
    completed : 'completedView',
    profile   : 'profileView',
  };

  function navigateTo(sectionId) {
    Object.values(VIEW_MAP).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    const targetId = VIEW_MAP[sectionId] || VIEW_MAP.dashboard;
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.classList.add('active');

    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));
    const al = document.querySelector('.sidebar-link[data-section="' + sectionId + '"]');
    if (al) al.classList.add('active');

    if (isMobile()) closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (sectionId) {
      case 'dashboard':  loadDashboardStats(); loadActiveDeliveries(); loadEscortRequests(); loadDroneDispatches(); break;
      case 'deliveries': loadDeliveriesView(); break;
      case 'escorts':    loadEscortsView();    break;
      case 'drones':     loadDronesView();     break;
      case 'completed':  loadCompletedView();  break;
      case 'profile':    loadProfileView();    break;
    }
    localStorage.setItem('bbDelPage', sectionId);
  }

  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.getAttribute('data-section')); });
  });

  /* ── TOAST ── */
  function showToast(msg, duration) {
    duration = duration || 3500;
    let t = document.getElementById('toastMessage');
    if (!t) { t = document.createElement('div'); t.id = 'toastMessage'; t.className = 'toast-message'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), duration);
  }

  /* ── MODAL ── */
  const modal        = document.getElementById('globalModal');
  const modalTitle   = document.getElementById('modalTitle');
  const modalBody    = document.getElementById('modalBody');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalCancel  = document.getElementById('modalCancelBtn');
  const modalConfirm = document.getElementById('modalConfirmBtn');
  let currentModalAction = null;

  function openModal(title, content, onConfirm, confirmLabel) {
    if (!modal) return;
    modalTitle.textContent = title;
    modalBody.innerHTML    = content;
    if (modalConfirm) modalConfirm.textContent = confirmLabel || 'Confirm';
    modal.style.display    = 'flex';
    currentModalAction     = onConfirm || null;
  }
  function closeModal() { if (modal) modal.style.display = 'none'; currentModalAction = null; }
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (modalCancel)   modalCancel.addEventListener('click', closeModal);
  if (modalConfirm)  modalConfirm.addEventListener('click', () => { if (currentModalAction) currentModalAction(); closeModal(); });
  if (modal)         modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && modal.style.display === 'flex') closeModal(); });

  /* ── COUNTER ANIMATION ── */
  function animateCounter(el, target, duration) {
    if (!el || isNaN(target)) return;
    duration = duration || 900;
    let start = null;
    (function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    })(performance.now());
  }

  /* ── SCROLL REVEAL ── */
  function initReveal() {
    const els = document.querySelectorAll('.reveal:not(.visible)');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('visible')); return; }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => obs.observe(e));
  }

  /* ── STATUS BADGE ── */
  function statusBadge(status) {
    const map = {
      pending         : ['badge-warn', 'Pending'],
      approved        : ['badge-ok',   'Approved'],
      dispatched      : ['badge-ok',   'Dispatched'],
      in_transit      : ['badge-ok',   'In Transit'],
      delivered       : ['badge-ok',   'Delivered'],
      cancelled       : ['badge-err',  'Cancelled'],
      scheduled       : ['badge-warn', 'Scheduled'],
      in_transit_drone: ['badge-ok',   'In Transit'],
      awaiting_handoff: ['badge-warn', 'Awaiting Handoff'],
      accepted        : ['badge-ok',   'Accepted'],
      in_progress     : ['badge-ok',   'In Progress'],
      completed       : ['badge-ok',   'Completed'],
    };
    const [cls, label] = map[status] || ['badge-warn', status || 'Unknown'];
    return '<span class="status-badge ' + cls + '">' + escHtml(label) + '</span>';
  }

  /* ── SECTION HELPERS ── */
  const IS = 'width:100%;background:var(--input-bg);padding:9px 12px;border-radius:9px;border:1px solid var(--input-border);color:var(--text-primary);font-family:Outfit,sans-serif;font-size:.88rem;margin-top:4px;';

  function sectionLoading(label) {
    return '<div class="reveal visible" style="padding:40px 24px;text-align:center;color:var(--text-muted);">' +
           '<div style="font-size:2rem;margin-bottom:12px;">⏳</div>' +
           '<p>Loading ' + escHtml(label) + '…</p></div>';
  }
  function sectionError(label, msg) {
    return '<div class="reveal visible" style="color:#f87171;padding:24px;background:rgba(239,68,68,0.08);border-radius:14px;margin:20px 0;border:1px solid rgba(239,68,68,0.18);">' +
           '<strong>⚠️ Failed to load ' + escHtml(label) + '</strong><br>' +
           '<span style="font-size:.85rem;opacity:.8;">' + escHtml(msg) + '</span><br><br>' +
           '<button onclick="location.reload()" style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#f87171;padding:6px 14px;border-radius:8px;cursor:pointer;">Retry Page</button>' +
           '</div>';
  }

  /* ═══════════════════════════════════════════════════════════
     DASHBOARD WIDGETS
  ═══════════════════════════════════════════════════════════ */

  async function loadDashboardStats() {
    try {
      const data = await apiFetch('dashboard_stats');
      animateCounter(document.getElementById('activeDeliveries'), data.active_deliveries || 0);
      animateCounter(document.getElementById('escortRequests'),   data.escort_requests   || 0);
      animateCounter(document.getElementById('completedToday'),   data.completed_today   || 0);
      const zoneEl = document.getElementById('assignedZone');
      if (zoneEl) zoneEl.textContent = data.assigned_zone || 'N/A';
      document.querySelectorAll('.delivery-name').forEach(el => { el.textContent = data.staff_name || 'Staff'; });
      const sn = document.querySelector('.sidebar-user-name');
      if (sn) sn.textContent = data.staff_name || 'Staff';
      const sr = document.querySelector('.sidebar-user-role');
      if (sr) sr.textContent = 'Delivery Staff · Zone: ' + (data.assigned_zone || 'N/A');
      const zb = document.querySelector('.zone-badge strong');
      if (zb) zb.textContent = data.assigned_zone || 'N/A';
    } catch (err) {
      handleErr(err);
      console.error('loadDashboardStats:', err);
      showToast('⚠️ Could not load stats.', 5000);
    }
  }

  async function loadActiveDeliveries() {
    const tbody = document.getElementById('activeDeliveriesTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">⏳ Loading…</td></tr>';
    try {
      const data = await apiFetch('active_deliveries');
      const rows = (data.deliveries || []).slice(0, 5);
      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">No active deliveries right now.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(function(d) {
        return '<tr>' +
          '<td>#' + escHtml(d.delivery_id) + '</td>' +
          '<td>' + escHtml(d.destination) + '</td>' +
          '<td>' + escHtml(d.blood_group) + '</td>' +
          '<td>' + escHtml(d.eta) + '</td>' +
          '<td><button class="table-btn confirm-delivery" data-id="' + d.id + '" data-label="' + escHtml(d.delivery_id) + '">Confirm</button></td>' +
          '</tr>';
      }).join('');
      tbody.querySelectorAll('.confirm-delivery').forEach(function(btn) { attachConfirmDelivery(btn); });
    } catch (err) {
      handleErr(err);
      tbody.innerHTML = '<tr><td colspan="5" style="color:#f66;padding:14px;">' + escHtml(err.message) + '</td></tr>';
      console.error('loadActiveDeliveries:', err);
    }
  }

    async function loadEscortRequests() {
    const list = document.getElementById('escortList');
    const alertTitle = document.getElementById('escortAlertTitle');
    const alertMsg   = document.getElementById('escortAlertMsg');
    const alertBtn   = document.getElementById('handleEscortBtn');

    if (list) list.innerHTML = '<div style="padding:16px;text-align:center;">⏳ Loading…</div>';

    try {
      const data    = await apiFetch('escort_requests');
      const escorts = data.escorts || [];

      /* ── Update critical alert card (always refresh) ── */
      if (escorts.length > 0) {
        const first = escorts[0];
        const time  = first.preferred_time
          ? new Date(first.preferred_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'TBD';
        if (alertTitle) alertTitle.innerHTML = 'Escort request <span class="highlight">#' + escHtml(first.escort_id) + '</span>';
        if (alertMsg)   alertMsg.innerHTML   = escHtml(first.donor_gender || 'Donor') + ' donor pickup at <strong>' + escHtml(first.pickup_address) + '</strong> at <strong>' + time + '</strong>';
        if (alertBtn)   alertBtn.style.display = '';
      } else {
        if (alertTitle) alertTitle.innerHTML = 'No pending escort requests';
        if (alertMsg)   alertMsg.innerHTML   = 'All donor pickups are up to date.';
        if (alertBtn)   alertBtn.style.display = 'none';
      }

      /* ── Update sidebar list ── */
      if (!list) return;
      if (escorts.length === 0) {
        list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">No pending escort requests.</div>';
        return;
      }
      list.innerHTML = escorts.map(function(e) {
        var time = e.preferred_time ? new Date(e.preferred_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD';
        return '<div class="alert-item alert-warning" data-escort-id="' + e.id + '">' +
          '<div class="alert-icon-wrap alert-icon-orange">👤</div>' +
          '<div class="alert-body">' +
            '<div class="alert-title">Escort #' + escHtml(e.escort_id) + '</div>' +
            '<div class="alert-msg">' + escHtml(e.donor_gender || 'Donor') + ' donor · Pickup: ' + escHtml(e.pickup_address) + ' @ ' + time + ' → ' + escHtml(e.dropoff_location) + '</div>' +
            '<div class="alert-meta"><span class="alert-time">Donor: ' + escHtml(e.donor_name) + '</span>' + statusBadge(e.status) + '</div>' +
          '</div>' +
          '<button class="alert-action-btn update-escort" data-escort="' + e.id + '" data-escort-label="' + escHtml(e.escort_id) + '">Update Status</button>' +
          '</div>';
      }).join('');
      list.querySelectorAll('.update-escort').forEach(function(btn) { attachUpdateEscort(btn); });
    } catch (err) {
      handleErr(err);
      if (list) list.innerHTML = '<div style="color:#f66;padding:12px;">' + escHtml(err.message) + '</div>';
      console.error('loadEscortRequests:', err);
    }
  }

  async function loadDroneDispatches() {
    var droneList = document.querySelector('.drone-list');
    const alertTitle = document.getElementById('droneAlertTitle');
    const alertMsg   = document.getElementById('droneAlertMsg');
    const alertBtn   = document.getElementById('handleDroneBtn');

    if (droneList) droneList.innerHTML = '<div style="padding:16px;text-align:center;">⏳ Loading…</div>';

    try {
      var data   = await apiFetch('drone_dispatches');
      var drones = data.drones || [];

      /* ── Update critical alert card (always refresh) ── */
      var handoffDrone = drones.find(function(d) { return d.status === 'awaiting_handoff' || d.status === 'scheduled'; });
      if (handoffDrone) {
        if (alertTitle) alertTitle.innerHTML = 'Drone dispatch <span class="highlight">#' + escHtml(handoffDrone.dispatch_id) + '</span>';
        if (alertMsg)   alertMsg.innerHTML   = 'Requires manual handoff at destination — <strong>' + escHtml(handoffDrone.destination) + '</strong>';
        if (alertBtn)   alertBtn.style.display = '';
      } else {
        if (alertTitle) alertTitle.innerHTML = 'No pending drone handoffs';
        if (alertMsg)   alertMsg.innerHTML   = 'All drone dispatches are completed or in transit.';
        if (alertBtn)   alertBtn.style.display = 'none';
      }

      /* ── Update preview list ── */
      if (!droneList) return;
      if (drones.length === 0) {
        droneList.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">No drone dispatches.</div>';
        return;
      }
      droneList.innerHTML = drones.slice(0, 5).map(function(d) {
        var isDone  = d.status === 'delivered';
        var btnHtml = isDone
          ? '<button class="table-btn" disabled>Completed</button>'
          : '<button class="table-btn handoff-drone" data-drone="' + d.id + '" data-label="' + escHtml(d.dispatch_id) + '">Confirm Handoff</button>';
        return '<div class="drone-item" data-drone-id="' + d.id + '">' +
          '<span><strong>#' + escHtml(d.dispatch_id) + '</strong> · ' + escHtml(d.destination) + '</span>' +
          '<span>Blood: ' + escHtml(d.blood_group) + ' (' + d.units_required + ' unit' + (d.units_required != 1 ? 's' : '') + ')</span>' +
          statusBadge(d.status) + btnHtml + '</div>';
      }).join('');
      droneList.querySelectorAll('.handoff-drone').forEach(function(btn) { attachHandoffDrone(btn); });
    } catch (err) {
      handleErr(err);
      if (droneList) droneList.innerHTML = '<div style="color:#f66;padding:12px;">' + escHtml(err.message) + '</div>';
      console.error('loadDroneDispatches:', err);
    }
  }
  /* ═══════════════════════════════════════════════════════════
     ACTION HANDLERS
  ═══════════════════════════════════════════════════════════ */

  function attachConfirmDelivery(btn) {
    btn.addEventListener('click', function() {
      var requestId = btn.getAttribute('data-id');
      var label     = btn.getAttribute('data-label') || requestId;
      var dest      = (btn.closest('tr') && btn.closest('tr').children[1]) ? btn.closest('tr').children[1].textContent : '';
      openModal('Confirm Delivery #' + label,
        '<p>Mark this delivery as <strong>completed</strong>?</p>' +
        '<p style="margin-top:8px;color:var(--text-muted);">Destination: ' + escHtml(dest) + '</p>' +
        '<label style="display:block;margin-top:14px;font-size:.83rem;font-weight:600;color:var(--text-muted);">Recipient / Staff ID</label>' +
        '<input type="text" id="recipientId" placeholder="Enter ID or name" style="' + IS + '">' +
        '<label style="display:block;margin-top:12px;font-size:.83rem;font-weight:600;color:var(--text-muted);">Blood Bag Condition</label>' +
        '<select id="bagCondition" style="' + IS + '"><option>Intact — temperature OK</option><option>Minor delay but acceptable</option><option>Requires inspection</option></select>' +
        '<div style="margin-top:14px;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="bagIntact"> Blood bag sealed and intact</label></div>',
        async function() {
          try {
            await apiFetch('confirm_delivery', 'POST', { request_id: parseInt(requestId) });
            showToast('✅ Delivery #' + label + ' confirmed!');
            var row = btn.closest('tr');
            if (row) row.remove();
            loadDashboardStats();
          } catch (e) { showToast('❌ ' + e.message, 5000); }
        }, 'Confirm Delivery');
    });
  }

  function attachUpdateEscort(btn) {
    btn.addEventListener('click', function() {
      var escortId    = btn.getAttribute('data-escort');
      var escortLabel = btn.getAttribute('data-escort-label') || escortId;
      openModal('Update Escort #' + escortLabel + ' Status',
        '<label style="display:block;margin-bottom:8px;font-size:.83rem;font-weight:600;color:var(--text-muted);">New Status</label>' +
        '<select id="newEscortStatus" style="' + IS + '">' +
          '<option value="accepted">Accepted — proceeding to pickup</option>' +
          '<option value="in_progress">In Progress — donor in vehicle</option>' +
          '<option value="completed">Completed — donor delivered</option>' +
          '<option value="cancelled">Cancelled</option>' +
        '</select>' +
        '<p style="color:var(--text-muted);font-size:.82rem;margin-top:10px;">This updates the escort record in the database.</p>',
        async function() {
          var newStatus = document.getElementById('newEscortStatus') && document.getElementById('newEscortStatus').value;
          if (!newStatus) return;
          try {
            var data = await apiFetch('update_escort', 'POST', { escort_id: parseInt(escortId), status: newStatus });
            showToast(data.message || '✅ Escort updated.');
            loadEscortRequests();
            loadDashboardStats();
          } catch (e) { showToast('❌ ' + e.message, 5000); }
        }, 'Update Status');
    });
  }

  function attachHandoffDrone(btn) {
    btn.addEventListener('click', function() {
      var droneRowId = btn.getAttribute('data-drone');
      var label      = btn.getAttribute('data-label') || droneRowId;
      var item       = btn.closest('.drone-item');
      var destText   = item && item.querySelector('span:first-child') ? item.querySelector('span:first-child').textContent : '';
      openModal('Confirm Drone Handoff — #' + label,
        '<p><strong>Dispatch:</strong> #' + escHtml(label) + '</p>' +
        '<p style="margin-top:6px;"><strong>Location:</strong> ' + escHtml(destText) + '</p>' +
        '<p style="margin-top:10px;color:var(--text-muted);">Manual handoff required at reception desk. Verify blood bag integrity before signing.</p>' +
        '<div style="margin-top:14px;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="handoffConfirmCheck"> I confirm receipt and handoff is completed</label></div>',
        async function() {
          if (!(document.getElementById('handoffConfirmCheck') && document.getElementById('handoffConfirmCheck').checked)) {
            showToast('⚠️ Please tick the confirmation checkbox first.'); return;
          }
          try {
            var data = await apiFetch('confirm_drone_handoff', 'POST', { dispatch_id: parseInt(droneRowId) });
            showToast(data.success ? '✅ Drone #' + label + ' handoff confirmed!' : '⚠️ ' + (data.message || 'No change.'));
            loadDroneDispatches();
            loadDashboardStats();
          } catch (e) { showToast('❌ ' + e.message, 5000); }
        }, 'Confirm Handoff');
    });
  }

  /* ═══════════════════════════════════════════════════════════
     FULL PAGE SECTION VIEWS  (NO CACHE — always load fresh)
  ═══════════════════════════════════════════════════════════ */

  async function loadDeliveriesView() {
    var view = document.getElementById('deliveriesView');
    if (!view) return;
    view.innerHTML = sectionLoading('Active Deliveries');
    try {
      var data = await apiFetch('active_deliveries');
      var rows = data.deliveries || [];
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>🚚 Active Deliveries</h2><p>All current blood delivery assignments in your zone.</p></div>' +
        '<div class="glass-card table-card reveal visible" style="margin-top:20px;">' +
          '<div class="card-header">' +
            '<div class="card-title"><span class="card-title-icon">🚚</span> Active Deliveries (' + rows.length + ')</div>' +
            '<button class="btn-ghost-sm" id="refreshDeliveriesFullBtn">🔄 Refresh</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table">' +
            '<thead><tr><th>Delivery ID</th><th>Destination</th><th>Blood Group</th><th>Units</th><th>Status</th><th>ETA</th><th>Action</th></tr></thead>' +
            '<tbody>' +
            (rows.length === 0
              ? '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No active deliveries right now.</td></tr>'
              : rows.map(function(d) {
                  return '<tr>' +
                    '<td><strong>#' + escHtml(d.delivery_id) + '</strong></td>' +
                    '<td>' + escHtml(d.destination) + '</td>' +
                    '<td><span class="status-badge badge-warn">' + escHtml(d.blood_group) + '</span></td>' +
                    '<td>' + (d.units_required != null ? d.units_required : '—') + '</td>' +
                    '<td>' + statusBadge(d.status) + '</td>' +
                    '<td>' + escHtml(d.eta) + '</td>' +
                    '<td><button class="table-btn confirm-delivery" data-id="' + d.id + '" data-label="' + escHtml(d.delivery_id) + '">Confirm</button></td>' +
                    '</tr>';
                }).join('')
            ) +
            '</tbody></table></div></div>';
      view.querySelectorAll('.confirm-delivery').forEach(function(btn) { attachConfirmDelivery(btn); });
      var rfBtn = view.querySelector('#refreshDeliveriesFullBtn');
      if (rfBtn) rfBtn.addEventListener('click', function() { loadDeliveriesView(); showToast('Deliveries refreshed.'); });
      initReveal();
    } catch (err) {
      handleErr(err);
      view.innerHTML = sectionError('Active Deliveries', err.message);
      console.error('loadDeliveriesView:', err);
    }
  }

  async function loadEscortsView() {
    var view = document.getElementById('escortsView');
    if (!view) return;
    view.innerHTML = sectionLoading('Escort Requests');
    try {
      var data    = await apiFetch('escort_requests');
      var escorts = data.escorts || [];
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>👥 Escort Requests</h2><p>Donor escort and companion transport management.</p></div>' +
        '<div class="glass-card table-card reveal visible" style="margin-top:20px;">' +
          '<div class="card-header">' +
            '<div class="card-title"><span class="card-title-icon">👥</span> Escort Requests (' + escorts.length + ')</div>' +
            '<button class="btn-ghost-sm" id="refreshEscortsFullBtn">🔄 Refresh</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table">' +
            '<thead><tr><th>Escort ID</th><th>Donor</th><th>Gender</th><th>Pickup Address</th><th>Preferred Time</th><th>Dropoff</th><th>Status</th><th>Action</th></tr></thead>' +
            '<tbody>' +
            (escorts.length === 0
              ? '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No pending escort requests.</td></tr>'
              : escorts.map(function(e) {
                  var time = e.preferred_time ? new Date(e.preferred_time).toLocaleString() : 'TBD';
                  return '<tr>' +
                    '<td><strong>#' + escHtml(e.escort_id) + '</strong></td>' +
                    '<td>' + escHtml(e.donor_name) + '</td>' +
                    '<td>' + escHtml(e.donor_gender || '—') + '</td>' +
                    '<td>' + escHtml(e.pickup_address) + '</td>' +
                    '<td>' + time + '</td>' +
                    '<td>' + escHtml(e.dropoff_location) + '</td>' +
                    '<td>' + statusBadge(e.status) + '</td>' +
                    '<td><button class="table-btn update-escort" data-escort="' + e.id + '" data-escort-label="' + escHtml(e.escort_id) + '">Update</button></td>' +
                    '</tr>';
                }).join('')
            ) +
            '</tbody></table></div></div>';
      view.querySelectorAll('.update-escort').forEach(function(btn) { attachUpdateEscort(btn); });
      var rfBtn = view.querySelector('#refreshEscortsFullBtn');
      if (rfBtn) rfBtn.addEventListener('click', function() { loadEscortsView(); showToast('Escorts refreshed.'); });
      initReveal();
    } catch (err) {
      handleErr(err);
      view.innerHTML = sectionError('Escort Requests', err.message);
      console.error('loadEscortsView:', err);
    }
  }

  async function loadDronesView() {
    var view = document.getElementById('dronesView');
    if (!view) return;
    view.innerHTML = sectionLoading('Drone Assignments');
    try {
      var data   = await apiFetch('drone_dispatches');
      var drones = data.drones || [];
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>🚁 Drone Assignments</h2><p>Live drone dispatch and handoff status.</p></div>' +
        '<div class="glass-card table-card reveal visible" style="margin-top:20px;">' +
          '<div class="card-header">' +
            '<div class="card-title"><span class="card-title-icon">🚁</span> Drone Dispatches (' + drones.length + ')</div>' +
            '<button class="btn-ghost-sm" id="refreshDronesFullBtn">🔄 Refresh</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table">' +
            '<thead><tr><th>Dispatch ID</th><th>Drone</th><th>Destination</th><th>Blood Group</th><th>Units</th><th>Status</th><th>Est. Arrival</th><th>Action</th></tr></thead>' +
            '<tbody>' +
            (drones.length === 0
              ? '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No drone dispatches found.</td></tr>'
              : drones.map(function(d) {
                  var isDone  = d.status === 'delivered';
                  var arrival = d.estimated_arrival ? new Date(d.estimated_arrival).toLocaleString() : 'TBD';
                  var btn     = isDone
                    ? '<button class="table-btn" disabled>Completed</button>'
                    : '<button class="table-btn handoff-drone" data-drone="' + d.id + '" data-label="' + escHtml(d.dispatch_id) + '">Confirm Handoff</button>';
                  return '<tr>' +
                    '<td><strong>#' + escHtml(d.dispatch_id) + '</strong></td>' +
                    '<td>' + escHtml(d.drone_model) + '</td>' +
                    '<td>' + escHtml(d.destination) + '</td>' +
                    '<td><span class="status-badge badge-warn">' + escHtml(d.blood_group) + '</span></td>' +
                    '<td>' + (d.units_required != null ? d.units_required : '—') + '</td>' +
                    '<td>' + statusBadge(d.status) + '</td>' +
                    '<td>' + arrival + '</td>' +
                    '<td>' + btn + '</td>' +
                    '</tr>';
                }).join('')
            ) +
            '</tbody></table></div></div>';
      view.querySelectorAll('.handoff-drone').forEach(function(btn) { attachHandoffDrone(btn); });
      var rfBtn = view.querySelector('#refreshDronesFullBtn');
      if (rfBtn) rfBtn.addEventListener('click', function() { loadDronesView(); showToast('Drones refreshed.'); });
      initReveal();
    } catch (err) {
      handleErr(err);
      view.innerHTML = sectionError('Drone Assignments', err.message);
      console.error('loadDronesView:', err);
    }
  }

  async function loadCompletedView() {
    var view = document.getElementById('completedView');
    if (!view) return;
    view.innerHTML = sectionLoading('Completed Deliveries');
    try {
      var data      = await apiFetch('completed_deliveries');
      var completed = data.completed || [];
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>✅ Completed Deliveries — Today</h2><p>History of delivered blood units for today.</p></div>' +
        '<div class="glass-card table-card reveal visible" style="margin-top:20px;">' +
          '<div class="card-header">' +
            '<div class="card-title"><span class="card-title-icon">✅</span> Today\'s Completions (' + completed.length + ')</div>' +
            '<button class="btn-ghost-sm" id="refreshCompletedFullBtn">🔄 Refresh</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table">' +
            '<thead><tr><th>Delivery ID</th><th>Destination</th><th>Blood Group</th><th>Units</th><th>Delivered At</th></tr></thead>' +
            '<tbody>' +
            (completed.length === 0
              ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">No deliveries completed today.</td></tr>'
              : completed.map(function(d) {
                  return '<tr>' +
                    '<td><strong>#' + escHtml(d.delivery_id) + '</strong></td>' +
                    '<td>' + escHtml(d.destination) + '</td>' +
                    '<td><span class="status-badge badge-ok">' + escHtml(d.blood_group) + '</span></td>' +
                    '<td>' + (d.units_required != null ? d.units_required : '—') + '</td>' +
                    '<td>' + (d.delivered_at ? new Date(d.delivered_at).toLocaleTimeString() : '—') + '</td>' +
                    '</tr>';
                }).join('')
            ) +
            '</tbody></table></div></div>';
      var rfBtn = view.querySelector('#refreshCompletedFullBtn');
      if (rfBtn) rfBtn.addEventListener('click', function() { loadCompletedView(); showToast('Completed deliveries refreshed.'); });
      initReveal();
    } catch (err) {
      handleErr(err);
      view.innerHTML = sectionError('Completed Deliveries', err.message);
      console.error('loadCompletedView:', err);
    }
  }

  async function loadProfileView() {
    var view = document.getElementById('profileView');
    if (!view) return;
    view.innerHTML = sectionLoading('Profile');
    try {
      var data = await apiFetch('staff_profile');
      var p    = data.profile;
      if (!p) {
        view.innerHTML =
          '<div class="section-header reveal visible"><h2>👤 Delivery Staff Profile</h2></div>' +
          '<div class="reveal visible" style="color:#f87171;padding:24px;background:rgba(239,68,68,0.08);border-radius:14px;margin:20px 0;border:1px solid rgba(239,68,68,0.18);">' +
          '⚠️ Profile not found.<br>' +
          '<small style="opacity:.7;">No <code>delivery_staff</code> record exists for your logged-in user.<br>' +
          'Ensure <code>$_SESSION[\'user_id\']</code> is set and matches a row in the <code>delivery_staff</code> table.</small>' +
          '</div>';
        initReveal();
        return;
      }
      var initials = (p.full_name || 'DS').substring(0, 2).toUpperCase();
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>👤 Delivery Staff Profile</h2></div>' +
        '<div class="glass-card reveal visible" style="margin-top:20px;padding:32px;max-width:540px;">' +
          '<div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;">' +
            '<div class="sidebar-avatar" style="width:64px;height:64px;font-size:1.5rem;flex-shrink:0;">' + initials + '</div>' +
            '<div>' +
              '<div style="font-size:1.35rem;font-weight:800;">' + escHtml(p.full_name) + '</div>' +
              '<div style="color:var(--text-muted);margin-top:2px;">Delivery Staff · Zone: ' + escHtml(p.assigned_zone || 'N/A') + '</div>' +
            '</div>' +
          '</div>' +
          '<table class="data-table"><tbody>' +
            '<tr><td style="width:140px;font-weight:600;color:var(--text-muted);">Email</td><td>' + escHtml(p.email || '—') + '</td></tr>' +
            '<tr><td style="font-weight:600;color:var(--text-muted);">Phone</td><td>' + escHtml(p.phone || '—') + '</td></tr>' +
            '<tr><td style="font-weight:600;color:var(--text-muted);">Vehicle Type</td><td>' + escHtml(p.vehicle_type || '—') + '</td></tr>' +
            '<tr><td style="font-weight:600;color:var(--text-muted);">License No.</td><td>' + escHtml(p.license_no || '—') + '</td></tr>' +
            '<tr><td style="font-weight:600;color:var(--text-muted);">Assigned Zone</td><td>' + escHtml(p.assigned_zone || '—') + '</td></tr>' +
          '</tbody></table>' +
        '</div>';
      initReveal();
    } catch (err) {
      handleErr(err);
      view.innerHTML = sectionError('Profile', err.message);
      console.error('loadProfileView:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     MISC BUTTON BINDINGS
  ═══════════════════════════════════════════════════════════ */
  var refreshBtn = document.getElementById('refreshDeliveriesBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', function() { loadActiveDeliveries(); showToast('Deliveries refreshed.'); });

  var viewAllDeliveriesLink = document.getElementById('viewAllDeliveriesLink');
  if (viewAllDeliveriesLink) viewAllDeliveriesLink.addEventListener('click', function(e) { e.preventDefault(); navigateTo('deliveries'); });

  var viewAllEscortsLink = document.getElementById('viewAllEscortsLink');
  if (viewAllEscortsLink) viewAllEscortsLink.addEventListener('click', function(e) { e.preventDefault(); navigateTo('escorts'); });

  var viewAllDronesBtn = document.getElementById('viewAllDronesBtn');
  if (viewAllDronesBtn) viewAllDronesBtn.addEventListener('click', function() { navigateTo('drones'); });

  var handleEscortBtn = document.getElementById('handleEscortBtn');
  if (handleEscortBtn) handleEscortBtn.addEventListener('click', function() {
    var first = document.querySelector('#escortList .update-escort');
    if (first) first.click(); else navigateTo('escorts');
  });

  var handleDroneBtn = document.getElementById('handleDroneBtn');
  if (handleDroneBtn) handleDroneBtn.addEventListener('click', function() {
    var first = document.querySelector('.drone-list .handoff-drone');
    if (first) first.click(); else navigateTo('drones');
  });

  document.querySelectorAll('.action-card[data-action]').forEach(function(card) {
    card.addEventListener('click', function(e) {
      e.stopPropagation();
      var action = card.getAttribute('data-action');
      var map = { viewEscorts: 'escorts', updateEscort: 'escorts', viewDroneAssignments: 'drones', confirmDelivery: 'deliveries' };
      if (map[action]) navigateTo(map[action]);
      else showToast('Feature coming soon.');
    });
  });

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', function() { window.location.href = 'login.html'; });

  /* ═══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */
  function init() {
    initReveal();
    const saved = localStorage.getItem('bbDelPage');
    if (saved && document.querySelector(`.sidebar-link[data-section="${saved}"]`)) {
      navigateTo(saved);
    } else {
      loadDashboardStats();
      loadActiveDeliveries();
      loadEscortRequests();
      loadDroneDispatches();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();

// ====== MERGED FROM KANIK ======
/* ============================================================
   BloodBridge — delivery_staff_dash.js  (FIXED & COMPLETE)

   ROOT CAUSES FIXED vs original:
   1. Section views showed "Loading..." permanently — now fully rendered.
   2. One-shot loaded flags prevented refresh after mutations — replaced
      with timestamp-based cache (60s TTL, invalidated on mutations).
   3. escHtml() placed at top of IIFE (used before declaration in async fns).
   4. Unified apiFetch() helper (mirrors working lab_technician portal).
   5. navigateTo() now scrolls to top + re-runs reveal animations.
   6. sectionError() helper shows friendly error + retry button.
   7. All action handlers (confirm, escort update, drone handoff) invalidate
      the section cache so next view visit shows fresh data.
   ============================================================ */

(function () {
  'use strict';

  const API = 'delivery_api.php';

  /* ── HTML ESCAPE (placed first — used in all async functions) ── */
  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── UNIFIED API FETCH (mirrors lab_technician_dash.js) ── */
  async function apiFetch(action, method, body) {
    method = method || 'GET';
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(`${API}?action=${action}`, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) {
      throw new Error('API returned non-JSON. Check delivery_api.php for PHP errors.\n\nRaw: ' + text.substring(0, 300));
    }
    if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  /* ── THEME ── */
  const html      = document.documentElement;
  const THEME_KEY = 'bb-theme';
  function applyTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
  function getTheme()    { return localStorage.getItem(THEME_KEY) || 'dark'; }
  applyTheme(getTheme());
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', () => applyTheme(getTheme() === 'dark' ? 'light' : 'dark'));

  /* ── SIDEBAR ── */
  const hamburger      = document.getElementById('hamburger');
  const sidebar        = document.getElementById('sidebar');
  const sidebarClose   = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function isMobile()   { return window.innerWidth < 1024; }
  function openSidebar() {
    sidebar.classList.add('open');
    if(isMobile()){ sidebarOverlay.classList.add('visible'); document.body.style.overflow = 'hidden'; }
    hamburger && hamburger.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    if(isMobile()){ sidebarOverlay.classList.remove('visible'); document.body.style.overflow = ''; }
    hamburger && hamburger.classList.remove('open');
  }
  if (hamburger)      hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  if (sidebarClose)   sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  window.addEventListener('resize', () => { isMobile() ? closeSidebar() : openSidebar(); });
  if (!isMobile()) openSidebar();

  /* ── NAVIGATION
     FIX: was missing scroll-to-top and reveal re-run.
          Also loads data for each section correctly.         ── */
  const VIEW_MAP = {
    dashboard : 'dashboardView',
    deliveries: 'deliveriesView',
    escorts   : 'escortsView',
    drones    : 'dronesView',
    completed : 'completedView',
    profile   : 'profileView',
  };

  function navigateTo(sectionId) {
    Object.values(VIEW_MAP).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    const targetId = VIEW_MAP[sectionId] || VIEW_MAP.dashboard;
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.classList.add('active');

    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));
    const al = document.querySelector('.sidebar-link[data-section="' + sectionId + '"]');
    if (al) al.classList.add('active');

    if (isMobile()) closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(initReveal, 100);

    switch (sectionId) {
      case 'deliveries': loadDeliveriesView(); break;
      case 'escorts':    loadEscortsView();    break;
      case 'drones':     loadDronesView();     break;
      case 'completed':  loadCompletedView();  break;
      case 'profile':    loadProfileView();    break;
    }
    localStorage.setItem('bbDelPage', sectionId);
  }

  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.getAttribute('data-section')); });
  });

  /* ── TOAST ── */
  function showToast(msg, duration) {
    duration = duration || 3500;
    let t = document.getElementById('toastMessage');
    if (!t) { t = document.createElement('div'); t.id = 'toastMessage'; t.className = 'toast-message'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), duration);
  }

  /* ── MODAL ── */
  const modal        = document.getElementById('globalModal');
  const modalTitle   = document.getElementById('modalTitle');
  const modalBody    = document.getElementById('modalBody');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalCancel  = document.getElementById('modalCancelBtn');
  const modalConfirm = document.getElementById('modalConfirmBtn');
  let currentModalAction = null;

  function openModal(title, content, onConfirm, confirmLabel) {
    if (!modal) return;
    modalTitle.textContent = title;
    modalBody.innerHTML    = content;
    if (modalConfirm) modalConfirm.textContent = confirmLabel || 'Confirm';
    modal.style.display    = 'flex';
    currentModalAction     = onConfirm || null;
  }
  function closeModal() { if (modal) modal.style.display = 'none'; currentModalAction = null; }
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (modalCancel)   modalCancel.addEventListener('click', closeModal);
  if (modalConfirm)  modalConfirm.addEventListener('click', () => { if (currentModalAction) currentModalAction(); closeModal(); });
  if (modal)         modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && modal.style.display === 'flex') closeModal(); });

  /* ── COUNTER ANIMATION ── */
  function animateCounter(el, target, duration) {
    if (!el || isNaN(target)) return;
    duration = duration || 900;
    let start = null;
    (function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    })(performance.now());
  }

  /* ── SCROLL REVEAL ── */
  function initReveal() {
    const els = document.querySelectorAll('.reveal:not(.visible)');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('visible')); return; }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => obs.observe(e));
  }

  /* ── STATUS BADGE ── */
  function statusBadge(status) {
    const map = {
      pending         : ['badge-warn', 'Pending'],
      approved        : ['badge-ok',   'Approved'],
      dispatched      : ['badge-ok',   'Dispatched'],
      in_transit      : ['badge-ok',   'In Transit'],
      delivered       : ['badge-ok',   'Delivered'],
      cancelled       : ['badge-err',  'Cancelled'],
      scheduled       : ['badge-warn', 'Scheduled'],
      in_transit_drone: ['badge-ok',   'In Transit'],
      awaiting_handoff: ['badge-warn', 'Awaiting Handoff'],
      accepted        : ['badge-ok',   'Accepted'],
      in_progress     : ['badge-ok',   'In Progress'],
      completed       : ['badge-ok',   'Completed'],
    };
    const [cls, label] = map[status] || ['badge-warn', status || 'Unknown'];
    return '<span class="status-badge ' + cls + '">' + escHtml(label) + '</span>';
  }

  /* ── SECTION HELPERS ── */
  const IS = 'width:100%;background:var(--input-bg);padding:9px 12px;border-radius:9px;border:1px solid var(--input-border);color:var(--text-primary);font-family:Outfit,sans-serif;font-size:.88rem;margin-top:4px;';

  function sectionLoading(label) {
    return '<div style="padding:40px 24px;text-align:center;color:var(--text-muted);">' +
           '<div style="font-size:2rem;margin-bottom:12px;">⏳</div>' +
           '<p>Loading ' + escHtml(label) + '…</p></div>';
  }
  function sectionError(label, msg) {
    return '<div style="color:#f87171;padding:24px;background:rgba(239,68,68,0.08);border-radius:14px;margin:20px 0;border:1px solid rgba(239,68,68,0.18);">' +
           '<strong>⚠️ Failed to load ' + escHtml(label) + '</strong><br>' +
           '<span style="font-size:.85rem;opacity:.8;">' + escHtml(msg) + '</span><br><br>' +
           '<button onclick="location.reload()" style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#f87171;padding:6px 14px;border-radius:8px;cursor:pointer;">Retry Page</button>' +
           '</div>';
  }

  /* ── SECTION CACHE (timestamp-based, 60s TTL) ── */
  const _cache = { deliveries: 0, escorts: 0, drones: 0, completed: 0, profile: 0 };
  const TTL    = 60000;

  /* ═══════════════════════════════════════════════════════════
     DASHBOARD WIDGETS
  ═══════════════════════════════════════════════════════════ */

  async function loadDashboardStats() {
    try {
      const data = await apiFetch('dashboard_stats');
      animateCounter(document.getElementById('activeDeliveries'), data.active_deliveries || 0);
      animateCounter(document.getElementById('escortRequests'),   data.escort_requests   || 0);
      animateCounter(document.getElementById('completedToday'),   data.completed_today   || 0);
      const zoneEl = document.getElementById('assignedZone');
      if (zoneEl) zoneEl.textContent = data.assigned_zone || 'N/A';
      document.querySelectorAll('.delivery-name').forEach(el => { el.textContent = data.staff_name || 'Staff'; });
      const sn = document.querySelector('.sidebar-user-name');
      if (sn) sn.textContent = data.staff_name || 'Staff';
      const sr = document.querySelector('.sidebar-user-role');
      if (sr) sr.textContent = 'Delivery Staff · Zone: ' + (data.assigned_zone || 'N/A');
      const zb = document.querySelector('.zone-badge strong');
      if (zb) zb.textContent = data.assigned_zone || 'N/A';
    } catch (err) {
      console.error('loadDashboardStats:', err);
      showToast('⚠️ Could not load stats. Check delivery_api.php.', 5000);
    }
  }

  async function loadActiveDeliveries() {
    const tbody = document.getElementById('activeDeliveriesTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">⏳ Loading…</td></tr>';
    try {
      const data = await apiFetch('active_deliveries');
      const rows = (data.deliveries || []).slice(0, 5);
      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">No active deliveries right now.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(function(d) {
        return '<tr>' +
          '<td>#' + escHtml(d.delivery_id) + '</td>' +
          '<td>' + escHtml(d.destination) + '</td>' +
          '<td>' + escHtml(d.blood_group) + '</td>' +
          '<td>' + escHtml(d.eta) + '</td>' +
          '<td><button class="table-btn confirm-delivery" data-id="' + d.id + '" data-label="' + escHtml(d.delivery_id) + '">Confirm</button></td>' +
          '</tr>';
      }).join('');
      tbody.querySelectorAll('.confirm-delivery').forEach(function(btn) { attachConfirmDelivery(btn); });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:#f66;padding:14px;">' + escHtml(err.message) + '</td></tr>';
      console.error('loadActiveDeliveries:', err);
    }
  }

  async function loadEscortRequests() {
    const list = document.getElementById('escortList');
    if (!list) return;
    list.innerHTML = '<div style="padding:16px;text-align:center;">⏳ Loading…</div>';
    try {
      const data    = await apiFetch('escort_requests');
      const escorts = data.escorts || [];
      var escortTitle = document.getElementById('escortAlertTitle');
      var escortMsg   = document.getElementById('escortAlertMsg');
      var escortBtn   = document.getElementById('handleEscortBtn');
      if (escorts.length > 0) {
        var first = escorts[0];
        var time = first.preferred_time ? new Date(first.preferred_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD';
        if (escortTitle) escortTitle.innerHTML = 'Escort request <span class="highlight">#' + escHtml(first.escort_id) + '</span>';
        if (escortMsg)   escortMsg.innerHTML   = escHtml(first.donor_gender || 'Donor') + ' donor pickup at <strong>' + escHtml(first.pickup_address) + '</strong> at <strong>' + time + '</strong>';
        if (escortBtn)   escortBtn.style.display = '';
      } else {
        if (escortTitle) escortTitle.textContent = '✅ No pending escort requests.';
        if (escortMsg)   escortMsg.textContent   = 'All escort assignments are up to date.';
        if (escortBtn)   escortBtn.style.display = 'none';
        list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">No pending escort requests.</div>';
        return;
      }
      list.innerHTML = escorts.map(function(e) {
        var time = e.preferred_time ? new Date(e.preferred_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD';
        return '<div class="alert-item alert-warning" data-escort-id="' + e.id + '">' +
          '<div class="alert-icon-wrap alert-icon-orange">👤</div>' +
          '<div class="alert-body">' +
            '<div class="alert-title">Escort #' + escHtml(e.escort_id) + '</div>' +
            '<div class="alert-msg">' + escHtml(e.donor_gender || 'Donor') + ' donor · Pickup: ' + escHtml(e.pickup_address) + ' @ ' + time + ' → ' + escHtml(e.dropoff_location) + '</div>' +
            '<div class="alert-meta"><span class="alert-time">Donor: ' + escHtml(e.donor_name) + '</span>' + statusBadge(e.status) + '</div>' +
          '</div>' +
          '<button class="alert-action-btn update-escort" data-escort="' + e.id + '" data-escort-label="' + escHtml(e.escort_id) + '">Update Status</button>' +
          '</div>';
      }).join('');
      list.querySelectorAll('.update-escort').forEach(function(btn) { attachUpdateEscort(btn); });
    } catch (err) {
      list.innerHTML = '<div style="color:#f66;padding:12px;">' + escHtml(err.message) + '</div>';
      console.error('loadEscortRequests:', err);
    }
  }

  async function loadDroneDispatches() {
    var droneList = document.querySelector('.drone-list');
    if (!droneList) return;
    droneList.innerHTML = '<div style="padding:16px;text-align:center;">⏳ Loading…</div>';
    try {
      var data   = await apiFetch('drone_dispatches');
      var drones = data.drones || [];
      var droneTitle = document.getElementById('droneAlertTitle');
      var droneMsg   = document.getElementById('droneAlertMsg');
      var droneBtn   = document.getElementById('handleDroneBtn');
      var handoffDrone = drones.find(function(d) { return d.status === 'awaiting_handoff' || d.status === 'scheduled'; });
      if (handoffDrone) {
        if (droneTitle) droneTitle.innerHTML = 'Drone dispatch <span class="highlight">#' + escHtml(handoffDrone.dispatch_id) + '</span>';
        if (droneMsg)   droneMsg.innerHTML   = 'Requires manual handoff at destination — <strong>' + escHtml(handoffDrone.destination) + '</strong>';
        if (droneBtn)   droneBtn.style.display = '';
      } else {
        if (droneTitle) droneTitle.textContent = '✅ No drone dispatches requiring attention.';
        if (droneMsg)   droneMsg.textContent   = 'All drone assignments are up to date.';
        if (droneBtn)   droneBtn.style.display = 'none';
      }
      if (drones.length === 0) {
        droneList.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">No drone dispatches.</div>';
        return;
      }
      droneList.innerHTML = drones.slice(0, 5).map(function(d) {
        var isDone  = d.status === 'delivered';
        var btnHtml = isDone
          ? '<button class="table-btn" disabled>Completed</button>'
          : '<button class="table-btn handoff-drone" data-drone="' + d.id + '" data-label="' + escHtml(d.dispatch_id) + '">Confirm Handoff</button>';
        return '<div class="drone-item" data-drone-id="' + d.id + '">' +
          '<span><strong>#' + escHtml(d.dispatch_id) + '</strong> · ' + escHtml(d.destination) + '</span>' +
          '<span>Blood: ' + escHtml(d.blood_group) + ' (' + d.units_required + ' unit' + (d.units_required != 1 ? 's' : '') + ')</span>' +
          statusBadge(d.status) + btnHtml + '</div>';
      }).join('');
      droneList.querySelectorAll('.handoff-drone').forEach(function(btn) { attachHandoffDrone(btn); });
    } catch (err) {
      droneList.innerHTML = '<div style="color:#f66;padding:12px;">' + escHtml(err.message) + '</div>';
      console.error('loadDroneDispatches:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     ACTION HANDLERS
  ═══════════════════════════════════════════════════════════ */

  function attachConfirmDelivery(btn) {
    btn.addEventListener('click', function() {
      var requestId = btn.getAttribute('data-id');
      var label     = btn.getAttribute('data-label') || requestId;
      var dest      = (btn.closest('tr') && btn.closest('tr').children[1]) ? btn.closest('tr').children[1].textContent : '';
      openModal('Confirm Delivery #' + label,
        '<p>Mark this delivery as <strong>completed</strong>?</p>' +
        '<p style="margin-top:8px;color:var(--text-muted);">Destination: ' + escHtml(dest) + '</p>' +
        '<label style="display:block;margin-top:14px;font-size:.83rem;font-weight:600;color:var(--text-muted);">Recipient / Staff ID</label>' +
        '<input type="text" id="recipientId" placeholder="Enter ID or name" style="' + IS + '">' +
        '<label style="display:block;margin-top:12px;font-size:.83rem;font-weight:600;color:var(--text-muted);">Blood Bag Condition</label>' +
        '<select id="bagCondition" style="' + IS + '"><option>Intact — temperature OK</option><option>Minor delay but acceptable</option><option>Requires inspection</option></select>' +
        '<div style="margin-top:14px;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="bagIntact"> Blood bag sealed and intact</label></div>',
        async function() {
          try {
            await apiFetch('confirm_delivery', 'POST', { request_id: parseInt(requestId) });
            showToast('✅ Delivery #' + label + ' confirmed!');
            var row = btn.closest('tr');
            if (row) row.remove();
            _cache.deliveries = 0;
            loadDashboardStats();
          } catch (e) { showToast('❌ ' + e.message, 5000); }
        }, 'Confirm Delivery');
    });
  }

  function attachUpdateEscort(btn) {
    btn.addEventListener('click', function() {
      var escortId    = btn.getAttribute('data-escort');
      var escortLabel = btn.getAttribute('data-escort-label') || escortId;
      openModal('Update Escort #' + escortLabel + ' Status',
        '<label style="display:block;margin-bottom:8px;font-size:.83rem;font-weight:600;color:var(--text-muted);">New Status</label>' +
        '<select id="newEscortStatus" style="' + IS + '">' +
          '<option value="accepted">Accepted — proceeding to pickup</option>' +
          '<option value="in_progress">In Progress — donor in vehicle</option>' +
          '<option value="completed">Completed — donor delivered</option>' +
          '<option value="cancelled">Cancelled</option>' +
        '</select>' +
        '<p style="color:var(--text-muted);font-size:.82rem;margin-top:10px;">This updates the escort record in the database.</p>',
        async function() {
          var newStatus = document.getElementById('newEscortStatus') && document.getElementById('newEscortStatus').value;
          if (!newStatus) return;
          try {
            var data = await apiFetch('update_escort', 'POST', { escort_id: parseInt(escortId), status: newStatus });
            showToast(data.message || '✅ Escort updated.');
            _cache.escorts = 0;
            loadEscortRequests();
            loadDashboardStats();
          } catch (e) { showToast('❌ ' + e.message, 5000); }
        }, 'Update Status');
    });
  }

  function attachHandoffDrone(btn) {
    btn.addEventListener('click', function() {
      var droneRowId = btn.getAttribute('data-drone');
      var label      = btn.getAttribute('data-label') || droneRowId;
      var item       = btn.closest('.drone-item');
      var destText   = item && item.querySelector('span:first-child') ? item.querySelector('span:first-child').textContent : '';
      openModal('Confirm Drone Handoff — #' + label,
        '<p><strong>Dispatch:</strong> #' + escHtml(label) + '</p>' +
        '<p style="margin-top:6px;"><strong>Location:</strong> ' + escHtml(destText) + '</p>' +
        '<p style="margin-top:10px;color:var(--text-muted);">Manual handoff required at reception desk. Verify blood bag integrity before signing.</p>' +
        '<div style="margin-top:14px;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="handoffConfirmCheck"> I confirm receipt and handoff is completed</label></div>',
        async function() {
          if (!(document.getElementById('handoffConfirmCheck') && document.getElementById('handoffConfirmCheck').checked)) {
            showToast('⚠️ Please tick the confirmation checkbox first.'); return;
          }
          try {
            var data = await apiFetch('confirm_drone_handoff', 'POST', { dispatch_id: parseInt(droneRowId) });
            showToast(data.success ? '✅ Drone #' + label + ' handoff confirmed!' : '⚠️ ' + (data.message || 'No change.'));
            _cache.drones = 0;
            loadDroneDispatches();
            loadDashboardStats();
          } catch (e) { showToast('❌ ' + e.message, 5000); }
        }, 'Confirm Handoff');
    });
  }

  /* ═══════════════════════════════════════════════════════════
     FULL PAGE SECTION VIEWS
     FIX: All were stub "Loading…" placeholders. Now fully built.
  ═══════════════════════════════════════════════════════════ */

  async function loadDeliveriesView() {
    if (Date.now() - _cache.deliveries < TTL) return;
    var view = document.getElementById('deliveriesView');
    if (!view) return;
    view.innerHTML = sectionLoading('Active Deliveries');
    try {
      var data = await apiFetch('active_deliveries');
      var rows = data.deliveries || [];
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>🚚 Active Deliveries</h2><p>All current blood delivery assignments in your zone.</p></div>' +
        '<div class="glass-card table-card reveal visible" style="margin-top:20px;">' +
          '<div class="card-header">' +
            '<div class="card-title"><span class="card-title-icon">🚚</span> Active Deliveries (' + rows.length + ')</div>' +
            '<button class="btn-ghost-sm" id="refreshDeliveriesFullBtn">🔄 Refresh</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table">' +
            '<thead><tr><th>Delivery ID</th><th>Destination</th><th>Blood Group</th><th>Units</th><th>Status</th><th>ETA</th><th>Action</th></tr></thead>' +
            '<tbody>' +
            (rows.length === 0
              ? '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No active deliveries right now.</td></tr>'
              : rows.map(function(d) {
                  return '<tr>' +
                    '<td><strong>#' + escHtml(d.delivery_id) + '</strong></td>' +
                    '<td>' + escHtml(d.destination) + '</td>' +
                    '<td><span class="status-badge badge-warn">' + escHtml(d.blood_group) + '</span></td>' +
                    '<td>' + (d.units_required != null ? d.units_required : '—') + '</td>' +
                    '<td>' + statusBadge(d.status) + '</td>' +
                    '<td>' + escHtml(d.eta) + '</td>' +
                    '<td><button class="table-btn confirm-delivery" data-id="' + d.id + '" data-label="' + escHtml(d.delivery_id) + '">Confirm</button></td>' +
                    '</tr>';
                }).join('')
            ) +
            '</tbody></table></div></div>';
      view.querySelectorAll('.confirm-delivery').forEach(function(btn) { attachConfirmDelivery(btn); });
      var rfBtn = view.querySelector('#refreshDeliveriesFullBtn');
      if (rfBtn) rfBtn.addEventListener('click', function() { _cache.deliveries = 0; loadDeliveriesView(); showToast('Deliveries refreshed.'); });
      _cache.deliveries = Date.now();
    } catch (err) {
      view.innerHTML = sectionError('Active Deliveries', err.message);
      console.error('loadDeliveriesView:', err);
    }
  }

  async function loadEscortsView() {
    if (Date.now() - _cache.escorts < TTL) return;
    var view = document.getElementById('escortsView');
    if (!view) return;
    view.innerHTML = sectionLoading('Escort Requests');
    try {
      var data    = await apiFetch('escort_requests');
      var escorts = data.escorts || [];
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>👥 Escort Requests</h2><p>Donor escort and companion transport management.</p></div>' +
        '<div class="glass-card table-card reveal visible" style="margin-top:20px;">' +
          '<div class="card-header">' +
            '<div class="card-title"><span class="card-title-icon">👥</span> Escort Requests (' + escorts.length + ')</div>' +
            '<button class="btn-ghost-sm" id="refreshEscortsFullBtn">🔄 Refresh</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table">' +
            '<thead><tr><th>Escort ID</th><th>Donor</th><th>Gender</th><th>Pickup Address</th><th>Preferred Time</th><th>Dropoff</th><th>Status</th><th>Action</th></tr></thead>' +
            '<tbody>' +
            (escorts.length === 0
              ? '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No pending escort requests.</td></tr>'
              : escorts.map(function(e) {
                  var time = e.preferred_time ? new Date(e.preferred_time).toLocaleString() : 'TBD';
                  return '<tr>' +
                    '<td><strong>#' + escHtml(e.escort_id) + '</strong></td>' +
                    '<td>' + escHtml(e.donor_name) + '</td>' +
                    '<td>' + escHtml(e.donor_gender || '—') + '</td>' +
                    '<td>' + escHtml(e.pickup_address) + '</td>' +
                    '<td>' + time + '</td>' +
                    '<td>' + escHtml(e.dropoff_location) + '</td>' +
                    '<td>' + statusBadge(e.status) + '</td>' +
                    '<td><button class="table-btn update-escort" data-escort="' + e.id + '" data-escort-label="' + escHtml(e.escort_id) + '">Update</button></td>' +
                    '</tr>';
                }).join('')
            ) +
            '</tbody></table></div></div>';
      view.querySelectorAll('.update-escort').forEach(function(btn) { attachUpdateEscort(btn); });
      var rfBtn = view.querySelector('#refreshEscortsFullBtn');
      if (rfBtn) rfBtn.addEventListener('click', function() { _cache.escorts = 0; loadEscortsView(); showToast('Escorts refreshed.'); });
      _cache.escorts = Date.now();
    } catch (err) {
      view.innerHTML = sectionError('Escort Requests', err.message);
      console.error('loadEscortsView:', err);
    }
  }

  async function loadDronesView() {
    if (Date.now() - _cache.drones < TTL) return;
    var view = document.getElementById('dronesView');
    if (!view) return;
    view.innerHTML = sectionLoading('Drone Assignments');
    try {
      var data   = await apiFetch('drone_dispatches');
      var drones = data.drones || [];
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>🚁 Drone Assignments</h2><p>Live drone dispatch and handoff status.</p></div>' +
        '<div class="glass-card table-card reveal visible" style="margin-top:20px;">' +
          '<div class="card-header">' +
            '<div class="card-title"><span class="card-title-icon">🚁</span> Drone Dispatches (' + drones.length + ')</div>' +
            '<button class="btn-ghost-sm" id="refreshDronesFullBtn">🔄 Refresh</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table">' +
            '<thead><tr><th>Dispatch ID</th><th>Drone</th><th>Destination</th><th>Blood Group</th><th>Units</th><th>Status</th><th>Est. Arrival</th><th>Action</th></tr></thead>' +
            '<tbody>' +
            (drones.length === 0
              ? '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No drone dispatches found.</td></tr>'
              : drones.map(function(d) {
                  var isDone  = d.status === 'delivered';
                  var arrival = d.estimated_arrival ? new Date(d.estimated_arrival).toLocaleString() : 'TBD';
                  var btn     = isDone
                    ? '<button class="table-btn" disabled>Completed</button>'
                    : '<button class="table-btn handoff-drone" data-drone="' + d.id + '" data-label="' + escHtml(d.dispatch_id) + '">Confirm Handoff</button>';
                  return '<tr>' +
                    '<td><strong>#' + escHtml(d.dispatch_id) + '</strong></td>' +
                    '<td>' + escHtml(d.drone_model) + '</td>' +
                    '<td>' + escHtml(d.destination) + '</td>' +
                    '<td><span class="status-badge badge-warn">' + escHtml(d.blood_group) + '</span></td>' +
                    '<td>' + (d.units_required != null ? d.units_required : '—') + '</td>' +
                    '<td>' + statusBadge(d.status) + '</td>' +
                    '<td>' + arrival + '</td>' +
                    '<td>' + btn + '</td>' +
                    '</tr>';
                }).join('')
            ) +
            '</tbody></table></div></div>';
      view.querySelectorAll('.handoff-drone').forEach(function(btn) { attachHandoffDrone(btn); });
      var rfBtn = view.querySelector('#refreshDronesFullBtn');
      if (rfBtn) rfBtn.addEventListener('click', function() { _cache.drones = 0; loadDronesView(); showToast('Drones refreshed.'); });
      _cache.drones = Date.now();
    } catch (err) {
      view.innerHTML = sectionError('Drone Assignments', err.message);
      console.error('loadDronesView:', err);
    }
  }

  async function loadCompletedView() {
    if (Date.now() - _cache.completed < TTL) return;
    var view = document.getElementById('completedView');
    if (!view) return;
    view.innerHTML = sectionLoading('Completed Deliveries');
    try {
      var data      = await apiFetch('completed_deliveries');
      var completed = data.completed || [];
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>✅ Completed Deliveries — Today</h2><p>History of delivered blood units for today.</p></div>' +
        '<div class="glass-card table-card reveal visible" style="margin-top:20px;">' +
          '<div class="card-header">' +
            '<div class="card-title"><span class="card-title-icon">✅</span> Today\'s Completions (' + completed.length + ')</div>' +
            '<button class="btn-ghost-sm" id="refreshCompletedFullBtn">🔄 Refresh</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table">' +
            '<thead><tr><th>Delivery ID</th><th>Destination</th><th>Blood Group</th><th>Units</th><th>Delivered At</th></tr></thead>' +
            '<tbody>' +
            (completed.length === 0
              ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">No deliveries completed today.</td></tr>'
              : completed.map(function(d) {
                  return '<tr>' +
                    '<td><strong>#' + escHtml(d.delivery_id) + '</strong></td>' +
                    '<td>' + escHtml(d.destination) + '</td>' +
                    '<td><span class="status-badge badge-ok">' + escHtml(d.blood_group) + '</span></td>' +
                    '<td>' + (d.units_required != null ? d.units_required : '—') + '</td>' +
                    '<td>' + (d.delivered_at ? new Date(d.delivered_at).toLocaleTimeString() : '—') + '</td>' +
                    '</tr>';
                }).join('')
            ) +
            '</tbody></table></div></div>';
      var rfBtn = view.querySelector('#refreshCompletedFullBtn');
      if (rfBtn) rfBtn.addEventListener('click', function() { _cache.completed = 0; loadCompletedView(); showToast('Completed deliveries refreshed.'); });
      _cache.completed = Date.now();
    } catch (err) {
      view.innerHTML = sectionError('Completed Deliveries', err.message);
      console.error('loadCompletedView:', err);
    }
  }

  async function loadProfileView() {
    if (Date.now() - _cache.profile < TTL) return;
    var view = document.getElementById('profileView');
    if (!view) return;
    view.innerHTML = sectionLoading('Profile');
    try {
      var data = await apiFetch('staff_profile');
      var p    = data.profile;
      if (!p) {
        view.innerHTML =
          '<div class="section-header reveal visible"><h2>👤 Delivery Staff Profile</h2></div>' +
          '<div style="color:#f87171;padding:24px;background:rgba(239,68,68,0.08);border-radius:14px;margin:20px 0;border:1px solid rgba(239,68,68,0.18);">' +
          '⚠️ Profile not found.<br>' +
          '<small style="opacity:.7;">No <code>delivery_staff</code> record exists for your logged-in user.<br>' +
          'Ensure <code>$_SESSION[\'user_id\']</code> is set and matches a row in the <code>delivery_staff</code> table.</small>' +
          '</div>';
        return;
      }
      var initials = (p.full_name || 'DS').substring(0, 2).toUpperCase();
      view.innerHTML =
        '<div class="section-header reveal visible"><h2>👤 Delivery Staff Profile</h2></div>' +
        '<div class="glass-card reveal visible" style="margin-top:20px;padding:32px;max-width:540px;">' +
          '<div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;">' +
            '<div class="sidebar-avatar" style="width:64px;height:64px;font-size:1.5rem;flex-shrink:0;">' + initials + '</div>' +
            '<div>' +
              '<div style="font-size:1.35rem;font-weight:800;">' + escHtml(p.full_name) + '</div>' +
              '<div style="color:var(--text-muted);margin-top:2px;">Delivery Staff · Zone: ' + escHtml(p.assigned_zone || 'N/A') + '</div>' +
            '</div>' +
          '</div>' +
          '<table class="data-table"><tbody>' +
            '<tr><td style="width:140px;font-weight:600;color:var(--text-muted);">Email</td><td>' + escHtml(p.email || '—') + '</td></tr>' +
            '<tr><td style="font-weight:600;color:var(--text-muted);">Phone</td><td>' + escHtml(p.phone || '—') + '</td></tr>' +
            '<tr><td style="font-weight:600;color:var(--text-muted);">Vehicle Type</td><td>' + escHtml(p.vehicle_type || '—') + '</td></tr>' +
            '<tr><td style="font-weight:600;color:var(--text-muted);">License No.</td><td>' + escHtml(p.license_no || '—') + '</td></tr>' +
            '<tr><td style="font-weight:600;color:var(--text-muted);">Assigned Zone</td><td>' + escHtml(p.assigned_zone || '—') + '</td></tr>' +
          '</tbody></table>' +
        '</div>';
      _cache.profile = Date.now();
    } catch (err) {
      view.innerHTML = sectionError('Profile', err.message);
      console.error('loadProfileView:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     MISC BUTTON BINDINGS
  ═══════════════════════════════════════════════════════════ */
  var refreshBtn = document.getElementById('refreshDeliveriesBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', function() { loadActiveDeliveries(); showToast('Deliveries refreshed.'); });

  var viewAllDeliveriesLink = document.getElementById('viewAllDeliveriesLink');
  if (viewAllDeliveriesLink) viewAllDeliveriesLink.addEventListener('click', function(e) { e.preventDefault(); navigateTo('deliveries'); });

  var viewAllEscortsLink = document.getElementById('viewAllEscortsLink');
  if (viewAllEscortsLink) viewAllEscortsLink.addEventListener('click', function(e) { e.preventDefault(); navigateTo('escorts'); });

  var viewAllDronesBtn = document.getElementById('viewAllDronesBtn');
  if (viewAllDronesBtn) viewAllDronesBtn.addEventListener('click', function() { navigateTo('drones'); });

  var handleEscortBtn = document.getElementById('handleEscortBtn');
  if (handleEscortBtn) handleEscortBtn.addEventListener('click', function() {
    var first = document.querySelector('#escortList .update-escort');
    if (first) first.click(); else navigateTo('escorts');
  });

  var handleDroneBtn = document.getElementById('handleDroneBtn');
  if (handleDroneBtn) handleDroneBtn.addEventListener('click', function() {
    var first = document.querySelector('.drone-list .handoff-drone');
    if (first) first.click(); else navigateTo('drones');
  });

  document.querySelectorAll('.action-card[data-action]').forEach(function(card) {
    card.addEventListener('click', function(e) {
      e.stopPropagation();
      var action = card.getAttribute('data-action');
      var map = { viewEscorts: 'escorts', updateEscort: 'escorts', viewDroneAssignments: 'drones', confirmDelivery: 'deliveries' };
      if (map[action]) navigateTo(map[action]);
      else showToast('Feature coming soon.');
    });
  });

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', function() { window.location.href = 'login.html'; });

  /* ═══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */
  function init() {
    initReveal();
    const saved = localStorage.getItem('bbDelPage');
    if (saved && document.querySelector(`.sidebar-link[data-section="${saved}"]`)) {
      navigateTo(saved);
    } else {
      loadDashboardStats();
      loadActiveDeliveries();
      loadEscortRequests();
      loadDroneDispatches();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();