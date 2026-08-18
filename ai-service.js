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
        this.apiKey = process.env.GROQ_API_KEY;
        this.model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
        this.baseUrl = 'https://api.groq.com/openai/v1';
        this.maxTokens = 4096;

        // Cek apakah API Key ada
        if (!this.apiKey || this.apiKey.includes('gsk_xxxx')) {
            console.warn('⚠️ GROQ_API_KEY tidak valid atau belum diatur di API.txt');
        }
    }

    // ============================================
    // CHAT DENGAN AI (UMUM / KULIAH)
    // ============================================
    async chat(messages) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: this.model,
                    messages: messages,
                    max_tokens: this.maxTokens,
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            return {
                success: true,
                content: response.data.choices[0].message.content,
                usage: response.data.usage
            };
        } catch (error) {
            console.error('❌ Groq Error:', error.response?.data || error.message);
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
                1. Gunakan bahasa Indonesia yang natural, santai, dan mudah dipahami
                2. Jika ditanya tentang tugas kuliah, berikan penjelasan konsep dulu, baru contoh
                3. Jika ditanya pendapat, sampaikan dengan bijak dan netral
                4. Jika tidak tahu, katakan dengan jujur
                5. Jawaban bisa disertai analogi biar lebih mudah dimengerti
                6. Untuk pertanyaan rumit, jawab step by step

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

            const response = await axios.post(
                `${this.baseUrl}/audio/transcriptions`,
                form,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        ...form.getHeaders()
                    },
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