(function () {
  var root = document.documentElement;
  var STORAGE_KEY = 'ds-folds-collapsed';

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

  function injectFooter() {
    if (document.querySelector('.site-footer')) return;
    var main = document.querySelector('main.content');
    if (!main) return;
    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = '<p><span class="copy-mark" aria-hidden="true">&copy;</span> ' +
      new Date().getFullYear() + ' Idan Haitner. All rights reserved.</p>';
    main.appendChild(footer);
  }

  function foldSections() {
    var inner = document.querySelector('main.content .inner');
    if (!inner || inner.dataset.foldsReady) return;

    var preferCollapsed = localStorage.getItem(STORAGE_KEY) !== '0';
    var hashId = (location.hash || '').replace(/^#/, '');
    var kids = Array.prototype.slice.call(inner.childNodes);
    var i = 0;
    var made = 0;
    var pendingCollapse = [];

    while (i < kids.length) {
      var el = kids[i];
      if (!(el.matches && el.matches('h2.section'))) {
        i++;
        continue;
      }
      var h2 = el;
      var details = document.createElement('details');
      details.className = 'sec-fold';
      if (h2.id) details.dataset.sectionId = h2.id;

      var summary = document.createElement('summary');
      summary.className = 'sec-fold-summary';
      summary.appendChild(h2);

      var body = document.createElement('div');
      body.className = 'sec-fold-body';

      var j = i + 1;
      while (j < kids.length) {
        var nxt = kids[j];
        if (nxt.matches && nxt.matches('h2.section')) break;
        body.appendChild(nxt);
        j++;
      }

      details.appendChild(summary);
      details.appendChild(body);
      // Start open so visualizers can measure layout, then collapse if preferred.
      details.open = true;
      if (preferCollapsed && !(hashId && h2.id === hashId)) pendingCollapse.push(details);
      details.addEventListener('toggle', function () {
        if (details.open) window.dispatchEvent(new Event('resize'));
      });

      inner.insertBefore(details, kids[j] || null);
      made++;
      i = j;
      kids = Array.prototype.slice.call(inner.childNodes);
    }

    if (made >= 2) {
      inner.dataset.foldsReady = '1';
      if (pendingCollapse.length) {
        setTimeout(function () {
          pendingCollapse.forEach(function (d) { d.open = false; });
        }, 250);
      }
    } else {
      var only = inner.querySelector('.sec-fold');
      if (only) {
        var s = only.querySelector('.sec-fold-summary h2');
        var b = only.querySelector('.sec-fold-body');
        if (s) only.parentNode.insertBefore(s, only);
        if (b) {
          while (b.firstChild) only.parentNode.insertBefore(b.firstChild, only);
        }
        only.remove();
      }
    }
  }

  function injectToolbar() {
    var inner = document.querySelector('main.content .inner');
    if (!inner || !inner.querySelector('.sec-fold')) return;
    if (document.querySelector('.page-tools')) return;

    var tools = document.createElement('div');
    tools.className = 'page-tools';
    tools.innerHTML =
      '<span class="page-tools-label">Sections</span>' +
      '<button type="button" class="page-tool-btn" data-fold="expand">Expand all</button>' +
      '<button type="button" class="page-tool-btn" data-fold="collapse">Collapse all</button>';

    var pagehead = document.querySelector('.pagehead');
    if (pagehead && pagehead.parentNode) {
      pagehead.parentNode.insertBefore(tools, pagehead.nextSibling);
    } else {
      inner.parentNode.insertBefore(tools, inner);
    }

    tools.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-fold]');
      if (!btn) return;
      var open = btn.getAttribute('data-fold') === 'expand';
      localStorage.setItem(STORAGE_KEY, open ? '0' : '1');
      document.querySelectorAll('.sec-fold').forEach(function (d) {
        d.open = open;
      });
      if (open) window.dispatchEvent(new Event('resize'));
    });
  }

  function injectPageToc() {
    var folds = document.querySelectorAll('.sec-fold');
    if (folds.length < 2) return;
    if (document.querySelector('.page-toc')) return;

    var toc = document.createElement('nav');
    toc.className = 'page-toc';
    toc.setAttribute('aria-label', 'On this page');
    var title = document.createElement('div');
    title.className = 'page-toc-title';
    title.textContent = 'On this page';
    toc.appendChild(title);

    var list = document.createElement('div');
    list.className = 'page-toc-links';
    folds.forEach(function (details) {
      var h2 = details.querySelector('h2.section');
      if (!h2) return;
      var id = h2.id || details.dataset.sectionId;
      if (!id) {
        id = 'sec-' + Math.random().toString(36).slice(2, 8);
        h2.id = id;
        details.dataset.sectionId = id;
      }
      var a = document.createElement('a');
      a.href = '#' + id;
      a.textContent = h2.textContent.replace(/\s+/g, ' ').trim();
      a.addEventListener('click', function (e) {
        e.preventDefault();
        details.open = true;
        history.replaceState(null, '', '#' + id);
        h2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.dispatchEvent(new Event('resize'));
        setActiveToc(id);
      });
      list.appendChild(a);
    });
    toc.appendChild(list);

    var tools = document.querySelector('.page-tools');
    if (tools && tools.parentNode) tools.parentNode.insertBefore(toc, tools.nextSibling);
    else {
      var inner = document.querySelector('main.content .inner');
      if (inner) inner.parentNode.insertBefore(toc, inner);
    }

    injectSidebarSubnav(list.cloneNode(true));
  }

  function injectSidebarSubnav(linksClone) {
    var sidebar = document.querySelector('.sidebar nav');
    if (!sidebar || document.querySelector('.sidebar .subnav-page')) return;
    var wrap = document.createElement('div');
    wrap.className = 'subnav subnav-page';
    var label = document.createElement('div');
    label.className = 'subnav-label';
    label.textContent = 'On this page';
    wrap.appendChild(label);
    linksClone.className = 'subnav-links';
    // rebind clicks on clone
    Array.prototype.forEach.call(linksClone.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var id = (a.getAttribute('href') || '').replace(/^#/, '');
        var details = document.querySelector('.sec-fold[data-section-id="' + id + '"]');
        var h2 = document.getElementById(id);
        if (details) details.open = true;
        if (h2) {
          history.replaceState(null, '', '#' + id);
          h2.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.dispatchEvent(new Event('resize'));
          setActiveToc(id);
        }
        document.getElementById('sidebar') &&
          document.getElementById('sidebar').classList.remove('open');
      });
    });
    wrap.appendChild(linksClone);
    sidebar.appendChild(wrap);
  }

  function setActiveToc(id) {
    document.querySelectorAll('.page-toc-links a, .subnav-page a').forEach(function (a) {
      a.classList.toggle('active', (a.getAttribute('href') || '') === '#' + id);
    });
  }

  function watchScrollActive() {
    var folds = document.querySelectorAll('.sec-fold');
    if (!folds.length) return;
    var headings = [];
    folds.forEach(function (d) {
      var h = d.querySelector('h2.section');
      if (h && h.id) headings.push(h);
    });
    if (!headings.length) return;

    function update() {
      var y = window.scrollY + 120;
      var current = headings[0].id;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].offsetTop <= y) current = headings[i].id;
      }
      setActiveToc(current);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function injectBackTop() {
    if (document.querySelector('.backtop')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'backtop';
    btn.setAttribute('aria-label', 'Back to top');
    btn.textContent = '↑ Top';
    btn.onclick = function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.body.appendChild(btn);
    window.addEventListener('scroll', function () {
      btn.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });
  }

  function openHashSection() {
    var id = (location.hash || '').replace(/^#/, '');
    if (!id) return;
    var h2 = document.getElementById(id);
    var details = h2 && h2.closest('.sec-fold');
    if (!details) {
      details = document.querySelector('.sec-fold[data-section-id="' + id + '"]');
    }
    if (details) {
      details.open = true;
      setTimeout(function () {
        var target = document.getElementById(id) || details;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }
  }

  function initChrome() {
    injectToggle();
    injectFooter();
    foldSections();
    injectToolbar();
    injectPageToc();
    injectBackTop();
    watchScrollActive();
    openHashSection();
    window.addEventListener('hashchange', openHashSection);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChrome);
  else initChrome();
})();
