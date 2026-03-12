import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import client from '../../api/client';

export default function PrivacyPolicyNew() {
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await client.post('/admin/privacy_policies', { content });
            navigate('/privacy-policies');
        } catch (err) {
            setError(err.response?.data?.errors?.[0] || 'Failed to save.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center mb-4">
                <h1 className="h3 mb-0">New Privacy Policy</h1>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <label className="form-label fw-semibold">Content *</label>
                        <ReactQuill value={content} onChange={setContent} theme="snow" style={{ minHeight: 300 }} />
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Saving…' : 'Save Policy'}
                    </button>
                    <a href="/privacy-policies" className="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
    );
}
