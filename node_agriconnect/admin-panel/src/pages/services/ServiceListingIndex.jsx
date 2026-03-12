import { useEffect, useState } from 'react';
import client from '../../api/client';
import Pagination from '../../components/Pagination';

export default function ServiceListingIndex() {
    const [data, setData] = useState({ listings: [], total: 0, page: 1, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchListings = (page = 1) => {
        setLoading(true);
        client.get(`/admin/services/listings?page=${page}`)
            .then((res) => setData(res.data))
            .catch(() => setError('Failed to load service listings.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchListings(); }, []);

    const toggleActive = async (id, current) => {
        try {
            await client.patch(`/admin/services/listings/${id}/active`, { is_active: !current });
            fetchListings(data.page);
        } catch {
            alert('Failed to update listing status.');
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0">Service Listings</h1>
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
                                        <th>Technician</th>
                                        <th>Category</th>
                                        <th>Area</th>
                                        <th>Email</th>
                                        <th>Active</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.listings.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center py-4 text-muted">No service listings yet.</td></tr>
                                    ) : data.listings.map((listing) => (
                                        <tr key={listing.id}>
                                            <td>{listing.id}</td>
                                            <td>
                                                {listing.thumbnail_url ? (
                                                    <img src={listing.thumbnail_url} alt={listing.title} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                                                ) : '—'}
                                            </td>
                                            <td>
                                                <div className="fw-semibold">{listing.title}</div>
                                                <div className="text-muted">{listing.description || '—'}</div>
                                            </td>
                                            <td>{listing.technician?.name || '—'}</td>
                                            <td>{listing.category?.name || '—'}</td>
                                            <td>{listing.service_area || '—'}</td>
                                            <td>{listing.contact_email || '—'}</td>
                                            <td>
                                                <button
                                                    className={`btn btn-sm ${listing.is_active ? 'btn-outline-success' : 'btn-outline-secondary'}`}
                                                    onClick={() => toggleActive(listing.id, listing.is_active)}
                                                >
                                                    {listing.is_active ? 'Active' : 'Inactive'}
                                                </button>
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
                        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={fetchListings} />
                    </div>
                )}
            </div>
        </div>
    );
}
