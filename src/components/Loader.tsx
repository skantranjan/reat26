import React from 'react';
import './Loader.css';

const Loader: React.FC = () => (
  <div className="fullpage-loader">
    <div className="loader-container">
      <div className="spinner"></div>
      <div className="loader-text">Loading Sustainability Data</div>
      <div className="loader-subtitle">Please wait while we fetch your information</div>
      <div className="loader-dots">
        <div className="loader-dot"></div>
        <div className="loader-dot"></div>
        <div className="loader-dot"></div>
      </div>
    </div>
  </div>
);

export default Loader; 