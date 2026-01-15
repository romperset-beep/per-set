
// Barème Kilométrique 2024 (URSSAF / Service Public)
// Sources: https://www.service-public.fr/particuliers/actualites/A14686

export interface MileageScale {
    d_max_5000: number; // Coefficient for d <= 5000
    d_5001_20000: { mul: number; add: number }; // (d * mul) + add
    d_over_20000: number; // Coefficient for d > 20000
}

export const URSSAF_2024_CARS: Record<number, MileageScale> = {
    3: { d_max_5000: 0.529, d_5001_20000: { mul: 0.316, add: 1065 }, d_over_20000: 0.370 }, // 3 CV & -
    4: { d_max_5000: 0.606, d_5001_20000: { mul: 0.340, add: 1330 }, d_over_20000: 0.407 },
    5: { d_max_5000: 0.636, d_5001_20000: { mul: 0.357, add: 1395 }, d_over_20000: 0.427 },
    6: { d_max_5000: 0.665, d_5001_20000: { mul: 0.374, add: 1457 }, d_over_20000: 0.447 },
    7: { d_max_5000: 0.697, d_5001_20000: { mul: 0.394, add: 1515 }, d_over_20000: 0.470 }, // 7 CV & +
};

export const URSSAF_2024_MOTOS: Record<number, MileageScale> = {
    1: { d_max_5000: 0.341, d_5001_20000: { mul: 0.085, add: 1280 }, d_over_20000: 0.213 }, // 1-2 CV (Simplified as 1 for key)
    3: { d_max_5000: 0.404, d_5001_20000: { mul: 0.071, add: 1665 }, d_over_20000: 0.237 }, // 3,4,5 CV
    6: { d_max_5000: 0.523, d_5001_20000: { mul: 0.068, add: 2275 }, d_over_20000: 0.295 }, // +5 CV
};

// Mopeds (Cyclomoteurs) < 50cm3
export const URSSAF_2024_MOPEDS: MileageScale = {
    d_max_5000: 0.272,
    d_5001_20000: { mul: 0.064, add: 1040 },
    d_over_20000: 0.147
};

// USPA SPECIFIC RULES
// "L'indemnité correspond à la moitié du tarif du barème fiscal applicable aux véhicules de 7 CV"
// Franchise: 10km (No indemnity if <= 10km)
export const USPA_RULES = {
    franchiseKm: 10,
    carRateReferenceCV: 7, // Always use 7CV rate base
    carRateMultiplier: 0.5, // 50%
    motoRateMultiplier: 0.5 // 50%
};

/**
 * Calculates the reimbursement amount based on standard fiscal rules (Cumulative).
 * Note: To be strictly accurate, we need the TOTAL ANNUAL DISTANCE. 
 * Since we calculate per trip effectively, we usually assume the lowest bracket (d <= 5000) 
 * for daily estimates, unless we track cumulative.
 * 
 * For this implementation, we will allow passing 'currentAnnualTotal' to determine the bracket,
 * defaulting to 0 (Tier 1).
 */
export const getFiscalRate = (
    type: 'VOITURE' | 'MOTO' | 'SCOOTER',
    fiscalPower: number,
    annualKm: number = 0
): number => {
    let scale: MileageScale | undefined;

    if (type === 'VOITURE') {
        const cv = Math.min(Math.max(fiscalPower, 3), 7); // Clamp 3-7
        scale = URSSAF_2024_CARS[cv];
    } else if (type === 'MOTO') {
        let cvKey = 1;
        if (fiscalPower >= 6) cvKey = 6;
        else if (fiscalPower >= 3) cvKey = 3;
        scale = URSSAF_2024_MOTOS[cvKey];
    } else { // SCOOTER / MOPED
        scale = URSSAF_2024_MOPEDS;
    }

    if (!scale) return 0;

    // Determine Marginal Rate vs Average Rate?
    // Usually for an expense report of X km, we apply the rate of the current tier.
    if (annualKm <= 5000) return scale.d_max_5000;
    if (annualKm <= 20000) return scale.d_5001_20000.mul; // Approximation of marginal cost? 
    // Actually the formula (d * mul) + add is for the TOTAL. 
    // The marginal rate for the km between 5001 and 20000 is just 'mul'? 
    // NO. The formula is global. (d x 0.316) + 1065.
    // If I drive 1 km MORE (from 5000 to 5001), the calc changes from 5000*0.529 = 2645 to 5001*0.316 + 1065 = 1580 + 1065 = 2645.
    // So the curve is continuous.

    // For a SINGLE TRIP strictly, we should use the "d_max_5000" rate (Tier 1) as a safe estimate 
    // for Technicians who rarely exceed 5000km *for a single production*.
    return scale.d_max_5000;
};
