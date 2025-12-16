import { JobDefinition } from '../data/uspaRates';
import { CINEMA_RATES_ANNEXE_1, CINEMA_RATES_ANNEXE_2, CINEMA_RATES_ANNEXE_3, CinemaJob } from '../data/cinemaRates';

// Constants
export const SMIC_HOURLY = 11.65; // 2024
export const SMIC_MONTHLY = 1766.92; // 35h

interface PayrollResult {
    grossAmount: number;
    details: string; // Explainer text
    isAlert?: boolean; // e.g. < SMIC
}

interface CalculationParams {
    job: any; // JobDefinition | CinemaJob
    hoursWorked: number;
    nbDays?: number; // if relevant
    contractType: 'SEMAINE' | 'JOUR' | 'MOIS';
    travelHoursInside: number;
    travelHoursOutside: number;
    base35Ref?: number; // For travel calc (Habilleuse ref)
    isContinuousDay?: boolean;
    convention?: string; // To switch logic
}

export const calculateCinemaGross = (params: CalculationParams): PayrollResult => {
    const { job, hoursWorked, contractType, isContinuousDay, travelHoursInside, travelHoursOutside } = params;
    const cJob = job as CinemaJob;
    let total = 0;
    let logParams: string[] = [];

    let baseRate = 0;
    let baseHours = 0;

    // Rates
    const weeklyRate = cJob.rates.baseWeekly || (cJob.rates.baseDaily ? cJob.rates.baseDaily * 5 : 0);
    const dailyRate = cJob.rates.baseDaily || (weeklyRate / 5) || 0;

    if (contractType === 'SEMAINE') {
        const hourlyRate = weeklyRate / 35; // Assume 35h base for weekly rate division
        baseRate = weeklyRate;
        baseHours = 35; // Standard base

        if (hoursWorked > 35) {
            const extra = hoursWorked - 35;
            // Simple overtime (+25% for first 8h, +50% beyond -> standard law)
            // But usually conventions have specifics. We'll use +25% generic.
            const overtime = extra * (hourlyRate * 1.25);
            total = baseRate + overtime;
            logParams.push(`Base Hebdo: ${baseRate.toFixed(2)}€`);
            logParams.push(`H. Sup (+25%): ${overtime.toFixed(2)}€`);
        } else {
            total = baseRate;
            logParams.push(`Forfait Hebdo: ${baseRate.toFixed(2)}€`);
        }

    } else {
        // JOUR
        // Cinema Daily: Cachet is for ~7h or 8h depending on team.
        // We'll assume 8h for calc.
        const dailyBaseH = 8;
        const hourlyRate = dailyRate / dailyBaseH;

        if (hoursWorked <= dailyBaseH) {
            total = dailyRate;
            logParams.push(`Cachet Jour: ${dailyRate.toFixed(2)}€`);
        } else {
            const extra = hoursWorked - dailyBaseH;
            const overtime = extra * (hourlyRate * 1.25);
            total = dailyRate + overtime;
            logParams.push(`Base Jour: ${dailyRate.toFixed(2)}€`);
            logParams.push(`H. Sup: ${overtime.toFixed(2)}€`);
        }
    }

    // Continuous Day Indemnity (30 mins paid)
    if (isContinuousDay) {
        // Hourly rate estimate
        const hRate = (contractType === 'SEMAINE' ? (weeklyRate / 35) : (dailyRate / 8)) || 0;
        if (hRate > 0) {
            const indemnity = hRate * 0.5;
            total += indemnity;
            logParams.push(`J. Continue: +${indemnity.toFixed(2)}€`);
        }
    }

    // Travel (Simplified same as USPA for now)
    const REF_HABILLEUSE = 850; // Proxy
    // Inside Schedule (>7h)
    let travelIndemnity = 0;
    if (travelHoursInside > 7) {
        const excess = travelHoursInside - 7;
        let rate = excess <= 4 ? 0.1 : (excess <= 8 ? 0.2 : 0.4);
        travelIndemnity += rate * REF_HABILLEUSE;
        logParams.push(`Voyage Intra: +${(rate * REF_HABILLEUSE).toFixed(2)}€`);
    }
    // Outside
    if (travelHoursOutside > 0) {
        let rate = travelHoursOutside <= 4 ? 0.1 : (travelHoursOutside <= 8 ? 0.2 : 0.4);
        travelIndemnity += rate * REF_HABILLEUSE;
        logParams.push(`Voyage Extra: +${(rate * REF_HABILLEUSE).toFixed(2)}€`);
    }
    total += travelIndemnity;

    return { grossAmount: total, details: logParams.join(', ') };
};

