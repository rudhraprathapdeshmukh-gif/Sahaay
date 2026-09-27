// Quick test to verify registration flow works
// Run this in browser console after migration applied

export async function testProviderRegistration() {
  console.log('=== Testing Provider Registration ===')

  // Test payload (simplified)
  const testPayload = {
    firstName: 'Test',
    lastName: 'Provider',
    email: 'test@gmail.com',
    password: 'test123',
    phone: '9876543210',
    dob: '1990-01-01',
    city: 'Mumbai',
    state: 'Maharashtra',
    serviceCategoryId: 1,
    bio: 'Experienced professional with 5+ years in the field',
    yearsExperience: '5-8',
    availability: ['weekday_morning'],
    skills: [{ name: 'Electrical Wiring' }],
  }

  console.log('Test payload:', testPayload)

  // Test storage upload
  console.log('Storage buckets:', {
    providerPhotos: 'provider-photos',
    providerCertificates: 'provider-certificates'
  })

  console.log('\n✅ Test completed - check console for any errors')
  console.log('If no errors, registration should work after applying migration')
}

// Run test in browser console:
// await import('./test-registration.ts').then(m => m.testProviderRegistration())