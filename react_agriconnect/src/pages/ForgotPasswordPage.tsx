import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getApiErrorMessage } from '../api/client'

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    try {
      await forgotPassword(phone)
      setMessage('OTP has been sent if the number exists.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send reset OTP'))
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Forgot Password</h2>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {message && <div className="alert alert-success py-2">{message}</div>}
        <label className="form-label">Phone Number</label>
        <input className="form-control mb-3" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <button className="btn btn-agri w-100" type="submit">Send Reset OTP</button>
        <div className="small mt-3 d-flex justify-content-between">
          <span>Go to <Link to="/reset-password">Reset Password</Link></span>
          <Link to="/login">Back to Sign In</Link>
        </div>
      </form>
    </div>
  )
}
