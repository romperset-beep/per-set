
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const part1Path = path.join(rootDir, 'text_dump_part1.txt');
const part2Path = path.join(rootDir, 'text_dump_part2.txt');
const part3Path = path.join(rootDir, 'text_dump_part3.txt');

const departmentMap: Record<string, string> = {
    'A': 'Contenu et Artistique',
    'B': 'COSTUME', // Maps to Department.COSTUME or close
    'C': 'IMAGE',
    'D': 'PLATEAU', // Plateaux et tournage -> TECH?
    'E': 'POST_PRODUCTION',
    'F': 'PRODUCTION',
    'G': 'REALISATION',
    'H': 'SON',
    'I': 'WEB',
    'P': 'COMMERCIAL'
};

interface Rate {
    s35: number;
    s39: number;
    s7: number;
    s8: number;
}

interface Job {
    title: string;
    cat: string;
    level: string;
    deptCode: string;
    rates: Rate;
}

const jobs = new Map<string, Job>();

function parseRate(s: string): number {
    if (!s) return 0;
    // Remove euro symbol, replace comma with dot, remove spaces
    return parseFloat(s.replace(/€/g, '').replace(/,/g, '.').replace(/\s/g, '')) || 0;
}

function addJob(job: Job) {
    if (jobs.has(job.title)) {
        // If existing job has 0 rates and new one has real rates, overwrite
        const existing = jobs.get(job.title)!;
        if (existing.rates.s35 === 0 && job.rates.s35 > 0) {
            jobs.set(job.title, job);
        }
    } else {
        jobs.set(job.title, job);
    }
}

// Format 1: Vertical (Part 1, lines 918+)
function parseVertical(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Find start of CDD Usage table
    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('EMPLOIS DE CATEGORIE B - CDD d\'usage')) {
            // Find header end. Look for "Base 35h"
            for (let j = i; j < i + 50; j++) {
                if (lines[j]?.includes('Base 35h')) {
                    startIndex = j + 1;
                    break;
                }
            }
            break;
        }
    }

    if (startIndex === -1) startIndex = 0; // Fallback

    let i = startIndex;
    while (i < lines.length - 6) {
        let title = lines[i];

        // Skip headers/footers
        if (title.startsWith('Syndicat') || title.startsWith('http') || title.startsWith('Convention')) {
            i++; continue;
        }

        // Handle wrapped title: If next line is NOT a single letter Cat, assume it's title continuation
        // But check if line[i+2] IS a Cat, to avoid merging indefinitely
        let catIndex = i + 1;
        if (lines[i + 1] && !/^[A-Z]$/.test(lines[i + 1]) && lines[i + 1].length > 1) { // Cat usually 1 char
            // Peek ahead
            if (lines[i + 2] && /^[A-Z]$/.test(lines[i + 2])) {
                title += ' ' + lines[i + 1];
                catIndex = i + 2;
            }
        }

        const cat = lines[catIndex];
        if (cat && /^[A-Z]$/.test(cat)) {
            const level = lines[catIndex + 1];
            const r1 = lines[catIndex + 2];
            const r2 = lines[catIndex + 3];
            const r3 = lines[catIndex + 4];
            const r4 = lines[catIndex + 5];
            // const rMonthly = lines[catIndex+6];

            if (r1 && r1.includes('€')) {
                addJob({
                    title: title,
                    cat: cat,
                    level: level,
                    deptCode: cat,
                    rates: {
                        s35: parseRate(r1),
                        s39: parseRate(r2),
                        s7: parseRate(r3),
                        s8: parseRate(r4)
                    }
                });
                i = catIndex + 6;
            } else {
                i++;
            }
        } else {
            i++;
        }
    }
}

// Format 2: Horizontal (Part 3 pipe separated, or Part 2 space separated)
function parseHorizontal(text: string) {
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.trim().length === 0) continue;

        // Pipe separated
        if (line.includes('|')) {
            const parts = line.split('|').map(p => p.trim());
            // Format: Title | Dept | Level | Rate...
            if (parts.length >= 4) {
                const title = parts[0];
                const dept = parts[1];
                const level = parts[2];
                const r1 = parseRate(parts[3]);

                // If we have 4+ rates (Title, Dept, Lvl, R1, R2, R3, R4) -> Use them
                if (parts.length >= 7) {
                    addJob({
                        title: title,
                        deptCode: dept,
                        level: level,
                        cat: 'B',
                        rates: {
                            s35: r1,
                            s39: parseRate(parts[4]),
                            s7: parseRate(parts[5]),
                            s8: parseRate(parts[6])
                        }
                    });
                } else if (r1 > 0) {
                    // Only 1 rate (Monthly)
                    // Estimate Daily/Weekly
                    // Weekly 35h = Monthly / 151.67 * 35 = Monthly * 0.2307
                    // Daily 8h = Monthly / 151.67 * 8 = Monthly * 0.0527
                    // Daily 7h = Monthly / 151.67 * 7
                    const hourly = r1 / 151.67;
                    addJob({
                        title: title,
                        deptCode: dept,
                        level: level,
                        cat: 'B',
                        rates: {
                            s35: parseFloat((hourly * 35).toFixed(2)),
                            s39: parseFloat((hourly * 39).toFixed(2)), // Approx s39 with overtime? Or just base. Let's use Base 39h linear for now to be safe or just 0.
                            s7: parseFloat((hourly * 7).toFixed(2)),
                            s8: parseFloat((hourly * 8).toFixed(2))
                        }
                    });
                }
            }
        }
        // Space separated (Part 2 style)
        else {
            // 1er assistant décorateur B IIIA 983,67 € ...
            const match = line.match(/^(.+?)\s+([A-P])\s+([IVX]+\w*|\|\|+|Ο)\s+(.+)$/);
            if (match) {
                const title = match[1].trim();
                const dept = match[2];
                const level = match[3];
                const rest = match[4];

                // Extract all amounts
                const amounts = rest.match(/[\d,\s]+€/g);
                if (amounts && amounts.length >= 1) {
                    const r1 = parseRate(amounts[0]);
                    if (amounts.length >= 4) {
                        addJob({
                            title: title,
                            deptCode: dept,
                            level: level,
                            cat: 'B',
                            rates: {
                                s35: r1,
                                s39: parseRate(amounts[1]),
                                s7: parseRate(amounts[2]),
                                s8: parseRate(amounts[3])
                            }
                        });
                    } else {
                        // Estimate
                        const hourly = r1 / 151.67;
                        addJob({
                            title: title,
                            deptCode: dept,
                            level: level,
                            cat: 'B', // Estimate
                            rates: {
                                s35: parseFloat((hourly * 35).toFixed(2)),
                                s39: parseFloat((hourly * 39).toFixed(2)),
                                s7: parseFloat((hourly * 7).toFixed(2)),
                                s8: parseFloat((hourly * 8).toFixed(2))
                            }
                        });
                    }
                }
            }
        }
    }
}