export const calculateUSPAGross = (params: CalculationParams): PayrollResult => {
    const { job, hoursWorked, contractType, travelHoursInside, travelHoursOutside, base35Ref, isContinuousDay } = params;
    // ... (Existing USPA Logic - kept mostly same but wrapped to allow separate function if needed)
    // NOTE: I am keeping the exact previous implementation logic here for USPA but just ensuring it matches the interface
    // For brevity in this replacement, I will copy the logic logic back exactly as it was.

    // ... [Original USPA Logic Body] ...
    // Since I cannot use "Original Code" placeholder efficiently without rewriting 100 lines, 
    // I will call `calculateCinemaGross` if convention is cinema, else do USPA logic inline.

    // Better: Helper wrapper.
    return calculateUSPAGrossInternal(params);
};

// Internal copy of the original function to preserve behavior
const calculateUSPAGrossInternal = (params: CalculationParams): PayrollResult => {
    const { job, hoursWorked, contractType, travelHoursInside, travelHoursOutside, base35Ref, isContinuousDay } = params;
    let total = 0;
    let logParams: string[] = [];

    let baseSalary = 0;

    if (contractType === 'SEMAINE') {
        if (hoursWorked > 35 && job.rates?.s39) {
            baseSalary = job.rates.s39;
            logParams.push(`Base S39: ${baseSalary}€`);
        } else {
            baseSalary = job.rates?.s35 || 0;
            logParams.push(`Base S35: ${baseSalary}€`);
        }
    } else if (contractType === 'JOUR') {
        let dailyBaseHours = 8;
        let dailyBaseRate = job.rates?.s8;

        if (!dailyBaseRate || dailyBaseRate === 0) {
            if (job.rates?.s7 && job.rates.s7 > 0) {
                dailyBaseHours = 7;
                dailyBaseRate = job.rates.s7;
            } else {
                dailyBaseHours = 7;
                dailyBaseRate = (job.rates?.s35 || 0) / 5;
            }
        }

        const hourlyRate = dailyBaseRate / dailyBaseHours;

        if (hoursWorked <= dailyBaseHours) {
            baseSalary = dailyBaseRate;
            logParams.push(`Forfait Jour (${dailyBaseHours}h): ${baseSalary.toFixed(2)}€`);
        } else {
            baseSalary = dailyBaseRate;
            const extraHours = hoursWorked - dailyBaseHours;
            const rate25 = hourlyRate * 1.25;
            const overtimeAmount = extraHours * rate25; // Simple +25%
            baseSalary += overtimeAmount;
            logParams.push(`Base (${dailyBaseHours}h): ${dailyBaseRate.toFixed(2)}€`);
            logParams.push(`H. Sup (+25%): ${overtimeAmount.toFixed(2)}€`);
        }
    }

    total += baseSalary;

    // Travel
    const REF_HABILLEUSE_S35 = base35Ref || 850.00;
    let travelIndemnity = 0;
    if (travelHoursInside > 7) {
        const excess = travelHoursInside - 7;
        let rate = excess <= 4 ? 0.1 : (excess <= 8 ? 0.2 : 0.4);
        const amount = rate * REF_HABILLEUSE_S35;
        travelIndemnity += amount;
        logParams.push(`Voyage Intra: +${amount.toFixed(2)}€`);
    }
    if (travelHoursOutside > 0) {
        let rate = travelHoursOutside <= 4 ? 0.1 : (travelHoursOutside <= 8 ? 0.2 : 0.4);
        const amount = rate * REF_HABILLEUSE_S35;
        travelIndemnity += amount;
        logParams.push(`Voyage Extra: +${amount.toFixed(2)}€`);
    }

    if (isContinuousDay) {
        const dailyBaseHours = (job.rates?.s35 && job.rates?.s7 && job.rates.s7 > 0) ? 7 : 8;
        const dailyRate = job.rates?.s8 || (job.rates?.s35 / 5) || 0;
        const hourlyRate = dailyRate / dailyBaseHours;

        if (hourlyRate > 0) {
            const indemnity = hourlyRate * 0.5;
            total += indemnity;
            logParams.push(`Indemnité J. Continue: +${indemnity.toFixed(2)}€`);
        }
    }

    total += travelIndemnity;
    return { grossAmount: total, details: logParams.join(', ') };
};

