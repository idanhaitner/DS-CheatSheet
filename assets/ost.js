/* Order-statistic tree animator: Select(i) and Rank(k) — clean layout */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  var DEMO_KEYS = [1, 2, 3, 5, 8, 9, 20];
  var ROW_DY = 78;
  var COL_DX = 72;

  var NCOL = {
    normal: { fill: '#3f51b5', stroke: '#5c6bc0', text: '#fff' },
    path: { fill: '#5c6bc0', stroke: '#7c9cff', text: '#fff' },
    current: { fill: '#c0533f', stroke: '#ff6b81', text: '#fff' },
    found: { fill: '#2f8f5f', stroke: '#57e0c0', text: '#fff' },
    skip: { fill: '#455a9e', stroke: '#64748b', text: '#fff' }
  };
  var ECOL = { def: '#4a5580', active: '#57e0c0' };

  var SELECT_LINES = [
    'Select(node, i):              // i-th smallest, i ≥ 1',
    '  curr = left.size + 1        // 1-based rank of this node in its subtree',
    '  if i == curr: return node',
    '  if i < curr:  go left (same i)',
    '  else: go right with i - curr'
  ];
  var RANK_LINES = [
    'Rank(node, k, smaller):',
    '  // start call: Rank(root, k, 0)',
    '  if key == k: return smaller + left.size + 1',
    '  if k < key:  Rank(left,  k, smaller)',
    '  else:        Rank(right, k, smaller + left.size + 1)'
  ];

  function sizeOf(n) { return n ? n.size : 0; }

  function updateSize(n) {
    if (!n) return;
    n.size = 1 + sizeOf(n.left) + sizeOf(n.right);
  }

  function buildBalanced(keys, lo, hi) {
    if (lo > hi) return null;
    var mid = (lo + hi) >> 1;
    var n = {
      key: keys[mid],
      left: buildBalanced(keys, lo, mid - 1),
      right: buildBalanced(keys, mid + 1, hi),
      size: 0
    };
    updateSize(n);
    return n;
  }

  function inorder(n, out) {
    if (!n) return out;
    inorder(n.left, out);
    out.push(n.key);
    inorder(n.right, out);
    return out;
  }

  function layout(root, hi) {
    var nodes = [];
    var edges = [];
    var pathSet = {};
    (hi.path || []).forEach(function (k) { pathSet[k] = true; });
    var skipSet = {};
    (hi.skip || []).forEach(function (k) { skipSet[k] = true; });

    function role(k) {
      if (hi.found === k) return 'found';
      if (hi.current === k) return 'current';
      if (skipSet[k]) return 'skip';
      if (pathSet[k]) return 'path';
      return 'normal';
    }

    var order = 0;
    function place(n, depth) {
      if (!n) return;
      place(n.left, depth + 1);
      n._x = 40 + order * COL_DX;
      n._y = 32 + depth * ROW_DY;
      order++;
      place(n.right, depth + 1);
    }
    place(root, 0);

    function collect(n, parentId) {
      if (!n) return;
      var id = 'k' + n.key;
      nodes.push({
        id: id,
        key: n.key,
        label: String(n.key),
        size: n.size,
        x: n._x,
        y: n._y,
        role: role(n.key),
        leftSize: sizeOf(n.left)
      });
      if (parentId) edges.push([parentId, id]);
      collect(n.left, id);
      collect(n.right, id);
    }
    collect(root, null);
    return { nodes: nodes, edges: edges };
  }

  function collectSubtreeKeys(n, out) {
    if (!n) return out;
    out.push(n.key);
    collectSubtreeKeys(n.left, out);
    collectSubtreeKeys(n.right, out);
    return out;
  }

  function frame(desc, root, hi, line, orderHi) {
    var lay = layout(root, hi || {});
    return {
      desc: desc,
      line: line == null ? -1 : line,
      nodes: lay.nodes,
      edges: lay.edges,
      orderHi: orderHi || {},
      hi: hi || {}
    };
  }

  function genSelect(root, i) {
    var frames = [];
    var sorted = inorder(root, []);
    var n = sizeOf(root);
    var path = [];
    var i0 = i;

    if (i < 1 || i > n) {
      frames.push(frame(
        'Need <b>1 ≤ i ≤ ' + n + '</b> (tree has ' + n + ' keys).',
        root, {}, -1, {}
      ));
      return frames;
    }

    frames.push(frame(
      'Select(<b>i = ' + i + '</b>) → expect <b>' + sorted[i - 1] + '</b>. Start at root.',
      root, {}, 0, { target: i }
    ));

    function go(node, rank) {
      if (!node) return;
      path.push(node.key);
      var curr = sizeOf(node.left) + 1;
      var hi = { path: path.slice(), current: node.key };

      frames.push(frame(
        'At <b>' + node.key + '</b>: curr = left.size + 1 = <b>' + curr + '</b>, compare to i = <b>' + rank + '</b>.',
        root, hi, 1, { target: i0, focus: node.key, curr: curr, localI: rank }
      ));

      if (rank === curr) {
        frames.push(frame(
          '<b>i == curr</b> → found <b>' + node.key + '</b>.',
          root, { path: path.slice(), found: node.key, current: node.key },
          2, { target: i0, found: node.key, done: true }
        ));
        return;
      }

      if (rank < curr) {
        frames.push(frame(
          '<b>i &lt; curr</b> → go left (keep i = ' + rank + ').',
          root, { path: path.slice(), current: node.key, skip: collectSubtreeKeys(node.right, [node.key]) },
          3, { target: i0, focus: node.key, go: 'left' }
        ));
        go(node.left, rank);
      } else {
        var nextI = rank - curr;
        frames.push(frame(
          '<b>i &gt; curr</b> → go right with i′ = ' + rank + ' − ' + curr + ' = <b>' + nextI + '</b>.',
          root, { path: path.slice(), current: node.key, skip: collectSubtreeKeys(node.left, [node.key]) },
          4, { target: i0, focus: node.key, go: 'right', nextI: nextI }
        ));
        go(node.right, nextI);
      }
    }

    go(root, i);
    return frames;
  }

  function genRank(root, k) {
    var frames = [];
    var sorted = inorder(root, []);
    var path = [];
    var expected = sorted.indexOf(k) + 1;

    if (expected < 1) {
      frames.push(frame('Key <b>' + k + '</b> is not in the tree.', root, {}, -1, {}));
      return frames;
    }

    frames.push(frame(
      'Rank(<b>k = ' + k + '</b>). Start with <b>smaller = 0</b> (no keys counted yet). Expect rank <b>' + expected + '</b>.',
      root, {}, 1, { targetKey: k, target: expected, acc: 0 }
    ));

    function go(node, smaller) {
      if (!node) return;
      path.push(node.key);
      var leftSz = sizeOf(node.left);
      var hi = { path: path.slice(), current: node.key };

      frames.push(frame(
        'At <b>' + node.key + '</b>. So far <b>smaller = ' + smaller + '</b> (keys already known &lt; ' + k + '). left.size = ' + leftSz + '.',
        root, hi, 0, { targetKey: k, target: expected, focus: node.key, acc: smaller }
      ));

      if (node.key === k) {
        var result = smaller + leftSz + 1;
        frames.push(frame(
          '<b>key == k</b> → return smaller + left.size + 1 = ' + smaller + ' + ' + leftSz + ' + 1 = <b>' + result + '</b>.',
          root, { path: path.slice(), found: node.key, current: node.key },
          2, { targetKey: k, target: expected, found: node.key, done: true, result: result, acc: result - 1 }
        ));
        return;
      }

      if (k < node.key) {
        frames.push(frame(
          '<b>k &lt; key</b> → go left. <b>smaller stays ' + smaller + '</b> (do not count this node or its right side).',
          root, { path: path.slice(), current: node.key, skip: collectSubtreeKeys(node.right, []) },
          3, { targetKey: k, target: expected, focus: node.key, go: 'left', acc: smaller }
        ));
        go(node.left, smaller);
      } else {
        var add = leftSz + 1;
        var next = smaller + add;
        frames.push(frame(
          '<b>k &gt; key</b> → go right. Update <b>smaller := ' + smaller + ' + ' + leftSz + ' + 1 = ' + next + '</b> ' +
          '(add left subtree + this node; both are &lt; k).',
          root, { path: path.slice(), current: node.key, skip: collectSubtreeKeys(node.left, []) },
          4, { targetKey: k, target: expected, focus: node.key, go: 'right', acc: next, add: add }
        ));
        go(node.right, next);
      }
    }

    go(root, 0);
    return frames;
  }

  function bounds(fr) {
    if (!fr.nodes.length) return { x: 0, y: 0, w: 320, h: 180 };
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    fr.nodes.forEach(function (n) {
      minX = Math.min(minX, n.x - 26);
      maxX = Math.max(maxX, n.x + 26);
      minY = Math.min(minY, n.y - 28);
      maxY = Math.max(maxY, n.y + 28);
    });
    return { x: minX - 6, y: minY - 6, w: maxX - minX + 12, h: maxY - minY + 12 };
  }

  function drawFrame(svg, fr) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!fr.nodes.length) {
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', '160'); t.setAttribute('y', '90');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', '#7c8aa8');
      t.setAttribute('font-size', '14'); t.textContent = '(empty tree)';
      svg.appendChild(t);
      return;
    }

    var nm = {};
    fr.nodes.forEach(function (n) { nm[n.id] = n; });

    fr.edges.forEach(function (e) {
      var a = nm[e[0]], b = nm[e[1]];
      if (!a || !b) return;
      var active = a.role === 'current' || b.role === 'current' ||
        a.role === 'found' || b.role === 'found' ||
        a.role === 'path' || b.role === 'path';
      var ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y + 18);
      ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y - 18);
      ln.setAttribute('stroke', active ? ECOL.active : ECOL.def);
      ln.setAttribute('stroke-width', active ? '2.5' : '2');
      svg.appendChild(ln);
    });

    fr.nodes.forEach(function (n) {
      var col = NCOL[n.role] || NCOL.normal;
      var g = document.createElementNS(SVGNS, 'g');
      if (n.role === 'skip') g.setAttribute('opacity', '0.4');

      if (n.role === 'current' || n.role === 'found') {
        var ring = document.createElementNS(SVGNS, 'circle');
        ring.setAttribute('cx', n.x); ring.setAttribute('cy', n.y);
        ring.setAttribute('r', '24');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', n.role === 'found' ? '#57e0c0' : '#ff6b81');
        ring.setAttribute('stroke-width', '2');
        ring.setAttribute('stroke-dasharray', '5 4');
        g.appendChild(ring);
      }

      var c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', n.x); c.setAttribute('cy', n.y);
      c.setAttribute('r', '18');
      c.setAttribute('fill', col.fill);
      c.setAttribute('stroke', col.stroke);
      c.setAttribute('stroke-width', '2');
      g.appendChild(c);

      var label = document.createElementNS(SVGNS, 'text');
      label.setAttribute('x', n.x); label.setAttribute('y', n.y + 5);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', col.text);
      label.setAttribute('font-size', '14');
      label.setAttribute('font-weight', '700');
      label.setAttribute('font-family', FONT);
      label.textContent = n.label;
      g.appendChild(label);

      /* compact size badge on the node (SE corner) */
      var bx = n.x + 13;
      var by = n.y + 13;
      var badge = document.createElementNS(SVGNS, 'circle');
      badge.setAttribute('cx', bx); badge.setAttribute('cy', by);
      badge.setAttribute('r', '9');
      badge.setAttribute('class', 'ost-size-badge');
      badge.setAttribute('fill', n.role === 'found' ? '#1a7a55' : '#1a1f33');
      badge.setAttribute('stroke', n.role === 'found' ? '#57e0c0' : '#7c9cff');
      badge.setAttribute('stroke-width', '1.5');
      g.appendChild(badge);
      var bt = document.createElementNS(SVGNS, 'text');
      bt.setAttribute('x', bx); bt.setAttribute('y', by + 3.5);
      bt.setAttribute('text-anchor', 'middle');
      bt.setAttribute('fill', '#e8ecff');
      bt.setAttribute('font-size', '9');
      bt.setAttribute('font-weight', '800');
      bt.setAttribute('font-family', FONT);
      bt.textContent = String(n.size);
      g.appendChild(bt);

      svg.appendChild(g);
    });
  }

  function renderCode(box, lines, active) {
    if (!box) return;
    if (window.renderVizCodeLines) {
      var els = window.renderVizCodeLines(box, lines);
      els.forEach(function (el, i) {
        el.classList.toggle('active', i === active);
      });
      return;
    }
    box.innerHTML = lines.map(function (ln, i) {
      return '<div class="ln' + (i === active ? ' active' : '') + '">' + ln.replace(/</g, '&lt;') + '</div>';
    }).join('');
  }

  function renderOrderStrip(el, sorted, orderHi) {
    if (!el) return;
    var accLabel = (orderHi.acc != null)
      ? ' · smaller = ' + orderHi.acc + (orderHi.done && orderHi.result != null ? ' → rank ' + orderHi.result : '')
      : '';
    el.innerHTML = '<span class="ost-order-label">sorted' + accLabel + '</span>';
    var row = document.createElement('div');
    row.className = 'ost-order-row';
    sorted.forEach(function (key, i) {
      var rank = i + 1;
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'ost-order-cell';
      cell.title = 'rank ' + rank;
      if (orderHi.target === rank) cell.classList.add('is-target');
      if (orderHi.found === key) cell.classList.add('is-found');
      if (orderHi.focus === key) cell.classList.add('is-focus');
      /* Keys already counted into r (strictly smaller than k so far). */
      if (orderHi.acc != null && rank <= orderHi.acc) {
        cell.classList.add('is-smaller');
      }
      if (orderHi.done && orderHi.result != null && rank === orderHi.result) {
        cell.classList.add('is-found');
      }
      if (orderHi.targetKey === key) cell.classList.add('is-target-key');
      cell.innerHTML = '<i>' + rank + '</i><b>' + key + '</b>';
      row.appendChild(cell);
    });
    el.appendChild(row);
  }

  function createOst(wrap) {
    var $ = function (sel) { return wrap.querySelector(sel); };
    var stage = $('.tree-stage');
    var strip = $('.ost-order-strip');
    var codeBox = $('.viz-code');
    var tree = buildBalanced(DEMO_KEYS, 0, DEMO_KEYS.length - 1);
    var sorted = DEMO_KEYS.slice();
    var frames = [];
    var idx = 0;
    var playing = false;
    var rafId = null;
    var accum = 0;
    var lastTs = 0;
    var currentMode = 'select';

    function syncArgLabel() {
      var lbl = $('.viz-arg-label');
      var inp = $('.viz-arg');
      if (!lbl || !inp) return;
      var prefix = lbl.querySelector('.ost-arg-prefix');
      if (!prefix) {
        prefix = document.createElement('span');
        prefix.className = 'ost-arg-prefix';
        lbl.insertBefore(prefix, inp);
      }
      if (currentMode === 'select') {
        prefix.textContent = 'i';
        inp.min = '1';
        inp.max = String(Math.max(1, sizeOf(tree)));
        if (parseInt(inp.value, 10) < 1 || parseInt(inp.value, 10) > sizeOf(tree)) inp.value = '3';
      } else {
        prefix.textContent = 'k';
        inp.min = '1';
        inp.max = '99';
        if (parseInt(inp.value, 10) < 1) inp.value = '5';
      }
    }

    function setMode(m) {
      currentMode = m;
      wrap.querySelectorAll('.ost-mode-btn').forEach(function (btn) {
        btn.classList.toggle('is-on', btn.getAttribute('data-mode') === m);
      });
      syncArgLabel();
      showIdle();
    }

    function showIdle() {
      frames = [frame(
        'Press <b>Run</b>. Red = current · teal = found · badge = size.',
        tree, {}, -1, {}
      )];
      idx = 0;
      paint();
    }

    function paint() {
      var fr = frames[Math.min(idx, frames.length - 1)];
      var svg = stage.querySelector('svg');
      if (!svg) {
        svg = document.createElementNS(SVGNS, 'svg');
        svg.setAttribute('width', '100%');
        svg.classList.add('tree-viz-svg');
        stage.innerHTML = '';
        stage.appendChild(svg);
      }
      drawFrame(svg, fr);
      var b = bounds(fr);
      svg.setAttribute('viewBox', b.x + ' ' + b.y + ' ' + b.w + ' ' + b.h);
      var h = Math.min(360, Math.max(220, Math.round(Math.min(stage.clientWidth || 480, 560) * (b.h / Math.max(b.w, 1)))));
      svg.setAttribute('height', String(h));

      var descEl = $('.viz-desc');
      var stepEl = $('.viz-step');
      var totalEl = $('.viz-total');
      if (descEl) descEl.innerHTML = fr.desc;
      if (stepEl) stepEl.textContent = idx;
      if (totalEl) totalEl.textContent = Math.max(0, frames.length - 1);

      renderOrderStrip(strip, sorted, fr.orderHi || {});
      renderCode(codeBox, currentMode === 'rank' ? RANK_LINES : SELECT_LINES, fr.line);
    }

    function halt() {
      playing = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      accum = 0;
      lastTs = 0;
      var btn = $('.viz-run');
      if (btn && !btn.dataset.busy) btn.textContent = '▶ Run';
    }

    function speedMs() {
      var el = $('.viz-speed');
      var v = el ? parseInt(el.value, 10) : 1200;
      return Math.max(320, 1500 - v * 0.65);
    }

    function tick(ts) {
      if (!playing) return;
      if (!lastTs) lastTs = ts;
      accum += ts - lastTs;
      lastTs = ts;
      var dur = speedMs();
      while (accum >= dur && idx < frames.length - 1) {
        accum -= dur;
        idx++;
        paint();
      }
      if (idx >= frames.length - 1) {
        halt();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function startPlay() {
      if (frames.length <= 1 || idx >= frames.length - 1) return;
      playing = true;
      var btn = $('.viz-run');
      if (btn) btn.textContent = '⏸ Pause';
      lastTs = 0;
      accum = 0;
      rafId = requestAnimationFrame(tick);
    }

    function run() {
      if (playing) { halt(); return; }
      if (frames.length > 1 && idx > 0 && idx < frames.length - 1) {
        startPlay();
        return;
      }
      var arg = parseInt($('.viz-arg').value, 10);
      if (isNaN(arg)) {
        frames = [frame('Enter a valid number.', tree, {}, -1, {})];
        idx = 0;
        paint();
        return;
      }
      frames = currentMode === 'rank' ? genRank(tree, arg) : genSelect(tree, arg);
      idx = 0;
      paint();
      if (frames.length > 1) startPlay();
    }

    function step(dir) {
      halt();
      if (!frames.length) showIdle();
      idx = Math.min(frames.length - 1, Math.max(0, idx + dir));
      paint();
    }

    wrap.querySelectorAll('.ost-mode-btn').forEach(function (btn) {
      btn.onclick = function () { halt(); setMode(btn.getAttribute('data-mode')); };
    });

    $('.viz-run').onclick = run;
    $('.viz-next').onclick = function () { step(1); };
    $('.viz-prev').onclick = function () { step(-1); };
    $('.viz-reset').onclick = function () {
      halt();
      tree = buildBalanced(DEMO_KEYS, 0, DEMO_KEYS.length - 1);
      sorted = DEMO_KEYS.slice();
      syncArgLabel();
      showIdle();
    };
    $('.viz-arg').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    strip.addEventListener('click', function (e) {
      var cell = e.target.closest('.ost-order-cell');
      if (!cell) return;
      var cells = Array.prototype.slice.call(strip.querySelectorAll('.ost-order-cell'));
      var i = cells.indexOf(cell);
      if (i < 0) return;
      halt();
      if (currentMode === 'select') {
        $('.viz-arg').value = String(i + 1);
      } else {
        setMode('rank');
        $('.viz-arg').value = String(sorted[i]);
      }
      run();
    });
    $('.viz-speed').oninput = function () {
      if (!playing) return;
      var at = idx;
      halt();
      idx = at;
      startPlay();
    };

    syncArgLabel();
    showIdle();
  }

  function init() {
    document.querySelectorAll('.ost-viz-wrap').forEach(createOst);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
