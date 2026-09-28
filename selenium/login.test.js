const { By, until, Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const excelFile = path.join(__dirname, "selenium_test_results.xlsx");


// ============================================================
// SAVE TEST RESULT TO EXCEL
// ============================================================

function saveResult(status, actualResult) {

    let workbook;

    // Open existing Excel file
    if (fs.existsSync(excelFile)) {
        workbook = XLSX.readFile(excelFile);
    } else {
        workbook = XLSX.utils.book_new();
    }

    let worksheet;

    // Get existing Test Results sheet
    if (workbook.Sheets["Test Results"]) {

        worksheet = workbook.Sheets["Test Results"];

    } else {

        // Create sheet if it doesn't exist
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


    // ========================================================
    // FIND TC-LOGIN-001
    // ========================================================

    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    let testCaseRow = -1;

    for (let row = range.s.r + 1; row <= range.e.r; row++) {

        const cell = worksheet[
            XLSX.utils.encode_cell({
                r: row,
                c: 0
            })
        ];

        if (cell && cell.v === "TC-LOGIN-001") {

            testCaseRow = row;
            break;
        }
    }


    // ========================================================
    // IF TEST CASE DOESN'T EXIST, CREATE IT
    // ========================================================

    if (testCaseRow === -1) {

        testCaseRow = range.e.r + 1;

        worksheet[
            XLSX.utils.encode_cell({
                r: testCaseRow,
                c: 0
            })
        ] = {
            t: "s",
            v: "TC-LOGIN-001"
        };

        worksheet[
            XLSX.utils.encode_cell({
                r: testCaseRow,
                c: 1
            })
        ] = {
            t: "s",
            v: "Google OAuth Login"
        };

        worksheet[
            XLSX.utils.encode_cell({
                r: testCaseRow,
                c: 2
            })
        ] = {
            t: "s",
            v: "User successfully logs in using Google and is redirected to Swap-and-Share"
        };

    }


    // ========================================================
    // UPDATE ONLY THIS TEST CASE
    // ========================================================

    worksheet[
        XLSX.utils.encode_cell({
            r: testCaseRow,
            c: 3
        })
    ] = {
        t: "s",
        v: actualResult
    };


    worksheet[
        XLSX.utils.encode_cell({
            r: testCaseRow,
            c: 4
        })
    ] = {
        t: "s",
        v: status
    };


    worksheet[
        XLSX.utils.encode_cell({
            r: testCaseRow,
            c: 5
        })
    ] = {
        t: "s",
        v: new Date().toLocaleString()
    };


    // Make sure Excel knows about the used range
    worksheet["!ref"] = XLSX.utils.encode_range({
        s: range.s,
        e: {
            r: Math.max(range.e.r, testCaseRow),
            c: 5
        }
    });


    // Save Excel
    XLSX.writeFile(workbook, excelFile);

    console.log(`Excel report saved to: ${excelFile}`);
}


// ============================================================
// CONNECT TO EXISTING OPERA
// ============================================================

async function createOperaDriver() {

    const options = new chrome.Options();

    // Opera executable
    options.setChromeBinaryPath("/usr/bin/opera");

    // Connect to already-running Opera
    options.debuggerAddress("127.0.0.1:9222");

    return await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();
}


// ============================================================
// GOOGLE LOGIN TEST
// ============================================================

(async function googleLoginTest() {

    const driver = await createOperaDriver();

    try {

        console.log("Opening Swap-and-Share login page in Opera...");

        await driver.get("http://localhost:5173/login");


        // ====================================================
        // FIND GOOGLE LOGIN BUTTON
        // ====================================================

        const googleButton = await driver.wait(
            until.elementLocated(
                By.xpath("//button[contains(., 'Sign in with Google')]")
            ),
            10000
        );

        console.log("Google login button found.");


        // ====================================================
        // CLICK GOOGLE LOGIN
        // ====================================================

        await googleButton.click();

        console.log("Google login clicked.");


        // ====================================================
        // WAIT FOR GOOGLE
        // ====================================================

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
        console.log("Complete Google login in Opera.");
        console.log("Waiting for redirect...");
        console.log("======================================");
        console.log("");


        // ====================================================
        // WAIT FOR REDIRECT
        // ====================================================

        await driver.wait(
            async () => {

                const url = await driver.getCurrentUrl();

                return url.startsWith("http://localhost:5173");

            },
            120000
        );

        console.log("Successfully redirected to Swap-and-Share.");


        // ====================================================
        // VERIFY AUTHENTICATION
        // ====================================================

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


        // ====================================================
        // LOGIN FAILED
        // ====================================================

        if (response.includes("Not authenticated")) {

            saveResult(
                "FAIL",
                "Google OAuth completed but /auth/user returned Not authenticated."
            );

            throw new Error("User is not authenticated.");

        }


        // ====================================================
        // LOGIN PASSED
        // ====================================================

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


        // ====================================================
        // SAVE FAILURE
        // ====================================================

        saveResult(
            "FAIL",
            `Test failed: ${error.message}`
        );

    }


    finally {

        // Do NOT close Opera because Selenium
        // is attached to your existing Opera session.

        console.log("Opera left open.");

    }

})();

