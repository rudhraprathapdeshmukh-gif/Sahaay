const fs = require('fs');
let code = fs.readFileSync('src/pages/provider/ProviderDashboard.tsx', 'utf8');

// Add getCurrentLocation, watchLocation import
if (!code.includes('getCurrentLocation')) {
  code = code.replace(
    /import \{ fetchProviderHomeData, updateBookingStatus, BookingWithDetails \} from '@\/lib\/providers'/,
    "import { fetchProviderHomeData, updateBookingStatus, BookingWithDetails } from '@/lib/providers'\nimport { getCurrentLocation, watchLocation } from '@/lib/geolocation'"
  );
}

// Replace toggleLiveStatus
const newToggle = `  const toggleLiveStatus = async () => {
    if (!user?.id || !data?.provider) return

    const newStatus = !isLive
    setIsLive(newStatus)

    if (newStatus) {
      setTrackingStatus('Fetching location...')
      try {
        // Use our robust multi-tier fallback instead of raw browser API
        const loc = await getCurrentLocation()
        
        await supabase
          .from('service_providers')
          .update({
            is_available: true,
            latitude: loc.latitude,
            longitude: loc.longitude,
          })
          .eq('user_id', user.id)
          
        await supabase
          .from('users')
          .update({
            latitude: loc.latitude,
            longitude: loc.longitude,
          })
          .eq('id', user.id)

        setData((prev: any) => ({
          ...prev,
          provider: {
            ...prev.provider,
            is_available: true,
            latitude: loc.latitude,
            longitude: loc.longitude,
          }
        }))

        setTrackingStatus('Live')

        // Start watching for real-time changes
        const cleanupWatch = watchLocation(
          async (newLoc) => {
             await supabase.from('service_providers').update({ latitude: newLoc.latitude, longitude: newLoc.longitude }).eq('user_id', user.id)
             await supabase.from('users').update({ latitude: newLoc.latitude, longitude: newLoc.longitude }).eq('id', user.id)
          },
          (err) => console.warn('Watch location non-fatal error:', err)
        )
        // store the cleanup function in ref (cast to any since it's a function not number)
        watchId.current = cleanupWatch as any
      } catch (err) {
        console.error('Location detection failed:', err)
        setIsLive(false)
        setTrackingStatus('Location error. Try again.')
      }
    } else {
      setTrackingStatus('Going offline...')
      if (watchId.current) {
        if (typeof watchId.current === 'function') {
           (watchId.current as Function)()
        } else {
           navigator.geolocation.clearWatch(watchId.current as number)
        }
        watchId.current = null
      }

      await supabase
        .from('service_providers')
        .update({ is_available: false })
        .eq('user_id', user.id)

      setData((prev: any) => ({
        ...prev,
        provider: {
          ...prev.provider,
          is_available: false,
        }
      }))

      setTrackingStatus('Offline')
    }
  }`;

// Find current toggleLiveStatus block and replace
code = code.replace(/  const toggleLiveStatus \= async \(\) \=\> \{[\s\S]*?    \}\n  \}/, newToggle);

fs.writeFileSync('src/pages/provider/ProviderDashboard.tsx', code, 'utf8');
console.log('Patched ProviderDashboard toggleLiveStatus');
