import * as XLSX from 'xlsx';
import { PDTDay, PDTSequence } from '../types';
import { eachDayOfInterval, format, isWeekend, parseISO } from 'date-fns';

// COLUMNS DEFINITION
const COLS = {
    DATE: "Date (JJ/MM/AAAA)",
    TYPE: "Type (Tournage/Prépa/Off)",
    SEQUENCES: "Séquences (séparées par virgules)",
    DECORS: "Décors",
    LIEUX: "Lieux / Ville",
    CAST: "Comédiens (Noms ou IDs)",
    FIGU: "Figuration (Nombre/Détails)",
    NOTES: "Notes Logistique"
};

// Demo Data Constants
const DEMO_CAST = ["Jean Dujardin", "Marion Cotillard", "Omar Sy", "Léa Seydoux", "Vincent Cassel", "Audrey Tautou", "Gilles Lellouche", "Camille Cottin", "François Civil", "Adèle Exarchopoulos"];
const DEMO_SETS = ["INT. CUISINE", "EXT. RUE", "INT. SALON", "EXT. PARC", "INT. BUREAU", "EXT. FORÊT", "INT. CHAMBRE", "INT. VOITURE"];
const DEMO_LOCATIONS = ["Paris 18", "Studio A", "Bois de Vincennes", "Versailles", "Aubervilliers", "Montmartre"];
const DEMO_NOTES = ["Besoin camion machino", "Cantine décalée 13h", "Silence demandé (voisins)", "Cascadeur requis", "Pluie artificielle", "Gros dispositif lumière"];


