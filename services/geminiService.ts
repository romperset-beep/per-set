import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { ConsumableItem, ImpactMetrics, SurplusAction, CarbonContext } from "../types";

// Initialize Gemini API (Web SDK)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY is missing. AI features will be disabled.");
}

export const generateEcoImpactReport = async (items: ConsumableItem[], projectName: string, context?: CarbonContext): Promise<ImpactMetrics> => {
  // 1. Pre-calculate deterministic metrics
  const surplusItems = items.filter(i => i.quantityCurrent > 0);
  const totalWeightKg = surplusItems.reduce((acc, item) => acc + (item.quantityCurrent * 0.5), 0);

  const valorizedItems = surplusItems.filter(i =>
    [SurplusAction.DONATION, SurplusAction.MARKETPLACE, SurplusAction.SHORT_FILM].includes(i.surplusAction as SurplusAction)
  );
  const valorizedWeightKg = valorizedItems.reduce((acc, item) => acc + (item.quantityCurrent * 0.5), 0);
  const recyclingRate = totalWeightKg > 0 ? Math.round((valorizedWeightKg / totalWeightKg) * 100) : 0;

  const donatedCount = surplusItems
    .filter(i => i.surplusAction === SurplusAction.DONATION)
    .reduce((acc, i) => acc + i.quantityCurrent, 0);
  const schoolsHelped = Math.ceil(donatedCount / 50);

  if (!genAI) {
    return {
      wasteDivertedKg: valorizedWeightKg,
      moneySaved: surplusItems.reduce((acc, item) => acc + (item.quantityCurrent * 10), 0),
      co2SavedKg: valorizedWeightKg * 2,
      schoolsHelped,
      recyclingRate,
      sustainabilityScore: recyclingRate,
      aiAnalysis: "Analyse indisponible (Clé API manquante)."
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Agis en tant qu'expert auditeur RSE spécialisé dans le secteur audiovisuel (méthodologie Ecoprod / Carbon'Clap).
      Analyse l'inventaire de la production "${projectName}".
      
      Données d'inventaire :
      ${JSON.stringify(surplusItems.map(i => ({
      name: i.name,
      qty: i.quantityCurrent,
      action: i.surplusAction,
      dept: i.department
    })))}

      Métriques pré-calculées :
      - Poids total estimé : ${totalWeightKg} kg
      - Taux de Valorisation (Réemploi/Recyclage) : ${recyclingRate}%
      
      Contexte Production (Estimations Scope 3) :
      - Jours de Tournage : ${context?.shootingDays || "Non spécifié (utiliser moyenne 30j)"}
      - Taille Équipe : ${context?.teamSize || "Non spécifié (utiliser moyenne 50 pers)"}
      - Transport Principal : ${context?.transportMode || "Mixte"}
      - Source Énergie : ${context?.energySource || "Mixte"}
      - Restauration : ${context?.cateringVegPercent || 0}% Végétarien
      - Hébergement : ${context?.totalNights || 0} nuitées totales
      - Lieux : ${context?.locationRatio || 0}% Studio / ${100 - (context?.locationRatio || 0)}% Naturel
      - HMC : ${context?.textilesEcoPercent || 0}% Eco-responsable (Second main/Loc)

      Tâche :
      1. Catégorise chaque poste selon les 8 catégories Carbon'Clap.
      2. Estime les émissions CO2 évitées. Utilise le contexte pour affiner (ex: % Végé réduit l'impact Régie, Train réduit Déplacements).
      3. Estime les économies financières.
      4. Assigne un Score de Durabilité (0-100). BONIFIE le score si le contexte est vertueux : +10-20 pts pour alimentation >50% Végé, +10-20 pts pour Train, +5-10 pts pour Énergie Réseau/Vert.
      5. Rédige une analyse professionnelle (aiAnalysis) EN FRANÇAIS. MENTONNE EXPLICITEMENT l'impact des choix de contexte (Végé, Train, Studio...).
      6. Retourne une répartition estimée du CO2 évité par catégorie Carbon'Clap (ecoprodBreakdown).

      Retourne UNIQUEMENT du JSON respectant ce schéma :
      {
        "wasteDivertedKg": number,
        "moneySaved": number,
        "co2SavedKg": number,
        "sustainabilityScore": number,
        "aiAnalysis": string,
        "ecoprodBreakdown": {
            "Production": number,
            "Lieux de tournage": number,
            "Déco": number,
            "HMC": number,
            "Déplacements": number,
            "Régie": number,
            "Moyens techniques": number,
            "Post-production": number
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    const data = JSON.parse(jsonStr);

    return {
      ...data,
      schoolsHelped,
      recyclingRate
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      wasteDivertedKg: valorizedWeightKg,
      moneySaved: surplusItems.reduce((acc, item) => acc + (item.quantityCurrent * 10), 0),
      co2SavedKg: valorizedWeightKg * 2,
      schoolsHelped,
      recyclingRate,
      sustainabilityScore: recyclingRate,
      aiAnalysis: `Analyse indisponible (Erreur IA: ${error instanceof Error ? error.message : String(error)})`
    };
  }
};

export const suggestEcoAlternatives = async (itemName: string): Promise<string> => {
  if (!genAI) return "Conseil éco non disponible (Clé API manquante).";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(`Give me a very short (1 sentence) eco-friendly alternative for: "${itemName}". Answer in French.`);
    return result.response.text() || "Pas de suggestion.";
  } catch (e) {
    return "Conseil éco non disponible.";
  }
};

// Helper to convert File to Base64 for Gemini
const fileToGenerativePart = async (file: File): Promise<Part> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];

      let mimeType = file.type;
      if (!mimeType) {
        if (file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
        else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (file.name.toLowerCase().endsWith('.png')) mimeType = 'image/png';
      }

      resolve({
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'application/octet-stream'
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeOrderFile = async (file: File): Promise<{ items: Partial<ConsumableItem>[], rawResponse: string }> => {
  if (!genAI) return { items: [], rawResponse: "API Key Missing" };
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let contentPart: Part;
    const isText = file.type.includes('text') || file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt');

    if (isText) {
      const textContent = await file.text();
      contentPart = { text: `Here is the content of a file (CSV or Text) containing a list of items:\n\n${textContent}` };
    } else {
      contentPart = await fileToGenerativePart(file);
    }

    const prompt = `
      Analyze this ${isText ? 'text content' : 'image/document'} which is a list of items to order for a film production.
      Extract the items into a JSON list.
      For each item, try to identify:
      - name: The name of the item (in French).
      - quantityInitial: The quantity (number)
      - unit: The unit (default "unités")
      - department: The most likely department (default 'Régie')
      
      Return ONLY the JSON array.
    `;

    const result = await model.generateContent([prompt, contentPart]);
    const response = await result.response;
    const text = response.text();

    if (!text) return { items: [], rawResponse: "No response text" };

    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    return { items: JSON.parse(jsonStr) as Partial<ConsumableItem>[], rawResponse: text };

  } catch (error) {
    console.error("Error analyzing file:", error);
    return { items: [], rawResponse: `Error: ${error instanceof Error ? error.message : String(error)}` };
  }
};

export const analyzeReceipt = async (file: File): Promise<{ data: any, rawResponse: string }> => {
  if (!genAI) return { data: null, rawResponse: "API Key Missing" };
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const imagePart = await fileToGenerativePart(file);

    const prompt = `
      Analyze this receipt image.
      Extract the following fields into a valid JSON object:
      - merchantName: string (name of the merchant)
      - date: string (YYYY-MM-DD format)
      - amountTTC: number (Total amount including tax)
      - amountTVA: number (Total tax amount)
      - amountHT: number (Total amount excluding tax)
      - items: string[] (List of item names)
      
      If a value is missing or unclear, use null or 0.
      Return ONLY the JSON object.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    if (!text) return { data: null, rawResponse: "No response text" };

    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    return { data: JSON.parse(jsonStr), rawResponse: text };

  } catch (error) {
    console.error("Error analyzing receipt:", error);
    return { data: null, rawResponse: `Error: ${error instanceof Error ? error.message : String(error)}` };
  }
};

/**
 * Analyze if requested items match available marketplace items
 * Returns a mapping of requested items to marketplace availability
 */
export const analyzeMarketplaceMatch = async (
  requestedItems: Array<{ name: string; quantity: number }>,
  marketplaceItems: Array<{ name: string; category?: string }>
): Promise<Record<string, { available: boolean; matchedItem?: string; confidence: number; suggestion?: string }>> => {
  if (!genAI) {
    // Fallback: simple string matching
    const results: Record<string, any> = {};
    requestedItems.forEach(req => {
      const match = marketplaceItems.find(m =>
        m.name.toLowerCase().includes(req.name.toLowerCase()) ||
        req.name.toLowerCase().includes(m.name.toLowerCase())
      );
      results[req.name] = {
        available: !!match,
        matchedItem: match?.name,
        confidence: match ? 70 : 0,
        suggestion: match ? undefined : "Vérifier manuellement le marketplace"
      };
    });
    return results;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Tu es un assistant qui aide à matcher des articles demandés avec un inventaire disponible.
      
      ARTICLES DEMANDÉS :
      ${requestedItems.map(i => `- ${i.name} (quantité: ${i.quantity})`).join('\n')}
      
      INVENTAIRE DISPONIBLE (Marketplace A Better Set) :
      ${marketplaceItems.map(m => `- ${m.name}${m.category ? ` (catégorie: ${m.category})` : ''}`).join('\n')}
      
      Pour chaque article demandé, indique :
      1. S'il existe dans l'inventaire (match exact ou similaire)
      2. Le nom exact de l'article correspondant dans l'inventaire (si match)
      3. Un score de confiance (0-100%)
      4. Une suggestion si pas de match exact
      
      Retourne UNIQUEMENT du JSON respectant ce format :
      {
        "Article demandé": {
          "available": true/false,
          "matchedItem": "Nom exact dans inventaire" ou null,
          "confidence": 95,
          "suggestion": "Explication si pas de match exact" ou null
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Marketplace analysis error:", error);
    // Fallback to simple matching
    const results: Record<string, any> = {};
    requestedItems.forEach(req => {
      results[req.name] = {
        available: false,
        confidence: 0,
        suggestion: "Analyse IA indisponible, vérifier manuellement"
      };
    });
    return results;
  }
};

export const analyzePDTWithGemini = async (file: File): Promise<any | null> => {
  if (!genAI) {
    throw new Error("API Key (VITE_GEMINI_API_KEY) is missing or invalid.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let contentPart: Part;
    let isExcel = false;

    // Check if file is Excel
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      isExcel = true;
      console.log("Analyzing Excel file...");

      // Dynamic import to avoid loading xlsx if not needed
      const XLSX = await import("xlsx");

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to CSV with safety limits
      // 1. Check range
      if (worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const MAX_ROWS = 1000;
        const MAX_COLS = 50; // AZ roughly

        if (range.e.r > MAX_ROWS) range.e.r = MAX_ROWS;
        if (range.e.c > MAX_COLS) range.e.c = MAX_COLS;

        worksheet['!ref'] = XLSX.utils.encode_range(range);
      }

      const csvContent = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });
      contentPart = { text: `Here is the content of the Excel file (converted to CSV):\n\n${csvContent}` };
    } else {
      contentPart = await fileToGenerativePart(file);
    }

    const prompt = `
      Act as a 1st AD. Analyze this Plan de Travail (Shooting Schedule).
      The input is provided as ${isExcel ? 'CSV text extracted from an Excel file' : 'an image or PDF document'}.
      
      GOAL: Extract ONLY valid shooting days (days with work) and accurate sequence count.
      
      
      GRID LAYOUT DETECTION (Common in French PDTs):
      - Look for a "Calendar Grid" structure where columns represent days.
      - Row 1: "SEMAINE" (Week Number)
      - Row 2: "MOIS" (Month Name, e.g., "NOVEMBRE")
      - Row 3: "JOUR" (Day Name, e.g., "Lu", "Ma", "Me")
      - Row 4: "DATE" (Day Number, e.g., "11", "12")
      - Content Rows: Sequences are listed in the cells BENEATH these date columns.
      
      CRITICAL YEAR RULES:
      1. IGNORE the current real-world year (${new Date().getFullYear()}). 
      2. TRUST THE DOCUMENT YEAR. Look for "24", "2024", "25", "2025" in the Title or Header (e.g., "11/17/24").
      3. If the document says "NOV 24", it means November 2024.
      4. DEC/JAN SPLIT: If dates go from December to January, INCREMENT the year (e.g. Dec 2024 -> Jan 2025).
      5. DO NOT assume January is "already done" just because it's in the past relative to today. Analyze the schedule as a standalone plan.
      
      SEQUENCE EXTRACTION RULES:
      1. Sequences are found in the grid cells corresponding to active dates.
      2. They can be:
         - Simple numbers: "1", "2", "30"
         - Alphanumeric: "1A", "36B", "11/12"
         - Lists: "1, 2, 3" (Count as 3)
         - Ranges: "1-3" (Count as 3)
      3. IGNORE: "Décor", "Lieu", "Page" numbers.
      4. STRICT EXCLUSION RULES (CRITICAL):
         - DO NOT COUNT a day as a shooting day if the sequence cell is EMPTY or BLANK.
         - DO NOT COUNT a day if the cell contains terms like: "OFF", "VACANCES", "VOYAGE", "TRAVEL", "PREP", "REPOS", "FERIÉ", "RTT".
         - A day is ONLY a shooting day if it has specific SCENE/SEQUENCE NUMBERS or a SET NAME declared.
      
      TOTAL COUNT CHECK:
      - Look for a header saying "JOUR DE TOURNAGE" or a cumulative count row (e.g. "1, 2, 3... 52").
      - Use this to cross-reference your count.
      - If your count is 32 and the document says 31, YOU ARE WRONG. Find the non-shooting day you included and remove it.
      
      OUTPUT JSON:
      {
        "dates": ["DD/MM/YYYY", ...],
        "sequencesCount": number,
        "startDayInfo": string | null,
        "startDayOffset": number,
        "reasoning": "Detailed explanation: 'Found 74 date columns. Identified 45 active shooting days after excluding 20 weekends (no sequences), 5 OFF days, 4 PREP days. Date range: 04/10/2024 to 17/12/2024. Counted 123 distinct sequences (examples: 1, 2, 5A, 12-14 counted as 3, 18, 22A).'"
      }
    `;

    const result = await model.generateContent([prompt, contentPart]);
    const response = await result.response;
    const text = response.text();

    console.log("Raw Gemini Output:", text); // For debugging in browser console

    // Robust JSON Extraction
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON found in AI response");
    }

    const jsonStr = text.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Gemini PDT Analysis failed:", error);
    // Return the error message inside an object so pdtService can display it
    // instead of just returning null which leads to generic "invalid result"
    throw error;
  }
};
