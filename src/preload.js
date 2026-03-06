const { contextBridge, ipcRenderer } = require('electron');

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  
  // 文件操作
  selectMusicFiles: () => ipcRenderer.invoke('select-music-files'),
  selectLyricFile: () => ipcRenderer.invoke('select-lyric-file'),
  readLyricFile: (filePath) => ipcRenderer.invoke('read-lyric-file', filePath),
  scanMusicFolder: () => ipcRenderer.invoke('scan-music-folder'),
  getAudioData: (filePath) => ipcRenderer.invoke('get-audio-data', filePath),
  
  // 歌词自动查找和绑定
  autoFindLyric: (musicPath) => ipcRenderer.invoke('auto-find-lyric', musicPath),
  saveLyricBinding: (musicPath, lyricPath) => ipcRenderer.invoke('save-lyric-binding', musicPath, lyricPath),
  getLyricBinding: (musicPath) => ipcRenderer.invoke('get-lyric-binding', musicPath),
  
  // 歌词窗口控制
  toggleLyricsWindow: (show) => ipcRenderer.invoke('toggle-lyrics-window', show),
  updateLyrics: (data) => ipcRenderer.invoke('update-lyrics', data),
  closeLyricsWindow: () => ipcRenderer.invoke('close-lyrics-window'),
  setLyricsPosition: (position) => ipcRenderer.invoke('set-lyrics-position', position),
  getLyricsPosition: () => ipcRenderer.invoke('get-lyrics-position'),
  setLyricsLocked: (locked) => ipcRenderer.invoke('set-lyrics-locked', locked),
  getLyricsLocked: () => ipcRenderer.invoke('get-lyrics-locked'),
  
  // 歌词更新监听（用于歌词窗口）
  onLyricsUpdate: (callback) => {
    ipcRenderer.on('lyrics-update', (event, data) => callback(data));
  },
  
  // 主题变更监听（用于歌词窗口）
  onThemeChange: (callback) => {
    ipcRenderer.on('theme-change', (event, theme) => callback(theme));
  },
  
  // 移除监听
  removeLyricsListener: () => {
    ipcRenderer.removeAllListeners('lyrics-update');
  },
  removeThemeListener: () => {
    ipcRenderer.removeAllListeners('theme-change');
  },
  
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // ==================== 新增 B站视频相关 API ====================
  // 获取视频信息
  bilibiliGetVideoInfo: (params) => ipcRenderer.invoke('bilibili-get-video-info', params),
  // 获取视频播放地址
  bilibiliGetPlayUrl: (params) => ipcRenderer.invoke('bilibili-get-playurl', params),
  // 搜索视频
  bilibiliSearch: (params) => ipcRenderer.invoke('bilibili-search', params)
});