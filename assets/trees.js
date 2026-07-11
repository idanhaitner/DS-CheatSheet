/* AVL & B-tree animators — insert / delete with step-through rebalancing */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  var BT_DEGREE = 2;

  var NCOL = {
    normal: { fill: '#3f51b5', stroke: '#5c6bc0', text: '#fff' },
    pivot: { fill: '#c0533f', stroke: '#ff6b81', text: '#fff' },
    heavy: { fill: '#7c4dff', stroke: '#a78bfa', text: '#fff' },
    newroot: { fill: '#2f8f5f', stroke: '#57e0c0', text: '#fff' },
    subtree: { fill: '#455a9e', stroke: '#64748b', text: '#fff' },
    promote: { fill: '#b45309', stroke: '#ffd88a', text: '#fff' },
    path: { fill: '#5c6bc0', stroke: '#7c9cff', text: '#fff' }
  };
  var ECOL = { def: '#4a5580', active: '#57e0c0', heavy: '#a78bfa' };
  var ROT_SUBSTEPS = 20;
  var ROT_GEOM_PHASE = 0.62;
  var ROW_DY = 68;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ── AVL tree ── */
  function avlNode(key, left, right) {
    return { key: key, left: left || null, right: right || null, h: 1 };
  }

  function avlH(n) { return n ? n.h : 0; }
  function avlBf(n) { return n ? avlH(n.left) - avlH(n.right) : 0; }

  function avlUpdateH(n) {
    n.h = 1 + Math.max(avlH(n.left), avlH(n.right));
  }

  function avlRotateLeft(z, hi) {
    var y = z.right, T2 = y.left;
    y.left = z; z.right = T2;
    avlUpdateH(z); avlUpdateH(y);
    hi.pivot = z.key; hi.newroot = y.key;
    return y;
  }

  function avlRotateRight(z, hi) {
    var y = z.left, T3 = y.right;
    y.right = z; z.left = T3;
    avlUpdateH(z); avlUpdateH(y);
    hi.pivot = z.key; hi.newroot = y.key;
    return y;
  }

  function avlReplaceSubtreeRoot(root, pivotKey, newRoot) {
    if (!root) return root;
    if (root.left && root.left.key === pivotKey) {
      root.left = newRoot;
      return root;
    }
    if (root.right && root.right.key === pivotKey) {
      root.right = newRoot;
      return root;
    }
    if (root.left) avlReplaceSubtreeRoot(root.left, pivotKey, newRoot);
    if (root.right) avlReplaceSubtreeRoot(root.right, pivotKey, newRoot);
    return root;
  }

  function avlApplyRotationToTree(rootRef, roles, rotated) {
    if (!rotated) return;
    if (rootRef[0] && rootRef[0].key === roles.pivot) {
      rootRef[0] = rotated;
    } else if (rotated.key !== roles.pivot) {
      avlReplaceSubtreeRoot(rootRef[0], roles.pivot, rotated);
    }
  }

  function avlCollectSubtreeKeys(n) {
    if (!n) return {};
    var o = {};
    o[n.key] = true;
    if (n.left) Object.assign(o, avlCollectSubtreeKeys(n.left));
    if (n.right) Object.assign(o, avlCollectSubtreeKeys(n.right));
    return o;
  }

  function avlRotateRolesRight(z) {
    var y = z.left, rotate = {};
    rotate[z.key] = true;
    if (y) {
      rotate[y.key] = true;
      if (y.left) Object.assign(rotate, avlCollectSubtreeKeys(y.left));
      if (y.right) Object.assign(rotate, avlCollectSubtreeKeys(y.right));
    }
    return { pivot: z.key, newroot: y ? y.key : z.key, rotate: rotate };
  }

  function avlRotateRolesLeft(z) {
    var y = z.right, rotate = {};
    rotate[z.key] = true;
    if (y) {
      rotate[y.key] = true;
      if (y.left) Object.assign(rotate, avlCollectSubtreeKeys(y.left));
      if (y.right) Object.assign(rotate, avlCollectSubtreeKeys(y.right));
    }
    return { pivot: z.key, newroot: y ? y.key : z.key, rotate: rotate };
  }

  function avlSnapshotPositions(root, hi) {
    var lay = avlLayout(root, hi || {});
    var pos = {}, bf = {};
    lay.nodes.forEach(function (nd) {
      var k = parseInt(nd.label, 10);
      pos[k] = { x: nd.x, y: nd.y };
      if (nd.bf) bf[k] = nd.bf;
    });
    return { pos: pos, bf: bf, edges: lay.edges };
  }

  function avlNodeRole(k, hi) {
    var roles = hi.animRoles;
    if (roles) {
      if (roles.pivot === k) return 'pivot';
      if (roles.newroot === k) return 'newroot';
      if (roles.rotate && roles.rotate[k]) return 'heavy';
    }
    if (hi.pivot === k) return 'pivot';
    if (hi.newroot === k) return 'newroot';
    if (hi.inserted === k || hi.deleted === k) return 'heavy';
    if (hi.path && hi.path.indexOf(k) >= 0) return 'path';
    return 'normal';
  }

  function avlSubtreeDelta(root, beforePos, slotX, slotY) {
    if (!root) return {};
    var rp = beforePos[root.key];
    if (!rp) return {};
    var dx = slotX - rp.x, dy = slotY - rp.y;
    var out = {};
    Object.keys(avlCollectSubtreeKeys(root)).forEach(function (k) {
      var ki = parseInt(k, 10);
      var p = beforePos[ki];
      if (p) out[ki] = { x: p.x + dx, y: p.y + dy };
    });
    return out;
  }

  /* Geometric pivot targets: child swaps up to pivot, pivot slides down to child slot */
  function avlGeomTargets(pivotNode, dir, beforePos) {
    if (!pivotNode) return {};
    var zp = beforePos[pivotNode.key];
    if (!zp) return {};
    var targets = {}, y, yp, dx, dy;

    if (dir === 'right') {
      y = pivotNode.left;
      if (!y) return {};
      yp = beforePos[y.key];
      if (!yp) return {};
      targets[y.key] = { x: zp.x, y: zp.y };
      targets[pivotNode.key] = { x: yp.x, y: yp.y };
      dx = zp.x - yp.x;
      dy = zp.y - yp.y;
      if (y.left) {
        Object.assign(targets, avlSubtreeDelta(y.left, beforePos, yp.x + dx, yp.y + dy));
      }
      if (y.right) {
        Object.assign(targets, avlSubtreeDelta(y.right, beforePos, yp.x - 40, yp.y + ROW_DY));
      }
    } else {
      y = pivotNode.right;
      if (!y) return {};
      yp = beforePos[y.key];
      if (!yp) return {};
      targets[y.key] = { x: zp.x, y: zp.y };
      targets[pivotNode.key] = { x: yp.x, y: yp.y };
      dx = zp.x - yp.x;
      dy = zp.y - yp.y;
      if (y.right) {
        Object.assign(targets, avlSubtreeDelta(y.right, beforePos, yp.x + dx, yp.y + dy));
      }
      if (y.left) {
        Object.assign(targets, avlSubtreeDelta(y.left, beforePos, yp.x + 40, yp.y + ROW_DY));
      }
    }
    return targets;
  }

  function avlBuildPivotFrame(before, geomTargets, after, hi, t, desc, panel) {
    var roles = hi.animRoles;
    var ease = easeInOutCubic(Math.min(1, Math.max(0, t)));
    var nodes = [], keys = {};
    Object.keys(before.pos).forEach(function (k) { keys[k] = true; });
    Object.keys(after.pos).forEach(function (k) { keys[k] = true; });

    Object.keys(keys).forEach(function (k) {
      var ki = parseInt(k, 10);
      var b = before.pos[k];
      var a = after.pos[k];
      if (!b && !a) return;
      if (!b) b = a;
      var x, y;
      if (!a || t >= 1) {
        x = a ? a.x : b.x;
        y = a ? a.y : b.y;
      } else if (geomTargets[ki] && t < ROT_GEOM_PHASE) {
        var gt = easeInOutCubic(t / ROT_GEOM_PHASE);
        x = b.x + (geomTargets[ki].x - b.x) * gt;
        y = b.y + (geomTargets[ki].y - b.y) * gt;
      } else if (geomTargets[ki]) {
        var st = easeInOutCubic((t - ROT_GEOM_PHASE) / (1 - ROT_GEOM_PHASE));
        x = geomTargets[ki].x + (a.x - geomTargets[ki].x) * st;
        y = geomTargets[ki].y + (a.y - geomTargets[ki].y) * st;
      } else {
        x = b.x + (a.x - b.x) * ease;
        y = b.y + (a.y - b.y) * ease;
      }
      nodes.push({
        id: 'k' + k, label: String(k), x: x, y: y,
        role: avlNodeRole(ki, hi),
        bf: hi.showBf && after.bf[k] ? after.bf[k] : null
      });
    });

    var edges = t >= 1 ? after.edges : (t <= 0 ? before.edges : after.edges);
    return {
      kind: 'avl', desc: desc, panel: panel || '', nodes: nodes, edges: edges,
      pivotRing: t > 0 && t < 1 ? before.pos[roles.pivot] : null,
      anim: true, animT: t
    };
  }

  function avlPushRotationAnim(frames, rootRef, baseHi, applyRotate, meta) {
    var before = avlSnapshotPositions(rootRef[0], baseHi);
    var geomTargets = avlGeomTargets(meta.pivotNode, meta.dir, before.pos);
    var rotated = applyRotate();
    avlApplyRotationToTree(rootRef, meta.roles, rotated);
    var afterHi = Object.assign({}, baseHi, {
      pivot: meta.roles.pivot, newroot: meta.roles.newroot, showBf: true
    });
    var after = avlSnapshotPositions(rootRef[0], afterHi);
    var s, t;
    for (s = 0; s <= ROT_SUBSTEPS; s++) {
      t = s / ROT_SUBSTEPS;
      frames.push(avlBuildPivotFrame(before, geomTargets, after, {
        animRoles: meta.roles,
        inserted: baseHi.inserted,
        deleted: baseHi.deleted,
        path: baseHi.path,
        showBf: s === ROT_SUBSTEPS
      }, t, meta.descBase, meta.panel));
    }
  }

  function avlRebalance(n, hi, animCtx) {
    avlUpdateH(n);
    var bf = avlBf(n);
    var frames = animCtx && animCtx.frames;
    var rootRef = animCtx && animCtx.rootRef;
    var baseHi = animCtx && animCtx.baseHi;
    var rotated;

    if (bf > 1) {
      var isLR = avlBf(n.left) < 0;
      if (isLR) {
        hi.panel = '<b>LR case</b> — left-rotate child, then right-rotate.';
        hi.pivot = n.key;
        if (frames) {
          var lrChild = n.left;
          avlPushRotationAnim(frames, rootRef, baseHi, function () {
            n.left = avlRotateLeft(n.left, hi);
            return rootRef[0];
          }, {
            roles: avlRotateRolesLeft(lrChild),
            pivotNode: lrChild,
            dir: 'left',
            descBase: 'LR (1/2): left-rotate child <b>' + lrChild.key + '</b>',
            panel: hi.panel
          });
        } else {
          n.left = avlRotateLeft(n.left, hi);
        }
      } else {
        hi.panel = '<b>LL case</b> — single right-rotate.';
      }
      hi.pivot = n.key;
      if (frames) {
        avlPushRotationAnim(frames, rootRef, baseHi, function () {
          rotated = avlRotateRight(n, hi);
          return rotated;
        }, {
          roles: avlRotateRolesRight(n),
          pivotNode: n,
          dir: 'right',
          descBase: (isLR ? 'LR (2/2)' : 'LL') + ': right-rotate at <b>' + n.key + '</b>',
          panel: hi.panel
        });
        frames.push(avlFrame(
          (isLR ? 'LR' : 'LL') + ' rebalance complete.',
          rootRef[0],
          { showBf: true, inserted: baseHi.inserted, deleted: baseHi.deleted, path: baseHi.path },
          hi.panel
        ));
        return rotated;
      }
      return avlRotateRight(n, hi);
    }
    if (bf < -1) {
      var isRL = avlBf(n.right) > 0;
      if (isRL) {
        hi.panel = '<b>RL case</b> — right-rotate child, then left-rotate.';
        hi.pivot = n.key;
        if (frames) {
          var rlChild = n.right;
          avlPushRotationAnim(frames, rootRef, baseHi, function () {
            n.right = avlRotateRight(n.right, hi);
            return rootRef[0];
          }, {
            roles: avlRotateRolesRight(rlChild),
            pivotNode: rlChild,
            dir: 'right',
            descBase: 'RL (1/2): right-rotate child <b>' + rlChild.key + '</b>',
            panel: hi.panel
          });
        } else {
          n.right = avlRotateRight(n.right, hi);
        }
      } else {
        hi.panel = '<b>RR case</b> — single left-rotate.';
      }
      hi.pivot = n.key;
      if (frames) {
        avlPushRotationAnim(frames, rootRef, baseHi, function () {
          rotated = avlRotateLeft(n, hi);
          return rotated;
        }, {
          roles: avlRotateRolesLeft(n),
          pivotNode: n,
          dir: 'left',
          descBase: (isRL ? 'RL (2/2)' : 'RR') + ': left-rotate at <b>' + n.key + '</b>',
          panel: hi.panel
        });
        frames.push(avlFrame(
          (isRL ? 'RL' : 'RR') + ' rebalance complete.',
          rootRef[0],
          { showBf: true, inserted: baseHi.inserted, deleted: baseHi.deleted, path: baseHi.path },
          hi.panel
        ));
        return rotated;
      }
      return avlRotateLeft(n, hi);
    }
    return n;
  }

  function avlCountLeaves(n) {
    if (!n) return 0;
    if (!n.left && !n.right) return 1;
    return avlCountLeaves(n.left) + avlCountLeaves(n.right);
  }

  function avlMaxDepth(n, d) {
    if (!n) return d - 1;
    return Math.max(avlMaxDepth(n.left, d + 1), avlMaxDepth(n.right, d + 1));
  }

  function frameBounds(fr) {
    var pad = 32;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    function grow(x0, y0, x1, y1) {
      if (x0 < minX) minX = x0;
      if (x1 > maxX) maxX = x1;
      if (y0 < minY) minY = y0;
      if (y1 > maxY) maxY = y1;
    }
    if (fr.kind === 'avl' && fr.nodes && fr.nodes.length) {
      fr.nodes.forEach(function (n) {
        grow(n.x - 30, n.y - 30, n.x + 34, n.y + 30);
      });
    } else if (fr.kind === 'btree' && fr.btNodes && fr.btNodes.length) {
      fr.btNodes.forEach(function (n) {
        var w = n.w || btNodeWidth(n.keys);
        grow(n.x, n.y, n.x + w, n.y + 36);
      });
    } else {
      return { x: 0, y: 0, w: 480, h: 240 };
    }
    if (!isFinite(minX)) return { x: 0, y: 0, w: 480, h: 240 };
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }

  function applyTreeView(svg, bounds, zoom, panX, panY) {
    var z = Math.max(0.35, Math.min(4, zoom || 1));
    var cx = bounds.x + bounds.w / 2 + (panX || 0);
    var cy = bounds.y + bounds.h / 2 + (panY || 0);
    var w = bounds.w / z;
    var h = bounds.h / z;
    svg.setAttribute('viewBox', (cx - w / 2) + ' ' + (cy - h / 2) + ' ' + w + ' ' + h);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  function avlLayout(root, hi) {
    hi = hi || {};
    var nodes = [], edges = [], leafX = 0;
    var pathSet = {};
    (hi.path || []).forEach(function (k) { pathSet[k] = true; });

    var leaves = avlCountLeaves(root);
    var maxD = avlMaxDepth(root, 0);
    var spacing = leaves <= 6 ? 48 : Math.max(20, Math.min(48, 520 / leaves));
    var rowDy = maxD <= 4 ? 68 : Math.max(48, Math.min(68, 380 / (maxD + 1)));

    function role(k) {
      if (hi.pivot === k) return 'pivot';
      if (hi.newroot === k) return 'newroot';
      if (hi.inserted === k || hi.deleted === k) return 'heavy';
      if (pathSet[k]) return 'path';
      return 'normal';
    }

    function recur(n, depth, parentId) {
      if (!n) return;
      var id = 'k' + n.key;
      recur(n.left, depth + 1, id);
      var x = leafX * spacing;
      leafX++;
      var bf = avlBf(n);
      var bfStr = Math.abs(bf) > 1 ? (bf > 0 ? '+' + bf : String(bf)) : null;
      nodes.push({
        id: id, label: String(n.key), x: x, y: depth * rowDy + 40,
        role: role(n.key), bf: hi.showBf && bfStr ? bfStr : null
      });
      if (parentId) edges.push([parentId, id]);
      recur(n.right, depth + 1, id);
    }
    recur(root, 0, null);

    if (nodes.length) {
      var minX = nodes[0].x;
      nodes.forEach(function (nd) {
        if (nd.x < minX) minX = nd.x;
      });
      var shift = 40 - minX;
      nodes.forEach(function (nd) { nd.x += shift; });
    }
    return { nodes: nodes, edges: edges };
  }

  function avlFrame(desc, root, hi, panel) {
    var lay = avlLayout(root, hi);
    return { kind: 'avl', desc: desc, panel: panel || '', nodes: lay.nodes, edges: lay.edges };
  }

  function avlInsert(root, key, frames) {
    var rootRef = [root];
    var path = [];

    if (!rootRef[0]) {
      rootRef[0] = avlNode(key);
      frames.push(avlFrame(
        'Insert <b>' + key + '</b> as root.',
        rootRef[0], { inserted: key },
        'Tree was empty.'));
      return rootRef[0];
    }

    function insert(n) {
      path.push(n.key);

      if (key < n.key) {
        if (!n.left) {
          n.left = avlNode(key);
          frames.push(avlFrame(
            'Insert <b>' + key + '</b> at leaf (path: ' + path.join(' → ') + ').',
            rootRef[0], { inserted: key, path: path.slice() },
            'Walk back up and rebalance if needed.'));
        } else {
          n.left = insert(n.left);
        }
      } else if (key > n.key) {
        if (!n.right) {
          n.right = avlNode(key);
          frames.push(avlFrame(
            'Insert <b>' + key + '</b> at leaf (path: ' + path.join(' → ') + ').',
            rootRef[0], { inserted: key, path: path.slice() },
            'Walk back up and rebalance if needed.'));
        } else {
          n.right = insert(n.right);
        }
      } else {
        frames.push(avlFrame('<b>' + key + '</b> already in tree.', rootRef[0], { path: path.slice() }));
        path.pop();
        return n;
      }

      avlUpdateH(n);
      var bf = avlBf(n);
      if (Math.abs(bf) > 1) {
        var hi = { showBf: true };
        var rotated = avlRebalance(n, hi, {
          frames: frames,
          rootRef: rootRef,
          baseHi: { path: path.slice(), pivot: n.key, showBf: true, inserted: key }
        });
        path.pop();
        return rotated;
      }
      path.pop();
      return n;
    }

    rootRef[0] = insert(rootRef[0]);
    return rootRef[0];
  }

  function avlMin(n) {
    while (n.left) n = n.left;
    return n;
  }

  function avlDelete(root, key, frames) {
    if (!root) {
      frames.push(avlFrame('Tree is empty — nothing to delete.', null, {}));
      return null;
    }
    var rootRef = [root];
    var path = [];

    function rebalanceNode(n) {
      if (!n) return null;
      avlUpdateH(n);
      var bf = avlBf(n);
      if (Math.abs(bf) <= 1) return n;
      var hi = { showBf: true };
      var rotated = avlRebalance(n, hi, {
        frames: frames,
        rootRef: rootRef,
        baseHi: { pivot: n.key, showBf: true, path: path.slice(), deleted: key }
      });
      if (n === rootRef[0]) rootRef[0] = rotated;
      return rotated;
    }

    function del(n) {
      if (!n) {
        frames.push(avlFrame('<b>' + key + '</b> not found.', rootRef[0], { path: path.slice() }));
        return null;
      }
      path.push(n.key);

      if (key < n.key) {
        n.left = del(n.left);
      } else if (key > n.key) {
        n.right = del(n.right);
      } else {
        if (!n.left || !n.right) {
          frames.push(avlFrame(
            'Delete <b>' + key + '</b>' + (n.left || n.right ? ' — splice child up.' : ' — remove leaf.'),
            rootRef[0], { deleted: key, path: path.slice() }));
          var child = n.left || n.right;
          if (n === rootRef[0]) rootRef[0] = child;
          return child;
        }
        var succ = avlMin(n.right);
        frames.push(avlFrame(
          'Delete <b>' + key + '</b> — swap with successor <b>' + succ.key + '</b>.',
          rootRef[0], { deleted: key, path: path.slice() }));
        n.key = succ.key;
        n.right = delSucc(n.right, succ.key);
      }

      return rebalanceNode(n);
    }

    function delSucc(n, k) {
      if (k < n.key) n.left = delSucc(n.left, k);
      else if (k > n.key) n.right = delSucc(n.right, k);
      else return n.right;
      return rebalanceNode(n);
    }

    rootRef[0] = del(rootRef[0]);
    return rootRef[0];
  }

  /* ── B-tree (t = 2) ── */
  function btNode(keys, children, leaf) {
    return { keys: keys.slice(), children: children ? children.slice() : [], leaf: !!leaf };
  }

  function btMaxKeys() { return 2 * BT_DEGREE - 1; }
  function btMinKeys() { return BT_DEGREE - 1; }

  function btSearch(node, key) {
    if (!node) return null;
    var i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;
    if (i < node.keys.length && key === node.keys[i]) return node;
    if (node.leaf) return null;
    return btSearch(node.children[i], key);
  }

  function btInsertKey(node, key) {
    var i = 0;
    while (i < node.keys.length && node.keys[i] < key) i++;
    node.keys.splice(i, 0, key);
  }

  function btSplitChild(parent, idx, frames, rootRef) {
    var t = BT_DEGREE;
    var full = parent.children[idx];
    var promote = full.keys[t - 1];
    var left = btNode(full.keys.slice(0, t - 1), full.children.slice(0, t), full.leaf);
    var right = btNode(full.keys.slice(t), full.children.slice(t), full.leaf);

    frames.push(btFrame(
      'Split full node [' + full.keys.join(', ') + ']: median <b>' + promote + '</b> moves up.',
      rootRef[0], { heavy: full.keys.join(','), promote: promote, splitLeft: left, splitRight: right },
      'Left keeps keys &lt; median; right keeps keys &gt; median.'));

    parent.keys.splice(idx, 0, promote);
    parent.children.splice(idx, 1, left, right);

    frames.push(btFrame(
      'After split: parent gains <b>' + promote + '</b>; two half-full children.',
      rootRef[0], { promote: promote },
      'If parent overflows too, split propagates upward.'));
  }

  function btInsertNonFull(node, key, frames, rootRef) {
    var i = node.keys.length - 1;

    if (node.leaf) {
      frames.push(btFrame(
        'Insert <b>' + key + '</b> into leaf [' + node.keys.join(', ') + '].',
        rootRef[0], { target: key, heavy: node.keys.join(',') },
        'Leaf has room — insert in sorted order.'));
      btInsertKey(node, key);
      if (node.keys.length <= btMaxKeys()) {
        frames.push(btFrame(
          'Leaf is now [' + node.keys.join(', ') + ']' + (node.keys.length === btMaxKeys() ? ' — <b>full</b> (2t−1 keys).' : '.'),
          rootRef[0], { heavy: node.keys.join(',') }));
        return;
      }
      /* leaf overflow without parent split on way down — rare if we split proactively */
      return;
    }

    while (i >= 0 && node.keys[i] > key) i--;
    i++;
    frames.push(btFrame(
      'Internal node [' + node.keys.join(', ') + ']: descend into child ' + (i + 1) + '.',
      rootRef[0], { path: node.keys.join(','), target: key },
      'Find the child bracket where ' + key + ' belongs.'));

    if (node.children[i].keys.length === btMaxKeys()) {
      btSplitChild(node, i, frames, rootRef);
      if (key > node.keys[i]) i++;
    }
    btInsertNonFull(node.children[i], key, frames, rootRef);
  }

  function btInsert(root, key, frames) {
    if (!root) {
      var n = btNode([key], [], true);
      frames.push(btFrame('Empty tree — create root [' + key + '].', n, {}));
      return n;
    }
    if (btSearch(root, key)) {
      frames.push(btFrame('<b>' + key + '</b> already in tree.', root, {}));
      return root;
    }
    var rootRef = [root];
    frames.push(btFrame('Insert <b>' + key + '</b> — descend from root.', root, {}));

    if (root.keys.length === btMaxKeys()) {
      frames.push(btFrame('Root is <b>full</b> — split before descending.', root, { heavy: root.keys.join(',') }));
      var newRoot = btNode([], [root], false);
      btSplitChild(newRoot, 0, frames, rootRef);
      rootRef[0] = newRoot;
      frames.push(btFrame('New root created after root split.', newRoot, { newroot: String(newRoot.keys[0]) }));
    }

    btInsertNonFull(rootRef[0], key, frames, rootRef);
    frames.push(btFrame('Insert <b>' + key + '</b> complete.', rootRef[0], {}));
    return rootRef[0];
  }

  function btBorrowFromPrev(parent, idx, frames, root) {
    var child = parent.children[idx];
    var sibling = parent.children[idx - 1];
    child.keys.unshift(parent.keys[idx - 1]);
    parent.keys[idx - 1] = sibling.keys.pop();
    if (!child.leaf) child.children.unshift(sibling.children.pop());
    frames.push(btFrame(
      'Borrow from left sibling: pull separator <b>' + child.keys[0] + '</b> down.',
      root, { heavy: child.keys.join(',') },
      'Sibling donates its largest key.'));
  }

  function btBorrowFromNext(parent, idx, frames, root) {
    var child = parent.children[idx];
    var sibling = parent.children[idx + 1];
    child.keys.push(parent.keys[idx]);
    parent.keys[idx] = sibling.keys.shift();
    if (!child.leaf) child.children.push(sibling.children.shift());
    frames.push(btFrame(
      'Borrow from right sibling: pull separator <b>' + child.keys[child.keys.length - 1] + '</b> down.',
      root, { heavy: child.keys.join(',') },
      'Sibling donates its smallest key.'));
  }

  function btMerge(parent, idx, frames, root) {
    var left = parent.children[idx];
    var right = parent.children[idx + 1];
    var sep = parent.keys[idx];
    frames.push(btFrame(
      'Merge [' + left.keys.join(', ') + '] + separator <b>' + sep + '</b> + [' + right.keys.join(', ') + '].',
      root, { heavy: left.keys.join(','), promote: sep },
      'Both siblings at minimum — borrow impossible.'));
    left.keys.push(sep);
    left.keys = left.keys.concat(right.keys);
    if (!left.leaf) left.children = left.children.concat(right.children);
    parent.keys.splice(idx, 1);
    parent.children.splice(idx + 1, 1);
    frames.push(btFrame(
      'Merged leaf/internal node: [' + left.keys.join(', ') + ']. Parent loses separator.',
      root, { heavy: left.keys.join(',') }));
  }

  function btFill(parent, idx, frames, root) {
    var child = parent.children[idx];
    if (idx > 0 && parent.children[idx - 1].keys.length > btMinKeys()) {
      btBorrowFromPrev(parent, idx, frames, root);
    } else if (idx < parent.children.length - 1 && parent.children[idx + 1].keys.length > btMinKeys()) {
      btBorrowFromNext(parent, idx, frames, root);
    } else {
      if (idx < parent.children.length - 1) btMerge(parent, idx, frames, root);
      else btMerge(parent, idx - 1, frames, root);
    }
  }

  function btRemoveFromLeaf(node, key, frames, root) {
    var i = node.keys.indexOf(key);
    frames.push(btFrame('Remove <b>' + key + '</b> from leaf [' + node.keys.join(', ') + '].', root, { deleted: key }));
    node.keys.splice(i, 1);
  }

  function btGetPred(node) {
    var cur = node;
    while (cur.children.length) cur = cur.children[cur.children.length - 1];
    return cur.keys[cur.keys.length - 1];
  }

  function btDeleteFromNode(root, node, key, frames) {
    var i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;

    if (i < node.keys.length && node.keys[i] === key && !node.leaf) {
      frames.push(btFrame('Key <b>' + key + '</b> in internal node — replace with predecessor or successor.', root, { deleted: key }));
      if (node.children[i].keys.length > btMinKeys()) {
        var pred = btGetPred(node.children[i]);
        node.keys[i] = pred;
        btDeleteFromNode(root, node.children[i], pred, frames);
      } else if (node.children[i + 1].keys.length > btMinKeys()) {
        var succ = node.children[i + 1].keys[0];
        node.keys[i] = succ;
        btDeleteFromNode(root, node.children[i + 1], succ, frames);
      } else {
        btFill(node, i, frames, root);
        var p = btGetPred(node.children[i]);
        node.keys[i] = p;
        btDeleteFromNode(root, node.children[i], p, frames);
      }
      return;
    }

    if (node.leaf) {
      if (i < node.keys.length && node.keys[i] === key) btRemoveFromLeaf(node, key, frames, root);
      return;
    }

    frames.push(btFrame('Descend to delete <b>' + key + '</b>.', root, { target: key, path: node.keys.join(',') }));
    if (node.children[i].keys.length === btMinKeys()) btFill(node, i, frames, root);
    btDeleteFromNode(root, node.children[i], key, frames);
  }

  function btDelete(root, key, frames) {
    if (!root) {
      frames.push(btFrame('Tree is empty.', null, {}));
      return null;
    }
    if (!btSearch(root, key)) {
      frames.push(btFrame('<b>' + key + '</b> not found.', root, {}));
      return root;
    }
    frames.push(btFrame('Delete <b>' + key + '</b> — ensure nodes on path have ≥ t keys.', root, {}));
    if (root.keys.length === 1 && root.children.length === 2 &&
        root.children[0].keys.length === btMinKeys() && root.children[1].keys.length === btMinKeys()) {
      frames.push(btFrame('Root has only one key and min children — may shrink height after merge.', root, {}));
    }
    btDeleteFromNode(root, root, key, frames);
    if (root.keys.length === 0 && root.children.length > 0) {
      frames.push(btFrame('Root empty after delete — promote sole child as new root.', root.children[0], { newroot: 'root' }));
      root = root.children[0];
    }
    frames.push(btFrame('Delete <b>' + key + '</b> complete.', root, {}));
    return root;
  }

  function btFromKeys(keys) {
    var root = null;
    keys.forEach(function (k) {
      var fr = [];
      root = btInsert(root, k, fr);
    });
    return root;
  }

  /* ── B-tree layout ── */
  function btNodeWidth(keys) {
    return Math.max(44, keys.length * 28 + 16);
  }

  function btLayout(root, hi) {
    hi = hi || {};
    var nodes = [], links = [];
    if (!root) return { nodes: nodes, links: links };

    var idCtr = 0;
    function nid() { return 'b' + (idCtr++); }

    function roleFor(keys, id) {
      if (hi.newroot && hi.newroot === id) return 'newroot';
      if (hi.promote && hi.promote === keys[0] && keys.length === 1) return 'promote';
      if (hi.heavy && hi.heavy === keys.join(',')) return 'heavy';
      if (hi.deleted && keys.indexOf(hi.deleted) >= 0) return 'heavy';
      return 'normal';
    }

    var leafPos = 0;
    var leafCount = (function count(n) {
      if (!n) return 0;
      if (n.leaf || !n.children.length) return 1;
      var s = 0;
      n.children.forEach(function (c) { s += count(c); });
      return s;
    })(root);
    var leafGap = leafCount <= 4 ? 120 : Math.max(72, Math.min(120, 640 / leafCount));
    var rowDy = 78;

    function layout(n, depth) {
      var id = nid();
      var kids = n.children || [];
      var childLayouts = kids.map(function (c) { return layout(c, depth + 1); });

      var w = btNodeWidth(n.keys);
      var x;
      if (!childLayouts.length) {
        x = leafPos * leafGap;
        leafPos++;
      } else {
        var left = childLayouts[0].x;
        var right = childLayouts[childLayouts.length - 1].x + childLayouts[childLayouts.length - 1].w;
        x = (left + right - w) / 2;
      }
      var y = depth * rowDy + 24;
      var entry = { id: id, keys: n.keys.slice(), x: x, y: y, w: w, role: roleFor(n.keys, id) };
      nodes.push(entry);
      childLayouts.forEach(function (cl) {
        links.push([id, cl.id]);
      });
      return { id: id, x: x, y: y, w: w };
    }

    layout(root, 0);

    if (nodes.length) {
      var minX = nodes[0].x;
      nodes.forEach(function (nd) {
        if (nd.x < minX) minX = nd.x;
      });
      var shift = 40 - minX;
      nodes.forEach(function (nd) { nd.x += shift; });
    }

    if (hi.promote && hi.splitLeft && hi.splitRight) {
      /* optional floating promote badge — skip for cleaner layout */
    }

    return { nodes: nodes, links: links };
  }

  function btFrame(desc, root, hi, panel) {
    var lay = btLayout(root, hi || {});
    return { kind: 'btree', desc: desc, panel: panel || '', btNodes: lay.nodes, links: lay.links };
  }

  /* ── Drawing (unchanged style) ── */
  function nodeMap(nodes) {
    var m = {};
    nodes.forEach(function (n) { m[n.id] = n; });
    return m;
  }

  function drawAvlFrame(svg, fr) {
    if (!fr.nodes.length) {
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', '240'); t.setAttribute('y', '120');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', '#7c8aa8');
      t.setAttribute('font-size', '14'); t.textContent = '(empty tree)';
      svg.appendChild(t);
      return;
    }
    var ringLayer = document.createElementNS(SVGNS, 'g');
    ringLayer.setAttribute('data-layer', 'ring');
    svg.appendChild(ringLayer);
    var edgeLayer = document.createElementNS(SVGNS, 'g');
    edgeLayer.setAttribute('data-layer', 'edges');
    svg.appendChild(edgeLayer);
    var nodeLayer = document.createElementNS(SVGNS, 'g');
    nodeLayer.setAttribute('data-layer', 'nodes');
    svg.appendChild(nodeLayer);
    paintAvlFrame(svg, fr);
  }

  function paintAvlFrame(svg, fr) {
    var ringLayer = svg.querySelector('[data-layer="ring"]');
    var edgeLayer = svg.querySelector('[data-layer="edges"]');
    var nodeLayer = svg.querySelector('[data-layer="nodes"]');
    if (!ringLayer || !edgeLayer || !nodeLayer) return;

    while (ringLayer.firstChild) ringLayer.removeChild(ringLayer.firstChild);
    if (fr.pivotRing) {
      var ring = document.createElementNS(SVGNS, 'circle');
      ring.setAttribute('cx', fr.pivotRing.x);
      ring.setAttribute('cy', fr.pivotRing.y);
      ring.setAttribute('r', '26');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#ff6b81');
      ring.setAttribute('stroke-width', '2.5');
      ring.setAttribute('stroke-dasharray', '6 4');
      ring.setAttribute('opacity', '0.85');
      ringLayer.appendChild(ring);
    }

    var nm = nodeMap(fr.nodes);
    var edgeSig = fr.edges.map(function (e) { return e[0] + '-' + e[1]; }).join('|');
    if (edgeLayer.getAttribute('data-sig') !== edgeSig) {
      while (edgeLayer.firstChild) edgeLayer.removeChild(edgeLayer.firstChild);
      fr.edges.forEach(function (e, i) {
        var ln = document.createElementNS(SVGNS, 'line');
        ln.setAttribute('data-edge', String(i));
        edgeLayer.appendChild(ln);
      });
      edgeLayer.setAttribute('data-sig', edgeSig);
    }
    fr.edges.forEach(function (e, i) {
      var a = nm[e[0]], b = nm[e[1]];
      var ln = edgeLayer.querySelector('[data-edge="' + i + '"]');
      if (!ln) return;
      if (!a || !b) {
        ln.setAttribute('display', 'none');
        return;
      }
      ln.setAttribute('display', 'inline');
      var heavy = a.role === 'heavy' || b.role === 'heavy' || a.role === 'pivot' || b.role === 'pivot' ||
        a.role === 'subtree' || b.role === 'subtree' || a.role === 'newroot' || b.role === 'newroot';
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y + 18);
      ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y - 18);
      ln.setAttribute('stroke', heavy ? ECOL.heavy : ECOL.def);
      ln.setAttribute('stroke-width', heavy ? '2.5' : '2');
    });

    fr.nodes.forEach(function (n) {
      var g = nodeLayer.querySelector('[data-node="' + n.id + '"]');
      var col = NCOL[n.role] || NCOL.normal;
      if (!g) {
        g = document.createElementNS(SVGNS, 'g');
        g.setAttribute('data-node', n.id);
        var c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('r', '18');
        c.setAttribute('stroke-width', '2');
        g.appendChild(c);
        var t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', '14');
        t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', FONT);
        t.textContent = n.label;
        g.appendChild(t);
        var bf = document.createElementNS(SVGNS, 'text');
        bf.setAttribute('data-bf', '1');
        bf.setAttribute('font-size', '11');
        bf.setAttribute('font-weight', '700');
        g.appendChild(bf);
        nodeLayer.appendChild(g);
      }
      var c = g.querySelector('circle');
      var t = g.querySelector('text:not([data-bf])');
      var bf = g.querySelector('[data-bf]');
      c.setAttribute('cx', n.x); c.setAttribute('cy', n.y);
      c.setAttribute('fill', col.fill); c.setAttribute('stroke', col.stroke);
      t.setAttribute('x', n.x); t.setAttribute('y', n.y + 5);
      t.setAttribute('fill', col.text);
      if (n.bf) {
        bf.setAttribute('x', n.x + 22); bf.setAttribute('y', n.y - 14);
        bf.setAttribute('fill', '#ff6b81'); bf.textContent = 'bf' + n.bf;
        bf.setAttribute('display', 'inline');
      } else if (bf) {
        bf.textContent = '';
        bf.setAttribute('display', 'none');
      }
    });

    var liveIds = {};
    fr.nodes.forEach(function (n) { liveIds[n.id] = true; });
    nodeLayer.querySelectorAll('[data-node]').forEach(function (g) {
      if (!liveIds[g.getAttribute('data-node')]) g.remove();
    });
  }

  function drawBtreeFrame(svg, fr) {
    if (!fr.btNodes.length) {
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', '240'); t.setAttribute('y', '120');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', '#7c8aa8');
      t.setAttribute('font-size', '14'); t.textContent = '(empty tree)';
      svg.appendChild(t);
      return;
    }
    var nm = {};
    fr.btNodes.forEach(function (n) { nm[n.id] = n; });
    fr.links.forEach(function (lk) {
      var p = nm[lk[0]], c = nm[lk[1]];
      if (!p || !c) return;
      var pw = p.w || btNodeWidth(p.keys);
      var cw = c.w || btNodeWidth(c.keys);
      var ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', p.x + pw / 2); ln.setAttribute('y1', p.y + 32);
      ln.setAttribute('x2', c.x + cw / 2); ln.setAttribute('y2', c.y);
      ln.setAttribute('stroke', ECOL.def); ln.setAttribute('stroke-width', '2');
      svg.appendChild(ln);
    });
    fr.btNodes.forEach(function (n) {
      var w = n.w || btNodeWidth(n.keys);
      var col = NCOL[n.role] || NCOL.normal;
      var g = document.createElementNS(SVGNS, 'g');
      var rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('x', n.x); rect.setAttribute('y', n.y); rect.setAttribute('width', w);
      rect.setAttribute('height', '32'); rect.setAttribute('rx', '6');
      rect.setAttribute('fill', col.fill); rect.setAttribute('stroke', col.stroke); rect.setAttribute('stroke-width', '2');
      g.appendChild(rect);
      var cellW = w / n.keys.length;
      n.keys.forEach(function (k, i) {
        if (i > 0) {
          var div = document.createElementNS(SVGNS, 'line');
          div.setAttribute('x1', n.x + i * cellW); div.setAttribute('y1', n.y + 4);
          div.setAttribute('x2', n.x + i * cellW); div.setAttribute('y2', n.y + 28);
          div.setAttribute('stroke', 'rgba(255,255,255,0.35)'); div.setAttribute('stroke-width', '1');
          g.appendChild(div);
        }
        var tx = document.createElementNS(SVGNS, 'text');
        tx.setAttribute('x', n.x + (i + 0.5) * cellW); tx.setAttribute('y', n.y + 21);
        tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('fill', col.text);
        tx.setAttribute('font-size', '13'); tx.setAttribute('font-weight', '700'); tx.setAttribute('font-family', FONT);
        tx.textContent = String(k);
        g.appendChild(tx);
      });
      svg.appendChild(g);
    });
  }

  /* ── Interactive animator ── */
  function createInteractive(wrap, kind) {
    var $ = function (sel) { return wrap.querySelector(sel); };
    var stage = $('.tree-stage');
    if (!stage) return;

    var tree = null;
    var frames = [];
    var idx = 0;
    var timer = null;
    var playing = false;
    var zoom = 1;
    var panX = 0;
    var panY = 0;
    var autoFit = true;
    var initKeys = kind === 'avl' ? [30, 20, 40, 10] : [20, 40, 10, 30, 50];
    var stableBounds = null;
    var liveSvg = null;
    var rafId = null;
    var accum = 0;
    var lastTs = 0;

    function frameDuration(fr) {
      var speedVal = parseInt($('.viz-speed').value, 10) || 1600;
      if (fr && fr.anim) {
        return Math.max(14, 42 - speedVal * 0.018);
      }
      return Math.max(60, 900 - speedVal * 0.45);
    }

    function applyFrameView(svg, fr) {
      var bounds = playing && stableBounds ? stableBounds : frameBounds(fr);
      if (autoFit && !playing) {
        zoom = 1;
        panX = 0;
        panY = 0;
      }
      applyTreeView(svg, bounds, zoom, panX, panY);
      var aspect = bounds.h / Math.max(bounds.w, 1);
      var displayH = Math.min(480, Math.max(200, stage.clientWidth * aspect));
      svg.setAttribute('height', String(Math.round(displayH)));
    }

    function updateFrameMeta(fr) {
      var descEl = $('.viz-desc');
      var panelEl = $('.viz-panel');
      var stepEl = $('.viz-step');
      var totalEl = $('.viz-total');
      if (descEl) descEl.innerHTML = fr.desc;
      if (panelEl) panelEl.innerHTML = fr.panel;
      if (stepEl) stepEl.textContent = idx;
      if (totalEl) totalEl.textContent = Math.max(0, frames.length - 1);
    }

    function ensureZoomControls() {
      var ctrl = wrap.querySelector('.viz-controls');
      if (!ctrl || ctrl.querySelector('.viz-zoom-in')) return;
      var lbl = document.createElement('label');
      lbl.className = 'viz-zoom-label';
      lbl.innerHTML = '<button type="button" class="viz-btn viz-zoom-out" title="Zoom out">\u2212</button> ' +
        '<button type="button" class="viz-btn viz-zoom-fit" title="Fit whole tree">Fit</button> ' +
        '<button type="button" class="viz-btn viz-zoom-in" title="Zoom in">+</button>';
      ctrl.appendChild(lbl);
      lbl.querySelector('.viz-zoom-in').onclick = function () {
        autoFit = false;
        zoom = Math.min(4, zoom * 1.3);
        render(true);
      };
      lbl.querySelector('.viz-zoom-out').onclick = function () {
        autoFit = false;
        zoom = Math.max(0.4, zoom / 1.3);
        render(true);
      };
      lbl.querySelector('.viz-zoom-fit').onclick = function () {
        autoFit = true;
        zoom = 1;
        panX = 0;
        panY = 0;
        render(true);
      };
    }

    function render(forceRebuild) {
      if (!frames.length) {
        frames = [kind === 'avl'
          ? avlFrame('Enter a key and click <b>Insert</b> or <b>Delete</b>.', tree, {})
          : btFrame('Enter a key and click <b>Insert</b> or <b>Delete</b>. (t = 2)', tree, {})];
      }
      var fr = frames[Math.min(idx, frames.length - 1)];
      var canPatch = !forceRebuild && playing && liveSvg && fr.kind === 'avl' && fr.nodes.length;
      if (canPatch) {
        paintAvlFrame(liveSvg, fr);
        applyFrameView(liveSvg, fr);
        updateFrameMeta(fr);
        return;
      }
      stage.innerHTML = '';
      liveSvg = null;
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('width', '100%');
      svg.classList.add('tree-viz-svg');
      if (fr.kind === 'avl') drawAvlFrame(svg, fr);
      else drawBtreeFrame(svg, fr);
      applyFrameView(svg, fr);
      stage.appendChild(svg);
      liveSvg = fr.kind === 'avl' ? svg : null;
      updateFrameMeta(fr);
    }

    function haltPlayback() {
      playing = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (timer) { clearInterval(timer); timer = null; }
      accum = 0;
      lastTs = 0;
      stableBounds = null;
      liveSvg = null;
      var btn = $('.viz-play');
      if (btn) btn.textContent = '\u25B6 Play';
    }

    function stop() {
      haltPlayback();
      if (autoFit) render(true);
    }

    function step(dir) {
      stop();
      idx = Math.min(frames.length - 1, Math.max(0, idx + dir));
      render(true);
    }

    function tick(ts) {
      if (!playing) return;
      if (!lastTs) lastTs = ts;
      accum += ts - lastTs;
      lastTs = ts;
      var fr = frames[Math.min(idx, frames.length - 1)];
      var dur = frameDuration(fr);
      var advanced = false;
      while (accum >= dur && idx < frames.length - 1) {
        accum -= dur;
        idx++;
        advanced = true;
      }
      if (advanced) render(false);
      if (idx >= frames.length - 1) {
        stop();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function startPlayback() {
      if (frames.length <= 1) return;
      if (idx >= frames.length - 1) return;
      playing = true;
      stableBounds = frameBounds(frames[idx]);
      accum = 0;
      lastTs = 0;
      var btn = $('.viz-play');
      if (btn) btn.textContent = '\u23F8 Pause';
      if (rafId) cancelAnimationFrame(rafId);
      render(false);
      rafId = requestAnimationFrame(tick);
    }

    function playToEnd() {
      startPlayback();
    }

    function play() {
      if (playing) { haltPlayback(); return; }
      idx = 0;
      render(true);
      startPlayback();
    }

    function parseKey() {
      var v = parseInt($('.viz-key').value, 10);
      if (isNaN(v) || v < 1 || v > 99) return null;
      return v;
    }

    function runOp(op) {
      haltPlayback();
      var key = parseKey();
      if (key === null) {
        frames = [kind === 'avl'
          ? avlFrame('Enter a valid key (1–99).', tree, {})
          : btFrame('Enter a valid key (1–99).', tree, {})];
        idx = 0;
        render(true);
        return;
      }
      frames = [];
      if (kind === 'avl') {
        tree = op === 'insert' ? avlInsert(tree, key, frames) : avlDelete(tree, key, frames);
        var lastDesc = frames.length ? frames[frames.length - 1].desc : '';
        if (lastDesc.indexOf('already') < 0 && lastDesc.indexOf('done') < 0 && lastDesc.indexOf('complete') < 0) {
          frames.push(avlFrame(
            (op === 'insert' ? 'Insert' : 'Delete') + ' <b>' + key + '</b> done.',
            tree,
            op === 'insert' ? { inserted: key, showBf: true } : { deleted: key, showBf: true },
            'Click <b>Play</b> to replay step-by-step.'));
        }
      } else {
        tree = op === 'insert' ? btInsert(tree, key, frames) : btDelete(tree, key, frames);
        var btLast = frames.length ? frames[frames.length - 1].desc : '';
        if (btLast.indexOf('already') < 0 && btLast.indexOf('complete') < 0) {
          frames.push(btFrame(
            (op === 'insert' ? 'Insert' : 'Delete') + ' <b>' + key + '</b> done.',
            tree, {}));
        }
      }
      idx = frames.length - 1;
      autoFit = true;
      zoom = 1;
      panX = 0;
      panY = 0;
      render(true);
    }

    function reset() {
      stop();
      if (kind === 'avl') {
        tree = null;
        initKeys.forEach(function (k) {
          var fr = [];
          tree = avlInsert(tree, k, fr);
        });
        frames = [avlFrame('Reset to [' + initKeys.join(', ') + ']. Insert or delete a key.', tree, {})];
      } else {
        tree = btFromKeys(initKeys);
        frames = [btFrame('Reset to keys [' + initKeys.join(', ') + ']. Insert or delete a key. (t = 2)', tree, {})];
      }
      idx = 0;
      autoFit = true;
      zoom = 1;
      panX = 0;
      panY = 0;
      render(true);
    }

    $('.viz-insert').onclick = function () { runOp('insert'); };
    $('.viz-delete').onclick = function () { runOp('delete'); };
    $('.viz-reset').onclick = reset;
    $('.viz-play').onclick = play;
    $('.viz-next').onclick = function () { step(1); };
    $('.viz-prev').onclick = function () { step(-1); };
    $('.viz-speed').oninput = function () { if (playing) { stop(); play(); } };
    $('.viz-key').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runOp(e.shiftKey ? 'delete' : 'insert');
    });

    stage.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      autoFit = false;
      zoom = Math.max(0.4, Math.min(4, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      render(true);
    }, { passive: false });

    ensureZoomControls();
    reset();
  }

  function init() {
    document.querySelectorAll('.avl-viz-wrap').forEach(function (w) {
      createInteractive(w, 'avl');
    });
    document.querySelectorAll('.btree-viz-wrap').forEach(function (w) {
      createInteractive(w, 'btree');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
