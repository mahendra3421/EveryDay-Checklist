/**
 * notifications.js — Notification & Toast System
 * Browser notifications, in-app toasts, smart reminders
 */

const Notifications = (() => {

  let _permission = 'default';
  let _scheduled  = [];

  // ---- Init ----
  async function init() {
    if ('Notification' in window) {
      _permission = Notification.permission;
      if (_permission === 'default') {
        _permission = await Notification.requestPermission().catch(() => 'denied');
      }
    }
    setTimeout(_checkOverdueTasks, 2000);
    setInterval(_checkOverdueTasks, 60 * 60 * 1000);
    _scheduleDailyReminder();
  }

  // ---- Schedule task reminder ----
  function scheduleTaskReminder(task) {
    if (!task.dueDate) return;
    const settings = AppState.getSettings();
    if (!settings.notifications?.dueReminders) return;

    const dueDateTime  = new Date(`${task.dueDate}T${task.dueTime || '09:00'}:00`);
    const reminderTime = new Date(dueDateTime.getTime() - 30 * 60 * 1000);
    const now = new Date();
    if (reminderTime <= now) return;

    const delay = reminderTime - now;
    const timeoutId = setTimeout(() => {
      _browserNotif('Task Due Soon! ⏰', `"${task.title}" is due in 30 minutes.`, '⏰');
      Toast.show('Task Reminder', `"${Utils.truncate(task.title, 30)}" is due soon!`, 'warning');
    }, delay);

    _scheduled.push({ taskId: task.id, timeoutId });
  }

  // ---- Check overdue tasks ----
  function _checkOverdueTasks() {
    const tasks = AppState.getTasks().filter(t => !t.completed && Utils.isOverdue(t.dueDate));
    if (tasks.length > 0) {
      const dot = document.getElementById('notif-dot');
      if (dot) dot.classList.add('show');
      if (tasks.length <= 2) {
        tasks.forEach(t => Toast.show('Overdue Task ⚠️', `"${Utils.truncate(t.title, 40)}"`, 'warning'));
      } else {
        Toast.show(`${tasks.length} Overdue Tasks ⚠️`, 'Click Fix Overdue to reschedule.', 'warning');
      }
    }
  }

  // ---- Daily reminder ----
  function _scheduleDailyReminder() {
    const settings = AppState.getSettings();
    if (!settings.notifications?.dailySummary) return;
    const [h, m] = (settings.notifications.reminderTime || '09:00').split(':').map(Number);
    const now  = new Date();
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    setTimeout(() => {
      const stats = TaskManager.getStats();
      const g     = AppState.getGamification();
      _browserNotif('Good morning! 🌅', `${stats.pending} tasks pending. Streak: ${g.streak} days 🔥`, '📋');
      Toast.show('Daily Summary', `${stats.pending} tasks pending today. Keep going!`, 'info');
      setTimeout(_scheduleDailyReminder, 24 * 60 * 60 * 1000);
    }, next - now);
  }

  // ---- Browser notification ----
  function _browserNotif(title, body, icon = '📋') {
    if (_permission !== 'granted') return;
    try { new Notification(title, { body, icon: '/icons/icon-192.png' }); } catch {}
  }

  // ---- Cancel scheduled reminder ----
  function cancelReminder(taskId) {
    _scheduled = _scheduled.filter(s => {
      if (s.taskId === taskId) { clearTimeout(s.timeoutId); return false; }
      return true;
    });
  }

  return { init, scheduleTaskReminder, cancelReminder };
})();

// ============================================================
// Toast System — Max 4 visible, queue overflow, deduplication
// ============================================================
const Toast = (() => {
  const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const MAX_VISIBLE  = 4;     // Max toasts on screen at once
  const DEDUP_MS     = 1500;  // Suppress same toast within this window

  let _container    = null;
  let _queue        = [];
  let _active       = [];
  let _lastShown    = {};

  function _getContainer() {
    if (!_container) _container = document.getElementById('toast-container');
    return _container;
  }

  /**
   * Show a toast — auto-queues if MAX_VISIBLE reached, deduplicates rapid repeats
   * @param {string} title
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration ms
   */
  function show(title, message = '', type = 'info', duration = 3500) {
    const container = _getContainer();
    if (!container) return;

    // Dedup: drop identical toast shown within DEDUP_MS
    const key = `${type}::${title}`;
    const now = Date.now();
    if (_lastShown[key] && now - _lastShown[key] < DEDUP_MS) return;
    _lastShown[key] = now;

    // Queue if too many visible
    if (_active.length >= MAX_VISIBLE) {
      if (_queue.length < 6) _queue.push({ title, message, type, duration });
      return;
    }

    _create(container, title, message, type, duration);
  }

  function _create(container, title, message, type, duration) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${ICONS[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${Utils.escapeHtml(title)}</div>
        ${message ? `<div class="toast-message">${Utils.escapeHtml(message)}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Dismiss">×</button>
    `;

    el.querySelector('.toast-close').addEventListener('click', () => _remove(el));
    container.appendChild(el);
    _active.push(el);
    setTimeout(() => _remove(el), duration);
  }

  function _remove(el) {
    if (!el.parentNode) return;
    el.classList.add('removing');
    setTimeout(() => {
      el.parentNode?.removeChild(el);
      _active = _active.filter(t => t !== el);
      // Drain queue
      const container = _getContainer();
      if (_queue.length > 0 && container && _active.length < MAX_VISIBLE) {
        const next = _queue.shift();
        _create(container, next.title, next.message, next.type, next.duration);
      }
    }, 300);
  }

  return { show };
})();
