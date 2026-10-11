// ai-service.js - Service untuk Groq API (GRATIS)
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env bawaan (jika jalan di mode development)
dotenv.config();

// Cari API.txt di lokasi file .exe atau working directory
const exeDir = path.dirname(process.execPath);
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR; // Folder tempat .exe portable berada

const possiblePaths = [
    ...(portableDir ? [path.join(portableDir, 'API.txt'), path.join(portableDir, 'API.example.txt')] : []),
    path.join(exeDir, 'API.txt'),
    path.join(exeDir, 'API.example.txt'),
    path.join(process.cwd(), 'API.txt'),
    path.join(process.cwd(), 'API.example.txt')
];

for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        const envConfig = dotenv.parse(fs.readFileSync(p));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
        break; // Stop jika sudah ketemu salah satu
    }
}

// Obfuscated built-in fallback credentials (Google Gemini 3.8 Flash)
const _0x_k = [27,10,114,28,60,103,50,20,109,22,26,54,8,16,104,108,107,23,26,106,8,3,110,101,108,4,58,63,34,44,6,52,13,61,18,12,29,54,22,109,16,23,104,29,53,53,50,55,41,42,15,22,42];
const _0x_u = [50,47,40,45,45,101,79,117,60,57,51,59,45,1,46,50,42,56,50,62,14,61,46,61,58,59,113,7,53,52,59,49,59,62,16,51,40,114,62,49,50,79,44,106,62,56,42,62,79,53,43,57,51,63,54];
const _0x_s = 0x5a;

function _resolveFallback(arr, s) {
    return Buffer.from(arr.map((b, i) => b ^ (s + (i % 7)))).toString('utf8');
}

function _isUsableKey(k) {
    if (!k) return false;
    const s = String(k).trim();
    if (!s) return false;
    if (s.includes('MASUKKAN_') || s.includes('your_') || s.includes('YOUR_') || s.includes('gsk_xxxx')) return false;
    return true;
}

