import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiGet, apiPost } from '../utils/api';
import * as ExcelJS from 'exceljs';

// Add CSS for spinning loader
const spinningStyle = {
  animation: 'spin 1s linear infinite'
};

// Add keyframes for spinning animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

const UploadData: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedFromYear, setSelectedFromYear] = useState<string>('');
  const [selectedToYear, setSelectedToYear] = useState<string>('');
  const [years, setYears] = useState<Array<{id: string, period: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Excel file handling state
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  
  // Get 3PM Code and Description from URL parameters
  const cmCode = searchParams.get('cmCode') || '';
  const cmDescription = searchParams.get('cmDescription') || '';

  // Excel file reading function
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please select a valid Excel file (.xlsx, .xls) or CSV file (.csv)');
      return;
    }

    setSelectedFile(file);
    setFileLoading(true);
    setError(null);
    setUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data.buffer);
        const worksheet = workbook.getWorksheet(1); // Get first worksheet
        
        if (!worksheet) {
          setError('No worksheet found in the Excel file');
          setFileLoading(false);
          return;
        }
        
        // Convert to JSON
        const jsonData: any[][] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header row for now
          const rowData: any[] = [];
          row.eachCell((cell, colNumber) => {
            rowData[colNumber - 1] = cell.value;
          });
          jsonData.push(rowData);
        });
        
        // Add headers (first row)
        const excelHeaders: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          excelHeaders[colNumber - 1] = cell.value?.toString() || '';
        });
        jsonData.unshift(excelHeaders); // Add headers at the beginning
        
        if (jsonData.length === 0) {
          setError('The Excel file is empty or contains no data');
          setFileLoading(false);
          return;
        }

        // Extract headers (first row)
        const headers = jsonData[0] as string[];
        setExcelHeaders(headers);

        // Validate required columns
        const requiredColumns = ['SkuCode', 'SkuDescription'];
        const missingColumns = requiredColumns.filter(col => 
          !headers.some(header => header.toLowerCase() === col.toLowerCase())
        );

        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(', ')}. Please ensure your Excel file has SkuCode and SkuDescription columns.`);
          setFileLoading(false);
          return;
        }

        // Extract data (remaining rows) - only SkuCode and SkuDescription
        const dataRows = jsonData.slice(1).map((row: any, index: number) => {
          const skuCodeIndex = headers.findIndex(header => header.toLowerCase() === 'skucode');
          const skuDescriptionIndex = headers.findIndex(header => header.toLowerCase() === 'skudescription');
          
          return {
            sku_code: row[skuCodeIndex] || '',
            sku_description: row[skuDescriptionIndex] || '',
            _rowIndex: index + 1
          };
        }).filter(row => row.sku_code && row.sku_description); // Only include rows with both values

        if (dataRows.length === 0) {
          setError('No valid rows found. Please ensure your Excel file has data in both SkuCode and SkuDescription columns.');
          setFileLoading(false);
          return;
        }

        setExcelData(dataRows);
        setFileLoading(false);
        console.log('Excel file loaded successfully:', { 
          headers, 
          dataRows: dataRows.length,
          sampleData: dataRows.slice(0, 3) // Log first 3 rows for verification
        });
      } catch (err) {
        console.error('Error reading Excel file:', err);
        setError('Error reading the Excel file. Please ensure it\'s a valid Excel file.');
        setFileLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading the file');
      setFileLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Upload data function
  const handleUploadData = async () => {
    if (!excelData.length || !selectedFile) {
      setError('Please select and read an Excel file first');
      return;
    }

    if (!selectedToYear) {
      setError('Please ensure To Period is selected');
      return;
    }

    setUploadLoading(true);
    setError(null);
    setUploadSuccess(null);

    try {
      // Prepare data for copy-sku API
      const uploadData = {
        cm_code: cmCode,
        year_id: selectedToYear, // Using To Period value as year_id
        skuData: excelData.map(row => ({
          sku_code: row.sku_code,
          sku_description: row.sku_description
        }))
      };

      console.log('Sending data to copy-sku API:', uploadData);
      console.log('Debug - cm_code:', cmCode);
      console.log('Debug - year_id:', selectedToYear);
      console.log('Debug - skuData length:', excelData.length);
      console.log('Debug - skuData sample:', excelData.slice(0, 2));

      // Call the copy-sku API
      const response = await apiPost('/copy-sku', uploadData);
      
      if (response && response.success) {
        setUploadSuccess(`Successfully uploaded ${excelData.length} SKU records!`);
        setExcelData([]);
        setExcelHeaders([]);
        setSelectedFile(null);
        console.log('SKU data uploaded successfully:', response);
      } else {
        throw new Error(response?.message || 'Upload failed');
      }
      
    } catch (err) {
      console.error('Error uploading SKU data:', err);
      setError(`Error uploading data: ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setUploadLoading(false);
    }
  };

  // Fetch years from API
  useEffect(() => {
    const fetchYears = async () => {
      try {
        console.log('Fetching years for UploadData...');
        setLoading(true);
        setError(null);
        
        // Use the master data API endpoint
        const result = await apiGet('/get-masterdata');
        console.log('Years API result:', result);
        
        // Extract periods data from the master data API response
        let yearsData = [];
        
        if (result && result.success && result.data && result.data.periods) {
          // Master data API response format
          yearsData = result.data.periods;
          console.log('Extracted periods from master data:', yearsData);
        } else {
          console.warn('Unexpected master data API response format:', result);
          yearsData = [];
        }
        
                // Process the periods data into the expected format and sort by year in descending order
        const processedYears = yearsData.map((item: any) => {
          if (item && typeof item === 'object' && item.period && item.id) {
            return { id: item.id.toString(), period: item.period };
          }
          return null;
        }).filter(Boolean);
        
        // Sort periods by ID value in descending order (highest ID first)
        const sortedYears = processedYears.sort((a: any, b: any) => {
          const idA = parseInt(a.id);
          const idB = parseInt(b.id);
          
          return idB - idA; // Descending order by ID value
        });
        
        console.log('Processed and sorted years:', sortedYears);
        setYears(sortedYears);
        
                 if (sortedYears.length === 0) {
           console.warn('No periods found in master data API response');
           setError('No periods available in the system.');
         } else {
           // Auto-select based on sorted IDs (descending order)
           // From Period: Second highest ID (index 1)
           // To Period: Highest ID (index 0)
           if (sortedYears.length >= 2) {
             // From Period: Second highest ID
             const fromPeriodOption = sortedYears[1]; // Index 1 = second highest
             setSelectedFromYear(fromPeriodOption.id);
             console.log('Auto-selected From Period (second highest ID):', fromPeriodOption.period, 'ID:', fromPeriodOption.id);
             
             // To Period: Highest ID
             const toPeriodOption = sortedYears[0]; // Index 0 = highest
             setSelectedToYear(toPeriodOption.id);
             console.log('Auto-selected To Period (highest ID):', toPeriodOption.period, 'ID:', toPeriodOption.id);
           } else if (sortedYears.length === 1) {
             // If only one period available, use it for both
             setSelectedFromYear(sortedYears[0].id);
             setSelectedToYear(sortedYears[0].id);
             console.log('Only one period available, using for both:', sortedYears[0].period);
           }
         }
        
      } catch (err) {
        console.error('Error fetching years from master data API:', err);
        setError('Failed to load periods. Please try again.');
        setYears([]);
      } finally {
        setLoading(false);
      }
    };
    fetchYears();
  }, []);



  return (
    <Layout>
      <div className="mainInternalPages">
        <div style={{ marginBottom: 8 }}>
        </div>
        {/* Dashboard Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 0'
        }}>
          <div className="commonTitle">
            <div className="icon">
              <i className="ri-upload-cloud-2-fill"></i>
            </div>
            <h1>Upload Data</h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
              border: 'none',
              color: '#000',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px 16px',
              borderRadius: '8px',
              transition: 'all 0.3s ease',
              minWidth: '100px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 18, marginRight: 6 }} />
            Back
          </button>
        </div>

        {/* 3PM Info Section */}
        <div className="filters CMDetails">
          <div className="row">
            <div className="col-sm-12 ">
              <ul style={{ display: 'flex', alignItems: 'center', padding: '6px 15px 8px' }}>
                <li><strong>3PM Code: </strong> {cmCode}</li>
                <li> | </li>
                <li><strong>3PM Description: </strong> {cmDescription}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="row"> 
          <div className="col-sm-12">
            <div className="filters">
              <ul>
                <li>
                  <div className="fBold">From Period</div>
                  <div className="form-control">
                                         <select
                       value={selectedFromYear}
                       style={{
                         width: '100%',
                         padding: '8px 12px',
                         borderRadius: '4px',
                         fontSize: '14px',
                         backgroundColor: '#f8f9fa',
                         border: '1px solid #ddd',
                         outline: 'none',
                         cursor: 'not-allowed'
                       }}
                       disabled={true}
                     >
                      <option value="">Select From Period</option>
                                             {years.length === 0 ? (
                         <option value="" disabled>Loading periods...</option>
                       ) : (
                         // Show second highest ID period for From dropdown
                         years.length >= 2 ? (
                           <option value={years[1].id}>
                             {years[1].period}
                           </option>
                         ) : years.length === 1 ? (
                           <option value={years[0].id}>
                             {years[0].period}
                           </option>
                         ) : null
                       )}
                    </select>
                  </div>
                </li>
                <li>
                  <div className="fBold">To Period</div>
                  <div className="form-control">
                                         <select
                       value={selectedToYear}
                       style={{
                         width: '100%',
                         padding: '8px 12px',
                         borderRadius: '4px',
                         fontSize: '14px',
                         backgroundColor: '#f8f9fa',
                         border: '1px solid #ddd',
                         outline: 'none',
                         cursor: 'not-allowed'
                       }}
                       disabled={true}
                     >
                      <option value="">Select To Period</option>
                                             {years.length === 0 ? (
                         <option value="" disabled>Loading periods...</option>
                       ) : (
                         // Show highest ID period for To dropdown
                         years.length >= 1 ? (
                           <option value={years[0].id}>
                             {years[0].period}
                           </option>
                         ) : null
                       )}
                    </select>
                  </div>
                </li>
                                                  <li>
                    <div className="fBold">Browse Excel File</div>
                    <div className="form-control">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          backgroundColor: '#fff',
                          border: '1px solid #ddd',
                          outline: 'none'
                        }}
                      />
                      <div style={{ 
                        marginTop: '4px', 
                        fontSize: '11px', 
                        color: '#666',
                        fontStyle: 'italic'
                      }}>
                        Required columns: SkuCode, SkuDescription
                      </div>
                     {selectedFile && (
                       <div style={{ 
                         marginTop: '8px', 
                         fontSize: '12px', 
                         color: '#28a745',
                         display: 'flex',
                         alignItems: 'center',
                         gap: '4px'
                       }}>
                         <i className="ri-check-line"></i>
                         {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                         <button
                           type="button"
                           onClick={() => {
                             setSelectedFile(null);
                             setExcelData([]);
                             setExcelHeaders([]);
                             setError(null);
                             setUploadSuccess(null);
                           }}
                           style={{
                             marginLeft: '8px',
                             background: 'none',
                             border: 'none',
                             color: '#dc3545',
                             cursor: 'pointer',
                             fontSize: '12px',
                             padding: '2px 6px',
                             borderRadius: '3px'
                           }}
                           title="Clear file"
                         >
                           <i className="ri-close-line"></i>
                         </button>
                       </div>
                     )}
                   </div>
                 </li>
                 <li>
                                       <button 
                                         className="btnCommon btnGreen filterButtons" 
                                         onClick={handleUploadData} 
                                         disabled={!excelData.length || !selectedFile || uploadLoading}
                                       >
                      <span>{uploadLoading ? 'Uploading...' : 'Upload'}</span>
                      <i 
                        className={uploadLoading ? 'ri-loader-4-line' : 'ri-upload-line'} 
                        style={uploadLoading ? spinningStyle : {}}
                      ></i>
                    </button>
                 </li>
              </ul>
            </div>
          </div>
        </div>

        

        {/* File Loading Indicator */}
        {fileLoading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666',
            marginTop: '20px'
          }}>
            <i className="ri-loader-4-line" style={{ fontSize: '24px', color: '#666', ...spinningStyle }}></i>
            <p>Reading Excel file...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '15px 20px', 
            borderRadius: '8px', 
            marginTop: '20px',
            border: '1px solid #f5c6cb',
            display: 'flex',
            alignItems: 'center'
          }}>
            <i className="ri-error-warning-line" style={{ marginRight: '8px', fontSize: '18px' }}></i>
            {error}
          </div>
        )}

        {/* Success Display */}
        {uploadSuccess && (
          <div style={{ 
            background: '#d4edda', 
            color: '#155724', 
            padding: '15px 20px', 
            borderRadius: '8px', 
            marginTop: '20px',
            border: '1px solid #c3e6cb',
            display: 'flex',
            alignItems: 'center'
          }}>
            <i className="ri-check-line" style={{ marginRight: '8px', fontSize: '18px' }}></i>
            {uploadSuccess}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <i className="ri-loader-4-line" style={{ fontSize: '24px', color: '#666', ...spinningStyle }}></i>
            <p>Loading periods...</p>
          </div>
        )}


      </div>
    </Layout>
  );
};

export default UploadData; 