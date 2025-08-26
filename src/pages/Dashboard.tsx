import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import { apiGet } from '../utils/api';

// Interface for dashboard statistics
interface DashboardStats {
  totalCmCodes: number;
  approvedCmCodes: number;
  pendingCmCodes: number;
  rejectedCmCodes: number;
  totalSkus: number;
  activeSkus: number;
  inactiveSkus: number;
}

// Interface for recent activity
interface RecentActivity {
  id: number;
  type: 'cm_approved' | 'cm_rejected' | 'sku_added' | 'sku_updated';
  description: string;
  timestamp: string;
  user: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCmCodes: 0,
    approvedCmCodes: 0,
    pendingCmCodes: 0,
    rejectedCmCodes: 0,
    totalSkus: 0,
    activeSkus: 0,
    inactiveSkus: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch CM codes for statistics
        const cmResponse = await apiGet('/cm-codes');

        if (!cmResponse.ok) {
          throw new Error(`HTTP error! status: ${cmResponse.status}`);
        }

        const cmData = await cmResponse.json();
        
        if (cmData.success) {
          const cmCodes = cmData.data;
          const approved = cmCodes.filter((cm: any) => cm.signoff_status === 'approved').length;
          const pending = cmCodes.filter((cm: any) => cm.signoff_status === 'pending').length;
          const rejected = cmCodes.filter((cm: any) => cm.signoff_status === 'rejected').length;

          setStats({
            totalCmCodes: cmCodes.length,
            approvedCmCodes: approved,
            pendingCmCodes: pending,
            rejectedCmCodes: rejected,
            totalSkus: 0, // Will be calculated from SKU data
            activeSkus: 0,
            inactiveSkus: 0
          });

          // Generate mock recent activity based on CM codes
          const mockActivity: RecentActivity[] = cmCodes.slice(0, 5).map((cm: any, index: number) => ({
            id: index + 1,
            type: cm.signoff_status === 'approved' ? 'cm_approved' : 
                  cm.signoff_status === 'rejected' ? 'cm_rejected' : 'sku_added',
            description: cm.signoff_status === 'approved' ? `CM Code ${cm.cm_code} signed` :
                        cm.signoff_status === 'rejected' ? `CM Code ${cm.cm_code} rejected` :
                        `New SKU added for ${cm.cm_code}`,
            timestamp: cm.updated_at || new Date().toISOString(),
            user: cm.signoff_by || 'System'
          }));

          setRecentActivity(mockActivity);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleNavigateToCmDashboard = () => {
    navigate('/cm-dashboard');
  };

  const handleNavigateToReports = () => {
    // Navigate to reports page (to be created)
    console.log('Navigate to reports');
  };

  const handleNavigateToSettings = () => {
    // Navigate to settings page (to be created)
    console.log('Navigate to settings');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cm_approved':
        return 'ri-check-line';
      case 'cm_rejected':
        return 'ri-close-line';
      case 'sku_added':
        return 'ri-add-line';
      case 'sku_updated':
        return 'ri-edit-line';
      default:
        return 'ri-information-line';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'cm_approved':
        return '#28a745';
      case 'cm_rejected':
        return '#dc3545';
      case 'sku_added':
        return '#007bff';
      case 'sku_updated':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      {loading && <Loader />}
      <div className="mainInternalPages" style={{ opacity: loading ? 0.5 : 1 }}>
        <div className="commonTitle">
          <div className="icon">
            <i className="ri-dashboard-line"></i>
          </div>
          <h1>Sustainability Portal Dashboard</h1>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="ri-error-warning-line"></i>
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading dashboard data...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Main Navigation Card - Primary Action after SSO Login */}
            <div className="row mb-4">
              <div className="col-12">
                <div 
                  className="card main-navigation-card" 
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                  }}
                  onClick={handleNavigateToCmDashboard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                  }}
                >
                  <div className="card-body text-center py-5">
                    <div className="row align-items-center">
                      <div className="col-md-8">
                        <h2 className="mb-3">
                          <i className="ri-table-line me-3"></i>
                          3PM Codes Management
                        </h2>
                        <p className="mb-0 fs-5">
                          View, manage, and track all 3PM codes and their approval status. 
                          Access detailed SKU information and component data.
                        </p>
                      </div>
                      <div className="col-md-4 text-center">
                        <div className="display-1 text-white-50">
                          <i className="ri-arrow-right-line"></i>
                        </div>
                        <p className="mt-2 mb-0">Click to Access</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title mb-0">
                      <i className="ri-flashlight-line"></i>
                      Quick Actions
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3 mb-3">
                        <button 
                          className="btn btn-primary w-100"
                          onClick={handleNavigateToCmDashboard}
                        >
                          <i className="ri-table-line"></i>
                          View 3PM Dashboard
                        </button>
                      </div>
                      <div className="col-md-3 mb-3">
                        <button 
                          className="btn btn-success w-100"
                          onClick={handleNavigateToReports}
                        >
                          <i className="ri-file-chart-line"></i>
                          Generate Reports
                        </button>
                      </div>
                      <div className="col-md-3 mb-3">
                        <button 
                          className="btn btn-info w-100"
                          onClick={handleNavigateToSettings}
                        >
                          <i className="ri-settings-line"></i>
                          Settings
                        </button>
                      </div>
                      <div className="col-md-3 mb-3">
                        <button 
                          className="btn btn-warning w-100"
                          onClick={() => window.open('/help', '_blank')}
                        >
                          <i className="ri-question-line"></i>
                          Help & Support
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="row mb-4">
              <div className="col-md-3 mb-3">
                <div className="card bg-primary text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4 className="card-title">{stats.totalCmCodes}</h4>
                        <p className="card-text">Total 3PM Codes</p>
                      </div>
                      <div className="align-self-center">
                        <i className="ri-file-list-line" style={{ fontSize: '2rem' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3 mb-3">
                <div className="card bg-success text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4 className="card-title">{stats.approvedCmCodes}</h4>
                        <p className="card-text">Signed Codes</p>
                      </div>
                      <div className="align-self-center">
                        <i className="ri-check-line" style={{ fontSize: '2rem' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3 mb-3">
                <div className="card bg-warning text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4 className="card-title">{stats.pendingCmCodes}</h4>
                        <p className="card-text">Pending Codes</p>
                      </div>
                      <div className="align-self-center">
                        <i className="ri-time-line" style={{ fontSize: '2rem' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3 mb-3">
                <div className="card bg-danger text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4 className="card-title">{stats.rejectedCmCodes}</h4>
                        <p className="card-text">Rejected Codes</p>
                      </div>
                      <div className="align-self-center">
                        <i className="ri-close-line" style={{ fontSize: '2rem' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Analytics */}
            <div className="row mb-4">
              <div className="col-md-6 mb-3">
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title mb-0">
                      <i className="ri-pie-chart-line"></i>
                      3PM Code Status Distribution
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="text-center">
                      <div className="d-flex justify-content-around mb-3">
                        <div className="text-center">
                          <div className="bg-success rounded-circle d-inline-flex align-items-center justify-content-center" 
                               style={{ width: '60px', height: '60px' }}>
                            <span className="text-white font-weight-bold">{stats.approvedCmCodes}</span>
                          </div>
                          <p className="mt-2 mb-0">Signed</p>
                        </div>
                        <div className="text-center">
                          <div className="bg-warning rounded-circle d-inline-flex align-items-center justify-content-center" 
                               style={{ width: '60px', height: '60px' }}>
                            <span className="text-white font-weight-bold">{stats.pendingCmCodes}</span>
                          </div>
                          <p className="mt-2 mb-0">Pending</p>
                        </div>
                        <div className="text-center">
                          <div className="bg-danger rounded-circle d-inline-flex align-items-center justify-content-center" 
                               style={{ width: '60px', height: '60px' }}>
                            <span className="text-white font-weight-bold">{stats.rejectedCmCodes}</span>
                          </div>
                          <p className="mt-2 mb-0">Rejected</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title mb-0">
                      <i className="ri-bar-chart-line"></i>
                      Recent Activity
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="activity-list">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="activity-item d-flex align-items-center mb-3">
                          <div className="activity-icon me-3">
                            <i 
                              className={getActivityIcon(activity.type)}
                              style={{ 
                                color: getActivityColor(activity.type),
                                fontSize: '1.2rem'
                              }}
                            ></i>
                          </div>
                          <div className="activity-content flex-grow-1">
                            <p className="mb-1">{activity.description}</p>
                            <small className="text-muted">
                              {formatDate(activity.timestamp)} by {activity.user}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title mb-0">
                      <i className="ri-server-line"></i>
                      System Status
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3 mb-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-success rounded-circle me-3" style={{ width: '12px', height: '12px' }}></div>
                          <span>API Server: Online</span>
                        </div>
                      </div>
                      <div className="col-md-3 mb-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-success rounded-circle me-3" style={{ width: '12px', height: '12px' }}></div>
                          <span>Database: Connected</span>
                        </div>
                      </div>
                      <div className="col-md-3 mb-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-success rounded-circle me-3" style={{ width: '12px', height: '12px' }}></div>
                          <span>Authentication: Active</span>
                        </div>
                      </div>
                      <div className="col-md-3 mb-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-success rounded-circle me-3" style={{ width: '12px', height: '12px' }}></div>
                          <span>File Storage: Available</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard; 