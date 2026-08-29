(function () {
  const E = window.Engine;
  const sync = new Sync();
  document.getElementById('syncMode').textContent = sync.mode === 'firebase' ? 'live · firebase' : 'local only';

  let state = E.freshState({});
  let pipsBuilt = 0;
  let prevStatus = state.status;

  const soundBtn = document.getElementById('soundUnlockBtn');
  soundBtn.addEventListener('click', () => {
    if (window.Sound) Sound.unlock();
    soundBtn.textContent = '🔊 Sound on';
    soundBtn.disabled = true;
  });

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
  const statusVal = document.getElementById('statusVal');
  const setsVal = document.getElementById('setsVal');
  const idleHint = document.getElementById('idleHint');

  const CIRC = 2 * Math.PI * 100;
  dialFill.setAttribute('stroke-dasharray', CIRC.toFixed(1));

  const STATUS_LABEL = {
    idle: 'Idle', active: 'Working', break: 'Resting', paused: 'Paused', complete: 'Complete',
  };

  sync.pull().then((remote) => { if (remote) state = remote; render(); });
  sync.onUpdate((remote) => { state = remote; render(); });

  function buildPips() {
    pipsEl.innerHTML = '';
    for (let i = 0; i < state.config.totalSets; i++) {
      const p = document.createElement('div');
      p.className = 'pip';
      pipsEl.appendChild(p);
    }
    pipsBuilt = state.config.totalSets;
  }

  function render(now = Date.now()) {
    // note: we don't mutate/commit here — the athlete's page owns transitions.
    const effective = E.checkBreakElapsed(state, now);
    if (pipsBuilt !== state.config.totalSets) buildPips();

    const total = E.totalReps(effective);
    const elapsed = E.getElapsedMs(effective, now);
    const curSet = E.getCurrentSet(effective);
    const frac = effective.completedReps / total;

    repsDone.textContent = effective.completedReps;
    repsTotal.textContent = total;
    repsLeftVal.textContent = Math.max(0, total - effective.completedReps);
    elapsedVal.textContent = E.fmtClock(elapsed);
    setLabel.textContent = `SET ${Math.min(curSet + 1, effective.config.totalSets)} / ${effective.config.totalSets}`;
    setsVal.textContent = `${Math.floor(effective.completedReps / effective.config.repsPerSet)} / ${effective.config.totalSets}`;
    statusVal.textContent = STATUS_LABEL[effective.status] || effective.status;

    dialFill.setAttribute('stroke-dashoffset', (CIRC * (1 - frac)).toFixed(1));

    [...pipsEl.children].forEach((p, i) => {
      p.classList.toggle('done', i < curSet || effective.status === 'complete');
      p.classList.toggle('current', i === curSet && effective.status !== 'complete');
    });

    statusBadge.textContent = effective.status === 'idle' ? 'WATCHING' : STATUS_LABEL[effective.status].toUpperCase();

    breakBanner.classList.toggle('show', effective.status === 'break');
    if (effective.status === 'break') breakTime.textContent = E.fmtClock(E.getBreakRemainingMs(effective, now));

    completeBanner.classList.toggle('show', effective.status === 'complete');
    if (effective.status === 'complete') completeSub.textContent = `${total} reps in ${E.fmtClock(elapsed)}`;

    idleHint.style.display = effective.status === 'idle' ? 'block' : 'none';

    if (prevStatus === 'break' && effective.status === 'active' && window.Sound) Sound.playBreakEnd();
    if (prevStatus !== 'complete' && effective.status === 'complete' && window.Sound) Sound.playComplete();
    prevStatus = effective.status;
  }

  setInterval(() => render(), 250);
})();
