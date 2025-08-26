import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import MultiSelect from '../../components/MultiSelect';
import ConfirmModal from '../../components/ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiGet } from '../../utils/api';

// Note: This component uses the /get-masterdata API to populate filters with master data including:
// - Reporting periods, Material types, Regions, Component UOMs, Packaging materials, Packaging levels, Component base UOMs
// This provides consistent master data from a single source

const componentFields = [
  'component_code',
  'component_description',
  'component_valid_from',
  'component_valid_to',
  'component_quantity',
  'component_uom_id',
  'component_base_quantity',
  'component_base_uom_id',
  'component_packaging_type_id',
  'component_packaging_material',
  'component_unit_weight',
  'weight_unit_measure_id',
  'percent_mechanical_pcr_content',
  'components_reference',
  'component_material_group',
  'percent_w_w',
  'percent_mechanical_pir_content',
  'percent_chemical_recycled_content',
  'percent_bio_sourced',
  'material_structure_multimaterials',
  'component_packaging_level_id',
  'component_dimensions'
];

// User-friendly labels for the component fields
const componentFieldLabels: { [key: string]: string } = {
  'component_code': 'Component Code',
  'component_description': 'Component Description',
  'component_valid_from': 'Component validity date - From',
  'component_valid_to': 'Component validity date - To',
  'component_quantity': 'Component Qty',
  'component_uom_id': 'Component UoM',
  'component_base_quantity': 'Component Base Qty',
  'component_base_uom_id': 'Component Base UoM',
  'component_packaging_type_id': 'Component Packaging Type',
  'component_packaging_material': 'Component Packaging Material',
  'component_unit_weight': 'Component Unit Weight',
  'weight_unit_measure_id': 'Weight Unit of Measure',
  'percent_mechanical_pcr_content': '% Mechanical Post-Consumer Recycled Content (inc. Chemical)',
  'components_reference': 'Component reference',
  'component_material_group': 'Component Material Group (Category)',
  'percent_w_w': '%w/w',
  'percent_mechanical_pir_content': '% Mechanical Post-Industrial Recycled Content',
  'percent_chemical_recycled_content': '% Chemical Recycled Content',
  'percent_bio_sourced': '% Bio-sourced?',
  'material_structure_multimaterials': 'Material structure - multimaterials only (with % wt)',
  'component_packaging_level_id': 'Component packaging level',
  'component_dimensions': 'Component dimensions (3D - LxWxH, 2D - LxW)'
};

// Reverse mapping from user-friendly labels to database field names
const componentFieldValues: { [key: string]: string } = {
  'Component Code': 'component_code',
  'Component Description': 'component_description',
  'Component validity date - From': 'component_valid_from',
  'Component validity date - To': 'component_valid_to',
  'Component Qty': 'component_quantity',
  'Component UoM': 'component_uom_id',
  'Component Base Qty': 'component_base_quantity',
  'Component Base UoM': 'component_base_uom_id',
  'Component Packaging Type': 'component_packaging_type_id',
  'Component Packaging Material': 'component_packaging_material',
  'Component Unit Weight': 'component_unit_weight',
  'Weight Unit of Measure': 'weight_unit_measure_id',
  '% Mechanical Post-Consumer Recycled Content (inc. Chemical)': 'percent_mechanical_pcr_content',
  'Component reference': 'components_reference',
  'Component Material Group (Category)': 'component_material_group',
  '%w/w': 'percent_w_w',
  '% Mechanical Post-Industrial Recycled Content': 'percent_mechanical_pir_content',
  '% Chemical Recycled Content': 'percent_chemical_recycled_content',
  '% Bio-sourced?': 'percent_bio_sourced',
  'Material structure - multimaterials only (with % wt)': 'material_structure_multimaterials',
  'Component packaging level': 'component_packaging_level_id',
  'Component dimensions (3D - LxWxH, 2D - LxW)': 'component_dimensions'
};

