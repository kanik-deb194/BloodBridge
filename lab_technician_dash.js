/* ============================================================
   BloodBridge — lab_technician_dash.js  (DATABASE-CONNECTED)
   API: lab_api.php
   Session: role='user', sub_role='lab_technician'
   ============================================================ */
(function () {
  'use strict';

  const API = 'lab_api.php';

  /* ── THEME ── */
  const html = document.documentElement;
  const THEME_KEY = 'bb-theme';
  function applyTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
  function getTheme()     { return localStorage.getItem(THEME_KEY) || 'dark'; }
  applyTheme(getTheme());
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', () => applyTheme(getTheme() === 'dark' ? 'light' : 'dark'));

  /* ── SIDEBAR ── */
  function isMobile() { return window.innerWidth < 1024; }
  function openSidebar()  { /* handled by IIFE below */ }
  function closeSidebar() { /* handled by IIFE below */ }

  /* ── NAVIGATION ── */
  const VIEW_MAP = {
    dashboard:'dashboardView', tests:'testsView', quarantine:'quarantineView',
    antibody:'antibodyView', coldchain:'coldchainView', thalassemia:'thalassemiaView', profile:'profileView'
  };
  function navigateTo(sec) {
    Object.values(VIEW_MAP).forEach(id => { const el=document.getElementById(id); if(el) el.classList.remove('active'); });
    const t = document.getElementById(VIEW_MAP[sec]||VIEW_MAP.dashboard); if(t) t.classList.add('active');
    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));
    const al = document.querySelector(`.sidebar-link[data-section="${sec}"]`); if(al) al.classList.add('active');
    if (isMobile()) closeSidebar();
    window.scrollTo({top:0,behavior:'smooth'}); initReveal();
    switch(sec) {
      case 'dashboard':   loadDashboard();   break;
      case 'tests':       loadTests(); setTimeout(()=>loadDonorTests(),150); break;
      case 'quarantine':  loadQuarantine();  break;
      case 'antibody':    loadAntibody();    break;
      case 'coldchain':   loadColdChain();   break;
      case 'thalassemia': loadThalassemia(); break;
      case 'profile':     loadProfile();     break;
    }
    localStorage.setItem('bbLabPage', sec);
  }

  /* ── UTILS ── */
  function on(id,ev,fn) { const el=document.getElementById(id); if(el) el.addEventListener(ev,fn); }
  function txt(id,v)    { const el=document.getElementById(id); if(el) el.textContent=(v==null)?'—':v; }
  function setVal(id,v) { const el=document.getElementById(id); if(el) el.value=(v==null)?'':v; }
  function esc(s)       { if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtDate(ds,sh){ if(!ds)return'—'; const d=new Date(ds); if(isNaN(d))return ds; const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; return sh?`${m} ${d.getDate()}`:`${m} ${d.getDate()}, ${d.getFullYear()}`; }
  function timeAgo(ds)  { if(!ds)return''; const s=Math.floor((Date.now()-new Date(ds))/1000); if(s<60)return`${s}s ago`; if(s<3600)return`${Math.floor(s/60)} min ago`; if(s<86400)return`${Math.floor(s/3600)} hr ago`; return`${Math.floor(s/86400)} days ago`; }
  function todayISO()   { return new Date().toISOString().slice(0,10); }
  function resultBadge(r) {
    if (!r) return '<span class="status-badge badge-warn">Pending</span>';
    const ok = r==='negative'||r==='sterile';
    return `<span class="status-badge ${ok?'badge-ok':'badge-danger'}">${esc(r)}</span>`;
  }

  async function apiFetch(action, method, body) {
    method = method||'GET';
    const opts = {method, headers:{'Content-Type':'application/json'}};
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(`${API}?action=${action}`, opts);
    const data = await res.json().catch(()=>({success:false,error:`HTTP ${res.status}`}));
    if (!data.success && res.status===401) throw new Error('AUTH_FAILED');
    if (!data.success) throw new Error(data.error||data.errors?.join(', ')||`HTTP ${res.status}`);
    return data;
  }

  /* ── TOAST ── */
  function showToast(msg, dur) {
    dur=dur||3500;
    let t=document.getElementById('toastMessage');
    if(!t){t=document.createElement('div');t.id='toastMessage';t.className='toast-message';document.body.appendChild(t);}
    t.textContent=msg; t.classList.add('show'); clearTimeout(t._t);
    t._t=setTimeout(()=>t.classList.remove('show'),dur);
  }

  /* ── REVEAL ── */
  function initReveal() {
    const els=document.querySelectorAll('.reveal:not(.visible)');
    if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('visible'));return;}
    const obs=new IntersectionObserver(en=>{en.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}});},{threshold:0.06,rootMargin:'0px 0px -40px 0px'});
    els.forEach(e=>obs.observe(e));
  }

  /* ── COUNTER ── */
  function animCount(el,target,dur) {
    if(!el)return; dur=dur||900; let s=null;
    const step=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/dur,1);el.textContent=Math.floor((1-Math.pow(1-p,3))*target);if(p<1)requestAnimationFrame(step);else el.textContent=target;};
    requestAnimationFrame(step);
  }

  /* ── MODAL ── */
  const modal=document.getElementById('globalModal'), mTitle=document.getElementById('modalTitle'),
        mBody=document.getElementById('modalBody'), mConfirm=document.getElementById('modalConfirmBtn'),
        mCancel=document.getElementById('modalCancelBtn'), mClose=document.getElementById('closeModalBtn');
  let mAction=null;
  function openModal(title,content,onConfirm,confirmLabel) {
    if(!modal)return; mTitle.textContent=title; mBody.innerHTML=content;
    if(mConfirm)mConfirm.textContent=confirmLabel||'Confirm';
    modal.style.display='flex'; mAction=onConfirm||null;
  }
  window.openModal = openModal;
  function closeModal() { if(modal)modal.style.display='none'; mAction=null; }
  if(mClose) mClose.addEventListener('click',closeModal);
  if(mCancel)mCancel.addEventListener('click',closeModal);
  if(mConfirm)mConfirm.addEventListener('click',()=>{if(mAction)mAction();closeModal();});
  if(modal)modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal?.style.display==='flex')closeModal();});

  function handleErr(err) {
    if(err.message==='AUTH_FAILED'){showToast('⚠️ Session expired. Redirecting…',3000);setTimeout(()=>window.location.href='login.html',3000);}
  }

  const IS='background:var(--input-bg);border:1px solid var(--input-border);padding:8px 12px;border-radius:10px;width:100%;margin-top:6px;color:var(--text-primary);font-family:Outfit,sans-serif;font-size:.85rem;';

  /* ══════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════ */
  async function loadDashboard() {
    try {
      const data = await apiFetch('dashboard');
      const u = data.user, s = data.stats;

      /* User info */
      txt('greetName',  u.full_name);
      txt('labSubtitle',`Quality Control · ${u.blood_bank_name}`);
      txt('sidebarName', u.full_name);
      txt('sidebarRole', 'Lab Technician');
      const sa = document.getElementById('sidebarAvatar');
      if (sa) sa.textContent = u.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

      /* Alert banner */
      txt('alertBannerText', s.bags_due_today > 0 ? `${s.bags_due_today} bag${s.bags_due_today!==1?'s':''} due for culture test today` : 'All culture tests are up to date ✅');

      /* Stats */
      animCount(document.getElementById('pendingTests'),    s.pending_tests);
      animCount(document.getElementById('quarantinedBags'), s.quarantined_bags);
      animCount(document.getElementById('failedCultures'),  s.failed_cultures);
      animCount(document.getElementById('testsThisMonth'),  s.tests_this_month);

      /* Critical alert */
      const critCard = document.querySelector('.alert-critical-card');
      const ca = data.critical_alert;
      if (critCard) {
        if (ca) {
          txt('criticalAlertTitle', `Bag #${ca.bag_id} culture test failed — ${ca.pathogen_detected} detected`);
          txt('criticalAlertMsg',   'Quarantine triggered. Discard protocol required.');
          const btn = document.getElementById('handleCriticalBtn');
          if (btn) {
            btn.style.display = '';
            btn.onclick = () => openCriticalAlertModal(ca);
          }
        } else {
          txt('criticalAlertTitle', '✅ No critical culture failures at this time.');
          txt('criticalAlertMsg',   'All recent tests have passed contamination checks.');
          const btn = document.getElementById('handleCriticalBtn');
          if (btn) btn.style.display = 'none';
        }
      }

      /* Pending tests table */
      const tbody = document.getElementById('pendingTestsTable');
      const countLabel = document.getElementById('pendingCountLabel');
      const pending = data.recent_pending || [];
      if (countLabel) countLabel.textContent = s.pending_tests + ' total';
      if (tbody) {
        tbody.innerHTML = pending.length
          ? pending.map(r => {
              const due = r.due_date ? (new Date(r.due_date) <= new Date() ? 'Today' : fmtDate(r.due_date,true)) : '—';
              return `<tr>
                <td>#${r.bag_id}</td>
                <td>${esc(r.blood_group||'—')}</td>
                <td>${fmtDate(r.test_date,true)}</td>
                <td style="color:${due==='Today'?'#f87171':'var(--text-primary)'};font-weight:${due==='Today'?'700':'400'}">${due}</td>
                <td><button class="table-btn" onclick="openEnterCultureModal(${r.bag_id},'${esc(r.blood_group||'')}')">Enter Result</button></td>
              </tr>`;
            }).join('')
          : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">No pending tests.</td></tr>';
      }

      /* Quarantine list */
      const qList = document.getElementById('quarantineListItems');
      const qLabel= document.getElementById('quarantineCountLabel');
      const qBags = data.quarantined_list || [];
      if (qLabel) qLabel.textContent = s.quarantined_bags;
      if (qList) {
        qList.innerHTML = qBags.length
          ? qBags.map(b => {
              const isFailed = b.quarantine_reason && b.quarantine_reason.toLowerCase().includes('culture');
              const cls  = isFailed ? 'alert-danger' : 'alert-warning';
              const icon = isFailed ? '🧫' : '⚠️';
              const iconCls = isFailed ? 'alert-icon-red' : 'alert-icon-orange';
              return `<div class="alert-item ${cls}">
                <div class="alert-icon-wrap ${iconCls}">${icon}</div>
                <div class="alert-body">
                  <div class="alert-title">Bag #${b.bag_id}</div>
                  <div class="alert-msg">${esc(b.quarantine_reason||'Quarantine reason not specified')}</div>
                  <div class="alert-meta"><span class="alert-time">Quarantined: ${timeAgo(b.created_at)}</span></div>
                </div>
                <button class="alert-action-btn" onclick="openDiscardModal(${b.bag_id})">Discard</button>
              </div>`;
            }).join('')
          : '<div style="padding:14px;text-align:center;color:var(--text-muted);font-size:.82rem;">✅ No quarantined bags.</div>';
      }

      /* Cold chain preview */
      const ccGrid = document.getElementById('coldchainGrid');
      const ccLogs = data.cold_chain_preview || [];
      if (ccGrid) {
        ccGrid.innerHTML = ccLogs.length
          ? ccLogs.map(l => {
              const temp = parseFloat(l.temperature_celsius);
              const ok   = !l.is_alert;
              const sc   = ok ? 'badge-ok' : 'badge-warn';
              const lbl  = ok ? 'Normal' : `Alert (${temp.toFixed(1)}°C)`;
              return `<div class="sensor-item">
                <span>${esc(l.sensor_id||'Sensor --')}</span>
                <span style="color:${l.is_alert?'#f87171':'#4ade80'};font-weight:700;">${temp.toFixed(1)}°C</span>
                <span class="status-badge ${sc}">${lbl}</span>
              </div>`;
            }).join('')
          : '<div style="color:var(--text-muted);font-size:.82rem;padding:8px;">No sensor data available.</div>';
      }

    } catch(err) { handleErr(err); if(err.message!=='AUTH_FAILED') showToast('❌ Dashboard error: '+err.message, 5000); }
    initReveal();
  }

  /* ══════════════════════════════════════════════
     PENDING TESTS PAGE
  ══════════════════════════════════════════════ */
  async function loadTests(statusFilter) {
    statusFilter = statusFilter||'pending';
    const tbody = document.getElementById('testsTableBody');
    if (tbody) tbody.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>';
    try {
      const data  = await apiFetch('tests'+(statusFilter!=='pending'?`&status=${statusFilter}`:''));
      const tests = data.tests||[];
      if (tbody) {
        tbody.innerHTML = tests.length
          ? tests.map((t,i) => `<tr>
              <td>${i+1}</td>
              <td><strong>#${t.bag_id}</strong></td>
              <td>${esc(t.blood_group||'—')}</td>
              <td>${fmtDate(t.test_date)}</td>
              <td>${resultBadge(t.result)}</td>
              <td>${esc(t.pathogen_detected||'—')}</td>
              <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc((t.comments||'').slice(0,50))||'—'}</td>
              <td>${esc(t.technician_name||'—')}</td>
            </tr>`).join('')
          : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No tests found.</td></tr>';
      }
    } catch(err) { handleErr(err); if(tbody) tbody.innerHTML=`<tr><td colspan="8" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`; }
  }
  on('testsFilterStatus','change',()=>{ const s=document.getElementById('testsFilterStatus')?.value||'pending'; loadTests(s); loadDonorTests(s); });
  on('refreshTestsPageBtn','click',()=>{ const s=document.getElementById('testsFilterStatus')?.value||'pending'; loadTests(s); loadDonorTests(s); });
  on('refreshTestsBtn','click',()=>{ loadTests(); loadDonorTests(); showToast('Test list refreshed.'); });

  async function loadDonorTests(statusFilter) {
    statusFilter = statusFilter||'pending';
    const tbody = document.getElementById('donorTestsBody');
    if (!tbody) return;
    tbody.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</div>';
    try {
      const data = await apiFetch('donor_tests&status='+statusFilter);
      const tests = data.tests||[];
      if (!tests.length) { tbody.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.83rem;">✅ No pending donor acceptances.</div>'; return; }
      tbody.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>DONOR</th><th>DONOR GROUP</th><th>NEEDS GROUP</th><th>REQUEST</th><th>URGENCY</th><th>SUBMITTED</th><th>ACTIONS</th></tr></thead><tbody>'
        + tests.map((t,i) => {
            const tid = t.test_id || t.id || 0;
            return `<tr>
              <td>${i+1}</td>
              <td><strong>${esc(t.donor_name||'—')}</strong><br><span style='font-size:.7rem;color:var(--text-muted);'>${esc(t.donor_email||'')}</span></td>
              <td><span class='status-badge badge-ok'>${esc(t.donor_blood_group||'—')}</span></td>
              <td><span class='status-badge badge-warn'>${esc(t.requested_blood_group||'—')}</span></td>
              <td>#REQ-${String(t.request_id||0).padStart(4,'0')}<br><span style='font-size:.7rem;color:var(--text-muted);'>${esc(t.requester_name||'—')}</span></td>
              <td><span class='status-badge ${t.urgency==='emergency'?'badge-danger':t.urgency==='urgent'?'badge-warn':'badge-ok'}'>${esc((t.urgency||'normal').toUpperCase())}</span></td>
              <td style='font-size:.78rem;'>${fmtDate(t.created_at)}</td>
              <td><div style='display:flex;gap:6px;'>
                <button data-tid='${tid}' class='dt-approve-btn' style='padding:5px 12px;border-radius:16px;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.35);color:#4ade80;font-size:.72rem;font-weight:700;cursor:pointer;'>✅ Approve</button>
                <button data-tid='${tid}' class='dt-reject-btn' style='padding:5px 12px;border-radius:16px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);color:#f87171;font-size:.72rem;font-weight:700;cursor:pointer;'>❌ Reject</button>
              </div></td>
            </tr>`;
          }).join('')
        + '</tbody></table></div>';
      tbody.querySelectorAll('.dt-approve-btn').forEach(b => b.addEventListener('click', () => { const id = Number(b.getAttribute('data-tid')); approveDonorTest(id); }));
      tbody.querySelectorAll('.dt-reject-btn').forEach(b => b.addEventListener('click', () => { const id = Number(b.getAttribute('data-tid')); rejectDonorTest(id); }));
    } catch(err) { tbody.innerHTML=`<div style='color:#f87171;padding:20px;text-align:center;'>⚠️ ${esc(err.message)}</div>`; }
  }

  window.approveDonorTest = function(testId) {
    if (!testId && testId !== 0) { showToast('⚠️ Could not identify test. Please refresh.', 3000); return; }
    openModal('✅ Approve Donor Test',
      '<p style="font-size:.83rem;color:var(--text-muted);margin-bottom:12px;">Approving will create a blood bag and notify both the donor and requester.</p>'
      + '<label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Comments (optional)</label>'
      + '<textarea id="approveComment" rows="3" placeholder="e.g. Blood sample is clean." style="width:100%;padding:10px;border-radius:8px;background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--text-primary);font-size:.82rem;resize:vertical;font-family:inherit;"></textarea>',
      async () => {
        const comments = document.getElementById('approveComment')?.value.trim() || 'Approved by lab technician.';
        try {
          const res = await apiFetch('approve_donor_test','POST',{ test_id: testId, comments });
          showToast('✅ ' + res.message); loadDonorTests(); loadDashboard();
        } catch(e) { showToast('❌ ' + e.message, 4000); }
      }, 'Approve & Create Blood Bag');
  };

  window.rejectDonorTest = function(testId) {
    if (!testId && testId !== 0) { showToast('⚠️ Could not identify test. Please refresh.', 3000); return; }
    openModal('❌ Reject Donor Test',
      '<p style="font-size:.83rem;color:var(--text-muted);margin-bottom:12px;">Please provide a reason for rejection.</p>'
      + '<textarea id="rejectComment" rows="3" placeholder="e.g. Pathogen detected." style="width:100%;padding:10px;border-radius:8px;background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--text-primary);font-size:.82rem;resize:vertical;font-family:inherit;"></textarea>',
      async () => {
        const comments = document.getElementById('rejectComment')?.value.trim() || 'Rejected by lab technician.';
        try {
          await apiFetch('reject_donor_test','POST',{ test_id: testId, comments });
          showToast('🚫 Test rejected.'); loadDonorTests(); loadDashboard();
        } catch(e) { showToast('❌ ' + e.message, 4000); }
      }, 'Confirm Rejection');
  };

  /* ══════════════════════════════════════════════
     QUARANTINE PAGE
  ══════════════════════════════════════════════ */
  async function loadQuarantine() {
    const tbody = document.getElementById('quarantineTableBody');
    if (tbody) tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const data = await apiFetch('quarantine');
      const bags = data.bags||[];
      if (tbody) {
        tbody.innerHTML = bags.length
          ? bags.map((b,i) => `<tr>
              <td>${i+1}</td>
              <td><strong>#${b.bag_id}</strong></td>
              <td>${esc(b.blood_group||'—')}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(b.quarantine_reason||'—')}</td>
              <td><span class="status-badge badge-danger">${esc(b.status||'quarantined')}</span></td>
              <td>${fmtDate(b.created_at)}</td>
              <td>${b.expiry_date?fmtDate(b.expiry_date):'—'}</td>
            </tr>`).join('')
          : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No quarantined bags found.</td></tr>';
      }
    } catch(err) { handleErr(err); if(tbody) tbody.innerHTML=`<tr><td colspan="7" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`; }
  }

  /* ══════════════════════════════════════════════
     ANTIBODY PAGE
  ══════════════════════════════════════════════ */
  async function loadAntibody() {
    const tbody = document.getElementById('antibodyTableBody');
    if (tbody) tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const data    = await apiFetch('antibody');
      const records = data.records||[];
      if (tbody) {
        tbody.innerHTML = records.length
          ? records.map((a,i) => `<tr>
              <td>${i+1}</td>
              <td>${esc(a.person_name||'—')}</td>
              <td>${a.is_donor ? 'Donor' : 'Recipient'}</td>
              <td><span class="status-badge badge-danger">${esc(a.antibody_name)}</span></td>
              <td>${a.is_donor ? '✅' : '⚠️'}</td>
              <td>${fmtDate(a.detected_at)}</td>
            </tr>`).join('')
          : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No antibody records found.</td></tr>';
      }
    } catch(err) { handleErr(err); if(tbody) tbody.innerHTML=`<tr><td colspan="6" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`; }
  }

  /* ══════════════════════════════════════════════
     COLD CHAIN PAGE
  ══════════════════════════════════════════════ */
  async function loadColdChain() {
    const tbody = document.getElementById('coldchainTableBody');
    if (tbody) tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const data = await apiFetch('coldchain');
      txt('ccTotal',  data.total);
      txt('ccAlerts', data.alerts);
      txt('ccBanks',  data.banks_affected);
      const logs = data.logs||[];
      if (tbody) {
        tbody.innerHTML = logs.length
          ? logs.map((l,i) => {
              const temp = parseFloat(l.temperature_celsius);
              return `<tr>
                <td>${i+1}</td>
                <td>${esc(l.sensor_id||'—')}</td>
                <td style="color:${l.is_alert?'#f87171':'#4ade80'};font-weight:700;">${temp.toFixed(1)}°C</td>
                <td>${fmtDate(l.recorded_at)}</td>
                <td>${l.is_alert?'<span class="status-badge badge-danger">⚠️ Alert</span>':'<span class="status-badge badge-ok">Normal</span>'}</td>
              </tr>`;
            }).join('')
          : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No temperature logs found.</td></tr>';
      }
    } catch(err) { handleErr(err); if(tbody) tbody.innerHTML=`<tr><td colspan="5" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`; }
  }

  /* ══════════════════════════════════════════════
     THALASSEMIA PAGE
  ══════════════════════════════════════════════ */
  async function loadThalassemia() {
    const tbody = document.getElementById('thalassemiaTableBody');
    if (tbody) tbody.innerHTML='<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const data     = await apiFetch('thalassemia');
      const carriers = data.carriers||[];
      if (tbody) {
        tbody.innerHTML = carriers.length
          ? carriers.map((c,i) => `<tr>
              <td>${i+1}</td>
              <td><strong>${esc(c.patient_name||'—')}</strong></td>
              <td>${esc(c.patient_email||'—')}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(c.blood_group||'—')}</span></td>
              <td>${esc(c.patient_phone||'—')}</td>
              <td>${Number(c.is_carrier)?'<span class="status-badge badge-warn">Yes — Carrier</span>':'<span class="status-badge badge-ok">No</span>'}</td>
              <td>${esc(c.confirmed_by_name||'—')}</td>
              <td>${fmtDate(c.confirmed_at)}</td>
              <td>
                <button class="btn-row-action" onclick="openEditThalModal('${esc(c.patient_email)}',${c.is_carrier})" title="Edit">✏️</button>
                <button class="btn-row-action" onclick="deleteThalRecord(${c.id})" title="Delete">🗑️</button>
              </td>
            </tr>`).join('')
          : '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">No carrier records found.</td></tr>';
      }
    } catch(err) { handleErr(err); if(tbody) tbody.innerHTML=`<tr><td colspan="9" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`; }
  }
  on('flagNewThalBtn','click', openFlagThalModal);
  window.loadThalassemia = loadThalassemia;

  /* ══════════════════════════════════════════════
     PROFILE PAGE
  ══════════════════════════════════════════════ */
  async function loadProfile() {
    try {
      const data = await apiFetch('profile');
      const p    = data.profile;
      const initials = p.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const ava = document.getElementById('profAvatar'); if(ava) ava.textContent=initials;
      txt('profNameDisplay', p.full_name);
      txt('profRoleDisplay', 'Lab Technician');
      txt('profIdDisplay',   'ID: LT-'+String(p.id).padStart(5,'0'));
      setVal('profId',       'LT-'+String(p.id).padStart(5,'0'));
      setVal('profSince',    fmtDate(p.created_at));
      setVal('profFullName', p.full_name);
      setVal('profEmail',    p.email);
      setVal('profPhone',    p.phone||'');
      setVal('profBankName', p.blood_bank_name||'—');
      txt('sidebarName', p.full_name);
      const sa = document.getElementById('sidebarAvatar'); if(sa) sa.textContent=initials;
    } catch(err) { handleErr(err); showToast('❌ Profile load failed: '+err.message, 5000); }
  }

  /* Profile edit/save */
  const PROF_FIELDS=['profFullName','profEmail','profPhone'];
  let pOrig={};
  function enableProfEdit()  { PROF_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=false;}); const eb=document.getElementById('editProfBtn');if(eb)eb.style.display='none'; const sb=document.getElementById('saveProfBtn');if(sb)sb.style.display=''; const cb=document.getElementById('cancelProfBtn');if(cb)cb.style.display=''; const fa=document.getElementById('profFormActions');if(fa)fa.style.display='flex'; }
  function disableProfEdit() { PROF_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=true;}); const eb=document.getElementById('editProfBtn');if(eb)eb.style.display=''; const sb=document.getElementById('saveProfBtn');if(sb)sb.style.display='none'; const cb=document.getElementById('cancelProfBtn');if(cb)cb.style.display='none'; const fa=document.getElementById('profFormActions');if(fa)fa.style.display='none'; }
  function saveOrigProf()    { PROF_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)pOrig[id]=el.value;}); }
  function restoreOrigProf() { PROF_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)el.value=pOrig[id]||'';}); }
  async function saveProfile() {
    const fn=document.getElementById('profFullName')?.value.trim();
    const em=document.getElementById('profEmail')?.value.trim();
    if(!fn||fn.length<2){showToast('⚠️ Name required.',4000);return;}
    if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){showToast('⚠️ Valid email required.',4000);return;}
    try {
      await apiFetch('update_profile','POST',{full_name:fn,email:em,phone:document.getElementById('profPhone')?.value.trim()});
      disableProfEdit(); showToast('✅ Profile updated!');
      txt('profNameDisplay',fn); txt('sidebarName',fn);
      const ava=document.getElementById('profAvatar'); if(ava) ava.textContent=fn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const sa=document.getElementById('sidebarAvatar'); if(sa) sa.textContent=fn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    } catch(e){showToast('❌ '+e.message,5000);}
  }
  on('editProfBtn',    'click', ()=>{saveOrigProf();enableProfEdit();});
  on('cancelProfBtn',  'click', ()=>{restoreOrigProf();disableProfEdit();});
  on('cancelProfBtn2', 'click', ()=>{restoreOrigProf();disableProfEdit();});
  on('saveProfBtn',    'click', saveProfile);
  const pf=document.getElementById('profileForm'); if(pf) pf.addEventListener('submit',e=>{e.preventDefault();saveProfile();});

  /* ══════════════════════════════════════════════
     ACTION CARD MODALS — DB connected
  ══════════════════════════════════════════════ */

  /* Enter culture test result */
  window.openEnterCultureModal = (bagId, bloodGroup) => {
    openModal(`📝 Culture Test — Bag #${bagId}`,
      `<p style="font-size:.84rem;margin-bottom:14px;">Bag #${esc(String(bagId))} · Blood Group: <strong>${esc(bloodGroup||'—')}</strong></p>
       <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Result *</label>
       <select id="cResultSel" style="${IS}">
         <option value="sterile">Sterile (Negative — Pass)</option>
         <option value="negative">Negative (Pass)</option>
         <option value="positive">Positive (Contaminated — Fail)</option>
       </select>
       <div id="pathogenDiv" style="display:none;margin-top:12px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Pathogen Detected *</label>
         <input type="text" id="cPathogen" placeholder="e.g., E. coli, Staphylococcus" style="${IS}">
       </div>
       <div style="margin-top:12px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Comments</label>
         <textarea id="cComments" rows="2" placeholder="Optional notes..." style="${IS}resize:vertical;"></textarea>
       </div>`,
      async () => {
        const result   = document.getElementById('cResultSel')?.value||'sterile';
        const pathogen = document.getElementById('cPathogen')?.value.trim()||'';
        const comments = document.getElementById('cComments')?.value.trim()||'';
        if (result==='positive'&&!pathogen) { showToast('⚠️ Pathogen name required for positive result.'); return; }
        try {
          const res=await apiFetch('submit_culture','POST',{bag_id:bagId,result,pathogen_detected:pathogen,comments});
          showToast(res.message);
          if (res.quarantined) {
            const qEl=document.getElementById('quarantinedBags'); if(qEl) qEl.textContent=parseInt(qEl.textContent||0)+1;
            const fEl=document.getElementById('failedCultures');  if(fEl) fEl.textContent=parseInt(fEl.textContent||0)+1;
          }
          loadDashboard();
        } catch(e){showToast('❌ '+e.message,5000);}
      },'Save Result');

    setTimeout(()=>{
      const sel=document.getElementById('cResultSel'), div=document.getElementById('pathogenDiv');
      if(sel) sel.addEventListener('change',()=>{if(div) div.style.display=sel.value==='positive'?'block':'none';});
    },100);
  };

  /* Discard bag */
  window.openDiscardModal = (bagId) => {
    openModal(`🗑️ Discard Bag #${bagId}`,
      `<p>Confirm disposal of quarantined blood bag <strong>#${bagId}</strong>.</p>
       <label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:.85rem;cursor:pointer;">
         <input type="checkbox" id="confirmDiscard" style="width:16px;height:16px;">
         I confirm disposal per biosafety protocol
       </label>`,
      async () => {
        if (!document.getElementById('confirmDiscard')?.checked) { showToast('⚠️ Please confirm disposal.'); return; }
        try {
          await apiFetch('discard_bag','POST',{bag_id:bagId});
          showToast(`✅ Bag #${bagId} discarded. Incineration logged.`);
          loadDashboard();
        } catch(e){showToast('❌ '+e.message,5000);}
      },'Confirm Discard');
  };

  /* Critical alert modal */
  function openCriticalAlertModal(ca) {
    openModal(`🧫 Critical Alert — Bag #${ca.bag_id}`,
      `<p><strong>Culture Result:</strong> Positive — ${esc(ca.pathogen_detected)}</p>
       <p style="margin-top:8px;"><strong>Test Date:</strong> ${fmtDate(ca.test_date)}</p>
       <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px;margin-top:12px;">
         <strong>Required Actions:</strong>
         <ul style="margin:8px 0 0 18px;line-height:1.8;">
           <li>✅ Quarantine bag immediately</li>
           <li>✅ Notify infection control</li>
           <li>✅ Schedule equipment sterilisation</li>
         </ul>
       </div>
       <label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:.85rem;cursor:pointer;">
         <input type="checkbox" id="confirmCritical" style="width:16px;height:16px;">
         Confirm discard of contaminated unit
       </label>`,
      async () => {
        if (!document.getElementById('confirmCritical')?.checked) { showToast('⚠️ Please confirm before proceeding.'); return; }
        try {
          await apiFetch('discard_bag','POST',{bag_id:ca.bag_id});
          showToast(`✅ Bag #${ca.bag_id} discarded. Disposal report generated.`);
          loadDashboard();
        } catch(e){showToast('❌ '+e.message,5000);}
      },'Confirm Discard');
  }

  /* Record antibody */
  function openRecordAntibodyModal() {
    openModal('🛡️ Record Antibody Test',
      `<label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">User ID (Patient/Donor) *</label>
       <input type="number" id="abUserId" placeholder="Enter user ID" style="${IS}">
       <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-top:12px;margin-bottom:4px;">Antibody Detected *</label>
       <select id="abName" style="${IS}">
         <option value="Anti-Kell">Anti-Kell</option>
         <option value="Anti-D">Anti-D</option>
         <option value="Anti-c">Anti-c</option>
         <option value="Anti-E">Anti-E</option>
         <option value="Anti-Fya">Anti-Fya</option>
         <option value="Other">Other (specify below)</option>
       </select>
       <input type="text" id="abNameOther" placeholder="Specify antibody..." style="${IS}margin-top:8px;display:none;">
       <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-top:12px;margin-bottom:4px;">Person Type</label>
       <select id="abIsDonor" style="${IS}"><option value="1">Donor</option><option value="0">Recipient</option></select>`,
      async () => {
        const userId=parseInt(document.getElementById('abUserId')?.value||0);
        const selName=document.getElementById('abName')?.value;
        const otherName=document.getElementById('abNameOther')?.value.trim();
        const antibodyName=selName==='Other'?otherName:selName;
        const isDonor=parseInt(document.getElementById('abIsDonor')?.value||1);
        if(!userId){showToast('⚠️ User ID required.');return;}
        if(!antibodyName){showToast('⚠️ Antibody name required.');return;}
        try{await apiFetch('submit_antibody','POST',{user_id:userId,antibody_name:antibodyName,is_donor:isDonor});showToast('✅ Antibody record saved!');}
        catch(e){showToast('❌ '+e.message,5000);}
      },'Save Record');
    setTimeout(()=>{
      const sel=document.getElementById('abName'),oth=document.getElementById('abNameOther');
      if(sel&&oth)sel.addEventListener('change',()=>{oth.style.display=sel.value==='Other'?'block':'none';});
    },100);
  }

  /* Pre-donation health check */
  function openHealthCheckModal() {
    openModal('🩺 Pre-Donation Health Check',
      `<label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Donor User ID *</label>
       <input type="number" id="hcDonorId" placeholder="Enter donor user ID" style="${IS}">
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Haemoglobin (g/dL)</label><input type="number" id="hcHb" step="0.1" placeholder="12.5" style="${IS}"></div>
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">BP Systolic</label><input type="number" id="hcBpSys" placeholder="120" style="${IS}"></div>
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">BP Diastolic</label><input type="number" id="hcBpDia" placeholder="80" style="${IS}"></div>
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Pulse (bpm)</label><input type="number" id="hcPulse" placeholder="72" style="${IS}"></div>
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Weight (kg)</label><input type="number" id="hcWeight" step="0.1" placeholder="70" style="${IS}"></div>
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Temperature (°C)</label><input type="number" id="hcTemp" step="0.1" placeholder="36.6" style="${IS}"></div>
       </div>
       <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-top:12px;margin-bottom:4px;">Notes</label>
       <textarea id="hcNotes" rows="2" placeholder="Optional..." style="${IS}resize:vertical;"></textarea>`,
      async () => {
        const donorId=parseInt(document.getElementById('hcDonorId')?.value||0);
        if(!donorId){showToast('⚠️ Donor ID required.');return;}
        try{
          await apiFetch('health_check','POST',{
            donor_user_id:donorId,
            haemoglobin:parseFloat(document.getElementById('hcHb')?.value||0),
            blood_pressure_sys:parseInt(document.getElementById('hcBpSys')?.value||0),
            blood_pressure_dia:parseInt(document.getElementById('hcBpDia')?.value||0),
            pulse:parseInt(document.getElementById('hcPulse')?.value||0),
            weight_kg:parseFloat(document.getElementById('hcWeight')?.value||0),
            temperature:parseFloat(document.getElementById('hcTemp')?.value||0),
            notes:document.getElementById('hcNotes')?.value.trim()||'',
          });
          showToast('✅ Health check recorded. Donor profile updated.');
        }catch(e){showToast('❌ '+e.message,5000);}
      },'Save Health Check');
  }

  /* Flag thalassemia */
  function openFlagThalModal() {
    openModal('🧬 Flag Thalassemia Carrier',
      `<label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Patient/Donor_Recepient Email *</label>
       <input type="email" id="thalUserEmail" placeholder="Enter email address" style="${IS}">
       <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-top:12px;margin-bottom:4px;">Carrier Status</label>
       <select id="thalStatus" style="${IS}"><option value="1">Yes — Carrier</option><option value="0">No — Not Carrier</option></select>
       <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:10px;margin-top:12px;font-size:.8rem;">⚠️ Genetic counseling is recommended for all confirmed carriers.</div>`,
      async () => {
        const email=document.getElementById('thalUserEmail')?.value.trim();
        if(!email){showToast('⚠️ User email required.');return;}
        const isCarrier=parseInt(document.getElementById('thalStatus')?.value||1);
        try{await apiFetch('flag_thalassemia','POST',{user_email:email,is_carrier:isCarrier});showToast('✅ Thalassemia carrier flagged. Counseling referral logged.');loadThalassemia();}
        catch(e){showToast('❌ '+e.message,5000);}
      },'Flag Carrier');
  }

  /* Wire action cards */
  const ACTION_MAP = {
    enterCulture:    ()=>openModal('📝 Enter Culture Test',`<p>Select a bag from the Pending Tests table to enter a result.</p><button onclick="navigateGlobal('tests')" style="margin-top:12px;background:linear-gradient(135deg,#C0162C,#8B0020);color:#fff;border:none;padding:9px 18px;border-radius:40px;cursor:pointer;font-family:Outfit,sans-serif;font-size:.84rem;font-weight:600;">Go to Pending Tests</button>`,null,'Close'),
    viewQuarantine:  ()=>navigateTo('quarantine'),
    recordAntibody:  openRecordAntibodyModal,
    preDonationCheck:openHealthCheckModal,
    flagThalassemia: openFlagThalModal,
    monitorColdChain:()=>navigateTo('coldchain'),
  };
  document.querySelectorAll('.action-card[data-action]').forEach(card=>{
    const a=card.getAttribute('data-action');
    card.addEventListener('click',()=>ACTION_MAP[a]?ACTION_MAP[a]():showToast('🔧 Coming soon!'));
  });

  /* Nav button links */
  on('viewAllPendingLink',  'click', (e)=>{e.preventDefault();navigateTo('tests');});
  on('viewAllQuarantineLink','click',(e)=>{e.preventDefault();navigateTo('quarantine');});
  on('viewAllColdChainBtn', 'click', ()=>navigateTo('coldchain'));
  window.navigateGlobal = sec => (window.navigateTo || navigateTo)(sec);

  /* ── INIT (disabled — second IIFE handles init) ── */
  /* function init() {
    initReveal();
    const saved = localStorage.getItem('bbLabPage');
    if (saved && document.querySelector(`.sidebar-link[data-section="${saved}"]`)) {
      navigateTo(saved);
    } else {
      loadDashboard();
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init(); */

})();

