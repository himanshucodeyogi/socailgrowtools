(function () {
  var STORAGE_KEY = 'cb-theme';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
    document.querySelectorAll('.ti-sun').forEach(function (el) {
      el.style.display = theme === 'dark' ? 'block' : 'none';
    });
    document.querySelectorAll('.ti-moon').forEach(function (el) {
      el.style.display = theme === 'light' ? 'block' : 'none';
    });
  }

  window.toggleTheme = function () {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  // Apply on load
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getTheme());
  });
}());
