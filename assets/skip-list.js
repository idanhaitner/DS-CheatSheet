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
      def: ['#4a5aa8', '#6b78c8', '#fff'],
      sentinel: ['#455a9e', '#5a6a9e', '#eaf0ff'],
      cur: ['#6366f1', '#818cf8', '#fff'],
      path: ['#3f5bd6', '#8fb6ff', '#fff'],
      found: ['#2f8f5f', '#43c483', '#eafff4'],
      new: ['#0d9488', '#57e0c0', '#04121a'],
      edge: '#3a4278',
      edgePath: '#6366f1',
      edgeActive: '#818cf8',
      tower: '#5a6a9e'
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
      var NW = 46;
      var NH = 30;
      var W = 62;
      var x0 = 44;
      var y0 = 32;
      var lh = 44;
      var pos = nodes.map(function (_, i) { return { x: x0 + i * W, ys: [] }; });
      for (var lv = 0; lv < maxLevel; lv++) {
        var y = y0 + (maxLevel - 1 - lv) * lh;
        for (var i = 0; i < nodes.length; i++) {
          if (nodeAtLevel(nodes, i, lv)) pos[i].ys[lv] = y;
        }
      }
      return {
        pos: pos, x0: x0, y0: y0, lh: lh, W: W, NW: NW, NH: NH,
        width: pos[nodes.length - 1].x + NW + 20,
        height: y0 + (maxLevel - 1) * lh + NH + 20
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
      svg.style.maxHeight = '270px';

      var NW = lay.NW;
      var NH = lay.NH;
      var midY = NH / 2;

      function nodeFill(i) {
        if (f.found === i) return COL.found;
        if (f.cur && f.cur.ni === i) return COL.cur;
        if (nodes[i].isNew) return COL.new;
        if (nodes[i].sentinel) return COL.sentinel;
        return COL.def;
      }

      function nodeLabel(node) {
        if (node.key === -Infinity || node.key === Infinity) return sentinelName(node.key);
        return String(node.key);
      }

      function boxMetrics(i, lv) {
        return {
          x: lay.pos[i].x,
          y: lay.pos[i].ys[lv],
          w: NW,
          h: NH,
          cx: lay.pos[i].x + NW / 2
        };
      }

      for (var lv = 0; lv < ml; lv++) {
        var y = lay.y0 + (ml - 1 - lv) * lay.lh;
        var gl = document.createElementNS(SVGNS, 'line');
        gl.setAttribute('x1', lay.x0 - 8);
        gl.setAttribute('y1', y + midY);
        gl.setAttribute('x2', lay.width - 6);
        gl.setAttribute('y2', y + midY);
        gl.setAttribute('stroke', 'var(--line)');
        gl.setAttribute('stroke-width', '1.5');
        svg.appendChild(gl);

        var lbl = document.createElementNS(SVGNS, 'text');
        lbl.setAttribute('x', '10');
        lbl.setAttribute('y', String(y + midY));
        lbl.setAttribute('fill', 'var(--muted)');
        lbl.setAttribute('font-size', '13');
        lbl.setAttribute('font-weight', '700');
        lbl.setAttribute('font-family', FONT);
        lbl.setAttribute('dominant-baseline', 'central');
        lbl.textContent = 'L' + lv;
        svg.appendChild(lbl);
      }

      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].h <= 1) continue;
        var b0 = boxMetrics(i, 0);
        var bTop = boxMetrics(i, nodes[i].h - 1);
        var px = b0.cx;
        var tower = document.createElementNS(SVGNS, 'line');
        tower.setAttribute('x1', px);
        tower.setAttribute('y1', b0.y + midY);
        tower.setAttribute('x2', px);
        tower.setAttribute('y2', bTop.y + midY);
        tower.setAttribute('stroke', COL.tower);
        tower.setAttribute('stroke-width', '2.5');
        svg.appendChild(tower);
      }

      for (lv = 0; lv < ml; lv++) {
        for (var j = 0; j < nodes.length; j++) {
          if (!nodeAtLevel(nodes, j, lv)) continue;
          var nx = nextOnLevel(nodes, j, lv);
          if (nx === j) continue;
          var bj = boxMetrics(j, lv);
          var bn = boxMetrics(nx, lv);
          var ln = document.createElementNS(SVGNS, 'line');
          ln.setAttribute('x1', bj.x + bj.w);
          ln.setAttribute('y1', bj.y + midY);
          ln.setAttribute('x2', bn.x + 3);
          ln.setAttribute('y2', bn.y + midY);
          ln.setAttribute('stroke', COL.edge);
          ln.setAttribute('stroke-width', '2.5');
          svg.appendChild(ln);
        }
      }

      for (i = 0; i < nodes.length; i++) {
        var col = nodeFill(i);
        var label = nodeLabel(nodes[i]);
        for (lv = 0; lv < nodes[i].h; lv++) {
          var box = boxMetrics(i, lv);
          var isCur = f.cur && f.cur.ni === i && f.cur.lv === lv;
          if (isCur) {
            var ring = document.createElementNS(SVGNS, 'rect');
            ring.setAttribute('x', box.x - 4);
            ring.setAttribute('y', box.y - 4);
            ring.setAttribute('width', String(box.w + 8));
            ring.setAttribute('height', String(box.h + 8));
            ring.setAttribute('rx', '10');
            ring.setAttribute('fill', 'none');
            ring.setAttribute('stroke', col[1]);
            ring.setAttribute('stroke-width', '3.5');
            ring.setAttribute('opacity', '0.9');
            svg.appendChild(ring);
          }
          var rect = document.createElementNS(SVGNS, 'rect');
          rect.setAttribute('x', box.x);
          rect.setAttribute('y', box.y);
          rect.setAttribute('width', String(box.w));
          rect.setAttribute('height', String(box.h));
          rect.setAttribute('rx', '7');
          rect.setAttribute('fill', col[0]);
          rect.setAttribute('stroke', col[1]);
          rect.setAttribute('stroke-width', isCur ? '4' : '2');
          svg.appendChild(rect);

          var cy = box.y + box.h / 2;
          var fs = nodes[i].sentinel ? 12 : 15;
          addSvgText(svg, box.cx, cy, label, col[2], isCur ? fs + 1 : fs, isCur ? '900' : '800');
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
