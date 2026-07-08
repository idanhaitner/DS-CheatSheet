/* Graph algorithm animators — one independent instance per .graph-viz-wrap */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  var NR = 24;
  var MET_Y = 38;
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
  var DAG = {
    id: 'dag', directed: true, weighted: false,
    nodes: [
      { id: 0, label: 'A', x: 70, y: 130 }, { id: 1, label: 'B', x: 200, y: 70 },
      { id: 2, label: 'C', x: 200, y: 200 }, { id: 3, label: 'D', x: 340, y: 130 },
      { id: 4, label: 'E', x: 470, y: 130 }, { id: 5, label: 'F', x: 580, y: 130 }
    ],
    edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5]]
  };
  var SCENARIOS = { traverse: TRAVERSE, weighted: WEIGHTED, dag: DAG };
  var ALGO_SCENARIO = {
    bfs: 'traverse', dfs: 'traverse', topo: 'dag',
    kruskal: 'weighted', prim: 'weighted', dijkstra: 'weighted'
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
    back: '#ff6b81', reject: '#ff6b81', mst: '#57e0c0'
  };
  var MARKER_KINDS = ['def', 'tree', 'look', 'back', 'reject', 'mst'];
  var NOTES = {
    bfs: 'Each node shows <b>d</b> (hop distance). Undiscovered = <b>\u221E</b>.',
    dfs: 'Each node shows <b>d/f</b>. <span style="color:#ff6b81">Red</span> = back edge (cycle).',
    topo: 'DFS on a DAG. When a node turns black, it is prepended to the topological order.',
    kruskal: '<span style="color:#57e0c0">Teal</span> = in MST. <span style="color:#ff6b81">Red</span> = skipped (would form cycle).',
    prim: 'Grow tree from A. <span style="color:#57e0c0">Teal edges</span> = MST. <b>\u2713</b> = in tree.',
    dijkstra: ''
  };

  function createAnimator(wrap) {
    var modes = JSON.parse(wrap.dataset.modes || '["bfs"]');
    var mode = wrap.getAttribute('data-default') || modes[0];
    var markerId = 'gv-arrow-' + (uid++);

    var $ = function (sel) { return wrap.querySelector(sel); };
    var stage = $('.graph-stage');
    if (!stage) return;

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

    function rebuildSvg(sc) {
      stage.innerHTML = '';
      nodeCircle = {}; nodeLetter = {}; nodeMetrics = {};
      edgeLine = {}; edgeWeight = {};
      buildAdj(sc);
      svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 640 300');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '300');
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
          var wt = document.createElementNS(SVGNS, 'text');
          wt.setAttribute('x', (a.x + b.x) / 2); wt.setAttribute('y', (a.y + b.y) / 2 - 10);
          wt.setAttribute('text-anchor', 'middle'); wt.setAttribute('dominant-baseline', 'central');
          wt.setAttribute('font-size', String(NUM_FS)); wt.setAttribute('font-weight', '800');
          wt.setAttribute('fill', '#1e293b'); wt.setAttribute('stroke', '#ffffff');
          wt.setAttribute('stroke-width', '4'); wt.setAttribute('paint-order', 'stroke fill');
          wt.setAttribute('font-family', FONT);
          wt.textContent = String(e[2]);
          svg.appendChild(wt);
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
        var metrics = document.createElementNS(SVGNS, 'text');
        metrics.setAttribute('x', n.x); metrics.setAttribute('y', n.y + MET_Y);
        metrics.setAttribute('text-anchor', 'middle'); metrics.setAttribute('dominant-baseline', 'central');
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
    function rec(desc, panel) {
      out.push({
        nc: Object.assign({}, nc), ec: Object.assign({}, ec),
        d: Object.assign({}, dval), f: Object.assign({}, fval),
        order: order.slice(), desc: desc, panel: panel
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
      return { find: find, union: union };
    }

    function genKruskal() {
      resetState();
      var uf = makeUF(scenario.nodes.length);
      var sorted = scenario.edges.slice().sort(function (a, b) { return a[2] - b[2]; });
      var mstW = 0, mstCount = 0;
      rec('Sort edges by weight.', '<b>MST weight:</b> 0');
      for (var i = 0; i < sorted.length; i++) {
        var e = sorted[i], u = e[0], v = e[1], w = e[2];
        var k = ekey(u, v);
        ec[k] = 'look';
        var ru = uf.find(u), rv = uf.find(v);
        rec('Consider ' + NAME[u] + '\u2013' + NAME[v] + ' (w=' + w + '). Find=' + NAME[ru] + ',' + NAME[rv] + '.',
          '<b>MST weight:</b> ' + mstW);
        if (ru !== rv) {
          uf.union(u, v); ec[k] = 'mst'; nc[u] = nc[v] = 'in';
          mstW += w; mstCount++;
          rec('Add to MST (total ' + mstW + ').', '<b>MST weight:</b> ' + mstW);
          if (mstCount === scenario.nodes.length - 1) break;
        } else {
          ec[k] = 'reject';
          rec('Same component \u2192 skip.', '<b>MST weight:</b> ' + mstW);
        }
      }
      rec('MST complete. Weight = ' + mstW + '.', '<b>MST weight:</b> ' + mstW);
      return out;
    }

    function genPrim(start) {
      resetState();
      var inTree = {}, key = {}, par = {};
      scenario.nodes.forEach(function (n) { key[n.id] = Infinity; });
      key[start] = 0; par[start] = -1; nc[start] = 'gray';
      rec('Start from ' + NAME[start] + '.', '<b>In tree:</b> {}');
      for (var step = 0; step < scenario.nodes.length; step++) {
        var u = -1, best = Infinity;
        scenario.nodes.forEach(function (n) {
          if (!inTree[n.id] && key[n.id] < best) { best = key[n.id]; u = n.id; }
        });
        if (par[u] !== -1) setEdge(par[u], u, 'mst');
        inTree[u] = true; nc[u] = 'in';
        rec('Add ' + NAME[u] + ' to tree (key=' + best + ').', panelPrim(inTree, key, u));
        ADJ[u].forEach(function (v) {
          if (inTree[v]) return;
          var w = weight(u, v), ek = ekey(u, v), prev = ec[ek];
          setEdge(u, v, 'look');
          if (w < key[v]) {
            key[v] = w; par[v] = u; setEdge(u, v, 'tree'); nc[v] = 'gray';
            rec('key[' + NAME[v] + '] = ' + w + '.', panelPrim(inTree, key, u));
          } else {
            setEdge(u, v, prev === 'mst' ? 'mst' : 'def');
          }
        });
      }
      var total = 0;
      scenario.edges.forEach(function (e) {
        if (ec[ekey(e[0], e[1])] === 'mst') total += e[2];
      });
      rec('Prim complete. Weight = ' + total + '.', panelPrim(inTree, key, null));
      return out;
    }
    function panelPrim(inTree, key, cur) {
      var fringe = scenario.nodes.filter(function (n) { return !inTree[n.id]; })
        .map(function (n) { return NAME[n.id] + ':' + (key[n.id] === Infinity ? '\u221E' : key[n.id]); }).join('  ');
      var s = '<b>In tree:</b> {' + Object.keys(inTree).map(function (k) { return NAME[k]; }).join(', ') + '}';
      if (cur != null) s += ' &nbsp;\u00b7&nbsp; <b>added:</b> ' + NAME[cur];
      s += '<br><b>key[]:</b> ' + (fringe || '\u2014');
      return s;
    }

    function genDijkstra(start) {
      resetState();
      var dist = {}, done = {};
      scenario.nodes.forEach(function (n) { dist[n.id] = Infinity; });
      dist[start] = 0; nc[start] = 'gray'; dval[start] = 0;
      rec('dist[' + NAME[start] + '] = 0.', panelDijkstra(dist, done, null));
      for (var step = 0; step < scenario.nodes.length; step++) {
        var u = -1, best = Infinity;
        scenario.nodes.forEach(function (n) {
          if (!done[n.id] && dist[n.id] < best) { best = dist[n.id]; u = n.id; }
        });
        done[u] = true; nc[u] = 'black';
        Object.keys(dist).forEach(function (k) { dval[k] = dist[k]; });
        rec('Extract ' + NAME[u] + ' (dist=' + dist[u] + '); relax its outgoing edges.', panelDijkstra(dist, done, u));
        ADJ[u].forEach(function (v) {
          if (done[v]) return;
          var w = weight(u, v);
          setEdge(u, v, 'look');
          if (dist[u] + w < dist[v]) {
            dist[v] = dist[u] + w; dval[v] = dist[v]; nc[v] = 'gray';
            setEdge(u, v, 'tree');
            rec('Relax ' + NAME[u] + '\u2013' + NAME[v] + ': dist[' + NAME[v] + '] = ' + dist[u] + ' + ' + w + ' = ' + dist[v] + '.', panelDijkstra(dist, done, u));
          } else {
            setEdge(u, v, ec[ekey(u, v)] === 'tree' ? 'tree' : 'def');
            rec('Relax ' + NAME[u] + '\u2013' + NAME[v] + ': no improvement (dist[' + NAME[v] + '] stays ' + (dist[v] === Infinity ? '\u221E' : dist[v]) + ').', panelDijkstra(dist, done, u));
          }
        });
      }
      rec('Dijkstra complete.', panelDijkstra(dist, done, null));
      return out;
    }
    function panelDijkstra(dist, done, cur) {
      var s = '<b>dist[]:</b> ' + scenario.nodes.map(function (n) {
        return NAME[n.id] + ':' + (dist[n.id] === Infinity ? '\u221E' : dist[n.id]);
      }).join('  ');
      if (cur != null) s += '<br><b>finalized:</b> ' + NAME[cur];
      return s;
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
        if (fr.d[nid] != null && fr.d[nid] !== Infinity) return String(fr.d[nid]);
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

    function updateLegend() {
      var wgb = $('.leg-wgb'), tree = $('.leg-tree');
      var back = $('.leg-back'), reject = $('.leg-reject');
      var note = $('.gviz-legend-note');
      if (wgb) wgb.style.display = (mode === 'bfs' || mode === 'dfs' || mode === 'topo') ? 'inline-flex' : 'none';
      if (tree) tree.style.display = 'inline-flex';
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
        nodeMetrics[n.id].textContent = metricText(n.id, fr);
      });
      Object.keys(edgeLine).forEach(function (k) {
        var kind = fr.ec[k] || 'def';
        var ln = edgeLine[k];
        ln.setAttribute('stroke', ECOL[kind] || ECOL.def);
        ln.setAttribute('stroke-width',
          kind === 'mst' || kind === 'tree' ? '3' : kind === 'back' || kind === 'reject' ? '3.5' : kind === 'look' ? '3' : '2.5');
        if (scenario.directed) {
          var mk = ECOL[kind] ? kind : 'def';
          if (MARKER_KINDS.indexOf(mk) < 0) mk = 'def';
          ln.setAttribute('marker-end', 'url(#' + markerId + '-' + mk + ')');
        }
      });
      if (descEl) descEl.textContent = fr.desc;
      if (panelEl) panelEl.innerHTML = fr.panel;
      if (stepEl) stepEl.textContent = idx;
      if (totalEl) totalEl.textContent = frames.length - 1;
      updateLegend();
    }

    function build() {
      stop();
      var algoSel = $('.viz-algo');
      if (algoSel && modes.length > 1 && algoSel.value) mode = algoSel.value;
      if (!mode || !GENS[mode]) mode = modes[0];
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
