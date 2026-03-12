import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';
import CourseForm from './CourseForm';

export default function CourseEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        client.get(`/admin/courses/${id}`)
            .then(res => setCourse(res.data))
            .catch(() => setError('Failed to load course.'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        setError('');
        try {
            await client.put(`/admin/courses/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            navigate('/courses');
        } catch (err) {
            const msg = err.response?.data?.errors?.[0] || 'Failed to update course.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div>
            <div className="d-flex align-items-center mb-4">
                <h1 className="h3 mb-0">Edit Course</h1>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            {course && <CourseForm initialData={course} onSubmit={handleSubmit} submitting={submitting} />}
        </div>
    );
}
