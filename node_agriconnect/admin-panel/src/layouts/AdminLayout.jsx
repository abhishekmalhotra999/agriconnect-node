import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topnav from '../components/Topnav';

export default function AdminLayout() {
    return (
        <div id="wrapper" style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fc' }}>
            <Sidebar />
            <div id="content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Topnav />
                <main id="content" style={{ flex: 1, padding: '1.5rem' }}>
                    <Outlet />
                </main>
                <footer className="sticky-footer bg-white py-3 mt-auto">
                    <div className="container">
                        <div className="text-center text-muted small">
                            &copy; {new Date().getFullYear()} AgriConnect Admin
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
