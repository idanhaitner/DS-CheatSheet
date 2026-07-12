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

  function parseSectionNum(title) {
    var m = /^(\d+(?:\.\d+)*)\b/.exec(title || '');
    if (!m) return null;
    return m[1];
  }

  function buildTocTree(headings) {
    var roots = [];
    var stack = [];
    var lastGroup = null;

    headings.forEach(function (h2) {
      var meta = tocLabel(h2);
      var num = parseSectionNum(meta.title);
      var node = {
        el: h2,
        id: h2.id,
        title: meta.title,
        extras: meta.extras,
        num: num,
        depth: num ? num.split('.').length : 0,
        children: []
      };

      if (num) {
        while (stack.length && stack[stack.length - 1].depth >= node.depth) {
          stack.pop();
        }
        if (stack.length) stack[stack.length - 1].children.push(node);
        else roots.push(node);
        stack.push(node);
        if (node.depth <= 2) lastGroup = node;
      } else if (lastGroup) {
        lastGroup.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  function flattenToc(nodes, depth, out) {
    depth = depth || 0;
    out = out || [];
    nodes.forEach(function (n) {
      out.push({ node: n, depth: depth });
      if (n.children && n.children.length) flattenToc(n.children, depth + 1, out);
    });
    return out;
  }

  function makeTocLink(node, depth, onNavigate) {
    var a = document.createElement('a');
    a.href = '#' + node.id;
    a.className = 'docs-toc-link' + (depth ? ' docs-toc-link--sub' : '');
    a.dataset.depth = String(depth || 0);
    if (depth) a.style.setProperty('--toc-depth', String(depth));

    var title = document.createElement('span');
    title.className = 'docs-toc-link-title';
    title.textContent = node.title;
    a.appendChild(title);
    if (node.extras.length) {
      var badge = document.createElement('span');
      badge.className = 'docs-toc-link-meta';
      badge.textContent = node.extras.join(' · ');
      a.appendChild(badge);
    }
    a.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      onNavigate(node);
    });
    return a;
  }

  function loadTocGroupState() {
    try {
      return JSON.parse(localStorage.getItem('ds-toc-groups-v2') || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveTocGroupState(id, open) {
    var state = loadTocGroupState();
    state[id] = open ? 1 : 0;
    localStorage.setItem('ds-toc-groups-v2', JSON.stringify(state));
  }

  function renderTocTree(nodes, container, depth, onNavigate, groupState) {
    depth = depth || 0;
    groupState = groupState || {};
    nodes.forEach(function (node) {
      if (node.children && node.children.length) {
        var group = document.createElement('details');
        group.className = 'docs-toc-group' + (depth ? ' docs-toc-group--nested' : '');
        group.dataset.tocId = node.id;
        group.open = groupState[node.id] === 1;

        var summary = document.createElement('summary');
        summary.className = 'docs-toc-group-summary';
        summary.appendChild(makeTocLink(node, depth, onNavigate));
        var chev = document.createElement('span');
        chev.className = 'docs-toc-group-chevron';
        chev.setAttribute('aria-hidden', 'true');
        summary.appendChild(chev);
        group.appendChild(summary);

        var kids = document.createElement('div');
        kids.className = 'docs-toc-children';
        renderTocTree(node.children, kids, depth + 1, onNavigate, groupState);
        group.appendChild(kids);

        group.addEventListener('toggle', function () {
          saveTocGroupState(node.id, group.open);
        });
        container.appendChild(group);
      } else {
        container.appendChild(makeTocLink(node, depth, onNavigate));
      }
    });
  }

  function injectDocsToc() {
    var headings = getHeadings();
    if (headings.length < 2) return;

    var sidebarNav = document.querySelector('.sidebar nav');
    var activeLink = sidebarNav && sidebarNav.querySelector('a.active');
    if (!activeLink || document.querySelector('.sidebar-page')) return;

    var tree = buildTocTree(headings);
    var flat = flattenToc(tree);

    /* Wrap the current chapter link so it unfolds to page sections. */
    var page = document.createElement('details');
    page.className = 'sidebar-page';
    page.open = localStorage.getItem('ds-sidebar-toc-open') !== '0';

    var summary = document.createElement('summary');
    summary.className = 'sidebar-page-summary';
    activeLink.parentNode.insertBefore(page, activeLink);
    summary.appendChild(activeLink);
    /* Chapter link navigates; chevron / summary toggles unfold. */
    activeLink.addEventListener('click', function (e) {
      e.stopPropagation();
    });
    var chev = document.createElement('span');
    chev.className = 'sidebar-page-chevron';
    chev.setAttribute('aria-hidden', 'true');
    summary.appendChild(chev);
    page.appendChild(summary);

    page.addEventListener('toggle', function () {
      localStorage.setItem('ds-sidebar-toc-open', page.open ? '1' : '0');
    });

    var list = document.createElement('nav');
    list.className = 'subnav sidebar-toc';
    list.setAttribute('aria-label', 'On this page');

    function navigateTo(node) {
      history.replaceState(null, '', '#' + node.id);
      node.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(node.id);
      /* Keep mobile menu usable after jump */
      var sidebar = document.getElementById('sidebar');
      if (sidebar && window.matchMedia('(max-width: 900px)').matches) {
        sidebar.classList.remove('open');
      }
    }

    renderTocTree(tree, list, 0, navigateTo, loadTocGroupState());
    page.appendChild(list);

    /* Compact jump select for very small screens (sidebar closed). */
    if (!document.querySelector('.docs-toc-mobile')) {
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
      flat.forEach(function (item) {
        var n = item.node;
        var pad = item.depth ? new Array(item.depth + 1).join('··') + ' ' : '';
        var opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = pad + (n.extras.length
          ? n.title + ' (' + n.extras.join(', ') + ')'
          : n.title);
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
    }

    var sel = document.querySelector('.docs-toc-mobile select');

    function setActive(id) {
      list.querySelectorAll('a').forEach(function (a) {
        a.classList.toggle('active', (a.getAttribute('href') || '') === '#' + id);
      });
      list.querySelectorAll('details.docs-toc-group').forEach(function (g) {
        var childActive = !!g.querySelector('.docs-toc-children a.active');
        var selfActive = !!g.querySelector(':scope > .docs-toc-group-summary > a.active');
        g.classList.toggle('has-active', childActive || selfActive);
        if (childActive || selfActive) g.open = true;
      });
      if (sel && sel.value !== id) sel.value = id || '';
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
