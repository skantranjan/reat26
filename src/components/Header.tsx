import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleHomeClick = () => {
    navigate('/landing');
  };

  const handleLogout = () => {
    logout();
    navigate('/landing');
  };

  return (
    <div className="top-nav flex">
      <img src="/images/logo.png" alt="Haleon Logo" className="logoImage" data-themekey="#" />
      <h2>Sustainability Data Portal</h2>
      <ul className="flex">
        <li><a onClick={handleHomeClick} style={{ cursor: 'pointer' }}><i className="ri-home-5-line"></i> Home </a></li>
        <li><a href="#"> <i className="ri-information-line"></i> About</a></li>
        <li><a href="#"><i className="ri-mail-line"></i> Contact</a></li>
        {user && (
          <li>
            <a onClick={handleLogout} style={{ cursor: 'pointer', color: '#dc3545' }}>
              <i className="ri-logout-box-r-line"></i> Logout ({user.username})
            </a>
          </li>
        )}
      </ul>
    </div>
  );
};

export default Header; 