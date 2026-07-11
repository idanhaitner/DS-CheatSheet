/* Graph algorithm animators: one independent instance per .graph-viz-wrap */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  var NR = 24;
  var MET_Y = 42;
  var WGT_OFF = 24;
  var NUM_FS = 15;
  var uid = 0;

  var TRAVERSE = {
    id: 'traverse', directed: false, weighted: false,
    nodes: [
      { id: 0, label: 'A', x: 70, y: 150 }, { id: 1, label: 'B', x: 190, y: 70 },
      { id: 2, label: 'C', x: 190, y: 230 }, { id: 3, label: 'D', x: 330, y: 70 },
      { id: 4, label: 'E', x: 330, y: 230 }, { id: 5, label: 'F', x: 460, y: 150 },
      { id: 6, label: 'G', x: 570, y: 150 }
    ],
    edges: [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [5, 6]]
  };
  var WEIGHTED = {
    id: 'weighted', directed: false, weighted: true,
    nodes: TRAVERSE.nodes,
    edges: [[0, 1, 4], [0, 2, 2], [1, 3, 3], [2, 3, 1], [2, 4, 5], [3, 5, 6], [4, 5, 2], [5, 6, 3]]
  };
  var DIJKSTRA_W = {
    id: 'dijkstra-w', directed: false, weighted: true,
    nodes: [
      { id: 0, label: 'A', x: 70, y: 150 },
      { id: 3, label: 'D', x: 265, y: 150 },
      { id: 1, label: 'B', x: 265, y: 38 },
      { id: 2, label: 'C', x: 265, y: 268 },
      { id: 4, label: 'E', x: 430, y: 48 },
      { id: 5, label: 'F', x: 430, y: 268 },
      { id: 6, label: 'G', x: 580, y: 150 }
    ],
    edges: [
      [0, 3, 2], [0, 1, 8], [3, 1, 1], [3, 2, 2],
      [3, 4, 2], [3, 5, 2], [3, 6, 3]
    ]
  };
  var DAG = {
    id: 'dag', directed: true, weighted: false,
    nodes: [
      { id: 0, label: 'A', x: 70, y: 130 }, { id: 1, label: 'B', x: 200, y: 70 },
      { id: 2, label: 'C', x: 200, y: 200 }, { id: 3, label: 'D', x: 340, y: 130 },
      { id: 4, label: 'E', x: 470, y: 130 }, { id: 5, label: 'F', x: 580, y: 130 }
    ],
    edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5]]
  };
  var SCENARIOS = { traverse: TRAVERSE, weighted: WEIGHTED, 'dijkstra-w': DIJKSTRA_W, dag: DAG };
  var ALGO_SCENARIO = {
    bfs: 'traverse', dfs: 'traverse', topo: 'dag',
    kruskal: 'weighted', prim: 'weighted', dijkstra: 'dijkstra-w'
  };
  var ALGO_LABELS = {
    bfs: 'BFS', dfs: 'DFS', topo: 'Topological Sort',
    kruskal: 'Kruskal', prim: 'Prim', dijkstra: 'Dijkstra'
  };
  var NCOL = {
    white: { fill: '#ffffff', stroke: '#94a3b8', letter: '#0f172a' },
    gray: { fill: '#9ca3af', stroke: '#6b7280', letter: '#111827' },
    black: { fill: '#1a1a1a', stroke: '#000000', letter: '#ffffff' },
    cur: { fill: '#9ca3af', stroke: '#374151', letter: '#111827' },
    in: { fill: '#1a1a1a', stroke: '#57e0c0', letter: '#ffffff' }
  };
  var ECOL = {
    def: '#2a3058', tree: '#57e0c0', look: '#7c9cff',
    back: '#ff6b81', reject: '#ff6b81', mst: '#57e0c0', cand: '#64748b'
  };
  var MARKER_KINDS = ['def', 'tree', 'look', 'back', 'reject', 'mst', 'cand'];
  var NOTES = {
    bfs: 'Each node shows <b>d</b> (hop distance). Undiscovered = <b>\u221E</b>.',
    dfs: 'Each node shows <b>d/f</b>. <span style="color:#ff6b81">Red</span> = back edge (cycle).',
    topo: 'DFS on a DAG. When a node turns black, it is prepended to the topological order.',
    kruskal: '<span style="color:#57e0c0">Teal</span> = in MST. <span style="color:#ff6b81">Red</span> = skipped (would form cycle). Panel shows <b>Union-Find</b> components after each step.',
    prim: '<span style="color:#57e0c0"><b>Bold teal</b></span> = MST edge. <span style="color:#64748b">Gray dashed</span> = current candidate. <span style="color:#1a1a1a"><b>Black</b></span> = not chosen.',
    dijkstra: '<span style="color:#57e0c0"><b>Teal</b></span> = shortest-path tree edge. Numbers under nodes = <b>dist</b> from source. Panel shows <b>PQ</b> (min-heap by dist).'
  };
  var PSEUDO = {
    kruskal: [
      '<span class="kw">Kruskal</span>(G, w):',
      '  sort edges E by weight ascending',
      '  <span class="kw">for each</span> v <span class="kw">in</span> V: MakeSet(v)',
      '  mst = empty',
      '  <span class="kw">for each</span> edge (u, v) <span class="kw">in</span> E (in order):',
      '    <span class="kw">if</span> Find(u) != Find(v):  <span class="cm"># different components</span>',
      '      add (u, v) to mst',
      '      Union(u, v)',
      '      <span class="kw">if</span> |mst| = |V| - 1: <span class="kw">break</span>',
      '  return mst'
    ],
    prim: [
      '<span class="kw">Prim</span>(G, w, r):',
      '  key[v] = infinity, parent[v] = nil <span class="kw">for all</span> v',
      '  key[r] = 0',
      '  PQ = min-heap of all vertices keyed by key[v]',
      '  <span class="kw">while</span> PQ not empty:',
      '    u = extractMin(PQ)',
      '    <span class="kw">if</span> u already in tree: <span class="kw">continue</span>  <span class="cm"># stale entry</span>',
      '    <span class="kw">if</span> parent[u] != nil:',
      '      add edge (parent[u], u) to mst',
      '    mark u in tree',
      '    <span class="kw">for each</span> neighbor v of u not in tree:',
      '      <span class="kw">if</span> w(u, v) &lt; key[v]:',
      '        key[v] = w(u, v)',
      '        parent[v] = u',
      '        decreaseKey(PQ, v)  <span class="cm"># or insert</span>',
      '  return mst'
    ],
    dijkstra: [
      '<span class="kw">Dijkstra</span>(G, w, s):',
      '  dist[s] = 0, others = infinity',
      '  PQ = min-heap keyed by dist[v]',
      '  insert(s, 0)',
      '  <span class="kw">while</span> PQ not empty:',
      '    u = extractMin(PQ)',
      '    <span class="kw">if</span> u already finalized: <span class="kw">continue</span>',
      '    finalize u',
      '    <span class="kw">for each</span> neighbor v of u not finalized:',
      '      <span class="kw">if</span> dist[u] + w(u,v) &lt; dist[v]:',
      '        dist[v] = dist[u] + w(u,v)',
      '        parent[v] = u',
      '        decreaseKey(PQ, v)  <span class="cm"># or insert</span>',
      '  return dist'
    ]
  };

  function createAnimator(wrap) {
    var modes = JSON.parse(wrap.dataset.modes || '["bfs"]');
    var mode = wrap.getAttribute('data-default') || modes[0];
    var markerId = 'gv-arrow-' + (uid++);

    var $ = function (sel) { return wrap.querySelector(sel); };
    var stage = $('.graph-stage');
    var codeBox = $('.viz-code');
    if (!stage) return;

    var codeLineEls = [];

    var svg, nodeCircle = {}, nodeLetter = {}, nodeMetrics = {};
    var edgeLine = {}, edgeWeight = {};
    var scenario = null, NAME = {}, ADJ = {}, WGT = {};
    var frames = [], idx = 0, timer = null, playing = false;
    var out, nc, ec, dval, fval, order;

    function ekey(u, v) { return Math.min(u, v) + '-' + Math.max(u, v); }
    function dekey(u, v) { return u + '>' + v; }

    function trimEdge(ax, ay, bx, by, padStart, padEnd) {
      var dx = bx - ax, dy = by - ay;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return { x1: ax, y1: ay, x2: bx, y2: by };
      var ux = dx / len, uy = dy / len;
      return {
        x1: ax + ux * padStart,
        y1: ay + uy * padStart,
        x2: bx - ux * padEnd,
        y2: by - uy * padEnd
      };
    }

    function addArrowMarkers(defs) {
      MARKER_KINDS.forEach(function (kind) {
        var marker = document.createElementNS(SVGNS, 'marker');
        marker.setAttribute('id', markerId + '-' + kind);
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '10');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '7');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('markerUnits', 'userSpaceOnUse');
        marker.setAttribute('orient', 'auto');
        var tri = document.createElementNS(SVGNS, 'path');
        tri.setAttribute('d', 'M 0 0 L 10 5 L 0 10 Z');
        tri.setAttribute('fill', ECOL[kind]);
        marker.appendChild(tri);
        defs.appendChild(marker);
      });
    }

    function buildAdj(sc) {
      NAME = {}; ADJ = {}; WGT = {};
      sc.nodes.forEach(function (n) { NAME[n.id] = n.label; ADJ[n.id] = []; });
      sc.edges.forEach(function (e) {
        var u = e[0], v = e[1], w = e[2] != null ? e[2] : 1;
        ADJ[u].push(v);
        if (!sc.directed) ADJ[v].push(u);
        WGT[sc.directed ? dekey(u, v) : ekey(u, v)] = w;
      });
    }

    function nodeMetricPos(n, sc) {
      var vbH = sc.id === 'dijkstra-w' ? 330 : 300;
      var below = vbH - (n.y + NR + 14);
      var above = n.y - NR - 14;
      if (sc.id === 'dijkstra-w' && n.y < 70) {
        return { x: n.x - 38, y: n.y + 2, anchor: 'end' };
      }
      if (below < MET_Y + 4 && above > MET_Y + 4) {
        return { x: n.x, y: n.y - MET_Y, anchor: 'middle' };
      }
      return { x: n.x, y: n.y + MET_Y, anchor: 'middle' };
    }

    function edgeLabelPos(ax, ay, bx, by) {
      var mx = (ax + bx) / 2, my = (ay + by) / 2;
      var dx = bx - ax, dy = by - ay;
      var len = Math.hypot(dx, dy) || 1;
      if (Math.abs(dy) < Math.abs(dx) * 0.35) {
        return { x: mx, y: my - WGT_OFF };
      }
      var px = -dy / len, py = dx / len;
      return { x: mx + px * WGT_OFF, y: my + py * WGT_OFF };
    }

    function rebuildSvg(sc) {
      stage.innerHTML = '';
      nodeCircle = {}; nodeLetter = {}; nodeMetrics = {};
      edgeLine = {}; edgeWeight = {};
      buildAdj(sc);
      svg = document.createElementNS(SVGNS, 'svg');
      var vbH = sc.id === 'dijkstra-w' ? 330 : 300;
      svg.setAttribute('viewBox', '0 0 640 ' + vbH);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', String(vbH));
      var defs = document.createElementNS(SVGNS, 'defs');
      addArrowMarkers(defs);
      svg.appendChild(defs);

      sc.edges.forEach(function (e) {
        var a = sc.nodes[e[0]], b = sc.nodes[e[1]];
        var k = sc.directed ? dekey(e[0], e[1]) : ekey(e[0], e[1]);
        var pts = trimEdge(a.x, a.y, b.x, b.y, NR, NR);
        var ln = document.createElementNS(SVGNS, 'line');
        ln.setAttribute('x1', pts.x1); ln.setAttribute('y1', pts.y1);
        ln.setAttribute('x2', pts.x2); ln.setAttribute('y2', pts.y2);
        ln.setAttribute('stroke', ECOL.def);
        ln.setAttribute('stroke-width', '2.5');
        ln.setAttribute('stroke-linecap', 'round');
        if (sc.directed) ln.setAttribute('marker-end', 'url(#' + markerId + '-def)');
        svg.appendChild(ln); edgeLine[k] = ln;
        if (sc.weighted) {
          var lp = edgeLabelPos(a.x, a.y, b.x, b.y);
          var wt = document.createElementNS(SVGNS, 'text');
          wt.setAttribute('x', lp.x); wt.setAttribute('y', lp.y);
          wt.setAttribute('text-anchor', 'middle'); wt.setAttribute('dominant-baseline', 'central');
          wt.setAttribute('font-size', String(NUM_FS)); wt.setAttribute('font-weight', '800');
          wt.setAttribute('fill', '#1e293b'); wt.setAttribute('stroke', '#ffffff');
          wt.setAttribute('stroke-width', '4'); wt.setAttribute('paint-order', 'stroke fill');
          wt.setAttribute('font-family', FONT);
          wt.textContent = String(e[2]);
          svg.appendChild(wt);
          edgeWeight[k] = wt;
        }
      });

      sc.nodes.forEach(function (n) {
        var c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); c.setAttribute('r', String(NR));
        c.setAttribute('fill', '#ffffff'); c.setAttribute('stroke', '#cbd5e1');
        svg.appendChild(c); nodeCircle[n.id] = c;
        var letter = document.createElementNS(SVGNS, 'text');
        letter.setAttribute('x', n.x); letter.setAttribute('y', n.y);
        letter.setAttribute('text-anchor', 'middle'); letter.setAttribute('dominant-baseline', 'central');
        letter.setAttribute('font-size', '15'); letter.setAttribute('font-weight', '800');
        letter.setAttribute('fill', '#0f172a'); letter.setAttribute('font-family', FONT);
        letter.textContent = n.label;
        svg.appendChild(letter); nodeLetter[n.id] = letter;
        var mp = nodeMetricPos(n, sc);
        var metrics = document.createElementNS(SVGNS, 'text');
        metrics.setAttribute('x', mp.x); metrics.setAttribute('y', mp.y);
        metrics.setAttribute('text-anchor', mp.anchor); metrics.setAttribute('dominant-baseline', 'central');
        metrics.setAttribute('font-size', String(NUM_FS)); metrics.setAttribute('font-weight', '800');
        metrics.setAttribute('fill', 'currentColor'); metrics.setAttribute('font-family', FONT);
        svg.appendChild(metrics); nodeMetrics[n.id] = metrics;
      });
      stage.appendChild(svg);
      scenario = sc;
    }

    function edgeKeys(u, v) {
      return scenario.directed ? [dekey(u, v)] : [ekey(u, v)];
    }
    function setEdge(u, v, kind) {
      edgeKeys(u, v).forEach(function (k) { if (edgeLine[k]) ec[k] = kind; });
    }
    function weight(u, v) {
      var k = scenario.directed ? dekey(u, v) : ekey(u, v);
      return WGT[k] != null ? WGT[k] : Infinity;
    }
    function resetState() {
      out = []; nc = {}; ec = {}; dval = {}; fval = {}; order = [];
      scenario.nodes.forEach(function (n) { nc[n.id] = 'white'; });
      scenario.edges.forEach(function (e) {
        ec[scenario.directed ? dekey(e[0], e[1]) : ekey(e[0], e[1])] = 'def';
      });
    }
    function rec(desc, panel, line) {
      out.push({
        nc: Object.assign({}, nc), ec: Object.assign({}, ec),
        d: Object.assign({}, dval), f: Object.assign({}, fval),
        order: order.slice(), desc: desc, panel: panel,
        line: line == null ? -1 : line
      });
    }

    function panelQ(q, cur) {
      return '<b>Q:</b> [' + q.map(function (x) { return NAME[x]; }).join(', ') + ']' +
        (cur != null ? ' &nbsp;\u00b7&nbsp; <b>processing:</b> ' + NAME[cur] : '');
    }
    function panelStack(stack, cur) {
      return '<b>Stack:</b> [' + stack.map(function (x) { return NAME[x]; }).join(', ') + ']' +
        (cur != null ? ' &nbsp;\u00b7&nbsp; <b>at:</b> ' + NAME[cur] : '');
    }
    function panelTopo(stack, topo, cur) {
      var s = '<b>Stack:</b> [' + stack.map(function (x) { return NAME[x]; }).join(', ') + ']';
      if (cur != null) s += ' &nbsp;\u00b7&nbsp; <b>at:</b> ' + NAME[cur];
      s += '<br><b>Order:</b> ' + (topo.length ? topo.map(function (i) { return NAME[i]; }).join(' \u2192 ') : '(building\u2026)');
      return s;
    }

    function genBFS(start) {
      resetState();
      var q = [start];
      nc[start] = 'gray'; dval[start] = 0;
      rec('Set ' + NAME[start] + '.d = 0, enqueue source.', panelQ(q, start));
      while (q.length) {
        var u = q.shift(); nc[u] = 'cur';
        rec('Dequeue ' + NAME[u] + ' (d = ' + dval[u] + ').', panelQ(q, u));
        ADJ[u].forEach(function (v) {
          var prev = ec[edgeKeys(u, v)[0]] || 'def';
          setEdge(u, v, 'look');
          rec('Check edge ' + NAME[u] + '\u2013' + NAME[v] + '.', panelQ(q, u));
          if (nc[v] === 'white') {
            nc[v] = 'gray'; dval[v] = dval[u] + 1;
            setEdge(u, v, 'tree'); q.push(v);
            rec('Discover ' + NAME[v] + ', d = ' + dval[v] + '.', panelQ(q, u));
          } else {
            setEdge(u, v, (prev === 'tree' || prev === 'back') ? prev : 'def');
            rec(NAME[v] + ' already discovered.', panelQ(q, u));
          }
        });
        nc[u] = 'black';
        rec('Finish ' + NAME[u] + ' (black).', panelQ(q));
      }
      rec('BFS complete.', panelQ([]));
      return out;
    }

    function genDFS(start) {
      resetState();
      var time = { t: 0 }, stack = [];
      (function visit(u, parent) {
        time.t++; dval[u] = time.t; nc[u] = 'gray'; stack.push(u);
        rec('Discover ' + NAME[u] + ', d = ' + dval[u] + '.', panelStack(stack, u));
        ADJ[u].forEach(function (v) {
          if (v === parent) return;
          var prev = ec[edgeKeys(u, v)[0]] || 'def';
          setEdge(u, v, 'look');
          rec('Explore edge to ' + NAME[v] + '.', panelStack(stack, u));
          if (nc[v] === 'white') {
            setEdge(u, v, 'tree'); visit(v, u); nc[u] = 'gray';
            rec('Back at ' + NAME[u] + '.', panelStack(stack, u));
          } else if (nc[v] === 'gray') {
            setEdge(u, v, 'back');
            rec('Back edge to ' + NAME[v] + ' (cycle!).', panelStack(stack, u));
          } else {
            setEdge(u, v, (prev === 'tree' || prev === 'back' || prev === 'mst') ? prev : 'def');
            rec(NAME[v] + ' finished.', panelStack(stack, u));
          }
        });
        time.t++; fval[u] = time.t; nc[u] = 'black'; stack.pop();
        rec('Finish ' + NAME[u] + ', f = ' + fval[u] + '.', panelStack(stack));
      })(start, -1);
      rec('DFS complete.', panelStack([]));
      return out;
    }

    function genTopo() {
      resetState();
      var time = { t: 0 }, stack = [], topo = [];
      function visit(u) {
        time.t++; dval[u] = time.t; nc[u] = 'gray'; stack.push(u);
        rec('Discover ' + NAME[u] + ', d = ' + dval[u] + '.', panelTopo(stack, topo, u));
        ADJ[u].forEach(function (v) {
          setEdge(u, v, 'look');
          rec('Follow edge ' + NAME[u] + ' \u2192 ' + NAME[v] + '.', panelTopo(stack, topo, u));
          if (nc[v] === 'white') {
            setEdge(u, v, 'tree'); visit(v); nc[u] = 'gray';
          } else {
            setEdge(u, v, ec[dekey(u, v)] === 'tree' ? 'tree' : 'def');
            rec(NAME[v] + ' already visited.', panelTopo(stack, topo, u));
          }
        });
        time.t++; fval[u] = time.t; nc[u] = 'black'; stack.pop();
        topo.unshift(u); order = topo.slice();
        rec('Finish ' + NAME[u] + ' \u2192 prepend to order.', panelTopo(stack, topo));
      }
      visit(0);
      rec('Order: ' + topo.map(function (i) { return NAME[i]; }).join(' \u2192 '), panelTopo([], topo));
      return out;
    }

    function makeUF(n) {
      var parent = [], rank = [];
      for (var i = 0; i < n; i++) { parent[i] = i; rank[i] = 0; }
      function find(x) { while (parent[x] !== x) x = parent[x]; return x; }
      function union(a, b) {
        var ra = find(a), rb = find(b);
        if (ra === rb) return false;
        if (rank[ra] < rank[rb]) parent[ra] = rb;
        else if (rank[ra] > rank[rb]) parent[rb] = ra;
        else { parent[rb] = ra; rank[ra]++; }
        return true;
      }
      function components(labels) {
        var buckets = {}, i, r;
        for (i = 0; i < n; i++) {
          r = find(i);
          if (!buckets[r]) buckets[r] = [];
          buckets[r].push(labels[i]);
        }
        return Object.keys(buckets).map(function (k) {
          return buckets[k].sort().join(', ');
        }).sort().map(function (s) { return '{' + s + '}'; }).join(' &nbsp; ');
      }
      return { find: find, union: union, components: components };
    }

    function panelKruskal(mstW, uf, findInfo) {
      var s = '<b>Disjoint sets:</b> ' + uf.components(NAME);
      if (findInfo) s += '<br><b>Find:</b> ' + findInfo;
      s += '<br><b>MST weight:</b> ' + mstW;
      return s;
    }

    function genKruskal() {
      resetState();
      var uf = makeUF(scenario.nodes.length);
      var sorted = scenario.edges.slice().sort(function (a, b) { return a[2] - b[2]; });
      var mstW = 0, mstCount = 0;
      rec('Sort edges by weight. Each vertex starts in its own set.', panelKruskal(0, uf, null), 1);
      for (var i = 0; i < sorted.length; i++) {
        var e = sorted[i], u = e[0], v = e[1], w = e[2];
        var k = ekey(u, v);
        ec[k] = 'look';
        var ru = uf.find(u), rv = uf.find(v);
        var findInfo = NAME[u] + ' \u2192 ' + NAME[ru] + ', &nbsp; ' + NAME[v] + ' \u2192 ' + NAME[rv];
        rec('Consider ' + NAME[u] + '\u2013' + NAME[v] + ' (w=' + w + ').',
          panelKruskal(mstW, uf, findInfo), 5);
        if (ru !== rv) {
          uf.union(u, v); ec[k] = 'mst'; nc[u] = nc[v] = 'in';
          mstW += w; mstCount++;
          rec('Different sets \u2192 Union(' + NAME[u] + ', ' + NAME[v] + '). Add edge to MST.',
            panelKruskal(mstW, uf, null), 6);
          if (mstCount === scenario.nodes.length - 1) break;
        } else {
          ec[k] = 'reject';
          rec('Same set \u2192 skip (would form a cycle).', panelKruskal(mstW, uf, null), 5);
        }
      }
      rec('MST complete. Weight = ' + mstW + '.', panelKruskal(mstW, uf, null), 9);
      return out;
    }

    function makeMinHeap(labels) {
      var h = [];
      function swap(i, j) { var t = h[i]; h[i] = h[j]; h[j] = t; }
      function parent(i) { return Math.floor((i - 1) / 2); }
      function left(i) { return 2 * i + 1; }
      function right(i) { return 2 * i + 2; }
      function idxOf(id) {
        for (var i = 0; i < h.length; i++) if (h[i].id === id) return i;
        return -1;
      }
      function heapifyUp(i) {
        while (i > 0 && h[parent(i)].key > h[i].key) {
          swap(i, parent(i));
          i = parent(i);
        }
      }
      function heapifyDown(i) {
        var smallest = i, l = left(i), r = right(i);
        if (l < h.length && h[l].key < h[smallest].key) smallest = l;
        if (r < h.length && h[r].key < h[smallest].key) smallest = r;
        if (smallest !== i) { swap(i, smallest); heapifyDown(smallest); }
      }
      function fmt(entry) {
        return labels[entry.id] + ':' + (entry.key === Infinity ? '\u221E' : entry.key);
      }
      return {
        insert: function (id, key) {
          h.push({ id: id, key: key });
          heapifyUp(h.length - 1);
        },
        decreaseKey: function (id, key) {
          var i = idxOf(id);
          if (i < 0 || key >= h[i].key) return;
          h[i].key = key;
          heapifyUp(i);
        },
        extractMin: function () {
          if (!h.length) return null;
          var min = h[0];
          if (h.length === 1) { h.pop(); return min; }
          h[0] = h.pop();
          heapifyDown(0);
          return min;
        },
        isEmpty: function () { return h.length === 0; },
        display: function () {
          if (!h.length) return '(empty)';
          return h.map(fmt).join(', ');
        }
      };
    }

    function primMstWeight() {
      var total = 0;
      scenario.edges.forEach(function (e) {
        if (ec[ekey(e[0], e[1])] === 'mst') total += e[2];
      });
      return total;
    }

    function primMstEdgeList() {
      var list = [];
      scenario.edges.forEach(function (e) {
        var k = ekey(e[0], e[1]);
        if (ec[k] === 'mst') {
          list.push({ label: NAME[e[0]] + '\u2013' + NAME[e[1]], w: e[2] });
        }
      });
      list.sort(function (a, b) { return a.w - b.w || a.label.localeCompare(b.label); });
      return list.map(function (x) { return x.label + ' (' + x.w + ')'; }).join(', ');
    }

    function refreshPrimCandidates(par, inTree) {
      scenario.edges.forEach(function (e) {
        var k = ekey(e[0], e[1]);
        if (ec[k] !== 'mst') ec[k] = 'def';
      });
      scenario.nodes.forEach(function (n) {
        var v = n.id, p = par[v];
        if (inTree[v] || p == null || p < 0 || inTree[p]) return;
        setEdge(p, v, 'cand');
      });
    }

    function finalizePrimMst() {
      scenario.edges.forEach(function (e) {
        var k = ekey(e[0], e[1]);
        if (ec[k] !== 'mst') ec[k] = 'def';
      });
    }

    function panelPrim(inTree, heap, action, done) {
      var s = '<b>In tree:</b> {' + Object.keys(inTree).map(function (k) { return NAME[k]; }).join(', ') + '}';
      s += '<br><b>Min-heap:</b> [' + heap.display() + ']';
      if (action) s += '<br>' + action;
      s += '<br><b>MST weight:</b> ' + primMstWeight();
      if (done) s += '<br><b>MST edges:</b> ' + primMstEdgeList();
      return s;
    }

    function genPrim(start) {
      resetState();
      var inTree = {}, key = {}, par = {}, inHeap = {};
      var heap = makeMinHeap(NAME);
      scenario.nodes.forEach(function (n) { key[n.id] = Infinity; });
      key[start] = 0; par[start] = -1;
      heap.insert(start, 0);
      inHeap[start] = true;
      nc[start] = 'gray';
      rec('Start from ' + NAME[start] + '. Insert into min-heap with key 0.',
        panelPrim(inTree, heap, '<b>Insert:</b> ' + NAME[start] + ' (key=0)'), 2);
      var added = 0;
      while (!heap.isEmpty() && added < scenario.nodes.length) {
        var minEntry = heap.extractMin();
        var u = minEntry.id;
        rec('Extract-min from heap.', panelPrim(inTree, heap,
          '<b>Extract-min:</b> ' + NAME[u] + ' (key=' + minEntry.key + ')'), 5);
        if (inTree[u]) continue;
        if (par[u] !== -1) setEdge(par[u], u, 'mst');
        inTree[u] = true; inHeap[u] = false; nc[u] = 'in';
        added++;
        rec('Add ' + NAME[u] + ' to MST.', panelPrim(inTree, heap, null), 9);
        ADJ[u].forEach(function (v) {
          if (inTree[v]) return;
          var w = weight(u, v);
          if (w < key[v]) {
            var old = key[v];
            key[v] = w; par[v] = u;
            nc[v] = 'gray';
            refreshPrimCandidates(par, inTree);
            if (inHeap[v]) {
              heap.decreaseKey(v, w);
              rec('Decrease-key ' + NAME[v] + '.', panelPrim(inTree, heap,
                '<b>Decrease-key:</b> ' + NAME[v] + ': ' + (old === Infinity ? '\u221E' : old) + ' \u2192 ' + w), 14);
            } else {
              heap.insert(v, w);
              inHeap[v] = true;
              rec('Insert ' + NAME[v] + ' into heap.', panelPrim(inTree, heap,
                '<b>Insert:</b> ' + NAME[v] + ' (key=' + w + ')'), 14);
            }
          }
        });
      }
      finalizePrimMst();
      rec('Prim complete. Weight = ' + primMstWeight() + '.', panelPrim(inTree, heap, null, true), 15);
      return out;
    }

    function refreshSPTEdges(parent) {
      scenario.edges.forEach(function (e) {
        var k = ekey(e[0], e[1]);
        if (ec[k] !== 'look') ec[k] = 'def';
      });
      scenario.nodes.forEach(function (n) {
        var v = n.id, p = parent[v];
        if (p != null && p >= 0) setEdge(p, v, 'tree');
      });
    }

    function panelDijkstra(dist, done, heap, action, cur) {
      var s = '<b>PQ (min-heap):</b> [' + heap.display() + ']';
      s += '<br><b>dist[]:</b> ' + scenario.nodes.map(function (n) {
        return NAME[n.id] + ':' + (dist[n.id] === Infinity ? '\u221E' : dist[n.id]);
      }).join('  ');
      var fin = [];
      scenario.nodes.forEach(function (n) {
        if (done[n.id]) fin.push(NAME[n.id]);
      });
      s += '<br><b>Finalized:</b> {' + fin.join(', ') + '}';
      if (action) s += '<br>' + action;
      if (cur != null) s += '<br><b>Just finalized:</b> ' + NAME[cur];
      return s;
    }

    function genDijkstra(start) {
      resetState();
      var dist = {}, done = {}, parent = {}, inHeap = {};
      var heap = makeMinHeap(NAME);
      parent[start] = -1;
      scenario.nodes.forEach(function (n) {
        dist[n.id] = Infinity;
        dval[n.id] = Infinity;
      });
      rec('Initialize dist[v] = \u221E for every vertex.',
        panelDijkstra(dist, done, heap, null), 1);
      dist[start] = 0;
      dval[start] = 0;
      nc[start] = 'gray';
      heap.insert(start, 0);
      inHeap[start] = true;
      rec('Set dist[' + NAME[start] + '] = 0. Insert into PQ.',
        panelDijkstra(dist, done, heap, '<b>Insert:</b> ' + NAME[start] + ' (key=0)'), 3);
      var finalized = 0;
      while (!heap.isEmpty() && finalized < scenario.nodes.length) {
        var minEntry = heap.extractMin();
        var u = minEntry.id;
        rec('Extract-min from PQ.', panelDijkstra(dist, done, heap,
          '<b>Extract-min:</b> ' + NAME[u] + ' (key=' + minEntry.key + ')'), 5);
        if (done[u]) continue;
        done[u] = true; nc[u] = 'black'; finalized++;
        scenario.nodes.forEach(function (n) { dval[n.id] = dist[n.id]; });
        refreshSPTEdges(parent);
        rec('Finalize ' + NAME[u] + ' (dist=' + dist[u] + '); relax outgoing edges.',
          panelDijkstra(dist, done, heap, null, u), 7);
        ADJ[u].forEach(function (v) {
          if (done[v]) return;
          var wgt = weight(u, v);
          setEdge(u, v, 'look');
          if (dist[u] + wgt < dist[v]) {
            var old = dist[v];
            dist[v] = dist[u] + wgt;
            parent[v] = u;
            dval[v] = dist[v];
            nc[v] = 'gray';
            refreshSPTEdges(parent);
            if (inHeap[v]) {
              heap.decreaseKey(v, dist[v]);
              rec('Relax ' + NAME[u] + '\u2013' + NAME[v] + ': dist[' + NAME[v] + '] = ' + dist[u] + ' + ' + wgt + ' = ' + dist[v] + '.',
                panelDijkstra(dist, done, heap,
                  '<b>Decrease-key:</b> ' + NAME[v] + ': ' + (old === Infinity ? '\u221E' : old) + ' \u2192 ' + dist[v]), 10);
            } else {
              heap.insert(v, dist[v]);
              inHeap[v] = true;
              rec('Relax ' + NAME[u] + '\u2013' + NAME[v] + ': dist[' + NAME[v] + '] = ' + dist[v] + '.',
                panelDijkstra(dist, done, heap,
                  '<b>Insert:</b> ' + NAME[v] + ' (key=' + dist[v] + ')'), 10);
            }
          } else {
            refreshSPTEdges(parent);
            rec('Relax ' + NAME[u] + '\u2013' + NAME[v] + ': no improvement (dist[' + NAME[v] + '] stays ' + (dist[v] === Infinity ? '\u221E' : dist[v]) + ').',
              panelDijkstra(dist, done, heap, null, u), 9);
          }
        });
      }
      refreshSPTEdges(parent);
      rec('Dijkstra complete.', panelDijkstra(dist, done, heap, null), 11);
      return out;
    }

    var GENS = {
      bfs: function () { return genBFS(0); },
      dfs: function () { return genDFS(0); },
      topo: function () { return genTopo(); },
      kruskal: function () { return genKruskal(); },
      prim: function () { return genPrim(0); },
      dijkstra: function () { return genDijkstra(0); }
    };

    function metricText(nid, fr) {
      if (mode === 'bfs' || mode === 'dijkstra') {
        var d = fr.d[nid];
        if (d != null && d !== Infinity && isFinite(d)) return String(d);
        return '\u221E';
      }
      if (mode === 'prim' || mode === 'kruskal') return fr.nc[nid] === 'in' ? '\u2713' : '';
      if (mode === 'topo' || mode === 'dfs') {
        var d = fr.d[nid], f = fr.f[nid];
        if (d == null) return '';
        if (f == null) return d + '/';
        return d + '/' + f;
      }
      return '';
    }

    function renderCode() {
      if (!codeBox || typeof window.renderVizCodeLines !== 'function') return;
      if (PSEUDO[mode]) {
        codeLineEls = window.renderVizCodeLines(codeBox, PSEUDO[mode]);
      } else {
        codeBox.innerHTML = '';
        codeLineEls = [];
      }
    }

    function updateLegend() {
      var wgb = $('.leg-wgb'), tree = $('.leg-tree');
      var back = $('.leg-back'), reject = $('.leg-reject');
      var cand = $('.leg-cand');
      var notree = $('.leg-notree');
      var note = $('.gviz-legend-note');
      if (wgb) wgb.style.display = (mode === 'bfs' || mode === 'dfs' || mode === 'topo' || mode === 'dijkstra') ? 'inline-flex' : 'none';
      if (tree) {
        tree.style.display = 'inline-flex';
        tree.innerHTML = mode === 'prim'
          ? '<span class="sw" style="background:#57e0c0"></span> MST edge'
          : mode === 'dijkstra'
            ? '<span class="sw" style="background:#57e0c0"></span> shortest-path tree edge'
            : '<span class="sw" style="background:#57e0c0"></span> tree edge';
      }
      if (cand) cand.style.display = mode === 'prim' ? 'inline-flex' : 'none';
      if (notree) notree.style.display = (mode === 'prim' || mode === 'kruskal') ? 'inline-flex' : 'none';
      if (back) back.style.display = mode === 'dfs' ? 'inline-flex' : 'none';
      if (reject) reject.style.display = mode === 'kruskal' ? 'inline-flex' : 'none';
      if (note) note.innerHTML = NOTES[mode] || '';
    }

    function render() {
      if (!frames.length) return;
      var fr = frames[idx];
      var descEl = $('.viz-desc');
      var panelEl = $('.viz-panel');
      var stepEl = $('.viz-step');
      var totalEl = $('.viz-total');
      scenario.nodes.forEach(function (n) {
        var state = fr.nc[n.id] || 'white';
        var col = NCOL[state] || NCOL.white;
        nodeCircle[n.id].setAttribute('fill', col.fill);
        nodeCircle[n.id].setAttribute('stroke', col.stroke);
        nodeCircle[n.id].setAttribute('stroke-width', state === 'cur' || state === 'in' ? '3' : '2');
        nodeLetter[n.id].setAttribute('fill', col.letter);
        var mt = metricText(n.id, fr);
        nodeMetrics[n.id].textContent = mt;
        if (mode === 'bfs' || mode === 'dijkstra') {
          nodeMetrics[n.id].setAttribute('fill', mt === '\u221E' ? '#64748b' : '#0f172a');
        }
      });
      Object.keys(edgeLine).forEach(function (k) {
        var kind = fr.ec[k] || 'def';
        var ln = edgeLine[k];
        var mstMode = mode === 'prim' || mode === 'kruskal';
        var stroke = ECOL[kind] || ECOL.def;
        if (kind === 'def' && mstMode) stroke = '#1a1a1a';
        ln.setAttribute('stroke', stroke);
        ln.setAttribute('stroke-width',
          kind === 'mst' ? '4' :
          kind === 'tree' ? '3' :
          kind === 'back' || kind === 'reject' ? '3.5' :
          kind === 'look' ? '3' :
          kind === 'cand' ? '2' : '2');
        ln.setAttribute('stroke-dasharray', kind === 'cand' ? '7 5' : 'none');
        ln.setAttribute('opacity', '1');
        if (scenario.directed) {
          var mk = ECOL[kind] ? kind : 'def';
          if (MARKER_KINDS.indexOf(mk) < 0) mk = 'def';
          ln.setAttribute('marker-end', 'url(#' + markerId + '-' + mk + ')');
        }
        var wt = edgeWeight[k];
        if (wt) {
          var inMst = kind === 'mst';
          var fill = inMst ? '#0d9488' : kind === 'reject' ? '#dc2626' : '#64748b';
          if (kind === 'def' && mstMode) fill = '#1a1a1a';
          wt.setAttribute('fill', fill);
          wt.setAttribute('opacity', '1');
          wt.setAttribute('font-weight', inMst ? '900' : '700');
        }
      });
      if (descEl) descEl.textContent = fr.desc;
      if (panelEl) panelEl.innerHTML = fr.panel;
      if (stepEl) stepEl.textContent = idx;
      if (totalEl) totalEl.textContent = frames.length - 1;
      for (var ci = 0; ci < codeLineEls.length; ci++) {
        codeLineEls[ci].classList.toggle('active', ci === fr.line);
      }
      updateLegend();
    }

    function build() {
      stop();
      var algoSel = $('.viz-algo');
      if (algoSel && modes.length > 1 && algoSel.value) mode = algoSel.value;
      if (!mode || !GENS[mode]) mode = modes[0];
      renderCode();
      var scId = ALGO_SCENARIO[mode];
      if (!scenario || scenario.id !== scId) rebuildSvg(SCENARIOS[scId]);
      frames = GENS[mode]();
      idx = 0;
      render();
    }
    function step(dir) { stop(); idx = Math.min(frames.length - 1, Math.max(0, idx + dir)); render(); }
    function stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      var btn = $('.viz-play');
      if (btn) btn.textContent = '\u25B6 Play';
    }
    function play() {
      if (playing) { stop(); return; }
      if (idx >= frames.length - 1) { idx = 0; render(); }
      playing = true;
      $('.viz-play').textContent = '\u23F8 Pause';
      var speed = 1900 - parseInt($('.viz-speed').value, 10);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); return; }
        idx++; render();
      }, speed);
    }

    var algoLabel = $('.viz-algo-label');
    var algoSel = $('.viz-algo');
    if (modes.length > 1 && algoSel) {
      algoSel.innerHTML = modes.map(function (m) {
        return '<option value="' + m + '">' + ALGO_LABELS[m] + '</option>';
      }).join('');
      algoSel.value = mode;
      if (algoLabel) algoLabel.style.display = '';
      algoSel.onchange = build;
    } else if (algoLabel) {
      algoLabel.style.display = 'none';
    }

    $('.viz-play').onclick = play;
    $('.viz-next').onclick = function () { step(1); };
    $('.viz-prev').onclick = function () { step(-1); };
    $('.viz-speed').oninput = function () { if (playing) { stop(); play(); } };
    build();
  }

  function init() {
    document.querySelectorAll('.graph-viz-wrap').forEach(createAnimator);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
