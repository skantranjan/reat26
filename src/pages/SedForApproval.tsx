import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import Layout from '../components/Layout';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontSize: 10
  },
  header: {
    marginBottom: 30,
    textAlign: 'center'
  },
  signatureLine: {
    fontSize: 8,
    marginBottom: 0,
    color: '#000',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 1.4
  },
  tableContainer: {
    marginTop: 20
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderLeftWidth: 1,
    borderRightWidth: 1
  },
  tableHeader: {
    backgroundColor: '#006400' // Dark green header
  },
  tableHeaderRow: {
    flexDirection: 'row',
    minHeight: 35
  },
  tableHeaderCell: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    borderLeftWidth: 1,
    borderLeftColor: '#000',
    borderLeftStyle: 'solid',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  tableHeaderCellLast: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    borderLeftWidth: 1,
    borderLeftColor: '#000',
    borderLeftStyle: 'solid',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  tableHeaderText: {
    fontSize: 5,
    fontWeight: 'bold',
    color: '#ffffff', // White text on green background
    textAlign: 'left',
    lineHeight: 1.3,
    flexWrap: 'wrap'
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 35,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid'
  },
  tableCell: {
    flex: 1,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    borderLeftWidth: 1,
    borderLeftColor: '#000',
    borderLeftStyle: 'solid',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  tableCellLast: {
    flex: 1,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    borderLeftWidth: 1,
    borderLeftColor: '#000',
    borderLeftStyle: 'solid',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  tableCellText: {
    fontSize: 9,
    color: '#000',
    textAlign: 'left',
    lineHeight: 1.3,
    flexWrap: 'wrap'
  },
  tableCellTextNumeric: {
    fontSize: 9,
    color: '#000',
    textAlign: 'right',
    lineHeight: 1.3,
    flexWrap: 'wrap'
  }
});

// PDF Document Component
const PDFDocument = ({ data }: { data: any }) => {
  const { selectedRows, tableData, selectedFields } = data;
  
  // Filter data to only include selected rows
  const selectedData = tableData.filter((row: any) =>
    selectedRows.includes(row.id || row.component_id || row.componentId)
  );

  // Define headers based on selected fields
  const headers = ['SKU Code', 'Component Code', 'Component Description'];
  if (selectedFields && selectedFields.length > 0) {
    headers.push(...selectedFields);
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.signatureLine}>
            Signature confirms that the below list of component IDs and their associated metrics are an accurate reflection of the component information
          </Text>
        </View>

        {/* Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
                         <View style={styles.tableHeaderRow}>
               {headers.map((header, index) => (
                 <View key={index} style={index === headers.length - 1 ? styles.tableHeaderCellLast : styles.tableHeaderCell}>
                   <Text style={styles.tableHeaderText}>{header}</Text>
                 </View>
               ))}
             </View>
          </View>

                     {/* Table Rows */}
           {selectedData.map((row: any, rowIndex: number) => (
             <View key={rowIndex} style={styles.tableRow}>
               {/* SKU Code */}
               <View style={styles.tableCell}>
                 <Text style={styles.tableCellText}>{row.sku_code || '-'}</Text>
               </View>
               {/* Component Code */}
               <View style={styles.tableCell}>
                 <Text style={styles.tableCellText}>{row.component_code || '-'}</Text>
               </View>
               {/* Component Description */}
               <View style={styles.tableCell}>
                 <Text style={styles.tableCellText}>{row.component_description || '-'}</Text>
               </View>
               {/* Selected Fields */}
               {selectedFields && selectedFields.length > 0 && selectedFields.map((fieldLabel: string, fieldIndex: number) => {
                 const totalFields = 3 + selectedFields.length; // SKU + Component Code + Component Description + selected fields
                 const currentIndex = 3 + fieldIndex; // Start after the first 3 columns
                 
                 // Determine if this field should be right-aligned (numeric)
                 const isNumericField = fieldLabel.toLowerCase().includes('qty') || 
                                       fieldLabel.toLowerCase().includes('weight') || 
                                       fieldLabel.toLowerCase().includes('recycled') ||
                                       fieldLabel.toLowerCase().includes('percentage') ||
                                       fieldLabel.toLowerCase().includes('%');
                 
                 return (
                   <View key={fieldIndex} style={currentIndex === totalFields - 1 ? styles.tableCellLast : styles.tableCell}>
                     <Text style={isNumericField ? styles.tableCellTextNumeric : styles.tableCellText}>
                       {row[fieldLabel] || row[fieldLabel.toLowerCase()] || '-'}
                     </Text>
                   </View>
                 );
               })}
             </View>
           ))}
        </View>
      </Page>
    </Document>
  );
};

