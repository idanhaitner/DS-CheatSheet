/* DS Exam Quiz — mixed pool, 5 random per round, animated UI */
(function () {
  var QUIZ_SIZE = 5;
  var CATS = {
    complexity: { label: 'Complexity', icon: '⏱', cls: 'cat-complexity' },
    algorithm:  { label: 'Algorithm', icon: '⚙', cls: 'cat-algorithm' },
    structure:  { label: 'Data Structure', icon: '◫', cls: 'cat-structure' },
    concept:    { label: 'Concept', icon: '💡', cls: 'cat-concept' }
  };

  var POOL = [
    /* ── Complexity (keep a subset) ── */
    { q: 'Worst-case search in an unsorted array?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 2, cat: 'complexity' },
    { q: 'Search in a sorted array (binary search)?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], a: 1, cat: 'complexity' },
    { q: 'Insert at end of dynamic array (amortized)?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 0, cat: 'complexity' },
    { q: 'Search in a balanced BST (AVL)?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 1, cat: 'complexity' },
    { q: 'Expected search in a skip list?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], a: 1, cat: 'complexity' },
    { q: 'Expected search in hash chaining (uniform hashing)?', c: ['O(1)', 'Θ(1+α)', 'O(log n)', 'O(n)'], a: 1, cat: 'complexity' },
    { q: 'Get-min in a binary min-heap?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 0, cat: 'complexity' },
    { q: 'buildHeap (Floyd) complexity?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 2, cat: 'complexity', explain: 'Bottom-up heapify visits each node once — O(n) total, not O(n log n).' },
    { q: 'BFS / DFS with adjacency list?', c: ['O(V)', 'O(E)', 'O(V + E)', 'O(V·E)'], a: 2, cat: 'complexity' },
    { q: 'Dijkstra with binary heap?', c: ['O(V²)', 'O(E log V)', 'O((V+E) log V)', 'O(V·E)'], a: 2, cat: 'complexity' },
    { q: 'Bellman-Ford?', c: ['O(V+E)', 'O(E log V)', 'O(V·E)', 'O(V²)'], a: 2, cat: 'complexity' },
    { q: 'Merge sort worst-case time & space (array)?', c: ['O(n log n), O(1)', 'O(n log n), O(n)', 'O(n²), O(n)', 'O(n), O(log n)'], a: 1, cat: 'complexity' },
    { q: 'Quicksort worst case (sorted + bad pivot)?', c: ['O(n)', 'O(n log n)', 'O(n²)', 'O(n³)'], a: 2, cat: 'complexity' },
    { q: 'Union-Find with path compression + rank?', c: ['O(m log n)', 'O(m α(n))', 'O(m·n)', 'O(m+n)'], a: 1, cat: 'complexity' },
    { q: 'Master Theorem: T(n)=2T(n/2)+n ?', c: ['Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(log n)'], a: 1, cat: 'complexity' },

    /* ── Algorithms ── */
    { q: 'BFS uses which data structure?', c: ['Stack', 'Queue', 'Priority queue', 'Hash table'], a: 1, cat: 'algorithm', viz: 'bfs', explain: 'BFS is FIFO — first discovered, first explored.' },
    { q: 'DFS on a graph is typically implemented with…', c: ['Queue', 'Stack (or recursion)', 'Heap', 'Sorted array'], a: 1, cat: 'algorithm', viz: 'dfs', explain: 'DFS goes deep first — LIFO stack or the call stack.' },
    { q: 'Dijkstra repeatedly extracts the vertex with…', c: ['Max degree', 'Min dist from source', 'Min edge weight', 'Earliest discovery time'], a: 1, cat: 'algorithm', viz: 'dijkstra', explain: 'Greedy: finalize the closest unvisited vertex each step.' },
    { q: 'Kruskal builds an MST by…', c: ['Growing one tree from a root', 'Adding lightest edges that avoid cycles', 'Running BFS on sorted edges', 'Relaxing all edges V−1 times'], a: 1, cat: 'algorithm', viz: 'mst', explain: 'Sort edges by weight; use Union-Find to skip cycle-forming edges.' },
    { q: 'Prim grows an MST by…', c: ['Sorting all edges first', 'Adding min-weight edge from tree to outside', 'Running DFS from every vertex', 'Deleting max edges in cycles'], a: 1, cat: 'algorithm', viz: 'mst', explain: 'One growing tree — like Dijkstra but key = min edge to tree.' },
    { q: 'Topological sort is valid only on…', c: ['Undirected graphs', 'DAGs', 'Complete graphs', 'Trees with one root'], a: 1, cat: 'algorithm', viz: 'topo', explain: 'Needs a directed acyclic graph — no cycles.' },
    { q: 'Merge sort is a classic example of…', c: ['Greedy', 'Divide & conquer', 'Dynamic programming', 'Randomized hashing'], a: 1, cat: 'algorithm', viz: 'sort', explain: 'Split in half, sort recursively, merge in O(n).' },
    { q: 'Quicksort partitions around a…', c: ['Median of sorted array', 'Pivot element', 'First edge in MST', 'Heap root'], a: 1, cat: 'algorithm', viz: 'sort', explain: 'Partition: smaller left, larger right (or vice versa), recurse.' },
    { q: 'Heapsort first builds a…', c: ['BST', 'Max-heap (or min-heap)', 'Hash table', 'Skip list'], a: 1, cat: 'algorithm', viz: 'heap', explain: 'Build heap O(n), then repeatedly extract-max to the end.' },
    { q: 'Counting sort is NOT comparison-based because it…', c: ['Uses random pivots', 'Counts occurrences per key value', 'Swaps adjacent elements', 'Uses a priority queue'], a: 1, cat: 'algorithm', viz: 'sort', explain: 'Direct indexing into a count array — bypasses Ω(n log n) comparison bound.' },
    { q: 'Radix sort processes digits…', c: ['From most significant only', 'Stable digit-by-digit (often LSD)', 'Using a BST per digit', 'In random order'], a: 1, cat: 'algorithm', viz: 'sort', explain: 'Each digit pass uses a stable sort (usually counting sort).' },
    { q: 'Quickselect finds the i-th smallest in expected…', c: ['O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'], a: 1, cat: 'algorithm', explain: 'Like quicksort but recurse only into the partition containing i.' },
    { q: 'Bellman-Ford can detect…', c: ['Only positive cycles', 'Negative-weight cycles', 'Disconnected components', 'Hamiltonian paths'], a: 1, cat: 'algorithm', viz: 'dijkstra', explain: 'V−1 relax rounds; one more round that improves ⇒ negative cycle.' },
    { q: 'Unweighted shortest path from s — use…', c: ['Dijkstra', 'BFS', 'Kruskal', 'Heap sort'], a: 1, cat: 'algorithm', viz: 'bfs', explain: 'BFS layers = hop distance when all edges weight 1.' },
    { q: 'Insertion sort shines when the array is…', c: ['Random and huge', 'Nearly sorted', 'All equal keys only', 'Reverse sorted only'], a: 1, cat: 'algorithm', viz: 'sort', explain: 'O(n·d) where d = shift distance — tiny when almost sorted.' },

    /* ── Data Structures ── */
    { q: 'A binary heap is usually stored as…', c: ['Linked list of nodes', 'Array with index formulas', 'Hash table', 'Adjacency matrix'], a: 1, cat: 'structure', viz: 'heap', explain: 'Parent at ⌊i/2⌋, children at 2i and 2i+1 — no pointers needed.' },
    { q: 'AVL trees stay balanced by…', c: ['Random promotions', 'Rotations when balance factor exceeds 1', 'Splitting B-tree nodes', 'Rehashing'], a: 1, cat: 'structure', viz: 'bst', explain: '|height(left) − height(right)| ≤ 1 enforced via single/double rotations.' },
    { q: 'Skip lists achieve O(log n) expected time by…', c: ['Perfect balancing', 'Randomized tower heights', 'Hashing every level', 'Always storing a sentinel'], a: 1, cat: 'structure', viz: 'skiplist', explain: 'Coin-flip tower heights give express lanes like a probabilistic BST.' },
    { q: 'Hash chaining resolves collisions by…', c: ['Probing the next slot', 'Linked lists at each bucket', 'Deleting the old key', 'Sorting the table'], a: 1, cat: 'structure', viz: 'hash', explain: 'Each bucket points to a chain of colliding keys.' },
    { q: 'Open addressing on delete often needs…', c: ['Rebuilding the whole table', 'Tombstone markers', 'Doubly linked chains', 'A BST per slot'], a: 1, cat: 'structure', viz: 'hash', explain: 'Tombstones keep probe sequences valid for later searches.' },
    { q: 'Adjacency list is best for…', c: ['Dense graphs, fast edge queries', 'Sparse graphs, iterating neighbors', 'Only directed acyclic graphs', 'Weighted graphs only'], a: 1, cat: 'structure', viz: 'graph', explain: 'O(V+E) space; iterate deg(u) neighbors in O(deg(u)).' },
    { q: 'Adjacency matrix is best for…', c: ['Sparse graphs', 'Fast O(1) edge-exists queries', 'Topological sort only', 'Union-Find internals'], a: 1, cat: 'structure', viz: 'graph', explain: 'O(V²) space but O(1) to check if edge (u,v) exists.' },
    { q: 'Stack supports which core operations?', c: ['Enqueue & dequeue', 'Push & pop (LIFO)', 'Insert & extract-min', 'Union & find'], a: 1, cat: 'structure', viz: 'stack', explain: 'Last in, first out — used in DFS, parsing, undo.' },
    { q: 'Queue supports which core operations?', c: ['Push & pop', 'Enqueue & dequeue (FIFO)', 'Insert & delete-min', 'Link & cut'], a: 1, cat: 'structure', viz: 'queue', explain: 'First in, first out — BFS, scheduling, buffers.' },
    { q: 'A deque allows…', c: ['Only push at top', 'Insert/delete at both ends', 'Only sorted insert', 'Merge in O(1)'], a: 1, cat: 'structure', explain: 'Double-ended queue — push/pop front and back.' },
    { q: 'Binary search tree in-order traversal yields…', c: ['Random order', 'Sorted key order', 'Level order', 'Reverse graph order'], a: 1, cat: 'structure', viz: 'bst', explain: 'Left → node → right visits keys in ascending order.' },
    { q: 'B-tree nodes have many keys to…', c: ['Fit in CPU cache lines only', 'Reduce disk seeks (high fanout)', 'Enable O(1) search', 'Replace hashing'], a: 1, cat: 'structure', explain: 'Wide nodes = shallow tree = fewer slow disk reads.' },
    { q: 'Union-Find tracks…', c: ['Shortest paths', 'Disjoint connected components', 'Topological levels', 'Heap order'], a: 1, cat: 'structure', viz: 'uf', explain: 'Union merges sets; Find returns component representative.' },

    /* ── Concepts & pitfalls ── */
    { q: 'Why does Dijkstra fail with negative edges?', c: ['Uses too much memory', 'Finalized vertices are never updated', 'Requires a DAG', 'Only works on trees'], a: 1, cat: 'concept', viz: 'dijkstra', explain: 'Once dist is finalized, a later negative edge cannot fix it.' },
    { q: 'Is merge sort stable?', c: ['Yes', 'No', 'Only for integers', 'Only in linked-list form'], a: 0, cat: 'concept', explain: 'Merge takes left element first when equal — preserves order.' },
    { q: 'Is standard in-place quicksort stable?', c: ['Yes', 'No', 'Always with Lomuto', 'Only randomized'], a: 1, cat: 'concept', explain: 'Partition swaps can reorder equal keys.' },
    { q: 'Comparison sort lower bound (worst case)?', c: ['Ω(n)', 'Ω(n log n)', 'Ω(n²)', 'Ω(n!)'], a: 1, cat: 'concept', explain: 'Decision tree has n! leaves ⇒ height ≥ log(n!) = Ω(n log n).' },
    { q: 'O(g) notation means f is…', c: ['Exactly equal to g', 'At most c·g for large n', 'At least c·g', 'Strictly less than g'], a: 1, cat: 'concept', explain: 'Upper bound — f grows no faster than g (up to constant).' },
    { q: 'Θ(g) means…', c: ['Upper bound only', 'Lower bound only', 'Tight bound (O and Ω)', 'Strictly smaller than g'], a: 2, cat: 'concept', explain: 'f sandwiched: c₁g ≤ f ≤ c₂g for large n.' },
    { q: 'Cut property (MST): safe edge is…', c: ['Max weight in a cycle', 'Min weight crossing a cut', 'Any edge in BFS tree', 'Heaviest in the graph'], a: 1, cat: 'concept', viz: 'mst', explain: 'Lightest edge crossing any cut belongs to some MST.' },
    { q: 'Cycle property (MST): never in MST is…', c: ['Min edge in a cycle', 'Max edge in a cycle', 'Any tree edge', 'First BFS edge'], a: 1, cat: 'concept', viz: 'mst', explain: 'Heaviest edge in any cycle can be swapped out.' },
    { q: 'In DFS, a red/back edge indicates…', c: ['Tree edge', 'A cycle (in directed graph)', 'Cross edge only in trees', 'MST membership'], a: 1, cat: 'concept', viz: 'dfs', explain: 'Edge to an ancestor in DFS tree ⇒ cycle in directed graph.' },
    { q: 'Load factor α < 1 is required for…', c: ['Chaining only', 'Open addressing probing', 'Skip lists', 'AVL trees'], a: 1, cat: 'concept', viz: 'hash', explain: 'Probing needs empty slots; α→1 makes clusters and long probes.' },
    { q: 'Which gives O(1) membership without ordering?', c: ['AVL tree', 'Hash table', 'Sorted array', 'Binary heap'], a: 1, cat: 'concept', viz: 'hash', explain: 'Hash maps keys to buckets — no sorted order.' },
    { q: 'Which supports O(log n) successor queries?', c: ['Hash table', 'Balanced BST', 'Queue', 'Stack'], a: 1, cat: 'concept', viz: 'bst', explain: 'BST can find next larger key by walking tree.' },
    { q: 'Heap extract-min after insert uses…', c: ['Bubble up only', 'Swap root with last, sift down', 'Rotate like AVL', 'Rehash'], a: 1, cat: 'concept', viz: 'heap', explain: 'Replace root with last leaf, then restore heap property downward.' },
    { q: 'Master Theorem gap: fails when f(n) differs by only…', c: ['A constant', 'A log factor from n^log_b(a)', 'A polynomial degree', 'The base b'], a: 1, cat: 'concept', explain: 'e.g. f = n^log_b(a) log n — use recursion tree instead.' },
    { q: 'Plain BST worst-case height on sorted insert?', c: ['O(log n)', 'O(n)', 'O(√n)', 'O(1)'], a: 1, cat: 'concept', viz: 'bst', explain: 'Sorted input creates a chain — linear height.' },

    /* ── More complexity (16–25) ── */
    { q: 'Insert into a binary heap?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 1, cat: 'complexity', viz: 'heap' },
    { q: 'Extract-max from a binary heap?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], a: 1, cat: 'complexity', viz: 'heap' },
    { q: 'Topological sort on a DAG?', c: ['O(V)', 'O(E)', 'O(V + E)', 'O(V·E)'], a: 2, cat: 'complexity', viz: 'topo' },
    { q: 'Kruskal MST (sorting edges dominates)?', c: ['O(V + E)', 'O(E log E)', 'O(V log V)', 'O(V²)'], a: 1, cat: 'complexity', viz: 'mst' },
    { q: 'Huffman coding build time (n chars)?', c: ['O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'], a: 1, cat: 'complexity' },
    { q: 'Selection sort time?', c: ['O(n)', 'O(n log n)', 'O(n²)', 'O(n³)'], a: 2, cat: 'complexity', viz: 'sort' },
    { q: 'Insertion sort worst case?', c: ['O(n)', 'O(n log n)', 'O(n²)', 'O(n³)'], a: 2, cat: 'complexity', viz: 'sort' },
    { q: 'Heapsort total time?', c: ['O(n)', 'O(n log n)', 'O(n²)', 'O(n² log n)'], a: 1, cat: 'complexity', viz: 'heap' },
    { q: 'Hash table insert (chaining, no rehash)?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(α)'], a: 0, cat: 'complexity', viz: 'hash' },
    { q: 'AVL tree insert (balanced)?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 1, cat: 'complexity', viz: 'bst' },

    /* ── More algorithms ── */
    { q: 'Topological sort outputs vertices by…', c: ['Increasing BFS distance', 'Decreasing DFS finish time', 'Increasing key value', 'Random order'], a: 1, cat: 'algorithm', viz: 'topo', explain: 'DFS finish time: later finish ⇒ earlier in topo order.' },
    { q: 'Bellman-Ford performs how many relax rounds?', c: ['V−1', 'V', 'E−1', 'log V'], a: 0, cat: 'algorithm', viz: 'dijkstra', explain: 'V−1 passes guarantee shortest paths if no negative cycle.' },
    { q: 'Huffman coding is built by repeatedly merging…', c: ['Two largest frequencies', 'Two smallest frequencies', 'Random pairs', 'All leaves at once'], a: 1, cat: 'algorithm', explain: 'Greedy: combine two least frequent subtrees.' },
    { q: 'AVL fix after insert may need…', c: ['Only rehashing', 'Single or double rotation', 'B-tree split', 'Heapify'], a: 1, cat: 'algorithm', viz: 'bst', explain: 'Rotate at the first unbalanced ancestor on the insert path.' },
    { q: 'Linear probing on collision probes…', c: ['Random slots', 'Next slot: (h+i) mod m', 'Binary search in table', 'Separate chain'], a: 1, cat: 'algorithm', viz: 'hash' },
    { q: 'Merge sort extra space for array version?', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 2, cat: 'algorithm', viz: 'sort' },
    { q: 'In-place heapsort extra memory?', c: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'], a: 0, cat: 'algorithm', viz: 'heap' },
    { q: 'BFS discovers vertices in order of…', c: ['Edge weight', 'Hop distance from s', 'DFS finish time', 'Vertex label'], a: 1, cat: 'algorithm', viz: 'bfs' },
    { q: 'DFS edge to a gray vertex in a digraph is a…', c: ['Tree edge', 'Back edge (cycle)', 'Forward edge only', 'Safe MST edge'], a: 1, cat: 'algorithm', viz: 'dfs' },
    { q: 'Prim is most like Dijkstra but minimizes…', c: ['Path from source', 'Edge weight to growing tree', 'Vertex degree', 'Finish time'], a: 1, cat: 'algorithm', viz: 'mst' },

    /* ── More structures ── */
    { q: 'Max-heap property: each parent is…', c: ['≤ both children', '≥ both children', 'Equal to children', 'Unordered'], a: 1, cat: 'structure', viz: 'heap' },
    { q: 'Left child of index i in 0-based heap array?', c: ['i−1', '2i', '2i+1', '⌊i/2⌋'], a: 2, cat: 'structure', viz: 'heap' },
    { q: 'Singly linked list: delete given node pointer only?', c: ['O(1) always', 'O(1) if doubly linked or copy next', 'O(log n)', 'Impossible'], a: 1, cat: 'structure', explain: 'Singly linked needs predecessor — or copy successor data.' },
    { q: 'Dynamic array insert at index 0 costs…', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], a: 2, cat: 'structure' },
    { q: 'Circular buffer queue uses…', c: ['Two stacks', 'Head/tail indices modulo capacity', 'BST ordering', 'Hash buckets'], a: 1, cat: 'structure', viz: 'queue' },
    { q: 'Separate chaining load factor α can be…', c: ['Only < 1', 'Any α ≥ 0', 'Exactly 1', 'Only integers'], a: 1, cat: 'structure', viz: 'hash', explain: 'Chains grow — no hard slot limit unlike probing.' },
    { q: 'Open addressing requires load factor…', c: ['α < 1 (empty slots exist)', 'α = 1', 'α > 2', 'α = 0'], a: 0, cat: 'structure', viz: 'hash' },
    { q: 'B-tree minimum keys per node (min degree t)?', c: ['t−1 (except root)', '2t−1 always', '1 always', 't+1'], a: 0, cat: 'structure', explain: 'Internal nodes hold t−1 … 2t−1 keys.' },
    { q: 'Graph tree with V vertices has how many edges?', c: ['V', 'V−1', 'V+1', '2V'], a: 1, cat: 'structure', viz: 'graph' },
    { q: 'Priority queue with binary heap supports extract-min in…', c: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], a: 1, cat: 'structure', viz: 'heap' },
    { q: 'Adjacency matrix space for V vertices?', c: ['O(V)', 'O(V+E)', 'O(V²)', 'O(E)'], a: 2, cat: 'structure', viz: 'graph' },

    /* ── More concepts ── */
    { q: 'A sorting algorithm is stable if…', c: ['It is O(n log n)', 'Equal keys keep relative order', 'It uses O(1) space', 'It is in-place'], a: 1, cat: 'concept', viz: 'sort' },
    { q: 'Amortized O(1) means…', c: ['Every op is O(1)', 'Average cost per op over sequence is O(1)', 'Worst op is O(1)', 'Only for n=1'], a: 1, cat: 'concept' },
    { q: 'Primary clustering affects…', c: ['Chaining only', 'Linear probing', 'AVL trees', 'Merge sort'], a: 1, cat: 'concept', viz: 'hash', explain: 'Runs of occupied slots grow — probes clump together.' },
    { q: 'BFS can test bipartite by…', c: ['Counting edges', '2-coloring levels', 'DFS finish times', 'Sorting vertices'], a: 1, cat: 'concept', viz: 'bfs' },
    { q: 'DAG ⟺ topological ordering exists?', c: ['False always', 'True — iff acyclic', 'Only for trees', 'Only undirected'], a: 1, cat: 'concept', viz: 'topo' },
    { q: 'MST of a connected graph has exactly…', c: ['V edges', 'V−1 edges', 'E edges', 'V+E edges'], a: 1, cat: 'concept', viz: 'mst' },
    { q: 'Shortest-path tree from s may differ from MST because…', c: ['Same always', 'MST minimizes total weight, not path from s', 'BFS is always MST', 'Dijkstra is Kruskal'], a: 1, cat: 'concept', viz: 'dijkstra' },
    { q: 'Heap does NOT support in O(log n)…', c: ['Insert', 'Extract-max', 'Search arbitrary key', 'Increase-key'], a: 2, cat: 'concept', viz: 'heap', explain: 'Arbitrary search is O(n) — no ordering by key across heap.' },
    { q: 'Rehashing in hash table is triggered when…', c: ['α exceeds threshold', 'Every delete', 'BST rotates', 'Graph has cycle'], a: 0, cat: 'concept', viz: 'hash' },
    { q: 'White-gray-black in DFS: gray means…', c: ['Finished', 'Discovered, not finished', 'Not visited', 'In MST'], a: 1, cat: 'concept', viz: 'dfs' },
    { q: 'Counting sort is linear when k (range) is…', c: ['O(n²)', 'O(n)', 'O(n log n)', 'Infinite'], a: 1, cat: 'concept', viz: 'sort' }
  ];

  var overlay, panel, qText, qMeta, catEl, vizEl, optionsEl, feedbackEl, nextBtn, scoreEl, progressFill;
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

  function pickRound() {
    var cats = ['complexity', 'algorithm', 'structure', 'concept'];
    var picked = [];
    var byCat = {};
    cats.forEach(function (c) { byCat[c] = POOL.filter(function (q) { return q.cat === c; }); });
    cats.forEach(function (c) {
      if (byCat[c].length) picked.push(shuffle(byCat[c])[0]);
    });
    var rest = shuffle(POOL.filter(function (q) { return picked.indexOf(q) < 0; }));
    picked = picked.concat(rest).slice(0, QUIZ_SIZE);
    return shuffle(picked);
  }

  /* ── Mini SVG visualizations ── */
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

  function renderQuestion() {
    answered = false;
    var item = round[idx];
    var cat = CATS[item.cat] || CATS.concept;

    catEl.className = 'quiz-cat ' + cat.cls;
    catEl.innerHTML = '<span class="quiz-cat-icon">' + cat.icon + '</span> ' + cat.label;

    qText.textContent = item.q;
    qMeta.textContent = 'Question ' + (idx + 1) + ' of ' + QUIZ_SIZE;
    feedbackEl.textContent = '';
    feedbackEl.className = 'quiz-feedback';
    nextBtn.hidden = true;
    nextBtn.textContent = idx < QUIZ_SIZE - 1 ? 'Next question →' : 'See results ✦';

    renderViz(item);
    updateProgress();

    optionsEl.innerHTML = '';
    var order = shuffle([0, 1, 2, 3]);
    order.forEach(function (oi, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.innerHTML = '<span class="quiz-opt-letter">' + String.fromCharCode(65 + i) + '</span><span class="quiz-opt-text">' + item.c[oi] + '</span>';
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
    vizEl.innerHTML = '';
    scoreEl.hidden = false;
    var pct = Math.round((score / QUIZ_SIZE) * 100);
    var msg = score === QUIZ_SIZE ? 'Perfect score — you crushed it!' :
      score >= 4 ? 'Strong round! Review the hints you missed.' :
      score >= 3 ? 'Solid — keep drilling weak topics.' :
      'Keep studying — run another round!';
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
    vizEl = $('#quiz-viz');
    optionsEl = $('#quiz-options');
    feedbackEl = $('#quiz-feedback');
    nextBtn = $('#quiz-next');
    scoreEl = $('#quiz-score');
    progressFill = $('#quiz-progress-fill');

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
