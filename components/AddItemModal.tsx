import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Department, ConsumableItem, ItemStatus, SurplusAction } from '../types';
import { X, Plus, Leaf, List, Search, Upload, Loader2, AlertCircle } from 'lucide-react';
import { suggestEcoAlternatives, analyzeOrderFile } from '../services/geminiService';
import { useProject } from '../context/ProjectContext';

// Popular items database for the scrolling banner
const POPULAR_ITEMS: Record<string, string[]> = {
    [Department.CAMERA]: [
        'Gaffer Tape Noir 50mm', 'Gaffer Tape Blanc 50mm', 'Gaffer Tape Noir 25mm', 'Camera Tape (toutes couleurs)',
        'Dust Off (Air Sec)', 'Pancro (Nettoyant Optique)', 'Lingettes Optiques (Kimwipes)', 'Microfibre',
        'Marqueur Ardoise (Noir/Rouge/Bleu)', 'Bongo Ties', 'Velcro Adhésif', 'Velcro Double Face',
        'Piles AA Lithium', 'Piles AAA Lithium', 'Piles 9V', 'Batteries CR123',
        'Charte de Gris', 'Clap', 'Stylo Nettoyage Objectif', 'Coton-tige Précision',
        'T-Marker', 'Coins Photo', 'Chamoisine', 'Housse Pluie Caméra'
    ],
    [Department.LUMIERE]: [
        'Gélatine CTB (Full/1/2/1/4)', 'Gélatine CTO (Full/1/2/1/4)', 'Gélatine Plus Green', 'Gélatine Minus Green',
        'Diffusion 216 (White Diffusion)', 'Diffusion 250 (Half White)', 'Diffusion 251 (Quarter White)',
        'Grid Cloth (Full/Lite/Quarter)', 'Opal Frost', 'Hampshire Frost',
        'Black Wrap (Cinefoil)', 'Ruban Élec (Barnier) Noir/Blanc/Couleurs',
        'C-47 (Pinces bois)', 'Spigot', 'Gants Chaleur', 'Domino', 'Scotch Aluminium',
        'J-Lar (Scotch Transparent)', 'Duvetine Noire', 'Cyc Tape', 'Spray Dulling (Matifiant)'
    ],
    [Department.MACHINERIE]: [
        'Gaffer Tape Fluo (Rose/Vert/Jaune/Orange)', 'Gaffer Tape Noir 50mm',
        'Sangle à cliquet', 'Cordelette Noire (Drisse)', 'Cordelette Blanche',
        'Tapis de sol', 'Wedges (Cales bois)', 'Pagnotte (Cales)', 'Ball de Tennis',
        'Chaîne de sécurité', 'Mousqueton', 'Poulie', 'Manille',
        'Duvetine', 'Borniol', 'Polyane (Bâche protection)', 'Couverture de son',
        'WD-40', 'Graisse Lithium', 'Nettoyant Freins'
    ],
    [Department.SON]: [
        'Piles AA Pro (Duracell/Varta)', 'Piles AAA Pro', 'Piles 9V',
        'Mousse Micro', 'Bonnette Anti-vent', 'Poils (Windjammer)',
        'Adhésif Double Face (Topstick)', 'Moleskin', 'Urgo (Pansements)',
        'Connecteurs XLR', 'Adaptateur Jack', 'Câble Micro',
        'Lingettes Désinfectantes', 'Sangle Velcro', 'Ceinture Émetteur'
    ],
    [Department.MAQUILLAGE]: [
        'Éponges Latex', 'Houpette', 'Coton Démaquillant', 'Lingettes Bébé', 'Kleenex',
        'Laque Cheveux', 'Gel Coiffant', 'Sang Artificiel', 'Latex Liquide',
        'Kleener (Nettoyant Pinceaux)', 'Alcool 70°', 'Cotons-tiges', 'Bâtonnets Biseautés',
        'Fond de teint', 'Poudre Matifiante', 'Colle à postiche (Spirit Gum)', 'Dissolvant',
        'Miroir Main', 'Serviettes Invité'
    ],
    [Department.COIFFURE]: [
        'Épingles à cheveux (Neige/Bronze/Noir)', 'Épingles à chignon', 'Pinces Kirby',
        'Laque Forte', 'Laque Souple', 'Shampoing Sec', 'Mousse Volume', 'Cire Coiffante',
        'Brosses Jetables', 'Peigne à queue', 'Élastiques (Transparents/Noirs)', 'Filet à cheveux',
        'Capes de coupe', 'Vaporisateur Eau'
    ],
    [Department.COSTUME]: [
        'Épingles de sûreté (Nourrice)', 'Épingles Tête Verre',
        'Cintres Métal', 'Cintres Bois', 'Cintres Pince',
        'Eau Déminéralisée', 'Brosse Adhésive', 'Recharges Brosse Adhésive',
        'Détachant Express (K2R)', 'Lingettes Anti-décoloration',
        'Semelles', 'Lacets', 'Talonnettes',
        'Fil à coudre (Noir/Blanc/Gris)', 'Boutons assortis', 'Ruban Mètre', 'Craie Tailleur',
        'Défroisseur Vapeur', 'Sacs Housse Costume'
    ],
    [Department.DECO]: [
        'Patafix (Blanche/Jaune)', 'Fil de fer', 'Fil Nylon',
        'Peinture Noire Mat', 'Peinture Blanche', 'Bombes Peinture (Divers)',
        'Vis à bois', 'Clous', 'Crochets X',
        'Scotch Double Face Moquette', 'Scotch Double Face Mousse', 'Scotch Masquage (Tesa)',
        'Carton Plume', 'Cutter', 'Lames Cutter', 'Tapis de découpe',
        'Colle à bois', 'Colle Néoprène', 'Colle Spray (3M 77)',
        'Papier de verre', 'Chiffons', 'White Spirit', 'Acétone'
    ],
    [Department.REGIE]: [
        'Gobelets Carton', 'Touillettes bois', 'Sucre (Morceaux/Poudre)', 'Café Moulu', 'Thé/Infusions',
        'Bouteilles Eau 50cl', 'Fontaine Eau',
        'Sacs Poubelle 100L', 'Sacs Poubelle 50L', 'Sacs Gravats',
        'Essuie-Tout', 'Papier Toilette', 'Mouchoirs',
        'Gel Hydroalcoolique', 'Savon Main', 'Liquide Vaisselle', 'Éponges',
        'Sacs Ziploc (Petit/Moyen/Grand)', 'Film Étirable', 'Papier Alu',
        'Cendriers', 'Balai', 'Pelle', 'Seau'
    ],
    [Department.ACCESSOIRE]: [
        'Briquet', 'Allumettes', 'Cendrier Portable',
        'Stylos Bic (Noir/Bleu)', 'Marqueurs Indélébiles', 'Surligneurs',
        'Carnet Notes', 'Bloc-notes', 'Post-it',
        'Colle Super Glue', 'Piles AAA', 'Piles AA',
        'Scotch Transparent', 'Scotch Emballage',
        'Ciseaux', 'Couteau Suisse', 'Lampe Torche', 'Frontale'
    ]
};

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Error Boundary Logic
try {
    // ... existing logic ...
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* ... existing JSX ... */}
            <div className="bg-cinema-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-cinema-600 flex flex-col relative">
                {/* ... */}
                {/* Header */}
                <div className="p-6 border-b border-cinema-700 flex justify-between items-center bg-cinema-900 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Plus className="h-6 w-6 text-eco-400" />
                        Nouvelle Commande
                    </h3>
                    {/* ... */}
                </div>
                {/* ... rest of the component ... */}
            </div>
        </div>
    );
} catch (renderError: any) {
    console.error("AddItemModal Render Error:", renderError);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-red-900/90 p-6 rounded-xl border border-red-500 max-w-md w-full">
                <h3 className="text-xl font-bold text-white mb-2">Erreur d'affichage</h3>
                <p className="text-red-200 mb-4">Une erreur est survenue lors de l'ouverture de la fenêtre.</p>
                <pre className="bg-black/50 p-3 rounded text-xs text-red-300 overflow-auto max-h-40 mb-4">
                    {renderError?.message || String(renderError)}
                </pre>
                <button
                    onClick={onClose}
                    className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded transition-colors"
                >
                    Fermer
                </button>
            </div>
        </div>
    );
}
};
