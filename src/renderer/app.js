// ==================== 全局变量 ====================
let audioPlayer = null;
let playlist = [];
let currentIndex = -1;
let isPlaying = false;
let isDraggingProgress = false;
let lyrics = [];
let currentLyricIndex = -1;
let playMode = 'list'; // 'list', 'random', 'single'
let isLyricsWindowOpen = false;
let currentLyricPath = null;
let currentSongLyricBinding = null;
let onlineLinks = [];
let currentOnlineId = null;

const themes = ['dark', 'red', 'blue', 'purple', 'green'];
const elements = {};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  bindEvents();
  initializeAudio();
  loadPlaylistFromStorage();
  loadOnlineLinksFromStorage();
  loadThemeFromStorage();
  switchView('local');
});

function initializeElements() {
  elements.minimizeBtn = document.getElementById('minimizeBtn');
  elements.maximizeBtn = document.getElementById('maximizeBtn');
  elements.closeBtn = document.getElementById('closeBtn');
  elements.themeBtn = document.getElementById('themeBtn');
  elements.themeItems = document.querySelectorAll('.theme-item');
  elements.playBtn = document.getElementById('playBtn');
  elements.prevBtn = document.getElementById('prevBtn');
  elements.nextBtn = document.getElementById('nextBtn');
  elements.playModeBtn = document.getElementById('playModeBtn');
  elements.lyricsBtn = document.getElementById('lyricsBtn');
  elements.playIcon = document.getElementById('playIcon');
  elements.pauseIcon = document.getElementById('pauseIcon');
  elements.progressBar = document.getElementById('progressBar');
  elements.progressFill = document.getElementById('progressFill');
  elements.progressHandle = document.getElementById('progressHandle');
  elements.currentTime = document.getElementById('currentTime');
  elements.totalTime = document.getElementById('totalTime');
  elements.volumeBtn = document.getElementById('volumeBtn');
  elements.volumeSlider = document.getElementById('volumeSlider');
  elements.volumeFill = document.getElementById('volumeFill');
  elements.songCover = document.getElementById('songCover');
  elements.songName = document.getElementById('songName');
  elements.songArtist = document.getElementById('songArtist');
  elements.likeBtn = document.getElementById('likeBtn');
  elements.audioPlayer = document.getElementById('audioPlayer');
  elements.addMusicBtn = document.getElementById('addMusicBtn');
  elements.scanFolderBtn = document.getElementById('scanFolderBtn');
  elements.musicList = document.getElementById('musicList');
  elements.musicStats = document.getElementById('musicStats');
  elements.searchInput = document.getElementById('searchInput');
  elements.addOnlineBtn = document.getElementById('addOnlineBtn');
  elements.onlineList = document.getElementById('onlineList');
  elements.onlineStats = document.getElementById('onlineStats');
  elements.onlineInputModal = document.getElementById('onlineInputModal');
  elements.closeOnlineInputModal = document.getElementById('closeOnlineInputModal');
  elements.cancelOnlineInput = document.getElementById('cancelOnlineInput');
  elements.saveOnlineLink = document.getElementById('saveOnlineLink');
  elements.onlineLinkName = document.getElementById('onlineLinkName');
  elements.onlineLinkUrl = document.getElementById('onlineLinkUrl');
  elements.lyricModal = document.getElementById('lyricModal');
  elements.closeLyricModal = document.getElementById('closeLyricModal');
  elements.loadLyricBtn = document.getElementById('loadLyricBtn');
  elements.autoFindLyricBtn = document.getElementById('autoFindLyricBtn');
  elements.currentLyricFile = document.getElementById('currentLyricFile');
  elements.lyricPreview = document.getElementById('lyricPreview');
  elements.clearLyricBtn = document.getElementById('clearLyricBtn');
  elements.showDesktopLyricsBtn = document.getElementById('showDesktopLyricsBtn');
  elements.lyricStatus = document.getElementById('lyricStatus');
  elements.playlistBtn = document.getElementById('playlistBtn');
  elements.playlistSidebar = document.getElementById('playlistSidebar');
  elements.closePlaylist = document.getElementById('closePlaylist');
  elements.playlistContent = document.getElementById('playlistContent');
}

