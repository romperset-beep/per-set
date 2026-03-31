import { EcoprodCriterion } from "../types";

export const ECOPROD_CRITERIA_RAW = [
    // ─── A. PRODUCTION & ENGAGEMENT ───────────────────────────────────────────
    {
        "category": "A. Production & Engagement RSE",
        "criteria": [
            {
                "id": "A1",
                "label": "Avez-vous rédigé et diffusé une note d'intention RSE auprès de vos équipes ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "A2",
                "label": "Avez-vous désigné un référent RSE au sein de l'équipe de production ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "A3",
                "label": "Avez-vous inclus une clause RSE dans les contrats avec vos prestataires et partenaires ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "A4",
                "label": "Avez-vous réalisé un bilan carbone prévisionnel et définitif du projet ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "A5",
                "label": "Avez-vous mis en place une démarche d'amélioration continue RSE sur l'ensemble des projets de la société ?",
                "impact": "High",
                "level": 1
            }
        ]
    },
    // ─── C. ÉDITORIAL ─────────────────────────────────────────────────────────
    {
        "category": "C. Éditorial & Éco-réalisation",
        "criteria": [
            {
                "id": "C1",
                "label": "Avez-vous réalisé une lecture environnementale du scénario pour identifier les points de vigilance ?",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "C2",
                "label": "Avez-vous mis en place des mesures d'éco-réalisation lors du tournage (éviter destructions, limiter effets polluants) ?",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "C3",
                "label": "Avez-vous sensibilisé le réalisateur et l'équipe artistique aux enjeux environnementaux liés au contenu créatif ?",
                "impact": "Low",
                "level": 3
            }
        ]
    },
    // ─── E. LIEUX DE TOURNAGE ─────────────────────────────────────────────────
    {
        "category": "E. Lieux de Tournage",
        "criteria": [
            {
                "id": "E1",
                "label": "Avez-vous privilégié des lieux de tournage accessibles et limitant les déplacements motorisés ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "E2",
                "label": "Avez-vous mis en place des mesures de protection des milieux naturels sur les lieux de tournage en extérieur ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "E3",
                "label": "Avez-vous informé les équipes des règles de préservation des espaces naturels utilisés ?",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "E4",
                "label": "Avez-vous remis en état les lieux naturels utilisés après le tournage ?",
                "impact": "High",
                "level": 1
            }
        ]
    },
    // ─── H. DÉPLACEMENTS ──────────────────────────────────────────────────────
    {
        "category": "H. Déplacements & Mobilité",
        "criteria": [
            {
                "id": "H1",
                "label": "Avez-vous établi un plan de mobilité pour réduire les émissions de GES liées aux déplacements ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "H2",
                "label": "Avez-vous favorisé le covoiturage ou les transports collectifs pour les déplacements de l'équipe ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "H3",
                "label": "Avez-vous utilisé des véhicules à faibles émissions (électrique, hybride, hydrogène) pour les transports de production ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "H4",
                "label": "Avez-vous évité ou compensé les déplacements en avion lorsqu'une alternative ferroviaire existait ?",
                "impact": "High",
                "level": 1
            },
            {
                "id": "H5",
                "label": "Avez-vous calculé et suivi les émissions CO2 liées aux déplacements de la production ?",
                "impact": "Medium",
                "level": 2
            }
        ]
    },

    {
        "category": "Gouvernance RSE",
        "criteria": [
            {
                "id": "1_1",
                "label": "Rédiger une note d'intention RSE de la production et la diffuser",
                "impact": "High",
                "level": 1
            },
            {
                "id": "1_2",
                "label": "Élaborer la stratégie RSE du projet",
                "impact": "High",
                "level": 1
            },
            {
                "id": "1_3",
                "label": "Réaliser l'empreinte carbone prévisionnelle et définitive du projet",
                "impact": "High",
                "level": 1
            },
            {
                "id": "1_4",
                "label": "Identifier une ou des personne(s) ressource(s)",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "1_5",
                "label": "Évaluer l'empreinte carbone prévisionnelle et définitive du projet axée sur des mesures physiques",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "1_6",
                "label": "Engager une démarche d'amélioration continue sur l'ensemble des projets de nature comparable de la société de production",
                "impact": "High",
                "level": 1
            },
            {
                "id": "1_7",
                "label": "Établir la stratégie bas carbone de la société de production en intégrant les empreintes carbone de l'ensemble des projets de nature comparable",
                "impact": "High",
                "level": 1
            }
        ]
    },
    {
        "category": "Énergie et mobilité",
        "criteria": [
            {
                "id": "2_1",
                "label": "Établir un plan de mobilité",
                "impact": "High",
                "level": 1
            },
            {
                "id": "2_2",
                "label": "Établir un plan énergétique",
                "impact": "High",
                "level": 1
            },
            {
                "id": "2_3",
                "label": "Réduire les émissions de gaz à effet de serre de la mobilité",
                "impact": "High",
                "level": 1
            },
            {
                "id": "2_4",
                "label": "Utiliser des solutions d'énergie bas carbone plutôt que des énergies fossiles",
                "impact": "High",
                "level": 1
            }
        ]
    },
    {
        "category": "Achats responsables, alimentation et gestion des déchets",
        "criteria": [
            {
                "id": "3_1",
                "label": "Réduire la part des « repas carnés » dans l'alimentation",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "3_2",
                "label": "Identifier, réduire et recycler les déchets produits",
                "impact": "High",
                "level": 1
            },
            {
                "id": "3_3",
                "label": "Choisir des prestataires et fournisseurs dits responsables",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "3_4",
                "label": "Privilégier l'achat de consommables et de ressources à moindre impact environnemental",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "3_5",
                "label": "Réemployer les éléments ayant servi au projet",
                "impact": "Medium",
                "level": 2
            }
        ]
    },
    {
        "category": "Sobriété numérique",
        "criteria": [
            {
                "id": "4_1",
                "label": "Identifier les impacts numériques du projet",
                "impact": "High",
                "level": 1
            },
            {
                "id": "4_2",
                "label": "Adopter une gestion raisonnée des équipements techniques afin d'en réduire l'impact",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "4_3",
                "label": "Limiter la production de données numériques",
                "impact": "Medium",
                "level": 2
            }
        ]
    },
    {
        "category": "Biodiversité et bien-être animal",
        "criteria": [
            {
                "id": "5_1",
                "label": "Mettre en place une démarche de sensibilisation et identifier les points de vigilance en matière de biodiversité, et de bien-être animal si applicable, issus du dépouillement du scénario",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "5_2",
                "label": "Mettre en place un plan d'actions visant à limiter les impacts négatifs de la production sur la biodiversité, et le bien-être animal si applicable",
                "impact": "Medium",
                "level": 2
            }
        ]
    },
    {
        "category": "Inclusion, parité, et qualité de vie au travail",
        "criteria": [
            {
                "id": "6_1",
                "label": "Mettre en place une démarche de sensibilisation en matière de recrutement inclusif",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "6_2",
                "label": "Mesurer le taux de parité dans l'équipe technique et de l'équipe encadrante",
                "impact": "Low",
                "level": 3
            },
            {
                "id": "6_3",
                "label": "Solliciter les réseaux concernés en matière de recrutement inclusif",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "6_4",
                "label": "Constituer une équipe technique paritaire et/ou une équipe encadrante paritaire (atteindre un minimum de 40% de femmes)",
                "impact": "Medium",
                "level": 2
            },
            {
                "id": "6_5",
                "label": "Intégrer au plan de travail les enjeux de la QVT",
                "impact": "Medium",
                "level": 2
            }
        ]
    },
    {
        "category": "Formation et sensibilisation",
        "criteria": [
            {
                "id": "7_1",
                "label": "Recenser les personnes sensibilisées/formées et informer les équipes sur les offres disponibles",
                "impact": "Low",
                "level": 3
            },
            {
                "id": "7_2",
                "label": "Avoir au moins 50% des équipes sensibilisées et au moins 10% des responsables de département et/ou des équipes de production formés",
                "impact": "Medium",
                "level": 2
            }
        ]
    }
];

// Flatten for easy usage
export const ECOPROD_CRITERIA: EcoprodCriterion[] = ECOPROD_CRITERIA_RAW.flatMap(category =>
    category.criteria.map(c => ({
        ...c,
        category: category.category,
        impact: c.impact as 'High' | 'Medium' | 'Low',
        level: (c as any).level as 1 | 2 | 3
    }))
);
