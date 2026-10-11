const { app, BrowserWindow, globalShortcut, screen, ipcMain, dialog, desktopCapturer, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

// ⭐ SETUP REMOTE DENGAN BENAR
const remote = require('@electron/remote/main');
remote.initialize();

let mainWindow = null;
let isWindowVisible = false;
let isToggling = false;
let windowPosition = { x: 100, y: 100 };
let windowSize = { width: 400, height: 300 };

// ============================================
// PRESERVE CONFIGURATION
// ============================================
function preserveConfiguration() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    mainWindow.setContentProtection(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.setSkipTaskbar(true);

    if (process.platform === 'darwin') {
        mainWindow.setHiddenInMissionControl(true);
        mainWindow.setWindowButtonVisibility(false);
        mainWindow.setHasShadow(false);
    }
}

// ============================================
// SHOW / HIDE / TOGGLE WINDOW
// ============================================
function showWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    mainWindow.setBounds({
        x: windowPosition.x,
        y: windowPosition.y,
        width: windowSize.width,
        height: windowSize.height
    });

    mainWindow.setSkipTaskbar(true);

    mainWindow.setOpacity(0);
    mainWindow.showInactive();
    setTimeout(() => {
        mainWindow.setSkipTaskbar(true);
        mainWindow.setOpacity(1);
    }, 50);

    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.setFocusable(true);

    isWindowVisible = true;
    mainWindow.webContents.send('window-visibility-changed', { isVisible: true });
}

function hideWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.setFocusable(false);
    mainWindow.hide();

    isWindowVisible = false;
    mainWindow.webContents.send('window-visibility-changed', { isVisible: false });
}

function toggleWindow() {
    if (isToggling) return;
    isToggling = true;

    if (isWindowVisible) {
        hideWindow();
    } else {
        showWindow();
    }

    setTimeout(() => {
        isToggling = false;
    }, 300);
}

// ============================================
// SHORTCUT KEYBOARD GLOBAL
// ============================================
function registerShortcuts() {
    globalShortcut.unregisterAll(); // Bersihkan dari instance sebelumnya

    // ⭐ Ctrl+Shift+B = Toggle (tidak bentrok dengan VS Code)
    const isB = globalShortcut.register('CommandOrControl+Shift+B', toggleWindow);
    if (!isB) console.error('⚠️ Gagal register Ctrl+Shift+B!');
    else console.log('✅ Ctrl+Shift+B terdaftar (Toggle window)');

    globalShortcut.register('CommandOrControl+Shift+H', hideWindow);
    globalShortcut.register('CommandOrControl+Shift+Up', moveWindowUp);
    globalShortcut.register('CommandOrControl+Shift+Down', moveWindowDown);
    globalShortcut.register('CommandOrControl+Shift+Left', moveWindowLeft);
    globalShortcut.register('CommandOrControl+Shift+Right', moveWindowRight);
    globalShortcut.register('CommandOrControl+Shift+R', resetPosition);

    console.log('✅ Semua shortcuts registered!');
}

// ============================================
// FUNGSI PERPINDAHAN WINDOW
// ============================================
const STEP = 60;

function moveWindow(dx, dy) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!isWindowVisible) return; // ⭐ JANGAN pindah jika window disembunyikan

    const [x, y] = mainWindow.getPosition();
    const newX = Math.round(x + dx);
    const newY = Math.round(y + dy);
    mainWindow.setPosition(newX, newY);
    windowPosition = { x: newX, y: newY };
}

function moveWindowUp() { moveWindow(0, -STEP); }
function moveWindowDown() { moveWindow(0, STEP); }
function moveWindowLeft() { moveWindow(-STEP, 0); }
function moveWindowRight() { moveWindow(STEP, 0); }

function resetPosition() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;
    const newX = width - windowSize.width - 50;
    const newY = height - windowSize.height - 100;
    mainWindow.setPosition(newX, newY);
    windowPosition = { x: newX, y: newY };
}

// ============================================
// CREATE WINDOW
// ============================================
function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const defaultX = width - windowSize.width - 50;
    const defaultY = height - windowSize.height - 100;

    mainWindow = new BrowserWindow({
        width: windowSize.width,
        height: windowSize.height,
        x: defaultX,
        y: defaultY,

        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: false,
        skipTaskbar: true,
        type: 'toolbar',
        alwaysOnTop: true,
        alwaysOnTopLevel: 'screen-saver',
        fullscreenable: false,
        enableLargerThanScreen: true,

        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    remote.enable(mainWindow.webContents);

    mainWindow.loadFile('index.html');
    mainWindow.setContentProtection(true);

    // ⭐ Izinkan akses mikrofon & media
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowed = ['media', 'audioCapture', 'mediaKeySystem'];
        callback(allowed.includes(permission));
    });
    mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
        const allowed = ['media', 'audioCapture'];
        return allowed.includes(permission);
    });

    mainWindow.setOpacity(0);
    mainWindow.showInactive();
    setTimeout(() => {
        mainWindow.setSkipTaskbar(true);
        mainWindow.setOpacity(1);
    }, 100);

    if (process.platform === 'darwin') {
        mainWindow.setHiddenInMissionControl(true);
        mainWindow.setWindowButtonVisibility(false);
        mainWindow.setHasShadow(false);
    }

    mainWindow.on('moved', () => {
        const [x, y] = mainWindow.getPosition();
        windowPosition = { x, y };
    });

    mainWindow.on('resized', () => {
        const [width, height] = mainWindow.getSize();
        windowSize = { width, height };
    });

    mainWindow.on('focus', preserveConfiguration);
    mainWindow.on('closed', () => { mainWindow = null; });

    isWindowVisible = true;
    registerShortcuts();
}

