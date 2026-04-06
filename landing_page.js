/* ============================================================
   BloodBridge — script.js
   Features:
   1. Dark / Light theme toggle (persists via localStorage)
   2. Mobile hamburger navigation
   3. Scroll-reveal animations (IntersectionObserver)
   4. Blood type selector (hero stats card)
   5. Ticker duplication guard
   ============================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     1. THEME TOGGLE
  ────────────────────────────────────────────── */
  const html        = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const THEME_KEY   = 'bb-theme';

  /** Apply a theme ('dark' | 'light') and persist it. */
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  /** Read saved theme from localStorage, default → 'dark'. */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved === 'light' ? 'light' : 'dark');
  }

  /** Toggle between dark and light. */
  function toggleTheme() {
    const current = html.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Initialise theme before first paint
  initTheme();

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
    // Keyboard accessibility
    themeToggle.setAttribute('role', 'button');
    themeToggle.setAttribute('tabindex', '0');
    themeToggle.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }


  /* ──────────────────────────────────────────────
     2. MOBILE HAMBURGER NAV
  ────────────────────────────────────────────── */
  const hamburger   = document.getElementById('hamburger');
  const mobileOverlay = document.getElementById('mobileOverlay');

  function openMobileNav() {
    hamburger.classList.add('open');
    mobileOverlay.classList.add('open');
    document.body.style.overflow = 'hidden'; // prevent scroll behind overlay
  }

  function closeMobileNav() {
    hamburger.classList.remove('open');
    mobileOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Expose globally so inline onclick attributes can call it
  window.closeMobileNav = closeMobileNav;

  if (hamburger) {
    hamburger.addEventListener('click', function () {
      if (hamburger.classList.contains('open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  // Close overlay if user taps the backdrop (outside the links)
  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function (e) {
      if (e.target === mobileOverlay) closeMobileNav();
    });
  }

  // Close on ESC key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMobileNav();
  });

  // Close mobile nav on window resize to desktop width
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) closeMobileNav();
  });


  /* ──────────────────────────────────────────────
     3. SCROLL-REVEAL (IntersectionObserver)
  ────────────────────────────────────────────── */
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  initScrollReveal();


  /* ──────────────────────────────────────────────
     4. BLOOD TYPE SELECTOR
  ────────────────────────────────────────────── */
  function initBloodTypeSelectors() {
    // Works for both the desktop stats card and mobile stats card
    document.querySelectorAll('.blood-types').forEach(function (group) {
      group.querySelectorAll('.bt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          group.querySelectorAll('.bt').forEach(function (b) {
            b.classList.remove('active');
          });
          btn.classList.add('active');
        });
      });
    });
  }

  initBloodTypeSelectors();


  /* ──────────────────────────────────────────────
     5. TICKER — pause on hover, resume on leave
  ────────────────────────────────────────────── */
  const ticker = document.getElementById('ticker');
  if (ticker) {
    ticker.parentElement.addEventListener('mouseenter', function () {
      ticker.style.animationPlayState = 'paused';
    });
    ticker.parentElement.addEventListener('mouseleave', function () {
      ticker.style.animationPlayState = 'running';
    });
  }


  /* ──────────────────────────────────────────────
     6. NAV: Add shadow on scroll
  ────────────────────────────────────────────── */
  var nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 20) {
        nav.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
      } else {
        nav.style.boxShadow = 'none';
      }
    }, { passive: true });
  }

})();
