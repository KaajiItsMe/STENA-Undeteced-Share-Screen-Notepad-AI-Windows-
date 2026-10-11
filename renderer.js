// ==========================================
// AMBIL ELEMEN
// ==========================================
const noteInput = document.getElementById('noteInput');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const btnMinimize = document.getElementById('btnMinimize');
const btnClose = document.getElementById('btnClose');

// ⭐ BARU: Elemen AI
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const btnSendChat = document.getElementById('btnSendChat');
const tabBtns = document.querySelectorAll('.tab-btn');
const aiActionBtns = document.querySelectorAll('.ai-action-btn');

// ⭐ Document chip elements
const docChipArea = document.getElementById('docChipArea');
const chipIcon = document.getElementById('chipIcon');
const chipName = document.getElementById('chipName');
const btnRemoveDoc = document.getElementById('btnRemoveDoc');

// ⭐ Konteks dokumen yang diupload (disimpan di sini, bukan di input)
let documentContext = null; // { text, fileName, ext }
let conversationHistory = []; // ⭐ Riwayat chat AI

// ==========================================
// AUTOSAVE (Simpan otomatis setiap 1 detik)
// ==========================================
let saveTimeout = null;

function autoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        const content = noteInput.value;
        const result = await window.stealthAPI.saveNote(content);
        if (result.success) {
            // console.log('✅ Note saved:', result.path);
        }
    }, 1000);
}

noteInput.addEventListener('input', autoSave);

// ==========================================
// LOAD NOTE SAAT START
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inisialisasi status window & tab
    const state = await window.stealthAPI.getWindowState();
    if (state.isVisible) {
        // ... penanganan UI visible
    }

    // Load Note
    const result = await window.stealthAPI.loadNote();
    if (result.success && result.content) {
        noteInput.value = result.content;
    }

    // Load Chat History
    const chatResult = await window.stealthAPI.loadChat();
    if (chatResult.success && chatResult.chatData && chatResult.chatData.length > 0) {
        conversationHistory = chatResult.chatData;
        chatMessages.innerHTML = ''; 
        addMessage('👋 Halo lagi! Saya mengingat pembicaraan kita sebelumnya. Mari lanjutkan!', 'ai');
        
        // Render semua history
        conversationHistory.forEach(msg => {
            if (msg.role === 'user') {
                let displayText = msg.content;
                if (displayText.startsWith('ℹ️ Dokumen terlampir:')) {
                    const parts = displayText.split('\n\n---\n');
                    displayText = `📎 [Dokumen] → ${parts.length > 1 ? parts[1] : '...'}`;
                }
                addMessage(displayText, 'user');
            } else if (msg.role === 'assistant') {
                addMessage(renderMarkdown(msg.content), 'ai');
            }
        });
    }
});

// ==========================================
// UPDATE STATUS VISIBILITY
// ==========================================
async function updateStatus() {
    const state = await window.stealthAPI.getWindowState();
    if (state.isVisible) {
        statusDot.className = 'status-dot';
        statusText.textContent = 'Visible';
    } else {
        statusDot.className = 'status-dot hidden';
        statusText.textContent = 'Hidden';
    }
}
updateStatus();

// ==========================================
// LISTENER STATUS DARI MAIN PROCESS
// ==========================================
window.stealthAPI.onVisibilityChanged?.((event, data) => {
    if (data.isVisible) {
        statusDot.className = 'status-dot';
        statusText.textContent = 'Visible';
    } else {
        statusDot.className = 'status-dot hidden';
        statusText.textContent = 'Hidden';
    }
});

// ==========================================
// TOMBOL MINIMIZE & CLOSE
// ==========================================
btnMinimize.addEventListener('click', () => {
    window.stealthAPI.toggleWindow?.();
});

btnClose.addEventListener('click', () => {
    window.stealthAPI.quitApp?.(); // ⭐ End task sepenuhnya
});

// ==========================================
// KEYBOARD SHORTCUT (Save manual & Panic Hide)
// ==========================================
document.addEventListener('keydown', (e) => {
    // Tombol Panik (Esc) untuk sembunyi
    if (e.key === 'Escape') {
        e.preventDefault();
        window.stealthAPI.hideWindow();
    }
    
    // Save manual (Ctrl+S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        autoSave();
        noteInput.style.opacity = '0.7';
        setTimeout(() => noteInput.style.opacity = '1', 200);
    }
});