// ============================================
// ⭐ HANDLER AI & EKSTRAK DOKUMEN
// ============================================
const aiService = require('./ai-service.js');
const { extractTextFromFile } = require('./document-extractor');

// --- Ekstrak Dokumen ---
ipcMain.handle('extract-document', async (event, filePath) => {
    return await extractTextFromFile(filePath);
});

// --- Pilih Dokumen via Dialog ---
ipcMain.handle('select-document', async (event) => {
    const result = dialog.showOpenDialogSync({
        properties: ['openFile'],
        filters: [
            { name: '📄 Semua Dokumen Yang Didukung', extensions: ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'md', 'csv', 'json'] },
            { name: '📕 Dokumen PDF (*.pdf)', extensions: ['pdf'] },
            { name: '📘 Dokumen Word (*.docx, *.doc)', extensions: ['docx', 'doc'] },
            { name: '📙 Dokumen PowerPoint (*.pptx, *.ppt)', extensions: ['pptx', 'ppt'] },
            { name: '📝 Dokumen Teks (*.txt, *.md, *.csv, *.json)', extensions: ['txt', 'md', 'csv', 'json'] },
        ],
    });
    return result;
});

// --- Salin Teks ke Clipboard ---
ipcMain.handle('copy-text', async (event, text) => {
    clipboard.writeText(text || '');
    return true;
});

// --- Transkripsi Audio (Groq Whisper) ---
ipcMain.handle('transcribe-audio', async (event, audioData) => {
    try {
        const buffer = Buffer.from(audioData.buffer);
        return await aiService.transcribeAudio(buffer, audioData.mimeType);
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// --- Mendapatkan ID Layar untuk Perekaman Sistem ---
ipcMain.handle('get-desktop-source-id', async () => {
    try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        return sources[0].id;
    } catch (error) {
        console.error("Error getting desktop source:", error);
        throw error;
    }
});

// --- AI (Groq) ---
ipcMain.handle('ai-chat', async (event, messages) => {
    return await aiService.chat(messages);
});

ipcMain.handle('ai-chat-with-context', async (event, message) => {
    return await aiService.chatWithContext(message);
});

ipcMain.handle('ai-explain-concept', async (event, topic) => {
    return await aiService.explainConcept(topic);
});

ipcMain.handle('ai-help-assignment', async (event, question) => {
    return await aiService.helpAssignment(question);
});

ipcMain.handle('ai-get-motivation', async (event, topic) => {
    return await aiService.getMotivation(topic);
});

// ============================================
// IPC HANDLER (LAINNYA)
// ============================================
ipcMain.handle('save-note', async (event, content) => {
    try {
        const filePath = path.join(app.getPath('documents'), 'stealth-note.txt');
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true, path: filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-note', async () => {
    try {
        const filePath = path.join(app.getPath('documents'), 'stealth-note.txt');
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            return { success: true, content };
        }
        return { success: true, content: '' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-chat', async (event, chatData) => {
    try {
        const filePath = path.join(app.getPath('documents'), 'stealth-chat.json');
        fs.writeFileSync(filePath, JSON.stringify(chatData, null, 2), 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-chat', async () => {
    try {
        const filePath = path.join(app.getPath('documents'), 'stealth-chat.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return { success: true, chatData: JSON.parse(data) };
        }
        return { success: true, chatData: [] }; // Kosong jika belum ada
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-window-state', async () => {
    return { isVisible: isWindowVisible };
});

ipcMain.on('toggle-window', toggleWindow);
ipcMain.on('hide-window', hideWindow);
ipcMain.on('show-window', showWindow);

// ⭐ Tombol X → Kill semua proses paksa (agar shortcut tidak nyangkut)
ipcMain.on('quit-app', () => {
    globalShortcut.unregisterAll(); // Lepas shortcut dulu
    const { exec } = require('child_process');
    
    // Ambil nama file exe yang sedang berjalan (bisa "electron.exe" saat dev, atau "System Monitor.exe" saat production)
    const exeName = path.basename(process.execPath);
    
    // Jalankan taskkill di background lalu langsung exit
    exec(`taskkill /F /IM "${exeName}" /T`, () => {});
    setTimeout(() => app.exit(0), 100); // Exit paksa setelah 100ms
});

// ============================================
// LIFECYCLE APP
// ============================================
app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

console.log('🚀 Stealth Notepad: Main process ready');