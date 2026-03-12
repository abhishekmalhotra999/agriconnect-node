import { useEffect, useState } from 'react';
import client from '../../api/client';
import Pagination from '../../components/Pagination';

const STATUS_OPTIONS = ['draft', 'published', 'archived'];

export default function ProductIndex() {
    const [data, setData] = useState({ products: [], total: 0, page: 1, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchProducts = (page = 1) => {
        setLoading(true);
        client.get(`/admin/marketplace/products?page=${page}`)
            .then((res) => setData(res.data))
            .catch(() => setError('Failed to load marketplace products.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchProducts(); }, []);

    const updateStatus = async (id, status) => {
        try {
            await client.patch(`/admin/marketplace/products/${id}/status`, { status });
            fetchProducts(data.page);
        } catch {
            alert('Failed to update product status.');
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0">Marketplace Products</h1>
                <span className="badge bg-secondary">{data.total} total</span>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card shadow-sm">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 small">
                                <thead className="table-light">
                                    <tr>
                                        <th>ID</th>
                                        <th>Image</th>
                                        <th>Title</th>
                                        <th>Farmer</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>Stock</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.products.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center py-4 text-muted">No products yet.</td></tr>
                                    ) : data.products.map((product) => (
                                        <tr key={product.id}>
                                            <td>{product.id}</td>
                                            <td>
                                                {product.thumbnail_url ? (
                                                    <img src={product.thumbnail_url} alt={product.title} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                                                ) : '—'}
                                            </td>
                                            <td>
                                                <div className="fw-semibold">{product.title}</div>
                                                <div className="text-muted">{product.description || '—'}</div>
                                            </td>
                                            <td>{product.farmer?.name || '—'}</td>
                                            <td>{product.category?.name || '—'}</td>
                                            <td>{product.unit_price}</td>
                                            <td>{product.stock_quantity}</td>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={product.status}
                                                    onChange={(e) => updateStatus(product.id, e.target.value)}
                                                >
                                                    {STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {data.total_pages > 1 && (
                    <div className="card-footer d-flex justify-content-end">
                        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={fetchProducts} />
                    </div>
                )}
            </div>
        </div>
    );
}
