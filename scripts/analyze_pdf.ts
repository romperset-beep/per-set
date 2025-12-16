
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// Read API Key manually since we are not in Vite context
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
}

if (!apiKey) {
    console.error("API Key not found in .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function analyzePdf() {
    try {
        const filePath = "/Users/romainperset/Desktop/dossier gestion des conso/CinéStock/A Better Set/A Better Set/CINEMA_Salaires-mini_11-avril-2025.pdf";
        if (!fs.existsSync(filePath)) {
            console.error("PDF file not found at:", filePath);
            process.exit(1);
        }

        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString("base64");

        const prompt = `
            Tu es un expert en paie cinéma.
            ANALYSE le PDF fourni (Salaires Cinéma).
            
            OBJECTIF : Extraire UNIQUEMENT la grille de salaire pour l'**ANNEXE III** (Films petit budget / Titre III).
            IGNORE Annexe I et II.
            
            Extrait TOUS les postes (Techniciens, Ouvriers, Cadres - Intermittents) de A à Z.
            
            FORMAT DE SORTIE ATTENDU (JSON STRICT) :
            {
              "annexe3": [
                { "title": "Nom du poste", "rates": { "baseDaily": 123.45, "baseWeekly": 456.78 } }
              ]
            }
            
            RÈGLES :
            - "baseDaily" : Salaire journalier.
            - "baseWeekly" : Salaire hebdomadaire.
            - Si valeur manquante, null.
            - Copie les chiffres exacts (1 234,56).
            - Output ONLY valid JSON.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "application/pdf",
                },
            },
        ]);

        console.log(result.response.text());
    } catch (error) {
        console.error("Error analyzing PDF:", error);
    }
}

analyzePdf();
