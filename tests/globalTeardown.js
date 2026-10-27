import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.test', override: true })

import { fullCleanup } from './helpers/cleanup.js'

export default async function teardown() {
  console.log('\n── Post-test Cleanup ───────────────────────')
  await fullCleanup()
}
