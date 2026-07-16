/* Quiz pool — closed-form DS questions (no exam labels) */
window.QUIZ_EXAM_POOL = [
  {
    "q": "Given f(n) = 3n + log(n/2), which asymptotic class is correct?",
    "c": [
      "f(n) ∈ Θ(1)",
      "f(n) ∈ Θ(log n)",
      "f(n) ∈ Θ(n)",
      "f(n) ∈ Θ(n log n)"
    ],
    "a": 2,
    "cat": "complexity",
    "type": "mcq",
    "explain": "The linear term 3n dominates log(n/2), so f(n) = Θ(n).",
    "viz": "sort",
    "id": "2025a-q1"
  },
  {
    "q": "Solve T(n) = 2T(n/2) + n with T(1) = 1. Which is correct?",
    "c": [
      "T(n) ∈ Θ(log n)",
      "T(n) ∈ Θ(n)",
      "T(n) ∈ Θ(n log n)",
      "T(n) ∈ Θ(n²)"
    ],
    "a": 2,
    "cat": "complexity",
    "type": "mcq",
    "explain": "Master theorem case 2 (or recursion tree): a = b = 2 and f(n) = Θ(n) ⇒ Θ(n log n).",
    "viz": "sort",
    "id": "2025b-q1"
  },
  {
    "q": "Solve T(n) = T(n − 1) + 1 with T(1) = 1. Which is correct?",
    "c": [
      "T(n) ∈ Θ(log n)",
      "T(n) ∈ Θ(n)",
      "T(n) ∈ Θ(n log n)",
      "T(n) ∈ Θ(n²)"
    ],
    "a": 1,
    "cat": "complexity",
    "type": "mcq",
    "explain": "Unrolling gives T(n) = n, so Θ(n).",
    "viz": "sort",
    "id": "2025c-q1"
  },
  {
    "q": "Given f(n) = n√n + n²/log n = n^{3/2} + n²/log n, which tight bound is correct?",
    "c": [
      "f(n) = Θ(n^{3/2})",
      "f(n) = Θ(n² / log n)",
      "f(n) = Θ(n²)",
      "f(n) = Θ(n log n)"
    ],
    "a": 1,
    "cat": "complexity",
    "type": "mcq",
    "explain": "(n²/log n) / n^{3/2} = √n / log n → ∞, so n²/log n dominates.",
    "viz": "sort",
    "id": "2026a-q1a"
  },
  {
    "q": "Solve T(n) = T(n/3) + T(2n/3) + n with T(1) = Θ(1). What is T(n)?",
    "c": [
      "Θ(n)",
      "Θ(n log n)",
      "Θ(n²)",
      "Θ(n log log n)"
    ],
    "a": 1,
    "cat": "complexity",
    "type": "mcq",
    "explain": "Each recursion level costs Θ(n) and every root-to-leaf path has length Θ(log n).",
    "viz": "sort",
    "id": "2026a-q1b"
  },
  {
    "q": "In a string S over alphabet Σ, every character appears at least once and all frequencies are distinct. Let T be some optimal prefix-code tree for S (not necessarily Huffman’s). Claim: the two rarest characters are siblings in T.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "concept",
    "type": "asn",
    "explain": "It holds for some frequency sets / trees and fails for others (e.g. frequencies 3,4,5,6).",
    "viz": "sort",
    "id": "2025a-q4b"
  },
  {
    "q": "Run DFS on a directed graph G. Edge (u,v) is classified as a back edge. Claim: v.d < u.d (discovery times).",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 0,
    "cat": "algorithm",
    "type": "asn",
    "explain": "A back edge goes to an ancestor that is still gray, so v was discovered earlier than u.",
    "viz": "graph",
    "id": "2025a-q5a"
  },
  {
    "q": "In a max-heap, every key in the root’s left subtree is smaller than every key in the root’s right subtree.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "structure",
    "type": "asn",
    "explain": "Heaps do not order left vs right subtrees; the claim can hold for some heaps and fail for others.",
    "viz": "heap",
    "id": "2025a-q5b"
  },
  {
    "q": "In a max-heap containing the distinct keys {1,2,…,10}, the key 2 is a leaf.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "structure",
    "type": "asn",
    "explain": "2 can be a leaf, but it can also be an internal node with child 1 (e.g. at the last internal index).",
    "viz": "heap",
    "id": "2025a-q5c"
  },
  {
    "q": "In a max-heap containing the distinct keys {1,2,…,9}, the key 2 is a leaf.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 0,
    "cat": "structure",
    "type": "asn",
    "explain": "With n=9 there are only 4 internal nodes; 2 cannot have two children both ≤2 with distinct keys, so 2 must be a leaf.",
    "viz": "heap",
    "id": "2025a-q5d"
  },
  {
    "q": "G is connected; run BFS(G,s) and Prim(G,w,s) with w(e)=1 for every edge. Claim: the s–t path in the BFS tree equals the s–t path in Prim’s MST.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "algorithm",
    "type": "asn",
    "explain": "Unit weights make many MSTs possible; Prim’s tree need not match the BFS shortest-path tree.",
    "viz": "graph",
    "id": "2025a-q5e"
  },
  {
    "q": "G is a DAG and s ∈ V. Two BFS(G,s) runs differ only in neighbor-scan order. Claim: they produce the same BFS tree (same vertices and edges).",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "algorithm",
    "type": "asn",
    "explain": "Different adjacency orders can choose different parents at the same distance, so trees may differ.",
    "viz": "graph",
    "id": "2025b-q5a"
  },
  {
    "q": "G is undirected and connected. Run DFS(G). Claim: the DFS forest contains exactly one tree.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 0,
    "cat": "algorithm",
    "type": "asn",
    "explain": "Connectivity implies a single DFS tree spanning all vertices.",
    "viz": "graph",
    "id": "2025b-q5b"
  },
  {
    "q": "A has n distinct keys and is sorted ascending. Claim: deterministic Quicksort runs in Θ(n²) time.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 0,
    "cat": "algorithm",
    "type": "asn",
    "explain": "With the usual fixed end/first pivot, a sorted array yields the worst-case partition every time.",
    "viz": "sort",
    "id": "2025b-q5c"
  },
  {
    "q": "A has n distinct keys and is neither ascending-sorted nor descending-sorted. Claim: deterministic Quicksort runs in Θ(n²).",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "algorithm",
    "type": "asn",
    "explain": "Some non-monotone arrays still force unbalanced partitions; others give Θ(n log n).",
    "viz": "sort",
    "id": "2025b-q5d"
  },
  {
    "q": "In a skip list, consider a search path P from the top sentinel down to S₀. Claim: the number of down-steps on P is ≤ the number of right-steps on P.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "structure",
    "type": "asn",
    "explain": "You can descend many levels with few (or zero) right moves, so the inequality need not always hold.",
    "viz": "skiplist",
    "id": "2025b-q5e"
  },
  {
    "q": "Huffman’s algorithm produces an optimal prefix code.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 0,
    "cat": "concept",
    "type": "asn",
    "explain": "Huffman’s greedy construction yields a minimum-cost prefix code for the given frequencies.",
    "viz": "sort",
    "id": "2025c-q5a"
  },
  {
    "q": "T is an AVL tree of height 2. Claim: there exists a leaf x such that deleting x causes a rotation, and re-inserting x restores exactly the original tree T.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 2,
    "cat": "structure",
    "type": "asn",
    "explain": "When a rotation occurs on delete, re-inserting the leaf does not undo that rotation; the shape is not restored.",
    "viz": "bst",
    "id": "2025c-q5b"
  },
  {
    "q": "T is an AVL tree of height 1. Claim: there exists a key x ∉ T such that inserting x causes a rotation, and then deleting x restores exactly T.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "structure",
    "type": "asn",
    "explain": "For some height-1 shapes/keys the insert–delete cycle restores T; for others it does not.",
    "viz": "bst",
    "id": "2025c-q5c"
  },
  {
    "q": "Given an unsorted array A of n numbers, one can build some binary search tree (not necessarily balanced) on its keys in O(n) time.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "structure",
    "type": "asn",
    "explain": "If A is already sorted, sequential inserts build a BST in Θ(n); for arbitrary A, building a BST needs sorting / Ω(n log n) comparison work.",
    "viz": "bst",
    "id": "2025c-q5e"
  },
  {
    "q": "Array size n = 2^k − 1 with k distinct values a₁ < ··· < aₖ where aᵢ appears exactly 2^{i−1} times. Claim: after Build-Min-Heap the array is sorted.",
    "c": [
      "Always true",
      "Sometimes true",
      "Never true"
    ],
    "a": 1,
    "cat": "structure",
    "type": "asn",
    "explain": "Heap order ≠ sorted order; e.g. [3,1,2,3,3,2,3] becomes [1,3,2,3,3,2,3], still unsorted.",
    "viz": "heap",
    "id": "2026a-q2a"
  },
  {
    "q": "Michal implements a dictionary with chaining via doubly linked lists; Paz uses an AVL tree in each bucket and claims worst-case search becomes Θ(log n). Michal claims Paz’s design worsens worst-case insert/delete versus her lists. Is Michal right?",
    "c": [
      "True",
      "False"
    ],
    "a": 0,
    "cat": "structure",
    "type": "tf",
    "explain": "Per-bucket AVL insert/delete cost O(log n) worst-case vs O(1) at the head of a list.",
    "viz": "hash",
    "id": "2025a-q3-i"
  },
  {
    "q": "A chaining hash table stores an AVL tree in each bucket. Can this support successor (next larger key in the whole dictionary) in worst-case logarithmic time?",
    "c": [
      "True",
      "False"
    ],
    "a": 1,
    "cat": "structure",
    "type": "tf",
    "explain": "Hashing destroys global key order; the successor may live in any other bucket.",
    "viz": "hash",
    "id": "2025a-q3-ii"
  },
  {
    "q": "A binary counter stored in a bit array of width k reallocates to width f(k)=2k (cost Θ(f(k))) when all bits are 1. The amortized cost of increment is Θ(1).",
    "c": [
      "True",
      "False"
    ],
    "a": 0,
    "cat": "concept",
    "type": "tf",
    "explain": "Doubling the width is rare (every Θ(2^k) increments) and bit-flip cost amortizes to O(1).",
    "viz": "hash",
    "id": "2025b-q2a"
  },
  {
    "q": "A min-heap is stored in an array; all keys are distinct and every node’s left child is smaller than its right child. Must the array be sorted?",
    "c": [
      "True",
      "False"
    ],
    "a": 1,
    "cat": "structure",
    "type": "tf",
    "explain": "Counterexample: array [1,2,10,4,5] satisfies the local left<right condition but is not sorted.",
    "viz": "heap",
    "id": "2019a-q1a"
  },
  {
    "q": "Open addressing with linear probing uses tombstones D for deletes. Let α = n/m (real keys) and α′ = (n + #tombstones)/m. After a sequence of inserts and deletes with 0 < α < 1, what is the largest possible asymptotic value of α′/α?",
    "c": [
      "Θ(1)",
      "Θ(log m)",
      "Θ(√m)",
      "Θ(m)",
      "Θ(α)",
      "Cannot tell"
    ],
    "a": 3,
    "cat": "structure",
    "type": "mcq",
    "explain": "Almost all cells can be D while few real keys remain, so α′ ≈ 1 and α ≈ 1/m ⇒ ratio Θ(m).",
    "viz": "hash",
    "id": "2025b-q3a"
  },
  {
    "q": "Which structure is preferable for a Dynamic Set ADT when the intended usage pattern is unknown?",
    "c": [
      "Unsorted array",
      "AVL tree",
      "B-tree",
      "Cannot tell"
    ],
    "a": 3,
    "cat": "structure",
    "type": "mcq",
    "explain": "Without knowing operation mix / memory / persistence needs, no single structure is universally best.",
    "viz": "bst",
    "id": "2023b-q1a"
  },
  {
    "q": "A company needs a structure supporting insert, search, and delete. Which choice is best for efficiency?",
    "c": [
      "Unsorted linked list",
      "Sorted linked list",
      "AVL tree",
      "Not enough information about the company’s needs"
    ],
    "a": 3,
    "cat": "structure",
    "type": "mcq",
    "explain": "Efficiency depends on operation frequencies, n, memory, and worst-case vs expected needs.",
    "viz": "bst",
    "id": "2019a-q1d"
  },
  {
    "q": "G is undirected, connected, and weighted. Edge e is a light edge across some cut C (w(e) ≤ w(e′) for every e′ crossing C). Which claim is always true?",
    "c": [
      "Every MST of G contains e",
      "Some MST of G contains e",
      "Some MST of G does not contain e",
      "No MST of G contains e"
    ],
    "a": 1,
    "cat": "algorithm",
    "type": "mcq",
    "explain": "Cut / safe-edge property: a light crossing edge belongs to some MST (ties may exclude it from others).",
    "viz": "graph",
    "id": "2021b-q1c"
  },
  {
    "q": "Let f(n) be the maximum, over all n-node AVL trees, of the absolute difference between depths of two leaves. Which is correct?",
    "c": [
      "f(n) = 0 for all n ≥ 2",
      "f(n) = 1 for all n ≥ 3",
      "f(n) = 2 for all n ≥ 4",
      "f(n) ∈ Θ(log log n)",
      "f(n) ∈ Θ(log n)",
      "f(n) ∈ Θ(n)"
    ],
    "a": 4,
    "cat": "structure",
    "type": "mcq",
    "explain": "AVL height is Θ(log n) and shallow vs deep leaves can differ by Θ(log n).",
    "viz": "bst",
    "id": "2022b-q1a"
  },
  {
    "q": "Sort n integers, each with L = (log n)^{3/2} bits in base 2. Which learned algorithm is best in the worst case?",
    "c": [
      "Merge sort",
      "Heap sort",
      "Radix sort",
      "Insertion sort"
    ],
    "a": 2,
    "cat": "algorithm",
    "type": "mcq",
    "explain": "Radix sort is O((n + Σ)L) with small L relative to n; here it beats comparison Θ(n log n).",
    "viz": "sort",
    "id": "2022a-q2a"
  },
  {
    "q": "Sort n integers, each with L = (log n)³ bits in base 2. Which learned algorithm is best in the worst case?",
    "c": [
      "Radix sort",
      "Merge sort",
      "Counting sort",
      "Bucket sort"
    ],
    "a": 1,
    "cat": "algorithm",
    "type": "mcq",
    "explain": "With L = (log n)³, radix sort costs Θ(n L) = Θ(n (log n)³), which is slower than comparison sorting; merge sort is Θ(n log n).",
    "viz": "sort",
    "id": "2022a-q2b"
  },
  {
    "q": "Compress S = acacbacba with LZ78. How many pairs are in the encoding?",
    "c": [
      "3",
      "4",
      "5",
      "6",
      "7"
    ],
    "a": 3,
    "cat": "concept",
    "type": "mcq",
    "explain": "LZ78 emits six phrases for this string (dictionary grows a, c, ac, b, acb, …).",
    "viz": "sort",
    "id": "2018a-q1-1"
  },
  {
    "q": "Minimum time to compute a·b for nonnegative integers without using multiplication (other ops allowed). Assume a ≤ b and b = 2^k for integer k > 0.",
    "c": [
      "O(1)",
      "O(log b)",
      "O(√b)",
      "O(b)",
      "O(b²)"
    ],
    "a": 1,
    "cat": "complexity",
    "type": "mcq",
    "explain": "Since b is a power of two, multiply by doubling / bit shifts in O(log b) additions.",
    "viz": "sort",
    "id": "2018a-q1-2"
  },
  {
    "q": "In an AVL tree of height h, what is the minimum possible depth of a leaf (exact, not asymptotic)?",
    "c": [
      "0",
      "1",
      "⌊h/2⌋",
      "⌈h/2⌉",
      "h − 1"
    ],
    "a": 3,
    "cat": "structure",
    "type": "mcq",
    "explain": "Balance forces the shallowest leaf depth to be ⌈h/2⌉ (e.g. h=2 → 1, h=3 → 2).",
    "viz": "bst",
    "id": "2025c-q2"
  },
  {
    "q": "Bucket sort on an array of n keys; each bucket sorted by insertion sort. Keys are NOT assumed uniform on [0,1]. Which statements are always true?\n(I) whole sort is O(n²) worst-case\n(II) buckets can be sorted so the algorithm is stable\n(III) whole sort is Θ(n) worst-case",
    "c": [
      "I only",
      "II only",
      "I and II only",
      "I, II, and III",
      "III only"
    ],
    "a": 2,
    "cat": "algorithm",
    "type": "mcq",
    "explain": "Without uniformity, one bucket can hold Θ(n) keys ⇒ O(n²); stability is achievable; Θ(n) worst-case is false.",
    "viz": "sort",
    "id": "2025c-q3"
  },
  {
    "q": "Best worst-case time to implement DeleteLast (undo the previous insert; never two DeleteLast in a row) on a chaining hash table with singly linked lists (no rehashing), allowing O(1) extra fields and changing insert?",
    "c": [
      "Θ(1)",
      "Θ(α)",
      "Θ(log n)",
      "Θ(n)"
    ],
    "a": 0,
    "cat": "structure",
    "type": "mcq",
    "explain": "Keep a pointer to the list that received the last insert and delete from that list’s head in O(1).",
    "viz": "hash",
    "id": "2024a-q1a"
  },
  {
    "q": "Chaining hash table, inserts only, rehash to size 2m when α=1. Rehash work S costs 2m ops with a “smart array” (no null init). In deamortization, how many ops of S must each insert perform so the new table is ready when needed?",
    "c": [
      "1",
      "2",
      "4",
      "8"
    ],
    "a": 2,
    "cat": "concept",
    "type": "mcq",
    "explain": "Exactly 4 operations from S per insert with the smart array (no null-init cost).",
    "viz": "hash",
    "id": "2023b-q1b"
  },
  {
    "q": "Sort n integers where all but k keys lie in [0, n^{4.5}]; the other k keys are arbitrary. Best worst-case time of the split–sort–merge algorithm when k = n/3?",
    "c": [
      "Θ(n)",
      "Θ(n log log n)",
      "Θ(n log n)",
      "Θ(n²)"
    ],
    "a": 2,
    "cat": "algorithm",
    "type": "mcq",
    "explain": "The Θ(n) keys in range can be radix/counting-sorted in Θ(n), but sorting k=n/3 arbitrary keys needs Θ(n log n).",
    "viz": "sort",
    "id": "2025b-q4e"
  },
  {
    "q": "LZ78 encoding of T = aacbacaa. Which encoding is correct?",
    "c": [
      "(0,a)(0,a)(0,c)(0,b)(0,a)(0,c)(0,a)(0,a)",
      "(0,a)(1,c)(0,b)(2,a)(1,*)",
      "(0,a)(1,a)(0,c)(0,b)(2,a)",
      "(0,a)(0,c)(1,b)(2,a)(3,a)"
    ],
    "a": 1,
    "cat": "concept",
    "type": "mcq",
    "explain": "LZ78 emits (0,a)(1,c)(0,b)(2,a)(1,*).",
    "viz": "sort",
    "id": "2021b-q1a"
  }
];