export const generatePDTTemplate = (startDate?: string, endDate?: string, demoMode: boolean = false) => {
    // 1. Create Data with Headers
    const headers = [
        COLS.DATE,
        COLS.TYPE,
        COLS.SEQUENCES,
        COLS.DECORS,
        COLS.LIEUX,
        COLS.CAST,
        COLS.FIGU,
        COLS.NOTES
    ];

    const data: any[][] = [headers];

    if (startDate && endDate) {
        try {
            // Check if dates are already ISO strings (YYYY-MM-DD) or Date objects
            // The project context usually stores them as YYYY-MM-DD strings
            const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
            const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

            // Generate range
            const days = eachDayOfInterval({ start, end });

            // Demo Mode Preparation
            const allDays = days.filter(d => !isWeekend(d));
            const totalShootDays = allDays.length;

            // Calculate sequences needed for FULL coverage (~2.5 per day avg minimum)
            const totalSequences = Math.max(130, Math.ceil(totalShootDays * 3));

            // Sequence Pool
            let remainingSequences = demoMode ? Array.from({ length: totalSequences }, (_, i) => i + 1) : [];
            let remainingShootDays = totalShootDays;

            let totalExtrasUsed = 0;
            const targetExtras = 100;

            days.forEach((day: Date) => {
                const dateStr = format(day, "dd/MM/yyyy");
                const isWE = isWeekend(day);
                // Default logic: Weekend = OFF, Weekday = Tournage
                const type = isWE ? "OFF" : "Tournage";

                let seqs = "";
                let decors = "";
                let lieux = "";
                let cast = "";
                let figu = "";
                let notes = "";

                if (demoMode && !isWE) {
                    // 1. Assign Sequences Dynamically
                    // Calculate target for this day to ensure we reach the end with sequences
                    const baseTarget = Math.ceil(remainingSequences.length / remainingShootDays);
                    // Add randomness: +/- 1 around the target (min 1)
                    let seqCount = baseTarget + (Math.random() < 0.5 ? -1 : 1);

                    // Clamp to valid range
                    if (seqCount < 1) seqCount = 1;
                    if (seqCount > remainingSequences.length) seqCount = remainingSequences.length;

                    // Consume sequences
                    const daySeqs = remainingSequences.splice(0, seqCount);
                    seqs = daySeqs.join(", ");

                    // Decrement remaining days
                    remainingShootDays--;

                    // 2. Assign random Decor
                    decors = DEMO_SETS[Math.floor(Math.random() * DEMO_SETS.length)];

                    // 3. Assign random Location
                    lieux = DEMO_LOCATIONS[Math.floor(Math.random() * DEMO_LOCATIONS.length)];

                    // 4. Assign random Cast (2 to 5 actors)
                    const castCount = Math.floor(Math.random() * 4) + 2;
                    // Shuffle and pick
                    const shuffledCast = [...DEMO_CAST].sort(() => 0.5 - Math.random());
                    cast = shuffledCast.slice(0, castCount).join(", ");

                    // 5. Assign Extra (randomly distribute the ~100 total)
                    // Simple logic: 20% chance of having extras
                    if (Math.random() > 0.7 && totalExtrasUsed < targetExtras) {
                        const extraCount = Math.floor(Math.random() * 15) + 5;
                        figu = `${extraCount} passants`;
                        totalExtrasUsed += extraCount;
                    }

                    // 6. Notes
                    if (Math.random() > 0.8) {
                        notes = DEMO_NOTES[Math.floor(Math.random() * DEMO_NOTES.length)];
                    }
                }

                data.push([
                    dateStr,
                    type,
                    seqs,
                    decors,
                    lieux,
                    cast,
                    figu,
                    notes
                ]);
            });
        } catch (e) {
            console.warn("Date generation error:", e);
            // Fallback
            data.push(["11/11/2024", "Tournage", "1, 2, 3", "Int. Cuisine", "Paris", "Jean, Marie", "10 passants", "Besoin camion"]);
        }
    } else {
        // 2. Add some example rows (fallback)
        data.push(
            ["11/11/2024", "Tournage", "1, 2, 3", "Int. Cuisine", "Paris", "Jean, Marie", "10 passants", "Besoin camion"],
            ["12/11/2024", "Tournage", "4, 5A, 5B", "Ext. Parc", "Paris", "Marc", "", ""],
            ["13/11/2024", "Off", "", "", "", "", "", ""]
        );
    }

    // 3. Create Workbook
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-width (basic)
    ws['!cols'] = [
        { wch: 15 }, // Date
        { wch: 15 }, // Type
        { wch: 30 }, // Sequences
        { wch: 20 }, // Decors
        { wch: 20 }, // Lieux
        { wch: 25 }, // Cast
        { wch: 20 }, // Figu
        { wch: 30 }  // Notes
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modele_PDT");

    return wb;
};

export const parsePDTMatrix = async (file: File): Promise<{ days: PDTDay[], sequences: PDTSequence[] }> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    // Read as JSON with headers
    const rawData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

    const pdtDays: PDTDay[] = [];
    const allSequences: PDTSequence[] = [];

    rawData.forEach((row: any) => {
        // 1. Parse Date
        const rawDate = row[COLS.DATE];
        if (!rawDate) return;

        let dateStr = "";
        if (typeof rawDate === 'number') {
            // Excel Serial Date
            const dateObj = XLSX.SSF.parse_date_code(rawDate);
            if (dateObj) {
                dateStr = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
            }
        } else {
            // String DD/MM/YYYY
            const parts = String(rawDate).split('/');
            if (parts.length === 3) {
                dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }

        if (!dateStr || dateStr.length !== 10) return; // Invalid date

        // 2. Parse Type
        let type: any = 'SHOOT';
        const rawType = String(row[COLS.TYPE] || '').toUpperCase();
        if (rawType.includes('PREP')) type = 'PREP';
        else if (rawType.includes('OFF') || rawType.includes('REPOS')) type = 'OFF';
        else if (rawType.includes('TRAVEL') || rawType.includes('VOYAGE')) type = 'TRAVEL';
        else if (rawType.includes('WRAP') || rawType.includes('FIN')) type = 'WRAP';

        // 3. Parse Sequences
        const rawSeqs = String(row[COLS.SEQUENCES] || '');
        const sequences = rawSeqs.split(/[,;\s]+/).filter(s => s.trim().length > 0 && s.toUpperCase() !== 'NULL');

        // 4. Create Day Object
        const day: PDTDay = {
            date: dateStr,
            type,
            location: String(row[COLS.LIEUX] || ''),
            set: String(row[COLS.DECORS] || ''),
            sequences: sequences,
            cast: String(row[COLS.CAST] || '').split(/[,;]+/).map(s => s.trim()).filter(s => s),
            extras: String(row[COLS.FIGU] || ''),
            notes: String(row[COLS.NOTES] || '')
        };

        pdtDays.push(day);

        // 5. Aggregate Sequences for linking
        sequences.forEach(seqId => {
            allSequences.push({
                id: seqId,
                date: dateStr,
                description: day.set
            });
        });
    });

    return { days: pdtDays, sequences: allSequences };
};
