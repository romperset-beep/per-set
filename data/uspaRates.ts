import { Department } from '../types';

export interface JobDefinition {
    id: string;
    title: string;
    category: 'B' | 'C'; // Cadre / Technicien (Mapped from status, typically B=Cadre, C=Tech for simplicity, but here using Convention logic)
    level?: string;
    department: Department | 'PRODUCTION' | 'REGIE' | 'IMAGE' | 'COSTUME' | 'DECOR' | 'SON' | 'HMC' | 'POST_PRODUCTION' | 'AUTRE';
    rates: {
        s35: number;
        s39: number;
        s7: number;
        s8: number;
    };
}

export const USPA_JOBS: JobDefinition[] = [
    {
        id: '1er_assistant_d_corateur',
        title: "1er assistant décorateur",
        category: 'B',
        level: 'IIIA',
        department: 'DECOR' as any,
        rates: {
            s35: 983.67,
            s39: 1124.19,
            s7: 218.59,
            s8: 249.82
        }
    },
    {
        id: '1er_assistant_d_corateur_sp_cialis',
        title: "1er assistant décorateur spécialisé*",
        category: 'B',
        level: 'IIIA',
        department: 'DECOR' as any,
        rates: {
            s35: 1166.03,
            s39: 1332.6,
            s7: 259.12,
            s8: 296.13
        }
    },
    {
        id: '1er_assistant_opv_pointeur',
        title: "1er assistant OPV / pointeur",
        category: 'B',
        level: 'IIIA',
        department: 'IMAGE' as any,
        rates: {
            s35: 989.63,
            s39: 1131,
            s7: 219.92,
            s8: 251.33
        }
    },
    {
        id: '1er_assistant_opv_pointeur_sp_cialis',
        title: "1er assistant OPV / pointeur spécialisé*",
        category: 'B',
        level: 'IIIA',
        department: 'IMAGE' as any,
        rates: {
            s35: 1134.43,
            s39: 1296.5,
            s7: 252.1,
            s8: 288.11
        }
    },
    {
        id: '1er_assistant_r_alisateur',
        title: "1er assistant réalisateur",
        category: 'B',
        level: '||',
        department: 'REALISATION' as any,
        rates: {
            s35: 983.67,
            s39: 1124.19,
            s7: 218.59,
            s8: 249.82
        }
    },
    {
        id: '1er_assistant_r_alisateur_sp_cialis',
        title: "1er assistant réalisateur spécialisé*",
        category: 'B',
        level: '||',
        department: 'REALISATION' as any,
        rates: {
            s35: 1201.13,
            s39: 1372.72,
            s7: 266.92,
            s8: 305.05
        }
    },
    {
        id: '2_me_assistant_d_corateur',
        title: "2ème assistant décorateur",
        category: 'B',
        level: 'IIIB',
        department: 'DECOR' as any,
        rates: {
            s35: 857.51,
            s39: 980.02,
            s7: 190.56,
            s8: 217.78
        }
    },
    {
        id: '2_me_assistant_d_corateur_sp_cialis',
        title: "2ème assistant décorateur spécialisé*",
        category: 'B',
        level: 'IIIB',
        department: 'DECOR' as any,
        rates: {
            s35: 1113.41,
            s39: 1272.46,
            s7: 247.42,
            s8: 282.77
        }
    },
    {
        id: '2_me_assistant_opv',
        title: "2ème assistant OPV",
        category: 'C',
        level: 'V',
        department: 'IMAGE' as any,
        rates: {
            s35: 730.03,
            s39: 834.32,
            s7: 162.23,
            s8: 185.4
        }
    },
    {
        id: '2_me_assistant_opv_sp_cialis',
        title: "2ème assistant OPV spécialisé*",
        category: 'C',
        level: 'V',
        department: 'IMAGE' as any,
        rates: {
            s35: 922.46,
            s39: 1054.24,
            s7: 204.99,
            s8: 234.27
        }
    },
    {
        id: '2_me_assistant_r_alisateur',
        title: "2ème assistant réalisateur",
        category: 'B',
        level: 'IV',
        department: 'REALISATION' as any,
        rates: {
            s35: 822.64,
            s39: 940.16,
            s7: 182.81,
            s8: 208.92
        }
    },
    {
        id: '2_me_assistant_r_alisateur_sp_cialis',
        title: "2ème assistant réalisateur spécialisé*",
        category: 'B',
        level: 'IV',
        department: 'REALISATION' as any,
        rates: {
            s35: 922.46,
            s39: 1054.24,
            s7: 204.99,
            s8: 234.27
        }
    },
    {
        id: 'accessoiriste',
        title: "Accessoiriste",
        category: 'B',
        level: 'IIIB',
        department: 'DECOR' as any,
        rates: {
            s35: 828.64,
            s39: 947.02,
            s7: 184.14,
            s8: 210.45
        }
    },
    {
        id: 'accessoiriste_sp_cialis',
        title: "Accessoiriste spécialisé*",
        category: 'B',
        level: 'IIIB',
        department: 'DECOR' as any,
        rates: {
            s35: 1105.26,
            s39: 1263.16,
            s7: 245.61,
            s8: 280.7
        }
    },
    {
        id: 'administrateur_de_production',
        title: "Administrateur de production",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 896.74,
            s39: 1024.85,
            s7: 199.28,
            s8: 227.74
        }
    },
    {
        id: 'administrateur_de_production_sp_cialis',
        title: "Administrateur de production spécialisé*",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 1138.62,
            s39: 1301.28,
            s7: 253.03,
            s8: 289.17
        }
    },
    {
        id: 'aide_de_plateau',
        title: "Aide de plateau",
        category: 'C',
        level: 'VI',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'animatronicien',
        title: "Animatronicien",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 584.05,
            s39: 650.79,
            s7: 116.81,
            s8: 133.5
        }
    },
    {
        id: 'assistant_d_mission_17',
        title: "Assistant d'émission (17)",
        category: 'C',
        level: 'VI',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'assistant_de_post_production',
        title: "Assistant de post-production",
        category: 'C',
        level: 'IV',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 639.82,
            s39: 731.22,
            s7: 142.18,
            s8: 162.49
        }
    },
    {
        id: 'assistant_de_production',
        title: "Assistant de production",
        category: 'C',
        level: 'IV',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 730.03,
            s39: 834.32,
            s7: 162.23,
            s8: 185.4
        }
    },
    {
        id: 'assistant_de_production_adjoint_15',
        title: "Assistant de production adjoint (15)",
        category: 'C',
        level: 'VI',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 473.48,
            s39: 541.12,
            s7: 105.22,
            s8: 120.25
        }
    },
    {
        id: 'assistant_de_production_sp_cialis',
        title: "Assistant de production spécialisé*",
        category: 'C',
        level: 'IV',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 922.46,
            s39: 1054.24,
            s7: 204.99,
            s8: 234.27
        }
    },
    {
        id: 'assistant_d_corateur_adjoint_4',
        title: "Assistant décorateur adjoint (4)",
        category: 'C',
        level: 'VI',
        department: 'DECOR' as any,
        rates: {
            s35: 473.48,
            s39: 541.12,
            s7: 105.22,
            s8: 120.25
        }
    },
    {
        id: 'assistant_lumi_re',
        title: "Assistant lumière",
        category: 'C',
        level: 'IV',
        department: 'IMAGE' as any,
        rates: {
            s35: 781.75,
            s39: 893.43,
            s7: 173.72,
            s8: 198.54
        }
    },
    {
        id: 'assistant_lumi_re_sp_cialis',
        title: "Assistant lumière spécialisé*",
        category: 'C',
        level: 'IV',
        department: 'IMAGE' as any,
        rates: {
            s35: 1016.26,
            s39: 1161.44,
            s7: 225.84,
            s8: 258.1
        }
    },
    {
        id: 'assistant_monteur',
        title: "Assistant monteur",
        category: 'C',
        level: 'IV',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 730.03,
            s39: 834.32,
            s7: 162.23,
            s8: 185.4
        }
    },
    {
        id: 'assistant_monteur_adjoint_13',
        title: "Assistant monteur adjoint (13)",
        category: 'C',
        level: 'VI',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 473.48,
            s39: 541.12,
            s7: 105.22,
            s8: 120.25
        }
    },
    {
        id: 'assistant_monteur_sp_cialis',
        title: "Assistant monteur spécialisé*",
        category: 'C',
        level: 'IV',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 922.46,
            s39: 1054.24,
            s7: 204.99,
            s8: 234.27
        }
    },
    {
        id: 'assistant_opv_adjoint_11',
        title: "Assistant OPV adjoint (11)",
        category: 'C',
        level: 'VI',
        department: 'IMAGE' as any,
        rates: {
            s35: 473.48,
            s39: 541.12,
            s7: 105.22,
            s8: 120.25
        }
    },
    {
        id: 'assistant_r_alisateur_18',
        title: "Assistant réalisateur (18)",
        category: 'B',
        level: 'IIIB',
        department: 'REALISATION' as any,
        rates: {
            s35: 514.51,
            s39: 573.32,
            s7: 102.9,
            s8: 117.6
        }
    },
    {
        id: 'assistant_r_alisateur_adjoint_19',
        title: "Assistant réalisateur adjoint (19)",
        category: 'B',
        level: 'VI',
        department: 'REALISATION' as any,
        rates: {
            s35: 473.48,
            s39: 541.12,
            s7: 105.22,
            s8: 120.25
        }
    },
    {
        id: 'assistant_r_gisseur_adjoint_16',
        title: "Assistant régisseur adjoint (16)",
        category: 'C',
        level: 'VI',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 473.48,
            s39: 541.12,
            s7: 105.22,
            s8: 120.25
        }
    },
    {
        id: 'assistant_scripte_adjoint_20',
        title: "Assistant scripte adjoint (20)",
        category: 'C',
        level: 'VI',
        department: 'REALISATION' as any,
        rates: {
            s35: 473.48,
            s39: 541.12,
            s7: 105.22,
            s8: 120.25
        }
    },
    {
        id: 'assistant_son',
        title: "Assistant son",
        category: 'C',
        level: 'IV',
        department: 'SON' as any,
        rates: {
            s35: 730.03,
            s39: 834.32,
            s7: 162.23,
            s8: 185.4
        }
    },
    {
        id: 'assistant_son_adjoint_23',
        title: "Assistant son adjoint (23)",
        category: 'C',
        level: 'VI',
        department: 'SON' as any,
        rates: {
            s35: 473.48,
            s39: 541.12,
            s7: 105.22,
            s8: 120.25
        }
    },
    {
        id: 'blocker_rigger_12',
        title: "Blocker / Rigger (12)",
        category: 'C',
        level: 'IV',
        department: 'PLATEAU' as any,
        rates: {
            s35: 893.08,
            s39: 1020.67,
            s7: 198.46,
            s8: 226.81
        }
    },
    {
        id: 'bruiteur',
        title: "Bruiteur",
        category: 'B',
        level: 'IIIA',
        department: 'SON' as any,
        rates: {
            s35: 1074.18,
            s39: 1227.64,
            s7: 238.71,
            s8: 272.81
        }
    },
    {
        id: 'cadreur_opv_10',
        title: "Cadreur / OPV (10)",
        category: 'B',
        level: 'IIIA',
        department: 'IMAGE' as any,
        rates: {
            s35: 1136.29,
            s39: 1298.62,
            s7: 252.51,
            s8: 288.58
        }
    },
    {
        id: 'cadreur_opv_10_sp_cialis',
        title: "Cadreur / OPV (10) spécialisé*",
        category: 'B',
        level: 'IIIA',
        department: 'IMAGE' as any,
        rates: {
            s35: 1426.42,
            s39: 1630.19,
            s7: 316.98,
            s8: 362.27
        }
    },
    {
        id: 'charg_d_enqu_te_de_recherche',
        title: "Chargé d'enquête / de recherche",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 584.05,
            s39: 650.79,
            s7: 116.81,
            s8: 133.5
        }
    },
    {
        id: 'charg_de_post_production',
        title: "Chargé de post-production",
        category: 'B',
        level: 'IIIA',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 1074.18,
            s39: 1227.64,
            s7: 238.71,
            s8: 272.81
        }
    },
    {
        id: 'charg_de_production_14',
        title: "Chargé de production (14)",
        category: 'B',
        level: '||',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 983.67,
            s39: 1124.19,
            s7: 218.59,
            s8: 249.82
        }
    },
    {
        id: 'charg_de_recherche',
        title: "Chargé de recherche",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 820.74,
            s39: 937.99,
            s7: 182.39,
            s8: 208.44
        }
    },
    {
        id: 'charg_de_s_lection',
        title: "Chargé de sélection",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 840.77,
            s39: 960.88,
            s7: 186.84,
            s8: 213.53
        }
    },
    {
        id: 'chauffeur',
        title: "Chauffeur",
        category: 'C',
        level: 'VI',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 493.09,
            s39: 563.54,
            s7: 109.58,
            s8: 125.23
        }
    },
    {
        id: 'chauffeur_de_salle',
        title: "Chauffeur de salle",
        category: 'B',
        level: 'IIIB',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'chef_constructeur',
        title: "Chef constructeur",
        category: 'B',
        level: 'IIIA',
        department: 'DECOR' as any,
        rates: {
            s35: 1233.96,
            s39: 1410.24,
            s7: 274.21,
            s8: 313.39
        }
    },
    {
        id: 'chef_costumier',
        title: "Chef costumier",
        category: 'B',
        level: 'IIIA',
        department: 'COSTUME' as any,
        rates: {
            s35: 914.05,
            s39: 1044.62,
            s7: 203.12,
            s8: 232.14
        }
    },
    {
        id: 'chef_costumier_sp_cialis',
        title: "Chef costumier spécialisé*",
        category: 'B',
        level: 'IIIA',
        department: 'COSTUME' as any,
        rates: {
            s35: 1124.37,
            s39: 1285,
            s7: 249.86,
            s8: 285.56
        }
    },
    {
        id: 'chef_d_quipe_de_d_cor',
        title: "Chef d'équipe de décor",
        category: 'B',
        level: 'IV',
        department: 'DECOR' as any,
        rates: {
            s35: 1125.19,
            s39: 1285.93,
            s7: 250.04,
            s8: 285.76
        }
    },
    {
        id: 'chef_d_corateur',
        title: "Chef décorateur",
        category: 'B',
        level: '||',
        department: 'DECOR' as any,
        rates: {
            s35: 1681.13,
            s39: 1921.29,
            s7: 373.58,
            s8: 426.95
        }
    },
    {
        id: 'chef_d_corateur_sp_cialis',
        title: "Chef décorateur spécialisé*",
        category: 'B',
        level: '2241,51 €',
        department: 'DECOR' as any,
        rates: {
            s35: 2561.72,
            s39: 498.11,
            s7: 569.27,
            s8: 8517.73
        }
    },
    {
        id: 'chef_lectricien',
        title: "Chef électricien",
        category: 'B',
        level: 'IIIB',
        department: 'PLATEAU' as any,
        rates: {
            s35: 1011.45,
            s39: 1155.94,
            s7: 224.77,
            s8: 256.88
        }
    },
    {
        id: 'chef_machiniste',
        title: "Chef machiniste",
        category: 'B',
        level: 'IIIB',
        department: 'PLATEAU' as any,
        rates: {
            s35: 1011.45,
            s39: 1155.94,
            s7: 224.77,
            s8: 256.88
        }
    },
    {
        id: 'chef_maquilleur',
        title: "Chef maquilleur",
        category: 'B',
        level: 'IIIA',
        department: 'HMC' as any,
        rates: {
            s35: 903.89,
            s39: 1033.02,
            s7: 200.86,
            s8: 229.56
        }
    },
    {
        id: 'chef_maquilleur_sp_cialis',
        title: "Chef maquilleur spécialisé*",
        category: 'B',
        level: 'IIIA',
        department: 'HMC' as any,
        rates: {
            s35: 1121.6,
            s39: 1281.82,
            s7: 249.24,
            s8: 284.85
        }
    },
    {
        id: 'chef_monteur',
        title: "Chef monteur",
        category: 'B',
        level: 'IIIA',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 1138.62,
            s39: 1301.28,
            s7: 253.03,
            s8: 289.17
        }
    },
    {
        id: 'chef_monteur_sp_cialis',
        title: "Chef monteur spécialisé*",
        category: 'B',
        level: 'IIIA',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 1261.13,
            s39: 1441.29,
            s7: 280.25,
            s8: 320.29
        }
    },
    {
        id: 'chef_ops_ing_nieur_du_son',
        title: "Chef OPS / Ingénieur du son",
        category: 'B',
        level: 'IIIA',
        department: 'SON' as any,
        rates: {
            s35: 1224.91,
            s39: 1399.89,
            s7: 272.2,
            s8: 311.09
        }
    },
    {
        id: 'chef_ops_ing_nieur_du_son_sp_cialis',
        title: "Chef OPS / Ingénieur du son spécialisé*",
        category: 'B',
        level: 'IIIA',
        department: 'SON' as any,
        rates: {
            s35: 1578.11,
            s39: 1803.55,
            s7: 350.69,
            s8: 400.79
        }
    },
    {
        id: 'coiffeur',
        title: "Coiffeur",
        category: 'C',
        level: 'V',
        department: 'HMC' as any,
        rates: {
            s35: 730.03,
            s39: 834.32,
            s7: 162,
            s8: 0
        }
    },
    {
        id: 'coiffeur_perruquier',
        title: "Coiffeur perruquier",
        category: 'C',
        level: 'IV',
        department: 'HMC' as any,
        rates: {
            s35: 458.89,
            s39: 511.34,
            s7: 91.78,
            s8: 104.89
        }
    },
    {
        id: 'collaborateur_artistique',
        title: "Collaborateur artistique",
        category: 'C',
        level: 'IV',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'collaborateur_de_s_lection',
        title: "Collaborateur de sélection",
        category: 'C',
        level: 'IV',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 472.8,
            s39: 526.83,
            s7: 94.56,
            s8: 108.07
        }
    },
    {
        id: 'comptable_de_production',
        title: "Comptable de production",
        category: 'C',
        level: 'IV',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'conducteur_de_groupe',
        title: "Conducteur de groupe",
        category: 'C',
        level: 'IV',
        department: 'PLATEAU' as any,
        rates: {
            s35: 458.89,
            s39: 511.34,
            s7: 91.78,
            s8: 104.89
        }
    },
    {
        id: 'conformateur',
        title: "Conformateur",
        category: 'B',
        level: 'IIIB',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'conseiller_artistique_d_mission_2',
        title: "Conseiller artistique d'émission (2)",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 597.81,
            s39: 666.13,
            s7: 119.56,
            s8: 136.64
        }
    },
    {
        id: 'constructeur_de_d_cor',
        title: "Constructeur de décor",
        category: 'C',
        level: 'IV',
        department: 'DECOR' as any,
        rates: {
            s35: 572.59,
            s39: 638.03,
            s7: 114.52,
            s8: 130.88
        }
    },
    {
        id: 'coordinateur_d_mission',
        title: "Coordinateur d'émission",
        category: 'B',
        level: 'IIIB',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 495.65,
            s39: 552.3,
            s7: 99.13,
            s8: 113.29
        }
    },
    {
        id: 'costumier',
        title: "Costumier",
        category: 'C',
        level: 'IV',
        department: 'COSTUME' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'dessinateur_en_d_cor',
        title: "Dessinateur en décor",
        category: 'B',
        level: 'IIIB',
        department: 'DECOR' as any,
        rates: {
            s35: 486.7,
            s39: 542.33,
            s7: 97.34,
            s8: 111.25
        }
    },
    {
        id: 'directeur_de_jeux',
        title: "Directeur de jeux",
        category: 'B',
        level: '',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 681.25,
            s39: 759.11,
            s7: 136.25,
            s8: 155.71
        }
    },
    {
        id: 'directeur_de_la_distribution',
        title: "Directeur de la distribution",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 584.05,
            s39: 650.79,
            s7: 116.81,
            s8: 133.5
        }
    },
    {
        id: 'directeur_de_production',
        title: "Directeur de production",
        category: 'B',
        level: '',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 764.82,
            s39: 852.23,
            s7: 152.96,
            s8: 174.82
        }
    },
    {
        id: 'directeur_de_s_lection',
        title: "Directeur de sélection",
        category: 'B',
        level: '',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 667.48,
            s39: 743.76,
            s7: 133.5,
            s8: 152.57
        }
    },
    {
        id: 'directeur_des_dialogues',
        title: "Directeur des dialogues",
        category: 'B',
        level: 'IIIB',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 472.8,
            s39: 526.83,
            s7: 94.56,
            s8: 108.07
        }
    },
    {
        id: 'directeur_photo',
        title: "Directeur photo",
        category: 'B',
        level: '',
        department: 'IMAGE' as any,
        rates: {
            s35: 764.82,
            s39: 852.23,
            s7: 152.96,
            s8: 174.82
        }
    },
    {
        id: 'editeur_artistique_web',
        title: "Editeur artistique web",
        category: 'C',
        level: 'IV',
        department: 'AUTRE' as any,
        rates: {
            s35: 438.51,
            s39: 488.62,
            s7: 87.7,
            s8: 100.23
        }
    },
    {
        id: 'lectricien_clairagiste',
        title: "Électricien / Éclairagiste",
        category: 'C',
        level: 'V',
        department: 'PLATEAU' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'lectricien_d_co_machiniste_d_co',
        title: "Électricien déco / Machiniste déco",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'enqu_teur_recherchiste',
        title: "Enquêteur / Recherchiste",
        category: 'B',
        level: 'IIIB',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'ensemblier_d_corateur',
        title: "Ensemblier - décorateur",
        category: 'B',
        level: 'IIIA',
        department: 'DECOR' as any,
        rates: {
            s35: 584.05,
            s39: 650.79,
            s7: 116.81,
            s8: 133.5
        }
    },
    {
        id: 'talonneur',
        title: "Étalonneur",
        category: 'B',
        level: 'IIIB',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'gestionnaire_de_diffusion_internet_traffic_manager',
        title: "Gestionnaire de diffusion internet (traffic manager)",
        category: 'C',
        level: 'V',
        department: 'AUTRE' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'habilleur',
        title: "Habilleur",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'illustrateur_sonore',
        title: "Illustrateur sonore",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 556.23,
            s39: 619.8,
            s7: 111.25,
            s8: 127.14
        }
    },
    {
        id: 'infographiste',
        title: "Infographiste",
        category: 'B',
        level: 'IIIA',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 584.05,
            s39: 650.79,
            s7: 116.81,
            s8: 133.5
        }
    },
    {
        id: 'ing_nieur_de_la_vision_adjoint',
        title: "Ingénieur de la vision adjoint",
        category: 'B',
        level: 'IIIB',
        department: 'IMAGE' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'machiniste',
        title: "Machiniste",
        category: 'C',
        level: 'V',
        department: 'PLATEAU' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'ma_on_de_d_cor',
        title: "Maçon de décor",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'maquilleur',
        title: "Maquilleur",
        category: 'C',
        level: 'V',
        department: 'HMC' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'maquilleur_et_coiffeur_effets_sp_ciaux',
        title: "Maquilleur et coiffeur effets spéciaux",
        category: 'B',
        level: 'IIIB',
        department: 'HMC' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'menuisier_traceur_toupilleur_de_d_cor',
        title: "Menuisier-traceur-toupilleur de décor",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 556.23,
            s39: 619.8,
            s7: 111.25,
            s8: 127.14
        }
    },
    {
        id: 'm_tallier_serrurier_m_canicien_de_d_cor',
        title: "Métallier / Serrurier / Mécanicien de décor",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'mixeur_direct_ou_conditions_du_direct_21',
        title: "Mixeur (direct ou conditions du direct) (21)",
        category: 'B',
        level: 'IIIA',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 584.05,
            s39: 650.79,
            s7: 116.81,
            s8: 133.5
        }
    },
    {
        id: 'monteur_5',
        title: "Monteur (5)",
        category: 'B',
        level: 'IIIB',
        department: 'IMAGE' as any,
        rates: {
            s35: 528.42,
            s39: 588.81,
            s7: 105.68,
            s8: 120.78
        }
    },
    {
        id: 'op_rateur_de_transfert_et_de_traitement_num_rique',
        title: "Opérateur de transfert et de traitement numérique",
        category: 'C',
        level: 'V',
        department: 'IMAGE' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'op_rateur_magn_to_op_rateur_magn_to_ralenti',
        title: "Opérateur magnéto / Opérateur magnéto ralenti",
        category: 'C',
        level: 'V',
        department: 'IMAGE' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'op_rateur_r_gie_vid_o',
        title: "Opérateur régie-vidéo",
        category: 'C',
        level: 'V',
        department: 'REGIE' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'op_rateur_sp_cial_steadicamer',
        title: "Opérateur spécial (steadicamer)",
        category: 'B',
        level: 'IIIA',
        department: 'IMAGE' as any,
        rates: {
            s35: 611.86,
            s39: 681.78,
            s7: 122.37,
            s8: 139.85
        }
    },
    {
        id: 'op_rateur_synth_tiseur',
        title: "Opérateur synthétiseur",
        category: 'C',
        level: 'V',
        department: 'IMAGE' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'op_rateur_web_op_rateur_multicam_web',
        title: "Opérateur web / Opérateur multicam web",
        category: 'B',
        level: 'IIIA',
        department: 'AUTRE' as any,
        rates: {
            s35: 493.32,
            s39: 549.7,
            s7: 98.66,
            s8: 112.76
        }
    },
    {
        id: 'ops_22',
        title: "OPS (22)",
        category: 'B',
        level: 'IIIB',
        department: 'SON' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'peintre_de_d_cor',
        title: "Peintre de décor",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'peintre_en_lettres_en_faux_bois_de_d_cor',
        title: "Peintre en lettres / en faux bois de décor",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'perchiste_1er_assistant_son',
        title: "Perchiste / 1er assistant son",
        category: 'B',
        level: 'IIIA',
        department: 'SON' as any,
        rates: {
            s35: 556.23,
            s39: 619.8,
            s7: 111.25,
            s8: 127.14
        }
    },
    {
        id: 'photographe_de_plateau',
        title: "Photographe de plateau",
        category: 'B',
        level: 'IIIB',
        department: 'IMAGE' as any,
        rates: {
            s35: 514.51,
            s39: 573.32,
            s7: 102.9,
            s8: 117.6
        }
    },
    {
        id: 'pr_parateur_de_questions',
        title: "Préparateur de questions",
        category: 'C',
        level: 'IV',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 495.65,
            s39: 552.3,
            s7: 99.13,
            s8: 113.29
        }
    },
    {
        id: 'programmateur_artistique_d_mission',
        title: "Programmateur artistique d'émission",
        category: 'B',
        level: 'IIIB',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 472.8,
            s39: 526.83,
            s7: 94.56,
            s8: 108.07
        }
    },
    {
        id: 'proth_siste',
        title: "Prothésiste",
        category: 'B',
        level: 'IIIB',
        department: 'PLATEAU' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'pupitreur_lumi_re',
        title: "Pupitreur lumière",
        category: 'B',
        level: 'IIIB',
        department: 'IMAGE' as any,
        rates: {
            s35: 572.59,
            s39: 638.03,
            s7: 114.52,
            s8: 130.88
        }
    },
    {
        id: 'r_gisseur_responsable_des_rep_rages',
        title: "Régisseur / Responsable des repérages",
        category: 'B',
        level: 'IIIB',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'r_gisseur_adjoint',
        title: "Régisseur adjoint",
        category: 'C',
        level: 'IV',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 458.89,
            s39: 511.34,
            s7: 91.78,
            s8: 104.89
        }
    },
    {
        id: 'r_gisseur_d_ext_rieurs',
        title: "Régisseur d'extérieurs",
        category: 'B',
        level: 'IIIB',
        department: 'DECOR' as any,
        rates: {
            s35: 486.7,
            s39: 542.33,
            s7: 97.34,
            s8: 111.25
        }
    },
    {
        id: 'r_gisseur_de_plateau_chef_de_plateau',
        title: "Régisseur de plateau / Chef de plateau",
        category: 'B',
        level: 'IV',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'r_gisseur_g_n_ral',
        title: "Régisseur général",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 611.86,
            s39: 681.78,
            s7: 122.37,
            s8: 139.85
        }
    },
    {
        id: 'r_gulateur_de_stationnement',
        title: "Régulateur de stationnement",
        category: 'C',
        level: 'VI',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'r_p_titeur',
        title: "Répétiteur",
        category: 'B',
        level: 'IIIB',
        department: 'REALISATION' as any,
        rates: {
            s35: 472.8,
            s39: 526.83,
            s7: 94.56,
            s8: 108.07
        }
    },
    {
        id: 'responsable_de_questions',
        title: "Responsable de questions",
        category: 'B',
        level: 'IIIA',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 611.86,
            s39: 681.78,
            s7: 122.37,
            s8: 139.85
        }
    },
    {
        id: 'responsable_des_enfants',
        title: "Responsable des enfants",
        category: 'B',
        level: 'IIIB',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 472.8,
            s39: 526.83,
            s7: 94.56,
            s8: 108.07
        }
    },
    {
        id: 'rippeur',
        title: "Rippeur",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'scripte',
        title: "Scripte",
        category: 'B',
        level: 'IIIA',
        department: 'REALISATION' as any,
        rates: {
            s35: 611.86,
            s39: 681.78,
            s7: 122.37,
            s8: 139.85
        }
    },
    {
        id: 'secr_taire_de_production',
        title: "Secrétaire de production",
        category: 'C',
        level: 'V',
        department: 'PRODUCTION' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'staffeur_de_d_cor',
        title: "Staffeur de décor",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'storyboarder',
        title: "Storyboarder",
        category: 'B',
        level: 'IIIB',
        department: 'REALISATION' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'styliste',
        title: "Styliste",
        category: 'B',
        level: 'IIIB',
        department: 'DECOR' as any,
        rates: {
            s35: 472.8,
            s39: 526.83,
            s7: 94.56,
            s8: 108.07
        }
    },
    {
        id: 'superviseur_d_effets_sp_ciaux_image',
        title: "Superviseur d'effets spéciaux image",
        category: 'B',
        level: 'IIIA',
        department: 'IMAGE' as any,
        rates: {
            s35: 584.05,
            s39: 650.79,
            s7: 116.81,
            s8: 133.5
        }
    },
    {
        id: 'superviseur_d_effets_sp_ciaux_postproduction',
        title: "Superviseur d'effets spéciaux postproduction",
        category: 'B',
        level: 'IIIA',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 611.86,
            s39: 681.78,
            s7: 122.37,
            s8: 139.85
        }
    },
    {
        id: 'tapissier_de_d_cor',
        title: "Tapissier de décor",
        category: 'C',
        level: 'V',
        department: 'DECOR' as any,
        rates: {
            s35: 500.61,
            s39: 557.82,
            s7: 100.12,
            s8: 114.43
        }
    },
    {
        id: 'technicien_de_d_veloppement_web',
        title: "Technicien de développement web",
        category: 'B',
        level: 'IIIB',
        department: 'AUTRE' as any,
        rates: {
            s35: 452.21,
            s39: 503.89,
            s7: 90.44,
            s8: 103.36
        }
    },
    {
        id: 'technicien_instruments_backliner',
        title: "Technicien instruments (backliner)",
        category: 'B',
        level: 'IIIB',
        department: 'SON' as any,
        rates: {
            s35: 550.73,
            s39: 613.67,
            s7: 110.15,
            s8: 125.88
        }
    },
    {
        id: 'technicien_truquiste',
        title: "Technicien truquiste",
        category: 'C',
        level: 'IV',
        department: 'IMAGE' as any,
        rates: {
            s35: 486.7,
            s39: 542.33,
            s7: 97.34,
            s8: 111.25
        }
    },
    {
        id: 'technicien_vid_o',
        title: "Technicien vidéo",
        category: 'C',
        level: 'IV',
        department: 'IMAGE' as any,
        rates: {
            s35: 486.7,
            s39: 542.33,
            s7: 97.34,
            s8: 111.25
        }
    },
    {
        id: 'technicien_vid_o_web',
        title: "Technicien vidéo web",
        category: 'C',
        level: 'V',
        department: 'AUTRE' as any,
        rates: {
            s35: 422.03,
            s39: 470.26,
            s7: 84.41,
            s8: 96.46
        }
    },
    {
        id: 'truquiste',
        title: "Truquiste",
        category: 'B',
        level: 'IIIA',
        department: 'POST_PRODUCTION' as any,
        rates: {
            s35: 584.05,
            s39: 650.79,
            s7: 116.81,
            s8: 133.5
        }
    },
];

export const getJobByTitle = (title: string): JobDefinition | undefined => {
    return USPA_JOBS.find(j => j.title.toLowerCase() === title.toLowerCase());
};
