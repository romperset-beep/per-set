import { EcoprodCriterion } from "../types";

export const ECOPROD_CRITERIA_RAW = [
    {
        "category": "Gouvernance RSE",
        "criteria": [
            {
                "id": "1_1",
                "label": "Rédiger une note d'intention RSE de la production et la diffuser",
                "impact": "High"
            },
            {
                "id": "1_2",
                "label": "Élaborer la stratégie RSE du projet",
                "impact": "High"
            },
            {
                "id": "1_3",
                "label": "Réaliser l'empreinte carbone prévisionnelle et définitive du projet",
                "impact": "High"
            },
            {
                "id": "1_4",
                "label": "Identifier une ou des personne(s) ressource(s)",
                "impact": "Medium"
            },
            {
                "id": "1_5",
                "label": "Évaluer l'empreinte carbone prévisionnelle et définitive du projet axée sur des mesures physiques",
                "impact": "Medium"
            },
            {
                "id": "1_6",
                "label": "Engager une démarche d'amélioration continue sur l'ensemble des projets de nature comparable de la société de production",
                "impact": "High"
            },
            {
                "id": "1_7",
                "label": "Établir la stratégie bas carbone de la société de production en intégrant les empreintes carbone de l'ensemble des projets de nature comparable",
                "impact": "High"
            }
        ]
    },
    {
        "category": "Énergie et mobilité",
        "criteria": [
            {
                "id": "2_1",
                "label": "Établir un plan de mobilité",
                "impact": "High"
            },
            {
                "id": "2_2",
                "label": "Établir un plan énergétique",
                "impact": "High"
            },
            {
                "id": "2_3",
                "label": "Réduire les émissions de gaz à effet de serre de la mobilité",
                "impact": "High"
            },
            {
                "id": "2_4",
                "label": "Utiliser des solutions d'énergie bas carbone plutôt que des énergies fossiles",
                "impact": "High"
            }
        ]
    },
    {
        "category": "Achats responsables, alimentation et gestion des déchets",
        "criteria": [
            {
                "id": "3_1",
                "label": "Réduire la part des « repas carnés » dans l'alimentation",
                "impact": "Medium"
            },
            {
                "id": "3_2",
                "label": "Identifier, réduire et recycler les déchets produits",
                "impact": "High"
            },
            {
                "id": "3_3",
                "label": "Choisir des prestataires et fournisseurs dits responsables",
                "impact": "Medium"
            },
            {
                "id": "3_4",
                "label": "Privilégier l'achat de consommables et de ressources à moindre impact environnemental",
                "impact": "Medium"
            },
            {
                "id": "3_5",
                "label": "Réemployer les éléments ayant servi au projet",
                "impact": "Medium"
            }
        ]
    },
    {
        "category": "Sobriété numérique",
        "criteria": [
            {
                "id": "4_1",
                "label": "Identifier les impacts numériques du projet",
                "impact": "High"
            },
            {
                "id": "4_2",
                "label": "Adopter une gestion raisonnée des équipements techniques afin d'en réduire l'impact",
                "impact": "Medium"
            },
            {
                "id": "4_3",
                "label": "Limiter la production de données numériques",
                "impact": "Medium"
            }
        ]
    },
    {
        "category": "Biodiversité et bien-être animal",
        "criteria": [
            {
                "id": "5_1",
                "label": "Mettre en place une démarche de sensibilisation et identifier les points de vigilance en matière de biodiversité, et de bien-être animal si applicable, issus du dépouillement du scénario",
                "impact": "Medium"
            },
            {
                "id": "5_2",
                "label": "Mettre en place un plan d'actions visant à limiter les impacts négatifs de la production sur la biodiversité, et le bien-être animal si applicable",
                "impact": "Medium"
            }
        ]
    },
    {
        "category": "Inclusion, parité, et qualité de vie au travail",
        "criteria": [
            {
                "id": "6_1",
                "label": "Mettre en place une démarche de sensibilisation en matière de recrutement inclusif",
                "impact": "Medium"
            },
            {
                "id": "6_2",
                "label": "Mesurer le taux de parité dans l'équipe technique et de l'équipe encadrante",
                "impact": "Low"
            },
            {
                "id": "6_3",
                "label": "Solliciter les réseaux concernés en matière de recrutement inclusif",
                "impact": "Medium"
            },
            {
                "id": "6_4",
                "label": "Constituer une équipe technique paritaire et/ou une équipe encadrante paritaire (atteindre un minimum de 40% de femmes)",
                "impact": "Medium"
            },
            {
                "id": "6_5",
                "label": "Intégrer au plan de travail les enjeux de la QVT",
                "impact": "Medium"
            }
        ]
    },
    {
        "category": "Formation et sensibilisation",
        "criteria": [
            {
                "id": "7_1",
                "label": "Recenser les personnes sensibilisées/formées et informer les équipes sur les offres disponibles",
                "impact": "Low"
            },
            {
                "id": "7_2",
                "label": "Avoir au moins 50% des équipes sensibilisées et au moins 10% des responsables de département et/ou des équipes de production formés",
                "impact": "Medium"
            }
        ]
    }
];

// Flatten for easy usage
export const ECOPROD_CRITERIA: EcoprodCriterion[] = ECOPROD_CRITERIA_RAW.flatMap(category =>
    category.criteria.map(c => ({
        ...c,
        category: category.category,
        impact: c.impact as 'High' | 'Medium' | 'Low'
    }))
);
