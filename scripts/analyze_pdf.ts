
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
        const filePath = "/Users/romainperset/Desktop/dossier gestion des conso/CinéStock/A Better Set/pav-salaires-mini-1er-juillet-2025-v2.pdf";
        if (!fs.existsSync(filePath)) {
            console.error("PDF file not found at:", filePath);
            process.exit(1);
        }

        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString("base64");

        const prompt = `
            Tu es un assistant.
            TACHE : 
            Extrait UNIQUEMENT la grille des salaires "EMPLOIS DE CATEGORIE B - CDD d'usage" (Intermittents).
            Nous avons déjà le début (A à C).
            Extrait la suite à partir de la lettre D (ou "Coiffeur" / "Chef") jusqu'à la fin de l'alphabet (Z).
            
            Format souhaité par ligne :
            Nom du poste | Catégorie | Niveau | Salaire 35h | Salaire 39h | Salaire 7h | Salaire 8h
            
            Ne sors PAS les salaires mensuels. Sors les taux hebdo et journaliers.
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
