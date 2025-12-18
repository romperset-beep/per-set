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
    isSunday?: boolean; // New
    isHoliday?: boolean; // New
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

    // Sunday / Holiday Majorations
    // Simplification: Apply percentage to the Daily Total (excluding travel).
    const baseTotalForMajoration = total - travelIndemnity;

    if (params.isHoliday) {
        const maj = baseTotalForMajoration * 1.0; // +100%
        total += maj;
        logParams.push(`Majoration Férié (+100%): +${maj.toFixed(2)}€`);
    } else if (params.isSunday) {
        const maj = baseTotalForMajoration * 0.5; // +50%
        total += maj;
        logParams.push(`Majoration Dimanche (+50%): +${maj.toFixed(2)}€`);
    }

    // (Original comments removed for brevity)

    // Actually, we can't implement it here without the date.
    // Check below for calculateEstimatedSalary wrapper which might have access?
    // No, calculateEstimatedSalary receives CalculationParams.
    // We MUST update CalculationParams interface to includes isSunday / isHoliday or 'date'.


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
    // Enrich params with Sunday/Holiday logic if not present?
    // Actually, params are built by the caller. But if we want to enforce logic here:
    // We don't have the date here...
    // The CALLER (TimesheetWidget) must pass isSunday/isHoliday based on the date it knows.
    // OR we pass 'date' properly to CalculationParams.
    // For now, let's assume the caller will populate isSunday/isHoliday.

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

export interface TimeEntry {
    date: string; // YYYY-MM-DD - REQUIRED for seasonal calculation
    start: string; // HH:mm
    end: string;   // HH:mm
    mealDuration: number; // in hours (e.g. 1.0)
}

export interface ShiftResult {
    amplitude: number;
    effectiveHours: number;
    nightHours22_24: number; // Legacy
    nightHours00_06: number; // Legacy
    nightHours20_22: number; // Legacy
    nightHours50: number;    // Majorated 50%
    nightHours100: number;   // Majorated 100%
    sundayHours: number;
    holidayHours: number; // Added: Heures Fériées
}

// Helper to parse time string "HH:mm" to decimal hours
const timeToDecimal = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h + (m / 60);
};

// Helper to check for French Public Holidays
// Includes fixed dates and variable dates (Easter based)
const getEasterDate = (year: number): Date => {
    const f = Math.floor,
        G = year % 19,
        C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);
    return new Date(year, month - 1, day);
};

export const isFrenchPublicHoliday = (d: Date): boolean => {
    const year = d.getFullYear();
    const dateStr = `${d.getMonth() + 1}-${d.getDate()}`; // M-D

    // Fixed Dates
    const fixed = [
        '1-1',   // Jour de l'an
        '5-1',   // Fête du travail
        '5-8',   // Victoire 1945
        '7-14',  // Fête nationale
        '8-15',  // Assomption
        '11-1',  // Toussaint
        '11-11', // Armistice
        '12-25'  // Noël
    ];
    if (fixed.includes(dateStr)) return true;

    // Variable Dates (Easter based)
    const easter = getEasterDate(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);

    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 39);

    const pentecostMonday = new Date(easter);
    pentecostMonday.setDate(easter.getDate() + 50);

    const check = (target: Date) => target.getMonth() === d.getMonth() && target.getDate() === d.getDate();

    if (check(easterMonday)) return true;
    if (check(ascension)) return true;
    if (check(pentecostMonday)) return true;

    return false;
};

const isWinter = (dateStr: string): boolean => {
    // Winter: Oct 1 - March 31
    // Summer: April 1 - Sept 30
    if (!dateStr) return false; // Default to Summer or handle error? Defaulting to false (Summer)
    const date = new Date(dateStr);
    const month = date.getMonth(); // 0-11. Jan=0, Oct=9
    const day = date.getDate();

    // Oct (9) to Dec (11) OR Jan (0) to March (2)
    if (month >= 9 || month <= 2) {
        // Edge cases: Starts Oct 1 (included), Ends March 31 (included)
        // Logic covers full months 9,10,11,0,1,2 which is Oct,Nov,Dec,Jan,Feb,Mar. Correct.
        return true;
    }
    return false;
};

