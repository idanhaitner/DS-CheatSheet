/* Deamortization of rehashing — bright slide-like chaining view. */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = '"Source Sans 3", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  /* Light whiteboard palette — readable in both themes */
  var COL = {
    slot: { fill: '#eef2fb', stroke: '#7c8db5', text: '#1a2038' },
    hotSlot: { fill: '#c7d2fe', stroke: '#4338ca', text: '#1e1b4b' },
    scanSlot: { fill: '#d7f0ea', stroke: '#0d9488', text: '#134e4a' },
    chain: { fill: '#5b6fcf', stroke: '#3b4f9a', text: '#fff' },
    hot: { fill: '#2f9e6a', stroke: '#166534', text: '#fff' },
    copy: { fill: '#7c3aed', stroke: '#5b21b6', text: '#fff' },
    swap: { fill: '#0d9488', stroke: '#115e59', text: '#fff' },
    ink: '#1a2038',
    muted: '#5a6278',
    label: '#334155',
    arrow: '#64748b',
    badgeBg: '#f8fafc',
    badgeStroke: '#94a3b8',
    badgeInk: '#334155'
  };

  function init() {
    var wrap = document.getElementById('deam-viz');
    if (!wrap) return;

    var $ = function (sel) { return wrap.querySelector(sel); };
    var stage = $('#deam-stage');
    var codeBox = $('#deam-code');
    var descEl = $('#deam-desc');
    var panelEl = $('#deam-panel');
    var stepEl = $('#deam-step');
    var totalEl = $('#deam-total');

    var K = function (s) { return '<span class="kw">' + s + '</span>'; };
    var C = function (s) { return '<span class="cm">' + s + '</span>'; };
    var CODE = [
      K('CopyOneStep') + '():',
      '  ' + K('if') + ' p = NULL:',
      '    p ← T[i];  i ← i + 1      ' + C('// open next cell'),
      '  ' + K('else') + ':',
      '    Insert(T′, p);  p ← p.next ' + C('// copy one key'),
      '',
      K('Insert') + '(x):',
      '  insert x into T',
      '  ' + K('if') + ' h(x) ≥ i:               ' + C('// scan not at x yet'),
      '    call CopyOneStep() 4 times',
      '  ' + K('else') + ':                     ' + C('// scan already passed'),
      '    insert x into T′ as well',
      '    call CopyOneStep() 3 times',
      '  ' + K('if') + ' |T| = m:',
      '    T ← T′',
      '    T′ ← new empty table size 4m  ' + C('(smart array)')
    ];
    /* lines:
       0 CopyOneStep  1 if p=NULL  2 open cell  3 else  4 copy key
       6 Insert  7 insert T  8 if h(x)≥i  9 ×4  10 else  11 insert T′  12 ×3
       13 if |T|=m  14 switch  15 new T′
    */

    var M0 = 4;
    var INITIAL = [1, 8];
    var INSERTS = [4, 3];

    var frames = [];
    var idx = 0;
    var timer = null;
    var playing = false;
    var codeLineEls = [];

    function hash(x, size) {
      return ((x % size) + size) % size;
    }
    function emptyTable(size) {
      var t = [];
      for (var i = 0; i < size; i++) t.push([]);
      return t;
    }
    function cloneTable(t) {
      return t.map(function (chain) { return chain.slice(); });
    }
    function countEls(t) {
      var n = 0;
      for (var i = 0; i < t.length; i++) n += t[i].length;
      return n;
    }

    function pushFrame(state, o) {
      frames.push({
        m: state.m,
        T: cloneTable(state.T),
        Tp: cloneTable(state.Tp),
        scanI: state.scanI,
        p: state.p.slice(),
        stepsDone: state.stepsDone,
        stepsTotal: state.stepsTotal,
        nT: countEls(state.T),
        hotT: o.hotT != null ? o.hotT : -1,
        hotTp: o.hotTp != null ? o.hotTp : -1,
        hotKey: o.hotKey != null ? o.hotKey : null,
        scanFlash: !!o.scanFlash,
        copyFlash: !!o.copyFlash,
        swapped: !!o.swapped,
        line: o.line == null ? -1 : o.line,
        desc: o.desc || '',
        panel: o.panel || ''
      });
    }

    function insertKey(table, x) {
      var b = hash(x, table.length);
      table[b].unshift(x); /* prepend like hash animator */
      return b;
    }

    function oneRehashStep(state) {
      if (state.scanI >= state.m && state.p.length === 0) {
        return { kind: 'done', detail: 'Copy finished — all cells read and all keys moved into T′.', name: 'done' };
      }
      if (state.p.length > 0) {
        var x = state.p.shift();
        var b = insertKey(state.Tp, x);
        state.stepsDone++;
        return {
          kind: 'insert',
          key: x,
          bucket: b,
          name: 'Insert(T′, ' + x + ')',
          detail:
            '<b>Copy one key:</b> Insert(T′, <b>' + x + '</b>) into cell ' + b +
            ' of T′, then advance p' +
            (state.p.length ? ' → remaining on this list: [' + state.p.join(' → ') + ']' : ' → p = NULL') + '.'
        };
      }
      var i = state.scanI;
      state.p = state.T[i].slice();
      state.scanI++;
      state.stepsDone++;
      return {
        kind: 'scan',
        bucket: i,
        name: 'p ← T[' + i + ']',
        detail:
          '<b>Read cell T[' + i + ']:</b> set p ← T[' + i + ']' +
          (state.p.length
            ? ' = list [' + state.p.join(' → ') + ']'
            : ' (empty list)') +
          '. Next cell to read will be i = ' + state.scanI + '.'
      };
    }

    function statusPanel(state, extra) {
      var bits = [
        '|T| = ' + countEls(state.T) + ' · m = ' + state.m,
        'scan at cell ' + (state.scanI < state.m ? state.scanI : 'done'),
        'copy work ' + state.stepsDone + '/' + state.stepsTotal
      ];
      if (extra) bits.push(extra);
      return bits.join(' · ');
    }

    function doKSteps(state, k, callLine) {
      var names = [];
      for (var s = 0; s < k; s++) {
        if (state.scanI >= state.m && state.p.length === 0) {
          pushFrame(state, {
            line: callLine,
            desc: 'Nothing left to copy — rehash already finished.',
            panel: statusPanel(state, 'copy done early')
          });
          break;
        }
        var r = oneRehashStep(state);
        names.push(r.name);
        /* Highlight the matching branch inside CopyOneStep */
        var stepLine = r.kind === 'scan' ? 2 : 4;
        pushFrame(state, {
          hotT: r.kind === 'scan' ? r.bucket : -1,
          hotTp: r.kind === 'insert' ? r.bucket : -1,
          hotKey: r.key != null ? r.key : null,
          scanFlash: r.kind === 'scan',
          copyFlash: r.kind === 'insert',
          line: stepLine,
          desc:
            '<b>CopyOneStep ' + (s + 1) + '/' + k + ':</b> ' + r.detail +
            '<br><span style="opacity:.85">This Insert so far: ' + names.join(' → ') + '</span>',
          panel: statusPanel(state, (s + 1) + '/' + k + ' · ' + r.name)
        });
      }
    }

    function buildDemo() {
      frames = [];
      var m = M0;
      var state = {
        m: m,
        T: emptyTable(m),
        Tp: emptyTable(2 * m),
        scanI: 0,
        p: [],
        stepsDone: 0,
        stepsTotal: 2 * m
      };

      INITIAL.forEach(function (x) { insertKey(state.T, x); });

      pushFrame(state, {
        line: -1,
        desc:
          '<b>Start:</b> T has size <b>m = ' + m + '</b> with m/2 keys already. T′ (size 2m) is empty. ' +
          'Each Insert will call <b>CopyOneStep</b> a few times — either open a cell or copy one key.',
        panel: statusPanel(state, 'next: m/2 Inserts')
      });

      INSERTS.forEach(function (x) {
        pushFrame(state, {
          line: 6,
          hotKey: x,
          desc: '<b>Insert(' + x + ')</b> — begin.',
          panel: statusPanel(state, 'new key x = ' + x)
        });

        var bT = insertKey(state.T, x);
        pushFrame(state, {
          line: 7,
          hotT: bT,
          hotKey: x,
          desc:
            'Put <b>' + x + '</b> into T at <b>cell T[' + bT + ']</b> ' +
            '(h(x) = x mod m = ' + bT + '). |T| = <b>' + countEls(state.T) + '</b>.',
          panel: statusPanel(state, 'inserted into T')
        });

        var after = bT >= state.scanI;
        if (after) {
          pushFrame(state, {
            line: 8,
            hotT: bT,
            hotKey: x,
            desc:
              'h(x) = ' + bT + ' ≥ i = ' + state.scanI + ' → scan has <b>not</b> reached this cell yet. ' +
              'Call <b>CopyOneStep() 4 times</b>, then stop.',
            panel: statusPanel(state, 'h(x) ≥ i → 4× CopyOneStep')
          });
          doKSteps(state, 4, 9);
        } else {
          pushFrame(state, {
            line: 10,
            hotT: bT,
            hotKey: x,
            desc:
              'h(x) = ' + bT + ' &lt; i = ' + state.scanI + ' → scan <b>already passed</b> this cell. ' +
              'Also insert into T′, then call <b>CopyOneStep() 3 times</b>.',
            panel: statusPanel(state, 'h(x) < i → also T′ + 3×')
          });
          var bTp = insertKey(state.Tp, x);
          pushFrame(state, {
            line: 11,
            hotTp: bTp,
            hotKey: x,
            desc: 'Also put <b>' + x + '</b> into T′ cell <b>' + bTp + '</b> (x mod 2m).',
            panel: statusPanel(state, 'inserted into T′')
          });
          doKSteps(state, 3, 12);
        }

        if (countEls(state.T) === state.m) {
          pushFrame(state, {
            line: 13,
            desc:
              'T now has <b>m = ' + state.m + '</b> keys. Copy progress: ' +
              state.stepsDone + '/' + state.stepsTotal + '. Switch tables.',
            panel: statusPanel(state, 'phase complete → switch')
          });

          var oldM = state.m;
          var filledTp = cloneTable(state.Tp);
          var newM = state.Tp.length;

          pushFrame(state, {
            line: 14,
            desc:
              '<b>Switch:</b> old T (size ' + oldM + ') is discarded. ' +
              'Filled T′ (size ' + newM + ') becomes the new live T. ' +
              'Allocate empty T′ of size <b>4m = ' + (2 * newM) + '</b> (smart array).',
            panel: 'about to: T ← T′'
          });

          state.T = filledTp;
          state.m = newM;
          state.Tp = emptyTable(2 * newM);
          state.scanI = 0;
          state.p = [];
          state.stepsDone = 0;
          state.stepsTotal = 2 * newM;

          pushFrame(state, {
            line: 15,
            swapped: true,
            desc:
              '<b>After switch:</b> new T size <b>m = ' + newM + '</b>. ' +
              'New empty T′ size <b>4m = ' + (2 * newM) + '</b>. ' +
              'Every Insert stayed Θ(1) worst-case.',
            panel: 'T size ' + newM + ' · new T′ size ' + (2 * newM) + ' (empty)'
          });

          pushFrame(state, {
            line: 15,
            swapped: true,
            desc:
              '<b>Done.</b> The Θ(n) copy (2m copy steps) was spread over m/2 Inserts ' +
              '(at most 4 steps each) → Insert is <b>Θ(1) worst-case</b>.',
            panel: 'deamortization of rehashing'
          });
        }
      });
    }

    /* ── SVG drawing (bright slide look) ── */
    function ensureArrowMarker(svg) {
      var defs = document.createElementNS(SVGNS, 'defs');
      var marker = document.createElementNS(SVGNS, 'marker');
      marker.setAttribute('id', 'deam-arrow');
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '5'); marker.setAttribute('refY', '4');
      marker.setAttribute('markerWidth', '5'); marker.setAttribute('markerHeight', '5');
      marker.setAttribute('orient', 'auto');
      var path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', 'M 0 0 L 8 4 L 0 8 z');
      path.setAttribute('fill', COL.arrow);
      marker.appendChild(path);
      defs.appendChild(marker);
      svg.appendChild(defs);
    }

    function drawArrowDown(svg, x, y1, y2) {
      var ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', x); ln.setAttribute('y1', y1);
      ln.setAttribute('x2', x); ln.setAttribute('y2', y2 - 2);
      ln.setAttribute('stroke', COL.arrow);
      ln.setAttribute('stroke-width', '1.6');
      ln.setAttribute('stroke-linecap', 'round');
      ln.setAttribute('marker-end', 'url(#deam-arrow)');
      svg.appendChild(ln);
    }

    function txt(svg, x, y, text, opts) {
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', x); t.setAttribute('y', y);
      t.setAttribute('text-anchor', opts.anchor || 'middle');
      t.setAttribute('fill', opts.fill || COL.ink);
      t.setAttribute('font-size', String(opts.size || 13));
      t.setAttribute('font-weight', opts.weight || '700');
      t.setAttribute('font-family', FONT);
      t.textContent = text;
      svg.appendChild(t);
      return t;
    }

    function tableLayout(m, chains, ox, top, compact) {
      var bw = compact ? 52 : 68;
      var gap = compact ? 10 : 14;
      var slotH = 36, nodeR = compact ? 17 : 20;
      var chainSpacing = compact ? 42 : 48;
      var slotToChain = 24;
      var maxDepth = 1;
      for (var b = 0; b < m; b++) {
        if (chains[b].length > maxDepth) maxDepth = chains[b].length;
      }
      var viewW = ox + m * (bw + gap) + 28;
      var viewH = top + slotH + slotToChain + maxDepth * chainSpacing + nodeR + 44;
      return {
        bw: bw, gap: gap, ox: ox, top: top, slotH: slotH, nodeR: nodeR,
        chainSpacing: chainSpacing, slotToChain: slotToChain, viewW: viewW, viewH: viewH
      };
    }

    function drawOneTable(svg, label, chains, f, opts) {
      var isT = opts.isT;
      var m = chains.length;
      var compact = m > 8;
      var lay = tableLayout(m, chains, opts.ox, opts.top, compact);
      var bw = lay.bw, gap = lay.gap, ox = lay.ox, top = lay.top;
      var slotH = lay.slotH, nodeR = lay.nodeR;
      var chainSpacing = lay.chainSpacing, slotToChain = lay.slotToChain;

      /* Title on its own row; meta to the right — no overlap with status badges */
      txt(svg, ox, top - 18, label, {
        anchor: 'start',
        fill: f.swapped && isT ? '#0d9488' : COL.label,
        size: 17,
        weight: '800'
      });
      var meta = isT
        ? 'size ' + m + '  ·  |T|=' + f.nT + '/' + f.m
        : 'size ' + m + '  ·  |T′|=' + countEls(chains);
      txt(svg, ox + 118, top - 18, meta, {
        anchor: 'start', fill: COL.muted, size: 14, weight: '600'
      });

      for (var b = 0; b < m; b++) {
        var bx = ox + b * (bw + gap);
        var hotBucket = (isT && f.hotT === b) || (!isT && f.hotTp === b);
        var scanned = isT && b < f.scanI;
        var atScan = isT && b === f.scanI && f.scanI < m;
        var col = COL.slot;
        if (hotBucket) col = COL.hotSlot;
        else if (scanned) col = COL.scanSlot;

        var rect = document.createElementNS(SVGNS, 'rect');
        rect.setAttribute('x', bx); rect.setAttribute('y', top);
        rect.setAttribute('width', bw); rect.setAttribute('height', slotH);
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', col.fill);
        rect.setAttribute('stroke', col.stroke);
        rect.setAttribute('stroke-width', hotBucket || atScan ? '2.75' : '1.75');
        if (scanned && !hotBucket) rect.setAttribute('stroke-dasharray', '3 2');
        svg.appendChild(rect);

        txt(svg, bx + bw / 2, top + 24, String(b), { fill: col.text, size: compact ? 14 : 16 });

        if (isT && atScan) {
          txt(svg, bx + bw / 2, top + slotH + 16, '▲', {
            fill: '#0d9488', size: 14, weight: '800'
          });
        }

        var headY = top + slotH + slotToChain + nodeR;
        if (chains[b].length > 0) {
          drawArrowDown(svg, bx + bw / 2, top + slotH, headY - nodeR);
        }

        var cy = headY;
        for (var c = 0; c < chains[b].length; c++) {
          var k = chains[b][c];
          var cc = COL.chain;
          if (f.hotKey === k) cc = f.copyFlash ? COL.copy : COL.hot;
          if (f.swapped && isT) cc = COL.swap;

          var circ = document.createElementNS(SVGNS, 'circle');
          circ.setAttribute('cx', bx + bw / 2);
          circ.setAttribute('cy', cy);
          circ.setAttribute('r', String(nodeR));
          circ.setAttribute('fill', cc.fill);
          circ.setAttribute('stroke', cc.stroke);
          circ.setAttribute('stroke-width', '2.25');
          svg.appendChild(circ);
          txt(svg, bx + bw / 2, cy + 6, String(k), {
            fill: cc.text, size: compact ? 13 : 16
          });

          if (c < chains[b].length - 1) {
            drawArrowDown(svg, bx + bw / 2, cy + nodeR, cy + chainSpacing - nodeR);
          }
          cy += chainSpacing;
        }
      }
      return lay;
    }

    function drawStatusBadges(svg, f, viewW) {
      var y = 10;
      var gap = 10;
      var right = viewW - 16;
      var items = [];
      items.push({
        label: 'copy ' + f.stepsDone + '/' + f.stepsTotal,
        color: COL.badgeInk,
        stroke: COL.badgeStroke
      });
      if (f.p && f.p.length) {
        items.unshift({
          label: 'p = [' + f.p.join(' → ') + ']',
          color: '#6d28d9',
          stroke: '#7c3aed'
        });
      }

      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        var w = Math.max(118, 10 * it.label.length + 36);
        var bx = right - w;
        right = bx - gap;

        var g = document.createElementNS(SVGNS, 'g');
        var bg = document.createElementNS(SVGNS, 'rect');
        bg.setAttribute('x', bx); bg.setAttribute('y', y);
        bg.setAttribute('width', String(w)); bg.setAttribute('height', '28');
        bg.setAttribute('rx', '7');
        bg.setAttribute('fill', COL.badgeBg);
        bg.setAttribute('stroke', it.stroke);
        bg.setAttribute('stroke-width', '1.5');
        g.appendChild(bg);
        var t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', bx + w / 2); t.setAttribute('y', y + 19);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', it.color);
        t.setAttribute('font-size', '13');
        t.setAttribute('font-weight', '800');
        t.setAttribute('font-family', FONT);
        t.textContent = it.label;
        g.appendChild(t);
        svg.appendChild(g);
      }
    }

    function renderCode() {
      if (typeof window.renderVizCodeLines === 'function') {
        codeLineEls = window.renderVizCodeLines(codeBox, CODE);
      } else {
        codeBox.innerHTML = CODE.join('\n');
        codeLineEls = [];
      }
    }

    function contentWidth(m, compact) {
      var bw = compact ? 52 : 68;
      var gap = compact ? 10 : 14;
      return m * (bw + gap);
    }

    function render() {
      if (!frames.length) return;
      var f = frames[idx];
      stage.innerHTML = '';

      var svg = document.createElementNS(SVGNS, 'svg');
      ensureArrowMarker(svg);

      var padX = 36;
      var top0 = 56;
      var gapY = 56;
      var tW = contentWidth(f.T.length, f.T.length > 8);
      var tpW = contentWidth(f.Tp.length, f.Tp.length > 8);
      var innerW = Math.max(tW, tpW);
      var viewW = innerW + padX * 2 + 24;
      var oxT = padX + Math.floor((innerW - tW) / 2);
      var oxTp = padX + Math.floor((innerW - tpW) / 2);

      var bg = document.createElementNS(SVGNS, 'rect');
      bg.setAttribute('x', 0); bg.setAttribute('y', 0);
      bg.setAttribute('width', String(viewW));
      bg.setAttribute('height', '2000');
      bg.setAttribute('fill', '#f4f7fc');
      svg.appendChild(bg);

      var tLay = drawOneTable(svg, 'T  (live)', f.T, f, { isT: true, ox: oxT, top: top0 });
      var tpTop = tLay.viewH + gapY;
      var tpLay = drawOneTable(svg, 'T′  (building)', f.Tp, f, { isT: false, ox: oxTp, top: tpTop });

      var viewH = tpLay.viewH + 28;
      bg.setAttribute('height', String(viewH));
      drawStatusBadges(svg, f, viewW);

      svg.setAttribute('viewBox', '0 0 ' + viewW + ' ' + viewH);
      svg.setAttribute('width', String(viewW));
      svg.setAttribute('height', String(viewH));
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('class', 'deam-viz-svg');
      stage.appendChild(svg);

      for (var k = 0; k < codeLineEls.length; k++) {
        codeLineEls[k].classList.toggle('active', k === f.line);
      }
      descEl.innerHTML = f.desc;
      panelEl.innerHTML = f.panel || '';
      stepEl.textContent = idx;
      totalEl.textContent = Math.max(0, frames.length - 1);
    }

    function stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      $('#deam-play').textContent = '\u25B6 Play';
    }
    function play() {
      if (playing) { stop(); return; }
      if (idx >= frames.length - 1) { idx = 0; render(); }
      playing = true;
      $('#deam-play').textContent = '\u23F8 Pause';
      var speed = 1800 - parseInt($('#deam-speed').value, 10);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); return; }
        idx++;
        render();
      }, speed);
    }
    function step(dir) {
      stop();
      idx = Math.min(frames.length - 1, Math.max(0, idx + dir));
      render();
    }
    function rebuild() {
      stop();
      renderCode();
      buildDemo();
      idx = 0;
      render();
    }

    $('#deam-play').onclick = play;
    $('#deam-prev').onclick = function () { step(-1); };
    $('#deam-next').onclick = function () { step(1); };
    $('#deam-reset').onclick = rebuild;
    $('#deam-speed').oninput = function () { if (playing) { stop(); play(); } };

    rebuild();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
