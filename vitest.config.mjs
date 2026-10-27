import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.test', override: true })

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // One worker so DB writes from one file don't race with reads in another
    maxWorkers: 1,
    minWorkers: 1,
    // Cleanup before + after every run — deletes test records, collectives, users
    globalSetup: './tests/globalSetup.js',
  },
})