// Run parsing
if (fs.existsSync(part1Path)) parseVertical(fs.readFileSync(part1Path, 'utf8'));
if (fs.existsSync(part2Path)) parseHorizontal(fs.readFileSync(part2Path, 'utf8'));
if (fs.existsSync(part3Path)) parseHorizontal(fs.readFileSync(part3Path, 'utf8'));

// Generate Output
const sortedJobs = Array.from(jobs.values()).sort((a, b) => a.title.localeCompare(b.title));

// Generate TS File Content
let output = `import { Department } from '../types';

export interface JobDefinition {
    id: string;
    title: string;
    category: 'B' | 'C'; // Cadre / Technicien (Mapped from status, typically B=Cadre, C=Tech for simplicity, but here using Convention logic)
    level?: string;
    department: Department | 'PRODUCTION' | 'REGIE' | 'IMAGE' | 'COSTUME' | 'DECOR' | 'SON' | 'HMC' | 'POST_PRODUCTION' | 'AUTRE';
    rates: {
        s35: number;
        s39: number;
        s7: number;
        s8: number;
    };
}

export const USPA_JOBS: JobDefinition[] = [
`;

for (const job of sortedJobs) {
    // Map department
    let dept = 'AUTRE';
    const dCode = job.deptCode;
    if (dCode === 'A') dept = 'PRODUCTION'; // Artistique/Prod
    if (dCode === 'B') dept = 'DECOR'; // Costumes/Decor 
    if (job.title.toLowerCase().includes('costum')) dept = 'COSTUME'; // Override
    if (dCode === 'C') dept = 'IMAGE';
    if (dCode === 'D') dept = 'PLATEAU'; // Tech
    if (job.title.toLowerCase().includes('maquill') || job.title.toLowerCase().includes('coiff')) dept = 'HMC';
    if (dCode === 'E') dept = 'POST_PRODUCTION';
    if (dCode === 'F') dept = 'PRODUCTION'; // Or Regie
    if (job.title.toLowerCase().includes('régie') || job.title.toLowerCase().includes('regie')) dept = 'REGIE';
    if (dCode === 'G') dept = 'REALISATION'; // -> Production category usually in app?
    if (dCode === 'H') dept = 'SON';

    const id = job.title.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Status B or C?
    // Convention says B is "Category B" (Intermittent).
    // In our type `category: 'B' | 'C'`, 'B' usually means Cadre, 'C' Technicien.
    // Let's guess based on level? II = Cadre, IV = Tech?
    // Actually, simply defaulting to 'C' (Technicien) for most, 'B' (Cadre) for Chef/Director is safer.
    // Or just use 'C' as generic Intermittent.
    const isCadre = job.title.toLowerCase().includes('chef') || job.title.toLowerCase().includes('directeur') || job.title.toLowerCase().includes('réalisateur') || job.level.includes('II') || job.level.includes('||');
    const cat = isCadre ? 'B' : 'C';

    output += `    {
        id: '${id}',
        title: "${job.title.replace(/"/g, '\\"')}",
        category: '${cat}',
        level: '${job.level}',
        department: '${dept}' as any,
        rates: {
            s35: ${job.rates.s35},
            s39: ${job.rates.s39},
            s7: ${job.rates.s7},
            s8: ${job.rates.s8}
        }
    },\n`;
}

output += `];

export const getJobByTitle = (title: string): JobDefinition | undefined => {
    return USPA_JOBS.find(j => j.title.toLowerCase() === title.toLowerCase());
};
`;

const outputPath = path.join(rootDir, 'data/uspaRates.ts');
fs.writeFileSync(outputPath, output);
console.log(`Generated ${sortedJobs.length} jobs in ${outputPath}`);
