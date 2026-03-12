import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function PrivacyPolicyShow() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        client.get(`/admin/privacy_policies/${id}`)
            .then(res => setPolicy(res.data))
            .catch(() => setError('Not found.'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm('Delete this privacy policy?')) return;
        await client.delete(`/admin/privacy_policies/${id}`);
        navigate('/privacy-policies');
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
    if (error) return <div className="alert alert-danger">{error}</div>;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0">Privacy Policy</h1>
                <div className="d-flex gap-2">
                    <Link to={`/privacy-policies/${id}/edit`} className="btn btn-sm btn-primary">Edit</Link>
                    <button className="btn btn-sm btn-danger" onClick={handleDelete}>Delete</button>
                    <Link to="/privacy-policies" className="btn btn-sm btn-secondary">Back</Link>
                </div>
            </div>
            <div className="card shadow-sm">
                <div className="card-body">
                    <div
                        className="ql-editor"
                        dangerouslySetInnerHTML={{ __html: policy.content }}
                        style={{ minHeight: 200 }}
                    />
                </div>
            </div>
        </div>
    );
}
