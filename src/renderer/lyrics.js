// ==================== 桌面歌词窗口 ====================
let isLocked = false;
let isDragging = false;
let dragStartPos = { x: 0, y: 0 };
let windowStartPos = { x: 0, y: 0 };

// 主题列表
const themes = ['dark', 'red', 'blue', 'purple', 'green'];

// ==================== DOM 元素 ====================
const lyricsWrapper = document.getElementById('lyricsWrapper');
const lyricsText = document.getElementById('lyricsText');
const dragArea = document.getElementById('dragArea');
const lockBtn = document.getElementById('lockBtn');
const closeBtn = document.getElementById('closeBtn');
const themeBtn = document.getElementById('themeBtn');
const lockIcon = document.getElementById('lockIcon');

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  initializeEvents();
  setupLyricsListener();
  loadThemeFromStorage();
  
  // 通知主进程歌词窗口已准备好
  window.electronAPI.updateLyrics({ text: 'Cloud Music Player - 等待播放...', ready: true });
});

function initializeEvents() {
  // 锁定/解锁按钮
  lockBtn?.addEventListener('click', toggleLock);
  
  // 关闭按钮
  closeBtn?.addEventListener('click', () => {
    window.electronAPI.closeLyricsWindow();
  });
  
  // 主题切换
  themeBtn?.addEventListener('click', cycleTheme);
  
  // 拖拽功能
  dragArea.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', endDrag);
  
  // 双击切换锁定状态
  lyricsWrapper.addEventListener('dblclick', (e) => {
    // 如果点击的是按钮区域，不触发
    if (e.target.closest('.lyrics-controls')) return;
    toggleLock();
  });
  
  // 同步主题
  window.electronAPI.onThemeChange?.((theme) => {
    setTheme(theme);
  });
}

function setupLyricsListener() {
  // 监听歌词更新
  window.electronAPI.onLyricsUpdate((data) => {
    if (data.text) {
      updateLyricsText(data.text);
    }
    if (data.theme) {
      setTheme(data.theme);
    }
  });
}

function updateLyricsText(text) {
  lyricsText.textContent = text;
  lyricsText.classList.remove('empty');
  lyricsText.classList.add('active');
  
  // 移除动画类，以便下次可以重新触发
  setTimeout(() => {
    lyricsText.classList.remove('active');
  }, 2000);
}

// ==================== 主题切换 ====================
function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('cloudMusicLyricsTheme', theme);
}

function cycleTheme() {
  const currentTheme = document.body.getAttribute('data-theme') || 'dark';
  const currentIndex = themes.indexOf(currentTheme);
  const nextTheme = themes[(currentIndex + 1) % themes.length];
  setTheme(nextTheme);
}

function loadThemeFromStorage() {
  const savedTheme = localStorage.getItem('cloudMusicLyricsTheme') || 'dark';
  setTheme(savedTheme);
}

// ==================== 锁定/解锁 ====================
function toggleLock() {
  isLocked = !isLocked;
  
  if (isLocked) {
    lyricsWrapper.classList.add('locked');
    lockIcon.innerHTML = '<path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>';
    lockBtn.title = '点击解锁 (L)';
    
    // 通知主进程锁定状态
    window.electronAPI.setLyricsLocked?.(true);
    
    showHint('已锁定 - 按 L 解锁');
  } else {
    lyricsWrapper.classList.remove('locked');
    lockIcon.innerHTML = '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>';
    lockBtn.title = '点击锁定 (L)';
    
    // 通知主进程锁定状态
    window.electronAPI.setLyricsLocked?.(false);
    
    showHint('已解锁 - 可拖拽移动');
  }
}

function showHint(text) {
  // 创建临时提示
  const hint = document.createElement('div');
  hint.className = 'lyrics-hint';
  hint.textContent = text;
  hint.style.cssText = `
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    background: rgba(0, 0, 0, 0.5);
    padding: 4px 12px;
    border-radius: 12px;
    pointer-events: none;
    animation: fadeIn 0.3s ease;
  `;
  lyricsWrapper.appendChild(hint);
  
  setTimeout(() => {
    hint.style.opacity = '0';
    hint.style.transition = 'opacity 0.3s ease';
    setTimeout(() => hint.remove(), 300);
  }, 1500);
}

// ==================== 拖拽功能 ====================
function startDrag(e) {
  // 如果已锁定，不启动拖拽
  if (isLocked) return;
  
  isDragging = true;
  dragStartPos = { x: e.screenX, y: e.screenY };
  
  // 获取当前窗口位置
  window.electronAPI.getLyricsPosition?.().then(pos => {
    if (pos) {
      windowStartPos = { x: pos[0], y: pos[1] };
    }
  });
  
  lyricsWrapper.classList.add('dragging');
}

function drag(e) {
  if (!isDragging) return;
  
  e.preventDefault();
  
  const deltaX = e.screenX - dragStartPos.x;
  const deltaY = e.screenY - dragStartPos.y;
  
  const newX = windowStartPos.x + deltaX;
  const newY = windowStartPos.y + deltaY;
  
  // 发送新位置到主进程
  window.electronAPI.setLyricsPosition?.({ x: newX, y: newY });
}

function endDrag(e) {
  if (!isDragging) return;
  
  isDragging = false;
  lyricsWrapper.classList.remove('dragging');
}

// ==================== 键盘快捷键 ====================
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'Escape':
      // ESC 关闭窗口
      window.electronAPI.closeLyricsWindow();
      break;
    case 'l':
    case 'L':
      // L 键切换锁定
      if (!e.ctrlKey && !e.metaKey) {
        toggleLock();
      }
      break;
    case 't':
    case 'T':
      // T 键切换主题
      if (!e.ctrlKey && !e.metaKey) {
        cycleTheme();
      }
      break;
  }
});

// ==================== 初始化显示 ====================
lyricsText.textContent = 'Cloud Music Player - 等待播放...';
lyricsText.classList.add('empty');
