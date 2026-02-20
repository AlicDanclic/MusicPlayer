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
let currentSongLyricBinding = null; // 当前歌曲的歌词绑定

// 主题列表
const themes = ['dark', 'red', 'blue', 'purple', 'green'];

// ==================== DOM 元素 ====================
const elements = {};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  bindEvents();
  initializeAudio();
  loadPlaylistFromStorage();
  loadThemeFromStorage();
});

function initializeElements() {
  // 窗口控制
  elements.minimizeBtn = document.getElementById('minimizeBtn');
  elements.maximizeBtn = document.getElementById('maximizeBtn');
  elements.closeBtn = document.getElementById('closeBtn');
  
  // 主题切换
  elements.themeBtn = document.getElementById('themeBtn');
  elements.themeItems = document.querySelectorAll('.theme-item');
  
  // 播放器控制
  elements.playBtn = document.getElementById('playBtn');
  elements.prevBtn = document.getElementById('prevBtn');
  elements.nextBtn = document.getElementById('nextBtn');
  elements.playModeBtn = document.getElementById('playModeBtn');
  elements.lyricsBtn = document.getElementById('lyricsBtn');
  elements.playIcon = document.getElementById('playIcon');
  elements.pauseIcon = document.getElementById('pauseIcon');
  
  // 进度条
  elements.progressBar = document.getElementById('progressBar');
  elements.progressFill = document.getElementById('progressFill');
  elements.progressHandle = document.getElementById('progressHandle');
  elements.currentTime = document.getElementById('currentTime');
  elements.totalTime = document.getElementById('totalTime');
  
  // 音量
  elements.volumeBtn = document.getElementById('volumeBtn');
  elements.volumeSlider = document.getElementById('volumeSlider');
  elements.volumeFill = document.getElementById('volumeFill');
  
  // 当前歌曲信息
  elements.songCover = document.getElementById('songCover');
  elements.songName = document.getElementById('songName');
  elements.songArtist = document.getElementById('songArtist');
  elements.likeBtn = document.getElementById('likeBtn');
  
  // 音频元素
  elements.audioPlayer = document.getElementById('audioPlayer');
  
  // 本地音乐
  elements.addMusicBtn = document.getElementById('addMusicBtn');
  elements.scanFolderBtn = document.getElementById('scanFolderBtn');
  elements.musicList = document.getElementById('musicList');
  elements.musicStats = document.getElementById('musicStats');
  elements.searchInput = document.getElementById('searchInput');
  
  // 歌词模态框
  elements.lyricModal = document.getElementById('lyricModal');
  elements.closeLyricModal = document.getElementById('closeLyricModal');
  elements.loadLyricBtn = document.getElementById('loadLyricBtn');
  elements.autoFindLyricBtn = document.getElementById('autoFindLyricBtn');
  elements.currentLyricFile = document.getElementById('currentLyricFile');
  elements.lyricPreview = document.getElementById('lyricPreview');
  elements.clearLyricBtn = document.getElementById('clearLyricBtn');
  elements.showDesktopLyricsBtn = document.getElementById('showDesktopLyricsBtn');
  elements.lyricStatus = document.getElementById('lyricStatus');
  
  // 播放列表侧边栏
  elements.playlistBtn = document.getElementById('playlistBtn');
  elements.playlistSidebar = document.getElementById('playlistSidebar');
  elements.closePlaylist = document.getElementById('closePlaylist');
  elements.playlistContent = document.getElementById('playlistContent');
}

