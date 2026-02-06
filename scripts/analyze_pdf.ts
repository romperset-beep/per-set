
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
                "transports": [
                    {
                        "name": "Camille LOU",
                        "pickupTime": "20h15",
                        "pickupLocation": "Domicile",
                        "driver": "Taxi",
                        "destination": "HMC",
                        "arrivalTime": "21h00"
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
            
            Pour la date, essaye de déduire l'année si elle n'est pas explicite (nous sommes probablement en ${new Date().getFullYear()}).
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


        const text = result.response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonString);

        console.log("--- DEBUG EXTRACTION ---");
        console.log("Date:", data.date);
        console.log("Call Time (PAT):", data.callTime);
        console.log("End Time (Fin Est):", data.endTime);
        console.log("Location 1:", data.location1);
        console.log("------------------------");
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Error analyzing PDF:", error);
    }
}

analyzePdf();