// ==========================================
// ⭐ BARU: TAB SWITCH (Notepad / AI)
// ==========================================
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Hapus active dari semua
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        // Aktifkan yang dipilih
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        document.getElementById(`tab-${tabId}`).classList.add('active');

        // Fokus ke input chat kalau pindah ke tab AI
        if (tabId === 'ai') {
            setTimeout(() => chatInput.focus(), 100);
        }
    });
});

// ==========================================
// ⭐ BARU: AI CHAT
// ==========================================

// Kirim pesan ke AI
async function sendChatMessage() {
    const userMessage = chatInput.value.trim();
    if (!userMessage && !documentContext) return;

    let messageToSend = userMessage;
    if (documentContext) {
        const preview = documentContext.text.slice(0, 6000);
        const truncated = documentContext.text.length > 6000 ? '\n\n...(teks dipotong)' : '';
        messageToSend = `ℹ️ Dokumen terlampir: ${documentContext.fileName}\n\n${preview}${truncated}\n\n---\n${userMessage}`;
    }

    // Tampilkan pesan user
    const displayMessage = documentContext
        ? `📎 ${documentContext.fileName}  →  ${userMessage}`
        : userMessage;
    addMessage(displayMessage, 'user');
    chatInput.value = '';
    // Bersihkan chip dokumen setelah dilampirkan ke pesan ini
    // agar chat berikutnya tidak terus-menerus menempelkan dokumen ribuan karakter ini
    if (documentContext) {
        clearDocChip();
    }

    // Simpan ke riwayat visual
    conversationHistory.push({ role: 'user', content: messageToSend });
    if (conversationHistory.length > 40) {
        conversationHistory = conversationHistory.slice(-40);
    }
    await window.stealthAPI.saveChat(conversationHistory);

    // Tampilkan loading
    const loadingMsg = addMessage('⏳ Mengetik...', 'ai');

    try {
        // Ambil riwayat percakapan terbaru saja (maksimal 6 pesan = 3 putaran tanya jawab)
        // Ini menjaga agar prompt tidak kehabisan batas token API
        const recentHistory = conversationHistory.slice(-6);

        const payload = [
            {
                role: 'system',
                content: `Kamu adalah asisten AI yang ramah, ringkas, dan membantu. Jawab dengan bahasa Indonesia yang natural, padat, dan jelas untuk menghemat token.`
            },
            ...recentHistory
        ];

        // Kirim ke AI
        const result = await window.stealthAPI.ai.chat(payload);
        
        // Hapus loading
        loadingMsg.remove();

        if (result.success) {
            addMessage(renderMarkdown(result.content), 'ai');
            // Simpan jawaban AI ke riwayat
            conversationHistory.push({ role: 'assistant', content: result.content });
            if (conversationHistory.length > 40) {
                conversationHistory = conversationHistory.slice(-40);
            }
            await window.stealthAPI.saveChat(conversationHistory);
        } else {
            addMessage(`❌ Error: ${result.error}`, 'ai');
        }
    } catch (error) {
        loadingMsg.remove();
        addMessage(`❌ Error: ${error.message}`, 'ai');
    }

    btnSendChat.disabled = false;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Tambah pesan ke chat
function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

// ⭐ Render Markdown ke HTML
function renderMarkdown(text) {
    // Escape HTML dulu untuk keamanan
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code block (```...```) — proses duluan sebelum yang lain
    html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
        return `<div class="code-block">${code.trim()}</div>`;
    });

    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.3);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:11px;">$1</code>');

    // Heading ### ## #
    html = html.replace(/^### (.+)$/gm, '<strong style="font-size:13px;color:rgba(255,255,255,0.95);">$1</strong>');
    html = html.replace(/^## (.+)$/gm, '<strong style="font-size:14px;color:rgba(255,255,255,0.95);">$1</strong>');
    html = html.replace(/^# (.+)$/gm, '<strong style="font-size:15px;color:rgba(255,255,255,0.95);">$1</strong>');

    // Bold **text** atau __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic *text* atau _text_ (tidak menabrak bold)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // List item: - item atau * item atau 1. item
    html = html.replace(/^\s*[-*] (.+)$/gm, '<div style="padding-left:12px;">• $1</div>');
    html = html.replace(/^\s*\d+\. (.+)$/gm, (_, item, offset, str) => {
        return `<div style="padding-left:12px;">$1</div>`.replace('$1', item);
    });

    // Garis horizontal ---
    html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:6px 0;">');

    // Newline → <br>
    html = html.replace(/\n/g, '<br>');

    return html;
}

// Event: Send chat
btnSendChat.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
});

