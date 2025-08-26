import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Navigation Component
 * Provides consistent navigation between main sections of the application
 */
const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getActiveStyle = (path: string) => ({
    background: isActive(path) ? '#007bff' : '#f8f9fa',
    color: isActive(path) ? 'white' : '#333',
    border: `1px solid ${isActive(path) ? '#007bff' : '#dee2e6'}`,
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    marginRight: '8px'
  });

  return (
    <div style={{ 
      background: 'white', 
      padding: '15px 20px', 
      borderBottom: '1px solid #e9ecef',
      marginBottom: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <span style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: '#333',
          marginRight: '15px'
        }}>
          Navigation:
        </span>
        
        <button
          onClick={() => navigate('/cm-dashboard')}
          style={getActiveStyle('/cm-dashboard')}
        >
          <i className="ri-file-chart-line"></i>
          CM Dashboard
        </button>
        
        <button
          onClick={() => navigate('/cm-sku-details')}
          style={getActiveStyle('/cm-sku-details')}
        >
          <i className="ri-file-text-line"></i>
          CM SKU Details
        </button>
        
        <button
          onClick={() => navigate('/audit-log')}
          style={getActiveStyle('/audit-log')}
        >
          <i className="ri-file-list-line"></i>
          Audit Log
        </button>
        
        <button
          onClick={() => navigate('/upload-data')}
          style={getActiveStyle('/upload-data')}
        >
          <i className="ri-upload-line"></i>
          Upload Data
        </button>
        
        <button
          onClick={() => navigate('/generate-pdf')}
          style={getActiveStyle('/generate-pdf')}
        >
          <i className="ri-file-pdf-line"></i>
          Generate PDF
        </button>
        
        <button
          onClick={() => navigate('/sedforapproval')}
          style={getActiveStyle('/sedforapproval')}
        >
          <i className="ri-check-double-line"></i>
          SED for Approval
        </button>
      </div>
    </div>
  );
};

export default Navigation;