function bindEvents() {
  elements.minimizeBtn?.addEventListener('click', () => window.electronAPI.windowMinimize());
  elements.maximizeBtn?.addEventListener('click', () => window.electronAPI.windowMaximize());
  elements.closeBtn?.addEventListener('click', () => window.electronAPI.windowClose());
  elements.themeBtn?.addEventListener('click', cycleTheme);
  elements.themeItems.forEach(item => {
    item.addEventListener('click', () => setTheme(item.dataset.theme));
  });
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });
  elements.playBtn?.addEventListener('click', togglePlay);
  elements.prevBtn?.addEventListener('click', playPrevious);
  elements.nextBtn?.addEventListener('click', playNext);
  elements.playModeBtn?.addEventListener('click', togglePlayMode);
  elements.lyricsBtn?.addEventListener('click', openLyricModal);
  elements.progressBar?.addEventListener('click', seekTo);
  elements.progressBar?.addEventListener('mousedown', startDragProgress);
  document.addEventListener('mousemove', dragProgress);
  document.addEventListener('mouseup', endDragProgress);
  elements.volumeSlider?.addEventListener('click', setVolume);
  elements.volumeBtn?.addEventListener('click', toggleMute);
  elements.addMusicBtn?.addEventListener('click', addMusicFiles);
  elements.scanFolderBtn?.addEventListener('click', scanMusicFolder);
  elements.searchInput?.addEventListener('input', (e) => filterMusicList(e.target.value));
  elements.addOnlineBtn?.addEventListener('click', showOnlineInputModal);
  elements.closeOnlineInputModal?.addEventListener('click', hideOnlineInputModal);
  elements.cancelOnlineInput?.addEventListener('click', hideOnlineInputModal);
  elements.saveOnlineLink?.addEventListener('click', saveOnlineLink);
  elements.onlineInputModal?.addEventListener('click', (e) => {
    if (e.target === elements.onlineInputModal) hideOnlineInputModal();
  });
  elements.closeLyricModal?.addEventListener('click', closeLyricModal);
  elements.loadLyricBtn?.addEventListener('click', loadLyricFile);
  elements.autoFindLyricBtn?.addEventListener('click', autoFindLyric);
  elements.clearLyricBtn?.addEventListener('click', clearLyrics);
  elements.showDesktopLyricsBtn?.addEventListener('click', toggleDesktopLyrics);
  elements.playlistBtn?.addEventListener('click', togglePlaylist);
  elements.closePlaylist?.addEventListener('click', togglePlaylist);
  elements.likeBtn?.addEventListener('click', toggleLike);
  document.addEventListener('keydown', handleKeyboard);
}

function initializeAudio() {
  audioPlayer = elements.audioPlayer;
  audioPlayer.addEventListener('timeupdate', updateProgress);
  audioPlayer.addEventListener('loadedmetadata', () => {
    elements.totalTime.textContent = formatTime(audioPlayer.duration);
  });
  audioPlayer.addEventListener('ended', onSongEnded);
  audioPlayer.addEventListener('error', () => showNotification('音频播放失败'));
  audioPlayer.volume = 0.7;
}

// ==================== 视图切换 ====================
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewName + 'View');
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === viewName) item.classList.add('active');
  });
}

// ==================== 主题 ====================
function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  elements.themeItems.forEach(item => {
    item.classList.toggle('active', item.dataset.theme === theme);
  });
  localStorage.setItem('cloudMusicTheme', theme);
  if (isLyricsWindowOpen) window.electronAPI.updateLyrics({ theme });
}

function cycleTheme() {
  const current = document.body.getAttribute('data-theme') || 'dark';
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  setTheme(next);
}

function loadThemeFromStorage() {
  setTheme(localStorage.getItem('cloudMusicTheme') || 'dark');
}

