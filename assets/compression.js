/* Huffman coding & Lempel-Ziv animators — preset step-through demos */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  var COL = {
    leaf: { fill: '#3f51b5', stroke: '#5c6bc0', text: '#fff' },
    internal: { fill: '#2a3058', stroke: '#4a5580', text: '#c8d0e8' },
    pick: { fill: '#7c4dff', stroke: '#a78bfa', text: '#fff' },
    new: { fill: '#2f8f5f', stroke: '#57e0c0', text: '#fff' },
    heap: { fill: '#455a9e', stroke: '#64748b', text: '#fff' },
    edge0: '#57e0c0',
    edge1: '#ff6b81',
    input: { fill: '#2a3058', stroke: '#4a5580', text: '#fff' },
    match: { fill: '#2f8f5f', stroke: '#57e0c0', text: '#fff' },
    cur: { fill: '#7c4dff', stroke: '#a78bfa', text: '#fff' },
    dict: { fill: '#3f51b5', stroke: '#5c6bc0', text: '#fff' },
    token: { fill: '#c0533f', stroke: '#ff6b81', text: '#fff' }
  };

  /* ── Huffman ── */
  var HUFFMAN_LEAVES = [
    { char: 'C', freq: 1 },
    { char: 'D', freq: 1 },
    { char: 'B', freq: 2 },
    { char: 'E', freq: 3 },
    { char: 'A', freq: 5 }
  ];

  var nodeId = 0;
  function makeLeaf(ch) {
    return { id: 'n' + (nodeId++), char: ch.char, freq: ch.freq, left: null, right: null, internal: false };
  }
  function cloneNode(n) {
    if (!n) return null;
    return {
      id: n.id, char: n.char, freq: n.freq, internal: n.internal,
      left: cloneNode(n.left), right: cloneNode(n.right)
    };
  }
  function cloneForest(forest) { return forest.map(cloneNode); }

  function huffmanCodes(root) {
    var codes = {};
    function walk(n, path) {
      if (!n) return;
      if (!n.internal) { codes[n.char] = path || '0'; return; }
      walk(n.left, path + '0');
      walk(n.right, path + '1');
    }
    walk(root, '');
    return codes;
  }

  function genHuffman() {
    nodeId = 0;
    var frames = [];
    var forest = HUFFMAN_LEAVES.map(makeLeaf);

    function push(desc, panel, f, hi, codes) {
      frames.push({
        kind: 'huffman',
        desc: desc,
        panel: panel || '',
        forest: cloneForest(f),
        highlight: hi || {},
        codes: codes || null
      });
    }

    push(
      'Start with one <b>leaf per character</b> and its frequency. All nodes go into a <b>min-heap</b> ordered by frequency.',
      'Example: A=5, B=2, C=1, D=1, E=3. The two smallest are always merged first.',
      forest,
      { heap: true }
    );

    while (forest.length > 1) {
      forest.sort(function (a, b) { return a.freq - b.freq || String(a.char).localeCompare(String(b.char)); });
      var a = forest[0];
      var b = forest[1];
      var labelA = a.internal ? '(' + a.freq + ')' : a.char + ':' + a.freq;
      var labelB = b.internal ? '(' + b.freq + ')' : b.char + ':' + b.freq;

      push(
        '<code>extractMin</code> twice — smallest nodes: <b>' + labelA + '</b> and <b>' + labelB + '</b>.',
        'Greedy rule: merge the two least frequent subtrees at each step.',
        forest,
        { pick: [a.id, b.id], heap: true }
      );

      var parent = {
        id: 'n' + (nodeId++),
        char: null,
        freq: a.freq + b.freq,
        left: cloneNode(a),
        right: cloneNode(b),
        internal: true
      };

      var rest = forest.slice(2);
      rest.push(parent);
      rest.sort(function (x, y) { return x.freq - y.freq || String(x.id).localeCompare(String(y.id)); });

      push(
        'Create parent with freq <b>' + parent.freq + '</b> (= ' + a.freq + ' + ' + b.freq + '), <code>insert</code> back into heap.',
        'Left child = first extractMin, right child = second. Edge labels: left = <b>0</b>, right = <b>1</b>.',
        rest,
        { newNode: parent.id, merged: [a.id, b.id], heap: true }
      );

      forest = rest;
    }

    var root = forest[0];
    var codes = huffmanCodes(root);
    var codeRows = Object.keys(codes).sort().map(function (ch) {
      return ch + ' \u2192 <code>' + codes[ch] + '</code>';
    }).join(' · ');

    push(
      'One tree remains — read codes from root: <b>' + codeRows + '</b>.',
      'Prefix-free: no code is a prefix of another. Frequent symbols end up closer to the root (shorter codes).',
      forest,
      { done: true, root: root.id },
      codes
    );

    return frames;
  }

  function treeDepth(n) {
    if (!n) return 0;
    return 1 + Math.max(treeDepth(n.left), treeDepth(n.right));
  }

  function countLeaves(n) {
    if (!n) return 0;
    if (!n.left && !n.right) return 1;
    return countLeaves(n.left) + countLeaves(n.right);
  }

  // Leaf-based layout: every leaf gets an equal horizontal slot, each internal
  // node is centred over its children. This keeps deep/unbalanced Huffman trees
  // from crushing together on one side.
  function layoutTree(n, depth, x0, x1, y0, rowH, out) {
    if (!n) return;
    var total = Math.max(countLeaves(out._root || n), 1);
    if (!out._root) out._root = n;
    var slot = (x1 - x0) / total;

    function place(node, d, leafStart) {
      var y = y0 + d * rowH;
      var x;
      if (!node.left && !node.right) {
        x = x0 + (leafStart + 0.5) * slot;
      } else {
        var leftLeaves = countLeaves(node.left);
        if (node.left) place(node.left, d + 1, leafStart);
        if (node.right) place(node.right, d + 1, leafStart + leftLeaves);
        var lx = node.left ? nodeX(node.left) : null;
        var rx = node.right ? nodeX(node.right) : null;
        if (lx != null && rx != null) x = (lx + rx) / 2;
        else x = (lx != null ? lx : rx);
      }
      out.nodes.push({ n: node, x: x, y: y });
      if (node.left) out.edges.push({ from: node, to: node.left, bit: '0' });
      if (node.right) out.edges.push({ from: node, to: node.right, bit: '1' });
    }
    function nodeX(node) {
      for (var i = 0; i < out.nodes.length; i++) {
        if (out.nodes[i].n.id === node.id) return out.nodes[i].x;
      }
      return null;
    }

    place(n, depth, 0);
  }

  function nodeLabel(n) { return n.internal ? String(n.freq) : String(n.char); }
  function nodeColor(n, hi) {
    if (hi.pick && hi.pick.indexOf(n.id) >= 0) return COL.pick;
    if (hi.newNode === n.id) return COL.new;
    if (hi.root === n.id) return COL.new;
    return n.internal ? COL.internal : COL.leaf;
  }

  function drawNodeCircle(svg, n, x, y, r, hi) {
    var c = nodeColor(n, hi);
    var emph = (hi.pick && hi.pick.indexOf(n.id) >= 0) || hi.newNode === n.id || hi.root === n.id;
    var circ = document.createElementNS(SVGNS, 'circle');
    circ.setAttribute('cx', x); circ.setAttribute('cy', y);
    circ.setAttribute('r', String(r));
    circ.setAttribute('fill', c.fill);
    circ.setAttribute('stroke', c.stroke);
    circ.setAttribute('stroke-width', emph ? '3' : '2');
    svg.appendChild(circ);
    var tx = document.createElementNS(SVGNS, 'text');
    tx.setAttribute('x', x); tx.setAttribute('y', y + r * 0.28);
    tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('fill', c.text);
    tx.setAttribute('font-size', String(Math.round(r * 0.85))); tx.setAttribute('font-weight', '800');
    tx.setAttribute('font-family', FONT);
    tx.textContent = nodeLabel(n);
    svg.appendChild(tx);
  }

  function drawHuffman(svg, fr) {
    var hi = fr.highlight || {};
    var forest = fr.forest || [];
    var pad = 20;
    var labelY = 16;
    var topY = 52;
    var nodeR = 22;
    var rowH = 74;
    var heapNodeR = 19;
    var heapRowH = 60;

    var viewW = 720;
    var heapX0 = pad, heapX1 = 246;
    var huffX0 = 270, huffX1 = viewW - pad;

    var maxD = 1;
    forest.forEach(function (r) { maxD = Math.max(maxD, treeDepth(r)); });

    var sorted = forest.slice().sort(function (a, b) {
      return a.freq - b.freq || String(a.char || a.id).localeCompare(String(b.char || b.id));
    });
    var k = sorted.length;
    var heapLevels = Math.floor(Math.log2(Math.max(k, 1))) + 1;

    var huffBottom = topY + (maxD - 1) * rowH + nodeR;
    var heapBottom = topY + (heapLevels - 1) * heapRowH + heapNodeR + 25;
    var contentBottom = Math.max(huffBottom, heapBottom);
    var viewH = contentBottom + (fr.codes ? 78 : 24);

    /* ── panel labels ── */
    var heapLbl = document.createElementNS(SVGNS, 'text');
    heapLbl.setAttribute('x', heapX0); heapLbl.setAttribute('y', labelY);
    heapLbl.setAttribute('fill', '#7c8aa8');
    heapLbl.setAttribute('font-size', '11'); heapLbl.setAttribute('font-weight', '700');
    heapLbl.setAttribute('font-family', FONT);
    heapLbl.textContent = 'MIN-HEAP (by frequency)';
    svg.appendChild(heapLbl);

    var treeLbl = document.createElementNS(SVGNS, 'text');
    treeLbl.setAttribute('x', huffX0); treeLbl.setAttribute('y', labelY);
    treeLbl.setAttribute('fill', '#7c8aa8');
    treeLbl.setAttribute('font-size', '11'); treeLbl.setAttribute('font-weight', '700');
    treeLbl.setAttribute('font-family', FONT);
    treeLbl.textContent = forest.length === 1 ? 'HUFFMAN TREE' : 'CURRENT FOREST';
    svg.appendChild(treeLbl);

    /* divider between the two panels */
    var divider = document.createElementNS(SVGNS, 'line');
    divider.setAttribute('x1', (heapX1 + huffX0) / 2); divider.setAttribute('y1', labelY + 6);
    divider.setAttribute('x2', (heapX1 + huffX0) / 2); divider.setAttribute('y2', contentBottom);
    divider.setAttribute('stroke', '#3a4278'); divider.setAttribute('stroke-width', '1');
    divider.setAttribute('stroke-dasharray', '4 5');
    svg.appendChild(divider);

    /* ── MIN-HEAP as a binary tree (sorted-ascending array = valid min-heap) ── */
    function heapPos(i) {
      var depth = Math.floor(Math.log2(i + 1));
      var levelStart = (1 << depth) - 1;
      var slots = 1 << depth;
      var x = heapX0 + (i - levelStart + 0.5) * ((heapX1 - heapX0) / slots);
      var y = topY + depth * heapRowH;
      return { x: x, y: y };
    }
    for (var hi2 = 0; hi2 < k; hi2++) {
      if (hi2 === 0) continue;
      var parent = Math.floor((hi2 - 1) / 2);
      var pp = heapPos(parent), cp = heapPos(hi2);
      var hln = document.createElementNS(SVGNS, 'line');
      hln.setAttribute('x1', pp.x); hln.setAttribute('y1', pp.y + heapNodeR);
      hln.setAttribute('x2', cp.x); hln.setAttribute('y2', cp.y - heapNodeR);
      hln.setAttribute('stroke', '#4a5580'); hln.setAttribute('stroke-width', '2');
      svg.appendChild(hln);
    }
    sorted.forEach(function (n, i) {
      var pos = heapPos(i);
      drawNodeCircle(svg, n, pos.x, pos.y, heapNodeR, hi);
      var label = 'f=' + n.freq;
      var badgeW = 12 + label.length * 6.5;
      var badgeY = pos.y + heapNodeR + 5;
      var badge = document.createElementNS(SVGNS, 'rect');
      badge.setAttribute('x', pos.x - badgeW / 2); badge.setAttribute('y', badgeY);
      badge.setAttribute('width', badgeW); badge.setAttribute('height', 16);
      badge.setAttribute('rx', '8');
      badge.setAttribute('class', 'huff-freq-badge');
      svg.appendChild(badge);
      var f = document.createElementNS(SVGNS, 'text');
      f.setAttribute('x', pos.x); f.setAttribute('y', badgeY + 12);
      f.setAttribute('text-anchor', 'middle');
      f.setAttribute('font-size', '11.5'); f.setAttribute('font-weight', '700');
      f.setAttribute('font-family', FONT);
      f.setAttribute('class', 'huff-freq-text');
      f.textContent = label;
      svg.appendChild(f);
    });

    /* ── HUFFMAN tree / forest on the right panel ──
       Allocate each tree a width proportional to its leaf count so multi-leaf
       subtrees get room to breathe instead of sharing an equal slot. */
    var gap = 14;
    var leafCounts = forest.map(function (r) { return Math.max(countLeaves(r), 1); });
    var totalLeaves = leafCounts.reduce(function (s, c) { return s + c; }, 0);
    var usable = (huffX1 - huffX0) - gap * (forest.length - 1);
    var cursor = huffX0;
    forest.forEach(function (root, i) {
      var w = usable * (leafCounts[i] / totalLeaves);
      var tx0 = cursor;
      var tx1 = cursor + w;
      cursor = tx1 + gap;
      var lay = { nodes: [], edges: [] };
      layoutTree(root, 0, tx0, tx1, topY, rowH, lay);
      lay.edges.forEach(function (e) {
        var fn = lay.nodes.find(function (nd) { return nd.n.id === e.from.id; });
        var tn = lay.nodes.find(function (nd) { return nd.n.id === e.to.id; });
        if (!fn || !tn) return;
        var ln = document.createElementNS(SVGNS, 'line');
        ln.setAttribute('x1', fn.x); ln.setAttribute('y1', fn.y + nodeR);
        ln.setAttribute('x2', tn.x); ln.setAttribute('y2', tn.y - nodeR);
        ln.setAttribute('stroke', e.bit === '0' ? COL.edge0 : COL.edge1);
        ln.setAttribute('stroke-width', '2.5');
        svg.appendChild(ln);
        var bt = document.createElementNS(SVGNS, 'text');
        bt.setAttribute('x', (fn.x + tn.x) / 2 + (e.bit === '0' ? -12 : 12));
        bt.setAttribute('y', (fn.y + tn.y) / 2);
        bt.setAttribute('fill', e.bit === '0' ? COL.edge0 : COL.edge1);
        bt.setAttribute('font-size', '15'); bt.setAttribute('font-weight', '800');
        bt.setAttribute('font-family', FONT);
        bt.textContent = e.bit;
        svg.appendChild(bt);
      });
      lay.nodes.forEach(function (nd) {
        drawNodeCircle(svg, nd.n, nd.x, nd.y, nodeR, hi);
      });
    });

    if (fr.codes) {
      var cy = contentBottom + 26;
      var cl = document.createElementNS(SVGNS, 'text');
      cl.setAttribute('x', pad); cl.setAttribute('y', cy);
      cl.setAttribute('fill', '#7c8aa8');
      cl.setAttribute('font-size', '11'); cl.setAttribute('font-weight', '700');
      cl.setAttribute('font-family', FONT);
      cl.textContent = 'CODE TABLE';
      svg.appendChild(cl);
      var keys = Object.keys(fr.codes).sort();
      var cx = pad;
      keys.forEach(function (ch) {
        var g = document.createElementNS(SVGNS, 'g');
        var r = document.createElementNS(SVGNS, 'rect');
        r.setAttribute('x', cx); r.setAttribute('y', cy + 8);
        r.setAttribute('width', 84); r.setAttribute('height', 40);
        r.setAttribute('rx', '6');
        r.setAttribute('fill', '#1e2448');
        r.setAttribute('stroke', '#4a5580');
        g.appendChild(r);
        var t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', cx + 42); t.setAttribute('y', cy + 34);
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', '#e2e8f8');
        t.setAttribute('font-size', '15'); t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', 'monospace');
        t.textContent = ch + ' \u2192 ' + fr.codes[ch];
        g.appendChild(t);
        svg.appendChild(g);
        cx += 94;
      });
    }

    return { viewW: viewW, viewH: viewH };
  }

  /* ── Lempel-Ziv ── */
  var LZ_INPUT = 'ABABABA';

  function lzLongestMatch(input, pos, dict) {
    var bestIdx = 0;
    var bestLen = 0;
    var dictKeys = Object.keys(dict).map(Number).sort(function (a, b) { return a - b; });
    for (var di = 0; di < dictKeys.length; di++) {
      var idx = dictKeys[di];
      var s = dict[idx];
      if (!s) continue;
      var len = 0;
      while (pos + len < input.length && s.charAt(len) === input.charAt(pos + len)) len++;
      if (len > bestLen) { bestLen = len; bestIdx = idx; }
    }
    return { idx: bestIdx, len: bestLen };
  }

  function genLZ() {
    var frames = [];
    var input = LZ_INPUT;
    var dict = { 0: '' };
    var dictNext = 1;
    var output = [];
    var pos = 0;

    function snap(desc, panel, hi) {
      frames.push({
        kind: 'lz',
        desc: desc,
        panel: panel || '',
        input: input,
        pos: pos,
        matchLen: hi && hi.matchLen != null ? hi.matchLen : 0,
        dict: JSON.parse(JSON.stringify(dict)),
        dictNext: dictNext,
        output: output.map(function (t) { return { idx: t.idx, ch: t.ch }; }),
        highlight: hi || {}
      });
    }

    snap(
      'Encode <b>' + input.split('').join(' ') + '</b> — dictionary starts with index <b>0 = ""</b> (empty).',
      'At each step: find longest prefix already in the dictionary, output (index, next char), then add prefix+char as a new entry.'
    );

    while (pos < input.length) {
      var match = lzLongestMatch(input, pos, dict);
      var nextCh = input.charAt(pos + match.len);
      var matchStr = input.substr(pos, match.len);

      snap(
        'Position <b>' + pos + '</b>: longest match is dict[' + match.idx + '] = <b>"' + (dict[match.idx] || '') + '"</b>' +
          (match.len ? ' (length ' + match.len + ')' : ' (none — new symbol)') + '.',
        match.len
          ? 'Matched "' + matchStr + '" at index ' + match.idx + '. Next character: <b>' + nextCh + '</b>.'
          : 'No prior entry — output raw character with index 0.'
      );

      snap(
        'Output token <b>(' + match.idx + ', ' + nextCh + ')</b>.',
        'Decoder reads index ' + match.idx + ' from its dictionary, appends "' + nextCh + '".',
        { token: output.length, matchLen: match.len }
      );

      output.push({ idx: match.idx, ch: nextCh });
      var newEntry = matchStr + nextCh;
      dict[dictNext] = newEntry;

      snap(
        'Add dict[' + dictNext + '] = <b>"' + newEntry + '"</b>, advance pointer.',
        'Dictionary grows online — decoder rebuilds the same entries in the same order.',
        { dictRow: dictNext, matchLen: match.len, token: output.length - 1 }
      );

      dictNext++;
      pos += match.len + 1;
    }

    snap(
      'Done — ' + output.length + ' tokens compress repeated <b>AB</b> / <b>ABA</b> patterns.',
      'Output: ' + output.map(function (t) { return '(' + t.idx + ',' + t.ch + ')'; }).join(' ') + '.',
      { done: true }
    );

    return frames;
  }

  function drawLZ(svg, fr) {
    var hi = fr.highlight || {};
    var pad = 20;
    var inputY = 40;
    var dictY = 118;
    var outY = 0;
    var chW = 36;
    var chH = 36;
    var gap = 6;
    var input = fr.input || '';

    var inLbl = document.createElementNS(SVGNS, 'text');
    inLbl.setAttribute('x', pad); inLbl.setAttribute('y', 18);
    inLbl.setAttribute('fill', '#7c8aa8');
    inLbl.setAttribute('font-size', '11'); inLbl.setAttribute('font-weight', '700');
    inLbl.setAttribute('font-family', FONT);
    inLbl.textContent = 'INPUT STRING';
    svg.appendChild(inLbl);

    for (var i = 0; i < input.length; i++) {
      var inMatch = i >= fr.pos && i < fr.pos + fr.matchLen;
      var isCur = i === fr.pos + fr.matchLen || (fr.matchLen === 0 && i === fr.pos);
      var c = inMatch ? COL.match : isCur ? COL.cur : COL.input;
      var x = pad + i * (chW + gap);
      var rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', inputY);
      rect.setAttribute('width', chW); rect.setAttribute('height', chH);
      rect.setAttribute('rx', '6');
      rect.setAttribute('fill', c.fill);
      rect.setAttribute('stroke', c.stroke);
      rect.setAttribute('stroke-width', inMatch || isCur ? '2.5' : '1.5');
      svg.appendChild(rect);
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', x + chW / 2); t.setAttribute('y', inputY + 24);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', c.text);
      t.setAttribute('font-size', '15'); t.setAttribute('font-weight', '700');
      t.setAttribute('font-family', FONT);
      t.textContent = input.charAt(i);
      svg.appendChild(t);
      if (i === fr.pos) {
        var arr = document.createElementNS(SVGNS, 'text');
        arr.setAttribute('x', x + chW / 2); arr.setAttribute('y', inputY - 6);
        arr.setAttribute('text-anchor', 'middle'); arr.setAttribute('fill', '#57e0c0');
        arr.setAttribute('font-size', '14'); arr.setAttribute('font-weight', '700');
        arr.setAttribute('font-family', FONT);
        arr.textContent = '\u25BC';
        svg.appendChild(arr);
      }
    }

    var dictLbl = document.createElementNS(SVGNS, 'text');
    dictLbl.setAttribute('x', pad); dictLbl.setAttribute('y', dictY - 10);
    dictLbl.setAttribute('fill', '#7c8aa8');
    dictLbl.setAttribute('font-size', '11'); dictLbl.setAttribute('font-weight', '700');
    dictLbl.setAttribute('font-family', FONT);
    dictLbl.textContent = 'DICTIONARY';
    svg.appendChild(dictLbl);

    var dictKeys = Object.keys(fr.dict).map(Number).sort(function (a, b) { return a - b; });
    var row = 0;
    dictKeys.forEach(function (k, di) {
      var isHi = hi.dictRow === k;
      var col = isHi ? COL.new : COL.dict;
      var dy = dictY + row * 30;
      var idxT = document.createElementNS(SVGNS, 'text');
      idxT.setAttribute('x', pad); idxT.setAttribute('y', dy + 18);
      idxT.setAttribute('fill', '#9aa8c8');
      idxT.setAttribute('font-size', '12'); idxT.setAttribute('font-family', 'monospace');
      idxT.textContent = String(k);
      svg.appendChild(idxT);
      var dr = document.createElementNS(SVGNS, 'rect');
      dr.setAttribute('x', pad + 28); dr.setAttribute('y', dy);
      dr.setAttribute('width', Math.max(48, (fr.dict[k] || '').length * 14 + 20));
      dr.setAttribute('height', 24);
      dr.setAttribute('rx', '5');
      dr.setAttribute('fill', col.fill);
      dr.setAttribute('stroke', col.stroke);
      dr.setAttribute('stroke-width', isHi ? '2.5' : '1.5');
      svg.appendChild(dr);
      var dv = document.createElementNS(SVGNS, 'text');
      dv.setAttribute('x', pad + 36); dv.setAttribute('y', dy + 16);
      dv.setAttribute('fill', col.text);
      dv.setAttribute('font-size', '12'); dv.setAttribute('font-weight', '700');
      dv.setAttribute('font-family', 'monospace');
      dv.textContent = '"' + (fr.dict[k] || '') + '"';
      svg.appendChild(dv);
      row++;
    });

    outY = dictY + row * 30 + 28;
    var outLbl = document.createElementNS(SVGNS, 'text');
    outLbl.setAttribute('x', pad); outLbl.setAttribute('y', outY);
    outLbl.setAttribute('fill', '#7c8aa8');
    outLbl.setAttribute('font-size', '11'); outLbl.setAttribute('font-weight', '700');
    outLbl.setAttribute('font-family', FONT);
    outLbl.textContent = 'OUTPUT TOKENS';
    svg.appendChild(outLbl);

    var ox = pad;
    fr.output.forEach(function (tok, ti) {
      var isTok = hi.token === ti;
      var tc = isTok ? COL.token : COL.heap;
      var tw = 64;
      var rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('x', ox); rect.setAttribute('y', outY + 10);
      rect.setAttribute('width', tw); rect.setAttribute('height', 30);
      rect.setAttribute('rx', '6');
      rect.setAttribute('fill', tc.fill);
      rect.setAttribute('stroke', tc.stroke);
      rect.setAttribute('stroke-width', isTok ? '2.5' : '1.5');
      svg.appendChild(rect);
      var tt = document.createElementNS(SVGNS, 'text');
      tt.setAttribute('x', ox + tw / 2); tt.setAttribute('y', outY + 30);
      tt.setAttribute('text-anchor', 'middle'); tt.setAttribute('fill', tc.text);
      tt.setAttribute('font-size', '11'); tt.setAttribute('font-weight', '700');
      tt.setAttribute('font-family', 'monospace');
      tt.textContent = '(' + tok.idx + ',' + tok.ch + ')';
      svg.appendChild(tt);
      ox += tw + 8;
    });

    return { viewW: Math.max(520, pad * 2 + input.length * (chW + gap)), viewH: outY + 56 };
  }

  /* ── Shared player ── */
  function drawFrame(svg, fr) {
    if (fr.kind === 'huffman') return drawHuffman(svg, fr);
    return drawLZ(svg, fr);
  }

  function createAnimator(wrap) {
    var mode = wrap.getAttribute('data-mode') || 'huffman';
    var $ = function (sel) { return wrap.querySelector(sel); };
    var stage = $('.comp-stage');
    if (!stage) return;

    var frames = [], idx = 0, timer = null, playing = false;

    function build() {
      return mode === 'lz' ? genLZ() : genHuffman();
    }

    function render() {
      if (!frames.length) return;
      var fr = frames[Math.min(idx, frames.length - 1)];
      stage.innerHTML = '';
      var svg = document.createElementNS(SVGNS, 'svg');
      var vb = drawFrame(svg, fr);
      svg.setAttribute('viewBox', '0 0 ' + vb.viewW + ' ' + vb.viewH);
      svg.setAttribute('width', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('height', String(Math.min(480, Math.max(280, vb.viewH + 20))));
      stage.appendChild(svg);
      var descEl = $('.viz-desc');
      var panelEl = $('.viz-panel');
      if (descEl) descEl.innerHTML = fr.desc;
      if (panelEl) panelEl.innerHTML = fr.panel;
      var stepEl = $('.viz-step');
      var totalEl = $('.viz-total');
      if (stepEl) stepEl.textContent = idx;
      if (totalEl) totalEl.textContent = Math.max(0, frames.length - 1);
    }

    function stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      var playBtn = $('.viz-play');
      if (playBtn) playBtn.textContent = '\u25B6 Play';
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
      var playBtn = $('.viz-play');
      if (playBtn) playBtn.textContent = '\u23F8 Pause';
      var speedEl = $('.viz-speed');
      var speed = Math.max(260, 2700 - parseInt(speedEl ? speedEl.value : 1200, 10) * 1.35);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); return; }
        idx++;
        render();
      }, speed);
    }

    function load(autoPlay) {
      stop();
      frames = build();
      idx = 0;
      render();
      if (autoPlay && frames.length > 1) play();
    }

    var playBtn = $('.viz-play');
    var replayBtn = $('.viz-replay');
    var nextBtn = $('.viz-next');
    var prevBtn = $('.viz-prev');
    var speedEl = $('.viz-speed');
    if (playBtn) playBtn.onclick = play;
    if (replayBtn) replayBtn.onclick = function () { load(true); };
    if (nextBtn) nextBtn.onclick = function () { step(1); };
    if (prevBtn) prevBtn.onclick = function () { step(-1); };
    if (speedEl) speedEl.oninput = function () { if (playing) { stop(); play(); } };

    load(true);
  }

  function init() {
    document.querySelectorAll('.comp-viz-wrap').forEach(createAnimator);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
