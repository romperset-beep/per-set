
import * as pdfjsLib from 'pdfjs-dist';

// Setting worker path for PDF.js using Vite's URL import
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import { analyzePDTText, PDTAnalysisResult } from './pdtAnalysis';
export type { PDTAnalysisResult } from './pdtAnalysis';
// Re-export specific helper if needed elsewhere, but ideally logic stays inside analysis
export { subtractWorkingDays } from './pdtAnalysis';


import { analyzePDTWithGemini } from './geminiService';

export const parsePDT = async (file: File): Promise<PDTAnalysisResult> => {
    try {
        let aiErrorMsg = "";
        try {
            // 1. Try Gemini AI Analysis (Visual Understanding)
            console.log("Attempting Gemini AI Analysis...");
            const aiResult = await analyzePDTWithGemini(file);

            if (aiResult && aiResult.dates && Array.isArray(aiResult.dates)) {
                console.log("Gemini Analysis Successful:", aiResult);

                // POST-PROCESSING VALIDATION
                const warnings: string[] = [];

                if (aiResult.dates.length > 0) {
                    // Parse first and last dates to check range consistency
                    try {
                        const parseDate = (dateStr: string) => {
                            const [day, month, year] = dateStr.split('/').map(Number);
                            return new Date(year, month - 1, day);
                        };

                        const firstDate = parseDate(aiResult.dates[0]);
                        const lastDate = parseDate(aiResult.dates[aiResult.dates.length - 1]);
                        const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

                        // Check if the number of shooting days is reasonable compared to date range
                        if (daysDiff > 0 && aiResult.dates.length > daysDiff + 1) {
                            warnings.push(`⚠️ Shooting days (${aiResult.dates.length}) exceed date range (${daysDiff + 1} days)`);
                        }

                        // Check for unrealistic gaps (e.g., more than 3 weeks without explanation)
                        if (daysDiff > aiResult.dates.length * 2) {
                            warnings.push(`⚠️ Large gap detected: ${daysDiff} calendar days for ${aiResult.dates.length} shooting days`);
                        }
                    } catch (parseError) {
                        warnings.push('⚠️ Could not validate date range (parsing error)');
                    }
                }

                return {
                    dates: aiResult.dates.length,
                    sequences: aiResult.sequencesCount || 0,
                    period: aiResult.dates.length > 0 ? `${aiResult.dates[0]} - ${aiResult.dates[aiResult.dates.length - 1]}` : "Dates non détectées",
                    text: "Analyzed by Gemini AI",
                    startDayInfo: aiResult.startDayInfo || "Début de planning standard",
                    startDayOffset: aiResult.startDayOffset || 0,
                    debugExtract: `AI Analysis Used.${warnings.length > 0 ? '\n\nVALIDATION WARNINGS:\n' + warnings.join('\n') : ''}\n\nREASONING: ${aiResult.reasoning || 'No details provided'}\n\n`,
                    debugDates: JSON.stringify(aiResult.dates, null, 2),
                    debugYear: "AI Detected"
                };
            } else {
                aiErrorMsg = "AI returned empty or invalid result.";
            }
        } catch (e: any) {
            aiErrorMsg = `AI Failed: ${e.message}`;
            console.error(e);
        }

        console.log(`Gemini Analysis skipped or failed (${aiErrorMsg}). Falling back to Regex.`);

        // 2. Fallback to Local Regex Parser
        const arrayBuffer = await file.arrayBuffer();

        // Set worker source to local file bundled by Vite
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;

        let fullText = '';
        let pageCount = doc.numPages;

        for (let i = 1; i <= pageCount; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();

            // Advanced Line Reconstruction (Group by Y)
            const linesMap = new Map<number, { x: number, text: string }[]>();

            for (const item of textContent.items) {
                // Check if item has 'str' (TextItem vs TextMarkedContent)
                if ('str' in item && 'transform' in item) {
                    const textItem = item as any; // Cast to access transform
                    const y = textItem.transform[5]; // Y position
                    const x = textItem.transform[4]; // X position
                    const text = textItem.str;

                    if (!text.trim()) continue; // Skip pure whitespace items to allow better merging? No, keep for spacing if needed.

                    // Find existing line with close Y (tolerance)
                    let foundY = -1;
                    for (const key of linesMap.keys()) {
                        if (Math.abs(key - y) < 4) { // Tolerance of 4 units
                            foundY = key;
                            break;
                        }
                    }

                    if (foundY !== -1) {
                        linesMap.get(foundY)?.push({ x, text });
                    } else {
                        linesMap.set(y, [{ x, text }]);
                    }
                }
            }

            // Sort lines from Top to Bottom (Y Descending)
            const sortedY = [...linesMap.keys()].sort((a, b) => b - a);

            let pageText = "";
            for (const y of sortedY) {
                const lineItems = linesMap.get(y)!;
                // Sort items Left to Right (X Ascending)
                lineItems.sort((a, b) => a.x - b.x);
                // Join with space
                const lineStr = lineItems.map(it => it.text).join(' ');
                pageText += lineStr + '\n';
            }

            // ... existing regex logic ...
            fullText += pageText + '\n\n';
        }

        const regexResult = analyzePDTText(fullText);
        // Append AI error to debugExtract for visibility
        regexResult.debugExtract = `[AI FAILURE REASON]: ${aiErrorMsg}\n\n` + (regexResult.debugExtract || "");
        regexResult.debugDates = `[AI FAILURE REASON]: ${aiErrorMsg}\n\n` + (regexResult.debugDates || "");
        return regexResult;

    } catch (error) {
        console.error("Error parsing PDF:", error);
        throw new Error("Failed to parse PDF document.");
    }
};
