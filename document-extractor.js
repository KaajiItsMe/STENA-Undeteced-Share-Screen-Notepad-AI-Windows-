// document-extractor.js
// Ekstraktor dokumen multi-format untuk PDF, Word (.docx, .doc), PowerPoint (.pptx), dan Text

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// === POLYFILL DOMMatrix UNTUK NODE.JS / ELECTRON ===
// Mencegah error "DOMMatrix is not defined" pada parser PDF
if (!globalThis.DOMMatrix) {
    try {
        globalThis.DOMMatrix = require('dommatrix');
    } catch (e) {
        // Fallback class DOMMatrix jika package tidak ditemukan
        globalThis.DOMMatrix = class DOMMatrix {
            constructor(init) {
                if (Array.isArray(init)) {
                    this.a = init[0] ?? 1; this.b = init[1] ?? 0;
                    this.c = init[2] ?? 0; this.d = init[3] ?? 1;
                    this.e = init[4] ?? 0; this.f = init[5] ?? 0;
                } else {
                    this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
                }
            }
            translate(x = 0, y = 0) { this.e += x; this.f += y; return this; }
            scale(x = 1, y = x) { this.a *= x; this.d *= y; return this; }
            preMultiplySelf() { return this; }
            multiplySelf() { return this; }
            invertSelf() { return this; }
        };
    }
}

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

// === PURE PDF STREAM EXTRACTOR (100% Kebal DOM / Browser globals) ===
function extractRawPdfText(buffer) {
    try {
        const content = buffer.toString('binary');
        let textChunks = [];

        // 1. Ekstrak dari stream yang dikompresi (FlateDecode)
        const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
        let match;
        while ((match = streamRegex.exec(content)) !== null) {
            let streamData = Buffer.from(match[1], 'binary');
            let decompressed = '';
            try {
                decompressed = zlib.inflateSync(streamData).toString('latin1');
            } catch (e) {
                try {
                    decompressed = zlib.inflateRawSync(streamData).toString('latin1');
                } catch (e2) {}
            }

            if (decompressed) {
                const btRegex = /BT[\s\S]*?ET/g;
                let btMatch;
                while ((btMatch = btRegex.exec(decompressed)) !== null) {
                    const btBlock = btMatch[0];
                    const tjRegex = /\(([^)]+)\)\s*Tj/g;
                    let tjMatch;
                    while ((tjMatch = tjRegex.exec(btBlock)) !== null) {
                        textChunks.push(tjMatch[1]);
                    }
                    const tjArrRegex = /\[(.*?)\]\s*TJ/g;
                    let arrMatch;
                    while ((arrMatch = tjArrRegex.exec(btBlock)) !== null) {
                        const inner = arrMatch[1];
                        const strParts = inner.match(/\(([^)]+)\)/g) || [];
                        const combined = strParts.map(s => s.slice(1, -1)).join('');
                        if (combined) textChunks.push(combined);
                    }
                }
            }
        }

        // 2. Ekstrak dari blok teks tidak terkompresi
        const directBtRegex = /BT[\s\S]*?ET/g;
        let directMatch;
        while ((directMatch = directBtRegex.exec(content)) !== null) {
            const btBlock = directMatch[0];
            const tjRegex = /\(([^)]+)\)\s*Tj/g;
            let tjMatch;
            while ((tjMatch = tjRegex.exec(btBlock)) !== null) {
                textChunks.push(tjMatch[1]);
            }
            const tjArrRegex = /\[(.*?)\]\s*TJ/g;
            let arrMatch;
            while ((arrMatch = tjArrRegex.exec(btBlock)) !== null) {
                const inner = arrMatch[1];
                const strParts = inner.match(/\(([^)]+)\)/g) || [];
                const combined = strParts.map(s => s.slice(1, -1)).join('');
                if (combined) textChunks.push(combined);
            }
        }

        const result = textChunks.join(' ')
            .replace(/\\([()\\])/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();

        return result;
    } catch (err) {
        return '';
    }
}

// Heuristic fallback untuk teks ASCII / UTF-8 yang terbaca dalam PDF
function extractReadableChunks(buffer) {
    try {
        const str = buffer.toString('utf8');
        const matches = str.match(/[A-Za-z0-9\s.,!?:;'"()\-_+=/\\@#$%^&*<>]{6,}/g) || [];
        const filtered = matches.filter(m => !m.includes('%%EOF') && !m.includes('/Root') && !m.includes('/Font'));
        return filtered.join('\n').replace(/\s+/g, ' ').trim();
    } catch (e) {
        return '';
    }
}

// === PDF EXTRACTOR (Multi-Layer Robust) ===
async function extractPdf(buffer) {
    let lastError = null;

    // 1. Coba via PDFParse dengan polyfill DOMMatrix
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
        console.warn('⚠️ PDFParse gagal, mencoba fallback murni...', err.message);
    }

    // 2. Coba via Decompressor Stream PDF Murni (zlib inflate)
    try {
        const rawText = extractRawPdfText(buffer);
        if (rawText && rawText.length > 10) {
            return rawText;
        }
    } catch (err) {
        lastError = err;
    }

    // 3. Coba via Heuristic Scanner
    try {
        const heuristicText = extractReadableChunks(buffer);
        if (heuristicText && heuristicText.length > 20) {
            return heuristicText;
        }
    } catch (err) {
        lastError = err;
    }

    throw new Error(`Gagal mengekstrak teks PDF: ${lastError ? lastError.message : 'File tidak berisi teks yang dapat dibaca (mungkin gambar scan murni)'}`);
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