const {
    By,
    until,
    APP_URL,
    runCase,
    createDriver,
} = require("./helpers/common");

const TESTS = {

    inventoryLoads: {
        id: "TC-PRODUCT-001",
        scenario: "Product inventory loads",
        expected: "Products should be displayed on the Shop/Inventory page.",
    },

    productInformation: {
        id: "TC-PRODUCT-002",
        scenario: "Product information is displayed",
        expected: "Each displayed product should contain product information such as name and price.",
    },

};


(async function productTests() {

    const driver = await createDriver();
    let allPassed = true;

    try {

        console.log("\n=== PRODUCT TEST SUITE ===");


        // ====================================================
        // TC-PRODUCT-001
        // Product Inventory Loads
        // ====================================================

        allPassed = (await runCase(
            TESTS.inventoryLoads,
            async () => {

                await driver.get(`${APP_URL}/shop`);

                await driver.wait(
                    until.elementLocated(By.tagName("body")),
                    10000
                );

                // Look for product cards/items on the Shop page.
                // Adjust this selector if your product component
                // uses a different class.
                const products = await driver.findElements(
                    By.css("[class*='product']")
                );

                if (products.length === 0) {
                    throw new Error(
                        "No products were displayed on the Shop page."
                    );
                }

                return `${products.length} product(s) displayed successfully on the Shop page.`;
            }
        )) && allPassed;


        // ====================================================
        // TC-PRODUCT-002
        // Product Information
        // ====================================================

        allPassed = (await runCase(
            TESTS.productInformation,
            async () => {

                await driver.get(`${APP_URL}/shop`);

                await driver.wait(
                    until.elementLocated(By.tagName("body")),
                    10000
                );

                const products = await driver.findElements(
                    By.css("[class*='product']")
                );

                if (products.length === 0) {
                    throw new Error(
                        "No product was available to verify."
                    );
                }

                const firstProduct = products[0];

                const productText = await firstProduct.getText();

                if (!productText || productText.trim().length === 0) {
                    throw new Error(
                        "Product card does not contain any visible information."
                    );
                }

                return `Product information successfully displayed: "${productText.trim()}".`;
            }
        )) && allPassed;


    } catch (error) {

        allPassed = false;

        console.error(
            "\n❌ PRODUCT SUITE ERROR:",
            error.message
        );

    } finally {

        console.log(
            `\n${allPassed ? "✅ PRODUCT SUITE PASSED" : "❌ PRODUCT SUITE FAILED"}`
        );

        console.log("Opera left open.");

        process.exit(allPassed ? 0 : 1);
    }

})();