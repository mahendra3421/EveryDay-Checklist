/**
 * storage.js — Persistent Storage Layer
 * Provides safe localStorage access with JSON serialization,
 * fallback to in-memory storage for private/incognito contexts.
 */

const Storage = (() => {
  // In-memory fallback
  let _memory = {};
  let _useMemory = false;

  // Test localStorage availability
  try {
    const test = '__flowtask_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
  } catch (e) {
    _useMemory = true;
    console.warn('[Storage] localStorage unavailable, using in-memory fallback');
  }

  /**
   * Get a value from storage
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  function get(key, defaultValue = null) {
    try {
      if (_useMemory) return _memory[key] !== undefined ? _memory[key] : defaultValue;
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.error(`[Storage] get("${key}") error:`, e);
      return defaultValue;
    }
  }

  /**
   * Set a value in storage
   * @param {string} key
   * @param {*} value
   * @returns {boolean} success
   */
  function set(key, value) {
    try {
      if (_useMemory) {
        _memory[key] = value;
        return true;
      }
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('[Storage] Quota exceeded. Clearing old data...');
        clearOld();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (e2) {
          console.error('[Storage] Still failed after clearing:', e2);
        }
      }
      return false;
    }
  }

  /**
   * Remove a key from storage
   * @param {string} key
   */
  function remove(key) {
    if (_useMemory) { delete _memory[key]; return; }
    localStorage.removeItem(key);
  }

  /**
   * Clear all FlowTask storage keys
   */
  function clearAll() {
    if (_useMemory) { _memory = {}; return; }
    const keys = Object.keys(localStorage).filter(k => k.startsWith('ft_'));
    keys.forEach(k => localStorage.removeItem(k));
  }

  /**
   * Clear old/potentially large data
   */
  function clearOld() {
    const nonEssential = ['ft_analytics_cache', 'ft_logs'];
    nonEssential.forEach(k => localStorage.removeItem(k));
  }

  /**
   * Export all FlowTask data as JSON string
   * @returns {string}
   */
  function exportAll() {
    if (_useMemory) return JSON.stringify(_memory);
    const data = {};
    Object.keys(localStorage)
      .filter(k => k.startsWith('ft_'))
      .forEach(k => {
        try { data[k] = JSON.parse(localStorage.getItem(k)); } catch {}
      });
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON string
   * @param {string} jsonStr
   * @returns {boolean}
   */
  function importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      Object.entries(data).forEach(([k, v]) => set(k, v));
      return true;
    } catch (e) {
      console.error('[Storage] Import failed:', e);
      return false;
    }
  }

  return { get, set, remove, clearAll, exportAll, importAll };
})();

// Namespace keys
const KEYS = {
  TASKS:        'ft_tasks',
  SETTINGS:     'ft_settings',
  STATS:        'ft_stats',
  MOOD_LOG:     'ft_mood_log',
  ENERGY_LOG:   'ft_energy_log',
  STREAK:       'ft_streak',
  GAMIFICATION: 'ft_gamification',
  DAILY_LOG:    'ft_daily_log',
  POMODORO:     'ft_pomodoro_settings',
  WELLNESS:     'ft_wellness',
  NOTES:        'ft_notes',
  LAST_RESET:   'ft_last_reset',
  FOCUS_TIME:   'ft_focus_time',
};
