/**
 * Full teardown: deletes all test records, collectives, memberships, and users.
 * The next `npm test` will re-seed fresh users automatically.
 *
 * Run with: npm run test:gc
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.test', override: true })

import { fullCleanup } from './helpers/cleanup.js'

console.log('\n── Test Cleanup ────────────────────────────')
fullCleanup().catch(err => { console.error(err); process.exit(1) })
