/**
 * taskCard.js — Task Card Renderer
 * Creates HTML for task items in various views
 */

const TaskCard = (() => {

  /**
   * Determine if a task is locked (future due date — not yet accessible)
   */
  function _isLocked(task) {
    if (task.completed) return false;  // Already done, always unlockable
    if (!task.dueDate) return false;   // No due date = always accessible
    return task.dueDate > Utils.today(); // Future date = locked
  }

  /**
   * Create a full task card element
   */
  function create(task, options = {}) {
    const {
      showDragHandle = true,
    } = options;

    const today    = Utils.today();
    const isLocked  = _isLocked(task);
    const isOverdue = !task.completed && Utils.isOverdue(task.dueDate);
    const isDueSoon = !task.completed && Utils.isDueSoon(task.dueDate);
    const subtaskTotal = (task.subtasks || []).length;
    const subtaskDone  = (task.subtasks || []).filter(s => s.done).length;

    const el = document.createElement('div');
    el.className = [
      'task-item',
      `priority-${task.priority}`,
      task.completed ? 'completed' : '',
      isOverdue ? 'overdue' : '',
      isLocked  ? 'task-locked' : '',
      'fade-in',
    ].filter(Boolean).join(' ');
    el.dataset.taskId = task.id;
    el.setAttribute('role', 'listitem');
    el.setAttribute('aria-label', task.title);

    el.innerHTML = `
      ${showDragHandle ? `
        <div class="drag-handle" title="Drag to reorder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
          </svg>
        </div>` : ''}

      <button
        class="task-checkbox ${task.completed ? 'done' : ''} ${isLocked ? 'locked' : ''}"
        data-action="toggle"
        data-task-id="${task.id}"
        aria-label="${isLocked ? 'Task locked until ' + task.dueDate : task.completed ? 'Mark incomplete' : 'Mark complete'}"
        title="${isLocked ? 'Unlocks ' + Utils.formatRelativeDate(task.dueDate) : task.completed ? 'Mark incomplete' : 'Mark complete'}"
      >
        ${isLocked
          ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`
          : `<svg class="task-checkbox-inner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        }
      </button>

      <div class="task-content" data-action="detail" data-task-id="${task.id}" style="cursor:pointer">
        <div class="task-title">${Utils.escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-description">${Utils.escapeHtml(Utils.truncate(task.description, 80))}</div>` : ''}
        <div class="task-meta">
          ${_categoryBadge(task.category)}
          ${_priorityBadge(task.priority)}
          ${task.dueDate ? _dueBadge(task.dueDate, task.dueTime, isOverdue, isDueSoon, isLocked) : ''}
          ${task.recurring !== 'none' ? `<span class="recurring-badge">🔄 ${Utils.capitalize(task.recurring)}</span>` : ''}
          ${subtaskTotal > 0 ? `<span class="subtask-progress">✓ ${subtaskDone}/${subtaskTotal}</span>` : ''}
          ${(task.tags || []).slice(0, 3).map(tag => `<span class="task-tag">#${Utils.escapeHtml(tag)}</span>`).join('')}
          ${(task.tags || []).length > 3 ? `<span class="task-tag">+${task.tags.length - 3}</span>` : ''}
        </div>
        ${isLocked ? `
          <div class="task-locked-label">
            🔒 Unlocks ${Utils.formatRelativeDate(task.dueDate)} · ${Utils.formatDate(task.dueDate)}
          </div>` : ''}
      </div>

      <div class="task-actions">
        <button class="task-action-btn edit" data-action="edit" data-task-id="${task.id}" title="Edit task" aria-label="Edit task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="task-action-btn delete" data-action="delete" data-task-id="${task.id}" title="Delete task" aria-label="Delete task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    `;

    _bindEvents(el);
    return el;
  }

  /**
   * Create compact row for All Tasks view
   */
  function createCompact(task) {
    const isLocked  = _isLocked(task);
    const isOverdue = !task.completed && Utils.isOverdue(task.dueDate);

    const el = document.createElement('div');
    el.className = [
      'all-task-item',
      `priority-${task.priority}`,
      task.completed ? 'completed' : '',
      isOverdue ? 'overdue' : '',
      isLocked  ? 'task-locked' : '',
      'fade-in',
    ].filter(Boolean).join(' ');
    el.dataset.taskId = task.id;

    el.innerHTML = `
      <button
        class="task-checkbox ${task.completed ? 'done' : ''} ${isLocked ? 'locked' : ''}"
        data-action="toggle"
        data-task-id="${task.id}"
        aria-label="Toggle"
        title="${isLocked ? 'Unlocks ' + Utils.formatRelativeDate(task.dueDate) : 'Toggle complete'}"
      >
        ${isLocked
          ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`
          : `<svg class="task-checkbox-inner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        }
      </button>
      <span class="all-task-title ${isLocked ? 'text-muted' : ''}">${Utils.escapeHtml(task.title)}</span>
      <div class="all-task-meta">
        ${_categoryBadge(task.category)}
        ${_priorityBadge(task.priority)}
        ${task.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''} ${isLocked ? 'locked-badge' : ''}">
          ${isLocked ? '🔒' : '📅'} ${Utils.formatRelativeDate(task.dueDate)}
        </span>` : ''}
      </div>
      <div class="all-task-actions">
        <button class="task-action-btn edit" data-action="edit" data-task-id="${task.id}" title="Edit" aria-label="Edit">✏️</button>
        <button class="task-action-btn delete" data-action="delete" data-task-id="${task.id}" title="Delete" aria-label="Delete">🗑</button>
      </div>
    `;

    _bindEvents(el);
    return el;
  }

  /**
   * Bind click events on a task card element
   */
  function _bindEvents(el) {
    el.addEventListener('click', e => {
      const btn    = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const taskId = btn.dataset.taskId;

      e.stopPropagation();

      switch (action) {
        case 'toggle': TaskManager.toggleComplete(taskId); break;
        case 'edit':   ModalManager.openEdit(taskId);      break;
        case 'delete': _confirmDelete(taskId);             break;
        case 'detail': ModalManager.openDetail(taskId);    break;
      }
    });
  }

  function _confirmDelete(taskId) {
    const task = AppState.getTasks().find(t => t.id === taskId);
    if (!task) return;
    if (confirm(`Delete "${task.title}"?`)) {
      TaskManager.deleteTask(taskId);
    }
  }

  // ---- Badge Helpers ----
  function _categoryBadge(category) {
    const emojis = { work: '💼', personal: '👤', fitness: '💪', study: '📚' };
    return `<span class="task-category cat-${category}">${emojis[category] || ''} ${Utils.capitalize(category)}</span>`;
  }

  function _priorityBadge(priority) {
    const labels = { high: 'High', medium: 'Med', low: 'Low' };
    return `<span class="priority-badge prio-${priority}">${labels[priority] || priority}</span>`;
  }

  function _dueBadge(date, time, isOverdue, isDueSoon, isLocked) {
    if (isLocked) {
      return `<span class="task-due locked-badge">🔒 ${Utils.formatRelativeDate(date)}${time ? ' ' + time : ''}</span>`;
    }
    const cls  = isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : '';
    const icon = isOverdue ? '🚨' : '📅';
    return `<span class="task-due ${cls}">${icon} ${Utils.formatRelativeDate(date)}${time ? ' ' + time : ''}</span>`;
  }

  return { create, createCompact };
})();
