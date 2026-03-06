const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const musicMetadata = require('music-metadata');
const axios = require('axios'); // 用于请求B站API

// 主窗口
let mainWindow = null;
// 桌面歌词窗口
let lyricsWindow = null;
// 歌词窗口是否锁定
let isLyricsLocked = false;

// 歌词绑定存储文件路径
const lyricBindingsPath = path.join(app.getPath('userData'), 'lyric-bindings.json');

// 创建主窗口
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    backgroundColor: '#1a1a1a'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (lyricsWindow) {
      lyricsWindow.close();
    }
  });
}

// 创建桌面歌词窗口
function createLyricsWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  lyricsWindow = new BrowserWindow({
    width: 800,
    height: 100,
    minWidth: 800,
    maxWidth: 800,
    minHeight: 100,
    maxHeight: 100,
    x: Math.round((width - 800) / 2),
    y: height - 120,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    thickFrame: false,
    movable: true,
    hasShadow: false,
    webPreferences: {
      enablePreferredSizeMode: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  lyricsWindow.loadFile(path.join(__dirname, 'renderer', 'lyrics.html'));

  lyricsWindow.once('ready-to-show', () => {
    lyricsWindow.show();
    lyricsWindow.setIgnoreMouseEvents(false);
  });

  lyricsWindow.on('closed', () => {
    lyricsWindow = null;
    isLyricsLocked = false;
  });
}

// 加载歌词绑定
function loadLyricBindings() {
  try {
    if (fs.existsSync(lyricBindingsPath)) {
      const data = fs.readFileSync(lyricBindingsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载歌词绑定失败:', error);
  }
  return {};
}

// 保存歌词绑定
function saveLyricBindings(bindings) {
  try {
    fs.writeFileSync(lyricBindingsPath, JSON.stringify(bindings, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存歌词绑定失败:', error);
  }
}

// 应用就绪
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 通信处理

// 窗口控制
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// 选择音乐文件
ipcMain.handle('select-music-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '音频文件', extensions: ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'wma', 'aac'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled) {
    const bindings = loadLyricBindings();
    const files = [];
    for (const filePath of result.filePaths) {
      try {
        const metadata = await musicMetadata.parseFile(filePath);
        const stats = fs.statSync(filePath);
        const fileId = Buffer.from(filePath).toString('base64');
        
        files.push({
          path: filePath,
          name: path.basename(filePath, path.extname(filePath)),
          title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
          artist: metadata.common.artist || '未知艺术家',
          album: metadata.common.album || '未知专辑',
          duration: metadata.format.duration || 0,
          cover: metadata.common.picture ? 
            `data:${metadata.common.picture[0].format};base64,${metadata.common.picture[0].data.toString('base64')}` : 
            null,
          size: stats.size,
          format: path.extname(filePath).slice(1).toUpperCase(),
          lyricPath: bindings[fileId] || null
        });
      } catch (error) {
        console.error('解析文件失败:', filePath, error);
        const fileId = Buffer.from(filePath).toString('base64');
        files.push({
          path: filePath,
          name: path.basename(filePath, path.extname(filePath)),
          title: path.basename(filePath, path.extname(filePath)),
          artist: '未知艺术家',
          album: '未知专辑',
          duration: 0,
          cover: null,
          size: 0,
          format: path.extname(filePath).slice(1).toUpperCase(),
          lyricPath: bindings[fileId] || null
        });
      }
    }
    return files;
  }
  return [];
});

// 选择歌词文件
ipcMain.handle('select-lyric-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '歌词文件', extensions: ['lrc', 'txt'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled) {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return {
      path: result.filePaths[0],
      content: content
    };
  }
  return null;
});

// 读取歌词文件
ipcMain.handle('read-lyric-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    }
  } catch (error) {
    console.error('读取歌词文件失败:', error);
  }
  return null;
});

// 自动查找歌词文件
ipcMain.handle('auto-find-lyric', async (event, musicPath) => {
  try {
    const dir = path.dirname(musicPath);
    const baseName = path.basename(musicPath, path.extname(musicPath));
    
    // 可能的歌词文件名
    const possibleNames = [
      baseName + '.lrc',
      baseName + '.txt',
      baseName + '.LRC',
      baseName + '.TXT'
    ];
    
    for (const name of possibleNames) {
      const lyricPath = path.join(dir, name);
      if (fs.existsSync(lyricPath)) {
        const content = fs.readFileSync(lyricPath, 'utf-8');
        return { path: lyricPath, content };
      }
    }
  } catch (error) {
    console.error('自动查找歌词失败:', error);
  }
  return null;
});

// 保存歌词绑定
ipcMain.handle('save-lyric-binding', async (event, musicPath, lyricPath) => {
  try {
    const bindings = loadLyricBindings();
    const fileId = Buffer.from(musicPath).toString('base64');
    if (lyricPath) {
      bindings[fileId] = lyricPath;
    } else {
      delete bindings[fileId];
    }
    saveLyricBindings(bindings);
    return true;
  } catch (error) {
    console.error('保存歌词绑定失败:', error);
    return false;
  }
});

