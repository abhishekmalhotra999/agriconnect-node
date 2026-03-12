import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import client, { getApiErrorMessage } from '../api/client'
import type { MarketplaceProduct, SellerStatus } from '../types/api'

type FilterStatus = 'all' | 'published' | 'draft'

export default function SellerProductsPage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<FilterStatus>('all')
  const [updatingId, setUpdatingId] = useState<string | number | null>(null)
  const [sellerStatus, setSellerStatus] = useState<SellerStatus>('approved')
  const [sellerStatusReason, setSellerStatusReason] = useState('')
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftPrice, setDraftPrice] = useState('')
  const [draftStock, setDraftStock] = useState('')

  useEffect(() => {
    Promise.all([
      client.get<MarketplaceProduct[]>('/api/marketplace/products/mine'),
      client.get('/api/users/preferences'),
    ])
      .then(([productRes, prefRes]) => {
        setProducts(productRes.data || [])
        setSellerStatus((prefRes.data?.sellerStatus || 'approved') as SellerStatus)
        setSellerStatusReason(String(prefRes.data?.sellerStatusReason || ''))
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load your products')))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((item) => {
      const matchStatus = status === 'all' ? true : item.status === status
      const matchSearch = !q || item.title.toLowerCase().includes(q) || String(item.description || '').toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [products, search, status])

  const togglePublish = async (product: MarketplaceProduct) => {
    try {
      setUpdatingId(product.id)
      setError('')
      const nextStatus = product.status === 'published' ? 'draft' : 'published'
      if (nextStatus === 'published' && sellerStatus !== 'approved') {
        setError(sellerStatusReason
          ? `Your seller status is ${sellerStatus}. ${sellerStatusReason}`
          : `Your seller status is ${sellerStatus}. Only approved sellers can publish products.`)
        return
      }
      const res = await client.put<MarketplaceProduct>(`/api/marketplace/products/${product.id}`, {
        status: nextStatus,
      })
      setProducts((prev) => prev.map((item) => (item.id === product.id ? res.data : item)))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update product status'))
    } finally {
      setUpdatingId(null)
    }
  }

  const startEdit = (product: MarketplaceProduct) => {
    setEditingId(product.id)
    setDraftTitle(product.title)
    setDraftPrice(String(product.unit_price ?? ''))
    setDraftStock(String(product.stock_quantity ?? ''))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraftTitle('')
    setDraftPrice('')
    setDraftStock('')
  }

  const saveEdit = async (product: MarketplaceProduct) => {
    if (!draftTitle.trim()) {
      setError('Product title is required.')
      return
    }

    try {
      setUpdatingId(product.id)
      setError('')
      const res = await client.put<MarketplaceProduct>(`/api/marketplace/products/${product.id}`, {
        title: draftTitle.trim(),
        unit_price: draftPrice,
        stock_quantity: draftStock,
      })
      setProducts((prev) => prev.map((item) => (item.id === product.id ? res.data : item)))
      cancelEdit()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update product details'))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title mb-0">My Products</h2>
        <Link to="/seller/dashboard" className="btn btn-outline-agri btn-sm">Back to Dashboard</Link>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body row g-2">
          <div className="col-md-8">
            <input className="form-control" placeholder="Search your products" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="col-md-4">
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as FilterStatus)}>
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? <div className="text-muted">Loading products...</div> : null}

      {!loading && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {filtered.length === 0 ? (
              <div className="p-3 small text-muted">No matching products found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Stock</th>
                      <th>Price</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((product) => (
                      <tr key={product.id} data-testid={`seller-product-row-${product.id}`}>
                        <td>
                          {editingId === product.id ? (
                            <input
                              data-testid={`seller-edit-title-${product.id}`}
                              className="form-control form-control-sm"
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                            />
                          ) : (
                            <div className="fw-semibold">{product.title}</div>
                          )}
                          <div className="small text-muted wrapped-text">{product.description || 'No description'}</div>
                        </td>
                        <td>{product.category?.name || 'Uncategorized'}</td>
                        <td><span className="badge text-bg-light text-capitalize">{product.status}</span></td>
                        <td>
                          {editingId === product.id ? (
                            <input
                              data-testid={`seller-edit-stock-${product.id}`}
                              className="form-control form-control-sm"
                              type="number"
                              min="0"
                              step="1"
                              value={draftStock}
                              onChange={(e) => setDraftStock(e.target.value)}
                            />
                          ) : product.stock_quantity}
                        </td>
                        <td>
                          {editingId === product.id ? (
                            <input
                              data-testid={`seller-edit-price-${product.id}`}
                              className="form-control form-control-sm"
                              type="number"
                              min="0"
                              step="0.01"
                              value={draftPrice}
                              onChange={(e) => setDraftPrice(e.target.value)}
                            />
                          ) : product.unit_price}
                        </td>
                        <td>
                          <Link to={`/marketplace/${product.id}`} className="btn btn-sm btn-outline-agri">View</Link>
                          {editingId === product.id ? (
                            <>
                              <button
                                data-testid={`seller-save-${product.id}`}
                                className="btn btn-sm btn-agri ms-2"
                                disabled={updatingId === product.id}
                                onClick={() => saveEdit(product)}
                              >
                                {updatingId === product.id ? 'Saving...' : 'Save'}
                              </button>
                              <button data-testid={`seller-cancel-${product.id}`} className="btn btn-sm btn-outline-secondary ms-2" onClick={cancelEdit}>Cancel</button>
                            </>
                          ) : (
                            <button data-testid={`seller-edit-${product.id}`} className="btn btn-sm btn-outline-secondary ms-2" onClick={() => startEdit(product)}>Edit</button>
                          )}
                          <button
                            data-testid={`seller-publish-toggle-${product.id}`}
                            className="btn btn-sm btn-agri ms-2"
                            disabled={updatingId === product.id || editingId === product.id}
                            onClick={() => togglePublish(product)}
                          >
                            {updatingId === product.id ? 'Saving...' : (product.status === 'published' ? 'Set Draft' : 'Publish')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
