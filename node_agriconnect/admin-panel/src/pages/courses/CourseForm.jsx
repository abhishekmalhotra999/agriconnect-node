import { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const emptyLesson = () => ({
    _key: Date.now() + Math.random(),
    id: null,
    title: '',
    content: '',
    lesson_asset: null,
    lesson_asset_preview: null,
    thumbnail_asset: null,
    thumbnail_asset_preview: null,
    remove_lesson_asset: false,
    remove_thumbnail_asset: false,
    _destroy: false,
});

export default function CourseForm({ initialData, onSubmit, submitting }) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [price, setPrice] = useState(initialData?.price || '');
    const [duration, setDuration] = useState(initialData?.duration || '');
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [removePreview, setRemovePreview] = useState(false);
    const [removeThumbnail, setRemoveThumbnail] = useState(false);

    const [lessons, setLessons] = useState(() => {
        if (initialData?.lessons?.length) {
            return initialData.lessons.map(l => ({
                _key: l.id,
                id: l.id,
                title: l.title || '',
                content: l.content || '',
                lesson_asset: null,
                lesson_asset_preview: l.lesson_asset || null,
                thumbnail_asset: null,
                thumbnail_asset_preview: l.thumbnail_asset || null,
                remove_lesson_asset: false,
                remove_thumbnail_asset: false,
                _destroy: false,
            }));
        }
        return [emptyLesson()];
    });

    const addLesson = () => setLessons(prev => [...prev, emptyLesson()]);

    const removeLesson = (key) => {
        setLessons(prev => prev.map(l =>
            l._key === key ? { ...l, _destroy: true } : l
        ));
    };

    const updateLesson = (key, field, value) => {
        setLessons(prev => prev.map(l =>
            l._key === key ? { ...l, [field]: value } : l
        ));
    };

    const handleLessonFile = (key, field, file) => {
        setLessons(prev => prev.map(l =>
            l._key === key ? { ...l, [field]: file } : l
        ));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('title', title);
        formData.append('subtitle', subtitle);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('duration', duration);
        if (thumbnailFile) formData.append('thumbnail_image', thumbnailFile);
        if (previewFile) formData.append('course_preview', previewFile);
        if (removePreview) formData.append('remove_preview', '1');
        if (removeThumbnail) formData.append('remove_thumbnail_image', '1');

        // Include all lessons (even _destroy ones with an id, so backend can delete them)
        const activeLessons = lessons.filter(l => !(l._destroy && !l.id));

        activeLessons.forEach((l, idx) => {
            formData.append(`lessons[${idx}][title]`, l.title);
            formData.append(`lessons[${idx}][content]`, l.content);
            if (l.id) formData.append(`lessons[${idx}][id]`, l.id);
            if (l._destroy) formData.append(`lessons[${idx}][_destroy]`, '1');
            if (l.remove_lesson_asset) formData.append(`lessons[${idx}][remove_lesson_asset]`, '1');
            if (l.remove_thumbnail_asset) formData.append(`lessons[${idx}][remove_thumbnail_asset]`, '1');
            // Use per-lesson field names so the index always matches on the backend
            if (l.lesson_asset) formData.append(`lesson_asset_${idx}`, l.lesson_asset);
            if (l.thumbnail_asset) formData.append(`lesson_thumbnail_asset_${idx}`, l.thumbnail_asset);
        });

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="card shadow-sm mb-4">
                <div className="card-header fw-semibold">Course Details</div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label">Title *</label>
                            <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Subtitle</label>
                            <input className="form-control" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Price</label>
                            <input className="form-control" value={price} onChange={e => setPrice(e.target.value)} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Duration</label>
                            <input className="form-control" value={duration} onChange={e => setDuration(e.target.value)} />
                        </div>
                        <div className="col-12">
                            <label className="form-label">Description</label>
                            <ReactQuill value={description} onChange={setDescription} theme="snow" style={{ minHeight: 150 }} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Thumbnail Image</label>
                            {initialData?.thumbnail_image && !removeThumbnail && (
                                <div className="mb-1">
                                    <img src={`http://localhost:3000${initialData.thumbnail_image}`} alt="thumbnail" style={{ height: 60, borderRadius: 4 }} />
                                    <div>
                                        <label className="small text-danger">
                                            <input type="checkbox" className="me-1" checked={removeThumbnail} onChange={e => setRemoveThumbnail(e.target.checked)} />
                                            Remove thumbnail
                                        </label>
                                    </div>
                                </div>
                            )}
                            <input className="form-control" type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files[0])} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Course Preview (video/image)</label>
                            {initialData?.course_preview && !removePreview && (
                                <div className="mb-1">
                                    <a href={`http://localhost:3000${initialData.course_preview}`} target="_blank" rel="noreferrer" className="small text-primary">Current preview file</a>
                                    <div>
                                        <label className="small text-danger">
                                            <input type="checkbox" className="me-1" checked={removePreview} onChange={e => setRemovePreview(e.target.checked)} />
                                            Remove preview
                                        </label>
                                    </div>
                                </div>
                            )}
                            <input className="form-control" type="file" accept="image/*,video/*" onChange={e => setPreviewFile(e.target.files[0])} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Lessons */}
            <div className="card shadow-sm mb-4">
                <div className="card-header d-flex align-items-center justify-content-between">
                    <span className="fw-semibold">Lessons</span>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLesson}>
                        + Add Lesson
                    </button>
                </div>
                <div className="card-body">
                    {lessons.filter(l => !l._destroy).length === 0 && (
                        <p className="text-muted small">No lessons. Click &quot;Add Lesson&quot; to add one.</p>
                    )}
                    {lessons
                        .filter(lesson => !lesson._destroy)
                        .map((lesson, idx) => {
                        const displayNum = idx + 1;
                        return (
                            <div key={lesson._key} className="border rounded p-3 mb-3 bg-light">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-semibold small text-muted">Lesson {displayNum}</span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => removeLesson(lesson._key)}
                                    >Remove</button>
                                </div>
                                <div className="row g-2">
                                    <div className="col-12">
                                        <label className="form-label small">Title *</label>
                                        <input
                                            className="form-control form-control-sm"
                                            value={lesson.title}
                                            onChange={e => updateLesson(lesson._key, 'title', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small">Content</label>
                                        <ReactQuill
                                            value={lesson.content}
                                            onChange={val => updateLesson(lesson._key, 'content', val)}
                                            theme="snow"
                                            style={{ minHeight: 100 }}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small">Lesson Asset (video/image)</label>
                                        {lesson.lesson_asset_preview && !lesson.remove_lesson_asset && (
                                            <div className="mb-1">
                                                <a href={`http://localhost:3000${lesson.lesson_asset_preview}`} target="_blank" rel="noreferrer" className="small text-primary">Current file</a>
                                                <label className="small text-danger d-block">
                                                    <input type="checkbox" className="me-1"
                                                        checked={lesson.remove_lesson_asset}
                                                        onChange={e => updateLesson(lesson._key, 'remove_lesson_asset', e.target.checked)} />
                                                    Remove
                                                </label>
                                            </div>
                                        )}
                                        <input
                                            className="form-control form-control-sm"
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={e => handleLessonFile(lesson._key, 'lesson_asset', e.target.files[0])}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small">Thumbnail Asset</label>
                                        {lesson.thumbnail_asset_preview && !lesson.remove_thumbnail_asset && (
                                            <div className="mb-1">
                                                <img src={`http://localhost:3000${lesson.thumbnail_asset_preview}`} alt="" style={{ height: 40, borderRadius: 4 }} />
                                                <label className="small text-danger d-block">
                                                    <input type="checkbox" className="me-1"
                                                        checked={lesson.remove_thumbnail_asset}
                                                        onChange={e => updateLesson(lesson._key, 'remove_thumbnail_asset', e.target.checked)} />
                                                    Remove
                                                </label>
                                            </div>
                                        )}
                                        <input
                                            className="form-control form-control-sm"
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleLessonFile(lesson._key, 'thumbnail_asset', e.target.files[0])}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                        })}
                </div>
            </div>

            <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save Course'}
                </button>
                <a href="/courses" className="btn btn-secondary">Cancel</a>
            </div>
        </form>
    );
}
