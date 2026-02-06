
import { analyzePDTText } from "../services/pdtAnalysis";

const tests = [
    {
        name: "Standard Date Format (DD/MM/YYYY)",
        text: `
            Jour de tournage 5
            Lundi 10/11/2024
            Mardi 11/11/2024
            Mercredi 12/11/2024
        `,
        expected: {
            dates: 3
        }
    },
    {
        name: "Date with Jour Off (Should be ignored in count)",
        text: `
            Lundi 10/11/2024
            Mardi 11/11/2024
            Mercredi 12/11/2024 - Jour Off
            Jeudi 13/11/2024
        `,
        expected: {
            dates: 3 // 10, 11, 13 (12 is Off)
        }
    },
    {
        name: "Textual Date Split (French)",
        text: `
            Planning
            4
            Octobre
            2025
            
            5
            Octobre
            2025
        `,
        expected: {
            dates: 2
        }
    },
    {
        name: "Start Day Offset Detection",
        text: `
            15ème jour de tournage
            Bla bla
        `,
        expected: {
            startDayOffset: 14,
            startDayInfoMatch: "15ème jour"
        }
    },
    {
        name: "APNEA Header Confusion (Mar != Mars)",
        text: `
            Jour Lun Mar Mer Jeu Ven Sam Dim Lun Mar Mer Jeu Ven Sam Dim
            N° 07 Date 4 5 6 7 8 9 10 11 12 13 14 15 16 17
            8 SEPTEMBRE 2021 Mois Octobre Octobre Octobre Octobre Octobre Octobre
        `,
        expected: {
            dates: 10 // 4-17 Oct: 14 days total. -5 weekends (4,9,10,16,17) = 9 working days. + 1 textual "8 Septembre" = 10.
        }
    }
];

async function runTests() {
    console.log("Running PDT Logic Tests...\n");
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        console.log(`[TEST] ${test.name}`);
        try {
            const result = analyzePDTText(test.text);

            let testPassed = true;
            if (test.expected.dates !== undefined && result.dates !== test.expected.dates) {
                console.error(`   FAIL: Expected ${test.expected.dates} dates, got ${result.dates}`);
                console.error(`   Debug Dates:\n${result.debugDates}`);
                testPassed = false;
            }

            if (test.expected.startDayOffset !== undefined && result.startDayOffset !== test.expected.startDayOffset) {
                console.error(`   FAIL: Expected startDayOffset ${test.expected.startDayOffset}, got ${result.startDayOffset}`);
                testPassed = false;
            }

            if (test.expected.startDayInfoMatch && !result.startDayInfo.includes(test.expected.startDayInfoMatch)) {
                console.error(`   FAIL: Expected startDayInfo to contain "${test.expected.startDayInfoMatch}", got "${result.startDayInfo}"`);
                testPassed = false;
            }

            if (testPassed) {
                console.log("   PASS");
                passed++;
            } else {
                failed++;
            }

        } catch (e) {
            console.error(`   ERROR: Exception during test`, e);
            failed++;
        }
        console.log("-----------------------------------");
    }

    console.log(`\nResults: ${passed} Passed, ${failed} Failed.`);
}

runTests();
