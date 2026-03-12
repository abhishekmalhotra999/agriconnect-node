import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client, { getApiErrorMessage } from '../api/client'
import type { ServiceRequest } from '../types/api'

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get<ServiceRequest[]>('/api/services/requests/mine')
      .then((res) => setRequests(res.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load your requests')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title mb-0">My Service Requests</h2>
        <Link to="/services" className="btn btn-outline-agri btn-sm">Find Services</Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-muted">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h6 className="mb-1">No requests yet</h6>
            <p className="small text-muted mb-3">Start by browsing technicians and sending your first service request.</p>
            <Link to="/services" className="btn btn-agri btn-sm">Browse Services</Link>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {requests.map((req) => (
            <div className="col-12" key={req.id}>
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                    <div>
                      <h6 className="mb-1 wrapped-text">{req.listing?.title || 'Service listing'}</h6>
                      <div className="small text-muted">Requested by {req.requester_name} ({req.requester_phone})</div>
                    </div>
                    <div className="d-flex flex-wrap gap-2 justify-content-end">
                      <span className={`badge ${req.status === 'resolved' ? 'text-bg-success' : req.status === 'closed' ? 'text-bg-secondary' : 'text-bg-warning'}`}>
                        {req.status}
                      </span>
                      <span className={`badge ${req.email_delivery_status === 'sent' ? 'text-bg-success' : req.email_delivery_status === 'failed' ? 'text-bg-danger' : 'text-bg-secondary'}`}>
                        Email: {req.email_delivery_status}
                      </span>
                    </div>
                  </div>

                  <p className="small mb-2 wrapped-text">{req.message}</p>

                  <div className="request-timeline">
                    <div className={`timeline-step ${['new', 'in_progress', 'resolved', 'closed'].includes(req.status) ? 'active' : ''}`}>New</div>
                    <div className={`timeline-step ${['in_progress', 'resolved', 'closed'].includes(req.status) ? 'active' : ''}`}>In Progress</div>
                    <div className={`timeline-step ${['resolved', 'closed'].includes(req.status) ? 'active' : ''}`}>Resolved</div>
                    <div className={`timeline-step ${req.status === 'closed' ? 'active' : ''}`}>Closed</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