const SedForApproval: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfData, setPdfData] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [approvalDetails, setApprovalDetails] = useState<any>(null);
  
  // Get 3PM Code and Description from navigation state or URL parameters
  const cmCode = location.state?.cmCode || searchParams.get('cmCode') || '';
  const cmDescription = location.state?.cmDescription || searchParams.get('cmDescription') || '';

  // Get data passed from GeneratePdf page
  useEffect(() => {
    if (location.state) {
      setPdfData(location.state);
      console.log('Received data from GeneratePdf:', location.state);
      console.log('CM Code from state:', location.state.cmCode);
      console.log('CM Description from state:', location.state.cmDescription);
      console.log('Period from state:', location.state.selectedPeriod);
      console.log('Period type:', typeof location.state.selectedPeriod);
      console.log('Period value:', location.state.selectedPeriod);
    }
  }, [location.state]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!email) {
      return;
    }

    if (!pdfData) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get period value with fallback
      const periodValue = pdfData.selectedPeriod || 'Default Period';
      
      console.log('Sending for approval with email:', email);
      console.log('PDF data:', pdfData);
      console.log('CM Code:', cmCode);
      console.log('CM Description:', cmDescription);
      console.log('Period being sent:', periodValue);
      console.log('Period type:', typeof periodValue);
      
      // Generate PDF as blob first
      const pdfBlob = await generatePDFBlob();
      
      // Create FormData with PDF file, email, period, and cm_code
      const formData = new FormData();
      formData.append('File', pdfBlob, `component-report-${cmCode}-${new Date().toISOString().split('T')[0]}.pdf`);
      formData.append('email', email);
      formData.append('period', periodValue);
      formData.append('cm_code', cmCode);
      
      // Debug: Log what's being sent
      console.log('FormData contents being sent:');
      console.log('File:', `component-report-${cmCode}-${new Date().toISOString().split('T')[0]}.pdf`);
      console.log('Email:', email);
      console.log('Period:', periodValue);
      console.log('CM Code:', cmCode);
      
      // Call your backend API with FormData
      const response = await fetch('http://localhost:3000/pdf-accesstoken', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setApprovalDetails({
          email: email,
          cmCode: cmCode,
          cmDescription: cmDescription,
          timestamp: new Date().toLocaleString(),
          period: periodValue
        });
        setEmail('');
        setShowSuccessModal(true);
      } else {
        throw new Error(result.message || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error('Error sending for approval:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to generate PDF as blob using @react-pdf/renderer
  const generatePDFBlob = async (): Promise<Blob> => {
    try {
      if (!pdfData) {
        throw new Error('No PDF data available');
      }

      // Validate required data
      if (!pdfData.tableData || !pdfData.selectedRows) {
        throw new Error('Invalid PDF data structure');
      }

      // Generate PDF blob using @react-pdf/renderer
      const pdfBlob = await pdf(<PDFDocument data={pdfData} />).toBlob();
      console.log('PDF generated successfully:', pdfBlob);
      return pdfBlob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  const handleGeneratePDF = async () => {
    if (pdfData) {
      try {
        // Generate PDF blob
        const pdfBlob = await generatePDFBlob();
        
        // Create URL and open in new tab
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
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
          
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
              color: '#000',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(48, 234, 3, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <i className="ri-arrow-left-line"></i>
            Back
          </button>
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

        {/* No PDF Data Message */}
        {!pdfData && (
          <div className="row">
            <div className="col-12">
              <div style={{ 
                backgroundColor: '#fff',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid #e9ecef',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#6c757d'
              }}>
                <i className="ri-file-pdf-2-line" style={{ 
                  fontSize: '48px', 
                  color: '#6c757d',
                  marginBottom: '16px',
                  display: 'block'
                }}></i>
                <p style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
                  No PDF Data Available
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                  Please generate a PDF from the Generate PDF page first
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email Form Section */}
        {pdfData && (
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
                  <h3 style={{ 
                    margin: '0 0 24px 0', 
                    color: '#495057',
                    textAlign: 'center'
                  }}>
                    Send PDF for Approval
                  </h3>
                  
                  {/* Open PDF Button */}
                  <div style={{ 
                    marginBottom: '24px',
                    textAlign: 'center'
                  }}>
                    <button
                      type="button"
                      onClick={handleGeneratePDF}
                      style={{
                        background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
                        color: '#000',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(48, 234, 3, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                                         >
                       <i className="ri-file-pdf-2-line"></i>
                       View Generated PDF
                     </button>
                  </div>
                  
                  {/* Email Input Field */}
                  <div style={{ marginBottom: '32px' }}>
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
                      placeholder="Enter recipient email address"
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

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    style={{ 
                      width: '100%',
                      background: isSubmitting || !email 
                        ? '#6c757d' 
                        : 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '16px 24px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isSubmitting || !email ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      opacity: isSubmitting || !email ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting && email) {
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
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-2-line" style={{ marginRight: '8px' }}></i>
                        Send for Approval
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              textAlign: 'center'
            }}>
              {/* Success Icon */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#30ea03',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '0 auto 24px',
                animation: 'scaleIn 0.3s ease-out'
              }}>
                <i className="ri-check-line" style={{
                  fontSize: '40px',
                  color: '#fff'
                }}></i>
              </div>

              {/* Success Title */}
              <h2 style={{
                margin: '0 0 16px 0',
                color: '#28a745',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                PDF Sent Successfully!
              </h2>

              {/* Success Message */}
              <p style={{
                margin: '0 0 24px 0',
                color: '#6c757d',
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                Your PDF has been sent for approval
              </p>

              {/* Details */}
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#495057' }}>Sent to:</strong> {approvalDetails?.email}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#495057' }}>3PM Code:</strong> {approvalDetails?.cmCode}
                </div>
              </div>

              {/* Action Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  style={{
                    background: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    minWidth: '120px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(108, 117, 125, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <i className="ri-close-line" style={{ marginRight: '8px' }}></i>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced styles */}
        <style>{`
          .spinning {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes scaleIn {
            from { 
              transform: scale(0.8);
              opacity: 0;
            }
            to { 
              transform: scale(1);
              opacity: 1;
            }
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