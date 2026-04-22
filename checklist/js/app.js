/**
 * app.js — FlowTask Main Application
 * Bootstraps all modules, handles routing, renders views,
 * binds global events, manages settings.
 */

// ---- Motivational Quotes ----
const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
  { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
  { text: 'The key is not to prioritize what\'s on your schedule, but to schedule your priorities.', author: 'Stephen Covey' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { text: 'Small progress is still progress.', author: 'Unknown' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'Either you run the day or the day runs you.', author: 'Jim Rohn' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'The difference between ordinary and extraordinary is that little extra.', author: 'Jimmy Johnson' },
];

// ---- App Entry Point ----
document.addEventListener('DOMContentLoaded', () => {
  _bootstrap();
});

async function _bootstrap() {
  // 1. Hydrate state from storage
  AppState.hydrate();

  // 2. Apply settings (theme, accent, etc.)
  _applySettings();

  // 3. Initialize all modules
  Confetti.init();
  ChartTheme.init();
  ModalManager.init();
  PomodoroTimer.init();
  Wellness.init();
  Search.init();
  NotifCenter.init();
  RemindersEngine.init();
  AIAssistant.initVoice();
  await Notifications.init();

  // Phase 3: Google Calendar
  const savedClientId = AppState.getSettings().googleClientId;
  if (savedClientId) CalendarSync.loadGoogleAPIs(savedClientId);

  // Phase 2 modules
  RemindersEngine.init();
  NotifCenter.init();

  // 4. Perform daily reset check
  TaskManager.performDailyReset();

  // 5. Bind all global UI events
  _bindNavigation();
  _bindGlobalButtons();
  _bindSettingsPanel();
  _bindSidebarToggle();
  _bindFilterEvents();
  _bindPeriodSelector();

  // 6. Subscribe to state changes
  AppState.on('tasks:changed', _onTasksChanged);
  AppState.on('gamification:changed', _onGamificationChanged);
  AppState.on('settings:changed', _applySettings);
  AppState.on('view:changed', _renderCurrentView);

  // 7. Initialize drag-and-drop
  _initDragAndDrop();

  // Phase 2: Load custom categories into select dropdowns
  _loadCustomCategoriesIntoSelects();

  // 8. Render initial view
  _navigateTo('dashboard');

  // 9. Update dashboard header
  _updateDashboardHeader();

  // 10. Start interval for real-time updates
  setInterval(_updateDashboardHeader, 60000); // Every minute

  console.log('[FlowTask] App initialized ✅');
}

// ============================================
// NAVIGATION
// ============================================
function _bindNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const view = link.dataset.view;
      _navigateTo(view);

      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        _closeSidebar();
      }
    });
  });
}

function _navigateTo(view) {
  // Update state
  AppState.setView(view);

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });

  // Show/hide views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${view}`);
  });

  // Update page title
  const titles = {
    dashboard:    'Dashboard',
    today:        'Today',
    upcoming:     'Upcoming',
    'all-tasks':  'All Tasks',
    focus:        'Focus Mode',
    analytics:    'Analytics',
    achievements: 'Achievements',
    wellness:     'Wellness',
    settings:     'Settings',
  };
  const title = titles[view] || view;
  document.getElementById('current-page-title').textContent = title;
  document.title = `${title} — FlowTask`;

  // Render view-specific content
  _renderCurrentView({ view });
}

function _renderCurrentView({ view }) {
  const v = view || AppState.getCurrentView();
  switch (v) {
    case 'dashboard':    _renderDashboard();    break;
    case 'today':        _renderToday();        break;
    case 'upcoming':     _renderUpcoming();     break;
    case 'all-tasks':    _renderAllTasks();     break;
    case 'focus':        _renderFocus();        break;
    case 'analytics':    _renderAnalyticsView(); break;
    case 'achievements': _renderAchievements(); break;
    case 'wellness':     _renderWellness();     break;
    case 'settings':     _renderSettings();     break;
  }
}

// ============================================
// DASHBOARD
// ============================================
function _renderDashboard() {
  _updateDashboardHeader();
  _renderDashboardStats();
  _renderDashboardTaskList();
  Analytics.renderDashboardCategoryChart();
  HeatmapUI.renderMini();
  _renderQuote();
  _renderDailyChallenge();
  AIAssistant.renderSuggestionsPanel();
}

