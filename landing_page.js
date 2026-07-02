/* ============================================================
   BloodBridge — landing_page.js
   Features: Theme | Language (EN/BN) | Live API | 3D Tilt | Mobile Nav
   ============================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     TRANSLATIONS
  ────────────────────────────────────────────── */
  var TRANSLATIONS = {
    en: {
      nav_home: "Home", nav_find_blood: "Find Blood", nav_donate: "Donate",
      nav_blood_banks: "Blood Banks", nav_about: "About",
      nav_emergency: "Emergency Request", nav_login: "Login",
      hero_badge: "Live Blood Network Active",
      hero_title_1: "Every Drop", hero_title_2: "Can Save a Life",
      hero_desc: "BloodBridge connects donors, recipients, and blood banks in real-time — cutting emergency response times and making life-saving blood accessible when it matters most.",
      btn_donate: "Donate Blood", btn_find: "Find Blood",
      stats_live: "Live Dashboard", stats_donors: "Donors",
      stats_banks: "Banks", stats_saved: "Saved",
      dash_donors: "Active Donors", dash_banks: "Blood Banks",
      dash_lives: "Lives Saved", dash_urgent: "Urgent Requests",
      dash_pending: "Pending", dash_expiring: "Expiring Soon",
      dash_temp: "Temp Alerts", dash_requests: "Requests",
      feat_title: "Why BloodBridge",
      feat_heading: "Built for speed.\nDesigned to save lives.",
      feat_sub: "A unified platform bridging every part of the blood supply chain — from donor to patient — in real time.",
      feat_1_title: "Real-Time Blood Tracking",
      feat_1_desc: "Monitor blood unit availability across all registered banks and hospitals with live inventory updates every 60 seconds.",
      feat_2_title: "Emergency Alerts",
      feat_2_desc: "Instantly broadcast urgent blood needs to nearby verified donors and partner facilities via SMS, app, and email.",
      feat_3_title: "Location-Based Matching",
      feat_3_desc: "Smart geo-matching connects the closest compatible donors to recipients within minutes, not hours.",
      feat_4_title: "Hospital Integration",
      feat_4_desc: "Seamless API connectivity with hospital EMR systems for automated blood requisition and real-time cross-matching.",
      feat_5_title: "Analytics Dashboard",
      feat_5_desc: "Comprehensive insights on donation trends, regional shortages, and supply forecasting for better health policy.",
      feat_6_title: "Secure & Verified",
      feat_6_desc: "All donors and facilities are identity-verified. Blood units are digitally tracked end-to-end with full chain of custody.",
      process_title: "Process", process_heading: "How it works",
      process_sub: "Three simple steps to connect life-saving blood with those who need it.",
      step_1_title: "Register & Verify",
      step_1_desc: "Donors, hospitals, and blood banks register with full identity and medical verification for a trusted network.",
      step_2_title: "Request or Offer",
      step_2_desc: "Hospitals post blood requests instantly. Donors receive geo-targeted alerts for compatible types nearby.",
      step_3_title: "Bridge the Gap",
      step_3_desc: "BloodBridge orchestrates logistics — matching, routing, and confirming delivery from donor to patient.",
      cta_badge: "Join 4,800+ Donors Today",
      cta_heading: "Be the Bridge.\nBe the Reason Someone Lives.",
      cta_desc: "It takes less than 10 minutes to donate, but it can mean a lifetime to a patient in need. Join our growing network of heroes.",
      cta_btn_1: "Register as Donor", cta_btn_2: "Request Blood Now",
      footer_copy: "Saving lives, one drop at a time.",
      footer_privacy: "Privacy", footer_terms: "Terms", footer_contact: "Contact",
      last_updated: "Last updated",
      stock_high: "High", stock_med: "Med", stock_low: "Low", stock_crit: "Crit"
    },
    bn: {
      nav_home: "হোম", nav_find_blood: "রক্ত খুঁজুন", nav_donate: "দান করুন",
      nav_blood_banks: "ব্লাড ব্যাংক", nav_about: "সম্পর্কে",
      nav_emergency: "জরুরি অনুরোধ", nav_login: "লগইন",
      hero_badge: "লাইভ রক্ত নেটওয়ার্ক সক্রিয়",
      hero_title_1: "প্রতিটি ফোঁটা", hero_title_2: "একটি জীবন বাঁচাতে পারে",
      hero_desc: "ব্লাডব্রিজ দাতা, রোগী এবং ব্লাড ব্যাংককে রিয়েল-টাইমে সংযুক্ত করে — জরুরি প্রতিক্রিয়ার সময় কমিয়ে এবং জীবন বাঁচানোর রক্ত সহজলভ্য করে তোলে।",
      btn_donate: "রক্ত দান করুন", btn_find: "রক্ত খুঁজুন",
      stats_live: "লাইভ ড্যাশবোর্ড", stats_donors: "দাতা",
      stats_banks: "ব্যাংক", stats_saved: "বাঁচানো",
      dash_donors: "সক্রিয় দাতা", dash_banks: "ব্লাড ব্যাংক",
      dash_lives: "বাঁচানো জীবন", dash_urgent: "জরুরি অনুরোধ",
      dash_pending: "অপেক্ষমান", dash_expiring: "মেয়াদ শেষ হচ্ছে",
      dash_temp: "তাপমাত্রা সতর্কতা", dash_requests: "অনুরোধ",
      feat_title: "কেন ব্লাডব্রিজ",
      feat_heading: "গতির জন্য তৈরি।\nজীবন বাঁচানোর জন্য ডিজাইন।",
      feat_sub: "একটি একীকৃত প্ল্যাটফর্ম যা রক্ত সরবরাহ চেইনের প্রতিটি অংশকে — দাতা থেকে রোগী পর্যন্ত — রিয়েল-টাইমে সংযুক্ত করে।",
      feat_1_title: "রিয়েল-টাইম রক্ত ট্র্যাকিং",
      feat_1_desc: "সমস্ত নিবন্ধিত ব্যাংক ও হাসপাতালে রক্তের ইউনিটের উপলব্ধতা নিরীক্ষণ করুন প্রতি ৬০ সেকেন্ডে লাইভ আপডেটের মাধ্যমে।",
      feat_2_title: "জরুরি সতর্কতা",
      feat_2_desc: "জরুরি রক্তের প্রয়োজন তাৎক্ষণিকভাবে নিকটবর্তী যাচাইকৃত দাতা এবং অংশীদার প্রতিষ্ঠানে এসএমএস, অ্যাপ এবং ইমেইলের মাধ্যমে প্রচার করুন।",
      feat_3_title: "অবস্থান-ভিত্তিক মিল",
      feat_3_desc: "স্মার্ট জিও-ম্যাচিং ঘন্টার পরিবর্তে মিনিটের মধ্যে নিকটতম সামঞ্জস্যপূর্ণ দাতাদের রোগীদের সাথে সংযুক্ত করে।",
      feat_4_title: "হাসপাতাল ইন্টিগ্রেশন",
      feat_4_desc: "স্বয়ংক্রিয় রক্ত চাহিদা এবং রিয়েল-টাইম ক্রস-ম্যাচিংয়ের জন্য হাসপাতাল ইএমআর সিস্টেমের সাথে সহজ এপিআই সংযোগ।",
      feat_5_title: "বিশ্লেষণ ড্যাশবোর্ড",
      feat_5_desc: "দানের প্রবণতা, আঞ্চলিক ঘাটতি এবং সরবরাহ পূর্বাভাসের বিস্তারিত অন্তর্দৃষ্টি উন্নত স্বাস্থ্য নীতির জন্য।",
      feat_6_title: "নিরাপদ ও যাচাইকৃত",
      feat_6_desc: "সমস্ত দাতা এবং প্রতিষ্ঠান পরিচয় যাচাইকৃত। রক্তের ইউনিট সম্পূর্ণ কাস্টডি চেইন সহ ডিজিটালি ট্র্যাক করা হয়।",
      process_title: "প্রক্রিয়া", process_heading: "এটি কীভাবে কাজ করে",
      process_sub: "জীবন বাঁচানোর রক্তকে যারা প্রয়োজন তাদের সাথে সংযুক্ত করতে তিনটি সহজ পদক্ষেপ।",
      step_1_title: "নিবন্ধন ও যাচাই",
      step_1_desc: "দাতা, হাসপাতাল এবং ব্লাড ব্যাংক একটি বিশ্বস্ত নেটওয়ার্কের জন্য সম্পূর্ণ পরিচয় ও চিকিৎসা যাচাইয়ের সাথে নিবন্ধন করে।",
      step_2_title: "অনুরোধ বা অফার",
      step_2_desc: "হাসপাতাল তাৎক্ষণিকভাবে রক্তের অনুরোধ পোস্ট করে। দাতারা নিকটবর্তী সামঞ্জস্যপূর্ণ ধরনের জন্য জিও-টার্গেটেড সতর্কতা পায়।",
      step_3_title: "ফাঁক পূরণ করুন",
      step_3_desc: "ব্লাডব্রিজ লজিস্টিক্স পরিচালনা করে — দাতা থেকে রোগী পর্যন্ত মিল, রুটিং এবং ডেলিভেরি নিশ্চিত করে।",
      cta_badge: "আজই ৪,৮০০+ দাতার সাথে যোগ দিন",
      cta_heading: "সেতু হন।\nকারো বেঁচে থাকার কারণ হন।",
      cta_desc: "দান করতে ১০ মিনিটেরও কম সময় লাগে, কিন্তু প্রয়োজনে একজন রোগীর জন্য এটি একটি জীবনকালের মতো। আমাদের বর্ধমান নায়কদের নেটওয়ার্কে যোগ দিন।",
      cta_btn_1: "দাতা হিসেবে নিবন্ধন করুন", cta_btn_2: "রক্তের অনুরোধ করুন",
      footer_copy: "প্রতিটি ফোঁটায় জীবন বাঁচানো।",
      footer_privacy: "গোপনীয়তা", footer_terms: "শর্তাবলী", footer_contact: "যোগাযোগ",
      last_updated: "সর্বশেষ আপডেট",
      stock_high: "উচ্চ", stock_med: "মধ্যম", stock_low: "কম", stock_crit: "জরুরি"
    }
  };

  var html = document.documentElement;
  var body = document.body;

  /* ──────────────────────────────────────────────
     HELPER: Safe element getter
  ────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function $$(sel) { return document.querySelectorAll(sel); }

  /* ──────────────────────────────────────────────
     1. THEME TOGGLE
  ────────────────────────────────────────────── */
  var themeToggle = $('themeToggle');
  var THEME_KEY = 'bb-theme';

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch(e) {}
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch(e) {}
    // Default to dark if nothing saved
    applyTheme(saved === 'light' ? 'light' : 'dark');
  }

  function toggleTheme() {
    var current = html.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  initTheme();

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
    themeToggle.setAttribute('role', 'button');
    themeToggle.setAttribute('tabindex', '0');
    themeToggle.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); }
    });
  }

  /* ──────────────────────────────────────────────
     2. LANGUAGE TOGGLE (EN / BN)
  ────────────────────────────────────────────── */
  var langToggle = $('langToggle');
  var LANG_KEY = 'bb-lang';

  function applyLanguage(lang) {
    body.setAttribute('lang', lang);
    try { localStorage.setItem(LANG_KEY, lang); } catch(e) {}
    updateTranslations(lang);
  }

  function initLanguage() {
    var saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch(e) {}
    // Default to English
    applyLanguage(saved === 'bn' ? 'bn' : 'en');
  }

  function toggleLanguage() {
    var current = body.getAttribute('lang') || 'en';
    applyLanguage(current === 'en' ? 'bn' : 'en');
  }

  function updateTranslations(lang) {
    var t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    var els = $$('[data-translate]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-translate');
      if (t[key] !== undefined) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = t[key];
        } else {
          // Handle line breaks in headings
          if (t[key].indexOf('\n') !== -1) {
            el.innerHTML = t[key].replace(/\n/g, '<br>');
          } else {
            el.textContent = t[key];
          }
        }
      }
    }
    html.setAttribute('lang', lang === 'bn' ? 'bn' : 'en');
  }

  initLanguage();

  if (langToggle) {
    langToggle.addEventListener('click', toggleLanguage);
    langToggle.setAttribute('role', 'button');
    langToggle.setAttribute('tabindex', '0');
    langToggle.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLanguage(); }
    });
  }

  /* ──────────────────────────────────────────────
     3. MOBILE HAMBURGER NAV
  ────────────────────────────────────────────── */
  var hamburger = $('hamburger');
  var mobileOverlay = $('mobileOverlay');

  function openMobileNav() {
    if (hamburger) hamburger.classList.add('open');
    if (mobileOverlay) mobileOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    if (hamburger) hamburger.classList.remove('open');
    if (mobileOverlay) mobileOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.closeMobileNav = closeMobileNav;

  if (hamburger) {
    hamburger.addEventListener('click', function() {
      if (hamburger.classList.contains('open')) closeMobileNav();
      else openMobileNav();
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function(e) {
      if (e.target === mobileOverlay) closeMobileNav();
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileNav();
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 900) closeMobileNav();
  });

  /* ──────────────────────────────────────────────
     4. SCROLL-REVEAL
  ────────────────────────────────────────────── */
  function initScrollReveal() {
    var reveals = $$('.reveal');
    if (!reveals.length) return;
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    reveals.forEach(function(el) { observer.observe(el); });
  }
  initScrollReveal();

  /* ──────────────────────────────────────────────
     5. NAVBAR SHADOW ON SCROLL
  ────────────────────────────────────────────── */
  var nav = $('mainNav') || document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 20) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }, { passive: true });
  }

  /* ──────────────────────────────────────────────
     6. BLOOD TYPE SELECTOR
  ────────────────────────────────────────────── */
  function initBloodTypeSelectors() {
    var groups = $$('.blood-types');
    groups.forEach(function(group) {
      var buttons = group.querySelectorAll('.bt');
      buttons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          buttons.forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
    });
  }
  initBloodTypeSelectors();

  /* ──────────────────────────────────────────────
     7. TICKER PAUSE ON HOVER
  ────────────────────────────────────────────── */
  var ticker = $('ticker');
  if (ticker && ticker.parentElement) {
    ticker.parentElement.addEventListener('mouseenter', function() {
      ticker.style.animationPlayState = 'paused';
    });
    ticker.parentElement.addEventListener('mouseleave', function() {
      ticker.style.animationPlayState = 'running';
    });
  }

  /* ──────────────────────────────────────────────
     8. MOUSE SPOTLIGHT
  ────────────────────────────────────────────── */
  var spotlight = $('mouse-spotlight');
  if (spotlight) {
    document.addEventListener('mousemove', function(e) {
      spotlight.style.left = e.clientX + 'px';
      spotlight.style.top = e.clientY + 'px';
    });
  }

  /* ──────────────────────────────────────────────
     9. 3D CARD TILT
  ────────────────────────────────────────────── */
  function init3DTilt() {
    if (window.innerWidth < 900) return;
    var cards = $$('.feature-card, .dashboard-card, .stats-card, .cta-inner');
    cards.forEach(function(card) {
      card.addEventListener('mousemove', function(e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var cx = rect.width / 2;
        var cy = rect.height / 2;
        var rx = ((y - cy) / cy) * -8;
        var ry = ((x - cx) / cx) * 8;
        card.style.transform = 'perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale3d(1.02,1.02,1.02)';
      });
      card.addEventListener('mouseleave', function() {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)';
      });
    });
  }
  init3DTilt();

  /* ──────────────────────────────────────────────
     10. COUNTER ANIMATION
  ────────────────────────────────────────────── */
  function animateCounter(el, target, duration) {
    var start = 0;
    var startTime = performance.now();
    function update(currentTime) {
      var elapsed = currentTime - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(start + (target - start) * ease);
      el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  /* ──────────────────────────────────────────────
     11. TOAST NOTIFICATIONS
  ────────────────────────────────────────────── */
  window.showToast = function(message, type) {
    type = type || 'info';
    var container = $('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast';
    var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span>' +
                      '<span class="toast-text">' + message + '</span>';
    container.appendChild(toast);
    setTimeout(function() {
      toast.classList.add('hiding');
      setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
  };

  /* ──────────────────────────────────────────────
     12. LIVE DATA POLLING
  ────────────────────────────────────────────── */
  var lastData = null;

  function getStockLabel(percent) {
    var lang = body.getAttribute('lang') || 'en';
    var t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    if (percent >= 60) return { text: t.stock_high, class: 'up' };
    if (percent >= 30) return { text: t.stock_med, class: 'up' };
    if (percent >= 10) return { text: t.stock_low, class: 'warn' };
    return { text: t.stock_crit, class: 'down' };
  }

  function safeSetText(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  function safeSetHTML(id, html) {
    var el = $(id);
    if (el) el.innerHTML = html;
  }

  function updateDashboard(data) {
    if (!data) return;

    // Update counters
    var counters = {
      'dash-donors': data.total_donors || 0,
      'dash-banks': data.total_banks || 0,
      'dash-lives': data.total_lives_saved || 0,
      'dash-urgent': data.urgent_requests || 0,
      'dash-pending': data.pending_requests || 0,
      'dash-expiring': data.expiring_soon || 0,
      'dash-temp': data.temp_alerts || 0,
      'dash-requests': (data.pending_requests || 0) + (data.urgent_requests || 0)
    };

    Object.keys(counters).forEach(function(id) {
      var el = $(id);
      if (el) {
        var newVal = counters[id];
        var oldVal = parseInt(el.getAttribute('data-value') || '0');
        if (newVal !== oldVal) {
          el.setAttribute('data-value', newVal);
          animateCounter(el, newVal, 1000);
        }
      }
    });

    // Hero stats
    safeSetText('hero-donors', (data.total_donors || 0).toLocaleString());
    safeSetText('hero-banks', (data.total_banks || 0).toLocaleString());
    safeSetText('hero-saved', (data.total_lives_saved || 0).toLocaleString());
    safeSetText('hero-donors-mobile', (data.total_donors || 0).toLocaleString());
    safeSetText('hero-banks-mobile', (data.total_banks || 0).toLocaleString());
    safeSetText('hero-saved-mobile', (data.total_lives_saved || 0).toLocaleString());

    // Blood stock
    if (data.blood_stock) {
      var allGroups = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
      var maxStock = 50;
      allGroups.forEach(function(group) {
        var el = $('stock-' + group);
        if (el) {
          var count = data.blood_stock[group] || 0;
          var percent = Math.min((count / maxStock) * 100, 100);
          var label = getStockLabel(percent);
          var availEl = el.querySelector('.avail');
          if (availEl) {
            availEl.textContent = label.text;
            availEl.className = 'avail ' + label.class;
          }
        }
      });
    }

    // Progress bars
    if (data.blood_stock) {
      var groups = ['O-', 'A+', 'B+'];
      groups.forEach(function(g, i) {
        var fill = $('progress-' + (i + 1));
        var label = $('progress-label-' + (i + 1));
        if (fill && data.blood_stock[g] !== undefined) {
          var percent = Math.min((data.blood_stock[g] / 50) * 100, 100);
          fill.style.width = percent + '%';
          if (label) label.textContent = Math.round(percent) + '%';
        }
      });
    }

    // Update ticker
    if (data.emergency_requests && data.emergency_requests.length > 0) {
      updateTicker(data.emergency_requests, true);
    } else if (data.recent_requests && data.recent_requests.length > 0) {
      updateTicker(data.recent_requests, false);
    }

    // Last updated
    var lastUpdated = $('last-updated');
    if (lastUpdated) {
      var lang = body.getAttribute('lang') || 'en';
      var t = TRANSLATIONS[lang] || TRANSLATIONS.en;
      var now = new Date();
      lastUpdated.textContent = t.last_updated + ': ' + now.toLocaleTimeString();
    }

    // Toast on significant changes
    if (lastData) {
      if ((data.urgent_requests || 0) > (lastData.urgent_requests || 0)) {
        showToast('New urgent blood request received!', 'warning');
      }
      if ((data.temp_alerts || 0) > (lastData.temp_alerts || 0)) {
        showToast('Temperature alert detected!', 'error');
      }
    }

    lastData = JSON.parse(JSON.stringify(data));
  }

  function updateTicker(items, isEmergency) {
    var tickerEl = $('ticker');
    if (!tickerEl) return;
    var html = '';
    items.forEach(function(item) {
      if (isEmergency) {
        html += '<div class="ticker-item"><span class="blood-tag">URGENT</span> ' +
                (item.extracted_blood_group || 'Blood') + ' needed at ' +
                (item.extracted_location || 'Unknown') + ' <span class="ticker-sep">•</span></div>';
      } else {
        html += '<div class="ticker-item"><span class="blood-tag">' + item.blood_group + '</span> ' +
                item.units_required + ' unit(s) — ' + item.urgency +
                ' <span class="ticker-sep">•</span></div>';
      }
    });
    tickerEl.innerHTML = html + html;
  }

  function fetchLiveData() {
    if (typeof fetch === 'undefined') return;
    fetch('landing_page_api.php')
      .then(function(res) { return res.json(); })
      .then(function(json) {
        if (json.success && json.data) {
          updateDashboard(json.data);
        }
      })
      .catch(function(err) {
        // Silently fail - page works without API
      });
  }

  // Initial fetch + polling
  fetchLiveData();
  setInterval(fetchLiveData, 10000);

  /* ──────────────────────────────────────────────
     13. FLOATING PARTICLES
  ────────────────────────────────────────────── */
  function initParticles() {
    var container = $('particles');
    if (!container) return;
    for (var i = 0; i < 15; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      var size = Math.random() * 6 + 2;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.animationDelay = (Math.random() * 15) + 's';
      p.style.animationDuration = (Math.random() * 10 + 10) + 's';
      container.appendChild(p);
    }
  }
  initParticles();

})();
