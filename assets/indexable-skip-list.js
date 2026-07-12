/* Indexable skip-list animator: width labels + Select(i) + Insert with width updates. */
(function () {
  function init() {
    var stage = document.getElementById('isl-viz-stage');
    if (!stage) return;

    var SVGNS = 'http://www.w3.org/2000/svg';
    function el(id) { return document.getElementById(id); }

    var K = function (s) { return '<span class="kw">' + s + '</span>'; };
    var C = function (s) { return '<span class="cm">' + s + '</span>'; };
    var CODE = {
      select: [
        K('Select') + '(i):  ' + C('# i-th smallest, 1-based'),
        '  curr = head;  pos = 0',
        '  ' + K('for') + ' lv = maxLevel … 0:',
        '    ' + K('while') + ' pos + width[lv] < i:',
        '      pos += width[lv]',
        '      curr = next[lv]  ' + C('# right'),
        '    ' + C('# else: drop down'),
        '  ' + K('return') + ' curr.next[0]'
      ],
      rank: [
        K('Rank') + '(x):  ' + C('# 1-based order of key x'),
        '  curr = head;  pos = 0',
        '  ' + K('for') + ' lv = maxLevel … 0:',
        '    ' + K('while') + ' next[lv].key < x:',
        '      pos += width[lv]',
        '      curr = next[lv]  ' + C('# right'),
        '    ' + C('# else: drop down'),
        '  ' + K('return') + ' pos + 1  ' + C('# if next[0] = x')
      ],
      insert: [
        K('Insert') + '(x):',
        '  find update[] = search path',
        '  h = random tower height',
        '  splice x into levels 0 … h-1',
        '  fix width along search path:',
        '    levels ≤ h: split widths locally',
        '    levels > h: width[ℓ] += 1'
      ]
    };

    var INFO = {
      select: 'Select(i) walks like Search, but compares <b>ranks</b> using widths: if <code>pos + width &lt; i</code> go right and add width; else drop down. Returns the <b>i-th</b> smallest key (1-based).',
      rank: 'Rank(x) is the inverse of Select: walk by <b>keys</b> like Search, but add <code>width</code> each time you jump right. When you stop, <code>pos</code> = # of keys &lt; x; if x is present, Rank = <b>pos + 1</b>.',
      insert: 'After splicing the new tower, update widths on the search path: levels at/below the new height split the old skip; levels above just <b>+1</b> (one more element under that long jump).'
    };

    /* Fixed demo: same shape as the plain skip-list search example */
    var DEMO = [
      { key: -Infinity, h: 4, sentinel: true },
      { key: 2, h: 1 },
      { key: 5, h: 2 },
      { key: 7, h: 1 },
      { key: 9, h: 3 },
      { key: 12, h: 1 },
      { key: Infinity, h: 4, sentinel: true }
    ];

    var FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    var COL = {
      /* Quiet indigo palette — no gold, no muddy gray */
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
      edge: '#c7d2fe',
      edgeHot: '#7c3aed',
      tower: '#e0e7ff',
      width: '#4338ca',
      widthHot: '#6d28d9',
      rank: '#64748b',
      lane: '#e2e8f0'
    };

    var frames = [], idx = 0, timer = null, playing = false;
    var codeBox = el('isl-viz-code');
    var codeLineEls = [];

    function sentinelName(key) {
      return key === -Infinity ? '-inf' : '+inf';
    }
    function keyLabel(n) {
      if (n.sentinel) return sentinelName(n.key);
      return String(n.key);
    }
    function maxH(nodes) {
      var m = 1;
      for (var i = 0; i < nodes.length; i++) m = Math.max(m, nodes[i].h);
      return m;
    }
    function atLevel(nodes, ni, lv) { return lv < nodes[ni].h; }
    function nextOn(nodes, ni, lv) {
      for (var j = ni + 1; j < nodes.length; j++) {
        if (atLevel(nodes, j, lv)) return j;
      }
      return ni;
    }

    /** width = # of L0 nodes from after curr through next (inclusive of next if next is data/sentinel). */
    function skipWidth(nodes, ni, lv) {
      var nx = nextOn(nodes, ni, lv);
      if (nx === ni) return 0;
      var w = 0;
      for (var j = ni + 1; j <= nx; j++) {
        if (atLevel(nodes, j, 0)) w++;
      }
      return w;
    }

    function cloneNodes(list) {
      return list.map(function (n) {
        return { key: n.key, h: n.h, sentinel: !!n.sentinel, isNew: !!n.isNew };
      });
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

    function push(out, snap) {
      out.push({
        nodes: cloneNodes(snap.nodes),
        maxLevel: snap.maxLevel,
        cur: snap.cur ? { ni: snap.cur.ni, lv: snap.cur.lv } : null,
        found: snap.found != null ? snap.found : null,
        hotEdge: snap.hotEdge || null,
        hotWidths: snap.hotWidths || null,
        showAllWidths: !!snap.showAllWidths,
        target: snap.target,
        pos: snap.pos,
        desc: snap.desc,
        panel: snap.panel || '',
        line: snap.line == null ? -1 : snap.line
      });
    }

    function genSelect(iTarget) {
      var out = [];
      var nodes = cloneNodes(DEMO);
      var ml = maxH(nodes);
      var nData = nodes.length - 2;
      if (iTarget < 1) iTarget = 1;
      if (iTarget > nData) iTarget = nData;

      push(out, {
        nodes: nodes, maxLevel: ml, showAllWidths: true, target: iTarget, pos: 0,
        desc: 'Select(' + iTarget + '): find the ' + iTarget + '-th smallest. Start at head, pos = 0.',
        panel: 'pos = 0 · looking for rank i = ' + iTarget,
        line: 0
      });

      var ni = 0;
      var pos = 0;
      var lv = ml - 1;

      push(out, {
        nodes: nodes, maxLevel: ml, showAllWidths: true, cur: { ni: ni, lv: lv },
        target: iTarget, pos: pos,
        desc: 'curr = -inf, level = L' + lv + '.',
        panel: 'pos = ' + pos,
        line: 1
      });

      while (lv >= 0) {
        push(out, {
          nodes: nodes, maxLevel: ml, showAllWidths: true, cur: { ni: ni, lv: lv },
          target: iTarget, pos: pos,
          desc: 'At L' + lv + ': try to jump right while pos + width < ' + iTarget + '.',
          panel: 'pos = ' + pos,
          line: 2
        });

        while (true) {
          var w = skipWidth(nodes, ni, lv);
          var nx = nextOn(nodes, ni, lv);
          if (nx === ni) break;
          if (pos + w < iTarget) {
            push(out, {
              nodes: nodes, maxLevel: ml, showAllWidths: true,
              cur: { ni: ni, lv: lv }, hotEdge: { ni: ni, lv: lv },
              target: iTarget, pos: pos,
              desc: 'pos + width = ' + pos + ' + ' + w + ' = ' + (pos + w) + ' &lt; ' + iTarget + ' → jump right.',
              panel: 'taking skip of width ' + w,
              line: 3
            });
            pos += w;
            ni = nx;
            push(out, {
              nodes: nodes, maxLevel: ml, showAllWidths: true,
              cur: { ni: ni, lv: lv },
              target: iTarget, pos: pos,
              desc: 'Moved to ' + keyLabel(nodes[ni]) + '. pos = ' + pos + '.',
              panel: 'pos = ' + pos,
              line: 4
            });
          } else {
            push(out, {
              nodes: nodes, maxLevel: ml, showAllWidths: true,
              cur: { ni: ni, lv: lv }, hotEdge: { ni: ni, lv: lv },
              target: iTarget, pos: pos,
              desc: 'pos + width = ' + pos + ' + ' + w + ' = ' + (pos + w) + ' ≥ ' + iTarget + ' → do not jump; drop down.',
              panel: 'skip too far',
              line: 5
            });
            break;
          }
        }

        if (lv === 0) {
          var ans = nextOn(nodes, ni, 0);
          push(out, {
            nodes: nodes, maxLevel: ml, showAllWidths: true,
            cur: { ni: ans, lv: 0 }, found: ans,
            target: iTarget, pos: pos,
            desc: 'Bottom: successor of curr is Select(' + iTarget + ') = <b>' + keyLabel(nodes[ans]) + '</b>.',
            panel: 'answer = ' + keyLabel(nodes[ans]),
            line: 6
          });
          return out;
        }

        lv--;
        push(out, {
          nodes: nodes, maxLevel: ml, showAllWidths: true, cur: { ni: ni, lv: lv },
          target: iTarget, pos: pos,
          desc: 'Drop to L' + lv + ' (same node).',
          panel: 'pos = ' + pos,
          line: 5
        });
      }
      return out;
    }

    function genRank(x) {
      var out = [];
      var nodes = cloneNodes(DEMO);
      var ml = maxH(nodes);

      push(out, {
        nodes: nodes, maxLevel: ml, showAllWidths: true, target: x, pos: 0,
        desc: 'Rank(' + x + '): count how many keys are &lt; ' + x + ', then add 1 if present. Start at head, pos = 0.',
        panel: 'pos = 0 · looking for key ' + x,
        line: 0
      });

      var ni = 0;
      var pos = 0;
      var lv = ml - 1;

      push(out, {
        nodes: nodes, maxLevel: ml, showAllWidths: true, cur: { ni: ni, lv: lv },
        target: x, pos: pos,
        desc: 'curr = -inf, level = L' + lv + '.',
        panel: 'pos = ' + pos,
        line: 1
      });

      while (lv >= 0) {
        push(out, {
          nodes: nodes, maxLevel: ml, showAllWidths: true, cur: { ni: ni, lv: lv },
          target: x, pos: pos,
          desc: 'At L' + lv + ': jump right while next.key &lt; ' + x + '.',
          panel: 'pos = ' + pos,
          line: 2
        });

        while (true) {
          var nx = nextOn(nodes, ni, lv);
          if (nx === ni) break;
          if (nodes[nx].key < x) {
            var w = skipWidth(nodes, ni, lv);
            push(out, {
              nodes: nodes, maxLevel: ml, showAllWidths: true,
              cur: { ni: ni, lv: lv }, hotEdge: { ni: ni, lv: lv },
              target: x, pos: pos,
              desc: 'next = ' + keyLabel(nodes[nx]) + ' &lt; ' + x + ' → jump; pos += width ' + w + '.',
              panel: 'pos ' + pos + ' → ' + (pos + w),
              line: 3
            });
            pos += w;
            ni = nx;
            push(out, {
              nodes: nodes, maxLevel: ml, showAllWidths: true,
              cur: { ni: ni, lv: lv },
              target: x, pos: pos,
              desc: 'Moved to ' + keyLabel(nodes[ni]) + '. pos = ' + pos + ' (keys strictly left of here at L0).',
              panel: 'pos = ' + pos,
              line: 4
            });
          } else {
            push(out, {
              nodes: nodes, maxLevel: ml, showAllWidths: true,
              cur: { ni: ni, lv: lv }, hotEdge: { ni: ni, lv: lv },
              target: x, pos: pos,
              desc: 'next = ' + keyLabel(nodes[nx]) + (nodes[nx].key === x ? ' (= ' + x + ')' : ' ≥ ' + x) + ' → do not jump; drop down.',
              panel: 'pos = ' + pos,
              line: 5
            });
            break;
          }
        }

        if (lv === 0) {
          var succ = nextOn(nodes, ni, 0);
          if (succ !== ni && nodes[succ].key === x) {
            var rankAns = pos + 1;
            push(out, {
              nodes: nodes, maxLevel: ml, showAllWidths: true,
              cur: { ni: succ, lv: 0 }, found: succ,
              target: x, pos: pos,
              desc: 'Found ' + x + '. Keys &lt; ' + x + ' = ' + pos + ' → Rank(' + x + ') = <b>' + rankAns + '</b>.',
              panel: 'Rank(' + x + ') = ' + rankAns,
              line: 6
            });
          } else {
            push(out, {
              nodes: nodes, maxLevel: ml, showAllWidths: true,
              cur: { ni: ni, lv: 0 },
              target: x, pos: pos,
              desc: x + ' not present. Would-be rank among keys &lt; ' + x + ' ends at pos = ' + pos + '.',
              panel: 'not found · pos = ' + pos,
              line: 6
            });
          }
          return out;
        }

        lv--;
        push(out, {
          nodes: nodes, maxLevel: ml, showAllWidths: true, cur: { ni: ni, lv: lv },
          target: x, pos: pos,
          desc: 'Drop to L' + lv + ' (same node).',
          panel: 'pos = ' + pos,
          line: 5
        });
      }
      return out;
    }

    function genInsert() {
      var out = [];
      var nodes = cloneNodes(DEMO);
      var x = 8;
      var nh = 2;
      var ml = maxH(nodes);

      push(out, {
        nodes: nodes, maxLevel: ml, showAllWidths: true, target: x,
        desc: 'Insert key ' + x + ' with tower height h = ' + nh + '. First find the search path (predecessors).',
        panel: 'new key = ' + x + ', h = ' + nh,
        line: 0
      });

      var update = {};
      var ni = 0;
      var lv = ml - 1;
      while (lv >= 0) {
        while (true) {
          var nx = nextOn(nodes, ni, lv);
          if (nx === ni || nodes[nx].key >= x) break;
          ni = nx;
        }
        update[lv] = ni;
        push(out, {
          nodes: nodes, maxLevel: ml, showAllWidths: true, cur: { ni: ni, lv: lv }, target: x,
          desc: 'L' + lv + ': predecessor of ' + x + ' is ' + keyLabel(nodes[ni]) + ' (update[' + lv + ']).',
          panel: 'update[' + lv + '] = ' + keyLabel(nodes[ni]),
          line: 1
        });
        if (lv === 0) break;
        lv--;
      }

      /* Capture old widths on path before splice for narration */
      var oldW = {};
      for (var L = 0; L < ml; L++) {
        oldW[L] = skipWidth(nodes, update[L], L);
      }

      var ins = 0;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].key > x) { ins = i; break; }
      }
      nodes.splice(ins, 0, { key: x, h: nh, isNew: true });
      /* update[L] stays valid: predecessor is always left of the new node */
      var newMl = maxH(nodes);
      for (var s = 0; s < nodes.length; s++) {
        if (nodes[s].sentinel) nodes[s].h = newMl;
      }

      push(out, {
        nodes: nodes, maxLevel: newMl, showAllWidths: true,
        cur: { ni: ins, lv: 0 }, found: ins, target: x,
        desc: 'Spliced tower for ' + x + ' into L0…L' + (nh - 1) + '. Now fix widths.',
        panel: 'structure linked; widths stale until updated',
        line: 3
      });

      /* Levels ≤ h-1: old skip is split across new node */
      for (L = 0; L < nh; L++) {
        var pred = update[L];
        var leftW = 0;
        for (var j = pred + 1; j <= ins; j++) {
          if (atLevel(nodes, j, 0)) leftW++;
        }
        var wPred = skipWidth(nodes, pred, L);
        var wNew = skipWidth(nodes, ins, L);
        push(out, {
          nodes: nodes, maxLevel: newMl, showAllWidths: true,
          hotEdge: { ni: pred, lv: L }, hotWidths: [{ ni: pred, lv: L }, { ni: ins, lv: L }],
          cur: { ni: ins, lv: L }, found: ins, target: x,
          desc: 'L' + L + ' (≤ h): split old width ' + oldW[L] + ' → pred.width=' + wPred + ', new.width=' + wNew + ' (left span was ' + leftW + ').',
          panel: 'local split on levels of the new tower',
          line: 5
        });
      }

      /* Levels > h: just +1 on the predecessor's width */
      for (L = nh; L < newMl; L++) {
        var pred2 = update[Math.min(L, ml - 1)];
        /* after height bump, update for new top levels is head */
        if (L >= ml) pred2 = 0;
        else pred2 = update[L] != null ? update[L] : 0;
        var wNow = skipWidth(nodes, pred2, L);
        push(out, {
          nodes: nodes, maxLevel: newMl, showAllWidths: true,
          hotEdge: { ni: pred2, lv: L }, hotWidths: [{ ni: pred2, lv: L }],
          found: ins, target: x,
          desc: 'L' + L + ' (> h): long skip still jumps over ' + x + ' → width += 1 (now ' + wNow + ').',
          panel: 'levels above the tower: +1 only',
          line: 6
        });
      }

      push(out, {
        nodes: nodes, maxLevel: newMl, showAllWidths: true, found: ins, target: x,
        desc: 'Insert done. Widths consistent again. Select / Search stay expected O(log n).',
        panel: 'Delete is symmetric (expected O(log n), not O(1))',
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
          if (atLevel(nodes, i, lv)) pos[i].ys[lv] = y;
        }
      }
      return {
        pos: pos, x0: x0, y0: y0, lh: lh, W: W, R: R,
        width: pos[nodes.length - 1].x + R + 28,
        height: y0 + (maxLevel - 1) * lh + R + 26
      };
    }

    function renderCode(mode) {
      if (typeof window.renderVizCodeLines === 'function') {
        codeLineEls = window.renderVizCodeLines(codeBox, CODE[mode]);
      } else {
        codeBox.innerHTML = CODE[mode].join('\n');
        codeLineEls = [];
      }
    }

    function render() {
      if (!frames.length) return;
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
        if (nodes[i].isNew) return { fill: COL.found, stroke: COL.foundStroke, text: COL.foundText };
        if (nodes[i].sentinel) return { fill: COL.sentFill, stroke: COL.sentStroke, text: COL.sentText };
        return { fill: COL.node, stroke: COL.nodeStroke, text: COL.nodeText };
      }
      function isHotEdge(ni, lv) {
        return f.hotEdge && f.hotEdge.ni === ni && f.hotEdge.lv === lv;
      }
      function isHotWidth(ni, lv) {
        if (!f.hotWidths) return false;
        for (var t = 0; t < f.hotWidths.length; t++) {
          if (f.hotWidths[t].ni === ni && f.hotWidths[t].lv === lv) return true;
        }
        return false;
      }

      /* Soft lane guides */
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

      /* Tower spines (behind edges) */
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

      /* Edges + width labels (halo text, no boxes) */
      for (lv = 0; lv < ml; lv++) {
        for (var j = 0; j < nodes.length; j++) {
          if (!atLevel(nodes, j, lv)) continue;
          var nx = nextOn(nodes, j, lv);
          if (nx === j) continue;
          var hot = isHotEdge(j, lv) || isHotWidth(j, lv);
          var x1 = cx(j) + R, y1 = cy(j, lv);
          var x2 = cx(nx) - R, y2 = cy(nx, lv);
          var ln = document.createElementNS(SVGNS, 'line');
          ln.setAttribute('x1', x1);
          ln.setAttribute('y1', y1);
          ln.setAttribute('x2', x2);
          ln.setAttribute('y2', y2);
          ln.setAttribute('stroke', hot ? COL.edgeHot : COL.edge);
          ln.setAttribute('stroke-width', hot ? '2.5' : '1.75');
          ln.setAttribute('stroke-linecap', 'round');
          svg.appendChild(ln);

          if (f.showAllWidths) {
            var w = skipWidth(nodes, j, lv);
            var mx = (x1 + x2) / 2;
            var my = y1 - 9;
            var whot = hot || isHotWidth(j, lv);
            var wt = document.createElementNS(SVGNS, 'text');
            wt.setAttribute('x', mx);
            wt.setAttribute('y', my);
            wt.setAttribute('text-anchor', 'middle');
            wt.setAttribute('dominant-baseline', 'central');
            wt.setAttribute('fill', whot ? COL.widthHot : COL.width);
            wt.setAttribute('font-size', whot ? '12' : '11');
            wt.setAttribute('font-weight', '700');
            wt.setAttribute('font-family', FONT);
            wt.setAttribute('stroke', '#ffffff');
            wt.setAttribute('stroke-width', '3.5');
            wt.setAttribute('paint-order', 'stroke fill');
            wt.textContent = String(w);
            svg.appendChild(wt);
          }
        }
      }

      /* Nodes as circles */
      for (i = 0; i < nodes.length; i++) {
        var st = nodeStyle(i);
        var label = keyLabel(nodes[i]);
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

      /* Rank indices under L0 */
      var ry = lay.y0 + (ml - 1) * lay.lh + R + 14;
      var rank = 0;
      for (i = 0; i < nodes.length; i++) {
        if (nodes[i].sentinel) continue;
        rank++;
        addSvgText(svg, cx(i), ry, String(rank), COL.rank, 10, '600');
      }

      stage.appendChild(svg);

      for (var k = 0; k < codeLineEls.length; k++) {
        codeLineEls[k].classList.toggle('active', k === f.line);
      }
      el('isl-viz-desc').innerHTML = f.desc;
      el('isl-viz-panel').innerHTML = f.panel || '';
      el('isl-viz-step').textContent = idx;
      el('isl-viz-total').textContent = Math.max(0, frames.length - 1);
    }

    function updateModeUI() {
      var mode = el('isl-viz-mode').value;
      el('isl-viz-select-wrap').style.display = mode === 'select' ? 'inline-flex' : 'none';
      el('isl-viz-rank-wrap').style.display = mode === 'rank' ? 'inline-flex' : 'none';
      el('isl-viz-algo-info').innerHTML = INFO[mode];
    }

    function build() {
      stop();
      var mode = el('isl-viz-mode').value;
      renderCode(mode);
      updateModeUI();
      if (mode === 'select') frames = genSelect(parseInt(el('isl-viz-select').value, 10));
      else if (mode === 'rank') frames = genRank(parseInt(el('isl-viz-rank').value, 10));
      else frames = genInsert();
      idx = 0;
      render();
    }

    function step(dir) {
      stop();
      idx = Math.min(frames.length - 1, Math.max(0, idx + dir));
      render();
    }
    function stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      el('isl-viz-play').textContent = '\u25B6 Play';
    }
    function play() {
      if (playing) { stop(); return; }
      if (idx >= frames.length - 1) { idx = 0; render(); }
      playing = true;
      el('isl-viz-play').textContent = '\u23F8 Pause';
      var speed = 1700 - parseInt(el('isl-viz-speed').value, 10);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); return; }
        idx++;
        render();
      }, speed);
    }

    el('isl-viz-play').onclick = play;
    el('isl-viz-next').onclick = function () { step(1); };
    el('isl-viz-prev').onclick = function () { step(-1); };
    el('isl-viz-mode').onchange = build;
    el('isl-viz-select').onchange = build;
    el('isl-viz-rank').onchange = build;
    el('isl-viz-speed').oninput = function () { if (playing) { stop(); play(); } };

    build();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
