import { Department } from '../../types';

// Catalogue de consommables par département
export const CONSUMABLES_CATALOG: Record<string, string[]> = {
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

// Noms d'affichage des départements
export const DEPARTMENT_DISPLAY_NAMES: Record<string, string> = {
    [Department.CAMERA]: 'Caméra',
    [Department.LUMIERE]: 'Lumière',
    [Department.MACHINERIE]: 'Machinerie',
    [Department.SON]: 'Son',
    [Department.MAQUILLAGE]: 'Maquillage',
    [Department.COIFFURE]: 'Coiffure',
    [Department.COSTUME]: 'Costume',
    [Department.DECO]: 'Décoration',
    [Department.REGIE]: 'Régie',
    [Department.ACCESSOIRE]: 'Accessoires'
};