// 获取歌词绑定
ipcMain.handle('get-lyric-binding', async (event, musicPath) => {
  try {
    const bindings = loadLyricBindings();
    const fileId = Buffer.from(musicPath).toString('base64');
    return bindings[fileId] || null;
  } catch (error) {
    console.error('获取歌词绑定失败:', error);
    return null;
  }
});

// 扫描文件夹中的音乐
ipcMain.handle('scan-music-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    const folderPath = result.filePaths[0];
    const musicFiles = [];
    const bindings = loadLyricBindings();
    
    const scanDir = async (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          await scanDir(fullPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.wma', '.aac'].includes(ext)) {
            try {
              const metadata = await musicMetadata.parseFile(fullPath);
              const fileId = Buffer.from(fullPath).toString('base64');
              musicFiles.push({
                path: fullPath,
                name: path.basename(fullPath, ext),
                title: metadata.common.title || path.basename(fullPath, ext),
                artist: metadata.common.artist || '未知艺术家',
                album: metadata.common.album || '未知专辑',
                duration: metadata.format.duration || 0,
                cover: metadata.common.picture ? 
                  `data:${metadata.common.picture[0].format};base64,${metadata.common.picture[0].data.toString('base64')}` : 
                  null,
                size: stat.size,
                format: ext.slice(1).toUpperCase(),
                lyricPath: bindings[fileId] || null
              });
            } catch (error) {
              console.error('解析文件失败:', fullPath);
            }
          }
        }
      }
    };
    
    await scanDir(folderPath);
    return musicFiles;
  }
  return [];
});

// 获取音频文件为 data URL
ipcMain.handle('get-audio-data', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'flac': 'audio/flac',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'ogg': 'audio/ogg',
      'wma': 'audio/x-ms-wma',
      'aac': 'audio/aac'
    };
    const mimeType = mimeTypes[ext] || 'audio/mpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('读取音频文件失败:', error);
    return null;
  }
});

// 桌面歌词控制
ipcMain.handle('toggle-lyrics-window', (event, show) => {
  if (show) {
    if (!lyricsWindow) {
      createLyricsWindow();
    } else {
      lyricsWindow.show();
    }
  } else {
    if (lyricsWindow) {
      lyricsWindow.hide();
    }
  }
});

ipcMain.handle('update-lyrics', (event, data) => {
  if (lyricsWindow) {
    lyricsWindow.webContents.send('lyrics-update', data);
  }
});

ipcMain.handle('close-lyrics-window', () => {
  if (lyricsWindow) {
    lyricsWindow.close();
    lyricsWindow = null;
  }
});

// 设置歌词窗口位置（用于拖拽）
ipcMain.handle('set-lyrics-position', (event, position) => {
  if (lyricsWindow && !isLyricsLocked) {
    lyricsWindow.setPosition(position.x, position.y);
  }
});

// 获取歌词窗口位置
ipcMain.handle('get-lyrics-position', () => {
  if (lyricsWindow) {
    return lyricsWindow.getPosition();
  }
  return null;
});

// 设置歌词锁定状态
ipcMain.handle('set-lyrics-locked', (event, locked) => {
  isLyricsLocked = locked;
  if (lyricsWindow) {
    if (locked) {
      lyricsWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      lyricsWindow.setIgnoreMouseEvents(false);
    }
  }
});

// 获取歌词锁定状态
ipcMain.handle('get-lyrics-locked', () => {
  return isLyricsLocked;
});

// 获取应用版本
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// ==================== B站视频相关 IPC ====================

const BILI_API = {
  info: 'https://api.bilibili.com/x/web-interface/view',
  playurl: 'https://api.bilibili.com/x/player/playurl'
};

// 获取视频信息
ipcMain.handle('bilibili-get-video-info', async (event, { bvid, aid }) => {
  try {
    const params = bvid ? { bvid } : { aid };
    const response = await axios.get(BILI_API.info, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });
    if (response.data.code !== 0) {
      throw new Error(response.data.message || '获取视频信息失败');
    }
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('B站视频信息获取失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取视频播放地址（DASH格式）
ipcMain.handle('bilibili-get-playurl', async (event, { bvid, cid, qn = 80 }) => {
  try {
    const params = {
      bvid,
      cid,
      qn,
      fnval: 4048,  // DASH格式
      fourk: 1,
      platform: 'pc'
    };
    const response = await axios.get(BILI_API.playurl, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://www.bilibili.com/video/${bvid}`,
      }
    });
    if (response.data.code !== 0) {
      throw new Error(response.data.message || '获取播放地址失败');
    }
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('B站播放地址获取失败:', error);
    return { success: false, error: error.message };
  }
});

// 搜索视频（可选）
ipcMain.handle('bilibili-search', async (event, { keyword, page = 1 }) => {
  try {
    const response = await axios.get('https://api.bilibili.com/x/web-interface/search/type', {
      params: {
        search_type: 'video',
        keyword,
        page
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://search.bilibili.com'
      }
    });
    if (response.data.code !== 0) {
      throw new Error(response.data.message || '搜索失败');
    }
    return { success: true, data: response.data.data.result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});