import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        width: '100%',
        background: '#000',
        color: '#fff',
        borderTop: '4px solid rgb(48, 234, 3)',
        fontFamily: 'inherit',
        fontSize: 16,
        position: 'relative',
        left: 0,
        bottom: 0,
        marginTop: 40,
        padding: 0,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '18px 24px 14px 24px',
          position: 'relative',
        }}
      >
        {/* Centered text */}
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 500, fontSize: 16 }}>
          All rights reserved Odd Team 2024
        </div>
        {/* Contact icon and link, right-aligned */}
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
          {/* Envelope SVG icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="#fff"
            viewBox="0 0 24 24"
            style={{ marginRight: 7, verticalAlign: 'middle', transition: 'fill 0.2s' }}
            className="footer-contact-icon"
          >
            <path d="M2 4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm2 0v.01L12 13l8-8.99V4H4zm16 2.41l-7.29 7.29a1 1 0 0 1-1.42 0L4 6.41V20h16V6.41z" />
          </svg>
          <a
            href="mailto:support@oddteam.com"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 16,
              borderBottom: '2px solid transparent',
              transition: 'color 0.2s, border-bottom 0.2s',
              verticalAlign: 'middle',
            }}
            onMouseOver={e => {
              e.currentTarget.style.color = 'rgb(48, 234, 3)';
              e.currentTarget.previousElementSibling && (e.currentTarget.previousElementSibling as HTMLElement).setAttribute('fill', 'rgb(48, 234, 3)');
            }}
            onMouseOut={e => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.previousElementSibling && (e.currentTarget.previousElementSibling as HTMLElement).setAttribute('fill', '#fff');
            }}
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 