function bindEvents() {
  // 窗口控制
  elements.minimizeBtn?.addEventListener('click', () => {
    window.electronAPI.windowMinimize();
  });
  
  elements.maximizeBtn?.addEventListener('click', () => {
    window.electronAPI.windowMaximize();
  });
  
  elements.closeBtn?.addEventListener('click', () => {
    window.electronAPI.windowClose();
  });
  
  // 主题切换
  elements.themeBtn?.addEventListener('click', cycleTheme);
  
  elements.themeItems.forEach(item => {
    item.addEventListener('click', () => {
      const theme = item.dataset.theme;
      setTheme(theme);
    });
  });
  
  // 播放器控制
  elements.playBtn?.addEventListener('click', togglePlay);
  elements.prevBtn?.addEventListener('click', playPrevious);
  elements.nextBtn?.addEventListener('click', playNext);
  elements.playModeBtn?.addEventListener('click', togglePlayMode);
  elements.lyricsBtn?.addEventListener('click', openLyricModal);
  
  // 进度条
  elements.progressBar?.addEventListener('click', seekTo);
  elements.progressBar?.addEventListener('mousedown', startDragProgress);
  document.addEventListener('mousemove', dragProgress);
  document.addEventListener('mouseup', endDragProgress);
  
  // 音量
  elements.volumeSlider?.addEventListener('click', setVolume);
  elements.volumeBtn?.addEventListener('click', toggleMute);
  
  // 本地音乐
  elements.addMusicBtn?.addEventListener('click', addMusicFiles);
  elements.scanFolderBtn?.addEventListener('click', scanMusicFolder);
  
  // 搜索
  elements.searchInput?.addEventListener('input', (e) => {
    filterMusicList(e.target.value);
  });
  
  // 歌词模态框
  elements.closeLyricModal?.addEventListener('click', closeLyricModal);
  elements.loadLyricBtn?.addEventListener('click', loadLyricFile);
  elements.autoFindLyricBtn?.addEventListener('click', autoFindLyric);
  elements.clearLyricBtn?.addEventListener('click', clearLyrics);
  elements.showDesktopLyricsBtn?.addEventListener('click', toggleDesktopLyrics);
  
  // 播放列表
  elements.playlistBtn?.addEventListener('click', togglePlaylist);
  elements.closePlaylist?.addEventListener('click', togglePlaylist);
  
  // 喜欢按钮
  elements.likeBtn?.addEventListener('click', toggleLike);
  
  // 键盘快捷键
  document.addEventListener('keydown', handleKeyboard);
}

function initializeAudio() {
  audioPlayer = elements.audioPlayer;
  
  audioPlayer.addEventListener('timeupdate', updateProgress);
  audioPlayer.addEventListener('loadedmetadata', () => {
    elements.totalTime.textContent = formatTime(audioPlayer.duration);
  });
  audioPlayer.addEventListener('ended', onSongEnded);
  audioPlayer.addEventListener('error', (e) => {
    console.error('音频播放错误:', e);
    showNotification('音频播放失败');
  });
  
  // 设置初始音量
  audioPlayer.volume = 0.7;
}

// ==================== 主题切换 ====================
function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  
  // 更新主题选择器UI
  elements.themeItems.forEach(item => {
    if (item.dataset.theme === theme) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // 保存主题设置
  localStorage.setItem('cloudMusicTheme', theme);
  
  // 同步主题到歌词窗口
  if (isLyricsWindowOpen) {
    window.electronAPI.updateLyrics({ theme: theme });
  }
}

function cycleTheme() {
  const currentTheme = document.body.getAttribute('data-theme') || 'dark';
  const currentIndex = themes.indexOf(currentTheme);
  const nextTheme = themes[(currentIndex + 1) % themes.length];
  setTheme(nextTheme);
}

function loadThemeFromStorage() {
  const savedTheme = localStorage.getItem('cloudMusicTheme') || 'dark';
  setTheme(savedTheme);
}

// ==================== 音乐播放控制 ====================
function togglePlay() {
  if (playlist.length === 0) {
    showNotification('播放列表为空');
    return;
  }
  
  if (currentIndex === -1) {
    playSong(0);
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
  
  updatePlaylistUI();
}

async function playSong(index) {
  if (index < 0 || index >= playlist.length) return;
  
  currentIndex = index;
  const song = playlist[index];
  
  try {
    // 获取音频数据
    const audioData = await window.electronAPI.getAudioData(song.path);
    if (audioData) {
      audioPlayer.src = audioData;
      audioPlayer.play();
      isPlaying = true;
      elements.playIcon.style.display = 'none';
      elements.pauseIcon.style.display = 'block';
      
      // 更新UI
      updateCurrentSongUI(song);
      updatePlaylistUI();
      
      // 加载歌词绑定
      await loadLyricForSong(song);
    }
  } catch (error) {
    console.error('播放失败:', error);
    showNotification('播放失败: ' + error.message);
  }
}

// 加载歌曲的歌词
async function loadLyricForSong(song) {
  lyrics = [];
  currentLyricIndex = -1;
  currentLyricPath = null;
  currentSongLyricBinding = null;
  
  // 1. 首先检查已保存的绑定
  if (song.lyricPath) {
    const content = await window.electronAPI.readLyricFile(song.lyricPath);
    if (content) {
      parseLyrics(content);
      currentLyricPath = song.lyricPath;
      currentSongLyricBinding = song.lyricPath;
      return;
    }
  }
  
  // 2. 尝试自动查找同文件夹下的同名歌词
  const autoResult = await window.electronAPI.autoFindLyric(song.path);
  if (autoResult) {
    parseLyrics(autoResult.content);
    currentLyricPath = autoResult.path;
    // 自动保存绑定
    await window.electronAPI.saveLyricBinding(song.path, autoResult.path);
    song.lyricPath = autoResult.path;
    savePlaylistToStorage();
  }
}

function playPrevious() {
  if (playlist.length === 0) return;
  
  let prevIndex;
  if (playMode === 'random') {
    prevIndex = Math.floor(Math.random() * playlist.length);
  } else {
    prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1;
    }
  }
  
  playSong(prevIndex);
}

function playNext() {
  if (playlist.length === 0) return;
  
  let nextIndex;
  if (playMode === 'random') {
    nextIndex = Math.floor(Math.random() * playlist.length);
  } else {
    nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
      nextIndex = 0;
    }
  }
  
  playSong(nextIndex);
}

