# 🚀 FlowTask — Ultimate Daily Checklist & Productivity App

🌐 **Public URL**  
https://checklist-biux0k65n-mahendravarmakare-5907s-projects.vercel.app/

A production-ready, fully-featured productivity app with modular architecture, dark/light themes, gamification, analytics, Pomodoro timer, wellness tracking, and PWA support. **Zero dependencies required to run** — just open `index.html` in any modern browser.

---

## ✨ Features (Phase 1 — Fully Implemented)

### Core Task Management
- ✅ Add, edit, delete tasks with full field support
- ✅ Title, description, priority (Low/Medium/High)
- ✅ Due date & time with smart relative formatting
- ✅ Tags with chip UI (`#work`, `#health`, etc.)
- ✅ Category (Work, Personal, Fitness, Study)
- ✅ Mark complete / incomplete
- ✅ Drag-and-drop reordering (SortableJS)
- ✅ Recurring tasks (Daily, Weekly, Weekdays)
- ✅ Subtasks with nested checklist

### Daily System
- ✅ Today view with priority sections (High/Medium/Low)
- ✅ Auto-reset tasks daily (configurable)
- ✅ Today / Upcoming / Completed sections
- ✅ Progress bar (5/10 tasks completed)
- ✅ Smart carry-forward of incomplete tasks
- ✅ All Tasks view with powerful filtering & sorting

### Analytics & Insights
- ✅ Completion rate chart (Week/Month/Year)
- ✅ Tasks by category doughnut chart
- ✅ GitHub-style activity heatmap
- ✅ Daily/weekly/monthly summary stats
- ✅ Top tags usage analysis
- ✅ Streak tracking with best streak

### Focus & Time Management
- ✅ Focus Mode (one task at a time)
- ✅ Pomodoro Timer (25/5/15 sessions)
- ✅ Session tracking with XP rewards
- ✅ Focus time tracking
- ✅ Audio beep on session complete

### Gamification System
- ✅ XP points for task completion
- ✅ 12-level progression system
- ✅ 16 achievement badges
- ✅ Daily streak tracking
- ✅ Level-up announcements with confetti
- ✅ Daily challenges

### Personalization
- ✅ Dark / Light / Ocean / Forest themes
- ✅ 6 accent color options
- ✅ User profile (name, avatar initial)
- ✅ Persistent settings in localStorage

### Wellness Features
- ✅ Daily mood tracker (5-point scale)
- ✅ Energy level tracking (Low/Medium/High)
- ✅ Mood & energy history charts
- ✅ Work-life balance visualization
- ✅ Wellness tips (9 curated tips)
- ✅ Digital Detox Mode

### Reminders & Notifications
- ✅ Browser push notification support
- ✅ In-app toast notification system
- ✅ Smart task reminders (30 min before due)
- ✅ Daily summary notifications
- ✅ Overdue task alerts

### Data & Security
- ✅ Full localStorage persistence
- ✅ In-memory fallback for private mode
- ✅ JSON data backup & restore
- ✅ CSV export
- ✅ PWA installable (offline support)
- ✅ Service Worker for offline-first

---

## 🗂 Project Structure

```
checklist/
├── index.html              # App shell, all views (SPA)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (offline)
├── css/
│   ├── main.css            # Design system, layout, base
│   ├── components.css      # Task cards, modals, forms
│   ├── animations.css      # Keyframes, transitions
│   └── themes.css          # Dark/Light/Ocean/Forest themes
├── js/
│   ├── core/
│   │   ├── storage.js      # localStorage abstraction
│   │   ├── state.js        # Centralized state + event bus
│   │   └── utils.js        # Pure utility functions
│   ├── modules/
│   │   ├── tasks.js        # Task CRUD, filtering, recurring
│   │   ├── gamification.js # XP, levels, achievements, confetti
│   │   ├── pomodoro.js     # Pomodoro timer engine
│   │   ├── analytics.js    # Charts, heatmap, stats
│   │   ├── wellness.js     # Mood/energy tracking, tips
│   │   ├── notifications.js# Browser notifications + toasts
│   │   └── search.js       # Global search with debounce
│   └── ui/
│       ├── taskCard.js     # Task card renderer
│       ├── modal.js        # Add/edit/detail modals
│       ├── heatmap.js      # Activity heatmap
│       └── charts.js       # Chart.js theme config
└── icons/                  # PWA icons (add your own)
```

---

## 🚀 Getting Started

### Option 1: Direct Open (Simplest)
```bash
# Just double-click index.html in Finder
# OR drag it into Chrome/Firefox/Safari
open index.html
```

### Option 2: Local HTTP Server (for PWA features)
```bash
# Python 3
python3 -m http.server 3000

# Then open: http://localhost:3000
```

### Option 3: VS Code Live Server
1. Install the "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

---

## 🐳 Docker Setup

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t flowtask .
docker run -p 8080:80 flowtask
# Open: http://localhost:8080
```

---

## 🏗 Architecture Decisions

| Concept | Decision | Rationale |
|---------|----------|-----------|
| Framework | Vanilla JS + modules | Zero build step, maximum portability |
| State | Custom event bus + localStorage | No Redux overhead, simple and fast |
| Styling | CSS custom properties (tokens) | Theme switching without JS |
| Charts | Chart.js CDN | Battle-tested, small footprint |
| DnD | SortableJS CDN | Lightweight, mobile-friendly |
| Icons | Inline SVG | No HTTP requests, themeable |
| Offline | Service Worker + Cache API | True offline-first PWA |

---

## 📋 Development Phases

| Phase | Status | Features |
|-------|--------|----------|
| **Phase 1** | ✅ Complete | Core tasks, UI, Pomodoro, Gamification, Analytics, Wellness |
| **Phase 2** | 🔄 Scaffold | Push notifications, advanced recurring, email integration |
| **Phase 3** | 📋 Planned | Advanced analytics, leaderboards, sharing |
| **Phase 4** | 📋 Planned | AI task suggestions, voice input, Google Calendar sync |

---

## 🔌 Phase 4 — AI Integration Plan

For the AI features, integrate these APIs:

```javascript
// Voice input (Web Speech API — built-in browsers)
const recognition = new webkitSpeechRecognition();
recognition.onresult = (e) => {
  const transcript = e.results[0][0].transcript;
  TaskManager.addTask({ title: transcript });
};

// AI Task Suggestions (OpenAI API)
async function getAISuggestions(history) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: `Given these completed tasks: ${history}, suggest 3 new tasks.` }]
    })
  });
  return response.json();
}
```

---

## 🔮 Future Scaling Suggestions

1. **Backend**: Add Node.js + Express with MongoDB for multi-device sync
2. **Auth**: Firebase Auth or JWT for user accounts
3. **Real-time**: Socket.io for team collaboration features
4. **Mobile**: Convert to React Native or Capacitor for native apps
5. **AI**: Add OpenAI API for smart scheduling and suggestions
6. **Calendar**: Google Calendar API for two-way sync
7. **Monitoring**: Add Sentry for error tracking in production

---

## 🛡 Browser Support

| Browser | Support |
|---------|---------|
| Chrome  | ✅ Full |
| Firefox | ✅ Full |
| Safari  | ✅ Full |
| Edge    | ✅ Full |
| Mobile Chrome | ✅ Full |
| Mobile Safari | ✅ Full |

---

## 📄 License

MIT License — Free for personal and commercial use.

---

*Built with ❤️ — FlowTask v1.0.0*
