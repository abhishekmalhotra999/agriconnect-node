import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getApiErrorMessage } from '../api/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginWithPassword } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await loginWithPassword(identifier, password)
      navigate('/')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Sign in failed'))
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Sign In</h2>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <label className="form-label">Phone or Email</label>
        <input
          className="form-control mb-3"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Enter phone number or email"
          required
        />
        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-control mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />
        <button className="btn btn-agri w-100" type="submit">Sign In</button>
        <div className="small mt-3 d-flex justify-content-between">
          <Link to="/forgot-password">Forgot Password?</Link>
          <Link to="/otp">Sign up with OTP</Link>
        </div>
      </form>
    </div>
  )
}
