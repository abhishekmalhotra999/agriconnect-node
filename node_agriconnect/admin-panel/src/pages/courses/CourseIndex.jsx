import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Pagination from '../../components/Pagination';

export default function CourseIndex() {
    const navigate = useNavigate();
    const [data, setData] = useState({ courses: [], total: 0, page: 1, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchCourses = (page = 1) => {
        setLoading(true);
        client.get(`/admin/courses?page=${page}`)
            .then(res => setData(res.data))
            .catch(() => setError('Failed to load courses.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchCourses(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this course? This cannot be undone.')) return;
        try {
            await client.delete(`/admin/courses/${id}`);
            fetchCourses(data.page);
        } catch {
            alert('Failed to delete course.');
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0">Courses</h1>
                <Link to="/courses/new" className="btn btn-primary btn-sm">
                    + New Course
                </Link>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card shadow-sm">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Title</th>
                                        <th>Price</th>
                                        <th>Duration</th>
                                        <th>Lessons</th>
                                        <th>Instructor</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.courses.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center text-muted py-4">No courses found.</td></tr>
                                    ) : data.courses.map(c => (
                                        <tr key={c.id}>
                                            <td className="text-muted small">{c.id}</td>
                                            <td>
                                                <div className="fw-semibold">{c.title}</div>
                                                {c.subtitle && <div className="text-muted small">{c.subtitle}</div>}
                                            </td>
                                            <td>{c.price || '—'}</td>
                                            <td>{c.duration || '—'}</td>
                                            <td><span className="badge bg-secondary">{c.lessons_count}</span></td>
                                            <td>{c.instructor || '—'}</td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <button className="btn btn-sm btn-outline-info" onClick={() => navigate(`/courses/${c.id}`)}>View</button>
                                                    <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/courses/${c.id}/edit`)}>Edit</button>
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                                                </div>
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
                        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={fetchCourses} />
                    </div>
                )}
            </div>
        </div>
    );
}
