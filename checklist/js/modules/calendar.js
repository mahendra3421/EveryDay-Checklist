/**
 * calendar.js — Google Calendar Two-Way Sync (Phase 3)
 * Uses Google Identity Services (GIS) + Calendar REST API v3
 * No backend required — pure client-side OAuth2
 */

const CalendarSync = (() => {

  // ---- Config (user sets their Client ID in Settings) ----
  const SCOPES     = 'https://www.googleapis.com/auth/calendar';
  const DISCOVERY  = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  const CAL_ID     = 'primary';
  const FLOWTASK_TAG = '[FlowTask]'; // Tag added to synced events so we can identify them

  let _gapiLoaded  = false;
  let _gisLoaded   = false;
  let _tokenClient = null;
  let _accessToken = null;
  let _syncing     = false;
  let _lastSyncAt  = null;

  // ---- Load Google APIs ----
  function loadGoogleAPIs(clientId) {
    if (!clientId) { Toast.show('Setup required', 'Enter your Google Client ID in Settings → Google Calendar', 'warning'); return; }

    // Load GAPI
    if (!document.getElementById('gapi-script')) {
      const s = document.createElement('script');
      s.id  = 'gapi-script';
      s.src = 'https://apis.google.com/js/api.js';
      s.onload = () => {
        window.gapi.load('client', async () => {
          await window.gapi.client.init({ discoveryDocs: [DISCOVERY] });
          _gapiLoaded = true;
          _tryConnect(clientId);
        });
      };
      document.head.appendChild(s);
    }

    // Load GIS
    if (!document.getElementById('gis-script')) {
      const s = document.createElement('script');
      s.id  = 'gis-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = () => {
        _gisLoaded = true;
        _tryConnect(clientId);
      };
      document.head.appendChild(s);
    }
  }

  function _tryConnect(clientId) {
    if (!_gapiLoaded || !_gisLoaded) return; // Wait for both

    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:     SCOPES,
      callback:  _onTokenResponse,
    });

    Toast.show('Google APIs loaded ✅', 'Click "Connect" to authorize', 'success');
    _updateCalendarUI('ready');
  }

  // ---- Authorize (OAuth2 popup) ----
  function authorize() {
    const clientId = AppState.getSettings().googleClientId;
    if (!clientId) {
      Toast.show('Client ID missing', 'Paste your Google OAuth Client ID first', 'warning');
      return;
    }
    if (!_tokenClient) {
      loadGoogleAPIs(clientId);
      setTimeout(() => {
        if (_tokenClient) _tokenClient.requestAccessToken();
      }, 2000);
      return;
    }
    _tokenClient.requestAccessToken();
  }

  function _onTokenResponse(resp) {
    if (resp.error) {
      Toast.show('Auth failed', resp.error, 'error');
      _updateCalendarUI('error');
      return;
    }
    _accessToken = resp.access_token;
    window.gapi.client.setToken({ access_token: _accessToken });
    _updateCalendarUI('connected');
    Toast.show('Connected! 🎉', 'Google Calendar linked. Starting initial sync…', 'success');
    syncAll();
  }

  // ---- Revoke ----
  function disconnect() {
    if (_accessToken) {
      window.google.accounts.oauth2.revoke(_accessToken, () => {});
      _accessToken = null;
    }
    _updateCalendarUI('disconnected');
    Toast.show('Disconnected', 'Google Calendar unlinked', 'info');
  }

  function isConnected() { return !!_accessToken; }

  // ================================================================
  // SYNC: FlowTask Tasks → Google Calendar
  // ================================================================
  async function syncTasksToCalendar() {
    if (!isConnected()) { Toast.show('Not connected', 'Connect Google Calendar first', 'warning'); return; }
    const tasks = AppState.getTasks().filter(t => !t.completed && t.dueDate);
    let created = 0, updated = 0;

    for (const task of tasks) {
      const eventId = task.gcalEventId;
      const event   = _taskToEvent(task);

      try {
        if (eventId) {
          // Update existing event
          await window.gapi.client.calendar.events.patch({
            calendarId: CAL_ID,
            eventId:    eventId,
            resource:   event,
          });
          updated++;
        } else {
          // Create new event
          const resp = await window.gapi.client.calendar.events.insert({
            calendarId: CAL_ID,
            resource:   event,
          });
          AppState.updateTask(task.id, { gcalEventId: resp.result.id });
          created++;
        }
      } catch (err) {
        console.warn('[GCal] Error syncing task', task.title, err);
      }
    }

    _lastSyncAt = new Date().toISOString();
    _updateSyncStatus();
    Toast.show(`Synced to Calendar ✅`, `${created} created, ${updated} updated`, 'success');
  }

  // ================================================================
  // SYNC: Google Calendar → FlowTask Tasks
  // ================================================================
  async function syncCalendarToTasks() {
    if (!isConnected()) return;

    const now        = new Date();
    const timeMin    = now.toISOString();
    const timeMax    = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

    try {
      const resp = await window.gapi.client.calendar.events.list({
        calendarId:   CAL_ID,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy:      'startTime',
        maxResults:   100,
      });

      const events = resp.result.items || [];
      const tasks  = AppState.getTasks();
      let imported = 0;

      for (const ev of events) {
        // Only import events tagged by FlowTask OR all events based on settings
        const settings = AppState.getSettings();
        const importAll = settings.gcalImportAll;

        if (!importAll && !ev.summary?.startsWith(FLOWTASK_TAG)) continue;

        // Skip if already linked to a task
        const linked = tasks.find(t => t.gcalEventId === ev.id);
        if (linked) continue;

        // Create task from event
        const dueDate = ev.start?.date || ev.start?.dateTime?.split('T')[0];
        const dueTime = ev.start?.dateTime
          ? ev.start.dateTime.substring(11, 16)
          : null;

        const title = ev.summary?.replace(FLOWTASK_TAG, '').trim() || 'Untitled Event';

        TaskManager.addTask({
          title,
          description: ev.description || '',
          dueDate,
          dueTime,
          category:    'work',
          priority:    'medium',
          gcalEventId: ev.id,
          source:      'google_calendar',
        });
        imported++;
      }

      if (imported > 0) {
        Toast.show(`Imported from Calendar 📅`, `${imported} events added as tasks`, 'info');
      }
    } catch (err) {
      console.error('[GCal] Import error', err);
      Toast.show('Import failed', err.message || 'Check console for details', 'error');
    }
  }

  // ---- Full bidirectional sync ----
  async function syncAll() {
    if (_syncing) return;
    _syncing = true;
    _updateCalendarUI('syncing');

    try {
      await syncTasksToCalendar();
      await syncCalendarToTasks();
      _lastSyncAt = new Date().toISOString();
    } catch (err) {
      console.error('[GCal] Sync error', err);
      Toast.show('Sync failed', err.message || 'Unknown error', 'error');
    } finally {
      _syncing = false;
      _updateCalendarUI('connected');
    }
  }

  // ---- Delete a GCal event when task is deleted ----
  async function deleteEvent(gcalEventId) {
    if (!isConnected() || !gcalEventId) return;
    try {
      await window.gapi.client.calendar.events.delete({ calendarId: CAL_ID, eventId: gcalEventId });
    } catch {}
  }

  // ---- Convert task → Google Calendar event ----
  function _taskToEvent(task) {
    const title = `${FLOWTASK_TAG} ${task.title}`;
    const date  = task.dueDate;
    const time  = task.dueTime || '09:00';

    let start, end;
    if (task.dueTime) {
      // Timed event
      start = { dateTime: `${date}T${time}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      const endDt = new Date(`${date}T${time}:00`);
      endDt.setMinutes(endDt.getMinutes() + 30);
      end = { dateTime: endDt.toISOString(), timeZone: start.timeZone };
    } else {
      // All-day event
      start = { date };
      end   = { date };
    }

    return {
      summary:     title,
      description: [
        task.description || '',
        `\nPriority: ${task.priority || 'medium'}`,
        `Category: ${task.category || 'personal'}`,
        task.tags?.length ? `Tags: ${task.tags.join(', ')}` : '',
      ].filter(Boolean).join('\n'),
      start,
      end,
      colorId: _priorityToColorId(task.priority),
      reminders: {
        useDefault: false,
        overrides:  [{ method: 'popup', minutes: 30 }],
      },
    };
  }

  function _priorityToColorId(priority) {
    return { high: '11', medium: '5', low: '2' }[priority] || '5';
    // 11 = Tomato(red), 5 = Banana(yellow), 2 = Sage(green)
  }

  // ================================================================
  // UI RENDERING
  // ================================================================
  function renderSettingsPanel() {
    const container = document.getElementById('gcal-settings-panel');
    if (!container) return;

    const settings   = AppState.getSettings();
    const clientId   = settings.googleClientId || '';
    const importAll  = settings.gcalImportAll  || false;
    const connected  = isConnected();

    container.innerHTML = `
      <div class="gcal-panel">
        <div class="gcal-header">
          <div class="gcal-logo">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="6" width="36" height="36" rx="4" fill="#fff" stroke="#dadce0" stroke-width="2"/>
              <rect x="6" y="6" width="36" height="10" rx="4" fill="#4285f4"/>
              <rect x="6" y="10" width="36" height="6" fill="#4285f4"/>
              <text x="24" y="36" text-anchor="middle" font-size="16" font-weight="bold" fill="#3c4043">22</text>
            </svg>
          </div>
          <div>
            <h4 class="gcal-title">Google Calendar</h4>
            <p class="gcal-subtitle">Two-way sync your tasks and events</p>
          </div>
          <div class="gcal-status-badge ${connected ? 'connected' : 'disconnected'}" id="gcal-status-badge">
            ${connected ? '● Connected' : '○ Not connected'}
          </div>
        </div>

        ${!connected ? `
          <div class="gcal-setup-steps">
            <div class="gcal-step">
              <div class="gcal-step-num">1</div>
              <div class="gcal-step-body">
                <strong>Create OAuth credentials</strong>
                <p>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="gcal-link">Google Cloud Console</a> → Credentials → Create OAuth 2.0 Client ID</p>
                <p class="gcal-tip">Type: Web application | Authorized origins: <code>file://</code> or your domain</p>
              </div>
            </div>
            <div class="gcal-step">
              <div class="gcal-step-num">2</div>
              <div class="gcal-step-body">
                <strong>Enable Calendar API</strong>
                <p>In Cloud Console → APIs & Services → Enable <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" class="gcal-link">Google Calendar API</a></p>
              </div>
            </div>
            <div class="gcal-step">
              <div class="gcal-step-num">3</div>
              <div class="gcal-step-body">
                <strong>Paste your Client ID below</strong>
              </div>
            </div>
          </div>
          <div class="gcal-input-row">
            <input type="text" id="gcal-client-id" class="settings-input" placeholder="xxxx.apps.googleusercontent.com" value="${Utils.escapeHtml(clientId)}" />
            <button class="btn btn-primary" id="gcal-save-id-btn">Save & Connect</button>
          </div>
        ` : `
          <div class="gcal-sync-stats" id="gcal-sync-stats">
            <div class="gcal-stat">
              <span class="gcal-stat-val" id="gcal-synced-count">${_getSyncedCount()}</span>
              <span class="gcal-stat-label">Tasks synced</span>
            </div>
            <div class="gcal-stat">
              <span class="gcal-stat-val">${_lastSyncAt ? _formatSyncTime(_lastSyncAt) : 'Never'}</span>
              <span class="gcal-stat-label">Last sync</span>
            </div>
            <div class="gcal-stat">
              <span class="gcal-stat-val">30d</span>
              <span class="gcal-stat-label">Sync window</span>
            </div>
          </div>
          <div class="gcal-actions">
            <button class="btn btn-primary" id="gcal-sync-btn" ${_syncing ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              ${_syncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <button class="btn btn-outline" id="gcal-push-btn">
              ↑ Push Tasks to Calendar
            </button>
            <button class="btn btn-outline" id="gcal-pull-btn">
              ↓ Import Events as Tasks
            </button>
            <button class="btn btn-danger" id="gcal-disconnect-btn">Disconnect</button>
          </div>
        `}

        <div class="gcal-options">
          <label class="toggle-label">
            <input type="checkbox" class="toggle-input" id="gcal-import-all" ${importAll ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span>Import all calendar events (not just FlowTask ones)</span>
          </label>
          <label class="toggle-label" style="margin-top:10px">
            <input type="checkbox" class="toggle-input" id="gcal-auto-sync" ${settings.gcalAutoSync ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span>Auto-sync when tasks are added or completed</span>
          </label>
        </div>

        <div id="gcal-syncing-indicator" class="gcal-syncing" style="display:none">
          <div class="gcal-sync-spinner"></div>
          <span>Syncing with Google Calendar…</span>
        </div>
      </div>
    `;

    _bindPanelEvents(container);
  }

  function _bindPanelEvents(container) {
    container.querySelector('#gcal-save-id-btn')?.addEventListener('click', () => {
      const id = document.getElementById('gcal-client-id')?.value.trim();
      if (!id) { Toast.show('Enter Client ID', '', 'warning'); return; }
      AppState.setSettings({ googleClientId: id });
      loadGoogleAPIs(id);
      setTimeout(authorize, 1500);
    });

    container.querySelector('#gcal-sync-btn')?.addEventListener('click', syncAll);
    container.querySelector('#gcal-push-btn')?.addEventListener('click', syncTasksToCalendar);
    container.querySelector('#gcal-pull-btn')?.addEventListener('click', syncCalendarToTasks);
    container.querySelector('#gcal-disconnect-btn')?.addEventListener('click', () => { disconnect(); renderSettingsPanel(); });

    container.querySelector('#gcal-import-all')?.addEventListener('change', e => {
      AppState.setSettings({ gcalImportAll: e.target.checked });
    });
    container.querySelector('#gcal-auto-sync')?.addEventListener('change', e => {
      AppState.setSettings({ gcalAutoSync: e.target.checked });
    });
  }

  function _updateCalendarUI(state) {
    const badge   = document.getElementById('gcal-status-badge');
    const syncBtn = document.getElementById('gcal-sync-btn');
    const spinner = document.getElementById('gcal-syncing-indicator');

    if (badge) {
      badge.className = `gcal-status-badge ${state === 'connected' ? 'connected' : state === 'syncing' ? 'syncing' : 'disconnected'}`;
      badge.textContent = state === 'connected' ? '● Connected' : state === 'syncing' ? '↻ Syncing' : '○ Not connected';
    }
    if (syncBtn) syncBtn.disabled = state === 'syncing';
    if (spinner) spinner.style.display = state === 'syncing' ? 'flex' : 'none';
  }

  function _updateSyncStatus() {
    const el = document.getElementById('gcal-synced-count');
    if (el) el.textContent = _getSyncedCount();
  }

  function _getSyncedCount() {
    return AppState.getTasks().filter(t => t.gcalEventId).length;
  }

  function _formatSyncTime(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  // ---- Auto-sync hook ---- (called by app.js on task changes)
  function onTaskChange(task) {
    const settings = AppState.getSettings();
    if (!settings.gcalAutoSync || !isConnected()) return;
    if (task.dueDate) syncTasksToCalendar();
  }

  return {
    loadGoogleAPIs,
    authorize,
    disconnect,
    syncAll,
    syncTasksToCalendar,
    syncCalendarToTasks,
    deleteEvent,
    renderSettingsPanel,
    onTaskChange,
    isConnected,
  };
})();
