import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import client from '../api/client'

const FARMER_ONBOARDING_UPDATED_EVENT = 'farmer-onboarding-updated'

export function getRoleDefaultRoute(accountType?: string) {
  const role = String(accountType || '').toLowerCase()
  if (role === 'farmer') return '/onboarding/farmer'
  if (role === 'technician') return '/services'
  return '/learn'
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const isFarmer = String(user?.accountType || '').toLowerCase() === 'farmer'
  const [checkingFarmerSetup, setCheckingFarmerSetup] = useState(isFarmer)
  const [farmerOnboardingCompleted, setFarmerOnboardingCompleted] = useState(false)

  useEffect(() => {
    const onFarmerOnboardingUpdated = (event: Event) => {
      const payload = (event as CustomEvent<{ completed?: boolean }>).detail
      if (payload && typeof payload.completed === 'boolean') {
        setFarmerOnboardingCompleted(payload.completed)
      }
    }

    window.addEventListener(FARMER_ONBOARDING_UPDATED_EVENT, onFarmerOnboardingUpdated)
    return () => {
      window.removeEventListener(FARMER_ONBOARDING_UPDATED_EVENT, onFarmerOnboardingUpdated)
    }
  }, [])

  useEffect(() => {
    if (!isFarmer || !isAuthenticated) {
      setCheckingFarmerSetup(false)
      setFarmerOnboardingCompleted(true)
      return
    }

    setCheckingFarmerSetup(true)
    client.get('/api/users/preferences')
      .then((res) => {
        setFarmerOnboardingCompleted(Boolean(res.data?.farmerOnboarding?.completed))
      })
      .catch(() => {
        setFarmerOnboardingCompleted(false)
      })
      .finally(() => setCheckingFarmerSetup(false))
  }, [isAuthenticated, isFarmer])

  if (!isAuthenticated) return <Navigate to="/" replace />
  if (isFarmer && checkingFarmerSetup) return null

  if (isFarmer && !farmerOnboardingCompleted && location.pathname !== '/onboarding/farmer') {
    return <Navigate to="/onboarding/farmer" replace />
  }

  if (isFarmer && farmerOnboardingCompleted && location.pathname === '/onboarding/farmer') {
    return <Navigate to="/seller/dashboard" replace />
  }

  return <>{children}</>
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  return isAuthenticated ? <Navigate to={getRoleDefaultRoute(user?.accountType)} replace /> : <>{children}</>
}

export function FarmerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/" replace />
  return String(user?.accountType || '').toLowerCase() === 'farmer'
    ? <>{children}</>
    : <Navigate to={getRoleDefaultRoute(user?.accountType)} replace />
}
