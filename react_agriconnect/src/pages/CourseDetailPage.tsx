import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import client, { getApiErrorMessage, toApiAssetUrl } from '../api/client'
import type { Course, Lesson, LessonProgress } from '../types/api'
import { pushNotification, toggleSavedItem, trackRecent } from '../utils/ux'

export default function CourseDetailPage() {
  const { id } = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progresses, setProgresses] = useState<LessonProgress[]>([])
  const [enrolled, setEnrolled] = useState(false)
  const [enrollMessage, setEnrollMessage] = useState('')
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null)
  const [savingLessonIds, setSavingLessonIds] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const progressMap = useMemo(() => {
    return new Set(progresses.filter((p) => p.completed).map((p) => String(p.lesson_id)))
  }, [progresses])
  const totalLessons = lessons.length
  const completedLessons = lessons.filter((lesson) => progressMap.has(String(lesson.id))).length
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  useEffect(() => {
    if (!id) return
    Promise.all([
      client.get<Course[]>('/api/courses'),
      client.get<Lesson[]>(`/api/lessons?course_id=${id}`),
      client.get<LessonProgress[]>('/api/lesson_progresses'),
      client.get<Array<{ id: number; course: { id: number } }>>('/api/enrollments'),
    ]).then(([coursesRes, lessonsRes, progressRes, enrollmentsRes]) => {
      const selected = coursesRes.data.find((c) => String(c.id) === String(id)) || null
      setCourse(selected)
      if (selected) {
        trackRecent({ type: 'course', id: String(selected.id), title: selected.title, subtitle: selected.subtitle || '', image: selected.thumbnailUrl || undefined, link: `/courses/${selected.id}` })
      }
      setLessons(lessonsRes.data)
      setProgresses(progressRes.data)
      const isEnrolled = enrollmentsRes.data.some((enrollment) => String(enrollment.course.id) === String(id))
      setEnrolled(isEnrolled)
      setExpandedLessonId(lessonsRes.data[0]?.id ? String(lessonsRes.data[0].id) : null)
    }).catch((err) => setError(getApiErrorMessage(err, 'Failed to load course')))
  }, [id])

  const enroll = async () => {
    if (!id) return
    try {
      setError('')
      setEnrollMessage('')
      const response = await client.post('/api/enrollments', { course_id: Number(id) })
      const body = response.data as { status?: string; errors?: string | string[] }

      if (body.errors) {
        const msg = Array.isArray(body.errors) ? body.errors[0] : body.errors
        setError(msg || 'Enrollment failed')
        return
      }

      if (body.status === 'Already enrolled to this course.') {
        setEnrolled(true)
        setEnrollMessage('You are already enrolled in this course.')
        return
      }

      if (body.status === 'ok') {
        setEnrolled(true)
        setEnrollMessage('Enrollment successful.')
        return
      }

      setEnrollMessage('Enrollment request submitted.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Enrollment failed'))
    }
  }

  const markComplete = async (lessonId: number | string) => {
    const lessonKey = String(lessonId)
    if (progressMap.has(lessonKey)) return

    try {
      setError('')
      setSavingLessonIds((prev) => [...prev, lessonKey])
      const saveResponse = await client.put<{ success?: boolean; lesson_id?: number; completed?: boolean }>(
        `/api/lesson_progresses/${lessonId}`,
        { completed: true },
      )

      if (saveResponse.data?.success && String(saveResponse.data.lesson_id) === lessonKey) {
        setProgresses((prev) => {
          const idx = prev.findIndex((progress) => String(progress.lesson_id) === lessonKey)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = { ...next[idx], completed: true }
            return next
          }

          return [
            ...prev,
            {
              id: Number(Date.now()),
              user_id: 0,
              lesson_id: lessonKey,
              completed: true,
            },
          ]
        })
      }

      const refreshed = await client.get<LessonProgress[]>('/api/lesson_progresses')
      setProgresses(refreshed.data)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Progress update failed'))
    } finally {
      setSavingLessonIds((prev) => prev.filter((id) => id !== lessonKey))
    }
  }

  const onSave = () => {
    if (!course) return
    const next = toggleSavedItem({ type: 'course', id: String(course.id), title: course.title, subtitle: course.subtitle || '', image: course.thumbnailUrl || undefined, link: `/courses/${course.id}` })
    setSaved(next)
  }

  const onShare = async () => {
    if (!course) return
    const url = `${window.location.origin}/courses/${course.id}`
    try {
      await navigator.clipboard.writeText(url)
      pushNotification('Course link copied to clipboard.', `/courses/${course.id}`)
    } catch {
      setError('Unable to copy link.')
    }
  }

  return (
    <div>
      <nav className="small text-muted mb-2">
        <Link to="/learn" className="text-decoration-none">Home</Link> / <span>Course</span>
      </nav>
      {error && <div className="alert alert-danger">{error}</div>}
      {enrollMessage && <div className="alert alert-success">{enrollMessage}</div>}
      {course && (
        <div className="card mb-3">
          <div className="card-body">
            <h3>{course.title}</h3>
            <p className="text-muted wrapped-text">{course.subtitle}</p>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-agri btn-sm" onClick={enroll} disabled={enrolled}>
                {enrolled ? 'Enrolled' : 'Enroll'}
              </button>
              <button className="btn btn-outline-agri btn-sm" onClick={onSave}>{saved ? 'Saved' : 'Save'}</button>
              <button className="btn btn-outline-agri btn-sm" onClick={onShare}>Share</button>
            </div>
          </div>
        </div>
      )}
      <h5 className="mb-3">Lessons</h5>
      {totalLessons > 0 && (
        <div className="course-progress-summary mb-3" data-testid="course-progress">
          <div className="small text-muted mb-1">Progress</div>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <strong>{completedLessons} / {totalLessons} lessons completed</strong>
            <span className="small text-muted">{progressPercent}%</span>
          </div>
          <div className="progress" role="progressbar" aria-label="Course progress" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}
      {lessons.length === 0 && <p className="text-muted">No lessons available yet.</p>}
      {lessons.map((lesson) => {
        const done = progressMap.has(String(lesson.id))
        const isExpanded = expandedLessonId === String(lesson.id)
        const saving = savingLessonIds.includes(String(lesson.id))
        return (
          <div className="card mb-2" key={lesson.id}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-start text-decoration-none lesson-title-btn"
                    onClick={() => setExpandedLessonId(isExpanded ? null : String(lesson.id))}
                  >
                    <h6 className="mb-1">{lesson.title}</h6>
                  </button>
                  {!isExpanded && lesson.contentPlain && (
                    <p className="small text-muted mb-0 wrapped-text">{lesson.contentPlain}</p>
                  )}
                </div>
                <button
                  className={`btn btn-sm ${done ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => markComplete(lesson.id)}
                  disabled={done || saving}
                >
                  {done ? 'Completed' : saving ? 'Saving...' : 'Mark Complete'}
                </button>
              </div>

              {isExpanded && (
                <div className="lesson-expanded mt-2">
                  {lesson.thumbnailUrl && (
                    <img
                      src={toApiAssetUrl(lesson.thumbnailUrl)}
                      alt={`${lesson.title} thumbnail`}
                      className="lesson-thumb"
                      loading="lazy"
                    />
                  )}

                  {lesson.content && (
                    <div
                      className="small text-muted wrapped-richtext"
                      dangerouslySetInnerHTML={{ __html: lesson.content }}
                    />
                  )}

                  {!lesson.content && lesson.contentPlain && (
                    <p className="small text-muted mb-0 wrapped-text">{lesson.contentPlain}</p>
                  )}

                  {lesson.asset && lesson.asset.contentType === 'image' && (
                    <img
                      src={toApiAssetUrl(lesson.asset.url)}
                      alt={`${lesson.title} asset`}
                      className="lesson-asset mt-2"
                      loading="lazy"
                    />
                  )}

                  {lesson.asset && lesson.asset.contentType === 'video' && (
                    <video className="lesson-asset mt-2" controls preload="metadata">
                      <source src={toApiAssetUrl(lesson.asset.url)} />
                    </video>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
