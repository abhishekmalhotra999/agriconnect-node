import { Link } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

export default function OnboardingPage() {
  return (
    <div className="onboard-screen">
      <div className="onboard-card onboard-card-polished">
        <div className="agri-logo-block mb-3">
          <BrandLogo className="brand-logo-onboard" />
        </div>

        <div className="onboard-hero mb-4">
          <div className="onboard-orb" />
          <div className="onboard-farm" />
        </div>

        <h1 className="text-center mb-2">Welcome to AgriConnect Liberia</h1>
        <p className="text-center text-muted mb-4">
          A platform that bridges the gap between producers and consumers for convenient trade and smart learning.
        </p>

        <div className="d-flex justify-content-center gap-2 mb-3">
          <Link to="/otp" className="btn btn-agri px-4">Sign Up</Link>
          <Link to="/login" className="btn btn-outline-agri px-4">Sign In</Link>
        </div>

        <div className="text-center small text-muted d-flex justify-content-center gap-1">
          <span>Already have OTP?</span>
          <Link to="/otp">Verify now</Link>
        </div>
      </div>
    </div>
  )
}
