const { By, until, Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const excelFile = path.join(__dirname, "selenium_test_results.xlsx");

function saveResult(testCaseId, scenario, expectedResult, actualResult, status) {

    let workbook;
    let worksheet;

    // Open existing Excel file
    if (fs.existsSync(excelFile)) {

        workbook = XLSX.readFile(excelFile);

        if (workbook.Sheets["Test Results"]) {
            worksheet = workbook.Sheets["Test Results"];
        } else {
            worksheet = XLSX.utils.aoa_to_sheet([
                [
                    "Test Case ID",
                    "Test Scenario",
                    "Expected Result",
                    "Actual Result",
                    "Status",
                    "Execution Date"
                ]
            ]);

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Test Results"
            );
        }

    } else {

        workbook = XLSX.utils.book_new();

        worksheet = XLSX.utils.aoa_to_sheet([
            [
                "Test Case ID",
                "Test Scenario",
                "Expected Result",
                "Actual Result",
                "Status",
                "Execution Date"
            ]
        ]);

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Test Results"
        );
    }


    // Append new test result
    XLSX.utils.sheet_add_aoa(
        worksheet,
        [[
            testCaseId,
            scenario,
            expectedResult,
            actualResult,
            status,
            new Date().toLocaleString()
        ]],
        {
            origin: -1
        }
    );

    XLSX.writeFile(workbook, excelFile);

    console.log(`Excel report saved to: ${excelFile}`);
}


// ============================================================
// CONNECT TO EXISTING OPERA
// ============================================================

async function createOperaDriver() {

    const options = new chrome.Options();

    // IMPORTANT:
    // Change this path if your Opera executable is different.
    options.setChromeBinaryPath("/usr/bin/opera");

    // Connect to manually opened Opera
    options.debuggerAddress("127.0.0.1:9222");

    return await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();
}


// ============================================================
// LOGOUT TEST SUITE
// ============================================================

(async function logoutTest() {

    const driver = await createOperaDriver();

    try {

        console.log("");
        console.log("======================================");
        console.log("STARTING LOGOUT TEST SUITE");
        console.log("======================================");


        // ====================================================
        // TC-LOGOUT-001
        // Verify authenticated user can logout
        // ====================================================

        console.log("");
        console.log("TC-LOGOUT-001: User Logout");


        await driver.get("http://localhost:5173/");

        console.log("Opening Swap-and-Share home page...");


        // Wait for Logout button
        const logoutButton = await driver.wait(
            until.elementLocated(
                By.xpath("//button[normalize-space()='Logout']")
            ),
            10000
        );


        console.log("Authenticated user detected.");
        console.log("Logout button found.");


        // Click Logout
        await logoutButton.click();

        console.log("Logout button clicked.");


        // Wait for redirect to Home
        await driver.wait(
            async () => {

                const url = await driver.getCurrentUrl();

                return url &&
                    url === "http://localhost:5173/";

            },
            10000
        );


        console.log("User redirected to Home page.");


        // Verify Login button appears
        const loginButton = await driver.wait(
            until.elementLocated(
                By.xpath("//a[normalize-space()='Login']")
            ),
            10000
        );


        if (!loginButton) {

            throw new Error(
                "Login button was not displayed after logout."
            );

        }


        console.log("Login button displayed after logout.");


        saveResult(
            "TC-LOGOUT-001",
            "Authenticated user logout",
            "User should be logged out, redirected to Home, and shown the Login option.",
            "User successfully logged out, was redirected to Home, and the Login option was displayed.",
            "PASS"
        );


        console.log("TC-LOGOUT-001 PASSED");


        // ====================================================
        // TC-LOGOUT-002
        // Verify server-side session invalidation
        // ====================================================

        console.log("");
        console.log("TC-LOGOUT-002: Session Invalidation");


        await driver.get("http://localhost:5000/auth/user");


        await driver.wait(
            until.elementLocated(
                By.tagName("body")
            ),
            5000
        );


        const response = await driver
            .findElement(By.tagName("body"))
            .getText();


        console.log("Authentication API response:");
        console.log(response);


        if (
            response.includes("Not authenticated") ||
            response.includes("401")
        ) {

            console.log("Session successfully invalidated.");

            saveResult(
                "TC-LOGOUT-002",
                "Verify session invalidation after logout",
                "Authenticated session should be destroyed and /auth/user should reject the request.",
                "Logout successfully destroyed the session. /auth/user returned Not authenticated.",
                "PASS"
            );

            console.log("TC-LOGOUT-002 PASSED");

        } else {

            saveResult(
                "TC-LOGOUT-002",
                "Verify session invalidation after logout",
                "Authenticated session should be destroyed and /auth/user should reject the request.",
                `Session may still be active. /auth/user returned: ${response}`,
                "FAIL"
            );

            throw new Error(
                "User session is still authenticated after logout."
            );
        }


        // ====================================================
        // FINAL RESULT
        // ====================================================

        console.log("");
        console.log("======================================");
        console.log("GOOGLE LOGOUT TEST SUITE PASSED");
        console.log("======================================");

    }


    catch (error) {

        console.error("");
        console.error("======================================");
        console.error("LOGOUT TEST SUITE FAILED");
        console.error("======================================");

        console.error(error.message);


        saveResult(
            "TC-LOGOUT-ERROR",
            "Logout test execution",
            "Logout test suite should execute successfully.",
            `Test execution failed: ${error.message}`,
            "FAIL"
        );

    }


    finally {

        // IMPORTANT:
        // Do NOT close Opera because Selenium
        // is attached to the existing Opera session.

        console.log("");
        console.log("Opera left open.");

    }

})();