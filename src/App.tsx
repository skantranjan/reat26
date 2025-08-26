import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AdminSmDashboard from './pages/AdminSmDashboard';
import AdminCmSkuDetail from './pages/AdminCmSkuDetail';
import SedForApproval from './pages/SedForApproval';
import GeneratePdf from './pages/GeneratePdf';
import UploadData from './pages/UploadData';
import AuditLog from './pages/AuditLog';
import CmSkuDetail from './pages/CM/CmSkuDetail';
import CmSedForApproval from './pages/CM/CmSedForApproval';
import CmGeneratePdf from './pages/CM/CmGeneratePdf';
import SrmDashboard from './pages/SRM/SrmDashboard';
import SrmSkuDetail from './pages/SRM/SrmSkuDetail';
import ProtectedRoute from './components/ProtectedRoute';

import './assets/css/styles.css';
import './assets/css/remix-icon.css';
import './assets/css/multi-select.css';
import './assets/css/pagination.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/dashboard" element={<Navigate to="/admin/cm-dashboard" replace />} />
        <Route path="/dasbboard" element={<Navigate to="/admin/cm-dashboard" replace />} />
        
        {/* Admin Routes - Only accessible by Role 1 users */}
        <Route path="/admin/cm-dashboard" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminSmDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/cm-sku-details" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminCmSkuDetail />
          </ProtectedRoute>
        } />
        <Route path="/admin/cm/:cmCode" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminCmSkuDetail />
          </ProtectedRoute>
        } />
        
        {/* CM User Route - Only accessible by Role 2 users */}
        <Route path="/cm/cm-sku-detail/:cmCode" element={
          <ProtectedRoute requireCMUser={true}>
            <CmSkuDetail />
          </ProtectedRoute>
        } />
        
        {/* CM-specific routes - Only accessible by Role 2 users */}
        <Route path="/cm/sedforapproval" element={
          <ProtectedRoute requireCMUser={true}>
            <CmSedForApproval />
          </ProtectedRoute>
        } />
        <Route path="/cm/generate-pdf" element={
          <ProtectedRoute requireCMUser={true}>
            <CmGeneratePdf />
          </ProtectedRoute>
        } />
        
        {/* SRM User Route - Only accessible by Role 3 users */}
        <Route path="/srm/srm-dashboard" element={
          <ProtectedRoute requireSRMUser={true}>
            <SrmDashboard />
          </ProtectedRoute>
        } />
        
        {/* SRM SKU Detail Route - Only accessible by Role 3 users */}
        <Route path="/srm/sku-detail/:cmCode" element={
          <ProtectedRoute requireSRMUser={true}>
            <SrmSkuDetail />
          </ProtectedRoute>
        } />
        
        {/* Debug route to test if routing is working */}
        <Route path="/srm/test-route" element={
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Test Route Working!</h1>
            <p>If you can see this, routing is working correctly.</p>
          </div>
        } />
        
        {/* Other Routes */}
        <Route path="/sedforapproval" element={<SedForApproval />} />
        <Route path="/generate-pdf" element={<GeneratePdf />} />
        <Route path="/upload-data" element={<UploadData />} />
        <Route path="/audit-log" element={<AuditLog />} />
      </Routes>
    </Router>
  );
}

export default App;
