/* Skip list search & build animator: SVG visualization with synced pseudocode. */
(function () {
  function init() {
    var stage = document.getElementById('sl-viz-stage');
    if (!stage) return;

    var SVGNS = 'http://www.w3.org/2000/svg';
    function el(id) { return document.getElementById(id); }

    var K = function (s) { return '<span class="kw">' + s + '</span>'; };
    var C = function (s) { return '<span class="cm">' + s + '</span>'; };
    var CODE = {
      search: [
        K('Search') + '(x):',
        '  curr = head',
        '  level = maxLevel',
        K('while') + ' level >= 0:',
        '    ' + K('while') + ' next(level).key < x:',
        '      curr = next(level)  ' + C('# right'),
        '    level = level - 1     ' + C('# down'),
        K('return') + ' curr  ' + C('# predecessor')
      ],
      build: [
        K('Insert') + '(x):',
        '  update[] = search path for x',
        '  h = 1',
        K('while') + ' coin() == heads ' + K('and') + ' h < max:',
        '    h++',
        '  new = Node(x, height=h)',
        K('for') + ' level = 0 … h-1:',
        '    splice new into level'
      ]
    };

    var INFO = {
      search: 'Walk from the <b>top-left</b> sentinel. At each level, move <b>right</b> while the next key is still smaller than the target, then <b>drop down</b> one level. Expected O(log n) levels × O(1) steps per level.',
      build: 'To insert, first <b>search</b> to find predecessors at every level, then <b>flip a coin</b> to decide tower height (keep promoting with prob ½). Link the new tower into each level. Watch the structure grow level by level.'
    };

    var SEARCH_LIST = [
      { key: -Infinity, h: 4, sentinel: true },
      { key: 2, h: 1 },
      { key: 5, h: 2 },
      { key: 7, h: 1 },
      { key: 9, h: 3 },
      { key: 12, h: 1 },
      { key: Infinity, h: 4, sentinel: true }
    ];
    var BUILD_ORDER = [5, 2, 9, 7, 12, 1];
    var BUILD_HEIGHTS = [2, 1, 3, 1, 2, 1];

    var FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    function sentinelName(key) {
      return key === -Infinity ? '-inf' : '+inf';
    }

    function addSvgText(svg, x, y, text, fill, size, weight, anchor) {
      var tx = document.createElementNS(SVGNS, 'text');
      tx.setAttribute('x', x);
      tx.setAttribute('y', y);
      tx.setAttribute('text-anchor', anchor || 'middle');
      tx.setAttribute('dominant-baseline', 'central');
      tx.setAttribute('fill', fill);
      tx.setAttribute('font-size', String(size));
      tx.setAttribute('font-weight', weight || '800');
      tx.setAttribute('font-family', FONT);
      tx.textContent = text;
      svg.appendChild(tx);
      return tx;
    }
    var COL = {
      node: '#4f46e5',
      nodeStroke: '#6366f1',
      nodeText: '#ffffff',
      sentFill: '#eef2ff',
      sentStroke: '#818cf8',
      sentText: '#3730a3',
      cur: '#7c3aed',
      curStroke: '#a78bfa',
      found: '#0f766e',
      foundStroke: '#14b8a6',
      foundText: '#ffffff',
      neu: '#0f766e',
      neuStroke: '#14b8a6',
      edge: '#c7d2fe',
      edgeHot: '#7c3aed',
      tower: '#e0e7ff',
      rank: '#64748b',
      lane: '#e2e8f0'
    };

    var frames = [], idx = 0, timer = null, playing = false;
    var codeBox = el('sl-viz-code');
    var codeLineEls = [];

    function maxH(nodes) {
      var m = 1;
      for (var i = 0; i < nodes.length; i++) m = Math.max(m, nodes[i].h);
      return m;
    }

    function nodeAtLevel(nodes, ni, lv) {
      return lv < nodes[ni].h;
    }

    function nextOnLevel(nodes, ni, lv) {
      for (var j = ni + 1; j < nodes.length; j++) {
        if (nodeAtLevel(nodes, j, lv)) return j;
      }
      return ni;
    }

    function rec(out, snap) {
      out.push({
        nodes: snap.nodes.map(function (n) { return { key: n.key, h: n.h, sentinel: n.sentinel, isNew: n.isNew }; }),
        maxLevel: snap.maxLevel,
        cur: snap.cur ? { ni: snap.cur.ni, lv: snap.cur.lv } : null,
        found: snap.found != null ? snap.found : null,
        target: snap.target,
        desc: snap.desc,
        line: snap.line == null ? -1 : snap.line,
        coin: snap.coin
      });
    }

    function genSearch(target) {
      var out = [];
      var nodes = SEARCH_LIST.map(function (n) { return { key: n.key, h: n.h, sentinel: n.sentinel }; });
      var ml = maxH(nodes);
      rec(out, { nodes: nodes, maxLevel: ml, target: target, desc: 'Search for key ' + target + '. Start at -inf on the top level L' + (ml - 1) + '.', line: 0 });

      var ni = 0;
      var lv = ml - 1;
      rec(out, { nodes: nodes, maxLevel: ml, cur: { ni: ni, lv: lv }, target: target, desc: 'curr = head, level = ' + lv + ' (top).', line: 1 });

      while (lv >= 0) {
        rec(out, { nodes: nodes, maxLevel: ml, cur: { ni: ni, lv: lv }, target: target, desc: 'At level L' + lv + ', scan right while next key < ' + target + '.', line: 3 });

        var moved = false;
        while (true) {
          var nx = nextOnLevel(nodes, ni, lv);
          if (nx === ni) break;
          if (nodes[nx].key < target) {
            ni = nx;
            moved = true;
            rec(out, {
              nodes: nodes, maxLevel: ml, cur: { ni: ni, lv: lv }, target: target,
              desc: 'Move right to ' + (nodes[ni].sentinel ? sentinelName(nodes[ni].key) : nodes[ni].key) + ' on L' + lv + '.',
              line: 4
            });
          } else break;
        }
        if (!moved) {
          var nx2 = nextOnLevel(nodes, ni, lv);
          if (nx2 !== ni && nodes[nx2].key === target) {
            rec(out, {
              nodes: nodes, maxLevel: ml, cur: { ni: nx2, lv: lv }, found: nx2, target: target,
              desc: 'Found ' + target + ' on level L' + lv + '! (also reachable from bottom.)',
              line: -1
            });
            return out;
          }
        }

        if (lv === 0) {
          var pred = ni;
          var succ = nextOnLevel(nodes, ni, 0);
          if (succ !== ni && nodes[succ].key === target) {
            rec(out, {
              nodes: nodes, maxLevel: ml, cur: { ni: succ, lv: 0 }, found: succ, target: target,
              desc: 'Found ' + target + ' at bottom level. Search done.',
              line: -1
            });
          } else {
            rec(out, {
              nodes: nodes, maxLevel: ml, cur: { ni: pred, lv: 0 }, target: target,
              desc: target + ' not present. Predecessor is ' + nodes[pred].key + ' (would insert after here).',
              line: 6
            });
          }
          return out;
        }

        lv--;
        rec(out, {
          nodes: nodes, maxLevel: ml, cur: { ni: ni, lv: lv }, target: target,
          desc: 'Cannot go further right on L' + (lv + 1) + ': drop down to L' + lv + '.',
          line: 5
        });
      }
      return out;
    }

    function genBuild() {
      var out = [];
      var nodes = [
        { key: -Infinity, h: 1, sentinel: true },
        { key: Infinity, h: 1, sentinel: true }
      ];

      rec(out, {
        nodes: nodes, maxLevel: 1, target: null,
        desc: 'Empty skip list: only -inf and +inf sentinels on level L0.',
        line: 0
      });

      for (var t = 0; t < BUILD_ORDER.length; t++) {
        var x = BUILD_ORDER[t];
        var nh = BUILD_HEIGHTS[t];
        rec(out, {
          nodes: nodes, maxLevel: maxH(nodes), target: x,
          desc: 'Insert ' + x + ': first search for the insertion position at every level.',
          line: 0
        });

        var ml = maxH(nodes);
        var ni = 0;
        var lv = ml - 1;
        var update = {};

        while (lv >= 0) {
          while (true) {
            var nx = nextOnLevel(nodes, ni, lv);
            if (nx === ni || nodes[nx].key >= x) break;
            ni = nx;
          }
          update[lv] = ni;
          rec(out, {
            nodes: nodes, maxLevel: ml, cur: { ni: ni, lv: lv }, target: x,
            desc: 'Level L' + lv + ': predecessor of ' + x + ' is ' + (nodes[ni].key === -Infinity ? '-inf' : nodes[ni].key) + '.',
            line: 1
          });
          if (lv === 0) break;
          lv--;
        }

        var flips = nh - 1;
        rec(out, {
          nodes: nodes, maxLevel: ml, cur: { ni: update[0], lv: 0 }, target: x, coin: nh,
          desc: 'Coin flips: promote ' + flips + ' time' + (flips === 1 ? '' : 's') + ' → tower height h = ' + nh + '.',
          line: 2
        });

        var ins = 0;
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].key > x) { ins = i; break; }
        }
        var newNode = { key: x, h: nh, isNew: true };
        nodes.splice(ins, 0, newNode);

        var newMl = maxH(nodes);
        for (var s = 0; s < nodes.length; s++) {
          if (nodes[s].sentinel) nodes[s].h = newMl;
        }

        rec(out, {
          nodes: nodes, maxLevel: newMl, cur: { ni: ins, lv: 0 }, found: ins, target: x,
          desc: 'Link tower for ' + x + ' into levels L0' + (nh > 1 ? ' … L' + (nh - 1) : '') + '. List now has ' + (nodes.length - 2) + ' element(s).',
          line: 7
        });
      }

      rec(out, {
        nodes: nodes, maxLevel: maxH(nodes), target: null,
        desc: 'Build complete. Expected O(log n) levels per node (geometric coin flips).',
        line: -1
      });
      return out;
    }

    function layout(nodes, maxLevel) {
      var R = 15, W = 70, x0 = 48, y0 = 28, lh = 44;
      var pos = nodes.map(function (_, i) { return { x: x0 + i * W, ys: [] }; });
      for (var lv = 0; lv < maxLevel; lv++) {
        var y = y0 + (maxLevel - 1 - lv) * lh;
        for (var i = 0; i < nodes.length; i++) {
          if (nodeAtLevel(nodes, i, lv)) pos[i].ys[lv] = y;
        }
      }
      return {
        pos: pos, x0: x0, y0: y0, lh: lh, W: W, R: R,
        width: pos[nodes.length - 1].x + R + 28,
        height: y0 + (maxLevel - 1) * lh + R + 20
      };
    }

    function renderCode(mode) {
      codeLineEls = renderVizCodeLines(codeBox, CODE[mode]);
    }

    function render() {
      var f = frames[idx];
      var nodes = f.nodes;
      var ml = f.maxLevel;
      var lay = layout(nodes, ml);

      stage.innerHTML = '';
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + lay.width + ' ' + lay.height);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('width', '100%');
      svg.style.height = 'auto';
      svg.style.maxHeight = '280px';

      var R = lay.R;
      function cx(i) { return lay.pos[i].x; }
      function cy(i, lv) { return lay.pos[i].ys[lv]; }

      function nodeStyle(i) {
        if (f.found === i) return { fill: COL.found, stroke: COL.foundStroke, text: COL.foundText };
        if (f.cur && f.cur.ni === i) return { fill: COL.cur, stroke: COL.curStroke, text: '#fff' };
        if (nodes[i].isNew) return { fill: COL.neu, stroke: COL.neuStroke, text: '#fff' };
        if (nodes[i].sentinel) return { fill: COL.sentFill, stroke: COL.sentStroke, text: COL.sentText };
        return { fill: COL.node, stroke: COL.nodeStroke, text: COL.nodeText };
      }

      function nodeLabel(node) {
        if (node.key === -Infinity || node.key === Infinity) return sentinelName(node.key);
        return String(node.key);
      }

      for (var lv = 0; lv < ml; lv++) {
        var ly = lay.y0 + (ml - 1 - lv) * lay.lh;
        var lane = document.createElementNS(SVGNS, 'line');
        lane.setAttribute('x1', 28);
        lane.setAttribute('y1', ly);
        lane.setAttribute('x2', lay.width - 6);
        lane.setAttribute('y2', ly);
        lane.setAttribute('stroke', COL.lane);
        lane.setAttribute('stroke-width', '1');
        lane.setAttribute('stroke-dasharray', '2 6');
        svg.appendChild(lane);
        addSvgText(svg, 10, ly, 'L' + lv, COL.rank, 11, '600', 'start');
      }

      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].h <= 1) continue;
        var spine = document.createElementNS(SVGNS, 'line');
        spine.setAttribute('x1', cx(i));
        spine.setAttribute('y1', cy(i, 0));
        spine.setAttribute('x2', cx(i));
        spine.setAttribute('y2', cy(i, nodes[i].h - 1));
        spine.setAttribute('stroke', COL.tower);
        spine.setAttribute('stroke-width', '3');
        spine.setAttribute('stroke-linecap', 'round');
        svg.appendChild(spine);
      }

      for (lv = 0; lv < ml; lv++) {
        for (var j = 0; j < nodes.length; j++) {
          if (!nodeAtLevel(nodes, j, lv)) continue;
          var nx = nextOnLevel(nodes, j, lv);
          if (nx === j) continue;
          var isPath = f.cur && f.cur.lv === lv && (f.cur.ni === j || f.cur.ni === nx);
          var ln = document.createElementNS(SVGNS, 'line');
          ln.setAttribute('x1', cx(j) + R);
          ln.setAttribute('y1', cy(j, lv));
          ln.setAttribute('x2', cx(nx) - R);
          ln.setAttribute('y2', cy(nx, lv));
          ln.setAttribute('stroke', isPath ? COL.edgeHot : COL.edge);
          ln.setAttribute('stroke-width', isPath ? '2.5' : '1.75');
          ln.setAttribute('stroke-linecap', 'round');
          svg.appendChild(ln);
        }
      }

      for (i = 0; i < nodes.length; i++) {
        var st = nodeStyle(i);
        var label = nodeLabel(nodes[i]);
        for (lv = 0; lv < nodes[i].h; lv++) {
          var isCur = f.cur && f.cur.ni === i && f.cur.lv === lv;
          var c = document.createElementNS(SVGNS, 'circle');
          c.setAttribute('cx', cx(i));
          c.setAttribute('cy', cy(i, lv));
          c.setAttribute('r', isCur ? R + 1.5 : R);
          c.setAttribute('fill', st.fill);
          c.setAttribute('stroke', st.stroke);
          c.setAttribute('stroke-width', isCur ? '3' : (nodes[i].sentinel ? '1.75' : '0'));
          svg.appendChild(c);
          addSvgText(svg, cx(i), cy(i, lv), label, st.text,
            nodes[i].sentinel ? 10 : 13, isCur ? '800' : '700');
        }
      }

      stage.appendChild(svg);

      for (var k = 0; k < codeLineEls.length; k++) {
        codeLineEls[k].classList.toggle('active', k === f.line);
      }
      el('sl-viz-desc').textContent = f.desc;
      el('sl-viz-step').textContent = idx;
      el('sl-viz-total').textContent = Math.max(0, frames.length - 1);
    }

    function updateModeUI() {
      var mode = el('sl-viz-mode').value;
      el('sl-viz-target-wrap').style.display = mode === 'search' ? 'inline-flex' : 'none';
      el('sl-viz-algo-info').innerHTML = INFO[mode];
    }

    function build() {
      stop();
      var mode = el('sl-viz-mode').value;
      renderCode(mode);
      updateModeUI();
      if (mode === 'search') {
        frames = genSearch(parseInt(el('sl-viz-target').value, 10));
      } else {
        frames = genBuild();
      }
      idx = 0;
      render();
    }

    function step(dir) { stop(); idx = Math.min(frames.length - 1, Math.max(0, idx + dir)); render(); }
    function stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      el('sl-viz-play').textContent = '\u25B6 Play';
    }
    function play() {
      if (playing) { stop(); return; }
      if (idx >= frames.length - 1) { idx = 0; render(); }
      playing = true;
      el('sl-viz-play').textContent = '\u23F8 Pause';
      var speed = 1700 - parseInt(el('sl-viz-speed').value, 10);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); return; }
        idx++;
        render();
      }, speed);
    }

    el('sl-viz-play').onclick = play;
    el('sl-viz-next').onclick = function () { step(1); };
    el('sl-viz-prev').onclick = function () { step(-1); };
    el('sl-viz-mode').onchange = build;
    el('sl-viz-target').onchange = build;
    el('sl-viz-speed').oninput = function () { if (playing) { stop(); play(); } };

    build();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
