import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getApiErrorMessage } from '../api/client'
import { getRoleDefaultRoute } from '../routes/RouteGuards'

const SIGNUP_PREFILL_KEY = 'agri_signup_prefill'

function readSignupPrefill(): { phone: string; accountType: string; name: string; email: string } {
  try {
    const raw = localStorage.getItem(SIGNUP_PREFILL_KEY)
    if (!raw) return { phone: '', accountType: 'customer', name: '', email: '' }
    const parsed = JSON.parse(raw) as { phone?: string; accountType?: string; name?: string; email?: string }
    return {
      phone: parsed.phone || '',
      accountType: parsed.accountType || 'customer',
      name: parsed.name || '',
      email: parsed.email || '',
    }
  } catch {
    return { phone: '', accountType: 'customer', name: '', email: '' }
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const prefill = useMemo(() => readSignupPrefill(), [])
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    accountType: prefill.accountType,
    phone: prefill.phone,
    email: prefill.email,
    name: prefill.name,
    address: '',
    farmSize: '',
    yearsOfExperience: '',
    farmingType: '',
    technicianType: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!prefill.phone) {
      navigate('/otp', { replace: true })
    }
  }, [navigate, prefill.phone])

  const validateStep = (targetStep: number) => {
    if (targetStep === 2) {
      if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
        setError('Name, phone, and address are required to continue.')
        return false
      }
      return true
    }

    if (targetStep === 3) {
      if (form.accountType === 'farmer') {
        if (!form.farmSize.trim() || !form.yearsOfExperience.trim() || !form.farmingType.trim()) {
          setError('Farmer setup requires farm size, years of experience, and farming type.')
          return false
        }
      }

      if (form.accountType === 'technician') {
        if (!form.yearsOfExperience.trim() || !form.technicianType.trim()) {
          setError('Technician setup requires years of experience and technician type.')
          return false
        }
      }
      return true
    }

    return true
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateStep(2) || !validateStep(3)) return

    try {
      if (!form.password || form.password.length < 6) {
        setError('Password must be at least 6 characters long.')
        return
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.')
        return
      }

      await signUp({
        phone: form.phone,
        name: form.name,
        email: form.email,
        address: form.address,
        farmSize: form.farmSize,
        yearsOfExperience: form.yearsOfExperience,
        farmingType: form.farmingType,
        technicianType: form.technicianType,
        professionType: capitalize(form.accountType),
        password: form.password,
        confirmPassword: form.confirmPassword,
      })
      localStorage.removeItem(SIGNUP_PREFILL_KEY)
      navigate(getRoleDefaultRoute(form.accountType))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Sign up failed'))
    }
  }

  const showFarmerFields = form.accountType === 'farmer'
  const showTechnicianFields = form.accountType === 'technician'

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Complete Profile</h2>
        <div className="small text-muted mb-2">Step {step} of 3</div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {step === 1 && (
          <>
            <div className="mb-2">
              <label className="form-label">Account Type</label>
              <input className="form-control" value={capitalize(form.accountType)} readOnly />
            </div>
            <div className="mb-2">
              <label className="form-label">Name</label>
              <input className="form-control" placeholder="Your name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div className="mb-2">
              <label className="form-label">Phone</label>
              <input className="form-control" placeholder="Your phone" value={form.phone} readOnly />
            </div>
            <div className="mb-2">
              <label className="form-label">Email</label>
              <input className="form-control" placeholder="Your email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="form-label">Address</label>
              <input className="form-control" placeholder="Your address" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} required />
            </div>
            <button
              type="button"
              className="btn btn-agri w-100 mt-2"
              onClick={() => {
                setError('')
                if (validateStep(2)) setStep(2)
              }}
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            {showFarmerFields && (
              <>
                <div className="mb-2">
                  <label className="form-label">Farm Size</label>
                  <input className="form-control" placeholder="e.g. 5 acres" value={form.farmSize} onChange={(e) => setForm((prev) => ({ ...prev, farmSize: e.target.value }))} required={showFarmerFields} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Years of Experience</label>
                  <input className="form-control" placeholder="e.g. 6" value={form.yearsOfExperience} onChange={(e) => setForm((prev) => ({ ...prev, yearsOfExperience: e.target.value }))} required={showFarmerFields} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Farming Type</label>
                  <input className="form-control" placeholder="e.g. Rice Farming" value={form.farmingType} onChange={(e) => setForm((prev) => ({ ...prev, farmingType: e.target.value }))} required={showFarmerFields} />
                </div>
              </>
            )}

            {showTechnicianFields && (
              <>
                <div className="mb-2">
                  <label className="form-label">Years of Experience</label>
                  <input className="form-control" placeholder="e.g. 4" value={form.yearsOfExperience} onChange={(e) => setForm((prev) => ({ ...prev, yearsOfExperience: e.target.value }))} required={showTechnicianFields} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Technician Type</label>
                  <input className="form-control" placeholder="e.g. Irrigation Systems" value={form.technicianType} onChange={(e) => setForm((prev) => ({ ...prev, technicianType: e.target.value }))} required={showTechnicianFields} />
                </div>
              </>
            )}

            {!showFarmerFields && !showTechnicianFields ? (
              <div className="alert alert-light small">Customer profile uses your basic details. You can continue.</div>
            ) : null}

            <div className="d-flex gap-2 mt-2">
              <button type="button" className="btn btn-outline-agri w-50" onClick={() => { setError(''); setStep(1) }}>Back</button>
              <button
                type="button"
                className="btn btn-agri w-50"
                onClick={() => {
                  setError('')
                  if (validateStep(3)) setStep(3)
                }}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="alert alert-light small">
              <div><strong>Role:</strong> {capitalize(form.accountType)}</div>
              <div><strong>Name:</strong> {form.name}</div>
              <div><strong>Phone:</strong> {form.phone}</div>
              <div><strong>Address:</strong> {form.address}</div>
            </div>
            <div className="mb-2">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Create password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
              />
            </div>
            <div className="d-flex gap-2 mt-2">
              <button type="button" className="btn btn-outline-agri w-50" onClick={() => { setError(''); setStep(2) }}>Back</button>
              <button className="btn btn-agri w-50" type="submit">Complete Signup</button>
            </div>
          </>
        )}

        <div className="small mt-3">Need a new code? <Link to="/otp">Go to OTP</Link></div>
      </form>
    </div>
  )
}
