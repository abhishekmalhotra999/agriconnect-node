import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topnav() {
    const { admin, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav
            className="navbar navbar-expand navbar-light bg-white topbar mb-0 shadow-sm px-3"
            style={{ borderBottom: '1px solid #e3e6f0' }}
        >
            <div className="ms-auto d-flex align-items-center gap-3">
                <span className="text-muted small">
                    {admin?.name || admin?.email}
                </span>
                <div className="topbar-divider d-none d-sm-block" style={{ borderLeft: '1px solid #e3e6f0', height: '2rem' }}></div>
                <button className="btn btn-sm btn-outline-secondary" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </nav>
    );
}
