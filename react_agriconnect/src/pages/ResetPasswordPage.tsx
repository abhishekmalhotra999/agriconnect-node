import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getApiErrorMessage } from '../api/client'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { resetPassword } = useAuth()
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await resetPassword(phone, verificationCode, password, confirmPassword)
      navigate('/login')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Reset failed'))
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Reset Password</h2>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <label className="form-label">Phone Number</label>
        <input className="form-control mb-2" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <label className="form-label">OTP Code</label>
        <input className="form-control mb-2" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required />
        <label className="form-label">New Password</label>
        <input type="password" className="form-control mb-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label className="form-label">Confirm Password</label>
        <input type="password" className="form-control mb-3" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        <button className="btn btn-agri w-100" type="submit">Reset Password</button>
        <div className="small mt-3"><Link to="/login">Back to login</Link></div>
      </form>
    </div>
  )
}
