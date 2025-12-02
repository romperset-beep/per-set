/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { ConsumableItem, ImpactMetrics, SurplusAction } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateEcoImpactReport = async (
  items: ConsumableItem[],
  projectName: string
): Promise<ImpactMetrics> => {

  const surplusItems = items.filter(i => i.quantityCurrent > 0);
  const donatedCount = surplusItems.filter(i => i.surplusAction === SurplusAction.DONATION).length;
  const marketCount = surplusItems.filter(i => i.surplusAction === SurplusAction.MARKETPLACE).length;

  const prompt = `
    Analyze the environmental impact of the film production project "${projectName}".
    
    Inventory Data:
    ${JSON.stringify(surplusItems.map(i => ({ name: i.name, quantity: i.quantityCurrent, unit: i.unit, action: i.surplusAction })))}

    Context:
    - ${donatedCount} types of items were donated to film schools.
    - ${marketCount} types of items were put back into the internal circular economy market.

    Please estimate the following metrics based on industry averages for film equipment waste:
    1. Waste Diverted (in Kg)
    2. Money Saved (in EUR, estimated value of reused items)
    3. CO2 Saved (in Kg, from avoided manufacturing and disposal)
    4. A sustainability score from 0 to 100 based on the ratio of reuse/donation vs waste.
    5. A short, encouraging analysis text (max 50 words) describing the positive impact.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
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

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const data = JSON.parse(text);

    return {
      ...data,
      schoolsHelped: donatedCount > 0 ? Math.ceil(donatedCount / 2) : 0 // Mock logic for schools
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback mock data if API fails or key is missing
    return {
      wasteDivertedKg: surplusItems.reduce((acc, item) => acc + (item.quantityCurrent * 0.5), 0),
      moneySaved: surplusItems.reduce((acc, item) => acc + (item.quantityCurrent * 15), 0),
      co2SavedKg: surplusItems.reduce((acc, item) => acc + (item.quantityCurrent * 2.2), 0),
      schoolsHelped: donatedCount > 0 ? 2 : 0,
      sustainabilityScore: 75,
      aiAnalysis: "Analyse indisponible. Les données sont basées sur des estimations standard."
    };
  }
};

export const suggestEcoAlternatives = async (itemName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Give me a very short (1 sentence) eco-friendly alternative or usage tip for this film set consumable: "${itemName}". If it's already eco-friendly, say "Excellent choix". French language.`,
    });
    return response.text || "Pas de suggestion.";
  } catch (e) {
    return "Conseil éco non disponible.";
  }
};

// Helper to convert File to Base64 for Gemini
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      
      let mimeType = file.type;
      if (!mimeType) {
          if (file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
          else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
          else if (file.name.toLowerCase().endsWith('.png')) mimeType = 'image/png';
      }
      
      console.log(`Processing file: ${file.name}, Detected Type: ${file.type}, Final MimeType: ${mimeType}`);

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
    console.log("Analyzing file:", file.name, file.type, file.size);
    let contentPart;
    const isText = file.type.includes('text') || file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt');
    console.log("Is text file?", isText);

    if (isText) {
      const textContent = await file.text();
      console.log("Text content preview:", textContent.substring(0, 100));
      contentPart = { text: `Here is the content of a file (CSV or Text) containing a list of items:\n\n${textContent}` };
    } else {
      contentPart = await fileToGenerativePart(file);
    }

    const prompt = `
      Analyze this ${isText ? 'text content' : 'image/document'} which is a list of items to order for a film production.
      It might be a handwritten list, a printed document, or a digital text.
      
      Extract the items into a JSON list.
      
      For each item, try to identify:
      - name: The name of the item (in French). Correct any spelling mistakes if possible.
      - name: The name of the item (in French)
      - quantityInitial: The quantity (number)
      - unit: The unit (e.g., "boîtes", "rouleaux", "kg", "unités") - default to "unités" if unsure.
      - department: The most likely department among: 'Caméra', 'Lumière', 'Machinerie', 'Régie', 'Décoration', 'Son', 'Costume', 'Maquillage', 'Coiffure', 'Accessoire'. Default to 'Régie' if unsure.
      
      Return ONLY the JSON array. Example:
      [
        { "name": "Gaffer", "quantityInitial": 5, "unit": "rouleaux", "department": "Machinerie" }
      ]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { role: "user", parts: [{ text: prompt }, contentPart] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return { items: [], rawResponse: "No response text from Gemini" };

    console.log("Gemini Raw Response:", text);

    // Clean up markdown code blocks if present (common with Gemini)
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      return { items: JSON.parse(cleanText) as Partial<ConsumableItem>[], rawResponse: text };
    } catch (e) {
      console.error("Failed to parse JSON directly:", e);
      // Fallback: Try to find a JSON array pattern in the text
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          return { items: JSON.parse(match[0]) as Partial<ConsumableItem>[], rawResponse: text };
        } catch (e2) {
          console.error("Failed to parse extracted array:", e2);
        }
      }
      return { items: [], rawResponse: text };
    }

  } catch (error) {
    console.error("Error analyzing file:", error);
    return { items: [], rawResponse: `Error: ${error}` };
  }
};

export const analyzeReceipt = async (file: File): Promise<{ data: any, rawResponse: string }> => {
  try {
    console.log("Analyzing receipt:", file.name);
    const imagePart = await fileToGenerativePart(file);

    const prompt = `
      Analyze this receipt image or document.
      Extract the following information into a JSON object:
      - merchantName: The name of the store/merchant.
      - date: The date of purchase (ISO format YYYY-MM-DD).
      - amountTTC: The total amount including tax (number).
      - amountTVA: The total VAT/Tax amount (number). If not explicitly stated, estimate it based on standard rates (e.g. 20% in France) or return 0.
      - items: A list of item names found on the receipt (string array).

      Return ONLY the JSON object.
      Example:
      {
        "merchantName": "Leroy Merlin",
        "date": "2023-10-27",
        "amountTTC": 45.50,
        "amountTVA": 9.10,
        "items": ["Vis à bois", "Tournevis"]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { role: "user", parts: [{ text: prompt }, imagePart] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return { data: null, rawResponse: "No response text" };

    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      return { data: JSON.parse(cleanText), rawResponse: text };
    } catch (e) {
      console.error("Failed to parse receipt JSON directly:", e);
      // Fallback: Try to find a JSON object pattern
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return { data: JSON.parse(match[0]), rawResponse: text };
        } catch (e2) {
          console.error("Failed to parse extracted receipt object:", e2);
        }
      }
      return { data: null, rawResponse: text };
    }

  } catch (error) {
    console.error("Error analyzing receipt:", error);
    return { data: null, rawResponse: `Error: ${error}` };
  }
};
