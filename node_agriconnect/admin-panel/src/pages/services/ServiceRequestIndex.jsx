import { useEffect, useState } from 'react';
import client from '../../api/client';
import Pagination from '../../components/Pagination';

const STATUS_OPTIONS = ['new', 'in_progress', 'resolved', 'closed'];

export default function ServiceRequestIndex() {
    const [data, setData] = useState({ requests: [], total: 0, page: 1, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRequests = (page = 1) => {
        setLoading(true);
        client.get(`/admin/services/requests?page=${page}`)
            .then((res) => setData(res.data))
            .catch(() => setError('Failed to load service requests.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchRequests(); }, []);

    const updateStatus = async (id, status) => {
        try {
            await client.patch(`/admin/services/requests/${id}/status`, { status });
            fetchRequests(data.page);
        } catch {
            alert('Failed to update request status.');
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0">Service Requests</h1>
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
                                        <th>Service</th>
                                        <th>Requester</th>
                                        <th>Technician</th>
                                        <th>Email Delivery</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.requests.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-4 text-muted">No service requests yet.</td></tr>
                                    ) : data.requests.map((req) => (
                                        <tr key={req.id}>
                                            <td>{req.id}</td>
                                            <td>
                                                <div className="fw-semibold">{req.listing?.title || '—'}</div>
                                                <div className="text-muted">{req.message}</div>
                                            </td>
                                            <td>
                                                <div>{req.requester_name}</div>
                                                <div className="text-muted">{req.requester_phone}</div>
                                            </td>
                                            <td>{req.listing?.technician?.name || '—'}</td>
                                            <td>
                                                <span className={`badge ${req.email_delivery_status === 'sent' ? 'bg-success' : req.email_delivery_status === 'failed' ? 'bg-danger' : 'bg-secondary'}`}>
                                                    {req.email_delivery_status}
                                                </span>
                                            </td>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={req.status}
                                                    onChange={(e) => updateStatus(req.id, e.target.value)}
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
                        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={fetchRequests} />
                    </div>
                )}
            </div>
        </div>
    );
}
