import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiPost } from '../utils/api';
import '../assets/landing/css/styles.css';
import '../assets/landing/css/new-hero.css';
import '../assets/landing/css/remix-icon.css';
import logoImage from '../assets/landing/images/logo.png';
import landingImage from '../assets/landing/images/Landing.png';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNavigation = (path: string) => {
    if (path === 'cm-dashboard') {
      navigate('/admin/cm-dashboard');
    } else if (path === 'cm-sku-details') {
      navigate('/admin/cm-sku-details');
    } else if (path === 'audit-log') {
      navigate('/audit-log');
    }
    // Add other navigation handlers as needed
  };

  const handleLogin = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await apiPost('/getuser', { email });

      if (data.success) {
        const userData = data.data;
        const userRole = userData.role;
        
        console.log('Login successful:', { userData, userRole, roleType: typeof userRole });
        
        // Store user data in AuthContext
        login(userData);
        
        // Flexible role checking - works with both string and number values
        if (userRole === '1' || userRole === 1) {
          // Role 1: Admin - go to admin dashboard
          console.log('Redirecting Role 1 user to admin dashboard');
          navigate('/admin/cm-dashboard');
        } else if (userRole === '2' || userRole === 2) {
          // Role 2: CM User - go directly to CmSkuDetail with cm_code and cm_description
          const cmCode = userData.cm_code;
          const cmDescription = userData.cm_description;
          console.log('Role 2 user, cm_code:', cmCode, 'cm_description:', cmDescription);
          if (cmCode) {
            const targetUrl = `/cm/cm-sku-detail/${cmCode}`;
            console.log('Redirecting Role 2 user to:', targetUrl);
            navigate(targetUrl, { 
              state: { 
                cmCode: cmCode, 
                cmDescription: cmDescription 
              } 
            });
          } else {
            setError('CM code not found for this user');
          }
        } else if (userRole === '3' || userRole === 3) {
          // Role 3: SRM User - go directly to SrmDashboard
          console.log('Role 3 user - redirecting to SRM Dashboard page');
          navigate('/srm/srm-dashboard');
        } else {
          setError(`Invalid user role: ${userRole} (type: ${typeof userRole})`);
        }
      } else {
        setError(data.message || 'User not found');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="landing-page">
      {/* Top Navigation */}
      <div className="top-nav flex">
        <img 
          src={logoImage} 
          alt="Haleon Logo" 
          className="logoImage"
        />
        <ul className="flex">
          <li><a onClick={() => navigate('/landing')} style={{ cursor: 'pointer' }}><i className="ri-home-5-line"></i> Home </a></li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="LandingPage">
        <div className="main">
          <div className="main-inner">
            <h2>Welcome to</h2>
            <h1>Sustainability Data Portal</h1>
            <p>
              The Sustainability Data Portal is a centralized platform designed to collect, 
              manage, and analyze data related to sustainability initiatives. It serves as a 
              comprehensive resource for organizations to track their environmental impact, 
              social responsibility efforts, and governance practices.
            </p>
            
            <div className="homeButtons flex">
              <a onClick={() => handleNavigation('cm-dashboard')}>
                <div>
                  <span><i className="ri-file-chart-fill"></i></span>
                </div>
                <span>Admin SM Dashboard</span>
              </a>
              
              <a onClick={() => handleNavigation('cm-sku-details')}>
                <div>
                  <span><i className="ri-file-text-fill"></i></span>
                </div>
                <span>Admin CM SKU Details</span>
              </a>
              
              <a onClick={() => handleNavigation('audit-log')}>
                <div>
                  <span><i className="ri-file-list-3-fill"></i></span>
                </div>
                <span>Audit Log Report</span>
              </a>
            </div>
            <div className="clearfix"></div>
          </div>

          <div className="RightImage">
            <img src={landingImage} alt="Landing" />
            <div className="Quote">
              <i className="ri-double-quotes-l"></i>
              Embrace the journey of growth, for every step forward is a step towards your dreams
              <i className="ri-double-quotes-r"></i>
              <div className="clearfix"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Subscription Section */}
      <div className="email-section" style={{ 
        textAlign: 'center', 
        padding: '40px 20px', 
        backgroundColor: '#f8f9fa',
        marginTop: '40px'
      }}>
        <h3 style={{ 
          marginBottom: '20px', 
          color: '#333',
          fontSize: '24px',
          fontWeight: '600'
        }}>
          User Login
        </h3>
        <p style={{ 
          marginBottom: '30px', 
          color: '#666',
          fontSize: '16px',
          maxWidth: '500px',
          margin: '0 auto 30px auto'
        }}>
          Enter your email address to access the Sustainability Data Portal
        </p>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px',
          flexWrap: 'wrap',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <input
            type="email"
            placeholder="Enter your email address"
            style={{
              padding: '12px 16px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '16px',
              minWidth: '300px',
              outline: 'none',
              borderColor: '#007bff'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#0056b3';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#007bff';
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
          />
                      <button
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0056b3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#007bff';
              }}
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? 'Logging In...' : 'Submit'}
            </button>
            {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        </div>
      </div>

      <footer></footer>
    </div>
  );
};

export default LandingPage;
