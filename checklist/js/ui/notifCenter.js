/**
 * notifCenter.js — Notification Center UI (Phase 2)
 * Slide-in panel, alert tabs, snooze/dismiss, upcoming reminders
 */

const NotifCenter = (() => {

  let _activeTab = 'alerts';

  function init() {
    const btn     = document.getElementById('notifications-btn');
    const overlay = document.getElementById('notif-center-overlay');
    const closeBtn = document.getElementById('notif-center-close');
    const clearBtn = document.getElementById('notif-clear-all');
    const tabs     = document.querySelectorAll('.notif-tab');

    if (btn) btn.addEventListener('click', open);
    if (overlay) overlay.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (clearBtn) clearBtn.addEventListener('click', () => {
      RemindersEngine.clearAllNotifications();
      _renderAlerts();
    });

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        _activeTab = tab.dataset.tab;
        tabs.forEach(t => t.classList.toggle('active', t === tab));
        _render();
      });
    });

    // Listen for reminder changes
    AppState.on('reminders:changed', _render);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
  }

  function open() {
    document.getElementById('notif-center-panel')?.classList.add('open');
    document.getElementById('notif-center-overlay')?.classList.add('show');
    const dot = document.getElementById('notif-dot');
    if (dot) dot.classList.remove('show');
    _render();
  }

  function close() {
    document.getElementById('notif-center-panel')?.classList.remove('open');
    document.getElementById('notif-center-overlay')?.classList.remove('show');
  }

  function _render() {
    if (_activeTab === 'alerts')   _renderAlerts();
    if (_activeTab === 'upcoming') _renderUpcoming();
  }

  function _renderAlerts() {
    const body = document.getElementById('notif-center-body');
    if (!body) return;

    const notifs = RemindersEngine.getNotifications();
    if (notifs.length === 0) {
      body.innerHTML = `
        <div class="notif-empty">
          <div class="notif-empty-icon">🔔</div>
          <p>All clear!</p>
          <span>No pending notifications</span>
        </div>`;
      return;
    }

    body.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.type}" data-notif-id="${n.id}">
        <div class="notif-item-icon">${n.type === 'missed' ? '⚠️' : '⏰'}</div>
        <div class="notif-item-content">
          <div class="notif-item-title">${Utils.escapeHtml(Utils.truncate(n.title, 45))}</div>
          <div class="notif-item-meta">
            ${n.snoozed ? `<span class="notif-snoozed">⏳ Snoozed until ${new Date(n.snoozeUntil).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>` : ''}
            ${!n.snoozed ? new Date(n.time).toLocaleString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}
          </div>
          <div class="notif-snooze-row">
            ${RemindersEngine.SNOOZE_OPTIONS.map(m => `
              <button class="snooze-btn" data-task-id="${n.taskId}" data-notif-id="${n.id}" data-mins="${m}">+${m}m</button>
            `).join('')}
            <button class="view-task-btn" data-task-id="${n.taskId}" data-notif-id="${n.id}">View</button>
            <button class="dismiss-btn" data-notif-id="${n.id}">Dismiss</button>
          </div>
        </div>
      </div>
    `).join('');

    // Bind events
    body.querySelectorAll('.snooze-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        RemindersEngine.snoozeReminder(btn.dataset.notifId, btn.dataset.taskId, parseInt(btn.dataset.mins));
        _renderAlerts();
      });
    });
    body.querySelectorAll('.dismiss-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        RemindersEngine.dismissReminder(btn.dataset.notifId);
        _renderAlerts();
      });
    });
    body.querySelectorAll('.view-task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        close();
        ModalManager.openDetail(btn.dataset.taskId);
      });
    });
  }

  function _renderUpcoming() {
    const body = document.getElementById('notif-center-body');
    if (!body) return;

    const upcoming = RemindersEngine.getUpcomingReminders();
    const dueSoon  = AppState.getTasks()
      .filter(t => !t.completed && t.dueDate && Utils.isDueSoon(t.dueDate))
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

    let html = '';

    if (upcoming.length) {
      html += `<p class="notif-section-title">⏰ Reminders Set</p>`;
      html += upcoming.map(r => `
        <div class="notif-upcoming-item">
          <div class="notif-upcoming-dot priority-${r.priority}"></div>
          <div class="notif-upcoming-info">
            <div class="notif-upcoming-title">${Utils.escapeHtml(Utils.truncate(r.title, 40))}</div>
            <div class="notif-upcoming-time">🔔 ${new Date(r.reminderAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        </div>`).join('');
    }

    if (dueSoon.length) {
      html += `<p class="notif-section-title" style="margin-top:16px">📅 Due Soon</p>`;
      html += dueSoon.map(t => `
        <div class="notif-upcoming-item" style="cursor:pointer" onclick="ModalManager.openDetail('${t.id}')">
          <div class="notif-upcoming-dot priority-${t.priority}"></div>
          <div class="notif-upcoming-info">
            <div class="notif-upcoming-title">${Utils.escapeHtml(Utils.truncate(t.title, 40))}</div>
            <div class="notif-upcoming-time">${Utils.formatRelativeDate(t.dueDate)}</div>
          </div>
        </div>`).join('');
    }

    if (!html) {
      html = `<div class="notif-empty"><div class="notif-empty-icon">✅</div><p>Nothing coming up</p><span>No reminders or due-soon tasks</span></div>`;
    }

    body.innerHTML = html;
  }

  return { init, open, close };
})();
