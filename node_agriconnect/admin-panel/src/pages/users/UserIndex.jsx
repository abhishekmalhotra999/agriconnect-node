import { useEffect, useState } from 'react';
import client from '../../api/client';
import Pagination from '../../components/Pagination';

const SELLER_STATUS_OPTIONS = ['pending', 'approved', 'rejected'];

export default function UserIndex() {
    const [data, setData] = useState({ users: [], total: 0, page: 1, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingSellerStatusId, setSavingSellerStatusId] = useState(null);
    const [sellerStatusReasonByUser, setSellerStatusReasonByUser] = useState({});
    const [roleFilter, setRoleFilter] = useState('');
    const [sellerStatusFilter, setSellerStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    const fetchUsers = (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (roleFilter) params.set('user_type', roleFilter);
        if (sellerStatusFilter) params.set('seller_status', sellerStatusFilter);
        if (search.trim()) params.set('search', search.trim());

        client.get(`/admin/users?${params.toString()}`)
            .then(res => {
                setData(res.data);
                setSellerStatusReasonByUser((prev) => {
                    const next = { ...prev };
                    (res.data?.users || []).forEach((u) => {
                        next[u.id] = u.seller_status_reason || next[u.id] || '';
                    });
                    return next;
                });
            })
            .catch(() => setError('Failed to load users.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchUsers(); }, [roleFilter, sellerStatusFilter]);

    const updateSellerStatus = async (userId, sellerStatus) => {
        try {
            setSavingSellerStatusId(userId);
            setError('');
            const sellerStatusReason = String(sellerStatusReasonByUser[userId] || '').trim();
            await client.patch(`/admin/users/${userId}/seller-status`, { sellerStatus, sellerStatusReason });
            setData((prev) => ({
                ...prev,
                users: prev.users.map((u) => (u.id === userId
                    ? { ...u, seller_status: sellerStatus, seller_status_reason: sellerStatus === 'approved' ? null : sellerStatusReason }
                    : u)),
            }));
            if (sellerStatus === 'approved') {
                setSellerStatusReasonByUser((prev) => ({ ...prev, [userId]: '' }));
            }
        } catch (err) {
            setError(err?.response?.data?.errors?.[0] || 'Failed to update seller status.');
        } finally {
            setSavingSellerStatusId(null);
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0">Users</h1>
                <span className="badge bg-secondary">{data.total} total</span>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card shadow-sm mb-3">
                <div className="card-body row g-2">
                    <div className="col-md-4">
                        <input
                            className="form-control"
                            placeholder="Search name, email, phone"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') fetchUsers(1);
                            }}
                        />
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                            <option value="">All user types</option>
                            <option value="farmer">Farmer</option>
                            <option value="customer">Customer</option>
                            <option value="technician">Technician</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={sellerStatusFilter} onChange={(e) => setSellerStatusFilter(e.target.value)}>
                            <option value="">All seller statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="col-md-2 d-flex gap-2">
                        <button className="btn btn-outline-primary w-100" onClick={() => fetchUsers(1)}>Apply</button>
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => {
                                setRoleFilter('');
                                setSellerStatusFilter('');
                                setSearch('');
                                setTimeout(() => fetchUsers(1), 0);
                            }}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 small">
                                <thead className="table-light">
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>User Type</th>
                                        <th>Profession</th>
                                        <th>Farm Size</th>
                                        <th>Address</th>
                                        <th>Experience</th>
                                        <th>Seller Status</th>
                                        <th>Status Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.users.length === 0 ? (
                                        <tr><td colSpan="11" className="text-center text-muted py-4">No users found.</td></tr>
                                    ) : data.users.map(u => (
                                        <tr key={u.id}>
                                            <td className="text-muted">{u.id}</td>
                                            <td>{u.name || '—'}</td>
                                            <td>{u.email || '—'}</td>
                                            <td>{u.phone || '—'}</td>
                                            <td>
                                                {u.user_type ? (
                                                    <span className="badge bg-primary">{u.user_type}</span>
                                                ) : '—'}
                                            </td>
                                            <td>{u.profession_type || '—'}</td>
                                            <td>{u.farm_size && u.farm_size !== '0' ? u.farm_size : '—'}</td>
                                            <td>{u.address || '—'}</td>
                                            <td>{u.years_of_experience || '—'}</td>
                                            <td>
                                                {u.user_type === 'farmer' ? (
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={u.seller_status || 'approved'}
                                                        disabled={savingSellerStatusId === u.id}
                                                        onChange={(e) => updateSellerStatus(u.id, e.target.value)}
                                                    >
                                                        {SELLER_STATUS_OPTIONS.map((status) => (
                                                            <option key={status} value={status}>{status}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-muted">N/A</span>
                                                )}
                                            </td>
                                            <td>
                                                {u.user_type === 'farmer' ? (
                                                    <input
                                                        className="form-control form-control-sm"
                                                        placeholder="Reason for pending/rejected"
                                                        value={sellerStatusReasonByUser[u.id] || ''}
                                                        disabled={savingSellerStatusId === u.id}
                                                        onChange={(e) => setSellerStatusReasonByUser((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                                    />
                                                ) : (
                                                    <span className="text-muted">N/A</span>
                                                )}
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
                        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={fetchUsers} />
                    </div>
                )}
            </div>
        </div>
    );
}
