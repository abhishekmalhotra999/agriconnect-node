import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import client, { getApiErrorMessage, toApiAssetUrl } from '../api/client'
import type { ListingReview, MarketplaceProduct } from '../types/api'
import { pushNotification, toggleSavedItem, trackRecent } from '../utils/ux'

export default function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<MarketplaceProduct | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<MarketplaceProduct[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reviews, setReviews] = useState<ListingReview[]>([])
  const [ratingInput, setRatingInput] = useState(5)
  const [commentInput, setCommentInput] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return

    setLoading(true)
    client.get<MarketplaceProduct>(`/api/marketplace/products/${id}`)
      .then((res) => {
        const detail = res.data
        setProduct(detail)
        trackRecent({ type: 'product', id: String(detail.id), title: detail.title, subtitle: String(detail.unit_price), image: detail.thumbnail_url || undefined, link: `/marketplace/${detail.id}` })

        client.get<ListingReview[]>(`/api/marketplace/products/${detail.id}/reviews`)
          .then((reviewsRes) => setReviews(reviewsRes.data))
          .catch(() => setReviews([]))

        if (detail.category?.id) {
          setRelatedLoading(true)
          client.get<MarketplaceProduct[]>('/api/marketplace/products', {
            params: { category_id: detail.category.id },
          })
            .then((relatedRes) => {
              const related = relatedRes.data
                .filter((item) => String(item.id) !== String(detail.id))
                .slice(0, 4)
              setRelatedProducts(related)
            })
            .catch(() => setRelatedProducts([]))
            .finally(() => setRelatedLoading(false))
        } else {
          setRelatedProducts([])
        }
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load product details')))
      .finally(() => setLoading(false))
  }, [id])

  const onSave = () => {
    if (!product) return
    const next = toggleSavedItem({
      type: 'product',
      id: String(product.id),
      title: product.title,
      subtitle: String(product.unit_price),
      image: product.main_picture_url || product.thumbnail_url || undefined,
      link: `/marketplace/${product.id}`,
    })
    setSaved(next)
  }

  const onShare = async () => {
    if (!product) return
    const url = `${window.location.origin}/marketplace/${product.id}`
    try {
      await navigator.clipboard.writeText(url)
      pushNotification('Product link copied to clipboard.', `/marketplace/${product.id}`)
    } catch {
      setError('Unable to copy link. Please copy it from the browser address bar.')
    }
  }

  const submitReview = async () => {
    if (!product) return
    try {
      setSubmittingReview(true)
      setError('')
      await client.post(`/api/marketplace/products/${product.id}/reviews`, {
        rating: ratingInput,
        comment: commentInput.trim() || null,
      })
      const [detailRes, reviewsRes] = await Promise.all([
        client.get<MarketplaceProduct>(`/api/marketplace/products/${product.id}`),
        client.get<ListingReview[]>(`/api/marketplace/products/${product.id}/reviews`),
      ])
      setProduct(detailRes.data)
      setReviews(reviewsRes.data)
      setCommentInput('')
      pushNotification('Review submitted for product.', `/marketplace/${product.id}`)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to submit review'))
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <div className="text-muted">Loading product details...</div>

  if (error) {
    return (
      <div className="listing-detail-wrap">
        <div className="alert alert-danger mb-3">{error}</div>
        <Link to="/marketplace" className="btn btn-outline-agri btn-sm">Back to Marketplace</Link>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="listing-detail-wrap">
        <div className="alert alert-warning mb-3">Product not found.</div>
        <Link to="/marketplace" className="btn btn-outline-agri btn-sm">Back to Marketplace</Link>
      </div>
    )
  }

  return (
    <div className="listing-detail-wrap">
      <nav className="small text-muted mb-2">
        <Link to="/learn" className="text-decoration-none">Home</Link> / <Link to="/marketplace" className="text-decoration-none">Marketplace</Link> / <span>Details</span>
      </nav>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title mb-0">Product Details</h2>
        <Link to="/marketplace" className="btn btn-outline-agri btn-sm">Back</Link>
      </div>

      <div className="card listing-detail-card border-0 shadow-sm overflow-hidden">
        <div className="row g-0">
          <div className="col-lg-6">
            {product.main_picture_url || product.thumbnail_url ? (
              <img src={toApiAssetUrl(product.main_picture_url || product.thumbnail_url)} alt={product.title} className="listing-detail-image" />
            ) : (
              <div className="listing-detail-image-placeholder">No image available</div>
            )}
            {Array.isArray(product.gallery_urls) && product.gallery_urls.length > 0 ? (
              <div className="listing-gallery-strip">
                {product.gallery_urls.slice(0, 5).map((url, idx) => (
                  <img key={`${product.id}-gallery-${idx}`} src={toApiAssetUrl(url)} alt={`${product.title} gallery ${idx + 1}`} className="listing-gallery-thumb" />
                ))}
              </div>
            ) : null}
          </div>
          <div className="col-lg-6">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="badge text-bg-light">{product.category?.name || 'Uncategorized'}</span>
                <span className={`badge ${String(product.status).toLowerCase() === 'published' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                  {product.status}
                </span>
                <span className="badge text-bg-success">Verified seller</span>
              </div>

              <h1 className="h3 mb-3 wrapped-text">{product.title}</h1>
              <p className="text-muted wrapped-text mb-4">{product.description || 'No description provided for this product.'}</p>

              <div className="listing-price-box mb-4">
                <div className="listing-price-label">Unit Price</div>
                <div className="listing-price-value">{product.unit_price}</div>
                <div className="small mt-1">Rating: <strong>{product.avgRating || 0}</strong> ({product.reviewCount || 0} reviews)</div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-6">
                  <div className="listing-stat-card">
                    <div className="small text-muted">Stock</div>
                    <div className="fw-bold">{product.stock_quantity}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="listing-stat-card">
                    <div className="small text-muted">Seller</div>
                    <div className="fw-bold wrapped-text">{product.farmer?.name || 'Unknown'}</div>
                  </div>
                </div>
              </div>

              <div className="listing-contact-box">
                <h6 className="mb-2">Seller Contact</h6>
                <p className="mb-1"><strong>Name:</strong> {product.farmer?.name || 'Unknown'}</p>
                <p className="mb-0"><strong>Phone:</strong> {product.farmer?.phone || 'Not provided'}</p>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <a href={product.farmer?.phone ? `tel:${product.farmer.phone}` : '#'} className="btn btn-outline-agri btn-sm">Call</a>
                  <a href={product.farmer?.phone ? `https://wa.me/${String(product.farmer.phone).replace(/\D/g, '')}` : '#'} target="_blank" rel="noreferrer" className="btn btn-outline-agri btn-sm">WhatsApp</a>
                  <button className="btn btn-outline-agri btn-sm" onClick={onShare}>Share</button>
                  <button className="btn btn-agri btn-sm" onClick={onSave}>{saved ? 'Saved' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-sticky-action d-md-none">
        <button className="btn btn-agri w-100" onClick={onSave}>{saved ? 'Saved Product' : 'Save Product'}</button>
      </div>

      <section className="mt-4">
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
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

        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="mb-0">Related Products</h4>
          <Link to="/marketplace" className="small text-decoration-none">Browse all</Link>
        </div>

        {relatedLoading ? (
          <div className="text-muted small">Loading related products...</div>
        ) : relatedProducts.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-muted">No related products found yet.</div>
          </div>
        ) : (
          <div className="row g-3">
            {relatedProducts.map((item) => (
              <div className="col-sm-6 col-lg-3" key={item.id}>
                <div className="card related-card h-100 border-0 shadow-sm">
                  {item.main_picture_url || item.thumbnail_url ? (
                    <img src={toApiAssetUrl(item.main_picture_url || item.thumbnail_url)} alt={item.title} className="related-card-image" />
                  ) : (
                    <div className="related-card-image-placeholder">No image</div>
                  )}
                  <div className="card-body d-flex flex-column">
                    <h6 className="mb-1 wrapped-text">{item.title}</h6>
                    <div className="small text-muted mb-2">{item.category?.name || 'Uncategorized'}</div>
                    <div className="fw-semibold mb-3">{item.unit_price}</div>
                    <Link to={`/marketplace/${item.id}`} className="btn btn-outline-agri btn-sm mt-auto">View</Link>
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