// Tombol Hapus Chat
if (btnClearChat) {
    btnClearChat.addEventListener('click', async () => {
        conversationHistory = [];
        await window.stealthAPI.saveChat(conversationHistory);
        chatMessages.innerHTML = `<div class="message ai">👋 Riwayat obrolan telah dihapus! Ada yang bisa saya bantu sekarang?</div>`;
    });
}

// ==========================================
// ⭐ BARU: AI ACTION BUTTONS
// ==========================================
aiActionBtns.forEach(btn => {
    // Skip tombol upload (sudah di-handle terpisah)
    if (btn.id === 'btnExtractDoc' || btn.id === 'btnClearChat') return;

    btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const selectedText = noteInput.value.substring(
            noteInput.selectionStart,
            noteInput.selectionEnd
        );

        // Ambil teks yang dipilih atau semua
        const text = selectedText || noteInput.value || 'topik umum';

        // Switch ke tab AI
        document.querySelector('[data-tab="ai"]').click();

        // Kirim command sesuai action
        let command = '';
        switch (action) {
            case 'explain':
                command = `Jelaskan konsep atau topik ini dengan cara yang mudah dipahami (seperti dosen ke mahasiswa):\n\n${text}`;
                break;
            case 'debug':
                command = `Bantu saya memahami masalah ini dan berikan solusi:\n\n${text}`;
                break;
            case 'refactor':
                command = `Berikan saran perbaikan atau cara yang lebih baik untuk ini:\n\n${text}`;
                break;
            case 'test':
                command = `Bantu saya menyelesaikan tugas atau soal ini (berikan bimbingan step by step):\n\n${text}`;
                break;
            case 'generate':
                command = `Bantu saya membuat / menulis tentang topik ini:\n\n${text}`;
                break;
            default:
                command = text;
        }

        chatInput.value = command;
        setTimeout(() => sendChatMessage(), 300);
    });
});

// ==========================================
// ⭐ BARU: EKSTRAK DOKUMEN (UPLOAD FILE)
// ==========================================

// Helper: ikon berdasarkan ekstensi file
function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📕';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['ppt', 'pptx'].includes(ext)) return '📙';
    if (['txt', 'md'].includes(ext)) return '📝';
    return '📄';
}

// Helper: tampilkan chip
function showDocChip(fileName) {
    chipIcon.textContent = getFileIcon(fileName);
    chipName.textContent = fileName;
    docChipArea.classList.add('visible');
    chatInput.placeholder = 'Ketik perintah... (misal: jelaskan isi dokumen ini)';
    chatInput.focus();
}

// Helper: hapus chip & konteks
function clearDocChip() {
    documentContext = null;
    docChipArea.classList.remove('visible');
    chatInput.placeholder = 'Tanya AI atau minta bikin kode...';
}

// Tombol hapus chip
btnRemoveDoc.addEventListener('click', () => {
    clearDocChip();
    addMessage('ℹ️ Dokumen dihapus dari konteks.', 'ai');
});

// Helper fungsi utama untuk memproses dokumen (bisa via tombol upload atau drag-and-drop)
async function processDocumentFile(filePath) {
    if (!filePath) return;
    const fileName = filePath.split(/[\\/]/).pop();

    document.querySelector('[data-tab="ai"]').click();
    const loadingMsg = addMessage(`⏳ Membaca ${fileName}...`, 'ai');

    try {
        const result = await window.stealthAPI.extractDocument(filePath);
        loadingMsg.remove();

        if (result.success) {
            // Simpan konteks dokumen
            documentContext = { text: result.text, fileName };
            showDocChip(fileName);
            addMessage(
                `✅ <strong>${fileName}</strong> siap (${result.text.length.toLocaleString()} karakter). Ketik pertanyaan atau perintahmu di bawah!`,
                'ai'
            );
        } else {
            addMessage(`❌ Gagal membaca dokumen: ${result.error}`, 'ai');
        }
    } catch (error) {
        loadingMsg.remove();
        addMessage(`❌ Error: ${error.message}`, 'ai');
    }
}

const btnExtractDoc = document.getElementById('btnExtractDoc');

if (btnExtractDoc) {
    btnExtractDoc.addEventListener('click', async () => {
        let files;
        try {
            files = await window.stealthAPI.selectDocument();
        } catch (error) {
            addMessage(`❌ Gagal membuka dialog file: ${error.message}`, 'ai');
            return;
        }

        if (!files || files.length === 0) return;

        btnExtractDoc.disabled = true;
        await processDocumentFile(files[0]);
        btnExtractDoc.disabled = false;
    });
}

