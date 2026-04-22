/**
 * gamification.js — Gamification System
 * XP, leveling, streaks, achievement badges, daily challenges
 */

const Gamification = (() => {

  // ---- XP Table ----
  const XP_REWARDS = {
    taskCompleted:  10,
    highPriority:   15,
    beforeDue:       5,
    streak3:        20,
    streak7:        50,
    streak30:      100,
    firstTask:      25,
    dailyChallenge: 30,
  };

  // ---- Level Thresholds ----
  const LEVELS = [
    { level: 1,  xp: 0,    title: 'Beginner' },
    { level: 2,  xp: 100,  title: 'Starter' },
    { level: 3,  xp: 250,  title: 'Motivated' },
    { level: 4,  xp: 500,  title: 'Consistent' },
    { level: 5,  xp: 800,  title: 'Dedicated' },
    { level: 6,  xp: 1200, title: 'Focused' },
    { level: 7,  xp: 1700, title: 'Productive' },
    { level: 8,  xp: 2300, title: 'Achiever' },
    { level: 9,  xp: 3000, title: 'Expert' },
    { level: 10, xp: 4000, title: 'Master' },
    { level: 11, xp: 5500, title: 'Champion' },
    { level: 12, xp: 7500, title: 'Legend' },
  ];

  // ---- Achievement Definitions ----
  const ACHIEVEMENTS = [
    {
      id: 'first_task',
      icon: '🎯',
      name: 'First Step',
      desc: 'Complete your first task',
      condition: g => g.totalCompleted >= 1,
    },
    {
      id: 'ten_tasks',
      icon: '🔟',
      name: 'Ten Done',
      desc: 'Complete 10 tasks',
      condition: g => g.totalCompleted >= 10,
    },
    {
      id: 'fifty_tasks',
      icon: '🌟',
      name: 'Fifty Strong',
      desc: 'Complete 50 tasks',
      condition: g => g.totalCompleted >= 50,
    },
    {
      id: 'hundred_tasks',
      icon: '💯',
      name: 'Century Club',
      desc: 'Complete 100 tasks',
      condition: g => g.totalCompleted >= 100,
    },
    {
      id: 'streak_3',
      icon: '🔥',
      name: 'On Fire',
      desc: '3-day streak',
      condition: g => g.streak >= 3,
    },
    {
      id: 'streak_7',
      icon: '⚡',
      name: 'Weekly Warrior',
      desc: '7-day streak',
      condition: g => g.streak >= 7,
    },
    {
      id: 'streak_30',
      icon: '🏅',
      name: 'Monthly Master',
      desc: '30-day streak',
      condition: g => g.streak >= 30,
    },
    {
      id: 'high_priority',
      icon: '🚀',
      name: 'Priority Pro',
      desc: 'Complete 5 high-priority tasks',
      condition: (g, tasks) => tasks.filter(t => t.completed && t.priority === 'high').length >= 5,
    },
    {
      id: 'all_categories',
      icon: '🎨',
      name: 'Well Rounded',
      desc: 'Complete tasks in all 4 categories',
      condition: (g, tasks) => {
        const cats = new Set(tasks.filter(t => t.completed).map(t => t.category));
        return ['work', 'personal', 'fitness', 'study'].every(c => cats.has(c));
      },
    },
    {
      id: 'level_5',
      icon: '⭐',
      name: 'Rising Star',
      desc: 'Reach Level 5',
      condition: g => g.level >= 5,
    },
    {
      id: 'level_10',
      icon: '👑',
      name: 'Productivity King',
      desc: 'Reach Level 10',
      condition: g => g.level >= 10,
    },
    {
      id: 'early_bird',
      icon: '🌅',
      name: 'Early Bird',
      desc: 'Complete a task before 9 AM',
      condition: (g, tasks) => tasks.some(t => {
        if (!t.completedAt) return false;
        const h = new Date(t.completedAt).getHours();
        return h < 9;
      }),
    },
    {
      id: 'night_owl',
      icon: '🦉',
      name: 'Night Owl',
      desc: 'Complete a task after 10 PM',
      condition: (g, tasks) => tasks.some(t => {
        if (!t.completedAt) return false;
        const h = new Date(t.completedAt).getHours();
        return h >= 22;
      }),
    },
    {
      id: 'subtask_master',
      icon: '🔀',
      name: 'Subtask Master',
      desc: 'Complete a task with 3+ subtasks',
      condition: (g, tasks) => tasks.some(t => t.completed && (t.subtasks || []).length >= 3),
    },
    {
      id: 'tagger',
      icon: '🏷️',
      name: 'Organized',
      desc: 'Use 5 different tags',
      condition: (g, tasks) => {
        const tags = new Set(tasks.flatMap(t => t.tags || []));
        return tags.size >= 5;
      },
    },
    {
      id: 'speed_runner',
      icon: '⚡',
      name: 'Speed Runner',
      desc: 'Complete 5 tasks in one day',
      condition: (g, tasks) => {
        const today = Utils.today();
        const todayDone = tasks.filter(t =>
          t.completed && t.completedAt && t.completedAt.startsWith(today)
        );
        return todayDone.length >= 5;
      },
    },
  ];

  // ---- Daily Challenges ----
  const DAILY_CHALLENGES = [
    { text: 'Complete 3 tasks before noon!', target: 3 },
    { text: 'Clear all high-priority tasks!', type: 'high' },
    { text: 'Complete 5 tasks today!', target: 5 },
    { text: 'Add and complete a fitness task!', category: 'fitness' },
    { text: 'Complete a work task today!', category: 'work' },
    { text: 'Complete 2 study tasks!', category: 'study', target: 2 },
  ];

  // ---- Get Level Info ----
  function getLevelInfo(xp) {
    let current = LEVELS[0];
    let next = LEVELS[1];

    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xp) {
        current = LEVELS[i];
        next    = LEVELS[i + 1] || null;
        break;
      }
    }

    const progress = next
      ? ((xp - current.xp) / (next.xp - current.xp)) * 100
      : 100;

    return { current, next, progress: Math.min(progress, 100) };
  }

  // ---- Gain XP ----
  function gainXP(amount, reason = '') {
    const g = AppState.getGamification();
    const oldXp    = g.xp;
    const newXp    = oldXp + amount;
    const oldLevel = g.level;
    const { current } = getLevelInfo(newXp);
    const newLevel = current.level;

    AppState.setGamification({ xp: newXp, level: newLevel });

    if (newLevel > oldLevel) {
      _onLevelUp(newLevel, current.title);
    }

    AppState.emit('xp:gained', { amount, reason, total: newXp });
  }

  // ---- On Task Added ----
  function onTaskAdded(task) {
    const g = AppState.getGamification();
    // First task bonus
    if (AppState.getTasks().length === 1) {
      gainXP(XP_REWARDS.firstTask, 'First task in the app!');
    }
    _checkAchievements();
  }

  // ---- On Task Completed ----
  function onTaskCompleted(task) {
    const g = AppState.getGamification();
    let xp = XP_REWARDS.taskCompleted;

    // Bonus for high priority
    if (task.priority === 'high') xp += XP_REWARDS.highPriority;

    // Bonus for before due date
    if (task.dueDate && task.dueDate >= Utils.today()) xp += XP_REWARDS.beforeDue;

    gainXP(xp, `Completed: ${task.title}`);

    AppState.setGamification({
      totalCompleted: g.totalCompleted + 1,
    });

    _checkAchievements();

    Toast.show(`+${xp} XP`, `Task completed! 🎉`, 'success');
  }

  // ---- On Task Uncompleted ----
  function onTaskUncompleted(task) {
    // Remove some XP for uncompleting
    const g = AppState.getGamification();
    const penalty = Math.min(XP_REWARDS.taskCompleted, g.xp);
    if (penalty > 0) {
      AppState.setGamification({ xp: g.xp - penalty });
    }
  }

  // ---- Record Daily Activity (for streaks) ----
  function recordDailyActivity() {
    const g = AppState.getGamification();
    const today = Utils.today();
    const last  = g.lastActivityDate;

    let newStreak = g.streak;

    if (!last) {
      newStreak = 1;
    } else {
      const lastDate = new Date(last + 'T00:00:00');
      const todayDate = new Date(today + 'T00:00:00');
      const diff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        newStreak = g.streak + 1;
      } else if (diff > 1) {
        newStreak = 1; // Streak broken
      }
      // diff === 0 means same day, no change
    }

    const bestStreak = Math.max(newStreak, g.bestStreak);

    AppState.setGamification({
      streak: newStreak,
      bestStreak,
      lastActivityDate: today,
    });

    // Streak XP bonuses
    if (newStreak === 3)  gainXP(XP_REWARDS.streak3, '3-day streak!');
    if (newStreak === 7)  gainXP(XP_REWARDS.streak7, '7-day streak!');
    if (newStreak === 30) gainXP(XP_REWARDS.streak30, '30-day streak!');

    _checkAchievements();
  }

  // ---- Check & Unlock Achievements ----
  function _checkAchievements() {
    const g     = AppState.getGamification();
    const tasks = AppState.getTasks();

    ACHIEVEMENTS.forEach(ach => {
      if (g.badges[ach.id]) return; // Already unlocked

      try {
        if (ach.condition(g, tasks)) {
          _unlockAchievement(ach);
        }
      } catch (e) {}
    });
  }

  function _unlockAchievement(ach) {
    const g = AppState.getGamification();
    const badges = { ...g.badges, [ach.id]: { unlockedAt: new Date().toISOString() } };
    AppState.setGamification({ badges });

    // Show achievement popup
    _showAchievementPopup(ach);
    gainXP(50, `Achievement: ${ach.name}`);
  }

  function _showAchievementPopup(ach) {
    const popup = document.getElementById('achievement-popup');
    const icon  = document.getElementById('achievement-popup-icon');
    const name  = document.getElementById('achievement-popup-name');

    if (!popup) return;

    icon.textContent = ach.icon;
    name.textContent = ach.name + ' — ' + ach.desc;

    popup.style.display = 'flex';
    popup.classList.add('show');

    setTimeout(() => {
      popup.style.display = 'none';
      popup.classList.remove('show');
    }, 4000);
  }

  // ---- Level Up ----
  function _onLevelUp(level, title) {
    Toast.show(
      `Level Up! 🎉`,
      `You reached Level ${level} — ${title}!`,
      'success'
    );
    Confetti.burst();
  }

  // ---- Get All Achievements with Status ----
  function getAllAchievements() {
    const g = AppState.getGamification();
    const tasks = AppState.getTasks();

    return ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: !!g.badges[ach.id],
      unlockedAt: g.badges[ach.id]?.unlockedAt || null,
    }));
  }

  // ---- Get Daily Challenge ----
  function getDailyChallenge() {
    const dayOfYear = Math.floor(Date.now() / 864e5);
    return DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
  }

  // ---- Get Daily Challenge Progress ----
  function getDailyChallengeProgress() {
    const challenge = getDailyChallenge();
    const tasks = AppState.getTasks();
    const today = Utils.today();
    const todayCompleted = tasks.filter(t => t.completed && t.completedAt?.startsWith(today));

    let done = todayCompleted.length;
    let target = challenge.target || 1;

    if (challenge.category) {
      done = todayCompleted.filter(t => t.category === challenge.category).length;
    }
    if (challenge.type === 'high') {
      done = todayCompleted.filter(t => t.priority === 'high').length;
      target = tasks.filter(t => !t.completed && t.priority === 'high').length || 1;
    }

    return { done, target, percent: Math.min((done / target) * 100, 100) };
  }

  return {
    getLevelInfo, gainXP,
    onTaskAdded, onTaskCompleted, onTaskUncompleted,
    recordDailyActivity,
    getAllAchievements,
    getDailyChallenge, getDailyChallengeProgress,
    ACHIEVEMENTS, LEVELS,
  };
})();

// ---- Confetti System ----
const Confetti = (() => {
  const canvas = document.getElementById('confetti-canvas');
  let ctx, particles = [];

  function init() {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  function burst() {
    if (!ctx) { init(); if (!ctx) return; }

    const colors = ['#6c63ff', '#ff6b6b', '#48c774', '#ffb347', '#00d2ff', '#9b59b6'];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x:  Math.random() * canvas.width,
        y:  -10,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size:  Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }

    if (particles.length === 80) _animate(); // Start only once
  }

  function _animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles = particles.filter(p => p.opacity > 0);

    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.1; // gravity
      p.rotation += p.rotSpeed;
      p.opacity  -= 0.012;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    if (particles.length > 0) requestAnimationFrame(_animate);
  }

  return { init, burst };
})();
