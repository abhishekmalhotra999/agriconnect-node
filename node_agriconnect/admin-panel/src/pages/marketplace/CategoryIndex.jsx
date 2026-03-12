import { useEffect, useState } from 'react';
import client from '../../api/client';
import Pagination from '../../components/Pagination';

const initialForm = { name: '', description: '', is_active: true };

export default function CategoryIndex() {
    const [data, setData] = useState({ categories: [], total: 0, page: 1, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);

    const fetchCategories = (page = 1) => {
        setLoading(true);
        client.get(`/admin/marketplace/categories?page=${page}`)
            .then((res) => setData(res.data))
            .catch(() => setError('Failed to load marketplace categories.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchCategories(); }, []);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        try {
            if (editingId) {
                await client.put(`/admin/marketplace/categories/${editingId}`, form);
            } else {
                await client.post('/admin/marketplace/categories', form);
            }
            setForm(initialForm);
            setEditingId(null);
            fetchCategories(data.page);
        } catch {
            alert('Failed to save category.');
        }
    };

    const onEdit = (category) => {
        setEditingId(category.id);
        setForm({
            name: category.name || '',
            description: category.description || '',
            is_active: !!category.is_active,
        });
    };

    const onDelete = async (id) => {
        if (!window.confirm('Delete this category?')) return;
        try {
            await client.delete(`/admin/marketplace/categories/${id}`);
            fetchCategories(data.page);
        } catch {
            alert('Failed to delete category.');
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0">Marketplace Categories</h1>
                <span className="badge bg-secondary">{data.total} total</span>
            </div>

            <form className="card mb-3" onSubmit={onSubmit}>
                <div className="card-body row g-2 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label">Name</label>
                        <input className="form-control" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="col-md-5">
                        <label className="form-label">Description</label>
                        <input className="form-control" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </div>
                    <div className="col-md-1">
                        <div className="form-check mt-4">
                            <input className="form-check-input" type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
                            <label className="form-check-label">Active</label>
                        </div>
                    </div>
                    <div className="col-md-2 d-flex gap-2">
                        <button className="btn btn-primary btn-sm" type="submit">{editingId ? 'Update' : 'Add'}</button>
                        {editingId && <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel</button>}
                    </div>
                </div>
            </form>

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
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.categories.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center py-4 text-muted">No categories yet.</td></tr>
                                    ) : data.categories.map((category) => (
                                        <tr key={category.id}>
                                            <td>{category.id}</td>
                                            <td>{category.name}</td>
                                            <td>{category.description || '—'}</td>
                                            <td><span className={`badge ${category.is_active ? 'bg-success' : 'bg-secondary'}`}>{category.is_active ? 'Active' : 'Inactive'}</span></td>
                                            <td className="d-flex gap-1">
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => onEdit(category)}>Edit</button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(category.id)}>Delete</button>
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
                        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={fetchCategories} />
                    </div>
                )}
            </div>
        </div>
    );
}