function onSongEnded() {
  if (playMode === 'single') {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
  } else {
    playNext();
  }
}

function togglePlayMode() {
  const modes = ['list', 'random', 'single'];
  const modeIcons = [
    '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7z"/>', // 列表循环
    '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>', // 随机
    '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>' // 单曲循环
  ];
  const modeNames = ['列表循环', '随机播放', '单曲循环'];
  
  const currentModeIndex = modes.indexOf(playMode);
  playMode = modes[(currentModeIndex + 1) % modes.length];
  
  // 更新图标
  elements.playModeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">${modeIcons[(currentModeIndex + 1) % modes.length]}</svg>`;
  
  showNotification('播放模式: ' + modeNames[(currentModeIndex + 1) % modes.length]);
}

// ==================== 进度条控制 ====================
function updateProgress() {
  if (!audioPlayer || isDraggingProgress) return;
  
  const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  elements.progressFill.style.width = progress + '%';
  elements.progressHandle.style.left = progress + '%';
  elements.currentTime.textContent = formatTime(audioPlayer.currentTime);
  
  // 更新歌词
  updateLyrics(audioPlayer.currentTime);
}

function seekTo(e) {
  if (!audioPlayer.duration) return;
  
  const rect = elements.progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audioPlayer.currentTime = percent * audioPlayer.duration;
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
  
  if (audioPlayer.duration) {
    audioPlayer.currentTime = percent * audioPlayer.duration;
  }
}

// ==================== 音量控制 ====================
function setVolume(e) {
  const rect = elements.volumeSlider.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  const volume = Math.max(0, Math.min(1, percent));
  
  audioPlayer.volume = volume;
  elements.volumeFill.style.width = (volume * 100) + '%';
}

function toggleMute() {
  if (audioPlayer.volume > 0) {
    audioPlayer.dataset.prevVolume = audioPlayer.volume;
    audioPlayer.volume = 0;
    elements.volumeFill.style.width = '0%';
  } else {
    const prevVolume = parseFloat(audioPlayer.dataset.prevVolume || 0.7);
    audioPlayer.volume = prevVolume;
    elements.volumeFill.style.width = (prevVolume * 100) + '%';
  }
}

// ==================== 本地音乐管理 ====================
async function addMusicFiles() {
  try {
    const files = await window.electronAPI.selectMusicFiles();
    if (files && files.length > 0) {
      // 检查重复
      for (const file of files) {
        const exists = playlist.some(song => song.path === file.path);
        if (!exists) {
          playlist.push(file);
        }
      }
      savePlaylistToStorage();
      renderMusicList();
      renderPlaylist();
      updateMusicStats();
      showNotification(`已添加 ${files.length} 首歌曲`);
    }
  } catch (error) {
    console.error('添加音乐失败:', error);
    showNotification('添加音乐失败');
  }
}