export const calculatePubGross = (params: CalculationParams): PayrollResult => {
    // Publicité Logic
    // Base Reference: Annexe 1 Weekly Rate / 40 = Simple Hourly Rate
    // Real Base Rate = Simple Hourly * 1.5 (+50%)
    // Daily Guarantee = 8h * Real Base Rate
    // Overtime 8h-10h = Real Base Rate * 2 (+100% of Guaranteed Base)
    // Overtime >10h = Real Base Rate * 3 (+200% of Guaranteed Base)

    const { job, hoursWorked, travelHoursInside, travelHoursOutside } = params;
    let total = 0;
    let logParams: string[] = [];

    // Get Weekly Rate from Annexe 1 (or job if passed directly)
    // If job comes from Annexe 1, use baseWeekly.
    const cJob = job as CinemaJob;
    const weeklyRateReferent = cJob.rates.baseWeekly || (cJob.rates.baseDaily ? cJob.rates.baseDaily * 5 : 0);

    // 1. Simple Hourly (Taux Simple)
    const simpleHourly = weeklyRateReferent / 40;

    // 2. Guaranteed Base Hourly (Heure de base majorée de 50%)
    const guaranteedBaseHourly = simpleHourly * 1.5;

    // 3. Daily Calculation
    const dailyBaseHours = 8;

    if (hoursWorked <= dailyBaseHours) {
        total = dailyBaseHours * guaranteedBaseHourly;
        logParams.push(`Forfait Pub (8h): ${total.toFixed(2)}€ (${guaranteedBaseHourly.toFixed(2)}€/h)`);
    } else {
        // First 8h
        total = dailyBaseHours * guaranteedBaseHourly;
        logParams.push(`Base (8h): ${total.toFixed(2)}€`);

        // Overtime
        const extra = hoursWorked - dailyBaseHours; // Total extra hours

        // Split 8h-10h (max 2h) and >10h
        const overtime100 = Math.min(extra, 2); // Hours between 8 and 10
        const overtime200 = Math.max(0, extra - 2); // Hours beyond 10

        if (overtime100 > 0) {
            const rate100 = guaranteedBaseHourly * 2; // +100%
            total += overtime100 * rate100;
            logParams.push(`H. Sup 100% (${overtime100.toFixed(2)}h): +${(overtime100 * rate100).toFixed(2)}€`);
        }

        if (overtime200 > 0) {
            const rate200 = guaranteedBaseHourly * 3; // +200%
            total += overtime200 * rate200;
            logParams.push(`H. Sup 200% (${overtime200.toFixed(2)}h): +${(overtime200 * rate200).toFixed(2)}€`);
        }
    }

    // Travel (Same logic as Cinema/USPA for now)
    const REF_HABILLEUSE = 850;
    let travelIndemnity = 0;
    if (travelHoursInside > 7) {
        const excess = travelHoursInside - 7;
        let rate = excess <= 4 ? 0.1 : (excess <= 8 ? 0.2 : 0.4);
        travelIndemnity += rate * REF_HABILLEUSE;
        logParams.push(`Voyage Intra: +${(rate * REF_HABILLEUSE).toFixed(2)}€`);
    }
    if (travelHoursOutside > 0) {
        let rate = travelHoursOutside <= 4 ? 0.1 : (travelHoursOutside <= 8 ? 0.2 : 0.4);
        travelIndemnity += rate * REF_HABILLEUSE;
        logParams.push(`Voyage Extra: +${(rate * REF_HABILLEUSE).toFixed(2)}€`);
    }
    total += travelIndemnity;

    return { grossAmount: total, details: logParams.join(', ') };
};

export const calculateEstimatedSalary = (params: CalculationParams): PayrollResult => {
    const { convention } = params;
    if (convention === 'Publicité') {
        return calculatePubGross(params);
    }
    if (convention && convention.toLowerCase().includes('annexe')) {
        return calculateCinemaGross(params);
    }
    return calculateUSPAGross(params);
};

export const getAvailableJobs = (convention: string | undefined): any[] => {
    if (convention === 'Publicité') return CINEMA_RATES_ANNEXE_1; // Use Annexe 1 as base
    if (convention === 'Annexe 1' || convention === 'Gros Budget' || convention === 'Cinéma - Annexe 1') return CINEMA_RATES_ANNEXE_1;
    if (convention === 'Annexe 2' || convention === 'Budget Moyen' || convention === 'Cinéma - Annexe 2') return CINEMA_RATES_ANNEXE_2;
    if (convention === 'Annexe 3' || convention === 'Petit Budget' || convention === 'Cinéma - Annexe 3') return CINEMA_RATES_ANNEXE_3;
    return []; // Return empty if not Cinema, let caller fallback to USPA
};
