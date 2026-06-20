/**
 * 忒修斯之船 — 资源预下载器 v2
 * 动态获取文件大小，进度条准确
 * 支持跳过预下载直接进入游戏
 */
(function () {
  'use strict';

  // 预下载资源URL列表
  var RESOURCES = [
    // 音频
    'audio/crash.mp3',
    'music/sfx/arrow.mp3',
    'music/sfx/birds.mp3',
    'music/sfx/campfire.mp3',
    'music/sfx/flesh.mp3',
    'music/sfx/footsteps.mp3',
    'music/sfx/gentleSad.mp3',
    'music/sfx/grow.mp3',
    'music/sfx/heartbeat.mp3',
    'music/sfx/hit.mp3',
    'music/sfx/lowFlat.mp3',
    'music/sfx/monster.mp3',
    'music/sfx/monsterS.mp3',
    'music/sfx/musicbox.mp3',
    'music/sfx/musicbox_full.mp3',
    'music/sfx/quirky.mp3',
    'music/sfx/rain.mp3',
    'music/sfx/sadBgm.mp3',
    'music/sfx/sadFail.mp3',
    'music/sfx/tinnitus.mp3',
    // 图片
    'images/title/bg.webp',
    'images/title/btn.webp',
    'images/title/illust.webp',
    'images/title/panel_bg.webp',
    'images/title/panel_btn.webp',
    'images/title/slot_bg.webp',
    'images/title/slot_btn.webp',
    'images/title/title.webp',
    'images/accident.webp',
    'images/broken_tree.webp',
    'images/cabin_exterior.webp',
    'images/cabin_inside.webp',
    'images/campfire_bg.webp',
    'images/cave.webp',
    'images/char_daughter.webp',
    'images/char_father.webp',
    'images/char_mother.webp',
    'images/char_mother_cold.webp',
    'images/char_mumu.webp',
    'images/char_oldman.webp',
    'images/char_rabbit.webp',
    'images/ending_bad1.webp',
    'images/ending_bad2.webp',
    'images/ending_end3.webp',
    'images/ending_oe.webp',
    'images/ending_true.webp',
    'images/fog.webp',
    'images/forest_escape.webp',
    'images/gallery_bg.webp',
    'images/gallery_slot1.webp',
    'images/gallery_slot2.webp',
    'images/gallery_slot3.webp',
    'images/gallery_slot4.webp',
    'images/gallery_slot5.webp',
    'images/morning_forest2.webp',
    'images/grain.png',
    // 字体
    'font/HuiWenMingChao-subset.woff2',
    // 游戏页面
    'game.html'
  ];

  var CONCURRENCY = 6;
  var loadedSize = 0;
  var totalSize = 0;
  var skipped = false;

  // 格式化大小
  function fmt(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // 更新进度UI
  function updateProgress(currentFile) {
    if (skipped) return;
    var percent = totalSize > 0 ? Math.min(100, Math.round((loadedSize / totalSize) * 100)) : 0;
    var bar = document.getElementById('progress-bar');
    var percentEl = document.getElementById('percent');
    var fileEl = document.getElementById('current-file');
    var sizeEl = document.getElementById('size-info');
    if (bar) bar.style.width = percent + '%';
    if (percentEl) percentEl.textContent = percent + '%';
    if (fileEl && currentFile) fileEl.textContent = currentFile;
    if (sizeEl) sizeEl.textContent = fmt(loadedSize) + ' / ' + fmt(totalSize);
  }

  // 跳过预下载
  function skipPreload() {
    skipped = true;
    var statusEl = document.getElementById('status-text');
    var skipBtn = document.getElementById('skip-btn');
    if (statusEl) statusEl.textContent = '正在进入游戏...';
    if (skipBtn) skipBtn.style.display = 'none';
    window.location.href = 'game.html';
  }

  // 下载单个文件
  function downloadFile(url) {
    return fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
        var reader = response.body.getReader();

        function readChunk() {
          if (skipped) return;
          return reader.read().then(function (result) {
            if (result.done) return;
            loadedSize += result.value.length;
            updateProgress(url);
            return readChunk();
          });
        }
        return readChunk();
      })
      .catch(function (error) {
        console.warn('下载失败:', url, error.message);
      });
  }

  // 第一阶段：HEAD请求获取所有文件大小
  function fetchSizes() {
    var statusEl = document.getElementById('status-text');
    if (statusEl) statusEl.textContent = '正在获取资源信息...';

    var promises = RESOURCES.map(function (url) {
      return fetch(url, { method: 'HEAD' })
        .then(function (res) {
          var len = parseInt(res.headers.get('Content-Length') || '0', 10);
          return { url: url, size: len };
        })
        .catch(function () {
          return { url: url, size: 0 };
        });
    });

    return Promise.all(promises).then(function (results) {
      for (var i = 0; i < results.length; i++) {
        totalSize += results[i].size;
      }
      return results;
    });
  }

  // 第二阶段：并行下载
  function downloadAll(fileInfos) {
    var queue = fileInfos.slice();

    function worker() {
      if (skipped || queue.length === 0) return Promise.resolve();
      var item = queue.shift();
      return downloadFile(item.url).then(worker);
    }

    var workers = [];
    for (var i = 0; i < CONCURRENCY; i++) {
      workers.push(worker());
    }
    return Promise.all(workers);
  }

  // 启动
  function start() {
    var skipBtn = document.getElementById('skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', function (e) {
        e.preventDefault();
        skipPreload();
      });
    }

    fetchSizes()
      .then(function (fileInfos) {
        if (skipped) return;
        var statusEl = document.getElementById('status-text');
        if (statusEl) statusEl.textContent = '';
        updateProgress('开始下载...');
        return downloadAll(fileInfos);
      })
      .then(function () {
        if (skipped) return;
        var bar = document.getElementById('progress-bar');
        var percentEl = document.getElementById('percent');
        var fileEl = document.getElementById('current-file');
        var statusEl = document.getElementById('status-text');
        var skipBtn = document.getElementById('skip-btn');
        if (bar) bar.style.width = '100%';
        if (percentEl) percentEl.textContent = '100%';
        if (fileEl) fileEl.textContent = '';
        if (statusEl) statusEl.textContent = '加载完成，正在进入游戏...';
        if (skipBtn) skipBtn.style.display = 'none';
        setTimeout(function () {
          if (!skipped) window.location.href = 'game.html';
        }, 600);
      })
      .catch(function () {
        if (skipped) return;
        var statusEl = document.getElementById('status-text');
        if (statusEl) statusEl.textContent = '正在进入游戏...';
        setTimeout(function () {
          if (!skipped) window.location.href = 'game.html';
        }, 1000);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
