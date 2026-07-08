/* Sorting & median animators — one instance per .sort-viz-wrap */
(function () {
  var INIT = [5, 2, 8, 3, 9, 1, 6, 4, 7, 3];

  var K = function (s) { return '<span class="kw">' + s + '</span>'; };
  var C = function (s) { return '<span class="cm">' + s + '</span>'; };

  var CODE = {
    bubble: [
      K('for') + ' i = 0 … n-1:',
      '  ' + K('for') + ' j = 0 … n-2-i:',
      '    ' + K('if') + ' A[j] > A[j+1]:',
      '      swap(A[j], A[j+1])',
      '  lock A[n-1-i] ' + C('# sorted')
    ],
    selection: [
      K('for') + ' i = 0 … n-1:',
      '  min = i',
      '  ' + K('for') + ' j = i+1 … n-1:',
      '    ' + K('if') + ' A[j] < A[min]: min = j',
      '  swap(A[i], A[min])'
    ],
    insertion: [
      K('for') + ' j = 1 … n-1:',
      '  key = A[j]',
      '  i = j - 1',
      '  ' + K('while') + ' i>=0 ' + K('and') + ' A[i]>key:',
      '    A[i+1] = A[i]  ' + C('# shift'),
      '    i = i - 1',
      '  A[i+1] = key'
    ],
    merge: [
      K('MergeSort') + '(lo, hi):',
      '  ' + K('if') + ' lo >= hi: ' + K('return'),
      '  mid = (lo + hi) / 2',
      '  MergeSort(lo, mid)',
      '  MergeSort(mid+1, hi)',
      '  ' + K('merge') + ': compare fronts',
      '  write smaller into A[k]'
    ],
    quick: [
      K('QuickSort') + '(lo, hi):',
      '  ' + K('if') + ' lo >= hi: ' + K('return'),
      '  pivot = A[hi]',
      '  i = lo - 1',
      '  ' + K('for') + ' j = lo … hi-1:',
      '    ' + K('if') + ' A[j] <= pivot:',
      '      i++, swap(A[i], A[j])',
      '  swap(A[i+1], A[hi])  ' + C('# place')
    ],
    heap: [
      'BuildMaxHeap(A)          ' + C('# phase 1'),
      K('for') + ' e = n-1 downto 1:',
      '  swap(A[0], A[e]); size--',
      '  MaxHeapify(A, 0):',
      '    largest = max(node, kids)',
      '    ' + K('if') + ' largest != node: swap ↑'
    ],
    quickselect: [
      K('RandSelect') + '(A, lo, hi, i):',
      '  ' + K('if') + ' lo == hi: ' + K('return') + ' A[lo]',
      '  q = Partition(A, lo, hi)',
      '  k = q - lo + 1  ' + C('# pivot rank'),
      '  ' + K('if') + ' i == k: ' + K('return') + ' A[q]',
      '  ' + K('elif') + ' i &lt; k: RandSelect(lo, q-1, i)',
      '  ' + K('else') + ': RandSelect(q+1, hi, i-k)'
    ],
    mom: [
      '1. split into groups of 5',
      '2. median of each group',
      '3. x = median of all group medians',
      '4. partition around x',
      '5. recurse on side containing rank i'
    ]
  };

  var LABELS = {
    bubble: 'Bubble Sort', selection: 'Selection Sort', insertion: 'Insertion Sort',
    merge: 'Merge Sort', quick: 'Quick Sort', heap: 'Heap Sort',
    quickselect: 'Quickselect', mom: 'Median of Medians'
  };

  var INFO = {
    bubble: {
      text: 'Compares <b>adjacent pairs</b> and swaps them if they are out of order. Each outer pass pushes the largest remaining element to the right.',
      meta: 'Avg / worst: O(n²) · Best: O(n) if sorted · Space: O(1) · Stable'
    },
    selection: {
      text: 'Repeatedly finds the <b>smallest element</b> in the unsorted suffix and swaps it into the next position.',
      meta: 'Time: Θ(n²) always · Space: O(1) · Not stable · In-place'
    },
    insertion: {
      text: 'Builds a sorted prefix by taking the next element (<b>key</b>) and shifting larger elements right until the key fits.',
      meta: 'Best: O(n) · Avg / worst: O(n²) · Space: O(1) · Stable · In-place'
    },
    merge: {
      text: 'Uses <b>divide & conquer</b>: split in half, sort recursively, merge the two sorted halves.',
      meta: 'Time: Θ(n log n) always · Space: O(n) extra · Stable · Not in-place'
    },
    quick: {
      text: 'Picks a <b>pivot</b>, partitions so elements ≤ pivot go left, then recurses on both sides.',
      meta: 'Avg: O(n log n) · Worst: O(n²) · Space: O(log n) stack · Not stable'
    },
    heap: {
      text: 'Builds a <b>max-heap</b>, then repeatedly swaps the root to the end and restores the heap.',
      meta: 'Time: Θ(n log n) always · Space: O(1) · Not stable · In-place'
    },
    quickselect: {
      text: 'Like quicksort, but only recurses into the partition containing the <b>target rank</b> (e.g. median). Eliminated regions fade out.',
      meta: 'Expected: O(n) · Worst: O(n²) · Space: O(log n) · i-th order statistic'
    },
    mom: {
      text: '<b>Deterministic</b> selection: groups of 5, median of group medians as pivot, partition, recurse. Worst-case O(n).',
      meta: 'Time: Θ(n) worst-case · Space: O(n) · Guarantees linear select'
    }
  };

  function createAnimator(wrap) {
    var modes = JSON.parse(wrap.dataset.modes || '["bubble"]');
    var mode = wrap.getAttribute('data-default') || modes[0];
    var $ = function (sel) { return wrap.querySelector(sel); };

    var barsBox = $('.viz-bars');
    var codeBox = $('.viz-code');
    if (!barsBox || !codeBox) return;

    var data = INIT.slice();
    var frames = [], idx = 0, timer = null, playing = false, maxv = 9;
    var codeLineEls = [];
    var a, comps, swaps, sortedSet, out;

    function reset(arr) { a = arr.slice(); comps = 0; swaps = 0; sortedSet = {}; out = []; }
    function rec(colors, desc, line, range) {
      var c = {};
      for (var k in sortedSet) c[k] = 'done';
      if (range) {
        for (var r = 0; r < a.length; r++) {
          if (r < range[0] || r > range[1]) c[r] = 'dim';
        }
      }
      if (colors) for (var j in colors) c[j] = colors[j];
      out.push({ arr: a.slice(), colors: c, desc: desc, comps: comps, swaps: swaps, line: (line == null ? -1 : line) });
    }
    function markSorted(i) { sortedSet[i] = 1; }

    function lomutoPartition(lo, hi, lineCmp, lineSwap) {
      var pivot = a[hi];
      var cp = {}; cp[hi] = 'pivot';
      rec(cp, 'Partition [' + lo + '..' + hi + '], pivot = A[' + hi + '] = ' + pivot, lineCmp, [lo, hi]);
      var i = lo - 1;
      for (var j = lo; j < hi; j++) {
        comps++;
        var c = {}; c[hi] = 'pivot'; c[j] = 'cmp';
        rec(c, 'Compare A[' + j + ']=' + a[j] + ' with pivot ' + pivot, lineCmp, [lo, hi]);
        if (a[j] <= pivot) {
          i++;
          if (i !== j) { var t = a[i]; a[i] = a[j]; a[j] = t; swaps++; }
          var c2 = {}; c2[hi] = 'pivot'; c2[i] = 'active';
          rec(c2, a[i] + ' <= pivot → move left (i=' + i + ')', lineSwap, [lo, hi]);
        }
      }
      var t2 = a[i + 1]; a[i + 1] = a[hi]; a[hi] = t2; swaps++;
      var c3 = {}; c3[i + 1] = 'pivot';
      rec(c3, 'Place pivot at index ' + (i + 1) + '.', lineSwap, [lo, hi]);
      return i + 1;
    }

    function groupMedianIdx(lo, end, line) {
      var idxs = [];
      for (var j = lo; j <= end; j++) idxs.push(j);
      idxs.sort(function (x, y) { return a[x] - a[y]; });
      var med = idxs[Math.floor(idxs.length / 2)];
      var gc = {};
      for (var j = lo; j <= end; j++) gc[j] = (j === med) ? 'min' : 'cmp';
      rec(gc, 'Group [' + lo + '..' + end + ']: median is A[' + med + ']=' + a[med], line, [0, a.length - 1]);
      return med;
    }

    function genBubble(arr) {
      reset(arr); var n = a.length;
      rec({}, 'Start: bubble the largest element right on each pass.', 0);
      for (var i = 0; i < n; i++) {
        for (var j = 0; j < n - 1 - i; j++) {
          comps++; var c = {}; c[j] = 'cmp'; c[j + 1] = 'cmp';
          rec(c, 'Compare A[' + j + ']=' + a[j] + ' and A[' + (j + 1) + ']=' + a[j + 1], 2);
          if (a[j] > a[j + 1]) {
            var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; swaps++;
            var c2 = {}; c2[j] = 'active'; c2[j + 1] = 'active';
            rec(c2, 'Out of order → swap to ' + a[j] + ', ' + a[j + 1], 3);
          }
        }
        markSorted(n - 1 - i); rec({}, 'Index ' + (n - 1 - i) + ' is now locked (sorted).', 4);
      }
      rec({}, 'Done. Worst/avg Θ(n²), best Θ(n).', -1);
      return out;
    }

    function genSelection(arr) {
      reset(arr); var n = a.length;
      rec({}, 'Start: select the minimum of the unsorted suffix each pass.', 0);
      for (var i = 0; i < n; i++) {
        var min = i; var cm = {}; cm[i] = 'min';
        rec(cm, 'New pass: assume min = A[' + i + ']=' + a[i], 1);
        for (var j = i + 1; j < n; j++) {
          comps++; var c = {}; c[min] = 'min'; c[j] = 'cmp';
          rec(c, 'Compare A[' + j + ']=' + a[j] + ' with current min ' + a[min], 3);
          if (a[j] < a[min]) { min = j; var c2 = {}; c2[min] = 'min'; rec(c2, 'New minimum found: ' + a[j], 3); }
        }
        if (min !== i) { var t = a[i]; a[i] = a[min]; a[min] = t; swaps++; }
        markSorted(i); var cs = {}; cs[i] = 'active'; rec(cs, 'Swap minimum ' + a[i] + ' into index ' + i + '.', 4);
      }
      rec({}, 'Done. Always Θ(n²); only n−1 swaps.', -1);
      return out;
    }

    function genInsertion(arr) {
      reset(arr); var n = a.length;
      markSorted(0); rec({}, 'Start: index 0 is a trivially sorted prefix.', 0);
      for (var i = 1; i < n; i++) {
        var key = a[i]; var ck = {}; ck[i] = 'min';
        rec(ck, 'Take key = A[' + i + ']=' + key, 1);
        var j = i - 1;
        while (j >= 0 && a[j] > key) {
          comps++; var c = {}; c[j] = 'cmp'; c[j + 1] = 'active';
          rec(c, a[j] + ' > ' + key + ' → shift ' + a[j] + ' one step right', 4);
          a[j + 1] = a[j]; swaps++; j--;
        }
        a[j + 1] = key;
        for (var s = 0; s <= i; s++) markSorted(s);
        var cp = {}; cp[j + 1] = 'active';
        rec(cp, 'Place key ' + key + ' at index ' + (j + 1) + '.', 6);
      }
      rec({}, 'Done. Θ(n) if nearly sorted, Θ(n²) worst.', -1);
      return out;
    }

    function genMerge(arr) {
      reset(arr);
      rec({}, 'Start: divide in half, sort each, then merge.', 0);
      (function ms(lo, hi) {
        if (lo >= hi) return;
        var mid = Math.floor((lo + hi) / 2);
        ms(lo, mid); ms(mid + 1, hi);
        var L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1);
        var cr = {}; for (var x = lo; x <= hi; x++) cr[x] = 'cmp';
        rec(cr, 'Merge sorted [' + lo + '..' + mid + '] with [' + (mid + 1) + '..' + hi + '].', 5);
        var i = 0, j = 0, k = lo;
        while (i < L.length && j < R.length) {
          comps++;
          if (L[i] <= R[j]) { a[k] = L[i]; i++; } else { a[k] = R[j]; j++; }
          swaps++; var c = {}; c[k] = 'active'; rec(c, 'Take smaller front → write ' + a[k] + ' at index ' + k, 6); k++;
        }
        while (i < L.length) { a[k] = L[i]; i++; swaps++; var c2 = {}; c2[k] = 'active'; rec(c2, 'Copy leftover ' + a[k] + ' at index ' + k, 6); k++; }
        while (j < R.length) { a[k] = R[j]; j++; swaps++; var c3 = {}; c3[k] = 'active'; rec(c3, 'Copy leftover ' + a[k] + ' at index ' + k, 6); k++; }
      })(0, a.length - 1);
      for (var s = 0; s < a.length; s++) markSorted(s);
      rec({}, 'Done. Always Θ(n log n), stable, O(n) extra space.', -1);
      return out;
    }

    function genQuick(arr) {
      reset(arr);
      rec({}, 'Start: Lomuto partition, pivot = last element of each range.', 0);
      (function qs(lo, hi) {
        if (lo > hi) return;
        if (lo === hi) { markSorted(lo); rec({}, 'Single element A[' + lo + '] is sorted.', 1); return; }
        var q = lomutoPartition(lo, hi, 2, 6);
        markSorted(q);
        var c3 = {}; c3[q] = 'done';
        rec(c3, 'Pivot ' + a[q] + ' is in final position.', 7);
        qs(lo, q - 1); qs(q + 1, hi);
      })(0, a.length - 1);
      rec({}, 'Done. Average Θ(n log n), worst Θ(n²).', -1);
      return out;
    }

    function genHeap(arr) {
      reset(arr); var n = a.length, size = n;
      rec({}, 'Phase 1: build a max-heap.', 0);
      function heapify(i, sz) {
        var largest = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < sz) { comps++; var cl = {}; cl[i] = 'cmp'; cl[l] = 'cmp'; rec(cl, 'Node ' + a[i] + ' vs left child ' + a[l], 4); if (a[l] > a[largest]) largest = l; }
        if (r < sz) { comps++; var cr = {}; cr[largest] = 'cmp'; cr[r] = 'cmp'; rec(cr, 'Larger ' + a[largest] + ' vs right child ' + a[r], 4); if (a[r] > a[largest]) largest = r; }
        if (largest !== i) {
          var t = a[i]; a[i] = a[largest]; a[largest] = t; swaps++;
          var c = {}; c[i] = 'active'; c[largest] = 'active'; rec(c, 'Swap ' + a[largest] + ' up to keep heap order.', 5);
          heapify(largest, sz);
        }
      }
      for (var i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(i, size);
      rec({}, 'Max-heap built. Phase 2: move root (max) to the end repeatedly.', 1);
      for (var e = n - 1; e > 0; e--) {
        var t = a[0]; a[0] = a[e]; a[e] = t; swaps++;
        markSorted(e);
        var c = {}; c[0] = 'active'; c[e] = 'done'; rec(c, 'Move max ' + a[e] + ' to index ' + e + ', shrink heap.', 2);
        size--; heapify(0, size);
      }
      markSorted(0);
      rec({}, 'Done. Guaranteed Θ(n log n), in-place.', -1);
      return out;
    }

    function genQuickselect(arr) {
      reset(arr);
      var n = a.length;
      var target = Math.floor((n + 1) / 2);
      rec({}, 'Goal: find the ' + target + '-th smallest (median). Only one side is recursed.', 0, [0, n - 1]);

      function select(lo, hi, rank) {
        if (lo === hi) {
          markSorted(lo);
          rec({}, 'Single element: answer is A[' + lo + '] = ' + a[lo], 1, [lo, hi]);
          return;
        }
        var q = lomutoPartition(lo, hi, 2, 2);
        var k = q - lo + 1;
        rec({}, 'Pivot rank k=' + k + ' in subarray. Looking for rank i=' + rank + '.', 3, [lo, hi]);
        if (rank === k) {
          markSorted(q);
          var fd = {}; fd[q] = 'done';
          rec(fd, 'Found! The ' + rank + '-th smallest is A[' + q + '] = ' + a[q], 4, [lo, hi]);
          return;
        }
        if (rank < k) {
          rec({}, 'rank < k → recurse LEFT on [' + lo + '..' + (q - 1) + ']', 5, [lo, q - 1]);
          select(lo, q - 1, rank);
        } else {
          rec({}, 'rank > k → recurse RIGHT, new rank=' + (rank - k), 6, [q + 1, hi]);
          select(q + 1, hi, rank - k);
        }
      }
      select(0, n - 1, target);
      rec({}, 'Done. Expected Θ(n), worst Θ(n²).', -1);
      return out;
    }

    function genMom(arr) {
      reset(arr);
      var n = a.length;
      var target = Math.floor((n + 1) / 2);
      rec({}, 'Deterministic select: median-of-medians pivot.', 0, [0, n - 1]);

      function momPivot(lo, hi) {
        var len = hi - lo + 1;
        if (len <= 5) {
          var idxs = [];
          for (var j = lo; j <= hi; j++) idxs.push(j);
          idxs.sort(function (x, y) { return a[x] - a[y]; });
          return idxs[Math.floor(idxs.length / 2)];
        }
        rec({}, 'Split [' + lo + '..' + hi + '] into groups of 5.', 0, [lo, hi]);
        var medIdxs = [];
        var g = lo;
        while (g <= hi) {
          var end = Math.min(g + 4, hi);
          medIdxs.push(groupMedianIdx(g, end, 1));
          g += 5;
        }
        rec({}, 'Found ' + medIdxs.length + ' group medians. Pick their median.', 2, [lo, hi]);
        medIdxs.sort(function (x, y) { return a[x] - a[y]; });
        var mom = medIdxs[Math.floor(medIdxs.length / 2)];
        var mp = {}; mp[mom] = 'pivot';
        rec(mp, 'Median-of-medians pivot: A[' + mom + ']=' + a[mom], 2, [lo, hi]);
        return mom;
      }

      function select(lo, hi, rank) {
        if (lo === hi) {
          markSorted(lo);
          rec({}, 'Answer: A[' + lo + '] = ' + a[lo], 4, [lo, hi]);
          return;
        }
        var momIdx = momPivot(lo, hi);
        if (momIdx !== hi) {
          var t = a[momIdx]; a[momIdx] = a[hi]; a[hi] = t; swaps++;
          rec({ [momIdx]: 'active', [hi]: 'active' }, 'Move MoM pivot to end for partition.', 3, [lo, hi]);
        }
        var q = lomutoPartition(lo, hi, 3, 3);
        var k = q - lo + 1;
        rec({}, 'After partition: pivot rank k=' + k + ', need rank i=' + rank + '.', 4, [lo, hi]);
        if (rank === k) {
          markSorted(q);
          rec({ [q]: 'done' }, 'Found median: A[' + q + '] = ' + a[q], 4, [lo, hi]);
          return;
        }
        if (rank < k) {
          rec({}, 'Recurse LEFT [' + lo + '..' + (q - 1) + ']', 4, [lo, q - 1]);
          select(lo, q - 1, rank);
        } else {
          rec({}, 'Recurse RIGHT, rank=' + (rank - k), 4, [q + 1, hi]);
          select(q + 1, hi, rank - k);
        }
      }
      select(0, n - 1, target);
      rec({}, 'Done. Worst-case Θ(n) guaranteed.', -1);
      return out;
    }

    var GENS = {
      bubble: genBubble, selection: genSelection, insertion: genInsertion,
      merge: genMerge, quick: genQuick, heap: genHeap,
      quickselect: genQuickselect, mom: genMom
    };

    function updateAlgoInfo() {
      var box = $('.viz-algo-info');
      if (!box) return;
      var algoSel = $('.viz-algo');
      var info = INFO[algoSel ? algoSel.value : mode];
      if (!info) { box.innerHTML = ''; return; }
      box.innerHTML = info.text + '<span class="meta">' + info.meta + '</span>';
    }

    function renderCode() {
      var algoSel = $('.viz-algo');
      var m = algoSel ? algoSel.value : mode;
      codeLineEls = renderVizCodeLines(codeBox, CODE[m]);
    }

    function render() {
      var f = frames[idx];
      barsBox.innerHTML = '';
      for (var i = 0; i < f.arr.length; i++) {
        var b = document.createElement('div');
        b.className = 'viz-bar' + (f.colors[i] ? (' ' + f.colors[i]) : '');
        b.style.height = (f.arr[i] / maxv * 190 + 20) + 'px';
        b.textContent = f.arr[i];
        barsBox.appendChild(b);
      }
      for (var k = 0; k < codeLineEls.length; k++) codeLineEls[k].classList.toggle('active', k === f.line);
      var descEl = $('.viz-desc');
      var stepEl = $('.viz-step');
      var totalEl = $('.viz-total');
      var compsEl = $('.viz-comps');
      var swapsEl = $('.viz-swaps');
      if (descEl) descEl.textContent = f.desc;
      if (stepEl) stepEl.textContent = idx;
      if (totalEl) totalEl.textContent = frames.length - 1;
      if (compsEl) compsEl.textContent = f.comps;
      if (swapsEl) swapsEl.textContent = f.swaps;
    }

    function build() {
      stop();
      var algoSel = $('.viz-algo');
      if (algoSel && modes.length > 1 && algoSel.value) mode = algoSel.value;
      if (!mode || !GENS[mode]) mode = modes[0];
      maxv = Math.max.apply(null, data);
      updateAlgoInfo();
      renderCode();
      frames = GENS[mode](data);
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
      var btn = $('.viz-play');
      if (btn) btn.textContent = '\u23F8 Pause';
      var speedEl = $('.viz-speed');
      var speed = 1660 - parseInt(speedEl ? speedEl.value : 1250, 10);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); return; }
        idx++; render();
      }, speed);
    }

    var algoSel = $('.viz-algo');
    var algoLabel = $('.viz-algo-label');
    if (modes.length > 1 && algoSel) {
      algoSel.innerHTML = modes.map(function (m) {
        return '<option value="' + m + '">' + (LABELS[m] || m) + '</option>';
      }).join('');
      algoSel.value = mode;
      if (algoLabel) algoLabel.style.display = '';
      algoSel.onchange = build;
    } else if (algoLabel) {
      algoLabel.style.display = 'none';
    }

    var playBtn = $('.viz-play');
    var nextBtn = $('.viz-next');
    var prevBtn = $('.viz-prev');
    var shuffleBtn = $('.viz-shuffle');
    var speedEl = $('.viz-speed');
    if (playBtn) playBtn.onclick = play;
    if (nextBtn) nextBtn.onclick = function () { step(1); };
    if (prevBtn) prevBtn.onclick = function () { step(-1); };
    if (shuffleBtn) shuffleBtn.onclick = function () {
      var pool = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
      for (var i = pool.length - 1; i > 0; i--) {
        var k = Math.floor(Math.random() * (i + 1));
        var t = pool[i]; pool[i] = pool[k]; pool[k] = t;
      }
      data = pool.slice(0, 10);
      build();
    };
    if (speedEl) speedEl.oninput = function () { if (playing) { stop(); play(); } };

    build();
  }

  function init() {
    document.querySelectorAll('.sort-viz-wrap').forEach(createAnimator);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