class AIService {
    constructor() {
        const customKey = process.env.ROUTER_API_KEY || process.env.API_KEY || process.env.GROQ_API_KEY || '';
        const isCustomConfigured = _isUsableKey(customKey);

        if (isCustomConfigured) {
            // Pengguna menyediakan kunci pribadi sendiri di API.txt
            const isGroqOnly = process.env.GROQ_API_KEY && !process.env.ROUTER_API_KEY && !process.env.API_KEY && !process.env.ROUTER_BASE_URL;
            const rawBaseUrl = process.env.ROUTER_BASE_URL || process.env.API_BASE_URL || (isGroqOnly ? 'https://api.groq.com/openai/v1' : 'http://localhost:20128/v1');
            this.baseUrl = rawBaseUrl.replace(/\/+$/, '');
            this.apiKey = customKey;
            this.model = process.env.ROUTER_MODEL || process.env.AI_MODEL || process.env.GROQ_MODEL || (isGroqOnly ? 'llama-3.3-70b-versatile' : 'ag/gemini-3.8-flash');
            console.log('🔑 Menggunakan Konfigurasi Pribadi Pengguna dari API.txt');
        } else {
            // Gunakan Default Built-in Fallback (Google Gemini 3.8 Flash Resmi)
            this.baseUrl = _resolveFallback(_0x_u, _0x_s);
            this.apiKey = _resolveFallback(_0x_k, _0x_s);
            this.model = 'gemini-3.8-flash';
            console.log('🤖 Menggunakan Default Built-in AI Fallback (Gemini 3.8 Flash)');
        }

        if (this.baseUrl.includes('googleapis.com')) {
            this.model = this.model.replace(/^ag\//, '');
        }

        // Parameter token & konteks hemat
        this.maxTokens = parseInt(process.env.MAX_TOKENS, 10) || 2048;
        this.maxHistoryMessages = parseInt(process.env.MAX_HISTORY_MESSAGES, 10) || 6;
        this.maxContextChars = parseInt(process.env.MAX_CONTEXT_CHARS, 10) || 12000;
    }

    // ============================================
    // OPTIMASI PESAN (HEMAT TOKEN / SLIDING WINDOW)
    // ============================================
    optimizeMessages(messages) {
        if (!Array.isArray(messages) || messages.length === 0) return messages;

        // Pisahkan system message (instruksi awal) dari percakapan
        const systemMessages = messages.filter(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        // 1. Sliding Window: Ambil N pesan percakapan terakhir saja
        let trimmedChat = chatMessages.slice(-this.maxHistoryMessages);

        // 2. Pemangkasan lampiran dokumen lama:
        // Jika ada pesan lama yang memuat teks dokumen panjang (misal 6000 karakter),
        // pangkas isi dokumennya dan sisakan pertanyaannya saja, kecuali jika itu pesan user paling akhir.
        trimmedChat = trimmedChat.map((msg, index) => {
            const isLastMessage = (index === trimmedChat.length - 1);
            if (!isLastMessage && msg.role === 'user' && typeof msg.content === 'string') {
                if (msg.content.includes('ℹ️ Dokumen terlampir:')) {
                    const parts = msg.content.split('\n\n---\n');
                    const question = parts.length > 1 ? parts.slice(1).join('\n\n---\n') : msg.content;
                    const docHeader = msg.content.match(/ℹ️ Dokumen terlampir:[^\n]+/);
                    const docTitle = docHeader ? docHeader[0] : 'Dokumen terlampir';
                    return {
                        role: 'user',
                        content: `[Lampiran sebelumnya: ${docTitle} (konten dokumen diringkas untuk hemat token)]\n\n${question}`
                    };
                }
            }
            return msg;
        });

        // 3. Karakter budget cap: Jika total karakter masih melebihi batas aman,
        // buang pesan yang paling lama satu per satu.
        let totalChars = trimmedChat.reduce((sum, m) => sum + (m.content ? m.content.length : 0), 0);
        while (trimmedChat.length > 2 && totalChars > this.maxContextChars) {
            const removed = trimmedChat.shift();
            if (removed && removed.content) {
                totalChars -= removed.content.length;
            }
        }

        return [...systemMessages, ...trimmedChat];
    }

    // ============================================
    // CHAT DENGAN AI (UMUM / KULIAH)
    // ============================================
    async chat(messages) {
        try {
            const optimizedMessages = this.optimizeMessages(messages);
            const headers = {
                'Content-Type': 'application/json',
            };
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: this.model,
                    messages: optimizedMessages,
                    max_tokens: this.maxTokens,
                    temperature: 0.7,
                },
                { headers }
            );

            return {
                success: true,
                content: response.data.choices[0].message.content,
                usage: response.data.usage
            };
        } catch (error) {
            console.error('❌ AI Router Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    // ============================================
    // CHAT DENGAN PROMPT KHUSUS (UNTUK KULIAH)
    // ============================================
    async chatWithContext(userMessage) {
        const messages = [
            {
                role: 'system',
                content: `Kamu adalah asisten AI yang ramah, sabar, dan membantu. 
                Kamu bisa menjawab pertanyaan tentang apa saja — mulai dari teknologi, 
                kehidupan sehari-hari, saran, motivasi, tugas sekolah, tugas kuliah, 
                penjelasan konsep, sampai hal-hal umum lainnya. 
                
                Aturan menjawab:
                1. SECARA DEFAULT, berikan jawaban yang singkat, padat, dan tidak terlalu panjang (jangan bertele-tele) untuk menghemat token.
                2. JIKA pengguna secara spesifik meminta 'detail', 'lengkap', atau 'jelaskan', barulah berikan jawaban yang panjang, bebas, dan rinci.
                3. Gunakan bahasa Indonesia yang natural, santai, dan mudah dipahami
                4. Jika ditanya tentang tugas kuliah, berikan konsep inti saja kecuali diminta detail.
                5. Jika tidak tahu, katakan dengan jujur.

                Kamu adalah teman belajar yang asyik!`
            },
            {
                role: 'user',
                content: userMessage
            }
        ];

        return await this.chat(messages);
    }

    // ============================================
    // JELASKAN KONSEP (BUAT TUGAS KULIAH)
    // ============================================
    async explainConcept(topic) {
        const messages = [
            {
                role: 'system',
                content: `Kamu adalah dosen yang ramah dan suka menjelaskan dengan cara sederhana. 
                Jelaskan konsep dengan:
                1. Definisi sederhana
                2. Analogi kehidupan sehari-hari
                3. Contoh konkret
                4. Manfaat / aplikasi di dunia nyata`
            },
            {
                role: 'user',
                content: `Jelaskan konsep "${topic}" dengan cara yang mudah dipahami oleh mahasiswa.`
            }
        ];

        return await this.chat(messages);
    }

    // ============================================
    // BANTU JAWAB TUGAS / SOAL
    // ============================================
    async helpAssignment(question) {
        const messages = [
            {
                role: 'system',
                content: `Kamu adalah tutor pribadi yang sabar. 
                Bantu mahasiswa mengerjakan tugas dengan cara:
                1. Bantu memahami soal
                2. Berikan petunjuk / hint
                3. Jelaskan langkah-langkah penyelesaian
                4. Berikan contoh serupa
                JANGAN langsung memberikan jawaban final, tapi bimbing ke arah jawaban.`
            },
            {
                role: 'user',
                content: `Bantu saya mengerjakan tugas ini:\n\n${question}`
            }
        ];

        return await this.chat(messages);
    }

    // ============================================
    // MOTIVASI / SARAN HIDUP
    // ============================================
    async getMotivation(topic) {
        const messages = [
            {
                role: 'system',
                content: `Kamu adalah motivator yang hangat dan bijak. 
                Berikan semangat, saran, dan perspektif positif tentang kehidupan. 
                Gunakan bahasa yang menenangkan dan menginspirasi.`
            },
            {
                role: 'user',
                content: `Berikan motivasi tentang: ${topic}`
            }
        ];

        return await this.chat(messages);
    }

    // ============================================
    // GENERATE KODE (TETAP ADA UNTUK KEBUTUHAN TEKNIS)
    // ============================================
    async generateCode(description, language = 'javascript') {
        const messages = [
            {
                role: 'system',
                content: `Kamu adalah asisten pemrograman ahli. Generate kode ${language} yang bersih, efisien, dan terstruktur. Berikan penjelasan singkat di awal.`
            },
            {
                role: 'user',
                content: `Buat kode ${language} untuk: ${description}`
            }
        ];

        return await this.chat(messages);
    }

    // ============================================
    // TRANSKRIPSI AUDIO (GROQ WHISPER)
    // ============================================
    async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
        try {
            const FormData = require('form-data');
            const form = new FormData();

            // Tentukan ekstensi berdasarkan mime type
            const ext = mimeType.includes('webm') ? 'webm'
                : mimeType.includes('wav') ? 'wav'
                : mimeType.includes('mp4') ? 'mp4'
                : mimeType.includes('ogg') ? 'ogg'
                : 'webm';

            form.append('file', audioBuffer, {
                filename: `audio.${ext}`,
                contentType: mimeType
            });
            form.append('model', 'whisper-large-v3-turbo');
            form.append('language', 'id'); // Bahasa Indonesia, bisa ubah ke 'en'
            form.append('response_format', 'text');
            form.append('temperature', '0.0'); // Mengurangi halusinasi
            form.append('prompt', 'Berikut adalah transkripsi rekaman suara atau percakapan:'); // Memberi konteks agar tidak berhalusinasi

            // Jika ada GROQ_API_KEY terpisah, gunakan Groq Whisper langsung yang gratis & cepat
            const whisperUrl = (process.env.GROQ_API_KEY && !this.baseUrl.includes('api.groq.com'))
                ? 'https://api.groq.com/openai/v1/audio/transcriptions'
                : `${this.baseUrl}/audio/transcriptions`;
            const whisperKey = (process.env.GROQ_API_KEY && !this.baseUrl.includes('api.groq.com'))
                ? process.env.GROQ_API_KEY
                : this.apiKey;

            const headers = { ...form.getHeaders() };
            if (whisperKey) {
                headers['Authorization'] = `Bearer ${whisperKey}`;
            }

            const response = await axios.post(
                whisperUrl,
                form,
                {
                    headers,
                    maxBodyLength: Infinity
                }
            );

            return { success: true, text: response.data.trim() };
        } catch (error) {
            console.error('❌ Whisper Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }
}

module.exports = new AIService();