/**
 * search.js — Global Search Module
 */

const Search = (() => {
  let _debounced = null;

  function init() {
    const input   = document.getElementById('global-search');
    const barWrap = document.querySelector('.topbar-center');

    if (!input) return;

    _debounced = Utils.debounce(_onSearch, 280);

    input.addEventListener('input', _debounced);
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        input.value = '';
        _onSearch();
        input.blur();
      }
    });

    // ⌘K shortcut to focus search
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  function _onSearch() {
    const query = document.getElementById('global-search')?.value?.trim() || '';
    AppState.setSearch(query);
    AppState.emit('search:execute', query);
  }

  return { init };
})();
