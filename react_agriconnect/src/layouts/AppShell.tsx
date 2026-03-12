import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import BrandLogo from '../components/BrandLogo'
import { getNotifications, hydrateUxFromServer, markNotificationsRead } from '../utils/ux'

export default function AppShell() {
  const { logout, user } = useAuth()
  const [openNotifs, setOpenNotifs] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    void hydrateUxFromServer()
    const onUpdate = () => setTick((n) => n + 1)
    window.addEventListener('agri-ux-update', onUpdate)
    return () => window.removeEventListener('agri-ux-update', onUpdate)
  }, [])

  const notifications = useMemo(() => getNotifications(), [tick])
  const unreadCount = notifications.filter((item) => !item.read).length
  const isFarmer = String(user?.accountType || '').toLowerCase() === 'farmer'

  const toggleNotifications = () => {
    const next = !openNotifs
    setOpenNotifs(next)
    if (next) markNotificationsRead()
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/learn" className="brand" aria-label="AgriConnect Liberia home">
          <BrandLogo className="brand-logo-top" mode="light" />
        </Link>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-light btn-sm position-relative" onClick={toggleNotifications}>
            <i className="bi bi-bell" />
            {unreadCount > 0 ? <span className="notif-badge">{unreadCount}</span> : null}
          </button>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
        </div>
      </header>

      {openNotifs && (
        <div className="notif-panel shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>Notifications</strong>
            <button className="btn btn-sm btn-light" onClick={() => setOpenNotifs(false)}>Close</button>
          </div>
          {notifications.length === 0 ? (
            <div className="small text-muted">No notifications yet.</div>
          ) : notifications.slice(0, 6).map((n) => (
            <div key={n.id} className="small border-top pt-2 mt-2">
              <div>{n.message}</div>
              {n.link ? <Link to={n.link} className="small text-decoration-none">Open</Link> : null}
            </div>
          ))}
        </div>
      )}

      <main className="content-wrap container py-4">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/learn"><i className="bi bi-book" /><span>Learn</span></NavLink>
        <NavLink to="/marketplace"><i className="bi bi-basket2" /><span>Market</span></NavLink>
        <NavLink to="/services"><i className="bi bi-tools" /><span>Services</span></NavLink>
        <NavLink to="/my-requests"><i className="bi bi-inboxes" /><span>Requests</span></NavLink>
        {isFarmer ? <NavLink to="/seller/dashboard"><i className="bi bi-shop" /><span>Seller</span></NavLink> : null}
        <NavLink to="/my-learning"><i className="bi bi-journal-check" /><span>Learning</span></NavLink>
        <NavLink to="/saved"><i className="bi bi-bookmark-heart" /><span>Saved</span></NavLink>
        <NavLink to="/profile"><i className="bi bi-person" /><span>Profile</span></NavLink>
      </nav>
    </div>
  )
}
