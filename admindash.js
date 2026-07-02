/* ============================================================
   BloodBridge — admindash.js  (DATABASE-CONNECTED)
   API: admin_api.php
   Session: role='admin'
   ============================================================ */
(function () {
  'use strict';

  const API = 'admin_api.php';

  /* ── THEME ── */
  const html = document.documentElement;

  function getTheme() {
    return localStorage.getItem('bb-theme') || 'dark';
  }

  function setTheme(t) {
    html.setAttribute('data-theme', t);
    localStorage.setItem('bb-theme', t);
  }

  setTheme(getTheme());

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  /* ── SIDEBAR ── */
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function isMobile() {
    return window.innerWidth < 1024;
  }

  function openSidebar() {
    if (!sidebar || !sidebarOverlay) return;
    sidebar.classList.add('open');
    if (isMobile()) { sidebarOverlay.classList.add('visible'); document.body.style.overflow = 'hidden'; }
    if (hamburger) hamburger.classList.add('open');
  }

  function closeSidebar() {
    if (!sidebar || !sidebarOverlay) return;
    sidebar.classList.remove('open');
    if (isMobile()) { sidebarOverlay.classList.remove('visible'); document.body.style.overflow = ''; }
    if (hamburger) hamburger.classList.remove('open');
  }

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
  }

  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  window.addEventListener('resize', () => {
    isMobile() ? closeSidebar() : openSidebar();
  });
  if (!isMobile()) openSidebar();

  /* ── NAVIGATION ── */
  const pageViews = document.querySelectorAll('.page-view');
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');

  window.navigateTo = function (pageId) {
    pageViews.forEach(p => p.classList.remove('active'));
    sidebarLinks.forEach(l => l.classList.remove('active'));

    const target = document.getElementById('page-' + pageId);
    if (target) {
      target.classList.add('active');
      setTimeout(triggerReveals, 50);
    }

    const activeLink = document.querySelector(`.sidebar-link[data-page="${pageId}"]`);
    if (activeLink) activeLink.classList.add('active');

    if (isMobile()) closeSidebar();

    switch (pageId) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'investigate':
        loadInvestigate();
        break;
      case 'ratings':
        loadRatings();
        break;
      case 'coldchain':
        loadColdChain();
        break;
      case 'thalassemia':
        loadThalassemia();
        break;
      case 'expiry':
        loadExpiry();
        break;
      case 'emergency':
        loadEmergency();
        break;
      case 'profile':
        loadProfile();
        break;
      case 'users':
        loadUsers();
        break;
    }
    localStorage.setItem('bbAdminPage', pageId);
  };

  sidebarLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.getAttribute('data-page'));
    });
  });

  /* ── UTILS ── */
  function txt(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v == null ? '—' : v;
  }

  function setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v == null ? '' : v;
  }

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fmtDate(ds) {
    if (!ds) return '—';
    const d = new Date(ds);
    if (isNaN(d)) return ds;
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function fmtDateTime(ds) {
    if (!ds) return '—';
    const d = new Date(ds);
    if (isNaN(d)) return String(ds);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function timeAgo(ds) {
    if (!ds) return '';
    const s = Math.floor((Date.now() - new Date(ds)) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
    return Math.floor(s / 86400) + ' days ago';
  }

  function statusBadge(st) {
    const m = {
      active: 'badge-ok',
      pending: 'badge-warn',
      approved: 'badge-ok',
      rejected: 'badge-danger',
      processed: 'badge-ok',
      critical: 'badge-danger',
      flagged: 'badge-warn',
      blocked: 'badge-danger'
    };

    return `<span class="status-badge ${m[st] || 'badge-warn'}">${esc(st || '—')}</span>`;
  }

  function starStr(rating) {
    const r = parseFloat(rating) || 0;
    const full = Math.max(0, Math.min(5, Math.round(r)));
    const warn = r < 3;

    return `<span class="rating-stars${warn ? ' warning' : ''}">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span><span class="rating-num${warn ? ' warning' : ''}">${r.toFixed(1)}</span>`;
  }

  function encodedPayload(obj) {
    return encodeURIComponent(JSON.stringify(obj));
  }

  async function apiFetch(action, method, body) {
    method = method || 'GET';

    const opts = {
      method,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API}?action=${action}`, opts);
    const raw = await res.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch (_) {
      console.error('admin_api.php raw output:', raw.slice(0, 800));
      throw new Error('Server error. Check admin_api.php or browser console.');
    }

    if (!data.success && res.status === 401) {
      throw new Error('AUTH_FAILED');
    }

    if (!data.success) {
      throw new Error(data.error || (data.errors || []).join(', ') || 'HTTP ' + res.status);
    }

    return data;
  }

  /* ── TOAST ── */
  function showToast(msg, dur) {
    dur = dur || 3500;

    let t = document.getElementById('bbToast');

    if (!t) {
      t = document.createElement('div');
      t.id = 'bbToast';
      t.style.cssText = 'position:fixed;bottom:28px;right:28px;background:var(--glass-bg,rgba(255,255,255,.06));backdrop-filter:blur(20px);border:1px solid var(--glass-border,rgba(255,255,255,.1));padding:12px 22px;border-radius:60px;font-size:.86rem;z-index:99999;opacity:0;transform:translateY(16px);transition:all .3s;pointer-events:none;max-width:380px;';
      document.body.appendChild(t);
    }

    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';

    clearTimeout(t._t);
    t._t = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(16px)';
    }, dur);
  }

  window.showToast = showToast;

  /* ── COUNTER ── */
  function animCount(el, target, dur) {
    if (!el) return;

    target = parseInt(target || 0, 10);
    dur = dur || 900;

    let s = null;

    const step = ts => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / dur, 1);
      el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);

      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    };

    requestAnimationFrame(step);
  }

  /* ── REVEAL ── */
  function triggerReveals() {
    const els = document.querySelectorAll('.reveal:not(.visible)');

    if (!('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('visible'));
      return;
    }

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.06 });

    els.forEach(e => obs.observe(e));
  }

  function handleErr(err) {
    if (err.message === 'AUTH_FAILED') {
      showToast('⚠️ Session expired. Redirecting…', 3000);
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 3000);
    } else {
      console.error('[AdminDash]', err.message);
    }
  }

  /* ══════════════════════════════════════════════
     SHARED ADMIN MODAL
  ══════════════════════════════════════════════ */
  let activeAdminModalAction = null;

  function showAdminModal({ label, title, body, message, meta, confirmText, textareaVisible, onConfirm }) {
    const modal = document.getElementById('adminWarningModal');

    if (!modal) {
      if (typeof onConfirm === 'function') onConfirm(message || '');
      return;
    }

    const labelEl = document.getElementById('adminWarningModalLabel');
    const titleEl = document.getElementById('adminWarningModalTitle');
    const bodyEl = document.getElementById('adminWarningModalBody');
    const msgEl = document.getElementById('adminWarningModalMessage');
    const metaEl = document.getElementById('adminWarningModalMeta');
    const confirmEl = document.getElementById('adminWarningModalConfirm');

    if (labelEl) labelEl.textContent = label || 'Admin Action';
    if (titleEl) titleEl.textContent = title || 'Confirm Action';
    if (bodyEl) bodyEl.textContent = body || 'Please confirm this action.';

    if (msgEl) {
      msgEl.value = message || '';
      msgEl.style.display = textareaVisible === false ? 'none' : '';

      const labelNode = document.querySelector('label[for="adminWarningModalMessage"]');
      if (labelNode) {
        labelNode.style.display = textareaVisible === false ? 'none' : '';
      }
    }

    if (metaEl) metaEl.innerHTML = meta || '';
    if (confirmEl) confirmEl.textContent = confirmText || 'Confirm';

    activeAdminModalAction = () => {
      const finalMessage = msgEl ? msgEl.value.trim() : (message || '');
      if (typeof onConfirm === 'function') onConfirm(finalMessage);
    };

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-modal-open');

    setTimeout(() => {
      if (msgEl && textareaVisible !== false) msgEl.focus();
    }, 50);
  }

  function closeAdminModal() {
    const modal = document.getElementById('adminWarningModal');
    if (!modal) return;

    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-modal-open');
    activeAdminModalAction = null;

    setTimeout(() => {
      if (modal.getAttribute('aria-hidden') === 'true') {
        modal.style.display = 'none';
      }
      /* Restore confirm button and message textarea visibility after hidden */
      const confirmEl = document.getElementById('adminWarningModalConfirm');
      if (confirmEl) confirmEl.style.display = '';
      const msgEl = document.getElementById('adminWarningModalMessage');
      if (msgEl) msgEl.style.display = '';
      const labelNodeMsg = document.querySelector('label[for="adminWarningModalMessage"]');
      if (labelNodeMsg) labelNodeMsg.style.display = '';
    }, 180);
  }

  const adminModalCancel = document.getElementById('adminWarningModalCancel');
  const adminModalX = document.getElementById('adminWarningModalX');
  const adminModalConfirm = document.getElementById('adminWarningModalConfirm');
  const adminModal = document.getElementById('adminWarningModal');

  if (adminModalCancel) adminModalCancel.addEventListener('click', closeAdminModal);
  if (adminModalX) adminModalX.addEventListener('click', closeAdminModal);

  if (adminModalConfirm) {
    adminModalConfirm.addEventListener('click', () => {
      if (activeAdminModalAction) activeAdminModalAction();
    });
  }

  if (adminModal) {
    adminModal.addEventListener('click', e => {
      if (e.target && e.target.dataset && e.target.dataset.modalClose) {
        closeAdminModal();
      }
    });
  }

  /* ══════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════ */
  async function loadDashboard() {
    try {
      const data = await apiFetch('dashboard');
      const a = data.admin;
      const m = data.metrics;
      const n = data.network;

      txt('sidebarName', a.full_name);
      txt('sidebarRole', a.role || 'Super Admin');

      const sa = document.getElementById('sidebarAvatar');
      if (sa) {
        sa.textContent = a.full_name
          .split(' ')
          .map(w => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
      }

      animCount(document.getElementById('metricBanks'), m.total_banks);
      animCount(document.getElementById('metricFlags'), m.suspicious_flags);
      animCount(document.getElementById('metricLowRating'), m.low_rating);
      animCount(document.getElementById('metricUsers'), m.total_users);


      txt('actDonors', Number(n.active_donors || 0).toLocaleString());
      txt('actBanks', n.active_banks);
      txt('actRequests', n.open_requests);

      const groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
      const stock = data.blood_stock || {};
      const bsGrid = document.getElementById('bloodStockGrid');

      if (bsGrid) {
        bsGrid.innerHTML = groups.map(g => {
          const cnt = stock[g] || 0;
          const level = cnt === 0 ? 'crit' : cnt < 5 ? 'low' : cnt < 20 ? 'med' : 'high';
          const lbl = { crit: 'Crit', low: 'Low', med: 'Med', high: 'High' }[level];

          return `<div class="blood-chip" data-status="${level}">
            <span class="bc-type">${g}</span>
            <span class="bc-status status-${level}">${lbl}</span>
          </div>`;
        }).join('');

        bsGrid.querySelectorAll('.blood-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            chip.style.transform = 'scale(.94)';
            setTimeout(() => {
              chip.style.transform = '';
            }, 120);
          });
        });
      }

      const tbody = document.getElementById('bankRatingsBody');

      if (tbody) {
        const banks = data.bank_ratings || [];

        tbody.innerHTML = banks.length
          ? banks.map(b => {
              const r = parseFloat(b.rating_avg) || 0;
              const warn = r < 3;
              const bsc = b.status === 'active' ? 'badge-ok' : b.status === 'flagged' ? 'badge-warn' : 'badge-danger';

              const reviewPayload = encodedPayload({
                target_type: 'blood_bank',
                target_id: parseInt(b.id, 10),
                name: b.name || ''
              });

              const btn = warn
                ? `<button class="table-btn warning" onclick="viewWarningResponses('blood_bank', ${parseInt(b.id, 10)}, JSON.parse(decodeURIComponent('${reviewPayload}')).name)">Review</button>`
                : `<button class="table-btn" onclick="showToast('Rating is healthy for ${esc(b.name)}.')">View</button>`;

              return `<tr>
                <td><strong>${esc(b.name)}</strong></td>
                <td>${esc(b.city || '—')}</td>
                <td>${starStr(r)}</td>
                <td><span class="status-badge ${bsc}">${esc(b.status || '—')}</span></td>
                <td>${btn}</td>
              </tr>`;
            }).join('')
          : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">No blood banks found.</td></tr>';
      }
    } catch (err) {
      handleErr(err);
      if (err.message !== 'AUTH_FAILED') {
        showToast('❌ Dashboard error: ' + err.message, 5000);
      }
    }

    triggerReveals();
  }

  window.exportDashboardPDF = async function () {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const data = await apiFetch('dashboard');
      const m = data.metrics || {};
      const n = data.network || {};

      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      /* Header */
      doc.setFillColor(192, 22, 44);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('BloodBridge — Admin Dashboard Report', 14, 15);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(dateStr, 283, 15, { align: 'right' });

      /* Metrics */
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Dashboard Metrics', 14, 35);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 38, 283, 38);

      const metrics = [
        ['Blood Banks', String(m.total_banks || 0)],
        ['Suspicious Flags', String(m.suspicious_flags || 0)],
        ['Banks Below 3*', String(m.low_rating || 0)],
        ['Active Donor Recipients', String(m.total_users || 0)],
      ];

      doc.autoTable({
        startY: 42,
        head: [['Metric', 'Value']],
        body: metrics,
        theme: 'grid',
        headStyles: { fillColor: [192, 22, 44], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40, halign: 'center' } },
        tableWidth: 130,
        margin: { left: 14 },
      });

      /* Network Activity */
      const netY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('Network Activity', 14, netY);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, netY + 3, 283, netY + 3);

      const networkRows = [
        ['Active Donors', String(n.active_donors || 0)],
        ['Active Banks', String(n.active_banks || 0)],
        ['Open Requests', String(n.open_requests || 0)],
      ];

      doc.autoTable({
        startY: netY + 7,
        head: [['Stat', 'Count']],
        body: networkRows,
        theme: 'grid',
        headStyles: { fillColor: [192, 22, 44], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40, halign: 'center' } },
        tableWidth: 130,
        margin: { left: 14 },
      });

      /* Blood Bank Ratings */
      const ratingsData = await apiFetch('ratings');
      const banks = ratingsData.banks || [];

      const ratY = 42;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('Blood Bank Ratings', 158, ratY);
      doc.setDrawColor(200, 200, 200);
      doc.line(158, ratY + 3, 283, ratY + 3);

      const bankRows = banks.map(b => [
        b.name || '—',
        b.city || '—',
        (parseFloat(b.rating_avg) || 0).toFixed(1) + ' *',
        b.status || '—'
      ]);

      doc.autoTable({
        startY: ratY + 7,
        head: [['Bank Name', 'Location', 'Rating', 'Status']],
        body: bankRows,
        theme: 'grid',
        headStyles: { fillColor: [192, 22, 44], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: 158 },
      });

      /* Footer */
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('BloodBridge v2.0 — Computer-generated report', 14, 205);
        doc.text('Page ' + i + ' of ' + pageCount, 283, 205, { align: 'right' });
      }

      doc.save('BloodBridge_Admin_Report_' + new Date().toISOString().slice(0, 10) + '.pdf');
      showToast('✅ Report downloaded successfully.');
    } catch (e) {
      showToast('❌ Export failed: ' + e.message, 5000);
    }
  };

  /* ══════════════════════════════════════════════
     GENERIC PAGE EXPORT
  ══════════════════════════════════════════════ */
  window.exportPagePDF = async function (pageId) {
    showToast('⏳ Generating ' + pageId + ' report…', 120000);

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const titles = {
        investigate: 'Investigate Suspicious Activity',
        ratings:     'Blood Bank Ratings',
        coldchain:   'Cold Chain Monitoring',
        thalassemia: 'Thalassemia Carrier Registry',
        expiry:      'Expiry Analytics',
        emergency:   'Request Oversight',
        users:       'User Management',
      };
      const title = titles[pageId] || pageId.charAt(0).toUpperCase() + pageId.slice(1);
      const dateStr = new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

      /* Branded header */
      doc.setFillColor(192, 22, 44);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('BloodBridge — ' + title, 14, 15);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(dateStr, 283, 15, { align:'right' });

      doc.setTextColor(60, 60, 60);
      let y = 35;

      /* ══ Per-page content ══ */
      switch (pageId) {

        /* ── Investigate ── */
        case 'investigate': {
          const [uData, bData] = await Promise.all([
            apiFetch('investigate&entity=user'),
            apiFetch('investigate&entity=blood_bank'),
          ]);

          doc.setFontSize(10); doc.setFont('helvetica','bold');
          doc.text('Donors / Recipients (Trust Score < 50)', 14, y);
          y += 5;
          doc.setDrawColor(200,200,200); doc.line(14, y, 283, y); y += 4;

          const uRows = (uData.rows || []).map(r => [
            r.display_id || '—', r.name || '—', r.blood_group || '—',
            String(r.trust_score ?? '—'), r.status_label || '—',
          ]);
          if (uRows.length) {
            doc.autoTable({
              startY: y, head:[['ID','Name','Blood Group','Trust Score','Status']], body:uRows,
              theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:8, fontStyle:'bold'},
              bodyStyles:{fontSize:7}, margin:{left:14},
              columnStyles:{0:{cellWidth:25},1:{cellWidth:50},2:{cellWidth:22},3:{cellWidth:22,halign:'center'},4:{cellWidth:22,halign:'center'}},
            });
            y = doc.lastAutoTable.finalY + 8;
          } else {
            y += 4; doc.setFontSize(8); doc.setTextColor(150,150,150);
            doc.text('No flagged donors / recipients found.', 14, y); y += 8;
          }

          doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(60,60,60);
          doc.text('Blood Banks (Rating < 3.00)', 14, y);
          y += 5; doc.setDrawColor(200,200,200); doc.line(14, y, 283, y); y += 4;

          const bRows = (bData.rows || []).map(r => [
            r.display_id || '—', r.name || '—', r.city || '—',
            (parseFloat(r.rating) || 0).toFixed(1) + ' ★', r.status_label || '—',
          ]);
          if (bRows.length) {
            doc.autoTable({
              startY: y, head:[['ID','Bank Name','City','Rating','Status']], body:bRows,
              theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:8, fontStyle:'bold'},
              bodyStyles:{fontSize:7}, margin:{left:14},
              columnStyles:{0:{cellWidth:25},1:{cellWidth:50},2:{cellWidth:30},3:{cellWidth:22,halign:'center'},4:{cellWidth:22,halign:'center'}},
            });
          } else {
            y += 4; doc.setFontSize(8); doc.setTextColor(150,150,150);
            doc.text('No flagged blood banks found.', 14, y);
          }
          break;
        }

        /* ── Ratings ── */
        case 'ratings': {
          const data = await apiFetch('ratings');
          const banks = data.banks || [];

          doc.setFontSize(10); doc.setFont('helvetica','bold');
          doc.text('Blood Bank Ratings Overview', 14, y);
          y += 5; doc.line(14, y, 283, y); y += 4;

          if (banks.length) {
            doc.autoTable({
              startY: y,
              head:[['#','Bank Name','Location','Rating','Reviews','Status']],
              body: banks.map((b,i) => [
                String(i+1), b.name || '—', b.city || '—',
                (parseFloat(b.rating_avg)||0).toFixed(1) + ' ★',
                String(b.review_count || 0), b.status || '—',
              ]),
              theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:8, fontStyle:'bold'},
              bodyStyles:{fontSize:7}, margin:{left:14},
              columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:50},2:{cellWidth:28},3:{cellWidth:22,halign:'center'},4:{cellWidth:18,halign:'center'},5:{cellWidth:20,halign:'center'}},
            });
          } else {
            y += 4; doc.setFontSize(8); doc.setTextColor(150,150,150);
            doc.text('No ratings data available.', 14, y);
          }
          break;
        }

        /* ── Cold Chain ── */
        case 'coldchain': {
          const data = await apiFetch('coldchain');

          const total = data.total || 0;
          const unresolved = data.unresolved || 0;
          const banksAffected = data.banks_affected || 0;

          doc.setFontSize(10); doc.setFont('helvetica','bold');
          doc.text('Cold Chain Breach Summary', 14, y);
          y += 5; doc.line(14, y, 283, y); y += 4;

          doc.autoTable({
            startY: y,
            head:[['Metric','Value']],
            body:[
              ['Total Breaches', String(total)],
              ['Unresolved', String(unresolved)],
              ['Banks Affected', String(banksAffected)],
            ],
            theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:8, fontStyle:'bold'},
            bodyStyles:{fontSize:8}, margin:{left:14},
            columnStyles:{0:{cellWidth:60},1:{cellWidth:30,halign:'center'}},
            tableWidth: 95,
          });
          y = doc.lastAutoTable.finalY + 8;

          const logs = data.logs || [];
          if (logs.length) {
            doc.setFontSize(10); doc.setFont('helvetica','bold');
            doc.text('Temperature Log', 14, y);
            y += 5; doc.line(14, y, 283, y); y += 4;

            doc.autoTable({
              startY: y,
              head:[['#','Bank','Sensor','Temperature','Status','Recorded']],
              body: logs.slice(0, 60).map((l,i) => [
                String(i+1), l.bank_name || '—', l.sensor_id || '—',
                (parseFloat(l.temperature_celsius)||0).toFixed(1) + '°C',
                l.is_alert == 1 ? '⚠ Alert' : 'OK',
                l.recorded_at || '—',
              ]),
              theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:7, fontStyle:'bold'},
              bodyStyles:{fontSize:7}, margin:{left:14},
              columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:45},2:{cellWidth:30},3:{cellWidth:25,halign:'center'},4:{cellWidth:20,halign:'center'},5:{cellWidth:35}},
            });
          }
          break;
        }

        /* ── Thalassemia ── */
        case 'thalassemia': {
          const data = await apiFetch('thalassemia');
          const carriers = data.carriers || [];

          doc.setFontSize(10); doc.setFont('helvetica','bold');
          doc.text('Thalassemia Carrier Records', 14, y);
          y += 5; doc.line(14, y, 283, y); y += 4;

          if (carriers.length) {
            doc.autoTable({
              startY: y,
              head:[['#','Patient Name','Carrier Status','Confirmed By','Confirmed At']],
              body: carriers.map((c,i) => [
                String(i+1), c.patient_name || '—',
                c.is_carrier == 1 ? '✓ Carrier' : '✗ Non-Carrier',
                c.confirmed_by_name || '—',
                c.confirmed_at || '—',
              ]),
              theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:8, fontStyle:'bold'},
              bodyStyles:{fontSize:7}, margin:{left:14},
              columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:55},2:{cellWidth:28,halign:'center'},3:{cellWidth:45},4:{cellWidth:40}},
            });
          } else {
            y += 4; doc.setFontSize(8); doc.setTextColor(150,150,150);
            doc.text('No thalassemia carrier records found.', 14, y);
          }
          break;
        }

        /* ── Expiry ── */
        case 'expiry': {
          const data = await apiFetch('expiry');

          const total = data.total || 0;
          const critical = data.critical || 0;
          const resolved = data.resolved || 0;

          doc.setFontSize(10); doc.setFont('helvetica','bold');
          doc.text('Expiry Alert Summary', 14, y);
          y += 5; doc.line(14, y, 283, y); y += 4;

          doc.autoTable({
            startY: y,
            head:[['Metric','Value']],
            body:[
              ['Total Alerts', String(total)],
              ['Critical (≤3 days)', String(critical)],
              ['Resolved', String(resolved)],
            ],
            theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:8, fontStyle:'bold'},
            bodyStyles:{fontSize:8}, margin:{left:14},
            columnStyles:{0:{cellWidth:60},1:{cellWidth:30,halign:'center'}},
            tableWidth: 95,
          });
          y = doc.lastAutoTable.finalY + 8;

          const alerts = data.alerts || [];
          if (alerts.length) {
            doc.setFontSize(10); doc.setFont('helvetica','bold');
            doc.text('Expiry Alerts', 14, y);
            y += 5; doc.line(14, y, 283, y); y += 4;

            doc.autoTable({
              startY: y,
              head:[['#','Bank','Bag ID','Days Left','Status','Alert Sent']],
              body: alerts.map((a,i) => [
                String(i+1), a.bank_name || '—', a.blood_bag_id || '—',
                String(a.days_until_expiry ?? '—'),
                a.resolved_at ? 'Resolved' : 'Active',
                a.alert_sent_at || '—',
              ]),
              theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:7, fontStyle:'bold'},
              bodyStyles:{fontSize:7}, margin:{left:14},
              columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:45},2:{cellWidth:35},3:{cellWidth:18,halign:'center'},4:{cellWidth:20,halign:'center'},5:{cellWidth:35}},
            });
          }
          break;
        }

        /* ── Emergency / Request Oversight ── */
        case 'emergency': {
          const data = await apiFetch('emergency');

          doc.setFontSize(10); doc.setFont('helvetica','bold');
          doc.text('Request Summary', 14, y);
          y += 5; doc.line(14, y, 283, y); y += 4;

          doc.autoTable({
            startY: y,
            head:[['Metric','Value']],
            body:[
              ['Total Requests', String(data.total || 0)],
              ['Pending', String(data.pending || 0)],
              ['Processed', String(data.processed || 0)],
              ['Emergency Requests', String(data.e_total || 0)],
            ],
            theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:8, fontStyle:'bold'},
            bodyStyles:{fontSize:8}, margin:{left:14},
            columnStyles:{0:{cellWidth:60},1:{cellWidth:30,halign:'center'}},
            tableWidth: 95,
          });
          y = doc.lastAutoTable.finalY + 8;

          const reqs = data.requests || [];
          if (reqs.length) {
            doc.setFontSize(10); doc.setFont('helvetica','bold');
            doc.text('All Requests', 14, y);
            y += 5; doc.line(14, y, 283, y); y += 4;

            doc.autoTable({
              startY: y,
              head:[['#','Type','Blood Group','Requester','Urgency','Status','Received']],
              body: reqs.map((r,i) => [
                String(i+1),
                r.request_type === 'emergency' ? 'Emergency' : 'Blood Req.',
                r.blood_group || '—',
                r.requester_name || '—',
                r.urgency || '—',
                r.status || '—',
                r.created_at || '—',
              ]),
              theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:7, fontStyle:'bold'},
              bodyStyles:{fontSize:6.5}, margin:{left:14},
              columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:22},2:{cellWidth:20},3:{cellWidth:45},4:{cellWidth:22},5:{cellWidth:20},6:{cellWidth:35}},
            });
          }
          break;
        }

        /* ── Users ── */
        case 'users': {
          const data = await apiFetch('users');
          const users = data.users || [];

          doc.setFontSize(10); doc.setFont('helvetica','bold');
          doc.text('User Management', 14, y);
          y += 5; doc.line(14, y, 283, y); y += 4;

          if (users.length) {
            doc.autoTable({
              startY: y,
              head:[['#','Name','Email','Phone','Blood Group','Type','Status','Created']],
              body: users.map((u,i) => [
                String(i+1), u.full_name || '—', u.email || '—',
                u.phone || '—', u.blood_group || '—',
                (u.user_type || '—').replace(/_/g,' '),
                u.is_active == 1 ? 'Active' : 'Inactive',
                u.created_at || '—',
              ]),
              theme:'grid', headStyles:{fillColor:[192,22,44], fontSize:7, fontStyle:'bold'},
              bodyStyles:{fontSize:6.5}, margin:{left:14},
              columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:35},2:{cellWidth:45},3:{cellWidth:28},4:{cellWidth:20,halign:'center'},5:{cellWidth:25},6:{cellWidth:16,halign:'center'},7:{cellWidth:30}},
            });
          } else {
            y += 4; doc.setFontSize(8); doc.setTextColor(150,150,150);
            doc.text('No user data available.', 14, y);
          }
          break;
        }
      }

      /* Footer */
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('BloodBridge v2.0 — Computer-generated report', 14, 205);
        doc.text('Page ' + i + ' of ' + pageCount, 283, 205, { align:'right' });
      }

      doc.save('BloodBridge_' + title.replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf');
      showToast('✅ Report downloaded successfully.', 3500);
    } catch (e) {
      showToast('❌ Export failed: ' + e.message, 5000);
    }
  };

  /* ══════════════════════════════════════════════
     INVESTIGATE
  ══════════════════════════════════════════════ */
  let currentInvestigateEntity = 'user';

  function badgeForAdminStatus(code, label) {
    const clsMap = {
      active:                'badge-ok',
      sent:                  'badge-warn',
      warning_sent:          'badge-warn',
      cool_down:             'badge-scheduled',
      improvement:           'badge-blue',
      acknowledged:          'badge-ok',
      improvement_submitted: 'badge-blue',
      appealed:              'badge-warn',
      rejected:              'badge-danger',
      blocked:               'badge-danger'
    };
    const lblMap = {
      active:                'Active',
      sent:                  'Warning Sent',
      cool_down:             'Cool Down',
      improvement:           'Plan Sent',
      acknowledged:          'Acknowledged',
      improvement_submitted: 'Plan Submitted',
      appealed:              'Appealed',
      rejected:              'Rejected',
      blocked:               'Blocked'
    };
    const cls = clsMap[code] || 'badge-warn';
    const displayLabel = lblMap[code] || label || code || '—';
    return `<span class="status-badge ${cls}">${esc(displayLabel)}</span>`;
  }

  function renderWarningTimeline(items) {
    if (!items || !items.length) {
      return '<div class="admin-timeline-empty">No warning timeline yet.</div>';
    }

    return `<div class="admin-timeline">${items.map(item => {
      const lbl = String(item.label || '').toLowerCase();

      const cls = lbl.includes('accepted') || lbl.includes('acknowledged')
               || lbl.includes('improvement plan') || lbl.includes('cool down')
               || lbl.includes('improvement submitted') || lbl.includes('improvement')
        ? 'accepted'
        : lbl.includes('rejected') || lbl.includes('appealed')
        ? 'rejected'
        : lbl.includes('blocked')
        ? 'blocked'
        : 'warning';

      /* Show bank action label with icon */
      let icon = '⚠️';
      if      (lbl.includes('acknowledged'))       icon = '✅';
      else if (lbl.includes('improvement plan'))   icon = '📈';
      else if (lbl.includes('improvement'))        icon = '📝';
      else if (lbl.includes('cool down'))          icon = '❄️';
      else if (lbl.includes('appealed'))           icon = '🔔';
      else if (lbl.includes('accepted'))           icon = '✅';
      else if (lbl.includes('rejected'))           icon = '❌';
      else if (lbl.includes('block cancelled'))    icon = '🔓';
      else if (lbl.includes('blocked'))            icon = '🚫';
      else if (lbl.includes('warning sent'))       icon = '⚠️';

      return `<div class="admin-timeline-item ${cls}">
        <span class="admin-timeline-dot"></span>
        <span><span class="admin-timeline-label">${icon} ${esc(item.label || 'Update')}:</span> ${esc(item.at || '—')}</span>
      </div>`;
    }).join('')}</div>`;
  }

  /* View full warning responses in a modal */
  window.viewWarningResponses = async function(targetType, targetId, bankName) {
    /* Reuse the existing adminWarningModal as a read-only info panel */
    const modal = document.getElementById('adminWarningModal');
    if (!modal) return;

    const labelEl  = document.getElementById('adminWarningModalLabel');
    const titleEl  = document.getElementById('adminWarningModalTitle');
    const bodyEl   = document.getElementById('adminWarningModalBody');
    const msgEl    = document.getElementById('adminWarningModalMessage');
    const metaEl   = document.getElementById('adminWarningModalMeta');
    const confirmEl= document.getElementById('adminWarningModalConfirm');

    if (labelEl)  labelEl.textContent  = 'Warning Responses';
    if (titleEl)  titleEl.textContent  = `Responses from: ${bankName || 'Blood Bank'}`;
    if (bodyEl)   bodyEl.textContent   = 'Loading responses...';
    if (msgEl)    msgEl.style.display  = 'none';
    if (confirmEl)confirmEl.style.display = 'none';

    const labelNodeMsg = document.querySelector('label[for="adminWarningModalMessage"]');
    if (labelNodeMsg) labelNodeMsg.style.display = 'none';

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-modal-open');

    try {
      /* For donor_recipient users, target_type='user'; for blood banks, 'blood_bank' */
      const data = await apiFetch(`get_warning_responses&target_type=${encodeURIComponent(targetType || 'blood_bank')}&target_id=${encodeURIComponent(targetId)}`);
      const warnings = data.warnings || [];

      if (!warnings.length) {
        if (bodyEl) bodyEl.textContent = 'No warnings have been sent to this bank yet.';
        if (metaEl) metaEl.innerHTML = '';
        return;
      }

      if (bodyEl) bodyEl.textContent = `${warnings.length} warning(s) sent. See responses below:`;

      const ACTION_ICONS = {
        acknowledged:          '✅',
        improvement_submitted: '📝',
        appealed:              '⚖️',
      };
      const ACTION_LABELS = {
        acknowledged:          'Acknowledged',
        improvement_submitted: 'Improvement Plan Submitted',
        appealed:              'Appealed',
      };
      const ACTION_COLORS = {
        acknowledged:          '#4ade80',
        improvement_submitted: '#60a5fa',
        appealed:              '#f87171',
      };

      if (metaEl) {
        metaEl.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:14px;max-height:380px;overflow-y:auto;padding-right:4px;">
            ${warnings.map((w, i) => {
              const hasResponse = w.bank_action && w.bank_action !== null;
              const icon  = ACTION_ICONS[w.bank_action]   || '⏳';
              const label = ACTION_LABELS[w.bank_action]  || 'No response yet';
              const color = ACTION_COLORS[w.bank_action]  || 'var(--text-muted)';

              return `
                <div style="padding:14px;border-radius:12px;background:var(--glass-bg);border:1px solid var(--glass-border);">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                    <div style="font-size:.78rem;color:var(--text-muted);">Warning #${i + 1} · Sent ${esc(w.sent_at || '—')}</div>
                    <div style="font-size:.72rem;color:var(--text-muted);white-space:nowrap;">by ${esc(w.admin_name || 'Admin')}</div>
                  </div>
                  <div style="font-size:.82rem;color:var(--text-primary);margin-bottom:10px;padding:8px;background:rgba(251,191,36,.06);border-radius:8px;border-left:3px solid #fbbf24;">
                    ${esc(w.message || '')}
                  </div>
                  ${hasResponse
                    ? `<div style="display:flex;flex-direction:column;gap:6px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                          <span style="font-size:1rem;">${icon}</span>
                          <strong style="color:${color};font-size:.82rem;">Bank Action: ${label}</strong>
                          ${w.responded_at ? `<span style="font-size:.68rem;color:var(--text-muted);">· ${esc(w.responded_at)}</span>` : ''}
                        </div>
                        ${w.bank_message && w.bank_message !== 'Bank acknowledged the warning.'
                          ? `<div style="font-size:.8rem;color:var(--text-secondary);padding:10px;background:rgba(96,165,250,.06);border-radius:8px;border-left:3px solid ${color};line-height:1.5;">
                              ${esc(w.bank_message)}
                            </div>`
                          : w.bank_action === 'acknowledged'
                            ? `<div style="font-size:.78rem;color:var(--text-muted);font-style:italic;">The bank confirmed they have read and understood this warning.</div>`
                            : ''}
                      </div>`
                    : `<div style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:.78rem;">
                        <span>⏳</span> <span>No response yet from the bank.</span>
                      </div>`}
                </div>`;
            }).join('')}
          </div>`;
      }
    } catch (e) {
      if (bodyEl) bodyEl.textContent = '❌ Failed to load responses: ' + e.message;
      if (metaEl) metaEl.innerHTML = '';
    }

    /* Restore modal to normal when closed */
    activeAdminModalAction = null;
  };

  /* ── All Blood Banks Modal ── */
  let allBanksData = [];

  window.openAllBanksModal = async function () {
    const modal = document.getElementById('allBanksModal');
    const body = document.getElementById('allBanksBody');
    const count = document.getElementById('allBanksCount');
    const search = document.getElementById('allBanksSearch');
    if (!modal) return;

    if (search) search.value = '';
    if (body) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;"><div class="loader-spin" style="margin:0 auto 12px"></div>Loading banks...</td></tr>';
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-modal-open');

    try {
      const data = await apiFetch('ratings');
      allBanksData = data.banks || [];

      if (count) count.textContent = allBanksData.length + ' bank' + (allBanksData.length !== 1 ? 's' : '');
      renderAllBanks(allBanksData);
    } catch (e) {
      if (body) {
        body.innerHTML = '<tr><td colspan="5" style="color:#f87171;padding:40px;text-align:center;">⚠️ ' + esc(e.message) + '</td></tr>';
      }
    }
  };

  function renderAllBanks(banks) {
    const body = document.getElementById('allBanksBody');
    if (!body) return;
    const count = document.getElementById('allBanksCount');
    if (count) count.textContent = banks.length + ' bank' + (banks.length !== 1 ? 's' : '');

    body.innerHTML = banks.length
      ? banks.map(b => {
          const r = parseFloat(b.rating_avg) || 0;
          const bsc = b.status === 'active' ? 'badge-ok' : b.status === 'flagged' ? 'badge-warn' : 'badge-danger';

          const reviewPayload = encodedPayload({
            target_type: 'blood_bank',
            target_id: parseInt(b.id, 10),
            name: b.name || ''
          });

          const btn = r < 3
            ? `<button class="table-btn warning" onclick="closeAllBanksModal();viewWarningResponses('blood_bank', ${parseInt(b.id, 10)}, JSON.parse(decodeURIComponent('${reviewPayload}')).name)">Review</button>`
            : `<button class="table-btn" onclick="showToast('Rating is healthy for ${esc(b.name)}.')">View</button>`;

          return `<tr>
            <td><strong>${esc(b.name || '—')}</strong></td>
            <td>${esc(b.city || '—')}</td>
            <td>${starStr(r)}</td>
            <td><span class="status-badge ${bsc}">${esc(b.status || '—')}</span></td>
            <td>${btn}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">No blood banks found.</td></tr>';
  }

  window.filterAllBanks = function () {
    const search = document.getElementById('allBanksSearch');
    if (!search) return;
    const q = search.value.toLowerCase().trim();
    const filtered = q
      ? allBanksData.filter(b =>
          (b.name || '').toLowerCase().includes(q) ||
          (b.city || '').toLowerCase().includes(q) ||
          (b.status || '').toLowerCase().includes(q)
        )
      : allBanksData;
    renderAllBanks(filtered);
  };

  window.closeAllBanksModal = function () {
    const modal = document.getElementById('allBanksModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-modal-open');
    modal.style.display = 'none';
  };

  document.addEventListener('click', e => {
    const modal = document.getElementById('allBanksModal');
    if (!modal || modal.getAttribute('aria-hidden') !== 'false') return;
    const backdrop = modal.querySelector('.admin-modal-backdrop');
    if (e.target === backdrop) closeAllBanksModal();
  });

  const allBanksX = document.getElementById('allBanksModalX');
  if (allBanksX) allBanksX.addEventListener('click', closeAllBanksModal);

  async function loadInvestigate(entity) {
    entity = entity || currentInvestigateEntity || 'user';
    currentInvestigateEntity = entity;

    const tbody      = document.getElementById('suspActivityBody');
    const metricHead = document.getElementById('investigateMetricHead');
    const helpText   = document.getElementById('investigateHelpText');
    const selector   = document.getElementById('investigateEntityFilter');
    const searchEl   = document.getElementById('investigateSearch');

    if (selector && selector.value !== entity) selector.value = entity;
    /* Clear search when switching entity */
    if (searchEl) searchEl.value = '';

    if (metricHead) {
      metricHead.textContent = entity === 'blood_bank' ? 'Rating' : 'Trust Score';
    }

    const metricHeader = document.getElementById('investigateMetricHeader');
    if (metricHeader) {
      metricHeader.textContent = entity === 'blood_bank' ? 'Rating' : 'Trust Score';
    }

    if (helpText) {
      helpText.textContent = entity === 'blood_bank'
        ? 'Showing blood banks whose rating is below 3.00.'
        : 'Showing donor & recipient users whose trust score is below 50.';
    }

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>';
    }

    try {
      const data = await apiFetch(`investigate&entity=${encodeURIComponent(entity)}`);
      /* Cache rows for client-side search */
      window._investigateRows   = data.rows || [];
      window._investigateEntity = entity;
      renderInvestigateRows(window._investigateRows, entity);
    } catch (err) {
      handleErr(err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
      }
    }
  }

  /* ── Render rows (shared by load + search filter) ── */
  function renderInvestigateRows(rows, entity) {
    const tbody = document.getElementById('suspActivityBody');
    if (!tbody) return;

    function fmtRemaining(expiresAt) {
      if (!expiresAt) return '';
      const now = new Date();
      const exp = new Date(expiresAt);
      const diff = exp - now;
      if (diff <= 0) return '(Expired)';
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      return `${days}d ${hrs}h remaining`;
    }

    function fmtExpiryDate(expiresAt) {
      if (!expiresAt) return '';
      return new Date(expiresAt).toLocaleString();
    }

    tbody.innerHTML = rows.length
      ? rows.map(row => {
          const targetType = entity === 'blood_bank' ? 'blood_bank' : 'user';
          const targetId = parseInt(row.id, 10);

          const metricValue = targetType === 'blood_bank'
            ? `<span class="admin-rating low"><span class="rating-stars warning">★</span>${Number(row.rating || 0).toFixed(2)}</span>`
            : `<span class="admin-score low">${parseInt(row.trust_score || 0, 10)}</span>`;

          const idLabel = targetType === 'blood_bank'
            ? `BANK-${String(targetId).padStart(4, '0')}`
            : `USR-${String(targetId).padStart(4, '0')}`;

          const extra = targetType === 'blood_bank'
            ? [row.city, row.email].filter(Boolean).join(' • ')
            : [row.blood_group, row.email].filter(Boolean).join(' • ');

          const isBlocked = row.status_code === 'blocked';

          const blockHint = isBlocked
            ? `Blocked until ${fmtExpiryDate(row.block_expires_at)} (${fmtRemaining(row.block_expires_at)})`
            : row.status_code === 'acknowledged'        ? 'User acknowledged — monitor activity'
            : row.status_code === 'improvement_submitted'? 'Plan submitted — review it'
            : row.status_code === 'appealed'            ? 'User appealed — review appeal'
            : row.status_code === 'cool_down'           ? 'Cool Down active — can still send warnings'
            : row.status_code === 'improvement'         ? 'Improvement Plan sent — awaiting action'
            : row.status_code === 'rejected'            ? 'Rejected warning — block allowed'
            : 'Manual block available';

          const message = targetType === 'blood_bank'
            ? `Your BloodBridge blood bank rating is below 3.00 (${Number(row.rating || 0).toFixed(2)}). Please improve service quality, stock handling, and compliance. Accept this warning to enter an improvement period, or reject it for admin review.`
            : `Your BloodBridge trust score is below 50 (${parseInt(row.trust_score || 0, 10)}). Please review your activity and improve your account behavior. Accept this warning to enter an improvement period, or reject it for admin review.`;

          const meta = targetType === 'blood_bank'
            ? `<strong>Target:</strong> ${esc(row.name || 'Blood Bank')} (${esc(idLabel)})<br><strong>Rating:</strong> ${Number(row.rating || 0).toFixed(2)}<br><strong>Status:</strong> ${esc(row.status_label || 'Active')}`
            : `<strong>Target:</strong> ${esc(row.name || 'Donor & Recipient')} (${esc(idLabel)})<br><strong>Trust score:</strong> ${parseInt(row.trust_score || 0, 10)}<br><strong>Status:</strong> ${esc(row.status_label || 'Active')}`;

          const warnPayload = encodedPayload({
            target_type: targetType,
            target_id: targetId,
            name: row.name || '',
            message,
            meta,
            metric: targetType === 'blood_bank' ? Number(row.rating || 0).toFixed(2) : parseInt(row.trust_score || 0, 10)
          });

          const blockPayload = encodedPayload({
            target_type: targetType,
            target_id: targetId,
            name: row.name || '',
            warning_id: row.warning_id || 0
          });

          const cancelBlockPayload = encodedPayload({
            target_type: targetType,
            target_id: targetId,
            name: row.name || ''
          });

          const hasResponse = row.has_response === true;
          const improvPayload = encodedPayload({
            target_type: targetType,
            target_id:   targetId,
            name:        row.name || '',
            metric:      targetType === 'blood_bank' ? Number(row.rating || 0).toFixed(2) : parseInt(row.trust_score || 0, 10)
          });

          let actionsHtml;
          if (isBlocked) {
            actionsHtml = `<div class="admin-action-stack">
              <button class="table-btn" style="background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.4);color:#fbbf24;" onclick="cancelBlockTarget(JSON.parse(decodeURIComponent('${cancelBlockPayload}')))">Cancel Block</button>
            </div>`;
          } else {
            actionsHtml = `<div class="admin-action-stack">
              <button class="table-btn warning" onclick="openInvestigateWarning(JSON.parse(decodeURIComponent('${warnPayload}')))">Send Warning</button>
              <button class="table-btn cool-down" style="background:rgba(14,165,233,.12);border-color:rgba(14,165,233,.4);color:#38bdf8;" onclick="openCoolDownModal(JSON.parse(decodeURIComponent('${warnPayload}')))">&#x2744;&#xfe0f; Cool Down</button>
              ${hasResponse
                ? `<button class="table-btn" style="background:rgba(96,165,250,.12);border-color:rgba(96,165,250,.4);color:#60a5fa;"
                    onclick="viewWarningResponses('${esc(targetType)}', ${targetId}, '${esc(row.name || '')}')">&#x1f4cb; View Response</button>`
                : ''}
              <button class="table-btn" style="background:rgba(74,222,128,.10);border-color:rgba(74,222,128,.4);color:#4ade80;" onclick="openImprovementPlanModal(JSON.parse(decodeURIComponent('${improvPayload}')))">&#x1f4c8; Improvement Plan</button>
              <button class="table-btn danger" onclick="blockInvestigateTarget(JSON.parse(decodeURIComponent('${blockPayload}')))">Block ID</button>
            </div>`;
          }

          return `<tr data-target-type="${esc(targetType)}" data-target-id="${targetId}">
            <td>
              <div class="admin-entity-cell">
                <span class="admin-entity-name">${esc(row.name || '—')}</span>
                <span class="admin-entity-id">${esc(idLabel)}</span>
                ${extra ? `<span class="admin-status-hint">${esc(extra)}</span>` : ''}
              </div>
            </td>
            <td>${metricValue}</td>
            <td>
              <div class="admin-status-wrap">
                ${badgeForAdminStatus(row.status_code, row.status_label)}
                <span class="admin-status-hint">${esc(blockHint)}</span>
              </div>
            </td>
            <td>${renderWarningTimeline(row.timeline || [])}</td>
            <td>${actionsHtml}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No ${entity === 'blood_bank' ? 'blood banks below 3.00 rating' : 'donor & recipient users below 50 trust score'} found.</td></tr>`;
  }

  /* ── Search input handler ── */
  const investigateSearchEl = document.getElementById('investigateSearch');
  if (investigateSearchEl) {
    investigateSearchEl.addEventListener('input', () => {
      const q      = investigateSearchEl.value.trim().toLowerCase();
      const rows   = window._investigateRows   || [];
      const entity = window._investigateEntity || 'user';
      if (!q) { renderInvestigateRows(rows, entity); return; }

      const filtered = rows.filter(row => {
        const id    = row.id ? String(row.id).padStart(4, '0') : '';
        /* Match name, email, city, or just the numeric part of ID */
        return (
          (row.name  || '').toLowerCase().includes(q) ||
          (row.email || '').toLowerCase().includes(q) ||
          (row.city  || '').toLowerCase().includes(q) ||
          id.includes(q)
        );
      });

      const tbody = document.getElementById('suspActivityBody');
      if (!filtered.length && tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No results for "<strong>${esc(q)}</strong>".</td></tr>`;
      } else {
        renderInvestigateRows(filtered, entity);
      }
    });
  }

  window.openInvestigateWarning = payload => {
    showAdminModal({
      label: 'Admin Warning',
      title: 'Send Warning',
      body: `Send a warning to ${payload.name || 'this target'}?`,
      message: payload.message || '',
      meta: payload.meta || '',
      confirmText: 'Send Warning',
      onConfirm: async msg => {
        if (!msg) {
          showToast('⚠️ Warning message is required.', 3500);
          return;
        }

        const btn = document.getElementById('adminWarningModalConfirm');

        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Sending…';
        }

        try {
          await apiFetch('send_warning', 'POST', {
            target_type: payload.target_type,
            target_id: parseInt(payload.target_id, 10),
            metric: payload.metric,
            message: msg
          });

          closeAdminModal();
          showToast('✅ Warning sent successfully.');
          loadInvestigate(currentInvestigateEntity);
          loadDashboard();
        } catch (e) {
          showToast('❌ ' + e.message, 5000);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Send Warning';
          }
        }
      }
    });
  };

  /* ======================================================
     IMPROVEMENT PLAN MODAL
     Prewritten text (editable) -- separate for user vs blood_bank
  ====================================================== */
  window.openImprovementPlanModal = function(payload) {
    const isBank = payload.target_type === 'blood_bank';
    const name   = payload.name || (isBank ? 'this blood bank' : 'this user');
    const metric = payload.metric;

    const defaultPlanUser = [
      'Dear ' + name + ',',
      '',
      'Your current trust score is ' + metric + ', which is below the required threshold of 50. Here is a personalised improvement plan to help you restore your standing on BloodBridge:',
      '',
      '1. Complete Your Profile — Ensure your blood group, health details, and contact information are fully up to date.',
      '',
      '2. Honour Your Pledges — Avoid cancelling or missing scheduled donations. Each fulfilled pledge increases your trust score by +5.',
      '',
      '3. Respond Promptly to Requests — When you receive a blood request match, respond within 24 hours.',
      '',
      '4. Maintain Donation Regularity — Aim to donate at least once every 56 days (the standard safe interval).',
      '',
      '5. Avoid Suspicious Activity — Multiple pledge cancellations, mismatched health records, or repeated no-shows will further reduce your score.',
      '',
      'If you believe your score was reduced in error, please submit an appeal through your dashboard. We are here to support you.',
      '',
      '— BloodBridge Admin Team'
    ].join('\n');

    const defaultPlanBank = [
      'Dear ' + name + ',',
      '',
      'Your current blood bank rating is ' + metric + ', which is below the required threshold of 3.00. Here is an improvement plan to help you restore your rating on BloodBridge:',
      '',
      '1. Improve Stock Management — Ensure blood units are always available and expiry dates are actively monitored. Shortages and expired stock significantly impact your rating.',
      '',
      '2. Reduce Response Time — Respond to blood requests and donor appointments within 2 hours during working hours.',
      '',
      '3. Maintain Accurate Records — Upload correct donation logs, test results, and compliance certificates promptly.',
      '',
      '4. Enhance Donor Experience — Collect post-donation feedback and act on complaints. Donor satisfaction is a key rating factor.',
      '',
      '5. Staff Training & Compliance — Ensure all staff are trained on BloodBridge protocols and health safety standards.',
      '',
      '6. Communication — Keep recipients and donors informed about delays, stock status, and appointment changes in real time.',
      '',
      'If your rating was affected by a system error or unfair review, please contact BloodBridge Admin for a manual review.',
      '',
      '— BloodBridge Admin Team'
    ].join('\n');

    const defaultPlan = isBank ? defaultPlanBank : defaultPlanUser;

    showAdminModal({
      label: isBank ? 'Blood Bank Improvement Plan' : 'Donor / Recipient Improvement Plan',
      title: 'Send Improvement Plan — ' + name,
      body: 'This plan will be saved against the most recent warning for <strong>' + esc(name) + '</strong> and visible to them in their dashboard. You may edit the text below before sending.',
      message: defaultPlan,
      meta: isBank
        ? '<strong>Target:</strong> ' + esc(name) + '<br><strong>Current Rating:</strong> ' + metric + '<br><strong>Type:</strong> Blood Bank'
        : '<strong>Target:</strong> ' + esc(name) + '<br><strong>Current Trust Score:</strong> ' + metric + '<br><strong>Type:</strong> Donor / Recipient',
      confirmText: 'Send Improvement Plan',
      onConfirm: async function(msg) {
        if (!msg || !msg.trim()) {
          showToast('Warning: Improvement plan text cannot be empty.', 3500);
          return;
        }
        const btn = document.getElementById('adminWarningModalConfirm');
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
        try {
          await apiFetch('send_improvement_plan', 'POST', {
            target_type: payload.target_type,
            target_id:   parseInt(payload.target_id, 10),
            plan:        msg.trim()
          });
          closeAdminModal();
          showToast('Improvement plan sent successfully.');
          loadInvestigate(currentInvestigateEntity);
        } catch (e) {
          showToast('Error: ' + e.message, 5000);
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = 'Send Improvement Plan'; }
        }
      }
    });
  };

  window.blockInvestigateTarget = payload => {
    const label = payload.target_type === 'blood_bank' ? 'blood bank' : 'donor & recipient user';

    showAdminModal({
      label: 'Security Action',
      title: 'Block ID',
      body: `Are you sure you want to block this ${label} ID? They will lose access for 15 days.`,
      meta: `<strong>Target:</strong> ${payload.name || 'Unknown'} <span class="admin-modal-meta-badge">${payload.target_type === 'blood_bank' ? '🏦 Blood Bank' : '👤 User'}</span>`,
      confirmText: 'Yes, Block',
      textareaVisible: false,
      onConfirm: async () => {
        closeAdminModal();
        try {
          await apiFetch('block_target', 'POST', {
            target_type: payload.target_type,
            target_id: parseInt(payload.target_id, 10),
            warning_id: parseInt(payload.warning_id || 0, 10),
            reason: 'Blocked manually by admin from suspicious activity dashboard.'
          });

          showToast('✅ ID blocked for 15 days.');
          loadInvestigate(currentInvestigateEntity);
          loadDashboard();
        } catch (e) {
          showToast('❌ ' + e.message, 5000);
        }
      }
    });
  };

  window.cancelBlockTarget = payload => {
    const label = payload.target_type === 'blood_bank' ? 'blood bank' : 'donor & recipient user';

    showAdminModal({
      label: 'Security Action',
      title: 'Cancel Block',
      body: `Cancel block for this ${label} ID? They will regain access immediately.`,
      meta: `<strong>Target:</strong> ${payload.name || 'Unknown'} <span class="admin-modal-meta-badge">${payload.target_type === 'blood_bank' ? '🏦 Blood Bank' : '👤 User'}</span>`,
      confirmText: 'Yes, Cancel Block',
      textareaVisible: false,
      onConfirm: async () => {
        closeAdminModal();
        try {
          await apiFetch('cancel_block', 'POST', {
            target_type: payload.target_type,
            target_id: parseInt(payload.target_id, 10),
          });

          showToast('✅ Block cancelled successfully.');
          loadInvestigate(currentInvestigateEntity);
          loadDashboard();
        } catch (e) {
          showToast('❌ ' + e.message, 5000);
        }
      }
    });
  };

  /* ══════════════════════════════════════════════
     COOL DOWN — Clear all warnings for a blood bank
  ══════════════════════════════════════════════ */
  window.openCoolDownModal = payload => {
    const name       = payload.name || 'this target';
    const isBank     = payload.target_type === 'blood_bank';
    const bodyText   = isBank
      ? `Clearing ALL warnings for ${name} and resetting status to Active. Provide your reason below. This action cannot be undone.`
      : `Clearing ALL warnings for ${name}. Trust score will remain unchanged. Provide your reason below. This action cannot be undone.`;

    showAdminModal({
      label       : '❄️ Cool Down',
      title       : `Apply Cool Down — ${name}`,
      body        : bodyText,
      message     : '',
      confirmText : '❄️ Apply Cool Down',
      onConfirm   : async reason => {
        if (!reason) { showToast('⚠️ Please provide a reason for the cool down.'); return; }

        const btn = document.getElementById('adminWarningModalConfirm');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Applying...'; }

        try {
          await apiFetch('cool_down', 'POST', {
            target_type : payload.target_type,
            target_id   : parseInt(payload.target_id, 10),
            reason,
          });
          closeAdminModal();
          showToast(`❄️ Cool Down applied! All warnings cleared for ${name}.`, 5000);
          loadInvestigate(currentInvestigateEntity);
          loadDashboard();
        } catch (e) {
          showToast('❌ ' + e.message, 5000);
          if (btn) { btn.disabled = false; btn.textContent = '❄️ Apply Cool Down'; }
        }
      }
    });
  };

  const investigateEntityFilter = document.getElementById('investigateEntityFilter');

  if (investigateEntityFilter) {
    investigateEntityFilter.addEventListener('change', () => {
      loadInvestigate(investigateEntityFilter.value);
    });
  }

  /* ══════════════════════════════════════════════
     RATINGS — CORRECTED: Audit Now replaced with real Send Warning
  ══════════════════════════════════════════════ */
  window.sendRatingWarning = payload => {
    showAdminModal({
      label: 'Blood Bank Rating Warning',
      title: 'Send Warning to Blood Bank',
      body: `Send a low-rating warning to ${payload.name || 'this blood bank'}?`,
      message: payload.message || '',
      meta: payload.meta || '',
      confirmText: 'Send Warning',
      onConfirm: async msg => {
        if (!msg) {
          showToast('⚠️ Warning message is required.', 3500);
          return;
        }

        const btn = document.getElementById('adminWarningModalConfirm');

        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Sending…';
        }

        try {
          await apiFetch('send_warning', 'POST', {
            target_type: 'blood_bank',
            target_id: parseInt(payload.target_id, 10),
            metric: payload.metric,
            message: msg
          });

          closeAdminModal();
          showToast('✅ Warning sent to blood bank.');
          loadRatings();
          loadInvestigate('blood_bank');
          loadDashboard();
        } catch (e) {
          showToast('❌ ' + e.message, 5000);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Send Warning';
          }
        }
      }
    });
  };

  async function loadRatings() {
    const tbody = document.getElementById('ratingsTableBody');

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">Loading...</td></tr>';
    }

    try {
      const data = await apiFetch('ratings');
      const banks = data.banks || [];

      if (!tbody) return;

      tbody.innerHTML = banks.length
        ? banks.map(b => {
            const r = parseFloat(b.rating_avg) || 0;

            const isActive = b.status === 'active';
            const bsc = isActive
              ? 'badge-ok'
              : b.status === 'flagged'
              ? 'badge-warn'
              : 'badge-danger';

            const toggleBtn = isActive
              ? `<button class="table-btn" onclick="toggleBankStatus(${parseInt(b.id, 10)}, 'inactive', this)">Deactivate</button>`
              : `<button class="table-btn warning" onclick="toggleBankStatus(${parseInt(b.id, 10)}, 'active', this)">Activate</button>`;

            return `<tr>
              <td><strong>${esc(b.name || '—')}</strong></td>
              <td>${esc(b.city || '—')}</td>
              <td>${starStr(r)}</td>
              <td><span class="status-badge ${bsc}">${esc(b.status || '—')}</span></td>
              <td>${toggleBtn}</td>
            </tr>`;
          }).join('')
        : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No banks found.</td></tr>';
    } catch (err) {
      handleErr(err);

      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
      }
    }
  }

  window.toggleBankStatus = async function (bankId, newStatus, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      await apiFetch('toggle_bank_status', 'POST', { bank_id: bankId, status: newStatus });
      showToast('✅ Blood bank ' + (newStatus === 'active' ? 'activated' : 'deactivated') + ' successfully.');
      loadRatings();
    } catch (e) {
      showToast('❌ ' + e.message, 5000);
      if (btn) btn.disabled = false;
    }
  };

  /* ══════════════════════════════════════════════
     COLD CHAIN — SIMULATION
  ══════════════════════════════════════════════ */
  const CC_SENSORS = [
    { bank:'City Blood Bank', sensor:'FR-01', base:4.2, range:[2,6] },
    { bank:'MediCore Storage', sensor:'FR-02', base:3.8, range:[2,6] },
    { bank:'LifeLine Center', sensor:'FR-03', base:5.1, range:[2,6] },
    { bank:'RedCross Hub', sensor:'FR-04', base:4.5, range:[2,6] },
    { bank:'PlasmaPlus Lab', sensor:'FR-05', base:3.5, range:[2,6] },
    { bank:'HealthBank Depot', sensor:'FR-06', base:4.8, range:[2,6] },
  ];
  let ccInterval = null;

  function ccSimTick() {
    const grid = document.getElementById('ccSensorGrid');
    if (!grid) return;
    const readings = CC_SENSORS.map(s => {
      const drift = (Math.random() - 0.5) * 1.6;
      const spike = Math.random() < 0.08 ? (Math.random() > 0.5 ? 3 : -3) : 0;
      let temp = s.base + drift + spike;
      temp = Math.round(temp * 10) / 10;
      const min = s.range[0], max = s.range[1];
      const status = temp < min || temp > max ? 'critical' : (temp < min + 0.5 || temp > max - 0.5 ? 'warn' : 'ok');
      return { ...s, temp, min, max, status, time: new Date() };
    });

    const breaches = readings.filter(r => r.status === 'critical');
    const totalBreaches = readings.filter(r => r.status !== 'ok').length;
    const avgTemp = readings.reduce((s, r) => s + r.temp, 0) / readings.length;

    animCount(document.getElementById('ccTotalBreaches'), totalBreaches);
    animCount(document.getElementById('ccActiveBreaches'), breaches.length);
    const avgEl = document.getElementById('ccAvgTemp');
    if (avgEl) avgEl.textContent = avgTemp.toFixed(1);

    grid.innerHTML = readings.map(r => `
      <div class="cc-sensor ${r.status}">
        <div class="cc-sensor-name">${esc(r.sensor)}</div>
        <div class="cc-sensor-bank">${esc(r.bank)}</div>
        <div class="cc-sensor-temp">${r.temp.toFixed(1)}<small>°C</small></div>
        <div class="cc-sensor-range">Range: ${r.min}°C – ${r.max}°C</div>
        <div class="cc-sensor-bar"><div class="cc-sensor-bar-fill"></div></div>
        <div class="cc-sensor-time">${fmtDateTime(r.time)}</div>
      </div>
    `).join('');

    const tbody = document.getElementById('coldChainBody');
    if (!tbody) return;
    const logs = [];
    for (let i = 0; i < 25; i++) {
      const s = CC_SENSORS[Math.floor(Math.random() * CC_SENSORS.length)];
      const drift = (Math.random() - 0.5) * 2;
      const spike = Math.random() < 0.12 ? (Math.random() > 0.5 ? 4 : -4) : 0;
      let t = s.base + drift + spike;
      t = Math.round(t * 10) / 10;
      const date = new Date(Date.now() - i * 3600000 - Math.random() * 1800000);
      const isAlert = t < s.range[0] || t > s.range[1];
      logs.push({ bank: s.bank, sensor: s.sensor, temp: t, min: s.range[0], max: s.range[1], time: date, alert: isAlert });
    }
    tbody.innerHTML = logs.map((l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(l.bank)}</td>
        <td><span class="admin-bag-chip">${esc(l.sensor)}</span></td>
        <td class="${l.alert ? 'admin-temp-danger' : 'admin-temp-ok'}">${l.temp.toFixed(1)}°C</td>
        <td><span class="admin-range-chip">${l.min}–${l.max}°C</span></td>
        <td>${fmtDateTime(l.time)}</td>
        <td>${l.alert ? '<span class="status-badge badge-danger">⚠️ Breach</span>' : '<span class="status-badge badge-ok">✓ Normal</span>'}</td>
      </tr>
    `).join('');
  }

  async function loadColdChain() {
    if (ccInterval) clearInterval(ccInterval);
    ccSimTick();
    ccInterval = setInterval(ccSimTick, 3000);
  }

  /* ══════════════════════════════════════════════
     EXPIRY — SIMULATION
  ══════════════════════════════════════════════ */
  const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
  const BANKS = ['City Blood Bank','MediCore Storage','LifeLine Center','RedCross Hub','PlasmaPlus Lab','HealthBank Depot'];
  const BAG_PREFIXES = ['BLD','PLT','PLA','CRY','RBC'];

  function randomBag() {
    const prefix = BAG_PREFIXES[Math.floor(Math.random() * BAG_PREFIXES.length)];
    const num = String(Math.floor(100000 + Math.random() * 900000));
    return prefix + '-' + num;
  }

  function generateExpiryData() {
    const units = [];
    const now = new Date();
    for (let i = 0; i < 40; i++) {
      const daysLeft = Math.floor(Math.random() * 42) + 1;
      const expDate = new Date(now.getTime() + daysLeft * 86400000);
      units.push({
        bank: BANKS[Math.floor(Math.random() * BANKS.length)],
        bag: randomBag(),
        blood: BLOOD_GROUPS[Math.floor(Math.random() * BLOOD_GROUPS.length)],
        expDate,
        daysLeft
      });
    }
    units.sort((a, b) => a.daysLeft - b.daysLeft);
    return units;
  }

  let expiryUnits = generateExpiryData();

  async function loadExpiry() {
    expiryUnits = generateExpiryData();

    const total = expiryUnits.length;
    const critical = expiryUnits.filter(u => u.daysLeft <= 3).length;
    const safe = expiryUnits.filter(u => u.daysLeft > 7).length;
    const waste = Math.round(critical * 0.6);

    animCount(document.getElementById('expiryTotal'), total);
    animCount(document.getElementById('expiryCritical'), critical);
    animCount(document.getElementById('expiryResolved'), safe);
    animCount(document.getElementById('expiryWaste'), waste);

    /* Timeline */
    const timeline = document.getElementById('expiryTimeline');
    if (timeline) {
      const dayBuckets = {};
      expiryUnits.forEach(u => {
        const key = Math.floor(u.daysLeft / 5) * 5;
        if (!dayBuckets[key]) dayBuckets[key] = 0;
        dayBuckets[key]++;
      });
      const maxCount = Math.max(...Object.values(dayBuckets), 1);
      const keys = Object.keys(dayBuckets).sort((a, b) => a - b);
      timeline.innerHTML = keys.map(k => {
        const count = dayBuckets[k];
        const pct = (count / maxCount) * 100;
        const cls = parseInt(k) <= 3 ? 'critical' : (parseInt(k) <= 10 ? 'warning' : 'safe');
        return `<div class="expiry-timeline-bar">
          <div class="expiry-timeline-fill ${cls}" style="height:${pct}%"></div>
          <span class="expiry-timeline-label">${k}-${parseInt(k)+4}d</span>
        </div>`;
      }).join('');
    }

    /* Table */
    const tbody = document.getElementById('expiryBody');
    if (!tbody) return;
    tbody.innerHTML = expiryUnits.map((u, i) => {
      const crit = u.daysLeft <= 3;
      const warn = u.daysLeft <= 7 && u.daysLeft > 3;
      const cls = crit ? 'admin-days-critical' : (warn ? 'admin-days-warning' : '');
      const status = crit ? '<span class="status-badge badge-danger">⚠️ Critical</span>'
        : warn ? '<span class="status-badge badge-warn">⏳ Warning</span>'
        : '<span class="status-badge badge-ok">✓ Safe</span>';
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(u.bank)}</td>
        <td><span class="admin-bag-chip">${esc(u.bag)}</span></td>
        <td><span class="admin-blood-chip">${esc(u.blood)}</span></td>
        <td style="font-size:.8rem;">${fmtDate(u.expDate)}</td>
        <td><span class="${cls}" style="font-weight:700;">${u.daysLeft} day${u.daysLeft !== 1 ? 's' : ''}</span></td>
        <td>${status}</td>
      </tr>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════
     THALASSEMIA
  ══════════════════════════════════════════════ */
  async function loadThalassemia() {
    const tbody = document.getElementById('thalassemiaBody');

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">Loading...</td></tr>';
    }

    try {
      const data = await apiFetch('thalassemia');
      const list = data.carriers || [];

      if (!tbody) return;

      tbody.innerHTML = list.length
        ? list.map((c, i) => `<tr>
            <td>${i + 1}</td>
            <td>${esc(c.patient_name || '—')}</td>
            <td>${c.is_carrier ? '<span class="status-badge badge-warn">Yes — Carrier</span>' : '<span class="status-badge badge-ok">No</span>'}</td>
            <td>${esc(c.confirmed_by_name || '—')}</td>
            <td>${fmtDate(c.confirmed_at)}</td>
          </tr>`).join('')
        : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No carrier records found.</td></tr>';
    } catch (err) {
      handleErr(err);

      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
      }
    }
  }

  /* ══════════════════════════════════════════════
     ROTATIONS
  ══════════════════════════════════════════════ */
  async function loadRotations() {
    const tbody = document.getElementById('rotationsBody');

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">Loading...</td></tr>';
    }

    try {
      const data = await apiFetch('rotations');
      const list = data.rotations || [];

      if (!tbody) return;

      tbody.innerHTML = list.length
        ? list.map((r, i) => {
            const sc = r.status === 'completed' ? 'badge-ok' : r.status === 'rejected' ? 'badge-danger' : 'badge-warn';

            return `<tr>
              <td>${i + 1}</td>
              <td>${esc(r.donor_name || '—')}</td>
              <td>${esc(r.source_bank_name || '—')}</td>
              <td>${esc(r.destination_country || '—')}${r.destination_bank_name ? ` / ${esc(r.destination_bank_name)}` : ''}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(r.blood_group || '—')}</span></td>
              <td>${r.units || '—'}</td>
              <td>${fmtDate(r.rotation_date)}</td>
              <td><span class="status-badge ${sc}">${esc(r.status || '—')}</span></td>
            </tr>`;
          }).join('')
        : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No rotation records found.</td></tr>';
    } catch (err) {
      handleErr(err);

      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
      }
    }
  }

  /* ══════════════════════════════════════════════
     AI MODELS
  ══════════════════════════════════════════════ */
  async function loadAiModels() {
    const tbody = document.getElementById('aiModelsBody');

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">Loading...</td></tr>';
    }

    try {
      const data = await apiFetch('ai_models');
      const models = data.models || [];

      if (!tbody) return;

      tbody.innerHTML = models.length
        ? models.map((m, i) => {
            const acc = m.training_accuracy ? (parseFloat(m.training_accuracy) * 100).toFixed(1) + '%' : '—';

            return `<tr>
              <td>${i + 1}</td>
              <td><strong>${esc(m.model_name || '—')}</strong></td>
              <td>${esc(m.model_type || '—')}</td>
              <td>${esc(m.framework || '—')}</td>
              <td>${esc(m.version || '—')}</td>
              <td style="color:${parseFloat(m.training_accuracy || 0) > 0.8 ? '#4ade80' : '#fbbf24'}">${acc}</td>
              <td>${m.is_active ? '<span class="status-badge badge-ok">Active</span>' : '<span class="status-badge badge-warn">Inactive</span>'}</td>
              <td>${fmtDate(m.trained_at)}</td>
            </tr>`;
          }).join('')
        : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No AI models found.</td></tr>';
    } catch (err) {
      handleErr(err);

      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
      }
    }
  }

  /* ══════════════════════════════════════════════
     EMERGENCY
  ══════════════════════════════════════════════ */
  /* ── Emergency / Blood Request filter state ── */
  let _emergFilter = 'all';
  let _emergData   = [];

  function renderEmergencyTable() {
    const tbody = document.getElementById('emergencyBody');
    if (!tbody) return;

    const filtered = _emergFilter === 'all'
      ? _emergData
      : _emergData.filter(r => r.request_type === _emergFilter);

    tbody.innerHTML = filtered.length
      ? filtered.map((r, i) => {
          const isEmerg = r.request_type === 'emergency';
          /* type badge */
          const typeBadge = isEmerg
            ? '<span class="status-badge badge-danger" style="font-size:.65rem;">Emergency</span>'
            : '<span class="status-badge badge-blue" style="font-size:.65rem;">Blood Req.</span>';

          /* blood group badge */
          const bgHtml = isEmerg
            ? `<span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(r.blood_group || '—')}</span>`
            : `<span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(99,102,241,.1);color:#818cf8;">${esc(r.blood_group || '—')}${r.units_required ? ' (' + r.units_required + 'u)' : ''}</span>`;

          /* contact (phone for emergency, location+phone for blood) */
          let contact = '—';
          if (isEmerg) {
            contact = esc(r.phone || '—');
          } else {
            const parts = [];
            if (r.location && r.location !== '—') parts.push(esc(r.location));
            if (r.phone   && r.phone   !== '—') parts.push(esc(r.phone));
            contact = parts.join('<br>') || '—';
          }

          /* urgency badge */
          let urgBadge;
          if (isEmerg) {
            urgBadge = '<span class="status-badge badge-danger" style="font-size:.65rem;">Emergency</span>';
          } else {
            const uc = r.urgency === 'critical' ? 'badge-danger' : r.urgency === 'urgent' ? 'badge-warn' : 'badge-ok';
            urgBadge = `<span class="status-badge ${uc}" style="font-size:.65rem;">${esc(r.urgency || 'normal')}</span>`;
          }

          /* status badge */
          const st = r.status;
          let sc;
          if (['processed','approved','completed','delivered'].includes(st)) sc = 'badge-ok';
          else if (st === 'rejected') sc = 'badge-danger';
          else if (st === 'assigned') sc = 'badge-blue';
          else sc = 'badge-warn';

          return `<tr>
            <td>${i + 1}</td>
            <td>${typeBadge}</td>
            <td>${bgHtml}</td>
            <td>${esc(r.requester_name || '—')}</td>
            <td style="font-size:.72rem;">${contact}</td>
            <td>${urgBadge}</td>
            <td><span class="status-badge ${sc}">${esc(r.status || '—')}</span></td>
            <td style="white-space:nowrap;font-size:.72rem;">${fmtDate(r.created_at)}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">${_emergData.length ? 'No matching requests.' : 'No requests found.'}</td></tr>`;
  }

  async function loadEmergency() {
    const tbody = document.getElementById('emergencyBody');

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">Loading...</td></tr>';
    }

    try {
      const data = await apiFetch('emergency');

      animCount(document.getElementById('emergTotal'),    data.total || 0);
      animCount(document.getElementById('emergPending'),  data.pending || 0);
      animCount(document.getElementById('emergProcessed'), data.processed || 0);
      const ec = document.getElementById('emergEmergCount');
      if (ec) ec.textContent = data.e_total || 0;

      _emergData = data.requests || [];
      renderEmergencyTable();
    } catch (err) {
      handleErr(err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
      }
    }
  }

  window.emergencyAction = function (type, id, action) {
    const labels = {
      process:  'process this emergency request',
      reset:    'reset this request back to pending',
      approve:  'approve this blood request',
      reject:   'reject this blood request',
      pending:  'reset this blood request to pending',
    };

    showAdminModal({
      label: 'Confirm Action',
      title: labels[action] ? labels[action].charAt(0).toUpperCase() + labels[action].slice(1) + '?'
             : 'Confirm Action?',
      body: `Are you sure you want to ${labels[action] || action}?`,
      message: '',
      textareaVisible: false,
      confirmText: 'Yes, Proceed',
      onConfirm: async () => {
        closeAdminModal();
        try {
          const res = await apiFetch('emergency_action', 'POST', { type, id, action });
          showToast(res.message || 'Action completed.', 'success');
          loadEmergency();
        } catch (e) {
          showToast(e.message || 'Action failed.', 'error');
        }
      }
    });
  };

  /* ── Filter pill clicks ── */
  document.addEventListener('click', function (e) {
    const pill = e.target.closest('.filter-pills .pill');
    if (!pill || !pill.closest('#emergFilterPills')) return;

    document.querySelectorAll('#emergFilterPills .pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    _emergFilter = pill.dataset.filter;
    renderEmergencyTable();
  });

  /* ══════════════════════════════════════════════
     FORECAST
  ══════════════════════════════════════════════ */
  async function loadForecast() {
    const tbody = document.getElementById('forecastBody');

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">Loading...</td></tr>';
    }

    try {
      const data = await apiFetch('forecast');
      const list = data.forecasts || [];

      if (!tbody) return;

      tbody.innerHTML = list.length
        ? list.map((f, i) => `<tr>
            <td>${i + 1}</td>
            <td>${esc(f.bank_name || '—')}</td>
            <td>${fmtDate(f.forecast_date)}</td>
            <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(f.blood_group || '—')}</span></td>
            <td style="font-weight:700;">${parseFloat(f.predicted_units || 0).toFixed(1)}</td>
            <td>${parseFloat(f.lower_bound || 0).toFixed(1)}</td>
            <td>${parseFloat(f.upper_bound || 0).toFixed(1)}</td>
            <td>${fmtDate(f.generated_at)}</td>
          </tr>`).join('')
        : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No forecast data found.</td></tr>';
    } catch (err) {
      handleErr(err);

      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
      }
    }
  }

  /* ══════════════════════════════════════════════
     PROFILE
  ══════════════════════════════════════════════ */
  async function loadProfile() {
    try {
      const data = await apiFetch('profile');
      const p = data.profile;

      const initials = p.full_name
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const ava = document.getElementById('profAvatar');
      if (ava) ava.textContent = initials;

      txt('profNameDisplay', p.full_name);
      txt('profRoleDisplay', p.role || 'Super Admin');
      txt('profIdDisplay', 'ID: ADM-' + String(p.id).padStart(4, '0'));

      setVal('profId', 'ADM-' + String(p.id).padStart(4, '0'));
      setVal('profSince', fmtDate(p.created_at));
      setVal('profFullName', p.full_name);
      setVal('profEmail', p.email);
      setVal('profRole', p.role || 'Super Admin');
      setVal('profLastLogin', p.last_login ? fmtDate(p.last_login) : '—');

      txt('sidebarName', p.full_name);
      txt('sidebarRole', p.role || 'Super Admin');

      const sa = document.getElementById('sidebarAvatar');
      if (sa) sa.textContent = initials;
    } catch (err) {
      handleErr(err);
      showToast('❌ Profile load failed: ' + err.message, 5000);
    }
  }

  /* ══════════════════════════════════════════════
     USERS
  ══════════════════════════════════════════════ */
  async function loadUsers() {
    const tbody = document.getElementById('usersBody');
    if (tbody) tbody.innerHTML='<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>';
    try {
      const typeFilter   = document.getElementById('userTypeFilter')?.value||'all';
      const statusFilter = document.getElementById('userStatusFilter')?.value||'all';
      const search       = document.getElementById('userSearchInput')?.value||'';
      let url = 'users';
      if (typeFilter!=='all' || statusFilter!=='all' || search) {
        const p = [];
        if (typeFilter!=='all') p.push('type='+typeFilter);
        if (statusFilter!=='all') p.push('status='+statusFilter);
        if (search) p.push('search='+encodeURIComponent(search));
        url += '&' + p.join('&');
      }
      const data = await apiFetch(url);
      const users = data.users||[];
      if (tbody) {
        tbody.innerHTML = users.length
          ? users.map((u,i) => {
              const sc = u.is_active=='1'?'badge-ok':'badge-danger';
              const lbl= u.is_active=='1'?'Active':'Inactive';
              const actBtn = u.is_active=='1'
                ? `<button class="table-btn danger" onclick="toggleUser(${u.id},'deactivate',this)">Deactivate</button>`
                : `<button class="table-btn" onclick="toggleUser(${u.id},'activate',this)">Activate</button>`;
              return `<tr>
                <td>${i+1}</td>
                <td><strong>${esc(u.full_name||'—')}</strong></td>
                <td>${esc(u.email||'—')}</td>
                <td>${esc(u.phone||'—')}</td>
                <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(u.blood_group||'—')}</span></td>
                <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;background:rgba(99,102,241,.12);color:#818cf8;">${esc(u.user_type||'—')}</span></td>
                <td><span class="status-badge ${sc}">${lbl}</span></td>
                <td style="font-size:.75rem;">${fmtDate(u.created_at)}</td>
                <td>${actBtn}</td>
              </tr>`;
            }).join('')
          : '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">No users found.</td></tr>';
      }
    } catch(err) { handleErr(err); if(tbody) tbody.innerHTML=`<tr><td colspan="9" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`; }
  }
  window.toggleUser = async (id, action, btn) => {
    try {
      await apiFetch('user_action','POST',{user_id:id,action});
      showToast('✅ User '+(action==='activate'?'activated':'deactivated'));
      if (btn) {
        const row = btn.closest('tr');
        if (row) {
          const newStatus = action==='activate'?'Active':'Inactive';
          const newAction = action==='activate'?'deactivate':'activate';
          const newBtnCls = action==='activate'?'danger':'';
          row.cells[6].innerHTML = `<span class="status-badge ${action==='activate'?'badge-ok':'badge-danger'}">${newStatus}</span>`;
          row.cells[8].innerHTML = `<button class="table-btn${newBtnCls?' '+newBtnCls:''}" onclick="toggleUser(${id},'${newAction}',this)">${newAction==='activate'?'Activate':'Deactivate'}</button>`;
        }
      }
    } catch(e) { showToast('❌ '+e.message); }
  };

  /* ══════════════════════════════════════════════
     SYSTEM SETTINGS
  ══════════════════════════════════════════════ */
  async function loadSettings() {
    const tbody = document.getElementById('settingsBody');
    if (tbody) tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>';
    try {
      const data = await apiFetch('system_settings');
      const settings = data.settings||[];
      if (tbody) {
        tbody.innerHTML = settings.length
          ? settings.map((s,i) => `<tr>
              <td>${i+1}</td>
              <td><code style="background:rgba(255,255,255,.04);padding:2px 6px;border-radius:4px;font-size:.72rem;">${esc(s.setting_key)}</code></td>
              <td><input type="text" id="sett_${s.id}" value="${esc(s.setting_value||'')}" style="width:100%;background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-primary);padding:4px 8px;border-radius:6px;font-family:Outfit,sans-serif;font-size:.78rem;"></td>
              <td style="font-size:.75rem;color:var(--text-muted);max-width:200px;">${esc(s.description||'—')}</td>
              <td style="font-size:.75rem;">${s.updated_at?fmtDate(s.updated_at):'—'}</td>
              <td><button class="table-btn" onclick="saveSetting(${s.id})">💾 Save</button></td>
          </tr>`).join('')
          : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No settings found.</td></tr>';
      }
    } catch(err) { handleErr(err); if(tbody) tbody.innerHTML=`<tr><td colspan="6" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`; }
  }
  window.saveSetting = async (id) => {
    const val = document.getElementById('sett_'+id)?.value;
    if (val == null) return;
    try {
      await apiFetch('update_system_setting','POST',{id,setting_value:val});
      showToast('✅ Setting saved.');
    } catch(e) { showToast('❌ '+e.message); }
  };

  /* ══════════════════════════════════════════════
     NOTIFICATION TEMPLATES
  ══════════════════════════════════════════════ */
  async function loadNotifTemplates() {
    const tbody = document.getElementById('notifTemplatesBody');
    if (tbody) tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>';
    try {
      const data = await apiFetch('notification_templates');
      const templates = data.templates||[];
      if (tbody) {
        tbody.innerHTML = templates.length
          ? templates.map((t,i) => {
              return `<tr>
                <td>${i+1}</td>
                <td><code style="background:rgba(255,255,255,.04);padding:2px 6px;border-radius:4px;font-size:.72rem;">${esc(t.template_name)}</code></td>
                <td><input type="text" id="tmpl_title_${t.id}" value="${esc(t.title||'')}" style="width:100%;background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-primary);padding:4px 8px;border-radius:6px;font-family:Outfit,sans-serif;font-size:.78rem;"></td>
                <td><textarea id="tmpl_msg_${t.id}" rows="2" style="width:100%;background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-primary);padding:4px 8px;border-radius:6px;font-family:Outfit,sans-serif;font-size:.75rem;resize:vertical;">${esc(t.message||'')}</textarea></td>
                <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;background:rgba(99,102,241,.12);color:#818cf8;">${esc(t.channel||'in_app')}</span></td>
                <td style="font-size:.75rem;">${t.created_at?fmtDate(t.created_at):'—'}</td>
                <td style="display:flex;gap:4px;flex-wrap:wrap;">
                  <button class="table-btn" onclick="saveTemplate(${t.id})">💾 Save</button>
                </td>
              </tr>`;
            }).join('')
          : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No templates found.</td></tr>';
      }
    } catch(err) { handleErr(err); if(tbody) tbody.innerHTML=`<tr><td colspan="7" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`; }
  }
  window.saveTemplate = async (id) => {
    const title   = document.getElementById('tmpl_title_'+id)?.value;
    const message = document.getElementById('tmpl_msg_'+id)?.value;
    try {
      await apiFetch('update_notification_template','POST',{id,title,message});
      showToast('✅ Template saved.');
    } catch(e) { showToast('❌ '+e.message); }
  };
  window.markInvestigated = async (id,btn) => {
    try { await apiFetch('mark_investigated','POST',{id}); showToast('✅ Marked as investigated.'); const row=btn?.closest('tr'); if(row){row.cells[6].innerHTML='<span class="status-badge badge-ok">Resolved</span>';row.cells[7].innerHTML='—';} } catch(e){showToast('❌ '+e.message);}
  };

  const PROF_FIELDS = ['profFullName', 'profEmail'];
  let pOrig = {};

  function enableProfEdit() {
    PROF_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });

    const eb = document.getElementById('editProfBtn');
    const sb = document.getElementById('saveProfBtn');
    const cb = document.getElementById('cancelProfBtn');
    const fa = document.getElementById('profFormActions');

    if (eb) eb.style.display = 'none';
    if (sb) sb.style.display = '';
    if (cb) cb.style.display = '';
    if (fa) fa.style.display = 'flex';
  }

  function disableProfEdit() {
    PROF_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });

    const eb = document.getElementById('editProfBtn');
    const sb = document.getElementById('saveProfBtn');
    const cb = document.getElementById('cancelProfBtn');
    const fa = document.getElementById('profFormActions');

    if (eb) eb.style.display = '';
    if (sb) sb.style.display = 'none';
    if (cb) cb.style.display = 'none';
    if (fa) fa.style.display = 'none';
  }

  function saveOrigProf() {
    PROF_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) pOrig[id] = el.value;
    });
  }

  function restoreOrigProf() {
    PROF_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = pOrig[id] || '';
    });
  }

  async function saveProfile() {
    const fn = document.getElementById('profFullName')?.value.trim();
    const em = document.getElementById('profEmail')?.value.trim();

    if (!fn || fn.length < 2) {
      showToast('⚠️ Name required.', 4000);
      const e = document.getElementById('err-name');
      if (e) e.textContent = 'Name must be ≥ 2 characters.';
      return;
    }

    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      showToast('⚠️ Valid email required.', 4000);
      const e = document.getElementById('err-email');
      if (e) e.textContent = 'Valid email required.';
      return;
    }

    try {
      await apiFetch('update_profile', 'POST', {
        full_name: fn,
        email: em
      });

      disableProfEdit();
      showToast('✅ Profile updated!');

      txt('profNameDisplay', fn);
      txt('sidebarName', fn);

      const initials = fn
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const ava = document.getElementById('profAvatar');
      if (ava) ava.textContent = initials;

      const sa = document.getElementById('sidebarAvatar');
      if (sa) sa.textContent = initials;
    } catch (e) {
      showToast('❌ ' + e.message, 5000);
    }
  }

  const editBtn = document.getElementById('editProfBtn');
  const saveBtn = document.getElementById('saveProfBtn');
  const cancelBtn = document.getElementById('cancelProfBtn');
  const cancelBtn2 = document.getElementById('cancelProfBtn2');

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      saveOrigProf();
      enableProfEdit();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      restoreOrigProf();
      disableProfEdit();
    });
  }

  if (cancelBtn2) {
    cancelBtn2.addEventListener('click', () => {
      restoreOrigProf();
      disableProfEdit();
    });
  }

  if (saveBtn) saveBtn.addEventListener('click', saveProfile);

  const pf = document.getElementById('profileForm');
  if (pf) {
    pf.addEventListener('submit', e => {
      e.preventDefault();
      saveProfile();
    });
  }

  /* Metric card ripple */
  document.querySelectorAll('.metric-card').forEach(card => {
    card.addEventListener('click', e => {
      const ripple = document.createElement('span');
      const rect = card.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);

      ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;background:rgba(192,22,44,.12);border-radius:50%;transform:scale(0);animation:rippleAnim .5s ease-out forwards;pointer-events:none;`;

      if (!document.getElementById('rippleStyle')) {
        const s = document.createElement('style');
        s.id = 'rippleStyle';
        s.textContent = '@keyframes rippleAnim{to{transform:scale(2.5);opacity:0;}}';
        document.head.appendChild(s);
      }

      card.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    });
  });

  /* ── INIT ── */
  function init() {
    triggerReveals();

    /* Fix select/option dropdown colors for dark and light mode */
    if (!document.getElementById('bbAdminSelectFix')) {
      const s = document.createElement('style');
      s.id = 'bbAdminSelectFix';
      s.textContent = `
        select { color-scheme: dark light; }
        [data-theme="dark"] select,
        [data-theme="dark"] select option,
        [data-theme="dark"] select optgroup {
          background-color: #1a0a0d !important;
          color: #fff !important;
        }
        [data-theme="light"] select,
        [data-theme="light"] select option,
        [data-theme="light"] select optgroup {
          background-color: #fff !important;
          color: #1a0508 !important;
        }
        select option,
        select optgroup {
          background-color: #1a0a0d;
          color: #fff;
        }
        #investigateEntityFilter option,
        #investigateEntityFilter optgroup {
          background-color: #1a0a0d !important;
          color: #fff !important;
          padding: 6px 12px;
        }
        [data-theme="light"] #investigateEntityFilter,
        [data-theme="light"] #investigateEntityFilter option {
          background-color: #fff !important;
          color: #1a0508 !important;
        }
      `;
      document.head.appendChild(s);
    }
    const saved = localStorage.getItem('bbAdminPage');
    if (saved && document.querySelector(`.sidebar-link[data-page="${saved}"]`)) {
      navigateTo(saved);
    } else {
      loadDashboard();
    }
    /* user filter listeners */
    ['userTypeFilter', 'userStatusFilter', 'userSearchBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el && id !== 'userSearchBtn') el.addEventListener('change', () => loadUsers());
    });
    const searchBtn = document.getElementById('userSearchBtn');
    if (searchBtn) searchBtn.addEventListener('click', () => loadUsers());
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadUsers(); });

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();