# NOTICE DESCRIPTIVE TECHNIQUE - A BETTER SET

## 1. IDENTIFICATION DU LOGICIEL
*   **Nom du logiciel** : A Better Set
*   **Type** : Application Web de gestion de production audiovisuelle (SaaS)
*   **Date de la présente version** : 20 décembre 2025
*   **Auteur** : Romain Perset

## 2. FONCTIONNALITÉS PRINCIPALES (PÉRIMÈTRE DÉPOSÉ)
L'application permet la gestion centralisée d'une production de film ou série, incluant :
*   **Gestion des Ressources Humaines** :
    *   Signature électronique des feuilles d'heures (RH).
    *   Gestion des renforts et des plannings.
*   **Gestion Logistique et Matériel** :
    *   Suivi des aller-retours matériel.
    *   Gestion des stocks et des consommables.
*   **Place de Marché Inter-Production (Reventes)** :
    *   Système de mise en vente de surplus (restes) entre productions.
    *   Workflow de validation des transactions (Vente/Achat).
    *   Génération automatique de factures PDF.
*   **Gestion Financière** :
    *   Suivi des dépenses et notes de frais.
    *   Exportation des données comptables (CSV).

## 3. ARCHITECTURE TECHNIQUE
### 3.1. Stack Technologique (Frontend)
Le logiciel est une Single Page Application (SPA) développée avec :
*   **Langage** : TypeScript (v5.8+) / JavaScript
*   **Framework UI** : React (v19.2+)
*   **Build Tool** : Vite (v6.2+)
*   **Gestion d'état & Logique** : Hooks React personnalisés
*   **Styles** : Tailwind CSS (via index.css et classes utilitaires)

### 3.2. Bibliothèques Clés
*   `firebase` : Communication avec le Backend (Auth, Firestore, Storage).
*   `jspdf` / `html2canvas` : Génération de documents PDF (factures, rapports).
*   `recharts` : Visualisation de données (Widget statistiques).
*   `lucide-react` : Bibliothèque d'icônes vectorielles.
*   `i18next` : Gestion de l'internationalisation (Français/Anglais).

### 3.3. Backend & Hébergement (Services Tiers)
Le logiciel s'appuie sur l'infrastructure **BaaS (Backend-as-a-Service) Google Firebase** :
*   **Authentication** : Gestion des utilisateurs et des rôles.
*   **Firestore** : Base de données NoSQL temps réel (Collections: `users`, `projects`, `productions`, `transactions`).
*   **Storage** : Stockage des fichiers (PDFs, images).

## 4. STRUCTURE DU CODE SOURCE (ARBORESCENCE SIMPLIFIÉE)
L'archive jointe contient l'intégralité du code source structuré comme suit :
*   `/src` ou `/` (root) : Code source principal.
    *   `/components` : Composants React réutilisables (UI) et vues principales (AdminDashboard, LogisticsWidget...).
    *   `/context` : Gestionnaire de contexte global (ex: Traductions).
    *   `/data` : Données statiques et configurations (ex: critères EcoProd).
    *   `/services` : Logique métier et connecteurs API (pdfService, etc.).
    *   `/utils` : Fonctions utilitaires (formattage, calculs).
    *   `/scripts` : Scripts de maintenance et tests autonomes.
*   `App.tsx` : Point d'entrée de l'application et routeur.
*   `types.ts` : Définitions des types TypeScript (Modèle de données).

## 5. INSTRUCTIONS DE COMPILATION / DÉPLOIEMENT
Pour reconstruire l'application depuis les sources :
1.  Installer les dépendances : `npm install`
2.  Lancer en développement : `npm run dev`
3.  Compiler pour la production : `npm run build` (génère le dossier `/dist`)

---
*Document généré le 20/12/2025 pour servir de notice technique dans le cadre d'un dépôt légal.*
