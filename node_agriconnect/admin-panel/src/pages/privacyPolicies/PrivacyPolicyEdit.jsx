import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import client from '../../api/client';

export default function PrivacyPolicyEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        client.get(`/admin/privacy_policies/${id}`)
            .then(res => setContent(res.data.content || ''))
            .catch(() => setError('Failed to load privacy policy.'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await client.put(`/admin/privacy_policies/${id}`, { content });
            navigate('/privacy-policies');
        } catch (err) {
            setError(err.response?.data?.errors?.[0] || 'Failed to save.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div>
            <div className="d-flex align-items-center mb-4">
                <h1 className="h3 mb-0">Edit Privacy Policy</h1>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <label className="form-label fw-semibold">Content</label>
                        <ReactQuill value={content} onChange={setContent} theme="snow" style={{ minHeight: 300 }} />
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Saving…' : 'Update Policy'}
                    </button>
                    <a href="/privacy-policies" className="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
    );
}
