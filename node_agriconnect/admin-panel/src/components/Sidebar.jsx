import { NavLink } from 'react-router-dom';

const links = [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/courses', label: 'Courses', icon: 'bi-book' },
    { to: '/users', label: 'Users', icon: 'bi-people' },
    { to: '/privacy-policies', label: 'Privacy Policies', icon: 'bi-shield-check' },
    { to: '/marketplace/products', label: 'Marketplace', icon: 'bi-basket2' },
    { to: '/marketplace/categories', label: 'Market Categories', icon: 'bi-tags' },
    { to: '/services/listings', label: 'Service Listings', icon: 'bi-tools' },
    { to: '/services/categories', label: 'Service Categories', icon: 'bi-diagram-3' },
    { to: '/services/requests', label: 'Service Requests', icon: 'bi-envelope-paper' },
];

export default function Sidebar() {
    return (
        <ul
            className="navbar-nav bg-gradient-primary sidebar sidebar-dark accordion"
            style={{
                width: '225px',
                minHeight: '100vh',
                background: 'linear-gradient(180deg,#4e73df 10%,#224abe 100%)',
                flexShrink: 0,
            }}
        >
            {/* Brand */}
            <li className="nav-item">
                <NavLink
                    className="sidebar-brand d-flex align-items-center justify-content-center py-4 text-decoration-none"
                    to="/dashboard"
                >
                    <div className="sidebar-brand-text text-white fw-bold fs-5 px-3">
                        AgriConnect
                    </div>
                </NavLink>
            </li>
            <hr className="sidebar-divider my-0 border-white opacity-25" />

            {/* Nav Links */}
            {links.map(({ to, label, icon }) => (
                <li className="nav-item" key={to}>
                    <NavLink
                        to={to}
                        className={({ isActive }) =>
                            `nav-link text-white d-flex align-items-center gap-2 px-3 py-2${isActive ? ' fw-bold opacity-100' : ' opacity-75'}`
                        }
                    >
                        <i className={`bi ${icon}`}></i>
                        <span>{label}</span>
                    </NavLink>
                </li>
            ))}

            <hr className="sidebar-divider border-white opacity-25" />
        </ul>
    );
}