// ==================== 播放控制 ====================
function togglePlay() {
  if (playlist.length === 0 && onlineLinks.length === 0) {
    showNotification('播放列表为空');
    return;
  }
  if (currentIndex === -1 && !currentOnlineId) {
    if (onlineLinks.length > 0) playOnlineLink(onlineLinks[0]);
    else if (playlist.length > 0) playSong(0);
    return;
  }
  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
    elements.playIcon.style.display = 'block';
    elements.pauseIcon.style.display = 'none';
  } else {
    audioPlayer.play();
    isPlaying = true;
    elements.playIcon.style.display = 'none';
    elements.pauseIcon.style.display = 'block';
  }
}

async function playSong(index) {
  if (index < 0 || index >= playlist.length) return;
  const song = playlist[index];
  currentOnlineId = null;
  if (song.path.startsWith('http://') || song.path.startsWith('https://')) {
    try {
      audioPlayer.src = song.path;
      audioPlayer.play();
      isPlaying = true;
      currentIndex = index;
      elements.playIcon.style.display = 'none';
      elements.pauseIcon.style.display = 'block';
      updateCurrentSongUI({ title: song.title, artist: song.artist, cover: song.cover });
      updatePlaylistUI();
    } catch (error) {
      showNotification('播放失败');
    }
    return;
  }
  try {
    const audioData = await window.electronAPI.getAudioData(song.path);
    if (audioData) {
      audioPlayer.src = audioData;
      audioPlayer.play();
      isPlaying = true;
      currentIndex = index;
      elements.playIcon.style.display = 'none';
      elements.pauseIcon.style.display = 'block';
      updateCurrentSongUI(song);
      updatePlaylistUI();
      await loadLyricForSong(song);
    }
  } catch (error) {
    showNotification('播放失败: ' + error.message);
  }
}

async function loadLyricForSong(song) {
  lyrics = [];
  currentLyricIndex = -1;
  currentLyricPath = null;
  currentSongLyricBinding = null;
  if (song.lyricPath) {
    const content = await window.electronAPI.readLyricFile(song.lyricPath);
    if (content) {
      parseLyrics(content);
      currentLyricPath = song.lyricPath;
      currentSongLyricBinding = song.lyricPath;
      return;
    }
  }
  const autoResult = await window.electronAPI.autoFindLyric(song.path);
  if (autoResult) {
    parseLyrics(autoResult.content);
    currentLyricPath = autoResult.path;
    await window.electronAPI.saveLyricBinding(song.path, autoResult.path);
    song.lyricPath = autoResult.path;
    savePlaylistToStorage();
  }
}

function playPrevious() {
  if (playlist.length === 0 && onlineLinks.length === 0) return;
  if (currentOnlineId) {
    playPrevOnline();
  } else if (currentIndex !== -1) {
    let prevIndex;
    if (playMode === 'random') {
      prevIndex = Math.floor(Math.random() * playlist.length);
    } else {
      prevIndex = currentIndex - 1;
      if (prevIndex < 0) prevIndex = playlist.length - 1;
    }
    playSong(prevIndex);
  } else {
    if (onlineLinks.length > 0) playOnlineLink(onlineLinks[0]);
    else if (playlist.length > 0) playSong(0);
  }
}

function playNext() {
  if (playlist.length === 0 && onlineLinks.length === 0) return;
  if (currentOnlineId) {
    playNextOnline();
  } else if (currentIndex !== -1) {
    let nextIndex;
    if (playMode === 'random') {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= playlist.length) nextIndex = 0;
    }
    playSong(nextIndex);
  } else {
    if (onlineLinks.length > 0) playOnlineLink(onlineLinks[0]);
    else if (playlist.length > 0) playSong(0);
  }
}

function onSongEnded() {
  if (currentOnlineId) playNextOnline();
  else if (playMode === 'single') {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
  } else playNext();
}

function togglePlayMode() {
  const modes = ['list', 'random', 'single'];
  const modeIcons = [
    '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7z"/>',
    '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>',
    '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>'
  ];
  const modeNames = ['列表循环', '随机播放', '单曲循环'];
  const currentIdx = modes.indexOf(playMode);
  playMode = modes[(currentIdx + 1) % modes.length];
  elements.playModeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">${modeIcons[(currentIdx + 1) % modes.length]}</svg>`;
  showNotification('播放模式: ' + modeNames[(currentIdx + 1) % modes.length]);
}

