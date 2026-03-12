import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client, { getApiErrorMessage, toApiAssetUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { ServiceCategory, ServiceListing } from '../types/api'
import { dismissCoach, isCoachDismissed, trackRecent } from '../utils/ux'

const PAGE_SIZE = 6
type ImageInputMode = 'url' | 'upload'

export default function ServicesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [listings, setListings] = useState<ServiceListing[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCoach, setShowCoach] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [mainMode, setMainMode] = useState<ImageInputMode>('url')
  const [galleryMode, setGalleryMode] = useState<ImageInputMode>('url')
  const [mainFile, setMainFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    service_category_id: '',
    service_area: '',
    contact_email: user?.email || '',
    is_active: 'true',
    main_picture_url: '',
    gallery_urls_text: '',
  })

  useEffect(() => {
    setShowCoach(!isCoachDismissed('services'))
    Promise.all([
      client.get<ServiceCategory[]>('/api/services/categories'),
      client.get<ServiceListing[]>('/api/services/listings'),
    ])
      .then(([categoryRes, listingRes]) => {
        setCategories(categoryRes.data.filter((category) => category.is_active))
        setListings(listingRes.data)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load services')))
      .finally(() => setLoading(false))
  }, [])

  const visibleListings = useMemo(() => {
    const key = search.trim().toLowerCase()
    return listings
      .filter((listing) => (!selectedCategory || String(listing.category?.id || '') === selectedCategory))
      .filter((listing) => (!key || `${listing.title} ${listing.description || ''} ${listing.technician?.name || ''}`.toLowerCase().includes(key)))
  }, [listings, selectedCategory, search])

  const paged = visibleListings.slice(0, visibleCount)
  const hasMore = visibleListings.length > visibleCount
  const isTechnician = String(user?.accountType || '').toLowerCase() === 'technician'
  const isCustomer = String(user?.accountType || '').toLowerCase() === 'customer'

  const updateCreateForm = (key: string, value: string) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }))
  }

  const parseGalleryText = (value: string) => value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)

  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      description: '',
      service_category_id: '',
      service_area: '',
      contact_email: user?.email || '',
      is_active: 'true',
      main_picture_url: '',
      gallery_urls_text: '',
    })
    setMainMode('url')
    setGalleryMode('url')
    setMainFile(null)
    setGalleryFiles([])
  }

  const submitCreateListing = async () => {
    if (!createForm.title.trim()) {
      setError('Service title is required.')
      return
    }

    try {
      setCreateSubmitting(true)
      setError('')
      setSubmitMessage('')

      const formData = new FormData()
      formData.append('title', createForm.title.trim())
      formData.append('description', createForm.description.trim())
      if (createForm.service_category_id) formData.append('service_category_id', createForm.service_category_id)
      if (createForm.service_area.trim()) formData.append('service_area', createForm.service_area.trim())
      if (createForm.contact_email.trim()) formData.append('contact_email', createForm.contact_email.trim())
      formData.append('is_active', createForm.is_active)

      if (mainMode === 'url' && createForm.main_picture_url.trim()) {
        formData.append('main_picture_url', createForm.main_picture_url.trim())
      }
      if (mainMode === 'upload' && mainFile) {
        formData.append('main_picture_file', mainFile)
      }

      if (galleryMode === 'url') {
        formData.append('gallery_urls', JSON.stringify(parseGalleryText(createForm.gallery_urls_text)))
      }
      if (galleryMode === 'upload' && galleryFiles.length > 0) {
        galleryFiles.forEach((file) => formData.append('gallery_files', file))
      }

      const res = await client.post<ServiceListing>('/api/services/listings', formData)
      setListings((prev) => [res.data, ...prev])
      setSubmitMessage('Service listing created successfully.')
      resetCreateForm()
      setShowCreate(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create listing'))
    } finally {
      setCreateSubmitting(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="page-title mb-0">Technician Services</h2>
        <span className="small text-muted">{visibleListings.length} listings</span>
      </div>

      {showCoach && (
        <div className="alert alert-warning d-flex justify-content-between align-items-start gap-2">
          <div className="small">Tip: filter by category, open details for full profile, then submit your request.</div>
          <button className="btn btn-sm btn-light" onClick={() => { dismissCoach('services'); setShowCoach(false) }}>Got it</button>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {submitMessage && <div className="alert alert-success">{submitMessage}</div>}

      {isTechnician && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Offer a service</h5>
              <button className="btn btn-sm btn-outline-agri" onClick={() => setShowCreate((v) => !v)}>
                {showCreate ? 'Close' : 'Add Service'}
              </button>
            </div>
            {showCreate && (
              <div className="row g-2">
                <div className="col-md-6">
                  <input className="form-control" placeholder="Service title" value={createForm.title} onChange={(e) => updateCreateForm('title', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <select className="form-select" value={createForm.service_category_id} onChange={(e) => updateCreateForm('service_category_id', e.target.value)}>
                    <option value="">Choose category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <input className="form-control" placeholder="Service area" value={createForm.service_area} onChange={(e) => updateCreateForm('service_area', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <input className="form-control" placeholder="Contact email" value={createForm.contact_email} onChange={(e) => updateCreateForm('contact_email', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <select className="form-select" value={createForm.is_active} onChange={(e) => updateCreateForm('is_active', e.target.value)}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="col-12">
                  <textarea className="form-control" rows={2} placeholder="Service description" value={createForm.description} onChange={(e) => updateCreateForm('description', e.target.value)} />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold mb-1">Main picture</label>
                  <div className="d-flex gap-2 mb-2">
                    <button type="button" className={`btn btn-sm ${mainMode === 'url' ? 'btn-agri' : 'btn-outline-agri'}`} onClick={() => setMainMode('url')}>Use URL</button>
                    <button type="button" className={`btn btn-sm ${mainMode === 'upload' ? 'btn-agri' : 'btn-outline-agri'}`} onClick={() => setMainMode('upload')}>Upload file</button>
                  </div>
                  {mainMode === 'url' ? (
                    <input className="form-control" placeholder="https://..." value={createForm.main_picture_url} onChange={(e) => updateCreateForm('main_picture_url', e.target.value)} />
                  ) : (
                    <input className="form-control" type="file" accept="image/*" onChange={(e) => setMainFile(e.target.files?.[0] || null)} />
                  )}
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold mb-1">Gallery images</label>
                  <div className="d-flex gap-2 mb-2">
                    <button type="button" className={`btn btn-sm ${galleryMode === 'url' ? 'btn-agri' : 'btn-outline-agri'}`} onClick={() => setGalleryMode('url')}>Use URLs</button>
                    <button type="button" className={`btn btn-sm ${galleryMode === 'upload' ? 'btn-agri' : 'btn-outline-agri'}`} onClick={() => setGalleryMode('upload')}>Upload files</button>
                  </div>
                  {galleryMode === 'url' ? (
                    <textarea className="form-control" rows={2} placeholder="One URL per line or comma-separated" value={createForm.gallery_urls_text} onChange={(e) => updateCreateForm('gallery_urls_text', e.target.value)} />
                  ) : (
                    <input
                      className="form-control"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
                    />
                  )}
                </div>

                <div className="col-12 d-flex justify-content-end">
                  <button className="btn btn-agri" onClick={submitCreateListing} disabled={createSubmitting}>
                    {createSubmitting ? 'Saving...' : 'Create Service Listing'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3 sticky-filter-bar">
        <div className="card-body row g-2">
          <div className="col-lg-5">
            <input className="form-control" placeholder="Search services, providers" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="col-lg-4">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setVisibleCount(PAGE_SIZE)
              }}
            >
              <option value="">All Service Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="col-lg-3 d-flex gap-2">
            <button className="btn btn-outline-agri btn-sm" onClick={() => { setSelectedCategory(''); setSearch(''); }}>Reset</button>
            <button className="btn btn-outline-agri btn-sm" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>More</button>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <span className="badge text-bg-success">Verified technicians</span>
        <span className="badge text-bg-secondary">Response within 24h</span>
      </div>

      {loading ? (
        <div className="row g-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div className="col-lg-6" key={idx}>
              <div className="card course-card h-100">
                <div className="skeleton-thumb" />
                <div className="card-body">
                  <div className="skeleton-line w-75 mb-2" />
                  <div className="skeleton-line w-50 mb-2" />
                  <div className="skeleton-line w-25" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-3">
          {paged.length === 0 && (
            <div className="col-12">
              <div className="card border-0 shadow-sm"><div className="card-body"><h5>No services available.</h5><p className="text-muted small mb-3">Try another category or reset filters.</p><Link to="/learn" className="btn btn-outline-agri btn-sm">Back to Learn</Link></div></div>
            </div>
          )}

          {paged.map((listing) => {
            return (
              <div className="col-lg-6" key={listing.id}>
                <div
                  className="card course-card h-100"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    trackRecent({ type: 'service', id: String(listing.id), title: listing.title, subtitle: listing.service_area || '', image: listing.main_picture_url || listing.thumbnail_url || undefined, link: `/services/${listing.id}` })
                    navigate(`/services/${listing.id}`)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      trackRecent({ type: 'service', id: String(listing.id), title: listing.title, subtitle: listing.service_area || '', image: listing.main_picture_url || listing.thumbnail_url || undefined, link: `/services/${listing.id}` })
                      navigate(`/services/${listing.id}`)
                    }
                  }}
                >
                  {listing.main_picture_url || listing.thumbnail_url ? (
                    <img
                      src={toApiAssetUrl(listing.main_picture_url || listing.thumbnail_url)}
                      alt={listing.title}
                      className="card-img-top"
                      style={{ height: 180, objectFit: 'cover' }}
                    />
                  ) : <div className="skeleton-thumb" />}
                  <div className="card-body">
                    <div className="d-flex justify-content-between gap-3 mb-2">
                      <h5 className="mb-0 wrapped-text">{listing.title}</h5>
                      <span className="badge text-bg-light">{listing.category?.name || 'General'}</span>
                    </div>
                    <p className="small text-muted wrapped-text mb-2">{listing.description || 'No description provided.'}</p>
                    <div className="small text-muted mb-2">Area: {listing.service_area || 'Not specified'} | Provider: {listing.technician?.name || 'Unknown'}</div>
                    <div className="small text-muted mt-2">
                      {isCustomer
                        ? 'Tap card to open details and request service.'
                        : 'Tap card to open service details.'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && hasMore && (
        <div className="d-flex justify-content-center mt-3">
          <button className="btn btn-outline-agri" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>Load More</button>
        </div>
      )}
    </div>
  )
}
