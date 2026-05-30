(function () {
  'use strict';

  if (typeof EQ_TASKS === 'undefined' || EQ_TASKS.length === 0) return;

  var REQUIRED_AWAY_MS = 4000;
  var TIMEOUT_MS = 60000;

  var state = {
    index: 0,          // current task index
    phase: 'idle',     // idle | started | verifying | done
    awayStart: null,
    totalAwayMs: 0,
    intervalId: null,
    timeoutId: null,
    visHandler: null,
    blurHandler: null,
    focusHandler: null,
  };

  /* ── DOM refs (set per card render) ── */
  var dom = {};

  function task() { return EQ_TASKS[state.index]; }

  /* ────────────────────────────────────
     RENDER current task card
  ──────────────────────────────────── */
  function renderCard(animate) {
    var t = task();
    if (!t) { showDone(); return; }

    var platformLabel = t.platform === 'youtube' ? '▶ YouTube' : '📸 Instagram';
    var platformClass = 'badge-' + t.platform;
    var typeClass     = 'pill-' + t.type;
    var typeLabel     = t.type.charAt(0).toUpperCase() + t.type.slice(1);
    var shortUrl      = t.url.length > 48 ? t.url.slice(0, 48) + '…' : t.url;

    var html = '<div class="eq-card" id="eq-card">' +

      '<div class="eq-card__top">' +
        '<span class="badge ' + platformClass + '">' + platformLabel + '</span>' +
        '<span class="pill ' + typeClass + '">' + typeLabel + '</span>' +
      '</div>' +

      '<div class="eq-reward">' +
        '<div class="eq-reward__num">' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>' +
          '+' + t.reward +
        '</div>' +
        '<div class="eq-reward__lbl">coins for this task</div>' +
      '</div>' +

      '<div class="eq-link" id="eq-link" title="' + t.url + '">' +
        '<svg class="eq-link__ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>' +
        '<span class="eq-link__url">' + shortUrl + '</span>' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
      '</div>' +

      '<div class="eq-meta">' +
        '<span style="font-size:.78rem;color:var(--text-muted)">' + t.done + ' completed &nbsp;·&nbsp; ' + t.slots + ' slots left</span>' +
      '</div>' +

      /* verify panel */
      '<div class="eq-verify" id="eq-verify">' +
        '<div class="eq-verify__countdown" id="eq-count">4</div>' +
        '<div class="eq-verify__status" id="eq-status">Open the link and stay there for 4 seconds</div>' +
        '<div class="eq-verify__spinner" id="eq-spinner"></div>' +
      '</div>' +

      /* success panel */
      '<div class="eq-success" id="eq-success">' +
        '<div class="eq-success__icon">✅</div>' +
        '<div class="eq-success__text" id="eq-success-text">Coins earned!</div>' +
        '<div class="eq-success__sub" id="eq-success-sub"></div>' +
      '</div>' +

      '<div class="eq-actions">' +
        '<button class="eq-btn-start" id="eq-start">Start Task</button>' +
        '<button class="eq-btn-skip" id="eq-skip">Skip →</button>' +
      '</div>' +

    '</div>';

    var wrap = document.getElementById('eq-card-wrap');
    wrap.innerHTML = html;

    dom = {
      card:    document.getElementById('eq-card'),
      verify:  document.getElementById('eq-verify'),
      count:   document.getElementById('eq-count'),
      status:  document.getElementById('eq-status'),
      spinner: document.getElementById('eq-spinner'),
      success: document.getElementById('eq-success'),
      sText:   document.getElementById('eq-success-text'),
      sSub:    document.getElementById('eq-success-sub'),
      start:   document.getElementById('eq-start'),
      skip:    document.getElementById('eq-skip'),
      link:    document.getElementById('eq-link'),
    };

    dom.start.addEventListener('click', onStart);
    dom.skip.addEventListener('click', onSkip);
    dom.link.addEventListener('click', function () {
      window.open(task().url, '_blank', 'noopener,noreferrer');
    });

    updateProgress();
  }

  function updateProgress() {
    var cur = document.getElementById('eq-current');
    var bar = document.getElementById('eq-bar');
    if (cur) cur.textContent = state.index + 1;
    if (bar) bar.style.width = (((state.index + 1) / EQ_TOTAL) * 100).toFixed(1) + '%';
  }

  function updateBalanceDisplay(coins) {
    var el = document.getElementById('eq-coins');
    if (el) {
      el.textContent = coins;
      var badge = document.getElementById('eq-balance');
      if (badge) {
        badge.classList.add('coin-pulse');
        setTimeout(function () { badge.classList.remove('coin-pulse'); }, 700);
      }
    }
    /* also update navbar */
    var nav = document.getElementById('coin-balance');
    if (nav) {
      var txt = nav.querySelector('span') || nav.lastChild;
      if (txt) txt.textContent = coins;
    }
  }

  /* ────────────────────────────────────
     NAVIGATION
  ──────────────────────────────────── */
  function nextTask(delay) {
    delay = delay || 0;
    setTimeout(function () {
      resetState();
      state.index++;
      if (state.index >= EQ_TASKS.length) {
        showDone();
      } else {
        animateOut(function () { renderCard(true); });
      }
    }, delay);
  }

  function animateOut(cb) {
    if (dom.card) {
      dom.card.classList.add('leaving');
      setTimeout(cb, 250);
    } else {
      cb();
    }
  }

  function showDone() {
    document.getElementById('eq-card-wrap').innerHTML = '';
    var done = document.getElementById('eq-done');
    if (done) done.style.display = 'block';
    var bar = document.getElementById('eq-bar');
    if (bar) bar.style.width = '100%';
  }

  function onSkip() {
    nextTask(0);
  }

  /* ────────────────────────────────────
     TASK START
  ──────────────────────────────────── */
  function onStart() {
    if (state.phase !== 'idle') return;
    dom.start.disabled = true;
    dom.start.textContent = 'Opening…';

    fetch('/earn/api/tasks/' + task().id + '/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
    .then(function (res) {
      if (!res.ok) {
        showError(res.data.error || 'Could not start task.');
        dom.start.disabled = false;
        dom.start.textContent = 'Start Task';
        return;
      }
      state.phase = 'started';
      state.awayStart = null;
      state.totalAwayMs = 0;

      window.open(task().url, '_blank', 'noopener,noreferrer');
      dom.verify.classList.add('show');
      dom.start.textContent = 'Waiting…';
      setCountdown(REQUIRED_AWAY_MS);
      startTracking();
    })
    .catch(function () {
      showError('Network error. Please try again.');
      dom.start.disabled = false;
      dom.start.textContent = 'Start Task';
    });
  }

  /* ────────────────────────────────────
     FOCUS TRACKING
  ──────────────────────────────────── */
  function startTracking() {
    state.visHandler  = onVisChange;
    state.blurHandler = onBlur;
    state.focusHandler = onFocus;
    document.addEventListener('visibilitychange', state.visHandler);
    window.addEventListener('blur',  state.blurHandler);
    window.addEventListener('focus', state.focusHandler);

    state.intervalId = setInterval(tick, 250);
    state.timeoutId  = setTimeout(function () {
      if (state.phase === 'started') {
        setStatus('Timed out. Please try again.');
        resetState();
        dom.verify.classList.remove('show');
        dom.start.disabled = false;
        dom.start.textContent = 'Start Task';
      }
    }, TIMEOUT_MS);
  }

  function onBlur() {
    if (state.phase !== 'started' || state.awayStart !== null) return;
    state.awayStart = Date.now();
    setStatus('Timer running…');
  }

  function onFocus() {
    if (state.phase !== 'started' || state.awayStart === null) return;
    state.totalAwayMs += Date.now() - state.awayStart;
    state.awayStart = null;
    if (state.totalAwayMs >= REQUIRED_AWAY_MS) {
      completeTask();
    } else {
      setCountdown(REQUIRED_AWAY_MS - state.totalAwayMs);
      setStatus('Come back after finishing the task…');
    }
  }

  function onVisChange() {
    if (document.hidden) onBlur(); else onFocus();
  }

  function tick() {
    if (state.phase !== 'started') return;
    var away = currentAway();
    var remaining = Math.max(0, REQUIRED_AWAY_MS - away);
    setCountdown(remaining);
    if (away >= REQUIRED_AWAY_MS) completeTask();
  }

  function currentAway() {
    return state.totalAwayMs + (state.awayStart !== null ? Date.now() - state.awayStart : 0);
  }

  function setCountdown(ms) {
    if (!dom.count) return;
    var s = Math.ceil(ms / 1000);
    dom.count.textContent = s;
    if (ms <= 0) dom.count.classList.add('done');
    else dom.count.classList.remove('done');
  }

  function setStatus(msg) {
    if (dom.status) dom.status.textContent = msg;
  }

  /* ────────────────────────────────────
     COMPLETE
  ──────────────────────────────────── */
  function completeTask() {
    if (state.phase !== 'started') return;
    state.phase = 'verifying';
    clearTracking();
    setCountdown(0);
    setStatus('Verifying…');
    if (dom.spinner) dom.spinner.style.display = 'block';

    fetch('/earn/api/tasks/' + task().id + '/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
    .then(function (res) {
      if (dom.spinner) dom.spinner.style.display = 'none';
      if (res.ok && res.data.success) {
        state.phase = 'done';
        dom.verify.classList.remove('show');
        dom.success.classList.add('show');
        dom.sText.textContent = '+' + res.data.coinsEarned + ' coins earned!';
        dom.sSub.textContent  = 'New balance: ' + res.data.newBalance + ' coins';
        dom.start.style.display = 'none';
        dom.skip.textContent = 'Next Task →';
        dom.skip.style.flex = '1';
        updateBalanceDisplay(res.data.newBalance);
        nextTask(1800);
      } else {
        state.phase = 'idle';
        dom.verify.classList.remove('show');
        showError(res.data.error || 'Verification failed. Try again.');
        dom.start.disabled = false;
        dom.start.textContent = 'Retry';
      }
    })
    .catch(function () {
      if (dom.spinner) dom.spinner.style.display = 'none';
      state.phase = 'idle';
      dom.verify.classList.remove('show');
      showError('Network error. Please retry.');
      dom.start.disabled = false;
      dom.start.textContent = 'Retry';
    });
  }

  function showError(msg) {
    if (!dom.status) return;
    dom.verify.classList.add('show');
    dom.status.textContent = '⚠ ' + msg;
    dom.count.textContent = '!';
    dom.count.style.fontSize = '2.5rem';
    setTimeout(function () {
      dom.verify.classList.remove('show');
      if (dom.count) { dom.count.textContent = '4'; dom.count.style.fontSize = ''; }
    }, 3000);
  }

  /* ────────────────────────────────────
     CLEANUP
  ──────────────────────────────────── */
  function clearTracking() {
    if (state.intervalId) clearInterval(state.intervalId);
    if (state.timeoutId)  clearTimeout(state.timeoutId);
    if (state.visHandler)  document.removeEventListener('visibilitychange', state.visHandler);
    if (state.blurHandler) window.removeEventListener('blur', state.blurHandler);
    if (state.focusHandler) window.removeEventListener('focus', state.focusHandler);
    state.intervalId = null;
    state.timeoutId  = null;
    state.visHandler = state.blurHandler = state.focusHandler = null;
  }

  function resetState() {
    clearTracking();
    state.phase = 'idle';
    state.awayStart = null;
    state.totalAwayMs = 0;
  }

  /* ────────────────────────────────────
     INIT
  ──────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (EQ_TASKS.length > 0) renderCard(false);
  });

}());
