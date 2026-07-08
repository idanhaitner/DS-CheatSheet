/* Hash table animators — chaining & open addressing (linear probing) */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  var GHOST_STEPS = 2;
  var PROBE_COLS = 11;

  var COL = {
    slot: { fill: '#2a3058', stroke: '#4a5580', text: '#c8d0e8' },
    bucket: { fill: '#3f51b5', stroke: '#5c6bc0', text: '#fff' },
    chain: { fill: '#455a9e', stroke: '#64748b', text: '#fff' },
    new: { fill: '#2f8f5f', stroke: '#57e0c0', text: '#fff' },
    probe: { fill: '#6366f1', stroke: '#818cf8', text: '#fff' },
    found: { fill: '#2f8f5f', stroke: '#57e0c0', text: '#fff' },
    tomb: { fill: '#5a3d3d', stroke: '#ff6b81', text: '#ffb4c0' },
    empty: { fill: '#1a1f38', stroke: '#3a4278', text: '#6b7a9e' },
    del: { fill: '#7c2d12', stroke: '#ff6b81', text: '#fff' },
    rehash: { fill: '#7c3aed', stroke: '#a78bfa', text: '#fff' }
  };

  function cloneChains(chains) {
    return chains.map(function (c) { return c.slice(); });
  }

  function cloneTable(tbl) {
    return tbl.map(function (c) {
      if (!c) return null;
      return { key: c.key, state: c.state };
    });
  }

  function emptyChains(m) {
    var chains = [];
    for (var i = 0; i < m; i++) chains.push([]);
    return chains;
  }

  function emptyTable(m) {
    var tbl = [];
    for (var i = 0; i < m; i++) tbl.push(null);
    return tbl;
  }

  function chainCount(chains) {
    var n = 0;
    chains.forEach(function (c) { n += c.length; });
    return n;
  }

  function collectChainKeys(chains) {
    var keys = [];
    chains.forEach(function (c) {
      for (var i = c.length - 1; i >= 0; i--) keys.push(c[i]);
    });
    return keys;
  }

  function collectProbeKeys(tbl) {
    var keys = [];
    tbl.forEach(function (c) {
      if (c && c.state === 'ok') keys.push(c.key);
    });
    return keys;
  }

  function push(fr, snap) {
    fr.push({
      desc: snap.desc,
      panel: snap.panel || '',
      line: snap.line == null ? -1 : snap.line,
      highlight: snap.highlight || {},
      activeKey: snap.activeKey,
      probeIdx: snap.probeIdx,
      chains: snap.chains ? cloneChains(snap.chains) : null,
      table: snap.table ? cloneTable(snap.table) : null,
      m: snap.m,
      n: snap.n,
      maxAlpha: snap.maxAlpha,
      rehashing: !!snap.rehashing,
      oldM: snap.oldM,
      oldChains: snap.oldChains ? cloneChains(snap.oldChains) : null,
      oldTable: snap.oldTable ? cloneTable(snap.oldTable) : null
    });
  }

  function alphaPanel(n, m, maxAlpha) {
    var a = m ? (n / m).toFixed(2) : '0.00';
    return '\u03b1 = ' + a + ' (n=' + n + ', m=' + m + ') \u00b7 max \u03b1 = ' + maxAlpha;
  }

  /* ── Chaining ── */
  var CHAIN_M_INIT = 7;
  var CHAIN_INIT = [14, 21, 8, 15];

  function chainHash(k, m) { return k % m; }

  function chainBuildState(keys, m) {
    var chains = emptyChains(m);
    keys.forEach(function (k) {
      chains[chainHash(k, m)].unshift(k);
    });
    return chains;
  }

  function appendChainRehash(fr, chains, m, n, maxAlpha, pendingKey) {
    var newM = m * 2;
    var keys = collectChainKeys(chains);
    var nextAlpha = ((n + 1) / m).toFixed(2);

    push(fr, {
      chains: cloneChains(chains), m: m, n: n, maxAlpha: maxAlpha,
      activeKey: pendingKey,
      desc: 'Load factor <b>\u03b1 = ' + nextAlpha + '</b> exceeds max <b>' + maxAlpha + '</b> \u2014 rehash.',
      panel: 'Before insert: (n+1)/m = (' + n + '+1)/' + m + ' = ' + nextAlpha + ' &gt; ' + maxAlpha,
      line: 4,
      highlight: { rehashWarn: true },
      rehashing: true
    });

    push(fr, {
      chains: cloneChains(chains), m: m, n: n, maxAlpha: maxAlpha,
      activeKey: pendingKey,
      desc: 'Current table <b>m = ' + m + '</b> with ' + n + ' keys.',
      panel: 'Collect ' + n + ' keys from all chains.',
      line: 4,
      highlight: { rehashOld: true },
      rehashing: true,
      oldM: m,
      oldChains: cloneChains(chains)
    });

    var newChains = emptyChains(newM);
    push(fr, {
      chains: cloneChains(newChains), m: newM, n: 0, maxAlpha: maxAlpha,
      activeKey: pendingKey,
      desc: 'Allocate new table <b>m = ' + newM + '</b> (doubled).',
      panel: 'h(k) = k mod ' + newM + ' \u2014 re-insert every key.',
      line: 4,
      highlight: { rehashNew: true },
      rehashing: true,
      oldM: m,
      oldChains: cloneChains(chains)
    });

    keys.forEach(function (k) {
      var h = chainHash(k, newM);
      push(fr, {
        chains: cloneChains(newChains), m: newM, n: chainCount(newChains), maxAlpha: maxAlpha,
        activeKey: k,
        desc: 'Re-insert <b>' + k + '</b> \u2014 h = ' + k + ' mod ' + newM + ' = <b>' + h + '</b>.',
        panel: alphaPanel(chainCount(newChains), newM, maxAlpha),
        line: 4,
        highlight: { bucket: h, rehashKey: k },
        rehashing: true
      });
      newChains[h].unshift(k);
      push(fr, {
        chains: cloneChains(newChains), m: newM, n: chainCount(newChains), maxAlpha: maxAlpha,
        activeKey: k,
        desc: '<b>' + k + '</b> prepended to bucket ' + h + ' in new table.',
        panel: alphaPanel(chainCount(newChains), newM, maxAlpha),
        line: 4,
        highlight: { bucket: h, found: k, rehashKey: k },
        rehashing: true
      });
    });

    push(fr, {
      chains: cloneChains(newChains), m: newM, n: chainCount(newChains), maxAlpha: maxAlpha,
      activeKey: pendingKey,
      desc: 'Rehash complete \u2014 <b>m = ' + newM + '</b>, ' + chainCount(newChains) + ' keys restored.',
      panel: alphaPanel(chainCount(newChains), newM, maxAlpha) + ' \u00b7 resume insert.',
      line: 4,
      highlight: { rehashDone: true },
      rehashing: true
    });

    return { chains: newChains, m: newM, n: chainCount(newChains) };
  }

  function genChainInsert(key, chains, m, maxAlpha) {
    var fr = [];
    var n = chainCount(chains);

    if ((n + 1) / m > maxAlpha) {
      var rh = appendChainRehash(fr, chains, m, n, maxAlpha, key);
      chains = rh.chains;
      m = rh.m;
      n = rh.n;
    }

    var h = chainHash(key, m);

    push(fr, {
      chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
      desc: 'Insert <b>' + key + '</b> \u2014 compute hash.',
      panel: 'h(' + key + ') = ' + key + ' mod ' + m + ' = <b>' + h + '</b>',
      line: 0,
      highlight: { bucket: h }
    });

    var exists = chains[h].indexOf(key) >= 0;
    if (exists) {
      push(fr, {
        chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
        desc: '<b>' + key + '</b> already in bucket ' + h + ' chain.',
        panel: 'Duplicate \u2014 no insert.',
        line: 3,
        highlight: { bucket: h, found: key }
      });
      return fr;
    }

    push(fr, {
      chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
      desc: 'Bucket <b>' + h + '</b> selected \u2014 insert at chain head.',
      panel: 'Insert at chain head \u2014 O(1).',
      line: 1,
      highlight: { bucket: h, inserting: true, ghost: { key: key, step: 0, total: GHOST_STEPS } }
    });

    for (var s = 1; s <= GHOST_STEPS; s++) {
      push(fr, {
        chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
        desc: 'Insert <b>' + key + '</b> at head of bucket ' + h + '.',
        panel: s < GHOST_STEPS ? 'Prepend at head.' : 'Link new node \u2192 old head.',
        line: 1,
        highlight: { bucket: h, inserting: true, ghost: { key: key, step: s, total: GHOST_STEPS } }
      });
    }

    chains[h].unshift(key);
    push(fr, {
      chains: chains, m: m, n: n + 1, maxAlpha: maxAlpha, activeKey: key,
      desc: 'Done \u2014 <b>' + key + '</b> at bucket ' + h + '.',
      panel: alphaPanel(n + 1, m, maxAlpha),
      line: 2,
      highlight: { bucket: h, found: key }
    });
    return fr;
  }

  function genChainSearch(key, chains, m, maxAlpha) {
    var fr = [];
    var h = chainHash(key, m);
    var n = chainCount(chains);

    push(fr, {
      chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
      desc: 'Search <b>' + key + '</b> \u2014 h = ' + h + '.',
      panel: 'Walk bucket ' + h + ' chain from HEAD.',
      line: 0,
      highlight: { bucket: h }
    });

    for (var i = 0; i < chains[h].length; i++) {
      push(fr, {
        chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
        desc: 'Check chain node <b>' + chains[h][i] + '</b>' + (chains[h][i] === key ? ' \u2014 found!' : '.'),
        panel: i === 0 ? 'Start at HEAD.' : 'Follow next pointer.',
        line: 1,
        highlight: { bucket: h, chainIdx: i, cur: chains[h][i] }
      });
      if (chains[h][i] === key) {
        push(fr, {
          chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
          desc: 'Found <b>' + key + '</b> in bucket ' + h + '.',
          panel: 'Expected O(1 + \u03b1) nodes visited. ' + alphaPanel(n, m, maxAlpha),
          line: 2,
          highlight: { bucket: h, found: key }
        });
        return fr;
      }
    }
    push(fr, {
      chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
      desc: '<b>' + key + '</b> not in bucket ' + h + ' chain.',
      panel: 'Absent.',
      line: 2,
      highlight: { bucket: h, miss: true }
    });
    return fr;
  }

  function genChainDelete(key, chains, m, maxAlpha) {
    var fr = [];
    var h = chainHash(key, m);
    var n = chainCount(chains);

    push(fr, {
      chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
      desc: 'Delete <b>' + key + '</b> \u2014 search bucket ' + h + ' chain.',
      panel: 'h = ' + h + ' \u00b7 ' + alphaPanel(n, m, maxAlpha),
      line: 0,
      highlight: { bucket: h }
    });

    var idx = chains[h].indexOf(key);
    if (idx < 0) {
      push(fr, {
        chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
        desc: '<b>' + key + '</b> not found \u2014 nothing to delete.',
        panel: 'Chain unchanged.',
        line: 2,
        highlight: { bucket: h, miss: true }
      });
      return fr;
    }

    for (var i = 0; i <= idx; i++) {
      push(fr, {
        chains: chains, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
        desc: 'Scan chain: <b>' + chains[h][i] + '</b>' + (i === idx ? ' \u2014 unlink this node.' : '.'),
        line: 1,
        highlight: { bucket: h, chainIdx: i, cur: chains[h][i] }
      });
    }

    chains[h].splice(idx, 1);
    push(fr, {
      chains: chains, m: m, n: n - 1, maxAlpha: maxAlpha, activeKey: key,
      desc: 'Removed <b>' + key + '</b> from bucket ' + h + '.',
      panel: 'O(1) with pointer to node; O(1+\u03b1) if search first.',
      line: 2,
      highlight: { bucket: h, deleted: key }
    });
    return fr;
  }

  /* ── Probing (linear) ── */
  var PROBE_M_INIT = 11;
  var PROBE_INIT = [14, 21, 25, 8];

  function probeHash(k, m) { return k % m; }

  function probeBuildTable(keys, m) {
    var tbl = emptyTable(m);
    keys.forEach(function (k) { probeInsertSilent(k, tbl, m); });
    return tbl;
  }

  function probeInsertSilent(key, tbl, m) {
    var h = probeHash(key, m);
    var i = 0;
    while (i < m) {
      var slot = (h + i) % m;
      if (!tbl[slot] || tbl[slot].state === 'tomb') {
        tbl[slot] = { key: key, state: 'ok' };
        return;
      }
      i++;
    }
  }

  function probeCount(tbl) {
    var n = 0;
    tbl.forEach(function (c) { if (c && c.state === 'ok') n++; });
    return n;
  }

  function probeSeq(h, maxI, m) {
    var s = [];
    for (var j = 0; j <= maxI; j++) s.push((h + j) % m);
    return s;
  }

  function appendProbeRehash(fr, tbl, m, n, maxAlpha, pendingKey) {
    var newM = m * 2;
    var keys = collectProbeKeys(tbl);
    var nextAlpha = ((n + 1) / m).toFixed(2);

    push(fr, {
      table: cloneTable(tbl), m: m, n: n, maxAlpha: maxAlpha,
      activeKey: pendingKey,
      desc: 'Load factor <b>\u03b1 = ' + nextAlpha + '</b> exceeds max <b>' + maxAlpha + '</b> \u2014 rehash.',
      panel: 'Before insert: (n+1)/m = (' + n + '+1)/' + m + ' = ' + nextAlpha + ' &gt; ' + maxAlpha,
      line: 4,
      highlight: { rehashWarn: true },
      rehashing: true
    });

    push(fr, {
      table: cloneTable(tbl), m: m, n: n, maxAlpha: maxAlpha,
      activeKey: pendingKey,
      desc: 'Current table <b>m = ' + m + '</b> with ' + n + ' keys.',
      panel: 'Collect keys (skip tombstones).',
      line: 4,
      highlight: { rehashOld: true },
      rehashing: true,
      oldM: m,
      oldTable: cloneTable(tbl)
    });

    var newTbl = emptyTable(newM);
    push(fr, {
      table: cloneTable(newTbl), m: newM, n: 0, maxAlpha: maxAlpha,
      activeKey: pendingKey,
      desc: 'Allocate new table <b>m = ' + newM + '</b> (doubled).',
      panel: 'Linear probe: (h + i) mod ' + newM,
      line: 4,
      highlight: { rehashNew: true },
      rehashing: true,
      oldM: m,
      oldTable: cloneTable(tbl)
    });

    keys.forEach(function (k) {
      var h = probeHash(k, newM);
      push(fr, {
        table: cloneTable(newTbl), m: newM, n: probeCount(newTbl), maxAlpha: maxAlpha,
        activeKey: k,
        desc: 'Re-insert <b>' + k + '</b> \u2014 h\u2032 = ' + h + '.',
        panel: alphaPanel(probeCount(newTbl), newM, maxAlpha),
        line: 4,
        highlight: { probe: h, probeStep: 0, probes: [h], rehashKey: k },
        rehashing: true
      });
      probeInsertSilent(k, newTbl, newM);
      var slot = -1;
      for (var si = 0; si < newM; si++) {
        if (newTbl[si] && newTbl[si].state === 'ok' && newTbl[si].key === k) { slot = si; break; }
      }
      push(fr, {
        table: cloneTable(newTbl), m: newM, n: probeCount(newTbl), maxAlpha: maxAlpha,
        activeKey: k,
        desc: '<b>' + k + '</b> placed in slot ' + slot + ' of new table.',
        panel: alphaPanel(probeCount(newTbl), newM, maxAlpha),
        line: 4,
        highlight: { found: k, probe: slot, rehashKey: k },
        rehashing: true
      });
    });

    push(fr, {
      table: cloneTable(newTbl), m: newM, n: probeCount(newTbl), maxAlpha: maxAlpha,
      activeKey: pendingKey,
      desc: 'Rehash complete \u2014 <b>m = ' + newM + '</b>, ' + probeCount(newTbl) + ' keys restored.',
      panel: alphaPanel(probeCount(newTbl), newM, maxAlpha) + ' \u00b7 resume insert.',
      line: 4,
      highlight: { rehashDone: true },
      rehashing: true
    });

    return { table: newTbl, m: newM, n: probeCount(newTbl) };
  }

  function genProbeInsert(key, tbl, m, maxAlpha) {
    var fr = [];
    var n = probeCount(tbl);

    if ((n + 1) / m > maxAlpha) {
      var rh = appendProbeRehash(fr, tbl, m, n, maxAlpha, key);
      tbl = rh.table;
      m = rh.m;
      n = rh.n;
    }

    var h = probeHash(key, m);

    push(fr, {
      table: tbl, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
      desc: 'Insert <b>' + key + '</b> \u2014 h\u2032(k) = ' + h + '.',
      panel: 'Linear probe: (h + i) mod ' + m,
      line: 0,
      highlight: { probe: h, probeStep: 0, probes: [h] }
    });

    for (var i = 0; i < m; i++) {
      var slot = (h + i) % m;
      var cell = tbl[slot];
      var occupied = cell && cell.state === 'ok';
      var isDup = occupied && cell.key === key;

      push(fr, {
        table: tbl, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
        desc: 'Probe <b>#' + (i + 1) + '</b> \u2192 slot <b>' + slot + '</b>' +
          (occupied ? (isDup ? ' (key exists)' : ' (occupied)') : (cell && cell.state === 'tomb' ? ' (tombstone \u2014 can use)' : ' (empty)')),
        panel: 'h(' + key + ', ' + i + ') = (' + h + ' + ' + i + ') mod ' + m + ' = ' + slot,
        line: 1,
        highlight: { probe: slot, probeStep: i, probes: probeSeq(h, i, m), probeNum: i + 1 },
        probeIdx: slot
      });

      if (isDup) return fr;
      if (!occupied) {
        tbl[slot] = { key: key, state: 'ok' };
        push(fr, {
          table: tbl, m: m, n: n + 1, maxAlpha: maxAlpha, activeKey: key,
          desc: 'Place <b>' + key + '</b> in slot ' + slot + '.',
          panel: (i + 1) + ' probe(s). ' + alphaPanel(n + 1, m, maxAlpha),
          line: 2,
          highlight: { found: key, probe: slot }
        });
        return fr;
      }
    }
    return fr;
  }

  function genProbeSearch(key, tbl, m, maxAlpha) {
    var fr = [];
    var h = probeHash(key, m);
    var n = probeCount(tbl);

    push(fr, {
      table: tbl, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
      desc: 'Search <b>' + key + '</b>.',
      panel: 'Stop at empty slot (tombstones: keep probing). ' + alphaPanel(n, m, maxAlpha),
      line: 0
    });

    for (var i = 0; i < m; i++) {
      var slot = (h + i) % m;
      var cell = tbl[slot];
      push(fr, {
        table: tbl, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
        desc: 'Probe <b>#' + (i + 1) + '</b> \u2192 slot <b>' + slot + '</b>' +
          (!cell ? ' \u2014 empty, stop.' : (cell.state === 'tomb' ? ' \u2014 tombstone, continue.' : ' \u2014 key ' + cell.key + '.')),
        line: 1,
        highlight: { probe: slot, probeStep: i, probes: probeSeq(h, i, m), probeNum: i + 1 },
        probeIdx: slot
      });
      if (!cell) {
        push(fr, {
          table: tbl, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
          desc: '<b>' + key + '</b> not found.',
          panel: 'Empty slot \u2192 absent.',
          line: 2,
          highlight: { miss: true, probe: slot }
        });
        return fr;
      }
      if (cell.state === 'ok' && cell.key === key) {
        push(fr, {
          table: tbl, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
          desc: 'Found <b>' + key + '</b> in slot ' + slot + '.',
          panel: (i + 1) + ' probe(s).',
          line: 2,
          highlight: { found: key, probe: slot }
        });
        return fr;
      }
    }
    return fr;
  }

  function genProbeDelete(key, tbl, m, maxAlpha) {
    var fr = [];
    var h = probeHash(key, m);
    var n = probeCount(tbl);

    push(fr, {
      table: tbl, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
      desc: 'Delete <b>' + key + '</b> \u2014 search with probing.',
      panel: 'Cannot leave empty \u2014 use tombstone.',
      line: 0
    });

    for (var i = 0; i < m; i++) {
      var slot = (h + i) % m;
      var cell = tbl[slot];
      push(fr, {
        table: tbl, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
        desc: 'Probe <b>#' + (i + 1) + '</b> \u2192 slot <b>' + slot + '</b>.',
        line: 1,
        highlight: { probe: slot, probeStep: i, probes: probeSeq(h, i, m), probeNum: i + 1 },
        probeIdx: slot
      });
      if (!cell) {
        push(fr, {
          table: tbl, m: m, n: n, maxAlpha: maxAlpha, activeKey: key,
          desc: '<b>' + key + '</b> not found.',
          line: 2,
          highlight: { miss: true, probe: slot }
        });
        return fr;
      }
      if (cell.state === 'ok' && cell.key === key) {
        tbl[slot] = { key: null, state: 'tomb' };
        push(fr, {
          table: tbl, m: m, n: n - 1, maxAlpha: maxAlpha, activeKey: key,
          desc: 'Mark slot ' + slot + ' as <b>tombstone</b> (deleted).',
          panel: 'Probe chain preserved for other keys.',
          line: 2,
          highlight: { deleted: key, probe: slot, tomb: true }
        });
        return fr;
      }
    }
    return fr;
  }

  /* ── Drawing helpers ── */
  function drawArrowDown(svg, x, y1, y2) {
    var ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('x1', x); ln.setAttribute('y1', y1);
    ln.setAttribute('x2', x); ln.setAttribute('y2', y2 - 2);
    ln.setAttribute('stroke', '#5a6a8a');
    ln.setAttribute('stroke-width', '1.25');
    ln.setAttribute('stroke-linecap', 'round');
    ln.setAttribute('marker-end', 'url(#hash-arrow)');
    svg.appendChild(ln);
  }

  function ensureArrowMarker(svg) {
    var defs = document.createElementNS(SVGNS, 'defs');
    var marker = document.createElementNS(SVGNS, 'marker');
    marker.setAttribute('id', 'hash-arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '5'); marker.setAttribute('refY', '4');
    marker.setAttribute('markerWidth', '4'); marker.setAttribute('markerHeight', '4');
    marker.setAttribute('orient', 'auto');
    var path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', 'M 0 0 L 8 4 L 0 8 z');
    path.setAttribute('fill', '#5a6a8a');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);
  }

  function drawAlphaBadge(svg, fr, x, y) {
    var m = fr.m;
    var n = fr.n != null ? fr.n : 0;
    var maxA = fr.maxAlpha != null ? fr.maxAlpha : 1;
    var a = m ? n / m : 0;
    var over = a > maxA;
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'hash-alpha-badge');
    var bg = document.createElementNS(SVGNS, 'rect');
    bg.setAttribute('x', x); bg.setAttribute('y', y);
    bg.setAttribute('width', '118'); bg.setAttribute('height', '22');
    bg.setAttribute('rx', '5');
    bg.setAttribute('fill', over ? '#5b21b6' : '#1e2448');
    bg.setAttribute('stroke', over ? '#a78bfa' : '#4a5580');
    g.appendChild(bg);
    var t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', x + 59); t.setAttribute('y', y + 15);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('fill', over ? '#ede9fe' : '#a8b4d8');
    t.setAttribute('font-size', '11'); t.setAttribute('font-weight', '700');
    t.setAttribute('font-family', FONT);
    t.textContent = '\u03b1=' + a.toFixed(2) + ' / max ' + maxA;
    g.appendChild(t);
    svg.appendChild(g);
  }

  function chainLayout(m, chains) {
    var bw = 52, gap = 10, ox = 30, top = 38;
    var slotH = 28, nodeR = 16, chainSpacing = 40, slotToChain = 20;
    var maxDepth = 0;
    for (var b = 0; b < m; b++) {
      if (chains[b].length > maxDepth) maxDepth = chains[b].length;
    }
    var ghostExtra = 50;
    var viewW = ox + m * (bw + gap) + 140;
    var viewH = top + slotH + slotToChain + Math.max(maxDepth, 1) * chainSpacing + ghostExtra + nodeR + 28;
    return { bw: bw, gap: gap, ox: ox, top: top, slotH: slotH, nodeR: nodeR, chainSpacing: chainSpacing, slotToChain: slotToChain, viewW: viewW, viewH: viewH };
  }

  function drawChain(svg, fr) {
    var m = fr.m;
    var chains = fr.chains;
    var hi = fr.highlight || {};
    var lay = chainLayout(m, chains);
    var bw = lay.bw, gap = lay.gap, ox = lay.ox, top = lay.top;
    var slotH = lay.slotH, nodeR = lay.nodeR, chainSpacing = lay.chainSpacing, slotToChain = lay.slotToChain;

    ensureArrowMarker(svg);
    drawAlphaBadge(svg, fr, lay.viewW - 128, 8);

    if (hi.rehashOld && fr.oldChains && fr.oldM) {
      var hint = document.createElementNS(SVGNS, 'text');
      hint.setAttribute('x', ox); hint.setAttribute('y', 22);
      hint.setAttribute('fill', '#a78bfa');
      hint.setAttribute('font-size', '12'); hint.setAttribute('font-weight', '700');
      hint.setAttribute('font-family', FONT);
      hint.textContent = 'Rehashing: old m=' + fr.oldM + ' \u2192 new m=' + m;
      svg.appendChild(hint);
    }

    for (var b = 0; b < m; b++) {
      var bx = ox + b * (bw + gap);
      var isBucket = hi.bucket === b;
      var col = hi.rehashNew ? COL.rehash : isBucket ? COL.probe : COL.slot;
      if (hi.rehashKey != null && isBucket) col = COL.rehash;

      var rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('x', bx); rect.setAttribute('y', top);
      rect.setAttribute('width', bw); rect.setAttribute('height', slotH);
      rect.setAttribute('rx', '6');
      rect.setAttribute('fill', col.fill);
      rect.setAttribute('stroke', col.stroke);
      rect.setAttribute('stroke-width', isBucket ? '2.5' : '1.5');
      svg.appendChild(rect);

      var lbl = document.createElementNS(SVGNS, 'text');
      lbl.setAttribute('x', bx + bw / 2); lbl.setAttribute('y', top + 18);
      lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('fill', col.text);
      lbl.setAttribute('font-size', '13'); lbl.setAttribute('font-weight', '700');
      lbl.setAttribute('font-family', FONT);
      lbl.textContent = String(b);
      svg.appendChild(lbl);

      var headY = top + slotH + slotToChain + nodeR;
      var ghost = hi.ghost;
      var showGhost = ghost && ghost.key != null && isBucket && hi.inserting;
      var chainStart = showGhost ? 0 : 0;

      if (chains[b].length > 0 || (hi.inserting && isBucket && !showGhost)) {
        drawArrowDown(svg, bx + bw / 2, top + slotH, headY - nodeR);
      }

      if (showGhost) {
        var t = ghost.step / ghost.total;
        var gy = headY - slotToChain - nodeR + t * (slotToChain + nodeR);
        var gc = COL.new;
        var gcirc = document.createElementNS(SVGNS, 'circle');
        gcirc.setAttribute('cx', bx + bw / 2); gcirc.setAttribute('cy', gy);
        gcirc.setAttribute('r', String(nodeR));
        gcirc.setAttribute('fill', gc.fill);
        gcirc.setAttribute('stroke', gc.stroke);
        gcirc.setAttribute('stroke-width', '2');
        gcirc.setAttribute('opacity', '0.92');
        svg.appendChild(gcirc);
        var gkt = document.createElementNS(SVGNS, 'text');
        gkt.setAttribute('x', bx + bw / 2); gkt.setAttribute('y', gy + 5);
        gkt.setAttribute('text-anchor', 'middle'); gkt.setAttribute('fill', gc.text);
        gkt.setAttribute('font-size', '13'); gkt.setAttribute('font-weight', '700');
        gkt.setAttribute('font-family', FONT);
        gkt.textContent = String(ghost.key);
        svg.appendChild(gkt);
      }

      var cy = headY;
      for (var c = chainStart; c < chains[b].length; c++) {
        var k = chains[b][c];
        var isNew = hi.found === k && fr.activeKey === k;
        var isCur = hi.cur === k;
        var isIns = hi.inserting && c === 0 && fr.activeKey === k && !showGhost;
        var cc = isNew || isIns ? COL.new : isCur ? COL.probe : COL.chain;
        if (hi.deleted === k) cc = COL.del;
        if (hi.rehashKey === k) cc = COL.rehash;

        var circ = document.createElementNS(SVGNS, 'circle');
        circ.setAttribute('cx', bx + bw / 2); circ.setAttribute('cy', cy);
        circ.setAttribute('r', String(nodeR));
        circ.setAttribute('fill', cc.fill);
        circ.setAttribute('stroke', cc.stroke);
        circ.setAttribute('stroke-width', '2');
        svg.appendChild(circ);
        var kt = document.createElementNS(SVGNS, 'text');
        kt.setAttribute('x', bx + bw / 2); kt.setAttribute('y', cy + 5);
        kt.setAttribute('text-anchor', 'middle'); kt.setAttribute('fill', cc.text);
        kt.setAttribute('font-size', '13'); kt.setAttribute('font-weight', '700');
        kt.setAttribute('font-family', FONT);
        kt.textContent = String(k);
        svg.appendChild(kt);

        if (c < chains[b].length - 1) {
          drawArrowDown(svg, bx + bw / 2, cy + nodeR, cy + chainSpacing - nodeR);
        }
        cy += chainSpacing;
      }
    }

    return lay;
  }

  function probeLayout(m) {
    var cw = 44, gap = 6, cols = PROBE_COLS;
    var ox = 20, oy = 52;
    var rows = Math.ceil(m / cols);
    var viewW = ox + cols * (cw + gap) + 20;
    var viewH = oy + rows * (cw + gap) + 36;
    return { cw: cw, gap: gap, cols: cols, ox: ox, oy: oy, viewW: viewW, viewH: viewH };
  }

  function drawProbe(svg, fr) {
    var m = fr.m;
    var hi = fr.highlight || {};
    var probes = hi.probes || [];
    var lay = probeLayout(m);
    var cw = lay.cw, gap = lay.gap, cols = lay.cols, ox = lay.ox, oy = lay.oy;

    drawAlphaBadge(svg, fr, lay.viewW - 128, 8);

    if (hi.rehashOld && fr.oldM) {
      var hint = document.createElementNS(SVGNS, 'text');
      hint.setAttribute('x', ox); hint.setAttribute('y', 22);
      hint.setAttribute('fill', '#a78bfa');
      hint.setAttribute('font-size', '12'); hint.setAttribute('font-weight', '700');
      hint.setAttribute('font-family', FONT);
      hint.textContent = 'Rehashing: old m=' + fr.oldM + ' \u2192 new m=' + m;
      svg.appendChild(hint);
    }

    var legend = document.createElementNS(SVGNS, 'text');
    legend.setAttribute('x', ox); legend.setAttribute('y', 38);
    legend.setAttribute('fill', '#7c8aa8');
    legend.setAttribute('font-size', '10');
    legend.setAttribute('font-family', FONT);
    legend.textContent = '\u00b7 empty   \u2717 tombstone   # = probe step';
    svg.appendChild(legend);

    for (var i = 0; i < m; i++) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var x = ox + col * (cw + gap);
      var y = oy + row * (cw + gap);
      var cell = fr.table[i];
      var cc = COL.empty;
      if (cell) {
        if (cell.state === 'tomb') cc = COL.tomb;
        else if (hi.found === cell.key) cc = COL.found;
        else if (hi.deleted && hi.probe === i) cc = COL.tomb;
        else if (hi.rehashKey === cell.key) cc = COL.rehash;
        else cc = COL.bucket;
      }
      if (hi.probe === i) cc = COL.probe;
      var probeIdx = probes.indexOf(i);
      if (probeIdx >= 0 && hi.probe !== i) {
        cc = { fill: '#3a4278', stroke: '#6366f1', text: '#a8b4d8' };
      }

      var rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y);
      rect.setAttribute('width', cw); rect.setAttribute('height', cw);
      rect.setAttribute('rx', '6');
      rect.setAttribute('fill', cc.fill);
      rect.setAttribute('stroke', cc.stroke);
      rect.setAttribute('stroke-width', hi.probe === i ? '3' : '1.5');
      svg.appendChild(rect);

      var t1 = document.createElementNS(SVGNS, 'text');
      t1.setAttribute('x', x + cw / 2); t1.setAttribute('y', y + 12);
      t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('fill', '#7c8aa8');
      t1.setAttribute('font-size', '9'); t1.setAttribute('font-family', FONT);
      t1.textContent = 'slot ' + i;
      svg.appendChild(t1);

      var t2 = document.createElementNS(SVGNS, 'text');
      t2.setAttribute('x', x + cw / 2); t2.setAttribute('y', y + 30);
      t2.setAttribute('text-anchor', 'middle');
      t2.setAttribute('fill', cc.text);
      t2.setAttribute('font-size', '13'); t2.setAttribute('font-weight', '700');
      t2.setAttribute('font-family', FONT);
      if (cell && cell.state === 'tomb') t2.textContent = '\u2717';
      else if (cell && cell.state === 'ok') t2.textContent = String(cell.key);
      else t2.textContent = '\u00b7';
      svg.appendChild(t2);

      if (probeIdx >= 0) {
        var stepNum = probeIdx + 1;
        var sn = document.createElementNS(SVGNS, 'circle');
        sn.setAttribute('cx', x + cw - 6); sn.setAttribute('cy', y + 6);
        sn.setAttribute('r', '8');
        sn.setAttribute('fill', hi.probe === i ? '#818cf8' : '#4a5580');
        sn.setAttribute('stroke', '#c8d0e8');
        sn.setAttribute('stroke-width', '1');
        svg.appendChild(sn);
        var st = document.createElementNS(SVGNS, 'text');
        st.setAttribute('x', x + cw - 6); st.setAttribute('y', y + 9);
        st.setAttribute('text-anchor', 'middle');
        st.setAttribute('fill', '#fff');
        st.setAttribute('font-size', '9'); st.setAttribute('font-weight', '700');
        st.setAttribute('font-family', FONT);
        st.textContent = String(stepNum);
        svg.appendChild(st);
      }
    }

    return lay;
  }

  function createHashAnimator(wrap) {
    var mode = wrap.getAttribute('data-mode') || 'chaining';
    var $ = function (sel) { return wrap.querySelector(sel); };
    var stage = $('.hash-stage');
    if (!stage) return;

    var initM = mode === 'chaining' ? CHAIN_M_INIT : PROBE_M_INIT;
    var initKeys = mode === 'chaining' ? CHAIN_INIT : PROBE_INIT;
    var defaultAlpha = mode === 'chaining' ? 1.0 : 0.7;

    var state = { chains: null, table: null, m: initM };
    var frames = [], idx = 0, timer = null, playing = false;

    function getMaxAlpha() {
      var inp = $('.viz-alpha');
      if (!inp) return defaultAlpha;
      var v = parseFloat(inp.value);
      if (isNaN(v)) return defaultAlpha;
      if (mode === 'probing' && v > 0.95) v = 0.95;
      if (v < 0.3) v = 0.3;
      if (v > 2) v = 2;
      return v;
    }

    function resetState() {
      state.m = initM;
      if (mode === 'chaining') {
        state.chains = chainBuildState(initKeys, initM);
      } else {
        state.table = probeBuildTable(initKeys, initM);
      }
    }

    function render() {
      if (!frames.length) return;
      var fr = frames[Math.min(idx, frames.length - 1)];
      stage.innerHTML = '';
      var svg = document.createElementNS(SVGNS, 'svg');
      var lay;
      if (mode === 'chaining') lay = drawChain(svg, fr);
      else lay = drawProbe(svg, fr);
      svg.setAttribute('viewBox', '0 0 ' + lay.viewW + ' ' + lay.viewH);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', String(lay.viewH));
      svg.setAttribute('class', 'hash-viz-svg');
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
      var btn = $('.viz-play');
      if (btn) btn.textContent = '\u25B6 Play';
    }

    function commitState() {
      if (!frames.length) return;
      syncStateFromFrame(frames[frames.length - 1]);
    }

    function step(dir) {
      stop();
      idx = Math.min(frames.length - 1, Math.max(0, idx + dir));
      render();
      if (idx >= frames.length - 1) commitState();
    }

    function play(fast) {
      if (playing) { stop(); return; }
      if (idx >= frames.length - 1) { idx = 0; render(); }
      playing = true;
      $('.viz-play').textContent = '\u23F8 Pause';
      var slider = parseInt($('.viz-speed').value, 10);
      var speed = fast
        ? Math.max(28, 320 - slider * 0.18)
        : Math.max(50, 900 - slider * 0.45);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) {
          commitState();
          stop();
          return;
        }
        idx++; render();
      }, speed);
    }

    function parseKey() {
      var v = parseInt($('.viz-key').value, 10);
      if (isNaN(v) || v < 1 || v > 99) return null;
      return v;
    }

    function syncStateFromFrame(fr) {
      if (!fr) return;
      state.m = fr.m;
      if (fr.chains) state.chains = cloneChains(fr.chains);
      if (fr.table) state.table = cloneTable(fr.table);
    }

    function runOp(op, autoPlay) {
      commitState();
      var key = parseKey();
      var maxAlpha = getMaxAlpha();
      if (key === null) {
        frames = [{
          desc: 'Enter a valid key (1\u201399).', panel: '', m: state.m,
          chains: state.chains, table: state.table, n: 0, maxAlpha: maxAlpha
        }];
        idx = 0; stop(); render();
        return;
      }
      if (mode === 'chaining') {
        var ch = cloneChains(state.chains);
        if (op === 'insert') frames = genChainInsert(key, ch, state.m, maxAlpha);
        else if (op === 'search') frames = genChainSearch(key, ch, state.m, maxAlpha);
        else frames = genChainDelete(key, ch, state.m, maxAlpha);
      } else {
        var tb = cloneTable(state.table);
        if (op === 'insert') frames = genProbeInsert(key, tb, state.m, maxAlpha);
        else if (op === 'search') frames = genProbeSearch(key, tb, state.m, maxAlpha);
        else frames = genProbeDelete(key, tb, state.m, maxAlpha);
      }
      idx = 0; stop(); render();
      var shouldPlay = autoPlay || op === 'delete' || op === 'search';
      if (shouldPlay && frames.length > 1) {
        play(op === 'insert' && mode === 'chaining');
      } else if (frames.length) {
        commitState();
      }
    }

    function reset() {
      stop();
      resetState();
      var maxAlpha = getMaxAlpha();
      var n = mode === 'chaining'
        ? chainCount(state.chains)
        : probeCount(state.table);
      frames = [{
        desc: 'Table size <b>m = ' + state.m + '</b>, h(k) = k mod ' + state.m + '. Keys: [' + initKeys.join(', ') + '].',
        panel: (mode === 'chaining' ? 'Each slot heads a linked list.' : 'Linear probing \u2014 (h + i) mod m.') +
          ' ' + alphaPanel(n, state.m, maxAlpha),
        chains: state.chains, table: state.table, m: state.m, n: n, maxAlpha: maxAlpha
      }];
      idx = 0;
      render();
    }

    $('.viz-insert').onclick = function () { runOp('insert', true); };
    $('.viz-search').onclick = function () { runOp('search', false); };
    $('.viz-delete').onclick = function () { runOp('delete', false); };
    $('.viz-reset').onclick = reset;
    $('.viz-play').onclick = play;
    $('.viz-next').onclick = function () { step(1); };
    $('.viz-prev').onclick = function () { step(-1); };
    $('.viz-speed').oninput = function () { if (playing) { stop(); play(); } };
    var alphaInp = $('.viz-alpha');
    if (alphaInp) {
      alphaInp.addEventListener('change', function () {
        if (mode === 'probing') {
          var v = parseFloat(alphaInp.value);
          if (!isNaN(v) && v > 0.95) alphaInp.value = '0.95';
        }
        if (frames.length && idx === 0 && frames.length === 1) reset();
        else if (frames.length) {
          frames[Math.min(idx, frames.length - 1)].maxAlpha = getMaxAlpha();
          render();
        }
      });
    }
    $('.viz-key').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runOp(e.shiftKey ? 'delete' : 'insert', !e.shiftKey);
    });

    reset();
  }

  function init() {
    document.querySelectorAll('.hash-viz-wrap').forEach(createHashAnimator);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
