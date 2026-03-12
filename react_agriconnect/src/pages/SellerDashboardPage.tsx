import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import client, { getApiErrorMessage } from '../api/client'
import type { FarmerOnboarding, MarketplaceProduct, SellerStatus } from '../types/api'

export default function SellerDashboardPage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [onboarding, setOnboarding] = useState<FarmerOnboarding>({ completed: false })
  const [sellerStatus, setSellerStatus] = useState<SellerStatus>('approved')
  const [sellerStatusReason, setSellerStatusReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      client.get<MarketplaceProduct[]>('/api/marketplace/products/mine'),
      client.get('/api/users/preferences'),
    ])
      .then(([productsRes, prefRes]) => {
        setProducts(productsRes.data || [])
        setOnboarding((prefRes.data?.farmerOnboarding || { completed: false }) as FarmerOnboarding)
        setSellerStatus((prefRes.data?.sellerStatus || 'approved') as SellerStatus)
        setSellerStatusReason(String(prefRes.data?.sellerStatusReason || ''))
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load seller dashboard')))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const published = products.filter((product) => product.status === 'published').length
    const draft = products.filter((product) => product.status === 'draft').length
    const lowStock = products.filter((product) => Number(product.stock_quantity || 0) <= 5).length
    const totalStock = products.reduce((sum, product) => sum + Number(product.stock_quantity || 0), 0)
    return { published, draft, lowStock, totalStock }
  }, [products])

  const onboardingChecks = useMemo(() => {
    const items = [
      { label: 'Store name added', done: Boolean(onboarding.storeName?.trim()) },
      { label: 'Business type selected', done: Boolean(onboarding.businessType?.trim()) },
      { label: 'Service area set', done: Boolean(onboarding.serviceArea?.trim()) },
      { label: 'Contact phone provided', done: Boolean(onboarding.contactPhone?.trim()) },
      { label: 'Contact email provided', done: Boolean(onboarding.contactEmail?.trim()) },
      { label: 'Setup submitted', done: Boolean(onboarding.completed) },
    ]
    const doneCount = items.filter((item) => item.done).length
    return {
      items,
      doneCount,
      total: items.length,
      progress: Math.round((doneCount / items.length) * 100),
    }
  }, [onboarding])

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title mb-0">Seller Dashboard</h2>
        <Link to="/seller/products" className="btn btn-outline-agri btn-sm">Manage Products</Link>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="alert alert-light d-flex justify-content-between align-items-center" role="status">
        <span className="small">Seller Verification Status</span>
        <span className={`badge text-capitalize ${sellerStatus === 'approved' ? 'text-bg-success' : sellerStatus === 'pending' ? 'text-bg-warning' : 'text-bg-danger'}`}>
          {sellerStatus}
        </span>
      </div>

      {sellerStatus !== 'approved' && sellerStatusReason ? (
        <div className="alert alert-info small" role="alert">
          <strong>Admin Note:</strong> {sellerStatusReason}
        </div>
      ) : null}

      {!onboarding.completed ? (
        <div className="alert alert-warning d-flex justify-content-between align-items-center" role="alert">
          <span>Finish your farmer onboarding to publish and grow your store.</span>
          <Link to="/onboarding/farmer" className="btn btn-sm btn-agri">Complete Setup</Link>
        </div>
      ) : null}

      {loading ? <div className="text-muted">Loading seller data...</div> : null}

      {!loading && (
        <>
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Onboarding Checklist</h5>
                <span className="small text-muted">{onboardingChecks.doneCount}/{onboardingChecks.total} complete</span>
              </div>
              <div className="progress mb-3" role="progressbar" aria-label="Onboarding progress" aria-valuenow={onboardingChecks.progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-bar bg-success" style={{ width: `${onboardingChecks.progress}%` }}>{onboardingChecks.progress}%</div>
              </div>
              <div className="row g-2">
                {onboardingChecks.items.map((item) => (
                  <div className="col-md-6" key={item.label}>
                    <div className={`small rounded p-2 ${item.done ? 'bg-light text-success' : 'bg-light text-muted'}`}>
                      <i className={`bi ${item.done ? 'bi-check-circle-fill' : 'bi-circle'} me-2`} />
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
              {!onboarding.completed ? (
                <div className="mt-3">
                  <Link to="/onboarding/farmer" className="btn btn-sm btn-agri">Continue Setup</Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="small text-muted">Published</div>
                  <div className="h4 mb-0">{stats.published}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="small text-muted">Drafts</div>
                  <div className="h4 mb-0">{stats.draft}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="small text-muted">Low Stock</div>
                  <div className="h4 mb-0">{stats.lowStock}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="small text-muted">Total Stock Units</div>
                  <div className="h4 mb-0">{stats.totalStock}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Recent Products</h5>
                <Link to="/marketplace" className="btn btn-outline-agri btn-sm">Go to Marketplace</Link>
              </div>

              {products.length === 0 ? (
                <div className="small text-muted">No products yet. Add your first listing from Marketplace.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Stock</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.slice(0, 8).map((product) => (
                        <tr key={product.id}>
                          <td>{product.title}</td>
                          <td><span className="badge text-bg-light text-capitalize">{product.status}</span></td>
                          <td>{product.stock_quantity}</td>
                          <td>{product.unit_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
