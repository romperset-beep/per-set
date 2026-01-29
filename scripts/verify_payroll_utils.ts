
import { calculateShiftDetails } from '../utils/payrollUtils.ts';

console.log("--- VERIFYING PAYROLL UTILS INTEGRATION ---");

// Test Case: GUYON JEAN PAUL (Line 10)
// Lundi: 16:00 -> 02:40 (lendemain)
// Repas: 1h

const testShift = {
    start: '16:00',
    end: '02:40',
    mealDuration: 1,
    date: '2024-01-15' // Required for seasonal logic
};

const result = calculateShiftDetails(testShift);

console.log("Input:", testShift);
console.log("Result:", result);

// Expected:
// Night 22-24: 2.0
// Night 00-06: 2.67 (approx)

if (result.nightHours22_24 === 2.0 && result.nightHours00_06 > 2.6) {
    console.log("SUCCESS: Logic matches expectations.");
} else {
    console.log("FAILURE: Logic mismatch.");
}
