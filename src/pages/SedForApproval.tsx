import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';

const SedForApproval: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get 3PM Code and Description from URL parameters
  const cmCode = searchParams.get('cmCode') || '';
  const cmDescription = searchParams.get('cmDescription') || '';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!email || !selectedFile) {
      alert('Please enter an email and select a file');
        return;
      }

    setIsSubmitting(true);
    
    try {
      // TODO: Implement your file upload and submission logic here
      console.log('Submitting file:', selectedFile.name);
      console.log('Email:', email);
      console.log('CM Code:', cmCode);
      console.log('CM Description:', cmDescription);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('File submitted successfully!');
      setEmail('');
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Error submitting file:', error);
      alert('Error submitting file. Please try again.');
      } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mainInternalPages">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 0'
        }}>
          <div className="commonTitle">
            <div className="icon">
              <i className="ri-send-plane-2-line"></i>
            </div>
            <h1>Send for Approval</h1>
          </div>
        </div>

        {/* 3PM Info Section */}
        <div className="filters CMDetails">
          <div className="row">
            <div className="col-sm-12">
              <ul style={{ display: 'flex', alignItems: 'center', padding: '6px 15px 8px' }}>
                <li><strong>3PM Code: </strong> {cmCode}</li>
                <li> | </li>
                <li><strong>3PM Description: </strong> {cmDescription}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* File Upload Form */}
        <div className="row"> 
          <div className="col-12">
            <div style={{ 
              maxWidth: '600px', 
              margin: '0 auto', 
              padding: '40px 20px',
                        backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e9ecef'
            }}>
              <form onSubmit={handleSubmit}>
                {/* Email Input Field */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                      style={{
                        width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid #e9ecef',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#30ea03'}
                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    />
                  </div>

                {/* File Upload */}
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                      fontWeight: '600',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    Select File
                  </label>
                  <div style={{
                    border: '2px dashed #e9ecef',
                    borderRadius: '8px',
                    padding: '32px 16px',
                    textAlign: 'center',
                    backgroundColor: '#f8f9fa',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('fileInput')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#30ea03';
                    e.currentTarget.style.backgroundColor = '#f0fff0';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      setSelectedFile(file);
                    }
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  >
                    <input
                      id="fileInput"
                      type="file"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      required
                    />
                    <i className="ri-upload-cloud-2-line" style={{ 
                      fontSize: '48px', 
                      color: '#6c757d',
                      marginBottom: '16px',
                      display: 'block'
                    }}></i>
                    {selectedFile ? (
                      <div>
                        <p style={{ margin: '0', color: '#28a745', fontWeight: '600' }}>
                          ✓ File selected: {selectedFile.name}
                        </p>
                        <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                          Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
            </div>
                    ) : (
                      <div>
                        <p style={{ margin: '0', color: '#495057', fontWeight: '600' }}>
                          Click to select a file or drag and drop
                        </p>
                        <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                          Supports: PDF, DOC, DOCX, XLS, XLSX
                        </p>
          </div>
                    )}
        </div>
          </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !selectedFile}
                              style={{ 
                    width: '100%',
                    background: isSubmitting || !email || !selectedFile 
                      ? '#6c757d' 
                      : 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '16px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isSubmitting || !email || !selectedFile ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: isSubmitting || !email || !selectedFile ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => {
                    if (!isSubmitting && email && selectedFile) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(48, 234, 3, 0.3)';
                    }
                              }}
                              onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line spinning" style={{ marginRight: '8px' }}></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-2-line" style={{ marginRight: '8px' }}></i>
                      Submit for Approval
                    </>
                  )}
                </button>
              </form>
                </div>
              </div>
      </div>

        {/* Enhanced styles */}
      <style>{`
          .spinning {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .filters.CMDetails {
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 24px;
          }
          
          .filters.CMDetails ul {
            list-style: none;
            margin: 0;
            padding: 0;
          }
          
          .filters.CMDetails li {
            display: inline-block;
            margin-right: 16px;
            color: #495057;
          }
          
          .filters.CMDetails li:last-child {
            margin-right: 0;
        }
      `}</style>
      </div>
    </Layout>
  );
};

export default SedForApproval; 