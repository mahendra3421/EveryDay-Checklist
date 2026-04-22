/**
 * reminders.js — Smart Reminders Engine (Phase 2)
 * Persistent reminders, snooze, dismiss, notification center
 */

const RemindersEngine = (() => {

  const SNOOZE_OPTIONS = [5, 10, 30, 60]; // minutes
  let _timers = {};

  // ---- Initialize ----
  function init() {
    _loadAndScheduleAll();
    // Re-check every minute for any missed reminders
    setInterval(_checkMissedReminders, 60 * 1000);
  }

  // ---- Add or update a reminder for a task ----
  function scheduleReminder(task) {
    if (!task.reminderAt) return;

    const reminderDate = new Date(task.reminderAt);
    const now = new Date();

    if (reminderDate <= now) {
      // Already past — add to missed
      _addToNotificationCenter({
        id:      `missed-${task.id}`,
        taskId:  task.id,
        title:   task.title,
        type:    'missed',
        time:    task.reminderAt,
        snoozed: false,
      });
      return;
    }

    // Clear existing timer for this task
    cancelReminder(task.id);

    const delay = reminderDate - now;
    _timers[task.id] = setTimeout(() => {
      _fireReminder(task);
    }, delay);

    // Persist the schedule
    _persistSchedule(task.id, task.reminderAt);
  }

  // ---- Fire a reminder ----
  function _fireReminder(task) {
    const tasks = AppState.getTasks();
    const currentTask = tasks.find(t => t.id === task.id);

    // Don't fire if task is already completed
    if (!currentTask || currentTask.completed) {
      _removePersisted(task.id);
      return;
    }

    // Browser notification
    if (Notification.permission === 'granted') {
      const notif = new Notification(`⏰ Reminder: ${task.title}`, {
        body: task.description || 'Task reminder',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        requireInteraction: true,
        tag: `task-${task.id}`,
      });

      notif.onclick = () => {
        window.focus();
        ModalManager.openDetail(task.id);
        notif.close();
      };
    }

    // In-app toast
    Toast.show(`⏰ Reminder!`, Utils.truncate(task.title, 40), 'warning', 8000);

    // Add to notification center
    _addToNotificationCenter({
      id:      `reminder-${task.id}-${Date.now()}`,
      taskId:  task.id,
      title:   task.title,
      type:    'reminder',
      time:    new Date().toISOString(),
      snoozed: false,
    });

    // Show notif dot
    const dot = document.getElementById('notif-dot');
    if (dot) dot.classList.add('show');

    _removePersisted(task.id);
    delete _timers[task.id];
  }

  // ---- Cancel a reminder ----
  function cancelReminder(taskId) {
    if (_timers[taskId]) {
      clearTimeout(_timers[taskId]);
      delete _timers[taskId];
    }
    _removePersisted(taskId);
  }

  // ---- Snooze a reminder ----
  function snoozeReminder(notifId, taskId, minutes) {
    const task = AppState.getTasks().find(t => t.id === taskId);
    if (!task) return;

    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
    const updatedTask = { ...task, reminderAt: snoozeTime.toISOString() };

    AppState.updateTask(taskId, { reminderAt: snoozeTime.toISOString() });
    scheduleReminder(updatedTask);

    // Mark as snoozed in notification center
    _updateNotifCenter(notifId, { snoozed: true, snoozeUntil: snoozeTime.toISOString() });

    Toast.show(`⏳ Snoozed ${minutes}m`, Utils.truncate(task.title, 30), 'info');
    AppState.emit('reminders:changed');
  }

  // ---- Dismiss a reminder ----
  function dismissReminder(notifId) {
    _removeFromNotificationCenter(notifId);
    AppState.emit('reminders:changed');
  }

  // ---- Notification Center Data ----
  function _getNotificationCenter() {
    return Storage.get('notif_center', []);
  }

  function _addToNotificationCenter(notif) {
    const list = _getNotificationCenter();
    // Avoid duplicates for same task
    const filtered = list.filter(n => n.id !== notif.id);
    filtered.unshift(notif); // newest first
    // Keep max 50
    Storage.set('notif_center', filtered.slice(0, 50));
    AppState.emit('reminders:changed');
  }

  function _updateNotifCenter(notifId, updates) {
    const list = _getNotificationCenter().map(n =>
      n.id === notifId ? { ...n, ...updates } : n
    );
    Storage.set('notif_center', list);
  }

  function _removeFromNotificationCenter(notifId) {
    const list = _getNotificationCenter().filter(n => n.id !== notifId);
    Storage.set('notif_center', list);
  }

  function getNotifications() {
    return _getNotificationCenter();
  }

  function clearAllNotifications() {
    Storage.set('notif_center', []);
    const dot = document.getElementById('notif-dot');
    if (dot) dot.classList.remove('show');
    AppState.emit('reminders:changed');
  }

  // ---- Persist/Load schedule ----
  function _persistSchedule(taskId, time) {
    const schedules = Storage.get('reminder_schedules', {});
    schedules[taskId] = time;
    Storage.set('reminder_schedules', schedules);
  }

  function _removePersisted(taskId) {
    const schedules = Storage.get('reminder_schedules', {});
    delete schedules[taskId];
    Storage.set('reminder_schedules', schedules);
  }

  function _loadAndScheduleAll() {
    const schedules = Storage.get('reminder_schedules', {});
    const tasks = AppState.getTasks();
    const now = new Date();

    Object.entries(schedules).forEach(([taskId, time]) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.completed) {
        delete schedules[taskId];
        return;
      }

      const reminderDate = new Date(time);
      if (reminderDate <= now) {
        // Missed — add to center
        _addToNotificationCenter({
          id:      `missed-${taskId}-${Date.now()}`,
          taskId,
          title:   task.title,
          type:    'missed',
          time:    time,
          snoozed: false,
        });
        delete schedules[taskId];
      } else {
        // Future — re-schedule
        task.reminderAt = time;
        scheduleReminder(task);
      }
    });

    Storage.set('reminder_schedules', schedules);
  }

  function _checkMissedReminders() {
    const tasks = AppState.getTasks();
    const now = new Date().toISOString();
    tasks.forEach(task => {
      if (!task.completed && task.reminderAt && task.reminderAt < now && !_timers[task.id]) {
        // Could have been missed (page refresh) — already handled in init
      }
    });
  }

  // ---- Get upcoming reminders (for display) ----
  function getUpcomingReminders() {
    const tasks = AppState.getTasks();
    const now = new Date();

    return tasks
      .filter(t => !t.completed && t.reminderAt && new Date(t.reminderAt) > now)
      .sort((a, b) => new Date(a.reminderAt) - new Date(b.reminderAt))
      .map(t => ({
        taskId:     t.id,
        title:      t.title,
        reminderAt: t.reminderAt,
        priority:   t.priority,
      }));
  }

  return {
    init,
    scheduleReminder,
    cancelReminder,
    snoozeReminder,
    dismissReminder,
    getNotifications,
    getUpcomingReminders,
    clearAllNotifications,
    SNOOZE_OPTIONS,
  };
})();