function _updateDashboardHeader() {
  const greetingEl = document.getElementById('dashboard-greeting');
  const dateEl     = document.getElementById('dashboard-date');
  const settings   = AppState.getSettings();

  if (greetingEl) {
    const name = settings.username || 'User';
    const emojis = { morning: '☀️', afternoon: '🌤', evening: '🌙', night: '🌙' };
    const hour = new Date().getHours();
    const timeKey = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    greetingEl.textContent = `${Utils.getGreeting()}, ${name}! ${emojis[timeKey]}`;
  }

  if (dateEl) dateEl.textContent = Utils.getFullDateLabel();
}

function _renderDashboardStats() {
  const stats = TaskManager.getStats();
  const g     = AppState.getGamification();
  const today = Utils.today();

  // Stat values
  _setEl('stat-total',     stats.total);
  _setEl('stat-completed', stats.completed);
  _setEl('stat-pending',   stats.pending);
  _setEl('stat-streak',    g.streak);
  _setEl('stat-xp',        g.xp);

  // Trends
  const todayAdded = AppState.getTasks().filter(t => t.createdAt?.startsWith(today)).length;
  _setEl('stat-trend-total',     `+${todayAdded} today`);
  _setEl('stat-trend-completed', `${stats.completionRate}% rate`);
  _setEl('stat-overdue-count',   `${stats.overdue} overdue`);
  _setEl('stat-streak-best',     `Best: ${g.bestStreak}`);
  const lvlInfo = Gamification.getLevelInfo(g.xp);
  _setEl('stat-level-label', `Level ${lvlInfo.current.level}`);

  // Progress bar
  const pct = stats.todayTotal > 0
    ? Math.round((stats.todayCompleted / stats.todayTotal) * 100)
    : 0;

  const bar     = document.getElementById('main-progress-bar');
  const pctEl   = document.getElementById('progress-percent');
  const subLabel = document.getElementById('progress-sublabel');

  if (bar) bar.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (subLabel) {
    subLabel.textContent = pct === 100
      ? '🎉 All done! Amazing work today!'
      : pct > 50
      ? `${stats.todayCompleted}/${stats.todayTotal} tasks done — keep going!`
      : `${stats.todayCompleted}/${stats.todayTotal} tasks completed today`;
  }

  // Nav badges
  _setEl('badge-today',    stats.todayTotal - stats.todayCompleted || '');
  _setEl('badge-upcoming', TaskManager.getUpcomingTasks().length || '');

  // Update sidebar XP
  const navXP  = document.getElementById('nav-xp');
  const navLvl = document.getElementById('nav-level');
  if (navXP)  navXP.textContent  = `${g.xp} XP`;
  if (navLvl) navLvl.textContent = `Level ${lvlInfo.current.level} · ${lvlInfo.current.title}`;
}

function _renderDashboardTaskList() {
  const container = document.getElementById('dashboard-task-list');
  const emptyEl   = document.getElementById('dashboard-empty');
  if (!container) return;

  const priorityFilter = document.getElementById('dashboard-filter-priority')?.value || 'all';
  const today = Utils.today();
  let tasks = AppState.getTasks().filter(t => !t.dueDate || t.dueDate === today);

  if (priorityFilter !== 'all') {
    tasks = tasks.filter(t => t.priority === priorityFilter);
  }

  // Sort: incomplete first, then by priority
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return Utils.priorityWeight(b.priority) - Utils.priorityWeight(a.priority);
  });

  // Clear previous (except empty state)
  Array.from(container.children).forEach(child => {
    if (child.id !== 'dashboard-empty') container.removeChild(child);
  });

  if (tasks.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  const shown = tasks.slice(0, 8);
  shown.forEach(task => {
    container.appendChild(TaskCard.create(task));
  });

  if (tasks.length > 8) {
    const moreBtn = document.createElement('button');
    moreBtn.className = 'btn btn-outline btn-sm';
    moreBtn.style.cssText = 'width:100%;margin-top:8px';
    moreBtn.textContent = `View ${tasks.length - 8} more tasks →`;
    moreBtn.addEventListener('click', () => _navigateTo('today'));
    container.appendChild(moreBtn);
  }
}

function _renderQuote() {
  const dayIdx = Math.floor(Date.now() / 86400000) % QUOTES.length;
  const quote    = QUOTES[dayIdx];
  const textEl   = document.getElementById('quote-text');
  const authorEl = document.getElementById('quote-author');
  const sideEl   = document.getElementById('daily-quote');

  if (textEl)     textEl.textContent   = `"${quote.text}"`;
  if (authorEl)  authorEl.textContent  = `— ${quote.author}`;
  if (sideEl) {
    sideEl.querySelector('.quote-text').textContent = `"${Utils.truncate(quote.text, 60)}"`;
  }
}

