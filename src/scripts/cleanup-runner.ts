/**
 * Database cleanup script - run this to remove fake data
 * Execute from the browser console or integrate into an admin panel
 */

import { cleanupFakeData, getFakeDataReport } from '@/lib/database-cleanup'

async function runCleanup() {
  console.log('🔍 Starting fake data detection...\n')

  try {
    // First, get a report of what will be deleted
    console.log('📊 Generating report of fake data...')
    const report = await getFakeDataReport()

    console.log('\n=== FAKE DATA REPORT ===')
    console.log(`Fake Users Found: ${report.fakeUsersCount}`)
    console.log(`Fake Providers Found: ${report.fakeProvidersCount}`)

    if (report.sampleFakeUsers.length > 0) {
      console.log('\nSample Fake Users:')
      report.sampleFakeUsers.forEach((u) => {
        console.log(`  - ${u.full_name} (${u.email})`)
      })
    }

    if (report.sampleFakeProviders.length > 0) {
      console.log('\nSample Fake Providers:')
      report.sampleFakeProviders.forEach((p) => {
        console.log(`  - Bio: ${p.bio?.substring(0, 50)}...`)
      })
    }

    console.log('\n⚠️  Proceeding with cleanup in 3 seconds...\n')

    // Wait 3 seconds then run cleanup
    await new Promise(resolve => setTimeout(resolve, 3000))

    console.log('🗑️  Executing cleanup...')
    const result = await cleanupFakeData()

    console.log('\n=== CLEANUP RESULTS ===')
    console.log(`✅ ${result.results.fakeProvidersDeleted} fake providers deleted`)
    console.log(`✅ ${result.results.fakeUsersDeleted} fake users deleted`)
    console.log(`\n${result.summary}`)

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      result.errors.forEach((err) => console.log(`  - ${err}`))
    } else {
      console.log('\n✅ Cleanup completed successfully with no errors!')
    }

    return result
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    throw error
  }
}

export default runCleanup