const GeneratePdf: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'Component Code',
    'Component Description',
    'Component validity date - From',
    'Component validity date - To',
    'Component Qty',
    'Component UoM',
    'Component Base Qty',
    'Component Base UoM',
    'Component Packaging Type',
    'Component Packaging Material',
    'Component Unit Weight',
    'Weight Unit of Measure',
    '% Mechanical Post-Consumer Recycled Content (inc. Chemical)'
  ]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [years, setYears] = useState<Array<{id: string, period: string}>>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNoDataModal, setShowNoDataModal] = useState(false);
  const [showMaxSelectionModal, setShowMaxSelectionModal] = useState(false);
  const lastFilteredDataRef = useRef<string>('');
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('1'); // Default to Raw Material (ID: 1) since data has material_type_id = 1
  const [materialTypes, setMaterialTypes] = useState<Array<{id: number, item_name: string}>>([]);
  const [isFilterApplied, setIsFilterApplied] = useState<boolean>(true); // Auto-apply filter on page load to show default material type
  
  // New filter states for additional master data
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [regions, setRegions] = useState<Array<{id: number, name: string}>>([]);
  const [selectedComponentUom, setSelectedComponentUom] = useState<string>('');
  const [componentUoms, setComponentUoms] = useState<Array<{id: number, item_name: string}>>([]);
  const [selectedPackagingMaterial, setSelectedPackagingMaterial] = useState<string>('');
  const [packagingMaterials, setPackagingMaterials] = useState<Array<{id: number, item_name: string}>>([]);
  const [selectedPackagingLevel, setSelectedPackagingLevel] = useState<string>('');
  const [packagingLevels, setPackagingLevels] = useState<Array<{id: number, item_name: string}>>([]);
  const [selectedComponentBaseUom, setSelectedComponentBaseUom] = useState<string>('');
  const [componentBaseUoms, setComponentBaseUoms] = useState<Array<{id: number, item_name: string}>>([]);
  
  // Get 3PM Code and Description from URL parameters
  const cmCode = searchParams.get('cmCode') || '';
  const cmDescription = searchParams.get('cmDescription') || '';

  // Debug: Log the received parameters
  console.log('CmGeneratePdf - Received parameters:', { cmCode, cmDescription });
  console.log('CmGeneratePdf - Full search params:', Object.fromEntries(searchParams.entries()));

  // Fetch master data (periods and material types) from single API
  const fetchMasterData = async () => {
    try {
      console.log('Fetching master data from /get-masterdata API...');
      const result = await apiGet('/get-masterdata');
      console.log('Master data API response:', result);
      
      if (result.success && result.data) {
        // Set material types
        if (result.data.material_types && Array.isArray(result.data.material_types)) {
          setMaterialTypes(result.data.material_types);
          console.log('Material types loaded:', result.data.material_types);
        }
        
        // Set periods (reporting periods)
        if (result.data.periods && Array.isArray(result.data.periods)) {
          const reportingPeriods = result.data.periods.map((period: any) => ({
            id: period.id?.toString() || '',
            period: period.period || ''
          })).filter((item: any) => item.id && item.period);
          
          console.log('Reporting periods loaded:', reportingPeriods);
          setYears(reportingPeriods);
          
          if (reportingPeriods.length > 0) {
            // Auto-select the most recent active period
            const activePeriods = result.data.periods.filter((p: any) => p.is_active);
            const latestPeriod = activePeriods.length > 0 ? activePeriods[activePeriods.length - 1] : reportingPeriods[0];
            setSelectedYears([latestPeriod.id.toString()]);
            console.log('Auto-selected reporting period:', latestPeriod.period);
          }
        }
        
        // Set regions
        if (result.data.regions && Array.isArray(result.data.regions)) {
          setRegions(result.data.regions);
          console.log('Regions loaded:', result.data.regions);
        }
        
        // Set component UOMs
        if (result.data.component_uoms && Array.isArray(result.data.component_uoms)) {
          setComponentUoms(result.data.component_uoms);
          console.log('Component UOMs loaded:', result.data.component_uoms);
        }
        
        // Set packaging materials
        if (result.data.packaging_materials && Array.isArray(result.data.packaging_materials)) {
          setPackagingMaterials(result.data.packaging_materials);
          console.log('Packaging materials loaded:', result.data.packaging_materials);
        }
        
        // Set packaging levels
        if (result.data.packaging_levels && Array.isArray(result.data.packaging_levels)) {
          setPackagingLevels(result.data.packaging_levels);
          console.log('Packaging levels loaded:', result.data.packaging_levels);
        }
        
        // Set component base UOMs
        if (result.data.component_base_uoms && Array.isArray(result.data.component_base_uoms)) {
          setComponentBaseUoms(result.data.component_base_uoms);
          console.log('Component base UOMs loaded:', result.data.component_base_uoms);
        }
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
      setError('Failed to load master data. Please check your connection and try again.');
    }
  };

  // Fetch master data (periods and material types) on component mount
  useEffect(() => {
    fetchMasterData();
  }, []);



  // Fetch component details when year is selected
  useEffect(() => {
    const fetchComponentDetails = async () => {
      if (selectedYears.length === 0 || !cmCode) {
        setTableData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use the first selected year for the API call
        const selectedYear = selectedYears[0];
        const selectedPeriod = years.find(period => period.id === selectedYear)?.period || selectedYear;
        
        console.log('Fetching component details for reporting period:', selectedYear, 'period:', selectedPeriod, 'and cm_code:', cmCode);
        
        // Try different API endpoints for component details with fallback logic
        let response;
        let data;
        
        // First try the new API endpoint
        try {
          response = await apiGet(`/sku-components-summary?period=${encodeURIComponent(selectedYear)}&cm_code=${encodeURIComponent(cmCode)}`);
          if (response.ok) {
            data = await response.json();
            console.log('Using new API endpoint - sku-components-summary');
          }
        } catch (err) {
          console.log('New API endpoint failed, trying fallback endpoints...');
        }
        
        // Fallback to existing endpoints if new API fails
        if (!response || !response.ok) {
          try {
            response = await apiGet(`/component-details-by-year-cm?year=${encodeURIComponent(selectedYear)}&cm_code=${encodeURIComponent(cmCode)}`);
            if (response.ok) {
              data = await response.json();
              console.log('Using fallback API endpoint - component-details-by-year-cm');
            }
          } catch (err) {
            console.log('First fallback failed, trying second fallback...');
          }
        }
        
        // Second fallback
        if (!response || !response.ok) {
          try {
            response = await apiGet(`/component-details?period=${encodeURIComponent(selectedYear)}&cm_code=${encodeURIComponent(cmCode)}`);
            if (response.ok) {
              data = await response.json();
              console.log('Using second fallback API endpoint - component-details');
            }
          } catch (err) {
            console.log('Second fallback failed');
          }
        }
        
        if (!response || !response.ok) {
          throw new Error(`Failed to fetch data from all endpoints: ${response?.status || 'Network error'}`);
        }

        console.log('API Response Data:', data);
        console.log('Response success:', data.success);
        
        // Handle different response formats
        if (data.success && data.data) {
          let componentData = [];
          
          // Check if it's the new API format
          if (data.data.skus_with_components) {
            console.log('Processing new API format');
            componentData = data.data.skus_with_components.flatMap((skuGroup: any) => {
              // If SKU has components, create a row for each component
              if (skuGroup.active_components && skuGroup.active_components.length > 0) {
                return skuGroup.active_components.map((component: any) => ({
                  ...component,
                  sku_code: skuGroup.sku_info.sku_code,
                  sku_description: skuGroup.sku_info.sku_description,
                  cm_code: skuGroup.sku_info.cm_code,
                  cm_description: skuGroup.sku_info.cm_description,
                  period: skuGroup.sku_info.period,
                  year: skuGroup.sku_info.year
                }));
              } else {
                // If SKU has no components, create a single row with SKU info only
                return [{
                  component_id: null,
                  component_code: '-',
                  component_description: '-',
                  component_valid_from: '-',
                  component_valid_to: '-',
                  component_quantity: '-',
                  component_uom_id: '-',
                  component_base_quantity: '-',
                  component_base_uom_id: '-',
                  component_packaging_type_id: '-',
                  component_packaging_material: '-',
                  component_unit_weight: '-',
                  weight_unit_measure_id: '-',
                  percent_mechanical_pcr_content: '-',
                  sku_code: skuGroup.sku_info.sku_code,
                  sku_description: skuGroup.sku_info.sku_description,
                  cm_code: skuGroup.sku_info.cm_code,
                  cm_description: skuGroup.sku_info.cm_description,
                  period: skuGroup.sku_info.period,
                  year: skuGroup.sku_info.year
                }];
              }
            });
          } else if (Array.isArray(data.data)) {
            console.log('Processing existing API format');
            componentData = data.data;
          }
          
          setTableData(componentData);
          console.log('Table data set successfully:', componentData.length, 'rows');
        } else {
          console.warn('No valid data in response');
          setTableData([]);
        }
      } catch (err) {
        console.error('Error fetching component details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        setTableData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComponentDetails();
  }, [selectedYears, cmCode]);

  // Filtered data based on selected fields and material type
  const filteredData = tableData.filter(row => {
    // Apply material type filter ONLY if filter button was clicked and material type is selected
    if (isFilterApplied && selectedMaterialType) {
      // Compare with material_type_id field specifically
      const rowMaterialTypeId = row.material_type_id;
      
      // Convert both to strings for comparison
      const selectedTypeStr = selectedMaterialType.toString();
      const rowTypeStr = rowMaterialTypeId ? rowMaterialTypeId.toString() : '';
      
      // Only filter if the row has a material_type_id and it doesn't match
      if (rowMaterialTypeId && rowTypeStr !== selectedTypeStr) {
        return false;
      }
    }
    
    // If no fields selected, show all data
    if (selectedFields.length === 0) return true;
    
    // Filter based on selected component fields
    const hasMatchingField = selectedFields.some(fieldLabel => {
      // Convert user-friendly label to database field name
      const fieldName = componentFieldValues[fieldLabel];
      // Check if the row has data for this field
      const hasData = row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '';
      return hasData;
    });
    
    return hasMatchingField;
  });



  // Auto-select all rows when filtered data changes
  useEffect(() => {
    if (filteredData.length > 0) {
      const allRowIds = filteredData.map(row => row.id || row.component_id || row.componentId);
      const currentDataHash = JSON.stringify(allRowIds.sort());
      
      // Only update if the filtered data has actually changed
      if (lastFilteredDataRef.current !== currentDataHash) {
        setSelectedRows(allRowIds);
        lastFilteredDataRef.current = currentDataHash;
        console.log('Auto-selected all rows:', allRowIds.length, 'rows');
      }
    }
  }, [filteredData]);

  // Select all logic
  const allSelected = filteredData.length > 0 && filteredData.every(row => selectedRows.includes(row.id || row.component_id || row.componentId));
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredData.map(row => row.id || row.component_id || row.componentId));
    } else {
      setSelectedRows(selectedRows.filter(id => !filteredData.some(row => (row.id || row.component_id || row.componentId) === id)));
    }
  };

  const handleRowSelect = (id: number, checked: boolean) => {
    setSelectedRows(checked ? [...selectedRows, id] : selectedRows.filter(rowId => rowId !== id));
  };

  // Get available columns from the data
  const getAvailableColumns = () => {
    if (tableData.length === 0) return [];
    
    const allColumns = new Set<string>();
    tableData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key !== 'id' && key !== 'component_id' && key !== 'componentId') {
          allColumns.add(key);
        }
      });
    });
    
    return Array.from(allColumns);
  };

  const availableColumns = getAvailableColumns();

  // PDF generation handler
  const handleGeneratePDF = () => {
    try {
      // If no rows are selected, use all filtered data
      let dataToProcess;
      if (selectedRows.length === 0) {
        dataToProcess = filteredData;
        console.log('No rows selected, generating PDF for all available data');
      } else {
      // Filter data to only include selected rows
        dataToProcess = filteredData.filter(row => 
        selectedRows.includes(row.id || row.component_id || row.componentId)
      );
        console.log('Generating PDF for selected rows:', selectedRows.length);
      }

      // Sanitize the data to prevent circular references and large objects
      const sanitizedData = dataToProcess.map((row: any) => {
        const sanitizedRow: any = {};
        Object.keys(row).forEach(key => {
          const value = row[key];
          // Convert complex objects to strings, handle null/undefined
          if (value === null || value === undefined) {
            sanitizedRow[key] = '-';
          } else if (typeof value === 'object') {
            sanitizedRow[key] = JSON.stringify(value).substring(0, 100) + '...';
          } else if (typeof value === 'string' && value.length > 200) {
            sanitizedRow[key] = value.substring(0, 200) + '...';
          } else {
            sanitizedRow[key] = value;
          }
        });
        return sanitizedRow;
      });

      const doc = new jsPDF('landscape'); // Use landscape orientation for wide table
    
    // Define all headers matching the table structure
    const headers = [
      'SKU Code',
      'Component Code',
      'Component Description',
      'Component validity date - From',
      'Component validity date - To',
      'Component Qty',
      'Component UoM',
      'Component Base Qty',
      'Component Base UoM',
      'Component Packaging Type',
      'Component Packaging Material',
      'Component Unit Weight',
      'Weight Unit of Measure',
      '% Mechanical Post-Consumer Recycled Content (inc. Chemical)',
      ...selectedFields
    ];

    // Define column widths for better layout
    const columnWidths = [
      30, // SKU Code
      35, // Component Code
      40, // Component Description
      35, // Component validity date - From
      35, // Component validity date - To
      25, // Component Qty
      25, // Component UoM
      30, // Component Base Qty
      35, // Component Base UoM
      35, // Component Packaging Type
      35, // Component Packaging Material
      30, // Component Unit Weight
      35, // Weight Unit of Measure
      50, // % Mechanical Post-Consumer Recycled Content
      ...selectedFields.map(() => 30) // Default width for dynamic fields
    ];

    // Table rows with all the data
    const rows = sanitizedData.map(row => [
      row.sku_code || '-',
      row.component_code || '-',
      row.component_description || '-',
      row.component_valid_from ? new Date(row.component_valid_from).toLocaleDateString() : '-',
      row.component_valid_to ? new Date(row.component_valid_to).toLocaleDateString() : '-',
      row.component_quantity || '-',
      row.component_uom_display || row.component_uom_id || '-',
      row.component_base_quantity || '-',
      row.component_base_uom_display || row.component_base_uom_id || '-',
      row.component_packaging_type_display || row.component_packaging_type_id || '-',
      row.component_packaging_material || '-',
      row.component_unit_weight || '-',
      row.weight_unit_measure_display || row.weight_unit_measure_id || '-',
      row.percent_mechanical_pcr_content ? `${row.percent_mechanical_pcr_content}%` : '-',
      ...selectedFields.map(fieldLabel => {
        const fieldName = componentFieldValues[fieldLabel];
        const value = row[fieldName];
        // Format percentage fields
        if (fieldLabel.includes('%') && value && !isNaN(value)) {
          return `${value}%`;
        }
        return value || '-';
      })
    ]);

    // Generate the table in the PDF with proper styling
    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: { 
        fontSize: 7,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [40, 167, 69], // Green color matching the table
        textColor: [255, 255, 255], // White text
        fontStyle: 'bold',
        fontSize: 8
      },
      margin: { top: 20, left: 10, right: 10 },
      startY: 30,
      didDrawPage: function (data) {
        // Add title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Component Data Report', data.settings.margin.left, 20);
        
        // Add subtitle with filter info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const rowInfo = selectedRows.length === 0 ? 'All Data' : `${selectedRows.length} Selected Rows`;
        doc.text(`Period: ${selectedYears[0] || 'All'} | 3PM Code: ${cmCode} | ${rowInfo}`, data.settings.margin.left, 30);
      }
    });

    doc.save('component-details.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again or contact support.');
    }
  };

  // Handle field selection with max 15 limit
  const handleFieldSelection = (newSelectedFields: string[]) => {
    if (newSelectedFields.length > 15) {
      setShowMaxSelectionModal(true);
    } else {
      setSelectedFields(newSelectedFields);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowNoDataModal(false);
  };

  const handleCloseMaxSelectionModal = () => {
    setShowMaxSelectionModal(false);
  };

  // Handle apply filters button click
  const handleApplyFilters = () => {
    if (selectedMaterialType) {
      setIsFilterApplied(true);
      console.log('Applying material type filter:', selectedMaterialType);
      console.log('Current table data length:', tableData.length);
      console.log('Current filtered data length:', filteredData.length);
      
      // Debug: Log sample data to see available fields
      if (tableData.length > 0) {
        console.log('Sample row data:', tableData[0]);
        console.log('Available fields in sample row:', Object.keys(tableData[0]));
        console.log('material_type_id value in sample:', tableData[0].material_type_id);
        
        // Log all material_type_id values in the data
        const materialTypeIds = tableData.map(row => row.material_type_id).filter(id => id !== undefined);
        const uniqueMaterialTypeIds = Array.from(new Set(materialTypeIds));
        console.log('All material_type_id values in data:', uniqueMaterialTypeIds);
        console.log('Selected material type:', selectedMaterialType);
      }
    } else {
      setIsFilterApplied(false);
      console.log('Clearing material type filter');
    }
  };

  // Handle send for sign button click
  const handleSendForSign = () => {
    // Navigate to Send for Approval page without any alerts
    const targetUrl = `/cm/sedforapproval?cmCode=${encodeURIComponent(cmCode)}&cmDescription=${encodeURIComponent(cmDescription)}`;
    console.log('Send for Sign clicked - Navigating to:', targetUrl);
    console.log('cmCode:', cmCode, 'cmDescription:', cmDescription);
    
    try {
      // Force navigation to Send for Approval page
      navigate(targetUrl, { replace: true });
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback: use window.location if navigate fails
      window.location.href = targetUrl;
    }
  };

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
              <i className="ri-file-pdf-2-fill"></i>
            </div>
            <h1>Generate PDF</h1>
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
                  <div className="fBold">Reporting Period</div>
                  <div className="form-control">
                    <select
                      value={selectedYears.length > 0 ? selectedYears[0] : ''}
                      onChange={(e) => {
                        setSelectedYears(e.target.value ? [e.target.value] : []);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: 'none',
                        outline: 'none'
                      }}
                      disabled={years.length === 0}
                    >
                      <option value="">Select Reporting Period</option>
                      {years.length === 0 ? (
                        <option value="" disabled>Loading reporting periods...</option>
                      ) : (
                        years.map((period, index) => (
                          <option key={index} value={period.id}>
                            {period.period}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </li>
                <li>
                  <div className="fBold">Material Type</div>
                  <div className="form-control">
                    <select
                      value={selectedMaterialType}
                      onChange={(e) => setSelectedMaterialType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: 'none',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select Material Type</option>
                      {materialTypes.map((materialType) => (
                        <option key={materialType.id} value={materialType.id.toString()}>
                          {materialType.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
                <li>
                  <div className="fBold">Region</div>
                  <div className="form-control">
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: 'none',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select Region</option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.id.toString()}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
                <li>
                  <div className="fBold">Component UOM</div>
                  <div className="form-control">
                    <select
                      value={selectedComponentUom}
                      onChange={(e) => setSelectedComponentUom(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: 'none',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select Component UOM</option>
                      {componentUoms.map((uom) => (
                        <option key={uom.id} value={uom.id.toString()}>
                          {uom.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
                <li>
                  <div className="fBold">Packaging Material</div>
                  <div className="form-control">
                    <select
                      value={selectedPackagingMaterial}
                      onChange={(e) => setSelectedPackagingMaterial(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: 'none',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select Packaging Material</option>
                      {packagingMaterials.map((material) => (
                        <option key={material.id} value={material.id.toString()}>
                          {material.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
                <li>
                  <div className="fBold">Packaging Level</div>
                  <div className="form-control">
                    <select
                      value={selectedPackagingLevel}
                      onChange={(e) => setSelectedPackagingLevel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: 'none',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select Packaging Level</option>
                      {packagingLevels.map((level) => (
                        <option key={level.id} value={level.id.toString()}>
                          {level.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
                <li>
                  <div className="fBold">Component Base UOM</div>
                  <div className="form-control">
                    <select
                      value={selectedComponentBaseUom}
                      onChange={(e) => setSelectedComponentBaseUom(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: 'none',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select Component Base UOM</option>
                      {componentBaseUoms.map((baseUom) => (
                        <option key={baseUom.id} value={baseUom.id.toString()}>
                          {baseUom.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
                <li>
                  <div className="fBold">Component Fields</div>
                  <div className="form-control">
                    <MultiSelect
                      options={Object.values(componentFieldLabels).map(label => ({ value: label, label: label }))}
                      selectedValues={selectedFields}
                      onSelectionChange={handleFieldSelection}
                      placeholder="Select Component Fields..."
                      disabled={componentFields.length === 0}
                      loading={false}
                    />
                  </div>
                </li>
                <li>
                  <button className="btnCommon btnGreen filterButtons" onClick={handleApplyFilters} disabled={loading}>
                    <span>{isFilterApplied ? 'Filter' : 'Apply Filters'}</span>
                    <i className="ri-search-line"></i>
                  </button>
                </li>
                <li style={{ marginLeft: 'auto' }}>
                  <button
                    style={{ 
                      background: '#30ea03', 
                      color: '#000', 
                      border: '1px solid #30ea03',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      opacity: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '25px'
                    }}
                    onClick={handleSendForSign}
                  >
                    <i className="ri-send-plane-2-line" style={{ fontSize: '14px' }}></i>
                    Send for Sign
                  </button>
                </li>
                <li>
                  <button
                    style={{ 
                      background: '#30ea03', 
                      color: '#000', 
                      border: '1px solid #30ea03',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      opacity: 1,
                      marginTop: '25px'
                    }}
                    onClick={handleGeneratePDF}
                  >
                    Generate PDF
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <i className="ri-loader-4-line spinning" style={{ fontSize: '24px', color: '#666' }}></i>
            <p>Loading component details...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
            <p>Error loading component details: {error}</p>
          </div>
        )}

        {selectedYears.length > 0 && selectedFields.length > 0 && tableData.length > 0 ? (
          <div className="row">
            <div className="col-12">
              <div style={{ 
                border: '1px solid #e9ecef',
                overflow: 'hidden'
              }}>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    margin: 0
                  }}>
                    <thead>
                      <tr style={{ 
                        borderBottom: '1px solid #000'
                      }}>
                        <th style={{ 
                          width: '60px', 
                          textAlign: 'center', 
                          padding: '3px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          background: '#495057',
                          color: 'white',
                          border: '1px solid #000'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={e => handleSelectAll(e.target.checked)}
                              aria-label="Select All"
                              style={{ 
                                transform: 'scale(1.2)',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        </th>
                        <th style={{ 
                          padding: '3px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#495057',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '120px',
                          whiteSpace: 'nowrap'
                        }}>
                          SKU Code
                        </th>
                        <th style={{ 
                          padding: '3px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '140px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Code
                        </th>
                        <th style={{ 
                          padding: '3px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '160px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Description
                        </th>
                        <th style={{ 
                          padding: '3px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '180px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component validity date - From
                        </th>
                        <th style={{ 
                          padding: '3px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '180px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component validity date - To
                        </th>
                        <th style={{ 
                          padding: '3px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '120px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Qty
                        </th>
                        <th style={{ 
                          padding: '3px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '120px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component UoM
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '140px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Base Qty
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '140px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Base UoM
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '160px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Packaging Type
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '160px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Packaging Material
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '150px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Unit Weight
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '150px',
                          whiteSpace: 'nowrap'
                        }}>
                          Weight Unit of Measure
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '220px',
                          whiteSpace: 'nowrap'
                        }}>
                          % Mechanical Post-Consumer Recycled Content (inc. Chemical)
                        </th>
                        {selectedFields.map(fieldLabel => (
                          <th key={fieldLabel} style={{ 
                            padding: '8px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            textAlign: 'left',
                            background: '#28a745',
                            color: 'white',
                            border: '1px solid #000',
                            minWidth: '140px',
                            whiteSpace: 'nowrap'
                          }}>
                            {fieldLabel}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.length === 0 ? (
                        <tr>
                          <td colSpan={selectedFields.length + 15} style={{ 
                            textAlign: 'center', 
                            padding: '40px 20px',
                            color: '#6c757d'
                          }}>
                            <div>No data matches the selected component fields</div>
                          </td>
                        </tr>
                      ) : (
                        filteredData.map((row, index) => (
                          <tr key={row.id || row.component_id || row.componentId || index} 
                              style={{ 
                                borderBottom: '1px solid #f1f3f4',
                                transition: 'all 0.2s ease',
                                background: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                              }}>
                            <td style={{ 
                              textAlign: 'center', 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              border: '1px solid #dee2e6'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedRows.includes(row.id || row.component_id || row.componentId)}
                                  onChange={e => handleRowSelect(row.id || row.component_id || row.componentId, e.target.checked)}
                                  aria-label={`Select row ${row.id || row.component_id || row.componentId}`}
                                  style={{ 
                                    transform: 'scale(1.1)',
                                    cursor: 'pointer'
                                  }}
                                />
                              </div>
                            </td>

                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              fontWeight: '500',
                              color: '#2c3e50',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.sku_code || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_code || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_description || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_valid_from ? new Date(row.component_valid_from).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_valid_to ? new Date(row.component_valid_to).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_quantity || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_uom_display || row.component_uom_id || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_base_quantity || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_base_uom_display || row.component_base_uom_id || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_packaging_type_display || row.component_packaging_type_id || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_packaging_material || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.component_unit_weight || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.weight_unit_measure_display || row.weight_unit_measure_id || '-'}
                            </td>
                            <td style={{ 
                              padding: '4px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d',
                              border: '1px solid #dee2e6'
                            }}>
                              {row.percent_mechanical_pcr_content ? `${row.percent_mechanical_pcr_content}%` : '-'}
                            </td>
                            {selectedFields.map(fieldLabel => {
                              const fieldName = componentFieldValues[fieldLabel];
                              const value = row[fieldName] || '-';
                              return (
                                <td key={fieldLabel} style={{ 
                                  padding: '4px 12px',
                                  verticalAlign: 'middle',
                                  color: '#6c757d',
                                  border: '1px solid #dee2e6'
                                }}>
                                  {value}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        ) : selectedYears.length === 0 && selectedFields.length === 0 ? (
          <div className="row">
            <div className="col-12">
              <div className="text-center py-5">
                <h5 className="text-muted">Select Filters</h5>
                <p className="text-muted">Please select a period and component fields to view data</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="row">
            <div className="col-12">
              <div className="text-center py-5">
                <h5 className="text-muted">No Data Found</h5>
                <p className="text-muted">No component data available for the selected criteria</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No Data Selected Modal */}
      <ConfirmModal
        show={showNoDataModal}
        message="No data is selected. Please select at least one row before generating the PDF."
        onConfirm={handleCloseModal}
        onCancel={handleCloseModal}
      />

      {/* Max Selection Modal */}
      <ConfirmModal
        show={showMaxSelectionModal}
        message="You can select a maximum of 15 component fields. Please unselect some fields before adding new ones."
        onConfirm={handleCloseMaxSelectionModal}
        onCancel={handleCloseMaxSelectionModal}
      />

      {/* Enhanced table styles */}
      <style>{`
        .hover-row:hover {
          background-color: #f8f9fa !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .table th {
          font-weight: 600 !important;
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 0.5px;
          background-color: #f8f9fa !important;
          border-bottom: 2px solid #dee2e6 !important;
          color: #495057 !important;
          padding: 16px 12px !important;
        }
        
        .table td {
          vertical-align: middle !important;
          padding: 16px 12px !important;
          border-bottom: 1px solid #f1f3f4 !important;
          color: #495057 !important;
        }
        
        .table tbody tr {
          transition: all 0.2s ease !important;
        }
        
        .table tbody tr:hover {
          background-color: #f8f9fa !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        }
        
        .badge {
          font-weight: 500 !important;
          font-size: 0.75rem !important;
          padding: 6px 12px !important;
        }
        
        .card {
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        
        .card-header {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
          border-bottom: 2px solid #dee2e6 !important;
        }
        
        .form-check-input {
          border: 2px solid #dee2e6 !important;
          border-radius: 4px !important;
        }
        
        .form-check-input:checked {
          background-color: #28a745 !important;
          border-color: #28a745 !important;
        }
        
        .btn-outline-success {
          border-color: #28a745 !important;
          color: #28a745 !important;
          font-weight: 500 !important;
          padding: 8px 16px !important;
          border-radius: 6px !important;
        }
        
        .btn-outline-success:hover {
          background-color: #28a745 !important;
          color: white !important;
        }
        
        .btn-outline-success:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        }
        
        .card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
        }
        
        .card-header h6 {
          color: white !important;
        }
        
        .table-responsive {
          border-radius: 0 0 12px 12px;
        }
        
        .form-check-input:checked {
          background-color: #30ea03 !important;
          border-color: #30ea03 !important;
        }
        
        .btn-outline-success:hover {
          background-color: #30ea03 !important;
          border-color: #30ea03 !important;
        }
        
        .filter-control, .multi-select-container, .multi-select-trigger {
          min-height: 38px !important;
          height: 38px !important;
        }
        

        .multi-select-container {
          width: 100%;
        }
        .multi-select-trigger {
          width: 100%;
        }
        .filter-group label.fBold {
          margin-bottom: 4px;
        }
        .filters .row.g-3.align-items-end > [class^='col-'] {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        
        @media (max-width: 900px) {
          .mainInternalPages { padding: 16px !important; }
          .table { font-size: 0.9rem !important; }
          .table th, .table td { padding: 8px 6px !important; }
        }
        
        @media (max-width: 600px) {
          .mainInternalPages { padding: 4px !important; }
          h1 { font-size: 1.2rem !important; }
          .mainInternalPages > div, .mainInternalPages > table { width: 100% !important; }
          .mainInternalPages label { font-size: 0.95rem !important; }
          .mainInternalPages select, .mainInternalPages input, .mainInternalPages .multi-select-container { font-size: 0.95rem !important; min-width: 0 !important; }
          .mainInternalPages .multi-select-container { width: 100% !important; }
          .mainInternalPages .multi-select-dropdown { min-width: 180px !important; }
          .mainInternalPages .multi-select-text { font-size: 0.95rem !important; }
          .mainInternalPages .multi-select-search input { font-size: 0.95rem !important; }
          .mainInternalPages .multi-select-options { font-size: 0.95rem !important; }
          .mainInternalPages .multi-select-option { font-size: 0.95rem !important; }
          .mainInternalPages .multi-select-trigger { font-size: 0.95rem !important; }
          .mainInternalPages .multi-select-dropdown { font-size: 0.95rem !important; }
          .mainInternalPages .multi-select-search { font-size: 0.95rem !important; }
          .mainInternalPages .multi-select-option .option-label { font-size: 0.95rem !important; }
          .mainInternalPages .multi-select-option .checkmark { width: 16px !important; height: 16px !important; }
          .mainInternalPages .multi-select-option input[type='checkbox'] { width: 16px !important; height: 16px !important; }
          .mainInternalPages .multi-select-dropdown { left: 0 !important; right: 0 !important; min-width: 0 !important; }
        }
      `}</style>
    </Layout>
  );
};

export default GeneratePdf; 