function _renderDailyChallenge() {
  const challenge = Gamification.getDailyChallenge();
  const progress  = Gamification.getDailyChallengeProgress();

  const textEl = document.getElementById('daily-challenge-text');
  const barEl  = document.getElementById('challenge-bar');

  if (textEl) textEl.textContent = challenge.text;
  if (barEl)  barEl.style.width  = `${progress.percent}%`;
}

// ============================================
// TODAY VIEW
// ============================================
function _renderToday() {
  const today = Utils.today();
  document.getElementById('today-date-label').textContent = Utils.getFullDateLabel();

  const tasks = AppState.getTasks().filter(t => !t.dueDate || t.dueDate === today);

  const byPriority = {
    high:   tasks.filter(t => t.priority === 'high'   && !t.completed),
    medium: tasks.filter(t => t.priority === 'medium' && !t.completed),
    low:    tasks.filter(t => t.priority === 'low'    && !t.completed),
    done:   tasks.filter(t => t.completed),
  };

  Object.entries(byPriority).forEach(([key, list]) => {
    const container = document.getElementById(`today-${key}-list`);
    const countEl   = document.getElementById(`count-${key}`);
    if (!container) return;

    if (countEl) countEl.textContent = list.length;
    container.innerHTML = '';

    if (list.length === 0) {
      container.innerHTML = `<p class="text-muted" style="text-align:center;padding:16px;font-size:13px">
        ${key === 'done' ? 'Nothing completed yet' : 'No tasks'}
      </p>`;
      return;
    }

    list.forEach(task => container.appendChild(TaskCard.create(task)));
  });

  // Re-init drag-and-drop for today lists
  _initDragAndDrop();

  // Collapse completed if empty
  const completedSection = document.querySelector('.completed-section');
  if (completedSection && byPriority.done.length === 0) {
    completedSection.classList.add('collapsed');
  }
}

// ============================================
// UPCOMING VIEW
// ============================================
function _renderUpcoming() {
  const container = document.getElementById('upcoming-content');
  if (!container) return;

  const tasks = TaskManager.getUpcomingTasks().filter(t => !t.completed);
  const nextDays = Utils.getNextNDays(7);

  if (tasks.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🗓️</div>
      <h3>No upcoming tasks</h3>
      <p>All clear ahead! Add tasks with due dates to see them here.</p>
      <button class="btn btn-primary" onclick="ModalManager.openAdd()">+ Add Task</button>
    </div>`;
    return;
  }

  // Group by day
  const grouped = {};
  tasks.forEach(t => {
    const d = t.dueDate;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(t);
  });

  container.innerHTML = '';

  Object.entries(grouped).forEach(([date, dayTasks]) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'upcoming-day-group';

    const today      = Utils.today();
    const isToday    = date === today;
    const isTomorrow = date === nextDays[0];
    const isFuture   = date > today;

    // Day label
    let dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : Utils.getDayLabel(date);

    groupEl.innerHTML = `
      <div class="upcoming-day-header ${isFuture ? 'future-locked' : ''}">
        <span class="upcoming-day-label">
          ${isFuture ? '🔒 ' : ''}${dayLabel}
        </span>
        <span class="upcoming-day-date">${Utils.formatDate(date)}</span>
        <div class="upcoming-day-line"></div>
        <span class="section-count">${dayTasks.length}</span>
        ${isFuture ? `<span style="font-size:10px;color:var(--warning);font-weight:700;margin-left:4px;">LOCKED</span>` : ''}
      </div>
    `;

    const listEl = document.createElement('div');
    listEl.style.display = 'flex';
    listEl.style.flexDirection = 'column';
    listEl.style.gap = '8px';
    dayTasks.forEach(t => listEl.appendChild(TaskCard.create(t)));

    groupEl.appendChild(listEl);
    container.appendChild(groupEl);
  });
}

// ============================================
// ALL TASKS VIEW
// ============================================
function _renderAllTasks() {
  const container = document.getElementById('all-tasks-list');
  const countEl   = document.getElementById('all-tasks-count');
  if (!container) return;

  const tasks = TaskManager.getFilteredTasks();
  if (countEl) countEl.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;

  container.innerHTML = '';

  if (tasks.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <h3>No tasks found</h3>
      <p>Try adjusting your filters or add a new task.</p>
    </div>`;
    return;
  }

  tasks.forEach(task => container.appendChild(TaskCard.createCompact(task)));
}

