/* Union-Find (Disjoint Sets) animator: Find + Union with optional rank / path compression */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var N = 5;
  var LABELS = 'ABCDE'.split('');

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
    var committedParent = [];
    var committedRank = [];
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
      commitLive();
    }

    function cloneArr(a) { return a.slice(); }

    function commitLive() {
      committedParent = cloneArr(parent);
      committedRank = cloneArr(rank);
    }

    function restoreCommitted() {
      parent = cloneArr(committedParent);
      rank = cloneArr(committedRank);
    }

    /** Apply the forest from the frame the user is looking at (so next Run starts from here). */
    function commitFromFrame(f) {
      if (!f) return;
      committedParent = cloneArr(f.parent);
      committedRank = cloneArr(f.rank);
      parent = cloneArr(committedParent);
      rank = cloneArr(committedRank);
    }

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

    /* Fewer nodes, larger circles — readable on screen without shrinking */
    var NODE_R = 44;
    var GAP_X = 130;
    var GAP_Y = 130;
    var TREE_GAP = 48;
    var PAD_X = 48;
    var PAD_Y = 64; /* room for rank above roots */

    function layoutForest(pArr, rankArr) {
      var kids = childrenOf(pArr);
      var roots = [];
      var i;
      for (i = 0; i < N; i++) if (pArr[i] === i) roots.push(i);

      function subtreeWidth(u) {
        if (!kids[u].length) return 1;
        var w = 0;
        kids[u].forEach(function (c) { w += subtreeWidth(c); });
        return Math.max(1, w);
      }

      var nodes = [];
      var cursorX = PAD_X;

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
            y: PAD_Y + depth * GAP_Y,
            label: LABELS[u],
            depth: depth,
            isRoot: pArr[u] === u,
            hasChildren: kids[u].length > 0,
            hasParent: pArr[u] !== u
          };
        }
        place(r, 0, 0);
        Object.keys(positions).forEach(function (k) {
          nodes.push(positions[k]);
        });
        cursorX += subtreeWidth(r) * GAP_X + TREE_GAP;
      });

      var edges = [];
      for (i = 0; i < N; i++) {
        if (pArr[i] !== i) edges.push({ from: i, to: pArr[i] });
      }

      var maxX = PAD_X + 80;
      var maxY = PAD_Y + 40;
      nodes.forEach(function (n) {
        if (n.x > maxX) maxX = n.x;
        if (n.y > maxY) maxY = n.y;
      });
      return {
        nodes: nodes,
        edges: edges,
        w: Math.max(maxX + PAD_X + 70, 520),
        h: Math.max(maxY + PAD_Y + 44, 300),
        rankArr: rankArr
      };
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

    function edgeEndpoints(a, b) {
      /* Child → parent: stop at circle rims only (rank sits to the side, not under) */
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len;
      var uy = dy / len;
      var startGap = NODE_R + 3;
      var endGap = NODE_R + 6;
      return {
        x1: a.x + ux * startGap,
        y1: a.y + uy * startGap,
        x2: b.x - ux * endGap,
        y2: b.y - uy * endGap
      };
    }

    function ensureMarkers(svg) {
      var defs = document.createElementNS(SVGNS, 'defs');
      function makeMarker(id, color) {
        var m = document.createElementNS(SVGNS, 'marker');
        m.setAttribute('id', id);
        m.setAttribute('viewBox', '0 0 10 10');
        m.setAttribute('refX', '9');
        m.setAttribute('refY', '5');
        /* userSpaceOnUse: size in SVG units, NOT × stroke-width (that made tips huge) */
        m.setAttribute('markerUnits', 'userSpaceOnUse');
        m.setAttribute('markerWidth', '9');
        m.setAttribute('markerHeight', '9');
        m.setAttribute('orient', 'auto');
        var path = document.createElementNS(SVGNS, 'path');
        path.setAttribute('d', 'M 0 1.5 L 9 5 L 0 8.5 z');
        path.setAttribute('fill', color);
        m.appendChild(path);
        defs.appendChild(m);
      }
      makeMarker('uf-arrow', '#4a5568');
      makeMarker('uf-arrow-active', '#0d9488');
      svg.appendChild(defs);
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
      svg.setAttribute('viewBox', '0 0 ' + lay.w + ' ' + lay.h);
      svg.setAttribute('width', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('class', 'uf-forest-svg');
      /* Prefer filling the stage: taller display for slide-like trees */
      var displayH = Math.max(380, Math.min(560, Math.round(lay.h * 1.25)));
      svg.setAttribute('height', String(displayH));
      ensureMarkers(svg);

      var byId = {};
      lay.nodes.forEach(function (n) { byId[n.id] = n; });

      function drawEdge(fromId, toId, cls) {
        var a = byId[fromId];
        var b = byId[toId];
        if (!a || !b) return;
        var ep = edgeEndpoints(a, b);
        var line = document.createElementNS(SVGNS, 'line');
        line.setAttribute('x1', ep.x1);
        line.setAttribute('y1', ep.y1);
        line.setAttribute('x2', ep.x2);
        line.setAttribute('y2', ep.y2);
        line.setAttribute('class', cls);
        line.setAttribute('marker-end',
          cls.indexOf('is-active') >= 0 ? 'url(#uf-arrow-active)' : 'url(#uf-arrow)');
        svg.appendChild(line);
      }

      /* Draw edges first, then nodes + rank on top so labels never sit under arrows */
      lay.edges.forEach(function (e) {
        var active = f.edge && f.edge.from === e.from && f.edge.to === e.to;
        drawEdge(e.from, e.to, 'uf-edge' + (active ? ' is-active' : ''));
      });

      if (f.edge && byId[f.edge.from] && byId[f.edge.to]) {
        var already = lay.edges.some(function (e) {
          return e.from === f.edge.from && e.to === f.edge.to;
        });
        if (!already) {
          drawEdge(f.edge.from, f.edge.to, 'uf-edge is-active is-guide');
        }
      }

      lay.nodes.forEach(function (n) {
        var g = document.createElementNS(SVGNS, 'g');
        g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
        g.setAttribute('class', 'uf-node-g');

        var role = f.highlight[n.id] || 'normal';
        if (!f.highlight[n.id] && f.path.indexOf(n.id) >= 0) role = 'path';

        var circle = document.createElementNS(SVGNS, 'circle');
        circle.setAttribute('r', String(NODE_R));
        circle.setAttribute('class', 'uf-node uf-node--' + role);
        g.appendChild(circle);

        var text = document.createElementNS(SVGNS, 'text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'uf-node-label');
        text.setAttribute('font-size', '34');
        text.textContent = n.label;
        g.appendChild(text);

        /*
         * Rank placement:
         * - prefer under (clear of outgoing arrows)
         * - else above (clear of incoming arrows from children)
         * - else beside (only when both under and above are blocked by arrows)
         */
        var underBlocked = n.hasChildren;   /* arrows arrive at bottom */
        var aboveBlocked = n.hasParent;     /* arrow leaves toward parent at top */
        var place = 'under';
        if (underBlocked && aboveBlocked) place = 'side';
        else if (underBlocked) place = 'above';

        var badge = document.createElementNS(SVGNS, 'text');
        badge.setAttribute('class', 'uf-rank-badge' + (n.isRoot ? ' is-root' : ''));
        badge.setAttribute('font-size', '18');
        badge.textContent = 'rank ' + f.rank[n.id];

        if (place === 'under') {
          badge.setAttribute('x', '0');
          badge.setAttribute('y', String(NODE_R + 22));
          badge.setAttribute('text-anchor', 'middle');
        } else if (place === 'above') {
          badge.setAttribute('x', '0');
          badge.setAttribute('y', String(-(NODE_R + 14)));
          badge.setAttribute('text-anchor', 'middle');
        } else {
          badge.setAttribute('x', String(NODE_R + 12));
          badge.setAttribute('y', '5');
          badge.setAttribute('text-anchor', 'start');
        }
        g.appendChild(badge);

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

    function isIdleOnly() {
      return !frames.length || (frames.length === 1 && frames[0].line === -1 &&
        (!frames[0].highlight || !Object.keys(frames[0].highlight).length));
    }

    function atLastFrame() {
      return frames.length > 0 && idx >= frames.length - 1;
    }

    function buildFrames(op) {
      stop();
      /* Always regenerate from the last committed forest — never from a half-played mutation */
      restoreCommitted();
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
        rec({ desc: 'Forest ready. Choose Find or Union, then press Run.', line: -1 });
      }
      /* Live parent was mutated while recording frames; keep display on frame 0,
         but do NOT commit yet — commit when the animation finishes. */
      render();
    }

    function finishIfAtEnd() {
      if (atLastFrame()) commitFromFrame(frames[idx]);
    }

    function runOp() {
      syncOpts();
      buildFrames(mode);
      idx = 0;
      render();
      /* One Run click: play the whole Union/Find so the merge is visible */
      if (frames.length > 1) startPlay(true);
      else commitFromFrame(frames[0]);
    }

    function step(dir) {
      stop();
      if (dir > 0 && isIdleOnly()) {
        syncOpts();
        buildFrames(mode);
        if (frames.length > 1) idx = 1;
        else idx = 0;
        render();
        finishIfAtEnd();
        return;
      }
      if (!frames.length) return;
      idx = Math.min(frames.length - 1, Math.max(0, idx + dir));
      render();
      finishIfAtEnd();
    }

    function startPlay(fromStart) {
      if (!frames.length) return;
      if (fromStart || atLastFrame()) {
        idx = 0;
        render();
      }
      playing = true;
      var btn = $('.uf-play');
      if (btn) btn.textContent = '⏸ Pause';
      var speedEl = $('.uf-speed');
      var speed = 1700 - parseInt(speedEl ? speedEl.value : 1100, 10);
      if (idx < frames.length - 1) {
        idx++;
        render();
      }
      if (timer) clearInterval(timer);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) {
          commitFromFrame(frames[idx]);
          stop();
          return;
        }
        idx++;
        render();
        if (atLastFrame()) commitFromFrame(frames[idx]);
      }, speed);
    }

    function play() {
      if (playing) { stop(); return; }
      if (isIdleOnly()) {
        syncOpts();
        buildFrames(mode);
      }
      if (!frames.length) return;
      startPlay(atLastFrame());
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
      var ops = [[0, 1], [2, 3], [0, 2]];
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
      commitLive();
      frames = [];
      idx = 0;
      rec({
        desc: 'Demo forest after Unions: (A,B) (C,D) (A,C). E is still alone. Try Find or Union.',
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
    if (runBtn) runBtn.onclick = function () { runOp(); };
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
    if (speedEl) speedEl.oninput = function () {
      if (playing) { stop(); startPlay(false); }
    };
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
