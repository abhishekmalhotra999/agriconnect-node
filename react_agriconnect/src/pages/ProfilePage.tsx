import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import client, { getApiErrorMessage, toApiAssetUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { UserPayload } from '../types/api'

export default function ProfilePage() {
  const { user, setCurrentUser } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    address: user?.profile?.address || '',
    yearsOfExperience: user?.profile?.yearsOfExperience || '',
    professionType: user?.profile?.professionType || '',
    farmSize: user?.profile?.farmSize || '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [filePreview, setFilePreview] = useState('')

  useEffect(() => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      address: user?.profile?.address || '',
      yearsOfExperience: user?.profile?.yearsOfExperience || '',
      professionType: user?.profile?.professionType || '',
      farmSize: user?.profile?.farmSize || '',
    })
  }, [user])

  useEffect(() => {
    if (!file) {
      setFilePreview('')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setFilePreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const imagePreview = filePreview || (user?.profile?.userImage ? toApiAssetUrl(user.profile.userImage) : '')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setMessage('')
    setSaving(true)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (file) fd.append('file', file)

    try {
      const response = await client.put<{ user?: UserPayload; errors?: string | string[] }>(`/api/users/${user.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const body = response.data
      if (body.errors) {
        const msg = Array.isArray(body.errors) ? body.errors[0] : body.errors
        setError(msg || 'Profile update failed')
        return
      }

      if (!body.user) {
        setError('Profile update failed')
        return
      }

      setCurrentUser(body.user)
      setFile(null)
      setMessage('Profile updated successfully')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Profile update failed'))
    } finally {
      setSaving(false)
    }
  }

  const onFileChange = (nextFile: File | null) => {
    setError('')
    if (!nextFile) {
      setFile(null)
      return
    }

    if (!nextFile.type.startsWith('image/')) {
      setError('Please upload an image file only.')
      return
    }

    if (nextFile.size > 5 * 1024 * 1024) {
      setError('Profile photo must be smaller than 5MB.')
      return
    }

    setFile(nextFile)
  }

  return (
    <div className="profile-page">
      <h2 className="page-title mb-3">Your Details</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <form className="card profile-card" onSubmit={onSubmit}>
        <div className="card-body row g-3">
          <div className="col-12">
            <div className="profile-photo-wrap">
              {imagePreview ? (
                <img className="profile-photo" src={imagePreview} alt="Profile" />
              ) : (
                <div className="profile-photo profile-photo-placeholder">
                  {(user?.name || 'U').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <label className="form-label mb-1">Profile Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                />
                <small className="text-muted">JPG, PNG, WEBP up to 5MB.</small>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Phone</label>
            <input className="form-control" value={user?.phone || ''} disabled />
          </div>

          {[
            ['name', 'Full Name'],
            ['email', 'Email'],
            ['address', 'Address'],
            ['yearsOfExperience', 'Years of Experience'],
            ['professionType', 'Profession Type'],
            ['farmSize', 'Farm Size'],
          ].map(([key, label]) => (
            <div className="col-md-6" key={key}>
              <label className="form-label">{label}</label>
              <input
                className="form-control"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}

          <div className="col-12">
            <button className="btn btn-agri" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
