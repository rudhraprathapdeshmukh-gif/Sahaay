import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import Home from '@/pages/Home'
import SignIn from '@/pages/SignIn'
import SignUp from '@/pages/SignUp'
import AdminLogin from '@/pages/AdminLogin'
import ProviderOnboarding from '@/pages/ProviderOnboarding'
import ServicesPage from '@/pages/ServicesPage'
import HowItWorksPage from '@/pages/HowItWorksPage'
import TrustPage from '@/pages/TrustPage'
import PrivacyPage from '@/pages/PrivacyPage'
import CleanupPage from '@/pages/admin/CleanupPage'
import RoleDashboardRouter from '@/components/RoleDashboardRouter'
import ChatWidget from '@/components/ChatWidget'
import ToastContainer, { showToast, useNotificationSound } from '@/components/ToastNotification'
import { subscribeToNotifications } from '@/lib/notifications'
import { useEffect } from 'react'

function NotificationListener() {
  const { user } = useAuth()
  const playSound = useNotificationSound(true)

  useEffect(() => {
    if (!user?.id) return

    // Subscribe to real-time notifications
    const subscription = subscribeToNotifications(
      user.id,
      (notification) => {
        // Play sound
        playSound()

        // Show toast popup
        showToast({
          title: notification.title,
          body: notification.body,
          type: notification.type
        })
      },
      (error) => {
        console.error('Notification subscription error:', error)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id, playSound])

  return null
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <NotificationListener />
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/trust" element={<TrustPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin/cleanup" element={<CleanupPage />} />
          <Route path="/provider-onboarding" element={<ProviderOnboarding />} />
          <Route path="/bookings" element={<RoleDashboardRouter role="customer" />} />
          <Route path="/request" element={<RoleDashboardRouter role="customer" />} />
          <Route path="/history" element={<RoleDashboardRouter role="customer" />} />
          <Route path="/profile" element={<RoleDashboardRouter role="customer" />} />
          <Route path="/notifications" element={<RoleDashboardRouter role="customer" />} />
          <Route path="/help-support" element={<RoleDashboardRouter role="customer" />} />
          <Route path="/customer" element={<RoleDashboardRouter role="customer" />} />
          <Route path="/customer/*" element={<RoleDashboardRouter role="customer" />} />
          <Route path="/provider/*" element={<RoleDashboardRouter role="provider" />} />
          <Route path="/admin/*" element={<RoleDashboardRouter role="admin" />} />
        </Routes>
        <ChatWidget />
        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
  )
}

export default App