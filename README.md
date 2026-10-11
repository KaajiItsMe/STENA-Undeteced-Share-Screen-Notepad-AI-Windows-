# 📝 Stena (Stealth Notepad AI)

Stena adalah aplikasi Notepad pintar yang dirancang khusus dengan fitur **Stealth Mode**. Secara kasat mata, aplikasi ini berfungsi seperti Notepad biasa untuk menulis catatan, namun dilengkapi dengan kemampuan asisten AI yang **100% tidak terdeteksi** oleh aplikasi berbagi layar maupun perekam layar (seperti Zoom, Google Meet, Microsoft Teams, OBS, atau Discord). 

Stena dibangun menggunakan **Electron** dan terintegrasi dengan arsitektur **9Router / OpenAI-Compatible API** (dengan model default super cerdas **Gemini 3.8 Flash**, Claude, GPT-OSS) serta mendukung fallback langsung ke **Groq**. Aplikasi ini memungkinkan Anda untuk menjawab soal akademis, menganalisis dokumen tugas, hingga melakukan transkripsi suara secara instan tanpa ketahuan saat presentasi atau meeting online.

---

## ✨ Fitur Unggulan

1. **🕵️‍♂️ Mode Siluman Total (Stealth Mode)**
   - Tidak muncul di *Taskbar* maupun menu `Alt + Tab`.
   - Jendela aplikasi otomatis tembus pandang saat *Screen Sharing* (layar Anda terlihat kosong/bersih di Zoom, Meet, Teams, atau rekaman OBS).
2. **🛡️ Bebas Bocor Visual (Anti-Leak Protection)**
   - **Anti-Caret Flicker (`Ctrl + Shift + C`)**: Menyembunyikan simbol kursor ketik (`|`) agar tidak berkedip atau melayang di rekaman layar penonton saat mengetik.
   - **Bebas Hover Artifacts**: Tombol salin jawaban AI (`📋`) dan elemen UI tidak memunculkan tooltip native OS atau kotak seleksi biru yang mencurigakan saat kursor diarahkan.
3. **🤖 Asisten AI Canggih & Multi-Model (9Router / Groq)**
   - Default menggunakan model **Gemini 3.8 Flash** (`ag/gemini-3.8-flash`) yang cepat dan cerdas.
   - Mendukung model Claude 3.7 / Sonnet / Opus, GPT-OSS, atau Groq Llama 3.3.
4. **⚡ Pengaturan Hemat Token Otomatis (Anti Over-Limit)**
   - Dilengkapi algoritma **Sliding Window** context pruning: memangkas riwayat chat lawas dan lampiran dokumen besar secara otomatis sehingga tidak boros token dan bebas error batas konteks (*token limit*).
5. **📄 Ekstraksi Dokumen Cerdas (PDF, Word, TXT)**
   - Mendukung fitur **Drag & Drop** file PDF, Word (`.docx`, `.doc`), dan `.txt` langsung ke dalam jendela AI Chat.
   - Dilengkapi *fallback stream decompressor* mandiri sehingga pembacaan PDF tetap lancar tanpa ketergantungan library DOM eksternal.
6. **📋 1-Klik Salin Jawaban AI**
   - Tombol salin cepat `📋` pada setiap pesan AI untuk menyalin langsung ke clipboard tanpa repot memblok teks secara manual.
7. **🎙️ Perekam & Ekstraksi Suara (Whisper)**
   - Merekam suara sistem / mikrofon dan mengubah percakapan rapat atau dosen menjadi teks secara instan.

---

## 📦 Cara Download & Menggunakan (Untuk Pengguna Langsung)

Bagi Anda yang hanya ingin langsung memakai aplikasi tanpa perlu menginstal Node.js atau menyentuh kode program:

