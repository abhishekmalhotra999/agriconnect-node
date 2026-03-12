import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import client, { getApiErrorMessage } from '../api/client'
import type { AuthResponse, UserPayload } from '../types/api'
import { getRoleDefaultRoute } from '../routes/RouteGuards'

const SIGNUP_PREFILL_KEY = 'agri_signup_prefill'

export default function OtpPage() {
  const navigate = useNavigate()
  const { requestOtp, setCurrentUser } = useAuth()
  const [phone, setPhone] = useState('')
  const [accountType, setAccountType] = useState('customer')
  const [code, setCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')

  const isProfileComplete = (user: UserPayload) => {
    const role = String(user.accountType || '').toLowerCase()
    const profile = user.profile
    if (!profile) return false

    const hasAddress = Boolean(String(profile.address || '').trim())
    const hasExperience = Boolean(String(profile.yearsOfExperience || '').trim())
    const hasFarmSize = Boolean(String(profile.farmSize || '').trim())
    const hasFarmingType = Boolean(String(profile.farmingType || '').trim())
    const hasTechnicianType = Boolean(String(profile.technicianType || '').trim())

    if (role === 'farmer') return hasAddress && hasExperience && hasFarmSize && hasFarmingType
    if (role === 'technician') return hasAddress && hasExperience && hasTechnicianType
    return hasAddress
  }

  const sendOtp = async () => {
    setError('')
    try {
      await requestOtp(phone, undefined, accountType)
      localStorage.setItem(SIGNUP_PREFILL_KEY, JSON.stringify({ phone, accountType }))
      setOtpSent(true)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not send OTP'))
    }
  }

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await client.post<AuthResponse>('/api/auth_user', { phone, verificationCode: code })
      const user = res.data?.user
      if (!user) throw new Error('Invalid OTP')

      localStorage.setItem(SIGNUP_PREFILL_KEY, JSON.stringify({
        phone,
        accountType: user.accountType || accountType,
        name: user.name || '',
        email: user.email || '',
      }))

      if (isProfileComplete(user)) {
        setCurrentUser(user)
        navigate(getRoleDefaultRoute(user.accountType))
      } else {
        navigate('/signup')
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid OTP'))
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={verifyOtp}>
        <h2>Phone Verification</h2>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <label className="form-label">Account Type</label>
        <select id="otp-account-type" className="form-select mb-3" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
          <option value="customer">Customer</option>
          <option value="farmer">Farmer</option>
          <option value="technician">Technician</option>
        </select>
        <label htmlFor="otp-phone" className="form-label">Phone Number</label>
        <input id="otp-phone" className="form-control mb-3" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <button type="button" className="btn btn-outline-agri w-100 mb-3" onClick={sendOtp}>Send OTP</button>
        {otpSent && (
          <>
            <label htmlFor="otp-code" className="form-label">OTP Code</label>
            <input id="otp-code" className="form-control mb-3" value={code} onChange={(e) => setCode(e.target.value)} required />
            <button type="submit" className="btn btn-agri w-100">Verify & Continue</button>
          </>
        )}
        <div className="small mt-3 text-muted">
          Verify OTP first. If your profile is incomplete, you will continue to role-based setup.
        </div>
      </form>
    </div>
  )
}
