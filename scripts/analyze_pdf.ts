
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
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function analyzePdf() {
    try {
        const filePath = "/Users/romainperset/Desktop/dossier gestion des conso/fds J1.pdf";
        if (!fs.existsSync(filePath)) {
            console.error("PDF file not found at:", filePath);
            process.exit(1);
        }

        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString("base64");

        const prompt = `
            Tu es un assistant de production expert.
            ANALYSE cette Feuille de Service (Call Sheet).
            
            OBJECTIF : Resumer les informations clés pour l'équipe.
            
            Informations à extraire :
            - Date du tournage
            - Heure de Prêt à Tourner (P.A.T)
            - Heure de fin estimée (si indiquée)
            - Lieux (Décors) avec adresses
            - Lieu Cantine (si différent)
            - Séquences à tourner (résumé rapide)
            - Notes importantes (Météo, Sécurité, etc.)

            Format de sortie : JSON pur.
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
