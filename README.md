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
4. Aplikasi ini membutuhkan kunci AI untuk beroperasi. Anda cukup menggunakan file `API.txt` bawaan (atau buat file `.env` jika Anda lebih familier dengan standar Node.js) dan isi API Key dari Groq:
   ```env
   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
   *(Catatan: Baik menjalankan aplikasi dari source code (`npm start`) maupun dari file `.exe` portabel, aplikasi tetap dapat membaca kunci dari file `API.txt` yang berada di sebelahnya).*

5. Untuk menjalankan aplikasi di tahap pengembangan (*development*):
   ```bash
   npm start
   ```

---

## 📦 Membangun Versi Portable (.exe)

Untuk menyebarkan aplikasi ke komputer lain agar siapapun bisa memakainya tanpa perlu menginstal Node.js:

1. Siapkan file ikon berukuran 256x256 bernama `icon.ico` di folder utama.
2. Jalankan perintah pembuat (*builder*):
   ```bash
   npm run build:win
   ```
3. File eksekusi `Stena-Windows-1.0.0.exe` akan langsung jadi di dalam folder `dist/`. 
4. **Cara Membagikan:** Jika Anda ingin membagikan aplikasi ini, cukup berikan file `Stena-Windows-1.0.0.exe` tersebut *bersama* dengan file `API.txt` dan `BACA.txt` di dalam satu folder yang sama. Teman Anda tinggal mengisi API mereka di `API.txt` tanpa perlu menyentuh kode sama sekali.

---

## ⌨️ Daftar Shortcut Rahasia

- `Ctrl + Shift + B` : Menampilkan atau menyembunyikan (*toggle*) aplikasi secara penuh.
- `Ctrl + Shift + N` : Berpindah cepat ke tab Notepad.
- `Ctrl + Shift + A` : Berpindah cepat ke tab AI Chat.
- `Ctrl + S` : Menyimpan teks Notepad secara manual (sistem auto-save juga bekerja setiap 1 detik).
- `Esc` : Tombol panik (*Panic Button*) untuk menyembunyikan aplikasi secepat kilat.

**Shortcut Pindah Posisi (Saat Aplikasi Terbuka):**
- `Ctrl + Shift + Panah Atas` : Geser Jendela ke Atas
- `Ctrl + Shift + Panah Bawah` : Geser Jendela ke Bawah
- `Ctrl + Shift + Panah Kiri` : Geser Jendela ke Kiri
- `Ctrl + Shift + Panah Kanan` : Geser Jendela ke Kanan
- `Ctrl + Shift + R` : Kembalikan Jendela ke Pojok Kanan Bawah (Reset Posisi)

---

**Dibuat dengan 💻 oleh Eka Aji Pramudia. UNM (2026)**