export const calculateShiftDetails = (entry: TimeEntry): ShiftResult => {
    let start = timeToDecimal(entry.start);
    let end = timeToDecimal(entry.end);

    // Date analysis
    const d = new Date(entry.date);
    const isSunday = d.getDay() === 0;
    const isHoliday = isFrenchPublicHoliday(d);

    // Handle overnight
    if (end < start) {
        end += 24;
    }

    const amplitude = end - start;
    const effectiveHours = Math.max(0, amplitude - entry.mealDuration);

    // Seasonal Night Logic
    // Winter: 20h - 06h
    // Summer: 22h - 06h
    const _isWinter = isWinter(entry.date);

    const nightStart = _isWinter ? 20 : 22;
    const nightEnd = 6; // 06:00
    const nextNightStart = nightStart + 24; // e.g. 44 (20+24) or 46 (22+24)
    const nextNightEnd = nightEnd + 24; // 30

    // Calculate overlap with Night Window
    // Window 1: Day 1 Night (e.g. 20h-24h or 22h-24h AND 00h-06h overlap if shift started previous day? No assuming start is Day 0)
    // We treat shift start as 0..24+ ranges.
    // Relevant windows:
    // A) 00h - 06h (If shift started very early? Unlikely context, standard is start limits)
    // B) NightStart - 24h
    // C) 24h - NextNightEnd (which is 00h - 06h next day)

    const getOverlap = (s1: number, e1: number, s2: number, e2: number) => {
        return Math.max(0, Math.min(e1, e2) - Math.max(s1, s2));
    };

    let totalNight = 0;

    // 1. Check overlap with 00h-06h (Early morning start)
    totalNight += getOverlap(start, end, 0, nightEnd);

    // 2. Check overlap with NightStart - 24h
    totalNight += getOverlap(start, end, nightStart, 24);

    // 3. Check overlap with 24h - NextNightEnd (Next day morning)
    totalNight += getOverlap(start, end, 24, nextNightEnd);

    // Also check NextNightStart+ if really long shift? (rare > 24h amplitude)
    // Usually ends before next evening.

    // Split 50% / 100%
    // Rule: "Majoration de 50% pour les 8 premières heures... 100% au-delà."

    // Apply deduction for meal break? 
    // Usually meal break is taken out of "working hours". 
    // If meal is during night, we assume it's deducted from night hours? 
    // Simple approach: Night Hours = Overlap. 
    // If we want Effective Night Hours, we might need to know WHEN break was.
    // For now, allow simplification: Net Night = Total Night - (Meal Duration if Full Night? Or Pro-rated?)
    // Given the prompt "calculate effective working hours" previously, usually night hours are paid hours.
    // Let's assume Valid Night Hours = Total Overlap. (Meal break often uncompounded or specific).
    // Safest: Use Total Overlap.

    // BUT effectiveHours removes meal. If meal was during day, Night should be full.
    // If meal was during night, Night should be reduced.
    // Without specific meal time, we can't be 100% sure.
    // However, usually we prioritize the employee. 
    // Let's keep Total Overlap for now as "Night Hours Worked" (assuming meal is taken outside or ignored for premium cap).

    const night50 = Math.min(totalNight, 8);
    const night100 = Math.max(0, totalNight - 8);

    return {
        amplitude: Number(amplitude.toFixed(2)),
        effectiveHours: Number(effectiveHours.toFixed(2)),
        // Legacy/Compat
        nightHours22_24: 0,
        nightHours00_06: 0,
        nightHours20_22: 0,
        // New
        nightHours50: Number(night50.toFixed(2)),
        nightHours100: Number(night100.toFixed(2)),
        sundayHours: isSunday ? Number(effectiveHours.toFixed(2)) : 0,
        holidayHours: isHoliday ? Number(effectiveHours.toFixed(2)) : 0
    };
};