// ==================== 进度条 ====================
function updateProgress() {
  if (!audioPlayer || isDraggingProgress) return;
  const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  elements.progressFill.style.width = progress + '%';
  elements.progressHandle.style.left = progress + '%';
  elements.currentTime.textContent = formatTime(audioPlayer.currentTime);
  updateLyrics(audioPlayer.currentTime);
}

function seekTo(e) {
  if (!audioPlayer.duration) return;
  const rect = elements.progressBar.getBoundingClientRect();
  audioPlayer.currentTime = ((e.clientX - rect.left) / rect.width) * audioPlayer.duration;
}

function startDragProgress(e) {
  isDraggingProgress = true;
  dragProgress(e);
}

function dragProgress(e) {
  if (!isDraggingProgress) return;
  const rect = elements.progressBar.getBoundingClientRect();
  let percent = (e.clientX - rect.left) / rect.width;
  percent = Math.max(0, Math.min(1, percent));
  elements.progressFill.style.width = (percent * 100) + '%';
  elements.progressHandle.style.left = (percent * 100) + '%';
}

function endDragProgress(e) {
  if (!isDraggingProgress) return;
  isDraggingProgress = false;
  const rect = elements.progressBar.getBoundingClientRect();
  let percent = (e.clientX - rect.left) / rect.width;
  percent = Math.max(0, Math.min(1, percent));
  if (audioPlayer.duration) audioPlayer.currentTime = percent * audioPlayer.duration;
}

// ==================== 音量 ====================
function setVolume(e) {
  const rect = elements.volumeSlider.getBoundingClientRect();
  const volume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audioPlayer.volume = volume;
  elements.volumeFill.style.width = (volume * 100) + '%';
}

function toggleMute() {
  if (audioPlayer.volume > 0) {
    audioPlayer.dataset.prevVolume = audioPlayer.volume;
    audioPlayer.volume = 0;
    elements.volumeFill.style.width = '0%';
  } else {
    const prev = parseFloat(audioPlayer.dataset.prevVolume || 0.7);
    audioPlayer.volume = prev;
    elements.volumeFill.style.width = (prev * 100) + '%';
  }
}

// ==================== 本地音乐管理 ====================
async function addMusicFiles() {
  try {
    const files = await window.electronAPI.selectMusicFiles();
    if (files && files.length > 0) {
      for (const file of files) {
        if (!playlist.some(s => s.path === file.path)) playlist.push(file);
      }
      savePlaylistToStorage();
      renderMusicList();
      renderPlaylist();
      updateMusicStats();
      showNotification(`已添加 ${files.length} 首歌曲`);
    }
  } catch (error) {
    showNotification('添加音乐失败');
  }
}

async function scanMusicFolder() {
  try {
    const files = await window.electronAPI.scanMusicFolder();
    resetPlayer();
    if (files && files.length > 0) {
      playlist = files;
      savePlaylistToStorage();
      renderMusicList();
      renderPlaylist();
      updateMusicStats();
      showNotification(`扫描到 ${files.length} 首歌曲，正在自动匹配歌词...`);
      autoBindLyricsForPlaylist().then(() => {
        renderMusicList();
        renderPlaylist();
        showNotification('歌词匹配完成');
      }).catch(() => showNotification('部分歌词匹配失败'));
    } else {
      playlist = [];
      savePlaylistToStorage();
      renderMusicList();
      renderPlaylist();
      updateMusicStats();
      showNotification('未找到音乐文件，播放列表已清空');
    }
  } catch (error) {
    showNotification('扫描文件夹失败');
  }
}

function resetPlayer() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.src = '';
  }
  isPlaying = false;
  currentIndex = -1;
  currentOnlineId = null;
  elements.playIcon.style.display = 'block';
  elements.pauseIcon.style.display = 'none';
  updateCurrentSongUI({ title: '未播放', artist: '-', cover: null });
  lyrics = [];
  currentLyricIndex = -1;
  currentLyricPath = null;
  currentSongLyricBinding = null;
}

