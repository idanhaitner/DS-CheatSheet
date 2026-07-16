/* DS Exam Quiz: past-exam MCQ / Always–Sometimes–Never / T–F + warm-ups */
(function () {
  var QUIZ_SIZE = 6;
  var CATS = {
    complexity: { label: 'Complexity', icon: '⏱', cls: 'cat-complexity' },
    algorithm:  { label: 'Algorithm', icon: '⚙', cls: 'cat-algorithm' },
    structure:  { label: 'Data Structure', icon: '◫', cls: 'cat-structure' },
    concept:    { label: 'Concept', icon: '💡', cls: 'cat-concept' }
  };
  var TYPE_LABEL = {
    mcq: 'Multiple choice',
    asn: 'Always / Sometimes / Never',
    tf: 'True / False'
  };

  /* Warm-up / review pool (not from a specific moed) */
  var WARMUP = [
    { q: 'Worst-case search in an unsorted array?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 2, cat: 'complexity', type: 'mcq' },
    { q: 'Search in a sorted array (binary search)?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], a: 1, cat: 'complexity', type: 'mcq' },
    { q: 'buildHeap (Floyd) complexity?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 2, cat: 'complexity', type: 'mcq', explain: 'Bottom-up heapify: O(n) total, not O(n log n).', viz: 'heap' },
    { q: 'Dijkstra with binary heap?', c: ['O(V²)', 'O(E log V)', 'O((V+E) log V)', 'O(V·E)'], a: 2, cat: 'complexity', type: 'mcq', viz: 'dijkstra' },
    { q: 'Union-Find with path compression + rank?', c: ['O(m log n)', 'O(m α(n))', 'O(m·n)', 'O(m+n)'], a: 1, cat: 'complexity', type: 'mcq', viz: 'uf' },
    { q: 'Master Theorem: T(n)=2T(n/2)+n ?', c: ['Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(log n)'], a: 1, cat: 'complexity', type: 'mcq' },
    { q: 'BFS uses which data structure?', c: ['Stack', 'Queue', 'Priority queue', 'Hash table'], a: 1, cat: 'algorithm', type: 'mcq', viz: 'bfs' },
    { q: 'Kruskal builds an MST by…', c: ['Growing one tree from a root', 'Adding lightest edges that avoid cycles', 'Running BFS on sorted edges', 'Relaxing all edges V−1 times'], a: 1, cat: 'algorithm', type: 'mcq', viz: 'mst' },
    { q: 'Topological sort is valid only on…', c: ['Undirected graphs', 'DAGs', 'Complete graphs', 'Trees with one root'], a: 1, cat: 'algorithm', type: 'mcq', viz: 'topo' },
    { q: 'Bellman-Ford can detect…', c: ['Only positive cycles', 'Negative-weight cycles', 'Disconnected components', 'Hamiltonian paths'], a: 1, cat: 'algorithm', type: 'mcq', viz: 'dijkstra' },
    { q: 'AVL trees stay balanced by…', c: ['Random promotions', 'Rotations when |BF| > 1', 'Splitting B-tree nodes', 'Rehashing'], a: 1, cat: 'structure', type: 'mcq', viz: 'bst' },
    { q: 'Skip lists achieve O(log n) expected time by…', c: ['Perfect balancing', 'Randomized tower heights', 'Hashing every level', 'Always storing a sentinel'], a: 1, cat: 'structure', type: 'mcq', viz: 'skiplist' },
    { q: 'Open addressing on delete often needs…', c: ['Rebuilding the whole table', 'Tombstone markers', 'Doubly linked chains', 'A BST per slot'], a: 1, cat: 'structure', type: 'mcq', viz: 'hash' },
    { q: 'Why does Dijkstra fail with negative edges?', c: ['Uses too much memory', 'Finalized vertices are never updated', 'Requires a DAG', 'Only works on trees'], a: 1, cat: 'concept', type: 'mcq', viz: 'dijkstra' },
    { q: 'Comparison sort lower bound (worst case)?', c: ['Ω(n)', 'Ω(n log n)', 'Ω(n²)', 'Ω(n!)'], a: 1, cat: 'concept', type: 'mcq' },
    { q: 'Cut property (MST): a safe edge is…', c: ['Max weight in a cycle', 'Min weight crossing a cut', 'Any edge in a BFS tree', 'Heaviest in the graph'], a: 1, cat: 'concept', type: 'mcq', viz: 'mst' },
    { q: 'Load factor α < 1 is required for…', c: ['Chaining only', 'Open addressing', 'Skip lists', 'AVL trees'], a: 1, cat: 'concept', type: 'mcq', viz: 'hash' },
    { q: 'Is merge sort stable?', c: ['True', 'False'], a: 0, cat: 'concept', type: 'tf', explain: 'Merge takes the left equal key first.', viz: 'sort' },
    { q: 'Is standard in-place quicksort stable?', c: ['True', 'False'], a: 1, cat: 'concept', type: 'tf', explain: 'Partition swaps can reorder equal keys.', viz: 'sort' },
    { q: 'A sorting algorithm is stable if equal keys keep relative order.', c: ['Always true', 'Sometimes true', 'Never true'], a: 0, cat: 'concept', type: 'asn', viz: 'sort' },
    { q: 'Dijkstra always finds shortest paths on graphs with negative edges (no negative cycles).', c: ['Always true', 'Sometimes true', 'Never true'], a: 2, cat: 'concept', type: 'asn', viz: 'dijkstra', explain: 'Negative edges break the finalize-once greedy argument.' },
    { q: 'In a max-heap, the maximum key is at the root.', c: ['Always true', 'Sometimes true', 'Never true'], a: 0, cat: 'structure', type: 'asn', viz: 'heap' }
  ];

  var POOL = [];
  var overlay, panel, qText, qMeta, catEl, vizEl, optionsEl, feedbackEl, nextBtn, scoreEl, progressFill, sourceEl;
  var round = [], idx = 0, score = 0, answered = false;

  function $(sel, root) { return (root || document).querySelector(sel); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function normalizeExamItem(raw) {
    return {
      q: raw.q,
      c: raw.c,
      a: raw.a,
      cat: raw.cat,
      type: raw.type || 'mcq',
      explain: raw.explain || '',
      viz: raw.viz,
      id: raw.id || '',
      exam: true
    };
  }

  function buildPool() {
    var exam = (typeof window.QUIZ_EXAM_POOL !== 'undefined' ? window.QUIZ_EXAM_POOL : [])
      .map(normalizeExamItem);
    POOL = exam.concat(WARMUP.map(function (w) {
      return Object.assign({ exam: false }, w);
    }));
    var nExam = exam.length;
    var nAsn = exam.filter(function (q) { return q.type === 'asn'; }).length;
    var el = document.getElementById('quiz-stat-count');
    if (el) el.textContent = String(POOL.length);
    var elExam = document.getElementById('quiz-stat-exam');
    if (elExam) elExam.textContent = String(nExam);
    var elAsn = document.getElementById('quiz-stat-asn');
    if (elAsn) elAsn.textContent = String(nAsn);
  }

  function pickRound() {
    var exam = POOL.filter(function (q) { return q.exam; });
    var warm = POOL.filter(function (q) { return !q.exam; });
    var asn = shuffle(exam.filter(function (q) { return q.type === 'asn'; }));
    var mcq = shuffle(exam.filter(function (q) { return q.type === 'mcq'; }));
    var tf = shuffle(exam.filter(function (q) { return q.type === 'tf'; }));
    var picked = [];
    if (asn.length) picked.push(asn[0]);
    if (mcq.length) picked.push(mcq[0]);
    if (tf.length) picked.push(tf[0]);
    if (warm.length) picked.push(shuffle(warm)[0]);
    var rest = shuffle(POOL.filter(function (q) { return picked.indexOf(q) < 0; }));
    picked = picked.concat(rest).slice(0, QUIZ_SIZE);
    return shuffle(picked);
  }

  var VIZ = {
    bfs: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><circle cx="30" cy="40" r="14" class="qv-n qv-on"/><circle cx="85" cy="20" r="12" class="qv-n qv-on"/><circle cx="85" cy="60" r="12" class="qv-n qv-on"/><circle cx="140" cy="40" r="12" class="qv-n"/><circle cx="175" cy="40" r="10" class="qv-n"/><line x1="44" y1="40" x2="73" y2="24" class="qv-e qv-on"/><line x1="44" y1="40" x2="73" y2="56" class="qv-e qv-on"/><line x1="97" y1="24" x2="128" y2="36" class="qv-e"/><line x1="97" y1="56" x2="128" y2="44" class="qv-e"/><text x="30" y="44" class="qv-t">s</text></svg>',
    dfs: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><circle cx="30" cy="40" r="14" class="qv-n qv-on"/><circle cx="75" cy="20" r="12" class="qv-n qv-on"/><circle cx="120" cy="15" r="12" class="qv-n qv-on"/><circle cx="165" cy="25" r="11" class="qv-n qv-cur"/><circle cx="75" cy="60" r="12" class="qv-n"/><line x1="44" y1="36" x2="63" y2="24" class="qv-e qv-on"/><line x1="87" y1="18" x2="109" y2="16" class="qv-e qv-on"/><line x1="132" y1="17" x2="154" y2="22" class="qv-e qv-cur"/><line x1="44" y1="44" x2="63" y2="56" class="qv-e"/></svg>',
    dijkstra: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><circle cx="35" cy="40" r="14" class="qv-n qv-on"/><circle cx="100" cy="25" r="12" class="qv-n qv-cur"/><circle cx="100" cy="58" r="12" class="qv-n"/><circle cx="165" cy="40" r="12" class="qv-n"/><line x1="49" y1="36" x2="88" y2="28" class="qv-e qv-on"/><text x="68" y="24" class="qv-w">2</text><line x1="49" y1="44" x2="88" y2="54" class="qv-e"/><text x="68" y="56" class="qv-w">5</text><line x1="112" y1="30" x2="153" y2="38" class="qv-e qv-cur"/><text x="130" y="28" class="qv-w">3</text></svg>',
    mst: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><circle cx="40" cy="40" r="13" class="qv-n qv-on"/><circle cx="100" cy="20" r="12" class="qv-n qv-on"/><circle cx="100" cy="60" r="12" class="qv-n qv-on"/><circle cx="160" cy="40" r="12" class="qv-n qv-on"/><line x1="53" y1="34" x2="88" y2="24" class="qv-e qv-mst"/><line x1="53" y1="46" x2="88" y2="56" class="qv-e qv-mst"/><line x1="112" y1="24" x2="148" y2="36" class="qv-e qv-mst"/><line x1="100" y1="32" x2="100" y2="48" class="qv-e" style="opacity:.25"/></svg>',
    topo: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><circle cx="35" cy="20" r="12" class="qv-n qv-on"/><circle cx="35" cy="60" r="12" class="qv-n qv-on"/><circle cx="100" cy="40" r="12" class="qv-n qv-cur"/><circle cx="165" cy="40" r="12" class="qv-n"/><line x1="47" y1="24" x2="88" y2="36" class="qv-e qv-on"/><line x1="47" y1="56" x2="88" y2="44" class="qv-e qv-on"/><line x1="112" y1="40" x2="153" y2="40" class="qv-e qv-cur"/><polygon points="100,32 108,40 100,48 92,40" class="qv-arr"/></svg>',
    sort: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><rect x="20" y="50" width="18" height="25" class="qv-bar"/><rect x="44" y="35" width="18" height="40" class="qv-bar qv-swap"/><rect x="68" y="20" width="18" height="55" class="qv-bar qv-swap"/><rect x="92" y="42" width="18" height="33" class="qv-bar"/><rect x="116" y="28" width="18" height="47" class="qv-bar"/><rect x="140" y="38" width="18" height="37" class="qv-bar"/><rect x="164" y="15" width="18" height="60" class="qv-bar"/></svg>',
    heap: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><circle cx="100" cy="14" r="12" class="qv-n qv-on"/><circle cx="60" cy="38" r="11" class="qv-n qv-on"/><circle cx="140" cy="38" r="11" class="qv-n"/><circle cx="35" cy="62" r="10" class="qv-n"/><circle cx="75" cy="62" r="10" class="qv-n"/><circle cx="115" cy="62" r="10" class="qv-n"/><circle cx="155" cy="62" r="10" class="qv-n"/><line x1="92" y1="24" x2="66" y2="30" class="qv-e qv-mst"/><line x1="108" y1="24" x2="134" y2="30" class="qv-e"/><line x1="54" y1="47" x2="41" y2="54" class="qv-e"/><line x1="66" y1="47" x2="75" y2="54" class="qv-e"/></svg>',
    hash: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><rect x="15" y="15" width="40" height="50" rx="4" class="qv-bucket"/><rect x="65" y="15" width="40" height="50" rx="4" class="qv-bucket qv-on"/><rect x="115" y="15" width="40" height="50" rx="4" class="qv-bucket"/><rect x="165" y="15" width="25" height="50" rx="4" class="qv-bucket"/><circle cx="35" cy="35" r="8" class="qv-key"/><circle cx="85" cy="30" r="8" class="qv-key qv-on"/><circle cx="85" cy="50" r="8" class="qv-key qv-on"/><circle cx="135" cy="40" r="8" class="qv-key"/></svg>',
    bst: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><circle cx="100" cy="14" r="12" class="qv-n qv-on"/><circle cx="55" cy="40" r="11" class="qv-n qv-on"/><circle cx="145" cy="40" r="11" class="qv-n"/><circle cx="30" cy="65" r="10" class="qv-n"/><circle cx="75" cy="65" r="10" class="qv-n"/><line x1="92" y1="24" x2="61" y2="32" class="qv-e qv-mst"/><line x1="108" y1="24" x2="139" y2="32" class="qv-e"/><line x1="48" y1="49" x2="36" y2="57" class="qv-e"/><line x1="62" y1="49" x2="71" y2="57" class="qv-e"/></svg>',
    skiplist: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><line x1="20" y1="65" x2="180" y2="65" class="qv-e"/><line x1="20" y1="45" x2="120" y2="45" class="qv-e qv-on"/><line x1="20" y1="25" x2="80" y2="25" class="qv-e qv-on"/><circle cx="50" cy="65" r="9" class="qv-n"/><circle cx="50" cy="45" r="9" class="qv-n qv-on"/><circle cx="50" cy="25" r="9" class="qv-n qv-on"/><circle cx="100" cy="65" r="9" class="qv-n"/><circle cx="100" cy="45" r="9" class="qv-n qv-on"/><circle cx="150" cy="65" r="9" class="qv-n"/></svg>',
    graph: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><circle cx="50" cy="40" r="13" class="qv-n qv-on"/><circle cx="100" cy="18" r="11" class="qv-n"/><circle cx="100" cy="62" r="11" class="qv-n qv-on"/><circle cx="150" cy="40" r="12" class="qv-n"/><line x1="62" y1="34" x2="89" y2="22" class="qv-e qv-on"/><line x1="62" y1="46" x2="89" y2="56" class="qv-e qv-on"/><line x1="111" y1="22" x2="138" y2="36" class="qv-e"/><line x1="111" y1="58" x2="138" y2="44" class="qv-e qv-on"/></svg>',
    stack: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><rect x="75" y="10" width="50" height="14" rx="3" class="qv-stack qv-pop"/><rect x="75" y="28" width="50" height="14" rx="3" class="qv-stack"/><rect x="75" y="46" width="50" height="14" rx="3" class="qv-stack"/><rect x="75" y="64" width="50" height="6" rx="2" class="qv-stack-base"/><text x="145" y="20" class="qv-lbl">pop ↑</text></svg>',
    queue: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><rect x="30" y="30" width="140" height="28" rx="4" class="qv-queue-bg"/><rect x="38" y="36" width="28" height="16" rx="2" class="qv-stack qv-on"/><rect x="72" y="36" width="28" height="16" rx="2" class="qv-stack"/><rect x="106" y="36" width="28" height="16" rx="2" class="qv-stack"/><text x="22" y="48" class="qv-lbl">in</text><text x="168" y="48" class="qv-lbl">out</text></svg>',
    uf: '<svg viewBox="0 0 200 80" class="quiz-viz-svg"><circle cx="45" cy="30" r="14" class="qv-n qv-on"/><circle cx="45" cy="58" r="14" class="qv-n qv-on"/><circle cx="100" cy="44" r="14" class="qv-n qv-cur"/><circle cx="155" cy="30" r="14" class="qv-n"/><circle cx="155" cy="58" r="14" class="qv-n"/><line x1="57" y1="32" x2="88" y2="40" class="qv-e qv-mst"/><line x1="57" y1="56" x2="88" y2="48" class="qv-e qv-mst"/><line x1="112" y1="42" x2="141" y2="34" class="qv-e"/><line x1="155" y1="44" x2="155" y2="44" class="qv-e"/></svg>'
  };

  var DEFAULT_VIZ = {
    complexity: 'sort', algorithm: 'graph', structure: 'bst', concept: 'graph'
  };

  function renderViz(item) {
    var key = item.viz || DEFAULT_VIZ[item.cat] || 'graph';
    vizEl.innerHTML = VIZ[key] || VIZ.graph;
  }

  function updateProgress() {
    var pct = ((idx + (answered ? 1 : 0)) / QUIZ_SIZE) * 100;
    progressFill.style.width = pct + '%';
  }

  function choiceOrder(item) {
    var n = item.c.length;
    var idxs = [];
    for (var i = 0; i < n; i++) idxs.push(i);
    /* Keep Always/Sometimes/Never and True/False in fixed order */
    if (item.type === 'asn' || item.type === 'tf') return idxs;
    return shuffle(idxs);
  }

  function renderQuestion() {
    answered = false;
    var item = round[idx];
    var cat = CATS[item.cat] || CATS.concept;
    var typeLabel = TYPE_LABEL[item.type] || TYPE_LABEL.mcq;

    catEl.className = 'quiz-cat ' + cat.cls;
    catEl.innerHTML = '<span class="quiz-cat-icon">' + cat.icon + '</span> ' + cat.label;

    if (sourceEl) {
      sourceEl.hidden = false;
      sourceEl.innerHTML =
        '<span class="quiz-type-pill quiz-type-' + (item.type || 'mcq') + '">' + typeLabel + '</span>';
    }

    qText.textContent = item.q;
    qMeta.textContent = 'Question ' + (idx + 1) + ' of ' + QUIZ_SIZE;
    feedbackEl.textContent = '';
    feedbackEl.className = 'quiz-feedback';
    nextBtn.hidden = true;
    nextBtn.textContent = idx < QUIZ_SIZE - 1 ? 'Next question →' : 'See results ✦';

    renderViz(item);
    updateProgress();

    optionsEl.innerHTML = '';
    optionsEl.className = 'quiz-options' + (item.type === 'asn' ? ' quiz-options-asn' : '');
    choiceOrder(item).forEach(function (oi, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.innerHTML =
        '<span class="quiz-opt-letter">' + String.fromCharCode(65 + i) + '</span>' +
        '<span class="quiz-opt-text">' + item.c[oi] + '</span>';
      btn.dataset.idx = String(oi);
      btn.addEventListener('click', function () { onPick(btn, item, oi); });
      optionsEl.appendChild(btn);
    });
  }

  function onPick(btn, item, choiceIdx) {
    if (answered) return;
    answered = true;
    var correct = choiceIdx === item.a;
    if (correct) score++;
    var buttons = optionsEl.querySelectorAll('.quiz-option');
    buttons.forEach(function (b) {
      b.disabled = true;
      var i = parseInt(b.dataset.idx, 10);
      if (i === item.a) b.classList.add('correct');
      else if (b === btn && !correct) b.classList.add('wrong');
    });
    feedbackEl.innerHTML = correct
      ? '<span class="quiz-fb-icon">✓</span> Correct!'
      : '<span class="quiz-fb-icon">✗</span> Not quite.';
    if (item.explain) {
      feedbackEl.innerHTML += '<span class="quiz-fb-hint">' + item.explain + '</span>';
    }
    feedbackEl.className = 'quiz-feedback ' + (correct ? 'ok' : 'bad');
    nextBtn.hidden = false;
    updateProgress();
  }

  function spawnConfetti() {
    var wrap = $('#quiz-confetti');
    if (!wrap) return;
    wrap.innerHTML = '';
    var colors = ['#57e0c0', '#7c9cff', '#a78bfa', '#ffd88a', '#ff9ec7'];
    for (var i = 0; i < 15; i++) {
      var p = document.createElement('span');
      p.className = 'quiz-confetti-piece';
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.6) + 's';
      p.style.animationDuration = (1.2 + Math.random() * 1.5) + 's';
      wrap.appendChild(p);
    }
  }

  function showResults() {
    panel.querySelector('.quiz-body').hidden = true;
    $('.quiz-foot').hidden = true;
    $('.quiz-progress-wrap').hidden = true;
    if (sourceEl) sourceEl.hidden = true;
    vizEl.innerHTML = '';
    scoreEl.hidden = false;
    var pct = Math.round((score / QUIZ_SIZE) * 100);
    var msg = score === QUIZ_SIZE ? 'Perfect score: you crushed it!' :
      score >= 5 ? 'Strong round! Review the hints you missed.' :
      score >= 3 ? 'Solid: keep drilling weak topics.' :
      'Keep studying: run another round!';
    scoreEl.innerHTML =
      '<div class="quiz-score-ring" style="--pct:' + pct + '"><span class="quiz-score-num">' + score + '<small>/' + QUIZ_SIZE + '</small></span></div>' +
      '<h3>' + msg + '</h3>' +
      '<p class="quiz-score-msg">' + pct + '% correct this round</p>' +
      '<div class="quiz-score-actions">' +
      '<button type="button" class="viz-btn viz-primary" id="quiz-again">↻ New quiz</button>' +
      '<button type="button" class="viz-btn" id="quiz-close-results">Close</button></div>';
    if (score === QUIZ_SIZE) spawnConfetti();
    $('#quiz-again').addEventListener('click', startQuiz);
    $('#quiz-close-results').addEventListener('click', closeQuiz);
  }

  function startQuiz() {
    if (!POOL.length) buildPool();
    round = pickRound();
    idx = 0;
    score = 0;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    panel.querySelector('.quiz-body').hidden = false;
    $('.quiz-foot').hidden = false;
    $('.quiz-progress-wrap').hidden = false;
    scoreEl.hidden = true;
    $('#quiz-confetti').innerHTML = '';
    overlay.classList.add('quiz-overlay-open');
    renderQuestion();
  }

  function closeQuiz() {
    overlay.classList.remove('quiz-overlay-open');
    setTimeout(function () { overlay.hidden = true; document.body.style.overflow = ''; }, 200);
  }

  function onNext() {
    if (!answered) return;
    idx++;
    if (idx >= QUIZ_SIZE) showResults();
    else renderQuestion();
  }

  function init() {
    overlay = $('#quiz-overlay');
    if (!overlay) return;
    panel = $('.quiz-panel');
    qText = $('#quiz-q');
    qMeta = $('#quiz-meta');
    catEl = $('#quiz-cat');
    sourceEl = $('#quiz-source');
    vizEl = $('#quiz-viz');
    optionsEl = $('#quiz-options');
    feedbackEl = $('#quiz-feedback');
    nextBtn = $('#quiz-next');
    scoreEl = $('#quiz-score');
    progressFill = $('#quiz-progress-fill');

    buildPool();

    $('#quiz-start').addEventListener('click', startQuiz);
    $('#quiz-close').addEventListener('click', closeQuiz);
    nextBtn.addEventListener('click', onNext);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeQuiz();
    });
    document.addEventListener('keydown', function (e) {
      if (overlay.hidden) return;
      if (e.key === 'Escape') closeQuiz();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
