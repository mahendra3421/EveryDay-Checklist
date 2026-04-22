/**
 * modal.js — Modal Manager
 * Add/Edit Task modal, Task Detail modal
 */

const ModalManager = (() => {

  // Active task tags
  let _currentTags         = [];
  let _currentSubtasks     = [];
  let _editingTaskId       = null;
  let _currentRecurringDays = []; // Phase 2: custom weekday selection

  // ---- Init ----
  function init() {
    // Overlay close
    document.getElementById('task-modal-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'task-modal-overlay') closeModal();
    });
    document.getElementById('task-detail-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'task-detail-overlay') closeDetail();
    });

    // Close buttons
    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
    document.getElementById('detail-close-btn')?.addEventListener('click', closeDetail);

    // Save
    document.getElementById('modal-save-btn')?.addEventListener('click', _onSave);

    // Tags input
    document.getElementById('task-tags')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        _addTag(e.target.value.trim().replace(/^#/, ''));
        e.target.value = '';
      }
    });

    // Add subtask
    document.getElementById('add-subtask-btn')?.addEventListener('click', () => {
      const input = document.getElementById('new-subtask-input');
      if (input?.value.trim()) {
        _addSubtask(input.value.trim());
        input.value = '';
        input.focus();
      }
    });

    document.getElementById('new-subtask-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const input = document.getElementById('new-subtask-input');
        if (input?.value.trim()) {
          _addSubtask(input.value.trim());
          input.value = '';
        }
      }
    });

    // Detail modal actions
    document.getElementById('detail-delete-btn')?.addEventListener('click', () => {
      if (_editingTaskId && confirm('Delete this task?')) {
        TaskManager.deleteTask(_editingTaskId);
        closeDetail();
      }
    });

    document.getElementById('detail-edit-btn')?.addEventListener('click', () => {
      const id = _editingTaskId;
      closeDetail();
      setTimeout(() => openEdit(id), 100);
    });

    document.getElementById('detail-complete-btn')?.addEventListener('click', () => {
      if (_editingTaskId) {
        TaskManager.toggleComplete(_editingTaskId);
        closeDetail();
      }
    });

    // ESC to close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.getElementById('task-modal-overlay')?.classList.contains('open')) closeModal();
        if (document.getElementById('task-detail-overlay')?.classList.contains('open')) closeDetail();
      }
    });
  }

  // ---- Open Add Modal ----
  function openAdd(defaults = {}) {
    _editingTaskId = null;
    _currentTags = [];
    _currentSubtasks = [];
    _resetForm();

    const settings = AppState.getSettings();
    document.getElementById('modal-title').textContent = 'New Task';
    document.getElementById('task-priority').value = defaults.priority || settings.defaultPriority || 'medium';
    document.getElementById('task-category').value = defaults.category || settings.defaultCategory || 'personal';

    if (defaults.dueDate) {
      document.getElementById('task-due-date').value = defaults.dueDate;
    }

    _openOverlay('task-modal-overlay');
    document.getElementById('task-title')?.focus();
  }

  // ---- Open Edit Modal ----
  function openEdit(taskId) {
    const task = AppState.getTasks().find(t => t.id === taskId);
    if (!task) return;

    _editingTaskId = taskId;
    _currentTags = [...(task.tags || [])];
    _currentSubtasks = (task.subtasks || []).map(s => ({ ...s }));

    _resetForm();

    document.getElementById('modal-title').textContent = 'Edit Task';
    document.getElementById('task-title').value       = task.title || '';
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-priority').value    = task.priority || 'medium';
    document.getElementById('task-category').value    = task.category || 'personal';
    document.getElementById('task-due-date').value    = task.dueDate || '';
    document.getElementById('task-due-time').value    = task.dueTime || '';
    document.getElementById('task-recurring').value   = task.recurring || 'none';

    // Phase 2: Advanced recurring fields
    _setInputById('task-recurring-enddate', task.recurringEndDate || '');
    _setInputById('task-recurring-count', task.recurringCount || '');

    // Phase 2: Reminder
    if (task.reminderAt) {
      const d = new Date(task.reminderAt);
      _setInputById('task-reminder-date', d.toISOString().split('T')[0]);
      _setInputById('task-reminder-time', d.toTimeString().slice(0,5));
    } else {
      _setInputById('task-reminder-date', '');
      _setInputById('task-reminder-time', '');
    }

    // Phase 2: Custom weekdays
    _currentRecurringDays = task.recurringDays || [];
    _renderRecurringOptions(task.recurring || 'none');

    _renderTagChips();
    _renderSubtasks();

    _openOverlay('task-modal-overlay');
    document.getElementById('task-title')?.focus();
  }

  // ---- Open Detail Modal ----
  function openDetail(taskId) {
    const task = AppState.getTasks().find(t => t.id === taskId);
    if (!task) return;

    _editingTaskId = taskId;

    // Populate
    const priorityBadge  = document.getElementById('detail-priority-badge');
    const categoryBadge  = document.getElementById('detail-category-badge');
    const titleEl        = document.getElementById('detail-title');
    const descEl         = document.getElementById('detail-description');
    const metaEl         = document.getElementById('detail-meta');
    const tagsEl         = document.getElementById('detail-tags');
    const subtasksEl     = document.getElementById('detail-subtasks');
    const notesEl        = document.getElementById('detail-notes');
    const completeBtn    = document.getElementById('detail-complete-btn');

    if (priorityBadge) {
      priorityBadge.textContent = task.priority.toUpperCase();
      priorityBadge.className = `detail-priority-badge priority-badge prio-${task.priority}`;
    }

    if (categoryBadge) {
      const emojis = { work: '💼', personal: '👤', fitness: '💪', study: '📚' };
      categoryBadge.textContent = `${emojis[task.category] || ''} ${Utils.capitalize(task.category)}`;
      categoryBadge.className = `detail-category-badge task-category cat-${task.category}`;
    }

    if (titleEl) titleEl.textContent = task.title;
    if (descEl)  descEl.textContent  = task.description || 'No description added.';

    // Meta
    if (metaEl) {
      const isOverdue = !task.completed && Utils.isOverdue(task.dueDate);
      metaEl.innerHTML = `
        ${task.dueDate ? `<div class="detail-meta-item"><span class="detail-meta-label">Due</span><span class="detail-meta-value ${isOverdue ? 'text-error' : ''}">${Utils.formatRelativeDate(task.dueDate)}${task.dueTime ? ' at ' + task.dueTime : ''}</span></div>` : ''}
        <div class="detail-meta-item"><span class="detail-meta-label">Created</span><span class="detail-meta-value">${Utils.formatDate(task.createdAt?.split('T')[0])}</span></div>
        <div class="detail-meta-item"><span class="detail-meta-label">Recurring</span><span class="detail-meta-value">${task.recurring === 'none' ? 'None' : Utils.capitalize(task.recurring)}</span></div>
        ${task.reminderAt ? `<div class="detail-meta-item"><span class="detail-meta-label">⏰ Reminder</span><span class="detail-meta-value" style="color:var(--accent)">${new Date(task.reminderAt).toLocaleString('en-US', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span></div>` : ''}
        ${task.completed && task.completedAt ? `<div class="detail-meta-item"><span class="detail-meta-label">Completed</span><span class="detail-meta-value text-success">${Utils.formatDate(task.completedAt?.split('T')[0])}</span></div>` : ''}
      `;
    }

    // Tags
    if (tagsEl) {
      tagsEl.innerHTML = (task.tags || []).length
        ? task.tags.map(t => `<span class="task-tag tag-accent">#${Utils.escapeHtml(t)}</span>`).join('')
        : '<span class="text-muted" style="font-size:12px">No tags</span>';
    }

    // Subtasks
    if (subtasksEl) {
      const sts = task.subtasks || [];
      if (sts.length) {
        subtasksEl.innerHTML = `
          <h4>Subtasks (${sts.filter(s => s.done).length}/${sts.length})</h4>
          ${sts.map(st => `
            <div class="subtask-item">
              <button class="subtask-check ${st.done ? 'done' : ''}" data-task-id="${task.id}" data-subtask-id="${st.id}" aria-label="Toggle subtask">
                ${st.done ? '✓' : ''}
              </button>
              <span class="subtask-title ${st.done ? 'done' : ''}">${Utils.escapeHtml(st.title)}</span>
            </div>
          `).join('')}
        `;

        // Bind subtask toggles
        subtasksEl.querySelectorAll('.subtask-check').forEach(btn => {
          btn.addEventListener('click', () => {
            TaskManager.toggleSubtask(task.id, btn.dataset.subtaskId);
            // Refresh detail
            setTimeout(() => {
              if (_editingTaskId === task.id) openDetail(task.id);
            }, 100);
          });
        });
      } else {
        subtasksEl.innerHTML = '';
      }
    }

    // Notes — auto-save with debounce
    if (notesEl) {
      notesEl.value = task.notes || '';
      // Remove old listeners by replacing element
      const newNotesEl = notesEl.cloneNode(true);
      notesEl.parentNode.replaceChild(newNotesEl, notesEl);
      let _notesTimer;
      newNotesEl.addEventListener('input', () => {
        clearTimeout(_notesTimer);
        _notesTimer = setTimeout(() => {
          TaskManager.saveNote(task.id, newNotesEl.value);
        }, 800);
      });
    }

    // Complete button text
    if (completeBtn) {
      completeBtn.textContent = task.completed ? '↩ Mark Incomplete' : '✓ Mark Complete';
      completeBtn.className = task.completed ? 'btn btn-outline' : 'btn btn-primary';
    }

    _openOverlay('task-detail-overlay');
  }

  // ---- Save ----
  function _onSave() {
    const title   = document.getElementById('task-title')?.value?.trim();
    const errorEl = document.getElementById('title-error');

    if (!title) {
      if (errorEl) { errorEl.textContent = 'Title is required'; errorEl.classList.add('show'); }
      document.getElementById('task-title')?.focus();
      document.getElementById('task-title')?.classList.add('shake');
      setTimeout(() => document.getElementById('task-title')?.classList.remove('shake'), 500);
      return;
    }

    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }

    // Phase 2: Build reminderAt from separate date + time fields
    const reminderDateVal = document.getElementById('task-reminder-date')?.value;
    const reminderTimeVal = document.getElementById('task-reminder-time')?.value || '09:00';
    const reminderAt = reminderDateVal ? new Date(`${reminderDateVal}T${reminderTimeVal}:00`).toISOString() : null;

    // Phase 2: Advanced recurring
    const recurringEndDate = document.getElementById('task-recurring-enddate')?.value || null;
    const recurringCountVal = document.getElementById('task-recurring-count')?.value;
    const recurringCount = recurringCountVal ? parseInt(recurringCountVal) : null;

    const data = {
      title,
      description:      document.getElementById('task-description')?.value || '',
      priority:         document.getElementById('task-priority')?.value || 'medium',
      category:         document.getElementById('task-category')?.value || 'personal',
      dueDate:          document.getElementById('task-due-date')?.value || null,
      dueTime:          document.getElementById('task-due-time')?.value || null,
      recurring:        document.getElementById('task-recurring')?.value || 'none',
      recurringDays:    _currentRecurringDays,
      recurringEndDate,
      recurringCount,
      tags:             _currentTags,
      subtasks:         _currentSubtasks,
      reminderAt,
    };

    if (_editingTaskId) {
      const result = TaskManager.editTask(_editingTaskId, data);
      if (result.success) {
        Toast.show('Task updated', '', 'success');
        closeModal();
      }
    } else {
      const result = TaskManager.addTask(data);
      if (result.success) {
        Toast.show('Task added! 🎯', data.title, 'success');
        closeModal();
      } else {
        Toast.show('Error', result.error, 'error');
      }
    }
  }

  // ---- Tag Helpers ----
  function _addTag(tag) {
    if (!tag || _currentTags.includes(tag)) return;
    if (tag.length > 20) return;
    _currentTags.push(tag);
    _renderTagChips();
  }

  function _removeTag(tag) {
    _currentTags = _currentTags.filter(t => t !== tag);
    _renderTagChips();
  }

  function _renderTagChips() {
    const list = document.getElementById('tags-list');
    if (!list) return;
    list.innerHTML = _currentTags.map(tag =>
      `<span class="tag-chip">
        #${Utils.escapeHtml(tag)}
        <button class="tag-remove" data-tag="${Utils.escapeHtml(tag)}" aria-label="Remove tag">×</button>
      </span>`
    ).join('');

    list.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => _removeTag(btn.dataset.tag));
    });
  }

  // ---- Subtask Helpers ----
  function _addSubtask(title) {
    _currentSubtasks.push({
      id:    Utils.generateId(),
      title,
      done:  false,
    });
    _renderSubtasks();
  }

  function _removeSubtask(id) {
    _currentSubtasks = _currentSubtasks.filter(s => s.id !== id);
    _renderSubtasks();
  }

  function _renderSubtasks() {
    const list = document.getElementById('subtasks-list');
    if (!list) return;
    list.innerHTML = _currentSubtasks.map(st =>
      `<div class="subtask-item">
        <div class="subtask-check ${st.done ? 'done' : ''}">${st.done ? '✓' : ''}</div>
        <span class="subtask-title ${st.done ? 'done' : ''}">${Utils.escapeHtml(st.title)}</span>
        <button class="subtask-remove" data-subtask-id="${st.id}" aria-label="Remove subtask">×</button>
      </div>`
    ).join('');

    list.querySelectorAll('.subtask-remove').forEach(btn => {
      btn.addEventListener('click', () => _removeSubtask(btn.dataset.subtaskId));
    });
  }

  // ---- Phase 2: Recurring Options UI ----
  function _renderRecurringOptions(recurring) {
    const container = document.getElementById('recurring-extra-options');
    if (!container) return;

    if (recurring === 'custom') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      container.innerHTML = `
        <div class="form-group full-width">
          <label class="form-label">Repeat on days</label>
          <div class="weekday-picker">
            ${days.map((d, i) => `
              <label class="weekday-btn ${_currentRecurringDays.includes(i) ? 'active' : ''}">
                <input type="checkbox" value="${i}" ${_currentRecurringDays.includes(i) ? 'checked' : ''} style="display:none"/> ${d}
              </label>
            `).join('')}
          </div>
        </div>`;

      container.querySelectorAll('.weekday-btn input').forEach(cb => {
        cb.addEventListener('change', () => {
          const val = parseInt(cb.value);
          if (cb.checked) {
            if (!_currentRecurringDays.includes(val)) _currentRecurringDays.push(val);
            cb.parentElement.classList.add('active');
          } else {
            _currentRecurringDays = _currentRecurringDays.filter(d => d !== val);
            cb.parentElement.classList.remove('active');
          }
        });
      });
    } else if (recurring !== 'none') {
      container.innerHTML = `
        <div class="form-row two-col" style="margin-top:8px">
          <div class="form-group">
            <label class="form-label">End Date (optional)</label>
            <input type="date" id="task-recurring-enddate" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Max Occurrences</label>
            <input type="number" id="task-recurring-count" class="form-input" min="1" max="365" placeholder="Unlimited" />
          </div>
        </div>`;
    } else {
      container.innerHTML = '';
    }
  }

  // ---- Helpers ----
  function _resetForm() {
    const form = document.getElementById('task-form');
    if (form) form.reset();

    const errorEl = document.getElementById('title-error');
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }

    _currentRecurringDays = [];
    const recurringExtra = document.getElementById('recurring-extra-options');
    if (recurringExtra) recurringExtra.innerHTML = '';

    _renderTagChips();
    _renderSubtasks();
  }

  function _setInputById(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function _openOverlay(id) {
    document.getElementById(id)?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('task-modal-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
    _editingTaskId = null;
  }

  function closeDetail() {
    document.getElementById('task-detail-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
    _editingTaskId = null;
  }

  return { init, openAdd, openEdit, openDetail, closeModal, closeDetail, _renderRecurringOptions };
})();
