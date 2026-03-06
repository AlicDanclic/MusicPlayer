/**
 * video.js - B站视频播放模块（独立版）
 * 依赖：window.electronAPI, window.BVCodec, DPlayer, Hls
 * 在 index.html 中需在 app.js 之后引入
 */

(function() {
  // ==================== 内部状态 ====================
  let biliPlayer = null;
  let biliPlaylist = []; // 存储视频对象 { bvid, title, cover, cid, pages }
  let currentBiliIndex = -1;
  let currentBiliCid = null;

  const BILI_PLAYLIST_KEY = 'bilibiliPlaylist';

  // ==================== 工具函数 ====================
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showNotification(message) {
    const n = document.createElement('div');
    n.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:12px 24px;border-radius:24px;font-size:14px;z-index:10000;animation:fadeIn 0.3s ease;';
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => {
      n.style.opacity = '0';
      n.style.transition = 'opacity 0.3s ease';
      setTimeout(() => n.remove(), 300);
    }, 2000);
  }

  function showLoading(show) {
    let mask = document.getElementById('biliLoadingMask');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'biliLoadingMask';
      mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;gap:20px;z-index:1000;';
      mask.innerHTML = '<div class="spinner" style="width:50px;height:50px;border:3px solid #333;border-top-color:#ec4141;border-radius:50%;animation:spin 1s linear infinite;"></div><p style="color:#b0b0b0;">正在加载视频...</p>';
      document.body.appendChild(mask);
    }
    mask.style.display = show ? 'flex' : 'none';
  }

  // 添加CSS动画
  if (!document.querySelector('#bili-style')) {
    const style = document.createElement('style');
    style.id = 'bili-style';
    style.textContent = `
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
    `;
    document.head.appendChild(style);
  }

  // ==================== 核心功能 ====================

  // 加载存储的播放列表
  function loadBiliPlaylist() {
    try {
      const data = localStorage.getItem(BILI_PLAYLIST_KEY);
      if (data) {
        biliPlaylist = JSON.parse(data);
        renderBiliPlaylist();
      }
    } catch (e) {}
  }

  // 保存播放列表
  function saveBiliPlaylist() {
    localStorage.setItem(BILI_PLAYLIST_KEY, JSON.stringify(biliPlaylist));
  }

  // 渲染播放列表
  function renderBiliPlaylist() {
    const container = document.getElementById('biliPlaylist');
    if (!container) return;
    if (biliPlaylist.length === 0) {
      container.innerHTML = '<div class="empty-playlist" style="padding: 20px; text-align: center; color: var(--text-tertiary);">暂无视频</div>';
      return;
    }
    container.innerHTML = biliPlaylist.map((item, idx) => {
      const isActive = idx === currentBiliIndex;
      return `
        <div class="playlist-item ${isActive ? 'active' : ''}" data-index="${idx}" style="display: flex; align-items: center; gap: 12px; padding: 10px; cursor: pointer; border-bottom: 1px solid var(--border-color);">
          <span style="color: var(--text-tertiary); width: 30px;">${idx+1}</span>
          <img src="${item.cover}" style="width: 40px; height: 25px; object-fit: cover; border-radius: 4px;">
          <div style="flex: 1; overflow: hidden;">
            <div style="font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.title)}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${item.bvid}</div>
          </div>
          <button class="action-btn remove-bili-item" data-index="${idx}" title="从列表移除" style="flex-shrink: 0;">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.remove-bili-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        removeFromBiliPlaylist(idx);
      });
    });

    container.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.remove-bili-item')) return;
        const idx = parseInt(item.dataset.index);
        playBiliVideo(idx);
      });
    });
  }

  // 添加到播放列表
  function addToBiliPlaylist(videoInfo) {
    const exists = biliPlaylist.some(v => v.bvid === videoInfo.bvid);
    if (exists) {
      showNotification('该视频已在列表中');
      return;
    }
    biliPlaylist.push({
      bvid: videoInfo.bvid,
      title: videoInfo.title,
      cover: videoInfo.pic,
      duration: videoInfo.duration,
      pages: videoInfo.pages,
      cid: videoInfo.cid || (videoInfo.pages ? videoInfo.pages[0].cid : null)
    });
    saveBiliPlaylist();
    renderBiliPlaylist();
    showNotification('已添加到播放列表');
  }

  // 从播放列表移除
  function removeFromBiliPlaylist(index) {
    biliPlaylist.splice(index, 1);
    if (currentBiliIndex === index) {
      if (biliPlayer) {
        biliPlayer.destroy();
        biliPlayer = null;
      }
      currentBiliIndex = -1;
      document.getElementById('videoInfoCard').style.display = 'none';
    } else if (currentBiliIndex > index) {
      currentBiliIndex--;
    }
    saveBiliPlaylist();
    renderBiliPlaylist();
  }

  // 清空播放列表
  function clearBiliPlaylist() {
    biliPlaylist = [];
    currentBiliIndex = -1;
    if (biliPlayer) {
      biliPlayer.destroy();
      biliPlayer = null;
    }
    document.getElementById('videoInfoCard').style.display = 'none';
    saveBiliPlaylist();
    renderBiliPlaylist();
  }

  // 播放指定索引的视频
  async function playBiliVideo(index) {
    if (index < 0 || index >= biliPlaylist.length) return;
    const video = biliPlaylist[index];
    currentBiliIndex = index;
    currentBiliCid = video.cid;

    try {
      showLoading(true);
      const infoRes = await window.electronAPI.bilibiliGetVideoInfo({ bvid: video.bvid });
      if (!infoRes.success) throw new Error(infoRes.error);
      const data = infoRes.data;

      document.getElementById('videoCover').src = data.pic;
      document.getElementById('videoTitle').textContent = data.title;
      document.getElementById('videoOwner').textContent = data.owner.name;
      document.getElementById('videoDesc').textContent = data.desc || '暂无简介';
      document.getElementById('videoInfoCard').style.display = 'block';

      const pageSelect = document.getElementById('pageSelect');
      if (data.pages && data.pages.length > 1) {
        pageSelect.innerHTML = data.pages.map((p, i) => `<option value="${p.cid}">P${i+1} ${p.part}</option>`).join('');
        pageSelect.disabled = false;
        pageSelect.value = currentBiliCid || data.pages[0].cid;
      } else {
        pageSelect.innerHTML = '<option value="">单P</option>';
        pageSelect.disabled = true;
        currentBiliCid = data.cid;
      }

      await loadBiliVideo(video.bvid, currentBiliCid);
      renderBiliPlaylist();
    } catch (error) {
      showNotification('播放失败: ' + error.message);
    } finally {
      showLoading(false);
    }
  }

  // 加载视频流
  async function loadBiliVideo(bvid, cid) {
    const qn = parseInt(document.getElementById('qualitySelect').value, 10);
    const res = await window.electronAPI.bilibiliGetPlayUrl({ bvid, cid, qn });
    if (!res.success) throw new Error(res.error);
    const data = res.data;

    if (!biliPlayer) {
      biliPlayer = new DPlayer({
        container: document.getElementById('dplayer'),
        autoplay: true,
        theme: '#ec4141',
        screenshot: true,
        lang: 'zh-cn',
        video: {}
      });
    }

    if (data.dash) {
      const videoStream = data.dash.video.sort((a, b) => b.id - a.id)[0];
      const videoUrl = videoStream.baseUrl || videoStream.base_url;

      // 使用 HLS.js 处理 DASH 视频流
      biliPlayer.switchVideo({
        url: videoUrl,
        type: 'customHls',
        customType: {
          customHls: function (video, player) {
            const hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(video);
          }
        }
      });
      // 音频流暂不处理（简化）
    } else if (data.durl) {
      biliPlayer.switchVideo({
        url: data.durl[0].url,
        type: 'auto'
      });
    } else {
      throw new Error('不支持的视频格式');
    }

    biliPlayer.on('ended', () => {
      playNextBili();
    });
  }

  function playNextBili() {
    if (biliPlaylist.length === 0) return;
    let nextIndex = currentBiliIndex + 1;
    if (nextIndex >= biliPlaylist.length) nextIndex = 0;
    playBiliVideo(nextIndex);
  }

  function playPrevBili() {
    if (biliPlaylist.length === 0) return;
    let prevIndex = currentBiliIndex - 1;
    if (prevIndex < 0) prevIndex = biliPlaylist.length - 1;
    playBiliVideo(prevIndex);
  }

  // ==================== 初始化事件 ====================
  function initBiliEvents() {
    const loadBtn = document.getElementById('loadVideoBtn');
    const bvInput = document.getElementById('bvInput');
    const qualitySelect = document.getElementById('qualitySelect');
    const pageSelect = document.getElementById('pageSelect');
    const clearBtn = document.getElementById('clearBiliPlaylistBtn');

    if (!loadBtn || !bvInput) return;

    loadBtn.addEventListener('click', async () => {
      const input = bvInput.value.trim();
      if (!input) return;
      try {
        const { bvid } = BVCodec.parseVideoId(input);
        const res = await window.electronAPI.bilibiliGetVideoInfo({ bvid });
        if (!res.success) throw new Error(res.error);
        addToBiliPlaylist(res.data);
        playBiliVideo(biliPlaylist.length - 1);
      } catch (error) {
        showNotification('加载失败: ' + error.message);
      }
    });

    bvInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loadBtn.click();
    });

    qualitySelect.addEventListener('change', () => {
      if (currentBiliIndex !== -1 && currentBiliCid) {
        const video = biliPlaylist[currentBiliIndex];
        loadBiliVideo(video.bvid, currentBiliCid);
      }
    });

    pageSelect.addEventListener('change', (e) => {
      if (currentBiliIndex !== -1) {
        currentBiliCid = parseInt(e.target.value, 10);
        const video = biliPlaylist[currentBiliIndex];
        loadBiliVideo(video.bvid, currentBiliCid);
      }
    });

    clearBtn.addEventListener('click', clearBiliPlaylist);
  }

  // 公共API（可选）
  window.BiliPlayer = {
    playNext: playNextBili,
    playPrev: playPrevBili,
    addVideo: addToBiliPlaylist,
    clearPlaylist: clearBiliPlaylist
  };

  // 当DOM加载完成后初始化
  document.addEventListener('DOMContentLoaded', () => {
    loadBiliPlaylist();
    initBiliEvents();
  });

})();