// ============================================
// FOCUS MODE VIEW
// ============================================
function _renderFocus() {
  const tasks = AppState.getTasks().filter(t => !t.completed)
    .sort((a, b) => Utils.priorityWeight(b.priority) - Utils.priorityWeight(a.priority));

  const focus      = AppState.get('focus');
  const cardEl     = document.getElementById('focus-task-card');
  const emptyEl    = document.getElementById('focus-empty');
  const controlsEl = document.getElementById('focus-controls');
  const counterEl  = document.getElementById('focus-task-counter');

  AppState.setFocus({ activeTasks: tasks });

  if (tasks.length === 0) {
    if (emptyEl)    emptyEl.style.display = 'flex';
    if (controlsEl) controlsEl.style.display = 'none';
    return;
  }

  if (emptyEl)    emptyEl.style.display = 'none';
  if (controlsEl) controlsEl.style.display = 'flex';

  const idx  = Math.min(focus.currentIndex, tasks.length - 1);
  const task = tasks[idx];

  if (counterEl) counterEl.textContent = `Task ${idx + 1} of ${tasks.length}`;

  // Render task card in focus area
  if (cardEl) {
    cardEl.innerHTML = '';
    const inner = document.createElement('div');
    inner.innerHTML = `
      <div class="focus-task-meta">
        <span class="task-category cat-${task.category}">${Utils.getCategoryEmoji(task.category)} ${Utils.capitalize(task.category)}</span>
        <span class="priority-badge prio-${task.priority}">${task.priority.toUpperCase()}</span>
        ${task.dueDate ? `<span class="task-due">📅 ${Utils.formatRelativeDate(task.dueDate)}</span>` : ''}
      </div>
      <div class="focus-task-title">${Utils.escapeHtml(task.title)}</div>
      ${task.description ? `<div class="focus-task-desc">${Utils.escapeHtml(task.description)}</div>` : ''}
      ${(task.subtasks || []).length > 0 ? `
        <div style="margin-top:16px;text-align:left;width:100%;max-width:400px">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">SUBTASKS</p>
          ${task.subtasks.map(st => `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
              <span style="color:${st.done ? 'var(--success)' : 'var(--border-hover)'}">${st.done ? '✓' : '○'}</span>
              <span style="font-size:14px;${st.done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${Utils.escapeHtml(st.title)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
    cardEl.appendChild(inner);
  }

  // Bind controls
  const prevBtn     = document.getElementById('focus-prev');
  const nextBtn     = document.getElementById('focus-next');
  const completeBtn = document.getElementById('focus-complete');

  if (prevBtn) {
    prevBtn.disabled = idx === 0;
    prevBtn.onclick = () => {
      AppState.setFocus({ currentIndex: Math.max(0, idx - 1) });
      _renderFocus();
    };
  }

  if (nextBtn) {
    nextBtn.disabled = idx === tasks.length - 1;
    nextBtn.onclick = () => {
      AppState.setFocus({ currentIndex: Math.min(tasks.length - 1, idx + 1) });
      _renderFocus();
    };
  }

  if (completeBtn) {
    completeBtn.onclick = () => {
      const t = tasks[idx];
      TaskManager.toggleComplete(t.id);
      CalendarSync.onTaskChange(t);
      // Move to next task
      const newTasks = AppState.getTasks().filter(t => !t.completed);
      if (newTasks.length > 0) {
        AppState.setFocus({ currentIndex: Math.min(idx, newTasks.length - 1) });
      }
      _renderFocus();
    };
  }
}

// ============================================
// ANALYTICS VIEW
// ============================================
function _renderAnalyticsView() {
  const period = document.querySelector('.period-btn.active')?.dataset.period || 'week';
  Analytics.renderAnalytics(period);
}

// ============================================
// ACHIEVEMENTS VIEW
// ============================================
function _renderAchievements() {
  const g     = AppState.getGamification();
  const level = Gamification.getLevelInfo(g.xp);

  const levelEl = document.getElementById('level-display');
  const xpEl    = document.getElementById('xp-display');
  const barEl   = document.getElementById('xp-bar-fill');
  const subEl   = document.getElementById('achievements-subtitle');

  if (levelEl) levelEl.textContent = `Level ${level.current.level} — ${level.current.title}`;
  if (xpEl) {
    const next = level.next;
    xpEl.textContent = next
      ? `${g.xp} / ${next.xp} XP`
      : `${g.xp} XP (Max Level!)`;
  }
  if (barEl) barEl.style.width = `${level.progress}%`;

  const achievements = Gamification.getAllAchievements();
  const unlocked = achievements.filter(a => a.unlocked).length;
  if (subEl) subEl.textContent = `${unlocked} / ${achievements.length} achievements unlocked`;

  const grid = document.getElementById('achievements-grid');
  if (!grid) return;

  grid.innerHTML = achievements.map(ach => `
    <div class="achievement-badge ${ach.unlocked ? 'unlocked' : 'locked'} fade-in" title="${ach.desc}">
      <span class="badge-icon">${ach.icon}</span>
      <div class="badge-name">${ach.name}</div>
      <div class="badge-desc">${ach.desc}</div>
      ${ach.unlocked ? `<div style="margin-top:8px;font-size:10px;color:var(--accent)">✓ Unlocked</div>` : ''}
    </div>
  `).join('');
}

// ============================================
// WELLNESS VIEW
// ============================================
function _renderWellness() {
  Analytics.renderWellnessCharts();
  Wellness.renderWellnessTips();
}

// ============================================
// SETTINGS VIEW
// ============================================
function _renderSettings() {
  const settings = AppState.getSettings();

  const usernameEl = document.getElementById('setting-username');
  const avatarEl   = document.getElementById('setting-avatar');
  if (usernameEl) usernameEl.value = settings.username || '';
  if (avatarEl)   avatarEl.value   = settings.avatarInitial || 'U';

  // Mark active theme
  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === settings.theme);
  });

  // Mark active accent
  document.querySelectorAll('.accent-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === settings.accentColor);
  });

  // Pomodoro
  const pomo = AppState.getPomodoro();
  _setInput('pomo-work-duration', pomo.workDuration);
  _setInput('pomo-short-break',   pomo.shortBreak);
  _setInput('pomo-long-break',    pomo.longBreak);

  // Notification toggles
  const notifs = settings.notifications || {};
  _setChecked('notif-due-toggle',    notifs.dueReminders !== false);
  _setChecked('notif-daily-toggle',  notifs.dailySummary !== false);
  _setChecked('notif-streak-toggle', notifs.streakAlerts !== false);
  _setInput('reminder-time', notifs.reminderTime || '09:00');

  // Auto-reset / carry-forward
  _setChecked('auto-reset-toggle',    settings.autoReset !== false);
  _setChecked('carry-forward-toggle', settings.carryForward !== false);

  // Defaults
  _setSelect('default-category', settings.defaultCategory || 'personal');
  _setSelect('default-priority',  settings.defaultPriority  || 'medium');

  // Phase 3: Google Calendar panel
  CalendarSync.renderSettingsPanel();
}

// ============================================
// SETTINGS BINDING
// ============================================
function _bindSettingsPanel() {
  // Save profile
  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    const username = document.getElementById('setting-username')?.value?.trim() || 'User';
    const avatar   = document.getElementById('setting-avatar')?.value?.trim()?.charAt(0)?.toUpperCase() || 'U';

    AppState.setSettings({ username, avatarInitial: avatar });

    // Update sidebar
    const navName   = document.getElementById('nav-username');
    const navAvatar = document.getElementById('nav-avatar');
    if (navName)   navName.textContent   = username;
    if (navAvatar) navAvatar.textContent = avatar;

    Toast.show('Profile saved!', '', 'success');
  });

  // Theme selection (8 themes)
  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.documentElement.dataset.theme = theme;
      AppState.setSettings({ theme });
      document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b === btn));
      const lightThemes = ['light', 'arctic'];
      _updateThemeIcons(!lightThemes.includes(theme));
      // Re-render charts with new theme
      setTimeout(() => {
        ChartTheme.updateChartDefaults();
        if (AppState.getCurrentView() === 'analytics') _renderAnalyticsView();
        if (AppState.getCurrentView() === 'wellness') _renderWellness();
      }, 100);
      Toast.show(`Theme: ${Utils.capitalize(theme)} ✨`, '', 'success');
    });
  });

  // Accent color
  document.querySelectorAll('.accent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      document.documentElement.style.setProperty('--accent', color);
      const lightColor = color + '26';
      document.documentElement.style.setProperty('--accent-light', lightColor);
      AppState.setSettings({ accentColor: color });
      document.querySelectorAll('.accent-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Theme toggle button in topbar
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const lightThemes = ['light', 'arctic'];
    const next = lightThemes.includes(current) ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    AppState.setSettings({ theme: next });
    _updateThemeIcons(!lightThemes.includes(next));
  });

  // Pomodoro settings
  document.getElementById('save-pomo-btn')?.addEventListener('click', () => {
    const work  = parseInt(document.getElementById('pomo-work-duration')?.value) || 25;
    const short = parseInt(document.getElementById('pomo-short-break')?.value)   || 5;
    const long  = parseInt(document.getElementById('pomo-long-break')?.value)    || 15;
    PomodoroTimer.updateSettings(work, short, long);
    Toast.show('Pomodoro settings saved!', '', 'success');
  });

  // Default category / priority
  document.getElementById('default-category')?.addEventListener('change', e => {
    AppState.setSettings({ defaultCategory: e.target.value });
  });

  document.getElementById('default-priority')?.addEventListener('change', e => {
    AppState.setSettings({ defaultPriority: e.target.value });
  });

  // Toggles
  document.getElementById('auto-reset-toggle')?.addEventListener('change', e => {
    AppState.setSettings({ autoReset: e.target.checked });
  });

  document.getElementById('carry-forward-toggle')?.addEventListener('change', e => {
    AppState.setSettings({ carryForward: e.target.checked });
  });

  document.getElementById('notif-due-toggle')?.addEventListener('change', e => {
    const n = { ...AppState.getSettings().notifications, dueReminders: e.target.checked };
    AppState.setSettings({ notifications: n });
  });

  document.getElementById('notif-daily-toggle')?.addEventListener('change', e => {
    const n = { ...AppState.getSettings().notifications, dailySummary: e.target.checked };
    AppState.setSettings({ notifications: n });
  });

  document.getElementById('notif-streak-toggle')?.addEventListener('change', e => {
    const n = { ...AppState.getSettings().notifications, streakAlerts: e.target.checked };
    AppState.setSettings({ notifications: n });
  });

  document.getElementById('reminder-time')?.addEventListener('change', e => {
    const n = { ...AppState.getSettings().notifications, reminderTime: e.target.value };
    AppState.setSettings({ notifications: n });
  });

  // Data backup
  document.getElementById('backup-btn')?.addEventListener('click', () => {
    const data = Storage.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href    = url;
    a.download = `flowtask_backup_${Utils.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Backup created!', 'Data saved to downloads.', 'success');
  });

  // Restore
  document.getElementById('restore-file')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const success = Storage.importAll(evt.target.result);
      if (success) {
        AppState.hydrate();
        _renderCurrentView({ view: AppState.getCurrentView() });
        Toast.show('Data restored!', 'Your backup has been loaded.', 'success');
      } else {
        Toast.show('Restore failed', 'Invalid backup file.', 'error');
      }
    };
    reader.readAsText(file);
  });

  // Clear data
  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
      Storage.clearAll();
      AppState.hydrate();
      Toast.show('All data cleared', '', 'info');
      _navigateTo('dashboard');
    }
  });

  // Export CSV
  document.getElementById('export-btn')?.addEventListener('click', () => {
    TaskManager.exportCSV();
    Toast.show('Exported!', 'CSV file saved to downloads.', 'success');
  });

  // Phase 2: Recurring select triggers extra options
  document.getElementById('task-recurring')?.addEventListener('change', e => {
    if (typeof ModalManager._renderRecurringOptions === 'function') {
      ModalManager._renderRecurringOptions(e.target.value);
    }
  });

  // Phase 2: Custom Categories
  _bindCustomCategories();
}

