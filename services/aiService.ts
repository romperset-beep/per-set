import { GoogleGenerativeAI } from "@google/generative-ai";
import { CallSheet, CallSheetSequence, CallSheetWeather } from "../types";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File) => {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64String,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const analyzeCallSheetPDF = async (file: File): Promise<Partial<CallSheet>> => {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("VITE_GEMINI_API_KEY is missing. Skipping AI analysis.");
            return {};
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Reverting to 2.5-flash as found in geminiService.ts, assuming user has specific access
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            Tu es un assistant de production expert (1er Assistant Réal).
            ANALYSE cette Feuille de Service (Call Sheet) PDF.
            
            OBJECTIF : Extraire les informations structurées pour l'application.
            
            Format de réponse attendu : JSON UNIQUEMENT (pas de markdown, pas de texte avant/après).
            
            Structure JSON cible :
            {
                "date": "YYYY-MM-DD",
                "callTime": "HH:MM",
                "endTime": "HH:MM",
                "location1": "Nom du décor principal",
                "location1Address": "Adresse complète du décor 1",
                "location2": "Nom du décor secondaire (optionnel)",
                "location2Address": "Adresse complète du décor 2 (optionnel)",
                "cateringLocation": "Lieu cantine / Base Arrière",
                "cateringAddress": "Adresse cantine",
                "cateringTime": "Heure du repas / Coupure déjeuner (HH:MM)",
                "hmcAddress": "Adresse HMC / Loges (si différent du décor)",
                "nearestHospital": "Nom et adresse de l'hôpital",
                "weather": {
                    "condition": "ex: Ensoleillé, Pluvieux",
                    "morningTemp": 12,
                    "afternoonTemp": 15
                },
                "cast": [
                    { 
                        "role": "Nom du Rôle (ex: TAMARA)", 
                        "actor": "Prénom NOM de l'acteur (ex: Camille LOU)",
                        "pickupTime": "Heure P-U / PICK UP / Départ",
                        "hmcTime": "Heure HMC / M-C-H",
                        "mealTime": "Heure DÎNER / DÉJ",
                        "readyTime": "Heure PAR / PRÊT / SET" 
                    }
                ],
            
            IMPORTANT POUR LE CASTING (COMÉDIENS) :
            1. Cherche spécifiquement un tableau avec les en-têtes "RÔLES" (ou "ROLES", "PERSONNAGES") et "INTERPRÈTES" (ou "ACTEURS", "ARTISTES", "COMÉDIENS").
            2. Extrais CHAQUE ligne de ce tableau.
            3. IGNORE les "DOUBLURES" ou "CASCADES" sauf si demandé explicitement, concentre-toi sur le CAST PRINCIPAL (HMC COMÉDIENS).
            4. Si tu trouves les infos dans un tableau "TRANSPORTS", utilise-les pour compléter les horaires, mais la source principale des Noms/Rôles est le tableau "RÔLES / INTERPRÈTES".
                "extras": [
                    { 
                        "name": "Nom du Groupe (ex: Passants)", 
                        "quantity": 10,
                        "hmcTime": "HH:MM", 
                        "readyTime": "HH:MM"
                    }
                ],
                "transports": [
                    {
                        "name": "Nom Passager",
                        "pickupTime": "HH:MM",
                        "pickupLocation": "Lieu Prise en Charge",
                        "driver": "Nom Chauffeur / Taxi",
                        "destination": "Destination",
                        "arrivalTime": "HH:MM"
                    }
                ],
                "sequences": [
                    {
                        "sequenceNumber": "1/1A",
                        "decor": "INT. CUISINE",
                        "description": "Courte description",
                        "characters": ["Jean", "Marie"]
                    }
                ],
                "notes": ["Note 1", "Note 2"],
                "departmentCallTimes": {
                    "Mise en scène": "08:00",
                    "Caméra": "08:00",
                    "Régie": "07:00"
                },
                "departmentNotes": {
                    "Mise en scène": ["Note 1"],
                    "Image": ["Note 1"]
                }
            }

            Règles Importantes:
            1. Si une info est introuvable, laisse-la vide ("") ou null.
            2. Pour "departmentCallTimes", cherche le tableau des convocations.
            3. Pour "departmentNotes", cherche les instructions spécifiques par département (souvent après un titre en GRAS/MAJUSCULES).
            4. Normalise les clés des départements (ex: "M.E.S" -> "Mise en Scène").
            5. Déduis l'année si nécessaire (probablement ${new Date().getFullYear()}).
        `;

        const imagePart = await fileToGenerativePart(file);

        // Fix: Pass the whole part object, not just the inner data
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        console.log("Raw Gemini Output:", text);

        // Cleanup JSON - Robust Extraction
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("No JSON found in response");
        }

        const jsonString = text.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonString);

        return {
            date: data.date,
            callTime: data.callTime,
            endTime: data.endTime,
            location1: data.location1,
            location1Address: data.location1Address,
            location2: data.location2,
            location2Address: data.location2Address,
            cateringLocation: data.cateringLocation,
            cateringAddress: data.cateringAddress,
            cateringTime: data.cateringTime,
            hmcAddress: data.hmcAddress,
            nearestHospital: data.nearestHospital,
            weather: data.weather,
            sequences: data.sequences?.map((s: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                sequenceNumber: s.sequenceNumber,
                decor: s.decor,
                description: s.description,
                characters: s.characters || []
            })),
            notes: data.notes,
            departmentCallTimes: data.departmentCallTimes,
            departmentNotes: data.departmentNotes,
            cast: data.cast?.map((c: any) => ({
                role: c.role || "",
                actor: c.actor || "",
                pickupTime: c.pickupTime || null,
                hmcTime: c.hmcTime || null,
                mealTime: c.mealTime || null,
                readyTime: c.readyTime || c.parTime || null
            })),
            extras: data.extras?.map((e: any) => {
                if (typeof e === 'string') return { name: e };
                return {
                    name: e.name || "",
                    quantity: e.quantity || null,
                    hmcTime: e.hmcTime || null,
                    mealTime: e.mealTime || null,
                    readyTime: e.readyTime || e.parTime || null
                };
            }),
            transports: data.transports?.map((t: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: t.name || "Inconnu",
                pickupTime: t.pickupTime || null,
                pickupLocation: t.pickupLocation || null,
                driver: t.driver || null,
                destination: t.destination || null,
                arrivalTime: t.arrivalTime || t.surPlace || null
            })),
            isDigital: true
        };

    } catch (error) {
        console.error("AI Analysis failed:", error);
        throw error; // Propagate error to the component
    }
};