async function autoBindLyricsForPlaylist() {
  await Promise.all(playlist.map(async (song) => {
    try {
      const result = await window.electronAPI.autoFindLyric(song.path);
      if (result) {
        await window.electronAPI.saveLyricBinding(song.path, result.path);
        song.lyricPath = result.path;
      }
    } catch (e) {}
  }));
  savePlaylistToStorage();
}

function renderMusicList(filterText = '') {
  const filtered = filterText ? playlist.filter(song =>
    song.title.toLowerCase().includes(filterText.toLowerCase()) ||
    song.artist.toLowerCase().includes(filterText.toLowerCase()) ||
    song.album.toLowerCase().includes(filterText.toLowerCase())
  ) : playlist;
  if (filtered.length === 0) {
    elements.musicList.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg><p>${filterText ? '没有找到匹配的歌曲' : '暂无音乐，点击"添加音乐"或"扫描文件夹"'}</p></div>`;
    return;
  }
  elements.musicList.innerHTML = filtered.map((song, idx) => {
    const originalIndex = playlist.indexOf(song);
    const hasLyric = !!song.lyricPath;
    return `<div class="music-item ${originalIndex === currentIndex ? 'playing' : ''}" data-index="${originalIndex}">
      <span class="col-index">${originalIndex + 1}</span>
      <div class="col-title"><div class="song-cover-small">${song.cover ? `<img src="${song.cover}" alt="cover">` : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>'}</div><div class="song-title-info"><span class="title">${escapeHtml(song.title)}</span><span class="format">${song.format}</span></div></div>
      <span class="col-artist">${escapeHtml(song.artist)}</span>
      <span class="col-album">${escapeHtml(song.album)}</span>
      <span class="col-duration">${formatTime(song.duration)}</span>
      <span class="col-lyric"><span class="lyric-badge ${hasLyric ? 'has-lyric' : 'no-lyric'}">${hasLyric ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg> 已绑定' : '无歌词'}</span></span>
      <div class="col-action"><button class="action-btn play-item-btn" data-index="${originalIndex}" title="播放"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button><button class="action-btn lyric-btn" data-index="${originalIndex}" title="歌词"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></button></div>
    </div>`;
  }).join('');
  elements.musicList.querySelectorAll('.music-item').forEach(item => {
    item.addEventListener('dblclick', () => playSong(parseInt(item.dataset.index)));
  });
  elements.musicList.querySelectorAll('.play-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSong(parseInt(btn.dataset.index));
    });
  });
  elements.musicList.querySelectorAll('.lyric-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = parseInt(btn.dataset.index);
      openLyricModal();
    });
  });
}

function filterMusicList(text) { renderMusicList(text); }

function updateMusicStats() {
  const total = playlist.length;
  const duration = playlist.reduce((sum, s) => sum + (s.duration || 0), 0);
  elements.musicStats.innerHTML = `<span>共 <strong>${total}</strong> 首歌曲</span><span>总时长 <strong>${formatTime(duration)}</strong></span>`;
}

// ==================== 网络电台 ====================
function showOnlineInputModal() {
  elements.onlineLinkName.value = '';
  elements.onlineLinkUrl.value = '';
  elements.onlineInputModal.classList.add('active');
}

function hideOnlineInputModal() {
  elements.onlineInputModal.classList.remove('active');
}

function saveOnlineLink() {
  const name = elements.onlineLinkName.value.trim();
  const url = elements.onlineLinkUrl.value.trim();
  if (!url) {
    showNotification('请输入链接');
    return;
  }
  const finalName = name || url.split('/').pop() || '未命名';
  const newLink = { id: Date.now().toString(), name: finalName, url, dateAdded: new Date().toISOString() };
  onlineLinks.push(newLink);
  saveOnlineLinksToStorage();
  renderOnlineList();
  updateOnlineStats();
  hideOnlineInputModal();
  showNotification('链接已添加');
}

function renderOnlineList() {
  if (onlineLinks.length === 0) {
    elements.onlineList.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg><p>暂无网络链接，点击"添加链接"</p></div>`;
    return;
  }
  elements.onlineList.innerHTML = onlineLinks.map((link, idx) => {
    const isPlaying = currentOnlineId === link.id;
    return `<div class="online-item ${isPlaying ? 'playing' : ''}" data-id="${link.id}">
      <span class="col-index">${idx + 1}</span>
      <span class="col-name" title="${escapeHtml(link.name)}">${escapeHtml(link.name)}</span>
      <span class="col-url" title="${escapeHtml(link.url)}">${escapeHtml(link.url)}</span>
      <div class="col-action">
        <button class="online-action-btn play-online-btn" data-id="${link.id}" title="播放"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
        <button class="online-action-btn delete-online-btn" data-id="${link.id}" title="删除"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
      </div>
    </div>`;
  }).join('');
  elements.onlineList.querySelectorAll('.play-online-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const link = onlineLinks.find(l => l.id === btn.dataset.id);
      if (link) playOnlineLink(link);
    });
  });
  elements.onlineList.querySelectorAll('.delete-online-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteOnlineLink(btn.dataset.id);
    });
  });
  elements.onlineList.querySelectorAll('.online-item').forEach(item => {
    item.addEventListener('dblclick', () => {
      const link = onlineLinks.find(l => l.id === item.dataset.id);
      if (link) playOnlineLink(link);
    });
  });
}