// ============================================
// GLOBAL BUTTONS
// ============================================
function _bindGlobalButtons() {
  // Add task buttons
  const addBtns = [
    'global-add-task-btn',
    'dash-add-task-btn',
    'today-add-btn',
    'upcoming-add-btn',
    'all-tasks-add-btn',
    'empty-add-btn',
  ];
  addBtns.forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => ModalManager.openAdd());
  });

  // Voice input
  document.getElementById('voice-input-btn')?.addEventListener('click', () => AIAssistant.toggleVoice());

  // AI Panel buttons
  document.getElementById('ai-auto-schedule-btn')?.addEventListener('click', () => AIAssistant.autoSchedule());
  document.getElementById('ai-reschedule-btn')?.addEventListener('click', () => AIAssistant.rescheduleOverdue());
  document.getElementById('ai-refresh-btn')?.addEventListener('click', () => AIAssistant.renderSuggestionsPanel());

  // Daily reset button
  document.getElementById('daily-reset-btn')?.addEventListener('click', () => {
    TaskManager.performDailyReset();
    _renderDashboard();
    Toast.show('Daily reset!', 'Incomplete tasks have been carried forward.', 'info');
  });

  // New quote button
  document.getElementById('new-quote-btn')?.addEventListener('click', () => {
    const quote  = Utils.randomPick(QUOTES);
    const textEl = document.getElementById('quote-text');
    const authEl = document.getElementById('quote-author');
    if (textEl) { textEl.style.opacity = '0'; setTimeout(() => { textEl.textContent = `"${quote.text}"`; textEl.style.opacity = '1'; }, 200); }
    if (authEl) { authEl.style.opacity = '0'; setTimeout(() => { authEl.textContent = `— ${quote.author}`; authEl.style.opacity = '1'; }, 200); }
  });

  // Dashboard filter
  document.getElementById('dashboard-filter-priority')?.addEventListener('change', _renderDashboardTaskList);

  // Collapse completed section
  document.getElementById('collapse-completed')?.addEventListener('click', () => {
    document.querySelector('.completed-section')?.classList.toggle('collapsed');
  });

  // Notifications panel — Phase 2: open NotifCenter
  document.getElementById('notifications-btn')?.addEventListener('click', () => {
    NotifCenter.toggle();
  });

  // View toggle (list/board)
  document.getElementById('list-view-btn')?.addEventListener('click', () => {
    document.getElementById('list-view-btn')?.classList.add('active');
    document.getElementById('board-view-btn')?.classList.remove('active');
  });

  document.getElementById('board-view-btn')?.addEventListener('click', () => {
    document.getElementById('board-view-btn')?.classList.add('active');
    document.getElementById('list-view-btn')?.classList.remove('active');
    // Could switch to board layout — currently shows same view
  });
}