// ⭐ Dukungan Drag & Drop Dokumen ke area AI Chat
const tabAi = document.getElementById('tab-ai');
if (tabAi) {
    ['dragenter', 'dragover'].forEach(eventName => {
        tabAi.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            tabAi.style.outline = '2px dashed rgba(99, 102, 241, 0.7)';
            tabAi.style.outlineOffset = '-4px';
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        tabAi.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            tabAi.style.outline = '';
            tabAi.style.outlineOffset = '';
        });
    });

    tabAi.addEventListener('drop', async (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.path) {
                await processDocumentFile(file.path);
            }
        }
    });
}

// ==========================================
// ⭐ BARU: MODE KURSOR SILUMAN (Anti-Floating Caret)
// ==========================================
const btnToggleCaret = document.getElementById('btnToggleCaret');

function setCaretMode(isNormal) {
    if (isNormal) {
        document.body.classList.add('visible-caret');
        if (btnToggleCaret) {
            btnToggleCaret.title = 'Kursor: Normal (Bisa tertangkap rekaman) [Ctrl+Shift+C]';
        }
    } else {
        document.body.classList.remove('visible-caret');
        if (btnToggleCaret) {
            btnToggleCaret.title = 'Kursor: Siluman (Aman, tidak melayang di rekaman) [Ctrl+Shift+C]';
        }
    }
}

// Inisialisasi: default stealth (kursor tidak melayang)
const savedCaretMode = localStorage.getItem('stena_caret_mode');
setCaretMode(savedCaretMode === 'visible');

if (btnToggleCaret) {
    btnToggleCaret.addEventListener('click', () => {
        const willBeNormal = !document.body.classList.contains('visible-caret');
        setCaretMode(willBeNormal);
        localStorage.setItem('stena_caret_mode', willBeNormal ? 'visible' : 'stealth');
    });
}

// ==========================================
// ⭐ BARU: SHORTCUT UNTUK AI (Ctrl+Shift+A) & KURSOR (Ctrl+Shift+C)
// ==========================================
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+A = Buka tab AI
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        document.querySelector('[data-tab="ai"]').click();
        chatInput.focus();
    }
    // Ctrl+Shift+N = Buka tab Notepad
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        document.querySelector('[data-tab="notepad"]').click();
        noteInput.focus();
    }
    // Ctrl+Shift+C = Toggle Kursor Siluman / Normal
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        const willBeNormal = !document.body.classList.contains('visible-caret');
        setCaretMode(willBeNormal);
        localStorage.setItem('stena_caret_mode', willBeNormal ? 'visible' : 'stealth');
    }
});

// ==========================================
// ⭐ BARU: REKAM SUARA (MIC & SISTEM)
// ==========================================
const btnMic = document.getElementById('btnMic');
const btnMicOpt = document.getElementById('btnMicOpt');
const recOptionsMenu = document.getElementById('recOptionsMenu');
const chkRecMic = document.getElementById('chkRecMic');
const chkRecSystem = document.getElementById('chkRecSystem');

let mediaRecorder = null;
let audioChunks = [];
let activeStreams = [];
let audioContext = null;

// Buka/tutup menu opsi
if (btnMicOpt) {
    btnMicOpt.addEventListener('click', (e) => {
        e.stopPropagation();
        recOptionsMenu.classList.toggle('visible');
    });

    // Tutup menu jika klik di luar
    document.addEventListener('click', (e) => {
        if (!btnMicOpt.contains(e.target) && !recOptionsMenu.contains(e.target)) {
            recOptionsMenu.classList.remove('visible');
        }
    });

    // Validasi agar tidak uncheck keduanya
    const validateCheckboxes = (changedEl, otherEl) => {
        if (!chkRecMic.checked && !chkRecSystem.checked) {
            changedEl.checked = true; // Kembalikan centang
            addMessage('⚠️ Minimal satu sumber rekaman (Mic atau Sistem) harus dipilih!', 'ai');
        }
    };

    chkRecMic.addEventListener('change', () => validateCheckboxes(chkRecMic, chkRecSystem));
    chkRecSystem.addEventListener('change', () => validateCheckboxes(chkRecSystem, chkRecMic));
}

