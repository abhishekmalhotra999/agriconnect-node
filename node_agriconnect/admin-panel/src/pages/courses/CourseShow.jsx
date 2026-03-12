import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function CourseShow() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        client.get(`/admin/courses/${id}`)
            .then(res => setCourse(res.data))
            .catch(() => setError('Course not found.'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm('Delete this course?')) return;
        await client.delete(`/admin/courses/${id}`);
        navigate('/courses');
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
    if (error) return <div className="alert alert-danger">{error}</div>;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h1 className="h3 mb-0">{course.title}</h1>
                <div className="d-flex gap-2">
                    <Link to={`/courses/${id}/edit`} className="btn btn-sm btn-primary">Edit</Link>
                    <button className="btn btn-sm btn-danger" onClick={handleDelete}>Delete</button>
                    <Link to="/courses" className="btn btn-sm btn-secondary">Back</Link>
                </div>
            </div>

            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        {course.thumbnail_image && (
                            <div className="col-md-4">
                                <img
                                    src={`http://localhost:3000${course.thumbnail_image}`}
                                    alt="thumbnail"
                                    className="img-fluid rounded"
                                />
                            </div>
                        )}
                        <div className={course.thumbnail_image ? 'col-md-8' : 'col-12'}>
                            {course.subtitle && <p className="text-muted">{course.subtitle}</p>}
                            <dl className="row mb-0">
                                <dt className="col-sm-3">Price</dt>
                                <dd className="col-sm-9">{course.price || '—'}</dd>
                                <dt className="col-sm-3">Duration</dt>
                                <dd className="col-sm-9">{course.duration || '—'}</dd>
                                <dt className="col-sm-3">Instructor</dt>
                                <dd className="col-sm-9">{course.instructor || '—'}</dd>
                            </dl>
                        </div>
                        {course.description && (
                            <div className="col-12">
                                <label className="fw-semibold">Description</label>
                                <div
                                    className="border rounded p-3 bg-light text-break"
                                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                                    dangerouslySetInnerHTML={{ __html: course.description }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <h4 className="mb-3">Lessons ({course.lessons?.length || 0})</h4>
            {course.lessons?.map((lesson, idx) => (
                <div key={lesson.id} className="card shadow-sm mb-3">
                    <div className="card-header fw-semibold">
                        Lesson {idx + 1}: {lesson.title}
                    </div>
                    <div className="card-body">
                        {!lesson.thumbnail_asset && !lesson.content && !lesson.lesson_asset && !lesson.resource_url && (
                            <p className="text-muted mb-2">No lesson details added yet for this lesson.</p>
                        )}
                        {lesson.thumbnail_asset && (
                            <img
                                src={`http://localhost:3000${lesson.thumbnail_asset}`}
                                alt="thumbnail"
                                style={{ height: 80, borderRadius: 4, marginBottom: 8 }}
                            />
                        )}
                        {lesson.content && (
                            <div
                                className="text-break"
                                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                                dangerouslySetInnerHTML={{ __html: lesson.content }}
                            />
                        )}
                        {lesson.lesson_asset && (
                            <div className="mt-2">
                                <a href={`http://localhost:3000${lesson.lesson_asset}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                                    View Lesson Asset
                                </a>
                            </div>
                        )}
                        {lesson.resource_url && (
                            <div className="mt-2">
                                <a href={lesson.resource_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                                    Open Resource Link
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
