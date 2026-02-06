
// Define the interface for the parsed result
export interface PDTAnalysisResult {
    dates: number;
    sequences: number;
    period: string;
    text: string; // Full extracted text for debugging
    startDayInfo: string; // "Xème jour de tournage"
    startDayOffset: number; // The X in "Xème jour"
    debugExtract?: string;
    debugDates?: string;
    debugYear?: string;
}

// Helper to normalize date strings to DD/MM/YYYY
export function normalizeDate(day: string | number, month: string | number, year: string | number): string {
    const d = day.toString().padStart(2, '0');
    const m = month.toString().padStart(2, '0');
    return `${d}/${m}/${year}`;
}

// Helper to backtrack dates skipping weekends
export function subtractWorkingDays(dateStr: string, daysToSubtract: number): Date {
    // Parse dd/mm/yyyy
    const parts = dateStr.split(/[\/\-]/);
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));

    let daysSubtracted = 0;
    while (daysSubtracted < daysToSubtract) {
        date.setDate(date.getDate() - 1);
        // If not weekend (0=Sun, 6=Sat)
        if (date.getDay() !== 0 && date.getDay() !== 6) {
            daysSubtracted++;
        }
    }
    return date;
}

// Pure function to analyze text content
export const analyzePDTText = (fullText: string): PDTAnalysisResult => {
    console.log("--- DEBUG PDT EXTRACTION START ---");
    // --- DEBUG EXTRACTION ---
    // Find occurences of "tournage" and grab context
    const tournageRegex = /tournage/gi;
    let debugExtract = "DEBUG CONTEXT (Tournage):\n";
    const tMatches = [...fullText.matchAll(tournageRegex)];
    for (const m of tMatches.slice(0, 3)) { // First 3 occurences
        if (m.index !== undefined) {
            const start = Math.max(0, m.index - 50);
            const end = Math.min(fullText.length, m.index + 50);
            debugExtract += `...${fullText.substring(start, end).replace(/\n/g, '\\n')}...\n`;
        }
    }

    // Search for years to debug date format
    const yearRegex = /202[4-6]|24|25|26/g; // 2024, 2025, 2026, or 24, 25, 26
    let debugYear = "DEBUG YEARS FOUND (Context):\n";
    const yMatches = [...fullText.matchAll(yearRegex)];
    // Take a few samples
    for (const m of yMatches.slice(0, 5)) {
        if (m.index !== undefined) {
            const start = Math.max(0, m.index - 20);
            const end = Math.min(fullText.length, m.index + 20);
            debugYear += `...${fullText.substring(start, end).replace(/\n/g, '\\n')}...\n`;
        }
    }

    console.log(fullText.substring(0, 3000));
    console.log("--- DEBUG PDT EXTRACTION END ---");

    // --- REFINED ANALYSIS LOGIC ---

    // 1. Detect "Nth day of shooting"
    // Debug showed: "6\nè\nme jour de tournage"
    // Previous loose regex matched "11" from "17.11.2024" because it was close to "jour".
    // New Regex: Matches number, then optional suffix (allowing split like è \n me), then "jour".
    // Rejects random text like ".2024".
    const startDayRegex = /(\d+)\s*(?:(?:[eè°]\s*[rm]?\s*e)|(?:(?:er|ème|eme|°|e)))?\s*jour\s*(?:de)?\s*tournage/gi;
    const matches = [...fullText.matchAll(startDayRegex)];

    let startDayOffset = 0;
    let startDayInfo = "Début de planning standard (Jour 1 supposé)";
    let minDayFound = 9999;

    for (const match of matches) {
        // Extra safety: Check if number is part of a date (DD/MM or DD-MM)
        if (match.index !== undefined && match.index > 0) {
            const preChar = fullText.substring(match.index - 1, match.index);
            // Date separators or colon
            if (/[\/\-\:\.]/.test(preChar)) continue;
        }

        const dayVal = parseInt(match[1], 10);

        // Valid range check (e.g. 2 to 500)
        if (dayVal > 1 && dayVal < 500) {
            if (dayVal < minDayFound) {
                minDayFound = dayVal;
            }
        }
    }

    if (minDayFound !== 9999) {
        startDayOffset = minDayFound - 1;
        startDayInfo = `${minDayFound}ème jour de tournage détecté (Déjà effectués : ${startDayOffset} jours)`;
    }

    // 2. Count Dates (Excluding "Jour Off")
    // Added '.' separator handling AND space tolerance (\s*)
    const dateRegex = /\b\d{1,2}\s*[\/\-\.]\s*\d{1,2}\s*[\/\-\.]\s*\d{2,4}\b/g;
    // NEW: French Textual Dates (e.g. "4 Octobre", "4 \n Octobre")
    // Month names for French date detection (including abbreviations)
    // REMOVED 'mar' explicitly to avoid confusion with 'Mardi'
    const frenchDateRegex = /\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|jan|feb|apr|may|jun|jul|aug|sep|oct|nov|dec|janv|févr|avr|juil|sept|oct|nov|déc)\b/gi;

    let debugDates = "DEBUG DATES FOUND:\n";

    // Attempt to find a "Global Year" for the document to assign to text dates
    // We scan for the most frequent year token
    const yearScan = fullText.match(/202[0-9]/g);
    let detectedYear = new Date().getFullYear(); // Default to current
    if (yearScan) {
        // Find most frequent year
        const counts: { [key: string]: number } = {};
        let maxCount = 0;
        for (const y of yearScan) {
            counts[y] = (counts[y] || 0) + 1;
            if (counts[y] > maxCount) {
                maxCount = counts[y];
                detectedYear = parseInt(y, 10);
            }
        }
        console.log("Detected Global Year:", detectedYear);
    }

    const lines = fullText.split('\n');
    const validDates: string[] = [];
    const sequencesFound: string[] = [];

    // Sequence Regex: 
    // 1. Standalone: Number + Optional Letter (e.g., 36A, 12, 105)
    // strict constraints to avoid years or page numbers: 1-4 digits.
    const standaloneSeqRegex = /^\d{1,4}[A-Z]?$/;

    // 2. Contextual (same as before)
    const contextSeqRegex = /(\d+[A-Z]?)\s+(?:INT|EXT|I\s*\/\s*E|E\s*\/\s*I|I\s*\/\s*J|E\s*\/\s*J|I\s*\/\s*N|E\s*\/\s*N)\b/i;

    // --- PRE-PROCESS: GRID/TABLE DATE DETECTION ---
    // (Detect dates where Row N has DayNumbers and Row N+1 or N+2 has MonthNames)
    const gridDates: string[] = [];
    const linesList = fullText.split('\n');

    // Month checking regex (strict full words or standard abbr)
    const monthTokenRegex = /\b(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi;
    // Weekday checking regex to avoid false positives (e.g. Mar for Mars)
    const weekdayRegex = /\b(?:lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun)\b/gi;

    for (let i = 1; i < linesList.length; i++) {
        const currentLine = linesList[i];

        // Anti-false positive: Check if line is a Weekday Header (e.g. "Lun Mar Mer ...")
        const weekdayMatches = [...currentLine.matchAll(weekdayRegex)];
        if (weekdayMatches.length >= 3) {
            debugDates += `[GRID IGNORE] Skipped Weekday Header at L${i} ("${currentLine.substring(0, 30)}...")\n`;
            continue;
        }

        // Skip empty lines for month detection optimization? No, we iterate all.
        const monthMatches = [...currentLine.matchAll(monthTokenRegex)];

        if (monthMatches.length >= 2) {
            // Found a Month Row (e.g. "Oct Oct Oct")
            debugDates += `[GRID DEBUG] Found Month Row at L${i} ("${currentLine.substring(0, 30)}..."). Scanning up...\n`;

            const dayNumRegex = /\b([1-9]|[12]\d|3[01])\b/g;
            let bestDayMatches: RegExpMatchArray[] = [];
            let nonEmptyLinesFound = 0;

            // Look back up to 40 raw lines to find 2 non-empty candidate lines (sparse PDF text)
            for (let offset = 1; offset <= 40; offset++) {
                if (i - offset < 0) break;
                const pLine = linesList[i - offset].trim();
                if (!pLine) continue; // Skip empty line

                nonEmptyLinesFound++;

                // Check if this line has numbers
                const matches = [...pLine.matchAll(dayNumRegex)];
                if (matches.length >= 2) {
                    debugDates += `   -> Candidate L${i - offset}: Found ${matches.length} numbers ("${pLine.substring(0, 30)}...")\n`;
                    // Found a candidate line with numbers!
                    // If we already have a candidate, we pick the one with MORE numbers or closer?
                    // Usually the Number row is the closest meaningful row (or 2nd closest if Day Names exist).
                    // Let's take the first one that matches well.
                    if (matches.length > bestDayMatches.length) {
                        bestDayMatches = matches;
                    }

                    // If we looked at 2 non-empty lines and found numbers, we can stop.
                    if (nonEmptyLinesFound >= 2) break;
                } else {
                    debugDates += `   -> Skipped L${i - offset}: No/Few numbers ("${pLine.substring(0, 30)}...")\n`;
                }
            }

            if (bestDayMatches.length >= 2) {
                // Pair them
                // Improved Logic: If we have MORE days than months, use the LAST month for the remaining days.
                // (Common in Grids where Month is written once or repeatedly but not fully aligned)

                const countDays = bestDayMatches.length;
                const countMonths = monthMatches.length;

                for (let k = 0; k < countDays; k++) {
                    const dVal = bestDayMatches[k][0];

                    // Get Month: Use corresponding index, or fallback to the last valid month
                    let mVal = "";
                    if (k < countMonths) {
                        mVal = monthMatches[k][0];
                    } else if (countMonths > 0) {
                        // Fallback to last known month (Extended Fill)
                        mVal = monthMatches[countMonths - 1][0];
                    } else {
                        break; // Should not happen given outer check but safety first
                    }

                    const mStr = mVal.toLowerCase();
                    let mIndex = -1;
                    if (mStr.startsWith("jan")) mIndex = 0;
                    else if (mStr.startsWith("fév") || mStr.startsWith("fev") || mStr.startsWith("feb")) mIndex = 1;
                    else if (mStr.startsWith("mar")) mIndex = 2;
                    else if (mStr.startsWith("avr") || mStr.startsWith("apr")) mIndex = 3;
                    else if (mStr.startsWith("mai") || mStr.startsWith("may")) mIndex = 4;
                    else if (mStr.startsWith("juin") || mStr.startsWith("jun")) mIndex = 5;
                    else if (mStr.startsWith("juil") || mStr.startsWith("jul")) mIndex = 6;
                    else if (mStr.startsWith("aoû") || mStr.startsWith("aou") || mStr.startsWith("aug")) mIndex = 7;
                    else if (mStr.startsWith("sep")) mIndex = 8;
                    else if (mStr.startsWith("oct")) mIndex = 9;
                    else if (mStr.startsWith("nov")) mIndex = 10;
                    else if (mStr.startsWith("déc") || mStr.startsWith("dec")) mIndex = 11;

                    if (mIndex >= 0) {
                        const day = dVal.padStart(2, '0');
                        const month = (mIndex + 1).toString().padStart(2, '0');
                        const dateObj = new Date(detectedYear, mIndex, parseInt(dVal));

                        // Filter Weekends
                        if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
                            debugDates += `[IGNORED GRID WEEKEND] ${dVal} ${mVal}\n`;
                            continue;
                        }

                        const fullDateStr = normalizeDate(dVal, mIndex + 1, detectedYear);
                        gridDates.push(fullDateStr);
                        debugDates += `[VALID GRID SMART] ${dVal} ${mVal} -> ${fullDateStr}\n`;
                    }
                }
            } else {
                debugDates += `   => FAILED to find matching numbers for this Month row.\n`;
            }

        }
    }

    validDates.push(...gridDates);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // --- DATE DETECTION WITH CONTEXT ---
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
            // Check current line and immediate next line for "Jour Off"
            // Refined: If Next Line has "Jour Off", it only invalidates Current Line IF Next Line does NOT have a date itself.
            // (Otherwise it means Next Line is the one that is Off)
            let isJourOff = false;
            if (/jour\s*off/i.test(lines[i])) {
                isJourOff = true;
            } else {
                const lookAhead = Math.min(lines.length - 1, i + 1);
                if (lookAhead > i && /jour\s*off/i.test(lines[lookAhead])) {
                    // Check if lookAhead has a date
                    if (!dateRegex.test(lines[lookAhead])) {
                        isJourOff = true;
                    }
                }
            }

            if (!isJourOff) {
                // Normalize numeric dates
                const parts = dateMatch[0].split(/[\/\-\.]/);
                if (parts.length >= 2) { // Allow DD/MM at least, assume year if missing or handle validly
                    // Note: dateRegex expects year part: \d{2,4}, so parts length should be 3.
                    // But separator logic suggests split will work.
                    // Handle potential spaces if regex matched them inside separators? regex has \s*
                    const d = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10);
                    let yStr = detectedYear.toString();
                    if (parts.length >= 3) {
                        yStr = parts[2].trim();
                        // Fix 2-digit years
                        if (yStr.length === 2) yStr = "20" + yStr;
                    }

                    const fullDateStr = normalizeDate(d, m, yStr);
                    validDates.push(fullDateStr);
                    debugDates += `[VALID NUMERIC] ${dateMatch[0]} -> ${fullDateStr}\n`;
                } else {
                    validDates.push(dateMatch[0]); // Fallback if split fails
                    debugDates += `[VALID NUMERIC] ${dateMatch[0]}\n`;
                }
            } else {
                debugDates += `[IGNORED NUMERIC: OFF] ${dateMatch[0]}\n`;
            }
        }

        // --- FRENCH TEXT DATE DETECTION ---
        // match[1] = day, match[2] = month
        let fMatch;
        while ((fMatch = frenchDateRegex.exec(line)) !== null) {
            // Check context manually (Jour Off)
            // Same logic as numeric dates
            let isJourOff = false;
            // ... context check (simplified for now, assuming date text is unique enough)

            // Map month name to number (0-11)
            const mStr = fMatch[2].toLowerCase();
            // rudimentary mapping
            let mIndex = -1;
            if (mStr.startsWith("jan")) mIndex = 0;
            else if (mStr.startsWith("fév") || mStr.startsWith("fev") || mStr.startsWith("feb")) mIndex = 1;
            else if (mStr.startsWith("mar")) mIndex = 2;
            else if (mStr.startsWith("avr") || mStr.startsWith("apr")) mIndex = 3;
            else if (mStr.startsWith("mai") || mStr.startsWith("may")) mIndex = 4;
            else if (mStr.startsWith("juin") || mStr.startsWith("jun")) mIndex = 5;
            else if (mStr.startsWith("juil") || mStr.startsWith("jul")) mIndex = 6;
            else if (mStr.startsWith("aoû") || mStr.startsWith("aou") || mStr.startsWith("aug")) mIndex = 7;
            else if (mStr.startsWith("sep")) mIndex = 8;
            else if (mStr.startsWith("oct")) mIndex = 9;
            else if (mStr.startsWith("nov")) mIndex = 10;
            else if (mStr.startsWith("déc") || mStr.startsWith("dec")) mIndex = 11;

            if (mIndex >= 0) {
                // Construct normalized date string DD/MM/YYYY
                const fullDateStr = normalizeDate(fMatch[1], mIndex + 1, detectedYear);
                validDates.push(fullDateStr);
                debugDates += `[VALID TEXTUAL] ${fMatch[0]} -> ${fullDateStr}\n`;
            }
        }

        // --- SEQUENCE DETECTION ---
        const seqMatch = line.match(contextSeqRegex);
        if (seqMatch) {
            sequencesFound.push(seqMatch[1]);
        }
        else if (standaloneSeqRegex.test(line)) {
            // Filter out likely years (e.g. 2024, 2025) if it's just a number
            const num = parseInt(line, 10);
            const isYear = num >= 1990 && num <= 2040;
            if (!isYear) {
                sequencesFound.push(line);
            }
        }
        else {
            // Try number at start of line followed by something
            const startMatch = line.match(/^(\d+[A-Z]?)\s/);
            if (startMatch) {
                const val = startMatch[1];
                // Check validity
                const num = parseInt(val, 10);
                if (num < 1990 || num > 2040) {
                    sequencesFound.push(val);
                }
            }
        }
    }

    // --- 3. FULL TEXT FALLBACK FOR SPLIT DATES (French) ---
    // If "4" is on one line and "Octobre" on another, line-scan above might fail.
    if (validDates.length === 0) {
        let ftMatch;
        // Reset regex state
        frenchDateRegex.lastIndex = 0;
        while ((ftMatch = frenchDateRegex.exec(fullText)) !== null) {
            const mStr = ftMatch[2].toLowerCase();
            let mIndex = -1;
            if (mStr.startsWith("jan")) mIndex = 0;
            else if (mStr.startsWith("fév") || mStr.startsWith("fev") || mStr.startsWith("feb")) mIndex = 1;
            else if (mStr.startsWith("mar")) mIndex = 2;
            else if (mStr.startsWith("avr") || mStr.startsWith("apr")) mIndex = 3;
            else if (mStr.startsWith("mai") || mStr.startsWith("may")) mIndex = 4;
            else if (mStr.startsWith("juin") || mStr.startsWith("jun")) mIndex = 5;
            else if (mStr.startsWith("juil") || mStr.startsWith("jul")) mIndex = 6;
            else if (mStr.startsWith("aoû") || mStr.startsWith("aou") || mStr.startsWith("aug")) mIndex = 7;
            else if (mStr.startsWith("sep")) mIndex = 8;
            else if (mStr.startsWith("oct")) mIndex = 9;
            else if (mStr.startsWith("nov")) mIndex = 10;
            else if (mStr.startsWith("déc") || mStr.startsWith("dec")) mIndex = 11;

            if (mIndex >= 0) {
                const fullDateStr = normalizeDate(ftMatch[1], mIndex + 1, detectedYear);

                if (!validDates.includes(fullDateStr)) {
                    validDates.push(fullDateStr);
                    debugDates += `[VALID TEXTUAL SPLIT] ${ftMatch[0].replace(/\n/g, ' ')} -> ${fullDateStr}\n`;
                }
            }
        }
    }

    // --- 4. VERTICAL FALLBACK (Sequence Mode) ---
    // Run this if we found FEW dates (< 5) because it might be a false positive "8 Septembre"
    let fallbackCount = 0;
    if (validDates.length < 5) {
        debugDates += "FEW DATES FOUND. CHECKING VERTICAL FALLBACK...\n";

        // Look for "Jour de tournage" literally
        const headerRegex = /Jour\s*(?:de)?\s*tournage/i;
        const headerMatch = fullText.match(headerRegex);

        if (headerMatch && headerMatch.index !== undefined) {
            const textAfter = fullText.substring(headerMatch.index + headerMatch[0].length);
            const numberRegex = /\b(\d{1,3})\b/g;
            const numbersAfter: number[] = [];
            let nMatch;
            const scanLimitText = textAfter.substring(0, 5000);
            while ((nMatch = numberRegex.exec(scanLimitText)) !== null) {
                numbersAfter.push(parseInt(nMatch[1], 10));
            }

            // Analyze if we have a sequence
            // We expect a dense group of numbers: 1, 2, 3, 4...

            // NEW LOGIC: Use MAX value in the sequence (filtered for outliers)
            // If we have 1, 2, ... 44, 45 -> Max is 45.
            // We trust the "Jour de tournage" header implies these are the count.

            // Filter numbers < 150 to avoid page numbers or year fragments
            const candidateDays = [...new Set(numbersAfter.filter(n => n > 0 && n < 150))].sort((a, b) => a - b);

            if (candidateDays.length >= 2) {
                // Find longest consecutive-ish sequence to determine max
                let sequenceMax = candidateDays[0];

                // DEBUG: Log the full candidate list to identify where it breaks
                const debugSeq = candidateDays.join(',');
                debugDates += `[DEBUG SEQ] Candidates: ${debugSeq.substring(0, 100)}... \n`;

                for (let j = 1; j < candidateDays.length; j++) {
                    const gap = candidateDays[j] - candidateDays[j - 1];

                    if (gap <= 2) {
                        // Standard sequential increment
                        sequenceMax = candidateDays[j];
                    } else if (gap <= 10) {
                        // Large gap (e.g. 36->41). 
                        // LOOKAHEAD CHECK: Require STRONG continuity (2+ neighbors) to accept a jump.
                        // e.g. 36 -> 41, 42, 43 (Good).
                        // e.g. 45 -> 49, 50 (Bad? Only 2 numbers? Let's check for 2 neighbors: 49+1 AND 49+2)
                        // If we require 2 neighbors:
                        // 49 -> followed by 50, 51. If 51 missing -> Reject.
                        const hasNext1 = candidateDays.includes(candidateDays[j] + 1);
                        const hasNext2 = candidateDays.includes(candidateDays[j] + 2);

                        if (hasNext1 && hasNext2) {
                            sequenceMax = candidateDays[j];
                            debugDates += `[DEBUG SEQ] Accepted jump ${candidateDays[j - 1]} -> ${candidateDays[j]} (Gap: ${gap}, strong continuity +1/+2)\n`;
                        } else {
                            debugDates += `[DEBUG SEQ] Rejected jump ${candidateDays[j - 1]} -> ${candidateDays[j]} (Gap: ${gap}, isolated)\n`;
                            break;
                        }
                    } else {
                        debugDates += `[DEBUG SEQ] Break at ${candidateDays[j - 1]} -> ${candidateDays[j]} (Gap: ${gap}, too large)\n`;
                        break;
                    }
                }

                fallbackCount = sequenceMax;
                debugDates += `Vertical Sequence Found: Max Day ${fallbackCount}\n`;
            }
        }
    }

    const uniqueDates = [...new Set(validDates)];
    const uniqueSequences = [...new Set(sequencesFound)];

    // --- DEBUG TEXT STRUCTURE ---
    // Dump start of text to see line layout
    debugExtract += "\n--- TEXT DUMP (First 20 lines) ---\n";
    const dumpLines = fullText.split('\n').slice(0, 30);
    dumpLines.forEach((l, idx) => {
        debugExtract += `L${idx}: "${l}"\n`;
    });

    // --- 5. FINAL DECISION ---
    let finalDateCount = uniqueDates.length;
    let periodStr = "Période inconnue";

    // DECISION: Only use Fallback if we have almost NO dates.
    // Changed from < 5 to < 2. If we have 2+ dates, we trust them.
    if (uniqueDates.length < 2 && fallbackCount > 0) {
        finalDateCount = fallbackCount;
        if (uniqueDates.length <= 1) periodStr = "Dates non détectées (Mode Séquentiel)";
    }

    // Calculate Period with Backtracking if dates exist
    if (uniqueDates.length > 0) {
        let startD = uniqueDates[0];
        const endD = uniqueDates[uniqueDates.length - 1];

        if (startDayOffset > 0) {
            const backtrackedStart = subtractWorkingDays(startD, startDayOffset);
            startD = backtrackedStart.toLocaleDateString('fr-FR');
        }
        periodStr = `${startD} - ${endD}`;
    }

    return {
        dates: finalDateCount,
        sequences: uniqueSequences.length,
        period: periodStr,
        text: fullText,
        startDayInfo: startDayInfo,
        startDayOffset: startDayOffset,
        debugExtract: debugExtract,
        debugDates: debugDates,
        debugYear: debugYear
    };
};
