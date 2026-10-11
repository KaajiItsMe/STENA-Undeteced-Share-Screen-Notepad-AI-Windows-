// document-extractor.js
// Ekstraktor dokumen multi-format untuk PDF, Word (.docx, .doc), PowerPoint (.pptx), dan Text

const fs = require('fs');
const path = require('path');

// === DOCX (Word) ===
let mammoth = null;
try {
    mammoth = require('mammoth');
} catch (e) {
    console.warn('⚠️ mammoth tidak terinstall: npm install mammoth');
}

// === PPTX (PowerPoint) ===
let AdmZip = null;
try {
    AdmZip = require('adm-zip');
} catch (e) {
    console.warn('⚠️ adm-zip tidak terinstall: npm install adm-zip');
}

// === PDF EXTRACTOR (Mendukung PDFParse, pdfjs-dist, dan any-extractor) ===
async function extractPdf(buffer) {
    let lastError = null;

    // 1. Coba via PDFParse (Paling stabil, cepat & kompatibel dengan Node.js/Electron)
    try {
        const { PDFParse } = require('pdf-parse');
        if (PDFParse) {
            const parser = new PDFParse({ data: buffer });
            await parser.load();
            const res = await parser.getText();
            await parser.destroy();
            const text = typeof res === 'string' ? res : (res && res.text ? res.text : '');
            if (text && text.trim().length > 0) {
                return text.trim();
            }
        }
    } catch (err) {
        lastError = err;
        console.warn('⚠️ PDFParse gagal, mencoba metode alternatif...', err.message);
    }

    // 2. Coba via any-extractor
    try {
        const { extract } = require('any-extractor');
        if (typeof extract === 'function') {
            const res = await extract({
                buffer,
                mime: 'application/pdf'
            });
            if (res && res.text && res.text.trim().length > 0) {
                return res.text.trim();
            }
        }
    } catch (err) {
        lastError = err;
        console.warn('⚠️ any-extractor PDF gagal, mencoba pdfjs-dist...', err.message);
    }

    // 3. Coba via pdfjs-dist (legacy build via dynamic import)
    try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true
        });
        const pdf = await loadingTask.promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str || '').join(' ');
            fullText += pageText + '\n';
        }

        if (fullText.trim().length > 0) {
            return fullText.trim();
        }
    } catch (err) {
        lastError = err;
    }

    throw new Error(`Gagal mengekstrak teks PDF: ${lastError ? lastError.message : 'Teks tidak ditemukan atau PDF diproteksi/berupa gambar'}`);
}

// === DOCX / WORD EXTRACTOR ===
async function extractWord(buffer) {
    // 1. Coba dengan mammoth (rekomendasi terbaik untuk docx)
    if (mammoth) {
        try {
            const result = await mammoth.extractRawText({ buffer });
            if (result && result.value && result.value.trim().length > 0) {
                return result.value.trim();
            }
        } catch (err) {
            console.warn('⚠️ Mammoth gagal, mencoba alternatif...', err.message);
        }
    }

    // 2. Coba dengan any-extractor
    try {
        const { extract } = require('any-extractor');
        if (typeof extract === 'function') {
            const res = await extract({
                buffer,
                mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            if (res && res.text && res.text.trim().length > 0) {
                return res.text.trim();
            }
        }
    } catch (err) {
        console.warn('⚠️ any-extractor Word gagal:', err.message);
    }

    throw new Error('Gagal mengekstrak dokumen Word (.docx). Pastikan file tidak rusak atau terenkripsi.');
}

// === MAIN ENTRY POINT ===
async function extractTextFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File tidak ditemukan di komputer.' };
    }

    const ext = path.extname(filePath).toLowerCase();
    const supportedExts = ['.pdf', '.docx', '.doc', '.ppt', '.pptx', '.txt', '.md', '.csv', '.json'];

    if (!supportedExts.includes(ext)) {
        return { success: false, error: `Format file ${ext} tidak didukung. Silakan gunakan PDF, Word (.docx), PPTX, atau teks biasa.` };
    }

    try {
        let text = '';
        const buffer = fs.readFileSync(filePath);

        // === 1. PDF ===
        if (ext === '.pdf') {
            text = await extractPdf(buffer);
        }

        // === 2. WORD (.docx) ===
        else if (ext === '.docx') {
            text = await extractWord(buffer);
        }

        // === 3. WORD LAMA (.doc) ===
        else if (ext === '.doc') {
            // Ekstrak string terbaca dari format biner .doc
            const rawStr = buffer.toString('binary');
            const clean = rawStr.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ')
                                 .replace(/\s{2,}/g, ' ')
                                 .trim();
            if (clean && clean.length > 50) {
                text = clean;
            } else {
                return {
                    success: false,
                    error: 'Format .doc lama (Word 97-2003) tidak dapat dibaca sempurna. Mohon buka file tersebut di Word lalu Save As sebagai .docx.'
                };
            }
        }

        // === 4. PPTX ===
        else if (ext === '.pptx') {
            if (!AdmZip) return { success: false, error: 'Modul adm-zip belum terpasang.' };
            const zip = new AdmZip(buffer);
            const entries = zip.getEntries();
            const slideTexts = [];
            for (const entry of entries) {
                if (entry.entryName.match(/ppt\/slides\/slide\d+\.xml/)) {
                    const xmlContent = entry.getData().toString('utf8');
                    const matches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
                    const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
                    if (slideText.trim()) slideTexts.push(slideText.trim());
                }
            }
            text = slideTexts.join('\n\n');
        }

        // === 5. TEXT / MARKDOWN / CODE ===
        else if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
            text = buffer.toString('utf8');
        }

        // Bersihkan teks dari karakter kontrol tak berguna
        text = text.replace(/\x00/g, '').replace(/\r\n/g, '\n').trim();

        if (!text || text.length < 5) {
            return {
                success: false,
                error: 'Dokumen kosong atau tidak mengandung teks yang dapat dibaca (mungkin berisi gambar pindaian/scan saja).'
            };
        }

        return { success: true, text, fileName: path.basename(filePath) };

    } catch (error) {
        console.error('❌ Extraction error:', error);
        return { success: false, error: error.message || 'Gagal mengekstrak teks dari dokumen.' };
    }
}

module.exports = { extractTextFromFile };