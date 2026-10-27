import { fullCleanup } from './helpers/cleanup.js'

export default async function teardown() {
  console.log('\n── Post-test Cleanup ───────────────────────')
  await fullCleanup()
}
