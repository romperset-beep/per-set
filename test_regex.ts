import { analyzePDTText } from './services/pdtAnalysis.js';

const sampleText = `
FEUILLE DE SERVICE DU MARDI 24 MARS 2026
J2 / 18
HORAIRES : 15H00 - 24H00

Prép décors + Repas en équipe réduite
`;

const result = analyzePDTText(sampleText);
console.log(JSON.stringify(result, null, 2));
