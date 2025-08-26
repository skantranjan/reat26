import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireCMUser?: boolean;
  requireSRMUser?: boolean;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false, 
  requireCMUser = false,
  requireSRMUser = false,
  redirectTo = '/'
}) => {
  const { isAuthenticated, isAdmin, isCMUser, isSRMUser } = useAuth();

  // Debug logging
  console.log('ProtectedRoute Debug:', {
    isAuthenticated,
    isAdmin,
    isCMUser,
    isSRMUser,
    requireAdmin,
    requireCMUser,
    requireSRMUser,
    redirectTo
  });

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // If admin access is required but user is not admin
  if (requireAdmin && !isAdmin) {
    console.log('Admin access required but user is not admin, redirecting to /cm-sku-detail');
    return <Navigate to="/cm-sku-detail" replace />;
  }

  // If CM user access is required but user is not CM user
  if (requireCMUser && !isCMUser) {
    console.log('CM user access required but user is not CM user, redirecting to /admin/cm-dashboard');
    return <Navigate to="/admin/cm-dashboard" replace />;
  }

  // If SRM user access is required but user is not SRM user
  if (requireSRMUser && !isSRMUser) {
    console.log('SRM user access required but user is not SRM user, redirecting to /admin/cm-dashboard');
    return <Navigate to="/admin/cm-dashboard" replace />;
  }

  // If no specific role requirements, allow access
  console.log('Access granted to protected route');
  return <>{children}</>;
};

export default ProtectedRoute; 