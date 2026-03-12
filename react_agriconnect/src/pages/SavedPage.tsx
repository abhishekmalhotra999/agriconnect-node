import { Link } from 'react-router-dom'
import { getSavedByType, getSavedItems } from '../utils/ux'

export default function SavedPage() {
  const saved = getSavedItems()
  const savedCourses = getSavedByType('course')
  const savedProducts = getSavedByType('product')
  const savedServices = getSavedByType('service')

  return (
    <div>
      <h2 className="page-title mb-3">Saved</h2>
      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="card border-0 shadow-sm"><div className="card-body"><strong>{savedCourses.length}</strong><div className="small text-muted">Courses</div></div></div></div>
        <div className="col-md-4"><div className="card border-0 shadow-sm"><div className="card-body"><strong>{savedProducts.length}</strong><div className="small text-muted">Products</div></div></div></div>
        <div className="col-md-4"><div className="card border-0 shadow-sm"><div className="card-body"><strong>{savedServices.length}</strong><div className="small text-muted">Services</div></div></div></div>
      </div>

      {saved.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-muted">
            Nothing saved yet. Try saving items from course, product, or service detail pages.
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {saved.map((item) => (
            <div className="col-md-6" key={`${item.type}-${item.id}`}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex justify-content-between align-items-center gap-3">
                  <div>
                    <div className="small text-muted text-uppercase">{item.type}</div>
                    <h6 className="mb-1 wrapped-text">{item.title}</h6>
                    {item.subtitle ? <div className="small text-muted wrapped-text">{item.subtitle}</div> : null}
                  </div>
                  <Link to={item.link} className="btn btn-outline-agri btn-sm">Open</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
