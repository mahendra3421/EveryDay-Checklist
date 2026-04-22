/**
 * heatmap.js — Activity Heatmap UI
 * GitHub-style contribution heatmap
 */

const HeatmapUI = (() => {

  /**
   * Build a map of date -> completion count
   */
  function _buildActivityMap() {
    const tasks = AppState.getTasks();
    const map   = {};
    tasks.forEach(t => {
      if (t.completedAt) {
        const date = t.completedAt.split('T')[0];
        map[date] = (map[date] || 0) + 1;
      }
    });
    return map;
  }

  /**
   * Get heat level 0-4 from count
   */
  function _level(count) {
    if (!count || count === 0) return 0;
    if (count <= 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  }

  /**
   * Render mini heatmap (last 3 months)
   */
  function renderMini() {
    const container = document.getElementById('heatmap-mini');
    if (!container) return;

    const activityMap = _buildActivityMap();
    const days        = Utils.getLastNDays(84); // 12 weeks
    const monthEl     = document.getElementById('heatmap-month');

    if (monthEl) {
      const firstDate = new Date(days[0] + 'T00:00:00');
      const lastDate  = new Date(days[days.length - 1] + 'T00:00:00');
      monthEl.textContent = `${firstDate.toLocaleDateString('en-US', { month: 'short' })} – ${lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }

    container.innerHTML = days.map((date, i) => {
      const count = activityMap[date] || 0;
      const level = _level(count);
      const label = `${Utils.formatDate(date)}: ${count} task${count !== 1 ? 's' : ''} completed`;
      return `<div
        class="heatmap-cell"
        data-level="${level}"
        data-date="${date}"
        data-count="${count}"
        title="${label}"
        style="animation-delay:${i * 4}ms"
      ></div>`;
    }).join('');
  }

  /**
   * Render full heatmap (last year)
   */
  function renderFull() {
    const container = document.getElementById('heatmap-full');
    if (!container) return;

    const activityMap = _buildActivityMap();
    const days        = Utils.getLastNDays(365);

    container.innerHTML = days.map((date, i) => {
      const count = activityMap[date] || 0;
      const level = _level(count);
      const label = `${Utils.formatDate(date)}: ${count} task${count !== 1 ? 's' : ''} completed`;
      return `<div
        class="heatmap-cell"
        data-level="${level}"
        data-date="${date}"
        data-count="${count}"
        title="${label}"
        style="animation-delay:${Math.floor(i / 7) * 10}ms"
      ></div>`;
    }).join('');
  }

  return { renderMini, renderFull };
})();
