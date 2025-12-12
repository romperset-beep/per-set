
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
        const filePath = "/Users/romainperset/Desktop/dossier gestion des conso/CinéStock/A Better Set/FA208219_20251212_120544.pdf";
        if (!fs.existsSync(filePath)) {
            console.error("PDF file not found at:", filePath);
            process.exit(1);
        }

        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString("base64");

        const prompt = `
            Tu es un expert en certification RSE pour le cinéma.
            Analyse ce document PDF (qui est le Référentiel Label Ecoprod).
            
            TACHE : 
            Extrait TOUTES les questions / critères d'audit présents dans ce document, organisés par catégorie (ex: "Bureaux", "Tournage", "Régie", etc.).
            Pour chaque critère, détermine son niveau d'impact (High, Medium, Low) basé sur l'importance donnée dans le texte (ou estime-le si non explicite).
            
            FORMAT JSON OBLIGATOIRE :
            [
                {
                    "category": "Nom de la Catégorie",
                    "criteria": [
                        { 
                            "id": "Code (ex: F1, G2...)", 
                            "label": "La question exacte posée (sans préfixe)", 
                            "impact": "High" | "Medium" | "Low" 
                        }
                    ]
                }
            ]
            
            - IGNORE les textes purement introductifs.
            - Recopie fidèlement le texte de la question pour le "label".
            - S'il y a des codes (A1, B2...), utilise-les comme ID. Sinon, invente un ID court unique.
            - Retourne UNIQUEMENT le JSON valid. Pas de markdown.
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