/**
 * 扫描文件夹 - 替换模式，并自动绑定歌词
 */
async function scanMusicFolder() {
  try {
    const files = await window.electronAPI.scanMusicFolder();
    
    // 停止当前播放
    resetPlayer();
    
    if (files && files.length > 0) {
      // 直接替换播放列表
      playlist = files;
      
      // 先保存并渲染（无歌词状态）
      savePlaylistToStorage();
      renderMusicList();
      renderPlaylist();
      updateMusicStats();
      showNotification(`扫描到 ${files.length} 首歌曲，正在自动匹配歌词...`);

      // 在后台自动绑定歌词（不阻塞UI）
      autoBindLyricsForPlaylist().then(() => {
        // 歌词绑定完成后重新渲染列表以显示更新后的状态
        renderMusicList();
        renderPlaylist();
        showNotification(`歌词匹配完成`);
      }).catch(err => {
        console.error('自动绑定歌词出错:', err);
        showNotification('部分歌词匹配失败');
      });
      
    } else {
      // 文件夹为空，清空播放列表
      playlist = [];
      savePlaylistToStorage();
      renderMusicList();
      renderPlaylist();
      updateMusicStats();
      showNotification('未找到音乐文件，播放列表已清空');
    }
  } catch (error) {
    console.error('扫描文件夹失败:', error);
    showNotification('扫描文件夹失败');
  }
}

/**
 * 重置播放器状态（停止播放，清空当前歌曲信息）
 */
function resetPlayer() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.src = '';
  }
  isPlaying = false;
  currentIndex = -1;
  elements.playIcon.style.display = 'block';
  elements.pauseIcon.style.display = 'none';
  updateCurrentSongUI({ title: '未播放', artist: '-', cover: null });
  lyrics = [];
  currentLyricIndex = -1;
  currentLyricPath = null;
  currentSongLyricBinding = null;
}

/**
 * 为播放列表中所有歌曲自动绑定歌词（并发执行）
 */
async function autoBindLyricsForPlaylist() {
  const promises = playlist.map(async (song) => {
    try {
      // 调用自动查找歌词
      const result = await window.electronAPI.autoFindLyric(song.path);
      if (result) {
        // 保存绑定
        await window.electronAPI.saveLyricBinding(song.path, result.path);
        song.lyricPath = result.path; // 更新对象属性
      }
    } catch (error) {
      console.error(`自动绑定歌词失败: ${song.path}`, error);
    }
  });
  
  await Promise.all(promises);
  // 所有绑定保存后，更新存储（song.lyricPath 已修改）
  savePlaylistToStorage();
}

