
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Set worker source to local file bundled by Vite
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;

        let fullText = '';
        const pageCount = doc.numPages;

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
            // Use undefined check or default value if needed, but keys are numbers.
            const sortedY = [...linesMap.keys()].sort((a, b) => b - a);

            let pageText = "";
            for (const y of sortedY) {
                const lineItems = linesMap.get(y);
                if (!lineItems) continue;

                // Sort items Left to Right (X Ascending)
                lineItems.sort((a, b) => a.x - b.x);
                // Join with space
                const lineStr = lineItems.map(it => it.text).join(' ');
                pageText += lineStr + '\n';
            }

            fullText += pageText + '\n';
        }

        return fullText;

    } catch (error) {
        console.error("Error parsing PDF:", error);
        throw new Error("Failed to parse PDF document.");
    }
};