function updateOnlineStats() {
  elements.onlineStats.innerHTML = `<span>共 <strong>${onlineLinks.length}</strong> 个链接</span>`;
}

function deleteOnlineLink(id) {
  onlineLinks = onlineLinks.filter(l => l.id !== id);
  saveOnlineLinksToStorage();
  renderOnlineList();
  updateOnlineStats();
  if (currentOnlineId === id) stopOnlinePlayback();
  showNotification('链接已删除');
}

function stopOnlinePlayback() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.src = '';
  }
  isPlaying = false;
  currentOnlineId = null;
  elements.playIcon.style.display = 'block';
  elements.pauseIcon.style.display = 'none';
  updateCurrentSongUI({ title: '未播放', artist: '-', cover: null });
}

function playOnlineLink(link) {
  const isAudioUrl = (url) => {
    const audioExts = ['.mp3', '.m4a', '.ogg', '.wav', '.flac', '.aac', '.wma'];
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      return audioExts.some(ext => pathname.endsWith(ext));
    } catch { return false; }
  };

  if (!isAudioUrl(link.url)) {
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(link.url);
    } else {
      window.open(link.url, '_blank');
      showNotification('已尝试打开链接，若被阻止请允许弹出窗口');
    }
    return;
  }

  currentIndex = -1;
  updatePlaylistUI();
  try {
    audioPlayer.src = link.url;
    audioPlayer.play();
    isPlaying = true;
    currentOnlineId = link.id;
    elements.playIcon.style.display = 'none';
    elements.pauseIcon.style.display = 'block';
    updateCurrentSongUI({ title: link.name, artist: '网络电台', cover: null });
    lyrics = [];
    currentLyricIndex = -1;
    renderOnlineList();
  } catch (error) {
    showNotification('播放失败，请检查链接是否有效');
  }
}

function playNextOnline() {
  if (!currentOnlineId || onlineLinks.length === 0) return;
  const idx = onlineLinks.findIndex(l => l.id === currentOnlineId);
  playOnlineLink(onlineLinks[(idx + 1) % onlineLinks.length]);
}

function playPrevOnline() {
  if (!currentOnlineId || onlineLinks.length === 0) return;
  const idx = onlineLinks.findIndex(l => l.id === currentOnlineId);
  playOnlineLink(onlineLinks[(idx - 1 + onlineLinks.length) % onlineLinks.length]);
}

