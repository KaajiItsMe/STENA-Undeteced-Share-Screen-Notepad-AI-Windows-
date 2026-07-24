# 📝 Stena (Stealth Notepad AI)

Stena adalah aplikasi Notepad pintar yang dirancang khusus dengan fitur **Stealth Mode**. Secara kasat mata, aplikasi ini berfungsi seperti Notepad biasa untuk menulis catatan, namun dilengkapi dengan kemampuan asisten AI yang tidak terdeteksi oleh aplikasi berbagi layar (seperti Zoom, Google Meet, OBS, atau Discord). 

Stena dibangun menggunakan **Electron** dan terintegrasi dengan ekosistem AI gratis dan super cepat dari **Groq**, memungkinkannya untuk menjawab pertanyaan akademis, menganalisis dokumen, hingga melakukan transkripsi suara secara instan tanpa ketahuan.

---

## ✨ Fitur Unggulan

1. **🕵️‍♂️ Mode Siluman (Stealth Mode)**
   - Tidak muncul di *Taskbar* maupun layar Alt+Tab.
   - Tidak akan tertangkap oleh *Screen Sharing* (layar Anda terlihat kosong/menembus di aplikasi Zoom atau OBS).
2. **🤖 Asisten AI Terintegrasi (Powered by Groq)**
   - Ngobrol langsung dengan model canggih seperti **Llama 3.3** atau **Mixtral** secara gratis.
   - AI memiliki "ingatan panjang" berkat sistem riwayat obrolan (Chat History) lokal.
3. **🎙️ Perekam & Ekstraksi Suara (Whisper)**
   - Mampu mereka suara sistem/mikrofon dan secara otomatis mengubah obrolan/dosen menjadi teks (transkripsi) agar langsung bisa ditanyakan ke AI.
4. **📄 Pembaca Dokumen (PDF & DOCX)**
   - Membaca dokumen tugas, materi kuliah, atau jurnal hanya dalam satu kali klik.

---

## 🚀 Panduan Instalasi (Development)

Jika Anda ingin membongkar kode sumber aplikasi ini:

1. Pastikan **Node.js** sudah terinstal di komputer Anda.
2. *Clone* repositori ini ke komputer lokal Anda.
3. Buka Terminal/CMD di dalam folder proyek ini, dan jalankan perintah:
   ```bash
   npm install
   ```
4. Buat file `.env` (atau ikuti cara *portable* dengan `API.txt`) dan isi API Key dari Groq:
   ```env
   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
5. Untuk menjalankan aplikasi di tahap pengembangan (*development*):
   ```bash
   npm start
   ```

---

## 📦 Membangun Versi Portable (.exe)

Untuk menyebarkan aplikasi ke komputer lain tanpa perlu menginstal Node.js:

1. Siapkan file ikon berukuran 256x256 bernama `icon.ico` di folder utama.
2. Jalankan perintah pembuat (*builder*):
   ```bash
   npm run build:win
   ```
3. File eksekusi `Stena-Windows-1.0.0.exe` akan langsung jadi di dalam folder `dist/`. Aplikasi ini bersifat *portable*, tidak perlu instalasi, dan tidak meninggalkan jejak registry.

---

## ⌨️ Daftar Shortcut Rahasia

- `Ctrl + Shift + B` : Menampilkan atau menyembunyikan (*toggle*) aplikasi secara penuh.
- `Esc` : Tombol panik untuk menyembunyikan aplikasi secepat kilat.
- `Ctrl + S` : Menyimpan teks Notepad secara manual (meski sistem auto-save juga sudah bekerja setiap 1 detik).

---

**Dibuat dengan 💻 oleh Eka Aji Pramudia. UNM (2026)**
