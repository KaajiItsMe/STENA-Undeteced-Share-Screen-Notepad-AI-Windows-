const { contextBridge, ipcRenderer } = require('electron');

// Ekspos API yang aman ke renderer
contextBridge.exposeInMainWorld('stealthAPI', {
    // Simpan note
    saveNote: (content) => ipcRenderer.invoke('save-note', content),

    // Muat note
    loadNote: () => ipcRenderer.invoke('load-note'),

    saveChat: (chatData) => ipcRenderer.invoke('save-chat', chatData),
    loadChat: () => ipcRenderer.invoke('load-chat'),

    // Dapatkan status window
    getWindowState: () => ipcRenderer.invoke('get-window-state'),

    // Event listener untuk toggle (dari shortcut)
    onToggle: (callback) => {
        ipcRenderer.on('toggle-window', callback);
    },

    // Di dalam contextBridge.exposeInMainWorld
    onVisibilityChanged: (callback) => {
        ipcRenderer.on('window-visibility-changed', callback);
    },

    // Toggle window (memanggil main)
    toggleWindow: () => ipcRenderer.send('toggle-window'),

    // Hide window
    hideWindow: () => ipcRenderer.send('hide-window'),

    // Show window
    showWindow: () => ipcRenderer.send('show-window'),

    // Quit aplikasi sepenuhnya
    quitApp: () => ipcRenderer.send('quit-app'),

    // Transkripsi audio via Groq Whisper
    transcribeAudio: (audioData) => ipcRenderer.invoke('transcribe-audio', audioData),

    // Mendapatkan sumber layar untuk audio sistem
    getDesktopSourceId: () => ipcRenderer.invoke('get-desktop-source-id'),

    ai: {
        chat: (messages) => ipcRenderer.invoke('ai-chat', messages),
        chatWithContext: (message) => ipcRenderer.invoke('ai-chat-with-context', message),
        explainConcept: (topic) => ipcRenderer.invoke('ai-explain-concept', topic),
        helpAssignment: (question) => ipcRenderer.invoke('ai-help-assignment', question),
        getMotivation: (topic) => ipcRenderer.invoke('ai-get-motivation', topic),
    },
    extractDocument: (filePath) => ipcRenderer.invoke('extract-document', filePath),
    selectDocument: () => ipcRenderer.invoke('select-document'),
    copyText: (text) => ipcRenderer.invoke('copy-text', text),
});

console.log('🔒 Stealth Notepad: Preload loaded successfully');

