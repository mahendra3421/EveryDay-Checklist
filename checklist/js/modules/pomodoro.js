/**
 * pomodoro.js — Pomodoro Timer Module
 * Work/break phases, session tracking, sound cues
 */

const PomodoroTimer = (() => {
  let _intervalId = null;
  let _timeLeft   = 25 * 60;
  let _phase      = 'work';   // 'work' | 'short' | 'long'
  let _running    = false;
  let _sessionCount = 0;
  let _totalFocusSeconds = 0;

  // ---- DOM References (resolved lazily) ----
  function _getEl(id) { return document.getElementById(id); }

  // ---- Get current durations from settings ----
  function _getDurations() {
    const p = AppState.getPomodoro();
    return {
      work:  (p.workDuration  || 25) * 60,
      short: (p.shortBreak    || 5)  * 60,
      long:  (p.longBreak     || 15) * 60,
    };
  }

  // ---- Initialize ----
  function init() {
    const durations = _getDurations();
    _timeLeft = durations.work;
    _updateDisplay();

    // Bind controls
    const startBtn = _getEl('pomo-start');
    const resetBtn = _getEl('pomo-reset');
    const skipBtn  = _getEl('pomo-skip');
    const focusStart = _getEl('focus-start-pomo');

    if (startBtn) startBtn.addEventListener('click', toggleTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);
    if (skipBtn)  skipBtn.addEventListener('click', skipPhase);
    if (focusStart) focusStart.addEventListener('click', toggleTimer);
  }

  // ---- Toggle Start/Pause ----
  function toggleTimer() {
    if (_running) {
      _pause();
    } else {
      _start();
    }
  }

  function _start() {
    _running = true;
    _intervalId = setInterval(_tick, 1000);
    _updateControls();
    AppState.emit('pomodoro:started', { phase: _phase });
  }

  function _pause() {
    _running = false;
    clearInterval(_intervalId);
    _intervalId = null;
    _updateControls();
    AppState.emit('pomodoro:paused', { timeLeft: _timeLeft });
  }

  function _tick() {
    _timeLeft--;

    if (_phase === 'work' && _running) {
      _totalFocusSeconds++;
      // Persist every minute
      if (_totalFocusSeconds % 60 === 0) {
        Storage.set(KEYS.FOCUS_TIME, Math.floor(Storage.get(KEYS.FOCUS_TIME, 0) + 1));
      }
    }

    if (_timeLeft <= 0) {
      _onPhaseComplete();
    } else {
      _updateDisplay();
    }
  }

  function _onPhaseComplete() {
    clearInterval(_intervalId);
    _intervalId = null;
    _running = false;

    _playBeep();

    if (_phase === 'work') {
      _sessionCount++;
      Gamification.gainXP(5, 'Pomodoro session completed');

      if (_sessionCount % 4 === 0) {
        _phase = 'long';
        Toast.show('Long Break 🌟', `${Math.floor(_getDurations().long / 60)} minute break, you earned it!`, 'success');
      } else {
        _phase = 'short';
        Toast.show('Break Time! ☕', `${Math.floor(_getDurations().short / 60)} minute break`, 'info');
      }
    } else {
      _phase = 'work';
      Toast.show('Focus Time! 🎯', `Let's get back to work!`, 'info');
    }

    const durations = _getDurations();
    _timeLeft = durations[_phase];
    _updateDisplay();
    _updateControls();
    _updateSessionDots();

    AppState.emit('pomodoro:phaseComplete', { phase: _phase, sessions: _sessionCount });
  }

  // ---- Reset ----
  function resetTimer() {
    _pause();
    _phase = 'work';
    _timeLeft = _getDurations().work;
    _updateDisplay();
    _updateControls();
  }

  // ---- Skip Phase ----
  function skipPhase() {
    clearInterval(_intervalId);
    _intervalId = null;
    _running = false;
    _onPhaseComplete();
  }

  // ---- Update Pomodoro settings ----
  function updateSettings(workMins, shortMins, longMins) {
    AppState.setPomodoro({ workDuration: workMins, shortBreak: shortMins, longBreak: longMins });
    Storage.set(KEYS.POMODORO, { workDuration: workMins, shortBreak: shortMins, longBreak: longMins });
    if (!_running) {
      _phase = 'work';
      _timeLeft = workMins * 60;
      _updateDisplay();
    }
  }

  // ---- Display Updates ----
  function _updateDisplay() {
    const timeStr = Utils.formatTime(_timeLeft);
    const durations = _getDurations();
    const total = durations[_phase];
    const progress = ((total - _timeLeft) / total);
    const circumference = 314; // 2 * PI * 50

    // Dashboard pomodoro
    const timeEl = _getEl('pomo-time');
    const circleEl = _getEl('pomo-progress-circle');
    const stateEl = _getEl('pomo-state-label');
    const sessionEl = _getEl('pomo-session-label');

    if (timeEl) timeEl.textContent = timeStr;
    if (circleEl) {
      circleEl.style.strokeDashoffset = circumference * (1 - progress);
      circleEl.style.stroke = _phase === 'work' ? 'var(--accent)' :
                              _phase === 'short' ? 'var(--success)' : 'var(--warning)';
    }
    if (stateEl) {
      stateEl.textContent = _phase === 'work' ? 'Focus' :
                            _phase === 'short' ? 'Short Break' : 'Long Break';
    }
    if (sessionEl) {
      sessionEl.textContent = _phase === 'work' ? 'Focus Session' :
                              _phase === 'short' ? 'Short Break 🍃' : 'Long Break 🌟';
    }

    // Focus mode timer
    const focusTimer = _getEl('focus-timer');
    if (focusTimer) focusTimer.textContent = timeStr;

    // Update page title while running
    if (_running) {
      document.title = `[${timeStr}] FlowTask`;
    }
  }

  function _updateControls() {
    const startBtn = _getEl('pomo-start');
    const focusBtn = _getEl('focus-start-pomo');
    const label = _running ? '⏸ Pause' : '▶ Start';

    if (startBtn) startBtn.textContent = label;
    if (focusBtn) focusBtn.textContent = _running ? '⏸ Pause Pomodoro' : '▶ Start Pomodoro';
  }

  function _updateSessionDots() {
    const dotsEl = _getEl('session-dots');
    if (!dotsEl) return;
    const filled = _sessionCount % 4;
    const dots = Array(4).fill('○').map((d, i) => i < filled ? '●' : '○');
    dotsEl.textContent = dots.join(' ');
  }

  // ---- Simple beep ----
  function _playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = _phase === 'work' ? 440 : 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) { /* no audio context */ }
  }

  // ---- Public API ----
  function getState() {
    return { phase: _phase, timeLeft: _timeLeft, running: _running, sessions: _sessionCount };
  }

  function getTotalFocusMinutes() {
    return Math.floor(_totalFocusSeconds / 60) + (Storage.get(KEYS.FOCUS_TIME, 0));
  }

  return { init, toggleTimer, resetTimer, skipPhase, updateSettings, getState, getTotalFocusMinutes };
})();
