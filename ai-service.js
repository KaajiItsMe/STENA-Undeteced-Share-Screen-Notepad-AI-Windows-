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
    ...(portableDir ? [path.join(portableDir, 'API.txt')] : []),
    path.join(exeDir, 'API.txt'),
    path.join(process.cwd(), 'API.txt')
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

class AIService {
    constructor() {
        // Cek apakah murni menggunakan Groq tanpa 9Router
        const isGroqOnly = process.env.GROQ_API_KEY && !process.env.ROUTER_API_KEY && !process.env.API_KEY && !process.env.ROUTER_BASE_URL;

        // Base URL 9Router (default lokal: http://localhost:20128/v1) atau Groq
        const rawBaseUrl = process.env.ROUTER_BASE_URL || process.env.API_BASE_URL || (isGroqOnly ? 'https://api.groq.com/openai/v1' : 'http://localhost:20128/v1');
        this.baseUrl = rawBaseUrl.replace(/\/+$/, '');

        // API Key (bisa kosong jika 9Router lokal tanpa autentikasi)
        this.apiKey = process.env.ROUTER_API_KEY || process.env.API_KEY || process.env.GROQ_API_KEY || '';

        // Model AI
        this.model = process.env.ROUTER_MODEL || process.env.AI_MODEL || process.env.GROQ_MODEL || (isGroqOnly ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

        // Parameter token & konteks hemat
        this.maxTokens = parseInt(process.env.MAX_TOKENS, 10) || 2048;
        this.maxHistoryMessages = parseInt(process.env.MAX_HISTORY_MESSAGES, 10) || 6;
        this.maxContextChars = parseInt(process.env.MAX_CONTEXT_CHARS, 10) || 12000;

        if (this.apiKey.includes('your_') || this.apiKey.includes('gsk_xxxx')) {
            console.warn('⚠️ API Key belum diatur dengan benar di API.txt');
        }
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