import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client, { getApiErrorMessage, toApiAssetUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { FarmerOnboarding, MarketplaceCategory, MarketplaceProduct } from '../types/api'
import { dismissCoach, isCoachDismissed, trackRecent } from '../utils/ux'

const PAGE_SIZE = 6

type SortKey = 'newest' | 'priceAsc' | 'priceDesc' | 'stockDesc'
type ImageInputMode = 'url' | 'upload'

export default function MarketplacePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [categories, setCategories] = useState<MarketplaceCategory[]>([])
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('newest')
  const [showOnlyInStock, setShowOnlyInStock] = useState(false)
  const [trustedOnly, setTrustedOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCoach, setShowCoach] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [farmerOnboarding, setFarmerOnboarding] = useState<FarmerOnboarding | null>(null)
  const [mainMode, setMainMode] = useState<ImageInputMode>('url')
  const [galleryMode, setGalleryMode] = useState<ImageInputMode>('url')
  const [mainFile, setMainFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category_id: '',
    unit_price: '',
    stock_quantity: '',
    status: 'published',
    main_picture_url: '',
    gallery_urls_text: '',
  })

  useEffect(() => {
    setShowCoach(!isCoachDismissed('marketplace'))
    Promise.all([
      client.get<MarketplaceCategory[]>('/api/marketplace/categories'),
      client.get<MarketplaceProduct[]>('/api/marketplace/products'),
    ])
      .then(([catRes, productRes]) => {
        setCategories(catRes.data.filter((category) => category.is_active))
        setProducts(productRes.data)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load marketplace data')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (String(user?.accountType || '').toLowerCase() !== 'farmer') {
      setFarmerOnboarding(null)
      return
    }

    setOnboardingLoading(true)
    client.get('/api/users/preferences')
      .then((res) => {
        const onboarding = (res.data?.farmerOnboarding || { completed: false }) as FarmerOnboarding
        setFarmerOnboarding(onboarding)
      })
      .catch(() => {
        setFarmerOnboarding({ completed: false })
      })
      .finally(() => setOnboardingLoading(false))
  }, [user?.accountType])

  const filtered = useMemo(() => {
    const categoryKey = selectedCategory.trim()
    const keyword = search.trim().toLowerCase()

    const next = products.filter((product) => {
      const categoryMatch = !categoryKey || String(product.category?.id || '') === categoryKey
      const searchMatch = !keyword || [product.title, product.description, product.farmer?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
      const stockMatch = !showOnlyInStock || Number(product.stock_quantity || 0) > 0
      const trustedMatch = !trustedOnly || Number(product.stock_quantity || 0) >= 20
      return categoryMatch && searchMatch && stockMatch && trustedMatch
    })

    if (sortBy === 'priceAsc') {
      return next.sort((a, b) => Number(a.unit_price) - Number(b.unit_price))
    }
    if (sortBy === 'priceDesc') {
      return next.sort((a, b) => Number(b.unit_price) - Number(a.unit_price))
    }
    if (sortBy === 'stockDesc') {
      return next.sort((a, b) => Number(b.stock_quantity) - Number(a.stock_quantity))
    }
    return next
  }, [products, selectedCategory, search, showOnlyInStock, trustedOnly, sortBy])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount
  const recommended = products.slice(0, 4)
  const isFarmer = String(user?.accountType || '').toLowerCase() === 'farmer'
  const onboardingCompleted = Boolean(farmerOnboarding?.completed)

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
      category_id: '',
      unit_price: '',
      stock_quantity: '',
      status: 'published',
      main_picture_url: '',
      gallery_urls_text: '',
    })
    setMainFile(null)
    setGalleryFiles([])
    setMainMode('url')
    setGalleryMode('url')
  }

  const submitCreateProduct = async () => {
    if (!createForm.title.trim()) {
      setError('Product title is required.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSubmitMessage('')

      const formData = new FormData()
      formData.append('title', createForm.title.trim())
      formData.append('description', createForm.description.trim())
      if (createForm.category_id) formData.append('category_id', createForm.category_id)
      if (createForm.unit_price) formData.append('unit_price', createForm.unit_price)
      if (createForm.stock_quantity) formData.append('stock_quantity', createForm.stock_quantity)
      formData.append('status', createForm.status)

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

      const res = await client.post<MarketplaceProduct>('/api/marketplace/products', formData)
      setProducts((prev) => [res.data, ...prev])
      setSubmitMessage('Product created successfully.')
      resetCreateForm()
      setShowCreate(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create product'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="page-title mb-0">Marketplace</h2>
        <span className="small text-muted">{filtered.length} items</span>
      </div>

      {showCoach && (
        <div className="alert alert-warning d-flex justify-content-between align-items-start gap-2">
          <div className="small">Tip: use filters to quickly find in-stock products, then open details to save or share.</div>
          <button
            className="btn btn-sm btn-light"
            onClick={() => {
              dismissCoach('marketplace')
              setShowCoach(false)
            }}
          >
            Got it
          </button>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {submitMessage && <div className="alert alert-success">{submitMessage}</div>}

      {isFarmer && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Sell a product</h5>
              {onboardingCompleted ? (
                <button className="btn btn-sm btn-outline-agri" onClick={() => setShowCreate((v) => !v)}>
                  {showCreate ? 'Close' : 'Add Product'}
                </button>
              ) : (
                <Link to="/onboarding/farmer" className="btn btn-sm btn-outline-agri">Complete Store Setup</Link>
              )}
            </div>
            {!onboardingLoading && !onboardingCompleted && (
              <div className="alert alert-warning small mb-3" role="alert">
                Complete your farmer store setup to start listing products in the marketplace.
              </div>
            )}
            {showCreate && onboardingCompleted && (
              <div className="row g-2">
                <div className="col-md-6">
                  <input className="form-control" placeholder="Product title" value={createForm.title} onChange={(e) => updateCreateForm('title', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <input className="form-control" type="number" min="0" step="0.01" placeholder="Price" value={createForm.unit_price} onChange={(e) => updateCreateForm('unit_price', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <input className="form-control" type="number" min="0" step="1" placeholder="Stock" value={createForm.stock_quantity} onChange={(e) => updateCreateForm('stock_quantity', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <select className="form-select" value={createForm.category_id} onChange={(e) => updateCreateForm('category_id', e.target.value)}>
                    <option value="">Choose category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <select className="form-select" value={createForm.status} onChange={(e) => updateCreateForm('status', e.target.value)}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="col-12">
                  <textarea className="form-control" rows={2} placeholder="Product description" value={createForm.description} onChange={(e) => updateCreateForm('description', e.target.value)} />
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
                  <button className="btn btn-agri" onClick={submitCreateProduct} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Create Product'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3 sticky-filter-bar">
        <div className="card-body row g-2">
          <div className="col-lg-4">
            <input
              className="form-control"
              placeholder="Search products, sellers"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setVisibleCount(PAGE_SIZE)
              }}
            />
          </div>
          <div className="col-md-4 col-lg-3">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setVisibleCount(PAGE_SIZE)
              }}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4 col-lg-3">
            <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
              <option value="newest">Newest</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
              <option value="stockDesc">Most Stock</option>
            </select>
          </div>
          <div className="col-lg-2 d-flex align-items-center gap-2">
            <button className={`btn btn-sm ${showOnlyInStock ? 'btn-agri' : 'btn-outline-agri'}`} onClick={() => setShowOnlyInStock((v) => !v)}>
              In stock
            </button>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <button className={`btn btn-sm ${trustedOnly ? 'btn-agri' : 'btn-outline-agri'}`} onClick={() => setTrustedOnly((v) => !v)}>Trusted sellers</button>
        <button className="btn btn-sm btn-outline-agri" onClick={() => { setSearch(''); setSelectedCategory(''); setSortBy('newest'); setShowOnlyInStock(false); setTrustedOnly(false); }}>Reset</button>
      </div>

      {recommended.length > 0 && (
        <section className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Recommended for you</h5>
            <span className="small text-muted">Top picks</span>
          </div>
          <div className="row g-3">
            {recommended.map((item) => (
              <div className="col-6 col-lg-3" key={item.id}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body p-2">
                    <div className="small fw-semibold wrapped-text">{item.title}</div>
                    <div className="small text-muted">{item.unit_price}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="row g-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div className="col-md-6" key={idx}>
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
          {visible.length === 0 && (
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h5 className="mb-1">No products found</h5>
                  <p className="text-muted small mb-3">Try changing filters or explore all categories.</p>
                  <Link to="/learn" className="btn btn-outline-agri btn-sm">Back to Learn</Link>
                </div>
              </div>
            </div>
          )}

          {visible.map((product) => (
            <div className="col-md-6" key={product.id}>
              <div
                className="card course-card h-100"
                role="button"
                tabIndex={0}
                onClick={() => {
                  trackRecent({ type: 'product', id: String(product.id), title: product.title, subtitle: String(product.unit_price), image: product.main_picture_url || product.thumbnail_url || undefined, link: `/marketplace/${product.id}` })
                  navigate(`/marketplace/${product.id}`)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    trackRecent({ type: 'product', id: String(product.id), title: product.title, subtitle: String(product.unit_price), image: product.main_picture_url || product.thumbnail_url || undefined, link: `/marketplace/${product.id}` })
                    navigate(`/marketplace/${product.id}`)
                  }
                }}
              >
                {product.main_picture_url || product.thumbnail_url ? (
                  <img
                    src={toApiAssetUrl(product.main_picture_url || product.thumbnail_url)}
                    alt={product.title}
                    className="card-img-top"
                    style={{ height: 180, objectFit: 'cover' }}
                  />
                ) : <div className="skeleton-thumb" />}
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-3 mb-2">
                    <h5 className="mb-0 wrapped-text">{product.title}</h5>
                    <span className="badge text-bg-light">{product.category?.name || 'Uncategorized'}</span>
                  </div>
                  <p className="small text-muted wrapped-text mb-2">{product.description || 'No description provided.'}</p>
                  <div className="small mb-1"><strong>Price:</strong> {product.unit_price}</div>
                  <div className="small mb-1"><strong>Stock:</strong> {product.stock_quantity}</div>
                  <div className="small text-muted mb-2">Seller: {product.farmer?.name || 'Unknown'}</div>
                  <div className="d-flex flex-wrap gap-2">
                    <span className="badge text-bg-success">Verified seller</span>
                    <span className="badge text-bg-secondary">Fast response</span>
                  </div>
                  <div className="mt-3 small text-muted">Tap card to view details</div>
                </div>
              </div>
            </div>
          ))}
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
