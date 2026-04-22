/**
 * ai.js — Phase 4: AI-Powered Features
 * Smart task suggestions, auto-scheduling, voice input
 */

const AIAssistant = (() => {

  // ---- Smart Suggestions based on history & patterns ----
  const SUGGESTION_TEMPLATES = [
    { title: 'Review emails and respond', category: 'work',     priority: 'medium', tags: ['email','communication'] },
    { title: 'Team standup meeting',       category: 'work',     priority: 'high',   tags: ['meeting','team'] },
    { title: 'Plan tomorrow\'s schedule',  category: 'work',     priority: 'medium', tags: ['planning'] },
    { title: 'Morning workout session',    category: 'fitness',  priority: 'high',   tags: ['health','morning'] },
    { title: 'Evening walk (30 min)',       category: 'fitness',  priority: 'low',    tags: ['health','walk'] },
    { title: 'Read for 30 minutes',         category: 'study',   priority: 'medium', tags: ['reading','learning'] },
    { title: 'Review study notes',          category: 'study',   priority: 'medium', tags: ['study','review'] },
    { title: 'Call a family member',        category: 'personal', priority: 'medium', tags: ['family','social'] },
    { title: 'Grocery shopping',            category: 'personal', priority: 'medium', tags: ['errands'] },
    { title: 'Meditate (10 min)',           category: 'personal', priority: 'low',    tags: ['wellness','mindfulness'] },
    { title: 'Weekly project review',       category: 'work',     priority: 'high',   tags: ['review','planning'] },
    { title: 'Drink 8 glasses of water',    category: 'fitness',  priority: 'low',    tags: ['health','hydration'] },
    { title: 'Prepare meeting agenda',      category: 'work',     priority: 'high',   tags: ['meeting','preparation'] },
    { title: 'Practice skill for 1 hour',   category: 'study',   priority: 'medium', tags: ['practice','skill'] },
    { title: 'Clean and organize workspace',category: 'personal', priority: 'low',    tags: ['organization','productivity'] },
  ];

  // Analyze task history and return suggestions
  function getSuggestions(count = 5) {
    const tasks     = AppState.getTasks();
    const completed = tasks.filter(t => t.completed);
    const existing  = new Set(tasks.map(t => t.title.toLowerCase()));

    // Frequency analysis by category
    const catFreq = {};
    completed.forEach(t => { catFreq[t.category] = (catFreq[t.category] || 0) + 1; });

    // Top category
    const topCat = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'personal';

    // Time-based: morning vs evening suggestions
    const hour = new Date().getHours();
    const timeHint = hour < 10 ? 'morning' : hour < 14 ? 'midday' : 'evening';

    // Prefer top category, filter out already existing tasks
    let pool = SUGGESTION_TEMPLATES.filter(s => !existing.has(s.title.toLowerCase()));

    // Score by relevance
    pool = pool.map(s => ({
      ...s,
      score: (s.category === topCat ? 3 : 1) +
             (s.tags.some(t => t === timeHint) ? 2 : 0) +
             Math.random()
    })).sort((a, b) => b.score - a.score);

    return pool.slice(0, count).map(({ score, ...s }) => s);
  }

  // Auto-schedule tasks: distribute across next N days balancing load
  function autoSchedule() {
    const tasks    = AppState.getTasks().filter(t => !t.completed && !t.dueDate);
    const nextDays = Utils.getNextNDays(7);
    const tasksPerDay = Math.ceil(tasks.length / 7) || 1;

    let dayIdx = 0;
    let dayCount = 0;

    tasks.forEach((task, i) => {
      if (dayCount >= tasksPerDay && dayIdx < nextDays.length - 1) {
        dayIdx++;
        dayCount = 0;
      }
      AppState.updateTask(task.id, { dueDate: nextDays[dayIdx] });
      dayCount++;
    });

    Toast.show(`Auto-Scheduled! 📅`, `${tasks.length} tasks distributed across 7 days`, 'success');
  }

  // Smart reschedule: move all overdue to today or tomorrow
  function rescheduleOverdue() {
    const today    = Utils.today();
    const tomorrow = Utils.getNextNDays(1)[0];
    const overdue  = AppState.getTasks().filter(t => !t.completed && Utils.isOverdue(t.dueDate));

    if (overdue.length === 0) {
      Toast.show('No overdue tasks!', 'All caught up 🎉', 'success');
      return;
    }

    const highPrio = overdue.filter(t => t.priority === 'high');
    const rest     = overdue.filter(t => t.priority !== 'high');

    // High priority → today, others → tomorrow
    highPrio.forEach(t => AppState.updateTask(t.id, { dueDate: today, carriedForward: true }));
    rest.forEach(t     => AppState.updateTask(t.id, { dueDate: tomorrow, carriedForward: true }));

    Toast.show(`Rescheduled ${overdue.length} tasks`, `High priority → Today, Others → Tomorrow`, 'info');
  }

  // ---- Voice Input (Web Speech API) ----
  let _recognition = null;
  let _isListening = false;

  function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    _recognition = new SpeechRecognition();
    _recognition.continuous     = false;
    _recognition.interimResults = true;
    _recognition.lang           = 'en-US';

    _recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');

      const voiceInput = document.getElementById('voice-transcript');
      if (voiceInput) voiceInput.textContent = transcript;

      if (e.results[0].isFinal) {
        _processVoiceCommand(transcript.trim());
      }
    };

    _recognition.onerror = (e) => {
      Toast.show('Voice Error', e.error, 'error');
      _stopListening();
    };

    _recognition.onend = _stopListening;

    return true;
  }

  function toggleVoice() {
    if (_isListening) {
      _stopListening();
    } else {
      _startListening();
    }
  }

  function _startListening() {
    if (!_recognition && !initVoice()) {
      Toast.show('Voice not supported', 'Try Chrome or Edge', 'error');
      return;
    }
    _recognition.start();
    _isListening = true;
    _updateVoiceUI(true);
    Toast.show('Listening...', 'Say a task name', 'info', 2000);
  }

  function _stopListening() {
    if (_recognition && _isListening) {
      try { _recognition.stop(); } catch {}
    }
    _isListening = false;
    _updateVoiceUI(false);
  }

  function _updateVoiceUI(listening) {
    const btn = document.getElementById('voice-input-btn');
    const indicator = document.getElementById('voice-indicator');
    if (btn) btn.classList.toggle('listening', listening);
    if (indicator) indicator.style.display = listening ? 'flex' : 'none';
  }

  function _processVoiceCommand(text) {
    if (!text) return;

    // Parse natural language into task fields
    let priority = 'medium';
    let title    = text;

    if (/urgent|asap|important|critical/i.test(text)) priority = 'high';
    if (/low priority|minor|optional/i.test(text))    priority = 'low';

    // Remove command words
    title = title.replace(/\b(add task|create task|remind me to|i need to)\b/gi, '').trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Open modal pre-filled
    ModalManager.openAdd({ voiceTitle: title, priority });

    // Fill in title field
    setTimeout(() => {
      const titleInput = document.getElementById('task-title');
      if (titleInput) { titleInput.value = title; }
    }, 150);
  }

  // ---- Render AI Suggestions Panel ----
  function renderSuggestionsPanel() {
    const container = document.getElementById('ai-suggestions-list');
    if (!container) return;

    const suggestions = getSuggestions(6);
    container.innerHTML = suggestions.map((s, i) => `
      <div class="ai-suggestion-item fade-in" style="animation-delay:${i*50}ms">
        <div class="ai-suggestion-info">
          <span class="ai-sug-emoji">${Utils.getCategoryEmoji(s.category)}</span>
          <div>
            <div class="ai-sug-title">${Utils.escapeHtml(s.title)}</div>
            <div class="ai-sug-meta">
              <span class="task-category cat-${s.category}">${Utils.capitalize(s.category)}</span>
              <span class="priority-badge prio-${s.priority}">${s.priority}</span>
            </div>
          </div>
        </div>
        <button class="ai-add-btn" data-idx="${i}" title="Add this task">+ Add</button>
      </div>
    `).join('');

    container.querySelectorAll('.ai-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = suggestions[parseInt(btn.dataset.idx)];
        const result = TaskManager.addTask(s);
        if (result.success) {
          btn.closest('.ai-suggestion-item').classList.add('removing');
          setTimeout(() => renderSuggestionsPanel(), 350);
          Toast.show('Task added!', s.title, 'success');
        }
      });
    });
  }

  return {
    getSuggestions, autoSchedule, rescheduleOverdue,
    toggleVoice, initVoice, renderSuggestionsPanel,
    isListening: () => _isListening,
  };
})();
