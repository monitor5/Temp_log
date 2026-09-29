import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: {timeout: 10000},
  outputDir: 'artifacts/browser-qa/test-output',
  reporter: [['list'], ['json', {outputFile: 'artifacts/browser-qa/results.json'}]],
  use: {
    baseURL: process.env.BROWSER_QA_URL || 'http://localhost:8081',
    browserName: 'chromium',
    launchOptions: process.env.QA_BROWSER_EXECUTABLE ? {executablePath: process.env.QA_BROWSER_EXECUTABLE} : {},
    screenshot: 'only-on-failure',
    trace: 'off', // Login/session data must never leak into CI trace artifacts.
    video: 'off',
    viewport: {width: 1440, height: 1000},
    reducedMotion: 'reduce',
  },
});
