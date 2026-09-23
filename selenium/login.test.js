const { By, until } = require("selenium-webdriver");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const createDriver = require("./helpers/driver");

const excelFile = path.join(__dirname, "selenium_test_results.xlsx");

function saveResult(status, actualResult) {

    let workbook;

    // If Excel file already exists, open it
    if (fs.existsSync(excelFile)) {
        workbook = XLSX.readFile(excelFile);
    } else {
        workbook = XLSX.utils.book_new();
    }

    let worksheet;

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
            ],
            [
                "TC-LOGIN-001",
                "Google OAuth Login",
                "User successfully logs in using Google and is redirected to Swap-and-Share",
                "",
                "",
                ""
            ]
        ]);

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Test Results"
        );
    }

    // Update test result
    worksheet["D2"] = {
        t: "s",
        v: actualResult
    };

    worksheet["E2"] = {
        t: "s",
        v: status
    };

    worksheet["F2"] = {
        t: "s",
        v: new Date().toLocaleString()
    };

    XLSX.writeFile(workbook, excelFile);

    console.log(`Excel report saved to: ${excelFile}`);
}


(async function googleLoginTest() {

    const driver = await createDriver();

    try {

        console.log("Opening Swap-and-Share login page...");

        await driver.get("http://localhost:5173/login");

        const googleButton = await driver.wait(
            until.elementLocated(
                By.xpath("//button[contains(., 'Sign in with Google')]")
            ),
            10000
        );

        console.log("Google login button found.");

        await googleButton.click();

        console.log("Google login clicked.");

        // Wait for Google
        await driver.wait(
            async () => {
                const url = await driver.getCurrentUrl();

                return url.includes("accounts.google.com");
            },
            15000
        );

        console.log("Google OAuth page opened.");

        console.log("");
        console.log("======================================");
        console.log("Complete Google login in Chrome.");
        console.log("Waiting for redirect...");
        console.log("======================================");
        console.log("");

        // Give yourself 2 minutes to complete Google login
        await driver.wait(
            async () => {

                const url = await driver.getCurrentUrl();

                return url.startsWith("http://localhost:5173");

            },
            120000
        );

        console.log("Successfully redirected to Swap-and-Share.");

        /*
         * Verify authentication
         */

        await driver.get("http://localhost:5000/auth/user");

        await driver.wait(
            until.elementLocated(By.tagName("body")),
            5000
        );

        const response = await driver
            .findElement(By.tagName("body"))
            .getText();

        console.log("Authentication response:");
        console.log(response);

        if (response.includes("Not authenticated")) {

            saveResult(
                "FAIL",
                "Google OAuth completed but /auth/user returned Not authenticated."
            );

            throw new Error("User is not authenticated.");

        }

        /*
         * TEST PASSED
         */

        saveResult(
            "PASS",
            "Google authentication successful. User was redirected to Swap-and-Share and /auth/user returned authenticated user data."
        );

        console.log("");
        console.log("======================================");
        console.log("✅ GOOGLE LOGIN TEST PASSED");
        console.log("======================================");

    }

    catch (error) {

        console.error("");
        console.error("❌ GOOGLE LOGIN TEST FAILED");
        console.error(error.message);

        // Save failure to Excel
        saveResult(
            "FAIL",
            `Test failed: ${error.message}`
        );

    }

    finally {

        await driver.quit();

    }

})();