/* Persist exam checklist checkboxes on 08-exam.html */
(function () {
  var KEY = 'ds-exam-checklist-v1';
  var root = document.querySelector('.exam-checklist-card');
  if (!root) return;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function updateYearProgress() {
    root.querySelectorAll('.exam-check-year').forEach(function (year) {
      var prog = year.querySelector('.exam-check-year-prog');
      if (!prog) return;
      var items = year.querySelectorAll('.exam-check-item');
      var done = 0;
      items.forEach(function (item) {
        var cb = item.querySelector('input[type="checkbox"]');
        if (cb && cb.checked) done++;
      });
      prog.textContent = done + '/' + items.length;
    });
  }

  function updateProgress() {
    var items = root.querySelectorAll('.exam-check-item');
    var done = 0;
    items.forEach(function (item) {
      var cb = item.querySelector('input[type="checkbox"]');
      if (cb && cb.checked) {
        done++;
        item.classList.add('is-done');
      } else {
        item.classList.remove('is-done');
      }
    });
    var doneEl = document.getElementById('exam-check-done');
    var totalEl = document.getElementById('exam-check-total');
    if (doneEl) doneEl.textContent = String(done);
    if (totalEl) totalEl.textContent = String(items.length);
    updateYearProgress();
  }

  var state = load();
  root.querySelectorAll('.exam-check-item').forEach(function (item) {
    var id = item.getAttribute('data-exam');
    var cb = item.querySelector('input[type="checkbox"]');
    if (!id || !cb) return;
    cb.checked = !!state[id];
    cb.addEventListener('change', function () {
      state[id] = cb.checked;
      save(state);
      updateProgress();
    });
    item.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (e) { e.stopPropagation(); });
    });
  });

  var resetBtn = document.getElementById('exam-check-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!confirm('Clear all exam checkmarks?')) return;
      state = {};
      save(state);
      root.querySelectorAll('.exam-check-item input[type="checkbox"]').forEach(function (cb) {
        cb.checked = false;
      });
      updateProgress();
    });
  }

  var expandBtn = document.getElementById('exam-check-expand');
  if (expandBtn) {
    expandBtn.addEventListener('click', function () {
      root.querySelectorAll('.exam-check-year').forEach(function (el) {
        el.open = true;
      });
    });
  }

  var collapseBtn = document.getElementById('exam-check-collapse');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', function () {
      root.querySelectorAll('.exam-check-year').forEach(function (el) {
        el.open = false;
      });
    });
  }

  updateProgress();
})();
