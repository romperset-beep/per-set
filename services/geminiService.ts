import { GoogleGenAI, Type } from "@google/genai";
import { ConsumableItem, ImpactMetrics, SurplusAction } from "../types";

// Initialize Gemini API (New SDK)
const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

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

  try {
    const prompt = `
      Agis en tant qu'expert auditeur RSE spécialisé dans le secteur audiovisuel (AFNOR Spec 2308).
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
      1. Estime les émissions CO2 évitées (Scope 3) (co2SavedKg).
      2. Estime les économies financières (moneySaved).
      3. Assigne un Score de Durabilité (0-100).
      4. Rédige une analyse professionnelle (aiAnalysis) EN FRANÇAIS. L'analyse DOIT être en français.

      Retourne UNIQUEMENT du JSON.
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            wasteDivertedKg: { type: Type.NUMBER },
            moneySaved: { type: Type.NUMBER },
            co2SavedKg: { type: Type.NUMBER },
            sustainabilityScore: { type: Type.NUMBER },
            aiAnalysis: { type: Type.STRING },
          },
          required: ["wasteDivertedKg", "moneySaved", "co2SavedKg", "sustainabilityScore", "aiAnalysis"]
        }
      }
    });

    // FIX: Use .text getter instead of .text() method
    const text = response.text; 
    if (!text) throw new Error("No response text from Gemini");

    const data = JSON.parse(text);

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
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: `Give me a very short (1 sentence) eco-friendly alternative for: "${itemName}". Answer in French.` }] }],
    });
    return response.text || "Pas de suggestion.";
  } catch (e) {
    return "Conseil éco non disponible.";
  }
};

// Helper to convert File to Base64 for Gemini (New SDK Format)
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
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
  try {
    let contentPart;
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

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { role: "user", parts: [{ text: prompt }, contentPart as any] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return { items: [], rawResponse: "No response text" };

    return { items: JSON.parse(text) as Partial<ConsumableItem>[], rawResponse: text };

  } catch (error) {
    console.error("Error analyzing file:", error);
    return { items: [], rawResponse: `Error: ${error instanceof Error ? error.message : String(error)}` };
  }
};

export const analyzeReceipt = async (file: File): Promise<{ data: any, rawResponse: string }> => {
  try {
    const imagePart = await fileToGenerativePart(file);

    const prompt = `
      Analyze this receipt image.
      Extract: merchantName, date, amountTTC, amountTVA, items (list).
      Return ONLY JSON.
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { role: "user", parts: [{ text: prompt }, imagePart as any] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return { data: null, rawResponse: "No response text" };

    return { data: JSON.parse(text), rawResponse: text };

  } catch (error) {
    console.error("Error analyzing receipt:", error);
    return { data: null, rawResponse: `Error: ${error instanceof Error ? error.message : String(error)}` };
  }
};
