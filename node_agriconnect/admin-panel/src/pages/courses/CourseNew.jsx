import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import CourseForm from './CourseForm';

export default function CourseNew() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        setError('');
        try {
            await client.post('/admin/courses', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            navigate('/courses');
        } catch (err) {
            const msg = err.response?.data?.errors?.[0] || 'Failed to create course.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center mb-4">
                <h1 className="h3 mb-0">New Course</h1>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <CourseForm onSubmit={handleSubmit} submitting={submitting} />
        </div>
    );
}
