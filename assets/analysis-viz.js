/* Interactive analysis visuals: green/red Quicksort, MoM proof, white-path, skip-path. */
(function () {
  'use strict';

  function $(root, sel) { return root.querySelector(sel); }
  function $$(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function bindPlayer(root, getSteps, render) {
    var idx = 0;
    var timer = null;
    var playBtn = $(root, '.viz-play');
    var prevBtn = $(root, '.viz-prev');
    var nextBtn = $(root, '.viz-next');
    var speedEl = $(root, '.viz-speed');
    var stepEl = $(root, '.viz-step');
    var totalEl = $(root, '.viz-total');
    var descEl = $(root, '.viz-desc');

    function steps() { return getSteps(); }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      if (playBtn) playBtn.textContent = '▶ Play';
    }

    function show(i) {
      var s = steps();
      if (!s.length) return;
      idx = Math.max(0, Math.min(i, s.length - 1));
      if (stepEl) stepEl.textContent = String(idx + 1);
      if (totalEl) totalEl.textContent = String(s.length);
      if (descEl) descEl.textContent = s[idx].desc || '';
      render(s[idx], idx, s);
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([root]).catch(function () {});
      }
    }

    function play() {
      var s = steps();
      if (!s.length) return;
      if (timer) { stop(); return; }
      if (idx >= s.length - 1) show(0);
      if (playBtn) playBtn.textContent = '⏸ Pause';
      var delay = speedEl ? (2100 - Number(speedEl.value || 1200)) : 900;
      timer = setInterval(function () {
        if (idx >= steps().length - 1) { stop(); return; }
        show(idx + 1);
      }, Math.max(280, delay));
    }

    if (playBtn) playBtn.onclick = play;
    if (prevBtn) prevBtn.onclick = function () { stop(); show(idx - 1); };
    if (nextBtn) nextBtn.onclick = function () { stop(); show(idx + 1); };
    if (speedEl) speedEl.oninput = function () { if (timer) { stop(); play(); } };

    return {
      reset: function () { stop(); show(0); },
      show: show,
      stop: stop
    };
  }

  /* ========== Green / Red Quicksort tree ========== */
  var RG_TREE = [
    { id: 'n100', x: 270, y: 22, w: 44, h: 26, size: 100, color: 'g', parent: null },
    { id: 'n19',  x: 135, y: 68, w: 40, h: 26, size: 19,  color: 'g', parent: 'n100' },
    { id: 'n80',  x: 405, y: 68, w: 40, h: 26, size: 80,  color: 'r', parent: 'n100' },
    { id: 'n3',   x: 70,  y: 118, w: 34, h: 24, size: 3,   color: 'g', parent: 'n19' },
    { id: 'n15',  x: 195, y: 118, w: 34, h: 24, size: 15,  color: 'r', parent: 'n19' },
    { id: 'n9',   x: 340, y: 118, w: 34, h: 24, size: 9,   color: 'g', parent: 'n80' },
    { id: 'n70',  x: 470, y: 118, w: 34, h: 24, size: 70,  color: 'r', parent: 'n80' },
    { id: 'n1a',  x: 40,  y: 168, w: 30, h: 22, size: 1,   color: 'g', parent: 'n3' },
    { id: 'n1b',  x: 100, y: 168, w: 30, h: 22, size: 1,   color: 'g', parent: 'n3' },
    { id: 'n6',   x: 165, y: 168, w: 30, h: 22, size: 6,   color: 'g', parent: 'n15' },
    { id: 'n8',   x: 225, y: 168, w: 30, h: 22, size: 8,   color: 'g', parent: 'n15' },
    { id: 'n7',   x: 310, y: 168, w: 30, h: 22, size: 7,   color: 'r', parent: 'n9' },
    { id: 'n1c',  x: 370, y: 168, w: 30, h: 22, size: 1,   color: 'g', parent: 'n9' },
    { id: 'n30',  x: 440, y: 168, w: 30, h: 22, size: 30,  color: 'g', parent: 'n70' },
    { id: 'n39',  x: 500, y: 168, w: 30, h: 22, size: 39,  color: 'g', parent: 'n70' }
  ];
  var RG_BY_ID = {};
  RG_TREE.forEach(function (n) { RG_BY_ID[n.id] = n; });

  function rgNodeHtml(n, opts) {
    opts = opts || {};
    var cls = 'rg-node rg-' + n.color + (opts.pulse ? ' is-pulse' : '') + (opts.dim ? ' is-dim' : '') + (opts.hl ? ' is-hl' : '');
    var left = n.x - n.w / 2;
    var top = n.y - n.h / 2;
    var label = opts.label != null ? opts.label : String(n.size);
    return '<div class="' + cls + '" style="left:' + left + 'px;top:' + top + 'px;width:' + n.w + 'px;height:' + n.h + 'px" data-id="' + n.id + '">' +
      '<span>' + label + '</span></div>';
  }

  function rgEdgeSvg(from, to, extraClass) {
    var x1 = from.x, y1 = from.y + from.h / 2 - 2;
    var x2 = to.x, y2 = to.y - to.h / 2 + 2;
    return '<line class="rg-edge' + (extraClass ? ' ' + extraClass : '') + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
  }

  function renderRgTree(stage, state) {
    var visible = state.visible || [];
    var visSet = {};
    visible.forEach(function (id) { visSet[id] = true; });
    var edges = '';
    RG_TREE.forEach(function (n) {
      if (!n.parent || !visSet[n.id] || !visSet[n.parent]) return;
      var cls = '';
      if (state.chain && state.chain.indexOf(n.id) >= 0) cls = 'is-chain';
      edges += rgEdgeSvg(RG_BY_ID[n.parent], n, cls);
    });
    var nodes = '';
    RG_TREE.forEach(function (n) {
      if (!visSet[n.id]) return;
      nodes += rgNodeHtml(n, {
        pulse: state.pulse === n.id,
        dim: state.dim && state.dim.indexOf(n.id) >= 0,
        hl: state.hl && state.hl.indexOf(n.id) >= 0,
        label: state.relabel && state.relabel[n.id] != null ? state.relabel[n.id] : n.size
      });
    });
    var annos = '';
    (state.annos || []).forEach(function (a) {
      annos += '<div class="rg-anno ' + (a.cls || '') + '" style="left:' + a.x + 'px;top:' + a.y + 'px">' + a.html + '</div>';
    });
    var dots = '';
    if (state.dots) {
      [165, 225, 310, 370, 440, 500].forEach(function (x) {
        dots += '<div class="rg-dots" style="left:' + (x - 8) + 'px;top:196px">…</div>';
      });
    }
    stage.innerHTML =
      '<div class="rg-stage-inner">' +
        '<svg class="rg-edges" viewBox="0 0 540 230" preserveAspectRatio="xMidYMin meet">' + edges + '</svg>' +
        '<div class="rg-nodes">' + nodes + dots + annos + '</div>' +
      '</div>';
  }

  function renderRgContradiction(stage) {
    stage.innerHTML =
      '<div class="rg-stage-inner rg-contra">' +
        '<svg class="rg-edges" viewBox="0 0 400 150" preserveAspectRatio="xMidYMin meet">' +
          '<line class="rg-edge" x1="200" y1="38" x2="100" y2="72"/>' +
          '<line class="rg-edge" x1="200" y1="38" x2="300" y2="72"/>' +
          '<line class="rg-x" x1="175" y1="88" x2="225" y2="118"/>' +
          '<line class="rg-x" x1="225" y1="88" x2="175" y2="118"/>' +
        '</svg>' +
        '<div class="rg-nodes">' +
          '<div class="rg-node rg-g" style="left:176px;top:14px;width:48px;height:28px"><span>v</span></div>' +
          '<div class="rg-side-lab" style="left:160px;top:48px">size(v)</div>' +
          '<div class="rg-node rg-r is-dash" style="left:72px;top:82px;width:56px;height:28px"><span>&gt;¾</span></div>' +
          '<div class="rg-node rg-r is-dash" style="left:272px;top:82px;width:56px;height:28px"><span>&gt;¾</span></div>' +
          '<div class="rg-side-lab" style="left:52px;top:120px">&gt; (¾)·size(v)</div>' +
          '<div class="rg-side-lab" style="left:252px;top:120px">&gt; (¾)·size(v)</div>' +
        '</div>' +
      '</div>';
  }

  function renderRgCompare(stage) {
    stage.innerHTML =
      '<div class="rg-compare-live">' +
        '<div class="rg-compare-col">' +
          '<div class="rg-compare-title">Quicksort — full tree</div>' +
          '<p>Each green layer \\(L_i\\): sum of sizes ≤ \\(n\\) → layer cost \\(O(n)\\). \\(O(\\log n)\\) layers → <b>Θ(n log n)</b> expected.</p>' +
          '<div class="rg-mini-tree" aria-hidden="true">' +
            '<div class="rg-node rg-g sm" style="left:88px;top:4px"><span>n</span></div>' +
            '<div class="rg-node rg-g sm" style="left:38px;top:34px"><span></span></div>' +
            '<div class="rg-node rg-r sm" style="left:138px;top:34px"><span></span></div>' +
            '<div class="rg-node rg-g sm" style="left:20px;top:62px"><span></span></div>' +
            '<div class="rg-node rg-r sm" style="left:60px;top:62px"><span></span></div>' +
            '<div class="rg-node rg-g sm" style="left:120px;top:62px"><span></span></div>' +
            '<div class="rg-node rg-r sm" style="left:160px;top:62px"><span></span></div>' +
            '<svg viewBox="0 0 200 84"><line x1="100" y1="16" x2="50" y2="34"/><line x1="100" y1="16" x2="150" y2="34"/><line x1="50" y1="46" x2="30" y2="62"/><line x1="50" y1="46" x2="70" y2="62"/><line x1="150" y1="46" x2="130" y2="62"/><line x1="150" y1="46" x2="170" y2="62"/></svg>' +
          '</div>' +
        '</div>' +
        '<div class="rg-compare-col">' +
          '<div class="rg-compare-title">Randomized-Select — path</div>' +
          '<p>One recursive call per step → one green per layer. Sizes \\(n,\\tfrac34 n,(\\tfrac34)^2 n,\\ldots\\) → geometric series → <b>O(n)</b> expected.</p>' +
          '<div class="rg-path-live" aria-hidden="true">' +
            '<div class="rg-path-node g">\\(n\\)</div>' +
            '<div class="rg-path-edge"></div>' +
            '<div class="rg-path-node r">\\(\\tfrac{3}{4}n\\)</div>' +
            '<div class="rg-path-edge"></div>' +
            '<div class="rg-path-node g">\\((\\tfrac{3}{4})^2 n\\)</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function createRgViz(root) {
    var stage = $(root, '.analysis-stage');
    var modeSel = $(root, '.rg-mode');
    var player;

    function getSteps() {
      var mode = modeSel ? modeSel.value : 'tree';
      if (mode === 'contra') {
        return [
          { kind: 'contra', desc: 'Can both children of v be red? That would mean each has size > (¾)·size(v).' },
          { kind: 'contra', desc: 'Then sum of children > (3/2)·size(v) — impossible (children partition ≈ size(v)).' },
          { kind: 'contra', desc: 'So at most one red child. Red nodes form a path, never a red branching tree.' }
        ];
      }
      if (mode === 'cost') {
        return [
          {
            kind: 'tree',
            visible: RG_TREE.map(function (n) { return n.id; }),
            dots: true,
            pulse: 'n100',
            desc: 'Define cost(v) for a green node = size(v) + sizes along the red chain under it.'
          },
          {
            kind: 'tree',
            visible: RG_TREE.map(function (n) { return n.id; }),
            dots: true,
            hl: ['n100', 'n80', 'n70'],
            chain: ['n80', 'n70'],
            annos: [
              { x: 300, y: 4, html: '\\(v=v_{(0)}\\)' },
              { x: 118, y: 10, cls: 'cost', html: '\\(\\mathrm{cost}=100+80+70\\)' }
            ],
            desc: 'Root green absorbs the red chain 100 → 80 → 70. cost(v) = 100 + 80 + 70.'
          },
          {
            kind: 'tree',
            visible: RG_TREE.map(function (n) { return n.id; }),
            dots: true,
            hl: ['n19', 'n15'],
            chain: ['n15'],
            annos: [
              { x: 8, y: 58, cls: 'cost', html: '\\(\\mathrm{cost}=19+15\\)' },
              { x: 248, y: 108, cls: 'cost', html: '\\(\\mathrm{cost}=9+7\\)' },
              { x: 2, y: 108, cls: 'cost', html: '\\(\\mathrm{cost}=3\\)' }
            ],
            desc: 'Every green has its own cost. size(v₍ᵢ₎) ≤ size(v) and Pr[v₍ᵢ₎ exists] ≤ 1/2ⁱ ⇒ E[cost(v)] ≤ 2·size(v).'
          },
          {
            kind: 'tree',
            visible: RG_TREE.map(function (n) { return n.id; }),
            dots: true,
            annos: [
              { x: 118, y: 10, cls: 'cost', html: '\\(\\mathrm{cost}=100+80+70\\)' },
              { x: 8, y: 58, cls: 'cost', html: '\\(\\mathrm{cost}=19+15\\)' },
              { x: 2, y: 108, cls: 'cost', html: '\\(\\mathrm{cost}=3\\)' },
              { x: 248, y: 108, cls: 'cost', html: '\\(\\mathrm{cost}=9+7\\)' }
            ],
            desc: 'Sum expected costs over green layers: each layer O(n), O(log n) layers → Θ(n log n) for Quicksort.'
          }
        ];
      }
      if (mode === 'compare') {
        return [
          { kind: 'compare', desc: 'Same coloring. Quicksort recurses on BOTH sides → a full tree of green layers.' },
          { kind: 'compare', desc: 'Select recurses on ONE side → a single path. Green sizes shrink by ≤ ¾ each time → geometric sum O(n).' },
          { kind: 'compare', desc: 'Memory anchors: (1) ≤1 red child (2) Pr[red continues] ≤ 1/2ⁱ (3) QS = layers×n; Select = geometric path.' }
        ];
      }
      /* tree build */
      return [
        {
          kind: 'tree',
          visible: ['n100'],
          pulse: 'n100',
          desc: 'Root is always green. size(v) = subarray length of the recursive call.'
        },
        {
          kind: 'tree',
          visible: ['n100', 'n19', 'n80'],
          pulse: 'n80',
          desc: 'Child is green if size ≤ (¾)·parent, else red. 19 ≤ ¾·100 → green; 80 > ¾·100 → red.'
        },
        {
          kind: 'tree',
          visible: ['n100', 'n19', 'n80', 'n3', 'n15', 'n9', 'n70'],
          pulse: 'n70',
          desc: 'Red chains continue while splits stay bad. Here 80 → 70 is still red (70 > ¾·80).'
        },
        {
          kind: 'tree',
          visible: RG_TREE.map(function (n) { return n.id; }),
          dots: true,
          hl: ['n100', 'n80', 'n70'],
          chain: ['n80', 'n70'],
          desc: 'Full colored recursion tree. Red nodes form paths hanging off green parents — never a red binary tree.'
        },
        {
          kind: 'tree',
          visible: RG_TREE.map(function (n) { return n.id; }),
          dots: true,
          desc: 'Color = split quality; number = size(v). Same idea is reused for Randomized-Select.'
        }
      ];
    }

    function render(step) {
      if (step.kind === 'contra') renderRgContradiction(stage);
      else if (step.kind === 'compare') renderRgCompare(stage);
      else renderRgTree(stage, step);
    }

    player = bindPlayer(root, getSteps, render);
    if (modeSel) {
      modeSel.onchange = function () { player.reset(); };
    }
    player.reset();
  }

  /* ========== Median of medians proof ========== */
  function createMomViz(root) {
    var stage = $(root, '.analysis-stage');
    var player;

    var COLS = [
      { lab: '≥ x', kind: 'ge', cells: ['hi', 'hi', 'med', 'lo', 'lo'], mid: 'm≥x' },
      { lab: '≥ x', kind: 'ge', cells: ['hi', 'hi', 'med', 'lo', 'lo'], mid: 'm≥x' },
      { lab: 'pivot', kind: 'x', cells: ['', '', 'x', '', ''], mid: 'x' },
      { lab: '≤ x', kind: 'le', cells: ['', '', 'med-lo', '', ''], mid: 'm≤x' },
      { lab: '≤ x', kind: 'le', cells: ['', '', 'med-lo', '', ''], mid: 'm≤x' }
    ];

    function gridHtml(state) {
      var html = '<div class="mom-cap">' + (state.cap || 'Each column = sorted group of 5 · middle row = medians · x = median of medians') + '</div>';
      html += '<div class="mom-grid" dir="ltr">';
      COLS.forEach(function (col, ci) {
        var colCls = 'mom-col' + (col.kind === 'x' ? ' mom-x' : '');
        if (state.hlCols && state.hlCols.indexOf(ci) >= 0) colCls += ' is-hl';
        if (state.dimCols && state.dimCols.indexOf(ci) >= 0) colCls += ' is-dim';
        html += '<div class="' + colCls + '">';
        col.cells.forEach(function (cls, ri) {
          var show = true;
          if (state.reveal === 'outline') cls = '';
          if (state.reveal === 'medians' && ri !== 2) cls = '';
          if (state.reveal === 'x' && !(ci === 2 && ri === 2)) {
            if (ri === 2) cls = cls.indexOf('med') >= 0 || cls === 'x' ? cls : '';
            else cls = '';
          }
          var ccls = 'mom-cell' + (cls ? ' ' + cls : '');
          if (state.pulse && state.pulse[0] === ci && state.pulse[1] === ri) ccls += ' is-pulse';
          if (state.hideLo && (cls === 'lo' || cls === '')) {
            /* keep */
          }
          var text = '·';
          if (ri === 2) {
            if (col.kind === 'x') text = 'x';
            else if (cls === 'med' || (state.reveal !== 'outline' && col.kind === 'ge')) text = col.mid;
            else if (cls === 'med-lo' || (state.reveal !== 'outline' && col.kind === 'le')) text = col.mid;
          }
          if (state.reveal === 'outline') text = '·';
          if (state.reveal === 'medians' && ri !== 2) text = '·';
          if (state.countGe && col.kind === 'ge' && (ri === 0 || ri === 1 || ri === 2)) {
            ccls += ' is-count';
            if (ri === 2) text = 'm≥x';
          }
          html += '<div class="' + ccls + '">' + text + '</div>';
        });
        html += '<div class="mom-lab">' + col.lab + '</div></div>';
      });
      html += '</div>';
      if (state.formula) {
        html += '<div class="mom-formula">' + state.formula + '</div>';
      }
      return html;
    }

    function getSteps() {
      return [
        {
          reveal: 'outline',
          desc: 'Split into ⌈n/5⌉ groups of 5. Sort each group (constant time). Middle entry = group median.',
          cap: 'Step 1 — groups of 5 (columns)'
        },
        {
          reveal: 'medians',
          desc: 'Collect the group medians. Recursively Select the median of those medians → pivot x.',
          cap: 'Step 2 — median row · x = median of medians',
          pulse: [2, 2]
        },
        {
          reveal: 'full',
          hlCols: [0, 1],
          desc: 'About half the group-medians are ≥ x (excluding x’s own group) ≈ n/10 groups.',
          cap: 'Step 3 — groups whose median ≥ x'
        },
        {
          reveal: 'full',
          hlCols: [0, 1],
          countGe: true,
          desc: 'In each such group: median + two larger elements ⇒ ≥ 3 elements ≥ x.',
          cap: 'Step 4 — at least 3 guaranteed ≥ x per group',
          formula: '\\(3 \\cdot \\frac{n}{10} = \\frac{3n}{10}\\) elements guaranteed ≥ x'
        },
        {
          reveal: 'full',
          hlCols: [0, 1],
          countGe: true,
          desc: 'So the other side of the partition has ≤ n − 3n/10 = 7n/10 elements (plus O(1) floor terms).',
          cap: 'Step 5 — recursive Select ≤ 7n/10',
          formula: '\\(\\text{recurse on } \\le \\tfrac{7}{10}n + 6 \\qquad\\Rightarrow\\qquad T(n)=T(n/5)+T(7n/10)+\\Theta(n)=\\Theta(n)\\)'
        },
        {
          reveal: 'full',
          desc: 'Symmetric argument for elements ≤ x. Groups of 3 fail: 1/3 + 2/3 = 1 → not linear.',
          cap: 'Done — worst-case linear Select',
          formula: 'Exact floors: ≥ 3n/10 − 6 on each side · groups of 5 needed for 1/5 + 7/10 < 1'
        }
      ];
    }

    function render(step) {
      stage.innerHTML = gridHtml(step);
    }

    player = bindPlayer(root, getSteps, render);
    player.reset();
  }

  /* ========== White-path theorem ========== */
  function createWhitePathViz(root) {
    var stage = $(root, '.analysis-stage');
    var player;

    var NODES = {
      a: { x: 250, y: 50, label: 'a' },
      b: { x: 90, y: 160, label: 'b' },
      c: { x: 410, y: 160, label: 'c' },
      d: { x: 250, y: 280, label: 'd' }
    };
    /* edges: tree / forward / back / plain */
    var EDGES = [
      { u: 'a', v: 'b', type: 'tree' },
      { u: 'b', v: 'c', type: 'tree' },
      { u: 'c', v: 'd', type: 'tree' },
      { u: 'a', v: 'c', type: 'fwd' },
      { u: 'd', v: 'b', type: 'back' }
    ];
    var TIMES = { a: '1 / 8', b: '2 / 7', c: '3 / 6', d: '4 / 5' };

    function edgePath(u, v) {
      var A = NODES[u], B = NODES[v];
      var dx = B.x - A.x, dy = B.y - A.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len;
      var r = 22;
      return {
        x1: A.x + ux * r, y1: A.y + uy * r,
        x2: B.x - ux * r, y2: B.y - uy * r
      };
    }

    function renderGraph(state) {
      var colors = state.colors || { a: 'white', b: 'white', c: 'white', d: 'white' };
      var showTimes = !!state.showTimes;
      var activeEdges = state.edges || []; /* list of {u,v,cls} */
      var pathGlow = state.path || []; /* list of node ids on white path */

      var defs =
        '<defs>' +
        '<marker id="wp-tree" markerWidth="7" markerHeight="7" refX="6.5" refY="3.5" orient="auto"><path d="M0,0.8 L6.5,3.5 L0,6.2 Z" fill="#0d9488"/></marker>' +
        '<marker id="wp-fwd" markerWidth="7" markerHeight="7" refX="6.5" refY="3.5" orient="auto"><path d="M0,0.8 L6.5,3.5 L0,6.2 Z" fill="#d97706"/></marker>' +
        '<marker id="wp-back" markerWidth="7" markerHeight="7" refX="6.5" refY="3.5" orient="auto"><path d="M0,0.8 L6.5,3.5 L0,6.2 Z" fill="#e11d48"/></marker>' +
        '<marker id="wp-path" markerWidth="7" markerHeight="7" refX="6.5" refY="3.5" orient="auto"><path d="M0,0.8 L6.5,3.5 L0,6.2 Z" fill="#38bdf8"/></marker>' +
        '</defs>';

      var lines = '';
      EDGES.forEach(function (e) {
        var show = activeEdges.some(function (ae) { return ae.u === e.u && ae.v === e.v; });
        var ae = activeEdges.find(function (x) { return x.u === e.u && x.v === e.v; });
        var p = edgePath(e.u, e.v);
        var stroke = '#64748b';
        var sw = 2;
        var dash = '';
        var marker = '';
        var opacity = show ? 1 : 0.22;
        var cls = ae && ae.cls ? ae.cls : e.type;
        if (cls === 'tree') { stroke = '#0d9488'; sw = 3.2; marker = 'url(#wp-tree)'; }
        else if (cls === 'fwd') { stroke = '#d97706'; sw = 2.4; dash = '6 4'; marker = 'url(#wp-fwd)'; }
        else if (cls === 'back') { stroke = '#e11d48'; sw = 2.4; dash = '6 4'; marker = 'url(#wp-back)'; }
        else if (cls === 'path') { stroke = '#38bdf8'; sw = 3.4; marker = 'url(#wp-path)'; }
        else if (cls === 'plain') { stroke = '#94a3b8'; sw = 2; }
        lines += '<line class="wp-e" x1="' + p.x1 + '" y1="' + p.y1 + '" x2="' + p.x2 + '" y2="' + p.y2 +
          '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-opacity="' + opacity + '"' +
          (dash ? ' stroke-dasharray="' + dash + '"' : '') +
          (marker ? ' marker-end="' + marker + '"' : '') + '/>';
      });

      /* glow path segments */
      if (pathGlow.length >= 2) {
        for (var i = 0; i < pathGlow.length - 1; i++) {
          var p2 = edgePath(pathGlow[i], pathGlow[i + 1]);
          lines += '<line class="wp-path-glow" x1="' + p2.x1 + '" y1="' + p2.y1 + '" x2="' + p2.x2 + '" y2="' + p2.y2 +
            '" stroke="#38bdf8" stroke-width="5" stroke-opacity="0.35"/>';
        }
      }

      var circles = '';
      Object.keys(NODES).forEach(function (id) {
        var n = NODES[id];
        var col = colors[id] || 'white';
        var fill = col === 'white' ? '#ffffff' : (col === 'gray' ? '#9ca3af' : '#1a1a1a');
        var ink = col === 'black' ? '#f8fafc' : '#0f172a';
        var ring = pathGlow.indexOf(id) >= 0 ? ' stroke="#38bdf8" stroke-width="3.5"' : ' stroke="#94a3b8" stroke-width="2.2"';
        var pulse = state.pulse === id ? ' class="wp-pulse"' : '';
        circles += '<g' + pulse + '>' +
          '<circle cx="' + n.x + '" cy="' + n.y + '" r="22" fill="' + fill + '"' + ring + '/>' +
          '<text x="' + n.x + '" y="' + n.y + '" text-anchor="middle" dominant-baseline="central" fill="' + ink +
          '" font-size="15" font-weight="800" font-family="Source Sans 3,Segoe UI,sans-serif">' + n.label + '</text>';
        if (showTimes) {
          circles += '<text x="' + n.x + '" y="' + (n.y + 34) + '" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="700">' +
            TIMES[id] + '</text>';
        }
        circles += '</g>';
      });

      var banner = state.banner ? '<div class="wp-banner">' + state.banner + '</div>' : '';

      stage.innerHTML =
        banner +
        '<svg class="wp-svg" viewBox="0 0 500 340" role="img">' + defs + lines + circles + '</svg>' +
        '<div class="wp-legend">' +
          '<span><i class="sw-w"></i> white</span>' +
          '<span><i class="sw-g"></i> gray</span>' +
          '<span><i class="sw-b"></i> black</span>' +
          '<span><i class="sw-path"></i> white path</span>' +
          '<span><i class="sw-tree"></i> tree</span>' +
          '<span><i class="sw-fwd"></i> forward</span>' +
          '<span><i class="sw-back"></i> back</span>' +
        '</div>';
    }

    function getSteps() {
      var allPlain = EDGES.map(function (e) { return { u: e.u, v: e.v, cls: 'plain' }; });
      return [
        {
          colors: { a: 'white', b: 'white', c: 'white', d: 'white' },
          edges: allPlain,
          desc: 'Directed graph: a→b, a→c, b→c, c→d, d→b. Run DFS from a (neighbors in letter order).',
          banner: 'All vertices white · start DFS(a)'
        },
        {
          colors: { a: 'gray', b: 'white', c: 'white', d: 'white' },
          edges: allPlain,
          pulse: 'a',
          path: ['a', 'b', 'c'],
          desc: 'At time d[a]=1, a is gray. Path a→b→c is all-white (except a). White-path ⇒ c will be a descendant of a.',
          banner: 'White path at d[a]: a → b → c  (also a→c direct)'
        },
        {
          colors: { a: 'gray', b: 'gray', c: 'white', d: 'white' },
          edges: [{ u: 'a', v: 'b', cls: 'tree' }].concat(allPlain.filter(function (e) { return !(e.u === 'a' && e.v === 'b'); })),
          pulse: 'b',
          path: ['b', 'c', 'd'],
          desc: 'Discover b (tree edge a→b). At d[b], path b→c→d is white ⇒ d will be a descendant of b.',
          banner: 'White path at d[b]: b → c → d'
        },
        {
          colors: { a: 'gray', b: 'gray', c: 'gray', d: 'gray' },
          edges: [
            { u: 'a', v: 'b', cls: 'tree' },
            { u: 'b', v: 'c', cls: 'tree' },
            { u: 'c', v: 'd', cls: 'tree' }
          ].concat(allPlain.filter(function (e) {
            return !((e.u === 'a' && e.v === 'b') || (e.u === 'b' && e.v === 'c') || (e.u === 'c' && e.v === 'd'));
          })),
          pulse: 'd',
          showTimes: false,
          desc: 'DFS tree grows a→b→c→d. All discoveries so far match the white-path predictions.',
          banner: 'DFS tree: a → b → c → d'
        },
        {
          colors: { a: 'gray', b: 'gray', c: 'black', d: 'black' },
          edges: [
            { u: 'a', v: 'b', cls: 'tree' },
            { u: 'b', v: 'c', cls: 'tree' },
            { u: 'c', v: 'd', cls: 'tree' },
            { u: 'd', v: 'b', cls: 'back' }
          ].concat([{ u: 'a', v: 'c', cls: 'plain' }]),
          pulse: 'b',
          showTimes: true,
          desc: 'Edge d→b: b is still gray (ancestor) → back edge. Closes cycle b→c→d→b.',
          banner: 'Back edge d→b (b gray) · cycle'
        },
        {
          colors: { a: 'black', b: 'black', c: 'black', d: 'black' },
          edges: [
            { u: 'a', v: 'b', cls: 'tree' },
            { u: 'b', v: 'c', cls: 'tree' },
            { u: 'c', v: 'd', cls: 'tree' },
            { u: 'a', v: 'c', cls: 'fwd' },
            { u: 'd', v: 'b', cls: 'back' }
          ],
          showTimes: true,
          desc: 'When a later checks a→c, c is finished black descendant → forward edge. Intervals: [c.d,c.f] ⊆ [a.d,a.f].',
          banner: 'Forward a→c · final d/f times'
        }
      ];
    }

    function render(step) { renderGraph(step); }

    player = bindPlayer(root, getSteps, render);
    player.reset();
  }

  /* ========== Skip-list reverse path ========== */
  function createSkipPathViz(root) {
    var stage = $(root, '.analysis-stage');
    var player;

    function getSteps() {
      return [
        {
          html:
            '<div class="slp-cap">Forward search is hard to analyze (drop depends on future coins)</div>' +
            '<div class="slp-row"><span class="slp-lab">Level i</span><span class="slp-step">• → • → • ↓</span><span class="slp-note">Rᵢ right-moves, then drop</span></div>' +
            '<div class="slp-row is-dim"><span class="slp-lab">Why hard?</span><span class="slp-step">coin ahead</span><span class="slp-note">where you drop depends on unseen flips</span></div>',
          desc: 'Forward search: at each level you walk right until the next key is too big, then drop. Hard to bound because drop points depend on future coin flips.'
        },
        {
          html:
            '<div class="slp-cap">Trick: analyze the path <b>backwards</b></div>' +
            '<div class="slp-row is-hl"><span class="slp-lab">Reverse</span><span class="slp-step">↑ if possible, else ←</span><span class="slp-note">from found node back to start</span></div>' +
            '<div class="slp-row"><span class="slp-lab">Level i</span><span class="slp-step">← ← ← (then ↑)</span><span class="slp-note">left-moves stop on a promote</span></div>',
          desc: 'From the answer node: go up whenever the tower allows, otherwise left. Each left-move at level i means that node’s coin was “stop”.'
        },
        {
          html:
            '<div class="slp-cap">Geometric: E[Rᵢ] ≤ 1/q − 1 (≤ 1 when q = ½)</div>' +
            '<div class="slp-row is-hl"><span class="slp-lab">Rᵢ</span><span class="slp-step">Geo(q) left-moves</span><span class="slp-note">levels decouple</span></div>' +
            '<div class="slp-row"><span class="slp-lab">Path</span><span class="slp-step">h + Σ Rᵢ</span><span class="slp-note">E ≤ 2 log n + 5 (lecture)</span></div>',
          desc: 'Number of left-moves per level is geometric with success = promote. Same split-sum trick as height ⇒ expected search O(log n).'
        }
      ];
    }

    function render(step) {
      stage.innerHTML = '<div class="slp-fig">' + step.html + '</div>';
    }

    player = bindPlayer(root, getSteps, render);
    player.reset();
  }

  function init() {
    $$ (document, '.analysis-viz-wrap[data-mode="rg"]').forEach(createRgViz);
    $$ (document, '.analysis-viz-wrap[data-mode="mom"]').forEach(createMomViz);
    $$ (document, '.analysis-viz-wrap[data-mode="whitepath"]').forEach(createWhitePathViz);
    $$ (document, '.analysis-viz-wrap[data-mode="skippath"]').forEach(createSkipPathViz);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
