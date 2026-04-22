/**
 * charts.js — Placeholder / re-export
 * Charts are handled by analytics.js (Chart.js).
 * This module handles any chart theming and updates when theme changes.
 */

const ChartTheme = (() => {
  function updateChartDefaults() {
    if (typeof Chart === 'undefined') return;

    const isDark = document.documentElement.dataset.theme !== 'light';
    const textColor = isDark ? '#9090b0' : '#5a5a7a';
    const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

    Chart.defaults.color           = textColor;
    Chart.defaults.borderColor     = gridColor;
    Chart.defaults.font.family     = "'Inter', sans-serif";
    Chart.defaults.font.size       = 12;
    Chart.defaults.plugins.tooltip.enabled = true;
  }

  function init() {
    if (typeof Chart !== 'undefined') {
      updateChartDefaults();
    }
    AppState.on('settings:changed', s => {
      if (s.theme) {
        setTimeout(updateChartDefaults, 100);
      }
    });
  }

  return { init, updateChartDefaults };
})();
