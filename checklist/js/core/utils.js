/**
 * utils.js — Utility Functions
 * ID generation, date helpers, formatting, DOM utilities
 */

const Utils = (() => {

  // ---- ID Generation ----
  /**
   * Generate a unique ID
   * @returns {string}
   */
  function generateId() {
    return `ft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ---- Date & Time ----
  /**
   * Get today's date string YYYY-MM-DD
   * @returns {string}
   */
  function today() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Format a date string for display
   * @param {string} dateStr - YYYY-MM-DD
   * @returns {string}
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  }

  /**
   * Format date relative to today (Today, Tomorrow, Yesterday, etc.)
   * @param {string} dateStr - YYYY-MM-DD
   * @returns {string}
   */
  function formatRelativeDate(dateStr) {
    if (!dateStr) return '';
    const todayStr = today();
    if (dateStr === todayStr) return 'Today';

    const todayDate = new Date(todayStr);
    const targetDate = new Date(dateStr + 'T00:00:00');
    const diff = Math.floor((targetDate - todayDate) / (1000 * 60 * 60 * 24));

    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 0 && diff <= 7) return `In ${diff} days`;
    if (diff < 0) return `${Math.abs(diff)} days ago`;
    return formatDate(dateStr);
  }

  /**
   * Check if a date is overdue
   * @param {string} dateStr - YYYY-MM-DD
   * @returns {boolean}
   */
  function isOverdue(dateStr) {
    if (!dateStr) return false;
    return dateStr < today();
  }

  /**
   * Check if a date is due soon (within 2 days)
   * @param {string} dateStr
   * @returns {boolean}
   */
  function isDueSoon(dateStr) {
    if (!dateStr) return false;
    const todayStr = today();
    const targetDate = new Date(dateStr + 'T00:00:00');
    const todayDate = new Date(todayStr);
    const diff = Math.floor((targetDate - todayDate) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 2;
  }

  /**
   * Format time 25:00 style from seconds
   * @param {number} seconds
   * @returns {string}
   */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /**
   * Get greeting based on time of day
   * @returns {string}
   */
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  }

  /**
   * Get full date label like "Monday, April 21, 2026"
   * @returns {string}
   */
  function getFullDateLabel() {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Get the next N days as date strings
   * @param {number} n
   * @returns {string[]}
   */
  function getNextNDays(n) {
    const days = [];
    for (let i = 1; i <= n; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }

  /**
   * Get last N days as date strings (including today)
   * @param {number} n
   * @returns {string[]}
   */
  function getLastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }

  /**
   * Get the day label for a date string
   * @param {string} dateStr
   * @returns {string}
   */
  function getDayLabel(dateStr) {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    } catch { return dateStr; }
  }

  // ---- String Utilities ----
  /**
   * Truncate a string
   * @param {string} str
   * @param {number} max
   * @returns {string}
   */
  function truncate(str, max = 60) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '…' : str;
  }

  /**
   * Escape HTML special characters
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Capitalize first letter
   * @param {string} str
   * @returns {string}
   */
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ---- DOM Utilities ----
  /**
   * Query selector helper
   * @param {string} selector
   * @param {Element} parent
   * @returns {Element}
   */
  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  /**
   * Query selector all helper
   * @param {string} selector
   * @param {Element} parent
   * @returns {NodeList}
   */
  function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
  }

  /**
   * Create an element with attributes and children
   * @param {string} tag
   * @param {Object} attrs
   * @param {string|Element[]} children
   * @returns {Element}
   */
  function createElement(tag, attrs = {}, children = '') {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v);
    });
    if (typeof children === 'string') el.innerHTML += children;
    else if (Array.isArray(children)) children.forEach(c => c && el.appendChild(c));
    return el;
  }

  /**
   * Debounce a function
   * @param {Function} fn
   * @param {number} wait
   * @returns {Function}
   */
  function debounce(fn, wait = 300) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /**
   * Throttle a function
   * @param {Function} fn
   * @param {number} limit
   * @returns {Function}
   */
  function throttle(fn, limit = 100) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ---- Array Utilities ----
  /**
   * Deep clone an object
   * @param {*} obj
   * @returns {*}
   */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Group array by a key
   * @param {Array} arr
   * @param {string} key
   * @returns {Object}
   */
  function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      const k = item[key];
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  }

  /**
   * Sort tasks by priority weight
   * @param {string} priority
   * @returns {number}
   */
  function priorityWeight(priority) {
    return { high: 3, medium: 2, low: 1 }[priority] || 0;
  }

  // ---- Priority / Category Helpers ----
  function getPriorityEmoji(priority) {
    return { high: '🔴', medium: '🟡', low: '🟢' }[priority] || '⚪';
  }

  function getCategoryEmoji(category) {
    return { work: '💼', personal: '👤', fitness: '💪', study: '📚' }[category] || '📌';
  }

  function getCategoryColor(category) {
    const colors = {
      work:     'var(--cat-work)',
      personal: 'var(--cat-personal)',
      fitness:  'var(--cat-fitness)',
      study:    'var(--cat-study)',
    };
    return colors[category] || 'var(--text-muted)';
  }

  // ---- Random Helpers ----
  /**
   * Pick a random item from an array
   */
  function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  return {
    generateId,
    today, formatDate, formatRelativeDate, isOverdue, isDueSoon,
    formatTime, getGreeting, getFullDateLabel, getNextNDays, getLastNDays, getDayLabel,
    truncate, escapeHtml, capitalize,
    $, $$, createElement, debounce, throttle,
    deepClone, groupBy, priorityWeight,
    getPriorityEmoji, getCategoryEmoji, getCategoryColor,
    randomPick,
  };
})();
