import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client, { getApiErrorMessage } from '../api/client'
import type { FarmerOnboarding } from '../types/api'
import { useAuth } from '../auth/AuthContext'
import { getRoleDefaultRoute } from '../routes/RouteGuards'

const FARMER_ONBOARDING_UPDATED_EVENT = 'farmer-onboarding-updated'

export default function FarmerOnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<FarmerOnboarding>({
    completed: false,
    storeName: '',
    storeTagline: '',
    businessType: 'General Produce',
    serviceArea: '',
    contactPhone: user?.phone || '',
    contactEmail: user?.email || '',
  })

  const isFarmer = String(user?.accountType || '').toLowerCase() === 'farmer'

  useEffect(() => {
    if (!isFarmer) {
      navigate(getRoleDefaultRoute(user?.accountType), { replace: true })
      return
    }

    client.get('/api/users/preferences')
      .then((res) => {
        const existing = (res.data?.farmerOnboarding || {}) as FarmerOnboarding
        setForm((prev) => ({
          ...prev,
          ...existing,
          contactPhone: existing.contactPhone || prev.contactPhone || '',
          contactEmail: existing.contactEmail || prev.contactEmail || '',
        }))
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load store setup')))
      .finally(() => setLoading(false))
  }, [isFarmer, navigate, user?.accountType, user?.email, user?.phone])

  const update = (key: keyof FarmerOnboarding, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async () => {
    if (!form.storeName?.trim() || !form.serviceArea?.trim() || !form.contactPhone?.trim()) {
      setError('Store name, service area, and contact phone are required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const payload: FarmerOnboarding = {
        ...form,
        completed: true,
        completedAt: Date.now(),
      }

      await client.put('/api/users/preferences', {
        farmerOnboarding: payload,
      })

      window.dispatchEvent(new CustomEvent(FARMER_ONBOARDING_UPDATED_EVENT, {
        detail: { completed: true },
      }))

      setSuccess('Store setup completed. Redirecting to your seller dashboard...')
      setTimeout(() => navigate('/seller/dashboard', { replace: true }), 150)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save store setup'))
    } finally {
      setSaving(false)
    }
  }

  if (!isFarmer) return null

  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ maxWidth: 760 }}>
        <h2 className="mb-3">Farmer Store Setup</h2>

        {loading ? <div className="text-muted">Loading store setup...</div> : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        {!loading && (
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="store-name" className="form-label">Store Name</label>
              <input id="store-name" className="form-control" placeholder="e.g. Bong Fresh Harvest" value={form.storeName || ''} onChange={(e) => update('storeName', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label htmlFor="store-tagline" className="form-label">Store Tagline</label>
              <input id="store-tagline" className="form-control" placeholder="e.g. Fresh produce direct from farm" value={form.storeTagline || ''} onChange={(e) => update('storeTagline', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label htmlFor="business-type" className="form-label">Business Type</label>
              <select id="business-type" className="form-select" value={form.businessType || 'General Produce'} onChange={(e) => update('businessType', e.target.value)}>
                <option>General Produce</option>
                <option>Grains Specialist</option>
                <option>Vegetables Specialist</option>
                <option>Fruits Specialist</option>
                <option>Farm Inputs Supplier</option>
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="service-area" className="form-label">Service Area</label>
              <input id="service-area" className="form-control" placeholder="e.g. Montserrado, Bong" value={form.serviceArea || ''} onChange={(e) => update('serviceArea', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label htmlFor="contact-phone" className="form-label">Contact Phone</label>
              <input id="contact-phone" className="form-control" placeholder="Primary customer contact" value={form.contactPhone || ''} onChange={(e) => update('contactPhone', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label htmlFor="contact-email" className="form-label">Contact Email</label>
              <input id="contact-email" className="form-control" placeholder="Optional business email" value={form.contactEmail || ''} onChange={(e) => update('contactEmail', e.target.value)} />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button className="btn btn-agri" onClick={submit} disabled={saving}>
                {saving ? 'Saving...' : 'Complete Store Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
