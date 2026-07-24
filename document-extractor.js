// document-extractor.js
// pdf-parse tidak kompatibel dengan Electron (butuh canvas native addon)
// Gunakan pdfjs-dist (Mozilla PDF.js) untuk PDF, mammoth untuk DOCX, adm-zip untuk PPTX

const fs = require('fs');
const path = require('path');

// === DOCX ===
let mammoth = null;
try {
    mammoth = require('mammoth');
} catch (e) {
    console.warn('⚠️ mammoth tidak terinstall: npm install mammoth');
}

// === PPTX (baca XML dari ZIP) ===
let AdmZip = null;
try {
    AdmZip = require('adm-zip');
} catch (e) {
    console.warn('⚠️ adm-zip tidak terinstall: npm install adm-zip');
}

// === PDF via pdfjs-dist (Node.js / Electron compatible) ===
async function extractPdf(buffer) {
    try {
        // Gunakan legacy build yang support CommonJS di Node.js
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');

        // Matikan worker (tidak dibutuhkan di Node.js/Electron main process)
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';

        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
        const pdf = await loadingTask.promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str || '').join(' ');
            fullText += pageText + '\n';
        }

        return fullText.trim();
    } catch (err) {
        throw new Error(`Gagal baca PDF: ${err.message}`);
    }
}

async function extractTextFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File tidak ditemukan' };
    }

    const ext = path.extname(filePath).toLowerCase();
    const supportedExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.md'];

    if (!supportedExts.includes(ext)) {
        return { success: false, error: `Format file tidak didukung: ${ext}` };
    }

    try {
        let text = '';
        const buffer = fs.readFileSync(filePath);

        // === PDF ===
        if (ext === '.pdf') {
            text = await extractPdf(buffer);
        }

        // === DOCX ===
        else if (ext === '.docx') {
            if (!mammoth) return { success: false, error: 'Install: npm install mammoth' };
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        }

        // === DOC lama ===
        else if (ext === '.doc') {
            return { success: false, error: 'Format .doc lama tidak didukung. Silakan simpan ulang sebagai .docx' };
        }

        // === PPTX ===
        else if (ext === '.pptx') {
            if (!AdmZip) return { success: false, error: 'Install: npm install adm-zip' };
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

        // === PPT lama ===
        else if (ext === '.ppt') {
            return { success: false, error: 'Format .ppt lama tidak didukung. Silakan simpan ulang sebagai .pptx' };
        }

        // === Text / Markdown ===
        else if (['.txt', '.md'].includes(ext)) {
            text = buffer.toString('utf8');
        }

        // Bersihkan teks
        text = text.replace(/\x00/g, '').replace(/\r\n/g, '\n').trim();

        if (!text || text.length < 10) {
            return { success: false, error: 'Teks tidak ditemukan atau terlalu pendek dalam file ini.' };
        }

        return { success: true, text, fileName: path.basename(filePath) };

    } catch (error) {
        console.error('❌ Extraction error:', error);
        return { success: false, error: error.message || 'Gagal ekstrak dokumen' };
    }
}

module.exports = { extractTextFromFile };