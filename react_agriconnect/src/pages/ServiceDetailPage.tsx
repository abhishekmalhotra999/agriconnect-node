import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import client, { getApiErrorMessage, toApiAssetUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { ListingReview, ServiceListing } from '../types/api'
import { pushNotification, toggleSavedItem, trackRecent } from '../utils/ux'

type RequestFormState = {
  requester_name: string
  requester_phone: string
  requester_email: string
  message: string
}

export default function ServiceDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const isCustomer = String(user?.accountType || '').toLowerCase() === 'customer'
  const [listing, setListing] = useState<ServiceListing | null>(null)
  const [relatedServices, setRelatedServices] = useState<ServiceListing[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reviews, setReviews] = useState<ListingReview[]>([])
  const [ratingInput, setRatingInput] = useState(5)
  const [commentInput, setCommentInput] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [form, setForm] = useState<RequestFormState>({
    requester_name: user?.name || '',
    requester_phone: user?.phone || '',
    requester_email: user?.email || '',
    message: '',
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      requester_name: prev.requester_name || user?.name || '',
      requester_phone: prev.requester_phone || user?.phone || '',
      requester_email: prev.requester_email || user?.email || '',
    }))
  }, [user])

  useEffect(() => {
    if (!id) return

    setLoading(true)
    client.get<ServiceListing>(`/api/services/listings/${id}`)
      .then((res) => {
        const detail = res.data
        setListing(detail)
        trackRecent({ type: 'service', id: String(detail.id), title: detail.title, subtitle: detail.service_area || '', image: detail.thumbnail_url || undefined, link: `/services/${detail.id}` })

        client.get<ListingReview[]>(`/api/services/listings/${detail.id}/reviews`)
          .then((reviewsRes) => setReviews(reviewsRes.data))
          .catch(() => setReviews([]))

        if (detail.category?.id) {
          setRelatedLoading(true)
          client.get<ServiceListing[]>('/api/services/listings', {
            params: { category_id: detail.category.id },
          })
            .then((relatedRes) => {
              const related = relatedRes.data
                .filter((item) => String(item.id) !== String(detail.id))
                .slice(0, 4)
              setRelatedServices(related)
            })
            .catch(() => setRelatedServices([]))
            .finally(() => setRelatedLoading(false))
        } else {
          setRelatedServices([])
        }
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load service details')))
      .finally(() => setLoading(false))
  }, [id])

  const onSave = () => {
    if (!listing) return
    const next = toggleSavedItem({
      type: 'service',
      id: String(listing.id),
      title: listing.title,
      subtitle: listing.service_area || '',
      image: listing.main_picture_url || listing.thumbnail_url || undefined,
      link: `/services/${listing.id}`,
    })
    setSaved(next)
  }

  const onShare = async () => {
    if (!listing) return
    const url = `${window.location.origin}/services/${listing.id}`
    try {
      await navigator.clipboard.writeText(url)
      pushNotification('Service link copied to clipboard.', `/services/${listing.id}`)
    } catch {
      setError('Unable to copy link. Please copy it from the browser address bar.')
    }
  }

  const onSubmit = async () => {
    if (!listing) return
    if (!isCustomer) {
      setError('Only customer accounts can request this service.')
      return
    }
    if (!form.requester_name || !form.requester_phone || !form.message) {
      setError('Name, phone and message are required.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      await client.post('/api/services/requests', {
        service_listing_id: listing.id,
        requester_name: form.requester_name,
        requester_phone: form.requester_phone,
        requester_email: form.requester_email,
        message: form.message,
      })

      setForm((prev) => ({ ...prev, message: '' }))
      setSuccess('Service request submitted successfully.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to submit service request'))
    } finally {
      setSubmitting(false)
    }
  }

  const submitReview = async () => {
    if (!listing) return
    try {
      setSubmittingReview(true)
      setError('')
      await client.post(`/api/services/listings/${listing.id}/reviews`, {
        rating: ratingInput,
        comment: commentInput.trim() || null,
      })
      const [detailRes, reviewsRes] = await Promise.all([
        client.get<ServiceListing>(`/api/services/listings/${listing.id}`),
        client.get<ListingReview[]>(`/api/services/listings/${listing.id}/reviews`),
      ])
      setListing(detailRes.data)
      setReviews(reviewsRes.data)
      setCommentInput('')
      pushNotification('Review submitted for service.', `/services/${listing.id}`)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to submit review'))
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <div className="text-muted">Loading service details...</div>

  if (error && !listing) {
    return (
      <div className="listing-detail-wrap">
        <div className="alert alert-danger mb-3">{error}</div>
        <Link to="/services" className="btn btn-outline-agri btn-sm">Back to Services</Link>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="listing-detail-wrap">
        <div className="alert alert-warning mb-3">Service not found.</div>
        <Link to="/services" className="btn btn-outline-agri btn-sm">Back to Services</Link>
      </div>
    )
  }

  return (
    <div className="listing-detail-wrap">
      <nav className="small text-muted mb-2">
        <Link to="/learn" className="text-decoration-none">Home</Link> / <Link to="/services" className="text-decoration-none">Services</Link> / <span>Details</span>
      </nav>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title mb-0">Service Details</h2>
        <Link to="/services" className="btn btn-outline-agri btn-sm">Back</Link>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <div className="card listing-detail-card border-0 shadow-sm overflow-hidden mb-3">
        <div className="row g-0">
          <div className="col-lg-6">
            {listing.main_picture_url || listing.thumbnail_url ? (
              <img src={toApiAssetUrl(listing.main_picture_url || listing.thumbnail_url)} alt={listing.title} className="listing-detail-image" />
            ) : (
              <div className="listing-detail-image-placeholder">No image available</div>
            )}
            {Array.isArray(listing.gallery_urls) && listing.gallery_urls.length > 0 ? (
              <div className="listing-gallery-strip">
                {listing.gallery_urls.slice(0, 5).map((url, idx) => (
                  <img key={`${listing.id}-gallery-${idx}`} src={toApiAssetUrl(url)} alt={`${listing.title} gallery ${idx + 1}`} className="listing-gallery-thumb" />
                ))}
              </div>
            ) : null}
          </div>
          <div className="col-lg-6">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="badge text-bg-light">{listing.category?.name || 'General'}</span>
                <span className={`badge ${listing.is_active ? 'text-bg-success' : 'text-bg-secondary'}`}>
                  {listing.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="badge text-bg-success">Verified technician</span>
              </div>

              <h1 className="h3 mb-3 wrapped-text">{listing.title}</h1>
              <p className="text-muted wrapped-text mb-4">{listing.description || 'No description provided for this service.'}</p>
              <div className="small mb-3">Rating: <strong>{listing.avgRating || 0}</strong> ({listing.reviewCount || 0} reviews)</div>

              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6">
                  <div className="listing-stat-card">
                    <div className="small text-muted">Service Area</div>
                    <div className="fw-bold wrapped-text">{listing.service_area || 'Not specified'}</div>
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <div className="listing-stat-card">
                    <div className="small text-muted">Provider</div>
                    <div className="fw-bold wrapped-text">{listing.technician?.name || 'Unknown'}</div>
                  </div>
                </div>
              </div>

              <div className="listing-contact-box">
                <h6 className="mb-2">Technician Contact</h6>
                <p className="mb-1"><strong>Name:</strong> {listing.technician?.name || 'Unknown'}</p>
                <p className="mb-1"><strong>Phone:</strong> {listing.technician?.phone || 'Not provided'}</p>
                <p className="mb-0"><strong>Email:</strong> {listing.contact_email || listing.technician?.email || 'Not provided'}</p>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <a href={listing.technician?.phone ? `tel:${listing.technician.phone}` : '#'} className="btn btn-outline-agri btn-sm">Call</a>
                  <a href={listing.technician?.phone ? `https://wa.me/${String(listing.technician.phone).replace(/\D/g, '')}` : '#'} target="_blank" rel="noreferrer" className="btn btn-outline-agri btn-sm">WhatsApp</a>
                  <button className="btn btn-outline-agri btn-sm" onClick={onShare}>Share</button>
                  <button className="btn btn-agri btn-sm" onClick={onSave}>{saved ? 'Saved' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <h5 className="mb-3">Request This Service</h5>
          {isCustomer ? (
            <div className="row g-2">
              <div className="col-md-6">
                <input
                  className="form-control"
                  placeholder="Your name"
                  value={form.requester_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, requester_name: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <input
                  className="form-control"
                  placeholder="Your phone"
                  value={form.requester_phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, requester_phone: e.target.value }))}
                />
              </div>
              <div className="col-12">
                <input
                  className="form-control"
                  placeholder="Your email (optional)"
                  value={form.requester_email}
                  onChange={(e) => setForm((prev) => ({ ...prev, requester_email: e.target.value }))}
                />
              </div>
              <div className="col-12">
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Describe your service need"
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                />
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button className="btn btn-agri" onClick={onSubmit} disabled={submitting || !listing.is_active}>
                  {submitting ? 'Submitting...' : listing.is_active ? 'Send Request' : 'Service Unavailable'}
                </button>
              </div>
            </div>
          ) : (
            <div className="small text-muted">Only customer accounts can submit service requests.</div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm mt-3">
        <div className="card-body p-4">
          <h5 className="mb-3">Ratings & Reviews</h5>
          <div className="row g-2 mb-3">
            <div className="col-sm-3">
              <select className="form-select" value={ratingInput} onChange={(e) => setRatingInput(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div className="col-sm-9">
              <input className="form-control" placeholder="Write a short review (optional)" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button className="btn btn-agri btn-sm" onClick={submitReview} disabled={submittingReview}>{submittingReview ? 'Submitting...' : 'Submit Review'}</button>
            </div>
          </div>
          {reviews.length === 0 ? <div className="small text-muted">No reviews yet.</div> : (
            <div className="d-flex flex-column gap-2">
              {reviews.slice(0, 5).map((review) => (
                <div className="border rounded p-2" key={review.id}>
                  <div className="small fw-semibold">{review.reviewer?.name || 'User'} • {review.rating}/5</div>
                  <div className="small text-muted wrapped-text">{review.comment || 'No comment'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="detail-sticky-action d-md-none">
        {isCustomer ? (
          <button className="btn btn-agri w-100" onClick={onSubmit} disabled={submitting || !listing.is_active}>
            {submitting ? 'Submitting...' : listing.is_active ? 'Send Request' : 'Service Unavailable'}
          </button>
        ) : null}
      </div>

      <section className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="mb-0">Related Services</h4>
          <Link to="/services" className="small text-decoration-none">Browse all</Link>
        </div>

        {relatedLoading ? (
          <div className="text-muted small">Loading related services...</div>
        ) : relatedServices.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-muted">No related services found yet.</div>
          </div>
        ) : (
          <div className="row g-3">
            {relatedServices.map((item) => (
              <div className="col-sm-6 col-lg-3" key={item.id}>
                <div className="card related-card h-100 border-0 shadow-sm">
                  {item.main_picture_url || item.thumbnail_url ? (
                    <img src={toApiAssetUrl(item.main_picture_url || item.thumbnail_url)} alt={item.title} className="related-card-image" />
                  ) : (
                    <div className="related-card-image-placeholder">No image</div>
                  )}
                  <div className="card-body d-flex flex-column">
                    <h6 className="mb-1 wrapped-text">{item.title}</h6>
                    <div className="small text-muted mb-2">{item.service_area || 'Area not specified'}</div>
                    <div className="small mb-3">Provider: {item.technician?.name || 'Unknown'}</div>
                    <Link to={`/services/${item.id}`} className="btn btn-outline-agri btn-sm mt-auto">View</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
