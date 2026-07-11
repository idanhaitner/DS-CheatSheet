/* Binary max-heap animator: buildHeap, insert, extractMax, heapify, increaseKey */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  var NODE_R = 22;
  var NODE_D = NODE_R * 2;

  var NCOL = {
    normal: { fill: '#3f51b5', stroke: '#5c6bc0', text: '#fff' },
    compare: { fill: '#6366f1', stroke: '#818cf8', text: '#fff' },
    swap: { fill: '#7c4dff', stroke: '#a78bfa', text: '#fff' },
    active: { fill: '#2f8f5f', stroke: '#57e0c0', text: '#fff' },
    root: { fill: '#c0533f', stroke: '#ff6b81', text: '#fff' },
    out: { fill: '#455a9e', stroke: '#64748b', text: '#fff' },
    leaf: { fill: '#2a3058', stroke: '#4a5580', text: '#8b9ac8' }
  };

  var HEAP_DEMO = [10, 8, 9, 4, 7, 5, 6];
  var UNORDERED = [4, 10, 3, 5, 1, 8, 2];

  function introFrame(desc, panel, arr, heapSize, extracted, highlight) {
    return {
      desc: desc,
      panel: panel,
      arr: cloneArr(arr),
      heapSize: heapSize,
      extracted: extracted ? extracted.slice() : [],
      highlight: highlight || {},
      phase: ''
    };
  }

  var PRESETS = {
    build: function () {
      return genBuildHeap(cloneArr(UNORDERED), []).frames;
    },
    insert: function () {
      var fr = [introFrame(
        'Valid max-heap: insert <b>15</b> at the end.',
        'Append to A[7], then sift-up while parent &lt; child. Start: A = [10, 8, 9, 4, 7, 5, 6].',
        HEAP_DEMO, 7, [], { root: 0 }
      )];
      return fr.concat(genInsert(cloneArr(HEAP_DEMO), 15, 7, []).frames);
    },
    extract: function () {
      var fr = [introFrame(
        'Valid max-heap: extract the maximum (root).',
        'Swap root with last, shrink heap, then MaxHeapify(0). Start: A = [10, 8, 9, 4, 7, 5, 6].',
        HEAP_DEMO, 7, [], { root: 0 }
      )];
      return fr.concat(genExtractMax(cloneArr(HEAP_DEMO), 7, []).frames);
    },
    heapify: function () {
      var start = [16, 4, 10, 8, 7, 9, 3];
      var fr = [introFrame(
        'MaxHeapify at index <b>1</b>: node 4 is smaller than its children.',
        'Compare with left/right child, swap with larger child, recurse down. A = [16, 4, 10, 8, 7, 9, 3].',
        start, 7, [], { active: 1, compare: [1, 3, 4] }
      )];
      return fr.concat(genHeapify(cloneArr(start), 7, 1, []));
    },
    increase: function () {
      var fr = [introFrame(
        'IncreaseKey: raise A[3] from <b>4</b> to <b>11</b>, then sift-up.',
        'Only increases allowed. Start: A = [10, 8, 9, 4, 7, 5, 6].',
        HEAP_DEMO, 7, [], { active: 3 }
      )];
      return fr.concat(genIncreaseKey(cloneArr(HEAP_DEMO), 7, 3, 11, []).frames);
    }
  };

  function parent(i) { return Math.floor((i - 1) / 2); }
  function left(i) { return 2 * i + 1; }
  function right(i) { return 2 * i + 2; }

  function cloneArr(a) { return a.slice(); }

  function push(fr, snap) {
    fr.push({
      desc: snap.desc,
      panel: snap.panel || '',
      arr: cloneArr(snap.arr),
      heapSize: snap.heapSize,
      highlight: snap.highlight || {},
      extracted: snap.extracted ? snap.extracted.slice() : [],
      phase: snap.phase || ''
    });
  }

  function heapDepth(i) {
    var d = 0, cur = i;
    while (cur > 0) { d++; cur = parent(cur); }
    return d;
  }

  function heapTreeH(n) {
    if (n === 0) return 80;
    var maxD = 0, i;
    for (i = 0; i < n; i++) maxD = Math.max(maxD, heapDepth(i));
    var rowH = maxD <= 1 ? 96 : maxD <= 2 ? 92 : Math.max(78, 320 / (maxD + 1));
    return 40 + maxD * rowH + NODE_D + 20;
  }

  function treeNodeX(i, depth, treeLeft, treeWidth) {
    var slots = 1 << depth;
    var pos = i - (slots - 1);
    var slotW = treeWidth / slots;
    return treeLeft + pos * slotW + slotW / 2;
  }

  function heapMetrics(arr, treeH, heapSize) {
    var arrLen = arr.length;
    var n = heapSize != null ? heapSize : arrLen;
    var gap = 8;
    var cw = Math.min(48, Math.max(34, 560 / Math.max(arrLen, 1)));
    var arrTotalW = arrLen * (cw + gap) - gap;

    var maxD = 0, j;
    for (j = 0; j < n; j++) maxD = Math.max(maxD, heapDepth(j));
    var bottomSlots = Math.max(1, 1 << maxD);
    var sidePad = 24;
    var minW = Math.max(640, arrLen * 58);
    var contentW = Math.max(arrTotalW, bottomSlots * (NODE_D + 40), minW - sidePad * 2);
    var w = Math.max(minW, contentW + sidePad * 2);
    var treeWidth = w - sidePad * 2;
    var treeLeft = sidePad;
    var ax = (w - arrTotalW) / 2;
    var arrY = treeH + 36;
    return {
      w: w, h: arrY + 64, treeH: treeH, arrY: arrY,
      cellW: cw, gap: gap, ax: ax,
      treeLeft: treeLeft, treeWidth: treeWidth,
      cellCenter: function (i) { return ax + i * (cw + gap) + cw / 2; }
    };
  }

  function heapLayout(arr, heapSize, hi, metrics) {
    hi = hi || {};
    var nodes = [], edges = [];
    var n = heapSize != null ? heapSize : arr.length;
    if (n === 0) return { nodes: nodes, edges: edges, treeH: 80 };

    function role(i) {
      if (hi.root === i) return 'root';
      if (hi.swap && (hi.swap[0] === i || hi.swap[1] === i)) return 'swap';
      if (hi.compare && hi.compare.indexOf(i) >= 0) return 'compare';
      if (hi.active === i) return 'active';
      if (hi.out === i) return 'out';
      if (i >= Math.floor(n / 2)) return 'leaf';
      return 'normal';
    }

    var maxD = 0, i;
    for (i = 0; i < n; i++) maxD = Math.max(maxD, heapDepth(i));

    var rowH = maxD <= 1 ? 96 : maxD <= 2 ? 92 : Math.max(78, 320 / (maxD + 1));
    var treeTop = 42;
    var treeLeft = metrics ? metrics.treeLeft : 40;
    var treeWidth = metrics ? metrics.treeWidth : 520;

    for (i = 0; i < n; i++) {
      var d = heapDepth(i);
      var x = metrics
        ? treeNodeX(i, d, treeLeft, treeWidth)
        : treeNodeX(i, d, 40, 520);
      var y = treeTop + d * rowH;
      var id = 'h' + i;
      nodes.push({
        id: id, label: String(arr[i]), idx: i,
        x: x, y: y, role: role(i)
      });
      if (left(i) < n) edges.push([id, 'h' + left(i)]);
      if (right(i) < n) edges.push([id, 'h' + right(i)]);
    }

    return { nodes: nodes, edges: edges, treeH: treeTop + maxD * rowH + NODE_D + 16 };
  }

  function heapViewBox(fr) {
    var n = fr.heapSize != null ? fr.heapSize : fr.arr.length;
    var treeH = fr.treeH || heapTreeH(n);
    var vb = heapMetrics(fr.arr, treeH, fr.heapSize);
    if (fr.extracted.length) vb.h += 22;
    return vb;
  }

  function frame(desc, arr, heapSize, hi, panel, extracted, phase) {
    var treeH = heapTreeH(heapSize != null ? heapSize : arr.length);
    var metrics = heapMetrics(arr, treeH, heapSize);
    var lay = heapLayout(arr, heapSize, hi.highlight || hi, metrics);
    return {
      kind: 'heap', desc: desc, panel: panel || '',
      arr: cloneArr(arr), heapSize: heapSize,
      highlight: hi.highlight || hi,
      extracted: extracted || [], phase: phase || '',
      nodes: lay.nodes, edges: lay.edges, treeH: lay.treeH
    };
  }

  /* ── maxHeapify at index i ── */
  function genHeapify(arr, heapSize, i, extracted) {
    var fr = [];
    var largest = i;

    push(fr, {
      arr: arr, heapSize: heapSize, extracted: extracted,
      desc: 'MaxHeapify at index <b>' + i + '</b> (value ' + arr[i] + ').',
      panel: 'Compare node with left & right children.',
      highlight: { active: i },
      phase: 'heapify'
    });

    var l = left(i), r = right(i);
    if (l < heapSize) {
      push(fr, {
        arr: arr, heapSize: heapSize, extracted: extracted,
        desc: 'Compare A[' + i + ']=' + arr[i] + ' vs left A[' + l + ']=' + arr[l] + '.',
        highlight: { compare: [i, l] },
        phase: 'heapify'
      });
      if (arr[l] > arr[largest]) largest = l;
    }
    if (r < heapSize) {
      push(fr, {
        arr: arr, heapSize: heapSize, extracted: extracted,
        desc: 'Compare with right A[' + r + ']=' + arr[r] + (largest === l ? ' (left was larger)' : '') + '.',
        highlight: { compare: [i, r, largest] },
        phase: 'heapify'
      });
      if (arr[r] > arr[largest]) largest = r;
    }

    if (largest !== i) {
      push(fr, {
        arr: arr, heapSize: heapSize, extracted: extracted,
        desc: 'Swap A[' + i + '] and A[' + largest + '].',
        highlight: { swap: [i, largest] },
        phase: 'heapify'
      });
      var tmp = arr[i]; arr[i] = arr[largest]; arr[largest] = tmp;
      push(fr, {
        arr: arr, heapSize: heapSize, extracted: extracted,
        desc: 'Recurse on child at <b>' + largest + '</b>.',
        highlight: { active: largest },
        phase: 'heapify'
      });
      fr = fr.concat(genHeapify(arr, heapSize, largest, extracted));
    } else {
      push(fr, {
        arr: arr, heapSize: heapSize, extracted: extracted,
        desc: 'Heap property OK at index ' + i + '.',
        highlight: { active: i },
        phase: 'heapify'
      });
    }
    return fr;
  }

  function genBuildHeap(arr, extracted) {
    var fr = [];
    var a = cloneArr(arr);
    var n = a.length;
    push(fr, {
      arr: a, heapSize: n, extracted: extracted,
      desc: 'BuildMaxHeap: start from last non-leaf index <b>' + (Math.floor(n / 2) - 1) + '</b>.',
      panel: 'Loop i = floor(n/2)-1 down to 0; call MaxHeapify(i).',
      phase: 'build'
    });
    for (var i = Math.floor(n / 2) - 1; i >= 0; i--) {
      var sub = genHeapify(a, n, i, extracted);
      if (sub.length) sub[0].desc = 'BuildHeap: MaxHeapify(<b>' + i + '</b>).';
      fr = fr.concat(sub);
    }
    push(fr, {
      arr: a, heapSize: n, extracted: extracted,
      desc: 'Heap built: max at root A[0] = <b>' + a[0] + '</b>.',
      panel: 'O(n) total: most nodes are near leaves.',
      highlight: { root: 0 },
      phase: 'build'
    });
    return { frames: fr, arr: a };
  }

  function genInsert(arr, key, heapSize, extracted) {
    var fr = [];
    var a = cloneArr(arr);
    a.push(key);
    var n = heapSize + 1;
    push(fr, {
      arr: a, heapSize: n, extracted: extracted,
      desc: 'Insert <b>' + key + '</b> at end A[' + (n - 1) + '].',
      panel: 'Heap size grows to ' + n + '.',
      highlight: { active: n - 1 },
      phase: 'insert'
    });

    var i = n - 1;
    while (i > 0 && a[parent(i)] < a[i]) {
      var p = parent(i);
      push(fr, {
        arr: a, heapSize: n, extracted: extracted,
        desc: 'Sift-up: A[' + p + ']=' + a[p] + ' &lt; A[' + i + ']=' + a[i] + ': swap.',
        highlight: { swap: [p, i] },
        phase: 'insert'
      });
      var t = a[p]; a[p] = a[i]; a[i] = t;
      i = p;
    }
    push(fr, {
      arr: a, heapSize: n, extracted: extracted,
      desc: 'Insert complete: <b>' + key + '</b> in heap.',
      highlight: { active: a.indexOf(key) },
      phase: 'insert'
    });
    return { frames: fr, arr: a, heapSize: n };
  }

  function genExtractMax(arr, heapSize, extracted) {
    var fr = [];
    var a = cloneArr(arr);
    var ext = extracted.slice();
    if (heapSize < 1) {
      push(fr, { arr: a, heapSize: 0, extracted: ext, desc: 'Heap is empty.', panel: '' });
      return { frames: fr, arr: a, heapSize: 0, extracted: ext };
    }

    var maxVal = a[0];
    push(fr, {
      arr: a, heapSize: heapSize, extracted: ext,
      desc: 'ExtractMax: max is root <b>' + maxVal + '</b>.',
      highlight: { root: 0 },
      phase: 'extract'
    });

    push(fr, {
      arr: a, heapSize: heapSize, extracted: ext,
      desc: 'Swap A[0] with last A[' + (heapSize - 1) + '].',
      highlight: { swap: [0, heapSize - 1] },
      phase: 'extract'
    });
    var t = a[0]; a[0] = a[heapSize - 1]; a[heapSize - 1] = t;
    var n = heapSize - 1;
    ext.push(maxVal);

    push(fr, {
      arr: a, heapSize: n, extracted: ext,
      desc: 'Remove last slot: heap size = ' + n + '. Extracted: [' + ext.join(', ') + '].',
      highlight: { out: heapSize - 1 },
      phase: 'extract'
    });

    if (n > 0) {
      var sub = genHeapify(a, n, 0, ext);
      fr = fr.concat(sub);
    }
    push(fr, {
      arr: a, heapSize: n, extracted: ext,
      desc: 'ExtractMax done: new root A[0] = ' + (n > 0 ? a[0] : '-') + '.',
      highlight: n > 0 ? { root: 0 } : {},
      phase: 'extract'
    });
    return { frames: fr, arr: a, heapSize: n, extracted: ext };
  }

  function genIncreaseKey(arr, heapSize, idx, newKey, extracted) {
    var fr = [];
    var a = cloneArr(arr);
    if (idx < 0 || idx >= heapSize) {
      push(fr, { arr: a, heapSize: heapSize, extracted: extracted, desc: 'Invalid index.', panel: '' });
      return { frames: fr, arr: a, heapSize: heapSize, extracted: extracted };
    }
    if (newKey < a[idx]) {
      push(fr, {
        arr: a, heapSize: heapSize, extracted: extracted,
        desc: 'New key must be &gt; current value ' + a[idx] + '.',
        panel: 'IncreaseKey only increases.'
      });
      return { frames: fr, arr: a, heapSize: heapSize, extracted: extracted };
    }

    push(fr, {
      arr: a, heapSize: heapSize, extracted: extracted,
      desc: 'IncreaseKey A[' + idx + ']: ' + a[idx] + ' → <b>' + newKey + '</b>.',
      highlight: { active: idx },
      phase: 'increase'
    });
    a[idx] = newKey;

    var i = idx;
    while (i > 0 && a[parent(i)] < a[i]) {
      var p = parent(i);
      push(fr, {
        arr: a, heapSize: heapSize, extracted: extracted,
        desc: 'Sift-up: swap with parent at ' + p + '.',
        highlight: { swap: [p, i] },
        phase: 'increase'
      });
      var tmp = a[p]; a[p] = a[i]; a[i] = tmp;
      i = p;
    }
    push(fr, {
      arr: a, heapSize: heapSize, extracted: extracted,
      desc: 'IncreaseKey complete.',
      highlight: { active: idx },
      phase: 'increase'
    });
    return { frames: fr, arr: a, heapSize: heapSize, extracted: extracted };
  }

  /* ── Draw ── */
  function drawHeap(svg, fr, vb) {
    var hi = fr.highlight || {};
    var nm = {};
    fr.nodes.forEach(function (n) { nm[n.id] = n; });

    /* tree background band */
    var treeBg = document.createElementNS(SVGNS, 'rect');
    treeBg.setAttribute('x', '0');
    treeBg.setAttribute('y', '0');
    treeBg.setAttribute('width', String(vb.w));
    treeBg.setAttribute('height', String(vb.treeH));
    treeBg.setAttribute('fill', 'rgba(60,80,140,0.06)');
    treeBg.setAttribute('rx', '8');
    svg.appendChild(treeBg);

    var treeLbl = document.createElementNS(SVGNS, 'text');
    treeLbl.setAttribute('x', '14');
    treeLbl.setAttribute('y', '16');
    treeLbl.setAttribute('fill', '#7c8aa8');
    treeLbl.setAttribute('font-size', '11');
    treeLbl.setAttribute('font-weight', '700');
    treeLbl.setAttribute('font-family', FONT);
    treeLbl.textContent = 'TREE';
    svg.appendChild(treeLbl);

    fr.edges.forEach(function (e) {
      var a = nm[e[0]], b = nm[e[1]];
      if (!a || !b) return;
      var heavy = (hi.swap && (hi.swap.indexOf(a.idx) >= 0 || hi.swap.indexOf(b.idx) >= 0)) ||
        (hi.compare && (hi.compare.indexOf(a.idx) >= 0 || hi.compare.indexOf(b.idx) >= 0));
      var ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y + NODE_R);
      ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y - NODE_R);
      ln.setAttribute('stroke', heavy ? '#a78bfa' : '#4a5580');
      ln.setAttribute('stroke-width', heavy ? '2.5' : '2');
      ln.setAttribute('stroke-linecap', 'round');
      svg.appendChild(ln);
    });

    fr.nodes.forEach(function (n) {
      var col = NCOL[n.role] || NCOL.normal;
      var g = document.createElementNS(SVGNS, 'g');
      var c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); c.setAttribute('r', String(NODE_R));
      c.setAttribute('fill', col.fill); c.setAttribute('stroke', col.stroke);
      c.setAttribute('stroke-width', n.role === 'active' || n.role === 'swap' || n.role === 'root' ? '3' : '2');
      g.appendChild(c);
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', n.x); t.setAttribute('y', n.y + 5);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', col.text);
      t.setAttribute('font-size', '15'); t.setAttribute('font-weight', '700');
      t.setAttribute('font-family', FONT);
      t.textContent = n.label;
      g.appendChild(t);
      svg.appendChild(g);
    });

    /* array section */
    var divY = vb.treeH + 8;
    var div = document.createElementNS(SVGNS, 'line');
    div.setAttribute('x1', '12'); div.setAttribute('y1', divY);
    div.setAttribute('x2', String(vb.w - 12)); div.setAttribute('y2', divY);
    div.setAttribute('stroke', '#3a4278'); div.setAttribute('stroke-width', '1');
    svg.appendChild(div);

    var arrLbl = document.createElementNS(SVGNS, 'text');
    arrLbl.setAttribute('x', '14');
    arrLbl.setAttribute('y', vb.arrY - 8);
    arrLbl.setAttribute('fill', '#7c8aa8');
    arrLbl.setAttribute('font-size', '11');
    arrLbl.setAttribute('font-weight', '700');
    arrLbl.setAttribute('font-family', FONT);
    arrLbl.textContent = 'ARRAY';
    svg.appendChild(arrLbl);

    var ax = vb.ax, ay = vb.arrY, cw = vb.cellW, gap = vb.gap;
    for (var i = 0; i < fr.arr.length; i++) {
      var inHeap = i < fr.heapSize;
      var isHi = hi.active === i || hi.root === i || hi.out === i ||
        (hi.swap && hi.swap.indexOf(i) >= 0) ||
        (hi.compare && hi.compare.indexOf(i) >= 0);
      var bc = isHi ? (hi.active === i ? NCOL.active : NCOL.compare) : inHeap ? NCOL.normal : NCOL.out;
      if (hi.root === i) bc = NCOL.root;
      if (hi.swap && hi.swap.indexOf(i) >= 0) bc = NCOL.swap;

      var cx = ax + i * (cw + gap);
      var g = document.createElementNS(SVGNS, 'g');
      var rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('x', cx); rect.setAttribute('y', ay);
      rect.setAttribute('width', cw); rect.setAttribute('height', 40);
      rect.setAttribute('rx', '6');
      rect.setAttribute('fill', bc.fill);
      rect.setAttribute('stroke', bc.stroke);
      rect.setAttribute('stroke-width', isHi ? '2.5' : '1.5');
      rect.setAttribute('opacity', inHeap ? '1' : '0.4');
      g.appendChild(rect);

      var ix = document.createElementNS(SVGNS, 'text');
      ix.setAttribute('x', cx + cw / 2); ix.setAttribute('y', ay + 11);
      ix.setAttribute('text-anchor', 'middle'); ix.setAttribute('fill', '#9aa8c8');
      ix.setAttribute('font-size', '9'); ix.setAttribute('font-family', FONT);
      ix.textContent = String(i);
      g.appendChild(ix);

      var at = document.createElementNS(SVGNS, 'text');
      at.setAttribute('x', cx + cw / 2); at.setAttribute('y', ay + 29);
      at.setAttribute('text-anchor', 'middle'); at.setAttribute('fill', bc.text);
      at.setAttribute('font-size', '14'); at.setAttribute('font-weight', '700');
      at.setAttribute('font-family', FONT);
      at.textContent = String(fr.arr[i]);
      g.appendChild(at);
      svg.appendChild(g);

      if (isHi) {
        var nd = nm['h' + i];
        if (nd && inHeap) {
          var link = document.createElementNS(SVGNS, 'line');
          link.setAttribute('x1', nd.x); link.setAttribute('y1', nd.y + NODE_R + 2);
          link.setAttribute('x2', cx + cw / 2); link.setAttribute('y2', ay);
          link.setAttribute('stroke', '#57e0c0');
          link.setAttribute('stroke-width', '1.5');
          link.setAttribute('opacity', '0.55');
          svg.appendChild(link);
        }
      }
    }

    if (fr.extracted.length) {
      var et = document.createElementNS(SVGNS, 'text');
      et.setAttribute('x', ax); et.setAttribute('y', ay + 52);
      et.setAttribute('fill', '#7c8aa8'); et.setAttribute('font-size', '11');
      et.setAttribute('font-family', FONT);
      et.textContent = 'extracted (sorted max\u2192min): [' + fr.extracted.join(', ') + ']';
      svg.appendChild(et);
    }
  }

  function enrichFrame(fr) {
    var treeH = heapTreeH(fr.heapSize != null ? fr.heapSize : fr.arr.length);
    var metrics = heapMetrics(fr.arr, treeH, fr.heapSize);
    var lay = heapLayout(fr.arr, fr.heapSize, fr.highlight, metrics);
    fr.nodes = lay.nodes;
    fr.edges = lay.edges;
    fr.treeH = lay.treeH;
    fr.kind = 'heap';
    return fr;
  }

  function createHeapAnimator(wrap) {
    var $ = function (sel) { return wrap.querySelector(sel); };
    var stage = $('.heap-stage');
    if (!stage) return;

    var frames = [], idx = 0, timer = null, playing = false;

    function render() {
      if (!frames.length) return;
      var fr = enrichFrame(frames[Math.min(idx, frames.length - 1)]);
      var vb = heapViewBox(fr);
      stage.innerHTML = '';
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + vb.w + ' ' + vb.h);
      svg.setAttribute('width', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      var displayH = Math.min(540, Math.max(360, Math.round(vb.h * 1.12)));
      svg.setAttribute('height', String(displayH));
      drawHeap(svg, fr, vb);
      stage.appendChild(svg);
      var descEl = $('.viz-desc');
      var panelEl = $('.viz-panel');
      if (descEl) descEl.innerHTML = fr.desc;
      if (panelEl) panelEl.innerHTML = fr.panel;
      $('.viz-step').textContent = idx;
      $('.viz-total').textContent = Math.max(0, frames.length - 1);
    }

    function stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      $('.viz-play').textContent = '\u25B6 Play';
    }

    function step(dir) {
      stop();
      idx = Math.min(frames.length - 1, Math.max(0, idx + dir));
      render();
    }

    function play() {
      if (playing) { stop(); return; }
      if (idx >= frames.length - 1) { idx = 0; render(); }
      playing = true;
      $('.viz-play').textContent = '\u23F8 Pause';
      var speed = Math.max(45, 850 - parseInt($('.viz-speed').value, 10) * 0.42);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); return; }
        idx++; render();
      }, speed);
    }

    function loadPreset(op, autoPlay) {
      var build = PRESETS[op] || PRESETS.build;
      stop();
      frames = build();
      idx = 0;
      render();
      if (autoPlay && frames.length > 1) play();
    }

    $('.viz-op').onchange = function () { loadPreset($('.viz-op').value, true); };
    $('.viz-replay').onclick = function () { loadPreset($('.viz-op').value, true); };
    $('.viz-play').onclick = play;
    $('.viz-next').onclick = function () { step(1); };
    $('.viz-prev').onclick = function () { step(-1); };
    $('.viz-speed').oninput = function () { if (playing) { stop(); play(); } };

    loadPreset($('.viz-op').value, false);
  }

  function init() {
    document.querySelectorAll('.heap-viz-wrap').forEach(createHeapAnimator);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
