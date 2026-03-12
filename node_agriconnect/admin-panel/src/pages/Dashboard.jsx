import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        client.get('/admin/dashboard')
            .then(res => setStats(res.data))
            .catch(() => setError('Failed to load dashboard stats.'))
            .finally(() => setLoading(false));
    }, []);

    const cards = stats ? [
        { label: 'Total Courses', value: stats.totalCourses, icon: 'bi-book', color: 'primary' },
        { label: 'Total Users', value: stats.totalUsers, icon: 'bi-people', color: 'success' },
        { label: 'Total Enrollments', value: stats.totalEnrollments, icon: 'bi-person-check', color: 'info' },
    ] : [];

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0 text-gray-800">Dashboard</h1>
            </div>

            {loading && (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                </div>
            )}
            {error && <div className="alert alert-danger">{error}</div>}

            {stats && (
                <div className="row g-3">
                    {cards.map(card => (
                        <div className="col-xl-4 col-md-6" key={card.label}>
                            <div className={`card border-left-${card.color} shadow h-100 py-2`}
                                style={{ borderLeft: `4px solid var(--bs-${card.color})` }}>
                                <div className="card-body">
                                    <div className="row align-items-center">
                                        <div className="col">
                                            <div className={`text-xs fw-bold text-${card.color} text-uppercase mb-1 small`}>
                                                {card.label}
                                            </div>
                                            <div className="h5 mb-0 fw-bold text-gray-800">
                                                {card.value?.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="col-auto">
                                            <i className={`bi ${card.icon} fs-2 text-${card.color} opacity-25`}></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
