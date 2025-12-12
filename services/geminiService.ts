import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { ConsumableItem, ImpactMetrics, SurplusAction } from "../types";

// Initialize Gemini API (Web SDK)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY is missing. AI features will be disabled.");
}

export const generateEcoImpactReport = async (items: ConsumableItem[], projectName: string): Promise<ImpactMetrics> => {
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
      
      Tâche :
      1. Catégorise chaque poste selon les 8 catégories Carbon'Clap : Production, Lieux de tournage, Déco, HMC, Déplacements, Régie, Moyens techniques, Post-production.
      2. Estime les émissions CO2 évitées (Scope 3 - Achats & Déchets) (co2SavedKg).
      3. Estime les économies financières (moneySaved).
      4. Assigne un Score de Durabilité (0-100).
      5. Rédige une analyse professionnelle (aiAnalysis) EN FRANÇAIS mentionnant l'alignement Carbon'Clap.
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