// ============================================
// FILTER EVENTS
// ============================================
function _bindFilterEvents() {
  ['filter-category', 'filter-priority', 'filter-status', 'sort-tasks'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', e => {
      const key = id === 'sort-tasks' ? 'sort' : id.replace('filter-', '');
      AppState.setFilter(key, e.target.value);
      if (AppState.getCurrentView() === 'all-tasks') _renderAllTasks();
    });
  });

  document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
    ['category', 'priority', 'status'].forEach(k => AppState.setFilter(k, 'all'));
    AppState.setFilter('sort', 'created');
    ['filter-category', 'filter-priority', 'filter-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });
    const sortEl = document.getElementById('sort-tasks');
    if (sortEl) sortEl.value = 'created';
    _renderAllTasks();
  });

  // Search
  AppState.on('search:execute', () => {
    if (AppState.getCurrentView() === 'all-tasks') _renderAllTasks();
    else _renderDashboardTaskList();
  });
}

// ============================================
// PERIOD SELECTOR (Analytics)
// ============================================
function _bindPeriodSelector() {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (AppState.getCurrentView() === 'analytics') {
        Analytics.renderAnalytics(btn.dataset.period);
      }
    });
  });
}

// ============================================
// SIDEBAR TOGGLE (mobile)
// ============================================
function _bindSidebarToggle() {
  document.getElementById('mobile-menu-btn')?.addEventListener('click', _openSidebar);
  document.getElementById('sidebar-toggle')?.addEventListener('click', _closeSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', _closeSidebar);
}

function _openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('show');
}