function renderMusicList(filterText = '') {
  const filteredPlaylist = filterText 
    ? playlist.filter(song => 
        song.title.toLowerCase().includes(filterText.toLowerCase()) ||
        song.artist.toLowerCase().includes(filterText.toLowerCase()) ||
        song.album.toLowerCase().includes(filterText.toLowerCase())
      )
    : playlist;
  
  if (filteredPlaylist.length === 0) {
    elements.musicList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        <p>${filterText ? '没有找到匹配的歌曲' : '暂无音乐，点击"添加音乐"或"扫描文件夹"'}</p>
      </div>
    `;
    return;
  }
  
  elements.musicList.innerHTML = filteredPlaylist.map((song, index) => {
    const originalIndex = playlist.indexOf(song);
    const hasLyric = !!song.lyricPath;
    
    return `
    <div class="music-item ${originalIndex === currentIndex ? 'playing' : ''}" data-index="${originalIndex}">
      <span class="col-index">${originalIndex + 1}</span>
      <div class="col-title">
        <div class="song-cover-small">
          ${song.cover ? `<img src="${song.cover}" alt="cover">` : `
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          `}
        </div>
        <div class="song-title-info">
          <span class="title">${escapeHtml(song.title)}</span>
          <span class="format">${song.format}</span>
        </div>
      </div>
      <span class="col-artist">${escapeHtml(song.artist)}</span>
      <span class="col-album">${escapeHtml(song.album)}</span>
      <span class="col-duration">${formatTime(song.duration)}</span>
      <span class="col-lyric">
        <span class="lyric-badge ${hasLyric ? 'has-lyric' : 'no-lyric'}">
          ${hasLyric ? `
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
            </svg>
            已绑定
          ` : '无歌词'}
        </span>
      </span>
      <div class="col-action">
        <button class="action-btn play-item-btn" data-index="${originalIndex}" title="播放">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <button class="action-btn lyric-btn" data-index="${originalIndex}" title="歌词">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        </button>
      </div>
    </div>
  `}).join('');
  
  // 绑定事件
  elements.musicList.querySelectorAll('.music-item').forEach(item => {
    item.addEventListener('dblclick', () => {
      const index = parseInt(item.dataset.index);
      playSong(index);
    });
  });
  
  elements.musicList.querySelectorAll('.play-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      playSong(index);
    });
  });
  
  elements.musicList.querySelectorAll('.lyric-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      currentIndex = index;
      openLyricModal();
    });
  });
}

function filterMusicList(searchText) {
  renderMusicList(searchText);
}

function updateMusicStats() {
  const totalSongs = playlist.length;
  const totalDuration = playlist.reduce((sum, song) => sum + (song.duration || 0), 0);
  
  elements.musicStats.innerHTML = `
    <span>共 <strong>${totalSongs}</strong> 首歌曲</span>
    <span>总时长 <strong>${formatTime(totalDuration)}</strong></span>
  `;
}

// ==================== 歌词功能 ====================
async function autoFindLyric() {
  if (currentIndex === -1) {
    showNotification('请先选择一首歌曲');
    return;
  }
  
  const song = playlist[currentIndex];
  
  try {
    const result = await window.electronAPI.autoFindLyric(song.path);
    if (result) {
      parseLyrics(result.content);
      currentLyricPath = result.path;
      currentSongLyricBinding = result.path;
      
      // 保存绑定
      await window.electronAPI.saveLyricBinding(song.path, result.path);
      song.lyricPath = result.path;
      savePlaylistToStorage();
      
      // 更新UI
      elements.currentLyricFile.textContent = result.path.split(/[\\/]/).pop();
      elements.lyricStatus.innerHTML = '<span class="status-badge auto-lyric">✓ 自动匹配成功</span>';
      
      // 显示预览
      const previewLines = lyrics.slice(0, 8).map(l => l.text).join('<br>');
      elements.lyricPreview.innerHTML = previewLines || '无歌词内容';
      
      renderMusicList();
      showNotification('歌词自动匹配成功');
    } else {
      elements.lyricStatus.innerHTML = '<span class="status-badge no-lyric">✗ 未找到歌词</span>';
      showNotification('未找到匹配的歌词文件');
    }
  } catch (error) {
    console.error('自动查找歌词失败:', error);
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
      
      // 保存绑定到当前歌曲
      if (currentIndex !== -1) {
        const song = playlist[currentIndex];
        await window.electronAPI.saveLyricBinding(song.path, result.path);
        song.lyricPath = result.path;
        savePlaylistToStorage();
      }
      
      elements.currentLyricFile.textContent = result.path.split(/[\\/]/).pop();
      elements.lyricStatus.innerHTML = '<span class="status-badge has-lyric">✓ 已加载</span>';
      
      // 显示预览
      const previewLines = lyrics.slice(0, 8).map(l => l.text).join('<br>');
      elements.lyricPreview.innerHTML = previewLines || '无歌词内容';
      
      renderMusicList();
      showNotification('歌词加载成功');
    }
  } catch (error) {
    console.error('加载歌词失败:', error);
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
      const milliseconds = parseInt(match[3].padEnd(3, '0'));
      const text = match[4].trim();
      
      if (text) {
        const time = minutes * 60 + seconds + milliseconds / 1000;
        lyrics.push({ time, text });
      }
    }
  }
  
  lyrics.sort((a, b) => a.time - b.time);
  currentLyricIndex = -1;
}

function updateLyrics(currentTime) {
  if (lyrics.length === 0) return;
  
  let newIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime) {
      newIndex = i;
    } else {
      break;
    }
  }
  
  if (newIndex !== currentLyricIndex && newIndex >= 0) {
    currentLyricIndex = newIndex;
    const currentLyric = lyrics[newIndex].text;
    
    if (isLyricsWindowOpen) {
      window.electronAPI.updateLyrics({
        text: currentLyric,
        index: newIndex,
        total: lyrics.length
      });
    }
  }
}

async function clearLyrics() {
  if (currentIndex === -1) return;
  
  const song = playlist[currentIndex];
  
  // 清除绑定
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
    // 更新歌词状态显示
    if (song.lyricPath) {
      elements.currentLyricFile.textContent = song.lyricPath.split(/[\\/]/).pop();
      elements.lyricStatus.innerHTML = '<span class="status-badge has-lyric">✓ 已绑定</span>';
      
      // 如果歌词已加载，显示预览
      if (lyrics.length > 0) {
        const previewLines = lyrics.slice(0, 8).map(l => l.text).join('<br>');
        elements.lyricPreview.innerHTML = previewLines;
      } else {
        // 重新加载歌词
        window.electronAPI.readLyricFile(song.lyricPath).then(content => {
          if (content) {
            parseLyrics(content);
            const previewLines = lyrics.slice(0, 8).map(l => l.text).join('<br>');
            elements.lyricPreview.innerHTML = previewLines;
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
    elements.playlistContent.innerHTML = `
      <div class="empty-playlist">
        <p>播放列表为空</p>
      </div>
    `;
    return;
  }
  
  elements.playlistContent.innerHTML = playlist.map((song, index) => `
    <div class="playlist-item ${index === currentIndex ? 'active' : ''}" data-index="${index}">
      <div class="playlist-item-info">
        <div class="playlist-item-title">${escapeHtml(song.title)}</div>
        <div class="playlist-item-artist">${escapeHtml(song.artist)}</div>
      </div>
      <span class="playlist-item-duration">${formatTime(song.duration)}</span>
    </div>
  `).join('');
  
  elements.playlistContent.querySelectorAll('.playlist-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      playSong(index);
    });
  });
}

function updatePlaylistUI() {
  document.querySelectorAll('.music-item').forEach((item, index) => {
    const itemIndex = parseInt(item.dataset.index);
    if (itemIndex === currentIndex) {
      item.classList.add('playing');
    } else {
      item.classList.remove('playing');
    }
  });
  
  document.querySelectorAll('.playlist-item').forEach((item, index) => {
    const itemIndex = parseInt(item.dataset.index);
    if (itemIndex === currentIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// ==================== UI 更新 ====================
function updateCurrentSongUI(song) {
  elements.songName.textContent = song.title;
  elements.songArtist.textContent = song.artist;
  
  if (song.cover) {
    elements.songCover.innerHTML = `<img src="${song.cover}" alt="cover">`;
  } else {
    elements.songCover.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
    `;
  }
}

function toggleLike() {
  elements.likeBtn.classList.toggle('active');
}

// ==================== 键盘快捷键 ====================
function handleKeyboard(e) {
  // 空格键 - 播放/暂停
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    togglePlay();
  }
  
  // 左右箭头 - 上一首/下一首
  if (e.code === 'ArrowLeft' && e.ctrlKey) {
    playPrevious();
  }
  if (e.code === 'ArrowRight' && e.ctrlKey) {
    playNext();
  }
  
  // L键 - 打开歌词
  if (e.code === 'KeyL' && e.target.tagName !== 'INPUT' && !e.ctrlKey) {
    openLyricModal();
  }
}

// ==================== 存储 ====================
function savePlaylistToStorage() {
  const playlistData = playlist.map(song => ({
    path: song.path,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    format: song.format,
    lyricPath: song.lyricPath
  }));
  localStorage.setItem('cloudMusicPlaylist', JSON.stringify(playlistData));
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
  } catch (error) {
    console.error('加载播放列表失败:', error);
  }
}

// ==================== 工具函数 ====================
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}