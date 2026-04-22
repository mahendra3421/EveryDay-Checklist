/**
 * state.js — Application State Manager
 * Single source of truth for all runtime state.
 * Provides subscribe/publish event system.
 */

const AppState = (() => {
  // ---- Internal State ----
  let _state = {
    // Tasks
    tasks: [],

    // UI
    currentView: 'dashboard',
    searchQuery: '',
    filters: {
      category: 'all',
      priority: 'all',
      status: 'all',
      sort: 'created',
    },

    // Settings
    settings: {
      username: 'User',
      avatarInitial: 'U',
      theme: 'dark',
      accentColor: '#6c63ff',
      defaultCategory: 'personal',
      defaultPriority: 'medium',
      autoReset: true,
      carryForward: true,
      notifications: {
        dueReminders: true,
        dailySummary: true,
        streakAlerts: true,
        reminderTime: '09:00',
      },
    },

    // Pomodoro
    pomodoro: {
      workDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      sessionCount: 0,
      phase: 'work',      // 'work' | 'short' | 'long'
      timeLeft: 25 * 60,
      running: false,
      intervalId: null,
    },

    // Gamification
    gamification: {
      xp: 0,
      level: 1,
      streak: 0,
      bestStreak: 0,
      totalCompleted: 0,
      badges: {},
      lastActivityDate: null,
    },

    // Wellness
    wellness: {
      todayMood: null,
      todayEnergy: null,
      moodHistory: [],
      energyHistory: [],
    },

    // Focus Mode
    focus: {
      currentIndex: 0,
      activeTasks: [],
    },

    // Session data
    session: {
      lastReset: null,
      focusMinutes: 0,
      notificationsScheduled: [],
    },
  };

  // ---- Event Bus ----
  const _listeners = {};

  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
    // Return unsubscribe function
    return () => off(event, callback);
  }

  function off(event, callback) {
    if (_listeners[event]) {
      _listeners[event] = _listeners[event].filter(cb => cb !== callback);
    }
  }

  function emit(event, data) {
    if (_listeners[event]) {
      _listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(`[State] Event handler error (${event}):`, e); }
      });
    }
    // Wildcard listeners
    if (_listeners['*']) {
      _listeners['*'].forEach(cb => {
        try { cb({ event, data }); } catch (e) {}
      });
    }
  }

  // ---- Getters ----
  function get(path) {
    if (!path) return _state;
    return path.split('.').reduce((obj, key) => obj?.[key], _state);
  }

  function getTasks() { return _state.tasks; }
  function getSettings() { return _state.settings; }
  function getGamification() { return _state.gamification; }
  function getWellness() { return _state.wellness; }
  function getPomodoro() { return _state.pomodoro; }
  function getCurrentView() { return _state.currentView; }
  function getFilters() { return _state.filters; }

  // ---- Setters ----
  function setTasks(tasks) {
    _state.tasks = tasks;
    emit('tasks:changed', tasks);
    _persist();
  }

  function addTask(task) {
    _state.tasks.unshift(task);
    emit('tasks:added', task);
    emit('tasks:changed', _state.tasks);
    _persist();
  }

  function updateTask(taskId, updates) {
    const idx = _state.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return false;
    _state.tasks[idx] = { ..._state.tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    emit('tasks:updated', { taskId, task: _state.tasks[idx] });
    emit('tasks:changed', _state.tasks);
    _persist();
    return true;
  }

  function deleteTask(taskId) {
    const task = _state.tasks.find(t => t.id === taskId);
    _state.tasks = _state.tasks.filter(t => t.id !== taskId);
    emit('tasks:deleted', { taskId, task });
    emit('tasks:changed', _state.tasks);
    _persist();
  }

  function setSettings(settings) {
    _state.settings = { ..._state.settings, ...settings };
    emit('settings:changed', _state.settings);
    _persistSettings();
  }

  function setGamification(data) {
    _state.gamification = { ..._state.gamification, ...data };
    emit('gamification:changed', _state.gamification);
    _persistGamification();
  }

  function setWellness(data) {
    _state.wellness = { ..._state.wellness, ...data };
    emit('wellness:changed', _state.wellness);
    _persistWellness();
  }

  function setPomodoro(data) {
    _state.pomodoro = { ..._state.pomodoro, ...data };
    emit('pomodoro:changed', _state.pomodoro);
  }

  function setView(view) {
    const prev = _state.currentView;
    _state.currentView = view;
    emit('view:changed', { view, prev });
  }

  function setFilter(key, value) {
    _state.filters[key] = value;
    emit('filter:changed', _state.filters);
  }

  function setSearch(query) {
    _state.searchQuery = query;
    emit('search:changed', query);
  }

  function setFocus(data) {
    _state.focus = { ..._state.focus, ...data };
    emit('focus:changed', _state.focus);
  }

  // ---- Persistence ----
  function _persist() {
    Storage.set(KEYS.TASKS, _state.tasks);
  }

  function _persistSettings() {
    Storage.set(KEYS.SETTINGS, _state.settings);
  }

  function _persistGamification() {
    Storage.set(KEYS.GAMIFICATION, _state.gamification);
  }

  function _persistWellness() {
    Storage.set(KEYS.WELLNESS, _state.wellness);
  }

  // ---- Hydrate from storage ----
  function hydrate() {
    const tasks    = Storage.get(KEYS.TASKS, []);
    const settings = Storage.get(KEYS.SETTINGS, _state.settings);
    const gamif    = Storage.get(KEYS.GAMIFICATION, _state.gamification);
    const wellness = Storage.get(KEYS.WELLNESS, _state.wellness);
    const pomSet   = Storage.get(KEYS.POMODORO, {});

    _state.tasks             = tasks;
    _state.settings          = { ..._state.settings, ...settings };
    _state.gamification      = { ..._state.gamification, ...gamif };
    _state.wellness          = { ..._state.wellness, ...wellness };
    _state.pomodoro.workDuration  = pomSet.workDuration  || 25;
    _state.pomodoro.shortBreak    = pomSet.shortBreak    || 5;
    _state.pomodoro.longBreak     = pomSet.longBreak     || 15;
    _state.pomodoro.timeLeft      = _state.pomodoro.workDuration * 60;
    _state.session.lastReset      = Storage.get(KEYS.LAST_RESET, null);
    _state.session.focusMinutes   = Storage.get(KEYS.FOCUS_TIME, 0);

    emit('state:hydrated', _state);
  }

  return {
    // Getters
    get, getTasks, getSettings, getGamification, getWellness,
    getPomodoro, getCurrentView, getFilters,

    // Task mutations
    setTasks, addTask, updateTask, deleteTask,

    // Other mutations
    setSettings, setGamification, setWellness, setPomodoro,
    setView, setFilter, setSearch, setFocus,

    // Events
    on, off, emit,

    // Init
    hydrate,
  };
})();