if (btnMic) {
    btnMic.addEventListener('click', async () => {
        // Kalau sedang rekam → STOP dan transkripsi
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            return;
        }

        // Kalau sedang transkripsi → abaikan
        if (btnMic.classList.contains('transcribing')) return;

        try {
            activeStreams = [];
            let finalStream = null;
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';

            const useMic = chkRecMic.checked;
            const useSystem = chkRecSystem.checked;

            let micStream = null;
            let systemStream = null;

            // 1. Dapatkan stream Mic
            if (useMic) {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                activeStreams.push(micStream);
            }

            // 2. Dapatkan stream Sistem
            if (useSystem) {
                const sourceId = await window.stealthAPI.getDesktopSourceId();
                systemStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        mandatory: {
                            chromeMediaSource: 'desktop'
                        }
                    },
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: sourceId
                        }
                    }
                });
                
                // Hentikan video track karena kita hanya butuh audio
                systemStream.getVideoTracks().forEach(track => track.stop());
                activeStreams.push(systemStream);
            }

            // 3. Gabungkan stream (Mixing)
            if (useMic && useSystem) {
                // Mix menggunakan Web Audio API
                audioContext = new AudioContext();
                const dest = audioContext.createMediaStreamDestination();
                
                const micSource = audioContext.createMediaStreamSource(micStream);
                const systemSource = audioContext.createMediaStreamSource(systemStream);
                
                micSource.connect(dest);
                systemSource.connect(dest);
                
                finalStream = dest.stream;
            } else if (useMic) {
                finalStream = micStream;
            } else if (useSystem) {
                finalStream = systemStream;
            }

            // Setup MediaRecorder
            audioChunks = [];
            mediaRecorder = new MediaRecorder(finalStream, { mimeType });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                // Hentikan semua stream dan context
                activeStreams.forEach(stream => {
                    stream.getTracks().forEach(t => t.stop());
                });
                if (audioContext) {
                    audioContext.close();
                    audioContext = null;
                }

                // Ubah status tombol
                btnMic.textContent = '⏳';
                btnMic.classList.remove('recording');
                btnMic.classList.add('transcribing');
                btnMic.title = 'Sedang transkripsi...';

                try {
                    // Gabungkan chunks jadi satu Blob
                    const blob = new Blob(audioChunks, { type: mimeType });
                    const arrayBuffer = await blob.arrayBuffer();

                    // Kirim ke Groq Whisper via IPC
                    const result = await window.stealthAPI.transcribeAudio({
                        buffer: arrayBuffer,
                        mimeType: mimeType.split(';')[0] // 'audio/webm'
                    });

                    if (result.success && result.text) {
                        let finalTxt = result.text.trim();
                        // Filter halusinasi umum Whisper jika tidak ada suara
                        const lowerTxt = finalTxt.toLowerCase();
                        if (lowerTxt === 'terima kasih.' || lowerTxt === 'terima kasih' || lowerTxt === 'terima kasih sudah menonton.' || lowerTxt === 'terima kasih.') {
                            addMessage(`⚠️ Tidak ada suara terdeteksi yang bisa ditranskrip.`, 'ai');
                        } else {
                            // Tambahkan teks ke chat input (tidak ganti, tambahkan)
                            const current = chatInput.value;
                            chatInput.value = current ? `${current} ${finalTxt}` : finalTxt;
                            chatInput.focus();
                            // Hapus addMessage di sini sesuai permintaan user
                        }
                    } else {
                        addMessage(`❌ Transkripsi gagal: ${result.error || 'Tidak ada teks terdeteksi'}`, 'ai');
                    }
                } catch (err) {
                    addMessage(`❌ Error transkripsi: ${err.message}`, 'ai');
                } finally {
                    // Reset tombol
                    btnMic.textContent = '🎤';
                    btnMic.classList.remove('transcribing');
                    btnMic.title = 'Rekam suara';
                }
            };

            // Mulai rekam
            mediaRecorder.start();
            btnMic.classList.add('recording');
            btnMic.textContent = '⏹';
            btnMic.title = 'Klik lagi untuk stop & transkripsi';
            
            let recMsg = useMic && useSystem ? 'Mic + Suara Sistem' 
                       : useMic ? 'Mikrofon' 
                       : 'Suara Sistem';
            addMessage(`🔴 Sedang merekam (${recMsg})... Klik tombol ⏹ untuk stop.`, 'ai');

        } catch (err) {
            if (err.name === 'NotAllowedError') {
                addMessage('❌ Akses rekaman ditolak. Pastikan izin dibolehkan.', 'ai');
            } else {
                addMessage(`❌ Gagal memulai rekaman: ${err.message}`, 'ai');
            }
        }
    });
}

// ==========================================
// FOCUS MANAGEMENT
// ==========================================
console.log('🚀 Stealth Notepad + AI: Renderer ready');