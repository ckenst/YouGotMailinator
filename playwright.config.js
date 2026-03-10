// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
    testDir: './tests',
    /* Maximum time one test can run for */
    timeout: 30 * 1000,
    expect: {
        /* Maximum time for expect() assertions */
        timeout: 5000
    },
    /* Run tests in files in parallel */
    fullyParallel: false,
    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 1 : 0,
    /* Reporter to use */
    reporter: 'list',
    /* Shared settings for all projects */
    use: {
        /* Base URL — override with BASE_URL env var in CI */
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        /* Collect trace on first retry */
        trace: 'on-first-retry',
        /* Take screenshot on failure */
        screenshot: 'only-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ],
    /* Start the local dev server before running tests */
    webServer: {
        command: 'node server.js',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe'
    }
});
