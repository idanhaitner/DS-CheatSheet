(function () {
  var root = document.documentElement;

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('ds-theme', theme);
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.textContent = theme === 'light' ? 'Dark mode' : 'Light mode';
    });
  }

  var saved = localStorage.getItem('ds-theme');
  if (saved === 'light' || saved === 'dark') apply(saved);
  else if (window.matchMedia('(prefers-color-scheme: light)').matches) apply('light');
  else apply('dark');

  function injectToggle() {
    if (document.querySelector('.theme-toggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.textContent = root.getAttribute('data-theme') === 'light' ? 'Dark mode' : 'Light mode';
    btn.onclick = function () {
      apply(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    };
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      var nav = sidebar.querySelector('nav');
      if (nav) sidebar.insertBefore(btn, nav);
      else sidebar.appendChild(btn);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectToggle);
  else injectToggle();
})();
