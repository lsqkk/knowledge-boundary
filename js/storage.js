// storage.js · localStorage 持久化
// 每答一题即保存，刷新/误关不丢进度。
window.KBStorage = (function () {
  var KEY = "kb_quiz_v1";

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* 存储满/隐私模式时静默失败，不阻断答题 */
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  return { load: load, save: save, clear: clear };
})();