function _closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

// ============================================
// DRAG AND DROP
// ============================================
function _initDragAndDrop() {
  if (typeof Sortable === 'undefined') return;

  const zones = document.querySelectorAll('.task-drop-zone');
  zones.forEach(zone => {
    if (zone._sortable) zone._sortable.destroy();

    zone._sortable = Sortable.create(zone, {
      group:     'tasks',
      animation: 180,
      handle:    '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onEnd: (evt) => {
        const taskId = evt.item?.dataset?.taskId;
        if (!taskId) return;

        const newPriority = evt.to?.dataset?.priority;
        if (newPriority) {
          AppState.updateTask(taskId, { priority: newPriority });
        }

        // Reorder within same list
        const tasks = AppState.getTasks();
        const order = Array.from(evt.to.querySelectorAll('.task-item')).map(el => el.dataset.taskId);
        const reordered = [...tasks].sort((a, b) => {
          const ai = order.indexOf(a.id);
          const bi = order.indexOf(b.id);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        AppState.setTasks(reordered);
      },
    });
  });
}

// ============================================
// STATE CHANGE HANDLERS
// ============================================
function _onTasksChanged(tasks) {
  const view = AppState.getCurrentView();
  switch (view) {
    case 'dashboard':    _renderDashboardStats(); _renderDashboardTaskList(); _renderDailyChallenge(); break;
    case 'today':        _renderToday();        break;
    case 'upcoming':     _renderUpcoming();     break;
    case 'all-tasks':    _renderAllTasks();     break;
    case 'focus':        _renderFocus();        break;
    case 'analytics':    Analytics.renderSummaryStats(); break;
    case 'achievements': _renderAchievements(); break;
  }

  // Always update stats in nav badges
  _renderDashboardStats();
}

function _onGamificationChanged(g) {
  _renderDashboardStats();
  const lvl = Gamification.getLevelInfo(g.xp);
  const navLvl = document.getElementById('nav-level');
  if (navLvl) navLvl.textContent = `Level ${lvl.current.level} · ${lvl.current.title}`;
}

// ============================================
// SETTINGS APPLICATION
// ============================================
function _applySettings(settings) {
  const s = settings || AppState.getSettings();

  // Theme
  if (s.theme) {
    document.documentElement.dataset.theme = s.theme;
    _updateThemeIcons(s.theme);
  }

  // Accent color
  if (s.accentColor) {
    document.documentElement.style.setProperty('--accent', s.accentColor);
    document.documentElement.style.setProperty('--accent-light', s.accentColor + '26');
  }

  // Username / avatar in sidebar
  const name   = s.username || 'User';
  const avatar = s.avatarInitial || name.charAt(0).toUpperCase();
  const navName   = document.getElementById('nav-username');
  const navAvatar = document.getElementById('nav-avatar');
  if (navName)   navName.textContent   = name;
  if (navAvatar) navAvatar.textContent = avatar;
}

function _updateThemeIcons(theme) {
  const dark  = document.getElementById('theme-icon-dark');
  const light = document.getElementById('theme-icon-light');
  if (!dark || !light) return;
  if (theme === 'dark' || theme === 'ocean' || theme === 'forest') {
    dark.style.display  = 'block';
    light.style.display = 'none';
  } else {
    dark.style.display  = 'none';
    light.style.display = 'block';
  }
}

// ============================================
// DOM HELPERS
// ============================================
function _setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _setInput(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function _setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = val;
}

function _setSelect(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// ============================================
// PHASE 2: CUSTOM CATEGORIES
// ============================================
function _bindCustomCategories() {
  document.getElementById('add-category-btn')?.addEventListener('click', () => {
    const nameEl  = document.getElementById('new-category-name');
    const colorEl = document.getElementById('new-category-color');
    const name    = nameEl?.value?.trim();
    const color   = colorEl?.value || '#6c63ff';

    if (!name) { Toast.show('Enter a category name', '', 'warning'); return; }

    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!id) { Toast.show('Invalid category name', '', 'error'); return; }

    const settings = AppState.getSettings();
    const existing = settings.customCategories || [];

    if (existing.find(c => c.id === id) || ['work','personal','fitness','study'].includes(id)) {
      Toast.show('Category already exists', '', 'warning'); return;
    }

    const updatedCats = [...existing, { id, name, color }];
    AppState.setSettings({ customCategories: updatedCats });
    _addCategoryToSelects({ id, name, color });
    Toast.show(`Category "${name}" added!`, '', 'success');
    if (nameEl) nameEl.value = '';
    _renderCustomCategories();
  });

  _renderCustomCategories();
}

function _renderCustomCategories() {
  const container = document.getElementById('custom-categories-list');
  if (!container) return;

  const settings = AppState.getSettings();
  const cats = settings.customCategories || [];

  if (cats.length === 0) {
    container.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">No custom categories yet.</p>';
    return;
  }

  container.innerHTML = cats.map(cat => `
    <div class="custom-cat-item">
      <span class="custom-cat-dot" style="background:${cat.color}"></span>
      <span class="custom-cat-name">${Utils.escapeHtml(cat.name)}</span>
      <button class="icon-btn delete-cat-btn" data-cat-id="${cat.id}" style="margin-left:auto;color:var(--danger)">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = AppState.getSettings();
      AppState.setSettings({ customCategories: (s.customCategories || []).filter(c => c.id !== btn.dataset.catId) });
      _removeCategoryFromSelects(btn.dataset.catId);
      Toast.show('Category removed', '', 'info');
      _renderCustomCategories();
    });
  });
}

function _addCategoryToSelects(cat) {
  ['task-category', 'filter-category', 'default-category'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel && !sel.querySelector(`option[value="${cat.id}"]`)) {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      sel.appendChild(opt);
    }
  });
}

function _removeCategoryFromSelects(catId) {
  ['task-category', 'filter-category', 'default-category'].forEach(id => {
    const opt = document.getElementById(id)?.querySelector(`option[value="${catId}"]`);
    if (opt) opt.remove();
  });
}

function _loadCustomCategoriesIntoSelects() {
  const settings = AppState.getSettings();
  (settings.customCategories || []).forEach(cat => _addCategoryToSelects(cat));
}
