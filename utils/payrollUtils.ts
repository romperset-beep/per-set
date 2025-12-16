import { JobDefinition } from '../data/uspaRates';

// Constants
export const SMIC_HOURLY = 11.65; // 2024
export const SMIC_MONTHLY = 1766.92; // 35h

interface PayrollResult {
    grossAmount: number;
    details: string; // Explainer text
    isAlert?: boolean; // e.g. < SMIC
}

interface CalculationParams {
    job: JobDefinition;
    hoursWorked: number;
    nbDays?: number; // if relevant
    contractType: 'SEMAINE' | 'JOUR' | 'MOIS';
    travelHoursInside: number;
    travelHoursOutside: number;
    base35Ref?: number; // For travel calc (Habilleuse ref)
    isContinuousDay?: boolean;
}

export const calculateUSPAGross = (params: CalculationParams): PayrollResult => {
    const { job, hoursWorked, contractType, travelHoursInside, travelHoursOutside, base35Ref, isContinuousDay } = params;
    let total = 0;
    let logParams: string[] = [];

    // 1. Base Salary
    let baseSalary = 0;

    if (contractType === 'SEMAINE') {
        // Simple logic: if hours <= 35 use S35, else use S39 rate basics?
        // Actually USPA model usually defines specific weekly rates.
        // For estimation, let's assume if planned 39h, we use S39.
        // If hoursWorked > 39, we might need overtime logic.
        // For simplicity v1: Closest Match.
        if (hoursWorked > 35 && job.rates.s39) {
            // Pro-rata or Fixed? Usually fixed weekly salary for 39h.
            // If they worked 39h, they get S39.
            baseSalary = job.rates.s39;
            logParams.push(`Base S39: ${baseSalary}€`);
        } else {
            baseSalary = job.rates.s35;
            logParams.push(`Base S35: ${baseSalary}€`);
        }
    } else if (contractType === 'JOUR') {
        // Daily Rate Logic
        // Determine Base Hours (8h or 7h) -> usually 8h for Tech, 7h for Admin/others?
        // Check if s8 rate exists and is non-zero
        let dailyBaseHours = 8;
        let dailyBaseRate = job.rates.s8;

        if (!dailyBaseRate || dailyBaseRate === 0) {
            if (job.rates.s7 && job.rates.s7 > 0) {
                dailyBaseHours = 7;
                dailyBaseRate = job.rates.s7;
            } else {
                // Fallback from weekly
                dailyBaseHours = 7; // Standard legal
                dailyBaseRate = job.rates.s35 / 5;
            }
        }

        // Hourly Rate for Overtime
        const hourlyRate = dailyBaseRate / dailyBaseHours;

        if (hoursWorked <= dailyBaseHours) {
            // Minimum Guarantee = Daily Rate
            baseSalary = dailyBaseRate;
            logParams.push(`Forfait Jour (${dailyBaseHours}h): ${baseSalary.toFixed(2)}€`);
        } else {
            // Base amount
            baseSalary = dailyBaseRate;

            // Calculate Overtime
            const extraHours = hoursWorked - dailyBaseHours;

            // Majorations (Simplified Convention USPA: usually +25% for first 8h, +50% beyond)
            // Note: precise rules depend on specific annexes, but for estimation +25% is standard start.

            let overtimeAmount = 0;
            // Split +25% (first 4 or 8 hours? usually first 8h beyond 35h in week, but per day?) 
            // In daily system (intermittent), hours > 8 are usually +25%.
            // Hours > 12 usually +50%? Or specific night hours?
            // Let's stick to simple +25% for all overtime for the estimate to avoid complexity, 
            // or split 1st 4h vs rest if strictly following general law. 
            // Let's do common practice: +25% for everything above base for now.

            const rate25 = hourlyRate * 1.25;
            overtimeAmount = extraHours * rate25;

            baseSalary += overtimeAmount;
            logParams.push(`Base (${dailyBaseHours}h): ${dailyBaseRate.toFixed(2)}€`);
            logParams.push(`H. Sup (+25%): ${overtimeAmount.toFixed(2)}€ (${extraHours.toFixed(2)}h)`);
        }
    }

    total += baseSalary;

    // 2. Travel Indemnity (Voyage)
    // Ref: Habilleuse S35 (passed as param or hardcoded if needed)
    // If not provided, use existing job's S35 as proxy or 0? 
    // Convention says "S35 Habilleuse".
    const REF_HABILLEUSE_S35 = base35Ref || 850.00; // Default fallback

    // Inside Schedule (>7h)
    let travelIndemnity = 0;
    if (travelHoursInside > 7) {
        const excess = travelHoursInside - 7;
        let rate = 0;
        if (excess <= 4) rate = 0.1;
        else if (excess <= 8) rate = 0.2;
        else rate = 0.4;

        const amount = rate * REF_HABILLEUSE_S35;
        travelIndemnity += amount;
        logParams.push(`Voyage Intra (>7h): +${amount.toFixed(2)}€`);
    }

    // Outside Schedule
    if (travelHoursOutside > 0) {
        let rate = 0;
        if (travelHoursOutside <= 4) rate = 0.1;
        else if (travelHoursOutside <= 8) rate = 0.2;
        else rate = 0.4;

        const amount = rate * REF_HABILLEUSE_S35;
        travelIndemnity += amount;
        logParams.push(`Voyage Extra: +${amount.toFixed(2)}€`);
    }


    // 3. Continuous Day Indemnity (30 min paid)
    if (isContinuousDay) {
        // Calculate hourly rate (based on s8 or s7)
        const dailyBaseHours = (job.rates.s35 && job.rates.s7 && job.rates.s7 > 0) ? 7 : 8;
        const dailyRate = job.rates.s8 || (job.rates.s35 / 5) || 0;
        const hourlyRate = dailyRate / dailyBaseHours;

        if (hourlyRate > 0) {
            const indemnity = hourlyRate * 0.5; // 30 mins
            total += indemnity;
            logParams.push(`Indemnité J. Continue (30m): +${indemnity.toFixed(2)}€`);
        }
    }

    total += travelIndemnity;

    return {
        grossAmount: total,
        details: logParams.join(', ')
    };
};
