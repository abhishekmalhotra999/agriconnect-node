import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Pagination from '../../components/Pagination';

export default function PrivacyPolicyIndex() {
    const navigate = useNavigate();
    const [data, setData] = useState({ privacy_policies: [], total: 0, page: 1, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPolicies = (page = 1) => {
        setLoading(true);
        client.get(`/admin/privacy_policies?page=${page}`)
            .then(res => setData(res.data))
            .catch(() => setError('Failed to load privacy policies.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchPolicies(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this privacy policy?')) return;
        try {
            await client.delete(`/admin/privacy_policies/${id}`);
            fetchPolicies(data.page);
        } catch {
            alert('Failed to delete.');
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0">Privacy Policies</h1>
                <Link to="/privacy-policies/new" className="btn btn-primary btn-sm">+ New Policy</Link>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : data.privacy_policies.length === 0 ? (
                <div className="text-muted">No privacy policies yet.</div>
            ) : (
                data.privacy_policies.map(p => (
                    <div key={p.id} className="card shadow-sm mb-3">
                        <div className="card-body">
                            <div
                                className="text-muted small mb-2"
                                dangerouslySetInnerHTML={{
                                    __html: (p.content || '').substring(0, 300) + ((p.content || '').length > 300 ? '…' : ''),
                                }}
                            />
                            <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-outline-info" onClick={() => navigate(`/privacy-policies/${p.id}`)}>View</button>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/privacy-policies/${p.id}/edit`)}>Edit</button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                            </div>
                        </div>
                    </div>
                ))
            )}

            {data.total_pages > 1 && (
                <div className="d-flex justify-content-end mt-2">
                    <Pagination page={data.page} totalPages={data.total_pages} onPageChange={fetchPolicies} />
                </div>
            )}
        </div>
    );
}
