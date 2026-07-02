/* ============================================================
   BloodBridge — donor_recipient_dash.js (UNIFIED v2 - FIXED)
   Robust error handling, visible loading/error states
   ============================================================ */
(function () {
  'use strict';
  const API = 'donor_recipient_api.php';

  /* ── DEBUG LOGGING ── */
  const DEBUG = location.search.includes('debug=1');
  function debugLog(...args) {
    console.log('[BloodBridge]', ...args);
    if (DEBUG) {
      let panel = document.getElementById('bbDebugPanel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'bbDebugPanel';
        panel.className = 'debug-panel show';
        document.body.appendChild(panel);
      }
      const entry = document.createElement('div');
      entry.textContent = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      panel.appendChild(entry);
      while (panel.children.length > 100) panel.removeChild(panel.firstChild);
    }
  }
  window.onerror = (msg, src, line, col, err) => {
    debugLog('JS ERROR:', msg, 'at', src + ':' + line);
    showToast('❌ JavaScript error: ' + msg, 6000);
  };

  /* ── THEME ── */
  const html = document.documentElement;
  const THEME_KEY = 'bb-theme';
  function applyTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); const sc=document.getElementById('settingsThemeCheck'); if(sc)sc.checked=(t==='dark'); }
  function getTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; }
  applyTheme(getTheme());
  const ttEl = document.getElementById('themeToggle');
  if(ttEl){
    ttEl.addEventListener('click', () => applyTheme(getTheme()==='dark'?'light':'dark'));
    ttEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();applyTheme(getTheme()==='dark'?'light':'dark');}});
  }
  const stCheck=document.getElementById('settingsThemeCheck');
  if(stCheck)stCheck.addEventListener('change',()=>{applyTheme(stCheck.checked?'dark':'light');});

  /* ── SIDEBAR ── */
  const sidebar=document.getElementById('sidebar');
  const hamburger=document.getElementById('hamburger');
  const sidebarClose=document.getElementById('sidebarClose');
  const sidebarOverlay=document.getElementById('sidebarOverlay');
  function isMobile(){return window.innerWidth<1024;}
  function openSidebar(){if(!sidebar)return;sidebar.classList.add('open');if(isMobile()){if(sidebarOverlay)sidebarOverlay.classList.add('visible');document.body.style.overflow='hidden';}if(hamburger){hamburger.classList.add('open');hamburger.setAttribute('aria-expanded','true');}}
  function closeSidebar(){if(!sidebar)return;sidebar.classList.remove('open');if(isMobile()){if(sidebarOverlay)sidebarOverlay.classList.remove('visible');document.body.style.overflow='';}if(hamburger){hamburger.classList.remove('open');hamburger.setAttribute('aria-expanded','false');}}
  if(hamburger)hamburger.addEventListener('click',(e)=>{e.stopPropagation();sidebar?.classList.contains('open')?closeSidebar():openSidebar();});
  if(sidebarClose)sidebarClose.addEventListener('click',closeSidebar);
  if(sidebarOverlay)sidebarOverlay.addEventListener('click',closeSidebar);
  window.addEventListener('resize',()=>{isMobile()?closeSidebar():openSidebar();});
  if(!isMobile())openSidebar();
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&isMobile())closeSidebar();});

  /* ── NAVIGATION ── */
  const VIEW_MAP={
    dashboard:'dashboardView', donations:'donationsView', myRequests:'myRequestsView',
    health:'healthView', emergency:'emergencyView',
    delivery:'deliveryView', approvals:'approvalsView', badges:'badgesView',
    newborn:'newbornView', ratings:'ratingsView', profile:'profileView',
    settings:'settingsView', help:'helpView',
  };
  function navigateTo(sec){
    debugLog('Navigating to:', sec);
    /* Always restore scroll — guards against stuck overflow:hidden */
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    // Stop drone sim when leaving delivery view
    if(sec!=='delivery'){stopDroneSimulation();}
    Object.values(VIEW_MAP).forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
    const target=document.getElementById(VIEW_MAP[sec]||VIEW_MAP.dashboard);
    if(target)target.classList.add('active');
    document.querySelectorAll('.sidebar-link[data-section]').forEach(l=>l.classList.remove('active'));
    const al=document.querySelector(`.sidebar-link[data-section="${sec}"]`);
    if(al)al.classList.add('active');
    if(isMobile())closeSidebar();
    window.scrollTo({top:0,behavior:'smooth'});
    initReveal();
    /* Refresh warning banner on every section switch */
    loadAdminWarnings();
    switch(sec){
      case 'dashboard':loadDashboard();break;
      case 'donations':loadDonations();break;
      case 'myRequests':loadMyRequests();break;
      case 'health':loadHealth();break;
      case 'emergency':loadEmergency();break;
      case 'delivery':loadDelivery();break;
      case 'approvals':loadApprovals();break;
      case 'badges':loadBadges();break;
      case 'profile':loadProfile();break;
      case 'ratings':loadRatingsPage();break;
    }
    localStorage.setItem('bbDrPage', sec);
  }
  document.querySelectorAll('.sidebar-link[data-section]').forEach(l=>l.addEventListener('click',(e)=>{e.preventDefault();navigateTo(l.getAttribute('data-section'));}));
  document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',(e)=>{e.preventDefault();navigateTo(el.getAttribute('data-nav'));}));

  /* ── UTILS ── */
  function on(id,ev,fn){const el=document.getElementById(id);if(el)el.addEventListener(ev,fn);}
  function txt(id,val){const el=document.getElementById(id);if(el)el.textContent=(val==null||val==='')?'—':val;}
  function val(id,v){const el=document.getElementById(id);if(el)el.value=(v==null)?'':v;}
  function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function fmtDate(ds,shortMonth){
    if(!ds)return'—';const d=new Date(ds);if(isNaN(d))return ds;
    const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    return shortMonth?`${m} ${d.getDate()}`:`${m} ${d.getDate()}, ${d.getFullYear()}`;
  }
  function timeAgo(ds){
    if(!ds)return'';const s=Math.floor((Date.now()-new Date(ds))/1000);
    if(s<60)return`${s}s ago`;if(s<3600)return`${Math.floor(s/60)} min ago`;if(s<86400)return`${Math.floor(s/3600)} hr ago`;
    return`${Math.floor(s/86400)} days ago`;
  }
  function todayISO(){return new Date().toISOString().slice(0,10);}
  function statusBadge(st){
    const map={pending:'badge-warn',approved:'badge-ok',in_transit:'badge-blue',completed:'badge-ok',rejected:'badge-danger',cancelled:'badge-danger',delivered:'badge-ok'};
    return`<span class="status-badge ${map[st]||'badge-warn'}">${esc((st||'unknown').replace(/_/g,' '))}</span>`;
  }

  async function apiFetch(action,method,body){
    method=method||'GET';
    const opts={method,headers:{'Content-Type':'application/json'}};
    if(body)opts.body=JSON.stringify(body);
    const url=`${API}?action=${action}`;
    debugLog('API Request:', method, url, body||'');
    let res;
    try{res=await fetch(url,opts);}catch(netErr){debugLog('Network error:',netErr);throw new Error('Network error — check connection.');}
    let data;
    try{data=await res.json();}catch(jsonErr){debugLog('JSON parse error:',jsonErr,'Status:',res.status);throw new Error(`Server error (HTTP ${res.status}) — invalid response.`);}
    debugLog('API Response:', data);
    if(!data.success&&res.status===401)throw new Error('AUTH_FAILED');
    if(!data.success)throw new Error(data.error||data.errors?.join(', ')||`HTTP ${res.status}`);
    return data;
  }

  /* ── TOAST ── */
  function showToast(msg,dur){
    dur=dur||3500;
    let t=document.getElementById('toastMessage');
    if(!t){t=document.createElement('div');t.id='toastMessage';t.className='toast-message';document.body.appendChild(t);}
    t.textContent=msg;t.classList.add('show');clearTimeout(t._t);
    t._t=setTimeout(()=>t.classList.remove('show'),dur);
  }

  /* ── REVEAL ── */
  function initReveal(){
    const els=document.querySelectorAll('.reveal:not(.visible)');
    if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('visible'));return;}
    const obs=new IntersectionObserver(entries=>{entries.forEach(en=>{if(en.isIntersecting){en.target.classList.add('visible');obs.unobserve(en.target);}});},{threshold:0.06,rootMargin:'0px 0px -40px 0px'});
    els.forEach(e=>obs.observe(e));
  }

  /* ── COUNTER ── */
  function animCount(el,target,dur){
    if(!el)return;dur=dur||900;let s=null;
    const step=(ts)=>{if(!s)s=ts;const p=Math.min((ts-s)/dur,1);el.textContent=Math.floor((1-Math.pow(1-p,3))*target);if(p<1)requestAnimationFrame(step);else el.textContent=target;};
    requestAnimationFrame(step);
  }

  /* ── MODAL ── */
  const modal=document.getElementById('globalModal');
  const mTitle=document.getElementById('modalTitle');
  const mBody=document.getElementById('modalBody');
  const mConfirm=document.getElementById('modalConfirmBtn');
  const mCancel=document.getElementById('modalCancelBtn');
  const mClose=document.getElementById('closeModalBtn');
  let mAction=null;
  function openModal(title,content,onConfirm,confirmLabel){
    if(!modal)return;
    mTitle.innerHTML=title;mBody.innerHTML=content;
    if(onConfirm){
      if(mConfirm){mConfirm.style.display='';mConfirm.textContent=confirmLabel||'Proceed';}
    }else{
      if(mConfirm)mConfirm.style.display='none';
    }
    modal.style.display='flex';mAction=onConfirm||null;
  }
  function closeModal(){if(modal)modal.style.display='none';mAction=null;}
  window.closeModal = closeModal;
  if(mClose)mClose.addEventListener('click',closeModal);
  if(mCancel)mCancel.addEventListener('click',closeModal);
  if(mConfirm)mConfirm.addEventListener('click', async () => {
    if(mAction) await mAction();
    /* Only close if mAction didn't already close it (e.g. partial fulfillment keeps modal open) */
    if(modal && modal.style.display !== 'none') closeModal();
  });
  if(modal)modal.addEventListener('click',(e)=>{if(e.target===modal)closeModal();});
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&modal?.style.display==='flex')closeModal();});

  /* ── Error handler ── */
  function handleErr(err){
    debugLog('Error:', err.message);
    if(err.message==='AUTH_FAILED'){
      showToast('⚠️ Session expired. Redirecting to login…',3000);
      setTimeout(()=>window.location.href='login.html',3000);
    } else {
      showToast('❌ ' + err.message, 5000);
    }
  }

  /* ── Loading / Error helpers ── */
  function setLoading(id,msg){
    const el=document.getElementById(id);
    if(el)el.innerHTML=`<div class="loading-state"><div class="loader-spin"></div>${msg||'Loading...'}</div>`;
  }
  function setError(id,msg,retryFn){
    const el=document.getElementById(id);
    if(el)el.innerHTML=`<div class="error-state"><div class="error-state-icon">⚠️</div><div class="error-state-title">Failed to load</div><div class="error-state-msg">${esc(msg)}</div>${retryFn?`<button class="btn-retry" onclick="(${retryFn.toString()})()">🔄 Retry</button>`:''}</div>`;
  }

  const IS='background:var(--input-bg,#1a0a0d);border:1px solid var(--input-border,rgba(192,22,44,.3));padding:8px 12px;border-radius:10px;width:100%;margin-top:6px;color:var(--text-primary,#fff);font-family:Outfit,sans-serif;color-scheme:dark light;';

  /* ── Refresh Button Helper ──────────────────────────────────
     Injects a floating 🔄 Refresh button into a view container.
     Clicking it calls the provided loadFn.
     Safe to call multiple times — replaces existing button.
  ──────────────────────────────────────────────────────────── */
  function injectRefreshBtn(viewId, loadFn, label, pos) {
    const view = document.getElementById(viewId);
    if (!view) return;
    const BTN_ID = 'rfBtn_' + viewId;
    let btn = document.getElementById(BTN_ID);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = BTN_ID;
      const topVal   = (pos && pos.top   !== undefined) ? pos.top   : '18px';
      const bottomVal= (pos && pos.bottom !== undefined) ? pos.bottom : 'auto';
      const rightVal = (pos && pos.right !== undefined) ? pos.right : '20px';
      btn.style.cssText = [
        'position:absolute',
        'top:'+topVal, 'bottom:'+bottomVal, 'right:'+rightVal, 'z-index:10',
        'padding:6px 14px', 'border-radius:20px',
        'background:rgba(96,165,250,.12)',
        'border:1px solid rgba(96,165,250,.3)',
        'color:#60a5fa', 'font-size:.74rem', 'font-weight:700',
        'cursor:pointer', 'font-family:Outfit,sans-serif',
        'display:flex', 'align-items:center', 'gap:5px',
        'transition:background .2s,opacity .2s'
      ].join(';');
      btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' + (label || 'Refresh');
      /* Make the view relatively positioned so absolute works */
      if (getComputedStyle(view).position === 'static') {
        view.style.position = 'relative';
      }
      view.appendChild(btn);
    }
    btn.onclick = async () => {
      btn.innerHTML = 'Refreshing…';
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
      try { await loadFn(); } catch(_) {}
      btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' + (label || 'Refresh');
      btn.style.opacity = '1';
      btn.style.pointerEvents = '';
    };
  }

  let _lastDashboardData = null;

  /* ── Thalassemia Punnett Grid / Risk Strip renderers ── */
  function renderPunnettGrid(scenario, myName, pName){
    const e=esc, mn=e(myName), pn=e(pName);
    switch(scenario){
      case 'both':
        return `<div class="thal-punnett-grid" style="grid-template-columns:auto 1fr 1fr">
          <div class="pg-empty"></div>
          <div class="pg-label-top"><span class="pg-allele">B</span> <span class="pg-person">${pn}</span></div>
          <div class="pg-label-top"><span class="pg-allele">b</span> <span class="pg-person">${pn}</span></div>
          <div class="pg-label-left"><span class="pg-allele">A</span> <span class="pg-person">${mn}</span></div>
          <div class="pg-cell pg-cell-healthy" data-outcome="Healthy"><div class="pg-geno">AB</div><div class="pg-pct">25%</div><div class="pg-label">Healthy</div></div>
          <div class="pg-cell pg-cell-carrier" data-outcome="Carrier"><div class="pg-geno">Ab</div><div class="pg-pct">25%</div><div class="pg-label">Carrier</div></div>
          <div class="pg-label-left"><span class="pg-allele">a</span> <span class="pg-person">${mn}</span></div>
          <div class="pg-cell pg-cell-carrier" data-outcome="Carrier"><div class="pg-geno">aB</div><div class="pg-pct">25%</div><div class="pg-label">Carrier</div></div>
          <div class="pg-cell pg-cell-affected" data-outcome="Major"><div class="pg-geno">ab</div><div class="pg-pct">25%</div><div class="pg-label">Affected</div></div>
        </div>`;
      case 'you_carrier':
        return `<div class="thal-punnett-grid" style="grid-template-columns:auto 1fr">
          <div class="pg-empty"></div>
          <div class="pg-label-top"><span class="pg-allele">B</span> <span class="pg-person">${pn}</span></div>
          <div class="pg-label-left"><span class="pg-allele">A</span> <span class="pg-person">${mn}</span></div>
          <div class="pg-cell pg-cell-healthy" data-outcome="Healthy"><div class="pg-geno">AB</div><div class="pg-pct">50%</div><div class="pg-label">Healthy</div></div>
          <div class="pg-label-left"><span class="pg-allele">a</span> <span class="pg-person">${mn}</span></div>
          <div class="pg-cell pg-cell-carrier" data-outcome="Carrier"><div class="pg-geno">aB</div><div class="pg-pct">50%</div><div class="pg-label">Carrier</div></div>
        </div>`;
      case 'partner_carrier':
        return `<div class="thal-punnett-grid" style="grid-template-columns:auto 1fr 1fr">
          <div class="pg-empty"></div>
          <div class="pg-label-top"><span class="pg-allele">B</span> <span class="pg-person">${pn}</span></div>
          <div class="pg-label-top"><span class="pg-allele">b</span> <span class="pg-person">${pn}</span></div>
          <div class="pg-label-left"><span class="pg-allele">A</span> <span class="pg-person">${mn}</span></div>
          <div class="pg-cell pg-cell-healthy" data-outcome="Healthy"><div class="pg-geno">AB</div><div class="pg-pct">50%</div><div class="pg-label">Healthy</div></div>
          <div class="pg-cell pg-cell-carrier" data-outcome="Carrier"><div class="pg-geno">Ab</div><div class="pg-pct">50%</div><div class="pg-label">Carrier</div></div>
        </div>`;
      case 'neither':
        return `<div class="thal-punnett-grid" style="grid-template-columns:auto 1fr">
          <div class="pg-empty"></div>
          <div class="pg-label-top"><span class="pg-allele">B</span> <span class="pg-person">${pn}</span></div>
          <div class="pg-label-left"><span class="pg-allele">A</span> <span class="pg-person">${mn}</span></div>
          <div class="pg-cell pg-cell-healthy" data-outcome="Healthy"><div class="pg-geno">AB</div><div class="pg-pct">100%</div><div class="pg-label">Healthy</div></div>
        </div>`;
      default: return '';
    }
  }
  function renderRiskStrip(scenario){
    switch(scenario){
      case 'both':
        return '<div class="trs-item trs-ok"><span class="trs-dot"></span><span class="trs-label">Healthy</span><span class="trs-pct">25%</span></div><div class="trs-item trs-warn"><span class="trs-dot"></span><span class="trs-label">Carrier</span><span class="trs-pct">50%</span></div><div class="trs-item trs-danger"><span class="trs-dot"></span><span class="trs-label">Thalassemia Major</span><span class="trs-pct">25%</span></div>';
      case 'you_carrier':
      case 'partner_carrier':
        return '<div class="trs-item trs-ok"><span class="trs-dot"></span><span class="trs-label">Healthy</span><span class="trs-pct">50%</span></div><div class="trs-item trs-warn"><span class="trs-dot"></span><span class="trs-label">Carrier</span><span class="trs-pct">50%</span></div>';
      case 'neither':
        return '<div class="trs-item trs-ok"><span class="trs-dot"></span><span class="trs-label">Healthy</span><span class="trs-pct">100%</span></div>';
      default: return '';
    }
  }

  /* ══════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════ */
  async function loadDashboard(){
    debugLog('loadDashboard() started');
    const container = document.getElementById('dashboardView');
    /* Dashboard has no refresh button — navigation re-loads it automatically */
    try{
      const data=await apiFetch('dashboard');
      _lastDashboardData = data;
      debugLog('Dashboard data received');
      const u=data.user;
      const total=data.total_donations;
      const trust=data.trust_score;

      txt('greetName',u.full_name);
      txt('userIdSpan',u.display_id);
      txt('memberSinceSpan',u.member_since);
      txt('nextEligibleSpan',u.next_eligible||'Contact your blood bank');
      txt('navTrustScore',trust);

      // Cooldown timer
      if (data.cooldown) {
        startCooldownWidget(data.cooldown);
      }

      animCount(document.getElementById('statTotalDonations'),total);
      animCount(document.getElementById('statTrustScore'),trust);
      txt('statBloodGroup',u.blood_group);
      animCount(document.getElementById('statActiveRequests'),data.active_requests);
      animCount(document.getElementById('statLivesSaved'),data.lives_saved);

      txt('sidebarName',u.full_name);
      txt('sidebarRole',`Donor & Recipient · ${u.blood_group}`);
      const sa=document.getElementById('sidebarAvatar');
      if(sa&&!sa.querySelector('img'))sa.textContent=u.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

      // Health alert
      const alertBox=document.getElementById('dashHealthAlert');
      if(alertBox){if(data.hb_alert){alertBox.style.display='';txt('dashAlertTitle',`Haemoglobin: ${data.hb_alert.level} g/dL — attention needed`);txt('dashAlertMsg',data.hb_alert.message);}else{alertBox.style.display='none';}}

      // Thalassemia card — shows for ALL carrier status combinations
      const thalAlert=document.getElementById('dashThalassemiaAlert');
      if(thalAlert){
        thalAlert.style.display='';
        const myName=data.user?.full_name||'You';
        const pName=data.thal_partner_name||'Partner';
        const uCarrier=data.thal_user_carrier||'unknown';
        const pCarrier=data.thal_partner_carrier||'unknown';
        const hasPartner=!!data.thal_partner_name;
        const punnett=document.getElementById('thalPunnettWrap');
        const badge=document.getElementById('thalRiskBadge');
        const msgEl=document.getElementById('dashThalassemiaMsg');
        const gridEl=document.getElementById('thalPunnettGrid');
        const stripEl=document.getElementById('thalRiskStrip');

        let scenario='unknown';
        if(hasPartner && uCarrier==='carrier' && pCarrier==='carrier') scenario='both';
        else if(hasPartner && uCarrier==='carrier' && pCarrier==='non_carrier') scenario='you_carrier';
        else if(hasPartner && uCarrier==='non_carrier' && pCarrier==='carrier') scenario='partner_carrier';
        else if(hasPartner && uCarrier==='non_carrier' && pCarrier==='non_carrier') scenario='neither';

        if(scenario==='both'){
          txt('dashThalassemiaTitle','Thalassemia Couple Alert');
          txt('dashThalSubtitle', myName + ' & ' + pName + ' — both carriers');
          if(msgEl) msgEl.textContent='When both parents are thalassemia carriers, each pregnancy has the following genetic outcomes:';
          if(badge){badge.textContent='25% Risk';badge.style.display='';}
          if(gridEl) gridEl.innerHTML=renderPunnettGrid('both',myName,pName);
          if(stripEl) stripEl.innerHTML=renderRiskStrip('both');
          if(punnett) punnett.style.display='';
        }else if(scenario==='you_carrier'){
          txt('dashThalassemiaTitle','Thalassemia Carrier Detected');
          txt('dashThalSubtitle', 'You are a carrier — ' + pName + ' is not');
          if(msgEl) msgEl.textContent='Since only one partner carries the trait, each child has a 50% chance of being a carrier and 50% chance of being unaffected:';
          if(badge) badge.style.display='none';
          if(gridEl) gridEl.innerHTML=renderPunnettGrid('you_carrier',myName,pName);
          if(stripEl) stripEl.innerHTML=renderRiskStrip('you_carrier');
          if(punnett) punnett.style.display='';
        }else if(scenario==='partner_carrier'){
          txt('dashThalassemiaTitle','Partner is a Thalassemia Carrier');
          txt('dashThalSubtitle', pName + ' is a carrier — you are not');
          if(msgEl) msgEl.textContent='Since only one partner carries the trait, each child has a 50% chance of being a carrier and 50% chance of being unaffected:';
          if(badge) badge.style.display='none';
          if(gridEl) gridEl.innerHTML=renderPunnettGrid('partner_carrier',myName,pName);
          if(stripEl) stripEl.innerHTML=renderRiskStrip('partner_carrier');
          if(punnett) punnett.style.display='';
        }else if(scenario==='neither'){
          txt('dashThalassemiaTitle','No Thalassemia Carriers');
          txt('dashThalSubtitle', 'Neither you nor ' + pName + ' carry the thalassemia trait');
          if(msgEl) msgEl.textContent='With no carriers, there is a 100% chance your children will not carry the thalassemia trait:';
          if(badge) badge.style.display='none';
          if(gridEl) gridEl.innerHTML=renderPunnettGrid('neither',myName,pName);
          if(stripEl) stripEl.innerHTML=renderRiskStrip('neither');
          if(punnett) punnett.style.display='';
        }else{
          txt('dashThalassemiaTitle','Thalassemia Carrier Status');
          txt('dashThalSubtitle', uCarrier==='carrier' ? 'You are a confirmed carrier' : uCarrier==='non_carrier' ? 'You are not a carrier' : 'No screening data yet — visit a lab');
          if(msgEl) msgEl.textContent=hasPartner ? 'Both partners need thalassemia screening results to generate a couple alert. Visit a lab for testing.' : 'Visit a certified lab for thalassemia carrier screening and then link a partner for couple assessment.';
          if(badge) badge.style.display='none';
          if(gridEl) gridEl.innerHTML='';
          if(stripEl) stripEl.innerHTML='';
          if(punnett) punnett.style.display='none';
        }
      }

      // Delivery alert
      const delivAlert=document.getElementById('dashDeliveryAlert');
      const dl=data.active_delivery;
      if(dl&&delivAlert){
        delivAlert.style.display='';
        const etaTxt=dl.estimated_arrival?fmtDate(dl.estimated_arrival):'in progress';
        document.getElementById('deliveryETA').textContent=`expected delivery by ${etaTxt}`;
        txt('deliveryAlertMsg',`Your approved ${dl.blood_group} unit is en route from ${dl.source_bank_name||'Blood Bank'}. Drone: ${dl.drone_code||'--'}`);
      }else if(delivAlert){delivAlert.style.display='none';}

      // Emergency alert
      const emergAlert=document.getElementById('dashEmergencyAlert');
      const emergReqs=data.emergency_requests||[];
      if(emergAlert){
        if(emergReqs.length){
          emergAlert.style.display='';
          const titleEl=document.getElementById('dashEmergAlertTitle');
          if(titleEl)titleEl.textContent=`🚨 ${emergReqs.length} Active Emergency Request${emergReqs.length>1?'s':''}`;
          const msgEl=document.getElementById('dashEmergAlertMsg');
          if(msgEl)msgEl.innerHTML=emergReqs.map(r=>`<strong>${esc(r.blood_group)}</strong> — requested by ${esc(r.extracted_name||r.requester_name||'someone')} from ${esc(r.extracted_location||'unknown location')}`).join('<br>');
        }else{
          emergAlert.style.display='none';
        }
      }

      // Recent donations
      const donBody=document.getElementById('dashDonationsBody');
      if(donBody){donBody.innerHTML=data.recent_donations.length?data.recent_donations.map(r=>{const s=r.status||'pending';const bc=s==='fulfilled'?'badge-ok':s==='pending'?'badge-urgent':s==='cancelled'?'badge-danger':'badge-scheduled';const bl=s==='fulfilled'?'Completed':s==='pending'?'Promised':s==='cancelled'?'Cancelled':'Broken';return`<tr><td>${fmtDate(r.donation_date)}</td><td>${esc(r.blood_bank_name||'—')}</td><td>1</td><td><span class="status-badge ${bc}">${bl}</span></td></tr>`;}).join(''):'<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">No donations yet.</td></tr>';}

      // Recent requests
      const reqBody=document.getElementById('dashRequestsBody');
      if(reqBody){reqBody.innerHTML=data.recent_requests.length?data.recent_requests.map(r=>`<tr><td><strong>#REQ-${String(r.id).padStart(4,'0')}</strong></td><td>${fmtDate(r.requested_at)}</td><td>${r.units_required} unit${r.units_required>1?'s':''}</td><td>${statusBadge(r.status)}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">No requests yet.</td></tr>';}

      // Approval queue
      const approvalList=document.getElementById('dashApprovalList');
      if(approvalList){approvalList.innerHTML=data.pending_approvals.length?data.pending_approvals.map(p=>`<div class="alert-item"><div class="alert-icon-wrap alert-icon-orange">🕒</div><div class="alert-body"><div class="alert-title">Request #REQ-${String(p.id).padStart(4,'0')}</div><div class="alert-msg">Awaiting approval — <strong>${p.units_required} unit${p.units_required>1?'s':''} ${esc(p.blood_group)}</strong></div><div class="alert-meta"><span class="alert-time">${timeAgo(p.requested_at)}</span><span class="alert-tag tag-warning">${(p.urgency||'normal').toUpperCase()}</span></div></div><button class="alert-action-btn" onclick="navigateGlobal('approvals')">Check</button></div>`).join(''):'<div style="padding:14px;color:var(--text-muted);font-size:.82rem;text-align:center;">✅ No pending approvals.</div>';}

      // Drone preview (premium)
      const dronePrev=document.getElementById('dashDronePreview');
      if(dronePrev){
        if(dl){
          dronePrev.style.display='';
          txt('dronePreviewReqId','#REQ-'+String(dl.request_id).padStart(4,'0'));
          txt('dashDroneCode',dl.drone_code||'BB-DR');
          const pct=dl.status==='delivered'?100:dl.status==='en_route'?65:dl.status==='dispatched'?30:15;
          const pf=document.getElementById('droneProgressFill');
          if(pf)pf.style.width=pct+'%';
          const pctEl=document.getElementById('dashDronePct');
          if(pctEl)pctEl.textContent=pct+'%';
          txt('droneETA',dl.estimated_arrival?fmtDate(dl.estimated_arrival):'Calculating…');
          txt('dashDroneBattery',(dl.battery_level??'--')+'%');
          txt('dashDroneSpeed','42 km/h');
          // Update step connectors
          const activeIdx=dl.status==='delivered'?3:dl.status==='en_route'?1:dl.status==='dispatched'?1:0;
          const stepItems=document.querySelectorAll('#dashDroneSteps .dds-item');
          stepItems.forEach((s,i)=>{
            s.classList.remove('completed','active');
            if(i<activeIdx)s.classList.add('completed');
            else if(i===activeIdx)s.classList.add('active');
          });
          // Update connector fills
          [1,2,3].forEach(i=>{
            const conn=document.getElementById('ddsConnFill'+i);
            if(conn)conn.style.width=(i<=activeIdx?'100':'0')+'%';
          });
        }else{
          dronePrev.style.display='none';
        }
      }

      // Dashboard badges card — must match BADGES in loadBadges()
      const DASH_BADGES=[
        {icon:'🩸',earned:total>=1},
        {icon:'⭐',earned:total>=5},
        {icon:'🔟',earned:total>=10},
        {icon:'💎',earned:total>=20},
        {icon:'🏆',earned:total>=40},
      ];
      const earnedCount=DASH_BADGES.filter(b=>b.earned).length;
      txt('dashBdgSub',earnedCount+' badge'+(earnedCount!==1?'s':''));
      txt('dashBdgCount',earnedCount);
      const grid=document.getElementById('dashBadgesGrid');
      if(grid){
        grid.innerHTML=DASH_BADGES.map(b=>`<div class="dash-bdg-mini-item" style="background:${b.earned?'rgba(250,204,21,0.12)':'rgba(255,255,255,0.03)'};border-color:${b.earned?'rgba(250,204,21,0.25)':'rgba(255,255,255,0.06)'};opacity:${b.earned?'1':'0.35'};">${b.earned?b.icon:'🔒'}</div>`).join('');
      }
      // Milestone — align with badge milestones: 5, 10, 20, 40
      const ms=[5,10,20,40];
      const mstone=ms.find(m=>m>total);
      if(mstone){
        txt('dashMilestoneNote',`${mstone-total} more donation${mstone-total!==1?'s':''} to reach ${mstone}‑donation badge`);
      }else{
        txt('dashMilestoneNote','🎉 All badges unlocked!');
      }

      // Dashboard newborn predictor — bind once
      const nbBtn=document.getElementById('dashNbPredictBtn');
      if(nbBtn&&!nbBtn._nbBound){nbBtn._nbBound=true;nbBtn.addEventListener('click',predictNewbornBloodType);}

      // Footer
      txt('dashFooterNote',`❤️ Your ${total} donation${total!==1?'s have':' has'} saved up to ${data.lives_saved} lives. You also have ${data.active_requests} active request${data.active_requests!==1?'s':''}.`);

    }catch(err){
      handleErr(err);
      debugLog('Dashboard load failed:', err.message);
      if(err.message!=='AUTH_FAILED'){
        showToast('❌ Dashboard load failed: '+err.message, 5000);
        // Show visible error in dashboard content
        if(container){
          const greeting = container.querySelector('.greeting-section');
          if(greeting) greeting.style.display = 'none';
          const stats = container.querySelector('.stats-grid');
          if(stats) stats.style.display = 'none';
          const actions = container.querySelector('.actions-grid');
          if(actions) actions.style.display = 'none';
          const existingErr = container.querySelector('.dash-error-banner');
          if(!existingErr){
            const errDiv = document.createElement('div');
            errDiv.className = 'dash-error-banner error-state glass-card';
            errDiv.style = 'margin: 40px 28px; padding: 40px;';
            errDiv.innerHTML = `<div class="error-state-icon">⚠️</div><div class="error-state-title">Unable to load dashboard</div><div class="error-state-msg">${esc(err.message)}<br><br>Try refreshing the page or check your internet connection.</div><button class="btn-retry" onclick="window.location.reload()">🔄 Reload Page</button>`;
            container.insertBefore(errDiv, container.children[1]);
          }
        }
      }
    }
    initReveal();
    loadAdminWarnings();
  }
  window.navigateGlobal=(sec)=>navigateTo(sec);
  /* Refresh warnings every 60s so user sees new admin warnings without reload */
  setInterval(loadAdminWarnings, 60000);

  /* ══════════════════════════════════════════════
     DONATIONS
  ══════════════════════════════════════════════ */
  async function loadDonations(){
    injectRefreshBtn('donationsView', loadDonations, 'Refresh');
    setLoading('donationsTableBody','Loading donation history...');
    setLoading('pledgeContainer','Loading pledges...');
    try{
      const data=await apiFetch('donations');
      const list=data.donations||[];const total=list.length;
      txt('donMiniTotal',total);txt('donMiniLives',total*3);
      txt('donMiniLast',list[0]?fmtDate(list[0].donation_date,true):'—');
      let ne='—';
      if(list[0]&&list[0].donation_date){const d=new Date(list[0].donation_date);d.setDate(d.getDate()+56);ne=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getDate();}
      txt('donMiniNext',ne);
      const tbody=document.getElementById('donationsTableBody');
      if(tbody){tbody.innerHTML=list.length?list.map((r,i)=>{const s=r.status||'pending';const bc=s==='fulfilled'?'badge-ok':s==='pending'?'badge-urgent':s==='cancelled'?'badge-danger':'badge-scheduled';const bl=s==='fulfilled'?'Completed':s==='pending'?'Promised':s==='cancelled'?'Cancelled':'Broken';const ct=(s==='pending'&&r.confirmation_code)?'<br><span style="font-size:.65rem;color:var(--text-muted);">Code: '+esc(r.confirmation_code)+'</span>':'';return`<tr><td>${total-i}</td><td>${fmtDate(r.donation_date)}</td><td>${esc(r.blood_bank_name||'—')}</td><td>${esc(r.city||'—')}</td><td>1</td><td>Whole Blood</td><td><span class="status-badge ${bc}">${bl}</span>${ct}</td><td>${s==='fulfilled'?`<button class="btn-ghost-sm cert-btn" data-id="${r.id}">Download</button>`:'—'}</td></tr>`;}).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No donation records found.</td></tr>';tbody.querySelectorAll('.cert-btn').forEach(b=>b.addEventListener('click',()=>{window.open(API+'?action=certificate&id='+b.dataset.id,'_blank');}));}
      const pc=document.getElementById('pledgeContainer');
      if(pc){
        const promises=data.promises||[];
        window._donorPromises = {};
        promises.forEach(p => { window._donorPromises[p.id] = p; });
        pc.innerHTML=promises.length
          ? promises.map(p=>`
            <div class="pledge-card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;">
              <div class="pledge-date-badge">${fmtDate(p.donation_date,true)}</div>
              <div class="pledge-info" style="flex:1;min-width:140px;">
                <div class="pledge-title">Scheduled Donation</div>
                <div class="pledge-sub">${esc(p.blood_bank_name)} · Code: <strong>${esc(p.confirmation_code)}</strong></div>
              </div>
              <span class="status-badge badge-pending">Pending</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto;">
                <button onclick="rescheduleDonorPromise(${p.id})"
                  style="background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.35);color:#60a5fa;padding:5px 12px;border-radius:20px;font-size:.72rem;font-weight:600;cursor:pointer;">
                  📅 Reschedule
                </button>
                <button onclick="cancelDonorPromise(${p.id},'${esc(p.confirmation_code)}')"
                  style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);color:#f87171;padding:5px 12px;border-radius:20px;font-size:.72rem;font-weight:600;cursor:pointer;">
                  ✕ Cancel
                </button>
              </div>
            </div>`).join('')
          :`<p style="color:var(--text-muted);font-size:.84rem;">No upcoming pledges. Click <strong>+ Add Pledge</strong> to schedule one.</p>`;
      }
    }catch(err){handleErr(err);setError('donationsTableBody',err.message);}
  }

  /* ══════════════════════════════════════════════
     MY REQUESTS
  ══════════════════════════════════════════════ */
  async function loadMyRequests(statusFilter){
    statusFilter=statusFilter||'all';
    injectRefreshBtn('myRequestsView', ()=>loadMyRequests(statusFilter), 'Refresh');
    const tbody=document.getElementById('requestsTableBody');
    if(tbody)tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>';
    try{
      const data=await apiFetch('my_requests'+(statusFilter!=='all'?`&status=${statusFilter}`:''));
      const list=data.requests||[];
      if(tbody){tbody.innerHTML=list.length?list.map(r=>{
        let approverInfo='';
        if(r.status==='approved'){
          if(r.approved_by_user_name) approverInfo=`<br><span style="font-size:.65rem;color:var(--text-muted);">by ${esc(r.approved_by_user_name)}</span>`;
          else if(r.approved_by_bank_name) approverInfo=`<br><span style="font-size:.65rem;color:var(--text-muted);">by ${esc(r.approved_by_bank_name)}</span>`;
        }
        /* Payment type badge */
        const rtColor = r.request_type==='paid' ? '#fbbf24' : r.request_type==='open' ? '#60a5fa' : '#6b7280';
        const rtLabel = r.request_type==='paid' ? '💰 Paid' : r.request_type==='open' ? '🔓 Open' : '🆓 Free';
        const rtBadge = `<span style="padding:2px 8px;border-radius:50px;font-size:.65rem;font-weight:700;background:${rtColor}22;color:${rtColor};border:1px solid ${rtColor}44;">${rtLabel}</span>`;
        const priceNote = (r.request_type!=='free' && r.max_price_per_unit)
          ? `<br><span style="font-size:.62rem;color:var(--text-muted);">Max: ৳${parseFloat(r.max_price_per_unit).toFixed(0)}/unit</span>`
          : '';
        /* ── Action buttons matrix per request type & path ── */
        let actionHtml = `<button class="btn-ghost-sm" onclick="showReqTimeline(${r.id})">Timeline</button>`;
        const rType  = r.request_type || 'free';
        const rStat  = r.status || '';
        const pStat  = r.payment_status || 'not_required';
        const isDonorPath = !!r.approved_by_user_id;
        const isBankPath  = !!r.approved_by_bank_id;
        const isComplete  = rStat === 'completed';
        const isPaidGlob  = pStat === 'paid' || isComplete;
        if (rStat === 'approved' && !isComplete) {
          const showComplete = (rType === 'free' || rType === 'open');
          const showPay      = (rType === 'paid' || rType === 'open');
          if (showComplete) {
            actionHtml += `<button class="btn-ghost-sm" style="margin-left:4px;background:rgba(74,222,128,.12);color:#4ade80;border-color:rgba(74,222,128,.3);" onclick="completeDonationReq(${r.id})">✅ Complete</button>`;
          }
          if (showPay && !isPaidGlob) {
            const bagId = (r.accepted_donors && r.accepted_donors.length > 0) ? r.accepted_donors[0].bag_id : 0;
            actionHtml += `<button class="btn-ghost-sm" style="margin-left:4px;background:rgba(251,191,36,.12);color:#fbbf24;border-color:rgba(251,191,36,.3);" onclick="payDonorReq(${r.id},${bagId})">💰 Pay Now</button>`;
          } else if (showPay && isPaidGlob) {
            actionHtml += `<span style="margin-left:6px;font-size:.68rem;color:#4ade80;">✅ Paid</span>`;
          }
          if (isDonorPath) {
            const dBagId = (r.accepted_donors && r.accepted_donors.length > 0) ? r.accepted_donors[0].bag_id : 0;
            actionHtml += `<button class="btn-ghost-sm" style="margin-left:4px;background:rgba(239,68,68,.12);color:#f87171;border-color:rgba(239,68,68,.3);" onclick="donorNotComeReq(${r.id},${dBagId})">🚫 Didn't Come</button>`;
          }
        } else if (isComplete) {
          actionHtml += `<span style="margin-left:6px;font-size:.68rem;color:#4ade80;">✅ Request Fulfilled</span>`;
        }
        return`<tr>
          <td><strong>#REQ-${String(r.id).padStart(4,'0')}</strong></td>
          <td>${fmtDate(r.requested_at)}</td>
          <td>${esc(r.blood_group)}</td>
          <td>${r.units_required||'—'}</td>
          <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:${r.urgency==='urgent'||r.urgency==='emergency'?'rgba(239,68,68,.12)':'rgba(251,191,36,.12)'};color:${r.urgency==='urgent'||r.urgency==='emergency'?'#f87171':'#fbbf24'}">${(r.urgency||'normal').toUpperCase()}</span></td>
          <td>${rtBadge}${priceNote}</td>
          <td>${statusBadge(r.status)}${approverInfo}</td>
          <td>${actionHtml}</td>
        </tr>`;
      }).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No requests found.</td></tr>';}
    }catch(err){handleErr(err);if(tbody)tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:#f87171;padding:24px;">⚠️ ${esc(err.message)}</td></tr>`;}
  }

  window.showReqTimeline=async(reqId)=>{
    openModal(`📅 Timeline & Blood Bags - #REQ-${String(reqId).padStart(4,'0')}`,`<div style="padding:16px;text-align:center;color:var(--text-muted);"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</div>`,null,'Close');
    try{
      const [appData, bagData, reqData] = await Promise.all([
        apiFetch('approvals'),
        apiFetch('my_blood_bags&request_id='+reqId).catch(()=>({bags:[],bank_offers:[]})),
        apiFetch('my_requests').catch(()=>({requests:[]}))
      ]);

      const found      = appData.approvals.find(a=>a.request_id===reqId);
      const bags       = bagData.bags        || [];
      const bankOffers = bagData.bank_offers || [];
      const scMap      = {approved:'#4ade80',rejected:'#f87171',pending:'#fbbf24'};
      /* Use actual blood_request status + units progress */
      const reqRow       = (reqData.requests||[]).find(r=>r.id===reqId);
      const unitsRequired  = bagData.units_required  || reqRow?.units_required  || 1;
      const unitsFulfilled = bagData.units_fulfilled || reqRow?.units_fulfilled || 0;
      const unitsLeft      = Math.max(0, unitsRequired - unitsFulfilled);
      const isFullyFulfilled = (reqRow && reqRow.status === 'approved') ||
                               (found && found.request_status === 'approved') ||
                               (unitsFulfilled >= unitsRequired);

      /* Blood bags section */
      /* ── Shared progress bar — shown whenever units_required > 1 ──
         Appears above donor bags OR bank offers, whichever is present.
         Always visible so both bank-only and donor-only requests show progress. */
      const pct = Math.min(100, Math.round((unitsFulfilled / unitsRequired) * 100));
      const progressHtml = (unitsRequired > 1) ? `
        <div style="margin-bottom:12px;padding:10px 14px;border-radius:10px;background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.15);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:.76rem;font-weight:700;color:#4ade80;">Units Progress</span>
            <span style="font-size:.76rem;color:var(--text-muted);">${unitsFulfilled} of ${unitsRequired} collected${isFullyFulfilled?' ✅':' · '+unitsLeft+' more needed'}</span>
          </div>
          <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;">
            <div style="height:100%;border-radius:3px;width:${pct}%;background:${isFullyFulfilled?'#4ade80':'#60a5fa'};transition:width .4s;"></div>
          </div>
        </div>` : '';

      /* Matrix: request type + status determine post-acceptance buttons */
      const reqType    = bagData.request_type   || 'free';
      const payStat    = bagData.payment_status  || 'not_required';
      const reqStat    = bagData.status || reqRow?.status || '';
      const isComplete = reqStat === 'completed';
      const isPaidGlob = payStat === 'paid' || isComplete;

      let bagsHtml = '';
      if (bags.length) {
        bagsHtml = `
          <div style="margin-bottom:20px;">
            <div style="font-size:.72rem;font-weight:700;color:#4ade80;letter-spacing:.05em;margin-bottom:10px;text-transform:uppercase;">
              🩸 Available Blood Bags (${bags.length}) - Choose a donor
            </div>
            ${progressHtml}
            ${bags.map(b=>{
              const bagId = b.bag_id;
              const barcode = b.bag_barcode || '--';
              const donor = esc(b.donor_name||'Unknown donor');
              const bg = esc(b.blood_group||'--');
              const vol = b.volume_ml ? b.volume_ml+'ml' : '450ml';
              const exp = b.expiry_date ? fmtDate(b.expiry_date) : '--';
              const bagAlreadyUsed = (b.bag_status === 'used');
              const btnDisabled    = isFullyFulfilled || bagAlreadyUsed;
              const btnLabel       = isComplete || (isFullyFulfilled && bagAlreadyUsed)
                ? '✅ Accepted'
                : bagAlreadyUsed
                  ? '✅ Accepted'
                  : "✅ Accept this donor's blood";
              const cardBg = bagAlreadyUsed
                ? 'rgba(74,222,128,.04);border:1px solid rgba(74,222,128,.1)'
                : 'rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2)';
              /* ── Post-acceptance action buttons per matrix ── */
              let postBtns = '';
              if (bagAlreadyUsed && !isComplete) {
                const showComplete = (reqType === 'free' || reqType === 'open');
                const showPay      = (reqType === 'paid' || reqType === 'open');
                if (showComplete) {
                  postBtns += `<span class="post-action-btn complete" onclick="completeDonationReq(${reqId})" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:16px;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);color:#4ade80;font-size:.72rem;font-weight:700;font-family:Outfit,sans-serif;white-space:nowrap;">✅ Complete Donation</span> `;
                }
                if (showPay && !isPaidGlob) {
                  postBtns += `<span class="post-action-btn pay" onclick="payDonorReq(${reqId},${bagId})" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:16px;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.3);color:#fbbf24;font-size:.72rem;font-weight:700;font-family:Outfit,sans-serif;white-space:nowrap;">💰 Pay Now</span> `;
                } else if (showPay && isPaidGlob) {
                  postBtns += `<span style="display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:16px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);color:#4ade80;font-size:.72rem;font-weight:700;font-family:Outfit,sans-serif;white-space:nowrap;">✅ Paid</span> `;
                }
                /* Donor Didn't Come — always for donor bags */
                postBtns += `<span class="post-action-btn no-show" onclick="donorNotComeReq(${reqId},${bagId})" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:16px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#f87171;font-size:.72rem;font-weight:700;font-family:Outfit,sans-serif;white-space:nowrap;">🚫 Donor Didn't Come</span>`;
              } else if (isComplete) {
                postBtns = `<span style="display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:16px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);color:#4ade80;font-size:.72rem;font-weight:700;font-family:Outfit,sans-serif;white-space:nowrap;">✅ Request Fulfilled</span>`;
              }
              return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:${cardBg};margin-bottom:8px;flex-wrap:wrap;">
                <div style="flex:1;min-width:160px;">
                  <div style="font-weight:700;font-size:.86rem;color:var(--text-primary);">🧳 ${donor}${bagAlreadyUsed?' <span style="font-size:.68rem;color:#4ade80;font-weight:600;">· accepted</span>':''}</div>
                  <div style="font-size:.74rem;color:var(--text-muted);margin-top:3px;">
                    Barcode: <strong>${barcode}</strong> &nbsp;&bull;&nbsp;
                    Group: <strong style="color:#4ade80;">${bg}</strong> &nbsp;&bull;&nbsp;
                    Vol: ${vol} &nbsp;&bull;&nbsp; Expires: ${exp}
                    ${b.donor_price > 0
                      ? `&nbsp;&bull;&nbsp; <strong style="color:#fbbf24;">💰 ৳${parseFloat(b.donor_price).toFixed(0)}/unit</strong>`
                      : `&nbsp;&bull;&nbsp; <strong style="color:#4ade80;">🆓 Free donation</strong>`}
                  </div>
                </div>
                <button data-bag-id="${bagId}" data-req-id="${reqId}" class="accept-bag-btn"
                  ${btnDisabled ? 'disabled' : ''}
                  style="padding:8px 18px;border-radius:20px;background:${bagAlreadyUsed?'rgba(74,222,128,.08)':'rgba(74,222,128,.15)'};border:1.5px solid ${bagAlreadyUsed?'rgba(74,222,128,.2)':'rgba(74,222,128,.5)'};color:#4ade80;font-size:.78rem;font-weight:700;white-space:nowrap;font-family:Outfit,sans-serif;cursor:${btnDisabled?'default':'pointer'};opacity:${btnDisabled?'0.65':'1'};">
                  ${btnLabel}
                </button>
                ${postBtns ? `<div style="display:flex;gap:6px;width:100%;padding-left:14px;margin-top:-4px;flex-wrap:wrap;">${postBtns}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
          <div style="height:1px;background:var(--table-border);margin-bottom:16px;"></div>`;
      }

      /* ── Bank Offers section ── */
      let bankOffersHtml = '';
      if (bankOffers.length) {
        bankOffersHtml = `
          <div style="margin-bottom:20px;">
            <div style="font-size:.72rem;font-weight:700;color:#60a5fa;letter-spacing:.05em;margin-bottom:10px;text-transform:uppercase;">
              🏥 Blood Bank Offers (${bankOffers.length}) - Choose a bank
            </div>
            ${!bags.length ? progressHtml : ''}
            ${bankOffers.map(o => {
              const offerId   = o.offer_id;
              const bankName  = esc(o.bank_name || 'Unknown Bank');
              const bankCity  = esc(o.bank_city || '—');
              const bankRole  = o.bank_role === 'hospital' ? 'Hospital' : o.bank_role === 'medical_college' ? 'Medical College' : 'Blood Bank';
              const unitsAvail= o.units_available || 0;
              const offerStatus = o.offer_status; /* pending | approved | rejected */
              const offerNotes= esc(o.offer_notes || '');
              const offeredAt = fmtDate(o.offered_at);

              /* Button state */
              const isAccepted = offerStatus === 'approved';
              const isRejected = offerStatus === 'rejected';
              const btnDisabled = isFullyFulfilled || isAccepted || isRejected;
              const btnLabel = isAccepted ? '🎯 Selected'
                             : isRejected ? '✕ Not Selected'
                             : isFullyFulfilled ? '✅ Request Fulfilled'
                             : "✅ Accept this bank's offer";
              const cardBg = isAccepted
                ? 'rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.3)'
                : isRejected
                  ? 'rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.1)'
                  : 'rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.2)';
              const btnBg = isAccepted
                ? 'background:rgba(74,222,128,.08);border:1.5px solid rgba(74,222,128,.2);color:#4ade80'
                : isRejected
                  ? 'background:rgba(239,68,68,.06);border:1.5px solid rgba(239,68,68,.2);color:#f87171'
                  : 'background:rgba(96,165,250,.15);border:1.5px solid rgba(96,165,250,.5);color:#60a5fa';

              /* ── Post-acceptance buttons for bank offers (no Donor Didn't Come) ── */
              let bankPostBtns = '';
              if (isAccepted && !isComplete) {
                const showComplete = (reqType === 'free' || reqType === 'open');
                const showPay      = (reqType === 'paid' || reqType === 'open');
                if (showComplete) {
                  bankPostBtns += `<span class="post-action-btn complete" onclick="completeDonationReq(${reqId})" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:16px;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);color:#4ade80;font-size:.72rem;font-weight:700;font-family:Outfit,sans-serif;white-space:nowrap;">✅ Complete Donation</span> `;
                }
                if (showPay && !isPaidGlob) {
                  bankPostBtns += `<span class="post-action-btn pay" onclick="payDonorReq(${reqId},0)" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:16px;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.3);color:#fbbf24;font-size:.72rem;font-weight:700;font-family:Outfit,sans-serif;white-space:nowrap;">💰 Pay Now</span> `;
                } else if (showPay && isPaidGlob) {
                  bankPostBtns += `<span style="display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:16px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);color:#4ade80;font-size:.72rem;font-weight:700;font-family:Outfit,sans-serif;white-space:nowrap;">✅ Paid</span> `;
                }
              } else if (isComplete) {
                bankPostBtns = `<span style="display:inline-flex;align-items:center;gap:4px;padding:5px 14px;border-radius:16px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);color:#4ade80;font-size:.72rem;font-weight:700;font-family:Outfit,sans-serif;white-space:nowrap;">✅ Request Fulfilled</span>`;
              }
              return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:${cardBg};margin-bottom:8px;flex-wrap:wrap;">
                <div style="flex:1;min-width:160px;">
                  <div style="font-weight:700;font-size:.86rem;color:var(--text-primary);">
                    🏥 ${bankName}${isAccepted ? ' <span style="font-size:.68rem;color:#4ade80;">· selected</span>' : ''}
                  </div>
                  <div style="font-size:.74rem;color:var(--text-muted);margin-top:3px;">
                    ${bankRole} &nbsp;&bull;&nbsp; 📍 ${bankCity}
                    &nbsp;&bull;&nbsp; Stock: <strong style="color:${unitsAvail>0?'#4ade80':'#f87171'}">${unitsAvail} unit${unitsAvail!==1?'s':''}</strong>
                    &nbsp;&bull;&nbsp; Offered: ${offeredAt}
                    ${o.bank_price_per_unit > 0
                      ? `&nbsp;&bull;&nbsp; <strong style="color:#fbbf24;">💰 ৳${parseFloat(o.bank_price_per_unit).toFixed(0)}/unit</strong>`
                      : `&nbsp;&bull;&nbsp; <strong style="color:#4ade80;">🆓 Free</strong>`}
                  </div>
                  ${offerNotes ? `<div style="font-size:.72rem;color:var(--text-muted);margin-top:3px;font-style:italic;">"${offerNotes}"</div>` : ''}
                </div>
                <button data-offer-id="${offerId}" data-req-id="${reqId}" class="accept-offer-btn"
                  ${btnDisabled ? 'disabled' : ''}
                  style="padding:8px 18px;border-radius:20px;${btnBg};font-size:.78rem;font-weight:700;
                    white-space:nowrap;font-family:Outfit,sans-serif;
                    cursor:${btnDisabled?'default':'pointer'};opacity:${btnDisabled?'0.65':'1'};">
                  ${btnLabel}
                </button>
                ${bankPostBtns ? `<div style="display:flex;gap:6px;width:100%;padding-left:14px;margin-top:-4px;flex-wrap:wrap;">${bankPostBtns}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
          <div style="height:1px;background:var(--table-border);margin-bottom:16px;"></div>`;
      }

      /* Timeline section */
      let timelineHtml = '';
      if (found) {
        timelineHtml = `
          <div style="font-size:.72rem;font-weight:700;color:var(--text-muted);letter-spacing:.05em;margin-bottom:10px;text-transform:uppercase;">Request Timeline</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:.82rem;margin-bottom:12px;">
            <span>Blood Group: <strong>${esc(found.blood_group)}</strong></span>
            <span>Units: <strong>${unitsRequired}</strong>${unitsRequired > 1 ? ` <span style="font-size:.72rem;color:${isFullyFulfilled?'#4ade80':'#60a5fa'};">(${unitsFulfilled}/${unitsRequired} filled)</span>` : ''}</span>
            <span>Urgency: <strong>${esc(found.urgency||'normal')}</strong></span>
          </div>
          <div>
            <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--table-border);">
              <span>📝</span>
              <div style="flex:1;"><div style="font-weight:700;font-size:.84rem;">Request Submitted</div><div style="font-size:.74rem;color:var(--text-muted);">${fmtDate(found.requested_at)}</div></div>
              <span style="color:#4ade80;font-size:.74rem;font-weight:700;">Done</span>
            </div>
            ${(found.steps||[]).map(s=>`
              <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--table-border);">
                <span>${s.status==='approved'?'✅':s.status==='rejected'?'❌':'⏳'}</span>
                <div style="flex:1;">
                  <div style="font-weight:700;font-size:.84rem;">Step ${s.step_order}${s.approver?' - '+esc(s.approver):''}</div>
                  ${s.comments?`<div style="font-size:.74rem;color:var(--text-muted);">"${esc(s.comments)}"</div>`:''}
                  <div style="font-size:.74rem;color:var(--text-sub);">${fmtDate(s.created_at)}</div>
                </div>
                <span style="color:${scMap[s.status]||'#fbbf24'};font-size:.74rem;font-weight:700;">${esc(s.status||'Pending')}</span>
              </div>`).join('')}
            ${!(found.steps||[]).length?'<div style="padding:10px 0;font-size:.8rem;color:var(--text-muted);">No approval steps recorded yet.</div>':''}
          </div>`;
      } else {
        timelineHtml = '<p style="color:var(--text-muted);font-size:.83rem;">No timeline data found.</p>';
      }

      mBody.innerHTML = `<div style="max-height:65vh;overflow-y:auto;padding-right:4px;">${bagsHtml}${bankOffersHtml}${timelineHtml}</div>`;

      /* Attach accept bag button events */
      mBody.querySelectorAll('.accept-bag-btn').forEach(btn => {
        if (btn.disabled) return;
        btn.addEventListener('click', () => {
          const bagId = parseInt(btn.getAttribute('data-bag-id'));
          const rId   = parseInt(btn.getAttribute('data-req-id'));
          const donor = btn.closest('div[style]').querySelector('div[style*="font-weight:700"]')?.textContent?.replace('🧳 ','') || 'this donor';
          openModal('🩸 Confirm Blood Selection',
            `<div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25);border-radius:12px;padding:16px 18px;margin-bottom:14px;">
               <div style="font-weight:700;color:#4ade80;margin-bottom:6px;">✅ You are accepting blood from ${esc(donor)}</div>
               <div style="font-size:.82rem;color:var(--text-muted);line-height:1.6;" id="acceptBagModalDesc">
                 The donor will be notified that their blood was accepted.<br>
                 <span id="acceptBagUnitsNote"></span>
               </div>
             </div>`,
            async () => {
              try {
                const res = await apiFetch('accept_blood_bag','POST',{bag_id:bagId,request_id:rId});
                const nowFulfilled = res.units_fulfilled || 0;
                const nowRequired  = res.units_required  || 1;
                const nowLeft      = Math.max(0, nowRequired - nowFulfilled);
                const fullyDone    = res.fully_fulfilled || (nowFulfilled >= nowRequired);

                /* Mark this specific button as accepted */
                btn.textContent = '✅ Accepted';
                btn.disabled = true;
                btn.style.cursor = 'default';
                btn.style.opacity = '0.65';
                btn.style.background = 'rgba(74,222,128,.08)';
                btn.style.borderColor = 'rgba(74,222,128,.2)';

                if (fullyDone) {
                  /* All units collected — disable all remaining buttons */
                  document.querySelectorAll('.accept-bag-btn').forEach(b => {
                    if (b !== btn) { b.textContent = '✅ Request Fulfilled'; b.disabled = true; b.style.opacity = '0.45'; b.style.cursor = 'default'; }
                  });
                  showToast('🩸 ' + res.message, 5000);
                  /* Update progress bar to 100% */
                  const pBar = mBody.querySelector('.progress-fill') || mBody.querySelector('[style*="width:"]');
                  if (pBar) pBar.style.width = '100%';
                  const pText = mBody.querySelector('[style*="collected"]');
                  if (pText) pText.textContent = nowFulfilled + ' of ' + nowRequired + ' collected ✅';
                  closeModal();
                  loadMyRequests();
                } else {
                  /* Still need more units — keep modal open, update progress */
                  const newPct = Math.round((nowFulfilled / nowRequired) * 100);
                  const pBar = mBody.querySelector('div[style*="background:#60a5fa"], div[style*="background:#4ade80"]');
                  if (pBar) { pBar.style.width = newPct + '%'; }
                  const pText = mBody.querySelector('span[style*="collected"]');
                  if (pText) pText.textContent = nowFulfilled + ' of ' + nowRequired + ' collected · ' + nowLeft + ' more needed';
                  showToast('🩸 ' + res.message + ' Keep selecting donors.', 5000);
                }
                loadMyRequests();
              } catch(e) { showToast('❌ '+e.message,4000); }
            }, 'Yes, Accept This Blood'
          );
        });
      });

      /* ── Attach accept offer (bank) button events ── */
      mBody.querySelectorAll('.accept-offer-btn').forEach(btn => {
        if (btn.disabled) return;
        btn.addEventListener('click', () => {
          const offerId = parseInt(btn.getAttribute('data-offer-id'));
          const rId     = parseInt(btn.getAttribute('data-req-id'));
          const bankEl  = btn.closest('div[style]').querySelector('div[style*="font-weight:700"]');
          const bankName = bankEl ? bankEl.textContent.replace('🏥 ','').split('·')[0].trim() : 'this bank';
          openModal('🏥 Confirm Bank Selection',
            `<div style="background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.25);border-radius:12px;padding:16px 18px;margin-bottom:14px;">
               <div style="font-weight:700;color:#60a5fa;margin-bottom:6px;">🏥 You are accepting blood from ${esc(bankName)}</div>
               <div style="font-size:.82rem;color:var(--text-muted);line-height:1.6;">
                 The blood bank will be notified to prepare your blood.<br>
                 Other bank offers will be released when all units are filled.
               </div>
             </div>`,
            async () => {
              try {
                const res = await apiFetch('accept_bank_offer','POST',{offer_id:offerId, request_id:rId});
                const nowFulfilled = res.units_fulfilled || 0;
                const nowRequired  = res.units_required  || 1;
                const nowLeft      = Math.max(0, nowRequired - nowFulfilled);
                const fullyDone    = res.fully_fulfilled || (nowFulfilled >= nowRequired);

                /* Mark this button as selected */
                btn.textContent = '🎯 Selected';
                btn.disabled = true;
                btn.style.cursor = 'default';
                btn.style.opacity = '0.65';
                btn.style.background = 'rgba(74,222,128,.08)';
                btn.style.borderColor = 'rgba(74,222,128,.2)';
                btn.style.color = '#4ade80';

                if (fullyDone) {
                  document.querySelectorAll('.accept-offer-btn, .accept-bag-btn').forEach(b => {
                    if (b !== btn) {
                      b.textContent = '✅ Request Fulfilled';
                      b.disabled = true;
                      b.style.opacity = '0.35';
                      b.style.cursor = 'default';
                    }
                  });
                  showToast('🏥 ' + res.message, 5000);
                  closeModal();
                  loadMyRequests();
                } else {
                  showToast('🏥 ' + res.message + ' Keep selecting.', 5000);
                }
                loadMyRequests();
              } catch(e) { showToast('❌ '+e.message, 4000); }
            }, 'Yes, Accept This Bank'
          );
        });
      });

    }catch(e){mBody.innerHTML=`<p style="color:#f87171;">Could not load timeline: ${e.message}</p>`;}
  };

  /* ══════════════════════════════════════════════
     COMPLETE DONATION / PAY DONOR / DONOR DIDN'T COME
  ══════════════════════════════════════════════ */
  window.completeDonationReq = async function(requestId) {
    openModal('✅ Confirm Donation Complete',
      `<div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25);border-radius:12px;padding:16px 18px;margin-bottom:14px;">
         <div style="font-weight:700;color:#4ade80;margin-bottom:6px;">✅ Mark donation as completed</div>
         <div style="font-size:.82rem;color:var(--text-muted);line-height:1.6;">
           Confirm that the donation was completed successfully.<br>
           The donor will be notified and the request will be marked as fulfilled.
         </div>
       </div>`,
      async () => {
        try {
          const res = await apiFetch('complete_donation','POST',{request_id:requestId});
          showToast('✅ ' + res.message, 4000);
          closeModal();
          loadMyRequests();
        } catch(e) { showToast('❌ '+e.message, 4000); }
      }, 'Yes, Complete Donation'
    );
  };

  window.payDonorReq = async function(requestId, bagId) {
    const label = bagId ? 'this donor' : 'all donors';
    openModal('💰 SSL Commerz Payment',
      `<div style="text-align:center;padding:20px;">
         <div class="loader-spin" style="margin:0 auto 12px;"></div>
         <div style="color:var(--text-muted);font-size:.9rem;">Preparing payment session with SSL Commerz...</div>
         <div style="color:rgba(255,255,255,.25);font-size:.72rem;margin-top:8px;">
           🔒 Secured by SSL Commerz
         </div>
       </div>`,
      null
    );
    try {
      const res = await fetch('sslcommerz_init.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, bag_id: bagId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.free) {
        closeModal();
        showToast('💰 ' + data.message, 4000);
        loadMyRequests();
        return;
      }

      /* Show payment details with Pay Now button */
      if (mTitle) mTitle.innerHTML = '💰 Confirm Payment';
      if (mBody) mBody.innerHTML = `
        <div style="background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:14px;padding:24px;text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px;">
            <span style="font-size:1.2rem;">🔒</span>
            <span style="color:rgba(255,255,255,.3);font-size:.72rem;font-weight:500;">SSLCOMMERZ</span>
          </div>
          <div style="font-size:2.2rem;font-weight:800;color:#fbbf24;margin-bottom:4px;">
            ৳${parseFloat(data.amount).toFixed(2)}
          </div>
          <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:16px;">
            Total payable amount via SSL Commerz
          </div>
          <div style="font-size:.72rem;color:rgba(255,255,255,.2);font-family:monospace;margin-bottom:18px;padding:8px 12px;background:rgba(255,255,255,.02);border-radius:6px;display:inline-block;">
            ID: ${data.tran_id}
          </div>
          <button onclick="window.location.href='${data.GatewayPageURL}'"
                  style="width:100%;padding:14px 20px;border-radius:50px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0a0a0f;font-weight:700;font-size:.95rem;border:none;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .25s;display:inline-flex;align-items:center;justify-content:center;gap:8px;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 28px rgba(251,191,36,.35)';"
                  onmouseout="this.style.transform='';this.style.boxShadow='';">
            💳 Pay Now with SSL Commerz
          </button>
          <div style="font-size:.68rem;color:rgba(255,255,255,.2);margin-top:12px;">
            🔒 Secured by SSL Commerz &bull; You will be redirected to the payment gateway
          </div>
        </div>
      `;
      if (mConfirm) mConfirm.style.display = 'none';
      if (mCancel) mCancel.textContent = 'Cancel Payment';
    } catch(e) {
      closeModal();
      if (e.message === 'AUTH_FAILED') {
        showToast('⚠️ Session expired. Redirecting to login…', 3000);
        setTimeout(() => window.location.href = 'login.html', 2000);
      } else {
        showToast('❌ ' + e.message, 4000);
      }
    }
  };

  window.donorNotComeReq = async function(requestId, bagId) {
    if (!bagId) { showToast('❌ Cannot identify the donor bag.', 4000); return; }
    openModal('✕ Report Donor Did Not Come',
      `<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:12px;padding:16px 18px;margin-bottom:14px;">
         <div style="font-weight:700;color:#f87171;margin-bottom:6px;">✕ Report donor as not arrived</div>
         <div style="font-size:.82rem;color:var(--text-muted);line-height:1.6;">
           This will revert the blood bag acceptance. The donor's stats will be adjusted.<br>
           <strong style="color:#f87171;">Are you sure the donor did not come to donate?</strong>
         </div>
       </div>`,
      async () => {
        try {
          const res = await apiFetch('donor_not_come','POST',{request_id:requestId, bag_id:bagId});
          showToast('✕ ' + res.message, 5000);
          closeModal();
          loadMyRequests();
        } catch(e) { showToast('❌ '+e.message, 4000); }
      }, 'Yes, Report as No-Show'
    );
  };

  /* ══════════════════════════════════════════════
     HEALTH
  ══════════════════════════════════════════════ */
  async function loadHealth(){
    injectRefreshBtn('healthView', loadHealth, 'Refresh');
    setLoading('hbChartBars','Loading chart...');
    setLoading('labHistoryBody','Loading health records...');
    setLoading('antibodyList','Loading antibody data...');
    try{
      const data=await apiFetch('health');
      const records=data.records||[];const latest=records[0]||null;
      if(latest){
        const hb=parseFloat(latest.haemoglobin)||0;
        const bp_sys=latest.blood_pressure_sys||0;
        const pulse=latest.pulse||0;
        const wt=parseFloat(latest.weight_kg)||0;
        const hbEl=document.getElementById('hmHaemoglobinValue');if(hbEl){hbEl.innerHTML=`${hb} <span class="hm-unit">g/dL</span>`;hbEl.style.color=hb<12?'#f87171':hb<13?'#fbbf24':'#4ade80';}
        const hbBar=document.getElementById('hmHaemoglobinBar');if(hbBar){hbBar.style.width=Math.min(Math.round(hb/18*100),100)+'%';hbBar.className=`hm-fill ${hb<12?'hm-low':hb<13?'hm-mid':'hm-good'}`;}
        txt('hmHaemoglobinNote',hb<12.5?'⚠️ Below normal — consider iron supplements':'✅ Within normal range');
        const bpEl=document.getElementById('hmBPValue');if(bpEl)bpEl.innerHTML=bp_sys?`${bp_sys}/${latest.blood_pressure_dia} <span class="hm-unit">mmHg</span>`:`— <span class="hm-unit">mmHg</span>`;
        const bpBar=document.getElementById('hmBPBar');if(bpBar){const p=bp_sys?Math.min(Math.round((bp_sys/180)*100),100):0;bpBar.style.width=p+'%';bpBar.className=`hm-fill ${bp_sys>140?'hm-low':bp_sys>120?'hm-mid':'hm-good'}`;}
        txt('hmBPNote',bp_sys?(bp_sys>140?'⚠️ High — consult physician':bp_sys>120?'⚠️ Slightly elevated':'✅ Normal'):'No data');
        const pulseEl=document.getElementById('hmPulseValue');if(pulseEl)pulseEl.innerHTML=pulse?`${pulse} <span class="hm-unit">bpm</span>`:`— <span class="hm-unit">bpm</span>`;
        const pulseBar=document.getElementById('hmPulseBar');if(pulseBar){const p=pulse?Math.min(Math.round((pulse/120)*100),100):0;pulseBar.style.width=p+'%';pulseBar.className=`hm-fill ${pulse>100?'hm-low':pulse<60?'hm-mid':'hm-good'}`;}
        txt('hmPulseNote',pulse?(pulse>100?'⚠️ High':pulse<60?'⚠️ Low':'✅ Normal'):'No data');
        const wtEl=document.getElementById('hmWeightValue');if(wtEl)wtEl.innerHTML=wt?`${wt} <span class="hm-unit">kg</span>`:`— <span class="hm-unit">kg</span>`;
        const wtBar=document.getElementById('hmWeightBar');if(wtBar){const p=wt?Math.min(Math.round((wt/120)*100),100):0;wtBar.style.width=p+'%';wtBar.className=`hm-fill ${wt<50?'hm-low':'hm-good'}`;}
        txt('hmWeightNote',wt?(wt<50?'⚠️ Below minimum donation weight (50 kg)':'✅ Meets weight requirements'):'No data');
      }else{['hmHaemoglobinNote','hmBPNote','hmPulseNote','hmWeightNote'].forEach(id=>txt(id,'No health records found'));}
      const chartBars=document.getElementById('hbChartBars');
      if(chartBars){const chartData=records.slice(0,6).reverse();if(chartData.length){chartBars.innerHTML=chartData.map(r=>{const hb=parseFloat(r.haemoglobin)||0;const pct=Math.min(Math.round((hb/18)*100),100);const cls=hb<12?'chart-bar-low':hb<13?'chart-bar-warn':'';return`<div class="chart-bar-group"><div class="chart-bar ${cls}" style="height:${pct}%"><span class="bar-val">${hb}</span></div><div class="chart-label">${esc(r.month_label||'')}</div></div>`;}).join('');if(chartData.length>=2){const diff=(parseFloat(chartData[chartData.length-1].haemoglobin)-parseFloat(chartData[0].haemoglobin)).toFixed(1);txt('hbChartNote',diff<0?`📉 Trend: ${diff} g/dL over ${chartData.length} records`:`📈 Trend: +${diff} g/dL improving`);}}else{chartBars.innerHTML='<p style="color:var(--text-muted);text-align:center;padding:20px;width:100%;">No haemoglobin data available yet.</p>';}}
      const labBody=document.getElementById('labHistoryBody');
      if(labBody){labBody.innerHTML=records.length?records.map(r=>{const hb=parseFloat(r.haemoglobin)||0;const bp=r.blood_pressure_sys?`${r.blood_pressure_sys}/${r.blood_pressure_dia}`:'—';return`<tr><td>${esc(r.record_date||fmtDate(r.recorded_at))}</td><td style="color:${hb<12.5?'#f87171':'#4ade80'}">${r.haemoglobin||'—'} g/dL</td><td>${bp} mmHg</td><td>${r.pulse||'—'} bpm</td><td>${r.weight_kg||'—'} kg</td><td><span class="status-badge ${hb>=12.5?'badge-ok':'badge-danger'}">${hb>=12.5?'Eligible':'Check Needed'}</span></td></tr>`;}).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No health records found.</td></tr>';}
      const abList=document.getElementById('antibodyList');
      if(abList){const ab=data.antibodies||[];abList.innerHTML=ab.length?`<div style="display:flex;flex-direction:column;gap:0;">${ab.map(a=>`<div style="display:flex;align-items:center;gap:16px;padding:9px 0;border-bottom:1px solid var(--table-border);font-size:.82rem;"><span style="font-weight:600;flex:1;">${esc(a.antibody_name)}</span><span style="color:${a.is_donor?'#60a5fa':'#4ade80'}">${a.is_donor?'Positive':'Negative'}</span><span style="color:var(--text-muted);font-size:.72rem;">${esc(a.detected_date)}</span></div>`).join('')}</div>`:'<p style="color:var(--text-muted);font-size:.82rem;">No antibody records found.</p>';}
    }catch(err){handleErr(err);setError('labHistoryBody',err.message);}
  }

  /* ══════════════════════════════════════════════
     EMERGENCY REQUESTS
  ══════════════════════════════════════════════ */
  window.acceptBloodRequest = async function(requestId, btn){
    try{
      const cdRes = await apiFetch('check_cooldown');
      if(cdRes.cooldown && cdRes.cooldown.in_cooldown){
        showCooldownModal(cdRes.cooldown);
        return;
      }
    }catch(_){}

    /* Get request type from the button to show correct price UI */
    const reqTypeVal = btn?.dataset?.requestType || 'free';
    const maxPriceVal= parseFloat(btn?.dataset?.maxPrice || '0') || 0;
    const isPaid     = reqTypeVal === 'paid';
    const isOpen     = reqTypeVal === 'open';
    const showPrice  = isPaid || isOpen;
    console.log('[BloodBridge] acceptBloodRequest debug:', {requestId, reqTypeVal, maxPriceVal, datasetMaxPrice: btn?.dataset?.maxPrice, isPaid});
    const priceField = showPrice
      ? isPaid
        ? `<div style="margin-top:14px;padding:14px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.25);border-radius:10px;">
             <label style="font-size:.78rem;font-weight:700;color:#fbbf24;display:block;margin-bottom:6px;">💰 Price per unit (BDT)</label>
             <div style="font-size:.74rem;color:var(--text-muted);margin-bottom:8px;">The requester has set a fixed price of <strong style="color:#fbbf24;">৳${maxPriceVal}/unit</strong>.</div>
             <input type="text" value="৳${maxPriceVal}" readonly id="donorPriceInput"
               style="width:100%;padding:8px 12px;border-radius:8px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);color:var(--text-primary);font-size:.88rem;font-family:Outfit,sans-serif;cursor:not-allowed;">
           </div>`
        : /* open */ `<div style="margin-top:16px;">
             <label style="font-size:.78rem;font-weight:700;color:var(--text-primary);display:block;margin-bottom:10px;">💰 How would you like to donate?</label>
             <div style="display:flex;gap:12px;">
                <div id="donOptFree" class="don-opt" data-value="free" onclick="
                  document.querySelectorAll('.don-opt').forEach(function(e){e.style.border='2px solid rgba(255,255,255,.1)';e.style.background='rgba(255,255,255,.03)';});
                  this.style.border='2px solid #4ade80';this.style.background='rgba(74,222,128,.08)';
                  document.getElementById('donOptVal').value='free';
                " style="flex:1;padding:16px 12px;border-radius:12px;border:2px solid #4ade80;background:rgba(74,222,128,.08);cursor:pointer;text-align:center;transition:all .2s;">
                  <div style="font-size:1.6rem;margin-bottom:4px;">❤️</div>
                  <div style="font-weight:700;font-size:.85rem;color:var(--text-primary);">Donate for Free</div>
                  <div style="font-size:.68rem;color:var(--text-muted);margin-top:2px;">No payment — pure kindness</div>
                </div>
                <div id="donOptPaid" class="don-opt" data-value="paid" onclick="
                  document.querySelectorAll('.don-opt').forEach(function(e){e.style.border='2px solid rgba(255,255,255,.1)';e.style.background='rgba(255,255,255,.03)';});
                  this.style.border='2px solid #fbbf24';this.style.background='rgba(251,191,36,.08)';
                  document.getElementById('donOptVal').value='${maxPriceVal}';
                " style="flex:1;padding:16px 12px;border-radius:12px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);cursor:pointer;text-align:center;transition:all .2s;">
                 <div style="font-size:1.6rem;margin-bottom:4px;">💰</div>
                 <div style="font-weight:700;font-size:.85rem;color:var(--text-primary);">Donate with Payment</div>
                 <div style="font-size:.72rem;color:#fbbf24;font-weight:600;margin-top:2px;">৳${maxPriceVal}/unit</div>
                 <div style="font-size:.62rem;color:var(--text-muted);margin-top:1px;">Fixed by requester</div>
               </div>
             </div>
             <input type="hidden" id="donOptVal" value="free">
           </div>`
      : '';
    openModal(
      '🩸 Accept Blood Request',
      '<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);border-radius:12px;padding:16px 18px;margin-bottom:14px;">'
      + '<div style="font-size:.88rem;font-weight:700;color:#f87171;margin-bottom:6px;">🩸 You are offering to donate blood</div>'
      + '<div style="font-size:.82rem;color:var(--text-muted);line-height:1.6;">'
      + 'By accepting, you confirm you are willing and able to donate.<br>'
      + 'The requester will review your offer and manually approve it.</div></div>'
      + '<div style="display:flex;flex-direction:column;gap:10px;font-size:.8rem;color:var(--text-muted);">'
      + '<div style="display:flex;align-items:center;gap:8px;"><span style="color:#4ade80;font-size:1rem;">✅</span> You meet the blood group compatibility requirement</div>'
      + '<div style="display:flex;align-items:center;gap:8px;"><span style="color:#60a5fa;font-size:1rem;">📋</span> The requester will be notified of your offer</div>'
      + '<div style="display:flex;align-items:center;gap:8px;"><span style="color:#fbbf24;font-size:1rem;">⏳</span> You will receive confirmation once approved</div>'
      + '</div>'
      + priceField,
      async () => {
        btn.disabled=true;btn.textContent='Submitting...';
        let donorPrice = 0;
        if (isPaid) {
          donorPrice = maxPriceVal;
        } else if (isOpen) {
          const v = document.getElementById('donOptVal')?.value;
          donorPrice = v === 'free' ? 0 : (parseFloat(v) || 0);
        }
        try{
          const res=await apiFetch('accept_request','POST',{request_id:requestId, donor_price: donorPrice > 0 ? donorPrice : null});
          /* ── Immediately mark this button as offered ── */
          btn.textContent = '✅ Offered';
          btn.disabled = true;
          btn.style.background = 'rgba(74,222,128,.15)';
          btn.style.border = '1.5px solid rgba(74,222,128,.5)';
          btn.style.color = '#4ade80';
          btn.style.cursor = 'default';
          btn.style.opacity = '1';
          showToast('🩸 '+(res.message||'Offer submitted! The requester will review it.'),3500);
        }catch(e){
          showToast('❌ '+e.message,4000);
          btn.disabled=false;btn.textContent='Accept & Donate';
        }
      },
      'Yes, Accept Request'
    );
  }

  async function loadEmergency(params){
    /* Emergency already has #refreshEmergencyBtn in HTML — skip duplicate inject */
    setLoading('emergencyListContainer','Loading emergency requests...');
    setLoading('myResponsesBody','Loading...');
    try{
      params=params||{};
      const qs=new URLSearchParams(params).toString();
      const data=await apiFetch('emergency_requests'+(qs?`&${qs}`:''));
      txt('emergencySubtitle','Active requests — filter by blood group or Bangladesh division');
      _emergencyAllRequests = data.requests || [];
      window._emergencyDonorGroup = data.donor_group || 'your blood type';
      _renderEmergencyCards();
      const myBody=document.getElementById('myResponsesBody');
      if(myBody){
        const mr=data.my_responses||[];
        if(!mr.length){
          myBody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">You have not offered to donate yet.</td></tr>';
        } else {
          myBody.innerHTML = mr.map(r => {
            const reqId = '#REQ-' + String(r.request_id||0).padStart(4,'0');

            /* ── Step 1: Offered ── */
            const s1Dot = 'ps-dot-done';
            const s1Lbl = 'ps-label-done';

            /* ── Step 2: Lab review ── */
            let s2Dot, s2Lbl;
            if(r.lab_status === 'approved'){
              s2Dot = 'ps-dot-done'; s2Lbl = 'ps-label-done';
            } else if(r.lab_status === 'rejected'){
              s2Dot = 'ps-dot-fail'; s2Lbl = 'ps-label-fail';
            } else {
              s2Dot = 'ps-dot-pending'; s2Lbl = 'ps-label-pending';
            }

            /* ── Step 3: Requester decision ── */
            let s3Dot, s3Lbl, s3Txt;
            if(r.lab_status === 'approved'){
              if(r.bag_status === 'used'){
                s3Dot = 'ps-dot-done'; s3Lbl = 'ps-label-done'; s3Txt = '✓';
              } else if(r.request_status === 'approved'){
                s3Dot = 'ps-dot-done'; s3Lbl = 'ps-label-done'; s3Txt = '✓';
              } else {
                s3Dot = 'ps-dot-pending'; s3Lbl = 'ps-label-pending'; s3Txt = '…';
              }
            } else if(r.lab_status === 'rejected'){
              s3Dot = 'ps-dot-fail'; s3Lbl = 'ps-label-fail'; s3Txt = '✕';
            } else {
              s3Dot = 'ps-dot-wait'; s3Lbl = 'ps-label-wait'; s3Txt = '—';
            }

            const urgColor = r.urgency==='emergency'?'#f87171':r.urgency==='urgent'?'#fbbf24':'#4ade80';
            const urgIcon  = r.urgency==='emergency'?'🚨':r.urgency==='urgent'?'⚡':'📋';

            return `<tr>
              <td><strong style="font-size:.82rem;">${reqId}</strong></td>
              <td style="font-size:.78rem;">${esc(r.requester_name||'—')}</td>
              <td>
                <span style="padding:2px 10px;border-radius:50px;font-size:.7rem;font-weight:700;background:rgba(74,222,128,.12);color:#4ade80;border:1px solid rgba(74,222,128,.2);">
                  ${esc(r.blood_group||'—')}
                </span>
              </td>
              <td>
                <span style="padding:2px 10px;border-radius:50px;font-size:.68rem;font-weight:700;background:${urgColor}18;color:${urgColor};border:1px solid ${urgColor}33;">
                  ${urgIcon} ${(r.urgency||'normal').toUpperCase()}
                </span>
              </td>
              <td style="font-size:.76rem;color:var(--text-muted);">${fmtDate(r.offered_at)}</td>
              <td>
                <div class="pipeline-wrap">
                  <div class="pipeline-step">
                    <span class="ps-dot ${s1Dot}">✓</span>
                    <span class="ps-label ${s1Lbl}">Offered</span>
                  </div>
                  <div class="ps-connector ${r.lab_status==='approved'?'ps-connector-done':r.lab_status==='rejected'?'':'ps-connector-pending'}"></div>
                  <div class="pipeline-step">
                    <span class="ps-dot ${s2Dot}">${r.lab_status==='approved'?'✓':r.lab_status==='rejected'?'✕':'…'}</span>
                    <span class="ps-label ${s2Lbl}">${r.lab_status==='approved'?'Lab Approved':r.lab_status==='rejected'?'Lab Rejected':'Lab Pending'}</span>
                  </div>
                  <div class="ps-connector ${s3Dot==='ps-dot-done'?'ps-connector-done':s3Dot==='ps-dot-pending'?'ps-connector-pending':''}"></div>
                  <div class="pipeline-step">
                    <span class="ps-dot ${s3Dot}">${s3Txt}</span>
                    <span class="ps-label ${s3Lbl}">${s3Lbl==='ps-label-done'?'Accepted':s3Lbl==='ps-label-pending'?'Awaiting':s3Lbl==='ps-label-fail'?'Rejected':'Waiting'}</span>
                  </div>
                </div>
              </td>
            </tr>`;
          }).join('');
        }
      }
    }catch(err){handleErr(err);setError('emergencyListContainer',err.message);}
  }

  /* ══════════════════════════════════════════════
     DRONE TRACKING — PREMIUM SIMULATION
  ══════════════════════════════════════════════ */
  var _droneSim = null;
  var _droneTimer = null;
  var _droneMap = null;
  var _droneSrcMarker = null;
  var _droneDestMarker = null;
  var _droneMarker = null;
  var _droneRouteLine = null;
  var _droneTraveledLine = null;

  async function loadDelivery(){
    var c=document.getElementById('deliveryCardsContainer');
    var livePill=document.getElementById('dtLivePill');
    if(c)c.innerHTML='<div class="section-loader"><div class="loader-spin"></div>Connecting to drone network...</div>';
    if(livePill)livePill.style.display='none';
    try{
      var data=await apiFetch('simulate_drone');
      var d=data.delivery;
      if(!d||!d.id){
        if(c)c.innerHTML='<div class="glass-card" style="padding:28px;text-align:center;color:var(--text-muted);"><div style="font-size:2rem;margin-bottom:10px;">🚁</div><div>No drone delivery available.</div><button class="btn-retry" onclick="navigateGlobal(\'delivery\')" style="margin-top:16px;">🔄 Retry</button></div>';
        return;
      }
      if(livePill)livePill.style.display='';
      // Build premium tracking UI
      if(c)c.innerHTML=buildDroneUI(d);
      initReveal();
      startDroneSimulation(d);
    }catch(err){
      handleErr(err);
      if(c)c.innerHTML='<div style="padding:28px;text-align:center;color:#f87171;"><div style="font-size:2.5rem;margin-bottom:10px;">🚁</div><div style="font-weight:700;margin-bottom:6px;">Could not connect to drone network</div><div style="font-size:.8rem;color:var(--text-muted);margin-bottom:16px;">'+esc(err.message)+'</div><button class="btn-retry" onclick="navigateGlobal(\'delivery\')">🔄 Retry</button></div>';
    }
  }

  function buildDroneUI(d){
    var steps=['🏥 Blood Bank','🚁 En Route','📍 Hospital','✅ Delivered'];
    var activeIdx=d.status==='delivered'?3:1;
    var pct=d.status==='delivered'?100:42;
    var etaStr=d.estimated_arrival?fmtDate(d.estimated_arrival):'Calculating...';
    var reqId='#REQ-'+String(d.request_id||'--').padStart(4,'0');
    var bankLat=parseFloat(d.bank_lat)||23.7642;
    var bankLng=parseFloat(d.bank_lng)||90.3800;
    var destLat=parseFloat(d.destination_lat)||23.8103;
    var destLng=parseFloat(d.destination_lng)||90.4125;
    var droneCode=d.drone_code||'BB-DR-001';
    var bankName=esc(d.source_bank_name||'Blood Bank');
    var destName=esc(d.destination_name||'Hospital');

    return '<div class="dt-container reveal">'+
      '<div class="dt-map-wrap">'+
        '<div class="dt-map">'+
          '<div id="dtGoogleMap" style="width:100%;height:100%;border-radius:12px;overflow:hidden;"></div>'+
          '<div class="dt-map-status" id="dtMapStatus"><span>Awaiting drone launch...</span></div>'+
        '</div>'+
        '<div class="dt-map-bar">'+
          '<span>🛰️ <span id="dtSatellites">12</span> locked</span>'+
          '<span>📶 <span id="dtAccuracy">95</span>% GPS</span>'+
          '<span id="dtLastUpdate">Updated just now</span>'+
        '</div>'+
      '</div>'+

      // Sidebar
      '<div class="dt-sidebar">'+
        // Flight info card
        '<div class="dt-card glass-card">'+
          '<div class="dt-card-header">'+
            '<span class="dt-card-icon">🚁</span>'+
            '<span>Flight <strong>'+droneCode+'</strong></span>'+
          '</div>'+
          '<div class="dt-flight-info">'+
            '<div class="dt-flight-row"><span>Request</span><strong>'+reqId+'</strong></div>'+
            '<div class="dt-flight-row"><span>Blood</span><strong>'+esc(d.blood_group||'O+')+'</strong></div>'+
            '<div class="dt-flight-row"><span>Route</span><strong>'+bankName+' → '+destName+'</strong></div>'+
            '<div class="dt-flight-row"><span>Status</span><strong class="dt-status-text">IN TRANSIT</strong></div>'+
          '</div>'+
        '</div>'+

        // Live stats
        '<div class="dt-card glass-card">'+
          '<div class="dt-card-header"><span class="dt-card-icon">📊</span><span>Live Telemetry</span></div>'+
          '<div class="dt-stats-grid">'+
            '<div class="dt-stat">'+
              '<div class="dt-stat-icon">⚡</div>'+
              '<div class="dt-stat-val"><span id="dtSpeed">0</span> <span class="dt-stat-unit">km/h</span></div>'+
              '<div class="dt-stat-lbl">Speed</div>'+
            '</div>'+
            '<div class="dt-stat">'+
              '<div class="dt-stat-icon">📏</div>'+
              '<div class="dt-stat-val"><span id="dtAltitude">0</span> <span class="dt-stat-unit">m</span></div>'+
              '<div class="dt-stat-lbl">Altitude</div>'+
            '</div>'+
            '<div class="dt-stat">'+
              '<div class="dt-stat-icon">🔋</div>'+
              '<div class="dt-stat-val"><span id="dtBattery">--</span> <span class="dt-stat-unit">%</span></div>'+
              '<div class="dt-stat-lbl" id="dtBatteryLabel">Battery</div>'+
              '<div class="dt-battery-bar"><div class="dt-battery-fill" id="dtBatteryFill"></div></div>'+
            '</div>'+
            '<div class="dt-stat">'+
              '<div class="dt-stat-icon">📶</div>'+
              '<div class="dt-stat-val"><span id="dtSignal">--</span> <span class="dt-stat-unit">%</span></div>'+
              '<div class="dt-stat-lbl">Signal</div>'+
              '<div class="dt-signal-bars" id="dtSignalBars"><span></span><span></span><span></span><span></span></div>'+
            '</div>'+
          '</div>'+
        '</div>'+

        // Progress tracker
        '<div class="dt-card glass-card">'+
          '<div class="dt-card-header"><span class="dt-card-icon">📌</span><span>Delivery Progress</span></div>'+
          '<div class="dt-progress-tracker">'+
            '<div class="tracker-steps">'+steps.map(function(s,i){return '<div class="step'+(i<activeIdx?' completed':i===activeIdx?' active':'')+'">'+s+'</div>';}).join('')+'</div>'+
            '<div class="progress-bar-track"><div class="progress-fill" id="dtProgressFill" style="width:'+pct+'%"></div></div>'+
            '<div class="dt-eta-row">'+
              '<span>⏱️ ETA: <strong id="dtETA">'+etaStr+'</strong></span>'+
              '<span>📏 <span id="dtDistance">--</span> km</span>'+
            '</div>'+
            '<div class="dt-eta-row sub">'+
              '<span>🔄 <span id="dtProgressPct">'+pct+'</span>% complete</span>'+
              '<span>⏳ Est. <span id="dtTimeRemaining">--</span> min</span>'+
            '</div>'+
          '</div>'+
        '</div>'+

        // Weather
        '<div class="dt-card glass-card">'+
          '<div class="dt-card-header"><span class="dt-card-icon">🌤️</span><span>Flight Conditions</span></div>'+
          '<div class="dt-weather-grid">'+
            '<div class="dt-weather-item"><span class="dt-weather-icon">🌡️</span><span><span id="dtTemp">32</span>°C</span></div>'+
            '<div class="dt-weather-item"><span class="dt-weather-icon">💨</span><span><span id="dtWind">12</span> km/h</span></div>'+
            '<div class="dt-weather-item"><span class="dt-weather-icon">☁️</span><span id="dtCondition">Partly Cloudy</span></div>'+
            '<div class="dt-weather-item"><span class="dt-weather-icon">👁️</span><span><span id="dtVisibility">10</span> km</span></div>'+
          '</div>'+
        '</div>'+

        // Timeline
        '<div class="dt-card glass-card">'+
          '<div class="dt-card-header"><span class="dt-card-icon">📋</span><span>Flight Timeline</span></div>'+
          '<div class="dt-timeline" id="dtTimeline">'+
            '<div class="dt-tl-item active"><span class="dt-tl-dot"></span><span>Dispatched from '+bankName+'</span><span class="dt-tl-time" id="dtTlDispatched">--</span></div>'+
            '<div class="dt-tl-item" id="dtTlEnroute"><span class="dt-tl-dot"></span><span>Departure confirmed</span><span class="dt-tl-time" id="dtTlDeparted">--</span></div>'+
            '<div class="dt-tl-item" id="dtTlArriving"><span class="dt-tl-dot"></span><span>Approaching '+destName+'</span><span class="dt-tl-time" id="dtTlArrivingTime">--</span></div>'+
            '<div class="dt-tl-item" id="dtTlDelivered"><span class="dt-tl-dot"></span><span>Delivered ✅</span><span class="dt-tl-time" id="dtTlDeliveredTime">--</span></div>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  /* ── Drone Simulation Engine ── */
  function startDroneSimulation(d){
    stopDroneSimulation();
    var sim={
      d:d,
      waypoints:[],
      wpIndex:0,
      progress:0,
      speed:55,
      altitude:100,
      battery:parseInt(d.drone_battery)||parseInt(d.battery_at_dispatch)||85,
      signal:95,
      totalDist:0,
      distTraveled:0,
      tickCount:0,
      status:d.status||'in_transit',
      arrived:false
    };

    // Generate waypoints from source to dest
    var bankLat=parseFloat(d.bank_lat)||23.7642;
    var bankLng=parseFloat(d.bank_lng)||90.3800;
    var destLat=parseFloat(d.destination_lat)||23.8103;
    var destLng=parseFloat(d.destination_lng)||90.4125;
    var numWps=30;

    for(var i=0;i<=numWps;i++){
      var t=i/numWps;
      var lat=bankLat+(destLat-bankLat)*t;
      var lng=bankLng+(destLng-bankLng)*t;
      // Add curve using sin wave perpendicular to route
      var perpLat=-(destLng-bankLng); var perpLng=(destLat-bankLat);
      var len=Math.sqrt(perpLat*perpLat+perpLng*perpLng)||1;
      perpLat/=len; perpLng/=len;
      var curve=Math.sin(t*Math.PI)*0.015;
      lat+=perpLat*curve;
      lng+=perpLng*curve;
      sim.waypoints.push({lat:lat,lng:lng});
    }

    // Calculate total distance (rough)
    sim.totalDist=haversine(bankLat,bankLng,destLat,destLng);

    // Set initial position
    sim.d.current_lat=bankLat;
    sim.d.current_lng=bankLng;

    // Update timeline start
    var now=new Date();
    document.getElementById('dtTlDispatched').textContent=padTime(now);
    document.getElementById('dtTlDeparted').textContent=padTime(new Date(now.getTime()+15000));

    _droneSim=sim;
    initDroneGoogleMap(sim);

    _droneTimer=setInterval(function(){tickDroneSim();},2500);
  }

  function stopDroneSimulation(){
    if(_droneTimer){clearInterval(_droneTimer);_droneTimer=null;}
    _droneSim=null;
    cleanupGoogleMaps();
  }

  function tickDroneSim(){
    try {
      var sim=_droneSim;
      if(!sim)return;
      sim.tickCount++;
      if(sim.arrived){return;}

      var stepSize=Math.max(1,Math.floor(30/15));
      sim.wpIndex=Math.min(sim.wpIndex+stepSize,sim.waypoints.length-1);
      sim.progress=sim.wpIndex/(sim.waypoints.length-1);

      var wp=sim.waypoints[sim.wpIndex];
      if(!wp)return;

      sim.d.current_lat=wp.lat;
      sim.d.current_lng=wp.lng;

      sim.speed=45+Math.sin(sim.tickCount*0.7)*12+Math.random()*8;
      sim.speed=Math.max(35,Math.min(75,sim.speed));
      sim.altitude=80+Math.sin(sim.tickCount*0.5)*40+Math.random()*30;
      sim.altitude=Math.max(50,Math.min(250,sim.altitude));
      sim.battery=Math.max(0,sim.battery-0.6-Math.random()*0.3);
      sim.signal=70+Math.sin(sim.tickCount*0.3)*20+Math.random()*10;
      sim.signal=Math.max(20,Math.min(100,sim.signal));

      var totalWps=sim.waypoints.length-1;
      var distPerWp=sim.totalDist/totalWps;
      sim.distTraveled=sim.wpIndex*distPerWp;

      if(sim.wpIndex>=sim.waypoints.length-1||sim.progress>=0.995){
        sim.arrived=true;
        sim.status='delivered';
        sim.progress=1;
        sim.speed=0;
        sim.altitude=5;
        var now=new Date();
        var el;
        el=document.getElementById('dtTlArrivingTime');if(el)el.textContent=padTime(now);
        el=document.getElementById('dtTlDeliveredTime');if(el)el.textContent=padTime(now);
        el=document.getElementById('dtTlArriving');if(el)el.classList.add('completed');
        el=document.getElementById('dtTlDelivered');if(el)el.classList.add('completed','active');
        el=document.getElementById('dtMapStatus');if(el)el.innerHTML='<span style="color:#4ade80;">✅ Delivered successfully!</span>';
        if(_droneTimer){clearInterval(_droneTimer);_droneTimer=null;}
        showToast('✅ Drone delivery completed! Blood bag has arrived.',6000);
      }

      updateDroneStats(sim);
      updateGoogleMaps(sim,sim.progress);
      updateProgressTracker(sim);
      updateTimeline(sim);
      updateWeather(sim);

      var lu=document.getElementById('dtLastUpdate');
      if(lu)lu.textContent='Updated '+timeAgo(new Date().toISOString());

      var satEl=document.getElementById('dtSatellites');
      if(satEl)satEl.textContent=Math.round(6+sim.signal/20);
      var accEl=document.getElementById('dtAccuracy');
      if(accEl)accEl.textContent=Math.round(60+sim.signal*0.4);

      if(sim.tickCount===8){
        var el1=document.getElementById('dtTlArrivingTime');if(el1)el1.textContent=padTime(new Date());
        var el2=document.getElementById('dtTlArriving');if(el2)el2.classList.add('active');
      }
    } catch(e){
      console.warn('tickDroneSim error:',e);
    }
  }

  function updateDroneStats(sim){
    var speedEl=document.getElementById('dtSpeed');
    if(speedEl)speedEl.textContent=Math.round(sim.speed);

    var altEl=document.getElementById('dtAltitude');
    if(altEl)altEl.textContent=Math.round(sim.altitude);

    var batEl=document.getElementById('dtBattery');
    var batFill=document.getElementById('dtBatteryFill');
    var batLabel=document.getElementById('dtBatteryLabel');
    var batVal=Math.max(0,Math.round(sim.battery));
    if(batEl)batEl.textContent=batVal;
    if(batFill)batFill.style.width=batVal+'%';
    if(batLabel){
      if(batVal<20)batLabel.textContent='⚠️ Low Battery';
      else if(batVal<50)batLabel.textContent='Battery';
      else batLabel.textContent='Battery';
    }
    if(batFill){
      batFill.style.background=batVal<20?'linear-gradient(90deg,#ef4444,#dc2626)':batVal<50?'linear-gradient(90deg,#fbbf24,#f59e0b)':'linear-gradient(90deg,#4ade80,#22c55e)';
    }

    var sigEl=document.getElementById('dtSignal');
    var sigBars=document.getElementById('dtSignalBars');
    var sigVal=Math.round(sim.signal);
    if(sigEl)sigEl.textContent=sigVal;
    if(sigBars){
      var bars=sigBars.querySelectorAll('span');
      var activeBars=sigVal<25?1:sigVal<50?2:sigVal<75?3:4;
      bars.forEach(function(b,i){b.className=i<activeBars?'active':'';});
    }

    var distEl=document.getElementById('dtDistance');
    var remaining=Math.max(0,sim.totalDist-sim.distTraveled);
    if(distEl)distEl.textContent=remaining.toFixed(1);

    // ETA
    var etaEl=document.getElementById('dtETA');
    if(etaEl){
      if(sim.arrived)etaEl.textContent='Arrived ✅';
      else{
        var etaMin=sim.speed>0?Math.round((remaining/sim.speed)*60):0;
        var etaDate=new Date(Date.now()+etaMin*60000);
        etaEl.textContent=fmtDate(etaDate.toISOString());
      }
    }

    var timeRemEl=document.getElementById('dtTimeRemaining');
    if(timeRemEl){
      if(sim.arrived)timeRemEl.textContent='0';
      else{
        var etaMin=sim.speed>0?Math.round((remaining/sim.speed)*60):0;
        timeRemEl.textContent=etaMin;
      }
    }
  }

  /* ── Leaflet Map Integration ── */
  var _leafletLoading=false;
  var _leafletPending=[];
  var _mapDarkMode=false;
  var _currentTileLayer=null;
  var _userLocationMarker=null;

  function _loadLeaflet(cb){
    if(typeof L!=='undefined'){cb(null);return;}
    _leafletPending.push(cb);
    if(_leafletLoading)return;
    _leafletLoading=true;
    var s=document.createElement('script');
    s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload=function(){
      _leafletLoading=false;
      var q=_leafletPending.slice();_leafletPending=[];
      q.forEach(function(f){f(null);});
    };
    s.onerror=function(){
      _leafletLoading=false;
      var q=_leafletPending.slice();_leafletPending=[];
      q.forEach(function(f){f(new Error('Leaflet load failed'));});
    };
    document.head.appendChild(s);
  }

  function initDroneGoogleMap(sim){
    if(!sim||!sim.waypoints||!sim.waypoints.length){
      setTimeout(function(){initDroneGoogleMap(sim);},100);return;
    }
    _loadLeaflet(function(err){
      if(err){
        console.warn('Leaflet unavailable, using canvas fallback:',err.message);
        _initFallbackMap(sim);
        return;
      }
      _initDroneMap(sim);
    });
  }

  function _initDroneMap(sim){
    if(!L.Control.Fullscreen){
      L.Control.Fullscreen=L.Control.extend({
        options:{position:'topleft'},
        onAdd:function(map){
          var c=L.DomUtil.create('div','leaflet-bar leaflet-control');
          var a=L.DomUtil.create('a','',c);
          a.innerHTML='⛶';a.href='#';a.title='Toggle fullscreen';
          a.style.cssText='font-size:18px;line-height:30px;text-align:center;width:30px;height:30px;display:block;cursor:pointer;';
          L.DomEvent.on(a,'click',function(e){
            L.DomEvent.stopPropagation(e);L.DomEvent.preventDefault(e);
            var el=map.getContainer();
            if(!document.fullscreenElement){el.requestFullscreen().catch(function(){});}
            else{document.exitFullscreen();}
          });
          return c;
        }
      });
    }
    var container=document.getElementById('dtGoogleMap');
    if(!container||container.offsetParent===null||container.offsetHeight<50){
      setTimeout(function(){initDroneGoogleMap(sim);},200);
      return;
    }
    cleanupGoogleMaps();

    var bankLat=parseFloat(sim.d.bank_lat)||23.7642;
    var bankLng=parseFloat(sim.d.bank_lng)||90.3800;
    var destLat=parseFloat(sim.d.destination_lat)||23.8103;
    var destLng=parseFloat(sim.d.destination_lng)||90.4125;
    var srcPos=[bankLat,bankLng];
    var dstPos=[destLat,destLng];
    var center=[(bankLat+destLat)/2,(bankLng+destLng)/2];

    try {
      container.innerHTML='';
      _droneMap=L.map(container,{
        center:center,zoom:13,zoomControl:true,
        attributionControl:false
      });
      var lightUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      var darkUrl='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      var useDark=_mapDarkMode||false;
      var tileUrl=useDark?darkUrl:lightUrl;
      _currentTileLayer=L.tileLayer(tileUrl,{
        maxZoom:19,attribution:'&copy; <a href="https://openstreetmap.org/copyright">OSM</a>'
      }).addTo(_droneMap);

      L.control.fullscreen=function(opts){return new L.Control.Fullscreen(opts);};
      L.control.fullscreen({position:'topleft'}).addTo(_droneMap);

      L.Control.TileToggle=L.Control.extend({
        options:{position:'topleft'},
        onAdd:function(map){
          var c=L.DomUtil.create('div','leaflet-bar leaflet-control');
          var a=L.DomUtil.create('a','',c);
          a.innerHTML=_mapDarkMode?'☀️':'🌙';a.href='#';a.title='Toggle map theme';
          a.style.cssText='font-size:16px;line-height:30px;text-align:center;width:30px;height:30px;display:block;cursor:pointer;';
          L.DomEvent.on(a,'click',function(e){
            L.DomEvent.stopPropagation(e);L.DomEvent.preventDefault(e);
            _mapDarkMode=!_mapDarkMode;
            a.innerHTML=_mapDarkMode?'☀️':'🌙';
            map.removeLayer(_currentTileLayer);
            _currentTileLayer=L.tileLayer(_mapDarkMode?darkUrl:lightUrl,{
              maxZoom:19,attribution:'&copy; <a href="https://openstreetmap.org/copyright">OSM</a>'
            }).addTo(map);
          });
          return c;
        }
      });
      L.control.tileToggle=function(opts){return new L.Control.TileToggle(opts);};
      L.control.tileToggle({position:'topleft'}).addTo(_droneMap);

      L.Control.LocateUser=L.Control.extend({
        options:{position:'topleft'},
        onAdd:function(map){
          var c=L.DomUtil.create('div','leaflet-bar leaflet-control');
          var a=L.DomUtil.create('a','',c);
          a.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
          a.href='#';a.title='Show my location';
          a.style.cssText='display:flex;align-items:center;justify-content:center;width:30px;height:30px;cursor:pointer;';
          var locating=false;
          L.DomEvent.on(a,'click',function(e){
            L.DomEvent.stopPropagation(e);L.DomEvent.preventDefault(e);
            if(locating)return;
            locating=true;a.style.opacity='0.5';
            map.locate({setView:false,enableHighAccuracy:true,timeout:10000});
          });
          map.on('locationfound',function(ev){
            locating=false;a.style.opacity='1';
            if(_userLocationMarker){_droneMap.removeLayer(_userLocationMarker);}
            _userLocationMarker=L.circleMarker([ev.latitude,ev.longitude],{
              radius:10,color:'#2563eb',fillColor:'#3b82f6',fillOpacity:0.3,weight:3
            }).addTo(_droneMap);
            _droneMap.setView([ev.latitude,ev.longitude],15);
          });
          map.on('locationerror',function(){
            locating=false;a.style.opacity='1';
            if(typeof showToast==='function')showToast('📍 Location unavailable — check permissions',4000);
          });
          return c;
        }
      });
      L.control.locateUser=function(opts){return new L.Control.LocateUser(opts);};
      L.control.locateUser({position:'topleft'}).addTo(_droneMap);

      var srcIcon=L.divIcon({
        html:'<div style="width:22px;height:22px;background:rgba(192,22,44,0.2);border:3px solid #c0162c;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;">🏥</div>',
        className:'',iconSize:[28,28],iconAnchor:[14,14]
      });
      var dstIcon=L.divIcon({
        html:'<div style="width:22px;height:22px;background:rgba(74,222,128,0.2);border:3px solid #4ade80;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;">🏥</div>',
        className:'',iconSize:[28,28],iconAnchor:[14,14]
      });
      _droneSrcMarker=L.marker(srcPos,{icon:srcIcon}).addTo(_droneMap);
      _droneDestMarker=L.marker(dstPos,{icon:dstIcon}).addTo(_droneMap);

      var routePath=sim.waypoints.map(function(wp){return [wp.lat,wp.lng];});
      _droneRouteLine=L.polyline(routePath,{
        color:'#ff6b6b',weight:3,opacity:0.4,dashArray:'6,4'
      }).addTo(_droneMap);
      _droneTraveledLine=L.polyline([routePath[0]],{
        color:'#c0162c',weight:4
      }).addTo(_droneMap);

      var droneIcon=L.divIcon({
        html:'<div style="width:32px;height:32px;background:rgba(192,22,44,0.15);border:2px solid #c0162c;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;color:#fff;text-shadow:0 0 4px rgba(0,0,0,0.8);box-shadow:0 0 12px rgba(192,22,44,0.4);">D</div>',
        className:'',iconSize:[32,32],iconAnchor:[16,16]
      });
      _droneMarker=L.marker(srcPos,{icon:droneIcon,zIndexOffset:100}).addTo(_droneMap);

      setTimeout(function(){_droneMap.invalidateSize();},100);
      updateGoogleMaps(sim,0);
    } catch(e){
      console.warn('Leaflet init failed:',e);
      cleanupGoogleMaps();
      _initFallbackMap(sim);
    }
  }

  var _fallbackAnim=null;

  function _initFallbackMap(sim){
    try {
      var container=document.getElementById('dtGoogleMap');
      if(!container||!sim||!sim.waypoints||sim.waypoints.length<2)return;
      container.style.background='#1a1a2e';
      container.style.position='relative';
      container.innerHTML=
        '<canvas id="dtFallbackCanvas" style="width:100%;height:100%;display:block;"></canvas>';

      var canvas=document.getElementById('dtFallbackCanvas');
      if(!canvas)return;
      var w=container.offsetWidth||600,h=container.offsetHeight||420;
      canvas.width=w*2;canvas.height=h*2;
      canvas.style.width=w+'px';canvas.style.height=h+'px';
      var ctx=canvas.getContext('2d');
      if(!ctx)return;
      ctx.scale(2,2);

      var pts=sim.waypoints;
      var lats=pts.map(function(p){return p.lat;}),lngs=pts.map(function(p){return p.lng;});
      var minLat=Math.min.apply(null,lats),maxLat=Math.max.apply(null,lats);
      var minLng=Math.min.apply(null,lngs),maxLng=Math.max.apply(null,lngs);
      var pad=0.02;minLat-=pad;maxLat+=pad;minLng-=pad;maxLng+=pad;
      var sx=w/(maxLng-minLng),sy=h/(maxLat-minLat),s=Math.min(sx,sy)*0.85;
      var cx=(minLng+maxLng)/2,cy=(minLat+maxLat)/2;
      var ox=w/2-((cx-minLng)*s),oy=h/2-((maxLat-cy)*s);
      var tPts=pts.map(function(p){return {x:ox+(p.lng-minLng)*s,y:oy+(maxLat-p.lat)*s};});

      if(_fallbackAnim){cancelAnimationFrame(_fallbackAnim);_fallbackAnim=null;}

      function drawFrame(pct){
        ctx.clearRect(0,0,w,h);
        ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,w,h);
        ctx.strokeStyle='rgba(255,107,107,0.3)';ctx.lineWidth=2;ctx.setLineDash([6,4]);
        ctx.beginPath();tPts.forEach(function(p,i){if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
        ctx.stroke();ctx.setLineDash([]);

        var idx=Math.max(0,Math.round(pct*(tPts.length-1)));
        if(idx>0){
          ctx.strokeStyle='#c0162c';ctx.lineWidth=3;
          ctx.beginPath();
          for(var i=0;i<=Math.min(idx,tPts.length-1);i++){
            if(i===0)ctx.moveTo(tPts[i].x,tPts[i].y);else ctx.lineTo(tPts[i].x,tPts[i].y);
          }
          ctx.stroke();
        }

        var dp=tPts[Math.min(idx,tPts.length-1)];
        ctx.shadowColor='rgba(192,22,44,0.4)';ctx.shadowBlur=12;
        ctx.fillStyle='#c0162c';ctx.beginPath();ctx.arc(dp.x,dp.y,7,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(dp.x,dp.y,7,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#fff';ctx.font='bold 7px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('D',dp.x,dp.y);

        ctx.fillStyle='rgba(74,222,128,0.8)';ctx.beginPath();ctx.arc(tPts[0].x,tPts[0].y,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(74,222,128,0.8)';ctx.beginPath();ctx.arc(tPts[tPts.length-1].x,tPts[tPts.length-1].y,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='9px sans-serif';ctx.textAlign='center';
        ctx.fillText('SOURCE',tPts[0].x,tPts[0].y-14);
        ctx.fillText('DEST',tPts[tPts.length-1].x,tPts[tPts.length-1].y-14);

        ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='10px sans-serif';ctx.textAlign='center';
        ctx.fillText('Route visualization · Map unavailable',w/2,h-10);
      }

      var tick=function(){
        if(!_droneSim){_fallbackAnim=null;return;}
        drawFrame(_droneSim.progress);
        _fallbackAnim=requestAnimationFrame(tick);
      };
      _fallbackAnim=requestAnimationFrame(tick);
    } catch(e){console.warn('Fallback render error:',e);}
  }

  var _mapsBroken=false;

  function updateGoogleMaps(sim,progress){
    if(_mapsBroken||!_droneMap||!_droneMarker||!sim)return;
    try {
      var lat=parseFloat(sim.d.current_lat)||sim.waypoints[0].lat;
      var lng=parseFloat(sim.d.current_lng)||sim.waypoints[0].lng;

      _droneMarker.setLatLng([lat,lng]);
      _droneMap.panTo([lat,lng]);

      if(_droneTraveledLine&&sim.waypoints.length){
        var traveledCount=Math.max(1,Math.round(sim.wpIndex)+1);
        var traveledPath=sim.waypoints.slice(0,traveledCount).map(function(wp){return [wp.lat,wp.lng];});
        _droneTraveledLine.setLatLngs(traveledPath);
      }

      if(progress>0.85&&_droneMap.getZoom()<15)_droneMap.setZoom(15);
      else if(progress<0.2&&_droneMap.getZoom()>13)_droneMap.setZoom(13);

      var statusEl=document.getElementById('dtMapStatus');
      if(statusEl){
        if(sim.arrived)statusEl.innerHTML='<span style="color:#4ade80;">✅ Delivered to destination</span>';
        else if(progress<0.05)statusEl.innerHTML='<span>🛫 Launching from blood bank...</span>';
        else if(progress<0.9)statusEl.innerHTML='<span>✈️ En route · '+Math.round(progress*100)+'% traveled</span>';
        else statusEl.innerHTML='<span>🛬 Approaching destination...</span>';
      }

      var liveStatus=document.getElementById('dtLiveStatus');
      if(liveStatus){
        if(sim.arrived)liveStatus.textContent='Delivered';
        else liveStatus.textContent='En Route · '+Math.round(progress*100)+'%';
      }
    } catch(e){
      console.warn('Leaflet error, switching to fallback:',e.message);
      _mapsBroken=true;
      cleanupGoogleMaps();
      _initFallbackMap(_droneSim);
    }
  }

  function cleanupGoogleMaps(){
    if(_fallbackAnim){cancelAnimationFrame(_fallbackAnim);_fallbackAnim=null;}
    if(_droneMap){_droneMap.remove();_droneMap=null;}
    _currentTileLayer=null;
    _userLocationMarker=null;
    _droneMarker=null;
    _droneSrcMarker=null;
    _droneDestMarker=null;
    _droneRouteLine=null;
    _droneTraveledLine=null;
  }

  function updateProgressTracker(sim){
    var fill=document.getElementById('dtProgressFill');
    var pctEl=document.getElementById('dtProgressPct');
    var pct=Math.round(sim.progress*100);
    if(fill)fill.style.width=pct+'%';
    if(pctEl)pctEl.textContent=pct;

    var steps=document.querySelectorAll('#deliveryCardsContainer .tracker-steps .step');
    if(!steps.length)return;
    var activeIdx=sim.arrived?3:sim.progress<0.33?1:sim.progress<0.8?2:3;
    steps.forEach(function(s,i){
      s.classList.remove('completed','active');
      if(i<activeIdx)s.classList.add('completed');
      else if(i===activeIdx)s.classList.add('active');
    });
  }

  function updateTimeline(sim){
    var el=document.getElementById('dtTlEnroute');
    if(sim.tickCount>=3&&el&&!el.classList.contains('completed')){
      el.classList.add('completed','active');
    }
  }

  function updateWeather(sim){
    // Simulate slight weather variation
    var tempEl=document.getElementById('dtTemp');
    var windEl=document.getElementById('dtWind');
    var condEl=document.getElementById('dtCondition');
    var visEl=document.getElementById('dtVisibility');

    if(tempEl){
      var t=30+Math.sin(sim.tickCount*0.2)*3+Math.random()*2;
      tempEl.textContent=Math.round(t);
    }
    if(windEl){
      var w=8+Math.sin(sim.tickCount*0.4)*5+Math.random()*3;
      windEl.textContent=Math.round(w);
    }
    if(condEl){
      var conds=['☀️ Sunny','⛅ Partly Cloudy','☁️ Cloudy','🌤️ Mostly Clear'];
      condEl.textContent=conds[Math.round(Math.sin(sim.tickCount*0.15)*1.5+1.5)];
    }
    if(visEl){
      var v=8+Math.sin(sim.tickCount*0.1)*2+Math.random()*1;
      visEl.textContent=Math.max(3,Math.round(v));
    }
  }

  function padTime(d){
    return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

  function haversine(lat1,lng1,lat2,lng2){
    var R=6371;
    var dLat=(lat2-lat1)*Math.PI/180;
    var dLng=(lng2-lng1)*Math.PI/180;
    var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
    var c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    return R*c;
  }

  /* ══════════════════════════════════════════════
     APPROVALS
  ══════════════════════════════════════════════ */
  async function loadApprovals(){
    injectRefreshBtn('approvalsView', loadApprovals, 'Refresh');
    const c=document.getElementById('approvalsContainer');
    if(c)c.innerHTML='<div style="padding:28px;text-align:center;color:var(--text-muted);"><div class="loader-spin" style="margin:0 auto 10px;"></div>Loading...</div>';
    try{
      const data=await apiFetch('approvals');
      const list=data.approvals||[];
      if(!list.length){if(c)c.innerHTML='<div class="glass-card" style="padding:28px;text-align:center;color:var(--text-muted);"><div style="font-size:2rem;margin-bottom:10px;">📋</div><div>No approval records found.</div></div>';return;}
      if(c){
        c.innerHTML=list.map(a=>{
          const scC=a.request_status==='approved'?'#4ade80':a.request_status==='rejected'?'#f87171':'#fbbf24';
          const pct=a.request_status==='approved'?100:a.request_status==='rejected'?100:(a.steps||[]).length?Math.round((a.steps.filter(s=>s.status==='approved').length/a.steps.length)*100):10;
          return`<div class="glass-card reveal" style="padding:22px;margin-bottom:16px;"><div class="card-header"><div class="card-title"><span class="card-title-icon">📋</span> Request #REQ-${String(a.request_id).padStart(4,'0')} — ${esc(a.blood_group)}, ${a.units_required} unit${a.units_required>1?'s':''}</div><span style="padding:3px 10px;border-radius:50px;font-size:.7rem;font-weight:700;color:${scC}">${(a.request_status||'pending').replace(/_/g,' ').toUpperCase()}</span></div><div class="progress-bar-track" style="margin-bottom:14px;"><div class="progress-fill" style="width:${pct}%"></div></div><div><div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--table-border);font-size:.8rem;"><span>📝</span><span style="flex:1;">Submitted — ${fmtDate(a.requested_at)}</span><span style="color:#4ade80;font-weight:700;">Done</span></div>${(a.steps||[]).map(s=>`<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--table-border);font-size:.8rem;"><span>${s.status==='approved'?'✅':s.status==='rejected'?'❌':'⏳'}</span><div style="flex:1;"><div>Step ${s.step_order}${s.approver?` — ${esc(s.approver)}`:''}</div>${s.comments?`<div style="font-size:.72rem;color:var(--text-muted);">"${esc(s.comments)}"</div>`:''}</div><span style="color:${s.status==='approved'?'#4ade80':s.status==='rejected'?'#f87171':'#fbbf24'};font-weight:700;">${esc(s.status||'Pending')}</span></div>`).join('')}${!(a.steps||[]).length?'<div style="padding:8px 0;font-size:.8rem;color:var(--text-muted);">No review steps yet — awaiting queue.</div>':''}</div></div>`;
        }).join('');initReveal();
      }
    }catch(err){handleErr(err);if(c)c.innerHTML=`<div style="padding:20px;color:#f87171;text-align:center;">⚠️ ${esc(err.message)}</div>`;}
  }

  /* ══════════════════════════════════════════════
     BADGES
  ══════════════════════════════════════════════ */
  async function loadBadges(){
    injectRefreshBtn('badgesView', loadBadges, 'Refresh');
    const $=id=>document.getElementById(id);
    try{
      const [dashData, rwdData]=await Promise.all([
        apiFetch('dashboard'),
        apiFetch('rewards')
      ]);
      const total=dashData.total_donations;
      const trust=dashData.trust_score;

      // ── 5 Achievement Badges ──
      const BADGES=[
        {icon:'🩸',name:'First Responder',desc:'First blood donation',earned:total>=1},
        {icon:'⭐',name:'5 Donations Club',desc:'5 successful donations',earned:total>=5},
        {icon:'🔟',name:'10 Donations Club',desc:'10 successful donations',earned:total>=10},
        {icon:'💎',name:'20 Donations Club',desc:'20 successful donations',earned:total>=20},
        {icon:'🏆',name:'40 Donations Club',desc:'40 successful donations',earned:total>=40},
      ];
      const earnedBadges=BADGES.filter(b=>b.earned);
      const roadmap=rwdData.reward_roadmap||[];
      const available=rwdData.available_rewards||[];
      const redeemed=rwdData.redeemed_rewards||[];

      // ── Stats Row ──
      txt('bwStatBadges',earnedBadges.length);
      txt('bwStatDonations',total);
      txt('bwStatTrust',trust);
      // Pick the closest (lowest donation) 'next' or 'locked' milestone.
      // Skip 'available' (already reached) and 'claimed' entries.
      const progressTarget=roadmap.filter(r=>r.state==='next'||r.state==='locked').sort((a,b)=>a.donations-b.donations)[0];
      const nextTarget=roadmap.filter(r=>r.state!=='claimed').sort((a,b)=>a.donations-b.donations)[0];
      txt('bwStatNext',nextTarget?nextTarget.donations+' Donations':'All Complete!');

      // ── Journey Progress Tracker ──
      if(progressTarget){
        const target=progressTarget.donations;
        // Highest claimed donation amount, or the last-claimed-donations from backend
        const base=rwdData.last_claimed_donations||0;
        const range=target-base;
        const progress=Math.max(0,Math.min(total-base,range));
        const pct=range>0?Math.round((progress/range)*100):100;
        txt('bwTrackerCount',`${total} / ${target} Donations`);
        txt('bwTrackerPct',pct+'%');
        const fill=$('bwTrackerFill');if(fill)fill.style.width=pct+'%';
        const remaining=target-total;
        if(remaining<=0){
          txt('bwTrackerRemaining',`🎉 You've reached ${target} donations! Redeem your reward above.`);
        }else{
          txt('bwTrackerRemaining',`${remaining} more donation${remaining!==1?'s':''} to reach ${target} donations.`);
        }
      }else{
        txt('bwTrackerCount',`${total} Donations`);
        txt('bwTrackerPct','100%');
        const fill=$('bwTrackerFill');if(fill)fill.style.width='100%';
        if(available.length){
          txt('bwTrackerRemaining','🎉 Rewards are ready to claim above!');
        }else{
          txt('bwTrackerRemaining','🎉 All rewards redeemed! Thank you for your support.');
        }
      }

      // ── Journey Header Badge ──
      const jhBadge=document.querySelector('.bw-jh-badge');
      if(jhBadge)jhBadge.textContent=available.length+' Reward'+(available.length!==1?'s':'')+' Available';

      // ── 3 Milestone Cards ──
      const msDefs=[
        {id:'bwMs10',aid:'bwMsAction10'},
        {id:'bwMs20',aid:'bwMsAction20'},
        {id:'bwMs40',aid:'bwMsAction40'},
      ];
      roadmap.forEach((r,idx)=>{
        if(idx>=msDefs.length)return;
        const card=$(msDefs[idx].id);
        const action=$(msDefs[idx].aid);
        if(!card||!action)return;
        card.setAttribute('data-state',r.state);

        let html='';
        if(r.state==='claimed'){
          const rd=redeemed.find(d=>d.milestone===r.milestone);
          if(rd&&rd.coupon_code){
            html=`<span class="bw-ms-status-badge bw-ms-claimed">✅ Claimed</span>
              <div class="bw-coupon-display" style="margin-top:6px;">
                <span class="bw-coupon-code">${rd.coupon_code}</span>
                <button class="bw-coupon-copy-btn" onclick="copyCoupon('${rd.coupon_code}',this)">Copy</button>
              </div>`;
          }else{
            html=`<span class="bw-ms-status-badge bw-ms-claimed">✅ Claimed</span>`;
          }
        }else if(r.state==='available'){
          html=`<button class="bw-ms-status-badge bw-ms-available" onclick="redeemReward(${r.milestone},this)">🎁 Redeem Now</button>`;
        }else if(r.state==='next'){
          html=`<span class="bw-ms-status-badge bw-ms-next">⏳ Next — ${r.donations} donations</span>`;
        }else{
          html=`<span class="bw-ms-status-badge bw-ms-locked">🔒 Locked</span>`;
        }
        action.innerHTML=html;
      });

      // ── Achievement Badges Grid ──
      const bsSub=$('bwBsSub');
      if(bsSub)bsSub.textContent=`${earnedBadges.length} of ${BADGES.length} badges unlocked`;
      const grid=$('bwBadgeGrid');
      if(grid){
        grid.innerHTML=BADGES.map(b=>b.earned
          ? `<div class="bw-badge-card earned">
              <div class="bw-badge-bg-pattern"></div>
              <div class="bw-badge-icon">${b.icon}</div>
              <div class="bw-badge-name">${b.name}</div>
              <div class="bw-badge-donations">${b.desc}</div>
              <span class="bw-badge-status-tag">✓ Earned</span>
            </div>`
          : `<div class="bw-badge-card locked">
              <div class="bw-badge-icon" style="opacity:0.4;filter:grayscale(0.4);">🔒</div>
              <div class="bw-badge-name" style="opacity:0.5;">${b.name}</div>
              <div class="bw-badge-donations">${b.desc}</div>
              <span class="bw-badge-status-tag">🔒 Locked</span>
            </div>`
        ).join('');
      }

      // ── Redemption History ──
      const hCount=$('bwHCount');
      if(hCount)hCount.textContent=redeemed.length+' redeemed';
      const hList=$('bwHistoryList');
      if(hList){
        if(!redeemed.length){
          hList.innerHTML='<div style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:24px;">No rewards redeemed yet.</div>';
        }else{
          const icons=['👕','🎫','🏆'];
          const names=['Premium T-Shirt','10% Discount Coupon','25% Discount Coupon'];
          hList.innerHTML=redeemed.map(r=>{
            const t=parseInt(r.tier);
            const date=r.redeemed_at?new Date(r.redeemed_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}):'—';
            const msText='Milestone: '+(r.milestone*10)+' donations';
            const couponHtml=r.coupon_code
              ? `<span class="bw-hi-coupon" onclick="copyCoupon('${r.coupon_code}',this)">${r.coupon_code} 📋</span>`
              : '';
            return `<div class="bw-history-item">
              <div class="bw-hi-icon">${icons[t]||'🎁'}</div>
              <div class="bw-hi-body">
                <div class="bw-hi-name">${names[t]||'Reward'}</div>
                <div class="bw-hi-meta">${msText} · ${date}</div>
                ${couponHtml}
              </div>
              <span class="bw-hi-badge">✓ Redeemed</span>
            </div>`;
          }).join('');
        }
      }
    }catch(err){
      handleErr(err);
      showToast('❌ Could not load badges: '+err.message,5000);
    }
    initReveal();
  }

  window.redeemReward = async function(milestone,btn){
    if(!btn)return;
    btn.disabled=true;
    btn.textContent='Redeeming...';
    try{
      const data=await apiFetch('redeem_reward','POST',{milestone});
      showToast('🎉 '+data.message,6000);
      loadBadges();
    }catch(err){
      handleErr(err);
      showToast('❌ '+err.message,5000);
      btn.disabled=false;
      btn.textContent='Redeem Now';
    }
  }

  window.copyCoupon = function(code,el){
    if(!el)return;
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(code).then(()=>{
        el.textContent='Copied!';
        el.classList.add('copied');
        setTimeout(()=>{el.textContent='Copy';el.classList.remove('copied');},2000);
      }).catch(()=>{
        // Fallback
        const ta=document.createElement('textarea');
        ta.value=code;
        ta.style.position='fixed';
        ta.style.opacity='0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        el.textContent='Copied!';
        el.classList.add('copied');
        setTimeout(()=>{el.textContent='Copy';el.classList.remove('copied');},2000);
      });
    }else{
      // Fallback for older browsers
      const ta=document.createElement('textarea');
      ta.value=code;
      ta.style.position='fixed';
      ta.style.opacity='0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      el.textContent='Copied!';
      el.classList.add('copied');
      setTimeout(()=>{el.textContent='Copy';el.classList.remove('copied');},2000);
    }
  }

  /* ══════════════════════════════════════════════
     PROFILE
  ══════════════════════════════════════════════ */
  async function loadProfile(){
    injectRefreshBtn('profileView', loadProfile, 'Refresh');
    try{
      const data=await apiFetch('profile');
      const p=data.profile;
      const addr=data.address||{};
      const initials=(p.full_name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const ava=document.getElementById('profileAvatarCircle');
      if(ava&&!ava.querySelector('img'))ava.textContent=initials;
      txt('profileNameDisplay',p.full_name);
      txt('profileRoleDisplay',`Donor & Recipient · ${p.blood_group||''}`);
      txt('profileIdDisplay','ID: DR-'+String(p.id).padStart(5,'0'));
      txt('pqsDonations',p.total_donations||0);
      txt('pqsTrust',p.trust_score||100);
      txt('pqsLives',(p.total_donations||0)*3);
      const avToggle=document.getElementById('availabilityToggle');
      if(avToggle){avToggle.checked=!!p.is_available;updateAvailDisplay();}
      txt('userId','DR-'+String(p.id).padStart(5,'0'));
      txt('createdAt',fmtDate(p.created_at));
      txt('totalDonations',p.total_donations||0);
      txt('trustScore',p.trust_score||100);
      val('profileFullName',p.full_name);
      val('profileEmail',p.email);
      val('profilePhone',p.phone||'');
      val('profileDob',p.date_of_birth||'');
      val('profileWeight',p.weight_kg||'');
      val('profileHeight',p.height_cm||'');
      val('lastDonation',p.last_donation_date||'');
      val('profileEmergency',p.emergency_contact||'');
      const condEl=document.getElementById('profileConditions');
      if(condEl)condEl.value=p.underlying_conditions||'';
      const genderSel=document.getElementById('profileGender');
      if(genderSel&&p.gender){const opt=genderSel.querySelector(`option[value="${p.gender}"]`);if(opt)opt.selected=true;}
      const bgSel=document.getElementById('bloodGroup');
      if(bgSel&&p.blood_group){const opt=bgSel.querySelector(`option[value="${p.blood_group}"]`);if(opt)opt.selected=true;}
      const fullAddr=[addr.address_line,addr.city,addr.state,addr.country].filter(Boolean).join(', ');
      val('profileAddress',fullAddr);
      txt('sidebarName',p.full_name);
      txt('sidebarRole',`Donor & Recipient · ${p.blood_group||''}`);
      const sa=document.getElementById('sidebarAvatar');
      if(sa&&!sa.querySelector('img'))sa.textContent=initials;

      // ── Thalassemia carrier status ──
      const carrierSection=document.getElementById('profileCarrierSection');
      const carrierBadge=document.getElementById('carrierBadge');
      const carrierLabel=document.getElementById('carrierLabel');
      if(carrierSection&&carrierBadge&&carrierLabel){
        const hasPartner = p.partner && (p.partner.status==='active'||p.partner.status==='accepted');
        carrierSection.style.display='';
        if(p.thalassemia_status==='carrier' && hasPartner){
          carrierBadge.textContent='⚠️';
          carrierBadge.style.background='rgba(248,113,113,0.15)';
          carrierBadge.style.borderColor='rgba(248,113,113,0.3)';
          carrierLabel.textContent='Thalassemia Carrier — confirmed';
          carrierLabel.style.color='#f87171';
        }else if(p.thalassemia_status==='carrier' && !hasPartner){
          carrierBadge.textContent='ℹ️';
          carrierBadge.style.background='rgba(234,179,8,0.12)';
          carrierBadge.style.borderColor='rgba(234,179,8,0.2)';
          carrierLabel.textContent='Carrier — link a partner for couple assessment';
          carrierLabel.style.color='#f59e0b';
        }else if(p.thalassemia_status==='non_carrier'){
          carrierBadge.textContent='✅';
          carrierBadge.style.background='rgba(74,222,128,0.15)';
          carrierBadge.style.borderColor='rgba(74,222,128,0.3)';
          carrierLabel.textContent='Not a carrier';
          carrierLabel.style.color='#4ade80';
        }else{
          carrierBadge.textContent='⏳';
          carrierBadge.style.background='rgba(234,179,8,0.12)';
          carrierBadge.style.borderColor='rgba(234,179,8,0.2)';
          carrierLabel.textContent='No screening data — visit a lab';
          carrierLabel.style.color='rgba(245,240,238,0.5)';
        }
      }

      // ── Partner info ──
      renderPartnerInfo(p.partner);
    }catch(err){handleErr(err);showToast('❌ Profile load failed: '+err.message,5000);}
  }

  // ── Partner link rendering ──
  function renderPartnerInfo(partner){
    const linkForm=document.getElementById('partnerLinkForm');
    const pendingActions=document.getElementById('partnerPendingActions');
    const confirmActions=document.getElementById('partnerConfirmActions');
    const linkedActions=document.getElementById('partnerLinkedActions');
    const nameDisplay=document.getElementById('partnerNameDisplay');
    const linkedName=document.getElementById('partnerLinkedName');
    const confirmName=document.getElementById('partnerConfirmName');
    const pendingMsg=document.getElementById('partnerPendingMsg');
    const emailInput=document.getElementById('partnerEmailInput');

    // Hide everything first
    if(linkForm)linkForm.style.display='';
    if(pendingActions)pendingActions.style.display='none';
    if(confirmActions)confirmActions.style.display='none';
    if(linkedActions)linkedActions.style.display='none';

    if(!partner){
      if(nameDisplay)nameDisplay.textContent='Not linked';
      return;
    }

    if(partner.status==='active'){
      if(linkForm)linkForm.style.display='none';
      if(nameDisplay)nameDisplay.textContent='Linked';
      if(linkedActions)linkedActions.style.display='';
      if(linkedName)linkedName.textContent=partner.partner_name||'Your Partner';
    }else if(partner.status==='pending'){
      if(linkForm)linkForm.style.display='none';
      if(nameDisplay)nameDisplay.textContent='Pending...';
      // Determine if current user is the requester or the target
      if(partner.action_user && parseInt(partner.action_user) === parseInt(partner.partner_id)){
        // The partner sent the request → current user can confirm
        if(confirmActions)confirmActions.style.display='';
        if(confirmName)confirmName.textContent=(partner.partner_name||'Someone')+' wants to link with you';
      }else{
        // Current user sent the request → waiting
        if(pendingActions)pendingActions.style.display='';
        if(pendingMsg)pendingMsg.textContent='Request sent — waiting for confirmation';
      }
    }else if(partner.status==='rejected'){
      if(nameDisplay)nameDisplay.textContent='Request rejected';
      if(linkForm)linkForm.style.display='';
    }
  }

  // ── Partner API actions ──
  async function sendPartnerRequest(){
    const email=document.getElementById('partnerEmailInput')?.value.trim();
    if(!email||!email.includes('@')){showToast('⚠️ Enter a valid email address.',3000);return;}
    try{
      const res=await apiFetch('link_partner','POST',{partner_email:email});
      showToast('✅ '+res.message);
      loadProfile();
    }catch(e){showToast('❌ '+e.message,5000);}
  }
  async function confirmPartnerRequest(){
    try{
      const data=await apiFetch('partner_status');
      const link=data.partner;
      if(!link||!link.id){showToast('⚠️ No pending request.',3000);return;}
      const res=await apiFetch('confirm_partner','POST',{link_id:link.id,action:'confirm'});
      showToast('✅ '+res.message);
      loadProfile();
    }catch(e){showToast('❌ '+e.message,5000);}
  }
  async function rejectPartnerRequest(){
    try{
      const data=await apiFetch('partner_status');
      const link=data.partner;
      if(!link||!link.id){showToast('⚠️ No pending request.',3000);return;}
      await apiFetch('confirm_partner','POST',{link_id:link.id,action:'reject'});
      showToast('👋 Request rejected.');
      loadProfile();
    }catch(e){showToast('❌ '+e.message,5000);}
  }
  async function unlinkPartner(){
    if(!confirm('Are you sure you want to unlink from your partner?'))return;
    try{
      const res=await apiFetch('unlink_partner','POST');
      showToast('✅ '+res.message);
      loadProfile();
    }catch(e){showToast('❌ '+e.message,5000);}
  }
  async function cancelPartnerRequest(){
    try{
      const res=await apiFetch('unlink_partner','POST');
      showToast('✅ Request cancelled.');
      loadProfile();
    }catch(e){showToast('❌ '+e.message,5000);}
  }

  const EDIT_FIELDS=['profileFullName','profileEmail','profilePhone','profileDob','profileGender','profileAddress','bloodGroup','lastDonation','profileWeight','profileHeight','profileEmergency','profileConditions'];
  let pOrig={};
  function enableEdit(){EDIT_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=false;});const eb=document.getElementById('editProfileBtn');if(eb)eb.style.display='none';const sb=document.getElementById('saveProfileBtn');if(sb)sb.style.display='';const cb=document.getElementById('cancelProfileBtn');if(cb)cb.style.display='';const fa=document.getElementById('formBottomActions');if(fa)fa.style.display='flex';clearPErrors();}
  function disableEdit(){EDIT_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=true;});const eb=document.getElementById('editProfileBtn');if(eb)eb.style.display='';const sb=document.getElementById('saveProfileBtn');if(sb)sb.style.display='none';const cb=document.getElementById('cancelProfileBtn');if(cb)cb.style.display='none';const fa=document.getElementById('formBottomActions');if(fa)fa.style.display='none';clearPErrors();}
  function saveOrig(){EDIT_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)pOrig[id]=el.value;});const a=document.getElementById('availabilityToggle');if(a)pOrig.avail=a.checked;}
  function restoreOrig(){EDIT_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)el.value=pOrig[id]||'';});const a=document.getElementById('availabilityToggle');if(a&&pOrig.avail!==undefined){a.checked=pOrig.avail;updateAvailDisplay();}}
  function clearPErrors(){document.querySelectorAll('.field-error').forEach(e=>e.textContent='');document.querySelectorAll('.form-group input,.form-group select,.form-group textarea').forEach(e=>e.style.borderColor='');}
  function setFErr(id,msg){const el=document.getElementById(id);if(el)el.style.borderColor='#f87171';const err=document.getElementById('err-'+id.replace(/^profile/i,'').toLowerCase());if(err)err.textContent=msg;return false;}
  function validateP(){clearPErrors();let ok=true;const n=document.getElementById('profileFullName');if(n&&n.value.trim().length<2){setFErr('profileFullName','Name ≥ 2 characters.');ok=false;}const e=document.getElementById('profileEmail');if(e&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value.trim())){setFErr('profileEmail','Valid email required.');ok=false;}const w=parseFloat(document.getElementById('profileWeight')?.value);if(!isNaN(w)&&(w<45||w>200)){setFErr('profileWeight','Weight: 45–200 kg.');ok=false;}const h=parseFloat(document.getElementById('profileHeight')?.value);if(!isNaN(h)&&(h<100||h>250)){setFErr('profileHeight','Height: 100–250 cm.');ok=false;}return ok;}
  function updateAvailDisplay(){const t=document.getElementById('availabilityToggle'),tx=document.getElementById('availabilityText'),tx2=document.getElementById('availabilityTextForm');if(!t)return;const on=t.checked;const dots=document.querySelectorAll('.avail-dot');dots.forEach(d=>{d.classList.toggle('avail-on',on);d.classList.toggle('avail-off',!on);});if(tx)tx.textContent=on?'Available for Donation':'Not Available';if(tx2)tx2.textContent=on?'Available for Donation':'Not Available';}
  async function saveProfile(){
    if(!validateP()){showToast('⚠️ Fix errors before saving.',4000);return;}
    const a=document.getElementById('availabilityToggle');
    const addrParts=(document.getElementById('profileAddress')?.value||'').trim().split(',').map(s=>s.trim());
    const condEl=document.getElementById('profileConditions');
    try{
      await apiFetch('update_profile','POST',{
        full_name:document.getElementById('profileFullName')?.value.trim(),
        email:document.getElementById('profileEmail')?.value.trim(),
        phone:document.getElementById('profilePhone')?.value.trim(),
        date_of_birth:document.getElementById('profileDob')?.value,
        gender:document.getElementById('profileGender')?.value,
        blood_group:document.getElementById('bloodGroup')?.value,
        weight_kg:document.getElementById('profileWeight')?.value,
        height_cm:document.getElementById('profileHeight')?.value,
        is_available:a?a.checked:true,
        emergency_contact:document.getElementById('profileEmergency')?.value.trim(),
        underlying_conditions:condEl?condEl.value.trim():'',
        address_line:addrParts[0]||'',city:addrParts[1]||'',state:addrParts[2]||'',country:addrParts[3]||'Bangladesh',
      });
      disableEdit();
      showToast('✅ Profile updated successfully!');
      const fn=document.getElementById('profileFullName')?.value.trim();
      if(fn){txt('profileNameDisplay',fn);txt('sidebarName',fn);const ava=document.getElementById('profileAvatarCircle');if(ava&&!ava.querySelector('img'))ava.textContent=fn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();const sa=document.getElementById('sidebarAvatar');if(sa&&!sa.querySelector('img'))sa.textContent=fn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();}
    }catch(e){showToast('❌ '+e.message,5000);}
  }
  on('editProfileBtn','click',()=>{saveOrig();enableEdit();});
  on('cancelProfileBtn','click',()=>{restoreOrig();disableEdit();});
  on('cancelProfileBtn2','click',()=>{restoreOrig();disableEdit();});
  on('saveProfileBtn','click',saveProfile);
  on('availabilityToggle','change',updateAvailDisplay);
  const pf=document.getElementById('profileForm');
  if(pf)pf.addEventListener('submit',(e)=>{e.preventDefault();saveProfile();});

  const avInput=document.getElementById('avatarInput'),avCircle=document.getElementById('profileAvatarCircle');
  if(avInput&&avCircle)avInput.addEventListener('change',(e)=>{
    const f=e.target.files[0];if(!f||!f.type.startsWith('image/')){showToast('⚠️ Select a valid image.');return;}
    const r=new FileReader();r.onload=(ev)=>{avCircle.innerHTML=`<img src="${ev.target.result}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;const sa=document.getElementById('sidebarAvatar');if(sa)sa.innerHTML=`<img src="${ev.target.result}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;showToast('📸 Photo updated!');};r.readAsDataURL(f);
  });

  /* ══════════════════════════════════════════════
     RATINGS PAGE
  ══════════════════════════════════════════════ */
  async function loadRatingsPage(){
    injectRefreshBtn('ratingsView', loadRatingsPage, 'Refresh');
    const sel=document.getElementById('ratingBankSelect');
    if(sel&&sel.options.length<=1){
      try{const d=await apiFetch('blood_banks');const banks=d.banks||[];sel.innerHTML=banks.length?banks.map(b=>`<option value="${b.id}">${esc(b.name)}${b.city?` (${b.city})`:''}</option>`).join(''):'<option value="">No blood banks available</option>';
      }catch(e){sel.innerHTML='<option value="">Could not load banks</option>';}
    }
  }
  on('submitRatingBtn','click',async()=>{
    const sel=document.getElementById('ratingBankSelect');
    const rating=parseInt(document.getElementById('starRatingFull')?.dataset.rating||'5');
    const review=document.getElementById('ratingFeedbackText')?.value.trim();
    if(!sel?.value){showToast('⚠️ Select a blood bank.');return;}
    try{await apiFetch('rate_bank','POST',{blood_bank_id:parseInt(sel.value),rating,review_text:review});showToast('⭐ Review submitted! Thank you.');const rt=document.getElementById('ratingFeedbackText');if(rt)rt.value='';}catch(e){showToast('❌ '+e.message,5000);}
  });
  const starFull=document.getElementById('starRatingFull');
  if(starFull){
    const labels=['','1 — Poor','2 — Fair','3 — Good','4 — Very Good','5 — Excellent'];
    starFull.querySelectorAll('[data-star]').forEach(star=>{
      star.addEventListener('click',()=>{
        const v=parseInt(star.dataset.star);
        starFull.dataset.rating=v;
        starFull.querySelectorAll('[data-star]').forEach((s,i)=>{s.style.opacity=i<v?'1':'0.35';});
        txt('starRatingLabel',labels[v]||'');
      });
    });
  }

  /* ══════════════════════════════════════════════
     NEWBORN PREDICTOR — Real Mendelian Genetics
  ══════════════════════════════════════════════ */
  function getABOAlleles(abo) {
    if (abo === 'A') return ['A', 'O'];
    if (abo === 'B') return ['B', 'O'];
    if (abo === 'AB') return ['A', 'B'];
    return ['O', 'O'];
  }
  function aboPhenotype(a, b) {
    if ((a === 'A' && b === 'A') || (a === 'A' && b === 'O') || (a === 'O' && b === 'A')) return 'A';
    if ((a === 'B' && b === 'B') || (a === 'B' && b === 'O') || (a === 'O' && b === 'B')) return 'B';
    if ((a === 'A' && b === 'B') || (a === 'B' && b === 'A')) return 'AB';
    return 'O';
  }
  function predictBloodGroup(motherBG, fatherBG) {
    var mABO = motherBG.slice(0, -1), fABO = fatherBG.slice(0, -1);
    var mRh = motherBG.slice(-1) === '+', fRh = fatherBG.slice(-1) === '+';
    var mA = getABOAlleles(mABO), fA = getABOAlleles(fABO);
    var aboProbs = {};
    var totalCombos = 0;
    for (var mi = 0; mi < mA.length; mi++) {
      for (var fi = 0; fi < fA.length; fi++) {
        var phen = aboPhenotype(mA[mi], fA[fi]);
        aboProbs[phen] = (aboProbs[phen] || 0) + 1;
        totalCombos++;
      }
    }
    for (var p in aboProbs) { aboProbs[p] = aboProbs[p] / totalCombos; }
    var pD_Mother = mRh ? 0.721 : 0;
    var pD_Father = fRh ? 0.721 : 0;
    var pRhPos = 1 - (1 - pD_Mother) * (1 - pD_Father);
    var pRhNeg = 1 - pRhPos;
    var results = [];
    var aboTypes = Object.keys(aboProbs);
    for (var i = 0; i < aboTypes.length; i++) {
      var t = aboTypes[i];
      results.push({ type: t + '+', prob: aboProbs[t] * pRhPos });
      results.push({ type: t + '-', prob: aboProbs[t] * pRhNeg });
    }
    results.sort(function (a, b) { return b.prob - a.prob; });
    var totalProb = 0;
    for (var r = 0; r < results.length; r++) totalProb += results[r].prob;
    for (var r2 = 0; r2 < results.length; r2++) results[r2].prob = Math.round(results[r2].prob / totalProb * 10000) / 100;
    return results;
  }
  function renderPrediction(results, m, f) {
    var box = document.getElementById('predictionResultBox');
    var grp = document.getElementById('predictionResultGroups');
    var det = document.getElementById('predictionResultDetail');
    var punnett = document.getElementById('predictionPunnett');
    if (!box) return;
    box.style.display = 'block';
    var mRh = m.slice(-1) === '+';
    var fRh = f.slice(-1) === '+';
    var html = '';
    var maxProb = results.length > 0 ? results[0].prob : 1;
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var pct = r.prob;
      var barW = Math.max(4, (pct / maxProb) * 100);
      html += '<div class="nb-result-row">' +
        '<div class="nb-badge nb-badge-' + (r.type.indexOf('+') > -1 ? 'pos' : 'neg') + '">' + esc(r.type) + '</div>' +
        '<div class="nb-bar-track"><div class="nb-bar-fill" style="width:' + barW + '%"></div></div>' +
        '<span class="nb-pct">' + pct.toFixed(1) + '%</span>' +
      '</div>';
    }
    grp.innerHTML = html;
    det.innerHTML = '<strong>Mother:</strong> ' + esc(m) + ' &nbsp;·&nbsp; <strong>Father:</strong> ' + esc(f) +
      '<br><span style="font-size:0.78rem;opacity:0.7;">Based on Mendelian inheritance of ABO and Rh factors.</span>';
    var mA = getABOAlleles(m.slice(0, -1));
    var fA = getABOAlleles(f.slice(0, -1));
    var rhSummary = 'Mother: <b>' + (mRh ? 'Rh+' : 'Rh-') + '</b> &nbsp; Father: <b>' + (fRh ? 'Rh+' : 'Rh-') + '</b>';
    if (!mRh && !fRh) rhSummary += ' &nbsp;→ <b>Baby: 100% Rh-</b>';
    else rhSummary += ' &nbsp;→ <b>Baby: ' + results.filter(function(r){return r.type.indexOf('+')>-1;}).reduce(function(s,r){return s+r.prob;},0).toFixed(1) + '% Rh+</b>';
    var punnettHtml = '<div class="nb-punnett-title">ABO Punnett Square — Possible Allele Combinations</div>' +
      '<div class="nb-punnett-rhnote">' + rhSummary + ' <span style="opacity:0.5;font-size:0.72rem;">(Rh inherited independently on chromosome 1)</span></div>' +
      '<table class="nb-punnett"><tr><td class="nb-pc"></td>';
    for (var pi = 0; pi < fA.length; pi++) punnettHtml += '<td class="nb-ph">' + esc(fA[pi]) + ' <span style="font-size:0.6rem;opacity:0.5;">(father)</span></td>';
    punnettHtml += '</tr>';
    for (var mi = 0; mi < mA.length; mi++) {
      punnettHtml += '<tr><td class="nb-pv">' + esc(mA[mi]) + ' <span style="font-size:0.6rem;opacity:0.5;">(mother)</span></td>';
      for (var pj = 0; pj < fA.length; pj++) {
        var phen = aboPhenotype(mA[mi], fA[pj]);
        punnettHtml += '<td class="nb-pc"><span class="nb-pc-badge">' + phen + '</span><div class="nb-pc-geno">' + esc(mA[mi]) + esc(fA[pj]) + '</div></td>';
      }
      punnettHtml += '</tr>';
    }
    punnettHtml += '</table>';
    if (punnett) punnett.innerHTML = punnettHtml;
    var prev = document.getElementById('predictionPreviewText');
    if (prev) {
      var topTypes = results.filter(function (r) { return r.prob > 0; }).slice(0, 3).map(function (r) { return r.type + ' (' + r.prob.toFixed(1) + '%)'; }).join(', ');
      prev.innerHTML = 'Based on parents\' blood groups (Mother: <strong>' + esc(m) + '</strong>, Father: <strong>' + esc(f) + '</strong>), most likely baby types: <strong>' + topTypes + '</strong>. <span class="info-icon" title="Probabilities based on Mendelian inheritance">ℹ️</span>';
    }
  }
  on('runPredictionBtn', 'click', function () {
    var m = document.getElementById('nbMotherBG')?.value;
    var f = document.getElementById('nbFatherBG')?.value;
    if (!m || !f) return;
    var results = predictBloodGroup(m, f);
    renderPrediction(results, m, f);
  });

  /* ══════════════════════════════════════════════
     ACTION CARD MODALS
  ══════════════════════════════════════════════ */
  let bankCache=[],hospCache=[];
  async function getBanks(){if(bankCache.length)return bankCache;try{const r=await fetch(`${API}?action=blood_banks`);if(r.ok){const d=await r.json();bankCache=d.banks||[];}}catch(_){}return bankCache;}
  async function getHospitals(){if(hospCache.length)return hospCache;try{const d=await apiFetch('hospitals');hospCache=d.hospitals||[];}catch(_){}return hospCache;}

  /* ── Cooldown Timer ── */
  let cooldownTimerInterval = null;
  let cooldownEndsTs = null;
  let cooldownTotalSecs = 0;

  function startCooldownWidget(cd) {
    const widget = document.getElementById('cooldownWidget');
    if (!widget) return;
    if (!cd || !cd.in_cooldown) {
      widget.style.display = 'none';
      if (cooldownTimerInterval) { clearInterval(cooldownTimerInterval); cooldownTimerInterval = null; }
      return;
    }
    widget.style.display = '';
    cooldownEndsTs = new Date(cd.cooldown_ends_at).getTime();
    cooldownTotalSecs = 30 * 86400;
    const endsFormatted = cd.cooldown_ends_at
      ? new Date(cd.cooldown_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'soon';
    const lastDonEl = document.getElementById('cooldownLastDonation');
    if (lastDonEl && cd.last_donation_date) {
      lastDonEl.textContent = 'Last donation: ' + new Date(cd.last_donation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    tickCooldown(endsFormatted);
    if (cooldownTimerInterval) clearInterval(cooldownTimerInterval);
    cooldownTimerInterval = setInterval(() => tickCooldown(endsFormatted), 1000);
  }

  function tickCooldown(endsFormatted) {
    const now = Date.now();
    const diff = Math.max(0, cooldownEndsTs - now);
    const remainingSecs = Math.floor(diff / 1000);
    const elapsed = cooldownTotalSecs - remainingSecs;
    const pct = Math.min(100, Math.max(0, Math.round((elapsed / cooldownTotalSecs) * 100)));
    const days = Math.ceil(remainingSecs / 86400);
    const hours = Math.floor((remainingSecs % 86400) / 3600);
    const mins = Math.floor((remainingSecs % 3600) / 60);
    const secs = remainingSecs % 3600 % 60;

    const ring = document.getElementById('cooldownFgRing');
    if (ring) {
      const circumference = 326.73;
      const offset = circumference - (elapsed / cooldownTotalSecs) * circumference;
      ring.style.strokeDashoffset = Math.max(0, offset);
    }

    const bar = document.getElementById('cooldownBarFill');
    if (bar) bar.style.width = pct + '%';

    const pctEl = document.getElementById('cooldownPercent');
    if (pctEl) pctEl.textContent = pct + '%';
    const bpEl = document.getElementById('cooldownBarPct');
    if (bpEl) bpEl.textContent = pct + '%';

    const dEl = document.getElementById('cooldownDays');
    if (dEl) dEl.textContent = days;

    const cdEl = document.getElementById('cooldownCountdown');
    if (cdEl) cdEl.textContent = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    const subEl = document.getElementById('cooldownSub');
    if (subEl) subEl.innerHTML = `You can donate again on <strong>${endsFormatted}</strong>`;
  }

  function showCooldownModal(cd) {
    if (!cd) return;
    const endsFormatted = cd.cooldown_ends_at
      ? new Date(cd.cooldown_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'soon';
    const endsTs = new Date(cd.cooldown_ends_at).getTime();
    const totalSecs = 30 * 86400;
    let ticker;
    const body = `
      <div class="cooldown-modal-body">
        <span class="cooldown-modal-icon">🩸⏳</span>
        <div class="cooldown-modal-title">Donation Cooldown Active</div>
        <div class="cooldown-modal-sub">Your body needs time to replenish. Thank you for your generosity!</div>
        <div class="cooldown-modal-ring">
          <svg viewBox="0 0 120 120" class="cooldown-svg">
            <circle cx="60" cy="60" r="52" class="cooldown-bg-ring" />
            <circle cx="60" cy="60" r="52" class="cooldown-fg-ring" id="modalCooldownRing" />
          </svg>
          <div class="cooldown-progress-text">
            <span class="cooldown-modal-days" id="modalCooldownDays">${cd.remaining_days}</span>
            <span class="cooldown-modal-days-unit">days left</span>
          </div>
        </div>
        <div class="cooldown-modal-countdown" id="modalCooldownCountdown">--:--:--</div>
        <div class="cooldown-modal-ends">Cooldown ends on <strong>${endsFormatted}</strong></div>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:10px;max-width:320px;margin-left:auto;margin-right:auto;">Taking a 30-day break between donations helps maintain your iron levels and overall health.</p>
        <button class="cooldown-modal-btn" onclick="document.getElementById('closeModalBtn').style.display='';document.getElementById('modalCancelBtn').style.display='';document.getElementById('modalConfirmBtn').style.display='';closeModal()">I Understand</button>
      </div>`;
    const xBtn = document.getElementById('closeModalBtn');
    const cBtn = document.getElementById('modalCancelBtn');
    const pBtn = document.getElementById('modalConfirmBtn');
    if(xBtn)xBtn.style.display='none';
    if(cBtn)cBtn.style.display='none';
    if(pBtn)pBtn.style.display='none';
    openModal('⏳ Donation Cooldown', body, null, null);
    function tick() {
      const now = Date.now();
      const diff = Math.max(0, endsTs - now);
      const rem = Math.floor(diff / 1000);
      const elapsed = totalSecs - rem;
      const days = Math.ceil(rem / 86400);
      const h = Math.floor((rem % 86400) / 3600);
      const m = Math.floor((rem % 3600) / 60);
      const s = rem % 3600 % 60;
      const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalSecs) * 100)));
      const ring = document.getElementById('modalCooldownRing');
      if (ring) {
        const circumference = 376.99;
        const offset = circumference - (elapsed / totalSecs) * circumference;
        ring.style.strokeDashoffset = Math.max(0, offset);
      }
      const dEl = document.getElementById('modalCooldownDays');
      if (dEl) dEl.textContent = days;
      const cdEl = document.getElementById('modalCooldownCountdown');
      if (cdEl) cdEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (rem <= 0) { clearInterval(ticker); if(cdEl)cdEl.textContent = '🎉 Ready!'; }
    }
    tick();
    ticker = setInterval(tick, 1000);
  }

  async function openPromiseModal(){
    // Check cooldown first
    try {
      const cdRes = await apiFetch('check_cooldown');
      if (cdRes.cooldown && cdRes.cooldown.in_cooldown) {
        showCooldownModal(cdRes.cooldown);
        return;
      }
    } catch(_) { /* proceed if check fails */ }
    const banks=await getBanks();
    const opts=banks.length?banks.map(b=>`<option value="${b.id}" style="background:#1a0a0d;color:#fff;">${esc(b.name)}${b.city?` (${b.city})`:''}</option>`).join(''):'<option value="">No blood banks available</option>';
    openModal('📅 Make a Donation Promise',`<p>Schedule your next donation. You will receive a reminder.</p><label style="display:block;margin-top:14px;"><span style="font-size:.78rem;font-weight:600;color:var(--text-muted);">Preferred Date</span><input type="date" id="promDate" min="${todayISO()}" style="${IS}"></label><label style="display:block;margin-top:12px;"><span style="font-size:.78rem;font-weight:600;color:var(--text-muted);">Blood Bank</span><select id="promBank" style="${IS}">${opts}</select></label>`,async()=>{const d=document.getElementById('promDate')?.value,b=document.getElementById('promBank')?.value;if(!d){showToast('⚠️ Select a date.');return;}if(!b){showToast('⚠️ Select a blood bank.');return;}try{const res=await apiFetch('save_promise','POST',{promise_date:d,blood_bank_id:parseInt(b)});showToast(`✅ Promise saved! Code: ${res.confirmation_code}`);loadDonations();}catch(e){showToast('❌ '+e.message,5000);}},'Save Promise');
  }

  /* ══════════════════════════════════════════════
     BLOOD REQUEST MODAL — multi-step (Kanik)
  ══════════════════════════════════════════════ */
  const brState = {
    step: 1, bloodGroup: '', city: '', map: null, marker: null,
    bankMarkers: [], availData: null, selectedBankId: null, selectedBankIds: [],
    splits: [], scenario: null,
  };

  const BD_DIVISIONS = ['Dhaka','Chittagong','Rajshahi','Khulna','Barisal','Sylhet','Rangpur','Mymensingh'];

  /* City → Division mapping for historical/city-name records.
   * More specific keys MUST come before ambiguous shorter ones. */
  const BD_CITY_DIVISION = (()=>{
    return new Map(Object.entries({
      /* Dhaka Division */
      'dhaka':'Dhaka','dhanmondi':'Dhaka','mirpur':'Dhaka','gulshan':'Dhaka','banani':'Dhaka',
      'uttara':'Dhaka','mohammadpur':'Dhaka','motijheel':'Dhaka','lalbagh':'Dhaka',
      'ramna':'Dhaka','savar':'Dhaka','gazipur':'Dhaka','narayanganj':'Dhaka',
      'tangail':'Dhaka','kishoreganj':'Dhaka','manikganj':'Dhaka','munshiganj':'Dhaka',
      'narsingdi':'Dhaka','gopalganj':'Dhaka','madaripur':'Dhaka','rajbari':'Dhaka',
      'shariatpur':'Dhaka','faridpur':'Dhaka','keraniganj':'Dhaka','demra':'Dhaka',
      'kadamtali':'Dhaka','tejgaon':'Dhaka','badda':'Dhaka','khilgaon':'Dhaka',
      'jatrabari':'Dhaka','pallabi':'Dhaka','bashundhara':'Dhaka','shahbagh':'Dhaka',
      'new market':'Dhaka',
      /* Chittagong Division */
      'chittagong':'Chittagong','coxs bazar':'Chittagong','cox\'s bazar':'Chittagong',
      'comilla':'Chittagong','brahmanbaria':'Chittagong','chandpur':'Chittagong',
      'lakshmipur':'Chittagong','noakhali':'Chittagong','feni':'Chittagong',
      'khagrachhari':'Chittagong','rangamati':'Chittagong','bandarban':'Chittagong',
      'hathazari':'Chittagong','patenga':'Chittagong','agrabad':'Chittagong',
      'sitakunda':'Chittagong','sandwip':'Chittagong','mirsharai':'Chittagong',
      'lohagara':'Chittagong','satkania':'Chittagong','boalkhali':'Chittagong',
      'pahartali':'Chittagong','kaptai':'Chittagong','fatickchhari':'Chittagong',
      'raozan':'Chittagong','chandanaish':'Chittagong','patiya':'Chittagong',
      'dighinala':'Chittagong','baghaichhari':'Chittagong','longadu':'Chittagong',
      'naikhongchhari':'Chittagong','lama':'Chittagong','chechria':'Chittagong',
      /* Rajshahi Division */
      'rajshahi':'Rajshahi','bogura':'Rajshahi','bogra':'Rajshahi','pabna':'Rajshahi',
      'sirajganj':'Rajshahi','natore':'Rajshahi','naogaon':'Rajshahi',
      'joypurhat':'Rajshahi','chapainawabganj':'Rajshahi','tanore':'Rajshahi',
      'godagari':'Rajshahi','shahjadpur':'Rajshahi','bagha':'Rajshahi',
      'puthia':'Rajshahi','durgapur':'Rajshahi','mohanpur':'Rajshahi',
      'belkuchi':'Rajshahi','santhia':'Rajshahi',
      /* Khulna Division — specific keys before generic ones */
      'khanjahan ali':'Khulna','kotwali(khulna)':'Khulna','daulatpur(khulna)':'Khulna',
      'khulna':'Khulna','jessore':'Khulna','kushtia':'Khulna','satkhira':'Khulna',
      'bagerhat':'Khulna','magura':'Khulna','jhenaidah':'Khulna','chuadanga':'Khulna',
      'meherpur':'Khulna','narail':'Khulna','rupsha':'Khulna','tala':'Khulna',
      'kaliganj':'Khulna','phultala':'Khulna','khalishpur':'Khulna',
      'sonadanga':'Khulna','sharsha':'Khulna','chougachha':'Khulna',
      'aboynagar':'Khulna','terokhada':'Khulna','dighalia':'Khulna',
      /* Barisal Division */
      'barisal':'Barisal','patuakhali':'Barisal','bhola':'Barisal','barguna':'Barisal',
      'jhalokati':'Barisal','pirojpur':'Barisal','bakerganj':'Barisal',
      'mehendiganj':'Barisal','muladi':'Barisal','banaripara':'Barisal',
      'gournadi':'Barisal','kalapara':'Barisal','dashmina':'Barisal',
      'char fasson':'Barisal','lalmohan':'Barisal','manpura':'Barisal',
      'tazumuddin':'Barisal','burhanuddin':'Barisal','betagi':'Barisal',
      'bamna':'Barisal','patharghata':'Barisal','nazipur':'Barisal','kalerpara':'Barisal',
      /* Sylhet Division — specific keys before generic ones */
      'mohanganj(syl)':'Sylhet','moulvibazar':'Sylhet','habiganj':'Sylhet','sunamganj':'Sylhet',
      'sylhet':'Sylhet','beanibazar':'Sylhet','jaflong':'Sylhet','zakiganj':'Sylhet',
      'golapganj':'Sylhet','kanairhat':'Sylhet','nabiganj':'Sylhet','fenchuganj':'Sylhet',
      'gowain':'Sylhet','bishwanath':'Sylhet','companiganj':'Sylhet',
      'sreemangal':'Sylhet','barlekha':'Sylhet','juri':'Sylhet',
      'kulaura':'Sylhet','kamalganj':'Sylhet','chunarughat':'Sylhet','ajmiriganj':'Sylhet',
      'bakhrabad':'Sylhet','shahbazpur':'Sylhet',
      /* Rangpur Division — specific keys before generic ones */
      'kotwali(rangpur)':'Rangpur','rangpur':'Rangpur','dinajpur':'Rangpur','thakurgaon':'Rangpur',
      'panchagarh':'Rangpur','nilphamari':'Rangpur','lalmonirhat':'Rangpur',
      'kurigram':'Rangpur','gaibandha':'Rangpur','badarganj':'Rangpur',
      'saidpur':'Rangpur','pirganj':'Rangpur','haragach':'Rangpur',
      'mithapukur':'Rangpur','gobindaganj':'Rangpur',
      'sundarganj':'Rangpur','saghata':'Rangpur','palashbari':'Rangpur',
      'biral':'Rangpur','birampur':'Rangpur','kaharole':'Rangpur','bocaganj':'Rangpur',
      'bholahat':'Rangpur','pirgacha':'Rangpur','ulipur':'Rangpur','phulbari':'Rangpur',
      'boda':'Rangpur','debiganj':'Rangpur','tetulia':'Rangpur',
      /* Mymensingh Division — specific keys before generic ones */
      'mohanganj(mym)':'Mymensingh','mymensingh':'Mymensingh','jamalpur':'Mymensingh','sherpur':'Mymensingh',
      'netrokona':'Mymensingh','muktagachha':'Mymensingh','ishwarganj':'Mymensingh',
      'gaffargaon':'Mymensingh','trishal':'Mymensingh','bhaluka':'Mymensingh',
      'fulbaria':'Mymensingh','nandail':'Mymensingh',
      'kochandpur':'Mymensingh','dharampasha':'Mymensingh','kalmakanda':'Mymensingh',
      'barhatta':'Mymensingh','atpara':'Mymensingh','kendua':'Mymensingh',
      'purbadhala':'Mymensingh','shibganj(mym)':'Mymensingh','dewanganj':'Mymensingh',
      'bakshiganj':'Mymensingh','islampur':'Mymensingh','sarishabari':'Mymensingh',
      'kalkini':'Mymensingh'
    }));
  })();

  /** Resolve which BD division a request belongs to */
  function _getRequestDivision(r) {
    const reqCity = (r.request_city || '').trim();
    /* Fast path: request_city already a division name */
    if (BD_DIVISIONS.includes(reqCity)) return reqCity;
    /* Search city → division map via extracted_location + request_city */
    const haystacks = [r.extracted_location, r.request_city, r.location_label, r.requester_city || '']
      .filter(Boolean).map(s => s.toLowerCase());
    for (const s of haystacks) {
      for (const [city, div] of BD_CITY_DIVISION) {
        if (s.includes(city)) return div;
      }
    }
    /* Fallback: check if any field directly mentions a division */
    for (const s of haystacks) {
      const match = BD_DIVISIONS.find(d => s.includes(d.toLowerCase()));
      if (match) return match;
    }
    return null;
  }

  function brExtractCity(address) {
    if (!address) return '';
    /* Try to extract Bangladesh division from state first */
    if (address.state) {
      const clean = address.state
        .replace(/\s*Division\s*/i, '')
        .replace(/\s*বিভাগ\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (BD_DIVISIONS.includes(clean)) return clean;
    }
    return address.city
        || address.town
        || address.village
        || address.municipality
        || address.city_district
        || address.borough
        || address.suburb
        || address.quarter
        || address.neighbourhood
        || address.county
        || address.state_district
        || (address.state
            ? address.state.replace(/\s*Division\s*/i, '').replace(/\s*বিভাগ\s*/i, '').replace(/\s+/g, ' ').trim()
            : '')
        || '';
  }

  /* ── City filter state & helpers for emergency page ── */
  let _emergencyAllRequests = [];

  function _renderEmergencyCards() {
    const container = document.getElementById('emergencyListContainer');
    if (!container) return;
    const donorGroup = window._emergencyDonorGroup || 'your blood type';
    let filtered = _emergencyAllRequests;
    const bgVal = document.getElementById('filterBloodType')?.value || 'all';
    if (bgVal && bgVal !== 'all') filtered = filtered.filter(r => (r.blood_group || '') === bgVal);
    const urgVal = document.getElementById('filterUrgency')?.value || 'all';
    if (urgVal && urgVal !== 'all') filtered = filtered.filter(r => (r.urgency || 'normal') === urgVal);
    const divVal = document.getElementById('filterCity')?.value || 'all';
    if (divVal && divVal !== 'all') filtered = filtered.filter(r => _getRequestDivision(r) === divVal);

    /* Update counter */
    const counter = document.getElementById('emergencyCounter');
    if (counter) counter.textContent = `🆘 ${filtered.length} active` + (filtered.length !== 1 ? '' : '');

    if (!_emergencyAllRequests.length) {
      container.innerHTML = `<div class="glass-card" style="padding:32px;text-align:center;color:var(--text-muted);"><div style="font-size:2.5rem;margin-bottom:12px;">🆗</div><div style="font-weight:600;font-size:.9rem;margin-bottom:4px;">No active requests</div><div style="font-size:.78rem;">No emergency requests for <strong>${esc(donorGroup)}</strong> right now.</div></div>`;
      return;
    }
    if (!filtered.length) {
      container.innerHTML = `<div class="glass-card" style="padding:32px;text-align:center;color:var(--text-muted);"><div style="font-size:2.5rem;margin-bottom:12px;">🔍</div><div style="font-weight:600;font-size:.9rem;margin-bottom:4px;">No matches</div><div style="font-size:.78rem;">No requests match the current filter selection.</div></div>`;
      return;
    }
    container.innerHTML = filtered.map(r => {
      const timeStr=timeAgo(r.requested_at);
      if (r.is_voice){
        const location=r.extracted_location||'N/A';
        const name=r.extracted_name||r.requester_name||'Someone';
        const donorCount=r.matched_donor_count||0;
        const statusColor=r.status==='pending'?'#ef4444':r.status==='processed'?'#f59e0b':'#4ade80';
        const acceptBtn = r.user_accepted
          ? '<button class="btn-offered" disabled>✅ You Offered</button>'
          : `<button class="btn-primary-sm" onclick="acceptBloodRequest(${r.id},this)">❤️ Accept & Donate</button>`;
        return `<div class="request-card glass-card" style="border-left:3px solid ${statusColor};">
  <div class="req-body">
    <div class="req-header">
      <div class="req-blood-badge" style="border-color:${statusColor}88;background:${statusColor}18;color:${statusColor};">${esc(r.blood_group)}</div>
      <div class="req-info">
        <div class="req-info-title" style="font-weight:700;">
          <span class="req-emoji">🎤</span> Voice Emergency — ${esc(name)}
          <span class="req-urgency-tag" style="background:${statusColor}18;color:${statusColor};">${(r.status||'pending').toUpperCase()}</span>
        </div>
        <div class="req-details-row">
          <span class="req-detail-item">📍 ${esc(location)}</span>
          <span class="req-detail-item">📞 ${esc(r.requester_phone||'—')}</span>
          <span class="req-detail-item">🩸 ${r.required_units||1} unit${(r.required_units||1)!==1?'s':''}</span>
        </div>
      </div>
    </div>
  </div>
  <hr class="req-details-divider"/>
  <div class="req-footer">
    <div class="req-meta">
      <span class="req-meta-item">🕐 ${timeStr}</span>
      <span class="req-meta-item">👥 ${donorCount} donor${donorCount!==1?'s':''} notified</span>
    </div>
    ${r.voice_transcript?`<div class="req-transcript">"${esc(r.voice_transcript.slice(0,120))}${r.voice_transcript.length>120?'…':''}"</div>`:''}
    ${acceptBtn}
  </div>
</div>`;
      }else{
        const location=r.extracted_location||r.request_city||'N/A';
        const name=r.extracted_name||r.requester_name||'Someone';
        const urgencyColor=r.urgency==='emergency'?'#ef4444':r.urgency==='urgent'?'#f59e0b':'#6b7280';
        const reqTypeVal  = r.request_type || 'free';
        const maxPriceVal = r.max_price_per_unit ? parseFloat(r.max_price_per_unit) : 0;
        const rtColor     = reqTypeVal==='paid'?'#fbbf24':reqTypeVal==='open'?'#60a5fa':'#6b7280';
        const rtLabel     = reqTypeVal==='paid'?'💰 Paid':reqTypeVal==='open'?'🔓 Open':'🆓 Free';
        const acceptBtn = r.user_accepted
          ? '<button class="btn-offered" disabled>✅ You Offered</button>'
          : `<button class="btn-primary-sm" data-request-type="${reqTypeVal}" data-max-price="${maxPriceVal}" onclick="acceptBloodRequest(${r.id},this)">❤️ Accept & Donate</button>`;
        const urgIcon = r.urgency==='emergency'?'🚨':r.urgency==='urgent'?'⚡':'📋';
        return `<div class="request-card glass-card" style="border-left:3px solid ${urgencyColor};">
  <div class="req-body">
    <div class="req-header">
      <div class="req-blood-badge" style="border-color:${urgencyColor}88;background:${urgencyColor}18;color:${urgencyColor};">${esc(r.blood_group)}</div>
      <div class="req-info">
        <div class="req-info-title" style="font-weight:700;">
          ${urgIcon} Blood Request — ${esc(name)}
          <span class="req-urgency-tag" style="background:${urgencyColor}18;color:${urgencyColor};">${(r.urgency||'normal').toUpperCase()}</span>
        </div>
        <div class="req-details-row">
          <span class="req-detail-item">📍 ${esc(location)}</span>
          ${r.blood_bank_name?`<span class="req-detail-item">🏦 ${esc(r.blood_bank_name)}</span>`:''}
          <span class="req-detail-item">🩸 ${r.units_required} unit${r.units_required!==1?'s':''}</span>
          <span class="req-detail-tag" style="background:${rtColor}18;border:1px solid ${rtColor}44;color:${rtColor};">${rtLabel}${maxPriceVal>0?' · Max ৳'+maxPriceVal.toFixed(0):''}</span>
        </div>
      </div>
    </div>
  </div>
  <hr class="req-details-divider"/>
  <div class="req-footer">
    <div class="req-meta">
      <span class="req-meta-item">🕐 ${timeStr}</span>
    </div>
    ${r.voice_transcript?`<div class="req-transcript">"${esc(r.voice_transcript.slice(0,120))}${r.voice_transcript.length>120?'…':''}"</div>`:''}
    ${acceptBtn}
  </div>
</div>`;
      }
    }).join('');
  }

  const brModal    = document.getElementById('bloodRequestModal');
  const brBtnNext  = document.getElementById('brBtnNext');
  const brBtnBack  = document.getElementById('brBtnBack');
  const brBtnCancel= document.getElementById('brBtnCancel');
  const brBtnSubmit= document.getElementById('brBtnSubmit');
  const brBtnClose = document.getElementById('brModalClose');

  async function openBloodRequestModal() {
    if (!brModal) return;
    brResetState();
    brModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const bgSel = document.getElementById('brBloodGroup');
    if (bgSel) bgSel.value = '';
    const rb = document.getElementById('brRequiredBy');
    if (rb) { const t = new Date(); t.setDate(t.getDate() + 1); rb.min = t.toISOString().slice(0, 10); rb.value = ''; }
    brGoStep(1);
  }

  function closeBloodRequestModal() {
    if (!brModal) return;
    brStopMapPortal();
    brModal.style.display = 'none';
    document.body.style.overflow = '';
    if (brState.map) { brState.map.remove(); brState.map = null; }
    brResetState();
  }

  function brResetState() {
    brState.step = 1; brState.map = null; brState.marker = null;
    brState.bankMarkers = []; brState.availData = null;
    brState.selectedBankId = null; brState.selectedBankIds = []; brState.splits = []; brState.scenario = null;
    const lat = document.getElementById('brLocLat');
    const lng = document.getElementById('brLocLng');
    if (lat) lat.value = ''; if (lng) lng.value = '';
    const wrap = document.getElementById('brLocationLabel');
    if (wrap) wrap.style.display = 'none';
    /* Reset payment fields */
    const rt = document.getElementById('brRequestType');
    const mp = document.getElementById('brMaxPrice');
    const mpWrap = document.getElementById('brMaxPriceWrap');
    if (rt) rt.value = 'free';
    if (mp) mp.value = '';
    if (mpWrap) mpWrap.style.display = 'none';
  }

  function brGoStep(n) {
    brState.step = n;
    const visibleTo = document.getElementById('brVisibleTo')?.value || 'both';
    const skipBank  = visibleTo === 'donor_recipient';
    document.querySelectorAll('.br-step-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('brStep' + n);
    if (panel) panel.classList.add('active');
    document.querySelectorAll('.br-steps-indicator .br-step').forEach(s => {
      const sn = parseInt(s.dataset.step);
      s.classList.remove('active', 'completed');
      if (sn === n) s.classList.add('active');
      else if (sn < n) s.classList.add('completed');
      if (skipBank && sn === 3) { s.classList.remove('active', 'completed'); s.style.opacity = '0.35'; }
      else s.style.opacity = '';
    });
    document.querySelectorAll('.br-step-line').forEach((line, i) => { line.classList.toggle('done', i < n - 1); });
    if (brBtnBack)   brBtnBack.style.display   = n > 1 ? '' : 'none';
    if (brBtnNext)   { brBtnNext.style.display = n < 4 ? '' : 'none'; brBtnNext.disabled = false; }
    if (brBtnSubmit) brBtnSubmit.style.display = n === 4 ? '' : 'none';
    if (n < 3) { brState.scenario = null; brState.selectedBankId = null; brState.selectedBankIds = []; brState.availData = null; }
    if (n === 2) brInitMap(); else brStopMapPortal();
    if (n === 3) brRunAvailabilityCheck();
    if (n === 4) brBuildConfirmSummary();
  }

  function brValidateStep1() {
    const bg = document.getElementById('brBloodGroup')?.value;
    if (!bg) { showToast('⚠️ Please select a blood group.'); return false; }
    brState.bloodGroup = bg;
    const rb = document.getElementById('brRequiredBy')?.value;
    if (!rb) { showToast('⚠️ Please select a Required By date.'); return false; }
    if (new Date(rb) <= new Date()) { showToast('⚠️ Required By must be a future date.'); return false; }
    /* Validate payment fields */
    const reqType  = document.getElementById('brRequestType')?.value || 'free';
    const maxPrice = parseFloat(document.getElementById('brMaxPrice')?.value || '0') || 0;
    if ((reqType === 'paid' || reqType === 'open') && maxPrice <= 0) {
      showToast('⚠️ Please enter a maximum price per unit for paid/open requests.'); return false;
    }
    if (reqType === 'paid' && maxPrice < 50) {
      showToast('⚠️ Minimum price is ৳50 per unit.'); return false;
    }
    if (maxPrice > 2000) {
      showToast('⚠️ Maximum allowed price is ৳2000 per unit.'); return false;
    }
    return true;
  }

  let _brMapPortalRAF = null;

  function brStartMapPortal() {
    const mapEl = document.getElementById('brMap');
    const placeholder = document.getElementById('brMapPlaceholder');
    if (!mapEl || !placeholder) return;
    function syncPosition() {
      const r = placeholder.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        mapEl.style.left = r.left + 'px'; mapEl.style.top = r.top + 'px';
        mapEl.style.width = r.width + 'px'; mapEl.style.height = r.height + 'px';
        mapEl.style.display = '';
      }
      _brMapPortalRAF = requestAnimationFrame(syncPosition);
    }
    syncPosition();
  }

  function brStopMapPortal() {
    if (_brMapPortalRAF) { cancelAnimationFrame(_brMapPortalRAF); _brMapPortalRAF = null; }
    const mapEl = document.getElementById('brMap');
    if (mapEl) mapEl.style.display = 'none';
  }

  function brInitMap() {
    const mapEl = document.getElementById('brMap');
    if (!mapEl || typeof L === 'undefined') return;
    brStartMapPortal();
    if (brState.map) { setTimeout(() => { if (brState.map) brState.map.invalidateSize(true); }, 150); return; }
    let waited = 0;
    const MAX_WAIT = 3000, POLL = 30;
    function tryInit() {
      const w = mapEl.offsetWidth, h = mapEl.offsetHeight;
      if (w < 10 || h < 10) { waited += POLL; if (waited >= MAX_WAIT) return; setTimeout(tryInit, POLL); return; }
      brState.map = L.map(mapEl, { zoomControl: true, fadeAnimation: false, zoomAnimation: false, markerZoomAnimation: false }).setView([23.8103, 90.4125], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19, crossOrigin: true }).addTo(brState.map);
      brState.map.invalidateSize(true);
      setTimeout(() => { if (brState.map) brState.map.invalidateSize(true); }, 400);
      setTimeout(() => { if (brState.map) brState.map.invalidateSize(true); }, 900);
      brState.map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        brSetMapPin(lat, lng);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
          const d = await r.json();
          brState.city = brExtractCity(d.address);
          brSetLocationLabel(d.display_name ? d.display_name.split(',').slice(0, 3).join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`, true);
        } catch (_) { brState.city = ''; brSetLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`, true); }
      });
      if (bankCache.length) brPlotBankMarkers(bankCache);
      else getBanks().then(b => brPlotBankMarkers(b));
    }
    setTimeout(tryInit, POLL);
  }

  function brPlotBankMarkers(banks) {
    if (!brState.map) return;
    brState.bankMarkers.forEach(m => m.remove());
    brState.bankMarkers = [];
    const bankIcon = L.divIcon({ className: '', html: '<div style="background:#C0162C;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(192,22,44,0.5);border:2px solid #fff;">🏥</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
    banks.forEach(b => {
      if (!b.latitude || !b.longitude) return;
      const m = L.marker([parseFloat(b.latitude), parseFloat(b.longitude)], { icon: bankIcon }).bindPopup(`<strong>${b.name}</strong><br>${b.city || ''}${b.rating_avg ? ' · ⭐ ' + parseFloat(b.rating_avg).toFixed(1) : ''}`).addTo(brState.map);
      brState.bankMarkers.push(m);
    });
  }

  function brSetMapPin(lat, lng) {
    if (!brState.map) return;
    const pinIcon = L.divIcon({ className: '', html: '<div style="background:#C0162C;color:#fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(192,22,44,0.6);border:2px solid #fff;"><span style="transform:rotate(45deg);font-size:14px;">📍</span></div>', iconSize: [30, 30], iconAnchor: [15, 30] });
    if (brState.marker) brState.marker.remove();
    brState.marker = L.marker([lat, lng], { icon: pinIcon }).addTo(brState.map);
    brState.map.invalidateSize(true);
    brState.map.setView([lat, lng], 15);
    const latEl = document.getElementById('brLocLat');
    const lngEl = document.getElementById('brLocLng');
    if (latEl) latEl.value = lat.toFixed(7); if (lngEl) lngEl.value = lng.toFixed(7);
  }

  function brSetLocationLabel(label, show) {
    const wrap = document.getElementById('brLocationLabel');
    const txt  = document.getElementById('brLocationLabelText');
    if (wrap) wrap.style.display = show ? 'flex' : 'none';
    if (txt) txt.textContent = label || '—';
  }

  on('brGpsBtn', 'click', () => {
    const btn = document.getElementById('brGpsBtn');
    const status = document.getElementById('brGpsStatus');
    if (!navigator.geolocation) { if (status) { status.textContent = '❌ Geolocation not supported.'; status.className = 'br-gps-status error'; } return; }
    if (btn) btn.disabled = true;
    if (status) { status.textContent = '⏳ Detecting location...'; status.className = 'br-gps-status loading'; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        brSetMapPin(lat, lng);
        if (brState.map) { brState.map.invalidateSize(); brState.map.setView([lat, lng], 15); }
        if (btn) btn.disabled = false;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
          const d = await r.json();
          const label = d.display_name ? d.display_name.split(',').slice(0, 3).join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          brState.city = brExtractCity(d.address);
          brSetLocationLabel(label, true);
          if (status) { status.textContent = `✅ Location detected!${brState.city ? ' City: ' + brState.city : ''}`; status.className = 'br-gps-status success'; }
        } catch (_) { brSetLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`, true); if (status) { status.textContent = '✅ Location set.'; status.className = 'br-gps-status success'; } }
      },
      (err) => {
        if (btn) btn.disabled = false;
        const msg = err.code === 1 ? 'Location permission denied. Use the search bar instead.' : err.code === 2 ? 'Location unavailable. Try the search bar.' : 'Location request timed out.';
        if (status) { status.textContent = '❌ ' + msg; status.className = 'br-gps-status error'; }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  });

  on('brLocationSearchBtn', 'click', brSearchLocation);
  on('brLocationSearch', 'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); brSearchLocation(); } });

  async function brSearchLocation() {
    const input = document.getElementById('brLocationSearch');
    const q = input?.value.trim();
    if (!q) { showToast('⚠️ Enter a location to search.'); return; }
    const status = document.getElementById('brGpsStatus');
    if (status) { status.textContent = '⏳ Searching...'; status.className = 'br-gps-status loading'; }
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
      const results = await r.json();
      if (!results.length) { if (status) { status.textContent = '❌ Location not found. Try a different name.'; status.className = 'br-gps-status error'; } return; }
      const lat = parseFloat(results[0].lat), lng = parseFloat(results[0].lon);
      const label = results[0].display_name.split(',').slice(0, 3).join(', ');
      brState.city = brExtractCity(results[0].address);
      brSetMapPin(lat, lng);
      if (brState.map) { brState.map.invalidateSize(); brState.map.setView([lat, lng], 14); }
      brSetLocationLabel(label, true);
      if (status) { status.textContent = '✅ Location found!'; status.className = 'br-gps-status success'; }
    } catch (_) { if (status) { status.textContent = '❌ Search failed.'; status.className = 'br-gps-status error'; } }
  }

  on('brClearLocation', 'click', () => {
    if (brState.marker) { brState.marker.remove(); brState.marker = null; }
    brState.city = '';
    const latEl = document.getElementById('brLocLat'), lngEl = document.getElementById('brLocLng');
    if (latEl) latEl.value = ''; if (lngEl) lngEl.value = '';
    brSetLocationLabel('', false);
    const status = document.getElementById('brGpsStatus');
    if (status) { status.textContent = ''; status.className = 'br-gps-status'; }
  });

  async function brRunAvailabilityCheck() {
    const bg = brState.bloodGroup || document.getElementById('brBloodGroup')?.value || '';
    brState.bloodGroup = bg;
    const units = parseInt(document.getElementById('brUnits')?.value || '1');
    const loading = document.getElementById('brAvailLoading');
    const result = document.getElementById('brAvailResult');
    const singleWrap = document.getElementById('brSingleBankWrap');
    const splitWrap = document.getElementById('brSplitWrap');
    const shortageWrap = document.getElementById('brShortageWrap');
    const availBg = document.getElementById('brAvailBloodGroup');
    if (availBg) availBg.textContent = bg || '(unknown)';
    if (loading) loading.style.display = 'flex';
    if (result) result.style.display = 'none';
    if (singleWrap) singleWrap.style.display = 'none';
    if (splitWrap) splitWrap.style.display = 'none';
    if (shortageWrap) shortageWrap.style.display = 'none';
    if (brBtnNext) brBtnNext.disabled = true;
    if (!bg) {
      if (loading) loading.style.display = 'none';
      if (result) { result.style.display = ''; result.className = 'br-avail-result shortage'; result.innerHTML = '⚠️ Blood group not selected.'; }
      if (brBtnNext) brBtnNext.disabled = true; return;
    }
    try {
      const data = await apiFetch('check_availability', 'POST', { blood_group: bg, units_required: units });
      brState.availData = data; brState.scenario = data.scenario;
      if (loading) loading.style.display = 'none';
      if (result) result.style.display = '';
      if (data.scenario === 'single') {
        result.className = 'br-avail-result single';
        result.innerHTML = `✅ <strong>${data.total_stock}</strong> unit(s) of <strong>${esc(bg)}</strong> available. Select a blood bank below.`;
        if (singleWrap) singleWrap.style.display = '';
        brRenderBankCards(data.banks, units);
        if (brBtnNext) brBtnNext.disabled = true;
      } else if (data.scenario === 'split') {
        result.className = 'br-avail-result split';
        result.innerHTML = `🔀 No single bank has <strong>${units}</strong> unit(s) of <strong>${esc(bg)}</strong>. Split across <strong>${data.suggestion.length}</strong> banks.`;
        if (splitWrap) splitWrap.style.display = '';
        brRenderSplitCards(data.suggestion);
        if (brBtnNext) brBtnNext.disabled = false;
      } else {
        result.className = 'br-avail-result shortage';
        result.innerHTML = `⚠️ ${esc(data.shortage_msg || 'Not enough stock.')}`;
        if (shortageWrap) shortageWrap.style.display = '';
        const smsg = document.getElementById('brShortageMsg');
        if (smsg) smsg.textContent = data.shortage_msg || '';
        if (brBtnNext) brBtnNext.disabled = true;
      }
    } catch (e) {
      if (loading) loading.style.display = 'none';
      if (result) { result.style.display = ''; result.className = 'br-avail-result shortage'; result.innerHTML = '❌ ' + esc(e.message); }
      if (brBtnNext) brBtnNext.disabled = true;
    }
  }

  function brRenderBankCards(banks, units) {
    const wrap = document.getElementById('brSingleBankWrap');
    if (!wrap) return;
    wrap.querySelectorAll('.br-bank-card').forEach(c => c.remove());
    const label = wrap.querySelector('.br-label');
    /* Multi-select hint */
    let hintEl = wrap.querySelector('.br-multiselect-hint');
    if (!hintEl) {
      hintEl = document.createElement('div');
      hintEl.className = 'br-multiselect-hint';
      hintEl.style.cssText = 'font-size:.75rem;color:var(--text-muted);margin-bottom:8px;padding:6px 10px;background:rgba(96,165,250,.08);border-radius:8px;border-left:3px solid #60a5fa;';
      hintEl.textContent = 'Tip: Select multiple banks if one bank does not have enough units. Click a selected bank again to deselect it.';
      if (label) label.after(hintEl); else wrap.prepend(hintEl);
    }
    /* Counter label */
    let counterEl = wrap.querySelector('.br-selection-counter');
    if (!counterEl) {
      counterEl = document.createElement('div');
      counterEl.className = 'br-selection-counter';
      counterEl.style.cssText = 'font-size:.78rem;font-weight:600;color:#60a5fa;margin-bottom:8px;min-height:20px;';
      wrap.appendChild(counterEl);
    }
    function updateCounter() {
      const sel = brState.selectedBankIds;
      const totalSel = sel.reduce((s, x) => s + Math.min(x.available_units, units), 0);
      if (!sel.length) { counterEl.textContent = ''; return; }
      const ok = totalSel >= units;
      counterEl.style.color = ok ? '#4ade80' : '#fbbf24';
      counterEl.textContent = ok
        ? `✅ ${sel.length} bank${sel.length > 1 ? 's' : ''} selected — ${totalSel} unit${totalSel !== 1 ? 's' : ''} covered`
        : `⚠️ ${sel.length} bank${sel.length > 1 ? 's' : ''} selected — ${totalSel}/${units} units covered, select more`;
      if (brBtnNext) brBtnNext.disabled = !ok;
    }
    banks.forEach(b => {
      const card = document.createElement('div');
      card.className = 'br-bank-card';
      card.dataset.bankId = b.bank_id;
      const stockClass = b.available_units <= 2 ? 'low' : '';
      card.innerHTML = `<div class="br-bank-icon">🏥</div><div class="br-bank-info"><div class="br-bank-name">${esc(b.bank_name)}</div><div class="br-bank-meta">${esc(b.city || '—')}${b.rating_avg ? ' · ⭐ ' + b.rating_avg : ''}</div></div><div class="br-bank-stock ${stockClass}">${b.available_units} unit${b.available_units !== 1 ? 's' : ''}</div>`;
      card.addEventListener('click', () => {
        const idx = brState.selectedBankIds.findIndex(x => x.bank_id === b.bank_id);
        if (idx >= 0) {
          /* Deselect */
          brState.selectedBankIds.splice(idx, 1);
          card.classList.remove('selected');
        } else {
          /* Select */
          brState.selectedBankIds.push({ bank_id: b.bank_id, bank_name: b.bank_name, city: b.city, available_units: b.available_units });
          card.classList.add('selected');
        }
        /* Keep legacy selectedBankId for single-bank compat */
        brState.selectedBankId = brState.selectedBankIds.length === 1 ? brState.selectedBankIds[0].bank_id : null;
        updateCounter();
      });
      if (label) label.after(card); else wrap.appendChild(card);
    });
    if (brBtnNext) brBtnNext.disabled = true;
  }

  function brRenderSplitCards(suggestion) {
    const container = document.getElementById('brSplitCards');
    if (!container) return;
    container.innerHTML = '';
    brState.splits = suggestion.map(s => ({ ...s }));
    suggestion.forEach((s, i) => {
      const card = document.createElement('div');
      card.className = 'br-split-card';
      card.innerHTML = `<div class="br-split-num">${i + 1}</div><div class="br-split-info"><div class="br-split-bank-name">${esc(s.bank_name)}</div><div class="br-split-bank-meta">${esc(s.city || '—')}${s.rating_avg ? ' · ⭐ ' + s.rating_avg : ''}</div></div><div class="br-split-units-wrap"><span class="br-split-units-label">Units:</span><input type="number" class="br-split-units-input" data-idx="${i}" min="1" max="10" value="${s.units}" /></div>`;
      const input = card.querySelector('.br-split-units-input');
      input.addEventListener('change', () => { const v = Math.max(1, parseInt(input.value) || 1); input.value = v; brState.splits[i].units = v; });
      container.appendChild(card);
    });
  }

  on('brEscalateBtn', 'click', () => { closeBloodRequestModal(); setTimeout(openEmergencyVoiceModal, 200); });

  function brBuildConfirmSummary() {
    const summary = document.getElementById('brConfirmSummary');
    if (!summary) return;
    const units = document.getElementById('brUnits')?.value || '1';
    const urgency = document.getElementById('brUrgency')?.value || 'normal';
    const reqBy = document.getElementById('brRequiredBy')?.value || '';
    const notes = document.getElementById('brNotes')?.value.trim() || '—';
    const visibleTo = document.getElementById('brVisibleTo')?.value || 'both';
    const locLabel = document.getElementById('brLocationLabelText')?.textContent || '—';
    const scenario = brState.scenario;
    const bg = brState.bloodGroup || document.getElementById('brBloodGroup')?.value || '—';
    const visMap = { both: 'Everyone (Donors & Blood Banks)', blood_bank: 'Blood Banks only', donor_recipient: 'Donors & Recipients only' };
    const urgMap = { normal: '🟢 Normal', urgent: '🟡 Urgent', emergency: '🔴 Emergency' };
    let bankRow = '';
    if (visibleTo === 'donor_recipient') {
      bankRow = `<div class="br-confirm-row"><div class="br-confirm-key">Bank</div><div class="br-confirm-val" style="color:var(--text-muted);">Not required — donors will respond directly</div></div>`;
    } else if (scenario === 'single' && brState.selectedBankIds.length && brState.availData) {
      if (brState.selectedBankIds.length === 1) {
        const b = brState.selectedBankIds[0];
        bankRow = `<div class="br-confirm-row"><div class="br-confirm-key">Blood Bank</div><div class="br-confirm-val"><strong>${esc(b.bank_name)}</strong>${b.city ? ' · ' + esc(b.city) : ''}</div></div>`;
      } else {
        const splitHtml = brState.selectedBankIds.map(b => `<div class="br-confirm-split-item">${esc(b.bank_name)}${b.city ? ' · ' + esc(b.city) : ''}</div>`).join('');
        bankRow = `<div class="br-confirm-row"><div class="br-confirm-key">Blood Banks (${brState.selectedBankIds.length})</div><div class="br-confirm-val"><div class="br-confirm-split-list">${splitHtml}</div></div></div>`;
      }
    } else if (scenario === 'split') {
      const splitHtml = brState.splits.map(s => `<div class="br-confirm-split-item">${esc(s.bank_name)} — <strong>${s.units} unit${s.units !== 1 ? 's' : ''}</strong></div>`).join('');
      bankRow = `<div class="br-confirm-row"><div class="br-confirm-key">Split Banks</div><div class="br-confirm-val"><div class="br-confirm-split-list">${splitHtml}</div></div></div>`;
    }
    const reqType  = document.getElementById('brRequestType')?.value || 'free';
    const maxPrice = parseFloat(document.getElementById('brMaxPrice')?.value || '0') || 0;
    const rtLabels = { free: '🆓 Free — donors must not charge', paid: '💰 Paid — you will pay donors', open: '🔓 Open — free or paid both welcome' };
    const priceRow = reqType !== 'free' && maxPrice > 0
      ? `<div class="br-confirm-row"><div class="br-confirm-key">Max Price</div><div class="br-confirm-val"><strong style="color:#fbbf24;">৳${maxPrice.toFixed(0)} per unit</strong></div></div>`
      : '';
    summary.innerHTML = `
      <div class="br-confirm-row"><div class="br-confirm-key">Blood Group</div><div class="br-confirm-val"><strong>${esc(bg)}</strong></div></div>
      <div class="br-confirm-row"><div class="br-confirm-key">Units</div><div class="br-confirm-val">${esc(units)} unit${parseInt(units) !== 1 ? 's' : ''}</div></div>
      <div class="br-confirm-row"><div class="br-confirm-key">Urgency</div><div class="br-confirm-val">${urgMap[urgency] || urgency}</div></div>
      <div class="br-confirm-row"><div class="br-confirm-key">Required By</div><div class="br-confirm-val">${fmtDate(reqBy)}</div></div>
      <div class="br-confirm-row"><div class="br-confirm-key">Request Type</div><div class="br-confirm-val">${esc(rtLabels[reqType] || reqType)}</div></div>
      ${priceRow}
      <div class="br-confirm-row"><div class="br-confirm-key">Visible To</div><div class="br-confirm-val">${esc(visMap[visibleTo] || visibleTo)}</div></div>
      <div class="br-confirm-row"><div class="br-confirm-key">Location</div><div class="br-confirm-val">${esc(locLabel)}${brState.city ? ' <span style="background:rgba(96,165,250,.15);color:#60a5fa;padding:1px 8px;border-radius:50px;font-size:.72rem;margin-left:6px;">📍 ' + esc(brState.city) + '</span>' : ''}</div></div>
      ${bankRow}
      <div class="br-confirm-row"><div class="br-confirm-key">Notes</div><div class="br-confirm-val">${esc(notes)}</div></div>`;
  }

  if (brBtnNext) brBtnNext.addEventListener('click', () => {
    const s = brState.step;
    const visibleTo = document.getElementById('brVisibleTo')?.value || 'both';
    const skipBank = visibleTo === 'donor_recipient';
    if (s === 1) { if (!brValidateStep1()) return; }
    if (s === 3) {
      if (brState.scenario === 'shortage') { showToast('⚠️ Cannot proceed — insufficient stock.'); return; }
      if (brState.scenario === 'single') {
        if (!brState.selectedBankIds.length) { showToast('⚠️ Please select at least one blood bank.'); return; }
        const units = parseInt(document.getElementById('brUnits')?.value || '1');
        const totalSel = brState.selectedBankIds.reduce((s, x) => s + Math.min(x.available_units, units), 0);
        if (totalSel < units) { showToast('⚠️ Selected banks do not cover all required units. Select more banks.'); return; }
      }
    }
    const nextStep = (s === 2 && skipBank) ? 4 : s + 1;
    brGoStep(nextStep);
  });

  if (brBtnBack) brBtnBack.addEventListener('click', () => {
    const s = brState.step;
    const visibleTo = document.getElementById('brVisibleTo')?.value || 'both';
    const skipBank = visibleTo === 'donor_recipient';
    const prevStep = (s === 4 && skipBank) ? 2 : s - 1;
    brGoStep(prevStep);
  });

  if (brBtnCancel) brBtnCancel.addEventListener('click', closeBloodRequestModal);
  if (brBtnClose) brBtnClose.addEventListener('click', closeBloodRequestModal);
  if (brModal) brModal.addEventListener('click', (e) => { if (e.target === brModal) closeBloodRequestModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && brModal?.style.display === 'flex') closeBloodRequestModal(); });

  if (brBtnSubmit) brBtnSubmit.addEventListener('click', async () => {
    brBtnSubmit.disabled = true;
    brBtnSubmit.innerHTML = '⏳ Submitting...';
    const units = parseInt(document.getElementById('brUnits')?.value || '1');
    const urgency = document.getElementById('brUrgency')?.value || 'normal';
    const reqBy = document.getElementById('brRequiredBy')?.value || null;
    const notes = document.getElementById('brNotes')?.value.trim() || '';
    const visibleTo = document.getElementById('brVisibleTo')?.value || 'both';
    const locLat = document.getElementById('brLocLat')?.value || null;
    const locLng = document.getElementById('brLocLng')?.value || null;
    const locLabel = document.getElementById('brLocationLabelText')?.textContent || null;
    let requestCity = brState.city || null;
    if (!requestCity && locLabel && locLabel !== '—') {
      const parts = locLabel.split(',').map(p => p.trim()).filter(Boolean);
      requestCity = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || null;
    }
    const bg = brState.bloodGroup || document.getElementById('brBloodGroup')?.value || '';
    const reqType  = document.getElementById('brRequestType')?.value || 'free';
    const maxPrice = parseFloat(document.getElementById('brMaxPrice')?.value || '0') || null;
    const payload = { blood_group: bg, units_required: units, urgency, required_by: reqBy, notes, visible_to: visibleTo, location_lat: locLat ? parseFloat(locLat) : null, location_lng: locLng ? parseFloat(locLng) : null, location_label: locLabel && locLabel !== '—' ? locLabel : null, request_city: requestCity, request_type: reqType, max_price_per_unit: (reqType !== 'free' && maxPrice) ? maxPrice : null };
    try {
      let res;
      /* ── Always ONE single request — no splits.
         Banks offer blood AFTER the request is created via the bank offer flow.
         units_fulfilled tracks progress across multiple donors/banks. ── */
      if (visibleTo === 'donor_recipient') {
        payload.blood_bank_id = null;
        payload.units_required = units;
        res = await apiFetch('submit_request', 'POST', payload);
        showToast(`✅ Request posted! Donors can now see your request. ID: #REQ-${String(res.request_id).padStart(4, '0')}`, 5000);
      } else {
        payload.blood_bank_id = brState.selectedBankIds[0]?.bank_id || brState.selectedBankId || null;
        payload.units_required = units;
        delete payload.splits;
        res = await apiFetch('submit_request', 'POST', payload);
        const reqLabel = `#REQ-${String(res.request_id).padStart(4, '0')}`;
        const bankCount = brState.selectedBankIds.length;
        const msg = visibleTo === 'both'
          ? `✅ Request ${reqLabel} posted! Blood banks and donors can see it.`
          : bankCount > 1
            ? `✅ Request ${reqLabel} submitted! ${bankCount} banks can offer blood for this request.`
            : `✅ Request ${reqLabel} submitted!`;
        showToast(msg, 5000);
      }
      closeBloodRequestModal(); loadDashboard(); loadMyRequests();
    } catch (e) { showToast('❌ ' + e.message, 6000); brBtnSubmit.disabled = false; brBtnSubmit.innerHTML = '<span>🩸</span> Submit Request'; }
  });

  function openSubmitRequestModal() { openBloodRequestModal(); }
  window.openSubmitRequestModal = openSubmitRequestModal;

  async function openEmergencyVoiceModal(){
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!supported) {
      openModal('🎤 Emergency Voice Request',
        `<p>Voice recognition not supported in this browser.</p>
         <p style="margin-top:12px;">Please call our emergency hotline:</p>
         <div style="font-size:1.4rem;font-weight:800;color:var(--red-light);margin-top:10px;text-align:center;">📞 16000</div>
         <p style="font-size:.78rem;color:var(--text-muted);margin-top:8px;">Available 24/7 · Free call</p>`,
        () => showToast('Emergency hotline: 16000'), 'Got It');
      return;
    }

    // Pre-fill phone from profile field or fetch
    let prefillPhone = document.getElementById('profileEmergency')?.value || '';
    if (!prefillPhone) {
      try { const pd = await apiFetch('profile'); prefillPhone = pd.profile?.emergency_contact || ''; } catch (_) {}
    }

    let currentLang = 'en'; // 'en' or 'bn'

    function buildModalContent(){
      const isBn=currentLang==='bn';
      return `
      <div class="voice-lang-bar">
        <button class="voice-lang-btn ${!isBn?'active':''}" data-lang="en">EN</button>
        <button class="voice-lang-btn ${isBn?'active':''}" data-lang="bn">বাংলা</button>
      </div>
      <p style="margin-bottom:14px;font-size:.9rem;">${isBn?'জরুরি রক্তের অনুরোধ জানাতে পরিষ্কারভাবে বলুন। নিকটস্থ রক্তদাতাদের তাৎক্ষণিকভাবে জানানো হবে।':'Speak clearly to dispatch an emergency blood request. Nearby donors will be notified immediately.'}</p>
      <label style="display:block;margin-bottom:14px;">
        <span style="font-size:.78rem;font-weight:600;color:var(--text-muted);">📞 ${isBn?'আপনার মোবাইল নম্বর *':'Your Phone Number *'}</span>
        <input type="tel" id="emergencyPhoneInput" value="${esc(prefillPhone)}" placeholder="${isBn?'যেমন: +8801712345678':'e.g. +8801712345678'}"
          style="background:var(--input-bg);border:1px solid var(--input-border);padding:10px 14px;border-radius:10px;width:100%;margin-top:6px;color:var(--text-primary);font-family:Outfit,sans-serif;">
      </label>
      <div style="display:flex;gap:12px;margin-bottom:14px;">
        <label style="flex:1;">
          <span style="font-size:.78rem;font-weight:600;color:var(--text-muted);">🩸 ${isBn?'প্রয়োজনীয় ইউনিট':'Required Units'}</span>
          <select id="emergencyUnitsInput" style="background:var(--input-bg);border:1px solid var(--input-border);padding:10px 14px;border-radius:10px;width:100%;margin-top:6px;color:var(--text-primary);font-family:Outfit,sans-serif;">
            ${[1,2,3,4,5,6,7,8,9,10].map(u=>`<option value="${u}">${u} ${isBn?'ইউনিট':'unit'}</option>`).join('')}
          </select>
        </label>
        <label style="flex:2;">
          <span style="font-size:.78rem;font-weight:600;color:var(--text-muted);">🏦 ${isBn?'পছন্দের ব্লাড ব্যাংক':'Preferred Blood Bank'}</span>
          <select id="emergencyBankInput" style="background:var(--input-bg);border:1px solid var(--input-border);padding:10px 14px;border-radius:10px;width:100%;margin-top:6px;color:var(--text-primary);font-family:Outfit,sans-serif;">
            <option value="0">${isBn?'যে কোনো':'Any Available'}</option>
          </select>
        </label>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:14px;">
        <button id="voiceRecordBtn" class="voice-record-btn" style="flex:1;">
          <span class="voice-btn-icon">🎤</span>
          <span class="voice-btn-text">${isBn?'রেকর্ড শুরু করুন':'Start Recording'}</span>
        </button>
      </div>
      <div id="voiceStatus" class="voice-status" style="padding:10px 14px;background:rgba(192,22,44,.08);border-radius:10px;color:var(--text-muted);font-size:.82rem;text-align:center;margin-bottom:12px;">
        <span class="voice-status-dot"></span> ${isBn?'প্রস্তুত — "রেকর্ড শুরু করুন" বাটনে ক্লিক করে জরুরি বার্তা দিন':'Ready — press "Start Recording" and speak your emergency'}
      </div>
      <div id="voiceWaves" class="voice-waves" style="display:none;margin-bottom:12px;justify-content:center;align-items:center;gap:4px;height:40px;">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <label style="display:block;margin-bottom:6px;">
        <span style="font-size:.78rem;font-weight:600;color:var(--text-muted);">📝 ${isBn?'লিখিত রূপ':'Transcript'}</span>
        <textarea id="voiceTranscriptBox" rows="3" readonly
          placeholder="${isBn?'আপনার বক্তব্য এখানে দেখা যাবে...':'Your speech will appear here after recording...'}"
          style="background:var(--input-bg);border:1px solid var(--input-border);padding:10px 14px;border-radius:10px;width:100%;margin-top:6px;color:var(--text-primary);font-family:Outfit,sans-serif;resize:vertical;"></textarea>
      </label>
      <button id="voiceSubmitBtn" class="btn-modal-confirm" style="display:none;width:100%;margin-top:12px;" disabled>🚨 ${isBn?'জরুরি অনুরোধ পাঠান':'Submit Emergency'}</button>
      <div id="voiceResultBox" style="display:none;margin-top:10px;padding:12px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:10px;font-size:.82rem;"></div>
      `;
    }

    function renderModal(){
      mBody.innerHTML=buildModalContent();
      // Re-bind lang toggle events
      document.querySelectorAll('.voice-lang-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
          document.querySelectorAll('.voice-lang-btn').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          currentLang=btn.getAttribute('data-lang');
          // Reset recording state on language switch
          stopVoiceRecognition();
          finalTranscript='';
          isRecording=false;
          if (mCancel) mCancel.textContent = currentLang==='bn'?'বাতিল':'Cancel';
          renderModal();
          rebindAfterRender();
        });
      });
      rebindAfterRender();
    }

    let recognition = null;
    let isRecording = false;
    let finalTranscript = '';
    let recordBtn, statusEl, wavesEl, transcriptBox, phoneInput, submitBtn, resultBox;

    function rebindAfterRender(){
      recordBtn=document.getElementById('voiceRecordBtn');
      statusEl=document.getElementById('voiceStatus');
      wavesEl=document.getElementById('voiceWaves');
      transcriptBox=document.getElementById('voiceTranscriptBox');
      phoneInput=document.getElementById('emergencyPhoneInput');
      submitBtn=document.getElementById('voiceSubmitBtn');
      resultBox=document.getElementById('voiceResultBox');
      bindVoiceEvents();
      // Fetch blood banks for dropdown
      const bankSel = document.getElementById('emergencyBankInput');
      if (bankSel && !bankSel.dataset.loaded) {
        bankSel.dataset.loaded = '1';
        apiFetch('blood_banks').then(d => {
          (d.banks||[]).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.name + (b.city ? ' (' + b.city + ')' : '');
            bankSel.appendChild(opt);
          });
        }).catch(() => {});
      }
    }

    function updateStatus(text, type) {
      if (!statusEl) return;
      statusEl.innerHTML = `<span class="voice-status-dot ${type || ''}"></span> ${text}`;
    }

    function setRecordingState(recording) {
      isRecording = recording;
      if (!recordBtn) return;
      const icon = recordBtn.querySelector('.voice-btn-icon');
      const text = recordBtn.querySelector('.voice-btn-text');
      const isBn=currentLang==='bn';
      if (recording) {
        recordBtn.classList.add('recording');
        if (icon) icon.textContent = '🔴';
        if (text) text.textContent = isBn?'থামুন':'Stop Recording';
        if (wavesEl) { wavesEl.style.display = 'flex'; wavesEl.classList.add('active'); }
      } else {
        recordBtn.classList.remove('recording');
        if (icon) icon.textContent = '🎤';
        if (text) text.textContent = isBn?'রেকর্ড শুরু করুন':'Start Recording';
        if (wavesEl) { wavesEl.style.display = 'none'; wavesEl.classList.remove('active'); }
      }
    }

    function startVoiceRecognition() {
      if (recognition) { try { recognition.abort(); } catch (_) {} }
      recognition = new SR();
      recognition.lang = currentLang==='bn'?'bn-BD':'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      const isBn=currentLang==='bn';

      recognition.onstart = () => {
        setRecordingState(true);
        updateStatus(isBn?'🎤 শুনছে... আপনার জরুরি বার্তা পরিষ্কারভাবে বলুন':'🎤 Listening... speak your emergency clearly', 'listening');
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) { finalTranscript += r[0].transcript + ' '; }
          else { interim += r[0].transcript; }
        }
        if (transcriptBox) { transcriptBox.value = finalTranscript + interim; transcriptBox.readOnly = false; }
      };

      recognition.onend = () => {
        setRecordingState(false);
        if (finalTranscript.trim()) {
          updateStatus(isBn?'✅ লিখিত রূপ সম্পন্ন। পর্যালোচনা করে পাঠান।':'✅ Transcription complete. Review and submit.', 'done');
          if (transcriptBox) transcriptBox.value = finalTranscript;
          if (submitBtn) { submitBtn.style.display = ''; submitBtn.disabled = false; }
        } else {
          updateStatus(isBn?'⚠️ কোনো বক্তব্য শনাক্ত হয়নি। আবার চেষ্টা করুন বা 16000 এ কল করুন।':'⚠️ No speech detected. Try again or call 16000.', 'error');
        }
      };

      recognition.onerror = (event) => {
        setRecordingState(false);
        const msg = event.error === 'no-speech'
          ? (isBn?'⚠️ কোনো বক্তব্য শনাক্ত হয়নি। আবার চেষ্টা করুন।':'⚠️ No speech detected. Try again.')
          : event.error === 'aborted'
            ? (isBn?'রেকর্ডিং বাতিল করা হয়েছে।':'Recording cancelled.')
            : (isBn?'⚠️ ভয়েস রিকগনিশনে সমস্যা। 16000 এ কল করুন।':'⚠️ Voice recognition error. Call 16000.');
        updateStatus(msg, 'error');
      };

      try { recognition.start(); } catch (e) { updateStatus(isBn?'⚠️ রেকর্ডিং শুরু করা যায়নি। 16000 এ কল করুন।':'⚠️ Could not start recording. Call 16000.', 'error'); }
    }

    function stopVoiceRecognition() {
      if (recognition) { try { recognition.stop(); } catch (_) {} try { recognition.abort(); } catch (_) {} recognition = null; }
      setRecordingState(false);
    }

    function bindVoiceEvents(){
      if(!recordBtn)return;

      recordBtn.addEventListener('click', () => {
        if (isRecording) {
          stopVoiceRecognition();
          if (!finalTranscript.trim()) updateStatus(currentLang==='bn'?'⏹️ রেকর্ডিং বন্ধ। আবার চেষ্টা করতে রেকর্ড বাটনে ক্লিক করুন।':'⏹️ Recording stopped. Press record to try again.', 'idle');
        } else {
          finalTranscript = '';
          if (transcriptBox) { transcriptBox.value = ''; transcriptBox.readOnly = false; }
          if (resultBox) resultBox.style.display = 'none';
          if (submitBtn) { submitBtn.style.display = 'none'; submitBtn.disabled = true; }
          startVoiceRecognition();
        }
      });

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const phone = phoneInput?.value?.trim() || '';
          const transcript = transcriptBox?.value?.trim() || finalTranscript.trim();
          const requiredUnits = parseInt(document.getElementById('emergencyUnitsInput')?.value || '1', 10);
          const bloodBankId = parseInt(document.getElementById('emergencyBankInput')?.value || '0', 10);
          const isBn=currentLang==='bn';
          if (!phone) {
            showToast(isBn?'⚠️ জরুরি প্রয়োজনে ফোন নম্বর প্রয়োজন।':'⚠️ Phone number is required for emergency.', 4000);
            if (phoneInput) phoneInput.style.borderColor = '#f87171';
            return;
          }
          if (!transcript) {
            showToast(isBn?'⚠️ অনুগ্রহ করে প্রথমে আপনার জরুরি বার্তা রেকর্ড করুন।':'⚠️ Please record your emergency message first.', 4000);
            return;
          }
          submitBtn.disabled = true;
          submitBtn.textContent = isBn?'⏳ পাঠানো হচ্ছে...':'⏳ Dispatching...';
          try {
            const res = await apiFetch('emergency_voice', 'POST', { transcript, phone, lang:currentLang, required_units: requiredUnits, blood_bank_id: bloodBankId });
            closeModal();
            showToast(isBn?`🚨 জরুরি অনুরোধ প্রেরিত! ${res.donors_notified} জন রক্তদাতাকে জানানো হয়েছে।`:`🚨 ${res.message}`, 6000);
            const ev = document.getElementById('emergencyView');
            if (ev && ev.classList.contains('active')) loadEmergency();
          } catch (e) {
            showToast('❌ '+e.message, 5000);
            if (resultBox) {
              resultBox.style.display = '';
              resultBox.innerHTML = `❌ ${isBn?'ব্যর্থ:':'Failed:'} ${esc(e.message)}`;
            }
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isBn?'🚨 জরুরি অনুরোধ পাঠান':'🚨 Submit Emergency';
          }
        });
      }
    }

    openModal(currentLang==='bn'?'🎤 জরুরি ভয়েস অনুরোধ':'🎤 Emergency Voice Request', '', null, null);
    if (mCancel) mCancel.textContent = currentLang==='bn'?'বাতিল':'Cancel';
    if (mConfirm) mConfirm.style.display = 'none';
    renderModal();

    const closeHandler = () => { stopVoiceRecognition(); if (mClose) mClose.removeEventListener('click', closeHandler); if (mCancel) mCancel.removeEventListener('click', closeHandler); };
    if (mClose) mClose.addEventListener('click', closeHandler);
    if (mCancel) mCancel.addEventListener('click', closeHandler);
  }

  async function openRateBankModal(){
    const banks=await getBanks();
    const opts=banks.length?banks.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join(''):'<option value="">No banks</option>';
    openModal('⭐ Rate a Blood Bank',`<select id="rateBankSelM" style="${IS}">${opts}</select><div id="starRatingM" data-rating="5" style="display:flex;gap:8px;margin-top:12px;font-size:1.5rem;cursor:pointer;">${[1,2,3,4,5].map(i=>`<span data-star="${i}">⭐</span>`).join('')}</div><textarea id="rateFeedbackM" rows="3" placeholder="Your feedback..." style="${IS}margin-top:12px;resize:vertical;"></textarea>`,async()=>{const b=document.getElementById('rateBankSelM')?.value;const sr=document.getElementById('starRatingM');const rt=document.getElementById('rateFeedbackM')?.value||'';if(!b){showToast('⚠️ Select a blood bank.');return;}try{await apiFetch('rate_bank','POST',{blood_bank_id:parseInt(b),rating:parseInt(sr?.dataset.rating||'5'),review_text:rt});showToast('⭐ Thank you for rating!');}catch(e){showToast('❌ '+e.message,5000);}},'Submit Rating');
    setTimeout(()=>{document.querySelectorAll('#starRatingM [data-star]').forEach(s=>{s.addEventListener('click',()=>{const v=parseInt(s.dataset.star);const container=document.getElementById('starRatingM');if(container){container.dataset.rating=v;container.querySelectorAll('[data-star]').forEach((x,i)=>{x.style.opacity=i<v?'1':'0.35';});}});});},100);
  }

  async function openAntibodyModal(){
    try{const d=await apiFetch('antibody');const ab=d.antibodies||[];if(!ab.length){openModal('🧪 Antibody Profile','<p style="color:var(--text-muted);">No antibody records found.</p>');return;}
    openModal('🧪 My Antibody Profile',`<div>${ab.map(a=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--table-border);font-size:.84rem;"><span style="font-weight:600;">${esc(a.antibody_name)}</span><span style="color:${a.is_donor?'#60a5fa':'#4ade80'}">${a.is_donor?'Positive':'Negative'}</span><span style="color:var(--text-muted);font-size:.72rem;">${esc(a.detected_date)}</span></div>`).join('')}</div>`,()=>showToast('🧪 Profile downloaded as PDF.'),'Download PDF');
    }catch(e){openModal('🧪 Antibody Profile',`<p style="color:#f87171;">${e.message}</p>`);}
  }

  function openHealthTipsModal(){
    openModal('🥗 Health Tips',`<div style="display:flex;flex-direction:column;gap:12px;"><div style="display:flex;gap:12px;"><span style="font-size:1.4rem;">🥩</span><div><strong>Lean Red Meat &amp; Spinach</strong><br><span style="font-size:.78rem;color:var(--text-muted);">Best sources of bioavailable iron.</span></div></div><div style="display:flex;gap:12px;"><span style="font-size:1.4rem;">🍊</span><div><strong>Vitamin C</strong><br><span style="font-size:.78rem;color:var(--text-muted);">Take citrus with iron foods — 2× absorption.</span></div></div><div style="display:flex;gap:12px;"><span style="font-size:1.4rem;">💧</span><div><strong>Hydration</strong><br><span style="font-size:.78rem;color:var(--text-muted);">2L water daily + 500ml before donation.</span></div></div><div style="display:flex;gap:12px;"><span style="font-size:1.4rem;">🚫</span><div><strong>Avoid Tea/Coffee Before Meals</strong><br><span style="font-size:.78rem;color:var(--text-muted);">Tannins reduce iron absorption by 60%.</span></div></div></div>`,()=>showToast('💡 Noted!'),'Got It');
  }

  const ACTION_MAP={
    promise:openPromiseModal,trendAlerts:()=>navigateTo('health'),
    antibody:openAntibodyModal,
    rateBank:openRateBankModal,submitRequest:openSubmitRequestModal,emergencyVoice:openEmergencyVoiceModal,
    droneDelivery:()=>navigateTo('delivery'),newbornPrediction:()=>navigateTo('newborn'),
    trackTimeline:async()=>{try{const d=await apiFetch('my_requests');const list=d.requests||[];if(!list.length){openModal('📅 Request Timeline','<p>No requests found to track.</p>');return;}showReqTimeline(list[0].id);}catch(e){openModal('📅 Timeline',`<p style="color:#f87171;">${e.message}</p>`);}},
    approvalStatus:async()=>{try{const d=await apiFetch('approvals');const pending=(d.approvals||[]).filter(a=>a.request_status==='pending');if(!pending.length){openModal('✅ Approval Status','<p>No pending approvals at this time. ✅</p>');return;}const a=pending[0];const pct=(a.steps||[]).length?Math.round((a.steps.filter(s=>s.status==='approved').length/a.steps.length)*100):10;openModal('✅ Approval Status',`<p><strong>Request #REQ-${String(a.request_id).padStart(4,'0')}</strong> — ${esc(a.blood_group)}, ${a.units_required} units</p><div class="progress-bar-track" style="margin:12px 0;"><div class="progress-fill" style="width:${pct}%"></div></div><p>Status: ${statusBadge(a.request_status)}</p><p style="font-size:.78rem;color:var(--text-muted);margin-top:8px;">Submitted: ${fmtDate(a.requested_at)}</p>`,()=>navigateTo('approvals'),'View All Approvals');}catch(e){openModal('✅ Approval Status',`<p style="color:#f87171;">${e.message}</p>`);}},
  };
  document.querySelectorAll('.action-card[data-action]').forEach(card=>{
    const a=card.getAttribute('data-action');
    card.addEventListener('click',()=>ACTION_MAP[a]?ACTION_MAP[a]():showToast('🔧 Coming soon!'));
  });

  on('viewHealthTipsBtn','click',openHealthTipsModal);
  on('addPledgeBtn','click',openPromiseModal);
  on('newRequestBtn','click',openSubmitRequestModal);
  on('viewEmergRequestsBtn','click',()=>navigateTo('emergency'));
  on('dashEmergVoiceBtn','click',openEmergencyVoiceModal);
  on('saveSettingsBtn','click',async()=>{
    const emailPref = document.getElementById('notifEmail')?.checked ? 1 : 0;
    const smsPref   = document.getElementById('notifSms')?.checked ? 1 : 0;
    const pushPref  = document.getElementById('notifPush')?.checked ? 1 : 0;
    try {
      await apiFetch('save_notification_preferences','POST',{email:emailPref,sms:smsPref,push:pushPref});
      showToast('✅ Notification preferences saved!');
    } catch(e) { showToast('❌ '+e.message,5000); }
  });
  on('refreshEmergencyBtn','click',()=>{
    const b=document.getElementById('refreshEmergencyBtn');
    if(b){b.innerHTML='⏳ Refreshing…';b.style.pointerEvents='none';b.style.opacity='0.6';}
    loadEmergency().then(()=>{
      if(b){b.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Refresh';b.style.pointerEvents='';b.style.opacity='1';}
    });
  });
  ['filterBloodType','filterUrgency'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.addEventListener('change',_renderEmergencyCards);
  });
  /* ── Searchable division select (body-mounted, no parent clipping) ── */
  (function(){
    const DIVS = ['All Divisions','Dhaka','Chittagong','Rajshahi','Khulna','Barisal','Sylhet','Rangpur','Mymensingh'];
    const sel = document.getElementById('filterCity');
    const trig = document.getElementById('dsTrigger');
    const lbl = document.getElementById('dsLabel');
    if (!sel || !trig || !lbl) return;
    sel.innerHTML = DIVS.map(d => `<option value="${esc(d==='All Divisions'?'all':d)}">${esc(d)}</option>`).join('');

    /* Build overlay + panel in body */
    const overlay = document.createElement('div');
    overlay.className = 'ds-overlay';
    overlay.id = 'dsOverlay';
    overlay.innerHTML =
      '<div class="ds-panel" id="dsPanel">'+
        '<div class="ds-search-box"><input type="text" id="dsSearch" placeholder="Search division..." autocomplete="off" /></div>'+
        '<div class="ds-list" id="dsList"></div>'+
      '</div>';
    document.body.appendChild(overlay);
    const panel = overlay.querySelector('.ds-panel');
    const search = overlay.querySelector('#dsSearch');
    const list = overlay.querySelector('#dsList');

    function positionPanel() {
      const r = trig.getBoundingClientRect();
      panel.style.left = r.left + 'px';
      panel.style.top = (r.bottom + 4) + 'px';
      panel.style.width = r.width + 'px';
    }

    function renderList(q){
      const ql=(q||'').toLowerCase().trim();
      const items=!ql?DIVS:DIVS.filter(d=>d.toLowerCase().includes(ql));
      if(!items.length){list.innerHTML='<div class="ds-item disabled">No match</div>';return;}
      list.innerHTML=items.map((d,i)=>{
        const val=d==='All Divisions'?'all':d;
        const active=sel.value===val?' active':'';
        return `<div class="ds-item${active}" data-value="${esc(val)}">${esc(d)}</div>`;
      }).join('');
      list.querySelectorAll('.ds-item:not(.disabled)').forEach(el=>{
        el.addEventListener('click',()=>{
          sel.value=el.getAttribute('data-value');
          lbl.textContent=el.textContent;
          overlay.classList.remove('show');
          panel.classList.remove('show');
          search.value='';
          _renderEmergencyCards();
        });
      });
    }

    trig.addEventListener('click',(e)=>{
      e.stopPropagation();
      const open = overlay.classList.contains('show');
      if (open) {
        overlay.classList.remove('show');
        panel.classList.remove('show');
        trig.classList.remove('open');
      } else {
        positionPanel();
        search.value = '';
        renderList('');
        overlay.classList.add('show');
        panel.classList.add('show');
        trig.classList.add('open');
        setTimeout(() => search.focus(), 50);
      }
    });

    search.addEventListener('input',()=>renderList(search.value));
    search.addEventListener('keydown',(e)=>{
      if(e.key==='Enter'){
        const first=list.querySelector('.ds-item:not(.disabled)');
        if(first)first.click();
      }
      if(e.key==='Escape'){
        overlay.classList.remove('show');
        panel.classList.remove('show');
        trig.classList.remove('open');
        search.value='';
      }
    });

    overlay.addEventListener('click',(e)=>{
      if(e.target === overlay || !e.target.closest('.ds-panel')){
        overlay.classList.remove('show');
        panel.classList.remove('show');
        trig.classList.remove('open');
        search.value='';
      }
    });

    /* Reposition on scroll/resize while open */
    window.addEventListener('scroll',()=>{if(overlay.classList.contains('show'))positionPanel();},{passive:true});
    window.addEventListener('resize',()=>{if(overlay.classList.contains('show'))positionPanel();},{passive:true});
  })();
  on('reqFilterStatus','change',()=>{loadMyRequests(document.getElementById('reqFilterStatus')?.value||'all');});
  on('myVoiceReqBtn','click',openEmergencyVoiceModal);
  on('trackDeliveryBtn','click',()=>navigateTo('delivery'));
  on('exportHistoryPdfBtn','click',async()=>{
    try{
      const d=await apiFetch('donations');
      const list=d.donations||[];
      if(!list.length){showToast('No donation records to export.',3000);return;}
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
      doc.setFontSize(16);
      doc.text('My Donation History — Blood Bridge',14,14);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`,14,20);
      const rows=list.map((r,i)=>[
        String(list.length-i),
        fmtDate(r.donation_date)||'—',
        r.blood_bank_name||'—',
        r.city||'—',
        '1',
        r.status||'—'
      ]);
      doc.autoTable({
        startY:24,
        head:[['#','Date','Blood Bank','City','Units','Status']],
        body:rows,
        theme:'grid',
        headStyles:{fillColor:[139,92,246],fontSize:8,halign:'center'},
        bodyStyles:{fontSize:7},
        styles:{cellPadding:1.5}
      });
      doc.save('BloodBridge_Donations.pdf');
      showToast('✅ PDF exported.');
    }catch(e){showToast('❌ '+e.message,5000);}
  });
  on('exportEmergencyPdfBtn','click',async()=>{
    try{
      const data=await apiFetch('emergency_requests');
      const list=data.requests||[];
      if(!list.length){showToast('No emergency requests to export.',3000);return;}
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
      doc.setFontSize(16);
      doc.text('Emergency Blood Requests — Blood Bridge',14,14);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`,14,20);
      const rows=list.map(r=>{
        const type=r.is_voice?'Voice':'Blood Request';
        const name=r.extracted_name||r.requester_name||'—';
        const location=r.extracted_location||'—';
        return[
          type,
          r.blood_group||'—',
          name,
          location,
          r.urgency?r.urgency.toUpperCase():'—',
          r.status||'—'
        ];
      });
      doc.autoTable({
        startY:24,
        head:[['Type','Blood Group','Requester','Location','Urgency','Status']],
        body:rows,
        theme:'grid',
        headStyles:{fillColor:[220,38,38],fontSize:8,halign:'center'},
        bodyStyles:{fontSize:7},
        styles:{cellPadding:1.5}
      });
      doc.save('BloodBridge_EmergencyRequests.pdf');
      showToast('✅ PDF exported.');
    }catch(e){showToast('❌ '+e.message,5000);}
  });
  on('exportRequestsPdfBtn','click',async()=>{
    try{
      const data=await apiFetch('my_requests');
      const list=data.requests||[];
      if(!list.length){showToast('No requests to export.',3000);return;}
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
      doc.setFontSize(16);
      doc.text('My Blood Requests — Blood Bridge',14,14);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`,14,20);
      const rows=list.map(r=>[
        `#REQ-${String(r.id).padStart(4,'0')}`,
        fmtDate(r.requested_at)||'—',
        r.blood_group||'—',
        String(r.units_required||'—'),
        (r.urgency||'normal').toUpperCase(),
        r.status||'—'
      ]);
      doc.autoTable({
        startY:24,
        head:[['Request ID','Date','Blood Group','Units','Urgency','Status']],
        body:rows,
        theme:'grid',
        headStyles:{fillColor:[139,92,246],fontSize:8,halign:'center'},
        bodyStyles:{fontSize:7},
        styles:{cellPadding:1.5},
        columnStyles:{0:{cellWidth:24},1:{cellWidth:26},2:{cellWidth:20},3:{cellWidth:16},4:{cellWidth:26},5:{cellWidth:22}}
      });
      doc.save('BloodBridge_MyRequests.pdf');
      showToast('✅ PDF exported.');
    }catch(e){showToast('❌ '+e.message,5000);}
  });
  const hs=document.getElementById('helpSearchInput');
  if(hs)hs.addEventListener('input',()=>{const q=hs.value.toLowerCase();document.querySelectorAll('.faq-card').forEach(c=>{c.style.display=(q===''||c.textContent.toLowerCase().includes(q))?'':'none';});});

  /* ══════════════════════════════════════════════
     DONOR PROMISE MANAGEMENT (exposed globally)
  ══════════════════════════════════════════════ */
  window.rescheduleDonorPromise = function(promiseId) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    openModal('📅 Reschedule Promise',
      `<p style="font-size:.82rem;color:var(--text-muted);margin-bottom:14px;">Choose a new donation date. The confirmation code stays the same.</p>
       <label style="font-size:.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">New Date *</label>
       <input type="date" id="drReschedDate" min="${minDate}"
         style="${IS}margin-bottom:6px;">
       <div style="font-size:.7rem;color:var(--text-muted);">Must be a future date.</div>`,
      async () => {
        const newDate = document.getElementById('drReschedDate')?.value;
        if (!newDate) { showToast('⚠️ Please select a date.'); return; }
        try {
          await apiFetch('reschedule_promise', 'POST', { promise_id: promiseId, new_date: newDate });
          showToast('📅 Promise rescheduled!');
          closeModal();
          loadDonations();
        } catch(e) { showToast('❌ ' + e.message, 5000); }
      }, 'Reschedule'
    );
  };

  window.cancelDonorPromise = function(promiseId, code) {
    openModal('✕ Cancel Promise',
      `<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);border-radius:10px;padding:14px;font-size:.83rem;">
        <p style="margin:0 0 8px;font-weight:600;color:#f87171;">Cancel this donation promise?</p>
        <p style="margin:0;color:var(--text-muted);">Code: <strong>${esc(code)}</strong><br>This cannot be undone. The blood bank will no longer expect your donation.</p>
      </div>`,
      async () => {
        try {
          const res = await apiFetch('cancel_promise', 'POST', { promise_id: promiseId });
          showToast(`✅ Promise cancelled. Trust score −${res.deducted ?? 5} pts → ${res.trust_score ?? '—'}`, 4500);
          const navTrust = document.getElementById('navTrustScore');
          if (navTrust && res.trust_score != null) navTrust.textContent = res.trust_score;
          closeModal();
          loadDonations();
        } catch(e) { showToast('❌ ' + e.message, 5000); }
      }, 'Yes, Cancel Promise'
    );
  };

  /* ── INIT ── */
  function bindPartnerEvents(){
    const sendBtn=document.getElementById('sendPartnerReqBtn');
    if(sendBtn)sendBtn.addEventListener('click',sendPartnerRequest);
    const confirmBtn=document.getElementById('confirmPartnerBtn');
    if(confirmBtn)confirmBtn.addEventListener('click',confirmPartnerRequest);
    const rejectBtn=document.getElementById('rejectPartnerBtn');
    if(rejectBtn)rejectBtn.addEventListener('click',rejectPartnerRequest);
    const unlinkBtn=document.getElementById('unlinkPartnerBtn');
    if(unlinkBtn)unlinkBtn.addEventListener('click',unlinkPartner);
    const cancelBtn=document.getElementById('cancelPartnerReqBtn');
    if(cancelBtn)cancelBtn.addEventListener('click',cancelPartnerRequest);
    const emailInputP=document.getElementById('partnerEmailInput');
    if(emailInputP)emailInputP.addEventListener('keydown',function(e){if(e.key==='Enter')sendPartnerRequest();});
    const detailBtn=document.getElementById('viewThalassemiaDetailsBtn');
    if(detailBtn)detailBtn.addEventListener('click',showThalassemiaModal);
    const reportBtn=document.getElementById('downloadThalReportBtn');
    if(reportBtn)reportBtn.addEventListener('click',downloadThalassemiaReport);
  }

  function showThalassemiaModal(){
    openModal('🧬 Genetic Counseling — Thalassemia Carrier Couple',
      `<style>
        .gc-wrap { display:flex; flex-direction:column; gap:0; }
        .gc-intro { font-size:.82rem; color:var(--text-muted); line-height:1.6; margin-bottom:6px; padding:4px 0; }
        .gc-intro strong { color:var(--text-primary); }
        .gc-acc { border:1px solid var(--glass-border); border-radius:10px; overflow:hidden; margin-top:8px; }
        .gc-acc-header { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; font-size:.82rem; font-weight:600; background:rgba(192,22,44,0.04); transition:background .2s; user-select:none; }
        .gc-acc-header:hover { background:rgba(192,22,44,0.08); }
        .gc-acc-header .acc-arrow { margin-left:auto; transition:transform .3s; font-size:.7rem; }
        .gc-acc.open .gc-acc-header .acc-arrow { transform:rotate(180deg); }
        .gc-acc-body { max-height:0; overflow:hidden; transition:max-height .4s ease,padding .3s; padding:0 14px; }
        .gc-acc.open .gc-acc-body { max-height:600px; padding:10px 14px 14px; }
        .gc-acc-body p { margin:4px 0; font-size:.78rem; color:var(--text-muted); line-height:1.5; }
        .gc-acc-body ul { margin:6px 0; padding-left:18px; }
        .gc-acc-body li { font-size:.78rem; color:var(--text-muted); margin:3px 0; line-height:1.5; }
        .gc-acc-body li strong { color:var(--text-primary); }
        .gc-risk-box { display:flex; gap:8px; margin:8px 0; flex-wrap:wrap; }
        .gc-risk-item { flex:1; min-width:80px; text-align:center; padding:8px 6px; border-radius:8px; font-size:.72rem; font-weight:600; }
        .gc-risk-item .gc-ri-pct { display:block; font-size:1rem; font-weight:800; margin-bottom:2px; }
        .gc-ri-ok { background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.2); color:#4ade80; }
        .gc-ri-warn { background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.2); color:#fbbf24; }
        .gc-ri-danger { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.2); color:#f87171; }
        .gc-step { display:flex; gap:10px; align-items:flex-start; padding:8px 0; border-bottom:1px solid var(--table-border); }
        .gc-step:last-child { border-bottom:none; }
        .gc-step-num { width:22px; height:22px; border-radius:50%; background:var(--red); color:#fff; display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; flex-shrink:0; margin-top:1px; }
        .gc-step-text { font-size:.78rem; color:var(--text-muted); line-height:1.5; }
        .gc-step-text strong { color:var(--text-primary); }
        .gc-resource { display:flex; align-items:center; gap:10px; padding:8px 12px; background:rgba(192,22,44,0.04); border-radius:8px; margin-top:6px; font-size:.78rem; }
        .gc-resource span:first-child { font-size:1.1rem; }
        .gc-resource a { color:var(--red-light); text-decoration:none; font-weight:600; }
        .gc-resource a:hover { text-decoration:underline; }
      </style>
      <div class="gc-wrap">
        <div class="gc-intro">
          When both parents are thalassemia carriers, each pregnancy has a <strong>1 in 4 (25%)</strong> chance of Thalassemia Major, a serious blood disorder requiring lifelong treatment. Below is a guide to understanding your options.
        </div>

        <div class="gc-risk-box">
          <div class="gc-risk-item gc-ri-ok"><span class="gc-ri-pct">25%</span>Healthy</div>
          <div class="gc-risk-item gc-ri-warn"><span class="gc-ri-pct">50%</span>Carrier</div>
          <div class="gc-risk-item gc-ri-danger"><span class="gc-ri-pct">25%</span>Major</div>
        </div>

        <!-- Accordion 1 -->
        <div class="gc-acc open">
          <div class="gc-acc-header" onclick="this.parentNode.classList.toggle('open')">
            🧬 What Is Thalassemia? <span class="acc-arrow">▾</span>
          </div>
          <div class="gc-acc-body">
            <p>Thalassemia is an inherited blood disorder where the body produces less hemoglobin than normal. There are two main types:</p>
            <ul>
              <li><strong>Thalassemia Minor (Carrier):</strong> One mutated gene — mild or no symptoms, but can pass it to children.</li>
              <li><strong>Thalassemia Major:</strong> Two mutated genes — severe anemia requiring regular blood transfusions and medical care.</li>
            </ul>
            <p>In Bangladesh, approximately <strong>3–4% of the population</strong> are carriers. Carrier screening before marriage is strongly recommended.</p>
          </div>
        </div>

        <!-- Accordion 2 -->
        <div class="gc-acc">
          <div class="gc-acc-header" onclick="this.parentNode.classList.toggle('open')">
            🔬 How Inheritance Works <span class="acc-arrow">▾</span>
          </div>
          <div class="gc-acc-body">
            <p>Thalassemia follows an <strong>autosomal recessive</strong> pattern. Both parents must be carriers (one normal gene A + one mutated gene a) for a child to be at risk.</p>
            <p>The Punnett square shows all possible combinations:</p>
            <ul>
              <li><strong>AA (AB):</strong> Child inherits normal genes from both — <strong>Healthy</strong></li>
              <li><strong>Aa (Ab or aB):</strong> Child inherits one mutated gene — <strong>Carrier</strong> (like parents)</li>
              <li><strong>aa (ab):</strong> Child inherits mutated genes from both — <strong>Thalassemia Major</strong></li>
            </ul>
          </div>
        </div>

        <!-- Accordion 3 -->
        <div class="gc-acc">
          <div class="gc-acc-header" onclick="this.parentNode.classList.toggle('open')">
            🏥 Your Medical Options <span class="acc-arrow">▾</span>
          </div>
          <div class="gc-acc-body">
            <ul>
              <li><strong>Prenatal Testing:</strong> Chorionic Villus Sampling (CVS) at 10–12 weeks or Amniocentesis at 15–20 weeks can determine if the fetus has Thalassemia Major.</li>
              <li><strong>Preimplantation Genetic Diagnosis (PGD):</strong> Used with IVF to select embryos that are not affected by Thalassemia Major.</li>
              <li><strong>Partner Screening:</strong> If you haven't already, ensure your partner is tested — this alert confirms both are carriers.</li>
              <li><strong>Genetic Counseling:</strong> A certified genetic counselor can walk you through all options specific to your situation.</li>
            </ul>
          </div>
        </div>

        <!-- Accordion 4 -->
        <div class="gc-acc">
          <div class="gc-acc-header" onclick="this.parentNode.classList.toggle('open')">
            📋 Recommended Next Steps <span class="acc-arrow">▾</span>
          </div>
          <div class="gc-acc-body">
            <div class="gc-step"><div class="gc-step-num">1</div><div class="gc-step-text"><strong>Confirm carrier status</strong> — Both partners should have a complete blood count (CBC) and hemoglobin electrophoresis.</div></div>
            <div class="gc-step"><div class="gc-step-num">2</div><div class="gc-step-text"><strong>Schedule genetic counseling</strong> — Visit a genetic counselor at a tertiary hospital or thalassemia center.</div></div>
            <div class="gc-step"><div class="gc-step-num">3</div><div class="gc-step-text"><strong>Discuss family planning</strong> — Review prenatal testing, PGD, and other reproductive options with your partner and doctor.</div></div>
            <div class="gc-step"><div class="gc-step-num">4</div><div class="gc-step-text"><strong>Test existing children</strong> — If you already have children, they should be tested for thalassemia carrier status.</div></div>
            <div class="gc-step"><div class="gc-step-num">5</div><div class="gc-step-text"><strong>Register for support</strong> — Connect with thalassemia patient support groups in Bangladesh for community guidance.</div></div>
          </div>
        </div>

        <!-- Resources -->
        <div style="margin-top:12px;padding:10px 14px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.12);border-radius:10px;">
          <div style="font-size:.78rem;font-weight:600;margin-bottom:6px;color:#fbbf24;">📌 Bangladesh Resources</div>
          <div class="gc-resource"><span>🏥</span> <span><strong>Thalassemia Center, Dhaka Medical College</strong> — Provides free carrier screening and counseling.</span></div>
          <div class="gc-resource"><span>🌐</span> <span><strong>Thalassemia Society of Bangladesh</strong> — <a href="https://thalassemia.org.bd" target="_blank" rel="noopener noreferrer" style="color:var(--red-light);text-decoration:none;font-weight:600;">thalassemia.org.bd ↗</a></span></div>
          <div class="gc-resource"><span>📞</span> <span><strong>National Helpline:</strong> 16263 (Ministry of Health, Bangladesh)</span></div>
        </div>
      </div>`,
      null, null);
  }

  // ═════════════════════════════════════════════════════
  // THALASSEMIA REPORT DOWNLOAD (browser preview + Save as PDF)
  // ═════════════════════════════════════════════════════
  function downloadThalassemiaReport(){
    const d = _lastDashboardData;
    if(!d) return showToast('⚠️ Dashboard data not loaded yet. Please wait.');

    const u = d.user || {};
    const coupleAlert = d.thalassemia_couple_alert;
    const myName = u.full_name || 'User';
    const myEmail = u.email || '';
    const myPhone = u.phone || '';
    const myBg = u.blood_group || '—';

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
    const timeStr = now.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'});
    const refNo = 'THAL-' + String(Date.now()).slice(-6);

    const uCarrier = d.thal_user_carrier || 'unknown';
    const pCarrier = d.thal_partner_carrier || 'unknown';
    const pName = d.thal_partner_name || '';
    const hasPartner = !!d.thal_partner_name;
    const hasAlert = !!coupleAlert;

    let scenario = 'unknown';
    if(hasPartner && uCarrier==='carrier' && pCarrier==='carrier') scenario='both';
    else if(hasPartner && uCarrier==='carrier' && pCarrier==='non_carrier') scenario='you_carrier';
    else if(hasPartner && uCarrier==='non_carrier' && pCarrier==='carrier') scenario='partner_carrier';
    else if(hasPartner && uCarrier==='non_carrier' && pCarrier==='non_carrier') scenario='neither';

    const escP = esc(pName);
    const escM = esc(myName);

    let statusTitle, statusSub, statusColor, statusBg;
    let coupleHtml = '';
    let punnettHtml = '';
    let resourcesHtml = '';
    let recommendations = [];

    if(scenario==='both'){
      statusTitle = 'COUPLE ALERT — BOTH CARRIERS';
      statusSub = 'Both partners carry the thalassemia trait. Genetic counseling strongly recommended.';
      statusColor = '#c0162c';
      statusBg = '#fdedec';

      const risk = coupleAlert?.risk_percentage || '25';
      const advice = coupleAlert?.advice || '';
      coupleHtml = `
        <div class="section-title">COUPLE ALERT SUMMARY</div>
        <div class="alert-box">
          <div class="grid-2">
            <div><span class="label">Partner</span><span class="value">${escP}</span></div>
            <div><span class="label">Risk</span><span class="value" style="color:#c0162c;font-weight:700;">${risk}% (each pregnancy)</span></div>
          </div>
          ${advice ? '<div style="margin-top:6px;"><span class="label">Advice</span><span class="value">' + esc(advice) + '</span></div>' : ''}
        </div>`;

      punnettHtml = `
        <div class="section-title">INHERITANCE PROBABILITY (Punnett Square)</div>
        <div class="punnett-wrap">
          <table class="punnett">
            <tr>
              <td></td>
              <td class="col-head">${escP} (B)</td>
              <td class="col-head">${escP} (b)</td>
            </tr>
            <tr>
              <td class="row-head">${escM} (A)</td>
              <td class="cell healthy"><strong>AB</strong><span>Healthy<br>25%</span></td>
              <td class="cell carrier"><strong>Ab</strong><span>Carrier<br>25%</span></td>
            </tr>
            <tr>
              <td class="row-head">${escM} (a)</td>
              <td class="cell carrier"><strong>aB</strong><span>Carrier<br>25%</span></td>
              <td class="cell affected"><strong>ab</strong><span>Affected<br>25%</span></td>
            </tr>
          </table>
          <div class="chips">
            <div class="chip healthy">Healthy <strong>25%</strong></div>
            <div class="chip carrier">Carrier <strong>50%</strong></div>
            <div class="chip affected">Affected <strong>25%</strong></div>
          </div>
        </div>`;

      recommendations = [
        'Both partners are thalassemia carriers — each pregnancy has a 25% risk of Thalassemia Major.',
        'Schedule genetic counseling at a certified thalassemia center.',
        'Discuss prenatal testing options (CVS at 10-12 weeks, Amniocentesis at 15-20 weeks).',
        'Consider Preimplantation Genetic Diagnosis (PGD) with IVF.',
        'Test any existing children for thalassemia carrier status.',
        'Register with the Thalassemia Society of Bangladesh for support.'
      ];
    } else if(scenario==='you_carrier'){
      statusTitle = 'YOU ARE A CARRIER — PARTNER IS NOT';
      statusSub = 'No risk of Thalassemia Major, but each child has a 50% chance of being a carrier.';
      statusColor = '#b8860b';
      statusBg = '#fff9db';
      coupleHtml = `
        <div class="section-title">COUPLE SUMMARY</div>
        <div class="alert-box">
          <div class="grid-2">
            <div><span class="label">Partner</span><span class="value">${escP}</span></div>
            <div><span class="label">Partner Status</span><span class="value" style="color:#2d6a2d;font-weight:700;">Not a Carrier</span></div>
          </div>
        </div>`;
      punnettHtml = `
        <div class="section-title">INHERITANCE PROBABILITY (Punnett Square)</div>
        <div class="punnett-wrap">
          <table class="punnett">
            <tr>
              <td></td>
              <td class="col-head">${escP} (B)</td>
            </tr>
            <tr>
              <td class="row-head">${escM} (A)</td>
              <td class="cell healthy"><strong>AB</strong><span>Healthy<br>50%</span></td>
            </tr>
            <tr>
              <td class="row-head">${escM} (a)</td>
              <td class="cell carrier"><strong>aB</strong><span>Carrier<br>50%</span></td>
            </tr>
          </table>
          <div class="chips">
            <div class="chip healthy">Healthy <strong>50%</strong></div>
            <div class="chip carrier">Carrier <strong>50%</strong></div>
          </div>
        </div>`;
      recommendations = [
        'You are a thalassemia carrier. Your partner is not.',
        'There is no risk of Thalassemia Major in your children.',
        'Each child has a 50% chance of being a carrier.',
        'Genetic counseling is available if you have questions.',
        'Routine carrier screening is recommended for children.'
      ];
    } else if(scenario==='partner_carrier'){
      statusTitle = 'PARTNER IS A CARRIER — YOU ARE NOT';
      statusSub = 'No risk of Thalassemia Major, but each child has a 50% chance of being a carrier.';
      statusColor = '#b8860b';
      statusBg = '#fff9db';
      coupleHtml = `
        <div class="section-title">COUPLE SUMMARY</div>
        <div class="alert-box">
          <div class="grid-2">
            <div><span class="label">Partner</span><span class="value">${escP}</span></div>
            <div><span class="label">Partner Status</span><span class="value" style="color:#b8860b;font-weight:700;">Carrier</span></div>
          </div>
        </div>`;
      punnettHtml = `
        <div class="section-title">INHERITANCE PROBABILITY (Punnett Square)</div>
        <div class="punnett-wrap">
          <table class="punnett">
            <tr>
              <td></td>
              <td class="col-head">${escP} (B)</td>
              <td class="col-head">${escP} (b)</td>
            </tr>
            <tr>
              <td class="row-head">${escM} (A)</td>
              <td class="cell healthy"><strong>AB</strong><span>Healthy<br>50%</span></td>
              <td class="cell carrier"><strong>Ab</strong><span>Carrier<br>50%</span></td>
            </tr>
          </table>
          <div class="chips">
            <div class="chip healthy">Healthy <strong>50%</strong></div>
            <div class="chip carrier">Carrier <strong>50%</strong></div>
          </div>
        </div>`;
      recommendations = [
        'Your partner is a thalassemia carrier.',
        'There is no risk of Thalassemia Major in your children.',
        'Each child has a 50% chance of being a carrier.',
        'Your partner may benefit from genetic counseling.',
        'Routine carrier screening is recommended for children.'
      ];
    } else if(scenario==='neither'){
      statusTitle = 'NO THALASSEMIA CARRIERS';
      statusSub = 'Neither you nor your partner carry the thalassemia trait.';
      statusColor = '#2d6a2d';
      statusBg = '#ebf7eb';
      coupleHtml = `
        <div class="section-title">COUPLE SUMMARY</div>
        <div class="alert-box">
          <div class="grid-2">
            <div><span class="label">Partner</span><span class="value">${escP}</span></div>
            <div><span class="label">Partner Status</span><span class="value" style="color:#2d6a2d;font-weight:700;">Not a Carrier</span></div>
          </div>
        </div>`;
      punnettHtml = `
        <div class="section-title">INHERITANCE PROBABILITY (Punnett Square)</div>
        <div class="punnett-wrap">
          <table class="punnett">
            <tr>
              <td></td>
              <td class="col-head">${escP} (B)</td>
            </tr>
            <tr>
              <td class="row-head">${escM} (A)</td>
              <td class="cell healthy"><strong>AB</strong><span>Healthy<br>100%</span></td>
            </tr>
          </table>
          <div class="chips">
            <div class="chip healthy">Healthy <strong>100%</strong></div>
          </div>
        </div>`;
      recommendations = [
        'Neither you nor your partner are thalassemia carriers.',
        'Your children have a negligible risk of thalassemia.',
        'Routine carrier screening is still recommended for general health awareness.'
      ];
    } else {
      statusTitle = 'THALASSEMIA CARRIER STATUS';
      statusSub = uCarrier==='carrier' ? 'You are a confirmed carrier.' : uCarrier==='non_carrier' ? 'You are not a carrier.' : 'No screening data available.';
      statusColor = '#555';
      statusBg = '#f0f0f0';
      recommendations = [
        uCarrier==='carrier' ? 'You are a confirmed thalassemia carrier.' : uCarrier==='non_carrier' ? 'You are not a thalassemia carrier.' : 'Thalassemia screening is recommended.',
        hasPartner ? 'Link a partner and ensure both partners complete carrier screening for a full couple assessment.' : 'Visit a certified lab for thalassemia carrier screening and then link a partner for couple assessment.',
        'Genetic counseling is available for more information.'
      ];
    }

    resourcesHtml = `
      <div class="section-title">BANGLADESH RESOURCES</div>
      <div class="resources">
        <div class="res-row"><strong>Thalassemia Center</strong> Dhaka Medical College — Free carrier screening &amp; counseling</div>
        <div class="res-row"><strong>Thalassemia Society of Bangladesh</strong> <a href="https://thalassemia.org.bd" target="_blank">thalassemia.org.bd</a> — National registry &amp; support</div>
        <div class="res-row"><strong>National Helpline</strong> 16263 — Ministry of Health, Bangladesh</div>
      </div>`;

    const recHtml = recommendations.map((r,i) =>
      `<div class="rec-item"><span class="rec-num">${i+1}.</span> ${esc(r)}</div>`
    ).join('');

    const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Thalassemia Status Report - ${esc(myName)}</title>
<style>
  @page { margin: 18mm 14mm; }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f4;color:#1a1a2e;padding:24px;}
  .report{max-width:720px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.06);}
  .head{background:#c0162c;padding:22px 28px;color:#fff;}
  .head h1{font-size:20px;font-weight:800;letter-spacing:-.02em;}
  .head .sub{font-size:12px;opacity:.8;margin-top:4px;}
  .head .ref{font-size:10px;opacity:.55;margin-top:6px;}
  .body{padding:20px 28px 28px;}
  .ribbon{padding:12px 16px;border-radius:8px;margin-bottom:18px;}
  .ribbon .rt{font-size:14px;font-weight:700;}
  .ribbon .rs{font-size:11px;opacity:.8;margin-top:2px;}
  .section-title{font-size:11px;font-weight:700;color:#c0162c;text-transform:uppercase;letter-spacing:.05em;margin:18px 0 8px;padding-bottom:5px;border-bottom:2px solid #eef0f4;}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#8c8c9a;font-weight:600;margin-bottom:1px;}
  .value{font-size:13px;font-weight:600;color:#1a1a2e;}
  .alert-box{padding:12px 14px;background:#f8f7fc;border-radius:8px;}
  .punnett-wrap{text-align:center;margin:4px 0 6px;}
  .punnett{border-collapse:collapse;margin:0 auto;}
  .punnett td{padding:8px 14px;text-align:center;font-size:12px;}
  .punnett .col-head{font-size:11px;color:#666;font-weight:600;padding-bottom:6px;border-bottom:2px solid #eef0f4;}
  .punnett .row-head{font-size:11px;color:#666;font-weight:600;padding-right:10px;text-align:right;border-right:2px solid #eef0f4;}
  .punnett .cell{border:1px solid #e2e4ea;border-radius:6px;padding:10px 18px;min-width:80px;}
  .punnett .cell strong{display:block;font-size:16px;margin-bottom:2px;}
  .punnett .cell span{font-size:11px;opacity:.8;}
  .cell.healthy{background:#ebf9eb;color:#2d732d;}
  .cell.carrier{background:#fff9db;color:#8c6e0a;}
  .cell.affected{background:#fee2e2;color:#b41c1c;}
  .chips{display:flex;gap:8px;justify-content:center;margin:10px 0 4px;}
  .chip{padding:5px 18px;border-radius:20px;font-size:11px;text-align:center;border:1.5px solid;}
  .chip.healthy{background:#ebf9eb;border-color:#2d732d;color:#2d732d;}
  .chip.carrier{background:#fff9db;border-color:#8c6e0a;color:#8c6e0a;}
  .chip.affected{background:#fee2e2;border-color:#b41c1c;color:#b41c1c;}
  .rec-item{padding:5px 0 5px 22px;position:relative;font-size:12px;line-height:1.5;color:#3a3a4a;}
  .rec-num{position:absolute;left:0;font-weight:700;color:#c0162c;}
  .resources{margin-top:4px;}
  .res-row{padding:7px 12px;background:#f8f7fc;border-radius:6px;margin-bottom:4px;font-size:12px;color:#3a3a4a;}
  .res-row strong{color:#c0162c;margin-right:6px;}
  .disc{margin-top:14px;padding:10px 14px;background:#fcf8eb;border-radius:6px;font-size:10px;color:#8c7828;line-height:1.5;}
  .footer{text-align:center;padding:14px 28px;border-top:1px solid #eef0f4;font-size:10px;color:#aaa;}
  .print-btn{display:block;margin:16px auto 24px;padding:10px 32px;background:#c0162c;color:#fff;border:none;border-radius:30px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;}
  .print-btn:hover{background:#8b0020;}
  @media print{body{background:#fff;padding:0;}.report{box-shadow:none;border-radius:0;}.head{border-radius:0;}.print-btn{display:none;}}
</style>
</head>
<body>
<div class="report">
  <div class="head">
    <h1>Thalassemia Status Report</h1>
    <div class="sub">BloodBridge &middot; Genetic Health Assessment</div>
    <div class="ref">Generated ${dateStr} at ${timeStr} &middot; Ref ${refNo}</div>
  </div>
  <div class="body">
    <div class="ribbon" style="background:${statusBg};">
      <div class="rt" style="color:${statusColor};">${statusTitle}</div>
      <div class="rs">${statusSub}</div>
    </div>

    <div class="section-title">PATIENT INFORMATION</div>
    <div class="grid-2">
      <div><span class="label">Name</span><span class="value">${esc(myName)}</span></div>
      <div><span class="label">Blood Group</span><span class="value">${myBg}</span></div>
      <div><span class="label">Email</span><span class="value">${esc(myEmail)}</span></div>
      <div><span class="label">Phone</span><span class="value">${myPhone || '-'}</span></div>
    </div>

    ${coupleHtml}
    ${punnettHtml}

    <div class="section-title">RECOMMENDATIONS</div>
    ${recHtml}

    ${resourcesHtml}

    <div class="disc"><strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute a medical diagnosis. Genetic test results should be reviewed by a licensed healthcare provider. Always consult a certified genetic counselor for personalized medical advice.</div>

    <button class="print-btn" onclick="window.print()">Save as PDF</button>
  </div>
  <div class="footer">BloodBridge v2.0 &middot; ${dateStr} &middot; Computer-generated report</div>
</div>
</body>
</html>`;

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if(!win){ URL.revokeObjectURL(blobUrl); return showToast('⚠️ Please allow popups to download the report.', 4000); }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    showToast('📄 Report opened in new tab. Click "Save as PDF" in the print dialog.', 5000);
  }

  /* ── NEWBORN BLOOD PREDICTOR (dashboard) ── */
  /* ── NEWBORN BLOOD PREDICTOR (dashboard) ── */
  function predictNewbornBloodType(){
    const mother=document.getElementById('dashNbMother');
    const father=document.getElementById('dashNbFather');
    const resultContainer=document.getElementById('dashNbResult');
    const resultContent=document.getElementById('dashNbResultContent');
    if(!mother||!father||!resultContainer||!resultContent){showToast('⚠️ Predictor UI not loaded.',2000);return;}
    const m=mother.value,f=father.value;
    if(!m||!f){showToast('⚠️ Select both parents\' blood types.',2000);return;}
    const outcomes=computeChildBloodProbabilities(m,f);
    resultContent.innerHTML=outcomes.map(o=>`
      <div class="nb-result-row">
        <span class="nb-result-badge ${o.probability>0?'pos':'neg'}">${o.type}</span>
        <div class="nb-result-bar-track"><div class="nb-result-bar-fill" style="width:${o.probability}%"></div></div>
        <span class="nb-result-pct">${o.probability}%</span>
      </div>
    `).join('');
    resultContainer.style.display='';
  }
  function computeChildBloodProbabilities(mother,father){
    const mABO=mother.replace(/[+-]/g,''),mRh=mother.includes('+');
    const fABO=father.replace(/[+-]/g,''),fRh=father.includes('+');
    const mAlleles=motherABOAlleles(mABO);
    const fAlleles=motherABOAlleles(fABO);
    const aboChildren={A:0,B:0,AB:0,O:0};
    for(const ma of mAlleles){
      for(const fa of fAlleles){
        aboChildren[combineABOAlleles(ma,fa)]++;
      }
    }
    const total=mAlleles.length*fAlleles.length;
    const aboChances={};
    for(const t of['A','B','AB','O']){
      aboChances[t]=Math.round((aboChildren[t]/total)*100);
    }
    const rhProb=fRh?(mRh?75:100):0;
    const results=[];
    for(const t of['A+','A-','B+','B-','AB+','AB-','O+','O-']){
      const abo=t.replace(/[+-]/g,'');
      const rh=t.includes('+');
      if(!aboChances[abo]||aboChances[abo]===0)continue;
      const pct=aboChances[abo]*(rh?rhProb:(100-rhProb))/100;
      if(pct>0.5)results.push({type:t,probability:Math.round(pct)});
    }
    const sum=results.reduce((s,r)=>s+r.probability,0);
    if(sum<100&&results.length)results[results.length-1].probability+=100-sum;
    return results.length?results:[{type:mother,probability:100}];
  }
  function motherABOAlleles(g){
    if(g==='A')return['A','O'];
    if(g==='B')return['B','O'];
    if(g==='AB')return['A','B'];
    return['O','O'];
  }
  function combineABOAlleles(a,b){
    if((a==='A'&&b==='A')||(a==='A'&&b==='O')||(a==='O'&&b==='A'))return'A';
    if((a==='B'&&b==='B')||(a==='B'&&b==='O')||(a==='O'&&b==='B'))return'B';
    if((a==='A'&&b==='B')||(a==='B'&&b==='A'))return'AB';
    return'O';
  }

  /* ── Load just the nav trust score without full dashboard load ── */
  async function loadNavTrustScore() {
    try {
      const data = await apiFetch('dashboard');
      const trust = data?.user?.trust_score ?? data?.trust_score ?? null;
      if (trust !== null) txt('navTrustScore', trust);
      /* Also update sidebar name if available */
      if (data?.user?.full_name) {
        txt('sidebarName', data.user.full_name);
        txt('sidebarRole', `Donor & Recipient · ${data.user.blood_group || ''}`);
        const sa = document.getElementById('sidebarAvatar');
        if (sa && !sa.querySelector('img'))
          sa.textContent = data.user.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      }
    } catch(e) { debugLog('navTrustScore fetch failed:', e.message); }
  }

  function init(){
    debugLog('Init started');
    /* Inject global select/option color fix for both dark and light mode */
    if (!document.getElementById('bbSelectColorFix')) {
      const style = document.createElement('style');
      style.id = 'bbSelectColorFix';
      style.textContent = `
        [data-theme="dark"] select option,
        [data-theme="dark"] select optgroup {
          background-color: #1a0a0d !important;
          color: #fff !important;
        }
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
        /* Thalassemia buttons — visible in both themes */
        #viewThalassemiaDetailsBtn,
        #downloadThalReportBtn {
          transition: background .2s, border-color .2s, opacity .2s;
        }
        #viewThalassemiaDetailsBtn:hover {
          background: rgba(192,22,44,0.28) !important;
          border-color: rgba(192,22,44,0.8) !important;
        }
        #downloadThalReportBtn:hover {
          background: rgba(255,255,255,0.12) !important;
        }
        [data-theme="light"] #viewThalassemiaDetailsBtn {
          background: rgba(192,22,44,0.12) !important;
          border-color: rgba(192,22,44,0.45) !important;
          color: #7a0010 !important;
        }
        [data-theme="light"] #downloadThalReportBtn {
          background: rgba(0,0,0,0.06) !important;
          border-color: rgba(0,0,0,0.2) !important;
          color: #1a0508 !important;
        }
      `;
      document.head.appendChild(style);
    }
    const _erb = document.getElementById('refreshEmergencyBtn');
    if (_erb) _erb.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle;"><polyline points=\"23 4 23 10 17 10\"/><polyline points=\"1 20 1 14 7 14\"/><path d=\"M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15\"/></svg>Refresh';
    initReveal();
    const saved = localStorage.getItem('bbDrPage');
    if (saved && saved !== 'dashboard' && document.querySelector(`.sidebar-link[data-section="${saved}"]`)) {
      /* Hard refresh on non-dashboard page — load nav info first */
      loadNavTrustScore();
      navigateTo(saved);
    } else {
      loadDashboard();
    }
    bindPartnerEvents();
    debugLog('Init complete');
  }

  /* ADMIN WARNING BANNER */
  async function loadAdminWarnings() {
    const banner = document.getElementById('adminWarningBanner');
    if (!banner) return;
    try {
      const data = await apiFetch('get_warnings');
      /* Show all non-dismissed warnings including cool_down and blocked
         so user always knows their account status */
      const warnings = (data.warnings || []).filter(w =>
        w.status !== 'acknowledged' && w.status !== 'improvement_submitted' && w.status !== 'appealed'
      );
      if (!warnings.length) { banner.style.display = 'none'; return; }
      banner.style.display = '';
      window._adminWarnings = {};
      warnings.forEach(w => { window._adminWarnings[w.id] = w; });
      banner.innerHTML = warnings.map(w => {
        const hasPlan = w.admin_improvement_plan && w.admin_improvement_plan.trim().length > 0;
        const previewMsg = w.message
          ? (w.message.length > 120 ? w.message.slice(0,120)+'...' : w.message)
          : 'Admin sent a notice. Click View Details to read it.';
        /* Styling varies by status */
        const isCoolDown = w.status === 'cool_down';
        const isBlocked  = w.status === 'blocked';
        const borderColor = isCoolDown ? '#60a5fa' : isBlocked ? '#a855f7' : '#ef4444';
        const bgColor     = isCoolDown ? 'rgba(96,165,250,.06)' : isBlocked ? 'rgba(168,85,247,.06)' : 'rgba(239,68,68,.06)';
        const labelText   = isCoolDown ? '❄️ COOL DOWN' : isBlocked ? '🚫 BLOCKED' : '⚠️ ACTION REQUIRED';
        const labelColor  = isCoolDown ? '#60a5fa' : isBlocked ? '#a855f7' : '#f87171';
        const titleText   = isCoolDown ? 'Donation Cool Down' : isBlocked ? 'Account Blocked' : 'Admin Warning';
        const icon        = isCoolDown ? '❄️' : isBlocked ? '🚫' : '⚠️';
        return `
          <div class="glass-card" style="border:1px solid ${borderColor}55;border-left:4px solid ${borderColor};border-radius:14px;padding:18px 20px;margin-bottom:14px;background:${bgColor};">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <span style="font-size:1.2rem;">${icon}</span>
              <div style="flex:1;">
                <div style="font-weight:700;color:${labelColor};font-size:.92rem;">${titleText}</div>
                <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">Sent on ${esc(w.sent_at ? new Date(w.sent_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—')}</div>
              </div>
              <span style="padding:3px 10px;border-radius:50px;font-size:.68rem;font-weight:700;background:${borderColor}22;color:${labelColor};border:1px solid ${borderColor}44;">${labelText}</span>
            </div>
            <div style="font-size:.83rem;color:var(--text-secondary);line-height:1.6;padding:10px 14px;border-radius:10px;background:rgba(251,191,36,.06);border-left:3px solid #fbbf24;margin-bottom:10px;">
              ${esc(previewMsg)}
            </div>
            <div style="margin-bottom:14px;">
              <button onclick="viewWarningDetails(${w.id})" style="background:none;border:none;color:#60a5fa;font-size:.78rem;font-weight:600;cursor:pointer;padding:0;text-decoration:underline;">
                📄 View Full Details${hasPlan ? ' + Improvement Plan' : ''}
              </button>
            </div>
            ${!isCoolDown && !isBlocked ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button onclick="acknowledgeWarning(${w.id})" style="padding:7px 16px;border-radius:20px;font-size:.76rem;font-weight:700;cursor:pointer;border:1px solid rgba(74,222,128,.4);background:rgba(74,222,128,.12);color:#4ade80;">
                ✅ Acknowledge
              </button>
              <button onclick="openWarningAppealModal(${w.id})" style="padding:7px 16px;border-radius:20px;font-size:.76rem;font-weight:700;cursor:pointer;border:1px solid rgba(251,191,36,.4);background:rgba(251,191,36,.08);color:#fbbf24;">
                🔔 Appeal
              </button>
            </div>` : ''}
          </div>`;
      }).join('');
    } catch (e) { console.warn('Warning fetch failed:', e.message); }
  }

  window.viewWarningDetails = function(warningId) {
    const w = (window._adminWarnings || {})[warningId];
    if (!w) return;
    const msgSection = w.message ? `
      <div style="margin-bottom:${w.admin_improvement_plan ? '18px' : '0'}">
        <div style="font-size:.72rem;font-weight:700;color:#fbbf24;letter-spacing:.05em;margin-bottom:8px;">WARNING MESSAGE</div>
        <div style="padding:14px;border-radius:10px;background:rgba(251,191,36,.06);border-left:3px solid #fbbf24;font-size:.84rem;color:var(--text-primary);line-height:1.7;white-space:pre-wrap;word-break:break-word;">${esc(w.message)}</div>
      </div>` : '';
    const planSection = w.admin_improvement_plan ? `
      <div>
        <div style="font-size:.72rem;font-weight:700;color:#4ade80;letter-spacing:.05em;margin-bottom:8px;">IMPROVEMENT PLAN FROM ADMIN</div>
        <div style="padding:14px;border-radius:10px;background:rgba(74,222,128,.07);border-left:3px solid #4ade80;font-size:.84rem;color:var(--text-primary);line-height:1.7;white-space:pre-wrap;word-break:break-word;">${esc(w.admin_improvement_plan)}</div>
      </div>` : '';
    openModal(
      '⚠️ Admin Warning Details',
      `<div style="max-height:60vh;overflow-y:auto;padding-right:4px;">${msgSection}${planSection}</div>`,
      null, null
    );
  };

  window.acknowledgeWarning = async function(warningId) {
    try {
      await apiFetch('acknowledge_warning', 'POST', { warning_id: warningId });
      showToast('✅ Warning acknowledged.');
      loadAdminWarnings();
    } catch (e) { showToast('❌ ' + e.message, 4000); }
  };

  window.openWarningAppealModal = function(warningId) {
    openModal(
      '🔔 Appeal This Warning',
      '<p style="font-size:.84rem;color:var(--text-secondary);margin-bottom:14px;">If you believe this warning was issued in error, explain your reason below. The admin will review your appeal.</p>' +
      '<textarea id="warningAppealText" placeholder="e.g. My trust score dropped due to a system error..." style="width:100%;min-height:130px;padding:12px;border-radius:10px;background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--text-primary);font-size:.83rem;resize:vertical;font-family:inherit;line-height:1.5;box-sizing:border-box;"></textarea>',
      async () => {
        const el = document.getElementById('warningAppealText');
        const reason = el ? el.value.trim() : '';
        if (reason.length < 10) { showToast('⚠️ Please write at least 10 characters.', 3000); return; }
        try {
          await apiFetch('appeal_warning', 'POST', { warning_id: warningId, reason });
          showToast('✅ Appeal submitted. Admin will review shortly.');
          loadAdminWarnings();
        } catch (e) { showToast('❌ ' + e.message, 4000); }
      },
      'Submit Appeal'
    );
  };

  /* ── Toggle max price field based on request type ── */
  window.brTogglePriceField = function(val) {
    const wrap = document.getElementById('brMaxPriceWrap');
    const inp  = document.getElementById('brMaxPrice');
    if (!wrap) return;
    if (val === 'paid' || val === 'open') {
      wrap.style.display = '';
      if (inp) inp.required = (val === 'paid');
    } else {
      wrap.style.display = 'none';
      if (inp) { inp.value = ''; inp.required = false; }
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();