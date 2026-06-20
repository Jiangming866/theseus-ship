/**
 * 忒修斯之船 — 资源预下载器
 * 在游戏开始前下载所有资源到浏览器HTTP缓存
 * 下载完成后自动跳转到 game.html
 */
(function () {
  'use strict';

  // 预下载资源列表（URL + 预估大小，字节）
  var RESOURCES = [
    // 音频（约13.5MB）
    { url: 'audio/crash.mp3', size: 416256 },
    { url: 'music/sfx/arrow.mp3', size: 5939 },
    { url: 'music/sfx/birds.mp3', size: 4650504 },
    { url: 'music/sfx/campfire.mp3', size: 960307 },
    { url: 'music/sfx/flesh.mp3', size: 13824 },
    { url: 'music/sfx/footsteps.mp3', size: 71475 },
    { url: 'music/sfx/gentleSad.mp3', size: 985005 },
    { url: 'music/sfx/grow.mp3', size: 26214 },
    { url: 'music/sfx/heartbeat.mp3', size: 512410 },
    { url: 'music/sfx/hit.mp3', size: 17408 },
    { url: 'music/sfx/lowFlat.mp3', size: 1284096 },
    { url: 'music/sfx/monster.mp3', size: 192922 },
    { url: 'music/sfx/monsterS.mp3', size: 25907 },
    { url: 'music/sfx/musicbox.mp3', size: 756326 },
    { url: 'music/sfx/musicbox_full.mp3', size: 1530163 },
    { url: 'music/sfx/quirky.mp3', size: 820122 },
    { url: 'music/sfx/rain.mp3', size: 162611 },
    { url: 'music/sfx/sadBgm.mp3', size: 1245901 },
    { url: 'music/sfx/sadFail.mp3', size: 780390 },
    { url: 'music/sfx/tinnitus.mp3', size: 95949 },
    // 图片（约2.7MB）
    { url: 'images/title/bg.webp', size: 4813 },
    { url: 'images/title/btn.webp', size: 512 },
    { url: 'images/title/illust.webp', size: 70861 },
    { url: 'images/title/panel_bg.webp', size: 4813 },
    { url: 'images/title/panel_btn.webp', size: 819 },
    { url: 'images/title/slot_bg.webp', size: 1638 },
    { url: 'images/title/slot_btn.webp', size: 819 },
    { url: 'images/title/title.webp', size: 7475 },
    { url: 'images/accident.webp', size: 296448 },
    { url: 'images/broken_tree.webp', size: 193638 },
    { url: 'images/cabin_exterior.webp', size: 128717 },
    { url: 'images/cabin_inside.webp', size: 108032 },
    { url: 'images/campfire_bg.webp', size: 54784 },
    { url: 'images/cave.webp', size: 370074 },
    { url: 'images/char_daughter.webp', size: 65638 },
    { url: 'images/char_father.webp', size: 128410 },
    { url: 'images/char_mother.webp', size: 185651 },
    { url: 'images/char_mother_cold.webp', size: 185651 },
    { url: 'images/char_mumu.webp', size: 50176 },
    { url: 'images/char_oldman.webp', size: 62566 },
    { url: 'images/char_rabbit.webp', size: 218010 },
    { url: 'images/ending_bad1.webp', size: 103322 },
    { url: 'images/ending_bad2.webp', size: 124211 },
    { url: 'images/ending_end3.webp', size: 56832 },
    { url: 'images/ending_oe.webp', size: 86016 },
    { url: 'images/ending_true.webp', size: 170394 },
    { url: 'images/fog.webp', size: 108237 },
    { url: 'images/forest_escape.webp', size: 97587 },
    { url: 'images/gallery_bg.webp', size: 4813 },
    { url: 'images/gallery_slot1.webp', size: 1331 },
    { url: 'images/gallery_slot2.webp', size: 1331 },
    { url: 'images/gallery_slot3.webp', size: 1229 },
    { url: 'images/gallery_slot4.webp', size: 1229 },
    { url: 'images/gallery_slot5.webp', size: 1741 },
    { url: 'images/morning_forest2.webp', size: 177049 },
    // 字体（约0.5MB）
    { url: 'font/HuiWenMingChao-subset.woff2', size: 565760 },
    // 游戏页面
    { url: 'game.html', size: 106496 }
  ];

  var TOTAL_SIZE = 0;
  var loadedSize = 0;
  var CONCURRENCY = 4;

  // 计算总大小
  for (var i = 0; i < RESOURCES.length; i++) {
    TOTAL_SIZE += RESOURCES[i].size;
  }

  // 格式化大小
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // 更新进度UI
  function updateProgress(currentFile) {
    var percent = Math.min(100, Math.round((loadedSize / TOTAL_SIZE) * 100));
    var bar = document.getElementById('progress-bar');
    var percentEl = document.getElementById('percent');
    var fileEl = document.getElementById('current-file');
    var sizeEl = document.getElementById('size-info');

    if (bar) bar.style.width = percent + '%';
    if (percentEl) percentEl.textContent = percent + '%';
    if (fileEl && currentFile) fileEl.textContent = currentFile;
    if (sizeEl) sizeEl.textContent = formatSize(loadedSize) + ' / ' + formatSize(TOTAL_SIZE);
  }

  // 下载单个文件（带字节级进度追踪）
  function downloadFile(resource) {
    return fetch(resource.url)
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);

        // 用 ReadableStream 追踪下载进度
        var reader = response.body.getReader();

        function readChunk() {
          return reader.read().then(function (result) {
            if (result.done) return;
            loadedSize += result.value.length;
            updateProgress(resource.url);
            return readChunk();
          });
        }

        return readChunk();
      })
      .catch(function (error) {
        // 单个文件失败不阻塞，用预估大小补上进度
        console.warn('预下载失败:', resource.url, error.message);
        loadedSize += resource.size;
        updateProgress(resource.url + ' (跳过)');
      });
  }

  // 并行下载所有资源
  function startPreload() {
    updateProgress('准备下载...');

    var queue = RESOURCES.slice();

    // 创建 CONCURRENCY 个工作协程，从队列中取任务
    function worker() {
      if (queue.length === 0) return Promise.resolve();
      var resource = queue.shift();
      return downloadFile(resource).then(worker);
    }

    var workers = [];
    for (var i = 0; i < CONCURRENCY; i++) {
      workers.push(worker());
    }

    Promise.all(workers)
      .then(function () {
        // 全部完成
        var bar = document.getElementById('progress-bar');
        var percentEl = document.getElementById('percent');
        var fileEl = document.getElementById('current-file');
        var statusEl = document.getElementById('status-text');
        if (bar) bar.style.width = '100%';
        if (percentEl) percentEl.textContent = '100%';
        if (fileEl) fileEl.textContent = '';
        if (statusEl) statusEl.textContent = '加载完成，正在进入游戏...';

        // 短暂延迟后跳转
        setTimeout(function () {
          window.location.href = 'game.html';
        }, 800);
      })
      .catch(function (error) {
        console.error('预下载出错:', error);
        // 即使出错也尝试跳转到游戏
        var statusEl = document.getElementById('status-text');
        if (statusEl) statusEl.textContent = '部分资源加载失败，正在进入游戏...';
        setTimeout(function () {
          window.location.href = 'game.html';
        }, 1500);
      });
  }

  // DOM 加载后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPreload);
  } else {
    startPreload();
  }
})();
