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
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            Tu es un assistant de production expert (1er Assistant Réal).
            ANALYSE cette Feuille de Service (Call Sheet) PDF.
            
            OBJECTIF : Extraire les informations structurées pour l'application.
            
            Format de réponse attendu : JSON UNIQUEMENT (pas de markdown, pas de texte avant/après).
            
            Structure JSON :
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
                    "morningTemp": 12 (nombre, degres celsius),
                    "afternoonTemp": 15
                },
                "weather": {
                    "condition": "ex: Ensoleillé, Pluvieux",
                    "morningTemp": 12 (nombre, degres celsius),
                    "afternoonTemp": 15
                },
                "cast": [
                    { 
                        "role": "TAMARA", 
                        "actor": "Camille LOU",
                        "pickupTime": "20:15",
                        "hmcTime": "21:00",
                        "mealTime": "22:30",
                        "readyTime": "23:30" 
                    }
                ],
                "extras": [
                    { 
                        "name": "Policiers (5)", 
                        "hmcTime": "22:50", 
                        "readyTime": "23:30"
                    }
                ],
                "sequences": [
                    {
                        "sequenceNumber": "1/1A",
                        "decor": "INT. CUISINE",
                        "description": "Courte description de l'action",
                        "characters": ["Jean", "Marie"]
                    }
                ],
                "notes": ["Note importante 1", "Note importante 2"],
                "departmentCallTimes": {
                    "Mise en scène": "08:00",
                    "Caméra": "08:00",
                    "Régie": "07:00",
                    "...": "..."
                },
                "departmentNotes": {
                    "Mise en scène": ["Note 1", "Note 2"],
                    "Image": ["Prévoir filtre pola", "Opv sur place"],
                    "Costume": ["Raccord costume Paul..."]
                }
            }

            Si une info est introuvable, laisse-la vide ou null.
            Pour "departmentCallTimes", liste explicitement les horaires de convocation par département trouvés dans le tableau (souvent appelé "Tableau de Service" ou "Convocations").
            
            IMPORTANT POUR "departmentNotes" :
            Trouve toutes les sections spécifiques à chaque département dans le corps de la feuille de service.
            Cherche des titres en MAJUSCULES ou GRAS comme "IMAGE", "IMAG", "CAMÉRA", "MACHINERIE", "ÉLECTRICITÉ", "SON", "ACCESSOIRES", "M.E.S", "MISE EN SCÈNE", "HMC", etc.
            Tout texte qui suit ces titres et qui donne des instructions techniques (ex: "Stead, Ronin 2", "Grue", "Prévoir...", "Attention à...") DOIT être ajouté dans "departmentNotes" sous le nom du département correspondant.
            
            IMPORTANT: Normalise les clés des départements dans "departmentCallTimes" et "departmentNotes". 
            Exemple: Si tu trouves "M.E.S" ou "MES", utilise la clé "Mise en Scène". Si tu trouves "Imago" ou "Cam", utilise "Caméra".
            
            Pour la date, essaye de déduire l'année si elle n'est pas explicite (nous sommes probalement en ${new Date().getFullYear()}).
        `;

        const imagePart = await fileToGenerativePart(file);

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Cleanup JSON (remove markdown code blocks if present)
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(jsonString);

        // Map manual specific fields if necessary or strict validation could go here

        return {
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
                if (typeof e === 'string') return { name: e }; // Legacy fallback
                return {
                    name: e.name || "",
                    quantity: e.quantity || null,
                    hmcTime: e.hmcTime || null,
                    mealTime: e.mealTime || null,
                    readyTime: e.readyTime || e.parTime || null
                };
            }),
            isDigital: true // Force Digital mode for AI-pdf
        };

    } catch (error) {
        console.error("AI Analysis failed:", error);
        return {};
    }
};