// ==================== 歌词 ====================
async function autoFindLyric() {
  if (currentIndex === -1) { showNotification('请先选择一首歌曲'); return; }
  const song = playlist[currentIndex];
  try {
    const result = await window.electronAPI.autoFindLyric(song.path);
    if (result) {
      parseLyrics(result.content);
      currentLyricPath = result.path;
      currentSongLyricBinding = result.path;
      await window.electronAPI.saveLyricBinding(song.path, result.path);
      song.lyricPath = result.path;
      savePlaylistToStorage();
      elements.currentLyricFile.textContent = result.path.split(/[\\/]/).pop();
      elements.lyricStatus.innerHTML = '<span class="status-badge auto-lyric">✓ 自动匹配成功</span>';
      elements.lyricPreview.innerHTML = lyrics.slice(0, 8).map(l => l.text).join('<br>') || '无歌词内容';
      renderMusicList();
      showNotification('歌词自动匹配成功');
    } else {
      elements.lyricStatus.innerHTML = '<span class="status-badge no-lyric">✗ 未找到歌词</span>';
      showNotification('未找到匹配的歌词文件');
    }
  } catch (error) {
    showNotification('自动查找歌词失败');
  }
}

async function loadLyricFile() {
  try {
    const result = await window.electronAPI.selectLyricFile();
    if (result) {
      parseLyrics(result.content);
      currentLyricPath = result.path;
      currentSongLyricBinding = result.path;
      if (currentIndex !== -1) {
        const song = playlist[currentIndex];
        await window.electronAPI.saveLyricBinding(song.path, result.path);
        song.lyricPath = result.path;
        savePlaylistToStorage();
      }
      elements.currentLyricFile.textContent = result.path.split(/[\\/]/).pop();
      elements.lyricStatus.innerHTML = '<span class="status-badge has-lyric">✓ 已加载</span>';
      elements.lyricPreview.innerHTML = lyrics.slice(0, 8).map(l => l.text).join('<br>') || '无歌词内容';
      renderMusicList();
      showNotification('歌词加载成功');
    }
  } catch (error) {
    showNotification('加载歌词失败');
  }
}

function parseLyrics(content) {
  lyrics = [];
  const lines = content.split('\n');
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, '0'));
      const text = match[4].trim();
      if (text) lyrics.push({ time: minutes * 60 + seconds + ms / 1000, text });
    }
  }
  lyrics.sort((a, b) => a.time - b.time);
  currentLyricIndex = -1;
}

function updateLyrics(currentTime) {
  if (lyrics.length === 0) return;
  let newIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime) newIndex = i;
    else break;
  }
  if (newIndex !== currentLyricIndex && newIndex >= 0) {
    currentLyricIndex = newIndex;
    if (isLyricsWindowOpen) {
      window.electronAPI.updateLyrics({ text: lyrics[newIndex].text, index: newIndex, total: lyrics.length });
    }
  }
}

async function clearLyrics() {
  if (currentIndex === -1) return;
  const song = playlist[currentIndex];
  await window.electronAPI.saveLyricBinding(song.path, null);
  song.lyricPath = null;
  savePlaylistToStorage();
  lyrics = [];
  currentLyricIndex = -1;
  currentLyricPath = null;
  currentSongLyricBinding = null;
  elements.currentLyricFile.textContent = '无';
  elements.lyricStatus.innerHTML = '<span class="status-badge no-lyric">无歌词</span>';
  elements.lyricPreview.innerHTML = '<p>歌词预览将显示在这里...</p>';
  renderMusicList();
  showNotification('歌词绑定已清除');
}

function openLyricModal() {
  const song = currentIndex !== -1 ? playlist[currentIndex] : null;
  if (song) {
    if (song.lyricPath) {
      elements.currentLyricFile.textContent = song.lyricPath.split(/[\\/]/).pop();
      elements.lyricStatus.innerHTML = '<span class="status-badge has-lyric">✓ 已绑定</span>';
      if (lyrics.length > 0) {
        elements.lyricPreview.innerHTML = lyrics.slice(0, 8).map(l => l.text).join('<br>');
      } else {
        window.electronAPI.readLyricFile(song.lyricPath).then(content => {
          if (content) {
            parseLyrics(content);
            elements.lyricPreview.innerHTML = lyrics.slice(0, 8).map(l => l.text).join('<br>');
          }
        });
      }
    } else {
      elements.currentLyricFile.textContent = '无';
      elements.lyricStatus.innerHTML = '<span class="status-badge no-lyric">无歌词</span>';
      elements.lyricPreview.innerHTML = '<p>歌词预览将显示在这里...</p>';
    }
  }
  elements.lyricModal.classList.add('active');
}

