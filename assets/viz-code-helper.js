/* Shared pseudocode line renderer for animator panels — visible indentation. */
window.renderVizCodeLines = function (box, lines) {
  var INDENT_PX = 26;
  var BASE_PX = 14;
  var els = [];
  box.innerHTML = '';
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    var lead = 0;
    while (lead < raw.length && raw.charAt(lead) === ' ') lead++;
    var level = Math.floor(lead / 2);
    var d = document.createElement('div');
    d.className = 'ln' + (level ? ' is-indent' : '');
    if (level) {
      d.setAttribute('data-indent', String(level));
      d.style.setProperty('--indent-level', String(level));
    }
    d.style.paddingLeft = (BASE_PX + level * INDENT_PX) + 'px';
    d.innerHTML = raw.slice(lead);
    box.appendChild(d);
    els.push(d);
  }
  return els;
};