// ====== MERGED FROM KANIK ======
/* ============================================================
   BloodBridge — lab_technician_dash.js  (DATABASE-CONNECTED)
   API: lab_api.php
   Session: role='user' + sub_role='lab_technician'
            OR role='lab_technician'
   ============================================================ */
(function () {
  'use strict';

  const API = 'lab_api.php';

  /* ── THEME ── */
  const html = document.documentElement;
  function getTheme() { return localStorage.getItem('bb-theme') || 'dark'; }
  function setTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem('bb-theme', t); }
  setTheme(getTheme());
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));

  /* ── SESSION KEEPALIVE (ping every 4 minutes to prevent auto-logout) ── */
  setInterval(async () => {
    try { await fetch(`${API}?action=keepalive`, { method: 'GET' }); } catch (_) {}
  }, 4 * 60 * 1000);

  /* ── SIDEBAR ── */
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  function isMobile() { return window.innerWidth < 1024; }
  function openSidebar() { if(!sidebar)return; sidebar.classList.add('open'); if(isMobile()){if(sidebarOverlay)sidebarOverlay.classList.add('visible');document.body.style.overflow='hidden';} if(hamburger){hamburger.classList.add('open');hamburger.setAttribute('aria-expanded','true');} }
  function closeSidebar() { if(!sidebar)return; sidebar.classList.remove('open'); if(isMobile()){if(sidebarOverlay)sidebarOverlay.classList.remove('visible');document.body.style.overflow='';} if(hamburger){hamburger.classList.remove('open');hamburger.setAttribute('aria-expanded','false');} }
  if (hamburger) hamburger.addEventListener('click', (e) => { e.stopPropagation(); sidebar?.classList.contains('open') ? closeSidebar() : openSidebar(); });
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  window.addEventListener('resize', () => { isMobile() ? closeSidebar() : openSidebar(); });
  if (!isMobile()) openSidebar();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isMobile()) closeSidebar(); });

  /* ── NAVIGATION ── */
  const VIEW_MAP = {
    dashboard:   'dashboardView',
    tests:       'testsView',
    quarantine:  'quarantineView',
    antibody:    'antibodyView',
    coldchain:   'coldchainView',
    thalassemia: 'thalassemiaView',
    profile:     'profileView',
  };

  function navigateTo(sec) {
    Object.values(VIEW_MAP).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    const target = document.getElementById(VIEW_MAP[sec] || VIEW_MAP.dashboard);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));
    const al = document.querySelector(`.sidebar-link[data-section="${sec}"]`);
    if (al) al.classList.add('active');

    if (isMobile()) closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    initReveal();

    switch (sec) {
      case 'dashboard':   loadDashboard();   break;
      case 'tests':       loadTests(); setTimeout(()=>loadDonorTests(),150); break;
      case 'quarantine':  loadQuarantine();  break;
      case 'antibody':    loadAntibody();    break;
      case 'coldchain':   loadColdChain();   break;
      case 'thalassemia': loadThalassemia(); break;
      case 'profile':     loadProfile();     break;
    }
    localStorage.setItem('bbLabPage', sec);
  }
  window.navigateTo = navigateTo;

  /* ── UTILS ── */
  function on(id, ev, fn) { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); }
  function txt(id, v)     { const el = document.getElementById(id); if (el) el.textContent = (v == null) ? '—' : v; }
  function setVal(id, v)  { const el = document.getElementById(id); if (el) el.value = (v == null) ? '' : v; }
  function esc(s)         { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  window.esc = esc;
  function fmtDate(ds) {
    if (!ds) return '—';
    const d = new Date(ds);
    if (isNaN(d)) return ds;
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function timeAgo(ds) {
    if (!ds) return '';
    const s = Math.floor((Date.now() - new Date(ds)) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s/60) + ' min ago';
    if (s < 86400) return Math.floor(s/3600) + ' hr ago';
    return Math.floor(s/86400) + ' days ago';
  }
  function statusBadge(st) {
    const m = { quarantined:'badge-danger', discarded:'badge-danger', available:'badge-ok', normal:'badge-ok', alert:'badge-danger' };
    return `<span class="status-badge ${m[st]||'badge-warn'}">${esc(st||'—')}</span>`;
  }

  /* ── API FETCH ── */
  async function apiFetch(action, method, body) {
    method = method || 'GET';
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}?action=${action}`, opts);
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (_) {
      console.error('lab_api.php raw output:', raw.slice(0, 400));
      throw new Error('Server error (HTTP ' + res.status + '). Check browser console.');
    }
    if (!data.success && res.status === 401) throw new Error('AUTH_FAILED');
    if (!data.success) throw new Error(data.error || (data.errors || []).join(', ') || 'HTTP ' + res.status);
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
  window.showToast = showToast;

  /* ── COUNTER ANIMATION ── */
  function animCount(el, target, dur) {
    if (!el) return; dur = dur || 900; let s = null;
    const step = ts => { if (!s) s = ts; const p = Math.min((ts-s)/dur,1); el.textContent = Math.round((1-Math.pow(1-p,3))*target); if (p < 1) requestAnimationFrame(step); else el.textContent = target; };
    requestAnimationFrame(step);
  }

  /* ── REVEAL ── */
  function initReveal() {
    const els = document.querySelectorAll('.reveal:not(.visible)');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('visible')); return; }
    const obs = new IntersectionObserver(en => { en.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.06 });
    els.forEach(e => obs.observe(e));
  }

  /* ── MODAL ── */
  const modal    = document.getElementById('globalModal');
  const mTitle   = document.getElementById('modalTitle');
  const mBody    = document.getElementById('modalBody');
  const mConfirm = document.getElementById('modalConfirmBtn');
  const mCancel  = document.getElementById('modalCancelBtn');
  const mClose   = document.getElementById('closeModalBtn');
  let mAction = null;
  function openModal(title, content, onConfirm, label) {
    if (!modal) return;
    mTitle.textContent = title;
    mBody.innerHTML = content;
    if (mConfirm) mConfirm.textContent = label || 'Confirm';
    modal.style.display = 'flex'; mAction = onConfirm || null;
  }
  window.openModal = openModal;
  function closeModal() { if (modal) modal.style.display = 'none'; mAction = null; }
  if (mClose)   mClose.addEventListener('click', closeModal);
  if (mCancel)  mCancel.addEventListener('click', closeModal);
  if (mConfirm) mConfirm.addEventListener('click', () => { if (mAction) mAction(); closeModal(); });
  if (modal)    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.style.display === 'flex') closeModal(); });

  /* ── AUTH ERROR HANDLER ── */
  function handleErr(err) {
    if (err.message === 'AUTH_FAILED') {
      showToast('⚠️ Session expired. Redirecting to login...', 3000);
      setTimeout(() => window.location.href = 'login.html', 3000);
    } else {
      console.error('[LabDash]', err.message);
    }
  }

  const IS = 'background:var(--input-bg,rgba(255,255,255,.06));border:1px solid var(--input-border,rgba(255,255,255,.15));padding:8px 12px;border-radius:10px;width:100%;margin-top:6px;color:var(--text-primary,#f5f0ee);font-family:Outfit,sans-serif;font-size:.85rem;';

  /* ══════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════ */
  async function loadDashboard() {
    try {
      const data = await apiFetch('dashboard');
      const u = data.user, s = data.stats;

      /* Greeting & sidebar */
      txt('greetName',   u.full_name);
      txt('labSubtitle', u.blood_bank_name || 'BloodBridge Lab Network');
      txt('sidebarName', u.full_name);
      txt('sidebarRole', 'Lab Technician');
      const sa = document.getElementById('sidebarAvatar');
      if (sa) sa.textContent = u.full_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

      /* Stat cards */
      animCount(document.getElementById('pendingTests'),    s.pending_tests);
      animCount(document.getElementById('quarantinedBags'), s.quarantined_bags);
      animCount(document.getElementById('failedCultures'),  s.failed_cultures);
      animCount(document.getElementById('testsThisMonth'),  s.tests_this_month);

      /* Alert banner */
      const bannerText = document.getElementById('alertBannerText');
      if (bannerText) {
        if (s.bags_due_today > 0) {
          bannerText.textContent = `${s.bags_due_today} culture test result(s) are overdue — please process immediately.`;
        } else if (s.pending_tests > 0) {
          bannerText.textContent = `${s.pending_tests} blood bag(s) awaiting culture testing.`;
        } else {
          bannerText.textContent = 'All clear — no overdue tests at this time.';
        }
      }

      /* Critical alert */
      const critAlert = data.critical_alert;
      const critTitle = document.getElementById('criticalAlertTitle');
      const critMsg   = document.getElementById('criticalAlertMsg');
      const critBtn   = document.getElementById('handleCriticalBtn');
      if (critAlert) {
        if (critTitle) critTitle.textContent = `⚠️ Critical: Pathogen detected in Bag #${critAlert.bag_id}`;
        if (critMsg)   critMsg.textContent   = `Result: ${critAlert.result} — Pathogen: ${critAlert.pathogen_detected} (${fmtDate(critAlert.test_date)})`;
        if (critBtn)   { critBtn.style.display = ''; critBtn.onclick = () => navigateTo('quarantine'); }
      } else {
        if (critTitle) critTitle.textContent = '✅ No critical contamination alerts.';
        if (critMsg)   critMsg.textContent   = 'All recent culture tests are within acceptable limits.';
        if (critBtn)   critBtn.style.display = 'none';
      }

      /* Pending tests mini-table */
      const pendTable = document.getElementById('pendingTestsTable');
      const pendLabel = document.getElementById('pendingCountLabel');
      const pending   = data.recent_pending || [];
      if (pendLabel) pendLabel.textContent = s.pending_tests;
      const viewAllPend = document.getElementById('viewAllPendingLink');
      if (viewAllPend)  viewAllPend.textContent = `View all ${s.pending_tests} pending →`;
      if (pendTable) {
        pendTable.innerHTML = pending.length
          ? pending.map(t => `<tr>
              <td><strong>#${t.bag_id}</strong></td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(t.blood_group)}</span></td>
              <td>${fmtDate(t.test_date)}</td>
              <td style="color:${new Date(t.due_date)<Date.now()?'#f87171':'inherit'};">${fmtDate(t.due_date)}</td>
              <td><button class="table-btn" onclick="openCultureModal(${t.bag_id},'${esc(t.blood_group)}')">Enter Result</button></td>
            </tr>`).join('')
          : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">No pending tests.</td></tr>';
      }

      /* Quarantined mini-list */
      const quarItems = document.getElementById('quarantineListItems');
      const quarLabel = document.getElementById('quarantineCountLabel');
      const quarList  = data.quarantined_list || [];
      if (quarLabel) quarLabel.textContent = s.quarantined_bags;
      if (quarItems) {
        quarItems.innerHTML = quarList.length
          ? quarList.map(b => `<div class="alert-item alert-danger">
              <div class="alert-icon-wrap alert-icon-red">🚫</div>
              <div class="alert-body">
                <div class="alert-title">Bag #${b.bag_id} — ${esc(b.blood_group)}</div>
                <div class="alert-msg">${esc(b.quarantine_reason || 'No reason provided')}</div>
                <div class="alert-meta"><span class="alert-time">${timeAgo(b.created_at)}</span></div>
              </div>
              <button class="alert-action-btn" onclick="openDiscardModal(${b.bag_id})">Discard</button>
            </div>`).join('')
          : '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:.82rem;">No quarantined bags.</div>';
      }

      /* Cold chain preview */
      const ccGrid = document.querySelector('.coldchain-grid');
      const ccPreview = data.cold_chain_preview || [];
      if (ccGrid && ccPreview.length) {
        ccGrid.innerHTML = ccPreview.map(c => {
          const temp  = parseFloat(c.temperature_celsius);
          const alert = c.is_alert == 1;
          const cls   = alert ? 'badge-danger' : 'badge-ok';
          const lbl   = alert ? `Alert (${temp.toFixed(1)}°C)` : `Normal (${temp.toFixed(1)}°C)`;
          return `<div class="sensor-item">
            <span>${esc(c.sensor_id)}</span>
            <span style="font-weight:700;color:${alert?'#f87171':'#4ade80'};">${temp.toFixed(1)}°C</span>
            <span class="status-badge ${cls}">${lbl}</span>
          </div>`;
        }).join('');
      }

    } catch(err) {
      handleErr(err);
      if (err.message !== 'AUTH_FAILED') showToast('❌ Dashboard error: ' + err.message, 5000);
    }
    initReveal();
  }

  /* ══════════════════════════════════════════════
     PENDING / ALL TESTS PAGE
  ══════════════════════════════════════════════ */
  async function loadTests(statusFilter) {
    statusFilter = statusFilter || document.getElementById('testsFilterStatus')?.value || 'pending';
    const tbody  = document.getElementById('testsTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const data  = await apiFetch('tests&status=' + statusFilter);
      const tests = data.tests || [];
      if (tbody) {
        tbody.innerHTML = tests.length
          ? tests.map((t, i) => {
              const isPending = !t.result;
              const rColor = t.result === 'negative' || t.result === 'sterile' ? '#4ade80' : t.result ? '#f87171' : 'var(--text-muted)';
              return `<tr>
                <td>${i+1}</td>
                <td><strong>#${t.bag_id}</strong></td>
                <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(t.blood_group)}</span></td>
                <td>${fmtDate(t.test_date)}</td>
                <td style="color:${rColor};font-weight:600;">${t.result ? esc(t.result) : '⏳ Pending'}</td>
                <td>${esc(t.pathogen_detected || '—')}</td>
                <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(t.comments||'')}">${esc((t.comments||'').slice(0,40)) || '—'}</td>
                <td>${esc(t.technician_name || '—')}</td>
              </tr>`;
            }).join('')
          : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No tests found.</td></tr>';
      }
    } catch(err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }
  on('testsFilterStatus', 'change', () => { loadTests(); setTimeout(()=>loadDonorTests(),150); });
  on('refreshTestsPageBtn', 'click', () => { loadTests(); setTimeout(()=>loadDonorTests(),150); });
  on('refreshTestsBtn', 'click', () => loadDashboard());

  /* ══════════════════════════════════════════════
     DONOR ACCEPTANCES — pending lab verification
  ══════════════════════════════════════════════ */
  async function loadDonorTests(statusFilter) {
    statusFilter = statusFilter || document.getElementById('testsFilterStatus')?.value || 'pending';
    const container = document.getElementById('donorTestsBody');
    if (!container) return;
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</div>';
    try {
      const data  = await apiFetch('donor_tests&status=' + statusFilter);
      const tests = data.tests || [];
      if (!tests.length) {
        container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:.83rem;">✅ No donor acceptances found.</div>';
        return;
      }
      container.innerHTML =
        '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>#</th><th>DONOR</th><th>REQUEST ID</th><th>BLOOD BAG ID</th>' +
        '<th>TEST DATE</th><th>RESULT</th><th>PATHOGEN</th><th>COMMENTS</th><th>STATUS</th><th>ACTIONS</th>' +
        '</tr></thead><tbody>' +
        tests.map((t, i) => {
          const tid = t.test_id || t.id || 0;
          const isPending  = t.culture_status === 'pending';
          const isApproved = t.culture_status === 'approved';
          const isRejected = t.culture_status === 'rejected';
          const statusBg  = isApproved ? 'rgba(74,222,128,.15)'  : isRejected ? 'rgba(239,68,68,.12)'  : 'rgba(251,191,36,.12)';
          const statusCol = isApproved ? '#4ade80'               : isRejected ? '#f87171'              : '#fbbf24';
          const statusLabel = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';
          const resultCol = t.result === 'negative' || t.result === 'sterile' ? '#4ade80' : t.result ? '#f87171' : 'var(--text-muted)';
          return `<tr>
            <td>${i + 1}</td>
            <td>
              <strong style="font-size:.85rem;">${esc(t.donor_name || '—')}</strong>
              <br><span style="font-size:.7rem;color:var(--text-muted);">${esc(t.donor_email || '')}</span>
            </td>
            <td style="font-size:.82rem;"><strong>#REQ-${String(t.request_id || 0).padStart(4, '0')}</strong></td>
            <td style="font-size:.82rem;">${t.blood_bag_id ? '<strong>#' + t.blood_bag_id + '</strong>' : '<span style=\"color:var(--text-muted)\">—</span>'}</td>
            <td style="font-size:.78rem;">${fmtDate(t.test_date) || '<span style=\"color:var(--text-muted)\">—</span>'}</td>
            <td style="font-weight:600;color:${resultCol};">${t.result ? esc(t.result) : '<span style=\"color:var(--text-muted)\">⏳ Pending</span>'}</td>
            <td style="font-size:.78rem;">${esc(t.pathogen_detected || '—')}</td>
            <td style="font-size:.76rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(t.comments || '')}">${esc((t.comments || '').slice(0, 40) || '—')}</td>
            <td>
              <span style="padding:3px 10px;border-radius:50px;font-size:.68rem;font-weight:700;
                background:${statusBg};color:${statusCol};border:1px solid ${statusCol}40;">
                ${statusLabel}
              </span>
            </td>
            <td>
              ${isPending ? `<div style="display:flex;gap:6px;align-items:center;">
                <button data-tid="${tid}" class="kn-approve-btn"
                  style="display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:18px;
                    background:rgba(74,222,128,.15);border:1.5px solid rgba(74,222,128,.5);
                    color:#4ade80;font-size:.74rem;font-weight:700;cursor:pointer;white-space:nowrap;">
                  ✅ Approve
                </button>
                <button data-tid="${tid}" class="kn-reject-btn"
                  style="display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:18px;
                    background:rgba(239,68,68,.12);border:1.5px solid rgba(239,68,68,.4);
                    color:#f87171;font-size:.74rem;font-weight:700;cursor:pointer;white-space:nowrap;">
                  ✕ Reject
                </button>
              </div>` : `<span style="font-size:.72rem;color:var(--text-muted);">—</span>`}
            </td>
          </tr>`;
        }).join('') +
        '</tbody></table></div>';

      container.querySelectorAll('.kn-approve-btn').forEach(b =>
        b.addEventListener('click', () => approveDonorTest(Number(b.getAttribute('data-tid'))))
      );
      container.querySelectorAll('.kn-reject-btn').forEach(b =>
        b.addEventListener('click', () => rejectDonorTest(Number(b.getAttribute('data-tid'))))
      );
    } catch (err) {
      handleErr(err);
      if (container) container.innerHTML = `<div style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</div>`;
    }
  }

  function approveDonorTest(testId) {
    if (!testId && testId !== 0) { showToast('⚠️ Could not identify test. Please refresh.', 3000); return; }
    openModal('✅ Approve Donor Test',
      '<p style="font-size:.83rem;color:var(--text-muted);margin-bottom:12px;">Approving will create a blood bag and notify both the donor and requester.</p>'
      + '<label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Comments (optional)</label>'
      + '<textarea id="knApproveComment" rows="3" placeholder="e.g. Blood sample is clean." style="width:100%;padding:10px;border-radius:8px;background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--text-primary);font-size:.82rem;resize:vertical;font-family:inherit;box-sizing:border-box;"></textarea>',
      async () => {
        const comments = document.getElementById('knApproveComment')?.value.trim() || 'Approved by lab technician.';
        try {
          const res = await apiFetch('approve_donor_test', 'POST', { test_id: testId, comments });
          showToast('✅ ' + res.message);
          loadDonorTests();
          loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 4000); }
      }, 'Approve & Create Blood Bag');
  }

  function rejectDonorTest(testId) {
    if (!testId && testId !== 0) { showToast('⚠️ Could not identify test. Please refresh.', 3000); return; }
    openModal('❌ Reject Donor Test',
      '<p style="font-size:.83rem;color:var(--text-muted);margin-bottom:12px;">Please provide a reason for rejection.</p>'
      + '<textarea id="knRejectComment" rows="3" placeholder="e.g. Pathogen detected." style="width:100%;padding:10px;border-radius:8px;background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--text-primary);font-size:.82rem;resize:vertical;font-family:inherit;box-sizing:border-box;"></textarea>',
      async () => {
        const comments = document.getElementById('knRejectComment')?.value.trim() || 'Rejected by lab technician.';
        try {
          await apiFetch('reject_donor_test', 'POST', { test_id: testId, comments });
          showToast('🚫 Test rejected.');
          loadDonorTests();
          loadDashboard();
        } catch (e) { showToast('❌ ' + e.message, 4000); }
      }, 'Confirm Rejection');
  }

  /* ══════════════════════════════════════════════
     QUARANTINE PAGE
  ══════════════════════════════════════════════ */
  async function loadQuarantine() {
    const tbody = document.getElementById('quarantineTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const data = await apiFetch('quarantine');
      const bags = data.bags || [];
      if (tbody) {
        tbody.innerHTML = bags.length
          ? bags.map((b, i) => `<tr>
              <td>${i+1}</td>
              <td><strong>#${b.bag_id}</strong></td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(b.blood_group)}</span></td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(b.quarantine_reason||'')}">${esc(b.quarantine_reason || '—')}</td>
              <td>${statusBadge(b.status)}</td>
              <td>${fmtDate(b.created_at)}</td>
              <td>${b.expiry_date ? fmtDate(b.expiry_date) : '—'}</td>
            </tr>`).join('')
          : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No quarantined bags found.</td></tr>';
      }
    } catch(err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  /* ══════════════════════════════════════════════
     ANTIBODY PAGE
  ══════════════════════════════════════════════ */
  async function loadAntibody() {
    const tbody = document.getElementById('antibodyTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const data    = await apiFetch('antibody');
      const records = data.records || [];
      if (tbody) {
        tbody.innerHTML = records.length
          ? records.map((r, i) => `<tr>
              <td>${i+1}</td>
              <td>${esc(r.person_name || '—')}</td>
              <td><span class="status-badge ${r.is_donor ? 'badge-ok' : 'badge-blue'}">${r.is_donor ? 'Donor' : 'Recipient'}</span></td>
              <td><strong>${esc(r.antibody_name)}</strong></td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(r.recipient_bg || '—')}</span></td>
              <td>${fmtDate(r.detected_at)}</td>
            </tr>`).join('')
          : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No antibody records found.</td></tr>';
      }
    } catch(err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }

  /* ══════════════════════════════════════════════
     COLD CHAIN PAGE
  ══════════════════════════════════════════════ */
  async function loadColdChain() {
    const tbody = document.getElementById('coldchainTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const data = await apiFetch('coldchain');
      txt('ccTotal',  data.total);
      txt('ccAlerts', data.alerts);
      txt('ccBanks',  data.banks_affected);
      const logs = data.logs || [];
      if (tbody) {
        tbody.innerHTML = logs.length
          ? logs.map((l, i) => {
              const temp  = parseFloat(l.temperature_celsius);
              const alert = l.is_alert == 1;
              return `<tr>
                <td>${i+1}</td>
                <td>${esc(l.sensor_id)}</td>
                <td style="font-weight:700;color:${alert ? '#f87171' : '#4ade80'};">${temp.toFixed(1)}°C</td>
                <td>${fmtDate(l.recorded_at)}</td>
                <td>${alert ? '<span class="status-badge badge-danger">⚠️ Alert</span>' : '<span class="status-badge badge-ok">Normal</span>'}</td>
              </tr>`;
            }).join('')
          : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No temperature records found.</td></tr>';
      }
    } catch(err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }
  on('viewAllColdChainBtn', 'click', () => navigateTo('coldchain'));

  /* ══════════════════════════════════════════════
     THALASSEMIA PAGE
  ══════════════════════════════════════════════ */
  async function loadThalassemia() {
    const tbody = document.getElementById('thalassemiaTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try {
      const data     = await apiFetch('thalassemia');
      const carriers = data.carriers || [];
      if (tbody) {
        tbody.innerHTML = carriers.length
          ? carriers.map((c, i) => `<tr>
              <td>${i+1}</td>
              <td><strong>${esc(c.patient_name || '—')}</strong></td>
              <td>${esc(c.patient_email || '—')}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(c.blood_group || '—')}</span></td>
              <td>${esc(c.patient_phone || '—')}</td>
              <td>${Number(c.is_carrier) ? '<span class="status-badge badge-warn">✅ Carrier</span>' : '<span class="status-badge badge-ok">Not Carrier</span>'}</td>
              <td>${esc(c.confirmed_by_name || '—')}</td>
              <td>${fmtDate(c.confirmed_at)}</td>
              <td>
                <button class="btn-row-action" onclick="openEditThalModal('${esc(c.patient_email)}',${c.is_carrier})" title="Edit">✏️</button>
                <button class="btn-row-action" onclick="deleteThalRecord(${c.id})" title="Delete">🗑️</button>
              </td>
            </tr>`).join('')
          : '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">No carrier records found.</td></tr>';
      }
    } catch(err) {
      handleErr(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="color:#f87171;padding:20px;text-align:center;">⚠️ ${esc(err.message)}</td></tr>`;
    }
  }
  window.loadThalassemia = loadThalassemia;

  /* ══════════════════════════════════════════════
     PROFILE PAGE
  ══════════════════════════════════════════════ */
  async function loadProfile() {
    try {
      const data = await apiFetch('profile');
      const p    = data.profile;
      const initials = p.full_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const ava = document.getElementById('profAvatar');
      if (ava) ava.textContent = initials;
      txt('profNameDisplay', p.full_name);
      txt('profRoleDisplay',  'Lab Technician');
      txt('profIdDisplay',    'ID: USR-' + String(p.id).padStart(4,'0'));
      setVal('profId',        'USR-' + String(p.id).padStart(4,'0'));
      setVal('profSince',     fmtDate(p.created_at));
      setVal('profFullName',  p.full_name);
      setVal('profEmail',     p.email);
      setVal('profPhone',     p.phone || '');
      setVal('profBankName',  p.blood_bank_name || '—');
      txt('sidebarName', p.full_name);
      const sa = document.getElementById('sidebarAvatar');
      if (sa) sa.textContent = initials;
    } catch(err) {
      handleErr(err);
      showToast('❌ Profile load failed: ' + err.message, 5000);
    }
  }

  /* Profile edit / save */
  const PROF_FIELDS = ['profFullName','profEmail','profPhone'];
  let pOrig = {};
  function enableProfEdit()  {
    PROF_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });
    const eb = document.getElementById('editProfBtn');   if (eb) eb.style.display = 'none';
    const sb = document.getElementById('saveProfBtn');   if (sb) sb.style.display = '';
    const cb = document.getElementById('cancelProfBtn'); if (cb) cb.style.display = '';
    const fa = document.getElementById('profFormActions'); if (fa) fa.style.display = 'flex';
  }
  function disableProfEdit() {
    PROF_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
    const eb = document.getElementById('editProfBtn');   if (eb) eb.style.display = '';
    const sb = document.getElementById('saveProfBtn');   if (sb) sb.style.display = 'none';
    const cb = document.getElementById('cancelProfBtn'); if (cb) cb.style.display = 'none';
    const fa = document.getElementById('profFormActions'); if (fa) fa.style.display = 'none';
  }
  function saveOrigProf()    { PROF_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) pOrig[id] = el.value; }); }
  function restoreOrigProf() { PROF_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) el.value = pOrig[id] || ''; }); }
  async function saveProfile() {
    const fn = document.getElementById('profFullName')?.value.trim();
    const em = document.getElementById('profEmail')?.value.trim();
    const ph = document.getElementById('profPhone')?.value.trim();
    if (!fn || fn.length < 2) { showToast('⚠️ Name required.', 4000); return; }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showToast('⚠️ Valid email required.', 4000); return; }
    try {
      await apiFetch('update_profile', 'POST', { full_name: fn, email: em, phone: ph });
      disableProfEdit(); showToast('✅ Profile updated!');
      txt('profNameDisplay', fn); txt('sidebarName', fn);
      const ava = document.getElementById('profAvatar'); if (ava) ava.textContent = fn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const sa  = document.getElementById('sidebarAvatar'); if (sa) sa.textContent = fn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    } catch(e) { showToast('❌ ' + e.message, 5000); }
  }
  on('editProfBtn',    'click', () => { saveOrigProf(); enableProfEdit(); });
  on('cancelProfBtn',  'click', () => { restoreOrigProf(); disableProfEdit(); });
  on('cancelProfBtn2', 'click', () => { restoreOrigProf(); disableProfEdit(); });
  on('saveProfBtn',    'click', saveProfile);
  const pf = document.getElementById('profileForm');
  if (pf) pf.addEventListener('submit', e => { e.preventDefault(); saveProfile(); });

  /* ══════════════════════════════════════════════
     ACTION MODALS
  ══════════════════════════════════════════════ */

  /* Enter Culture Test Result */
  window.openCultureModal = function(bagId, bloodGroup) {
    openModal(`🧫 Enter Culture Result — Bag #${bagId} (${esc(bloodGroup)})`,
      `<div style="display:grid;gap:14px;">
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Result *</label>
          <select id="cultureResult" style="${IS}">
            <option value="">Select result...</option>
            <option value="negative">Negative (Clean)</option>
            <option value="sterile">Sterile</option>
            <option value="positive">Positive (Contaminated)</option>
            <option value="inconclusive">Inconclusive</option>
          </select>
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Pathogen Detected (if any)</label>
          <input type="text" id="culturePathogen" placeholder="e.g. E. coli, Staphylococcus..." style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Comments</label>
          <textarea id="cultureComments" rows="2" placeholder="Additional notes..." style="${IS}resize:vertical;"></textarea>
        </div>
        <div style="font-size:.75rem;color:var(--text-muted);background:rgba(192,22,44,.06);padding:8px 12px;border-radius:8px;">
          ⚠️ If result is Positive and pathogen is detected, bag will be automatically quarantined.
        </div>
      </div>`,
      async () => {
        const result   = document.getElementById('cultureResult')?.value;
        const pathogen = document.getElementById('culturePathogen')?.value.trim();
        const comments = document.getElementById('cultureComments')?.value.trim();
        if (!result) { showToast('⚠️ Please select a result.'); return; }
        try {
          const res = await apiFetch('submit_culture', 'POST', { bag_id: bagId, result, pathogen_detected: pathogen, comments });
          showToast(res.quarantined ? `🚫 Result saved — Bag #${bagId} quarantined!` : `✅ ${res.message}`);
          loadDashboard();
        } catch(e) { showToast('❌ ' + e.message, 5000); }
      }, 'Submit Result');
  };

  /* Discard Bag */
  window.openDiscardModal = function(bagId) {
    openModal(`🗑️ Discard Bag #${bagId}`,
      `<p>Are you sure you want to permanently discard Bag <strong>#${bagId}</strong>?</p>
       <div style="margin-top:12px;padding:10px 14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;font-size:.82rem;">
         ⚠️ This action cannot be undone. The bag will be marked as discarded.
       </div>`,
      async () => {
        try {
          const res = await apiFetch('discard_bag', 'POST', { bag_id: bagId });
          showToast(res.message);
          loadDashboard();
          if (document.getElementById('quarantineView')?.classList.contains('active')) loadQuarantine();
        } catch(e) { showToast('❌ ' + e.message, 5000); }
      }, 'Discard Bag');
  };

  /* Record Antibody */
  function openAntibodyModal() {
    openModal('🛡️ Record Antibody Test',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="grid-column:1/-1;">
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">User ID *</label>
          <input type="number" id="abUserId" placeholder="Enter user ID..." style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Antibody Name *</label>
          <input type="text" id="abName" placeholder="e.g. Anti-D, Anti-K..." style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Person Type</label>
          <select id="abIsDonor" style="${IS}">
            <option value="1">Donor</option>
            <option value="0">Recipient</option>
          </select>
        </div>
      </div>`,
      async () => {
        const userId = parseInt(document.getElementById('abUserId')?.value || 0);
        const name   = document.getElementById('abName')?.value.trim();
        const isDonor= parseInt(document.getElementById('abIsDonor')?.value || 1);
        if (!userId) { showToast('⚠️ User ID required.'); return; }
        if (!name)   { showToast('⚠️ Antibody name required.'); return; }
        try {
          await apiFetch('submit_antibody', 'POST', { user_id: userId, antibody_name: name, is_donor: isDonor });
          showToast('✅ Antibody record saved.');
          if (document.getElementById('antibodyView')?.classList.contains('active')) loadAntibody();
        } catch(e) { showToast('❌ ' + e.message, 5000); }
      }, 'Save Record');
  }

  /* Health Check */
  function openHealthCheckModal() {
    openModal('🩺 Record Pre-Donation Health Check',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="grid-column:1/-1;">
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Donor User ID *</label>
          <input type="number" id="hcDonorId" placeholder="Enter donor user ID..." style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Haemoglobin (g/dL)</label>
          <input type="number" step="0.1" id="hcHaemo" placeholder="e.g. 13.5" style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Weight (kg)</label>
          <input type="number" step="0.1" id="hcWeight" placeholder="e.g. 65" style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Blood Pressure Systolic</label>
          <input type="number" id="hcBpSys" placeholder="e.g. 120" style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Blood Pressure Diastolic</label>
          <input type="number" id="hcBpDia" placeholder="e.g. 80" style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Pulse (bpm)</label>
          <input type="number" id="hcPulse" placeholder="e.g. 72" style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Temperature (°C)</label>
          <input type="number" step="0.1" id="hcTemp" placeholder="e.g. 37.0" style="${IS}">
        </div>
        <div style="grid-column:1/-1;">
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Notes</label>
          <textarea id="hcNotes" rows="2" placeholder="Any additional notes..." style="${IS}resize:vertical;"></textarea>
        </div>
      </div>`,
      async () => {
        const donorId = parseInt(document.getElementById('hcDonorId')?.value || 0);
        if (!donorId) { showToast('⚠️ Donor user ID required.'); return; }
        try {
          await apiFetch('health_check', 'POST', {
            donor_user_id:      donorId,
            haemoglobin:        parseFloat(document.getElementById('hcHaemo')?.value || 0),
            weight_kg:          parseFloat(document.getElementById('hcWeight')?.value || 0),
            blood_pressure_sys: parseInt(document.getElementById('hcBpSys')?.value || 0),
            blood_pressure_dia: parseInt(document.getElementById('hcBpDia')?.value || 0),
            pulse:              parseInt(document.getElementById('hcPulse')?.value || 0),
            temperature:        parseFloat(document.getElementById('hcTemp')?.value || 0),
            notes:              document.getElementById('hcNotes')?.value.trim() || '',
          });
          showToast('✅ Health check recorded successfully.');
        } catch(e) { showToast('❌ ' + e.message, 5000); }
      }, 'Save Health Check');
  }

  /* Flag Thalassemia */
  function openFlagThalassemiaModal() {
    openModal('🧬 Flag Thalassemia Carrier',
      `<div style="display:grid;gap:14px;">
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Patient/Donor_Recepient Email *</label>
          <input type="email" id="thUserEmail" placeholder="Enter email address..." style="${IS}">
        </div>
        <div>
          <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Status</label>
          <select id="thIsCarrier" style="${IS}">
            <option value="1">Is Carrier</option>
            <option value="0">Not a Carrier</option>
          </select>
        </div>
      </div>`,
      async () => {
        const email     = document.getElementById('thUserEmail')?.value.trim();
        const isCarrier = parseInt(document.getElementById('thIsCarrier')?.value || 1);
        if (!email) { showToast('⚠️ User email required.'); return; }
        try {
          await apiFetch('flag_thalassemia', 'POST', { user_email: email, is_carrier: isCarrier });
          showToast('✅ Thalassemia status updated.');
          if (document.getElementById('thalassemiaView')?.classList.contains('active')) loadThalassemia();
        } catch(e) { showToast('❌ ' + e.message, 5000); }
      }, 'Save');
  }

  /* ── Wire action cards (dashboard) ── */
  const ACTION_MAP = {
    enterCulture:     () => openModal('🧫 Enter Culture Result', '<p>Select a bag from the Pending Tests table, or navigate to <strong>Pending Tests</strong> page.</p>', () => navigateTo('tests'), 'Go to Tests'),
    viewQuarantine:   () => navigateTo('quarantine'),
    recordAntibody:   openAntibodyModal,
    preDonationCheck: openHealthCheckModal,
    flagThalassemia:  openFlagThalassemiaModal,
    monitorColdChain: () => navigateTo('coldchain'),
  };
  document.querySelectorAll('.action-card[data-action]').forEach(card => {
    const a = card.getAttribute('data-action');
    card.addEventListener('click', () => ACTION_MAP[a] ? ACTION_MAP[a]() : showToast('🔧 Feature coming soon!'));
  });

  /* Flag thalassemia button in thalassemia view */
  on('flagNewThalBtn', 'click', openFlagThalassemiaModal);

  /* Quick nav links from dashboard */
  on('viewAllPendingLink',    'click', e => { e.preventDefault(); navigateTo('tests'); });
  on('viewAllQuarantineLink', 'click', e => { e.preventDefault(); navigateTo('quarantine'); });

  /* ── Sidebar navigation clicks ── */
  document.querySelectorAll('.sidebar-link[data-section]').forEach(l => {
    l.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(l.getAttribute('data-section'));
    });
  });

  /* Logout */
  on('logoutBtn', 'click', () => { window.location.href = 'login.html'; });

  /* ── INIT ── */
  function init() {
    initReveal();
    const saved = localStorage.getItem('bbLabPage');
    if (saved && document.querySelector(`.sidebar-link[data-section="${saved}"]`)) {
      navigateTo(saved);
    } else {
      navigateTo('dashboard');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();

/* ── GLOBAL THALASSEMIA ACTIONS ── */
const _API = 'lab_api.php';
window.openEditThalModal = function(email, currentStatus) {
  const IS = 'width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:Outfit,sans-serif;font-size:.85rem;outline:none;box-sizing:border-box;';
  openModal('✏️ Edit Thalassemia Record',
    `<label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Patient Email</label>
     <input type="email" id="editThalEmail" value="${esc(email)}" readonly style="${IS}opacity:.65;">
     <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-top:12px;margin-bottom:4px;">Carrier Status</label>
     <select id="editThalStatus" style="${IS}">
       <option value="1" ${Number(currentStatus)?'selected':''}>Yes — Carrier</option>
       <option value="0" ${Number(currentStatus)?'':'selected'}>No — Not Carrier</option>
     </select>
     <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:10px;margin-top:12px;font-size:.8rem;">⚠️ Changing the status will automatically re-evaluate the couple alert if a partner is linked.</div>`,
    async () => {
      const e = document.getElementById('editThalEmail')?.value.trim();
      const s = parseInt(document.getElementById('editThalStatus')?.value||1);
      if (!e) { window.showToast?.('⚠️ Email required.'); return; }
      try {
        const res = await fetch(`${_API}?action=flag_thalassemia`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({user_email:e,is_carrier:s}) });
        const d = await res.json();
        if (!d.success) throw new Error(d.error||'Update failed');
        window.showToast?.('✅ Thalassemia record updated.');
        if (window.loadThalassemia) window.loadThalassemia();
        else { const tb = document.getElementById('thalassemiaTableBody'); if (tb) tb.innerHTML='<tr><td colspan="9"><span style="color:var(--text-muted);">Refresh to see changes.</span></td></tr>'; }
      } catch(err) { window.showToast?.('❌ '+err.message, 5000); }
    }, 'Update');
};

window.deleteThalRecord = function(id) {
  if (!confirm('🗑️ Delete this thalassemia record? This action cannot be undone.')) return;
  (async () => {
    try {
      const res = await fetch(`${_API}?action=delete_thalassemia`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({carrier_id:id}) });
      const d = await res.json();
      if (!d.success) throw new Error(d.error||'Delete failed');
      window.showToast?.('✅ Record deleted.');
      if (window.loadThalassemia) window.loadThalassemia();
      else { const tb = document.getElementById('thalassemiaTableBody'); if (tb) tb.innerHTML='<tr><td colspan="9"><span style="color:var(--text-muted);">Refresh to see changes.</span></td></tr>'; }
    } catch(err) { window.showToast?.('❌ '+err.message, 5000); }
  })();
};

window.exportThalassemiaPDF = async function() {
  try {
    const res = await fetch(`${_API}?action=thalassemia`);
    const d = await res.json();
    if (!d.success) throw new Error(d.error||'Failed to load records');
    const rows = d.carriers||[];
    const w = window.open('','_blank');
    if (!w) { window.showToast?.('⚠️ Please allow pop-ups.', 3000); return; }
    const isCarrier = rows.filter(r=>Number(r.is_carrier)).length;
    const nonCarrier = rows.length - isCarrier;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Thalassemia Carrier Records</title>
<style>
  @page { margin:15mm 12mm; size:A4 landscape; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; padding:20px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  h1 { font-size:20px; margin-bottom:4px; display:flex; align-items:center; gap:10px; }
  h1 img { width:32px; height:32px; }
  .sub { color:#666; font-size:13px; margin-bottom:18px; }
  .summary { display:flex; gap:16px; margin-bottom:18px; flex-wrap:wrap; }
  .summary div { background:#f5f5f5; padding:8px 16px; border-radius:8px; font-size:13px; }
  .summary strong { font-size:18px; display:block; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#C0162C; color:#fff; padding:8px 6px; text-align:left; font-weight:600; text-transform:uppercase; letter-spacing:.03em; font-size:11px; }
  td { padding:6px; border-bottom:1px solid #e0e0e0; }
  tr:nth-child(even) td { background:#fafafa; }
  .badge-yes { display:inline-block; background:#fef3cd; color:#856404; padding:2px 8px; border-radius:50px; font-size:11px; font-weight:600; }
  .badge-no { display:inline-block; background:#d4edda; color:#155724; padding:2px 8px; border-radius:50px; font-size:11px; font-weight:600; }
  .footer { margin-top:20px; font-size:11px; color:#999; text-align:center; border-top:1px solid #e0e0e0; padding-top:12px; }
  .no-print { text-align:center; margin-bottom:16px; }
  .no-print button { background:#C0162C; color:#fff; border:none; padding:8px 20px; border-radius:40px; font-size:13px; font-weight:600; cursor:pointer; }
  @media print { .no-print { display:none; } }
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ Save / Print PDF</button></div>
<h1>🧬 Thalassemia Carrier Records</h1>
<div class="sub">Blood Bridge — Lab Technician Report &mdash; Generated ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
<div class="summary">
  <div><strong>${rows.length}</strong> Total Records</div>
  <div><strong>${isCarrier}</strong> Carriers</div>
  <div><strong>${nonCarrier}</strong> Non-Carriers</div>
</div>
<table>
<thead><tr><th>#</th><th>Patient/Donor</th><th>Email</th><th>Blood Group</th><th>Phone</th><th>Status</th><th>Confirmed By</th><th>Confirmed At</th></tr></thead>
<tbody>
${rows.map((r,i)=>`<tr>
  <td>${i+1}</td>
  <td>${esc(r.patient_name||'—')}</td>
  <td>${esc(r.patient_email||'—')}</td>
  <td>${esc(r.blood_group||'—')}</td>
  <td>${esc(r.patient_phone||'—')}</td>
  <td>${Number(r.is_carrier)?'<span class="badge-yes">Carrier</span>':'<span class="badge-no">Not Carrier</span>'}</td>
  <td>${esc(r.confirmed_by_name||'—')}</td>
  <td>${r.confirmed_at?new Date(r.confirmed_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</td>
</tr>`).join('')}
</tbody></table>
<div class="footer">Blood Bridge &mdash; Thalassemia Carrier Records &mdash; Confidential</div>
</body></html>`);
    w.document.close();
  } catch(err) { window.showToast?.('❌ '+err.message, 5000); }
};