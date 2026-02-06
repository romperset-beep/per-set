
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const pdfLib = require('pdf-parse');

const PDFParse = pdfLib.PDFParse || pdfLib.default?.PDFParse;

const basePath = process.cwd();
const files = [
    "APNEA PDT N°07.pdf",
    "• PDT 30 BADH (WIP) du 17-11-24 Equipe V3.pdf"
];

async function readPdf(fileName) {
    try {
        const filePath = path.join(basePath, fileName);
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }
        const dataBuffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(dataBuffer);

        // Based on extract_lumiere_pdf.js usage
        const parser = new PDFParse({ data: uint8Array });
        const result = await parser.getText();

        console.log(`\n\n--- START OF FILE: ${fileName} ---\n`);
        console.log(result.text);
        console.log(`\n--- END OF FILE: ${fileName} ---\n`);
    } catch (error) {
        console.error(`Error reading ${fileName}:`, error);
    }
}

async function main() {
    if (!PDFParse) {
        console.error('Could not find PDFParse class. Exports:', pdfLib);
        return;
    }
    for (const file of files) {
        await readPdf(file);
    }
}

main();
