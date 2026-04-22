/**
 * wellness.js — Wellness & Mood Tracking Module
 */

const Wellness = (() => {

  const WELLNESS_TIPS = [
    { icon: '💧', title: 'Stay Hydrated', desc: 'Drink 8 glasses of water throughout your day.' },
    { icon: '🧘', title: 'Mindful Breaks', desc: 'Take 5 minutes to breathe deeply between tasks.' },
    { icon: '🚶', title: 'Move Around', desc: 'Stand and stretch every 45 minutes of sitting.' },
    { icon: '😴', title: 'Quality Sleep', desc: 'Aim for 7-9 hours for peak cognitive performance.' },
    { icon: '🥗', title: 'Healthy Snacks', desc: 'Brain foods: nuts, berries, dark chocolate.' },
    { icon: '🌿', title: 'Nature Time', desc: 'Even 10 minutes outside boosts focus and mood.' },
    { icon: '📵', title: 'Digital Detox', desc: 'Put your phone away for 1 hour before bed.' },
    { icon: '🤝', title: 'Connect', desc: 'Reach out to someone you care about today.' },
    { icon: '📓', title: 'Journaling', desc: 'Write 3 things you\'re grateful for each evening.' },
  ];

  const MOOD_SUGGESTIONS = {
    1: { emoji: '😔', text: 'You seem low today. Start with one small, easy task. 💙' },
    2: { emoji: '😐', text: 'Feeling meh? Try a quick win with a low-priority task.' },
    3: { emoji: '🙂', text: 'You\'re OK! Good time to tackle medium-priority tasks.' },
    4: { emoji: '😊', text: 'Feeling good! Take on something meaningful today.' },
    5: { emoji: '🤩', text: 'You\'re energized! Go for the high-priority tasks!' },
  };

  const ENERGY_TASK_SUGGESTIONS = {
    low:    'Focus on simple, low-effort tasks like review or organization.',
    medium: 'Good energy — tackle your medium-priority work tasks.',
    high:   'Peak energy! This is the time for your most challenging tasks.',
  };

  // ---- Init ----
  function init() {
    _bindMoodButtons();
    _bindEnergyButtons();
    _loadTodayState();
    renderWellnessTips();

    const detoxToggle = document.getElementById('detox-toggle');
    if (detoxToggle) {
      detoxToggle.addEventListener('change', () => {
        _toggleDetoxMode(detoxToggle.checked);
      });
    }
  }

  // ---- Mood Tracking ----
  function _bindMoodButtons() {
    const moodBtns = document.querySelectorAll('.mood-btn');
    moodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = parseInt(btn.dataset.value);
        _recordMood(value, btn.dataset.mood);

        moodBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const suggestion = document.getElementById('mood-suggestion');
        if (suggestion) {
          const info = MOOD_SUGGESTIONS[value];
          suggestion.textContent = info ? info.text : '';
        }
      });
    });
  }

  function _recordMood(value, emoji) {
    const wellness = AppState.getWellness();
    const today    = Utils.today();

    // Update today's mood
    const moodHistory = [...(wellness.moodHistory || [])];
    const todayIdx = moodHistory.findIndex(h => h.date === today);

    if (todayIdx >= 0) {
      moodHistory[todayIdx] = { date: today, value, emoji };
    } else {
      moodHistory.push({ date: today, value, emoji });
    }

    AppState.setWellness({
      todayMood: value,
      moodHistory: moodHistory.slice(-90), // Keep last 90 days
    });
  }

  // ---- Energy Tracking ----
  function _bindEnergyButtons() {
    const energyBtns = document.querySelectorAll('.energy-btn');
    energyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const energy = btn.dataset.energy;
        _recordEnergy(energy);

        energyBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const suggestion = document.getElementById('mood-suggestion');
        if (suggestion) {
          suggestion.textContent = ENERGY_TASK_SUGGESTIONS[energy] || '';
        }
      });
    });
  }

  function _recordEnergy(value) {
    const wellness = AppState.getWellness();
    const today    = Utils.today();

    const energyHistory = [...(wellness.energyHistory || [])];
    const todayIdx = energyHistory.findIndex(h => h.date === today);

    if (todayIdx >= 0) {
      energyHistory[todayIdx] = { date: today, value };
    } else {
      energyHistory.push({ date: today, value });
    }

    AppState.setWellness({
      todayEnergy: value,
      energyHistory: energyHistory.slice(-90),
    });
  }

  // ---- Load today's state ----
  function _loadTodayState() {
    const wellness = AppState.getWellness();

    if (wellness.todayMood) {
      const btn = document.querySelector(`.mood-btn[data-value="${wellness.todayMood}"]`);
      if (btn) {
        btn.classList.add('selected');
        const suggestion = document.getElementById('mood-suggestion');
        const info = MOOD_SUGGESTIONS[wellness.todayMood];
        if (suggestion && info) suggestion.textContent = info.text;
      }
    }

    if (wellness.todayEnergy) {
      const btn = document.querySelector(`.energy-btn[data-energy="${wellness.todayEnergy}"]`);
      if (btn) btn.classList.add('selected');
    }
  }

  // ---- Wellness Tips ----
  function renderWellnessTips() {
    const container = document.getElementById('wellness-tips');
    if (!container) return;

    container.innerHTML = WELLNESS_TIPS.map(tip =>
      `<div class="wellness-tip fade-in">
        <div class="tip-icon">${tip.icon}</div>
        <div class="tip-title">${tip.title}</div>
        <div class="tip-desc">${tip.desc}</div>
      </div>`
    ).join('');
  }

  // ---- Digital Detox Mode ----
  function _toggleDetoxMode(enabled) {
    if (enabled) {
      document.body.classList.add('detox-mode');
      Toast.show('Digital Detox Enabled 📵', 'Distracting elements hidden. Stay focused!', 'info');
    } else {
      document.body.classList.remove('detox-mode');
      Toast.show('Detox Mode Off', 'Welcome back!', 'info');
    }
  }

  return { init, renderWellnessTips };
})();
