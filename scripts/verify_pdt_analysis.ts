
import { analyzePDTText } from "../services/pdtAnalysis";

console.log("Starting Stress Test for PDT Analysis...");

const testCases = [
    { name: "Empty String", text: "" },
    { name: "Null-like content", text: "   \n  " },
    { name: "Simple Date", text: "Le 4 Octobre 2021" },
    // "Mardi" check - should NOT match
    { name: "Mardi check", text: "Mardi 9" },
    // "Mars" check - SHOULD match
    { name: "Mars check", text: "9 Mars 2021" },
    // Edge case: Numeric date with spaces
    { name: "Numeric Spaced", text: "05 / 10 / 2021" },
    // Edge case: Invalid date parts
    { name: "Invalid Numeric", text: "99/99/2021" },
    // French Abbr
    { name: "French Abbr", text: "15 oct 2021" },
    // Weird case causing potentially NaN
    { name: "Partial Numeric", text: "12/" }
];

let failed = false;

testCases.forEach(tc => {
    try {
        console.log(`Testing: ${tc.name}`);
        const result = analyzePDTText(tc.text);
        console.log(` -> Success. Dates found: ${result.dates}. Period: ${result.period}`);
    } catch (e: any) {
        console.error(` -> FAILED: ${tc.name}`);
        console.error(e);
        failed = true;
    }
});

if (failed) {
    console.error("Stress Test FAILED");
    process.exit(1);
} else {
    console.log("Stress Test PASSED");
}
