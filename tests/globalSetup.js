import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Absolute path — globalSetup runs in its own process with unknown cwd
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.local') })
dotenv.config({ path: path.join(root, '.env.test'), override: true })

import { cleanRecordsOnly, fullCleanup } from './helpers/cleanup.js'

export async function setup() {
  console.log('\n── Pre-test Cleanup (records only) ─────────')
  await cleanRecordsOnly()
}

export async function teardown() {
  console.log('\n── Post-test Cleanup (full) ────────────────')
  await fullCleanup()
}