function closeLyricModal() {
  elements.lyricModal.classList.remove('active');
}

async function toggleDesktopLyrics() {
  isLyricsWindowOpen = !isLyricsWindowOpen;
  if (isLyricsWindowOpen) {
    await window.electronAPI.toggleLyricsWindow(true);
    elements.showDesktopLyricsBtn.textContent = '关闭桌面歌词';
    showNotification('桌面歌词已开启');
  } else {
    await window.electronAPI.toggleLyricsWindow(false);
    elements.showDesktopLyricsBtn.textContent = '显示桌面歌词';
    showNotification('桌面歌词已关闭');
  }
}

// ==================== 播放列表 ====================
function togglePlaylist() {
  elements.playlistSidebar.classList.toggle('active');
}

function renderPlaylist() {
  if (playlist.length === 0) {
    elements.playlistContent.innerHTML = '<div class="empty-playlist"><p>播放列表为空</p></div>';
    return;
  }
  elements.playlistContent.innerHTML = playlist.map((song, idx) => `
    <div class="playlist-item ${idx === currentIndex ? 'active' : ''}" data-index="${idx}">
      <div class="playlist-item-info"><div class="playlist-item-title">${escapeHtml(song.title)}</div><div class="playlist-item-artist">${escapeHtml(song.artist)}</div></div>
      <span class="playlist-item-duration">${formatTime(song.duration)}</span>
    </div>
  `).join('');
  elements.playlistContent.querySelectorAll('.playlist-item').forEach(item => {
    item.addEventListener('click', () => playSong(parseInt(item.dataset.index)));
  });
}

function updatePlaylistUI() {
  document.querySelectorAll('.music-item').forEach(item => {
    const idx = parseInt(item.dataset.index);
    item.classList.toggle('playing', idx === currentIndex);
  });
  document.querySelectorAll('.playlist-item').forEach(item => {
    const idx = parseInt(item.dataset.index);
    item.classList.toggle('active', idx === currentIndex);
  });
}

// ==================== UI 更新 ====================
function updateCurrentSongUI(song) {
  elements.songName.textContent = song.title;
  elements.songArtist.textContent = song.artist;
  if (song.cover) {
    elements.songCover.innerHTML = `<img src="${song.cover}" alt="cover">`;
  } else {
    elements.songCover.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';
  }
}

function toggleLike() {
  elements.likeBtn.classList.toggle('active');
}

// ==================== 键盘快捷键 ====================
function handleKeyboard(e) {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    togglePlay();
  }
  if (e.code === 'ArrowLeft' && e.ctrlKey) playPrevious();
  if (e.code === 'ArrowRight' && e.ctrlKey) playNext();
  if (e.code === 'KeyL' && e.target.tagName !== 'INPUT' && !e.ctrlKey) openLyricModal();
}

// ==================== 存储 ====================
function savePlaylistToStorage() {
  localStorage.setItem('cloudMusicPlaylist', JSON.stringify(playlist.map(s => ({
    path: s.path, title: s.title, artist: s.artist, album: s.album, duration: s.duration, format: s.format, lyricPath: s.lyricPath
  }))));
}

function loadPlaylistFromStorage() {
  try {
    const data = localStorage.getItem('cloudMusicPlaylist');
    if (data) {
      playlist = JSON.parse(data);
      renderMusicList();
      renderPlaylist();
      updateMusicStats();
    }
  } catch (e) {}
}

function saveOnlineLinksToStorage() {
  localStorage.setItem('cloudMusicOnlineLinks', JSON.stringify(onlineLinks));
}

function loadOnlineLinksFromStorage() {
  try {
    const data = localStorage.getItem('cloudMusicOnlineLinks');
    if (data) {
      onlineLinks = JSON.parse(data);
      renderOnlineList();
      updateOnlineStats();
    }
  } catch (e) {}
}

// ==================== 工具函数 ====================
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const rm = mins % 60;
    return `${hours}:${rm.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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