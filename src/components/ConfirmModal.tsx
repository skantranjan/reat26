import React from 'react';

interface ConfirmModalProps {
  show: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 32, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
        <div style={{ marginBottom: 24, fontSize: 18, fontWeight: 500 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 4, border: 'none', background: '#eee', color: '#333', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 20px', borderRadius: 4, border: 'none', background: '#30ea03', color: '#000', fontWeight: 600, cursor: 'pointer' }}>Yes</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal; 