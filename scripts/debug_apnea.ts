
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { analyzePDTText } from '../services/pdtAnalysis.ts';

const require = createRequire(import.meta.url);
const pdfLib = require('pdf-parse');
const PDFParse = pdfLib.PDFParse || pdfLib.default?.PDFParse;

const filePath = "/Users/romainperset/Desktop/dossier gestion des conso/CinéStock/A Better Set/A Better Set/APNEA PDT N°07.pdf";

async function run() {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(dataBuffer);
        const result = await new PDFParse({ data: uint8Array }).getText();

        console.log("--- START ANALYSIS ---");
        const analysis = analyzePDTText(result.text);
        console.log("Analysis Result:", {
            dates: analysis.dates,
            sequences: analysis.sequences,
            period: analysis.period,
            startDayInfo: analysis.startDayInfo,
            startDayOffset: analysis.startDayOffset
        });
        console.log("\n--- DEBUG DATES ---");
        console.log(analysis.debugDates);
        console.log("\n--- DEBUG YEAR ---");
        console.log(analysis.debugYear);
        console.log("--- END ANALYSIS ---");

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
