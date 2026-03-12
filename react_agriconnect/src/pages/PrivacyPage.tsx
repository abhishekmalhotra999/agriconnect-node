import { useEffect, useState } from 'react'
import client from '../api/client'

export default function PrivacyPage() {
  const [content, setContent] = useState<string>('')

  useEffect(() => {
    client.get<string | null>('/api/contents').then((res) => setContent(res.data || 'No policy available.'))
  }, [])

  return (
    <div>
      <h2 className="page-title mb-3">Privacy Policy</h2>
      <div className="card">
        <div className="card-body" dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  )
}