> ### 📥 **[KLIK DI SINI UNTUK DOWNLOAD LANGSUNG (Stena-Windows-1.0.0.zip)](https://github.com/KaajiItsMe/STENA-Undeteced-Share-Screen-Notepad-AI-Windows-/releases/download/v1.0.0/Stena-Windows-1.0.0.zip)**  
> *(Atau lihat seluruh riwayat versi di halaman [GitHub Releases](https://github.com/KaajiItsMe/STENA-Undeteced-Share-Screen-Notepad-AI-Windows-/releases))*

1. **Unduh File ZIP:**  
   Klik tombol download di atas untuk mengunduh paket **`Stena-Windows-1.0.0.zip`**.
2. **Ekstrak File ZIP:**  
   Klik kanan file zip hasil unduhan, lalu ekstrak (*Extract All*) ke folder mana saja di komputer Anda.
3. **Masukkan API Key:**  
   Buka file **`API.txt`** yang ada di dalam folder tersebut menggunakan Notepad, lalu masukkan kunci API Anda pada baris `ROUTER_API_KEY=...` (atau `GROQ_API_KEY=...` jika memakai Groq).
4. **Jalankan Aplikasi:**  
   Klik dua kali file **`Stena-Windows-1.0.0.exe`**. Aplikasi akan langsung berjalan di latar belakang secara rahasia.
5. **Gunakan Shortcut:**  
   Tekan **`Ctrl + Shift + B`** untuk memunculkan atau menyembunyikan aplikasi kapan pun Anda butuhkan!

> 💡 **Aplikasi Portable (Tanpa Instalasi):** Aplikasi ini tidak meninggalkan jejak instalasi di registry Windows, Control Panel, maupun Start Menu. Jika shortcut tidak merespon karena ada sesi lama yang nyangkut di memori, cukup klik dua kali file **`fix.bat`** yang ada di dalam folder.

---

## ⚙️ Konfigurasi API & Pengaturan Hemat Token

Stena membaca konfigurasi AI dari file **`API.txt`** (atau `.env`). Tersedia file template **`API.example.txt`** yang siap disalin menjadi `API.txt`:

```env
# ==============================================================
# 1. KONFIGURASI 9ROUTER / OPENAI-COMPATIBLE API
# ==============================================================
# Alamat server 9Router (bisa VPS cloud atau lokal http://localhost:20128/v1)
ROUTER_BASE_URL=http://94.237.65.223/v1

# Masukkan API Key 9Router Anda
ROUTER_API_KEY=your_api_key_here

# Pilihan Model AI pada 9Router:
# - ag/gemini-3.8-flash (Default / Sangat Cepat & Pintar)
# - ag/gemini-3.8-flash-medium
# - ag/claude-sonnet-4-6
# - ag/claude-opus-4-6-thinking
# - ag/gpt-oss-120b-medium
ROUTER_MODEL=ag/gemini-3.8-flash

# ==============================================================
# 2. PENGATURAN HEMAT TOKEN (AGAR TIDAK OVER-LIMIT)
# ==============================================================
# Jumlah pesan riwayat terakhir yang dikirim ke AI sebagai konteks (Sliding Window).
# Nilai 6 = 3 putaran tanya-jawab terakhir. Pesan lebih lama otomatis dipangkas.
MAX_HISTORY_MESSAGES=6

# Batas maksimal total karakter percakapan yang dikirim (default: 12000 karakter ~ 3000 token).
MAX_CONTEXT_CHARS=12000

# Batas maksimal panjang token untuk balasan / respon AI (default: 2048 token).
MAX_TOKENS=2048

# ==============================================================
# 3. (OPSIONAL) GROQ DIRECT FALLBACK
# Jika ingin memakai Groq secara langsung tanpa 9Router:
# GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
# GROQ_MODEL=llama-3.3-70b-versatile
# ==============================================================
```

> **Catatan Keamanan:** File `API.txt` sudah dimasukkan ke `.gitignore` sehingga API Key pribadi Anda tidak akan pernah terunggah ke repositori GitHub.

---

## 🛠️ Panduan Pengembangan (Untuk Developer)

Jika Anda ingin menjalankan atau mengembangkan kode sumber aplikasi ini:

1. Pastikan **Node.js** (v18+) sudah terinstal di komputer Anda.
2. *Clone* repositori ini:
   ```bash
   git clone https://github.com/KaajiItsMe/STENA-Undeteced-Share-Screen-Notepad-AI-Windows-.git
   cd STENA-Undeteced-Share-Screen-Notepad-AI-Windows-
   ```
3. Instal dependensi:
   ```bash
   npm install
   ```
4. Salin file template `API.example.txt` menjadi `API.txt`, lalu masukkan API Key Anda:
   ```bash
   copy API.example.txt API.txt
   ```
5. Jalankan aplikasi:
   ```bash
   npm start
   ```

---

## 📦 Membangun Versi Portable (.exe / .zip)

Untuk membuat file aplikasi siap pakai (*standalone / portable*) tanpa memerlukan instalasi Node.js:

1. Jalankan perintah kompilasi:
   ```bash
   npm run build:win
   ```
2. File eksekusi `Stena-Windows-1.0.0.exe` akan berada di folder `dist/`.
3. **Cara Membagikan:** Bagikan file zip yang berisi `Stena-Windows-1.0.0.exe`, `API.txt`, `BACA.txt`, dan `fix.bat`. Pengguna cukup mengekstrak dan menjalankan `.exe` tanpa instalasi apapun.

---

## ⌨️ Daftar Shortcut Rahasia

| Shortcut | Fungsi |
| :--- | :--- |
| `Ctrl + Shift + B` | Buka / Sembunyikan Aplikasi (Boss Key) |
| `Ctrl + Shift + N` | Buka Tab Notepad Cepat |
| `Ctrl + Shift + A` | Buka Tab AI Chat Cepat |
| `Ctrl + Shift + C` | Toggle Sembunyikan Simbol Kursor Ketik (Anti-Caret Flicker) |
| `Ctrl + S` | Simpan Teks Notepad Manual (Auto-save juga aktif tiap 1 detik) |
| `Esc` | Tombol Panik (*Panic Button*) untuk menutup seketika |
| `Ctrl + Shift + Panah Atas` | Geser Jendela ke Atas |
| `Ctrl + Shift + Panah Bawah` | Geser Jendela ke Bawah |
| `Ctrl + Shift + Panah Kiri` | Geser Jendela ke Kiri |
| `Ctrl + Shift + Panah Kanan` | Geser Jendela ke Kanan |
| `Ctrl + Shift + R` | Reset Posisi Jendela ke Pojok Kanan Bawah |

---

## 🛠️ Pemecahan Masalah (Troubleshooting)

- **Shortcut Tidak Merespon:**
  Terkadang proses aplikasi sebelumnya masih berjalan di memori (*zombie process*). Cukup jalankan file `fix.bat` di folder aplikasi untuk mematikan semua proses nyangkut, lalu buka kembali aplikasinya.

---

## 🌟 Credits & Acknowledgements

- **Developer**: Eka Aji Pramudia (UNM - 2026)
- **AI Pair Programmer**: Google DeepMind **Antigravity** (Advanced Agentic AI Assistant)

---

**Dibuat dengan 💻 & ❤️ oleh Eka Aji Pramudia. UNM (2026)**

