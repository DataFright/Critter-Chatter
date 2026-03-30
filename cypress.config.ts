import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:3010',
    specPattern: 'tests/e2e/**/*.cy.{ts,js}',
    supportFile: false,
    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
      reportDir: 'tests/reports/cypress',
      reportFilename: 'index',
      overwrite: true,
      html: true,
      json: true,
      saveJson: true,
      saveAllAttempts: false,
      inlineAssets: true,
    },
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('cypress-mochawesome-reporter/plugin')(on)
      return config
    },
    video: true,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 1,
      openMode: 1,
    },
    defaultCommandTimeout: 12000,
    responseTimeout: 45000,
    pageLoadTimeout: 35000,
  },
})
