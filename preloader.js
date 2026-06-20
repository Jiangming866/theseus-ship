/**
 * 忒修斯之船 — 轻量预下载器 v3
 * 只下载 game.html 本身 + 8张标题页图
 * 完成后立即跳转，游戏的 preloadCritical 负责精确进度
 * 其余资源在游戏内按需加载（与原始行为一致）
 */
(function () {
  'use strict';

  // 只预下载标题页关键资源 + game.html
  var CRITICAL = [
    'images/title/bg.webp',
    'images/title/btn.webp',
    'images/title/illust.webp',
    'images/title/panel_bg.webp',
    'images/title/panel_btn.webp',
    'images/title/slot_bg.webp',
    'images/title/slot_btn.webp',
    'images/title/title.webp',
    'game.html'
  ];

  var CONCURRENCY = 4;
  var totalCritical = CRITICAL.length;
  var loadedCount = 0;
  var finished = false;

  function fmt(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function updateProgress() {
    var pct = Math.round((loadedCount / totalCritical) * 100);
    var bar = document.getElementById('progress-bar');
    var pctEl = document.getElementById('percent');
    var statEl = document.getElementById('status-text');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (statEl) statEl.textContent = '正在准备...';
  }

  function enterGame() {
    if (finished) return;
    finished = true;
    var bar = document.getElementById('progress-bar');
    var pctEl = document.getElementById('percent');
    var statEl = document.getElementById('status-text');
    if (bar) bar.style.width = '100%';
    if (pctEl) pctEl.textContent = '100%';
    if (statEl) statEl.textContent = '即将进入游戏...';
    window.location.href = 'game.html';
  }

  function downloadOne(url) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        // 消费 body 确保写入 HTTP 缓存
        return res.blob();
      })
      .then(function () {
        loadedCount++;
        updateProgress();
      })
      .catch(function (e) {
        // 某文件失败不阻塞，继续
        console.warn('预加载跳过:', url, e.message);
        loadedCount++;
        updateProgress();
      });
  }

  function start() {
    var queue = CRITICAL.slice();

    function worker() {
      if (queue.length === 0) return Promise.resolve();
      return downloadOne(queue.shift()).then(worker);
    }

    var workers = [];
    for (var i = 0; i < CONCURRENCY; i++) {
      workers.push(worker());
    }

    Promise.all(workers).then(function () {
      // 所有关键资源下载完成
      var statEl = document.getElementById('status-text');
      if (statEl) statEl.textContent = '即将进入游戏...';
      setTimeout(enterGame, 300);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
