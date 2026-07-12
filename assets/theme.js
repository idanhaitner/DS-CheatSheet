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

  function getHeadings() {
    var inner = document.querySelector('main.content .inner');
    if (!inner) return [];
    return Array.prototype.slice.call(inner.querySelectorAll('h2.section')).filter(function (h) {
      if (!h.id) {
        h.id = 'sec-' + (h.textContent || 'section').toLowerCase()
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      }
      return !!h.id;
    });
  }

  function injectProgress() {
    if (document.querySelector('.read-progress')) return;
    var bar = document.createElement('div');
    bar.className = 'read-progress';
    bar.innerHTML = '<div class="read-progress-fill"></div>';
    document.body.appendChild(bar);
    var fill = bar.firstChild;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  function tocLabel(h2) {
    var clone = h2.cloneNode(true);
    var tags = clone.querySelectorAll('.tag');
    var extras = [];
    Array.prototype.forEach.call(tags, function (tag) {
      var t = (tag.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) extras.push(t);
      tag.remove();
    });
    var title = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    return { title: title, extras: extras };
  }

  function injectDocsToc() {
    var headings = getHeadings();
    if (headings.length < 2) return;
    if (document.querySelector('.docs-toc')) return;

    document.body.classList.add('has-docs-toc');

    var aside = document.createElement('aside');
    aside.className = 'docs-toc';
    aside.setAttribute('aria-label', 'On this page');
    aside.innerHTML =
      '<div class="docs-toc-card">' +
      '<div class="docs-toc-title">On this page</div>' +
      '</div>';
    var card = aside.firstChild;
    var list = document.createElement('nav');
    list.className = 'docs-toc-nav';

    headings.forEach(function (h2) {
      var meta = tocLabel(h2);
      var a = document.createElement('a');
      a.href = '#' + h2.id;
      a.className = 'docs-toc-link';
      var title = document.createElement('span');
      title.className = 'docs-toc-link-title';
      title.textContent = meta.title;
      a.appendChild(title);
      if (meta.extras.length) {
        var badge = document.createElement('span');
        badge.className = 'docs-toc-link-meta';
        badge.textContent = meta.extras.join(' · ');
        a.appendChild(badge);
      }
      a.addEventListener('click', function (e) {
        e.preventDefault();
        history.replaceState(null, '', '#' + h2.id);
        h2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(h2.id);
      });
      list.appendChild(a);
    });
    card.appendChild(list);
    document.body.appendChild(aside);

    var jumper = document.createElement('div');
    jumper.className = 'docs-toc-mobile';
    var label = document.createElement('label');
    label.innerHTML = '<span class="docs-toc-mobile-label">On this page</span>';
    var sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Jump to section');
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = 'Jump to section…';
    sel.appendChild(opt0);
    headings.forEach(function (h2) {
      var meta = tocLabel(h2);
      var opt = document.createElement('option');
      opt.value = h2.id;
      opt.textContent = meta.extras.length
        ? meta.title + ' (' + meta.extras.join(', ') + ')'
        : meta.title;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      if (!sel.value) return;
      var h2 = document.getElementById(sel.value);
      if (!h2) return;
      history.replaceState(null, '', '#' + sel.value);
      h2.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(sel.value);
    });
    label.appendChild(sel);
    jumper.appendChild(label);
    var pagehead = document.querySelector('.pagehead');
    if (pagehead && pagehead.parentNode) {
      pagehead.parentNode.insertBefore(jumper, pagehead.nextSibling);
    }

    function setActive(id) {
      list.querySelectorAll('a').forEach(function (a) {
        a.classList.toggle('active', (a.getAttribute('href') || '') === '#' + id);
      });
      if (sel.value !== id) sel.value = id || '';
    }

    function onScroll() {
      var y = window.scrollY + 110;
      var current = headings[0].id;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].offsetTop <= y) current = headings[i].id;
      }
      setActive(current);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function injectBackTop() {
    if (document.querySelector('.backtop')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'backtop';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<span aria-hidden="true">↑</span>';
    btn.onclick = function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.body.appendChild(btn);
    window.addEventListener('scroll', function () {
      btn.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
  }

  function openHash() {
    var id = (location.hash || '').replace(/^#/, '');
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    setTimeout(function () {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  function initChrome() {
    injectToggle();
    injectFooter();
    injectProgress();
    injectDocsToc();
    injectBackTop();
    openHash();
    window.addEventListener('hashchange', openHash);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChrome);
  else initChrome();
})();
