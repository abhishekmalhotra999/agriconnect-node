import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './layouts/AdminLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseIndex from './pages/courses/CourseIndex';
import CourseNew from './pages/courses/CourseNew';
import CourseEdit from './pages/courses/CourseEdit';
import CourseShow from './pages/courses/CourseShow';
import UserIndex from './pages/users/UserIndex';
import PrivacyPolicyIndex from './pages/privacyPolicies/PrivacyPolicyIndex';
import PrivacyPolicyNew from './pages/privacyPolicies/PrivacyPolicyNew';
import PrivacyPolicyEdit from './pages/privacyPolicies/PrivacyPolicyEdit';
import PrivacyPolicyShow from './pages/privacyPolicies/PrivacyPolicyShow';
import ProductIndex from './pages/marketplace/ProductIndex';
import MarketplaceCategoryIndex from './pages/marketplace/CategoryIndex';
import ServiceListingIndex from './pages/services/ServiceListingIndex';
import ServiceCategoryIndex from './pages/services/ServiceCategoryIndex';
import ServiceRequestIndex from './pages/services/ServiceRequestIndex';

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="courses" element={<CourseIndex />} />
                <Route path="courses/new" element={<CourseNew />} />
                <Route path="courses/:id" element={<CourseShow />} />
                <Route path="courses/:id/edit" element={<CourseEdit />} />
                <Route path="users" element={<UserIndex />} />
                <Route path="privacy-policies" element={<PrivacyPolicyIndex />} />
                <Route path="privacy-policies/new" element={<PrivacyPolicyNew />} />
                <Route path="privacy-policies/:id" element={<PrivacyPolicyShow />} />
                <Route path="privacy-policies/:id/edit" element={<PrivacyPolicyEdit />} />
                <Route path="marketplace/products" element={<ProductIndex />} />
                <Route path="marketplace/categories" element={<MarketplaceCategoryIndex />} />
                <Route path="services/listings" element={<ServiceListingIndex />} />
                <Route path="services/categories" element={<ServiceCategoryIndex />} />
                <Route path="services/requests" element={<ServiceRequestIndex />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}
