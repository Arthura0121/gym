(function () {
  const E = window.Engine;
  const DEFAULT_PIN = localStorage.getItem('grindset_pin') || '7734';

  /* ---------------- lock screen ---------------- */

  const lockEl = document.getElementById('lock');
  const appEl = document.getElementById('app');
  const lockDots = document.getElementById('lockDots');
  const lockPad = document.getElementById('lockPad');
  const lockError = document.getElementById('lockError');
  let entered = '';

  function renderDots() {
    lockDots.innerHTML = '';
    for (let i = 0; i < DEFAULT_PIN.length; i++) {
      const d = document.createElement('div');
      d.className = 'lock-dot' + (i < entered.length ? ' filled' : '');
      lockDots.appendChild(d);
    }
  }

  function buildPad() {
    lockPad.innerHTML = '';
    const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    keys.forEach((k) => {
      const b = document.createElement('button');
      b.className = 'lock-key';
      b.textContent = k;
      b.style.visibility = k === '' ? 'hidden' : 'visible';
      b.addEventListener('click', () => onKey(k));
      lockPad.appendChild(b);
    });
  }

  function onKey(k) {
    try { if (window.Sound) Sound.unlock(); } catch (e) { /* never let audio break the keypad */ }
    if (k === '⌫') { entered = entered.slice(0, -1); }
    else if (entered.length < DEFAULT_PIN.length) { entered += k; }
    renderDots();
    lockError.textContent = '';
    if (entered.length === DEFAULT_PIN.length) {
      if (entered === DEFAULT_PIN) {
        sessionStorage.setItem('grindset_unlocked', '1');
        unlock();
      } else {
        lockError.textContent = 'wrong pin';
        setTimeout(() => { entered = ''; renderDots(); }, 350);
      }
    }
  }

  function unlock() {
    lockEl.style.display = 'none';
    appEl.style.display = 'flex';
    boot();
  }

  buildPad();
  renderDots();
  if (sessionStorage.getItem('grindset_unlocked') === '1') {
    unlock();
  }

  /* ---------------- app ---------------- */

  function boot() {
    const sync = new Sync();
    document.getElementById('syncMode').textContent = sync.mode === 'firebase' ? 'live · firebase' : 'local only';

    let state = E.freshState({});
    let prevStatus = state.status;

    sync.pull().then((remote) => {
      if (remote) state = remote;
      render();
    });

    sync.onUpdate((remote) => { state = remote; render(); });

    function commit(next) {
      state = next;
      sync.push(state);
      render();
    }

    // --- element refs ---
    const repBtn = document.getElementById('repBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const skipBreakBtn = document.getElementById('skipBreakBtn');
    const startHint = document.getElementById('startHint');
    const statusBadge = document.getElementById('statusBadge');
    const dialFill = document.getElementById('dialFill');
    const repsDone = document.getElementById('repsDone');
    const repsTotal = document.getElementById('repsTotal');
    const setLabel = document.getElementById('setLabel');
    const pipsEl = document.getElementById('pips');
    const breakBanner = document.getElementById('breakBanner');
    const breakTime = document.getElementById('breakTime');
    const completeBanner = document.getElementById('completeBanner');
    const completeSub = document.getElementById('completeSub');
    const elapsedVal = document.getElementById('elapsedVal');
    const repsLeftVal = document.getElementById('repsLeftVal');
    const paceVal = document.getElementById('paceVal');
    const setsVal = document.getElementById('setsVal');
    const avgTag = document.getElementById('avgTag');

    const CIRC = 2 * Math.PI * 100;
    dialFill.setAttribute('stroke-dasharray', CIRC.toFixed(1));

    // build pips once config known (after first render call it's fine, config is static default)
    let pipsBuilt = 0;

    repBtn.addEventListener('click', () => {
      if (state.status === 'idle') { commit(E.startWorkout(state)); return; }
      if (state.status !== 'active') return;
      repBtn.classList.remove('pulse'); void repBtn.offsetWidth; repBtn.classList.add('pulse');
      commit(E.logRep(state));
    });

    pauseBtn.addEventListener('click', () => {
      if (state.status === 'paused') commit(E.resumeWorkout(state));
      else commit(E.pauseWorkout(state));
    });

    resetBtn.addEventListener('click', () => {
      if (confirm('Reset the whole workout? This clears progress for both panels.')) {
        commit(E.resetWorkout(state));
      }
    });

    skipBreakBtn.addEventListener('click', () => {
      if (state.status === 'break') {
        commit({ ...state, status: 'active', breakEndTime: null, lastRepAt: Date.now(), updatedAt: Date.now() });
      }
    });

    document.querySelectorAll('[data-add]').forEach((el) => {
      el.addEventListener('click', () => commit(E.adjustAdd(state, parseInt(el.dataset.add, 10))));
    });
    document.querySelectorAll('[data-remove]').forEach((el) => {
      el.addEventListener('click', () => commit(E.adjustRemove(state, parseInt(el.dataset.remove, 10))));
    });
    document.getElementById('addCustom').addEventListener('click', () => {
      const n = parseInt(prompt('Add how many reps?', '3') || '0', 10);
      if (n > 0) commit(E.adjustAdd(state, n));
    });
    document.getElementById('removeCustom').addEventListener('click', () => {
      const n = parseInt(prompt('Remove how many reps?', '3') || '0', 10);
      if (n > 0) commit(E.adjustRemove(state, n));
    });

    function buildPips() {
      pipsEl.innerHTML = '';
      for (let i = 0; i < state.config.totalSets; i++) {
        const p = document.createElement('div');
        p.className = 'pip';
        p.dataset.i = i;
        pipsEl.appendChild(p);
      }
      pipsBuilt = state.config.totalSets;
    }

    function render(now = Date.now()) {
      state = E.checkBreakElapsed(state, now);
      if (pipsBuilt !== state.config.totalSets) buildPips();

      const total = E.totalReps(state);
      const elapsed = E.getElapsedMs(state, now);
      const curSet = E.getCurrentSet(state);
      const repInSet = E.getRepInSet(state);
      const frac = state.completedReps / total;

      repsDone.textContent = state.completedReps;
      repsTotal.textContent = total;
      repsLeftVal.textContent = Math.max(0, total - state.completedReps);
      elapsedVal.textContent = E.fmtClock(elapsed);
      setLabel.textContent = `SET ${Math.min(curSet + 1, state.config.totalSets)} / ${state.config.totalSets}`;
      setsVal.textContent = `${Math.floor(state.completedReps / state.config.repsPerSet)} / ${state.config.totalSets}`;

      const avg = E.averageRepMs(state);
      paceVal.textContent = state.repSamples.length ? `${(avg / 1000).toFixed(1)}s` : '—';
      avgTag.textContent = state.repSamples.length ? `avg ${(avg / 1000).toFixed(1)}s/rep` : 'avg —';

      dialFill.setAttribute('stroke-dashoffset', (CIRC * (1 - frac)).toFixed(1));

      [...pipsEl.children].forEach((p, i) => {
        p.classList.toggle('done', i < curSet || state.status === 'complete');
        p.classList.toggle('current', i === curSet && state.status !== 'complete');
      });

      statusBadge.textContent = state.status.toUpperCase();

      breakBanner.classList.toggle('show', state.status === 'break');
      if (state.status === 'break') {
        breakTime.textContent = E.fmtClock(E.getBreakRemainingMs(state, now));
      }

      completeBanner.classList.toggle('show', state.status === 'complete');
      if (state.status === 'complete') {
        completeSub.textContent = `${total} reps in ${E.fmtClock(elapsed)}`;
      }

      startHint.style.display = state.status === 'idle' ? 'block' : 'none';

      if (state.status === 'idle') { repBtn.textContent = 'START'; repBtn.disabled = false; }
      else if (state.status === 'active') { repBtn.textContent = `REP ${repInSet + 1} / ${state.config.repsPerSet}`; repBtn.disabled = false; }
      else if (state.status === 'break') { repBtn.textContent = 'RESTING…'; repBtn.disabled = true; }
      else if (state.status === 'paused') { repBtn.textContent = 'PAUSED'; repBtn.disabled = true; }
      else if (state.status === 'complete') { repBtn.textContent = 'DONE 🔥'; repBtn.disabled = true; }

      pauseBtn.textContent = state.status === 'paused' ? 'Resume' : 'Pause';
      pauseBtn.disabled = state.status === 'idle' || state.status === 'complete';

      if (prevStatus === 'break' && state.status === 'active' && window.Sound) Sound.playBreakEnd();
      if (prevStatus !== 'complete' && state.status === 'complete' && window.Sound) Sound.playComplete();
      prevStatus = state.status;
    }

    setInterval(() => render(), 250);
  }
})();
