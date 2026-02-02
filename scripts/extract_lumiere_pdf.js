import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const pdfLib = require('pdf-parse');

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDFParse = pdfLib.PDFParse || pdfLib.default?.PDFParse;

if (!PDFParse) {
    console.error('Could not find PDFParse class. Exports:', pdfLib);
    process.exit(1);
}

const pdfPath = '/Users/romainperset/Desktop/dossier gestion des conso/CinéStock/A Better Set/A Better Set/ energie  rvz.pdf';

if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

// Convert buffer to Uint8Array as expected by TypedArray in LoadParameters
const uint8Array = new Uint8Array(dataBuffer);

console.log('Starting PDF extraction...');

try {
    const parser = new PDFParse({ data: uint8Array });

    parser.getText().then(result => {
        const lines = result.text.split('\n');
        const newItems = [];

        // Headers or irrelevant lines to ignore
        const IGNORED_LINES = [
            'RVZ', 'Catalogue', 'Lumière', 'Page', 'of' // Add more if needed
        ];

        lines.forEach(line => {
            const cleanLine = line.trim();
            if (!cleanLine) return;

            // Skip page numbers like "-- 8 of 9 --"
            if (cleanLine.startsWith('--') && cleanLine.endsWith('--')) return;
            if (IGNORED_LINES.includes(cleanLine)) return;

            // Generate ID
            const id = cleanLine.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            newItems.push({
                id: id,
                name: cleanLine,
                category: 'Energie'
            });
        });

        console.log(`Extracted ${newItems.length} items from PDF.`);

        // Read existing catalog
        const catalogPath = path.join(__dirname, '../src/data/rvz_catalog.json');
        let catalog = [];
        if (fs.existsSync(catalogPath)) {
            catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        }

        // Merge
        const existingIds = new Set(catalog.map(i => i.id));
        let addedCount = 0;

        newItems.forEach(item => {
            if (!existingIds.has(item.id)) {
                catalog.push(item);
                existingIds.add(item.id);
                addedCount++;
            }
        });

        // Write back
        fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
        console.log(`Added ${addedCount} new items to ${catalogPath}`);

    }).catch(err => {
        console.error('Error in getText:', err);
    });

} catch (err) {
    console.error('Error instantiating PDFParse:', err);
}
