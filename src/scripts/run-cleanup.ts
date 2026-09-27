/**
 * Direct database cleanup script
 * Run this to immediately delete all fake data
 */

import { cleanupFakeData, getFakeDataReport } from '@/lib/database-cleanup'

export async function executeCleanup() {
  console.log('🗑️  SAHAAY DATABASE CLEANUP')
  console.log('=' * 50)
  console.log()

  try {
    // Step 1: Get report
    console.log('📊 Step 1: Scanning database for fake data...')
    const report = await getFakeDataReport()

    console.log(`   Found ${report.fakeUsersCount} fake users`)
    console.log(`   Found ${report.fakeProvidersCount} fake providers`)
    console.log()

    if (report.fakeUsersCount === 0 && report.fakeProvidersCount === 0) {
      console.log('✅ No fake data found! Database is clean.')
      return
    }

    // Show samples
    if (report.sampleFakeUsers.length > 0) {
      console.log('Sample fake users to be deleted:')
      report.sampleFakeUsers.forEach((u) => {
        console.log(`   ❌ ${u.full_name} (${u.email})`)
      })
      console.log()
    }

    // Step 2: Run cleanup
    console.log('🔄 Step 2: Deleting fake data...')
    const result = await cleanupFakeData()

    console.log()
    console.log('✅ CLEANUP COMPLETE!')
    console.log('=' * 50)
    console.log(`Deleted: ${result.results.fakeProvidersDeleted} fake providers`)
    console.log(`Deleted: ${result.results.fakeUsersDeleted} fake users`)
    console.log()
    console.log(result.summary)

    if (result.errors.length > 0) {
      console.log()
      console.log('⚠️  Some errors occurred:')
      result.errors.forEach((err) => console.log(`   - ${err}`))
    }

    return result
  } catch (error) {
    console.error('❌ CLEANUP FAILED:')
    console.error(error)
    throw error
  }
}

// Auto-run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  executeCleanup()
}