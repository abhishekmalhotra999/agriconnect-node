import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import type { Enrollment, LessonProgress } from '../types/api'

export default function MyLearningPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [progresses, setProgresses] = useState<LessonProgress[]>([])

  useEffect(() => {
    client.get<Enrollment[]>('/api/enrollments').then((res) => setEnrollments(res.data))
    client.get<LessonProgress[]>('/api/lesson_progresses').then((res) => setProgresses(res.data))
  }, [])

  const completedLessonIds = new Set(
    progresses.filter((progress) => progress.completed).map((progress) => String(progress.lesson_id)),
  )

  return (
    <div>
      <h2 className="page-title mb-3">My Learning</h2>
      {enrollments.length === 0 ? (
        <p className="text-muted">You are not enrolled yet.</p>
      ) : enrollments.map((enrollment) => (
        <div className="card mb-2" key={enrollment.id}>
          <div className="card-body d-flex justify-content-between align-items-center gap-3">
            <div>
              {(() => {
                const total = enrollment.lessonIds.length
                const done = enrollment.lessonIds.filter((lessonId) => completedLessonIds.has(String(lessonId))).length
                const percent = total > 0 ? Math.round((done / total) * 100) : 0

                return (
                  <>
                    <h6 className="mb-1">{enrollment.course.title}</h6>
                    <small className="text-muted d-block mb-2">{done} / {total} lessons completed ({percent}%)</small>
                    <div className="progress" style={{ height: '6px' }}>
                      <div className="progress-bar" style={{ width: `${percent}%` }} />
                    </div>
                  </>
                )
              })()}
            </div>
            <Link to={`/courses/${enrollment.course.id}`} className="btn btn-outline-agri btn-sm">Continue</Link>
          </div>
        </div>
      ))}
    </div>
  )
}
