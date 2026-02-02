import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://rvz-location.fr';
const CATEGORIES = [
    { name: 'Cameras', url: 'https://rvz-location.fr/catalogue/cameras-liste/' },
    { name: 'Optiques', url: 'https://rvz-location.fr/catalogue/cameras/optiques/' },
    { name: 'Lumiere', url: 'https://rvz-location.fr/catalogue/lumiere/' },
    { name: 'Machinerie', url: 'https://rvz-location.fr/catalogue/machinerie/' },
    { name: 'Photo', url: 'https://rvz-location.fr/catalogue/photo/' },
    { name: 'Vehicules', url: 'https://rvz-location.fr/catalogue/vehicules-liste/' }
];

const OUTPUT_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'rvz_catalog.json');

// Helper to ensure directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function scrapeCategory(category) {
    console.log(`Scraping ${category.name}...`);
    try {
        const response = await fetch(category.url);
        if (!response.ok) throw new Error(`Failed to fetch ${category.url}`);
        const html = await response.text();
        const $ = cheerio.load(html);

        const items = [];

        // Select all product thumbnails
        $('.tmb').each((_, element) => {
            const el = $(element);

            // Extract Title
            const title = el.find('.t-entry-title a').text().trim() ||
                el.find('.t-entry-title').text().trim();

            // Extract Image
            let img = el.find('.t-entry-visual img').attr('src');
            // Handle lazy loading or srcset if needed, but usually src is there
            if (img && !img.startsWith('http')) {
                img = BASE_URL + img;
            }

            // Extract Link (for checking details if needed later)
            const link = el.find('.t-entry-visual a').attr('href');

            // Simplified Sub-Category detection via classes
            // Classes often look like: tmb tmb-iso ... grid-cat-123 ...
            // We can't easily map ID to name without a map, but we have the main Category.

            if (title) {
                items.push({
                    id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), // Generate a slug-like ID
                    name: title,
                    category: category.name,
                    image: img,
                    url: link
                });
            }
        });

        console.log(`Found ${items.length} items in ${category.name}`);
        return items;

    } catch (error) {
        console.error(`Error scraping ${category.name}:`, error.message);
        return [];
    }
}

async function run() {
    console.log('Starting RVZ Catalog Scrape...');
    let allItems = [];

    for (const cat of CATEGORIES) {
        const items = await scrapeCategory(cat);
        allItems = [...allItems, ...items];
        // Polite delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Remove duplicates based on name just in case
    const uniqueItems = Array.from(new Map(allItems.map(item => [item.name, item])).values());

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueItems, null, 2));
    console.log(`\nSuccessfully saved ${uniqueItems.length} items to ${OUTPUT_FILE}`);
}

run();
