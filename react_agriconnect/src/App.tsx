import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { FarmerRoute, GuestRoute, ProtectedRoute } from './routes/RouteGuards'
import AppShell from './layouts/AppShell'
import OnboardingPage from './pages/OnboardingPage'
import LoginPage from './pages/LoginPage'
import OtpPage from './pages/OtpPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LearnPage from './pages/LearnPage'
import MarketplacePage from './pages/MarketplacePage'
import ProductDetailPage from './pages/ProductDetailPage'
import ServicesPage from './pages/ServicesPage'
import ServiceDetailPage from './pages/ServiceDetailPage'
import CourseDetailPage from './pages/CourseDetailPage'
import MyLearningPage from './pages/MyLearningPage'
import MyRequestsPage from './pages/MyRequestsPage'
import ProfilePage from './pages/ProfilePage'
import PrivacyPage from './pages/PrivacyPage'
import SavedPage from './pages/SavedPage'
import FarmerOnboardingPage from './pages/FarmerOnboardingPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import SellerProductsPage from './pages/SellerProductsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<GuestRoute><OnboardingPage /></GuestRoute>} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/otp" element={<GuestRoute><OtpPage /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
          <Route path="/onboarding/farmer" element={<ProtectedRoute><FarmerOnboardingPage /></ProtectedRoute>} />

          <Route
            path="/"
            element={<ProtectedRoute><AppShell /></ProtectedRoute>}
          >
            <Route path="learn" element={<LearnPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="marketplace/:id" element={<ProductDetailPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:id" element={<ServiceDetailPage />} />
            <Route path="my-requests" element={<MyRequestsPage />} />
            <Route path="courses/:id" element={<CourseDetailPage />} />
            <Route path="my-learning" element={<MyLearningPage />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="seller/dashboard" element={<FarmerRoute><SellerDashboardPage /></FarmerRoute>} />
            <Route path="seller/products" element={<FarmerRoute><SellerProductsPage /></FarmerRoute>} />
            <Route path="privacy" element={<PrivacyPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
