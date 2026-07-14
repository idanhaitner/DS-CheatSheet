/* Union-Find (Disjoint Sets) animator: Find + Union with optional rank / path compression */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var N = 8;
  var LABELS = 'ABCDEFGH'.split('');

  var CODE = {
    find: [
      'Find(x):',
      '  while parent[x] != x:',
      '    x = parent[x]          // climb',
      '  return x                 // root',
      '  // with path compression:',
      '  parent[node] = root for each on path'
    ],
    union: [
      'Union(x, y):',
      '  rx = Find(x);  ry = Find(y)',
      '  if rx == ry: return      // same set',
      '  // union by rank:',
      '  if rank[rx] < rank[ry]: parent[rx] = ry',
      '  elif rank[rx] > rank[ry]: parent[ry] = rx',
      '  else: parent[ry] = rx; rank[rx]++'
    ]
  };

  function createAnimator(wrap) {
    var $ = function (sel) { return wrap.querySelector(sel); };
    var stage = $('.uf-stage');
    var codeBox = $('.uf-code');
    var tableBox = $('.uf-table');
    var descEl = $('.viz-desc');
    var stepEl = $('.viz-step');
    var totalEl = $('.viz-total');
    if (!stage || !codeBox) return;

    var parent = [];
    var rank = [];
    var frames = [];
    var idx = 0;
    var timer = null;
    var playing = false;
    var mode = 'union';
    var useRank = true;
    var useCompress = true;
    var codeLineEls = [];

    function resetState() {
      parent = [];
      rank = [];
      for (var i = 0; i < N; i++) {
        parent[i] = i;
        rank[i] = 0;
      }
    }

    function cloneArr(a) { return a.slice(); }

    function rec(hi) {
      frames.push({
        parent: cloneArr(parent),
        rank: cloneArr(rank),
        highlight: hi.highlight || {},
        edge: hi.edge || null,
        path: hi.path || [],
        line: hi.line == null ? -1 : hi.line,
        desc: hi.desc || ''
      });
    }

    function findRoot(x, p) {
      while (p[x] !== x) x = p[x];
      return x;
    }

    function genFind(x, compress) {
      var path = [];
      var cur = x;
      rec({
        highlight: { [x]: 'start' },
        path: [x],
        line: 0,
        desc: 'Find(' + LABELS[x] + '): start at ' + LABELS[x] + '.'
      });
      while (parent[cur] !== cur) {
        path.push(cur);
        var nxt = parent[cur];
        rec({
          highlight: { [cur]: 'current', [nxt]: 'path' },
          path: path.concat([nxt]),
          edge: { from: cur, to: nxt },
          line: 2,
          desc: 'Climb: parent[' + LABELS[cur] + '] = ' + LABELS[nxt] + '.'
        });
        cur = nxt;
      }
      path.push(cur);
      rec({
        highlight: { [cur]: 'root' },
        path: path,
        line: 3,
        desc: 'Root found: ' + LABELS[cur] + '.'
      });

      if (compress && path.length > 2) {
        rec({
          highlight: { [cur]: 'root' },
          path: path,
          line: 5,
          desc: 'Path compression: point every node on the path to root ' + LABELS[cur] + '.'
        });
        for (var i = 0; i < path.length - 1; i++) {
          var node = path[i];
          if (parent[node] !== cur) {
            parent[node] = cur;
            rec({
              highlight: { [node]: 'compress', [cur]: 'root' },
              path: path,
              edge: { from: node, to: cur },
              line: 5,
              desc: 'parent[' + LABELS[node] + '] ← ' + LABELS[cur] + '.'
            });
          }
        }
      }
      return cur;
    }

    function genUnion(x, y) {
      rec({
        highlight: { [x]: 'start', [y]: 'start' },
        line: 0,
        desc: 'Union(' + LABELS[x] + ', ' + LABELS[y] + ').'
      });
      var rx = genFind(x, useCompress);
      var ry = genFind(y, useCompress);
      if (rx === ry) {
        rec({
          highlight: { [rx]: 'root' },
          line: 2,
          desc: 'Same root ' + LABELS[rx] + ' — already in one set. Done.'
        });
        return;
      }
      rec({
        highlight: { [rx]: 'root', [ry]: 'root' },
        line: 3,
        desc: 'Roots: ' + LABELS[rx] + ' (rank ' + rank[rx] + ') and ' + LABELS[ry] + ' (rank ' + rank[ry] + ').'
      });

      if (useRank) {
        if (rank[rx] < rank[ry]) {
          parent[rx] = ry;
          rec({
            highlight: { [rx]: 'attach', [ry]: 'root' },
            edge: { from: rx, to: ry },
            line: 4,
            desc: 'rank[' + LABELS[rx] + '] < rank[' + LABELS[ry] + '] → attach ' + LABELS[rx] + ' under ' + LABELS[ry] + '.'
          });
        } else if (rank[rx] > rank[ry]) {
          parent[ry] = rx;
          rec({
            highlight: { [ry]: 'attach', [rx]: 'root' },
            edge: { from: ry, to: rx },
            line: 5,
            desc: 'rank[' + LABELS[rx] + '] > rank[' + LABELS[ry] + '] → attach ' + LABELS[ry] + ' under ' + LABELS[rx] + '.'
          });
        } else {
          parent[ry] = rx;
          rank[rx]++;
          rec({
            highlight: { [ry]: 'attach', [rx]: 'root' },
            edge: { from: ry, to: rx },
            line: 6,
            desc: 'Equal ranks → attach ' + LABELS[ry] + ' under ' + LABELS[rx] + '; rank[' + LABELS[rx] + '] = ' + rank[rx] + '.'
          });
        }
      } else {
        parent[ry] = rx;
        rec({
          highlight: { [ry]: 'attach', [rx]: 'root' },
          edge: { from: ry, to: rx },
          line: 5,
          desc: 'No rank rule → attach ' + LABELS[ry] + ' under ' + LABELS[rx] + '.'
        });
      }
      rec({
        highlight: { [findRoot(x, parent)]: 'root' },
        line: -1,
        desc: 'Union done. Sets merged.'
      });
    }

    function childrenOf(pArr) {
      var kids = [];
      var i;
      for (i = 0; i < N; i++) kids[i] = [];
      for (i = 0; i < N; i++) {
        if (pArr[i] !== i) kids[pArr[i]].push(i);
      }
      return kids;
    }

    function layoutForest(pArr, rankArr) {
      var kids = childrenOf(pArr);
      var roots = [];
      var i;
      for (i = 0; i < N; i++) if (pArr[i] === i) roots.push(i);

      var GAP_X = 72;
      var GAP_Y = 82;
      var treeGap = 40;

      function subtreeWidth(u) {
        if (!kids[u].length) return 1;
        var w = 0;
        kids[u].forEach(function (c) { w += subtreeWidth(c); });
        return Math.max(1, w);
      }

      var nodes = [];
      var cursorX = 44;

      roots.forEach(function (r) {
        var positions = {};
        function place(u, depth, leftSlot) {
          var w = subtreeWidth(u);
          var mid;
          if (!kids[u].length) {
            mid = leftSlot + 0.5;
          } else {
            var at = leftSlot;
            kids[u].forEach(function (c) {
              var cw = subtreeWidth(c);
              place(c, depth + 1, at);
              at += cw;
            });
            mid = leftSlot + w / 2;
          }
          positions[u] = {
            id: u,
            x: cursorX + mid * GAP_X,
            y: 36 + depth * GAP_Y,
            label: LABELS[u]
          };
        }
        place(r, 0, 0);
        Object.keys(positions).forEach(function (k) {
          nodes.push(positions[k]);
        });
        cursorX += subtreeWidth(r) * GAP_X + treeGap;
      });

      var edges = [];
      for (i = 0; i < N; i++) {
        if (pArr[i] !== i) edges.push({ from: i, to: pArr[i] });
      }

      var maxX = 120;
      var maxY = 100;
      nodes.forEach(function (n) {
        if (n.x > maxX) maxX = n.x;
        if (n.y > maxY) maxY = n.y;
      });
      return { nodes: nodes, edges: edges, w: maxX + 56, h: maxY + 56, rankArr: rankArr };
    }

    function renderCode() {
      var lines = CODE[mode] || CODE.union;
      codeBox.innerHTML = lines.map(function (ln, i) {
        return '<div class="ln" data-i="' + i + '">' + ln.replace(/</g, '&lt;') + '</div>';
      }).join('');
      codeLineEls = Array.prototype.slice.call(codeBox.querySelectorAll('.ln'));
    }

    function renderTable(f) {
      if (!tableBox) return;
      var html = '<table class="uf-arrays"><tr><th></th>';
      var i;
      for (i = 0; i < N; i++) html += '<th>' + LABELS[i] + '</th>';
      html += '</tr><tr><th>parent</th>';
      for (i = 0; i < N; i++) {
        var cls = f.highlight[i] ? ' class="hi"' : '';
        html += '<td' + cls + '>' + LABELS[f.parent[i]] + '</td>';
      }
      html += '</tr><tr><th>rank</th>';
      for (i = 0; i < N; i++) {
        html += '<td>' + f.rank[i] + '</td>';
      }
      html += '</tr></table>';
      tableBox.innerHTML = html;
    }

    function render() {
      var f = frames[idx] || {
        parent: parent,
        rank: rank,
        highlight: {},
        path: [],
        edge: null,
        line: -1,
        desc: 'Ready. Pick Find or Union.'
      };
      var lay = layoutForest(f.parent, f.rank);

      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + Math.max(lay.w, 320) + ' ' + Math.max(lay.h, 120));
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', String(Math.max(lay.h, 120)));

      var byId = {};
      lay.nodes.forEach(function (n) { byId[n.id] = n; });

      lay.edges.forEach(function (e) {
        var a = byId[e.from];
        var b = byId[e.to];
        if (!a || !b) return;
        var line = document.createElementNS(SVGNS, 'line');
        line.setAttribute('x1', a.x);
        line.setAttribute('y1', a.y - 16);
        line.setAttribute('x2', b.x);
        line.setAttribute('y2', b.y + 16);
        line.setAttribute('class', 'uf-edge' +
          (f.edge && f.edge.from === e.from && f.edge.to === e.to ? ' is-active' : ''));
        svg.appendChild(line);
      });

      if (f.edge && byId[f.edge.from] && byId[f.edge.to]) {
        var already = lay.edges.some(function (e) {
          return e.from === f.edge.from && e.to === f.edge.to;
        });
        if (!already) {
          var a2 = byId[f.edge.from];
          var b2 = byId[f.edge.to];
          var guide = document.createElementNS(SVGNS, 'line');
          guide.setAttribute('x1', a2.x);
          guide.setAttribute('y1', a2.y - 16);
          guide.setAttribute('x2', b2.x);
          guide.setAttribute('y2', b2.y + 16);
          guide.setAttribute('class', 'uf-edge is-active is-guide');
          svg.appendChild(guide);
        }
      }

      lay.nodes.forEach(function (n) {
        var g = document.createElementNS(SVGNS, 'g');
        g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
        var role = f.highlight[n.id] || 'normal';
        if (!f.highlight[n.id] && f.path.indexOf(n.id) >= 0) role = 'path';
        var circle = document.createElementNS(SVGNS, 'circle');
        circle.setAttribute('r', '18');
        circle.setAttribute('class', 'uf-node uf-node--' + role);
        g.appendChild(circle);
        var text = document.createElementNS(SVGNS, 'text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'uf-node-label');
        text.textContent = n.label;
        g.appendChild(text);
        if (f.parent[n.id] === n.id) {
          var badge = document.createElementNS(SVGNS, 'text');
          badge.setAttribute('y', '32');
          badge.setAttribute('text-anchor', 'middle');
          badge.setAttribute('class', 'uf-rank-badge');
          badge.textContent = 'r=' + f.rank[n.id];
          g.appendChild(badge);
        }
        svg.appendChild(g);
      });

      stage.innerHTML = '';
      stage.appendChild(svg);
      renderTable(f);

      codeLineEls.forEach(function (el, i) {
        el.classList.toggle('active', i === f.line);
      });
      if (descEl) descEl.textContent = f.desc;
      if (stepEl) stepEl.textContent = String(idx);
      if (totalEl) totalEl.textContent = String(Math.max(0, frames.length - 1));
    }

    function stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      var btn = $('.uf-play');
      if (btn) btn.textContent = '▶ Play';
    }

    function buildFrames(op) {
      stop();
      frames = [];
      idx = 0;
      if (op === 'find') {
        var x = parseInt(($('.uf-x') || {}).value, 10);
        if (isNaN(x)) x = 0;
        genFind(x, useCompress);
      } else if (op === 'union') {
        var a = parseInt(($('.uf-x') || {}).value, 10);
        var b = parseInt(($('.uf-y') || {}).value, 10);
        if (isNaN(a)) a = 0;
        if (isNaN(b)) b = 1;
        genUnion(a, b);
      } else if (op === 'idle') {
        rec({ desc: 'Forest ready. Choose Find or Union and press Run.', line: -1 });
      }
      render();
    }

    function runOp() {
      buildFrames(mode);
      idx = 0;
      render();
    }

    function step(dir) {
      stop();
      if (!frames.length) return;
      idx = Math.min(frames.length - 1, Math.max(0, idx + dir));
      render();
    }

    function play() {
      if (playing) { stop(); return; }
      if (!frames.length) runOp();
      if (idx >= frames.length - 1) { idx = 0; render(); }
      playing = true;
      var btn = $('.uf-play');
      if (btn) btn.textContent = '⏸ Pause';
      var speedEl = $('.uf-speed');
      var speed = 1700 - parseInt(speedEl ? speedEl.value : 1100, 10);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); return; }
        idx++;
        render();
      }, speed);
    }

    function fillSelects() {
      ['.uf-x', '.uf-y'].forEach(function (sel) {
        var el = $(sel);
        if (!el) return;
        el.innerHTML = LABELS.map(function (L, i) {
          return '<option value="' + i + '">' + L + '</option>';
        }).join('');
      });
      if ($('.uf-y')) $('.uf-y').value = '1';
    }

    function syncOpts() {
      var rankCb = $('.uf-opt-rank');
      var compCb = $('.uf-opt-compress');
      useRank = !rankCb || rankCb.checked;
      useCompress = !compCb || compCb.checked;
    }

    function setMode(m) {
      mode = m;
      wrap.querySelectorAll('.uf-mode-btn').forEach(function (btn) {
        btn.classList.toggle('is-on', btn.getAttribute('data-mode') === m);
      });
      var yWrap = $('.uf-y-wrap');
      if (yWrap) yWrap.style.display = m === 'union' ? '' : 'none';
      renderCode();
    }

    /* Demo: a short sequence that shows rank + compression nicely */
    function loadDemo() {
      stop();
      resetState();
      var ops = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [4, 6], [0, 4]];
      ops.forEach(function (pair) {
        var rx = findRoot(pair[0], parent);
        var ry = findRoot(pair[1], parent);
        if (rx === ry) return;
        if (useRank) {
          if (rank[rx] < rank[ry]) parent[rx] = ry;
          else if (rank[rx] > rank[ry]) parent[ry] = rx;
          else { parent[ry] = rx; rank[rx]++; }
        } else parent[ry] = rx;
      });
      frames = [];
      idx = 0;
      rec({
        desc: 'Demo forest after Unions: (A,B) (C,D) (E,F) (G,H) (A,C) (E,G) (A,E). Try Find or Union.',
        line: -1
      });
      renderCode();
      render();
    }

    fillSelects();
    resetState();
    setMode('union');
    syncOpts();
    buildFrames('idle');

    wrap.querySelectorAll('.uf-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-mode'));
      });
    });
    var runBtn = $('.uf-run');
    var playBtn = $('.uf-play');
    var prevBtn = $('.uf-prev');
    var nextBtn = $('.uf-next');
    var resetBtn = $('.uf-reset');
    var demoBtn = $('.uf-demo');
    var speedEl = $('.uf-speed');
    if (runBtn) runBtn.onclick = function () { syncOpts(); runOp(); };
    if (playBtn) playBtn.onclick = play;
    if (prevBtn) prevBtn.onclick = function () { step(-1); };
    if (nextBtn) nextBtn.onclick = function () { step(1); };
    if (resetBtn) resetBtn.onclick = function () {
      stop();
      syncOpts();
      resetState();
      buildFrames('idle');
    };
    if (demoBtn) demoBtn.onclick = function () { syncOpts(); loadDemo(); };
    if (speedEl) speedEl.oninput = function () { if (playing) { stop(); play(); } };
    ['.uf-opt-rank', '.uf-opt-compress'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('change', syncOpts);
    });
  }

  function init() {
    document.querySelectorAll('.uf-viz-wrap').forEach(createAnimator);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
