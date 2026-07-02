/* ============================================================
   BloodBridge — doctor_dash.js  (DATABASE-CONNECTED)
   API: doctor_api.php
   Session: role='user', sub_role='doctor'
   ============================================================ */
(function () {
  'use strict';

  const API = 'doctor_api.php';

  /* ── THEME ── */
  const html = document.documentElement;
  const THEME_KEY = 'bb-theme';
  function applyTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
  function getTheme()     { return localStorage.getItem(THEME_KEY) || 'dark'; }
  applyTheme(getTheme());
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => applyTheme(getTheme() === 'dark' ? 'light' : 'dark'));
    themeToggle.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){e.preventDefault();applyTheme(getTheme()==='dark'?'light':'dark');}});
  }

  /* ── SIDEBAR ── */
  const sidebar=document.getElementById('sidebar'), hamburger=document.getElementById('hamburger'),
        sidebarClose=document.getElementById('sidebarClose'), sidebarOverlay=document.getElementById('sidebarOverlay');
  function isMobile() { return window.innerWidth < 1024; }
  function openSidebar()  { sidebar?.classList.add('open'); if(isMobile()){sidebarOverlay?.classList.add('visible');document.body.style.overflow='hidden';} hamburger?.classList.add('open'); hamburger?.setAttribute('aria-expanded','true'); }
  function closeSidebar() { sidebar?.classList.remove('open'); if(isMobile()){sidebarOverlay?.classList.remove('visible');document.body.style.overflow='';} hamburger?.classList.remove('open'); hamburger?.setAttribute('aria-expanded','false'); }
  if (hamburger)      hamburger.addEventListener('click', e => { e.stopPropagation(); sidebar?.classList.contains('open') ? closeSidebar() : openSidebar(); });
  if (sidebarClose)   sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  window.addEventListener('resize', () => { isMobile() ? closeSidebar() : openSidebar(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape'&&isMobile()) closeSidebar(); });
  if (!isMobile()) openSidebar();

  /* ── NAVIGATION ── */
  const VIEW_MAP = { dashboard:'dashboardView', patients:'patientsView', antibodies:'antibodiesView',
    thalassemia:'thalassemiaView', transfusions:'transfusionsView', lab:'labView',
    pregnancy:'pregnancyView', mental:'mentalView', crossmatch:'crossmatchView', profile:'profileView' };

  function navigateTo(sec) {
    Object.values(VIEW_MAP).forEach(id => { const el=document.getElementById(id); if(el) el.classList.remove('active'); });
    const t = document.getElementById(VIEW_MAP[sec]||VIEW_MAP.dashboard); if(t) t.classList.add('active');
    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));
    const al = document.querySelector(`.sidebar-link[data-section="${sec}"]`); if(al) al.classList.add('active');
    if(isMobile()) closeSidebar();
    window.scrollTo({top:0,behavior:'smooth'}); initReveal();
    switch(sec){
      case 'dashboard':   loadDashboard();   break;
      case 'patients':    loadPatients();    break;
      case 'antibodies':  loadAntibodies();  break;
      case 'thalassemia': loadThalassemia(); break;
      case 'transfusions':loadTransfusions();break;
      case 'lab':         loadLab();         break;
      case 'pregnancy':   loadPregnancy();   break;
      case 'mental':      loadMentalHealth();break;
      case 'crossmatch':  loadCrossmatch();  break;
      case 'profile':     loadProfile();     break;
    }
    localStorage.setItem('bbDocPage', sec);
  }
  document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.addEventListener('click', e => { e.preventDefault(); navigateTo(l.getAttribute('data-section')); }));
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.getAttribute('data-nav')); }));

  /* ── UTILS ── */
  function on(id,ev,fn){const el=document.getElementById(id);if(el)el.addEventListener(ev,fn);}
  function txt(id,v){const el=document.getElementById(id);if(el)el.textContent=(v==null||v==='')?'—':v;}
  function setVal(id,v){const el=document.getElementById(id);if(el)el.value=(v==null)?'':v;}
  function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function fmtDate(ds,sh){if(!ds)return'—';const d=new Date(ds);if(isNaN(d))return ds;const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];return sh?`${m} ${d.getDate()}`:`${m} ${d.getDate()}, ${d.getFullYear()}`;}
  function timeAgo(ds){if(!ds)return'';const s=Math.floor((Date.now()-new Date(ds))/1000);if(s<60)return`${s}s ago`;if(s<3600)return`${Math.floor(s/60)} min ago`;if(s<86400)return`${Math.floor(s/3600)} hr ago`;return`${Math.floor(s/86400)} days ago`;}
  function todayISO(){return new Date().toISOString().slice(0,10);}
  function statusBadge(st){const m={pending:'badge-warn',approved:'badge-ok',rejected:'badge-danger',completed:'badge-ok','in_transit':'badge-blue'};return`<span class="status-badge ${m[st]||'badge-warn'}">${esc((st||'unknown').replace(/_/g,' '))}</span>`;}
  function urgencyColor(u){return u==='emergency'||u==='urgent'?'#f87171':'#fbbf24';}
  function urgencyBg(u){return u==='emergency'||u==='urgent'?'rgba(239,68,68,.12)':'rgba(251,191,36,.12)';}

  async function apiFetch(action,method,body){
    method=method||'GET';
    const opts={method,headers:{'Content-Type':'application/json'}};
    if(body)opts.body=JSON.stringify(body);
    const res=await fetch(`${API}?action=${action}`,opts);
    const data=await res.json().catch(()=>({success:false,error:`HTTP ${res.status}`}));
    if(!data.success&&res.status===401)throw new Error('AUTH_FAILED');
    if(!data.success)throw new Error(data.error||data.errors?.join(', ')||`HTTP ${res.status}`);
    return data;
  }

  /* ── TOAST ── */
  function showToast(msg,dur){
    dur=dur||3500;let t=document.getElementById('toastMessage');
    if(!t){t=document.createElement('div');t.id='toastMessage';t.className='toast-message';document.body.appendChild(t);}
    t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),dur);
  }

  /* ── REVEAL ── */
  function initReveal(){
    const els=document.querySelectorAll('.reveal:not(.visible)');
    if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('visible'));return;}
    const obs=new IntersectionObserver(en=>{en.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}});},{threshold:0.06,rootMargin:'0px 0px -40px 0px'});
    els.forEach(e=>obs.observe(e));
  }

  /* ── COUNTER ── */
  function animCount(el,target,dur){
    if(!el)return;dur=dur||900;let s=null;
    const step=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/dur,1);el.textContent=Math.floor((1-Math.pow(1-p,3))*target);if(p<1)requestAnimationFrame(step);else el.textContent=target;};
    requestAnimationFrame(step);
  }

  /* ── MODAL ── */
  const modal=document.getElementById('globalModal'),mTitle=document.getElementById('modalTitle'),mBody=document.getElementById('modalBody'),
        mConfirm=document.getElementById('modalConfirmBtn'),mCancel=document.getElementById('modalCancelBtn'),mClose=document.getElementById('closeModalBtn');
  let mAction=null;
  function openModal(title,content,onConfirm,confirmLabel){
    if(!modal)return;mTitle.textContent=title;mBody.innerHTML=content;
    if(mConfirm)mConfirm.textContent=confirmLabel||'Confirm';
    modal.style.display='flex';mAction=onConfirm||null;
  }
  function closeModal(){if(modal)modal.style.display='none';mAction=null;}
  if(mClose) mClose.addEventListener('click',closeModal);
  if(mCancel)mCancel.addEventListener('click',closeModal);
  if(mConfirm)mConfirm.addEventListener('click',()=>{if(mAction)mAction();closeModal();});
  if(modal)modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal?.style.display==='flex')closeModal();});

  function handleErr(err){if(err.message==='AUTH_FAILED'){showToast('⚠️ Session expired. Redirecting…',3000);setTimeout(()=>window.location.href='login.html',3000);}}
  const IS='background:var(--input-bg);border:1px solid var(--input-border);padding:8px 12px;border-radius:10px;width:100%;margin-top:6px;color:var(--text-primary);font-family:Outfit,sans-serif;';

  /* ══════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════ */
  async function loadDashboard(){
    try{
      const data=await apiFetch('dashboard');
      const d=data.doctor, s=data.stats;

      /* Sidebar + greeting */
      txt('greetName',    d.full_name);
      txt('doctorSubtitle', `${d.specialization||'Doctor'} · ${d.hospital_affiliation||'BloodBridge Medical'}`);
      txt('sidebarName', d.full_name);
      txt('sidebarRole', `${d.specialization||'Doctor'} · BloodBridge`);
      const sa=document.getElementById('sidebarAvatar');
      if(sa&&!sa.querySelector('img'))sa.textContent=d.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

      /* Stats */
      animCount(document.getElementById('statPatients'),     s.patient_count);
      animCount(document.getElementById('statPendingTrans'),  s.pending_trans);
      animCount(document.getElementById('statAntibodyAlerts'),s.antibody_alerts);
      animCount(document.getElementById('statThalAlerts'),    s.thal_alerts);
      animCount(document.getElementById('statMentalFlags'),   s.mental_flags);

      /* Alert pill */
      const pills=[];
      if(s.antibody_alerts>0) pills.push(`${s.antibody_alerts} antibody alert${s.antibody_alerts>1?'s':''}`);
      if(s.thal_alerts>0)     pills.push(`${s.thal_alerts} thalassemia alert${s.thal_alerts>1?'s':''}`);
      if(s.mental_flags>0)    pills.push(`${s.mental_flags} mental health flag${s.mental_flags>1?'s':''}`);
      txt('alertPillText', pills.length ? pills.join(', ') : 'No new alerts');

      /* Critical alerts grid */
      const alertsGrid=document.getElementById('criticalAlertsGrid');
      if(alertsGrid){
        const alerts=[];
        (data.antibody_alerts||[]).forEach(a=>{
          alerts.push({icon:'⚠️',title:`${esc(a.patient_name||'Patient')} has ${esc(a.antibody_name)}`,msg:`Blood group: ${esc(a.blood_group||'—')} · Detected: ${fmtDate(a.detected_at)}`,btnLabel:'Review',type:'antibody',data:a});
        });
        (data.thal_couples||[]).forEach(t=>{
          alerts.push({icon:'🧬',title:`Thalassemia couple alert #${t.id}`,msg:`${esc(t.name1||'?')} & ${esc(t.name2||'?')} · Risk: ${t.risk_percentage}%`,btnLabel:'View Pair',type:'thal',data:t});
        });
        if(!alerts.length){
          alertsGrid.innerHTML='<div class="glass-card" style="padding:20px;text-align:center;color:var(--text-muted);">✅ No critical alerts at this time.</div>';
        } else {
          alertsGrid.innerHTML=alerts.map((a,i)=>`
            <div class="alert-critical-card glass-card">
              <div class="alert-icon-critical">${a.icon}</div>
              <div class="alert-critical-content">
                <div class="alert-critical-title">${a.title}</div>
                <p class="alert-critical-msg">${a.msg}${a.data.advice?`<br><em>${esc(a.data.advice)}</em>`:''}</p>
              </div>
              <button class="btn-small critical-btn" onclick="handleCriticalAlert(${i})">  ${a.btnLabel}</button>
            </div>`).join('');
          window._dashAlerts=alerts;
        }
      }

      /* Pending transfusions table */
      const tbody=document.getElementById('dashTransfusionsBody');
      if(tbody){
        const reqs=data.pending_requests||[];
        tbody.innerHTML=reqs.length
          ?reqs.map(r=>{
            const ab=r.antibodies?`<span class="status-badge badge-danger">${esc(r.antibodies)}</span>`:`<span class="status-badge badge-ok">None</span>`;
            return`<tr>
              <td><strong>${esc(r.requester_name||'Unknown')}</strong></td>
              <td>${esc(r.blood_group)}</td>
              <td>${r.units_required} unit${r.units_required>1?'s':''}</td>
              <td>${ab}</td>
              <td><button class="table-btn" onclick="openApproveModal(${r.id},'${esc(r.requester_name||'Patient')}','${esc(r.blood_group)}','${esc(r.antibodies||'')}')">Review & Approve</button></td>
            </tr>`;
          }).join('')
          :'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">No pending transfusion requests.</td></tr>';
      }

      /* Clinical alerts list */
      const alertList=document.getElementById('dashClinicalAlerts');
      if(alertList){
        const items=[];
        (data.antibody_alerts||[]).forEach(a=>{
          items.push({cls:'alert-danger',icon:'🛡️',iconCls:'alert-icon-red',title:`${esc(a.antibody_name)} detected`,msg:`Patient <strong>${esc(a.patient_name||'Unknown')}</strong> · Blood group: ${esc(a.blood_group||'—')}`,time:timeAgo(a.detected_at),tag:'Urgent',tagCls:'tag-danger'});
        });
        (data.thal_couples||[]).forEach(t=>{
          items.push({cls:'alert-warning',icon:'🧬',iconCls:'alert-icon-orange',title:'Thalassemia carrier couple',msg:`${esc(t.name1||'?')} & ${esc(t.name2||'?')} · Risk: ${t.risk_percentage}%`,time:timeAgo(t.created_at),tag:'Counseling',tagCls:'tag-warning'});
        });
        if(s.mental_flags>0){
          items.push({cls:'alert-warning',icon:'🧠',iconCls:'alert-icon-orange',title:'Mental health flags pending',msg:`${s.mental_flags} unreferred flag${s.mental_flags>1?'s':''} require attention`,time:'',tag:'Review',tagCls:'tag-warning'});
        }
        if(!items.length){
          alertList.innerHTML='<div style="padding:14px;color:var(--text-muted);font-size:.82rem;text-align:center;">✅ No active clinical alerts.</div>';
        } else {
          alertList.innerHTML=items.map(it=>`
            <div class="alert-item ${it.cls}">
              <div class="alert-icon-wrap ${it.iconCls}">${it.icon}</div>
              <div class="alert-body">
                <div class="alert-title">${it.title}</div>
                <div class="alert-msg">${it.msg}</div>
                <div class="alert-meta"><span class="alert-time">${it.time}</span><span class="alert-tag ${it.tagCls}">${it.tag}</span></div>
              </div>
            </div>`).join('');
        }
      }

      /* Lab preview */
      const labGrid=document.getElementById('dashLabGrid');
      if(labGrid){
        const labs=data.lab_results||[];
        labGrid.innerHTML=labs.length
          ?labs.map(l=>{
            const sc=l.result==='negative'||l.result==='sterile'?'badge-ok':l.result==='pending'?'badge-warn':'badge-danger';
            return`<div class="lab-item"><span>Bag #${l.bag_id||'--'}</span><span>${esc(l.result||'--')}</span><span class="status-badge ${sc}">${esc(l.result||'--')}</span></div>`;
          }).join('')
          :'<div style="color:var(--text-muted);font-size:.82rem;padding:8px;">No lab results available.</div>';
      }

    }catch(err){handleErr(err);if(err.message!=='AUTH_FAILED')showToast('❌ Dashboard load failed: '+err.message,5000);}
    initReveal();
  }

  /* Expose for inline onclick */
  window.handleCriticalAlert = (idx) => {
    const alerts = window._dashAlerts||[];
    const a = alerts[idx];
    if (!a) return;
    if (a.type==='antibody') openAntibodyDetailModal(a.data);
    else openThalCoupleModal(a.data);
  };

  function openAntibodyDetailModal(a){
    openModal(`🛡️ Antibody Alert — ${esc(a.patient_name||'Patient')}`,
      `<p>Patient <strong>${esc(a.patient_name||'Unknown')}</strong> has <strong>${esc(a.antibody_name)}</strong> antibody.</p>
       <p>Blood group: <strong>${esc(a.blood_group||'—')}</strong></p>
       <p>Detected: ${fmtDate(a.detected_at)}</p>
       <p style="margin-top:12px;">⚠️ Ensure all blood requests for this patient use antigen-negative units. Manual crossmatch required.</p>`,
      ()=>showToast('Antibody alert noted. Manual review flagged.'),'Mark Reviewed');
  }

  function openThalCoupleModal(t){
    openModal(`🧬 Thalassemia Couple Alert #${t.id}`,
      `<p><strong>${esc(t.name1||'?')}</strong> & <strong>${esc(t.name2||'?')}</strong></p>
       <p>Risk: <strong>${t.risk_percentage}%</strong> chance of affected offspring.</p>
       ${t.advice?`<p>Advice: <em>${esc(t.advice)}</em></p>`:''}
       <p style="margin-top:12px;">📋 Genetic counseling and prenatal testing are strongly recommended.</p>`,
      ()=>showToast('Thalassemia case updated. Genetic counselor notified.'),'Confirm Counseling');
  }

  window.openApproveModal = (reqId, patientName, bloodGroup, antibodies) => {
    const hasAntibody = antibodies && antibodies.trim() !== '';
    openModal(`✅ Approve Request — ${esc(patientName)}`,
      `<p>Patient: <strong>${esc(patientName)}</strong> · Blood Group: <strong>${esc(bloodGroup)}</strong></p>
       ${hasAntibody?`<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px;margin:10px 0;"><strong>⚠️ Antibody Risk:</strong> ${esc(antibodies)}<br><small>Manual crossmatch required. Use antigen-negative units.</small></div>`:'<p style="color:#4ade80;">✅ No significant antibodies detected.</p>'}
       <div style="margin-top:14px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Decision</label>
         <select id="approvalDecision" style="${IS}"><option value="approved">Approve</option><option value="rejected">Reject</option></select>
       </div>
       <div style="margin-top:12px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Comments</label>
         <textarea id="approvalComments" rows="2" placeholder="Clinical notes (optional)..." style="${IS}resize:vertical;"></textarea>
       </div>`,
      async()=>{
        const decision=document.getElementById('approvalDecision')?.value||'approved';
        const comments=document.getElementById('approvalComments')?.value.trim()||'';
        try{
          await apiFetch('approve_request','POST',{request_id:reqId,decision,comments});
          showToast(`✅ Request ${decision} for ${patientName}.`);
          loadDashboard(); if(document.getElementById('transfusionsView')?.classList.contains('active')) loadTransfusions();
        }catch(e){showToast('❌ '+e.message,5000);}
      },`Submit Decision`);
  };

  /* ══════════════════════════════════════════════
     PATIENTS
  ══════════════════════════════════════════════ */
  async function loadPatients(bg){
    bg=bg||'all';
    const tbody=document.getElementById('patientsTableBody');
    if(tbody)tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>';
    try{
      const data=await apiFetch('patients'+(bg!=='all'?`&blood_group=${bg}`:''));
      const list=data.patients||[];
      if(tbody){
        tbody.innerHTML=list.length
          ?list.map((p,i)=>`<tr>
              <td>${i+1}</td>
              <td><strong>${esc(p.full_name)}</strong></td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.7rem;font-weight:700;background:rgba(192,22,44,.12);color:#FF6B6B;">${esc(p.blood_group||'—')}</span></td>
              <td>${esc(p.phone||'—')}</td>
              <td>${fmtDate(p.last_blood_request,true)||'No requests'}</td>
              <td>${p.antibodies?`<span class="status-badge badge-danger">${esc(p.antibodies)}</span>`:`<span class="status-badge badge-ok">None</span>`}</td>
              <td><button class="table-btn" onclick="viewPatientHistory(${p.id},'${esc(p.full_name)}')">History</button></td>
            </tr>`).join('')
          :'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No patients found.</td></tr>';
      }
    }catch(err){handleErr(err);if(tbody)tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:#f87171;padding:24px;">⚠️ ${esc(err.message)}</td></tr>`;}
  }
  on('patientFilterBG','change',()=>loadPatients(document.getElementById('patientFilterBG')?.value||'all'));
  on('addPatientBtn','click',openAddPatientModal);

  function openAddPatientModal(){
    openModal('👥 Register Patient',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Full Name *</label><input type="text" id="newPtName" style="${IS}"></div>
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Blood Group *</label>
           <select id="newPtBG" style="${IS}"><option value="">Select...</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Phone</label><input type="tel" id="newPtPhone" style="${IS}"></div>
         <div><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">National ID</label><input type="text" id="newPtNatId" style="${IS}"></div>
         <div style="grid-column:1/-1;"><label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Address</label><input type="text" id="newPtAddress" style="${IS}"></div>
       </div>`,
      async()=>{
        const name=document.getElementById('newPtName')?.value.trim();
        const bg=document.getElementById('newPtBG')?.value;
        if(!name||name.length<2){showToast('⚠️ Patient name required.');return;}
        if(!bg){showToast('⚠️ Blood group required.');return;}
        try{
          await apiFetch('add_patient','POST',{full_name:name,blood_group:bg,phone:document.getElementById('newPtPhone')?.value.trim(),national_id:document.getElementById('newPtNatId')?.value.trim(),address:document.getElementById('newPtAddress')?.value.trim()});
          showToast('✅ Patient registered!');loadPatients();
        }catch(e){showToast('❌ '+e.message,5000);}
      },'Register Patient');
  }

  window.viewPatientHistory=(id,name)=>{
    showToast(`Loading history for ${name}…`);
    navigateTo('transfusions');
  };

  /* ══════════════════════════════════════════════
     ANTIBODIES
  ══════════════════════════════════════════════ */
  async function loadAntibodies(){
    const tbody=document.getElementById('antibodyTableBody');
    if(tbody)tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    const mc=document.getElementById('matchSuggestionsContainer');
    if(mc)mc.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-muted);"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading suggestions...</div>';
    try{
      const [abData, msData] = await Promise.all([apiFetch('antibodies'), apiFetch('match_suggestions')]);
      const list=abData.antibodies||[];
      if(tbody){
        tbody.innerHTML=list.length
          ?list.map(a=>`<tr>
              <td>${esc(a.patient_name||'—')}</td>
              <td><span class="status-badge badge-danger">${esc(a.antibody_name)}</span></td>
              <td>${a.is_donor?'Donor':'Recipient'}</td>
              <td>${fmtDate(a.detected_at)}</td>
              <td><button class="table-btn" onclick="openAntibodyDetailModal2(${JSON.stringify(a).replace(/"/g,'&quot;')})">Details</button></td>
            </tr>`).join('')
          :'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No antibody records found.</td></tr>';
      }
      if(mc){
        const sugg=msData.suggestions||[];
        mc.innerHTML=sugg.length
          ?sugg.map(s=>{
            const pct=s.compatibility_score?Math.round(s.compatibility_score*100)+'%':'—';
            const sc=parseFloat(s.compatibility_score||0)>0.8?'badge-ok':parseFloat(s.compatibility_score||0)>0.5?'badge-warn':'badge-danger';
            return`<div class="match-card">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div><div style="font-weight:600;font-size:.84rem;">Recipient: ${esc(s.recipient_name||'—')}</div><div style="font-size:.74rem;color:var(--text-muted);">Donor: ${esc(s.donor_name||'—')}</div></div>
                <span class="status-badge ${sc}">${pct}</span>
              </div>
              ${s.reason?`<div style="font-size:.74rem;color:var(--text-muted);margin-top:4px;">${esc(s.reason)}</div>`:''}
              ${s.was_accepted!==null?`<div style="font-size:.7rem;margin-top:4px;color:${s.was_accepted?'#4ade80':'#f87171'}">${s.was_accepted?'✅ Accepted':'❌ Rejected'}</div>`:''}
            </div>`;
          }).join('')
          :'<div style="padding:20px;color:var(--text-muted);font-size:.82rem;text-align:center;">No match suggestions available.</div>';
      }
    }catch(err){handleErr(err);if(tbody)tbody.innerHTML=`<tr><td colspan="5" style="text-align:center;color:#f87171;padding:24px;">⚠️ ${esc(err.message)}</td></tr>`;}
  }
  window.openAntibodyDetailModal2=a=>openAntibodyDetailModal(a);

  /* ══════════════════════════════════════════════
     THALASSEMIA
  ══════════════════════════════════════════════ */
  async function loadThalassemia(){
    const tb1=document.getElementById('thalCarrierBody'), tb2=document.getElementById('thalCoupleBody');
    if(tb1)tb1.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    if(tb2)tb2.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try{
      const data=await apiFetch('thalassemia');
      if(tb1){
        const carriers=data.carriers||[];
        tb1.innerHTML=carriers.length
          ?carriers.map(c=>`<tr>
              <td>${esc(c.patient_name||'—')}</td>
              <td><span class="status-badge ${c.is_carrier?'badge-warn':'badge-ok'}">${c.is_carrier?'Yes — Carrier':'No'}</span></td>
              <td>${esc(c.confirmed_by_name||'—')}</td>
              <td>${fmtDate(c.confirmed_at)}</td>
              <td><button class="table-btn" onclick="openThalUpdateModal(${c.id},${c.is_carrier})">Update</button></td>
            </tr>`).join('')
          :'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No carrier records found.</td></tr>';
      }
      if(tb2){
        const couples=data.couples||[];
        tb2.innerHTML=couples.length
          ?couples.map(t=>`<tr>
              <td>#${t.id}</td>
              <td><span style="font-weight:700;color:#f87171;">${t.risk_percentage}%</span></td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(t.advice||'')}">${esc((t.advice||'').slice(0,50))||'—'}</td>
              <td>${fmtDate(t.created_at)}</td>
              <td><button class="table-btn" onclick="openThalCoupleModal(${JSON.stringify(t).replace(/"/g,'&quot;')})">View</button></td>
            </tr>`).join('')
          :'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No couple alerts found.</td></tr>';
      }
    }catch(err){handleErr(err);showToast('❌ '+err.message,5000);}
  }

  window.openThalUpdateModal=(id,currentCarrier)=>{
    openModal('🧬 Update Thalassemia Status',
      `<p>Carrier Record ID: <strong>#${id}</strong></p>
       <label style="display:block;margin-top:14px;font-size:.78rem;font-weight:600;color:var(--text-muted);">Carrier Status
         <select id="thalStatusSel" style="${IS}">
           <option value="1" ${currentCarrier?'selected':''}>Yes — Carrier</option>
           <option value="0" ${!currentCarrier?'selected':''}>No — Not Carrier</option>
         </select>
       </label>`,
      async()=>{
        const status=parseInt(document.getElementById('thalStatusSel')?.value||'1');
        try{await apiFetch('update_thal_status','POST',{thal_carrier_id:id,is_carrier:status});showToast('✅ Thalassemia status updated!');loadThalassemia();}
        catch(e){showToast('❌ '+e.message,5000);}
      },'Update Status');
  };

  /* ══════════════════════════════════════════════
     TRANSFUSIONS
  ══════════════════════════════════════════════ */
  async function loadTransfusions(statusFilter){
    statusFilter=statusFilter||'pending';
    const tbody=document.getElementById('transTableBody'), hbody=document.getElementById('transHistoryBody');
    if(tbody)tbody.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    if(hbody)hbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try{
      const data=await apiFetch('transfusions'+(statusFilter!=='all'?`&status=${statusFilter}`:''));
      const reqs=data.requests||[];
      if(tbody){
        tbody.innerHTML=reqs.length
          ?reqs.map(r=>{
            const ab=r.antibodies?`<span class="status-badge badge-danger">${esc(r.antibodies)}</span>`:`<span class="status-badge badge-ok">None</span>`;
            return`<tr>
              <td><strong>#REQ-${String(r.id).padStart(4,'0')}</strong></td>
              <td>${esc(r.requester_name||'—')}</td>
              <td>${esc(r.blood_group)}</td>
              <td>${r.units_required}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.68rem;font-weight:700;background:${urgencyBg(r.urgency)};color:${urgencyColor(r.urgency)}">${(r.urgency||'normal').toUpperCase()}</span></td>
              <td>${ab}</td>
              <td>${fmtDate(r.requested_at)}</td>
              <td>${r.status==='pending'?`<button class="table-btn" onclick="openApproveModal(${r.id},'${esc(r.requester_name||'Patient')}','${esc(r.blood_group)}','${esc(r.antibodies||'')}')">Approve</button>`:statusBadge(r.status)}</td>
            </tr>`;
          }).join('')
          :'<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No requests found.</td></tr>';
      }
      if(hbody){
        const hist=data.history||[];
        hbody.innerHTML=hist.length
          ?hist.map((h,i)=>`<tr>
              <td>${hist.length-i}</td>
              <td>${fmtDate(h.issued_at)}</td>
              <td>${esc(h.recipient_name||'—')}</td>
              <td>${esc(h.blood_group||'—')}</td>
              <td>${esc(h.hospital_name||'—')}</td>
              <td><span style="padding:2px 8px;border-radius:50px;font-size:.7rem;font-weight:700;background:${h.crossmatch_result==='compatible'?'rgba(74,222,128,.12)':'rgba(251,191,36,.12)'};color:${h.crossmatch_result==='compatible'?'#4ade80':'#fbbf24'}">${esc(h.crossmatch_result||'pending')}</span></td>
              <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(h.reaction_notes||'')}">${esc((h.reaction_notes||'—').slice(0,30))}</td>
              <td><button class="table-btn" onclick="openRecordOutcomeModal(${h.id},'${esc(h.recipient_name||'Unknown')}')">${h.reaction_notes?'Update':'Record'}</button></td>
            </tr>`).join('')
          :'<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No transfusion history.</td></tr>';
      }
    }catch(err){handleErr(err);if(tbody)tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:#f87171;padding:24px;">⚠️ ${esc(err.message)}</td></tr>`;}
  }
  on('transFilterStatus','change',()=>loadTransfusions(document.getElementById('transFilterStatus')?.value||'pending'));
  on('refreshTransBtn','click',()=>loadTransfusions(document.getElementById('transFilterStatus')?.value||'pending'));

  /* ══════════════════════════════════════════════
     LAB RESULTS
  ══════════════════════════════════════════════ */
  async function loadLab(){
    const cb=document.getElementById('labCultureBody'), hb=document.getElementById('labHealthBody');
    if(cb)cb.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    if(hb)hb.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try{
      const data=await apiFetch('lab');
      if(cb){
        const cultures=data.cultures||[];
        cb.innerHTML=cultures.length
          ?cultures.map((c,i)=>{
            const sc=c.result==='negative'||c.result==='sterile'?'badge-ok':c.result==='pending'?'badge-warn':'badge-danger';
            return`<tr>
              <td>${i+1}</td>
              <td>${fmtDate(c.test_date)}</td>
              <td>Bag #${c.bag_id||'--'}</td>
              <td><span class="status-badge ${sc}">${esc(c.result||'—')}</span></td>
              <td>${esc(c.pathogen_detected||'—')}</td>
              <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc((c.comments||'').slice(0,50))||'—'}</td>
            </tr>`;
          }).join('')
          :'<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No blood culture tests found.</td></tr>';
      }
      if(hb){
        const hr=data.health_records||[];
        hb.innerHTML=hr.length
          ?hr.map(r=>`<tr>
              <td>${esc(r.donor_name||'—')}</td>
              <td>${fmtDate(r.recorded_at)}</td>
              <td style="color:${parseFloat(r.haemoglobin||0)<12.5?'#f87171':'#4ade80'}">${r.haemoglobin||'—'} g/dL</td>
              <td>${r.blood_pressure_sys?`${r.blood_pressure_sys}/${r.blood_pressure_dia}`:'—'}</td>
              <td>${r.pulse||'—'} bpm</td>
              <td>${r.weight_kg||'—'} kg</td>
              <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc((r.notes||'').slice(0,50))||'—'}</td>
            </tr>`).join('')
          :'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No health records found.</td></tr>';
      }
    }catch(err){handleErr(err);if(cb)cb.innerHTML=`<tr><td colspan="6" style="text-align:center;color:#f87171;padding:24px;">⚠️ ${esc(err.message)}</td></tr>`;}
  }

  /* ══════════════════════════════════════════════
     PREGNANCY
  ══════════════════════════════════════════════ */
  async function loadPregnancy(){
    const tbody=document.getElementById('pregnancyBody');
    if(tbody)tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Loading...</td></tr>';
    try{
      const data=await apiFetch('pregnancy');
      const list=data.records||[];
      if(tbody){
        tbody.innerHTML=list.length
          ?list.map((p,i)=>`<tr>
              <td>${i+1}</td>
              <td>${esc(p.mother_name||'—')}</td>
              <td>${esc(p.mother_blood_group)}</td>
              <td>${esc(p.father_blood_group)}</td>
              <td>${esc(p.predicted_baby_blood_group||'—')}</td>
              <td>${fmtDate(p.expected_delivery_date)}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(p.risk_advice||'')}">${esc((p.risk_advice||'').slice(0,60))||'—'}</td>
            </tr>`).join('')
          :'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No pregnancy records found.</td></tr>';
      }
    }catch(err){handleErr(err);if(tbody)tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:#f87171;padding:24px;">⚠️ ${esc(err.message)}</td></tr>`;}
  }

  /* ══════════════════════════════════════════════
     PROFILE
  ══════════════════════════════════════════════ */
  async function loadProfile(){
    try{
      const data=await apiFetch('profile');
      const p=data.profile;
      const initials=p.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const ava=document.getElementById('profAvatarCircle');
      if(ava&&!ava.querySelector('img'))ava.textContent=initials;
      txt('profNameDisplay',  p.full_name);
      txt('profSpecDisplay',  p.specialization||'Doctor');
      txt('profIdDisplay',    'DOC-'+String(p.id).padStart(4,'0'));
      txt('profHospDisplay',  'Hospital: '+(p.hospital_affiliation||'—'));
      txt('profLicenseDisplay','License: '+(p.license_no||'—'));
      setVal('profUserId',    'DOC-'+String(p.id).padStart(4,'0'));
      setVal('profCreatedAt', fmtDate(p.created_at));
      setVal('profFullName',  p.full_name);
      setVal('profEmail',     p.email);
      setVal('profPhone',     p.phone||'');
      setVal('profSpec',      p.specialization||'');
      setVal('profLicense',   p.license_no||'');
      setVal('profHospital',  p.hospital_affiliation||'');
      txt('sidebarName', p.full_name);
      txt('sidebarRole', `${p.specialization||'Doctor'} · BloodBridge`);
      const sa=document.getElementById('sidebarAvatar');
      if(sa&&!sa.querySelector('img'))sa.textContent=initials;
    }catch(err){handleErr(err);showToast('❌ Profile load failed: '+err.message,5000);}
  }

  /* Profile edit/save */
  const PROF_FIELDS=['profFullName','profEmail','profPhone','profSpec','profLicense','profHospital'];
  let pOrig={};
  function enableProfEdit(){PROF_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=false;});const eb=document.getElementById('editProfBtn');if(eb)eb.style.display='none';const sb=document.getElementById('saveProfBtn');if(sb)sb.style.display='';const cb=document.getElementById('cancelProfBtn');if(cb)cb.style.display='';const fa=document.getElementById('profFormActions');if(fa)fa.style.display='flex';}
  function disableProfEdit(){PROF_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=true;});const eb=document.getElementById('editProfBtn');if(eb)eb.style.display='';const sb=document.getElementById('saveProfBtn');if(sb)sb.style.display='none';const cb=document.getElementById('cancelProfBtn');if(cb)cb.style.display='none';const fa=document.getElementById('profFormActions');if(fa)fa.style.display='none';}
  function saveOrigProf(){PROF_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)pOrig[id]=el.value;});}
  function restoreOrigProf(){PROF_FIELDS.forEach(id=>{const el=document.getElementById(id);if(el)el.value=pOrig[id]||'';});}
  async function saveProfile(){
    const fn=document.getElementById('profFullName')?.value.trim();
    const em=document.getElementById('profEmail')?.value.trim();
    if(!fn||fn.length<2){showToast('⚠️ Name required.',4000);return;}
    if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){showToast('⚠️ Valid email required.',4000);return;}
    try{
      await apiFetch('update_profile','POST',{full_name:fn,email:em,phone:document.getElementById('profPhone')?.value.trim(),specialization:document.getElementById('profSpec')?.value.trim(),license_no:document.getElementById('profLicense')?.value.trim(),hospital_affiliation:document.getElementById('profHospital')?.value.trim()});
      disableProfEdit();showToast('✅ Profile updated!');
      txt('profNameDisplay',fn);txt('sidebarName',fn);
      const ava=document.getElementById('profAvatarCircle');if(ava&&!ava.querySelector('img'))ava.textContent=fn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    }catch(e){showToast('❌ '+e.message,5000);}
  }
  on('editProfBtn',    'click',()=>{saveOrigProf();enableProfEdit();});
  on('cancelProfBtn',  'click',()=>{restoreOrigProf();disableProfEdit();});
  on('cancelProfBtn2', 'click',()=>{restoreOrigProf();disableProfEdit();});
  on('saveProfBtn',    'click',saveProfile);
  const pf=document.getElementById('profileForm');if(pf)pf.addEventListener('submit',e=>{e.preventDefault();saveProfile();});

  /* ── ACTION CARDS ── */
  const ACTION_MAP={
    manageAntibodies:  ()=>navigateTo('antibodies'),
    antibodyMatch:     ()=>navigateTo('antibodies'),
    confirmThalassemia:()=>navigateTo('thalassemia'),
    cultureResults:    ()=>navigateTo('lab'),
    healthTrend:       ()=>navigateTo('lab'),
    pregnancyRisk:     ()=>navigateTo('pregnancy'),
    approveRequests:   ()=>navigateTo('transfusions'),
    mentalHealth:      ()=>navigateTo('mental'),
    crossmatchAuth:    ()=>navigateTo('crossmatch'),
    recordOutcomes:    ()=>navigateTo('transfusions'),
  };
  document.querySelectorAll('.action-card[data-action]').forEach(card=>{
    const a=card.getAttribute('data-action');
    card.addEventListener('click',()=>ACTION_MAP[a]?ACTION_MAP[a]():showToast('🔧 Coming soon!'));
  });

  /* ── nav buttons ── */
  on('viewAllTransfusionsBtn','click',()=>navigateTo('transfusions'));
  on('viewAllLabBtn','click',()=>navigateTo('lab'));
  on('refreshCrossmatchBtn','click',()=>loadCrossmatch(document.getElementById('crossmatchFilter')?.value||'pending'));
  on('crossmatchFilter','change',()=>loadCrossmatch(document.getElementById('crossmatchFilter')?.value||'pending'));

  /* ══════════════════════════════════════════════
     MENTAL HEALTH FLAGS
  ══════════════════════════════════════════════ */
  async function loadMentalHealth(){
    const tbody=document.getElementById('mentalHealthBody'), summary=document.getElementById('mentalReferralSummary');
    if(tbody)tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>';
    if(summary)summary.innerHTML='<div style="padding:14px;color:var(--text-muted);font-size:.82rem;text-align:center;">Loading summary...</div>';
    try{
      const data=await apiFetch('mental_health');
      const flags=data.flags||[];
      if(tbody){
        tbody.innerHTML=flags.length
          ?flags.map((f,i)=>{
            const sevClass=f.severity==='high'?'badge-danger':f.severity==='medium'?'badge-warn':'badge-ok';
            return `<tr>
              <td>${i+1}</td>
              <td><strong>${esc(f.user_name||'Unknown')}</strong></td>
              <td><span class="status-badge badge-danger">${esc(f.flag_type||'—')}</span></td>
              <td><span class="status-badge ${sevClass}">${esc(f.severity||'low')}</span></td>
              <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(f.keywords_found||'')}">${esc((f.keywords_found||'—').slice(0,40))}</td>
              <td>${f.psychologist_referred?'<span class="status-badge badge-ok">✅ Referred</span>':'<span class="status-badge badge-warn">⏳ Pending</span>'}</td>
              <td>${!f.psychologist_referred?`<button class="table-btn" onclick="referPsychologist(${f.id})">Refer</button>`:`<span style="font-size:.7rem;color:var(--text-muted);">Done</span>`}</td>
            </tr>`;
          }).join('')
          :'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No mental health flags found.</td></tr>';
      }
      if(summary){
        const total=flags.length;
        const referred=flags.filter(f=>f.psychologist_referred).length;
        const high=flags.filter(f=>f.severity==='high').length;
        summary.innerHTML=`
          <div style="padding:10px 0;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--table-border);font-size:.82rem;">
              <span style="color:var(--text-muted);">Total Flags</span><span style="font-weight:700;">${total}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--table-border);font-size:.82rem;">
              <span style="color:var(--text-muted);">Referred</span><span style="font-weight:700;color:#4ade80;">${referred}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--table-border);font-size:.82rem;">
              <span style="color:var(--text-muted);">High Severity</span><span style="font-weight:700;color:#f87171;">${high}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.82rem;">
              <span style="color:var(--text-muted);">Pending Referral</span><span style="font-weight:700;color:#fbbf24;">${total-referred}</span>
            </div>
          </div>
          ${high>0?'<div style="margin-top:10px;padding:10px;background:rgba(239,68,68,.08);border-radius:10px;font-size:.78rem;color:#f87171;text-align:center;">⚠️ High severity flags require immediate psychological consultation.</div>':''}
        `;
      }
    }catch(err){handleErr(err);if(tbody)tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:#f87171;padding:24px;">⚠️ ${esc(err.message)}</td></tr>`;}
  }

  window.referPsychologist=async(flagId)=>{
    try{
      await apiFetch('refer_psychologist','POST',{flag_id:flagId});
      showToast('✅ Psychologist referral submitted.');
      loadMentalHealth();
    }catch(e){showToast('❌ '+e.message,5000);}
  };

  /* ══════════════════════════════════════════════
     CROSSMATCH TESTS
  ══════════════════════════════════════════════ */
  async function loadCrossmatch(filter){
    filter=filter||'pending';
    const tbody=document.getElementById('crossmatchBody');
    if(tbody)tbody.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;"><div class="loader-spin" style="margin:0 auto 8px;"></div>Loading...</td></tr>';
    try{
      const data=await apiFetch('crossmatch'+(filter!=='all'?`&status=${filter}`:''));
      const tests=data.tests||[];
      if(tbody){
        tbody.innerHTML=tests.length
          ?tests.map((t,i)=>{
            const mc=t.major_crossmatch==='compatible'?'badge-ok':t.major_crossmatch==='incompatible'?'badge-danger':'badge-warn';
            const mc2=t.minor_crossmatch==='compatible'?'badge-ok':t.minor_crossmatch==='incompatible'?'badge-danger':'badge-warn';
            return `<tr>
              <td>${i+1}</td>
              <td><strong>${esc(t.recipient_name||'—')}</strong></td>
              <td>Bag #${t.blood_bag_id||'—'}</td>
              <td><span class="status-badge ${mc}">${esc(t.major_crossmatch||'—')}</span></td>
              <td><span class="status-badge ${mc2}">${esc(t.minor_crossmatch||'—')}</span></td>
              <td>${esc(t.antibody_screen||'—')}</td>
              <td>${fmtDate(t.test_date)}</td>
              <td>${t.major_crossmatch==='pending'||t.minor_crossmatch==='pending'?`<button class="table-btn" onclick="openAuthorizeModal(${t.id},'${esc(t.recipient_name||'Unknown')}')">Authorize</button>`:`<span style="font-size:.7rem;color:var(--text-muted);">${t.authorized?'✅ Authorized':'—'}</span>`}</td>
            </tr>`;
          }).join('')
          :'<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No crossmatch tests found.</td></tr>';
      }
    }catch(err){handleErr(err);if(tbody)tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:#f87171;padding:24px;">⚠️ ${esc(err.message)}</td></tr>`;}
  }

  window.openAuthorizeModal=(testId,recipientName)=>{
    openModal('🔬 Authorize Crossmatch Test',
      `<p>Test ID: <strong>#${testId}</strong> · Recipient: <strong>${esc(recipientName)}</strong></p>
       <div style="margin-top:14px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Major Crossmatch</label>
         <select id="authMajor" style="${IS}"><option value="compatible">Compatible</option><option value="incompatible">Incompatible</option><option value="pending">Pending</option></select>
       </div>
       <div style="margin-top:12px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Minor Crossmatch</label>
         <select id="authMinor" style="${IS}"><option value="compatible">Compatible</option><option value="incompatible">Incompatible</option><option value="pending">Pending</option></select>
       </div>
       <div style="margin-top:12px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Antibody Screen</label>
         <input type="text" id="authAntibodyScreen" style="${IS}" placeholder="e.g., Negative, Anti-D detected" />
       </div>
       <div style="margin-top:12px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Notes</label>
         <textarea id="authNotes" rows="2" style="${IS}resize:vertical;" placeholder="Clinical notes..."></textarea>
       </div>`,
      async()=>{
        const major=document.getElementById('authMajor')?.value||'compatible';
        const minor=document.getElementById('authMinor')?.value||'compatible';
        const ab=document.getElementById('authAntibodyScreen')?.value.trim()||'';
        const notes=document.getElementById('authNotes')?.value.trim()||'';
        try{
          await apiFetch('authorize_crossmatch','POST',{test_id:testId,major_crossmatch:major,minor_crossmatch:minor,antibody_screen:ab,notes});
          showToast(`✅ Crossmatch test #${testId} authorized.`);
          loadCrossmatch(document.getElementById('crossmatchFilter')?.value||'pending');
        }catch(e){showToast('❌ '+e.message,5000);}
      },'Authorize');
  };

  /* ══════════════════════════════════════════════
     RECORD TRANSFUSION OUTCOMES
  ══════════════════════════════════════════════ */
  window.openRecordOutcomeModal=(transfusionId,recipientName)=>{
    openModal('📋 Record Transfusion Outcome',
      `<p>Transfusion #<strong>${transfusionId}</strong> · Recipient: <strong>${esc(recipientName)}</strong></p>
       <div style="margin-top:14px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Outcome</label>
         <select id="outcomeStatus" style="${IS}"><option value="successful">✅ Successful</option><option value="minor_reaction">⚠️ Minor Reaction</option><option value="major_reaction">❌ Major Reaction</option></select>
       </div>
       <div style="margin-top:12px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Reaction Notes</label>
         <textarea id="outcomeNotes" rows="3" style="${IS}resize:vertical;" placeholder="Describe any adverse reactions, vitals, or clinical observations..."></textarea>
       </div>
       <div style="margin-top:12px;">
         <label style="font-size:.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Crossmatch Result (if applicable)</label>
         <select id="outcomeCrossmatch" style="${IS}"><option value="">Not tested</option><option value="compatible">Compatible</option><option value="incompatible">Incompatible</option></select>
       </div>`,
      async()=>{
        const outcome=document.getElementById('outcomeStatus')?.value||'successful';
        const notes=document.getElementById('outcomeNotes')?.value.trim()||'';
        const xmatch=document.getElementById('outcomeCrossmatch')?.value||'';
        try{
          await apiFetch('record_outcome','POST',{transfusion_id:transfusionId,outcome:outcome,reaction_notes:notes,crossmatch_result:xmatch});
          showToast('✅ Transfusion outcome recorded.');
          loadDashboard(); loadTransfusions();
        }catch(e){showToast('❌ '+e.message,5000);}
      },'Record Outcome');
  };

  /* ── INIT ── */
  function init(){
    initReveal();
    const saved = localStorage.getItem('bbDocPage');
    if (saved && document.querySelector(`.sidebar-link[data-section="${saved}"]`)) {
      navigateTo(saved);
    } else {
      loadDashboard();
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();