import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client, { getApiErrorMessage, toApiAssetUrl } from '../api/client'
import type { Course, Enrollment, LessonProgress } from '../types/api'
import { getRecentItems } from '../utils/ux'

export default function LearnPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [progresses, setProgresses] = useState<LessonProgress[]>([])
  const [recent, setRecent] = useState(getRecentItems())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      client.get<Course[]>('/api/courses'),
      client.get<Enrollment[]>('/api/enrollments'),
      client.get<LessonProgress[]>('/api/lesson_progresses'),
    ])
      .then(([coursesRes, enrollmentsRes, progressesRes]) => {
        setCourses(coursesRes.data)
        setEnrollments(enrollmentsRes.data)
        setProgresses(progressesRes.data)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load courses')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onUpdate = () => setRecent(getRecentItems())
    window.addEventListener('agri-ux-update', onUpdate)
    return () => window.removeEventListener('agri-ux-update', onUpdate)
  }, [])

  const enrolledLessonIds = enrollments.flatMap((enrollment) => enrollment.lessonIds.map((id) => String(id)))
  const totalLessons = enrolledLessonIds.length
  const completedLessonIdSet = new Set(
    progresses.filter((progress) => progress.completed).map((progress) => String(progress.lesson_id)),
  )
  const completedLessons = enrolledLessonIds.filter((lessonId) => completedLessonIdSet.has(lessonId)).length
  const progressPercent = totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0

  return (
    <div className="learn-page">
      <div className="learn-hero card border-0 mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <p className="text-muted mb-1 small">Learn today</p>
              <h2 className="page-title mb-0">
                {completedLessons} <span className="small text-muted">/ {totalLessons} lessons completed</span>
              </h2>
            </div>
            <span className="badge rounded-pill text-bg-light">{progressPercent}%</span>
          </div>

          <div className="progress" role="progressbar" aria-label="Overall learning progress" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="learn-banner mt-3">
            <div>
              <h5 className="mb-1">What do you want to learn today?</h5>
              <Link to="/my-learning" className="btn btn-agri btn-sm">Get Started</Link>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="text-muted">Loading...</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">Marketplace</h6>
                <p className="small text-muted mb-0">Browse farmer listings and compare products.</p>
              </div>
              <Link to="/marketplace" className="btn btn-outline-agri btn-sm">Open</Link>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">Services</h6>
                <p className="small text-muted mb-0">Find technicians and submit service requests.</p>
              </div>
              <Link to="/services" className="btn btn-outline-agri btn-sm">Open</Link>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">Saved Items</h6>
                <p className="small text-muted mb-0">Access your saved courses, products, and services.</p>
              </div>
              <Link to="/saved" className="btn btn-outline-agri btn-sm">Open</Link>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">My Requests</h6>
                <p className="small text-muted mb-0">Track service request status and updates in one place.</p>
              </div>
              <Link to="/my-requests" className="btn btn-outline-agri btn-sm">Open</Link>
            </div>
          </div>
        </div>
      </div>

      {recent.length > 0 && (
        <section className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="h6 mb-0">Recently viewed</h3>
          </div>
          <div className="row g-2">
            {recent.slice(0, 4).map((item) => (
              <div className="col-6 col-md-3" key={`${item.type}-${item.id}`}>
                <Link to={item.link} className="text-decoration-none">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="small text-muted text-uppercase">{item.type}</div>
                      <div className="small fw-semibold wrapped-text">{item.title}</div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && courses.length === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-muted" data-testid="empty-courses">No courses available yet.</div>
        </div>
      )}

      {courses.length > 0 && (
        <>
          <div className="d-flex justify-content-between align-items-center mt-4 mb-2">
            <h3 className="h5 mb-0">Choose your course</h3>
            <div className="chip-row">
              <span className="chip active">All</span>
              <span className="chip">Popular</span>
              <span className="chip">New</span>
            </div>
          </div>

      <div className="row g-3" data-testid="course-grid">
        {courses.map((course) => (
          <div className="col-md-6" key={course.id}>
            <div className="card course-card h-100">
              <div className="card-body">
                <div className="d-flex gap-3">
                  {course.thumbnailUrl ? (
                    <img
                      src={toApiAssetUrl(course.thumbnailUrl)}
                      alt={course.title}
                      className="course-thumb"
                      loading="lazy"
                    />
                  ) : (
                    <div className="course-thumb" />
                  )}
                  <div>
                    <h5 className="mb-1 course-title">{course.title}</h5>
                    <p className="text-muted small mb-2 course-subtitle">{course.subtitle || 'Smart farming essentials'}</p>
                    <p className="mb-2"><strong>{course.price || 'Free'}</strong> • {course.duration || '6 hours'}</p>
                    <Link to={`/courses/${course.id}`} className="btn btn-agri btn-sm">Open Course</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  )
}
