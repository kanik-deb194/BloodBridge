 /* ============================================================
   BloodBridge — loader.js

   HOW TO REDIRECT TO THE LANDING PAGE:
   Change REDIRECT_URL below to the name of your landing page.
   Example: if your landing page is "index.html", set:
       var REDIRECT_URL = 'index.html';
   ============================================================ */

(function () {
  'use strict';

  /* ── CONFIG — edit these two values ── */
  var TOTAL_DURATION = 3500;       /* total loading time in milliseconds */
  var REDIRECT_URL   = 'landing_page.html'; /* ← your landing page filename here */

  /* ── INTERNAL SETTINGS ── */
  var STEP_MS     = 40;
  var DROP_TOP    = 10;
  var DROP_BOTTOM = 160;
  var DROP_HEIGHT = DROP_BOTTOM - DROP_TOP;

  /* ── STATUS MESSAGES (threshold % → message) ── */
  var statuses = [
    [0,   'Initializing network…'],
    [12,  'Connecting to blood banks…'],
    [28,  'Loading donor registry…'],
    [45,  'Fetching live inventory…'],
    [60,  'Syncing hospital data…'],
    [76,  'Calibrating geo-matching…'],
    [90,  'Almost ready…'],
    [100, 'Welcome to BloodBridge ❤']
  ];

  /* ── DOM REFERENCES ── */
  var loader      = document.getElementById('loader');
  var loaderInner = document.getElementById('loaderInner');
  var bloodFill   = document.getElementById('bloodFill');
  var waveEl      = document.getElementById('wave');
  var shimmerRect = document.getElementById('shimmerRect');
  var pctNum      = document.getElementById('pctNum');
  var barFill     = document.getElementById('barFill');
  var statusLine  = document.getElementById('statusLine');

  /* ── STATE ── */
  var wavePhase  = 0;
  var shimmerX   = -140;
  var step       = 0;
  var totalSteps = TOTAL_DURATION / STEP_MS;

  /* ── EASING: smooth acceleration + deceleration ── */
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /* ── BUILD WAVE PATH ── */
  function buildWave(fillY) {
    var amp  = 4.5;
    var freq = 0.09;
    var d = 'M 0 ' + fillY;
    for (var x = 0; x <= 140; x += 5) {
      var y = fillY + Math.sin(x * freq + wavePhase) * amp;
      d += ' L ' + x + ' ' + y;
    }
    d += ' L 140 172 L 0 172 Z';
    return d;
  }

  /* ── RENDER A SINGLE FRAME ── */
  function render(pct) {
    /* move fill rect upward */
    var fillHeight = (pct / 100) * DROP_HEIGHT;
    var fillY      = DROP_BOTTOM - fillHeight;
    bloodFill.setAttribute('y',      String(fillY));
    bloodFill.setAttribute('height', String(DROP_HEIGHT + 22));

    /* animate wave surface */
    waveEl.setAttribute('d', buildWave(fillY));

    /* slide shimmer across */
    shimmerRect.setAttribute('x', String(shimmerX));

    /* update counter and bar */
    pctNum.textContent = Math.round(pct);
    barFill.style.width = pct + '%';

    /* swap status message with fade */
    for (var i = statuses.length - 1; i >= 0; i--) {
      if (pct >= statuses[i][0]) {
        if (statusLine.textContent !== statuses[i][1]) {
          statusLine.style.opacity = '0';
          (function (msg) {
            setTimeout(function () {
              statusLine.textContent = msg;
              statusLine.style.opacity = '1';
            }, 180);
          })(statuses[i][1]);
        }
        break;
      }
    }
  }

  /* ── MAIN LOOP ── */
  var intervalId = setInterval(function () {
    step++;
    wavePhase += 0.13;
    shimmerX  += 3;
    if (shimmerX > 280) shimmerX = -140;

    var t = step / totalSteps;

    if (t >= 1) {
      /* ── FINISHED ── */
      clearInterval(intervalId);
      render(100);
      loaderInner.classList.add('done');

      /* pause at 100% then fade out */
      setTimeout(function () {
        loader.classList.add('fade-out');

        /* after fade completes → go to landing page */
        setTimeout(function () {
          window.location.href = REDIRECT_URL;
        }, 650);

      }, 900);
      return;
    }

    render(easeInOut(t) * 100);
  }, STEP_MS);

  /* kick off at 0% */
  render(0);

})();
