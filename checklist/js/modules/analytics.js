/**
 * analytics.js — Analytics & Insights Module
 * Weekly/Monthly/Yearly completion charts, heatmap, category stats
 */

const Analytics = (() => {

  // Active chart instances (for destroy/reinit)
  let _charts = {};

  // ---- Render All Analytics ----
  function renderAnalytics(period = 'week') {
    renderCompletionChart(period);
    renderCategoryChart();
    renderSummaryStats();
    renderTopTags();
    HeatmapUI.renderFull();
  }

  // ---- Completion Rate Chart ----
  function renderCompletionChart(period) {
    const canvas = document.getElementById('completion-chart');
    if (!canvas) return;

    const { labels, completed, added } = _getCompletionData(period);

    if (_charts.completion) {
      _charts.completion.destroy();
    }

    _charts.completion = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Completed',
            data: completed,
            borderColor: '#6c63ff',
            backgroundColor: 'rgba(108,99,255,0.1)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#6c63ff',
            pointRadius: 4,
          },
          {
            label: 'Added',
            data: added,
            borderColor: '#ff6b9d',
            backgroundColor: 'rgba(255,107,157,0.08)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#ff6b9d',
            pointRadius: 4,
            borderDash: [4, 4],
          },
        ],
      },
      options: _getLineOptions(),
    });
  }

  function _getCompletionData(period) {
    const tasks = AppState.getTasks();
    let days;

    if (period === 'week')  days = Utils.getLastNDays(7);
    if (period === 'month') days = Utils.getLastNDays(30);
    if (period === 'year')  days = _getLastMonths(12);

    if (period === 'year') {
      // Monthly grouping
      return _getMonthlyData(days);
    }

    const labels    = days.map(d => {
      const date = new Date(d + 'T00:00:00');
      return period === 'week'
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const completed = days.map(d =>
      tasks.filter(t => t.completedAt && t.completedAt.startsWith(d)).length
    );

    const added = days.map(d =>
      tasks.filter(t => t.createdAt && t.createdAt.startsWith(d)).length
    );

    return { labels, completed, added };
  }

  function _getLastMonths(n) {
    const months = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      months.push(d.toISOString().split('T')[0].substring(0, 7)); // YYYY-MM
    }
    return months;
  }

  function _getMonthlyData(months) {
    const tasks = AppState.getTasks();

    const labels = months.map(m => {
      const [y, mo] = m.split('-');
      return new Date(y, mo - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    const completed = months.map(m =>
      tasks.filter(t => t.completedAt && t.completedAt.startsWith(m)).length
    );

    const added = months.map(m =>
      tasks.filter(t => t.createdAt && t.createdAt.startsWith(m)).length
    );

    return { labels, completed, added };
  }

  // ---- Category Chart ----
  function renderCategoryChart() {
    const canvas = document.getElementById('category-analytics-chart');
    if (!canvas) return;

    const cats = TaskManager.getCategoryStats();
    const labels = ['Work', 'Personal', 'Fitness', 'Study'];
    const data   = [cats.work, cats.personal, cats.fitness, cats.study];
    const colors = ['rgba(108,99,255,0.8)', 'rgba(255,107,157,0.8)', 'rgba(72,199,116,0.8)', 'rgba(0,210,255,0.8)'];
    const borders = ['#6c63ff', '#ff6b9d', '#48c774', '#00d2ff'];

    if (_charts.category) _charts.category.destroy();

    _charts.category = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 2,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9090b0', font: { family: 'Inter', size: 12 }, padding: 12 },
          },
        },
        cutout: '65%',
      },
    });
  }

  // ---- Dashboard Donut (small) ----
  function renderDashboardCategoryChart() {
    const canvas = document.getElementById('category-chart');
    if (!canvas) return;

    const cats = TaskManager.getCategoryStats();
    const labels = ['Work', 'Personal', 'Fitness', 'Study'];
    const data   = [cats.work, cats.personal, cats.fitness, cats.study];

    // Show fallback if no tasks
    const total = data.reduce((a, b) => a + b, 0);
    if (total === 0) {
      const legend = document.getElementById('category-legend');
      if (legend) legend.innerHTML = '<p class="text-muted" style="font-size:12px">No tasks yet</p>';
      return;
    }

    const colors = ['#6c63ff', '#ff6b9d', '#48c774', '#00d2ff'];

    if (_charts.dashCat) _charts.dashCat.destroy();

    _charts.dashCat = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw} task${ctx.raw !== 1 ? 's' : ''}`,
            },
          },
        },
        cutout: '60%',
      },
    });

    // Legend
    const legend = document.getElementById('category-legend');
    if (legend) {
      const emojis = { Work: '💼', Personal: '👤', Fitness: '💪', Study: '📚' };
      legend.innerHTML = labels.map((l, i) =>
        `<div class="legend-item">
          <span class="legend-dot" style="background:${colors[i]}"></span>
          ${emojis[l]} ${l}: <strong>${data[i]}</strong>
        </div>`
      ).join('');
    }
  }

  // ---- Summary Stats ----
  function renderSummaryStats() {
    const tasks = AppState.getTasks();
    const g  = AppState.getGamification();
    const completed = tasks.filter(t => t.completed);

    // Total completed ever
    const totalEl = document.getElementById('total-completed-ever');
    if (totalEl) totalEl.textContent = completed.length;

    // Avg daily (last 30 days)
    const days = Utils.getLastNDays(30);
    const totalInPeriod = days.reduce((sum, d) =>
      sum + tasks.filter(t => t.completedAt && t.completedAt.startsWith(d)).length, 0);
    const avgEl = document.getElementById('avg-daily-completion');
    if (avgEl) avgEl.textContent = (totalInPeriod / 30).toFixed(1);

    // Best streak
    const streakEl = document.getElementById('best-streak-stat');
    if (streakEl) streakEl.textContent = g.bestStreak;

    // Total focus time
    const focusEl = document.getElementById('total-focus-time');
    if (focusEl) {
      const mins = PomodoroTimer.getTotalFocusMinutes();
      focusEl.textContent = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    }
  }

  // ---- Top Tags ----
  function renderTopTags() {
    const tasks = AppState.getTasks();
    const tagCounts = {};
    tasks.forEach(t => (t.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }));

    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    const container = document.getElementById('top-tags-analytics');
    if (!container) return;

    if (sorted.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-size:12px">No tags yet</p>';
      return;
    }

    container.innerHTML = sorted.map(([tag, count]) =>
      `<span class="task-tag tag-accent">#${Utils.escapeHtml(tag)} <strong>${count}</strong></span>`
    ).join('');
  }

  // ---- Wellness Charts ----
  function renderWellnessCharts() {
    _renderMoodChart();
    _renderEnergyChart();
    _renderBalanceChart();
  }

  function _renderMoodChart() {
    const canvas = document.getElementById('mood-chart');
    if (!canvas) return;

    const wellness = AppState.getWellness();
    const history  = (wellness.moodHistory || []).slice(-14);

    if (_charts.mood) _charts.mood.destroy();

    _charts.mood = new Chart(canvas, {
      type: 'line',
      data: {
        labels: history.map(h => {
          const d = new Date(h.date + 'T00:00:00');
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
          label: 'Mood',
          data: history.map(h => h.value),
          borderColor: '#ff6b9d',
          backgroundColor: 'rgba(255,107,157,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#ff6b9d',
          borderWidth: 2.5,
        }],
      },
      options: {
        ..._getLineOptions(),
        scales: {
          y: {
            ..._getLineOptions().scales.y,
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              color: '#9090b0',
              callback: v => ['', '😔', '😐', '🙂', '😊', '🤩'][v],
            },
          },
        },
      },
    });
  }

  function _renderEnergyChart() {
    const canvas = document.getElementById('energy-chart');
    if (!canvas) return;

    const wellness = AppState.getWellness();
    const history  = (wellness.energyHistory || []).slice(-14);

    const energyVal = { low: 1, medium: 2, high: 3 };

    if (_charts.energy) _charts.energy.destroy();

    _charts.energy = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: history.map(h => {
          const d = new Date(h.date + 'T00:00:00');
          return d.toLocaleDateString('en-US', { weekday: 'short' });
        }),
        datasets: [{
          label: 'Energy',
          data: history.map(h => energyVal[h.value] || 0),
          backgroundColor: history.map(h => {
            if (h.value === 'high')   return 'rgba(72,199,116,0.7)';
            if (h.value === 'medium') return 'rgba(255,179,71,0.7)';
            return 'rgba(255,83,112,0.7)';
          }),
          borderRadius: 4,
        }],
      },
      options: {
        ..._getLineOptions(),
        scales: {
          y: {
            ..._getLineOptions().scales.y,
            min: 0,
            max: 3,
            ticks: {
              stepSize: 1,
              color: '#9090b0',
              callback: v => ['', '🔋 Low', '⚡ Med', '🚀 High'][v],
            },
          },
        },
      },
    });
  }

  function _renderBalanceChart() {
    const canvas = document.getElementById('balance-chart');
    if (!canvas) return;

    const cats = TaskManager.getCategoryStats();
    const completed = AppState.getTasks().filter(t => t.completed);
    const workDone  = completed.filter(t => t.category === 'work').length;
    const lifeDone  = completed.filter(t => t.category !== 'work').length;

    if (_charts.balance) _charts.balance.destroy();

    _charts.balance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Work', 'Life'],
        datasets: [{
          data: [workDone || 1, lifeDone || 1],
          backgroundColor: ['rgba(108,99,255,0.8)', 'rgba(72,199,116,0.8)'],
          borderColor: ['#6c63ff', '#48c774'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: '#9090b0', font: { family: 'Inter', size: 12 } },
          },
        },
        cutout: '55%',
      },
    });
  }

  // ---- Chart Options ----
  function _getLineOptions() {
    return {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#9090b0', font: { family: 'Inter', size: 12 }, usePointStyle: true },
        },
        tooltip: {
          backgroundColor: 'rgba(22,22,40,0.95)',
          titleColor: '#e8e8f0',
          bodyColor: '#9090b0',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#9090b0', font: { family: 'Inter', size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#9090b0', font: { family: 'Inter', size: 11 } },
          beginAtZero: true,
        },
      },
    };
  }

  return {
    renderAnalytics,
    renderDashboardCategoryChart,
    renderWellnessCharts,
    renderSummaryStats,
  };
})();
