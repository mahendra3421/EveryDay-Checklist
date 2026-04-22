/**
 * tasks.js — Task Management Module
 * Create, read, update, delete, filter, sort tasks.
 * Handles recurring task logic and smart carry-forward.
 */

const TaskManager = (() => {

  // ---- Task Factory ----
  /**
   * Create a new task object
   * @param {Object} data - partial task data from form
   * @returns {Object} task
   */
  function createTask(data) {
    const settings = AppState.getSettings();
    return {
      id:              Utils.generateId(),
      title:           (data.title || '').trim(),
      description:     (data.description || '').trim(),
      priority:        data.priority        || settings.defaultPriority || 'medium',
      category:        data.category        || settings.defaultCategory || 'personal',
      dueDate:         data.dueDate         || null,
      dueTime:         data.dueTime         || null,
      tags:            Array.isArray(data.tags) ? data.tags : [],
      recurring:       data.recurring       || 'none',
      recurringDays:   Array.isArray(data.recurringDays) ? data.recurringDays : [], // for custom weekdays
      recurringEndDate: data.recurringEndDate || null,  // stop recurring after this date
      recurringCount:  data.recurringCount    || null,  // stop after N occurrences
      subtasks:        Array.isArray(data.subtasks) ? data.subtasks : [],
      completed:       false,
      completedAt:     null,
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
      notes:           data.notes       || '',
      reminderAt:      data.reminderAt  || null, // ISO datetime for smart reminder
      order:           Date.now(),
    };
  }

  // ---- Add Task ----
  function addTask(data) {
    if (!data.title || !data.title.trim()) {
      return { success: false, error: 'Title is required' };
    }

    const task = createTask(data);
    AppState.addTask(task);
    Gamification.onTaskAdded(task);
    Notifications.scheduleTaskReminder(task);

    // Phase 2: Schedule smart reminder if set
    if (task.reminderAt && typeof RemindersEngine !== 'undefined') {
      RemindersEngine.scheduleReminder(task);
    }

    return { success: true, task };
  }

  // ---- Complete / Uncomplete Task ----
  function toggleComplete(taskId) {
    const tasks = AppState.getTasks();
    const task  = tasks.find(t => t.id === taskId);
    if (!task) return;

    const today = Utils.today();

    // ── DATE ACCESS GUARD ──
    // Future tasks (dueDate > today) cannot be completed until their due day
    if (task.dueDate && task.dueDate > today && !task.completed) {
      const label = Utils.formatRelativeDate(task.dueDate);
      Toast.show(
        '🔒 Not available yet',
        `This task unlocks ${label} (${Utils.formatDate(task.dueDate)})`,
        'warning',
        3500
      );
      return; // Block completion
    }

    const wasCompleted = task.completed;
    const now          = new Date().toISOString();

    AppState.updateTask(taskId, {
      completed:   !wasCompleted,
      completedAt: !wasCompleted ? now : null,
    });

    if (!wasCompleted) {
      // ── COMPLETING ──

      // Spawn next recurring occurrence (guarded against duplicates)
      if (task.recurring !== 'none') {
        _scheduleRecurring(task);
      }

      // XP guard: recurring tasks can only earn XP once per calendar day
      const alreadyEarnedToday = task.lastXpDate === today;
      if (!alreadyEarnedToday) {
        AppState.updateTask(taskId, { lastXpDate: today });
        Gamification.onTaskCompleted(task);
        Confetti.burst();
      } else {
        // Still show confetti but no XP
        Confetti.burst();
        if (task.recurring !== 'none') {
          Toast.show('Already earned today!', 'XP for this recurring task was already awarded today.', 'warning', 3000);
        }
      }
    } else {
      // ── UNCOMPLETING ──
      // Only deduct XP if they actually earned it today
      if (task.lastXpDate === today) {
        Gamification.onTaskUncompleted(task);
        AppState.updateTask(taskId, { lastXpDate: null });
      }
    }
  }

  // ---- Edit Task ----
  function editTask(taskId, data) {
    if (!data.title || !data.title.trim()) {
      return { success: false, error: 'Title is required' };
    }

    const updates = {
      title:            (data.title || '').trim(),
      description:      (data.description || '').trim(),
      priority:         data.priority,
      category:         data.category,
      dueDate:          data.dueDate,
      dueTime:          data.dueTime,
      tags:             data.tags,
      recurring:        data.recurring,
      recurringDays:    data.recurringDays    || [],
      recurringEndDate: data.recurringEndDate || null,
      recurringCount:   data.recurringCount   || null,
      subtasks:         data.subtasks,
      notes:            data.notes            || '',
      reminderAt:       data.reminderAt       || null,
    };

    AppState.updateTask(taskId, updates);

    // Phase 2: Update smart reminder
    if (typeof RemindersEngine !== 'undefined') {
      RemindersEngine.cancelReminder(taskId);
      if (updates.reminderAt) {
        RemindersEngine.scheduleReminder({ id: taskId, ...updates });
      }
    }

    return { success: true };
  }

  // ---- Delete Task ----
  function deleteTask(taskId) {
    AppState.deleteTask(taskId);
    // Phase 2: Cancel any scheduled reminder
    if (typeof RemindersEngine !== 'undefined') {
      RemindersEngine.cancelReminder(taskId);
    }
    Toast.show('Task deleted', '', 'info');
  }

  // ---- Toggle Subtask ----
  function toggleSubtask(taskId, subtaskId) {
    const tasks = AppState.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const subtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );

    AppState.updateTask(taskId, { subtasks });
  }

  // ---- Recurring Task Scheduling ----
  function _scheduleRecurring(task) {
    const today = Utils.today();
    let nextDate = null;

    // Check if end date reached
    if (task.recurringEndDate && task.recurringEndDate <= today) return;

    // Check occurrence count
    if (task.recurringCount !== null && task.recurringCount !== undefined && task.recurringCount <= 1) return;

    if (task.recurring === 'daily') {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      nextDate = d.toISOString().split('T')[0];
    } else if (task.recurring === 'weekly') {
      const d = new Date(today);
      d.setDate(d.getDate() + 7);
      nextDate = d.toISOString().split('T')[0];
    } else if (task.recurring === 'biweekly') {
      const d = new Date(today);
      d.setDate(d.getDate() + 14);
      nextDate = d.toISOString().split('T')[0];
    } else if (task.recurring === 'monthly') {
      const d = new Date(today);
      d.setMonth(d.getMonth() + 1);
      nextDate = d.toISOString().split('T')[0];
    } else if (task.recurring === 'weekdays') {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      nextDate = d.toISOString().split('T')[0];
    } else if (task.recurring === 'custom' && Array.isArray(task.recurringDays) && task.recurringDays.length > 0) {
      const d = new Date(today);
      for (let i = 1; i <= 7; i++) {
        const candidate = new Date(d);
        candidate.setDate(d.getDate() + i);
        if (task.recurringDays.includes(candidate.getDay())) {
          nextDate = candidate.toISOString().split('T')[0];
          break;
        }
      }
    }

    if (!nextDate) return;

    // ── DUPLICATE GUARD ──
    // Don't create a next occurrence if one already exists:
    // same title + same recurring pattern + same nextDate and not completed yet
    const allTasks = AppState.getTasks();
    const duplicateExists = allTasks.some(t =>
      t.id !== task.id &&
      !t.completed &&
      t.title === task.title &&
      t.recurring === task.recurring &&
      t.dueDate === nextDate
    );
    if (duplicateExists) return;

    // Create the next occurrence
    const newCount = task.recurringCount ? task.recurringCount - 1 : null;
    const newTask = createTask({
      ...task,
      dueDate:        nextDate,
      completed:      false,
      completedAt:    null,
      lastXpDate:     null,  // fresh XP eligibility
      id:             undefined,
      order:          undefined,
      reminderAt:     null,
      recurringCount: newCount,
    });
    AppState.addTask(newTask);
  }

  // ---- Daily Reset ----
  function performDailyReset() {
    const settings = AppState.getSettings();
    if (!settings.autoReset) return;

    const lastReset = Storage.get(KEYS.LAST_RESET, null);
    const today = Utils.today();

    if (lastReset === today) return; // Already reset today

    Storage.set(KEYS.LAST_RESET, today);

    if (settings.carryForward) {
      // Mark incomplete tasks from previous days as "carried forward"
      const tasks = AppState.getTasks();
      const updated = tasks.map(task => {
        if (!task.completed && task.dueDate && task.dueDate < today) {
          return { ...task, dueDate: today, carriedForward: true };
        }
        return task;
      });
      AppState.setTasks(updated);
    }

    // Log daily stats for streaks
    Gamification.recordDailyActivity();
  }

  // ---- Filtering & Sorting ----
  function getFilteredTasks(overrideFilters = {}) {
    const tasks  = AppState.getTasks();
    const filters = { ...AppState.getFilters(), ...overrideFilters };
    const query  = AppState.get('searchQuery') || '';
    const today  = Utils.today();

    let result = [...tasks];

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      result = result.filter(t => t.category === filters.category);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      result = result.filter(t => t.priority === filters.priority);
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'active')    result = result.filter(t => !t.completed);
      if (filters.status === 'completed') result = result.filter(t => t.completed);
      if (filters.status === 'overdue')   result = result.filter(t => !t.completed && Utils.isOverdue(t.dueDate));
    }

    // Sort
    result = _sortTasks(result, filters.sort);

    return result;
  }

  function _sortTasks(tasks, sortBy) {
    const sorted = [...tasks];
    switch (sortBy) {
      case 'priority':
        return sorted.sort((a, b) => Utils.priorityWeight(b.priority) - Utils.priorityWeight(a.priority));
      case 'due':
        return sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'created':
      default:
        return sorted.sort((a, b) => b.order - a.order);
    }
  }

  // ---- Get Today's Tasks ----
  function getTodayTasks() {
    const today = Utils.today();
    return AppState.getTasks().filter(t => !t.dueDate || t.dueDate === today);
  }

  // ---- Get Upcoming Tasks ----
  function getUpcomingTasks() {
    const today = Utils.today();
    return AppState.getTasks()
      .filter(t => t.dueDate && t.dueDate > today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  // ---- Get Stats ----
  function getStats() {
    const tasks     = AppState.getTasks();
    const today     = Utils.today();
    const todayTasks = tasks.filter(t => !t.dueDate || t.dueDate === today);
    const completed  = tasks.filter(t => t.completed);
    const total      = tasks.length;
    const pending    = tasks.filter(t => !t.completed);
    const overdue    = tasks.filter(t => !t.completed && Utils.isOverdue(t.dueDate));
    const todayDone  = todayTasks.filter(t => t.completed);
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    return {
      total,
      completed:      completed.length,
      pending:        pending.length,
      overdue:        overdue.length,
      todayTotal:     todayTasks.length,
      todayCompleted: todayDone.length,
      completionRate,
    };
  }

  // ---- Category Distribution ----
  function getCategoryStats() {
    const tasks = AppState.getTasks();
    const cats = { work: 0, personal: 0, fitness: 0, study: 0 };

    // Also include custom categories from settings
    const settings = AppState.getSettings();
    (settings.customCategories || []).forEach(cat => { cats[cat.id] = 0; });

    tasks.forEach(t => { if (cats[t.category] !== undefined) cats[t.category]++; });
    return cats;
  }

  // ---- Save note on task ----
  function saveNote(taskId, note) {
    AppState.updateTask(taskId, { notes: note, updatedAt: new Date().toISOString() });
    Toast.show('Note saved!', '', 'success');
  }

  // ---- Export Tasks as CSV ----
  function exportCSV() {
    const tasks = AppState.getTasks();
    const headers = ['Title','Description','Priority','Category','Due Date','Tags','Status','Created'];
    const rows = tasks.map(t => [
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.priority,
      t.category,
      t.dueDate || '',
      `"${(t.tags || []).join(', ')}"`,
      t.completed ? 'Completed' : 'Pending',
      t.createdAt ? t.createdAt.split('T')[0] : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href    = url;
    a.download = `flowtask_tasks_${Utils.today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    addTask, editTask, deleteTask, toggleComplete, toggleSubtask,
    performDailyReset,
    getFilteredTasks, getTodayTasks, getUpcomingTasks,
    getStats, getCategoryStats,
    saveNote,
    exportCSV,
  };
})();
