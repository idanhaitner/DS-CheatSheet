/* Deamortization of rehashing — animator matching lecture slides (Amortized analysis II). */
(function () {
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

    /* Pseudocode = lecture “Insertion” slide wording */
    var CODE = [
      K('Insert') + '(x):',
      '  insert x into T',
      '  ' + K('if') + ' x inserted after current scan location:',
      '    perform 4 steps of rehashing  ' + C('// each step = 1 cell-scan OR 1 Insert(T\',p)'),
      '  ' + K('else') + ':',
      '    insert x into T\'',
      '    perform 3 steps of rehashing',
      '  ' + K('when') + ' T has m elements:',
      '    T ← T\'   ' + C('// switch: old T\' becomes the live table'),
      '    create empty T\' of size 4m  ' + C('(smart array)')
    ];

    /*
     * Demo follows the lecture figure: m = 4, |T| = m/2 = 2 at phase start.
     * Keys 1,8 already in T; then Insert(4), Insert(3) — same as slides.
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
        p: state.p.slice(),          /* remaining chain at current scan location */
        stepsDone: state.stepsDone,
        stepsTotal: state.stepsTotal,
        nT: countEls(state.T),
        hideHugeTp: !!state.hideHugeTp,
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
      table[b].push(x);
      return b;
    }

    /**
     * One step of the lecture rehashing algorithm:
     *   scanning one cell of T,  OR  Insert(T', p) for one list element.
     */
    function oneRehashStep(state) {
      if (state.scanI >= state.m && state.p.length === 0) {
        return { kind: 'done', detail: 'All 2m rehashing steps are already done.' };
      }

      /* Still walking a linked list → Insert(T', p); p ← p.next */
      if (state.p.length > 0) {
        var x = state.p.shift();
        var b = insertKey(state.Tp, x);
        state.stepsDone++;
        return {
          kind: 'insert',
          key: x,
          bucket: b,
          detail: 'Insert(T′, ' + x + ')  — one of the m list-element steps.'
        };
      }

      /* Next for-loop iteration: p ← T[i]  (scan one cell) */
      var i = state.scanI;
      state.p = state.T[i].slice();
      state.scanI++;
      state.stepsDone++;
      return {
        kind: 'scan',
        bucket: i,
        detail: 'Scan cell T[' + i + ']' +
          (state.p.length
            ? ', set p ← list [' + state.p.join(' → ') + '].'
            : ' (empty list).') +
          ' — one of the m cell-scan steps.'
      };
    }

    function doKSteps(state, k, lineSteps) {
      for (var s = 0; s < k; s++) {
        if (state.scanI >= state.m && state.p.length === 0) {
          pushFrame(state, {
            line: lineSteps,
            desc: 'No more rehashing steps left (already finished).',
            panel: statusPanel(state, 'rehashing done early')
          });
          break;
        }
        var r = oneRehashStep(state);
        pushFrame(state, {
          hotT: r.kind === 'scan' ? r.bucket : -1,
          hotTp: r.kind === 'insert' ? r.bucket : -1,
          hotKey: r.key != null ? r.key : null,
          scanFlash: r.kind === 'scan',
          copyFlash: r.kind === 'insert',
          line: lineSteps,
          desc: '<b>Rehashing step ' + (s + 1) + ' of ' + k + ':</b> ' + r.detail,
          panel: statusPanel(state, 'this Insert: step ' + (s + 1) + '/' + k)
        });
      }
    }

    function statusPanel(state, extra) {
      var bits = [
        '|T| = ' + countEls(state.T) + ' · m = ' + state.m,
        'scan location = ' + (state.scanI < state.m ? state.scanI : 'done'),
        'rehashing ' + state.stepsDone + '/' + state.stepsTotal
      ];
      if (extra) bits.push(extra);
      return bits.join(' · ');
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
        stepsTotal: 2 * m,
        hideHugeTp: false
      };

      INITIAL.forEach(function (x) { insertKey(state.T, x); });

      pushFrame(state, {
        line: -1,
        desc:
          '<b>Start of phase (lecture):</b> always keep two tables — ' +
          'T of size <b>m = ' + m + '</b>, T′ of size <b>2m = ' + (2 * m) + '</b>. ' +
          'T now has exactly <b>m/2 = ' + (m / 2) + '</b> elements, so T′ is empty. ' +
          'Over the next <b>m/2</b> Inserts we gradually run the rehashing algorithm ' +
          '(total <b>2m = ' + (2 * m) + '</b> steps: m cell scans + m Insert(T′,·)).',
        panel: statusPanel(state, 'next: m/2 Inserts')
      });

      INSERTS.forEach(function (x) {
        pushFrame(state, {
          line: 0,
          hotKey: x,
          desc: '<b>Insert(' + x + ')</b> — begin this operation.',
          panel: statusPanel(state, 'new element x = ' + x)
        });

        var bT = insertKey(state.T, x);
        pushFrame(state, {
          line: 1,
          hotT: bT,
          hotKey: x,
          desc:
            'Insert <b>' + x + '</b> into T (chaining). ' +
            'It lands in cell <b>T[' + bT + ']</b> because h(x) = x mod m. ' +
            'Now |T| = <b>' + countEls(state.T) + '</b>.',
          panel: statusPanel(state, 'inserted into T')
        });

        /* “after the current scan location” = cell index ≥ scan location */
        var after = bT >= state.scanI;
        if (after) {
          pushFrame(state, {
            line: 2,
            hotT: bT,
            hotKey: x,
            desc:
              'Cell ' + bT + ' is <b>after</b> the current scan location (' + state.scanI + '). ' +
              'Rehashing will copy ' + x + ' later when that cell is scanned. ' +
              'Now run <b>exactly 4 tiny pieces</b> of the rehashing algorithm. ' +
              'Each piece is either: <b>scan one cell</b> of T, or <b>Insert(T′, p)</b> for one list element.',
            panel: statusPanel(state, 'branch: after scan → 4 rehashing steps')
          });
          doKSteps(state, 4, 3);
        } else {
          pushFrame(state, {
            line: 4,
            hotT: bT,
            hotKey: x,
            desc:
              'Cell ' + bT + ' is <b>before</b> the current scan location (' + state.scanI + '). ' +
              'That cell was already scanned, so rehashing would miss ' + x + '. ' +
              '→ also insert into T′, then run <b>3</b> rehashing steps ' +
              '(again: each step = one cell-scan <em>or</em> one Insert(T′, p)).',
            panel: statusPanel(state, 'branch: before scan → T′ + 3 steps')
          });
          var bTp = insertKey(state.Tp, x);
          pushFrame(state, {
            line: 5,
            hotTp: bTp,
            hotKey: x,
            desc:
              'Insert <b>' + x + '</b> into T′ as well (h′(x) = x mod 2m → cell <b>' + bTp + '</b>).',
            panel: statusPanel(state, 'inserted into T′')
          });
          doKSteps(state, 3, 6);
        }

        if (countEls(state.T) === state.m) {
          pushFrame(state, {
            line: 7,
            desc:
              'T now has <b>m = ' + state.m + '</b> elements. ' +
              'Rehashing steps done: ' + state.stepsDone + '/' + state.stepsTotal + '. ' +
              '→ set <b>T ← T′</b>, and create a new empty T′ of size <b>4m</b> (smart array).',
            panel: statusPanel(state, 'phase complete → swap')
          });

          var oldM = state.m;
          var filledTp = cloneTable(state.Tp);
          var newM = state.Tp.length; /* was 2m → becomes new m */

          /* Frame: show switch happening — T' is about to become T */
          pushFrame(state, {
            line: 8,
            hotTp: -1,
            swapped: false,
            desc:
              '<b>Switching tables:</b> discard old T (size ' + oldM + '). ' +
              'The filled T′ (size ' + newM + ', with all keys already rehashed) becomes the new live T. ' +
              'Then grow a brand-new empty T′ of size <b>4m = ' + (2 * newM) + '</b>.',
            panel: 'about to: T ← T′'
          });

          state.T = filledTp;
          state.m = newM;
          state.Tp = emptyTable(2 * newM); /* show empty new T′ growing to 4m */
          state.hideHugeTp = false;
          state.scanI = 0;
          state.p = [];
          state.stepsDone = 0;
          state.stepsTotal = 2 * newM;

          pushFrame(state, {
            line: 8,
            swapped: true,
            desc:
              '<b>After switch:</b> new T has size <b>m = ' + newM + '</b> (old T′). ' +
              'New empty T′ has size <b>4m = ' + (2 * newM) + '</b> — you can see every cell. ' +
              'Next rehashing phase starts later when |T| hits m/2 again. ' +
              'Every Insert in this phase stayed O(1) worst-case.',
            panel: 'T size ' + newM + ' · new T′ size ' + (2 * newM) + ' (empty)'
          });

          pushFrame(state, {
            line: 9,
            swapped: true,
            desc:
              '<b>Done.</b> The Θ(n) rehashing work (2m steps) was spread over m/2 Inserts ' +
              '(≤ 4 steps each) → Insert is <b>Θ(1) worst-case</b>, not only amortized.',
            panel: 'deamortization of rehashing'
          });
        }
      });
    }

    function renderCode() {
      if (typeof window.renderVizCodeLines === 'function') {
        codeLineEls = window.renderVizCodeLines(codeBox, CODE);
      } else {
        codeBox.innerHTML = CODE.join('\n');
        codeLineEls = [];
      }
    }

    function renderBuckets(table, f, opts) {
      var isT = opts.isT;
      var html = '<div class="deam-buckets" role="list">';
      for (var i = 0; i < table.length; i++) {
        var hot = (isT && f.hotT === i) || (!isT && f.hotTp === i);
        var scanned = isT && i < f.scanI;
        var atScan = isT && i === f.scanI && f.scanI < table.length;
        var bcls = 'deam-bucket';
        if (hot) bcls += ' is-hot';
        if (scanned) bcls += ' is-scanned';
        if (f.scanFlash && f.hotT === i) bcls += ' is-scanning';
        html += '<div class="' + bcls + '" role="listitem">';
        html += '<div class="deam-bucket-idx">' + i + '</div>';
        html += '<div class="deam-chain">';
        if (!table[i].length) {
          html += '<span class="deam-empty">·</span>';
        } else {
          for (var j = 0; j < table[i].length; j++) {
            var k = table[i][j];
            var cls = 'deam-chip' + (f.hotKey === k ? ' is-hot' : '');
            html += '<span class="' + cls + '">' + k + '</span>';
            if (j < table[i].length - 1) html += '<span class="deam-link">↓</span>';
          }
        }
        html += '</div>';
        if (isT) {
          html += '<div class="deam-scan-mark">';
          if (atScan) html += '<span class="deam-scan-cursor">▲ location</span>';
          else if (scanned) html += '<span class="deam-scan-done">scanned</span>';
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
      return html;
    }

    function renderTable(name, table, f, opts) {
      var wide = table.length > 8 ? ' is-wide' : '';
      var html = '<div class="deam-table' + wide + (f.swapped && opts.isT ? ' is-swap' : '') + '">';
      html += '<div class="deam-table-head">';
      html += '<span class="deam-table-name">' + name + '</span>';
      html += '<span class="deam-table-meta">';
      html += 'size ' + table.length;
      if (opts.isT) html += ' · |T| = ' + f.nT + (f.m ? ' / m = ' + f.m : '');
      else html += ' · elements = ' + countEls(table);
      html += '</span></div>';
      html += renderBuckets(table, f, opts);
      html += '</div>';
      return html;
    }

    function render() {
      if (!frames.length) return;
      var f = frames[idx];
      var prog = Math.min(100, Math.round(100 * f.stepsDone / Math.max(1, f.stepsTotal)));
      var html = '';

      html += '<div class="deam-progress">';
      html += '<div class="deam-progress-label">';
      html += 'Rehashing progress · ' + f.stepsDone + ' / ' + f.stepsTotal +
        ' steps (each = scan 1 cell <b>or</b> Insert(T′, one element))';
      if (f.p && f.p.length) html += ' · p = [' + f.p.join(' → ') + ']';
      html += '</div>';
      html += '<div class="deam-progress-bar"><i style="width:' + prog + '%"></i></div>';
      html += '</div>';

      html += '<div class="deam-tables">';
      html += renderTable('T (live)', f.T, f, { isT: true });
      html += renderTable('T′ (building / next)', f.Tp, f, { isT: false });
      html += '</div>';

      stage.innerHTML = html;

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
