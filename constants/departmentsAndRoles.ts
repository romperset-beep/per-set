import { Department } from '../types';

export const DEPARTMENTS_AND_ROLES: Record<Department | 'PRODUCTION', string[]> = {
  [Department.CAMERA]: [
    'Directeur(trice) de la photographie',
    'Cadreur(euse)',
    '1er(e) Assistant(e) Caméra (Pointeur)',
    '2ème Assistant(e) Caméra',
    'Opérateur(trice) Steadicam / Drone',
    'Vidéo Assist',
    'Data Manager / DIT'
  ],
  [Department.LUMIERE]: [
    'Chef(fe) Électricien(ne)',
    'Sous-Chef(fe) Électricien(ne)',
    'Électricien(ne)',
    'Éclairagiste',
    'Pupitreur(euse)'
  ],
  [Department.MACHINERIE]: [
    'Chef(fe) Machiniste',
    'Sous-Chef(fe) Machiniste',
    'Machiniste',
    'Grutier(ère)'
  ],
  [Department.REGIE]: [
    'Régisseur(euse) Général(e)',
    'Régisseur(euse) Adjoint(e)',
    'Assistant(e) Régisseur(euse) (Auxiliaire)',
    'Régisseur(euse) Logistique',
    'Ventouseur(euse)',
    'Bloqueur(euse)',
    'Stagiaire Régie'
  ],
  [Department.DECO]: [
    'Chef(fe) Décorateur(trice)',
    '1er(e) Assistant(e) Décorateur(trice)',
    '2ème Assistant(e) Décorateur(trice)',
    'Ensemblier(ère)',
    'Régisseur(euse) d\'Extérieur',
    'Accessoiriste de meuble',
    'Rippeur(euse)',
    'Chef(fe) Constructeur(trice)',
    'Constructeur(trice)',
    'Menuisier(ère)',
    'Peintre',
    'Tapissier(ère)'
  ],
  [Department.MISE_EN_SCENE]: [
    'Réalisateur(trice)',
    '1er(e) Assistant(e) Réalisateur(trice)',
    '2ème Assistant(e) Réalisateur(trice)',
    '3ème Assistant(e) Réalisateur(trice)',
    'Scripte',
    'Directeur(trice) de casting',
    'Répétiteur(trice)',
    'Chorégraphe'
  ],
  [Department.SON]: [
    'Chef(fe) Opérateur(trice) du son',
    'Perchman / Assistant(e) son',
    'Bruitier(ère)',
    'Opérateur(trice) Playback'
  ],
  [Department.COSTUME]: [
    'Créateur(trice) de costumes / Chef(fe) Costumier(ère)',
    '1er(e) Assistant(e) Costumier(ère)',
    'Costumier(ère)',
    'Habilleur(euse)',
    'Couturier(ère)',
    'Patineur(euse)'
  ],
  [Department.MAQUILLAGE]: [
    'Chef(fe) Maquilleur(euse)',
    'Maquilleur(euse)',
    'Maquilleur(euse) SFX',
    'Assistant(e) Maquilleur(euse)'
  ],
  [Department.COIFFURE]: [
    'Chef(fe) Coiffeur(euse)',
    'Coiffeur(euse)',
    'Assistant(e) Coiffeur(euse)',
    'Perruquier(ère)'
  ],
  [Department.ACCESSOIRE]: [
    'Chef(fe) Accessoiriste',
    'Accessoiriste de plateau',
    'Accessoiriste de préparation'
  ],
  'PRODUCTION': [
    'Producteur(trice)',
    'Producteur(trice) Exécutif(ve)',
    'Directeur(trice) de production',
    'Administrateur(trice) de production',
    'Chargé(e) de production',
    'Secrétaire de production',
    'Comptable de production',
    'Assistant(e) de production',
    'Stagiaire de production'
  ]
};

/**
 * Helper to get roles for a specific department
 */
export const getRolesForDepartment = (department: Department | 'PRODUCTION' | string): string[] => {
  return DEPARTMENTS_AND_ROLES[department as Department | 'PRODUCTION'] || [];
};

/**
 * Flat list of all roles
 */
export const ALL_ROLES = Object.values(DEPARTMENTS_AND_ROLES).flat();
