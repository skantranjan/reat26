import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import ConfirmModal from '../components/ConfirmModal';
import MultiSelect from '../components/MultiSelect';
import EditComponentModal from '../components/EditComponentModal/EditComponentModal';
import { Collapse } from 'react-collapse';
import * as ExcelJS from 'exceljs';
import { apiGet, apiPost, apiPut, apiPatch, apiPostFormData, apiPutFormData } from '../utils/api';

// Add CSS for spinning loader
const spinningStyle = {
  animation: 'spin 1s linear infinite'};

// Add keyframes for spinning animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

/**
 * SKU Data Interface
 * Defines the structure of SKU (Stock Keeping Unit) data received from the API
 * Used for type safety and documentation of expected data structure
 */
interface SkuData {
  id: number;                    // Unique identifier for the SKU
  sku_code: string;              // SKU code (e.g., "SKU123")
  site?: string | null;          // Site information
  sku_description: string;        // Human-readable description of the SKU
  cm_code: string;               // Component Master code this SKU belongs to
  cm_description?: string | null; // Component Master description
  sku_reference?: string | null; // Reference SKU for external SKUs
  is_active: boolean;            // Whether the SKU is currently active
  is_approved?: number | boolean; // Approval status (0/false = not approved, 1/true = approved)
  created_by?: string | null;    // User who created the SKU
  created_date: string;          // Date when SKU was created
  period: string;                // Period/Year for the SKU (e.g., "2024")
  purchased_quantity?: string | number | null;  // Optional purchased quantity
  sku_reference_check?: string | null; // SKU reference check field
  formulation_reference?: string | null; // Optional formulation reference
  dual_source_sku?: string | null; // Dual source SKU information
  skutype?: string | null;       // SKU type: 'internal' or 'external'
  bulk_expert?: string | null;   // Bulk or Expert option
}

/**
 * API Response Interface
 * Defines the structure of API responses for SKU data
 * Used for type safety when handling API responses
 */
interface ApiResponse {
  success: boolean;              // Whether the API call was successful
  count: number;                 // Total number of SKUs returned
  cm_code: string;               // Component Master code
  data: SkuData[];               // Array of SKU data objects
}

/**
 * Master Data Response Interface
 * Defines the structure of the consolidated master data API response
 */
interface MasterDataResponse {
  success: boolean;
  message: string;
  data: {
    periods?: Array<{id: number, period: string, is_active: boolean}>;
    regions?: Array<{id: number, name: string}>;
    material_types?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
    component_uoms?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
    packaging_materials?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
    packaging_levels?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
    component_base_uoms?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
    total_count?: {
      periods: number;
      regions: number;
      material_types: number;
      component_uoms: number;
      packaging_materials: number;
      packaging_levels: number;
      component_base_uoms: number;
    };
  };
}

/**
 * Consolidated Dashboard Response Interface
 * Defines the structure of the new consolidated API response
 * Used for type safety when handling the cm-dashboard endpoint
 */
interface DashboardResponse {
  success: boolean;
  message: string;
  data: {
    skus?: SkuData[];
    descriptions?: Array<{sku_description: string, cm_code: string}>;
    references?: Array<{sku_code: string, sku_description: string}>;
    audit_logs?: Array<{action: string, timestamp: string, details: any}>;
    component_data?: {components_with_evidence: Array<{component_details: any, evidence_files: any[]}>};
    total_components?: number;
    total_skus?: number;
    master_data?: {
      periods?: Array<{id: number, period: string, is_active: boolean}>;
      material_types?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
      component_uoms?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
      packaging_materials?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
      packaging_levels?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
      component_base_uoms?: Array<{id: number, item_name: string, item_order: number, is_active: boolean}>;
    };
  };
}

// Add mock component data for table rows (replace with real API data as needed)
const initialComponentRows = [
  {
    id: 1,
    is_active: true,
    material_type: 'Plastic',
    component_reference: 'CR-001',
    component_code: 'C-1001',
    component_description: 'Bottle Cap',
    valid_from: '2023',
    valid_to: '2024',
    material_group: 'Bg-001',
    qtv: 10,
    uom: 'PCS',
    basic_uom: 'PCS',
    packaging_type: 'Primary',
    weight_type: 'Net',
    unit_measure: 'g',
    post_customer: 20,
    post_industrial: 10,
    text1: 'Text 1',
    text2: 'Text 2',
    text3: 'Text 3',
    text4: 'Text 4',
  },
  // Add more rows as needed
];

type AddComponentData = {
  componentType: string;
  componentCode: string;
  componentDescription: string;
  validityFrom: string;
  validityTo: string;
  componentCategory: string;
  componentQuantity: string;
  componentUnitOfMeasure: string;
  componentBaseQuantity: string;
  componentBaseUnitOfMeasure: string;
  wW: string;
  componentPackagingType: string;
  componentPackagingMaterial: string;
  componentUnitWeight: string;
  componentWeightUnitOfMeasure: string;
  percentPostConsumer: string;
  percentPostIndustrial: string;
  percentChemical: string;
  percentBioSourced: string;
  materialStructure: string;
  packagingColour: string;
  packagingLevel: string;
  componentDimensions: string;
  packagingEvidence: File[];
  period: string;
  version: string;
};

/**
 * InfoIcon Component
 * Displays an information icon with tooltip for user guidance
 * Used throughout the application to provide contextual help
 */
const InfoIcon = ({ info }: { info: string }) => (
  <span style={{ marginLeft: 6, cursor: 'pointer', color: '#888' }} title={info}>
    <i className="ri-information-line" style={{ fontSize: 16, verticalAlign: 'middle' }} />
  </span>
);

/**
 * CmSkuDetail Component
 * Main component for managing SKU (Stock Keeping Unit) details
 * Handles CRUD operations for SKUs and their components
 * Features include: filtering, pagination, modal management, and API integration
 */
const AdminCmSkuDetail: React.FC = () => {
  // Extract parameters from URL and navigation state
  const { cmCode } = useParams();                    // Component Master code from URL
  const location = useLocation();                    // Current location object
  const cmDescription = location.state?.cmDescription || '';  // Component Master description
  const status = location.state?.status || '';       // Status passed from previous page
  const navigate = useNavigate();                    // Navigation function

  // ===== CORE DATA STATE =====
  // State for managing SKU data and loading states
  const [skuData, setSkuData] = useState<SkuData[]>([]);           // Array of all SKU data
  const [loading, setLoading] = useState<boolean>(true);           // Main loading state
  const [error, setError] = useState<string | null>(null);         // Error message state
  const [pageLoadStartTime, setPageLoadStartTime] = useState<number>(Date.now());  // Track page load time
  const [minimumLoaderComplete, setMinimumLoaderComplete] = useState<boolean>(false);  // Minimum loader display time

  // ===== MODAL STATE MANAGEMENT =====
  // State for controlling various modal dialogs
  const [showComponentModal, setShowComponentModal] = useState(false);      // Component details modal
  const [showSkuModal, setShowSkuModal] = useState(false);                 // SKU details modal

  // ===== COPY DATA MODAL STATE =====
  // State for managing data copy functionality via file upload
  const [showCopyDataModal, setShowCopyDataModal] = useState(false);        // Copy data modal visibility
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);      // Selected file for upload
  const [uploadLoading, setUploadLoading] = useState(false);                // Upload progress state
  const [exportLoading, setExportLoading] = useState(false);                // Export to Excel loading state
  const [uploadError, setUploadError] = useState('');                       // Upload error message
  const [uploadSuccess, setUploadSuccess] = useState('');                   // Upload success message
  const [copyFromPeriod, setCopyFromPeriod] = useState<string>('');        // Source period for copy
  const [copyToPeriod, setCopyToPeriod] = useState<string>('');            // Target period for copy

  // ===== UI STATE MANAGEMENT =====
  // State for managing collapsible panels and component data
  const [openIndex, setOpenIndex] = useState<number | null>(0);            // Currently open SKU panel (first panel open by default)
  const [componentRows, setComponentRows] = useState(initialComponentRows); // Component table data (mock data for now)

  // ===== CONFIRMATION MODAL STATE =====
  // State for managing confirmation dialogs for status changes
  const [showConfirm, setShowConfirm] = useState(false);                    // Main confirmation modal visibility
  const [pendingSkuId, setPendingSkuId] = useState<number | null>(null);    // SKU ID waiting for confirmation
  const [pendingSkuStatus, setPendingSkuStatus] = useState<boolean>(false); // New status to be applied
  
  // ===== INACTIVE SKU MODAL STATE =====
  // State for handling inactive SKU interactions
  const [showInactiveModal, setShowInactiveModal] = useState(false);        // Modal for inactive SKU actions
  
  // ===== ERROR MODAL STATE =====
  // State for displaying error messages to users
  const [showErrorModal, setShowErrorModal] = useState(false);              // Error modal visibility
  const [errorMessage, setErrorMessage] = useState('');                     // Error message content
  
  // ===== COMPONENT CONFIRMATION STATE =====
  // State for managing component status change confirmations
  const [showComponentConfirm, setShowComponentConfirm] = useState(false);   // Component confirmation modal
  const [pendingComponentMappingId, setPendingComponentMappingId] = useState<number | null>(null);      // Component mapping ID for status change
  const [pendingComponentStatus, setPendingComponentStatus] = useState<boolean>(false);    // New component status
  const [pendingComponentSkuCode, setPendingComponentSkuCode] = useState<string>('');     // SKU code for component

  // ===== FILTERING AND TAB STATE =====
  // State for managing filters and tab navigation
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('packaging');   // Material type filter (default: packaging)
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');            // Current tab (Active/Inactive SKUs)



  // State for applied filters
  const [appliedFilters, setAppliedFilters] = useState<{ years: string[]; skuDescriptions: string[]; componentCodes: string[] }>({ years: [], skuDescriptions: [], componentCodes: [] });

  // Filtered SKUs based on applied filters
  const filteredSkuData = skuData.filter(sku => {
    // Filter by period (years)
    const yearMatch =
      appliedFilters.years.length === 0 ||
      appliedFilters.years.includes(sku.period);

    // Filter by SKU Description
    const descMatch =
      appliedFilters.skuDescriptions.length === 0 ||
      appliedFilters.skuDescriptions.some(selectedDesc => {
        // Extract sku_description from the selected format "cm_code - sku_description"
        const selectedSkuDesc = selectedDesc.split(' - ')[1] || selectedDesc;
        return selectedSkuDesc === sku.sku_description;
      });

    // Filter by Component Code (check if any component in this SKU matches the selected component codes)
    const componentMatch =
      appliedFilters.componentCodes.length === 0 ||
      (componentDetails[sku.sku_code] && 
       componentDetails[sku.sku_code].some((component: any) => 
         appliedFilters.componentCodes.includes(component.component_code)
       ));

    return yearMatch && descMatch && componentMatch;
  });

  // Search button handler
  const handleSearch = () => {
    setAppliedFilters({ years: selectedYears, skuDescriptions: selectedSkuDescriptions, componentCodes: selectedComponentCodes });
    setOpenIndex(0); // Optionally reset to first panel
  };

  // Reset button handler
  const handleReset = () => {
    // Reset to current period instead of clearing
    const getCurrentPeriod = () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();
      
      // Find the period that contains the current date
      for (const yearOption of years) {
        const periodText = yearOption.period;
        
        // Try to parse period text like "July 2025 to June 2026"
        const periodMatch = periodText.match(/(\w+)\s+(\d{4})\s+to\s+(\w+)\s+(\d{4})/i);
        if (periodMatch) {
          const startMonth = periodMatch[1];
          const startYear = parseInt(periodMatch[2]);
          const endMonth = periodMatch[3];
          const endYear = parseInt(periodMatch[4]);
          
          // Convert month names to numbers
          const monthNames: { [key: string]: number } = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
          };
          
          const startMonthNum = monthNames[startMonth.toLowerCase()];
          const endMonthNum = monthNames[endMonth.toLowerCase()];
          
          if (startMonthNum && endMonthNum) {
            // Check if current date falls within this period
            const currentDate = new Date(currentYear, currentMonth - 1, 1);
            const periodStart = new Date(startYear, startMonthNum - 1, 1);
            const periodEnd = new Date(endYear, endMonthNum, 0); // Last day of end month
            
            if (currentDate >= periodStart && currentDate <= periodEnd) {
              return yearOption;
            }
          }
        }
        
        // Fallback: check if period contains current year
        if (periodText.includes(currentYear.toString())) {
          return yearOption;
        }
      }
      
      // If no specific period found, try to find by current year
      return years.find(year => year.period === currentYear.toString() || year.id === currentYear.toString());
    };
    
    const currentPeriodOption = getCurrentPeriod();
    if (currentPeriodOption) {
      setSelectedYears([currentPeriodOption.id]);
              setAppliedFilters({ years: [currentPeriodOption.id], skuDescriptions: [], componentCodes: [] });
    } else {
      setSelectedYears([]);
              setAppliedFilters({ years: [], skuDescriptions: [], componentCodes: [] });
    }
    setSelectedSkuDescriptions([]);
    setSelectedComponentCodes([]);
    setOpenIndex(0);
  };

  /**
   * fetchDashboardData Function (UNIVERSAL - Single API for all GET operations)
   * Fetches any data from the consolidated API based on parameters
   * This replaces ALL individual GET API calls with a single call
   * 
   * @param includeParams - Array of data types to include
   * @param additionalParams - Additional parameters like period, search, component_id, etc.
   */
  const fetchDashboardData = async (
    includeParams: string[] = ['skus', 'descriptions', 'references', 'audit', 'master-data'],
    additionalParams: Record<string, string> = {}
  ) => {
    if (!cmCode) return;  // Exit if no Component Master code is available
    
    try {
      setLoading(true);           // Show loading state
      setError(null);             // Clear any previous errors
      
      // Build query parameters
      const params = new URLSearchParams({
        include: includeParams.join(',')
      });
      
      // Add additional parameters
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      
      // Add period from selected years if not provided
      if (!additionalParams.period && selectedYears.length > 0) {
        params.append('period', selectedYears[0]);
      }
      
     // console.log('Fetching data from universal API:', `/cm-dashboard/${cmCode}?${params}`);
      const result: DashboardResponse = await apiGet(`/cm-dashboard/${cmCode}?${params}`);
      
      if (result.success && result.data) {
       // console.log('Universal API data received:', result.data);
        
        // Update all states from consolidated response
        if (result.data.skus) {
          setSkuData(result.data.skus);
          //console.log('SKUs loaded from universal API:', result.data.skus.length);
        }
        
        if (result.data.descriptions) {
          const descriptionsWithLabels = result.data.descriptions
            .filter((item: any) => item.sku_description && item.cm_code)
            .map((item: any) => ({
              value: `${item.cm_code} - ${item.sku_description}`,
              label: `${item.cm_code} - ${item.sku_description}`
            }));
          setSkuDescriptions(descriptionsWithLabels);
         // console.log('SKU descriptions loaded from universal API:', descriptionsWithLabels.length);
        }
        
        if (result.data.master_data) {
          // Process periods from consolidated API and sort by year in descending order
          if (result.data.master_data.periods) {
            const processedYears = result.data.master_data.periods
              .filter((period: any) => period && period.id && period.period)
              .map((period: any) => ({
                id: String(period.id),
                period: String(period.period)
              }))
              .sort((a, b) => {
                // Extract year from period string (e.g., "July 2025 to June 2026" -> 2025)
                const extractYear = (periodText: string) => {
                  const yearMatch = periodText.match(/\b(20\d{2})\b/);
                  return yearMatch ? parseInt(yearMatch[1]) : 0;
                };
                
                const yearA = extractYear(a.period);
                const yearB = extractYear(b.period);
                
                // Sort in descending order (latest year first)
                return yearB - yearA;
              });
            
            setYears(processedYears);
           // console.log('Years loaded from universal API:', processedYears.length);
            
            // Automatically select the latest year (first item after sorting)
            if (processedYears.length > 0) {
              const latestPeriod = processedYears[0]; // First item is the latest year
              //console.log('Automatically selecting latest period:', latestPeriod.period);
              
              setSelectedYears([latestPeriod.id]);
              // Apply filter automatically for the latest period
              setAppliedFilters(prev => ({ ...prev, years: [latestPeriod.id] }));
            }
          }
          
          // Set master data for other components
          if (result.data.master_data.material_types) {
            setMaterialTypes(result.data.master_data.material_types);
            //console.log('Material types loaded:', result.data.master_data.material_types.length);
          }
          if (result.data.master_data.component_uoms) {
            setUnitOfMeasureOptions(result.data.master_data.component_uoms);
            //console.log('Component UOMs loaded:', result.data.master_data.component_uoms.length);
          }
          if (result.data.master_data.packaging_levels) {
            setPackagingLevelOptions(result.data.master_data.packaging_levels);
            //console.log('Packaging levels loaded:', result.data.master_data.packaging_levels.length);
          }
          if (result.data.master_data.packaging_materials) {
            setPackagingMaterialOptions(result.data.master_data.packaging_materials);
            //console.log('Packaging materials loaded:', result.data.master_data.packaging_materials.length);
          }
          if (result.data.master_data.component_base_uoms) {
            setComponentBaseUoms(result.data.master_data.component_base_uoms);
           // console.log('Component base UOMs loaded:', result.data.master_data.component_base_uoms.length);
          }
        }
        
       // console.log('All data loaded successfully from universal API');
        return result.data; // Return data for further processing
      } else {
        throw new Error('Universal API returned unsuccessful response');
      }
    } catch (err) {
      // Handle and display errors
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching data from universal API:', err);
      
      // Fallback to individual API calls if universal API fails
      console.log('Falling back to individual API calls...');
      await fetchSkuDetails();
      return null;
    } finally {
      setLoading(false);  // Hide loading state regardless of success/failure
    }
  };



  /**
   * fetchSkuDetails Function (UNIVERSAL API)
   * Fetches SKU data using the universal API
   * Replaces: GET /sku-details/:cmCode
   */
  const fetchSkuDetails = async () => {
    if (!cmCode) return;
    
    try {
      const data = await fetchDashboardData(['skus']);
      if (data && data.skus) {
        setSkuData(data.skus);
       // console.log('SKU details loaded from universal API');
      }
    } catch (err) {
      console.error('Error fetching SKU details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch SKU details');
    }
  };

  /**
   * fetchSkuDescriptions Function (UNIVERSAL API)
   * Fetches SKU descriptions using the universal API
   * Replaces: GET /sku-descriptions
   */
  const fetchSkuDescriptions = async () => {
    if (!cmCode) return;
    
    try {
      const data = await fetchDashboardData(['descriptions']);
      if (data && data.descriptions) {
        const descriptionsWithLabels = data.descriptions
          .filter((item: any) => item.sku_description && item.cm_code)
          .map((item: any) => ({
            value: `${item.cm_code} - ${item.sku_description}`,
            label: `${item.cm_code} - ${item.sku_description}`
          }));
        setSkuDescriptions(descriptionsWithLabels);
       // console.log('SKU descriptions loaded from universal API');
      }
    } catch (err) {
      console.error('Error fetching SKU descriptions:', err);
    }
  };

  /**
   * fetchMasterData Function (UNIVERSAL API)
   * Fetches master data using the universal API
   * Replaces: GET /get-masterdata
   */
  const fetchMasterData = async () => {
    if (!cmCode) return;
    
    try {
      const data = await fetchDashboardData(['master-data']);
      if (data && data.master_data) {
        // Set master data for components
        if (data.master_data.material_types) {
          setMaterialTypes(data.master_data.material_types);
        }
        if (data.master_data.component_uoms) {
          setUnitOfMeasureOptions(data.master_data.component_uoms);
        }
        if (data.master_data.packaging_levels) {
          setPackagingLevelOptions(data.master_data.packaging_levels);
        }
        if (data.master_data.packaging_materials) {
          setPackagingMaterialOptions(data.master_data.packaging_materials);
        }
        if (data.master_data.component_base_uoms) {
          setComponentBaseUoms(data.master_data.component_base_uoms);
        }
        console.log('Master data loaded from universal API');
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  /**
   * fetchComponentAuditLog Function (UNIVERSAL API)
   * Fetches component audit log using the universal API
   * Replaces: GET /component-audit-log/:componentId
   */
  const fetchComponentAuditLog = async (componentId: number) => {
    if (!cmCode) return [];
    
    try {
      const data = await fetchDashboardData(['audit'], { component_id: componentId.toString() });
      if (data && data.audit_logs) {
        console.log('Component audit log loaded from universal API');
        return data.audit_logs;
      }
      return [];
    } catch (err) {
      console.error('Error fetching component audit log:', err);
      return [];
    }
  };

  /**
   * fetchComponentDataByCodeUniversal Function (UNIVERSAL API)
   * Fetches component data by code using the universal API
   * Replaces: GET /get-component-code-data?component_code=:code
   */
  const fetchComponentDataByCodeUniversal = async (componentCode: string) => {
    if (!cmCode) return null;
    
    try {
      const data = await fetchDashboardData(['component_data'], { component_code: componentCode });
      if (data && data.component_data) {
        console.log('Component data loaded from universal API');
        return data.component_data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching component data by code:', err);
      return null;
    }
  };

  /**
   * useEffect: Initial Data Loading
   * Triggers when component mounts or cmCode changes
   * Sets up page load timing and fetches initial SKU data
   */
  useEffect(() => {
    setPageLoadStartTime(Date.now());     // Record page load start time
    setMinimumLoaderComplete(false);      // Reset minimum loader state
    fetchDashboardData();                 // Fetch consolidated dashboard data
    // eslint-disable-next-line
  }, [cmCode]);

  /**
   * useEffect: Minimum Loader Display
   * Ensures loader is shown for at least 0.5 seconds for better UX
   * Prevents flickering when data loads too quickly
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumLoaderComplete(true);     // Allow loader to complete after 0.5 seconds
    }, 500);

    return () => clearTimeout(timer);     // Cleanup timer on unmount
  }, [pageLoadStartTime]);

  // Fetch years from API
  const [years, setYears] = useState<Array<{id: string, period: string}>>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);



  // Helper function to get period text from selected year ID
  const getPeriodTextFromId = (yearId: string) => {
    const yearOption = years.find(year => year.id === yearId);
    return yearOption ? yearOption.period : '';
  };

  // Helper function to get SKU panel background color based on approval status
  const getSkuPanelBackgroundColor = (isApproved: number | boolean | undefined) => {
    // Check if not approved (0, false, undefined) - keep original black for approved (1, true)
    if (isApproved === 0 || isApproved === false) {
      return '#721c24'; // Dark red for not approved SKUs
    } else {
      return '#000'; // Keep original black color for approved SKUs (1, true) and undefined
    }
  };

  // Update addComponentData period when selectedYears changes
  useEffect(() => {
    setAddComponentData(prev => ({
      ...prev,
      period: selectedYears.length > 0 ? getPeriodTextFromId(selectedYears[0]) : ''
    }));
  }, [selectedYears, years]);

  useEffect(() => {
    const fetchYears = async () => {
      try {
      //  console.log('Fetching years from consolidated master data');
        const result: MasterDataResponse = await apiGet('/get-masterdata');
        
        if (result.success && result.data && result.data.periods) {
          // Process periods from consolidated API and sort by year in descending order
          const processedYears = result.data.periods
            .filter((period: any) => period && period.id && period.period)
            .map((period: any) => ({
              id: String(period.id),
              period: String(period.period)
            }))
            .sort((a, b) => {
              // Extract year from period string (e.g., "July 2025 to June 2026" -> 2025)
              const extractYear = (periodText: string) => {
                const yearMatch = periodText.match(/\b(20\d{2})\b/);
                return yearMatch ? parseInt(yearMatch[1]) : 0;
              };
              
              const yearA = extractYear(a.period);
              const yearB = extractYear(b.period);
              
              // Sort in descending order (latest year first)
              return yearB - yearA;
            }) as Array<{id: string, period: string}>;
          
          setYears(processedYears);
          // console.log('Years loaded from consolidated API (sorted by desc):', processedYears.length);
          // console.log('Sorted periods:', processedYears.map(p => p.period));
          
          // Automatically select the latest year (first item after sorting)
          if (processedYears.length > 0) {
            const latestPeriod = processedYears[0]; // First item is the latest year
            //console.log('Automatically selecting latest period:', latestPeriod.period);
            
            setSelectedYears([latestPeriod.id]);
            // Apply filter automatically for the latest period
            setAppliedFilters(prev => ({ ...prev, years: [latestPeriod.id] }));
          }
        } else {
          console.error('No periods data in master data response');
          setYears([]);
        }
      } catch (err) {
        console.error('Error fetching years from consolidated API:', err);
        setYears([]);
      }
    };
    fetchYears();
  }, []);

  // Additional useEffect to handle current period selection when years are loaded
  useEffect(() => {
    if (years.length > 0 && selectedYears.length === 0) {
      // Automatically select the latest year (first item after sorting)
      const latestPeriod = years[0]; // First item is the latest year after sorting
      //console.log('Auto-selecting latest period from useEffect:', latestPeriod.period);
      
      setSelectedYears([latestPeriod.id]);
      // Apply filter automatically for the latest period
      setAppliedFilters(prev => ({ ...prev, years: [latestPeriod.id] }));
    }
  }, [years, selectedYears.length]);

  // Fetch SKU descriptions from API
  const [skuDescriptions, setSkuDescriptions] = useState<Array<{value: string, label: string}>>([]);
  const [selectedSkuDescriptions, setSelectedSkuDescriptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchDescriptions = async () => {
      try {
        // Use Universal API instead of separate /sku-descriptions
        const data = await fetchDashboardData(['descriptions']);
        if (data && data.descriptions) {
          const descriptionsWithLabels = data.descriptions
            .filter((item: any) => item.sku_description && item.cm_code)
            .map((item: any) => ({
              value: `${item.cm_code} - ${item.sku_description}`,
              label: `${item.cm_code} - ${item.sku_description}`
            }));
          setSkuDescriptions(descriptionsWithLabels);
          //console.log('SKU descriptions loaded from Universal API');
        }
      } catch (err) {
        console.error('Error fetching SKU descriptions:', err);
        setSkuDescriptions([]);
      }
    };
    fetchDescriptions();
  }, []);

  // Helper functions to convert IDs to names using master data
  const getMaterialTypeName = (id: string | number) => {
    if (!id) return '-';
    //console.log('getMaterialTypeName called with id:', id, 'materialTypes length:', materialTypes.length, 'materialTypes:', materialTypes);
    const materialType = materialTypes.find(mt => mt.id == id);
    //console.log('Found materialType:', materialType);
    return materialType ? materialType.item_name : id;
  };

  const getUomName = (id: string | number) => {
    if (!id) return '-';
   // console.log('getUomName called with id:', id, 'unitOfMeasureOptions:', unitOfMeasureOptions);
    const uom = unitOfMeasureOptions.find(u => u.id == id);
    //console.log('Found uom:', uom);
    return uom ? uom.item_name : id;
  };

  const getPackagingLevelName = (id: string | number) => {
    if (!id) return '-';
   // console.log('getPackagingLevelName called with id:', id, 'packagingLevelOptions:', packagingLevelOptions);
    const level = packagingLevelOptions.find(pl => pl.id == id);
   // console.log('Found level:', level);
    return level ? level.item_name : id;
  };

  const getPackagingMaterialName = (id: string | number) => {
    if (!id) return '-';
   //// console.log('getPackagingMaterialName called with id:', id, 'packagingMaterialOptions:', packagingMaterialOptions);
    const material = packagingMaterialOptions.find(pm => pm.id == id);
   // console.log('Found material:', material);
    return material ? material.item_name : id;
  };

  const getBaseUomName = (id: string | number) => {
    if (!id) return '-';
    ////console.log('getBaseUomName called with id:', id, 'componentBaseUoms:', componentBaseUoms);
    const uom = componentBaseUoms.find(bu => bu.id == id);
    //console.log('Found uom:', uom);
    return uom ? uom.item_name : id;
  };

  // Ensure master data is loaded when Add SKU modal opens
  useEffect(() => {
    if (showSkuModal && materialTypes.length === 0) {
     // console.log('Add SKU modal opened, loading master data...');
      // Try direct master data API first
      apiGet('/get-masterdata').then(result => {
        if (result.success && result.data) {
        //  console.log('Master data loaded for Add SKU modal:', result.data);
          if (result.data.material_types) {
            setMaterialTypes(result.data.material_types);
          }
          if (result.data.component_uoms) {
            setUnitOfMeasureOptions(result.data.component_uoms);
          }
          if (result.data.packaging_levels) {
            setPackagingLevelOptions(result.data.packaging_levels);
          }
          if (result.data.packaging_materials) {
            setPackagingMaterialOptions(result.data.packaging_materials);
          }
          if (result.data.component_base_uoms) {
            setComponentBaseUoms(result.data.component_base_uoms);
          }
        }
      }).catch(error => {
        console.error('Failed to load master data for Add SKU modal:', error);
      });
    }
  }, [showSkuModal]);



  // Component codes with dummy data
  const [componentCodes, setComponentCodes] = useState<string[]>([
    'COMP001',
    'COMP002', 
    'COMP003',
    'COMP004',
    'COMP005',
    'COMP006',
    'COMP007',
    'COMP008',
    'COMP009',
    'COMP010',
    'RAW001',
    'RAW002',
    'RAW003',
    'PACK001',
    'PACK002',
    'PACK003',
    'MAT001',
    'MAT002',
    'MAT003',
    'MAT004'
  ]);
  const [selectedComponentCodes, setSelectedComponentCodes] = useState<string[]>([]);

  // Add state for material types
  const [materialTypes, setMaterialTypes] = useState<Array<{id: number, item_name: string, item_order: number, is_active: boolean}>>([]);

  // Add state for unitOfMeasureOptions
  const [unitOfMeasureOptions, setUnitOfMeasureOptions] = useState<{id: number, item_name: string, item_order: number, is_active: boolean}[]>([]);

  // Add state for packagingLevelOptions
  const [packagingLevelOptions, setPackagingLevelOptions] = useState<{id: number, item_name: string, item_order: number, is_active: boolean}[]>([]);

  // Add state for packagingMaterialOptions
  const [packagingMaterialOptions, setPackagingMaterialOptions] = useState<{id: number, item_name: string, item_order: number, is_active: boolean}[]>([]);

  // Add state for component base UOMs
  const [componentBaseUoms, setComponentBaseUoms] = useState<{id: number, item_name: string, item_order: number, is_active: boolean}[]>([]);

  // Consolidated master data fetch using Universal API
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        //console.log('Fetching master data from Universal API');
        const data = await fetchDashboardData(['master-data']);
        
        if (data && data.master_data) {
          // Set material types
          if (data.master_data.material_types && Array.isArray(data.master_data.material_types)) {
            setMaterialTypes(data.master_data.material_types);
           // console.log('Material types loaded from Universal API:', data.master_data.material_types.length);
          }
          
          // Set unit of measure options
          if (data.master_data.component_uoms && Array.isArray(data.master_data.component_uoms)) {
            setUnitOfMeasureOptions(data.master_data.component_uoms);
           ////// console.log('Component UOMs loaded from Universal API:', data.master_data.component_uoms.length);
          }
          
          // Set packaging level options
          if (data.master_data.packaging_levels && Array.isArray(data.master_data.packaging_levels)) {
            setPackagingLevelOptions(data.master_data.packaging_levels);
           // console.log('Packaging levels loaded from Universal API:', data.master_data.packaging_levels.length);
          }
          
          // Set packaging material options
          if (data.master_data.packaging_materials && Array.isArray(data.master_data.packaging_materials)) {
            setPackagingMaterialOptions(data.master_data.packaging_materials);
            //console.log('Packaging materials loaded from Universal API:', data.master_data.packaging_materials.length);
          }
          
          // Set component base UOMs
          if (data.master_data.component_base_uoms && Array.isArray(data.master_data.component_base_uoms)) {
            setComponentBaseUoms(data.master_data.component_base_uoms);
            //console.log('Component base UOMs loaded from Universal API:', data.master_data.component_base_uoms.length);
          }
          
          //console.log('All master data loaded successfully from Universal API');
        } else {
          console.error('Universal API returned no master data');
          // Set empty arrays as fallback
          setMaterialTypes([]);
          setUnitOfMeasureOptions([]);
          setPackagingLevelOptions([]);
          setPackagingMaterialOptions([]);
          setComponentBaseUoms([]);
        }
      } catch (error) {
        console.error('Error fetching master data from Universal API:', error);
        // Set empty arrays as fallback
        setMaterialTypes([]);
        setUnitOfMeasureOptions([]);
        setPackagingLevelOptions([]);
        setPackagingMaterialOptions([]);
        setComponentBaseUoms([]);
      }
    };

    fetchMasterData();
  }, []);

  // Direct master data fetch as primary source
  useEffect(() => {
    const fetchDirectMasterData = async () => {
      try {
        console.log('Fetching master data directly from /get-masterdata API');
        const result = await apiGet('/get-masterdata');
        console.log('Direct master data API response:', result);
        if (result.success && result.data) {
          console.log('Direct master data loaded:', result.data);
          if (result.data.material_types) {
            console.log('Setting material types from direct API:', result.data.material_types);
            setMaterialTypes(result.data.material_types);
          }
          if (result.data.component_uoms) {
            setUnitOfMeasureOptions(result.data.component_uoms);
          }
          if (result.data.packaging_levels) {
            setPackagingLevelOptions(result.data.packaging_levels);
          }
          if (result.data.packaging_materials) {
            setPackagingMaterialOptions(result.data.packaging_materials);
          }
          if (result.data.component_base_uoms) {
            setComponentBaseUoms(result.data.component_base_uoms);
          }
        }
      } catch (err) {
        console.error('Error fetching direct master data:', err);
      }
    };
    fetchDirectMasterData();
  }, []);

  // Handler to update is_active status using Universal API
  const handleIsActiveChange = async (skuId: number, currentStatus: boolean) => {
    try {
      // Optimistically update UI
      setSkuData(prev => prev.map(sku => sku.id === skuId ? { ...sku, is_active: !currentStatus } : sku));
      
      // Send PATCH request to Universal API
      const result = await apiPatch('/toggle-status', { 
        type: 'sku', 
        id: skuId, 
        is_active: !currentStatus 
      });
      
      if (!result.success) {
        throw new Error('API returned unsuccessful response for status update');
      }
      
      console.log('✅ SKU status updated successfully via Universal API');
    } catch (err) {
      // If error, revert UI change
      setSkuData(prev => prev.map(sku => sku.id === skuId ? { ...sku, is_active: currentStatus } : sku));
      showError('Failed to update status. Please try again.');
    }
  };

  // Handler for table row/component is_active
  const handleComponentIsActiveChange = (rowId: number, currentStatus: boolean) => {
    setComponentRows(prev => prev.map(row => row.id === rowId ? { ...row, is_active: !currentStatus } : row));
    // Optionally, send PATCH to backend for component/row status here
  };

  // Handler for header button click (show modal)
  const handleHeaderStatusClick = (skuId: number, currentStatus: boolean) => {
    setPendingSkuId(skuId);
    setPendingSkuStatus(currentStatus);
    setShowConfirm(true);
  };

  // Handler for modal confirm
  const handleConfirmStatusChange = async () => {
    if (pendingSkuId !== null) {
      await handleIsActiveChange(pendingSkuId, pendingSkuStatus);
    }
    setShowConfirm(false);
    setPendingSkuId(null);
  };

  // Handler for modal cancel
  const handleCancelStatusChange = () => {
    setShowConfirm(false);
    setPendingSkuId(null);
  };

  // Handler for inactive SKU modal
  const handleInactiveModalClose = () => {
    setShowInactiveModal(false);
  };

  // Handler for error modal
  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  // Function to show error modal
  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  // Handler to show component confirmation modal
  const handleComponentStatusClick = (mappingId: number, currentStatus: boolean, skuCode: string) => {
    console.log('🔍 handleComponentStatusClick called with:', { mappingId, currentStatus, skuCode });
    console.log('🔄 Setting pending status to:', !currentStatus);
    
    setPendingComponentMappingId(mappingId);
    setPendingComponentStatus(!currentStatus);
    setPendingComponentSkuCode(skuCode);
    setShowComponentConfirm(true);
    
    console.log('✅ Component confirmation modal opened');
  };

  // Handler for component confirmation
  const handleComponentConfirmStatusChange = async () => {
    console.log('🔍 handleComponentConfirmStatusChange called with:', {
      pendingComponentMappingId,
      pendingComponentStatus,
      pendingComponentSkuCode
    });
    
    if (pendingComponentMappingId !== null) {
      console.log('✅ Calling handleComponentStatusChange...');
      await handleComponentStatusChange(pendingComponentMappingId, pendingComponentStatus, pendingComponentSkuCode);
    } else {
      console.warn('⚠️ pendingComponentMappingId is null, skipping status change');
    }
    
    setShowComponentConfirm(false);
    setPendingComponentMappingId(null);
    setPendingComponentSkuCode('');
    console.log('✅ Component confirmation modal closed');
  };

  // Handler for component modal cancel
  const handleComponentCancelStatusChange = () => {
    setShowComponentConfirm(false);
    setPendingComponentMappingId(null);
    setPendingComponentSkuCode('');
  };

  // Helper function to get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return 'add-circle-line';
      case 'UPDATE': return 'edit-line';
      case 'STATUS_CHANGE': return 'toggle-line';
      default: return 'file-list-line';
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Helper function to render field changes
  const renderFieldChanges = (log: any) => {
    if (log.action === 'STATUS_CHANGE') {
      return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#dc3545', fontWeight: '500' }}>
            Status: {log.old_value === 'true' ? 'Active' : 'Inactive'}
          </span>
          <i className="ri-arrow-right-line" style={{ margin: '0 8px' }}></i>
          <span style={{ color: '#28a745', fontWeight: '500' }}>
            Status: {log.new_value === 'true' ? 'Active' : 'Inactive'}
          </span>
        </div>
      );
    }
    
    if (log.action === 'CREATE') {
      return <div>Component created with all initial values</div>;
    }
    
    if (log.action === 'UPDATE') {
      return <div>Component details updated</div>;
    }
    
    return <div>Component modified</div>;
  };

  // Pagination helper functions
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Handler for opening component edit modal
  const handleViewComponentHistory = async (component: any) => {
    setSelectedComponentForHistory(component);
    setLoadingHistory(true);
    setShowHistoryModal(true);
    setCurrentPage(1); // Reset to first page when opening modal
    
    try {
      console.log('🔍 Fetching audit logs for component:', component.id);
      
      // Use original API for component audit logs (keeping it simple)
      const result = await apiGet(`/component-audit-log/${component.id}`);
      
      console.log('✅ Audit logs received:', result);
      const auditData = result.data || result.history || [];
      setComponentHistory(auditData);
      setTotalItems(auditData.length);
    } catch (error) {
      console.error('❌ Error fetching component audit logs:', error);
      setComponentHistory([]);
      setTotalItems(0);
    } finally {
      setLoadingHistory(false);
    }
  };






      

  // Add state for Add SKU modal fields and validation
  const [addSkuPeriod, setAddSkuPeriod] = useState('');
  const [addSku, setAddSku] = useState('');
  const [addSkuDescription, setAddSkuDescription] = useState('');
  const [addSkuFormulationReference, setAddSkuFormulationReference] = useState(''); // New field for Formulation Reference
  const [addSkuType, setAddSkuType] = useState('internal'); // Default to internal
  const [showSkuTypeSection, setShowSkuTypeSection] = useState(false); // Control visibility of SKU Type section
  const [addSkuReference, setAddSkuReference] = useState('');
  const [addSkuContractor, setAddSkuContractor] = useState(''); // New field for Contractor
  const [addSkuNameSite, setAddSkuNameSite] = useState(''); // New field for Name Site
  
  // Add state for the new dropdown above reference SKU checkbox
  const [addSkuDropdownValue, setAddSkuDropdownValue] = useState(''); // New dropdown value
  const [showReferenceSkuSection, setShowReferenceSkuSection] = useState(true); // Control visibility of reference SKU section
  
  // Add state for Reference SKU options
  const [referenceSkuOptions, setReferenceSkuOptions] = useState<Array<{value: string, label: string}>>([]);
  const [referenceSkuLoading, setReferenceSkuLoading] = useState(false);
  // const [addSkuQty, setAddSkuQty] = useState(''); // Hidden for now, may be used later
  const [addSkuErrors, setAddSkuErrors] = useState({ sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: '' });
  const [addSkuSuccess, setAddSkuSuccess] = useState('');
  const [addSkuLoading, setAddSkuLoading] = useState(false);

  // ===== CUSTOM TOOLTIP STATE =====
  const [tooltipInfo, setTooltipInfo] = useState<{
    show: boolean;
    text: string;
    x: number;
    y: number;
  }>({
    show: false,
    text: '',
    x: 0,
    y: 0
  });

  // Tooltip handlers
  const showTooltip = (text: string, event: React.MouseEvent) => {
    setTooltipInfo({
      show: true,
      text,
      x: event.clientX,
      y: event.clientY
    });
  };

  const hideTooltip = () => {
    setTooltipInfo(prev => ({ ...prev, show: false }));
  };
  
  // 3PM dropdown options state
  const [threePmOptions, setThreePmOptions] = useState<Array<{cm_code: string, cm_description?: string}>>([]);
  const [threePmLoading, setThreePmLoading] = useState(false);
  
  // Search functionality for external SKU reference
  const [skuSearchResults, setSkuSearchResults] = useState<any[]>([]);
  const [showSkuSearchResults, setShowSkuSearchResults] = useState(false);
  const [skuSearchLoading, setSkuSearchLoading] = useState(false);
  
  // Component table state
  const [selectedSkuComponents, setSelectedSkuComponents] = useState<any[]>([]);
  const [showComponentTable, setShowComponentTable] = useState(false);
  const [selectedComponentIds, setSelectedComponentIds] = useState<number[]>([]);
  const [componentsToSave, setComponentsToSave] = useState<any[]>([]); // Object to store data for API

  /**
   * fetchReferenceSkuOptions Function (CONSOLIDATED)
   * Fetches SKUs for the Reference SKU dropdown using consolidated API
   * Replaces: GET /getskureference/:period/:cm_code API endpoint
   */
  const fetchReferenceSkuOptions = async (period: string = '', cmCode: string) => {
    try {
      setReferenceSkuLoading(true);
      
      // Use consolidated API first - fetch from ALL periods, not just the current one
      const params = new URLSearchParams({
        include: 'references'
        // Removed period filter to get all periods
      });
      
      const result: DashboardResponse = await apiGet(`/cm-dashboard/${cmCode}?${params}`);
      
      if (result.success && result.data && result.data.references) {
        // Format SKU data for dropdown options with period name
        const options = result.data.references.map((sku: any) => {
          console.log('Processing SKU:', sku);
          console.log('SKU period:', sku.period);
          console.log('Years array:', years);
          
          // Try to find the period name from the years array
          let periodName = sku.period;
          
          // If sku.period is a number/ID, try to find the corresponding period name
          if (sku.period && !isNaN(sku.period)) {
            const yearOption = years.find(year => year.id === sku.period.toString());
            if (yearOption) {
              periodName = yearOption.period;
            }
          }
          
          // If we still don't have a period name, use the current period as fallback
          if (!periodName || periodName === 'undefined') {
            const currentPeriod = years.find(year => year.id === period)?.period || period;
            periodName = currentPeriod;
          }
          
          console.log('Final periodName:', periodName);
          
          return {
            value: sku.sku_code,
            label: `${sku.sku_code} (${periodName})`
          };
        });
        
        setReferenceSkuOptions(options);
        console.log('Reference SKU options loaded from consolidated API:', options.length);
      } else {
        throw new Error('No reference SKU options found in consolidated API');
      }
    } catch (error) {
      console.error('Error fetching reference SKU options from consolidated API, falling back to original:', error);
      
      // Fallback to original API - try to fetch from all periods if possible
      let result;
      try {
        // Try to fetch from all periods first
        result = await apiGet(`/getskureference/all/${cmCode}`);
      } catch (fallbackError) {
        // If that fails, fall back to the original period-specific endpoint
        result = await apiGet(`/getskureference/${period}/${cmCode}`);
      }
      
      if (result.success && result.data) {
        // Format SKU data for dropdown options with period name
        const options = result.data.map((sku: any) => {
          console.log('Fallback API - Processing SKU:', sku);
          console.log('Fallback API - SKU period:', sku.period);
          console.log('Fallback API - Years array:', years);
          
          // Try to find the period name from the years array
          let periodName = sku.period;
          
          // If sku.period is a number/ID, try to find the corresponding period name
          if (sku.period && !isNaN(sku.period)) {
            const yearOption = years.find(year => year.id === sku.period.toString());
            if (yearOption) {
              periodName = yearOption.period;
            }
          }
          
          // If we still don't have a period name, use the current period as fallback
          if (!periodName || periodName === 'undefined') {
            const currentPeriod = years.find(year => year.id === period)?.period || period;
            periodName = currentPeriod;
          }
          
          console.log('Fallback API - Final periodName:', periodName);
          
          return {
            value: sku.sku_code,
            label: `${sku.sku_code} (${periodName})`
          };
        });
        
        setReferenceSkuOptions(options);
      } else {
      setReferenceSkuOptions([]);
      }
    } finally {
      setReferenceSkuLoading(false);
    }
  };

  /**
   * fetchThreePmOptions Function (CONSOLIDATED)
   * Fetches unique and active cm_code values using consolidated API
   * Used to populate the 3PM dropdown in the Add SKU modal
   */
  const fetchThreePmOptions = async (currentCmCode?: string) => {
    try {
      setThreePmLoading(true);
      
      // Use consolidated API first
      const params = new URLSearchParams({
        include: 'skus'
      });
      
      const result: DashboardResponse = await apiGet(`/cm-dashboard/${cmCode}?${params}`);
      
      if (result.success && result.data && result.data.skus) {
        console.log('3PM options loaded from consolidated API:', result.data.skus.length);
        
        // Extract unique cm_code values from active SKUs
        const uniqueCmCodes = new Map<string, {cm_code: string, cm_description?: string}>();
        
        result.data.skus.forEach((sku: SkuData) => {
          if (sku.is_active && sku.cm_code) {
            uniqueCmCodes.set(sku.cm_code, {
              cm_code: sku.cm_code,
              cm_description: sku.cm_description || undefined
            });
          }
        });
        
        // If we have a current cm_code, ensure it's included in the options
        if (currentCmCode) {
          uniqueCmCodes.set(currentCmCode, {
            cm_code: currentCmCode,
            cm_description: undefined
          });
        }
        
        // Convert Map to Array and sort by cm_code
        const options = Array.from(uniqueCmCodes.values()).sort((a, b) => a.cm_code.localeCompare(b.cm_code));
        setThreePmOptions(options);
      } else {
        throw new Error('No SKU data found in consolidated API');
      }
    } catch (error) {
      console.error('Error fetching 3PM options from consolidated API, falling back to original:', error);
      
      // Fallback to Universal API
      const data = await fetchDashboardData(['skus']);
      
      if (data && data.skus) {
        // Extract unique cm_code values from active SKUs
        const uniqueCmCodes = new Map<string, {cm_code: string, cm_description?: string}>();
        
        data.skus.forEach((sku: SkuData) => {
          if (sku.is_active && sku.cm_code) {
            uniqueCmCodes.set(sku.cm_code, {
              cm_code: sku.cm_code,
              cm_description: sku.cm_description || undefined
            });
          }
        });
        
        // If we have a current cm_code, ensure it's included in the options
        if (currentCmCode) {
          uniqueCmCodes.set(currentCmCode, {
            cm_code: currentCmCode,
            cm_description: undefined
          });
        }
        
        // Convert Map to Array and sort by cm_code
        const options = Array.from(uniqueCmCodes.values()).sort((a, b) => a.cm_code.localeCompare(b.cm_code));
        setThreePmOptions(options);
        console.log('3PM options loaded from Universal API fallback');
      } else {
        setThreePmOptions([]);
      }
    } finally {
      setThreePmLoading(false);
    }
  };

  /**
   * searchSkuReference Function (NEW API)
   * Searches for external SKU references when user types in the Reference SKU field
   * This function is called when SKU Type is set to 'external'
   * Uses new API: POST /sku-component-mapping
   * 
   * @param searchTerm - The search term entered by the user
   */
  const searchSkuReference = async (searchTerm: string) => {
    // Clear results if search term is empty
    if (!searchTerm.trim()) {
      setSkuSearchResults([]);
      setShowSkuSearchResults(false);
      setShowComponentTable(false);
      return;
    }

    setSkuSearchLoading(true);  // Show loading state
    try {
      // Use new API: POST /sku-component-mapping
      const result = await apiPost('/sku-component-mapping', {
        cm_code: cmCode || '',
        sku_code: searchTerm
      });
      
      if (result.success && result.data && result.data.component_details) {
        console.log('SKU reference search results from new API:', result.data.component_details.length);
        
        // Map the new API response to the existing format
        const mappedResults = result.data.component_details.map((component: any) => {
          // Create a sku_info structure for compatibility
          const skuInfo = {
            sku_code: component.sku_code,
            period: component.periods,
            sku_reference: component.sku_code
          };
          
          return {
            ...skuInfo,
            period_name: getPeriodTextFromId(component.periods) || `Period ${component.periods}`,
            display_text: `${component.sku_code} (${getPeriodTextFromId(component.periods) || `Period ${component.periods}`})`,
            components_count: result.data.component_details.length,
            total_components: result.summary?.component_details_count || 0,
            total_skus: result.summary?.mapping_records_count || 0,
            components: [component], // Wrap component in array for compatibility
            component_sku_codes: [component.sku_code]
          };
        });
        
        setSkuSearchResults(mappedResults);
        setShowSkuSearchResults(true);
      } else {
        // No data found
        setSkuSearchResults([]);
        setShowSkuSearchResults(false);
        setShowComponentTable(false);
        console.log('No SKU reference search results found in new API');
      }
    } catch (error) {
      console.error('Error searching SKU references from new API:', error);
      setSkuSearchResults([]);
      setShowSkuSearchResults(false);
      setShowComponentTable(false);
    } finally {
      setSkuSearchLoading(false);  // Hide loading state
    }
  };

  // NEW FUNCTION: Fetch component details using new API
  const fetchComponentDetailsFromNewAPI = async (cmCode: string, skuCode: string) => {
    try {
      setSkuSearchLoading(true);
      
      const result = await apiPost('/sku-component-mapping', {
        cm_code: cmCode,
        sku_code: skuCode
      });
      
      if (result.success && result.data && result.data.component_details) {
        console.log('Component details loaded from new API:', result.data.component_details.length);
        
        // Map the new API response to existing structure for compatibility
        const mappedComponents = result.data.component_details.map((component: any) => ({
          ...component,
          // Ensure all required fields are present and properly mapped
          component_code: component.component_code,
          component_description: component.component_description,
          formulation_reference: component.formulation_reference,
          material_type_id: component.material_type_id,
          components_reference: component.components_reference,
          component_valid_from: component.component_valid_from,
          component_valid_to: component.component_valid_to,
          component_material_group: component.component_material_group,
          component_quantity: component.component_quantity,
          component_uom_id: component.component_uom_id,
          component_base_quantity: component.component_base_quantity,
          component_base_uom_id: component.component_base_uom_id,
          percent_w_w: component.percent_w_w,
          evidence: component.evidence,
          component_packaging_type_id: component.component_packaging_type_id,
          component_packaging_material: component.component_packaging_material,
          component_unit_weight: component.component_unit_weight,
          weight_unit_measure_id: component.weight_unit_measure_id,
          percent_mechanical_pcr_content: component.percent_mechanical_pcr_content,
          percent_mechanical_pir_content: component.percent_mechanical_pir_content,
          percent_chemical_recycled_content: component.percent_chemical_recycled_content,
          percent_bio_sourced: component.percent_bio_sourced,
          material_structure_multimaterials: component.material_structure_multimaterials,
          component_packaging_color_opacity: component.component_packaging_color_opacity,
          component_packaging_level_id: component.component_packaging_level_id,
          component_dimensions: component.component_dimensions,
          packaging_specification_evidence: component.packaging_specification_evidence,
          evidence_of_recycled_or_bio_source: component.evidence_of_recycled_or_bio_source,
          cm_code: component.cm_code,
          periods: component.periods
        }));
        
        setSelectedSkuComponents(mappedComponents);
        setComponentsToSave(mappedComponents);
        
        // Auto-select all components by default
        const allComponentIds = mappedComponents.map((component: any) => component.id);
        setSelectedComponentIds(allComponentIds);
        
        // Clear any previous errors
        setAddSkuErrors(prev => ({ ...prev, referenceSku: '' }));
        
      } else {
        // No data found
        setSelectedSkuComponents([]);
        setComponentsToSave([]);
        setSelectedComponentIds([]);
        setShowComponentTable(false);
        // Show "No data found" message
        setAddSkuErrors(prev => ({ ...prev, referenceSku: 'No data found' }));
      }
      
    } catch (error) {
      console.error('Error fetching component details from new API:', error);
      setSelectedSkuComponents([]);
      setComponentsToSave([]);
      setSelectedComponentIds([]);
      setShowComponentTable(false);
      setAddSkuErrors(prev => ({ ...prev, referenceSku: 'Error fetching data' }));
    } finally {
      setSkuSearchLoading(false);
    }
  };

  // Handle SKU reference selection
  const handleSkuReferenceSelect = (selectedSku: any) => {
    setAddSkuReference(selectedSku.sku_reference);
    setShowSkuSearchResults(false);
    setSelectedSkuComponents(selectedSku.components || []);
    setComponentsToSave(selectedSku.components || []); // Store data for API
    // Auto-select all components by default
    const allComponentIds = (selectedSku.components || []).map((component: any) => component.id);
    setSelectedComponentIds(allComponentIds);
    setShowComponentTable(true);
  };

  // Validate reference SKU against SKU code
  const validateReferenceSku = (referenceValue: string) => {
    if (showSkuTypeSection && referenceValue.trim() && addSku.trim().toLowerCase() === referenceValue.trim().toLowerCase()) {
      setAddSkuErrors(prev => ({ ...prev, referenceSku: 'Reference SKU can be the same as SKU Code' }));
      return true; // Allow form submission even when they are the same
    } else {
      setAddSkuErrors(prev => ({ ...prev, referenceSku: '' }));
      return true;
    }
  };

  // Handle component deletion
  const handleDeleteComponent = (componentId: number) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      // Remove from display table
      setSelectedSkuComponents(prevComponents => 
        prevComponents.filter(component => component.id !== componentId)
      );
      // Remove from save object
      setComponentsToSave(prevComponents => 
        prevComponents.filter(component => component.id !== componentId)
      );
      // Remove from selected IDs
      setSelectedComponentIds(prevIds => 
        prevIds.filter(id => id !== componentId)
      );
    }
  };

  // Close search results when clicking outside
  const handleClickOutside = (event: any) => {
    if (showSkuSearchResults && !event.target.closest('.sku-search-container')) {
      setShowSkuSearchResults(false);
    }
  };

  // Add click outside listener
  React.useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSkuSearchResults]);

  /**
   * checkSkuExists Function
   * Checks if a SKU code already exists in the system
   * Used for validation before adding new SKUs
   */
  const checkSkuExists = async (skuCode: string): Promise<boolean> => {
    try {
      // Check if SKU exists in current data
      const existingSku = skuData.find(sku => sku.sku_code.toLowerCase() === skuCode.toLowerCase());
      if (existingSku) {
        return true; // SKU already exists
      }
      
      // Additional API check if needed (optional)
      // const result = await apiGet(`/sku-details/check-exists/${encodeURIComponent(skuCode)}`);
      // return result.exists || false;
      
      return false; // SKU doesn't exist
    } catch (error) {
      console.error('Error checking SKU existence:', error);
      return false; // Assume doesn't exist on error
    }
  };

  /**
   * checkSkuDescriptionExists Function
   * Checks if a SKU description already exists for the same CM code and period
   * Used for validation before adding new SKUs to prevent duplicate descriptions
   */
  const checkSkuDescriptionExists = async (skuDescription: string, cmCode: string, period: string): Promise<boolean> => {
    try {
      // Check if SKU description exists in current data for the same CM code and period
      const existingSku = skuData.find(sku => 
        sku.sku_description.toLowerCase() === skuDescription.toLowerCase() &&
        sku.cm_code === cmCode &&
        sku.period === period
      );
      
      if (existingSku) {
        return true; // SKU description already exists for this CM code and period
      }
      
      return false; // SKU description doesn't exist
    } catch (error) {
      console.error('Error checking SKU description existence:', error);
      return false; // Assume doesn't exist on error
    }
  };

  /**
   * handleAddSkuSave Function
   * Handles the creation of new SKUs via POST API call
   * This is the main function for adding new SKUs to the system
   * Includes client-side validation, API call, and success/error handling
   * 
   * API Endpoint: POST /sku-details/add
   * Request Format: 
   * - URL Parameter: skutype (SKU type: internal/external)
   * - Body: JSON with sku_data object and components array
   */
  const handleAddSkuSave = async () => {
    // ===== CLIENT-SIDE VALIDATION =====
    // Validate required fields before making API call
    let errors = { sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: '' };
    if (!addSku.trim()) errors.sku = 'A value is required for SKU code';
    if (!addSkuDescription.trim()) errors.skuDescription = 'A value is required for SKU description';
    if (!addSkuPeriod) errors.period = 'A value is required for the Reporting Period';
    
    // Validate SKU Type selection when reference SKU checkbox is checked
    if (showSkuTypeSection && !addSkuType) {
      errors.skuType = 'Please select either Internal or External SKU type';
    }
    
    // Validate mandatory fields based on SKU type
    if (showSkuTypeSection && addSkuType === 'internal') {
      // For Internal: Reference SKU and Site are mandatory
      if (!addSkuReference.trim()) {
        errors.referenceSku = 'Reference SKU is required for Internal SKU type';
      }
      if (!addSkuNameSite.trim()) {
        errors.site = 'Site is required for Internal SKU type';
      }
    } else if (showSkuTypeSection && addSkuType === 'external') {
      // For External: 3PM and Reference SKU are mandatory
      if (!addSkuContractor.trim()) {
        errors.contractor = '3PM is required for External SKU type';
      }
      if (!addSkuReference.trim()) {
        errors.referenceSku = 'Reference SKU is required for External SKU type';
      }
      // Additional validation: ensure components are loaded
      if (selectedSkuComponents.length === 0) {
        errors.referenceSku = 'No components found for the selected Reference SKU';
      }
    }
    
    // Validate that SKU Code and Reference SKU are not the same
    if (showSkuTypeSection && addSkuReference.trim() && addSku.trim().toLowerCase() === addSkuReference.trim().toLowerCase()) {
      errors.referenceSku = 'Reference SKU can be the same as SKU Code';
      // Don't block form submission, just show the message
    }
    
    setAddSkuErrors(errors);
    setAddSkuSuccess('');
    // Only block submission for actual errors, not informational messages
    if (errors.sku || errors.skuDescription || errors.period || errors.skuType || errors.referenceSku || errors.site || errors.contractor) return;

    // ===== SKU EXISTENCE CHECK =====
    setAddSkuLoading(true);  // Show loading state for existence check
    try {
      // Check for duplicate SKU code
      const skuExists = await checkSkuExists(addSku.trim());
      if (skuExists) {
        setAddSkuErrors({ ...errors, sku: `SKU code '${addSku.trim()}' already exists in the system` });
        setAddSkuLoading(false);
        return;
      }
      
      // Check for duplicate SKU description within same CM code and period
      const descriptionExists = await checkSkuDescriptionExists(addSkuDescription.trim(), cmCode || '', addSkuPeriod);
      if (descriptionExists) {
        setAddSkuErrors({ ...errors, skuDescription: `SKU description '${addSkuDescription.trim()}' already exists for this CM code and period` });
        setAddSkuLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error checking SKU existence:', error);
      // Continue with submission even if check fails
    }

    // ===== API CALL PREPARATION =====
    try {
      console.log('componentsToSave before API call:', componentsToSave);
      console.log('componentsToSave length:', componentsToSave.length);
      console.log('selectedComponentIds:', selectedComponentIds);
      
      // Filter components to only include checked/selected ones
      const filteredComponents = componentsToSave.filter(component => 
        selectedComponentIds.includes(component.id)
      );
      
      console.log('Filtered components (only checked):', filteredComponents);
      console.log('Filtered components length:', filteredComponents.length);
      

      
      // Only send skutype if checkbox is checked (user wants reference SKU)
      const skutypeParam = showSkuTypeSection ? addSkuType : '';
      const skutypeBody = showSkuTypeSection ? addSkuType : null;
      
      const result = await apiPost(`/sku-details/add?skutype=${encodeURIComponent(skutypeParam)}&bulk_expert=${encodeURIComponent(addSkuDropdownValue)}`, {
          sku_data: {
            sku_code: addSku,
            sku_description: addSkuDescription,
            site: addSkuNameSite,
            cm_code: cmCode,
            sku_reference: addSkuReference,
            period: addSkuPeriod,
            formulation_reference: addSkuFormulationReference,
            skutype: skutypeBody,  // Only send if checkbox is checked
            bulk_expert: addSkuDropdownValue,  // Add bulk_expert to sku_data as well
            is_approved: 0  // Add is_approved parameter with value 0
          },
          components: filteredComponents.map(component => ({
            component_code: component.component_code,
            component_description: component.component_description,
            component_quantity: component.component_quantity,
            percent_w_w: component.percent_w_w,
            formulation_reference: component.formulation_reference,
            material_type_id: component.material_type_id,
            components_reference: component.components_reference,
            component_valid_from: component.component_valid_from,
            component_valid_to: component.component_valid_to,
            component_material_group: component.component_material_group,
            component_uom_id: component.component_uom_id,
            component_base_quantity: component.component_base_quantity,
            component_base_uom_id: component.component_base_uom_id,
            evidence: component.evidence,
            component_packaging_type_id: component.component_packaging_type_id,
            component_packaging_material: component.component_packaging_material,
            component_unit_weight: component.component_unit_weight,
            weight_unit_measure_id: component.weight_unit_measure_id,
            percent_mechanical_pcr_content: component.percent_mechanical_pcr_content,
            percent_mechanical_pir_content: component.percent_mechanical_pir_content,
            percent_chemical_recycled_content: component.percent_chemical_recycled_content,
            percent_bio_sourced: component.percent_bio_sourced,
            material_structure_multimaterials: component.material_structure_multimaterials,
            component_packaging_color_opacity: component.component_packaging_color_opacity,
            component_packaging_level_id: component.component_packaging_level_id,
            component_dimensions: component.component_dimensions,
            packaging_specification_evidence: component.packaging_specification_evidence,
            evidence_of_recycled_or_bio_source: component.evidence_of_recycled_or_bio_source,
            cm_code: component.cm_code,
            periods: component.periods
          }))
        });
      
      console.log('Full request body being sent:', {
        sku_data: {
          sku_code: addSku,
          sku_description: addSkuDescription,
          site: addSkuNameSite,
          cm_code: cmCode,
          sku_reference: addSkuReference,
          period: addSkuPeriod,
          formulation_reference: addSkuFormulationReference,
          skutype: skutypeBody,
          bulk_expert: addSkuDropdownValue,
          is_approved: 0
        },
        components: filteredComponents.map(component => ({
          component_code: component.component_code,
          component_description: component.component_description,
          component_quantity: component.component_quantity,
          percent_w_w: component.percent_w_w,
          formulation_reference: component.formulation_reference,
          material_type_id: component.material_type_id,
          components_reference: component.components_reference,
          component_valid_from: component.component_valid_from,
          component_valid_to: component.component_valid_to,
          component_material_group: component.component_material_group,
          component_uom_id: component.component_uom_id,
          component_base_quantity: component.component_base_quantity,
          component_base_uom_id: component.component_base_uom_id,
          evidence: component.evidence,
          component_packaging_type_id: component.component_packaging_type_id,
          component_packaging_material: component.component_packaging_material,
          component_unit_weight: component.component_unit_weight,
          weight_unit_measure_id: component.weight_unit_measure_id,
          percent_mechanical_pcr_content: component.percent_mechanical_pcr_content,
          percent_mechanical_pir_content: component.percent_mechanical_pir_content,
          percent_chemical_recycled_content: component.percent_chemical_recycled_content,
          percent_bio_sourced: component.percent_bio_sourced,
          material_structure_multimaterials: component.material_structure_multimaterials,
          component_packaging_color_opacity: component.component_packaging_color_opacity,
          component_packaging_level_id: component.component_packaging_level_id,
          component_dimensions: component.component_dimensions,
          packaging_specification_evidence: component.packaging_specification_evidence,
          evidence_of_recycled_or_bio_source: component.evidence_of_recycled_or_bio_source,
          cm_code: component.cm_code,
          periods: component.periods
        }))
      });
      
      if (!result.success) {
        // Server-side validation error
        console.error('Add SKU API Error:', result);
        const errorMessage = result.message || result.error || 'Server validation failed';
        
        // Check if it's a SKU already exists error
        if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('sku code')) {
          setAddSkuErrors({ ...errors, sku: errorMessage });
        } else {
          setAddSkuErrors({ ...errors, server: errorMessage });
        }
        
        setAddSkuLoading(false);
        return;
      }
      
      // Success - Handle the new response format
      
      if (result.sku_data && result.component_results) {
        setAddSkuSuccess(`SKU added successfully! SKU ID: ${result.sku_data.id}, Components processed: ${result.components_processed}`);
      } else {
        setAddSkuSuccess('SKU added successfully!');
      }
              setAddSkuErrors({ sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: '' });
      // Call audit log API
      const auditResult = await apiPost('/sku-auditlog/add', {
        sku_code: addSku,
        sku_description: addSkuDescription,
        cm_code: cmCode,
        cm_description: cmDescription,
        is_active: true, // assuming new SKUs are active
        created_by: 'system', // or use actual user if available
        created_date: new Date().toISOString()
      });
      if (!auditResult.success) {
        throw new Error('API returned unsuccessful response for audit log');
      }
      setTimeout(async () => {
        setShowSkuModal(false);
        setAddSku('');
        setAddSkuDescription('');
        setAddSkuFormulationReference(''); // Reset formulation reference
        setAddSkuPeriod('');
        setAddSkuType('internal');
        setAddSkuReference('');
        setAddSkuNameSite(''); // Reset the new field
        setAddSkuDropdownValue(''); // Reset dropdown value
        setShowReferenceSkuSection(true); // Reset reference SKU section visibility
        setSkuSearchResults([]);
        setShowSkuSearchResults(false);
        setSelectedSkuComponents([]);
        setShowComponentTable(false);
        setComponentsToSave([]); // Reset components to save
        // setAddSkuQty(''); // Hidden for now
        setAddSkuSuccess('');
        setLoading(true); // show full-page loader
        await fetchSkuDetails(); // refresh data
        // Refresh component details for all SKUs to ensure consistency using consolidated API
        try {
          const params = new URLSearchParams({
            include: 'skus'
          });
          
          const result: DashboardResponse = await apiGet(`/cm-dashboard/${cmCode}?${params}`);
          if (result.success && result.data && result.data.skus) {
            //console.log('SKU data refreshed from consolidated API after add operation');
            for (const sku of result.data.skus) {
              await fetchComponentDetails(sku.sku_code);
            }
          } else {
            throw new Error('No SKU data found in consolidated API');
          }
        } catch (error) {
          console.error('Error refreshing SKU data from consolidated API, falling back to original:', error);
          // Fallback to original API
        const updatedSkuData = await apiGet('/sku-details');
        if (updatedSkuData.success && updatedSkuData.data) {
          for (const sku of updatedSkuData.data) {
            await fetchComponentDetails(sku.sku_code);
            }
          }
        }
        setLoading(false); // hide loader
      }, 1200);
    } catch (err) {
      setAddSkuErrors({ ...errors, server: 'Network or server error' });
    } finally {
      setAddSkuLoading(false);
    }
  };

  // Edit SKU modal state
  const [showEditSkuModal, setShowEditSkuModal] = useState(false);
  const [editSkuData, setEditSkuData] = useState({
    period: '',
    sku: '',
    skuDescription: '',
    formulationReference: '',
    skuType: 'internal',
    skuReference: '',
    skuNameSite: '',
    qty: '',
    dualSource: '',
  });
  const [editSkuErrors, setEditSkuErrors] = useState({ sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: '' });
  const [editSkuSuccess, setEditSkuSuccess] = useState('');
  const [editSkuLoading, setEditSkuLoading] = useState(false);
  
  // Edit SKU search functionality
  const [editSkuSearchResults, setEditSkuSearchResults] = useState<any[]>([]);
  const [showEditSkuSearchResults, setShowEditSkuSearchResults] = useState(false);
  const [editSkuSearchLoading, setEditSkuSearchLoading] = useState(false);
  const [editSelectedSkuComponents, setEditSelectedSkuComponents] = useState<any[]>([]);

  
  // Edit SKU Reference SKU functionality (similar to Add SKU)
  const [editReferenceSkuOptions, setEditReferenceSkuOptions] = useState<Array<{value: string, label: string}>>([]);
  const [editReferenceSkuLoading, setEditReferenceSkuLoading] = useState(false);
  const [editSkuContractor, setEditSkuContractor] = useState<string>('');
  const [editSkuReference, setEditSkuReference] = useState<string>('');
  const [editShowReferenceSku, setEditShowReferenceSku] = useState<boolean>(false);
  
  // Add state for the new dropdown above reference SKU checkbox in Edit modal
  const [editSkuDropdownValue, setEditSkuDropdownValue] = useState(''); // New dropdown value for Edit modal
  const [editShowReferenceSkuSection, setEditShowReferenceSkuSection] = useState(true); // Control visibility of reference SKU section in Edit modal
  
  // Reference SKU confirmation modal state
  const [showReferenceSkuConfirmModal, setShowReferenceSkuConfirmModal] = useState<boolean>(false);
  
  // Edit modal loading state
  const [editModalLoading, setEditModalLoading] = useState<boolean>(false);

  // Handle Edit Component
  const handleEditComponent = (component: any) => {
    setEditingComponent(component);
    setShowEditComponentModal(true);
  };
  
  // Edit Component modal state
  const [showEditComponentModal, setShowEditComponentModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  
  // Edit Component table state
  const [showEditComponentTable, setShowEditComponentTable] = useState(false);
  const [editSelectedComponentIds, setEditSelectedComponentIds] = useState<(string | number)[]>([]);  



  // Edit SKU Reference SKU options fetch function
  const fetchEditReferenceSkuOptions = async (period: string, cmCode: string) => {
    if (!period || !cmCode) {
      setEditReferenceSkuOptions([]);
      return;
    }

    setEditReferenceSkuLoading(true);
    try {
      const result = await apiGet(`/getskureference/${period}/${cmCode}`);
      
      if (result.success && result.data) {
        const mappedOptions = result.data.map((sku: any) => {
          // Get period name from the years array (same as Add SKU modal)
          const periodName = years.find(year => year.id === sku.period)?.period || sku.period;
          return {
            value: sku.sku_code,
            label: `${sku.sku_code} (${periodName})`
          };
        });
        setEditReferenceSkuOptions(mappedOptions);
      } else {
        setEditReferenceSkuOptions([]);
      }
    } catch (error) {
      console.error('Error fetching edit reference SKU options:', error);
      setEditReferenceSkuOptions([]);
    } finally {
      setEditReferenceSkuLoading(false);
    }
  };

  // Edit SKU search function
  const searchEditSkuReference = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setEditSkuSearchResults([]);
      setShowEditSkuSearchResults(false);
      setShowEditComponentTable(false);
      return;
    }

    setEditSkuSearchLoading(true);
    try {
      // Use sku-component-mapping API for search
      const result = await apiPost('/sku-component-mapping', {
        cm_code: editSkuData.skuType === 'external' ? editSkuContractor : editSkuData.sku,
        sku_code: searchTerm
      });
      
      if (result.success && result.data && result.data.component_details) {
       // console.log('SKU reference search results from sku-component-mapping API:', result.data.component_details.length);
        
        // Map the API response to the expected format
        const mappedResults = result.data.component_details.map((component: any) => {
          // Create a sku_info structure for compatibility
          const skuInfo = {
            sku_code: component.sku_code,
            period: component.periods,
            sku_reference: component.sku_code
          };
          
          return {
            ...skuInfo,
            period_name: getPeriodTextFromId(component.periods) || `Period ${component.periods}`,
            display_text: `${component.sku_code} (${getPeriodTextFromId(component.periods) || `Period ${component.periods}`})`,
            components_count: result.data.component_details.length,
            total_components: result.summary?.component_details_count || 0,
            total_skus: result.summary?.mapping_records_count || 0,
            components: [component], // Wrap component in array for compatibility
            component_sku_codes: [component.sku_code]
          };
        });
        
        setEditSkuSearchResults(mappedResults);
        setShowEditSkuSearchResults(true);
      } else {
        setEditSkuSearchResults([]);
        setShowEditSkuSearchResults(false);
        setShowEditComponentTable(false);
        //console.log('No SKU reference search results found in sku-component-mapping API');
      }
    } catch (error) {
      console.error('Error searching SKU references from sku-component-mapping API:', error);
      setEditSkuSearchResults([]);
      setShowEditSkuSearchResults(false);
      setShowEditComponentTable(false);
    } finally {
      setEditSkuSearchLoading(false);
    }
  };

  // Handle Edit SKU reference selection
  const handleEditSkuReferenceSelect = async (selectedSku: any) => {
    setEditSkuData(prev => ({ ...prev, skuReference: selectedSku.sku_reference }));
    setShowEditSkuSearchResults(false);
    
    // Fetch component data using sku-component-mapping API
    try {
      const result = await apiPost('/sku-component-mapping', {
        cm_code: editSkuData.skuType === 'external' ? editSkuContractor : editSkuData.sku,
        sku_code: selectedSku.sku_reference
      });
      
      if (result.success && result.data && result.data.component_details) {
        console.log('Component details loaded from sku-component-mapping API:', result.data.component_details.length);
        setEditSelectedSkuComponents(result.data.component_details);
        // Auto-select all components by default
        const allComponentIds = result.data.component_details.map((component: any) => component.id);
        setEditSelectedComponentIds(allComponentIds);
        setShowEditComponentTable(true);
      } else {
      //  console.log('No component details found for selected SKU reference');
        setEditSelectedSkuComponents([]);
        setEditSelectedComponentIds([]);
        setShowEditComponentTable(false);
      }
    } catch (error) {
      console.error('Error fetching component details from sku-component-mapping API:', error);
      setEditSelectedSkuComponents([]);
      setShowEditComponentTable(false);
    }
  };

  // Handle Reference SKU confirmation modal
  const handleReferenceSkuConfirm = () => {
    setShowReferenceSkuConfirmModal(false);
    setEditShowReferenceSku(true);
  };

  const handleReferenceSkuCancel = () => {
    setShowReferenceSkuConfirmModal(false);
    // Keep checkbox unchecked
  };

  // Handle Edit component deletion
  const handleEditDeleteComponent = (componentId: number) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      setEditSelectedSkuComponents(prevComponents => 
        prevComponents.filter(component => component.id !== componentId)
      );
      // Also remove from selected component IDs
      setEditSelectedComponentIds(prevIds => 
        prevIds.filter(id => id !== componentId)
      );
    }
  };

  // Handler to open Edit SKU modal (to be called on Edit SKU button click)
  const handleEditSkuOpen = async (sku: SkuData) => {
    setEditModalLoading(true);
    
    setEditSkuData({
      period: sku.period || '', // Use period ID instead of period name
      sku: sku.sku_code || '',
      skuDescription: sku.sku_description || '',
      formulationReference: sku.formulation_reference || '',
      skuType: sku.skutype || 'internal', // Use actual SKU type from data
      skuReference: sku.sku_reference || '',
      skuNameSite: '', // Add if you have this field in SKU data
      qty: sku.purchased_quantity != null ? String(sku.purchased_quantity) : '',
      dualSource: sku.dual_source_sku || '',
    });
    
    // Initialize edit reference SKU state - start with empty values
    setEditSkuContractor('');
    setEditSkuReference('');
    setEditReferenceSkuOptions([]);
    setEditSelectedSkuComponents([]);
    setEditSelectedComponentIds([]);
    setShowEditComponentTable(false);
    
    // Set checkbox state to unchecked by default
    setEditShowReferenceSku(false);
    
    // Reset dropdown variables for Edit SKU modal
    setEditSkuDropdownValue('');
    setEditShowReferenceSkuSection(true);
    
    try {
      // Load master data if not already loaded
      if (materialTypes.length === 0) {
        const result = await apiGet('/get-masterdata');
        if (result.success && result.data && result.data.material_types) {
          setMaterialTypes(result.data.material_types);
          //console.log('Material types loaded for edit modal:', result.data.material_types.length);
        }
      }
      
      // Fetch reference SKU options if it's an external SKU
      if (sku.skutype === 'external' && sku.cm_code && sku.period) {
        await fetchEditReferenceSkuOptions(sku.period, sku.cm_code);
      }
      
      // Fetch 3PM options for the period, including current SKU's cm_code
      if (sku.period) {
        await fetchThreePmOptions(sku.cm_code);
      }
    } catch (error) {
      console.error('Error loading data for edit modal:', error);
    } finally {
      setEditModalLoading(false);
    }
    
    setEditSkuErrors({ sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: '' });
    setEditSkuSuccess('');
    setShowEditSkuModal(true);
  };

  // Edit SKU handler
  const handleEditSkuUpdate = async () => {
    // Client-side validation
    let errors = { sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: '' };
    if (!editSkuData.sku.trim()) errors.sku = 'A value is required for SKU code';
    if (!editSkuData.skuDescription.trim()) errors.skuDescription = 'A value is required for SKU description';
    if (!editSkuData.period) errors.period = 'A value is required for the Reporting Period';
    
    // Validate mandatory fields based on SKU type when reference SKU checkbox is checked
    if (editShowReferenceSku && editSkuData.skuType === 'internal') {
      // For Internal: Reference SKU and Site are mandatory
      if (!editSkuReference.trim()) {
        errors.referenceSku = 'Reference SKU is required for Internal SKU type';
      }
      if (!editSkuData.skuNameSite.trim()) {
        errors.site = 'Site is required for Internal SKU type';
      }
    } else if (editShowReferenceSku && editSkuData.skuType === 'external') {
      // For External: 3PM and Reference SKU are mandatory
      if (!editSkuContractor.trim()) {
        errors.contractor = '3PM is required for External SKU type';
      }
      if (!editSkuReference.trim()) {
        errors.referenceSku = 'Reference SKU is required for External SKU type';
      }
    }
    
    setEditSkuErrors(errors);
    setEditSkuSuccess('');
    if (errors.sku || errors.skuDescription || errors.period || errors.skuType || errors.referenceSku || errors.site || errors.contractor) return;

    // PUT to API
    setEditSkuLoading(true);
    try {
      const updateData: any = {
        sku_description: editSkuData.skuDescription,
        formulation_reference: editSkuData.formulationReference,
        skutype: editSkuData.skuType,
        is_approved: 0  // Add is_approved parameter with value 0
      };

      // Add reference SKU based on type
      if (editSkuData.skuType === 'internal') {
        updateData.sku_reference = editSkuReference;
      } else if (editSkuData.skuType === 'external') {
        updateData.sku_reference = editSkuReference;
      }

      // Add component data if available - only send selected components
      if (editSelectedComponentIds.length > 0) {
        const selectedComponents = editSelectedSkuComponents.filter(component => {
          const uniqueId = component.component_code || `component-${editSelectedSkuComponents.indexOf(component)}`;
          return editSelectedComponentIds.includes(uniqueId);
        });
        updateData.components = selectedComponents;
        //console.log('Sending selected component data:', selectedComponents);
      }

      // Log the complete request body being sent
      console.log('Edit SKU - Full request body being sent:', updateData);

      const result = await apiPut(`/sku-details/update/${encodeURIComponent(editSkuData.sku)}`, updateData);
      if (!result.success) {
        setEditSkuErrors({ sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: result.message || 'Server validation failed' });
        setEditSkuLoading(false);
        return;
      }
      
      // Handle component updates if present in response
      let successMessage = 'SKU updated successfully!';
      if (result.component_updates) {
        successMessage += `\n\nComponent Updates:\n${result.component_updates.message}\nUpdated Components: ${result.component_updates.updated_components}`;
        if (result.component_updates.details) {
          result.component_updates.details.forEach((detail: any) => {
            successMessage += `\n- ${detail.component_code}: ${detail.old_sku_code} → ${detail.new_sku_code}`;
          });
        }
      }
      
      setEditSkuSuccess(successMessage);
      setEditSkuErrors({ sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: '' });
      // Call audit log API
      const auditResult = await apiPost('/sku-auditlog/add', {
        sku_code: editSkuData.sku,
        sku_description: editSkuData.skuDescription,
        cm_code: cmCode,
        cm_description: cmDescription,
        is_active: true, // or use actual value if available
        created_by: 'system', // or use actual user if available
        created_date: new Date().toISOString()
      });
      if (!auditResult.success) {
        throw new Error('API returned unsuccessful response for audit log');
      }
      setTimeout(async () => {
        setShowEditSkuModal(false);
        setEditSkuSuccess('');
        // Reset Edit SKU dropdown variables
        setEditSkuDropdownValue('');
        setEditShowReferenceSkuSection(true);
        setLoading(true); // show full-page loader
        await fetchSkuDetails(); // refresh data
        // Refresh component details for all SKUs to ensure consistency using consolidated API
        try {
          const params = new URLSearchParams({
            include: 'skus'
          });
          
          const result: DashboardResponse = await apiGet(`/cm-dashboard/${cmCode}?${params}`);
          if (result.success && result.data && result.data.skus) {
            console.log('SKU data refreshed from consolidated API after edit operation');
            for (const sku of result.data.skus) {
              await fetchComponentDetails(sku.sku_code);
            }
          } else {
            throw new Error('No SKU data found in consolidated API');
          }
        } catch (error) {
          console.error('Error refreshing SKU data from Universal API:', error);
          // No fallback needed - rely on Universal API only
        }
        setLoading(false); // hide loader
      }, 1200);
    } catch (err: any) {
      console.error('Edit SKU Update Error:', err);
              setEditSkuErrors({ sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: `Network or server error: ${err?.message || 'Unknown error'}` });
    } finally {
      setEditSkuLoading(false);
    }
  };

  // Add Component modal state
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [addComponentData, setAddComponentData] = useState<AddComponentData>({
    componentType: '',
    componentCode: '',
    componentDescription: '',
    validityFrom: '',
    validityTo: '',
    componentCategory: '',
    componentQuantity: '',
    componentUnitOfMeasure: '',
    componentBaseQuantity: '',
    componentBaseUnitOfMeasure: '',
    wW: '',
    componentPackagingType: '',
    componentPackagingMaterial: '',
    componentUnitWeight: '',
    componentWeightUnitOfMeasure: '',
    percentPostConsumer: '',
    percentPostIndustrial: '',
    percentChemical: '',
    percentBioSourced: '',
    materialStructure: '',
    packagingColour: '',
    packagingLevel: '',
    componentDimensions: '',
    packagingEvidence: [],
    period: '',
    version: ''
  });



  // Add state for Add Component modal fields and validation
  const [addComponentErrors, setAddComponentErrors] = useState<Record<string, string>>({});
  const [addComponentSuccess, setAddComponentSuccess] = useState("");

  // Ensure master data is loaded when Add Component modal opens
  useEffect(() => {
    console.log('Add Component modal useEffect triggered:', { 
      showAddComponentModal, 
      materialTypesLength: materialTypes.length,
      yearsLength: years.length,
      selectedYearsLength: selectedYears.length
    });
    
    if (showAddComponentModal) {
      console.log('Add Component modal opened, checking data availability...');
      
      // Check if we need to load master data
      if (materialTypes.length === 0) {
        console.log('Loading master data for Add Component modal...');
        // Try direct master data API first
        apiGet('/get-masterdata').then(result => {
          console.log('Master data API response:', result);
          if (result.success && result.data) {
            console.log('Master data loaded for Add Component modal:', result.data);
            if (result.data.material_types) {
              console.log('Setting material types:', result.data.material_types);
              setMaterialTypes(result.data.material_types);
            }
            if (result.data.component_uoms) {
              setUnitOfMeasureOptions(result.data.component_uoms);
            }
            if (result.data.packaging_levels) {
              setPackagingLevelOptions(result.data.packaging_levels);
            }
            if (result.data.packaging_materials) {
              setPackagingMaterialOptions(result.data.packaging_materials);
            }
            if (result.data.component_base_uoms) {
              setComponentBaseUoms(result.data.component_base_uoms);
            }
          }
        }).catch(error => {
          console.error('Failed to load master data for Add Component modal:', error);
        });
      }
      
      // Check if we need to load years data
      if (years.length === 0) {
        console.log('Loading years data for Add Component modal...');
        // Load years data
        apiGet('/get-masterdata').then(result => {
          if (result.success && result.data && result.data.periods) {
            const processedYears = result.data.periods
              .filter((period: any) => period.is_active)
              .map((period: any) => ({
                id: period.id.toString(),
                period: period.period
              }))
              .sort((a: any, b: any) => {
                const yearA = parseInt(a.period);
                const yearB = parseInt(b.period);
                return yearB - yearA; // Latest year first
              });
            
            setYears(processedYears);
            console.log('Years loaded for Add Component modal:', processedYears);
            
            // Set default selected year if none selected
            if (selectedYears.length === 0 && processedYears.length > 0) {
              setSelectedYears([processedYears[0].id]);
              console.log('Default year selected for Add Component modal:', processedYears[0].id);
            }
          }
        }).catch(error => {
          console.error('Failed to load years data for Add Component modal:', error);
        });
      }
    }
  }, [showAddComponentModal]);
  
  // Add state for collapsible section in Add Component modal
  const [showBasicComponentFields, setShowBasicComponentFields] = useState(false);
  
  // Add state for second collapsible section in Add Component modal
  const [showAdvancedComponentFields, setShowAdvancedComponentFields] = useState(false);
  
  // Add state for third collapsible section in Add Component modal
  const [showRecyclingComponentFields, setShowRecyclingComponentFields] = useState(false);
  
  // Add state for fourth collapsible section in Add Component modal
  const [showFourthCollapsibleFields, setShowFourthCollapsibleFields] = useState(false);
  const [showFifthCollapsibleFields, setShowFifthCollapsibleFields] = useState(false);

  // Add state for category selection and file upload
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, categories: string[], categoryName?: string, files: File[]}>>([]);
  const [categoryError, setCategoryError] = useState<string>('');
  
  // Add state for CH Pack field
  const [chPackValue, setChPackValue] = useState<string>('');
  




  // History Log Modal states
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [selectedComponentForHistory, setSelectedComponentForHistory] = useState<any>(null);
  const [componentHistory, setComponentHistory] = useState<Array<{
    id: number;
    component_id: number;
    sku_code: string;
    formulation_reference: string;
    material_type_id: number;
    components_reference: string;
    component_code: string;
    component_description: string;
    component_valid_from: string;
    component_valid_to: string;
    component_material_group: string;
    component_quantity: number;
    component_uom_id: number;
    component_base_quantity: number;
    component_base_uom_id: number;
    percent_w_w: number;
    evidence: string;
    component_packaging_type_id: number;
    component_packaging_material: string;
    helper_column: string;
    component_unit_weight: number;
    weight_unit_measure_id: number;
    percent_mechanical_pcr_content: number;
    percent_mechanical_pir_content: number;
    percent_chemical_recycled_content: number;
    percent_bio_sourced: number;
    material_structure_multimaterials: string;
    component_packaging_color_opacity: string;
    component_packaging_level_id: number;
    component_dimensions: string;
    packaging_specification_evidence: string;
    evidence_of_recycled_or_bio_source: string;
    last_update_date: string;
    category_entry_id: number;
    data_verification_entry_id: number;
    user_id: number;
    signed_off_by: string;
    signed_off_date: string;
    mandatory_fields_completion_status: string;
    evidence_provided: string;
    document_status: string;
    is_active: boolean;
    created_by: string;
    created_date: string;
    year: string;
    component_unit_weight_id: number;
    cm_code: string;
    periods: string;
    action: string;
    field_name: string;
    old_value: string;
    new_value: string;
    changed_by: string;
    changed_date: string;
    [key: string]: any; // Allow additional fields from the database
  }>>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  
  // Pagination state for audit logs
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Add state for selectedSkuCode
  const [selectedSkuCode, setSelectedSkuCode] = useState<string>('');

  // Add state for component details per SKU
  const [componentDetails, setComponentDetails] = useState<{ [skuCode: string]: any[] }>({});
  const [componentDetailsLoading, setComponentDetailsLoading] = useState<{ [skuCode: string]: boolean }>({});
  
  // Add state for material type selection per SKU
  const [skuMaterialTypes, setSkuMaterialTypes] = useState<{ [skuCode: string]: string }>({});



  // Filter components based on selected material type using material_type_id
  const getFilteredComponents = (skuCode: string) => {
    const components = componentDetails[skuCode] || [];
    
    // Get the material type selection for this specific SKU
    const skuMaterialType = skuMaterialTypes[skuCode] || 'packaging';
    
    // console.log('🔍 Filtering components for SKU:', skuCode);
    // console.log('🔍 Total components:', components.length);
    // console.log('🔍 Selected material type:', skuMaterialType);
    
    let filteredComponents;
    
    if (skuMaterialType === 'packaging') {
      filteredComponents = components.filter(component => {
        const materialTypeId = parseInt(component.material_type_id);
        return materialTypeId === 1;
      });
     // console.log('📦 Packaging components found:', filteredComponents.length);
    } else if (skuMaterialType === 'raw_material') {
      filteredComponents = components.filter(component => {
        const materialTypeId = parseInt(component.material_type_id);
        return materialTypeId === 2;
      });
     // console.log('🏗️ Raw material components found:', filteredComponents.length);
    } else {
      filteredComponents = components;
     // console.log('📋 All components shown:', filteredComponents.length);
    }
    
    return filteredComponents;
  };

  // Function to fetch component details for a SKU using getcomponentbyskureference API
  const fetchComponentDetails = async (skuCode: string) => {
    // console.log('🔍 fetchComponentDetails called with skuCode:', skuCode);
    // console.log('🔍 cmCode:', cmCode, 'addSkuContractor:', addSkuContractor);
    
    setComponentDetailsLoading(prev => ({ ...prev, [skuCode]: true }));
    try {
      // Use the getcomponentbyskureference API with POST request
      const requestBody = {
        cm_code: cmCode || addSkuContractor,
        sku_code: skuCode
      };
      // console.log('🌐 API URL: POST /getcomponentbyskureference');
      // console.log('📤 Request Body:', requestBody);
      
      const data = await apiPost('/getcomponentbyskureference', requestBody);
     // console.log('📡 API Response:', data);
      
      if (data.success && data.data && data.data.length > 0) {
       //onsole.log('✅ Component details loaded from getcomponentbyskureference API:', data.data.length);
        
        // Map the component data to include display names
        const mappedData = data.data.map((component: any) => {
          const mapped = {
            ...component,
            // Map IDs to display names
            material_type_display: getMaterialTypeName(component.material_type_id),
            component_uom_display: getUomName(component.component_uom_id),
            component_base_uom_display: getUomName(component.component_base_uom_id),
            component_packaging_type_display: getPackagingMaterialName(component.component_packaging_type_id),
            component_packaging_level_display: getPackagingLevelName(component.component_packaging_level_id),
            weight_unit_measure_display: getUomName(component.weight_unit_measure_id),
            component_unit_weight_display: getUomName(component.component_unit_weight_id)
          };
          return mapped;
        });
        
        setComponentDetails(prev => ({ ...prev, [skuCode]: mappedData }));
        
        // Set default material type to 'packaging' for this SKU if not already set
        if (!skuMaterialTypes[skuCode]) {
          setSkuMaterialTypes(prev => ({ ...prev, [skuCode]: 'packaging' }));
        }
        
        // Also update selectedSkuComponents for the table display
        setSelectedSkuComponents(mappedData);
        // Update editSelectedSkuComponents for Edit SKU modal
        setEditSelectedSkuComponents(mappedData);
        // Auto-select all components by default
        const allComponentIds = mappedData.map((component: any) => component.id);
        setEditSelectedComponentIds(allComponentIds);
        setShowEditComponentTable(true);
        // Store components for API call
        setComponentsToSave(mappedData);
      } else {
        //console.log('No component details found in getcomponentbyskureference API');
        setComponentDetails(prev => ({ ...prev, [skuCode]: [] }));
        setSelectedSkuComponents([]);
        setEditSelectedSkuComponents([]);
        setEditSelectedComponentIds([]);
        setShowEditComponentTable(false);
        setComponentsToSave([]);
      }
    } catch (err) {
      //console.error('Error fetching component details from getcomponentbyskureference API:', err);
      setComponentDetails(prev => ({ ...prev, [skuCode]: [] }));
      setSelectedSkuComponents([]);
      setEditSelectedSkuComponents([]);
      setShowEditComponentTable(false);
      setComponentsToSave([]);
    } finally {
      setComponentDetailsLoading(prev => ({ ...prev, [skuCode]: false }));
    }
  };

  // Enhanced function to focus on first field with error and scroll to it
  const focusOnFirstError = (errors: Record<string, string>) => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      console.log('Focusing on first error field:', firstErrorField);
      
      // Find the input element with multiple selectors
      let inputElement = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      if (!inputElement) {
        inputElement = document.querySelector(`[data-field="${firstErrorField}"]`) as HTMLElement;
      }
      if (!inputElement) {
        inputElement = document.querySelector(`#${firstErrorField}`) as HTMLElement;
      }
      
      if (inputElement) {
        console.log('Found input element, scrolling and focusing:', inputElement);
        
        // Scroll to the element with better positioning
        inputElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Focus on the element after a short delay to ensure scroll is complete
        setTimeout(() => {
          inputElement.focus();
          
          // For select elements, also open the dropdown
          if (inputElement.tagName === 'SELECT') {
            (inputElement as HTMLSelectElement).click();
          }
          
          // For input elements, select the text if it exists
          if (inputElement.tagName === 'INPUT' && (inputElement as HTMLInputElement).value) {
            (inputElement as HTMLInputElement).select();
          }
        }, 400);
      } else {
        console.log('Could not find input element for field:', firstErrorField);
        // If we can't find the specific field, scroll to the modal body
        const modalBody = document.querySelector('.modal-body') as HTMLElement;
        if (modalBody) {
          modalBody.scrollTop = 0;
        }
      }
    }
  };

  // Add Component handler
  const handleAddComponentSave = async () => {
    // Client-side validation
    const errors: Record<string, string> = {};
    
    // Component Type validation
    if (!addComponentData.componentType || addComponentData.componentType.trim() === '') {
      errors.componentType = 'Please select Component Type';
    }
    
    // Component Code validation
    if (!addComponentData.componentCode || addComponentData.componentCode.trim() === '') {
      errors.componentCode = 'Please enter Component Code';
    }
    
    // Component Description validation
    if (!addComponentData.componentDescription || addComponentData.componentDescription.trim() === '') {
      errors.componentDescription = 'Please enter Component Description';
    }
    
    // Component validity date - From validation
    if (!addComponentData.validityFrom || addComponentData.validityFrom.trim() === '') {
      errors.validityFrom = 'Please select validity start date';
    }
    
    // Component validity date - To validation
    if (!addComponentData.validityTo || addComponentData.validityTo.trim() === '') {
      errors.validityTo = 'Please select validity end date';
    }
    
    // Component Unit of Measure validation
    if (!addComponentData.componentUnitOfMeasure || addComponentData.componentUnitOfMeasure.trim() === '') {
      errors.componentUnitOfMeasure = 'Please select Component Unit of Measure';
    }
    
    // If there are validation errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setAddComponentErrors(errors);
      // Focus on the first error field
      focusOnFirstError(errors);
      return;
    }

    try {
      // Debug: Check data availability before form submission
      console.log('🚀 === FORM SUBMISSION START ===');
      console.log('🚀 years array:', years);
      console.log('🚀 years.length:', years.length);
      console.log('🚀 selectedYears:', selectedYears);
      console.log('🚀 selectedYears.length:', selectedYears.length);
      console.log('🚀 cmCode:', cmCode);
      console.log('🚀 selectedSkuCode:', selectedSkuCode);
      
      // This sends multipart/form-data
      const formData = new FormData();

      // ===== REQUIRED FIELDS =====
      // Ensure all values are strings to avoid circular references
      console.log('🔍 === FIELD TYPE CHECKING ===');
      console.log('🔍 cmCode type:', typeof cmCode, 'value:', cmCode);
      console.log('🔍 selectedSkuCode type:', typeof selectedSkuCode, 'value:', selectedSkuCode);
      console.log('🔍 addComponentData.componentCode type:', typeof addComponentData.componentCode, 'value:', addComponentData.componentCode);
      
      // Convert to strings and check for circular references
      const cmCodeString = String(cmCode || '');
      const skuCodeString = String(selectedSkuCode || '');
      const componentCodeString = String(addComponentData.componentCode || '');
      
      console.log('🔍 After String() conversion:');
      console.log('🔍 cmCodeString:', cmCodeString);
      console.log('🔍 skuCodeString:', skuCodeString);
      console.log('🔍 componentCodeString:', componentCodeString);
      
      formData.append('cm_code', cmCodeString);
      formData.append('sku_code', skuCodeString);
      formData.append('component_code', componentCodeString);
      formData.append('version', String(addComponentData.version || '1')); // Dynamic version from form
      // Use current page period or first available period
      let currentPeriod = selectedYears.length > 0 ? selectedYears[0] : years.length > 0 ? years[0].id : '';
      
      console.log('🔍 === PERIOD CALCULATION START ===');
      console.log('🔍 selectedYears:', selectedYears);
      console.log('🔍 years:', years);
      console.log('🔍 Initial currentPeriod:', currentPeriod);
      
      // TEMPORARY HARDCODED FALLBACK FOR TESTING
      if (!currentPeriod) {
        console.log('🔍 Using hardcoded fallback period for testing');
        currentPeriod = '3'; // Use period ID 3 as fallback
        console.log('🔍 currentPeriod after fallback:', currentPeriod);
      }
      
      console.log('🔍 === PERIOD CALCULATION END ===');
      console.log('🔍 Final currentPeriod:', currentPeriod);
      
      // Debug: Check years array and currentPeriod calculation
      console.log('🔍 years array:', years);
      console.log('🔍 years.length:', years.length);
      console.log('🔍 years[0]:', years[0]);
      console.log('🔍 currentPeriod calculated:', currentPeriod);
      
      // Ensure we have a valid period
      if (!currentPeriod) {
        console.error('❌ No valid period found! selectedYears:', selectedYears, 'years:', years);
        
        // Try to get period from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const urlPeriod = urlParams.get('period');
        
        if (urlPeriod) {
          console.log('🔍 Using period from URL:', urlPeriod);
          formData.append('period_id', String(urlPeriod));
          formData.append('year', String(urlPeriod));
        } else {
          // Last resort: try to fetch periods from API and use the first one
          console.log('🔍 Attempting to fetch periods from API as last resort...');
          try {
            const result = await apiGet('/get-masterdata');
            if (result.success && result.data && result.data.periods && result.data.periods.length > 0) {
              const firstPeriod = result.data.periods[0];
              console.log('🔍 Using first period from API:', firstPeriod.id);
              formData.append('period_id', String(firstPeriod.id));
              formData.append('year', String(firstPeriod.id));
            } else {
              console.error('❌ No periods available from API either!');
              // Set empty strings as final fallback (will cause API error but prevents crash)
              formData.append('period_id', '');
              formData.append('year', '');
            }
          } catch (error) {
            console.error('❌ Failed to fetch periods from API:', error);
            // Set empty strings as final fallback
            formData.append('period_id', '');
            formData.append('year', '');
          }
        }
      } else {
        console.log('✅ Using calculated period:', currentPeriod);
        formData.append('period_id', String(currentPeriod));
        formData.append('year', String(currentPeriod));
      }
      
      // Final validation: ensure period fields are set
      const finalPeriodId = formData.get('period_id');
      const finalYear = formData.get('year');
      console.log('🔍 Final validation - period_id:', finalPeriodId, 'year:', finalYear);
      
      if (!finalPeriodId || !finalYear) {
        console.error('❌ CRITICAL: Period fields still not set after all attempts!');
        console.error('❌ FormData contents:');
        formData.forEach((value, key) => {
          console.log(`  ${key}:`, value);
        });
        throw new Error('Failed to set required period fields');
      }
      
      console.log('✅ Period fields successfully set in FormData');
      console.log('✅ period_id:', finalPeriodId);
      console.log('✅ year:', finalYear);
      
      // Debug logging for year and periods
      
      // ===== COMPONENT FIELDS =====
      formData.append('component_description', String(addComponentData.componentDescription || ''));
      formData.append('formulation_reference', '');
      formData.append('material_type_id', String(addComponentData.componentType || ''));
      formData.append('components_reference', '');
      formData.append('component_valid_from', String(addComponentData.validityFrom || ''));
      formData.append('component_valid_to', String(addComponentData.validityTo || ''));
      formData.append('component_material_group', String(addComponentData.componentCategory || ''));
      formData.append('component_quantity', String(addComponentData.componentQuantity || ''));
      formData.append('component_uom_id', String(addComponentData.componentUnitOfMeasure || ''));
      formData.append('component_base_quantity', String(addComponentData.componentBaseQuantity || ''));
      formData.append('component_base_uom_id', String(addComponentData.componentBaseUnitOfMeasure || ''));
      formData.append('percent_w_w', String(addComponentData.wW || ''));
      formData.append('evidence', '');
      formData.append('component_packaging_type_id', String(addComponentData.componentPackagingType || ''));
      formData.append('component_packaging_material', String(addComponentData.componentPackagingMaterial || ''));
      formData.append('helper_column', '');
      formData.append('component_unit_weight', String(addComponentData.componentUnitWeight || ''));
      formData.append('weight_unit_measure_id', String(addComponentData.componentWeightUnitOfMeasure || ''));
      formData.append('percent_mechanical_pcr_content', String(addComponentData.percentPostConsumer || ''));
      formData.append('percent_mechanical_pir_content', String(addComponentData.percentPostIndustrial || ''));
      formData.append('percent_chemical_recycled_content', String(addComponentData.percentChemical || ''));
      formData.append('percent_bio_sourced', String(addComponentData.percentBioSourced || ''));
      formData.append('material_structure_multimaterials', String(addComponentData.materialStructure || ''));
      // These fields will be set in the conditional section below to avoid duplicates
      // component_packaging_color_opacity
      // component_packaging_level_id  
      // component_dimensions
      
      // ===== SYSTEM FIELDS =====
      formData.append('packaging_specification_evidence', '');
      // evidence_of_recycled_or_bio_source will be set with files below
      formData.append('category_entry_id', '');
      formData.append('data_verification_entry_id', '');
      formData.append('user_id', '1');
      formData.append('signed_off_by', '');
      formData.append('signed_off_date', '');
      formData.append('mandatory_fields_completion_status', '');
      formData.append('evidence_provided', '');
      formData.append('document_status', '');
      formData.append('is_active', 'true');
      formData.append('created_by', '1');
      formData.append('created_date', new Date().toISOString()); // Current timestamp
      formData.append('component_unit_weight_id', '');
      
      // File uploads are now enabled for evidence files
      // We're sending component data + evidence files

      // Debug: Log critical form data values
      console.log('🔍 Form Data Debug - Critical Fields:');
      console.log('componentType:', addComponentData.componentType);
      console.log('validityFrom:', addComponentData.validityFrom);
      console.log('validityTo:', addComponentData.validityTo);
      console.log('componentUnitOfMeasure:', addComponentData.componentUnitOfMeasure);
      console.log('componentCode:', addComponentData.componentCode);
      console.log('componentDescription:', addComponentData.componentDescription);
      
      // Additional debugging to check for circular references
      console.log('🔍 Checking for circular references:');
      console.log('cmCode type:', typeof cmCode, 'value:', cmCode);
      console.log('selectedSkuCode type:', typeof selectedSkuCode, 'value:', selectedSkuCode);
      console.log('addComponentData type:', typeof addComponentData);
      
      // Debug: Check selectedYears state
      console.log('🔍 selectedYears state:', selectedYears);
      console.log('🔍 selectedYears.length:', selectedYears.length);
      console.log('🔍 years available:', years.map(y => ({ id: y.id, period: y.period })));
      console.log('🔍 currentPeriod calculated:', currentPeriod);
      console.log('🔍 period_id value:', String(currentPeriod));
      console.log('🔍 year value:', String(currentPeriod));

      // Debug: Log FormData contents before sending
      console.log('📋 FormData contents before API call:');
      console.log('🔍 === CHECKING FOR OBJECTS IN FORMDATA ===');
      formData.forEach((value, key) => {
        const valueType = typeof value;
        if (valueType === 'object' && value !== null) {
          console.error(`❌ OBJECT DETECTED: ${key} is type ${valueType}:`, value);
          console.error(`❌ This will cause circular reference error!`);
        } else {
          console.log(`  ${key}:`, value, `(type: ${valueType})`);
        }
      });
      // Set conditional fields only if they have values (avoiding duplicates)
      if (addComponentData.packagingColour) {
        formData.append('component_packaging_color_opacity', String(addComponentData.packagingColour));
        console.log('🔍 Added packagingColour:', addComponentData.packagingColour);
      }
      if (addComponentData.packagingLevel) {
        formData.append('component_packaging_level_id', String(addComponentData.packagingLevel));
        console.log('🔍 Added packagingLevel:', addComponentData.packagingLevel);
      }
      if (addComponentData.componentDimensions) {
        formData.append('component_dimensions', String(addComponentData.componentDimensions));
        console.log('🔍 Added componentDimensions:', addComponentData.componentDimensions);
      }

      // ===== FILE UPLOADS =====
      console.log('🔍 === FILE UPLOAD PROCESSING START ===');
      
      // 1. CHEMICAL EVIDENCE FILES (Already Working)
      const chemicalEvidenceFiles: File[] = [];
      if (addComponentData.packagingEvidence && addComponentData.packagingEvidence.length > 0) {
        chemicalEvidenceFiles.push(...addComponentData.packagingEvidence);
        console.log(`🔍 Chemical evidence files collected: ${chemicalEvidenceFiles.length} files`);
      }
      
      // 2. CATEGORY-BASED EVIDENCE FILES (New Implementation)
      const categoryFiles = {
        weight: [] as File[],
        weight_uom: [] as File[],
        packaging_type: [] as File[],
        material_type: [] as File[]
      };
      
      // Process uploaded files by category
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log('🔍 Processing uploaded files by category...');
        
        uploadedFiles.forEach((upload, index) => {
          console.log(`🔍 Processing upload ${index + 1}:`, upload);
          
          if (upload.categories && upload.categories.length > 0 && upload.files && upload.files.length > 0) {
            upload.categories.forEach(category => {
              switch (category) {
                case '1': // Weight category
                  categoryFiles.weight.push(...upload.files);
                  console.log(`🔍 Added ${upload.files.length} files to Weight category`);
                  break;
                case '2': // Weight UoM category
                  categoryFiles.weight_uom.push(...upload.files);
                  console.log(`🔍 Added ${upload.files.length} files to Weight UoM category`);
                  break;
                case '3': // Packaging Type category
                  categoryFiles.packaging_type.push(...upload.files);
                  console.log(`🔍 Added ${upload.files.length} files to Packaging Type category`);
                  break;
                case '4': // Material Type category
                  categoryFiles.material_type.push(...upload.files);
                  console.log(`🔍 Added ${upload.files.length} files to Material Type category`);
                  break;
                default:
                  console.log(`🔍 Unknown category: ${category}`);
              }
            });
          }
        });
      }
      
      // 3. ADD CHEMICAL EVIDENCE FILES TO FORMDATA
      if (chemicalEvidenceFiles.length > 0) {
        chemicalEvidenceFiles.forEach((file, index) => {
          formData.append('evidence_of_recycled_or_bio_source', file);
          console.log(`🔍 Added chemical evidence file ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        });
        console.log(`🔍 Total chemical evidence files sent to API: ${chemicalEvidenceFiles.length}`);
      }
      
      // 4. ADD CATEGORY-BASED FILES TO FORMDATA
      let totalCategoryFiles = 0;
      
      // Weight Evidence Files
      if (categoryFiles.weight.length > 0) {
        categoryFiles.weight.forEach((file, index) => {
          formData.append('weight_evidence_files', file);
          console.log(`🔍 Added weight evidence file ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        });
        totalCategoryFiles += categoryFiles.weight.length;
        console.log(`🔍 Weight evidence files: ${categoryFiles.weight.length} files`);
      }
      
      // Weight UoM Evidence Files
      if (categoryFiles.weight_uom.length > 0) {
        categoryFiles.weight_uom.forEach((file, index) => {
          formData.append('weight_uom_evidence_files', file);
          console.log(`🔍 Added weight UoM evidence file ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        });
        totalCategoryFiles += categoryFiles.weight_uom.length;
        console.log(`🔍 Weight UoM evidence files: ${categoryFiles.weight_uom.length} files`);
      }
      
      // Packaging Type Evidence Files
      if (categoryFiles.packaging_type.length > 0) {
        categoryFiles.packaging_type.forEach((file, index) => {
          formData.append('packaging_type_evidence_files', file);
          console.log(`🔍 Added packaging type evidence file ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        });
        totalCategoryFiles += categoryFiles.packaging_type.length;
        console.log(`🔍 Packaging type evidence files: ${categoryFiles.packaging_type.length} files`);
      }
      
      // Material Type Evidence Files
      if (categoryFiles.material_type.length > 0) {
        categoryFiles.material_type.forEach((file, index) => {
          formData.append('material_type_evidence_files', file);
          console.log(`🔍 Added material type evidence file ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        });
        totalCategoryFiles += categoryFiles.material_type.length;
        console.log(`🔍 Material type evidence files: ${categoryFiles.material_type.length} files`);
      }
      
      console.log(`🔍 === FILE UPLOAD SUMMARY ===`);
      console.log(`🔍 Chemical evidence files: ${chemicalEvidenceFiles.length}`);
      console.log(`🔍 Category-based files: ${totalCategoryFiles}`);
      console.log(`🔍 Total files being sent: ${chemicalEvidenceFiles.length + totalCategoryFiles}`);
      
      if (totalCategoryFiles === 0) {
        console.log('🔍 No category-based files to upload');
      }
      
      // TODO: KPI category file uploads will be added back in the next step
      // For now, we're only sending the component data and evidence files

            // Debug: Log FormData contents
      // console.log('FormData contents:');
      formData.forEach((value, key) => {
        //console.log(key, value);
      });

      // Make the API call
      const response = await apiPostFormData('/add-component', formData);
      
      const result = await response.json();
      console.log('🔍 API Response Status:', response.status);
      console.log('🔍 API Response Result:', result);
      console.log('🔍 Response OK:', response.ok);
      console.log('🔍 Result Success:', result.success);
      
      // Enhanced error handling with field-specific errors
      if (!result.success) {
        console.log('❌ API Validation Error:', result);
        
        let errors: Record<string, string> = {};
        
        // Handle field-specific validation errors from API
        if (result.errors && Array.isArray(result.errors)) {
          console.log('🔍 Processing API validation errors:', result.errors);
          result.errors.forEach((error: any) => {
            // Map API field names to form field names
            let fieldName = error.field;
            switch (error.field) {
              case 'material_type_id':
                fieldName = 'componentType';
                break;
              case 'component_code':
                fieldName = 'componentCode';
                break;
              case 'component_description':
                fieldName = 'componentDescription';
                break;
              case 'component_valid_from':
                fieldName = 'validityFrom';
                break;
              case 'component_valid_to':
                fieldName = 'validityTo';
                break;
              case 'component_uom_id':
                fieldName = 'componentUnitOfMeasure';
                break;
              default:
                fieldName = error.field;
            }
            
            // Use the API message directly - no hardcoded formatting
            let errorMessage = error.message;
            
            console.log(`📝 Mapping error: ${error.field} → ${fieldName}: ${errorMessage}`);
            errors[fieldName] = errorMessage;
          });
        }
        
        // If no field-specific errors, show general server error
        if (Object.keys(errors).length === 0) {
          errors.server = result.message || 'API request failed';
        }
        
        console.log('🔍 Setting errors in state:', errors);
        setAddComponentErrors(errors);
        
        // Focus on the first error field
        if (Object.keys(errors).length > 0) {
          console.log('🔍 Focusing on first error field');
          focusOnFirstError(errors);
        }
        
        return;
      }
      
              // Log audit trail for component creation
        try {
          const auditData = {
            component_id: result.component_id || result.data?.id, // ✅ Primary key from API response
            sku_code: selectedSkuCode,
            component_code: addComponentData.componentCode || '',
            component_description: addComponentData.componentDescription || '',
            year: selectedYears.length > 0 ? getPeriodTextFromId(selectedYears[0]) : '',
            cm_code: cmCode || '',
            periods: selectedYears.length > 0 ? selectedYears[0] : '',
            material_type_id: Number(addComponentData.componentType) || 0,
            component_quantity: Number(addComponentData.componentQuantity) || 0,
            component_uom_id: Number(addComponentData.componentUnitOfMeasure) || 0,
            component_packaging_material: addComponentData.componentPackagingMaterial || '',
            component_unit_weight: Number(addComponentData.componentUnitWeight) || 0,
            weight_unit_measure_id: Number(addComponentData.componentWeightUnitOfMeasure) || 0,
            percent_mechanical_pcr_content: Number(addComponentData.percentPostConsumer) || 0,
            percent_bio_sourced: Number(addComponentData.percentBioSourced) || 0,
            user_id: 1,
            created_by: 1,
            is_active: true
          };
        
        await apiPost('/add-component-audit-log', auditData);
       // console.log('Audit log created for component creation');
      } catch (auditError) {
        console.error('Failed to log audit trail:', auditError);
      }
      
      setAddComponentSuccess('Component added successfully!');
      setAddComponentErrors({});
      
      setTimeout(async () => {
        setShowAddComponentModal(false);
        setAddComponentData({
          componentType: '',
          componentCode: '',
          componentDescription: '',
          validityFrom: '',
          validityTo: '',
          componentCategory: '',
          componentQuantity: '',
          componentUnitOfMeasure: '',
          componentBaseQuantity: '',
          componentBaseUnitOfMeasure: '',
          wW: '',
          componentPackagingType: '',
          componentPackagingMaterial: '',
          componentUnitWeight: '',
          componentWeightUnitOfMeasure: '',
          percentPostConsumer: '',
          percentPostIndustrial: '',
          percentChemical: '',
          percentBioSourced: '',
          materialStructure: '',
          packagingColour: '',
          packagingLevel: '',
          componentDimensions: '',
          packagingEvidence: [],
          period: selectedYears.length > 0 ? getPeriodTextFromId(selectedYears[0]) : '',
          version: ''
        });
        setUploadedFiles([]);
        setSelectedCategories([]);
        setSelectedFiles([]);
        setAddComponentSuccess('');
        setShowBasicComponentFields(false); // Reset collapsible section to collapsed
        setShowAdvancedComponentFields(false); // Reset second collapsible section to collapsed
        setShowRecyclingComponentFields(false); // Reset third collapsible section to collapsed
        setShowFourthCollapsibleFields(false); // Reset fourth collapsible section to collapsed
        setShowFifthCollapsibleFields(false); // Reset fifth collapsible section to collapsed
        setLoading(true);
        await fetchSkuDetails();
        // Refresh component details for the specific SKU that was just updated
        if (selectedSkuCode) {
          await fetchComponentDetails(selectedSkuCode);
        }
        setLoading(false);
      }, 1200);
      
    } catch (err) {
      console.error('Error:', err);
      const networkError = { server: 'Network or server error. Please try again.' };
      setAddComponentErrors(networkError);
      
      // Focus on the error message area
      setTimeout(() => {
        const errorElement = document.querySelector('[data-field="server"]') as HTMLElement;
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Export to Excel handler
  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      console.log('🔄 Starting Excel export...');
      
      // Prepare API request payload with optional filters
      const requestPayload: any = {
        cm_code: cmCode
      };
      
      // Add reporting period filter if selected (optional)
      if (selectedYears.length > 0) {
        requestPayload.reporting_period = selectedYears[0];
        console.log('📅 Adding period filter:', selectedYears[0]);
      }
      
      // Add SKU code filter if selected (optional)
      if (selectedSkuDescriptions.length > 0) {
        // Extract SKU code from the selected format "cm_code - sku_description"
        const selectedSkuDesc = selectedSkuDescriptions[0];
        const skuCode = selectedSkuDesc.split(' - ')[0] || selectedSkuDesc;
        requestPayload.sku_code = skuCode;
        console.log('🏷️ Adding SKU filter:', skuCode);
      }
      
      console.log('📤 Export API request payload:', requestPayload);
      
      // Call the export-excel API with filters
      const response = await apiPost('/export-excel', requestPayload);
      
      if (!response.success) {
        console.error('❌ Export API failed:', response.message);
        alert('Export failed: ' + (response.message || 'Unknown error'));
        return;
      }
      
      console.log('✅ Export API response:', response);
      
      // Log filter summary
      if (selectedYears.length > 0 || selectedSkuDescriptions.length > 0) {
        console.log('🔍 Export filters applied:');
        if (selectedYears.length > 0) {
          console.log('  📅 Period:', selectedYears[0]);
        }
        if (selectedSkuDescriptions.length > 0) {
          const skuCode = selectedSkuDescriptions[0].split(' - ')[0] || selectedSkuDescriptions[0];
          console.log('  🏷️ SKU Code:', skuCode);
        }
      } else {
        console.log('🔍 No filters applied - exporting all data');
      }
      
      // Extract component data from API response
      const componentData = response.data || [];
      const summary = response.summary || {};
      
      // If no component data from API, try to export SKU data instead
      if (componentData.length === 0) {
        console.log('⚠️ No component data found in API response, attempting to export SKU data...');
        
        // Check if we have SKU data available locally
        if (filteredSkuData && filteredSkuData.length > 0) {
          console.log('✅ Found SKU data locally, exporting SKU information instead');
          
          // Export SKU data when components are not available
          const skuExportData = filteredSkuData.map((sku: any) => ({
            'SKU ID': sku.id || '',
            'SKU Code': sku.sku_code || '',
            'SKU Description': sku.sku_description || '',
            'CM Code': sku.cm_code || '',
            'CM Description': sku.cm_description || '',
            'Site': sku.site || '',
            'SKU Reference': sku.sku_reference || '',
            'Period': sku.period || '',
            'Formulation Reference': sku.formulation_reference || '',
            'Dual Source SKU': sku.dual_source_sku || '',
            'SKU Type': sku.skutype || '',
            'Bulk/Expert': sku.bulk_expert || '',
            'Is Active': sku.is_active ? 'Yes' : 'No',
            'Is Approved': sku.is_approved === 1 || sku.is_approved === true ? 'Yes' : 'No',
            'Created By': sku.created_by || '',
            'Created Date': sku.created_date ? new Date(sku.created_date).toLocaleDateString() : '',
            'Status': 'SKU Available - No Components'
          }));
          
          // Create worksheet for SKU data using ExcelJS
          const skuWorkbook = new ExcelJS.Workbook();
          const skuWorksheet = skuWorkbook.addWorksheet('SKU Data');
          
          // Add headers
          const skuHeaders = Object.keys(skuExportData[0]);
          skuWorksheet.addRow(skuHeaders);
          
          // Style the headers
          const skuHeaderRow = skuWorksheet.getRow(1);
          skuHeaderRow.font = { bold: true, color: { argb: '30EA03' } };
          skuHeaderRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E8F5E8' }
          };
          
          // Add data rows
          skuExportData.forEach((row: any) => {
            skuWorksheet.addRow(Object.values(row));
          });
          
          // Auto-fit columns
          skuWorksheet.columns.forEach(column => {
            column.width = 15;
          });
          
          // Generate filename for SKU export
          const timestamp = new Date().toISOString().split('T')[0];
          const skuFilename = `${cmCode}_sku_export_${timestamp}.xlsx`;
          
          // Download the SKU file
          const skuBuffer = await skuWorkbook.xlsx.writeBuffer();
          const skuBlob = new Blob([skuBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const skuUrl = window.URL.createObjectURL(skuBlob);
          const skuLink = document.createElement('a');
          skuLink.href = skuUrl;
          skuLink.download = skuFilename;
          skuLink.click();
          window.URL.revokeObjectURL(skuUrl);
          
          console.log(`✅ SKU Excel export completed: ${skuExportData.length} SKUs exported to ${skuFilename}`);
          console.log('ℹ️ Note: Components data was not available, exported SKU information instead');
          
          // Show user-friendly message
          alert(`Export completed successfully!\n\n📊 Exported ${skuExportData.length} SKU records to ${skuFilename}\n\nℹ️ Note: Component data was not available, so SKU information was exported instead.`);
          
          return; // Exit early since we've exported SKU data
        } else {
          // No SKU data either
          alert('No data found to export. Neither components nor SKU data are available.');
          return;
        }
      }
      
      // Prepare data for Excel export
      const exportData = componentData.map((component: any) => ({
        'Mapping ID': component.mapping_id || '',
        'CM Code': component.cm_code || '',
        'SKU Code': component.sku_code || '',
        'Component Code': component.component_code || '',
        'Mapping Version': component.mapping_version || '',
        'Packaging Type ID': component.mapping_packaging_type_id || '',
        'Period ID': component.period_id || '',
        'Mapping Valid From': component.mapping_valid_from ? new Date(component.mapping_valid_from).toLocaleDateString() : '',
        'Mapping Valid To': component.mapping_valid_to ? new Date(component.mapping_valid_to).toLocaleDateString() : '',
        'Mapping Active': component.mapping_is_active ? 'Yes' : 'No',
        'Mapping Created By': component.mapping_created_by || '',
        'Mapping Created At': component.mapping_created_at ? new Date(component.mapping_created_at).toLocaleDateString() : '',
        'Mapping Updated At': component.mapping_updated_at ? new Date(component.mapping_updated_at).toLocaleDateString() : '',
        'Component ID': component.component_id || '',
        'Formulation Reference': component.formulation_reference || '',
        'Material Type ID': component.material_type_id || '',
        'Components Reference': component.components_reference || '',
        'Component Description': component.component_description || '',
        'Component Valid From': component.component_valid_from ? new Date(component.component_valid_from).toLocaleDateString() : '',
        'Component Valid To': component.component_valid_to ? new Date(component.component_valid_to).toLocaleDateString() : '',
        'Material Group': component.component_material_group || '',
        'Component Quantity': component.component_quantity || '',
        'Component UOM ID': component.component_uom_id || '',
        'Base Quantity': component.component_base_quantity || '',
        'Base UOM ID': component.component_base_uom_id || '',
        'Percent w/w': component.percent_w_w || '',
        'Evidence': component.evidence || '',
        'Component Packaging Type ID': component.component_packaging_type_id || '',
        'Packaging Material': component.component_packaging_material || '',
        'Helper Column': component.helper_column || '',
        'Unit Weight': component.component_unit_weight || '',
        'Weight Unit Measure': component.weight_unit_measure_id || '',
        'PCR Content %': component.percent_mechanical_pcr_content || '',
        'PIR Content %': component.percent_mechanical_pir_content || '',
        'Chemical Recycled %': component.percent_chemical_recycled_content || '',
        'Bio Sourced %': component.percent_bio_sourced || '',
        'Material Structure': component.material_structure_multimaterials || '',
        'Packaging Color': component.component_packaging_color_opacity || '',
        'Packaging Level': component.component_packaging_level_id || '',
        'Dimensions': component.component_dimensions || '',
        'Packaging Spec Evidence': component.packaging_specification_evidence || '',
        'Recycled Evidence': component.evidence_of_recycled_or_bio_source || '',
        'Last Update Date': component.last_update_date ? new Date(component.last_update_date).toLocaleDateString() : '',
        'Category Entry ID': component.category_entry_id ? new Date(component.category_entry_id).toLocaleDateString() : '',
        'Data Verification ID': component.data_verification_entry_id || '',
        'User ID': component.user_id || '',
        'Signed Off By': component.signed_off_by || '',
        'Signed Off Date': component.signed_off_date || '',
        'Mandatory Fields Status': component.mandatory_fields_completion_status ? new Date(component.mandatory_fields_completion_status).toLocaleDateString() : '',
        'Evidence Provided': component.evidence_provided || '',
        'Document Status': component.document_status || '',
        'Component Active': component.component_is_active ? 'Yes' : 'No',
        'Component Created By': component.component_created_by || '',
        'Component Created Date': component.component_created_date ? new Date(component.component_created_date).toLocaleDateString() : '',
        'Year': component.year || '',
        'Component Unit Weight ID': component.component_unit_weight_id || '',
        'Periods': component.periods || ''
      }));
      
      // Create worksheet using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Components Data');
      
      // Add headers
      const headers = Object.keys(exportData[0]);
      worksheet.addRow(headers);
      
      // Style the headers with bold and green color
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: '30EA03' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E8F5E8' }
      };
      
      // Add data rows
      exportData.forEach((row: any) => {
        worksheet.addRow(Object.values(row));
      });
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${cmCode}_components_export_${timestamp}.xlsx`;
      
      // Download the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      console.log(`✅ Excel export completed: ${exportData.length} rows exported to ${filename}`);
      
      // Success message logged to console only (no alert)
      let filterInfo = '';
      if (selectedYears.length > 0 || selectedSkuDescriptions.length > 0) {
        filterInfo = ' (with applied filters)';
      }
      console.log(`✅ Export completed: ${exportData.length} component records exported to ${filename}${filterInfo}`);
      
    } catch (error) {
      console.error('❌ Export to Excel failed:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExportLoading(false);
    }
  };

  // Copy Data modal handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setUploadError('');
      setUploadSuccess('');
    }
  };

  const handleCopyDataUpload = async () => {
    // Validate period selections
    if (!copyFromPeriod) {
      setUploadError('Please select a From Period');
      return;
    }
    
    if (!copyToPeriod) {
      setUploadError('Please select a To Period');
      return;
    }
    
    if (copyFromPeriod === copyToPeriod) {
      setUploadError('From Period and To Period cannot be the same');
      return;
    }

    if (!uploadedFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('cmCode', cmCode || '');
      formData.append('cmDescription', cmDescription);
      formData.append('fromPeriod', copyFromPeriod);
      formData.append('toPeriod', copyToPeriod);

      // Here you would make the API call to upload the file
      // For now, we'll simulate the upload process
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      setUploadSuccess('File uploaded successfully! Data has been copied.');
      setUploadedFile(null);
      
      // Close modal after success
      setTimeout(() => {
        setShowCopyDataModal(false);
        setUploadSuccess('');
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCopyDataModalClose = () => {
    setShowCopyDataModal(false);
    setUploadedFile(null);
    setUploadError('');
    setUploadSuccess('');
    setCopyFromPeriod('');
    setCopyToPeriod('');
  };

  const [materialTypeOptions, setMaterialTypeOptions] = useState<{id: number, item_name: string}[]>([]);

  useEffect(() => {
    const fetchMaterialTypeOptions = async () => {
      try {
       // console.log('Fetching material types from Universal API');
        const data = await fetchDashboardData(['master-data']);
        
        if (data && data.master_data && data.master_data.material_types) {
          // Use material_types from Universal API
          setMaterialTypeOptions(data.master_data.material_types);
          //console.log('Material types loaded from Universal API:', data.master_data.material_types.length);
        } else {
         // console.error('No material_types data in Universal API response');
          setMaterialTypeOptions([]);
        }
      } catch (err) {
        console.error('Error fetching material types from Universal API:', err);
        setMaterialTypeOptions([]);
      }
    };
    fetchMaterialTypeOptions();
  }, []);



  useEffect(() => {
    if (filteredSkuData.length > 0 && openIndex === 0 && !componentDetails[filteredSkuData[0].sku_code]) {
      fetchComponentDetails(filteredSkuData[0].sku_code);
    }
    // eslint-disable-next-line
  }, [filteredSkuData]);

  // Add this function in your main component:
  // State for component suggestions
  const [componentSuggestions, setComponentSuggestions] = useState<Array<{
    id: number;
    component_code: string;
    periods: string;
    version: string;
    component_description: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isComponentSelected, setIsComponentSelected] = useState(false); // Track if component is selected from auto-complete

  // Function to clear all populated fields when Component Code changes
  const clearAllPopulatedFields = () => {
    setAddComponentData(prev => ({
      ...prev,
      componentType: '',
      componentDescription: '',
      validityFrom: '',
      validityTo: '',
      componentCategory: '',
      componentQuantity: '',
      componentUnitOfMeasure: '',
      componentBaseQuantity: '',
      componentBaseUnitOfMeasure: '',
      wW: '',
      componentPackagingType: '',
      componentPackagingMaterial: '',
      componentUnitWeight: '',
      componentWeightUnitOfMeasure: '',
      percentPostConsumer: '',
      percentPostIndustrial: '',
      percentChemical: '',
      percentBioSourced: '',
      materialStructure: '',
      packagingColour: '',
      packagingLevel: '',
      componentDimensions: '',
      packagingEvidence: [], // Clear packaging evidence files
      version: '' // Clear version
      // Keep period and componentCode as they are
    }));
    
    // Clear evidence files
    setUploadedFiles([]);
    setSelectedCategories([]);
    
    // Clear suggestions
    setComponentSuggestions([]);
    setShowSuggestions(false);
    
    // Re-enable all fields when Component Code changes
    setIsComponentSelected(false);
    
    console.log('🧹 All populated fields cleared - Component Code changed');
  };

  // Function to convert dd/mm/yyyy format to YYYY-MM-DD format for HTML date input
  const convertDDMMYYYYToYYYYMMDD = (dateString: string): string => {
    if (!dateString || dateString.trim() === '') return '';
    
    // Check if date is already in YYYY-MM-DD format
    if (dateString.includes('-')) return dateString;
    
    // Convert from dd/mm/yyyy to YYYY-MM-DD
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    
    return dateString; // Return as-is if conversion fails
  };

  // Function to fetch component data by component code
  const fetchComponentDataByCode = async (componentCode: string) => {
    if (!componentCode || componentCode.trim() === '') {
      setComponentSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      console.log('Fetching component data for code:', componentCode);
      const result = await apiGet(`/get-component-code-data?component_code=${encodeURIComponent(componentCode)}`);
      
      console.log('Component data API response:', result);
      
            if (result.success && result.data && result.data.components_with_evidence && result.data.components_with_evidence.length > 0) {
        const componentsWithEvidence = result.data.components_with_evidence;
        
        // Always show suggestions first, even for single components
        const suggestions = componentsWithEvidence.map((compWithEvidence: any) => {
          const comp = compWithEvidence.component_details;
          const mapping = compWithEvidence.mapping_details;
          // Get the actual period text from years data
          const periodId = comp.periods?.toString() || comp.year?.toString() || '';
          const periodText = years.find(year => year.id === periodId)?.period || periodId;
          
          return {
            id: comp.id,
            component_code: comp.component_code,
            periods: periodText,
            version: comp.version?.toString() || '', // ✅ Now using component_details.version
            component_description: comp.component_description || ''
          };
        });
        
        setComponentSuggestions(suggestions);
        setShowSuggestions(true);
        console.log('Showing suggestions for components:', suggestions);
      } else {
        console.log('No component found for code:', componentCode);
        setComponentSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching component data:', error);
      setComponentSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Function to select a component from suggestions
  const selectComponentFromSuggestions = async (componentId: number) => {
    try {
      const result = await apiGet(`/get-component-code-data?component_code=${encodeURIComponent(addComponentData.componentCode)}`);
      
      if (result.success && result.data && result.data.components_with_evidence) {
        const selectedComponentWithEvidence = result.data.components_with_evidence.find((compWithEvidence: any) => compWithEvidence.component_details.id === componentId);
          
          if (selectedComponentWithEvidence) {
            const selectedComponent = selectedComponentWithEvidence.component_details;
            const evidenceFiles = selectedComponentWithEvidence.evidence_files || [];
            
            // Populate all fields with the selected component data
            setAddComponentData({
              ...addComponentData,
              componentType: selectedComponent.material_type_id?.toString() || '',
              componentCode: selectedComponent.component_code || '',
              componentDescription: selectedComponent.component_description || '',
              validityFrom: selectedComponentWithEvidence.mapping_details?.componentvaliditydatefrom ? 
                convertDDMMYYYYToYYYYMMDD(selectedComponentWithEvidence.mapping_details.componentvaliditydatefrom) : '',
              validityTo: selectedComponentWithEvidence.mapping_details?.componentvaliditydateto ? 
                convertDDMMYYYYToYYYYMMDD(selectedComponentWithEvidence.mapping_details.componentvaliditydateto) : '',
              componentCategory: selectedComponent.component_material_group || '',
              componentQuantity: selectedComponent.component_quantity?.toString() || '',
              componentUnitOfMeasure: selectedComponent.component_uom_id?.toString() || '',
              componentBaseQuantity: selectedComponent.component_base_quantity?.toString() || '',
              componentBaseUnitOfMeasure: selectedComponent.component_base_uom_id?.toString() || '',
              wW: selectedComponent.percent_w_w?.toString() || '',
              componentPackagingType: selectedComponent.component_packaging_type_id?.toString() || '',
              componentPackagingMaterial: selectedComponent.component_packaging_material || '',
              componentUnitWeight: selectedComponent.component_unit_weight?.toString() || '',
              componentWeightUnitOfMeasure: selectedComponent.weight_unit_measure_id?.toString() || '',
              percentPostConsumer: selectedComponent.percent_mechanical_pcr_content?.toString() || '',
              percentPostIndustrial: selectedComponent.percent_mechanical_pir_content?.toString() || '',
              percentChemical: selectedComponent.percent_chemical_recycled_content?.toString() || '',
              percentBioSourced: selectedComponent.percent_bio_sourced?.toString() || '',
              materialStructure: selectedComponent.material_structure_multimaterials || '',
              packagingColour: selectedComponent.component_packaging_color_opacity || '',
              packagingLevel: selectedComponent.component_packaging_level_id?.toString() || '',
              componentDimensions: selectedComponent.component_dimensions || '',
              packagingEvidence: [], // Initialize with empty array
              period: selectedComponentWithEvidence.mapping_details?.period_id?.toString() || addComponentData.period, // Auto-populate from API
              version: selectedComponent.version?.toString() || '' // ✅ Auto-populate version from component_details
            });
            
            // Populate evidence files
            if (evidenceFiles.length > 0) {
              console.log('Processing evidence files from selection:', evidenceFiles);
              
              // Create separate rows for each file with its category
              const newUploadedFiles = evidenceFiles.map((file: any, index: number) => {
                // Get category from API response
                const categoryName = file.category || 'Unknown';
                
                // Map category name to category number for dropdown selection
                let categoryNumber = '1'; // Default
                if (categoryName === 'Weight') {
                  categoryNumber = '1';
                } else if (categoryName === 'Packaging Type') {
                  categoryNumber = '3';
                } else if (categoryName === 'Material') {
                  categoryNumber = '4';
                } else if (categoryName === 'Evidence') {
                  categoryNumber = '2';
                }
                
                return {
                  id: `file-${file.id || index}`,
                  categories: [categoryNumber],
                  categoryName: categoryName,
                  files: [{
                    name: file.evidence_file_name,
                    url: file.evidence_file_url,
                    size: 0, // We don't have file size in the API
                    type: 'application/octet-stream' // Default type
                  }]
                };
              });
              
              setUploadedFiles(newUploadedFiles);
              
              // Pre-select categories in the dropdown
              const selectedCategoryNumbers = newUploadedFiles.map((upload: any) => upload.categories[0]);
              setSelectedCategories(selectedCategoryNumbers);
              
              console.log('Evidence files populated with individual rows from selection:', newUploadedFiles);
              console.log('Pre-selected categories from selection:', selectedCategoryNumbers);
              
              // Populate Packaging Evidence field with files that have "PackagingEvidence" category
              const packagingEvidenceFiles = evidenceFiles.filter((file: any) => 
                file.category === 'PackagingEvidence' || 
                file.category === 'Packaging Type' ||
                file.category === 'Packaging'
              );
              
              if (packagingEvidenceFiles.length > 0) {
                // Convert API files to File objects for the Packaging Evidence field
                const packagingFiles = packagingEvidenceFiles.map((file: any) => {
                  // Create a File-like object for the Packaging Evidence field
                  return {
                    name: file.evidence_file_name,
                    size: 0,
                    type: 'application/octet-stream',
                    lastModified: new Date().getTime()
                  } as File;
                });
                
                setAddComponentData(prev => ({
                  ...prev,
                  packagingEvidence: packagingFiles
                }));
                
                console.log('Packaging Evidence field populated with files from selection:', packagingFiles);
              }
            }
            
            setComponentSuggestions([]);
            setShowSuggestions(false);
            
            // Mark that a component is selected (disable other fields)
            setIsComponentSelected(true);
            
            console.log('Selected component data populated - Fields now disabled');
          }
        }
      }
     catch (error) {
      console.error('Error selecting component:', error);
    }
  };

  const handleComponentStatusChange = async (mappingId: number, newStatus: boolean, skuCode?: string) => {
    console.log('🔍 handleComponentStatusChange called with:', { mappingId, newStatus, skuCode });
    
    try {
      console.log('📡 Making status change API call to Universal API...');
      const result = await apiPatch('/toggle-status', { 
        type: 'component', 
        id: mappingId, 
        is_active: newStatus 
      });
      
      console.log('📡 Status change API result:', result);
      
      if (result.success) {
        console.log('✅ Status change successful, now logging audit trail...');
        
        // Log audit trail for component status change
        try {
          // Get component data to extract component_code
          const componentData = skuCode && componentDetails[skuCode] 
            ? componentDetails[skuCode].find(comp => comp.mapping_id === mappingId)
            : null;
          
          const auditData = {
            component_id: mappingId, // ✅ Primary key of the component mapping
            sku_code: skuCode || '',
            component_code: componentData?.component_code || '',
            component_description: componentData?.component_description || '',
            year: componentData?.year || '',
            cm_code: cmCode || '',
            periods: componentData?.periods || '',
            material_type_id: Number(componentData?.material_type_id) || 0,
            component_quantity: Number(componentData?.component_quantity) || 0,
            component_uom_id: Number(componentData?.component_uom_id) || 0,
            component_packaging_material: componentData?.component_packaging_material || '',
            component_unit_weight: Number(componentData?.component_unit_weight) || 0,
            weight_unit_measure_id: Number(componentData?.weight_unit_measure_id) || 0,
            percent_mechanical_pcr_content: Number(componentData?.percent_mechanical_pcr_content) || 0,
            percent_bio_sourced: Number(componentData?.percent_bio_sourced) || 0,
            user_id: 1,
            created_by: 1,
            is_active: newStatus
          };
          
          console.log('📝 Audit data being sent:', auditData);
          
          const auditResult = await apiPost('/add-component-audit-log', auditData);
          
          console.log('📝 Audit API result:', auditResult);
          
          if (auditResult.success) {
            console.log('✅ Audit log created successfully:', auditResult);
          } else {
            console.error('❌ Audit API failed:', auditResult);
          }
        } catch (auditError) {
          console.error('❌ Failed to log audit trail:', auditError);
          console.error('❌ Audit error details:', {
            message: auditError instanceof Error ? auditError.message : 'Unknown error',
            stack: auditError instanceof Error ? auditError.stack : 'No stack trace'
          });
        }
        
        // Update local state
        if (skuCode) {
          console.log('🔄 Updating local component state...');
          setComponentDetails(prev => ({
            ...prev,
            [skuCode]: prev[skuCode].map(row =>
              row.mapping_id === mappingId ? { ...row, is_active: newStatus } : row
            )
          }));
          console.log('✅ Local state updated successfully');
        }
      } else {
        console.error('❌ Status change API failed:', result);
        showError('Failed to update status');
      }
    } catch (err) {
      console.error('❌ Network error in handleComponentStatusChange:', err);
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      showError('Failed to update status');
    }
  };

  return (
    <Layout>
      {(loading || !minimumLoaderComplete) && <Loader />}
      <div className="mainInternalPages" style={{ display: (loading || !minimumLoaderComplete) ? 'none' : 'block' }}>
        <div style={{ 
          // marginBottom: 8, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 0'
        }}>
          <div className="commonTitle">
            <div className="icon">
              <i className="ri-file-list-3-fill"></i>
            </div>
            <h1>3PM Detail</h1>
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
              // boxShadow: '0 2px 8px rgba(48, 234, 3, 0.3)',
              transition: 'all 0.3s ease',
              minWidth: '100px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              // e.currentTarget.style.boxShadow = '0 4px 12px rgba(48, 234, 3, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              // e.currentTarget.style.boxShadow = '0 2px 8px rgba(48, 234, 3, 0.3)';
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 18, marginRight: 6 }} />
            Back
          </button>
        </div>

        <div className="filters CMDetails">
          <div className="row">
            <div className="col-sm-12 ">
              <ul style={{ display: 'flex', alignItems: 'center', padding: '6px 15px 8px' }}>
                <li><strong>3PM Code: </strong> {cmCode}</li>
                <li> | </li>
                <li><strong>3PM Description: </strong> {cmDescription}</li>
                <li> | </li>
                <li>
                  <strong>Status: </strong>
                  <span style={{
                    display: 'inline-block',
                    marginLeft: 8,
                    padding: '1px 14px',
                    borderRadius: 12,
                    background: status === 'approved' || status === 'Active' ? '#30ea03' : status === 'pending' ? 'purple' : status === 'rejected' || status === 'Deactive' ? '#ccc' : '#ccc',
                    color: status === 'approved' || status === 'Active' ? '#000' : '#fff',
                    fontWeight: 600
                  }}>
                    {status ? (status === 'approved' ? 'Signed' : status.charAt(0).toUpperCase() + status.slice(1)) : 'N/A'}
                  </span>
                </li>
                <li> | </li>
                <li>
                  <strong>Total SKUs: </strong> {skuData.length}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="row"> 
          <div className="col-sm-12">
            <div className="filters">
              <ul>
                <li>
                  <div className="fBold"> Reporting Period</div>
                  <div className="form-control">
                    <select
                      value={selectedYears.length > 0 ? selectedYears[0] : ''}
                      onChange={(e) => setSelectedYears(e.target.value ? [e.target.value] : [])}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: 'none',
                        outline: 'none',
                        opacity: years.length === 0 ? 0.5 : 1
                      }}
                      disabled={years.length === 0}
                    >
                                                <option value="">Select Reporting Period</option>
                      {years.length === 0 ? (
                        <option value="" disabled>Loading periods...</option>
                      ) : (
                        years.map((year, index) => (
                        <option key={year.id} value={year.id}>
                          {year.period}
                        </option>
                        ))
                      )}
                    </select>
                  </div>
                </li>
              <li>
  <div className="fBold">SKU Code-Description</div>
  <div className="form-control">
    <MultiSelect 
      options={skuDescriptions}
      selectedValues={selectedSkuDescriptions}
      onSelectionChange={setSelectedSkuDescriptions}
      placeholder={skuDescriptions.length === 0 ? "Loading SKU descriptions..." : "Select SKU Code-Description..."}
      disabled={skuDescriptions.length === 0}
      loading={skuDescriptions.length === 0}
    />
  </div>
</li>
              <li>
  <div className="fBold">Component Code</div>
  <div className="form-control">
    <MultiSelect 
      options={componentCodes
        .filter(code => code && typeof code === 'string' && code.trim() !== '')
        .map(code => ({ value: code, label: code }))}
      selectedValues={selectedComponentCodes}
      onSelectionChange={setSelectedComponentCodes}
      placeholder={componentCodes.length === 0 ? "Loading component codes..." : "Select Component Code..."}
      disabled={componentCodes.length === 0}
      loading={componentCodes.length === 0}
    />
  </div>
</li>

                <li>
                  <button className="btnCommon btnGreen filterButtons" onClick={handleSearch} disabled={loading}>
                    <span>Filter</span>
                    <i className="ri-search-line"></i>
                  </button>
                </li>
                <li>
                  <button className="btnCommon btnBlack filterButtons" onClick={handleReset} disabled={loading}>
                    <span>Reset</span>
                    <i className="ri-refresh-line"></i>
                  </button>
                </li></ul>
                <ul style={{ justifyContent: 'end', paddingTop: '0', display: 'flex', flexWrap: 'nowrap', gap: '8px' }}>
                  <li style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btnCommon btnGreen filterButtons"
                      style={{ minWidth: 110, fontWeight: 600, marginRight: 0, marginTop: 0, fontSize: '13px', padding: '8px 12px' }}
                      onClick={() => {
                        setShowSkuModal(true);
                        fetchThreePmOptions(); // Fetch 3PM options when modal opens
                        // Set default period to the first available period
                        if (years.length > 0) {
                          setAddSkuPeriod(years[0].id);
                        }
                      }}
                    >
                      <span>Add SKU</span> <i className="ri-add-circle-line"></i>
                    </button>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btnCommon btnGreen filterButtons"
                      style={{ minWidth: 110, fontWeight: 600, marginRight: 0, marginTop: 0, fontSize: '13px', padding: '8px 12px' }}
                      onClick={() => navigate(`/upload-data?cmCode=${encodeURIComponent(cmCode || '')}&cmDescription=${encodeURIComponent(cmDescription)}`)}
                    >
                      <span>Copy Data</span> <i className="ri-file-copy-line"></i>
                    </button>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btnCommon btnGreen filterButtons"
                      style={{ minWidth: 110, fontWeight: 600, marginRight: 8, marginTop: 0, fontSize: '13px', padding: '8px 12px' }}
                      onClick={() => {
                        // TODO: Implement GAIA functionality
                        console.log('GAIA button clicked');
                      }}
                    >
                     <span>GAIA</span> 
                     <i className="ri-global-line" style={{ marginLeft: 5 }}></i>
                    </button>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btnCommon btnGreen filterButtons"
                      style={{ minWidth: 110, fontWeight: 600, marginRight: 0, marginTop: 0, fontSize: '13px', padding: '8px 12px' }}
                      onClick={handleExportToExcel}
                      disabled={exportLoading}
                    >
                     <span>{exportLoading ? 'Exporting...' : 'Export to Excel'}</span> 
                     <i 
                       className={exportLoading ? 'ri-loader-4-line' : 'ri-file-excel-2-line'} 
                       style={exportLoading ? spinningStyle : {}}
                     ></i>
                    </button>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btnCommon btnGreen filterButtons" 
                      style={{ 
                        minWidth: 110,
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 600, 
                        marginTop: 0,
                        fontSize: '13px',
                        padding: '8px 12px'
                      }}
                      onClick={() => {
                        navigate(`/generate-pdf?cmCode=${encodeURIComponent(cmCode || '')}&cmDescription=${encodeURIComponent(cmDescription)}`);
                      }}
                    >
                      <i className="ri-file-pdf-2-line" style={{ fontSize: 14, marginRight: '4px' }}></i>
                      <span>Generate PDF</span>
                    </button>
                  </li>
                </ul>
            </div>
          </div>
        </div>
        
        {error ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
            <p>Error loading SKU details: {error}</p>
          </div>
        ) : (
          <div className="panel-group" id="accordion">
            {filteredSkuData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>No SKU data available for this CM Code</p>
              </div>
            ) : (
              <>
                {/* Send for Approval Button */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  marginBottom: '16px'
                }}>
                  <button className="add-sku-btn btnCommon btnGreen filterButtons"
                    style={{
                      background: '#30ea03',
                      color: '#000',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 'bold',
                      padding: '6px 12px',
                      fontSize: 13,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: 110
                    }}
                    title="Send for Approval"
                    onClick={() => {
                      navigate(`/sedforapproval?cmCode=${encodeURIComponent(cmCode || '')}&cmDescription=${encodeURIComponent(cmDescription)}`);
                    }}
                  >
                    <span>Send for Approval</span>
                    <i className="ri-send-plane-2-line" style={{ marginLeft: 5 }} />
                  </button>
                </div>
                
                {/* Professional Legend */}
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '16px 20px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '12px',
                    borderBottom: '2px solid #dee2e6',
                    paddingBottom: '8px'
                  }}>
                    <i className="ri-information-line" style={{ 
                      fontSize: '18px', 
                      color: '#495057', 
                      marginRight: '8px' 
                    }}></i>
                    <h6 style={{ 
                      margin: '0', 
                      color: '#495057', 
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      Status Legend
                    </h6>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '16px',
                    fontSize: '12px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px' 
                    }}>
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: '#30ea03', 
                        borderRadius: '2px' 
                      }}></div>
                      <span style={{ color: '#495057' }}>Approved</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px' 
                    }}>
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: '#dc3545', 
                        borderRadius: '2px' 
                      }}></div>
                      <span style={{ color: '#495057' }}>Pending Approval</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px' 
                    }}>
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: '#30ea03', 
                        borderRadius: '2px' 
                      }}></div>
                      <span style={{ color: '#495057' }}>Active Status</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px' 
                    }}>
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: '#6c757d', 
                        borderRadius: '2px' 
                      }}></div>
                      <span style={{ color: '#495057' }}>Inactive Status</span>
                    </div>
                  </div>
                </div>

                {/* SKU Tabs */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    borderBottom: '2px solid #e0e0e0',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <button
                      style={{
                        background: activeTab === 'active' ? '#30ea03' : 'transparent',
                        color: activeTab === 'active' ? '#000' : '#666',
                        border: 'none',
                        padding: '12px 24px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        cursor: 'pointer',
                        borderRadius: '4px 4px 0 0',
                        borderBottom: activeTab === 'active' ? '2px solid #30ea03' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => setActiveTab('active')}
                    >
                      Active SKU ({filteredSkuData.filter(sku => sku.is_active).length})
                    </button>
                    <button
                      style={{
                        background: activeTab === 'inactive' ? '#30ea03' : 'transparent',
                        color: activeTab === 'inactive' ? '#000' : '#666',
                        border: 'none',
                        padding: '12px 24px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        cursor: 'pointer',
                        borderRadius: '4px 4px 0 0',
                        borderBottom: activeTab === 'inactive' ? '2px solid #30ea03' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => setActiveTab('inactive')}
                    >
                      Inactive SKU ({filteredSkuData.filter(sku => !sku.is_active).length})
                    </button>
                  </div>
                </div>

                {/* No Data Message for Active Tab */}
                {activeTab === 'active' && filteredSkuData.filter(sku => sku.is_active).length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    marginTop: '20px'
                  }}>
                    <i className="ri-inbox-line" style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}></i>
                    <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>No active SKUs available</p>
                  </div>
                )}

                {/* Active SKU Content */}
                {activeTab === 'active' && filteredSkuData.filter(sku => sku.is_active).length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    {filteredSkuData.filter(sku => sku.is_active).map((sku, index) => (
                <div key={sku.id} className="panel panel-default" style={{ marginBottom: 10, borderRadius: 6, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                  <div
                    className="panel-heading panel-title"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', background: getSkuPanelBackgroundColor(sku.is_approved), color: '#fff', fontWeight: 600, paddingLeft: 10 }}
                    onClick={() => {
                      console.log('🟢 SKU panel clicked:', sku.sku_code);
                      console.log('🟢 Current openIndex:', openIndex, 'Clicked index:', index);
                      console.log('🟢 Component details exist:', !!componentDetails[sku.sku_code]);
                      
                      setOpenIndex(openIndex === index ? null : index);
                      if (openIndex !== index && !componentDetails[sku.sku_code]) {
                        console.log('🚀 Calling fetchComponentDetails for:', sku.sku_code);
                        fetchComponentDetails(sku.sku_code);
                      } else {
                        console.log('⏭️ Skipping API call - either already open or data exists');
                      }
                    }}
                  >
                    <span style={{ marginRight: 12, fontSize: 28 }}>
                      {openIndex === index
                        ? <i className="ri-indeterminate-circle-line"></i>
                        : <i className="ri-add-circle-line"></i>
                      }
                    </span>
                    <span style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                      <strong>{sku.sku_code}</strong>
                      {/* Only show SKU Description if it has a value */}
                      {sku.sku_description && sku.sku_description.trim() !== '' && (
                        <> || {sku.sku_description}</>
                      )}
                      {/* Approval status indicator */}
                      <span style={{ 
                        marginLeft: 8, 
                        padding: '2px 8px', 
                        borderRadius: 12, 
                        fontSize: 10, 
                        fontWeight: 'bold',
                        background: sku.is_approved === 1 || sku.is_approved === true ? '#30ea03' : '#dc3545',
                        color: sku.is_approved === 1 || sku.is_approved === true ? '#000' : '#fff'
                      }}>
                        {sku.is_approved === 1 || sku.is_approved === true ? 'Approved' : 'Pending'}
                      </span>
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      <button
                        style={{
                          background: sku.is_active ? '#30ea03' : '#ccc',
                          color: sku.is_active ? '#000' : '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontWeight: 'bold',
                          padding: '3px 18px',
                          cursor: 'pointer',
                          marginLeft: 8,
                          minWidth: 90,
                          height: 24,
                          margin: '5px 0',
                          fontSize: 12,
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          handleHeaderStatusClick(sku.id, sku.is_active);
                        }}
                      >
                                                        {sku.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </span>
                  </div>
                  <Collapse isOpened={openIndex === index}>
                    <div className="panel-body" style={{ minHeight: 80, padding: 24, position: 'relative' }}>
                      <div style={{ display: 'flex', marginBottom: 8, gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          {/* Only show Reference SKU if it has a value */}
                          {sku.sku_reference && sku.sku_reference.trim() !== '' && (
                            <p><strong>Reference SKU: </strong> {sku.sku_reference}</p>
                          )}
                          
                          {/* Only show SKU Type if it has a value */}
                          {sku.skutype && sku.skutype.trim() !== '' && (
                            <p><strong>SKU Type: </strong> {sku.skutype}</p>
                          )}
                          
                          {/* Only show Bulk/Expert if it has a value */}
                          {sku.bulk_expert && sku.bulk_expert.trim() !== '' && (
                            <p><strong>Bulk/Expert: </strong> {sku.bulk_expert}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button className="add-sku-btn btnCommon btnGreen filterButtons"
                            style={{
                              background: '#30ea03',
                              color: '#000',
                              border: 'none',
                              borderRadius: 6,
                              fontWeight: 'bold',
                              padding: '6px 12px',
                              fontSize: 13,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 110
                            }}
                            title="Edit SKU"
                            onClick={() => {
                              console.log('SKU passed to Edit:', sku);
                              handleEditSkuOpen(sku);
                            }}
                          >
                            <span>Edit SKU</span>
                            <i className="ri-pencil-line" style={{ marginLeft: 5 }}/>
                          </button>
                          {/* ===== CONDITIONAL RENDERING: ADD COMPONENT BUTTON ===== */}
                          {/* Show "Add Component" button for ALL SKUs EXCEPT internal SKUs */}
                          {sku.skutype !== 'internal' && (
                            <button
                              className="add-sku-btn btnCommon btnGreen filterButtons"
                              style={{ 
                                backgroundColor: '#30ea03', 
                                color: '#000', 
                                minWidth: 110, 
                                fontSize: 13,
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: 6,
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              onClick={e => { e.stopPropagation(); setSelectedSkuCode(sku.sku_code); setShowAddComponentModal(true); }}
                            >
                              <span>Add Component</span>
                              <i className="ri-add-circle-line" style={{ marginLeft: 5 }}></i>
                            </button>
                          )}
                        </div>
                      </div>
                     
                          {/* ===== CONDITIONAL RENDERING: EXTERNAL SKU FEATURES ===== */}
                          {/* Show Material Type filters and Component Table for ALL SKUs EXCEPT internal SKUs */}
                          {/* This provides component management functionality for all non-internal SKUs */}
                          {sku.skutype !== 'internal' && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontWeight: 600, marginRight: 8 }}>Material Type:</span>
                            <label style={{ display: 'flex', alignItems: 'center', marginRight: 16, cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name={`material-type-${sku.id}`} 
                                value="packaging"
                                checked={skuMaterialTypes[sku.sku_code] === 'packaging'}
                                onChange={(e) => {
                                  console.log('🔄 Material type changed to:', e.target.value, 'for SKU:', sku.sku_code);
                                  setSkuMaterialTypes(prev => ({ ...prev, [sku.sku_code]: e.target.value }));
                                }}
                                style={{ marginRight: 6 }}
                              />
                              <span>Packaging </span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', marginRight: 16, cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name={`material-type-${sku.id}`} 
                                value="raw_material"
                                checked={skuMaterialTypes[sku.sku_code] === 'raw_material'}
                                onChange={(e) => {
                                  console.log('🔄 Material type changed to:', e.target.value, 'for SKU:', sku.sku_code);
                                  setSkuMaterialTypes(prev => ({ ...prev, [sku.sku_code]: e.target.value }));
                                }}
                                style={{ marginRight: 6 }}
                              />
                              <span>Raw Material</span>
                            </label>
                          </div>
                          
                          
                          
                          {/* Component Table Header */}
                      <div style={{ 
                        background: '#f8f9fa', 
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        marginTop: '16px'
                      }}>
                        <div style={{ 
                          padding: '8px 20px', 
                          borderBottom: '1px solid #e9ecef',
                          background: '#000',
                          color: '#fff'
                        }}>
                          <h6 style={{ 
                            fontWeight: '600', 
                            margin: '0',
                            fontSize: '16px'
                          }}>
                            Component Details
                          </h6>
                        </div>
                        
                        <div style={{ padding: '20px' }}>
                          <div className="table-responsive" style={{ overflowX: 'auto' }}>
                            <table style={{ 
                              width: '100%', 
                              borderCollapse: 'collapse',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6'
                            }}>
                              <thead>
                                <tr style={{ backgroundColor: '#000' }}>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '80px'
                                  }}>
                                    Action
                                  </th>

                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '120px'
                                  }}>
                                    Component Type
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '120px'
                                  }}>
                                    Component Code
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component Description
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '140px'
                                  }}>
                                    Component validity date - From
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '140px'
                                  }}>
                                    Component validity date - To
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '130px'
                                  }}>
                                    Component Category
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '130px'
                                  }}>
                                    Component Quantity
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component Unit of Measure
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component Base Quantity
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '170px'
                                  }}>
                                    Component Base Unit of Measure
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '80px'
                                  }}>
                                    %w/w
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component Packaging Type
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '170px'
                                  }}>
                                    Component Packaging Material
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '130px'
                                  }}>
                                    Component Unit Weight
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '180px'
                                  }}>
                                    Component Weight Unit of Measure
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '200px'
                                  }}>
                                    % Mechanical Post-Consumer Recycled Content (inc. Chemical)
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '200px'
                                  }}>
                                    % Mechanical Post-Industrial Recycled Content
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    % Chemical Recycled Content
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '120px'
                                  }}>
                                    % Bio-sourced?
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '200px'
                                  }}>
                                    Material structure - multimaterials only (with % wt)
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '180px'
                                  }}>
                                    Component packaging colour / opacity
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component packaging level
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '180px'
                                  }}>
                                    Component dimensions (3D - LxWxH, 2D - LxW)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {componentDetailsLoading[sku.sku_code] ? (
                                  <tr>
                                    <td colSpan={25} style={{ 
                                      padding: '40px 20px', 
                                      textAlign: 'center', 
                                      color: '#666',
                                      fontSize: '14px'
                                    }}>
                                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                      </div>
                                      Loading component details...
                                    </td>
                                  </tr>
                                ) : getFilteredComponents(sku.sku_code) && getFilteredComponents(sku.sku_code).length > 0 ? (
                                  getFilteredComponents(sku.sku_code).map((component: any, compIndex: number) => (
                                    <tr key={component.id || compIndex} style={{ backgroundColor: compIndex % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <button
                                            style={{
                                              background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
                                              border: 'none',
                                              color: '#000',
                                              fontSize: '10px',
                                              fontWeight: '600',
                                              cursor: 'pointer',
                                              padding: '2px',
                                              borderRadius: '2px',
                                              width: '18px',
                                              height: '18px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                          
                                            onClick={() => handleEditComponent(component)}
                                            title="Edit Component"
                                          >
                                            <i className="ri-edit-line" />
                                          </button>
                                          <button
                                            style={{
                                              background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                                              border: 'none',
                                              color: '#fff',
                                              fontSize: '10px',
                                              fontWeight: '600',
                                              cursor: 'pointer',
                                              padding: '2px',
                                              borderRadius: '2px',
                                              width: '18px',
                                              height: '18px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                            onClick={() => handleViewComponentHistory(component)}
                                            title="View Component History"
                                          >
                                            <i className="ri-eye-line" />
                                          </button>
                                        </div>
                                      </td>

                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                        {component.material_type_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                        {component.component_code || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_description || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_valid_from ? new Date(component.component_valid_from).toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_valid_to ? new Date(component.component_valid_to).toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_material_group || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_quantity || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_uom_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_base_quantity || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_base_uom_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_w_w || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_packaging_type_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_packaging_material || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_unit_weight || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.weight_unit_measure_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_mechanical_pcr_content || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_mechanical_pir_content || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_chemical_recycled_content || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_bio_sourced || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.material_structure_multimaterials || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_packaging_color_opacity || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_packaging_level_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                        {component.component_dimensions || 'N/A'}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={24} style={{ 
                                      padding: '40px 20px', 
                                      textAlign: 'center', 
                                      color: '#666',
                                      fontSize: '14px',
                                      fontStyle: 'italic'
                                    }}>
                                      No component data available
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                        </>
                      )}
                    </div>
                  </Collapse>
                </div>
              ))}
                    </div>
                  )}

                  {/* No Data Message for Inactive Tab */}
                  {activeTab === 'inactive' && filteredSkuData.filter(sku => !sku.is_active).length === 0 && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px', 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      marginTop: '20px'
                    }}>
                      <i className="ri-inbox-line" style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}></i>
                      <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>No inactive SKUs available</p>
                    </div>
                  )}

                  {/* Inactive SKU Content */}
                  {activeTab === 'inactive' && filteredSkuData.filter(sku => !sku.is_active).length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                      {filteredSkuData.filter(sku => !sku.is_active).map((sku, index) => (
                        <div key={sku.id} className="panel panel-default" style={{ marginBottom: 10, borderRadius: 6, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                          <div
                            className="panel-heading panel-title"
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', background: getSkuPanelBackgroundColor(sku.is_approved), color: '#fff', fontWeight: 600, paddingLeft: 10 }}
                            onClick={() => {
                              setOpenIndex(openIndex === index ? null : index);
                              if (openIndex !== index && !componentDetails[sku.sku_code]) {
                                fetchComponentDetails(sku.sku_code);
                              }
                            }}
                          >
                            <span style={{ marginRight: 12, fontSize: 28 }}>
                              {openIndex === index
                                ? <i className="ri-indeterminate-circle-line"></i>
                                : <i className="ri-add-circle-line"></i>
                              }
                            </span>
                            <span style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                              <strong>{sku.sku_code}</strong>
                              {/* Only show SKU Description if it has a value */}
                              {sku.sku_description && sku.sku_description.trim() !== '' && (
                                <> || {sku.sku_description}</>
                              )}
                              {/* Approval status indicator */}
                              <span style={{ 
                                marginLeft: 8, 
                                padding: '2px 8px', 
                                borderRadius: 12, 
                                fontSize: 10, 
                                fontWeight: 'bold',
                                background: sku.is_approved === 1 || sku.is_approved === true ? '#30ea03' : '#dc3545',
                                color: sku.is_approved === 1 || sku.is_approved === true ? '#000' : '#fff'
                              }}>
                                {sku.is_approved === 1 || sku.is_approved === true ? 'Approved' : 'Pending'}
                              </span>
                            </span>
                            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                              <button
                                style={{
                                  background: sku.is_active ? '#30ea03' : '#ccc',
                                  color: sku.is_active ? '#000' : '#666',
                                  border: 'none',
                                  borderRadius: 4,
                                  fontWeight: 'bold',
                                  padding: '3px 18px',
                                  cursor: 'pointer',
                                  marginLeft: 8,
                                  minWidth: 90,
                                  height: 24,
                                  margin: '5px 0px',
                                  fontSize: 12,
                                 
                                }}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!sku.is_active) {
                                    setPendingSkuId(sku.id);
                                    setPendingSkuStatus(sku.is_active);
                                    setShowConfirm(true);
                                  } else {
                                    handleHeaderStatusClick(sku.id, sku.is_active);
                                  }
                                }}
                              >
                                {sku.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </span>
                          </div>
                          <Collapse isOpened={openIndex === index}>
                            <div className="panel-body" style={{ minHeight: 80, padding: 24, position: 'relative' }}>
                              <div style={{ display: 'flex', marginBottom: 8, gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  {/* Only show Reference SKU if it has a value */}
                                  {sku.sku_reference && sku.sku_reference.trim() !== '' && (
                                    <p><strong>Reference SKU: </strong> {sku.sku_reference}</p>
                                  )}
                                  
                                  {/* Only show SKU Type if it has a value */}
                                  {sku.skutype && sku.skutype.trim() !== '' && (
                                    <p><strong>SKU Type: </strong> {sku.skutype}</p>
                                  )}
                                  
                                  {/* Only show Bulk/Expert if it has a value */}
                                  {sku.bulk_expert && sku.bulk_expert.trim() !== '' && (
                                    <p><strong>Bulk/Expert: </strong> {sku.bulk_expert}</p>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <button
                                    style={{
                                      background: '#30ea03',
                                      color: '#000',
                                      border: 'none',
                                      borderRadius: 6,
                                      fontWeight: 'bold',
                                      padding: '6px 12px',
                                      fontSize: 13,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      minWidth: 110
                                    }}
                                    title="Edit SKU"
                                    onClick={() => {
                                      if (!sku.is_active) {
                                        setShowInactiveModal(true);
                                      } else {
                                        console.log('SKU passed to Edit:', sku);
                                        handleEditSkuOpen(sku);
                                      }
                                    }}
                                  >
                                    <i className="ri-pencil-line" style={{ fontSize: 16, marginRight: 6 }} />
                                    <span>Edit SKU</span>
                                  </button>
                                  <button
                                    style={{
                                      background: '#30ea03',
                                      color: '#000',
                                      border: 'none',
                                      borderRadius: 6,
                                      fontWeight: 'bold',
                                      padding: '6px 12px',
                                      fontSize: 13,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      minWidth: 110
                                    }}
                                    title="Send for Approval"
                                    onClick={() => {
                                      if (!sku.is_active) {
                                        setShowInactiveModal(true);
                                      } else {
                                        navigate(`/sedforapproval?cmCode=${encodeURIComponent(cmCode || '')}&cmDescription=${encodeURIComponent(cmDescription)}`);
                                      }
                                    }}
                                  >
                                    <i className="ri-send-plane-2-line" style={{ fontSize: 16, marginRight: 6 }} />
                                    <span>Send for Approval</span>
                                  </button>
                                  <button
                                    className="add-sku-btn btnCommon btnGreen filterButtons"
                                    style={{ 
                                      backgroundColor: '#30ea03', 
                                      color: '#000', 
                                      minWidth: 110, 
                                      fontSize: 13,
                                      padding: '6px 12px',
                                      border: 'none',
                                      borderRadius: 6,
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    onClick={e => { 
                                      e.stopPropagation(); 
                                      if (!sku.is_active) {
                                        setShowInactiveModal(true);
                                      } else {
                                        setSelectedSkuCode(sku.sku_code); 
                                        setShowAddComponentModal(true);
                                      }
                                    }}
                                  >
                                    <span>Add Component</span>
                                    <i className="ri-add-circle-line" style={{ marginLeft: 5 }}></i>
                                  </button>
                                </div>
                              </div>
                             
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{ fontWeight: 600, marginRight: 8 }}>Material Type:</span>
                                <span style={{ marginRight: 8 }}>Packaging</span>
                                <input type="radio" name={`option-${sku.id}`} value="Option 1" style={{ marginRight: 8 }} />
                                <span style={{ marginRight: 8 }}>Raw Material</span>
                                <input type="radio" name={`option-${sku.id}`} value="Option 2" style={{ marginRight: 8 }} />
                              </div>
                              
                              {/* Component Table Header */}
                              <div style={{ 
                                background: '#f8f9fa', 
                                border: '1px solid #e9ecef',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                marginTop: '16px'
                              }}>
                                <div style={{ 
                                  padding: '8px 20px', 
                                  borderBottom: '1px solid #e9ecef',
                                  background: '#000',
                                  color: '#fff'
                                }}>
                                  <h6 style={{ 
                                    fontWeight: '600', 
                                    margin: '0',
                                    fontSize: '16px'
                                  }}>
                                    Component Details
                                  </h6>
                                </div>
                                
                                <div style={{ padding: '20px' }}>
                                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                                    <table style={{ 
                                      width: '100%', 
                                      borderCollapse: 'collapse',
                                      backgroundColor: '#fff',
                                      border: '1px solid #dee2e6'
                                    }}>
                                      <thead>
                                        <tr style={{ backgroundColor: '#000' }}>
                                          <th style={{ 
                                            padding: '8px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '80px'
                                          }}>
                                            Action
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '120px'
                                          }}>
                                            Active/Deactive
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '120px'
                                          }}>
                                            Component Type
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '120px'
                                          }}>
                                            Component Code
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component Description
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '140px'
                                          }}>
                                            Component validity date - From
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '140px'
                                          }}>
                                            Component validity date - To
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '130px'
                                          }}>
                                            Component Category
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '130px'
                                          }}>
                                            Component Quantity
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component Unit of Measure
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component Base Quantity
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '170px'
                                          }}>
                                            Component Base Unit of Measure
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '80px'
                                          }}>
                                            %w/w
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component Packaging Type
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '170px'
                                          }}>
                                            Component Packaging Material
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '130px'
                                          }}>
                                            Component Unit Weight
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '180px'
                                          }}>
                                            Component Weight Unit of Measure
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '200px'
                                          }}>
                                            % Mechanical Post-Consumer Recycled Content (inc. Chemical)
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '200px'
                                          }}>
                                            % Mechanical Post-Industrial Recycled Content
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            % Chemical Recycled Content
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '120px'
                                          }}>
                                            % Bio-sourced?
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '200px'
                                          }}>
                                            Material structure - multimaterials only (with % wt)
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '180px'
                                          }}>
                                            Component packaging colour / opacity
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component packaging level
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '180px'
                                          }}>
                                            Component dimensions (3D - LxWxH, 2D - LxW)
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {!componentDetails[sku.sku_code] ? (
                                          <tr>
                                            <td colSpan={25} style={{ 
                                              padding: '40px 20px', 
                                              textAlign: 'center', 
                                              color: '#666',
                                              fontSize: '14px'
                                            }}>
                                              <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                              </div>
                                              Loading component details...
                                            </td>
                                          </tr>
                                        ) : getFilteredComponents(sku.sku_code) && getFilteredComponents(sku.sku_code).length > 0 ? (
                                          getFilteredComponents(sku.sku_code).map((component: any, compIndex: number) => (
                                            <tr key={component.id || compIndex} style={{ backgroundColor: compIndex % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                  <button
                                                    style={{
                                                      background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
                                                      border: 'none',
                                                      color: '#000',
                                                      fontSize: '10px',
                                                      fontWeight: '600',
                                                      cursor: 'pointer',
                                                      padding: '2px',
                                                      borderRadius: '2px',
                                                      width: '18px',
                                                      height: '18px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center'
                                                    }}
                                                  
                                                    onClick={() => handleEditComponent(component)}
                                                    title="Edit Component"
                                                  >
                                                    <i className="ri-edit-line" />
                                                  </button>
                                                  <button
                                                    style={{
                                                      background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                                                      border: 'none',
                                                      color: '#fff',
                                                      fontSize: '10px',
                                                      fontWeight: '600',
                                                      cursor: 'pointer',
                                                      padding: '2px',
                                                      borderRadius: '2px',
                                                      width: '18px',
                                                      height: '18px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center'
                                                    }}
                                                    onClick={() => {/* Add view functionality */}}
                                                    title="View Component"
                                                  >
                                                    <i className="ri-eye-line" />
                                                  </button>
                                                </div>
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={component.is_active || false}
                                                  onChange={() => handleComponentStatusClick(component.id, component.is_active, sku.sku_code)}
                                                  style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer',
                                                    accentColor: '#30ea03'
                                                  }}
                                                  title={component.is_active ? 'Deactivate Component' : 'Activate Component'}
                                                />
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                {component.material_type_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                {component.component_code || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_description || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_valid_from ? new Date(component.component_valid_from).toLocaleDateString() : 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_valid_to ? new Date(component.component_valid_to).toLocaleDateString() : 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_material_group || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_quantity || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_uom_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_base_quantity || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_base_uom_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_w_w || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_packaging_type_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_packaging_material || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_unit_weight || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.weight_unit_measure_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_mechanical_pcr_content || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_mechanical_pir_content || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_chemical_recycled_content || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_bio_sourced || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.material_structure_multimaterials || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_packaging_color_opacity || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_packaging_level_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                {component.component_dimensions || 'N/A'}
                                              </td>
                                            </tr>
                                          ))
                                        ) : (
                                          <tr>
                                            <td colSpan={25} style={{ 
                                              padding: '40px 20px', 
                                              textAlign: 'center', 
                                              color: '#666',
                                              fontSize: '14px',
                                              fontStyle: 'italic'
                                            }}>
                                              No component data available
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Collapse>
                        </div>
                      ))}
                    </div>
                  )}
                </>
            )}
          </div>
        )}
      </div>

      {/* SKU Modal */}
      {showSkuModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxHeight: '95vh', margin: '1vh auto' }}>
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: 'rgb(48, 234, 3)', color: '#000', borderBottom: '2px solid #000', alignItems: 'center' }}>
                <h5 className="modal-title" style={{ color: '#000', fontWeight: 700, flex: 1 }}>Add SKU Details</h5>
                {/* Only one close button, styled black, large, right-aligned */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSkuModal(false);
                    // Reset all form fields
                    setAddSku('');
                    setAddSkuDescription('');
                    setAddSkuFormulationReference('');
                    setAddSkuPeriod('');
                    setAddSkuType('internal');
                    setAddSkuReference('');
                    setAddSkuNameSite('');
                    setAddSkuDropdownValue('');
                    setShowReferenceSkuSection(true);
                    setShowSkuTypeSection(false);
                    setSkuSearchResults([]);
                    setShowSkuSearchResults(false);
                    setSelectedSkuComponents([]);
                    setShowComponentTable(false);
                    setComponentsToSave([]);
                    setAddSkuErrors({ sku: '', skuDescription: '', period: '', skuType: '', referenceSku: '', site: '', contractor: '', server: '' });
                    setAddSkuSuccess('');
                  }}
                  aria-label="Close"
                  style={{
                    background: '#000',
                    border: 'none',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: 'pointer',
                    marginLeft: 8,
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    marginRight: 20,
                  }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body" style={{ background: '#fff' }}>
                <div className="container-fluid">
                  <div className="row g-3">
                    {/* Reporting Period dropdown */}
                    <div className="col-md-6">
                      <label>
                        Reporting Period <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Select the reporting period for this SKU entry", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <div style={{ position: 'relative' }}>
                                                        <select
                                  className={`form-control${addSkuErrors.period ? ' is-invalid' : ''}`}
                                  value={addSkuPeriod}
                                  onChange={e => {
                                    const newPeriod = e.target.value;
                                    setAddSkuPeriod(newPeriod);
                                    // Reset both 3PM and Reference SKU when period changes
                                    setAddSkuContractor('');
                                    setAddSkuReference('');
                                    setReferenceSkuOptions([]);
                                  }}
                                  disabled={addSkuLoading}
                                  style={{ 
                                    appearance: 'none',
                                    paddingRight: '30px'
                                  }}
                                >
                          {years.map(year => (
                            <option key={year.id} value={year.id}>{year.period}</option>
                          ))}
                        </select>
                        <i 
                          className="ri-arrow-down-s-line" 
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#666',
                            fontSize: '16px'
                          }}
                        />
                      </div>
                      {addSkuErrors.period && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.period}</div>}
                    </div>
                    {/* SKU text field */}
                    <div className="col-md-6">
                      <label>
                        SKU Code <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Enter the unique SKU (Stock Keeping Unit) code identifier", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input
                        type="text"
                        className={`form-control${addSkuErrors.sku ? ' is-invalid' : ''}`}
                        value={addSku}
                        onChange={e => setAddSku(e.target.value)}
                        onBlur={() => {
                          // Validate when leaving SKU Code field
                          if (addSku.trim() && addSkuReference.trim() && 
                              addSku.trim().toLowerCase() === addSkuReference.trim().toLowerCase()) {
                            setAddSkuErrors(prev => ({ ...prev, referenceSku: 'Reference SKU can be the same as SKU Code' }));
                          }
                        }}
                        disabled={addSkuLoading}
                      />
                      {addSkuErrors.sku && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.sku}</div>}
                    </div>
                    {/* SKU Description text field */}
                    <div className="col-md-6">
                      <label>
                        SKU Description <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Provide a detailed description of the SKU", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input
                        type="text"
                        className={`form-control${addSkuErrors.skuDescription ? ' is-invalid' : ''}`}
                        value={addSkuDescription}
                        onChange={e => setAddSkuDescription(e.target.value)}
                        disabled={addSkuLoading}
                      />
                      {addSkuErrors.skuDescription && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.skuDescription}</div>}
                    </div>
                    {/* Formulation Reference text field */}
                    <div className="col-md-6">
                      <label>
                        Formulation Reference
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Enter the formulation reference for this SKU (optional)", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={addSkuFormulationReference}
                        onChange={e => setAddSkuFormulationReference(e.target.value)}
                        placeholder="Enter Formulation Reference"
                        disabled={addSkuLoading}
                      />
                    </div>
                    {/* New dropdown above reference SKU checkbox */}
                    <div className="col-md-6">
                                             <label>
                         Select an option (non-mandatory)
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                                                         showTooltip("Select 'first' or 'second' to hide the reference SKU section. This field is non-mandatory.", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <select
                          className="form-control"
                          value={addSkuDropdownValue}
                          onChange={e => {
                            const selectedValue = e.target.value;
                            setAddSkuDropdownValue(selectedValue);
                            setShowReferenceSkuSection(selectedValue === '');
                          }}
                          disabled={addSkuLoading}
                          style={{ 
                            appearance: 'none',
                            paddingRight: '30px'
                          }}
                        >
                          <option value="">Select an option</option>
                          <option value="bulk">Bulk</option>
                          <option value="expert">Expert</option>
                        </select>
                        <i 
                          className="ri-arrow-down-s-line" 
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#666',
                            fontSize: '16px'
                          }}
                        />
                      </div>
                    </div>
                    {/* SKU Type Visibility Checkbox */}
                    {showReferenceSkuSection && (
                      <div className="col-md-12">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '10px' }}>
                          <input
                            type="checkbox"
                            checked={showSkuTypeSection}
                            onChange={e => setShowSkuTypeSection(e.target.checked)}
                            disabled={addSkuLoading}
                            style={{ marginRight: '8px' }}
                          />
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>Do you want to add the reference SKU?</span>
                          <span 
                            style={{ 
                              marginLeft: '8px', 
                              cursor: 'pointer', 
                              color: '#888',
                              fontSize: '16px',
                              transition: 'color 0.2s ease'
                            }} 
                            onMouseEnter={(e) => {
                              showTooltip("Check this box if you want to add a reference SKU for this entry", e);
                              e.currentTarget.style.color = '#30ea03';
                            }}
                            onMouseLeave={(e) => {
                              hideTooltip();
                              e.currentTarget.style.color = '#888';
                            }}
                          >
                            <i className="ri-information-line"></i>
                          </span>
                        </label>
                      </div>
                    )}
                    
                    {/* Entire SKU Type section - controlled by checkbox */}
                    {showSkuTypeSection && (
                      <>
                        {/* SKU Type radio buttons - Full row */}
                        <div className="col-md-12">
                          <label>Reference SKU</label>
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', gap: '20px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0 }}>
                                <input
                                  type="radio"
                                  name="skuType"
                                  value="internal"
                                  checked={addSkuType === 'internal'}
                                  onChange={e => setAddSkuType(e.target.value)}
                                  disabled={addSkuLoading}
                                  style={{ marginRight: '8px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Internal</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0 }}>
                                <input
                                  type="radio"
                                  name="skuType"
                                  value="external"
                                  checked={addSkuType === 'external'}
                                  onChange={e => setAddSkuType(e.target.value)}
                                  disabled={addSkuLoading}
                                  style={{ marginRight: '8px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>External</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        
                        {/* Conditional fields based on SKU Type */}
                        {addSkuType === 'internal' && (
                          <>
                            <div className="col-md-6">
                              <label>
                                Reference SKU <span style={{ color: 'red' }}>*</span>
                                <span 
                                  style={{ 
                                    marginLeft: '8px', 
                                    cursor: 'pointer', 
                                    color: '#888',
                                    fontSize: '16px',
                                    transition: 'color 0.2s ease'
                                  }} 
                                  onMouseEnter={(e) => {
                                    showTooltip("Enter the reference SKU code for internal SKU type", e);
                                    e.currentTarget.style.color = '#30ea03';
                                  }}
                                  onMouseLeave={(e) => {
                                    hideTooltip();
                                    e.currentTarget.style.color = '#888';
                                  }}
                                >
                                  <i className="ri-information-line"></i>
                                </span>
                              </label>
                              <input
                                type="text"
                                className={`form-control${addSkuErrors.referenceSku ? ' is-invalid' : ''}`}
                                value={addSkuReference}
                                onChange={e => {
                                  setAddSkuReference(e.target.value);
                                  validateReferenceSku(e.target.value);
                                }}
                                placeholder="Enter Reference SKU"
                                disabled={addSkuLoading}
                              />
                              {addSkuErrors.referenceSku && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.referenceSku}</div>}
                            </div>
                            <div className="col-md-6">
                              <label>
                                Site <span style={{ color: 'red' }}>*</span>
                                <span 
                                  style={{ 
                                    marginLeft: '8px', 
                                    cursor: 'pointer', 
                                    color: '#888',
                                    fontSize: '16px',
                                    transition: 'color 0.2s ease'
                                  }} 
                                  onMouseEnter={(e) => {
                                    showTooltip("Select the site location for this internal SKU", e);
                                    e.currentTarget.style.color = '#30ea03';
                                  }}
                                  onMouseLeave={(e) => {
                                    hideTooltip();
                                    e.currentTarget.style.color = '#888';
                                  }}
                                >
                                  <i className="ri-information-line"></i>
                                </span>
                              </label>
                              <div style={{ position: 'relative' }}>
                                <select
                                  className={`form-control${addSkuErrors.site ? ' is-invalid' : ''}`}
                                  value={addSkuNameSite}
                                  onChange={e => setAddSkuNameSite(e.target.value)}
                                  disabled={addSkuLoading}
                                  style={{ 
                                    appearance: 'none',
                                    paddingRight: '30px'
                                  }}
                                >
                                  <option value="">Select Site</option>
                                  <option value="Montreal">Montreal</option>
                                  <option value="Guyana">Guyana</option>
                                </select>
                                {addSkuErrors.site && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.site}</div>}
                                <i 
                                  className="ri-arrow-down-s-line" 
                                  style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    color: '#666',
                                    fontSize: '16px'
                                  }}
                                />
                              </div>
                            </div>
                          </>
                        )}
                        {/* ===== EXTERNAL SKU SECTIONS ===== */}
                        {addSkuType === 'external' && (
                          <>
                            {/* Section 1: 3PM Dropdown */}
                            <div className="col-md-6">
                              <label>
                                3PM <span style={{ color: 'red' }}>*</span>
                                <span 
                                  style={{ 
                                    marginLeft: '8px', 
                                    cursor: 'pointer', 
                                    color: '#888',
                                    fontSize: '16px',
                                    transition: 'color 0.2s ease'
                                  }} 
                                  onMouseEnter={(e) => {
                                    showTooltip("Select the Third Party Manufacturer (3PM) for this external SKU", e);
                                    e.currentTarget.style.color = '#30ea03';
                                  }}
                                  onMouseLeave={(e) => {
                                    hideTooltip();
                                    e.currentTarget.style.color = '#888';
                                  }}
                                >
                                  <i className="ri-information-line"></i>
                                </span>
                              </label>
                              <div style={{ position: 'relative' }}>
                                <select
                                  className={`form-control${addSkuErrors.contractor ? ' is-invalid' : ''}`}
                                  value={addSkuContractor}
                                  onChange={e => {
                                    const selectedCmCode = e.target.value;
                                    setAddSkuContractor(selectedCmCode);
                                    
                                    // Reset Reference SKU when 3PM changes
                                    setAddSkuReference('');
                                    setReferenceSkuOptions([]);
                                    setSelectedSkuComponents([]);
                                    setShowComponentTable(false);
                                    
                                    // Fetch Reference SKU options when 3PM is selected
                                    if (selectedCmCode) {
                                      fetchReferenceSkuOptions('', selectedCmCode);
                                    }
                                  }}
                                  disabled={addSkuLoading}
                                  style={{ 
                                    appearance: 'none',
                                    paddingRight: '30px'
                                  }}
                                >
                                  <option value="">Select 3PM</option>
                                  {threePmLoading ? (
                                    <option value="" disabled>Loading 3PM options...</option>
                                  ) : (
                                    threePmOptions.map((option, index) => (
                                      <option key={index} value={option.cm_code}>
                                        {option.cm_code}{option.cm_description ? ` - ${option.cm_description}` : ''}
                                      </option>
                                    ))
                                  )}
                                </select>
                                {addSkuErrors.contractor && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.contractor}</div>}
                                <i 
                                  className="ri-arrow-down-s-line" 
                                  style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    color: '#666',
                                    fontSize: '16px'
                                  }}
                                />
                              </div>
                            </div>

                            {/* Section 2: Reference SKU Dropdown */}
                            <div className="col-md-6">
                              <label>
                                Reference SKU <span style={{ color: 'red' }}>*</span>
                                <span 
                                  style={{ 
                                    marginLeft: '8px', 
                                    cursor: 'pointer', 
                                    color: '#888',
                                    fontSize: '16px',
                                    transition: 'color 0.2s ease'
                                  }} 
                                  onMouseEnter={(e) => {
                                    showTooltip("Select the reference SKU from the chosen 3PM for this external SKU", e);
                                    e.currentTarget.style.color = '#30ea03';
                                  }}
                                  onMouseLeave={(e) => {
                                    hideTooltip();
                                    e.currentTarget.style.color = '#888';
                                  }}
                                >
                                  <i className="ri-information-line"></i>
                                </span>
                              </label>
                              <div style={{ position: 'relative' }}>
                                <select
                                  className={`form-control${addSkuErrors.referenceSku ? ' is-invalid' : ''}`}
                                  value={addSkuReference}
                                  onChange={e => {
                                    const selectedValue = e.target.value;
                                    setAddSkuReference(selectedValue);
                                    validateReferenceSku(selectedValue);
                                    
                                    // Additional validation when Reference SKU is selected
                                    if (selectedValue && addSku.trim() && 
                                        selectedValue.toLowerCase() === addSku.trim().toLowerCase()) {
                                      console.log('Setting reference SKU error message');
                                      setAddSkuErrors(prev => ({ ...prev, referenceSku: 'Reference SKU can be the same as SKU Code' }));
                                    }
                                    
                                    // Fetch component details when Reference SKU is selected using new API
                                    if (selectedValue && addSkuContractor) {
                                      fetchComponentDetailsFromNewAPI(addSkuContractor, selectedValue);
                                      setShowComponentTable(true);
                                    } else if (selectedValue && !addSkuContractor) {
                                      // Show error if Reference SKU is selected but no 3PM is selected
                                      setAddSkuErrors(prev => ({ ...prev, referenceSku: 'Please select 3PM first' }));
                                      setShowComponentTable(false);
                                      setSelectedSkuComponents([]);
                                    } else {
                                      setShowComponentTable(false);
                                      setSelectedSkuComponents([]);
                                    }
                                  }}
                                  disabled={addSkuLoading || referenceSkuLoading || !addSkuContractor}
                                  style={{ 
                                    appearance: 'none',
                                    paddingRight: '30px'
                                  }}
                                >
                                  <option value="">{!addSkuContractor ? 'Please select 3PM first' : 'Select Reference SKU'}</option>
                                  {referenceSkuLoading ? (
                                    <option value="" disabled>Loading Reference SKUs...</option>
                                  ) : (
                                    referenceSkuOptions.map((option, index) => (
                                      <option key={index} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))
                                  )}
                                </select>
                                <i 
                                  className="ri-arrow-down-s-line" 
                                  style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    color: '#666',
                                    fontSize: '16px'
                                  }}
                                />
                              </div>
                              {addSkuErrors.referenceSku && (
                                <div className="invalid-feedback" style={{ 
                                  color: 'red', 
                                  display: 'block',
                                  fontSize: '12px',
                                  marginTop: '5px'
                                }}>
                                  {addSkuErrors.referenceSku}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        
                        {/* Component Table for External SKU */}
                        {addSkuType === 'external' && showComponentTable && (
                          <div className="col-md-12">
                            {skuSearchLoading ? (
                              <div className="col-md-12 text-center" style={{ padding: '20px' }}>
                                <div className="spinner-border text-primary" role="status">
                                  <span className="visually-hidden">Loading components...</span>
                                </div>
                                <p style={{ marginTop: '10px', color: '#666' }}>Loading components...</p>
                              </div>
                            ) : materialTypes.length === 0 ? (
                              <div className="col-md-12 text-center" style={{ padding: '20px' }}>
                                <div className="spinner-border text-warning" role="status">
                                  <span className="visually-hidden">Loading master data...</span>
                                </div>
                                <p style={{ marginTop: '10px', color: '#666' }}>
                                  Loading master data... ({materialTypes.length} material types loaded)
                                </p>
                                <button 
                                  className="btn btn-sm btn-outline-primary mt-2"
                                  onClick={async () => {
                                    console.log('Manual refresh clicked');
                                    try {
                                      // Try direct master data API first
                                      const result = await apiGet('/get-masterdata');
                                      if (result.success && result.data) {
                                        console.log('Direct master data API success:', result.data);
                                        if (result.data.material_types) {
                                          setMaterialTypes(result.data.material_types);
                                          console.log('Material types set directly:', result.data.material_types.length);
                                        }
                                        if (result.data.component_uoms) {
                                          setUnitOfMeasureOptions(result.data.component_uoms);
                                        }
                                        if (result.data.packaging_levels) {
                                          setPackagingLevelOptions(result.data.packaging_levels);
                                        }
                                        if (result.data.packaging_materials) {
                                          setPackagingMaterialOptions(result.data.packaging_materials);
                                        }
                                        if (result.data.component_base_uoms) {
                                          setComponentBaseUoms(result.data.component_base_uoms);
                                        }
                                      } else {
                                        // Fallback to dashboard data
                                        fetchDashboardData();
                                      }
                                    } catch (error) {
                                      console.error('Direct master data API failed:', error);
                                      // Fallback to dashboard data
                                      fetchDashboardData();
                                    }
                                  }}
                                >
                                  Refresh Master Data
                                </button>
                              </div>
                            ) : selectedSkuComponents.length > 0 ? (
                              <div className="col-md-12">
                                <div style={{ 
                                  marginTop: '20px',
                                  border: '1px solid #ddd',
                                  borderRadius: '8px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    backgroundColor: '#f8f9fa',
                                    padding: '12px 16px',
                                    borderBottom: '1px solid #ddd',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                  }}>
                                    Components for SKU Reference: {addSkuReference}
                                  </div>
                                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <table className="table table-striped table-hover" style={{ marginBottom: 0 }}>
                                      <thead style={{ backgroundColor: '#f8f9fa' }}>
                                        <tr>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Select</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Component Code</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Description</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Formulation Ref</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Material Type</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Components Ref</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Valid From</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Valid To</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Material Group</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Quantity</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>UOM ID</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Base Quantity</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Base UOM</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>% w/w</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Packaging Type</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Packaging Material</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Unit Weight</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Weight UOM</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>% PCR</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>% PIR</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>% Chemical</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>% Bio Sourced</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Material Structure</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Color/Opacity</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Packaging Level</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Dimensions</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Created Date</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>CM Code</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Periods</th>
                                          <th style={{ padding: '8px', fontSize: '10px' }}>Active</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {selectedSkuComponents.map((component, index) => (
                                          <tr key={index}>
                                            <td style={{ padding: '4px 6px', fontSize: '9px', textAlign: 'center' }}>
                                              <input
                                                type="checkbox"
                                                checked={selectedComponentIds.includes(component.id)}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setSelectedComponentIds([...selectedComponentIds, component.id]);
                                                  } else {
                                                    setSelectedComponentIds(selectedComponentIds.filter(id => id !== component.id));
                                                  }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                              />
                                            </td>

                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_code}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_description}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.formulation_reference || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getMaterialTypeName(component.material_type_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.components_reference || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_valid_from ? new Date(component.component_valid_from).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_valid_to ? new Date(component.component_valid_to).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_material_group || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_quantity}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getUomName(component.component_uom_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_base_quantity || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getBaseUomName(component.component_base_uom_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_w_w}%</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getPackagingMaterialName(component.component_packaging_type_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_packaging_material || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_unit_weight || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getUomName(component.weight_unit_measure_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_mechanical_pcr_content || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_mechanical_pir_content || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_chemical_recycled_content || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_bio_sourced || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.material_structure_multimaterials || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_packaging_color_opacity || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getPackagingLevelName(component.component_packaging_level_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_dimensions || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.created_date ? new Date(component.created_date).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.cm_code}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.periods}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.is_active ? 'Yes' : 'No'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="col-md-12 text-center" style={{ padding: '20px' }}>
                                <p style={{ color: '#666' }}>No components found for the selected Reference SKU</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    
                   
                  </div>
                  {addSkuErrors.server && <div style={{ color: 'red', marginTop: 16, fontWeight: 600 }}>{addSkuErrors.server}</div>}
                  {addSkuSuccess && <div style={{ color: '#30ea03', marginTop: 16, fontWeight: 600 }}>{addSkuSuccess}</div>}
                </div>
              </div>
              {/* Professional footer, white bg, black top border, Save button right-aligned */}
              <div className="modal-footer" style={{ background: '#fff', borderTop: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                {/* Mandatory fields note - positioned as shown in image */}
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '12px 16px', 
                  borderRadius: '6px', 
                  border: '1px solid #e9ecef',
                  fontSize: '14px',
                  color: '#495057',
                  marginLeft: '0',
                  flex: '0 0 auto'
                }}>
                  <i className="ri-information-line" style={{ marginRight: 8, color: '#30ea03' }} />
                  <strong>Note:</strong> Fields marked with <span style={{ color: 'red', fontWeight: 'bold' }}>*</span> are mandatory.
                </div>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: 'rgb(48, 234, 3)', border: 'none', color: '#000', minWidth: 100, fontWeight: 600 }}
                  onClick={handleAddSkuSave}
                  disabled={addSkuLoading}
                  onMouseOver={e => e.currentTarget.style.color = '#fff'}
                  onMouseOut={e => e.currentTarget.style.color = '#000'}
                >
                  {addSkuLoading ? 'Saving...' : 'Save'}

                  
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditSkuModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxHeight: '95vh', margin: '1vh auto' }}>
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: 'rgb(48, 234, 3)', color: '#000', borderBottom: '2px solid #000', alignItems: 'center' }}>
                <h5 className="modal-title" style={{ color: '#000', fontWeight: 700, flex: 1 }}>Edit SKU Details</h5>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSkuModal(false);
                    // Reset Edit SKU dropdown variables
                    setEditSkuDropdownValue('');
                    setEditShowReferenceSkuSection(true);
                  }}
                  aria-label="Close"
                  style={{
                    background: '#000',
                    border: 'none',
                    color: '#fff',
                    fontSize: 32,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: 'pointer',
                    marginLeft: 8,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body" style={{ background: '#fff' }}>
                <div className="container-fluid">
                  <div className="row g-3">
                    {/* Reporting Period */}
                    <div className="col-md-6">
                      <label>
                        Reporting Period <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("The reporting period for this SKU (read-only)", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <select
                        className="form-control"
                        value={editSkuData.period}
                        disabled={true}
                        style={{ 
                          background: '#f5f5f5', 
                          cursor: 'not-allowed',
                          appearance: 'none',
                          paddingRight: '30px'
                        }}
                      >
                        {years.map(year => (
                          <option key={year.id} value={year.id}>{year.period}</option>
                        ))}
                      </select>
                    </div>
                    {/* SKU */}
                    <div className="col-md-6">
                      <label>
                        SKU <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("The unique SKU code identifier (read-only)", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.sku}
                        readOnly
                        style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                    </div>
                    {/* SKU Description */}
                    <div className="col-md-6">
                      <label>
                        SKU Description <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Provide a detailed description of the SKU", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input
                        type="text"
                        className={`form-control${editSkuErrors.skuDescription ? ' is-invalid' : ''}`}
                        value={editSkuData.skuDescription}
                        onChange={e => setEditSkuData({ ...editSkuData, skuDescription: e.target.value })}
                        disabled={editSkuLoading}
                      />
                      {editSkuErrors.skuDescription && <div className="invalid-feedback" style={{ color: 'red' }}>{editSkuErrors.skuDescription}</div>}
                    </div>
                    {/* Formulation Reference text field - Editable */}
                    <div className="col-md-6">
                      <label>
                        Formulation Reference
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Enter the formulation reference for this SKU (optional)", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.formulationReference}
                        onChange={e => setEditSkuData({ ...editSkuData, formulationReference: e.target.value })}
                        disabled={editSkuLoading}
                      />
                    </div>
                    {/* New dropdown above reference SKU checkbox in Edit modal */}
                    <div className="col-md-6">
                      <label>
                        Select an option (non-mandatory)
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Select 'first' or 'second' to hide the reference SKU section. This field is non-mandatory.", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <select
                          className="form-control"
                          value={editSkuDropdownValue}
                          onChange={e => {
                            const selectedValue = e.target.value;
                            setEditSkuDropdownValue(selectedValue);
                            setEditShowReferenceSkuSection(selectedValue === '');
                          }}
                          disabled={true}
                          style={{ 
                            appearance: 'none',
                            paddingRight: '30px'
                          }}
                        >
                          <option value="">Select an option</option>
                          <option value="bulk">Bulk</option>
                          <option value="expert">Expert</option>
                        </select>
                        <i 
                          className="ri-arrow-down-s-line" 
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#666',
                            fontSize: '16px'
                          }}
                        />
                      </div>
                    </div>
                    {/* Do you want to add the reference SKU? checkbox */}
                    {editShowReferenceSkuSection && (
                      <div className="col-md-12">
                      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          checked={editShowReferenceSku}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Show confirmation modal when checking
                              setShowReferenceSkuConfirmModal(true);
                            } else {
                              // Reset reference SKU fields when unchecking
                              setEditShowReferenceSku(false);
                              setEditSkuContractor('');
                              setEditSkuReference('');
                              setEditSelectedSkuComponents([]);
                              setShowEditComponentTable(false);
                              setEditReferenceSkuOptions([]);
                            }
                          }}
                          disabled={editSkuLoading}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Do you want to add/edit the reference SKU?</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Check this box if you want to add a reference SKU for this entry", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      </div>
                    )}

                    {/* Reference SKU section - only show if checkbox is checked */}
                    {editShowReferenceSku && (
                      <>
                        {/* SKU Type radio buttons - Editable */}
                        <div className="col-md-12">
                          <label>
                            Reference SKU
                            <span 
                              style={{ 
                                marginLeft: '8px', 
                                cursor: 'pointer', 
                                color: '#888',
                                fontSize: '16px',
                                transition: 'color 0.2s ease'
                              }} 
                              onMouseEnter={(e) => {
                                showTooltip("Select the reference SKU type for this entry", e);
                                e.currentTarget.style.color = '#30ea03';
                              }}
                              onMouseLeave={(e) => {
                                hideTooltip();
                                e.currentTarget.style.color = '#888';
                              }}
                            >
                              <i className="ri-information-line"></i>
                            </span>
                          </label>
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', gap: '20px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
                                <input
                                  type="radio"
                                  name="editSkuType"
                                  value="internal"
                                  checked={editSkuData.skuType === 'internal'}
                                  onChange={e => {
                                    setEditSkuData({ ...editSkuData, skuType: e.target.value });
                                    // Reset reference SKU fields when changing SKU type
                                    setEditSkuContractor('');
                                    setEditSkuReference('');
                                    setEditSelectedSkuComponents([]);
                                    setShowEditComponentTable(false);
                                    setEditReferenceSkuOptions([]);
                                  }}
                                  disabled={editSkuLoading}
                                  style={{ marginRight: '8px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Internal</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
                                <input
                                  type="radio"
                                  name="editSkuType"
                                  value="external"
                                  checked={editSkuData.skuType === 'external'}
                                  onChange={e => {
                                    setEditSkuData({ ...editSkuData, skuType: e.target.value });
                                    // Reset reference SKU fields when changing SKU type
                                    setEditSkuContractor('');
                                    setEditSkuReference('');
                                    setEditSelectedSkuComponents([]);
                                    setShowEditComponentTable(false);
                                    setEditReferenceSkuOptions([]);
                                  }}
                                  disabled={editSkuLoading}
                                  style={{ marginRight: '8px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>External</span>
                              </label>
                            </div>
                          </div>
                          {editSkuErrors.skuType && <div className="invalid-feedback" style={{ color: 'red', display: 'block' }}>{editSkuErrors.skuType}</div>}
                        </div>
                      </>
                    )}
                    {/* Conditional fields based on SKU Type - Editable (only show if checkbox is checked) */}
                    {editShowReferenceSku && editSkuData.skuType === 'internal' && (
                      <>
                        <div className="col-md-6">
                          <label>
                            Reference SKU <span style={{ color: 'red' }}>*</span>
                            <span 
                              style={{ 
                                marginLeft: '8px', 
                                cursor: 'pointer', 
                                color: '#888',
                                fontSize: '16px',
                                transition: 'color 0.2s ease'
                              }} 
                              onMouseEnter={(e) => {
                                showTooltip("Enter the reference SKU code for internal SKU type", e);
                                e.currentTarget.style.color = '#30ea03';
                              }}
                              onMouseLeave={(e) => {
                                hideTooltip();
                                e.currentTarget.style.color = '#888';
                              }}
                            >
                              <i className="ri-information-line"></i>
                            </span>
                          </label>
                          <input
                            type="text"
                            className={`form-control${editSkuErrors.referenceSku ? ' is-invalid' : ''}`}
                            value={editSkuReference}
                            onChange={(e) => setEditSkuReference(e.target.value)}
                            disabled={editSkuLoading}
                          />
                          {editSkuErrors.referenceSku && <div className="invalid-feedback" style={{ color: 'red' }}>{editSkuErrors.referenceSku}</div>}
                        </div>
                        <div className="col-md-6">
                          <label>
                            Name Site <span style={{ color: 'red' }}>*</span>
                            <span 
                              style={{ 
                                marginLeft: '8px', 
                                cursor: 'pointer', 
                                color: '#888',
                                fontSize: '16px',
                                transition: 'color 0.2s ease'
                              }} 
                              onMouseEnter={(e) => {
                                showTooltip("Select the site name for this internal SKU", e);
                                e.currentTarget.style.color = '#30ea03';
                              }}
                              onMouseLeave={(e) => {
                                hideTooltip();
                                e.currentTarget.style.color = '#888';
                              }}
                            >
                              <i className="ri-information-line"></i>
                            </span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <select
                              className={`form-control${editSkuErrors.site ? ' is-invalid' : ''}`}
                              value={editSkuData.skuNameSite}
                              onChange={(e) => setEditSkuData({ ...editSkuData, skuNameSite: e.target.value })}
                              disabled={editSkuLoading}
                              style={{ 
                                appearance: 'none',
                                paddingRight: '30px'
                              }}
                            >
                              <option value="">Select Site</option>
                              <option value="Montreal">Montreal</option>
                              <option value="Guyana">Guyana</option>
                            </select>
                            {editSkuErrors.site && <div className="invalid-feedback" style={{ color: 'red' }}>{editSkuErrors.site}</div>}
                            <i 
                              className="ri-arrow-down-s-line" 
                              style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                color: '#666',
                                fontSize: '16px'
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {editShowReferenceSku && editSkuData.skuType === 'external' && (
                      <>
                        <div className="col-md-6">
                          <label>
                            3PM <span style={{ color: 'red' }}>*</span>
                            <span 
                              style={{ 
                                marginLeft: '8px', 
                                cursor: 'pointer', 
                                color: '#888',
                                fontSize: '16px',
                                transition: 'color 0.2s ease'
                              }} 
                              onMouseEnter={(e) => {
                                showTooltip("Select the Third Party Manufacturer (3PM) for this external SKU", e);
                                e.currentTarget.style.color = '#30ea03';
                              }}
                              onMouseLeave={(e) => {
                                hideTooltip();
                                e.currentTarget.style.color = '#888';
                              }}
                            >
                              <i className="ri-information-line"></i>
                            </span>
                          </label>
                          <select
                            className={`form-control${editSkuErrors.contractor ? ' is-invalid' : ''}`}
                            value={editSkuContractor}
                            onChange={(e) => {
                              setEditSkuContractor(e.target.value);
                              setEditSkuReference('');
                              setEditSelectedSkuComponents([]);
                              setShowEditComponentTable(false);
                              if (e.target.value) {
                                fetchEditReferenceSkuOptions(editSkuData.period, e.target.value);
                              } else {
                                setEditReferenceSkuOptions([]);
                              }
                            }}
                            disabled={editSkuLoading}
                          >
                            <option value="">Select 3PM</option>
                            {threePmOptions.map(option => (
                              <option key={option.cm_code} value={option.cm_code}>
                                {option.cm_code} - {option.cm_description || ''}
                              </option>
                            ))}
                          </select>
                          {editSkuErrors.contractor && <div className="invalid-feedback" style={{ color: 'red' }}>{editSkuErrors.contractor}</div>}
                        </div>
                        <div className="col-md-6">
                          <label>
                            Reference SKU <span style={{ color: 'red' }}>*</span>
                            <span 
                              style={{ 
                                marginLeft: '8px', 
                                cursor: 'pointer', 
                                color: '#888',
                                fontSize: '16px',
                                transition: 'color 0.2s ease'
                              }} 
                              onMouseEnter={(e) => {
                                showTooltip("Select the reference SKU from the chosen 3PM for this external SKU", e);
                                e.currentTarget.style.color = '#30ea03';
                              }}
                              onMouseLeave={(e) => {
                                hideTooltip();
                                e.currentTarget.style.color = '#888';
                              }}
                            >
                              <i className="ri-information-line"></i>
                            </span>
                          </label>
                          <select
                            className={`form-control${editSkuErrors.referenceSku ? ' is-invalid' : ''}`}
                            value={editSkuReference}
                            onChange={(e) => {
                              setEditSkuReference(e.target.value);
                              if (e.target.value) {
                                // Fetch component details for the selected reference SKU
                                fetchComponentDetails(e.target.value);
                              } else {
                                setEditSelectedSkuComponents([]);
                                setShowEditComponentTable(false);
                              }
                            }}
                            disabled={editSkuLoading || !editSkuContractor || editReferenceSkuLoading}
                          >
                            <option value="">Select Reference SKU</option>
                            {editReferenceSkuOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {editSkuErrors.referenceSku && <div className="invalid-feedback" style={{ color: 'red' }}>{editSkuErrors.referenceSku}</div>}
                        </div>
                      </>
                    )}
                    
                    {/* Warning message for Edit SKU Reference SKU */}
                    {editShowReferenceSku && (
                      <div className="col-md-12">
                        <div style={{ 
                          backgroundColor: '#fff3cd', 
                          border: '1px solid #ffeaa7', 
                          borderRadius: '6px', 
                          padding: '12px 16px', 
                          marginTop: '16px',
                          marginBottom: '16px'
                        }}>
                          <div style={{ 
                            color: '#d63031', 
                            fontSize: '13px', 
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <i className="ri-error-warning-line" style={{ marginRight: '8px', fontSize: '16px' }}></i>
                            If you will edit, all the existing components will be removed and new components with referenced SKU will be added
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Component Table for External SKU */}
                    {editSkuData.skuType === 'external' && showEditComponentTable && (
                      <div className="col-md-12">
                        {(() => {
                          if (editModalLoading || materialTypes.length === 0) {
                            return (
                              <div className="col-md-12 text-center" style={{ padding: '20px' }}>
                                <div className="spinner-border text-warning" role="status">
                                  <span className="visually-hidden">Loading master data...</span>
                                </div>
                                <p style={{ marginTop: '10px', color: '#666' }}>
                                  Loading master data... ({materialTypes.length} material types loaded)
                                </p>
                              </div>
                            );
                          } else if (editSelectedSkuComponents.length > 0) {
                            return (
                              <div style={{ 
                                marginTop: '20px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  backgroundColor: '#f8f9fa',
                                  padding: '12px 16px',
                                  borderBottom: '1px solid #ddd',
                                  fontWeight: '600',
                                  fontSize: '14px'
                                }}>
                                  Components for SKU Reference: {editSkuData.skuReference}
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                  <table className="table table-striped table-hover" style={{ marginBottom: 0 }}>
                                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                                      <tr>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>
                                          Select
                                        </th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Component Code</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Description</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Formulation Ref</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Material Type</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Components Ref</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Valid From</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Valid To</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Material Group</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Quantity</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>UOM ID</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Base Quantity</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Base UOM</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>% w/w</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Packaging Type</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Packaging Material</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Unit Weight</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Weight UOM</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>% PCR</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>% PIR</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>% Chemical</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>% Bio Sourced</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Material Structure</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Color/Opacity</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Packaging Level</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Dimensions</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Created Date</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>CM Code</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Periods</th>
                                        <th style={{ padding: '8px', fontSize: '10px' }}>Active</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                        {editSelectedSkuComponents.map((component, index) => {
                                          // Use component_code as unique identifier since component.id is undefined
                                          const uniqueId = component.component_code || `component-${index}`;
                                          const isSelected = editSelectedComponentIds.includes(uniqueId);
                                          
                                          console.log('🔍 Rendering component row:', { 
                                            index, 
                                            uniqueId,
                                            componentCode: component.component_code,
                                            isSelected,
                                            componentObject: component
                                          });
                                          
                                          return (
                                            <tr key={`edit-component-${uniqueId}`}>
                                              <td style={{ padding: '4px 6px', fontSize: '9px', textAlign: 'center' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected} 
                                                  style={{ cursor: 'pointer' }}
                                                />
                                              </td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_code}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_description}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.formulation_reference || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getMaterialTypeName(component.material_type_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_description || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_valid_from ? new Date(component.component_valid_from).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_valid_to ? new Date(component.component_valid_to).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_material_group || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_quantity}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getUomName(component.component_uom_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_base_quantity || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getBaseUomName(component.component_base_uom_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_w_w}%</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getPackagingMaterialName(component.component_packaging_type_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_packaging_material || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_unit_weight || '-'}</td>
                                            <td style={{ padding: '6px', fontSize: '9px' }}>{getUomName(component.weight_unit_measure_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_mechanical_pcr_content || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_mechanical_pir_content || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_chemical_recycled_content || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.percent_bio_sourced || '-'}</td>
                                            <td style={{ padding: '4px', fontSize: '9px' }}>{component.material_structure_multimaterials || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_packaging_color_opacity || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{getPackagingLevelName(component.component_packaging_level_id)}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.component_dimensions || '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.created_date ? new Date(component.created_date).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.cm_code}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.periods}</td>
                                            <td style={{ padding: '4px 6px', fontSize: '9px' }}>{component.is_active ? 'Yes' : 'No'}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="col-md-12 text-center" style={{ padding: '20px' }}>
                                <p style={{ color: '#666' }}>No components found for the selected Reference SKU</p>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                  {editSkuErrors.server && <div style={{ color: 'red', marginTop: 16, fontWeight: 600 }}>{editSkuErrors.server}</div>}
                  {editSkuSuccess && <div style={{ color: '#30ea03', marginTop: 16, fontWeight: 600 }}>{editSkuSuccess}</div>}
                </div>
              </div>
              <div className="modal-footer" style={{ background: '#fff', borderTop: '2px solid #000', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: 'rgb(48, 234, 3)', border: 'none', color: '#000', minWidth: 100, fontWeight: 600 }}
                  onClick={handleEditSkuUpdate}
                  disabled={editSkuLoading}
                >
                  {editSkuLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reference SKU Confirmation Modal */}
      {showReferenceSkuConfirmModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
            <div className="modal-content" style={{ 
              borderRadius: '12px', 
              border: 'none',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <div className="modal-header" style={{ 
                backgroundColor: '#30ea03', 
                color: '#000', 
                borderBottom: '2px solid #000', 
                alignItems: 'center',
                padding: '20px 30px',
                borderRadius: '12px 12px 0 0'
              }}>
                <h5 className="modal-title" style={{ 
                  color: '#000', 
                  fontWeight: 700, 
                  flex: 1,
                  fontSize: '18px',
                  margin: 0
                }}>
                  <i className="ri-warning-line" style={{ marginRight: '10px', fontSize: '20px' }} />
                  Warning
                </h5>
                <button
                  type="button"
                  onClick={handleReferenceSkuCancel}
                  aria-label="Close"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#000', 
                    fontSize: 28, 
                    fontWeight: 900, 
                    lineHeight: 1, 
                    cursor: 'pointer', 
                    marginLeft: 8,
                    padding: '0',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%'
                  }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body" style={{ 
                background: '#fff',
                padding: '30px'
              }}>
                <div style={{ 
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <i className="ri-error-warning-line" style={{ 
                    fontSize: '48px', 
                    color: '#ffc107',
                    marginBottom: '15px',
                    display: 'block'
                  }} />
                  <h6 style={{ 
                    color: '#333', 
                    fontWeight: '600',
                    marginBottom: '15px',
                    fontSize: '16px'
                  }}>
                    Component Update Warning
                  </h6>
                  <p style={{ 
                    color: '#666', 
                    fontSize: '14px',
                    lineHeight: '1.5',
                    margin: 0
                  }}>
                    If you will update the component, all existing components for that SKU will get removed.
                  </p>
                </div>
              </div>
              <div className="modal-footer" style={{ 
                background: '#fff', 
                borderTop: '1px solid #e9ecef',
                padding: '20px 30px',
                borderRadius: '0 0 12px 12px',
                display: 'flex',
                justifyContent: 'center',
                gap: '15px'
              }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleReferenceSkuCancel}
                  style={{ 
                    backgroundColor: '#6c757d', 
                    border: 'none', 
                    color: '#fff', 
                    padding: '10px 20px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    fontSize: '14px',
                    minWidth: '100px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleReferenceSkuConfirm}
                  style={{ 
                    backgroundColor: '#30ea03', 
                    border: 'none', 
                    color: '#000', 
                    padding: '10px 20px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    fontSize: '14px',
                    minWidth: '100px'
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddComponentModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl" style={{ maxWidth: '90vw', margin: '2vh auto' }}>
            <div className="modal-content" style={{ 
              borderRadius: '12px', 
              border: 'none',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              maxHeight: '90vh'
            }}>
              <div className="modal-header" style={{ 
                backgroundColor: '#30ea03', 
                color: '#000', 
                borderBottom: '2px solid #000', 
                alignItems: 'center',
                padding: '20px 30px',
                borderRadius: '12px 12px 0 0'
              }}>
                <h5 className="modal-title" style={{ 
                  color: '#000', 
                  fontWeight: 700, 
                  flex: 1,
                  fontSize: '20px',
                  margin: 0,
                marginLeft: '20px',
                }}>
                  <i className="ri-add-circle-line" style={{ marginRight: '10px', fontSize: '22px' }} />
                  Add Component
                </h5>
                                  <button
                    type="button"
                    onClick={() => {
                      setShowAddComponentModal(false);
                      setAddComponentErrors({}); // Clear any previous errors
                      setAddComponentSuccess(''); // Clear success message
                      setShowBasicComponentFields(false); // Reset collapsible section to collapsed
                      setShowAdvancedComponentFields(false); // Reset second collapsible section to collapsed
                      setShowRecyclingComponentFields(false); // Reset third collapsible section to collapsed
                      setShowFourthCollapsibleFields(false); // Reset fourth collapsible section to collapsed
                      setShowFifthCollapsibleFields(false); // Reset fifth collapsible section to collapsed
                    }}
                    aria-label="Close"
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#000', 
                      fontSize: 28, 
                      fontWeight: 900, 
                      lineHeight: 1, 
                      cursor: 'pointer', 
                      marginLeft: 8,
                      padding: '0',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%'
                    }}
                  >
                    &times;
                  </button>
              </div>
              <div className="modal-body" style={{ 
                background: '#fff',
                padding: '30px',
                maxHeight: 'calc(90vh - 120px)',
                overflowY: 'auto'
              }}>
                <div className="container-fluid" style={{ padding: 0 }}>
                  {/* Mandatory fields note */}
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '12px 16px', 
                    borderRadius: '6px', 
                    marginBottom: '20px',
                    border: '1px solid #e9ecef',
                    fontSize: '14px',
                    color: '#495057'
                  }}>
                    <i className="ri-information-line" style={{ marginRight: 8, color: '#30ea03' }} />
                    <strong>Note:</strong> Fields marked with <span style={{ color: 'red', fontWeight: 'bold' }}>*</span> are mandatory.
                  </div>



                  {/* Success Message Display */}
                  {addComponentSuccess && (
                    <div style={{ 
                      background: '#d4edda', 
                      padding: '16px 20px', 
                      borderRadius: '8px', 
                      marginBottom: '20px',
                      border: '1px solid #c3e6cb',
                      fontSize: '14px',
                      color: '#155724'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        fontWeight: '600'
                      }}>
                        <i className="ri-check-line" style={{ marginRight: '8px', fontSize: '16px' }} />
                        {addComponentSuccess}
                      </div>
                    </div>
                  )}

                  {/* General Error Display */}
                  {addComponentErrors.server && (
                    <div style={{ 
                      background: '#f8d7da', 
                      padding: '16px 20px', 
                      borderRadius: '8px', 
                      marginBottom: '20px',
                      border: '1px solid #f5c6cb',
                      fontSize: '14px',
                      color: '#721c24'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        fontWeight: '600'
                      }}>
                        <i className="ri-error-warning-line" style={{ marginRight: '8px', fontSize: '16px' }} />
                        {addComponentErrors.server}
                      </div>
                    </div>
                  )}


                  <div className="row g-4">
                    {/* Basic Component Fields - Simple Section */}
                    <div className="col-12">
                      <div style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        overflow: 'hidden'
                      }}>
                        {/* Section Content */}
                        <div style={{ padding: '20px' }}>
                          <div className="row g-4">
                              {/* Component Type (Drop-down list) */}
                    <div className="col-md-6">
                      <label style={{ 
                        fontWeight: '600', 
                        color: '#333', 
                        marginBottom: '8px',
                        display: 'block',
                        fontSize: '14px'
                      }}>
                        Component Type <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Please select either Packaging or Raw Material for each SKU component", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <select
                        className={`form-control select-with-icon${addComponentErrors.componentType ? ' is-invalid' : ''}`}
                        name="componentType"
                        data-field="componentType"
                        value={addComponentData.componentType}
                        onChange={e => {
                          setAddComponentData({ ...addComponentData, componentType: e.target.value });
                          // Clear error when user starts typing
                          if (addComponentErrors.componentType) {
                            setAddComponentErrors(prev => ({ ...prev, componentType: '' }));
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: '#fff',
                          transition: 'border-color 0.3s ease'
                        }}
                      >
                        <option value="">Select Component Type</option>
                        {materialTypes.length > 0 ? (
                          materialTypes.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                          ))
                        ) : (
                          <option value="" disabled>Loading material types...</option>
                        )}
                      </select>
                      {addComponentErrors.componentType && <div style={{ color: 'red', fontSize: 13, marginTop: '4px' }}>{addComponentErrors.componentType}</div>}
                    </div>
                    {/* Component Code (Free text) */}
                    <div className="col-md-6" style={{ position: 'relative' }}>
                      <label>
                        Component Code <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Enter the unique code for this component", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input 
                        type="text" 
                        className={`form-control${addComponentErrors.componentCode ? ' is-invalid' : ''}`}
                        name="componentCode"
                        data-field="componentCode"
                        value={addComponentData.componentCode} 
                        onChange={e => {
                          const newComponentCode = e.target.value;
                          setAddComponentData({ ...addComponentData, componentCode: newComponentCode });
                          
                          // Clear error when user starts typing
                          if (addComponentErrors.componentCode) {
                            setAddComponentErrors(prev => ({ ...prev, componentCode: '' }));
                          }
                          
                          // If Component Code changed and we had previously populated data, clear all fields
                          if (newComponentCode !== addComponentData.componentCode && 
                              (addComponentData.componentDescription || addComponentData.componentType || 
                               addComponentData.validityFrom || addComponentData.validityTo)) {
                            clearAllPopulatedFields();
                          }
                          
                          // If Component Code is being edited, re-enable all fields
                          if (isComponentSelected) {
                            setIsComponentSelected(false);
                          }
                          
                          // Show suggestions while typing
                          if (newComponentCode.trim() !== '') {
                            fetchComponentDataByCode(newComponentCode);
                          } else {
                            setComponentSuggestions([]);
                            setShowSuggestions(false);
                            
                            // If Component Code is completely cleared, clear all fields
                            if (addComponentData.componentDescription || addComponentData.componentType || 
                                addComponentData.validityFrom || addComponentData.validityTo) {
                              clearAllPopulatedFields();
                            }
                          }
                        }}
                        placeholder="Enter component code to auto-fill fields"
                      />
                      {addComponentErrors.componentCode && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentCode}</div>}
                      
                      {/* Component Suggestions Dropdown */}
                      {showSuggestions && componentSuggestions.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {componentSuggestions.map((suggestion) => (
                            <div
                              key={suggestion.id}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f3f4',
                                fontSize: '14px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                              }}
                              onClick={() => selectComponentFromSuggestions(suggestion.id)}
                            >
                              <div style={{ fontWeight: '600', color: '#495057' }}>
                                {suggestion.component_code}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                Period: {suggestion.periods} | Version: {suggestion.version} | {suggestion.component_description}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Component Description (Free text) */}
                    <div className="col-md-6">
                      <label>
                        Component Description <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Describe the component in detail", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input 
                        type="text" 
                        className={`form-control${addComponentErrors.componentDescription ? ' is-invalid' : ''}`}
                        name="componentDescription"
                        data-field="componentDescription"
                        value={addComponentData.componentDescription} 
                        disabled={isComponentSelected}
                        onChange={e => {
                          setAddComponentData({ ...addComponentData, componentDescription: e.target.value });
                          // Clear error when user starts typing
                          if (addComponentErrors.componentDescription) {
                            setAddComponentErrors(prev => ({ ...prev, componentDescription: '' }));
                          }
                        }} 
                      />
                      {addComponentErrors.componentDescription && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentDescription}</div>}
                    </div>

                    {/* Component Category (Input field) */}
                    <div className="col-md-6">
                      <label>
                        Component Category
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Enter the category for this component", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={addComponentData.componentCategory}
                        disabled={isComponentSelected}
                        onChange={e => setAddComponentData({ ...addComponentData, componentCategory: e.target.value })}
                        placeholder="Enter Component Category"
                      />
                      {addComponentErrors.componentCategory && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentCategory}</div>}
                    </div>

                    {/* Component Unit of Measure (Drop-down list) */}
                    <div className="col-md-6">
                      <label>
                        Component Unit of Measure <span style={{ color: 'red' }}>*</span>
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Select the unit of measure for the component quantity (e.g., PCS, KG)", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <select
                        className={`form-control select-with-icon${addComponentErrors.componentUnitOfMeasure ? ' is-invalid' : ''}`}
                        name="componentUnitOfMeasure"
                        data-field="componentUnitOfMeasure"
                        value={addComponentData.componentUnitOfMeasure}
                        disabled={isComponentSelected}
                        onChange={e => {
                          setAddComponentData({ ...addComponentData, componentUnitOfMeasure: e.target.value });
                          // Clear error when user selects an option
                          if (addComponentErrors.componentUnitOfMeasure) {
                            setAddComponentErrors(prev => ({ ...prev, componentUnitOfMeasure: '' }));
                          }
                        }}
                      >
                        <option value="">Select UoM</option>
                        {unitOfMeasureOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                        ))}
                      </select>
                      {addComponentErrors.componentUnitOfMeasure && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentUnitOfMeasure}</div>}
                    </div>
                    
                    {/* Component Base Quantity (Numeric) */}
                    <div className="col-md-6">
                      <label>
                        Component Base Quantity
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Enter the base quantity for this component (reference amount)", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="componentBaseQuantity"
                        data-field="componentBaseQuantity"
                        value={addComponentData.componentBaseQuantity} 
                        disabled={isComponentSelected}
                        onChange={e => setAddComponentData({ ...addComponentData, componentBaseQuantity: e.target.value })} 
                      />
                      {addComponentErrors.componentBaseQuantity && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentBaseQuantity}</div>}
                    </div>
                    
                    {/* Component Base Unit of Measure */}
                    <div className="col-md-6">
                      <label>
                        Component Base Unit of Measure
                        <span 
                          style={{ 
                            marginLeft: '8px', 
                            cursor: 'pointer', 
                            color: '#888',
                            fontSize: '16px',
                            transition: 'color 0.2s ease'
                          }} 
                          onMouseEnter={(e) => {
                            showTooltip("Specify the unit for the base quantity (e.g., Each, PCS)", e);
                            e.currentTarget.style.color = '#30ea03';
                          }}
                          onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.color = '#888';
                          }}
                        >
                          <i className="ri-information-line"></i>
                        </span>
                      </label>
                      <select
                        className="form-control select-with-icon"
                        name="componentBaseUnitOfMeasure"
                        data-field="componentBaseUnitOfMeasure"
                        value={addComponentData.componentBaseUnitOfMeasure}
                        onChange={e => setAddComponentData({ ...addComponentData, componentBaseUnitOfMeasure: e.target.value })}
                      >
                        <option value="">Select Base Unit of Measure</option>
                        {componentBaseUoms.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                        ))}
                      </select>
                      {addComponentErrors.componentBaseUnitOfMeasure && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentBaseUnitOfMeasure}</div>}
                    </div>
                            </div>
                          </div>
                        </div>
                    </div>
                    {/* Advanced Component Fields - Second Collapsible Section */}
                    <div className="col-12">
                      <div style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        overflow: 'hidden'
                      }}>
                        {/* Collapsible Header */}
                        <div 
                                              style={{
                      backgroundColor: '#000',
                      padding: '15px 20px',
                      cursor: 'pointer',
                      borderBottom: showAdvancedComponentFields ? '1px solid #e9ecef' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background-color 0.2s ease',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000'}
                          onClick={() => setShowAdvancedComponentFields(!showAdvancedComponentFields)}
                        >
                                              <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      color: '#fff',
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '1px solid #fff',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#fff'
                      }}>
                        {showAdvancedComponentFields ? '−' : '+'}
                      </div>
                      Advanced Component Information
                    </div>
                          
                        </div>
                        
                        {/* Collapsible Content */}
                        {showAdvancedComponentFields && (
                          <div style={{
                            padding: '20px',
                            backgroundColor: '#fff'
                          }}>
                            <div className="row g-4">



                              {/* Component Packaging Type (Drop-down list) */}
                              <div className="col-md-6">
                                <label>Component Packaging Type <InfoIcon info="Select the type of packaging for this component." /></label>
                                <select 
                                  className="form-control select-with-icon"
                                  value={addComponentData.componentPackagingType}
                                  onChange={e => setAddComponentData({ ...addComponentData, componentPackagingType: e.target.value })}
                                >
                                  <option value="">Select Packaging Type</option>
                                  {packagingLevelOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.item_name}
                                    </option>
                                  ))}
                                </select>
                                {addComponentErrors.componentPackagingType && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentPackagingType}</div>}
                              </div>
                              {/* Component Packaging Material (Drop-down list) */}
                              <div className="col-md-6">
                                <label>Component Packaging Material <InfoIcon info="Select the material used for packaging this component." /></label>
                                <select
                                  className="form-control select-with-icon"
                                  value={addComponentData.componentPackagingMaterial}
                                  onChange={e => setAddComponentData({ ...addComponentData, componentPackagingMaterial: e.target.value })}
                                >
                                  <option value="">Select Packaging Material</option>
                                  {packagingMaterialOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                                  ))}
                                </select>
                                {addComponentErrors.componentPackagingMaterial && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentPackagingMaterial}</div>}
                              </div>
                              {/* Component Unit Weight (Numeric) */}
                              <div className="col-md-6">
                                <label>Component Unit Weight <InfoIcon info="Enter the weight of a single unit of this component." /></label>
                                <input type="number" className="form-control" value={addComponentData.componentUnitWeight} onChange={e => setAddComponentData({ ...addComponentData, componentUnitWeight: e.target.value })} />
                                {addComponentErrors.componentUnitWeight && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentUnitWeight}</div>}
                              </div>
                              {/* Component Weight Unit of Measure (Drop-down list) */}
                              <div className="col-md-6">
                                <label>Component Weight Unit of Measure <InfoIcon info="Select the unit of measure for the component's weight (e.g., g, kg)." /></label>
                                <select
                                  className={`form-control select-with-icon${addComponentErrors.componentWeightUnitOfMeasure ? ' is-invalid' : ''}`}
                                  value={addComponentData.componentWeightUnitOfMeasure}
                                  onChange={e => setAddComponentData({ ...addComponentData, componentWeightUnitOfMeasure: e.target.value })}
                                >
                                  <option value="">Select Weight UoM</option>
                                  {unitOfMeasureOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                                  ))}
                                </select>
                                {addComponentErrors.componentWeightUnitOfMeasure && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentWeightUnitOfMeasure}</div>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Recycling and Material Fields - Third Collapsible Section */}
                    <div className="col-12">
                      <div style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        overflow: 'hidden'
                      }}>
                        {/* Collapsible Header */}
                        <div 
                                              style={{
                      backgroundColor: '#000',
                      padding: '15px 20px',
                      cursor: 'pointer',
                      borderBottom: showRecyclingComponentFields ? '1px solid #e9ecef' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background-color 0.2s ease',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000'}
                          onClick={() => setShowRecyclingComponentFields(!showRecyclingComponentFields)}
                        >
                                              <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      color: '#fff',
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '1px solid #fff',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#fff'
                      }}>
                        {showRecyclingComponentFields ? '−' : '+'}
                      </div>
                      Recycling and Material Information
                    </div>
                          
                        </div>
                        
                        {/* Collapsible Content */}
                        {showRecyclingComponentFields && (
                          <div style={{
                            padding: '20px',
                            backgroundColor: '#fff'
                          }}>
                            <div className="row g-4">
                              {/* % Mechanical Post-Consumer Recycled Content (inc. Chemical) (Percentage) */}
                              <div className="col-md-6">
                                <label>% Mechanical Post-Consumer Recycled Content (inc. Chemical) <InfoIcon info="Enter the percentage of post-consumer recycled content, including chemical recycling." /></label>
                                <input type="number" className="form-control" value={addComponentData.percentPostConsumer} onChange={e => setAddComponentData({ ...addComponentData, percentPostConsumer: e.target.value })} placeholder="Percentage" />
                                {addComponentErrors.percentPostConsumer && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.percentPostConsumer}</div>}
                              </div>
                              {/* % Mechanical Post-Industrial Recycled Content (Percentage) */}
                              <div className="col-md-6">
                                <label>% Mechanical Post-Industrial Recycled Content <InfoIcon info="Enter the percentage of post-industrial recycled content." /></label>
                                <input type="number" className="form-control" value={addComponentData.percentPostIndustrial} onChange={e => setAddComponentData({ ...addComponentData, percentPostIndustrial: e.target.value })} placeholder="Percentage" />
                                {addComponentErrors.percentPostIndustrial && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.percentPostIndustrial}</div>}
                              </div>
                              {/* % Chemical Recycled Content (Percentage) */}
                              <div className="col-md-6">
                                <label>% Chemical Recycled Content <InfoIcon info="Enter the percentage of chemically recycled content." /></label>
                                <input type="number" className="form-control" value={addComponentData.percentChemical} onChange={e => setAddComponentData({ ...addComponentData, percentChemical: e.target.value })} placeholder="Percentage" />
                                {addComponentErrors.percentChemical && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.percentChemical}</div>}
                              </div>
                              {/* % Bio-sourced? (Percentage) */}
                              <div className="col-md-6">
                                <label>% Bio-sourced? <InfoIcon info="Enter the percentage of bio-sourced material in this component." /></label>
                                <input type="number" className="form-control" value={addComponentData.percentBioSourced} onChange={e => setAddComponentData({ ...addComponentData, percentBioSourced: e.target.value })} placeholder="Percentage" />
                                {addComponentErrors.percentBioSourced && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.percentBioSourced}</div>}
                              </div>
                              {/* Material structure - multimaterials only (with % wt) (Free text) */}
                              <div className="col-md-6">
                                <label>Material structure - multimaterials only (with % wt) <InfoIcon info="Describe the material structure, including percentages by weight if multimaterial." /></label>
                                <input type="text" className="form-control" value={addComponentData.materialStructure} onChange={e => setAddComponentData({ ...addComponentData, materialStructure: e.target.value })} />
                                {addComponentErrors.materialStructure && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.materialStructure}</div>}
                              </div>
                              {/* Component packaging colour / opacity (Free text) */}
                              <div className="col-md-6">
                                <label>Component packaging colour / opacity <InfoIcon info="Specify the color or opacity of the packaging." /></label>
                                <input type="text" className="form-control" value={addComponentData.packagingColour} onChange={e => setAddComponentData({ ...addComponentData, packagingColour: e.target.value })} />
                                {addComponentErrors.packagingColour && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.packagingColour}</div>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Fifth Section - File Uploads */}
                    <div className="col-12">
                      <div style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        overflow: 'hidden'
                      }}>
                        {/* Section Header */}
                        <div style={{
                          padding: '20px 40px',
                          backgroundColor: '#f8f9fa',
                          borderBottom: '1px solid #e9ecef'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <i className="ri-upload-cloud-line" style={{ fontSize: '20px', color: '#30ea03' }} />
                            <h5 style={{ margin: '0', color: '#333', fontWeight: '600' }}>File Uploads & Evidence</h5>
                          </div>
                          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
                            Upload supporting files for different component categories. Each category can have multiple files.
                          </p>
                        </div>
                        
                        {/* Section Content */}
                        <div style={{
                          padding: '40px',
                          backgroundColor: '#fff',
                          minHeight: '400px'
                        }}>
                          <div className="row g-5">
                              {/* CH Pack Input Field */}
                              <div className="col-md-6">
                                <label style={{ 
                                  fontWeight: '600', 
                                  color: '#333', 
                                  marginBottom: '8px',
                                  display: 'block',
                                  fontSize: '14px'
                                }}>
                                  CH Pack <InfoIcon info="Enter the CH Pack value for this component." />
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={chPackValue}
                                  onChange={e => setChPackValue(e.target.value)}
                                  placeholder="Enter CH Pack value"
                                  style={{
                                    padding: '12px 16px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    backgroundColor: '#fff',
                                    transition: 'border-color 0.3s ease'
                                  }}
                                />
                              </div>
                              {/* KPIS for Evidence Mapping */}
                              <div className="col-md-6">
                                <label style={{ 
                                  fontWeight: '600', 
                                  color: '#333', 
                                  marginBottom: '8px',
                                  display: 'block'
                                }}>
                                  File Categories <InfoIcon info="Choose one or more categories for file upload. Each category can have multiple files." />
                                </label>
                                <MultiSelect
                                  options={[
                                    { value: '1', label: '📏 Weight Evidence' },
                                    { value: '2', label: '⚖️ Weight UoM Evidence' },
                                    { value: '3', label: '📦 Packaging Type Evidence' },
                                    { value: '4', label: '🧱 Material Type Evidence' }
                                  ]}
                                  selectedValues={selectedCategories}
                                  onSelectionChange={(categories) => {
                                    setSelectedCategories(categories);
                                    setCategoryError(''); // Clear error when categories change
                                  }}
                                  placeholder="Select file categories..."
                                />
                                {selectedCategories.length > 0 && (
                                  <div style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: '#e8f5e8',
                                    border: '1px solid #c3e6c3',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    color: '#2d5a2d'
                                  }}>
                                    <i className="ri-check-line" style={{ marginRight: '4px' }} />
                                    {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
                                  </div>
                                )}
                                {categoryError && (
                                  <div style={{
                                    color: '#dc3545',
                                    fontSize: '13px',
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: '#f8d7da',
                                    border: '1px solid #f5c6cb',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    <i className="ri-error-warning-line" style={{ fontSize: '14px' }} />
                                    {categoryError}
                                  </div>
                                )}
                              </div>
                              {/* Browse Files */}
                              <div className="col-md-6">
                                <label style={{ 
                                  fontWeight: '600', 
                                  color: '#333', 
                                  marginBottom: '8px',
                                  display: 'block'
                                }}>
                                  📁 Browse Files <InfoIcon info="Select files to upload for the selected categories above." />
                                </label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                  <input
                                    type="file"
                                    multiple
                                    className="form-control"
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      setSelectedFiles(files);
                                      setCategoryError(''); // Clear error when files change
                                    }}
                                    style={{ 
                                      flex: 1,
                                      padding: '10px 12px',
                                      border: '1px solid #ddd',
                                      borderRadius: '6px',
                                      fontSize: '14px'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="btn"
                                    style={{
                                      backgroundColor: '#30ea03',
                                      border: 'none',
                                      color: '#000',
                                      fontWeight: '600',
                                      padding: '10px 20px',
                                      borderRadius: '6px',
                                      whiteSpace: 'nowrap',
                                      fontSize: '14px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      if (selectedCategories.length > 0 && selectedFiles.length > 0) {
                                        // Check if any selected categories are already assigned to other files
                                        const alreadyAssignedCategories = selectedCategories.filter(category => 
                                          uploadedFiles.some(upload => 
                                            upload.categories.includes(category)
                                          )
                                        );

                                        if (alreadyAssignedCategories.length > 0) {
                                          const categoryNames = alreadyAssignedCategories.map(cat => {
                                            const catMap = {
                                              '1': 'Weight Evidence',
                                              '2': 'Weight UoM Evidence', 
                                              '3': 'Packaging Type Evidence',
                                              '4': 'Material Type Evidence'
                                            };
                                            return catMap[cat as keyof typeof catMap] || `Category ${cat}`;
                                          }).join(', ');
                                          setCategoryError(`${categoryNames} ${alreadyAssignedCategories.length === 1 ? 'is' : 'are'} already assigned to another file. Please remove ${alreadyAssignedCategories.length === 1 ? 'it' : 'them'} from the other file first.`);
                                          return;
                                        }

                                        const newUpload = {
                                          id: Date.now().toString(),
                                          categories: selectedCategories,
                                          files: selectedFiles
                                        };
                                        setUploadedFiles(prev => [...prev, newUpload]);
                                        setCategoryError(''); // Clear any previous errors
                                        // Don't clear selections - allow user to add more rows
                                        // setSelectedCategories([]);
                                        // setSelectedFiles([]);
                                      }
                                    }}
                                    disabled={selectedCategories.length === 0 || selectedFiles.length === 0}
                                  >
                                    <i className="ri-add-line" style={{ marginRight: '6px' }} />
                                    Add Files
                                  </button>
                                </div>
                                {selectedFiles.length > 0 && (
                                  <div style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: '#f0f8ff',
                                    border: '1px solid #b3d9ff',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    color: '#0066cc'
                                  }}>
                                    <i className="ri-file-list-line" style={{ marginRight: '4px' }} />
                                    {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected
                                  </div>
                                )}
                              </div>
                              {/* Component packaging level (Drop-down list) */}
                              <div className="col-md-6">
                                <label>Component packaging level <InfoIcon info="Select the packaging level for this component (e.g., primary, secondary)." /></label>
                                <select
                                  className="form-control select-with-icon"
                                  value={addComponentData.packagingLevel}
                                  onChange={e => setAddComponentData({ ...addComponentData, packagingLevel: e.target.value })}
                                >
                                  <option value="">Select Packaging Level</option>
                                  {packagingLevelOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Component dimensions (3D - LxWxH, 2D - LxW) (Free text) */}
                              <div className="col-md-6">
                                <label>Component dimensions (3D - LxWxH, 2D - LxW) <InfoIcon info="Enter the dimensions of the component (e.g., 10x5x2 cm)." /></label>
                                <input type="text" className="form-control" value={addComponentData.componentDimensions} onChange={e => setAddComponentData({ ...addComponentData, componentDimensions: e.target.value, packagingEvidence: addComponentData.packagingEvidence })} />
                                {addComponentErrors.componentDimensions && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentDimensions}</div>}
                              </div>
                              {/* Evidence of % of chemical recycled or bio-source */}
                              <div className="col-md-6">
                                <label>Evidence of % of chemical recycled or bio-source <InfoIcon info="Upload files as evidence for chemical recycled or bio-source content (optional)." /></label>
                                <input 
                                  type="file" 
                                  multiple
                                  className="form-control" 
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    console.log('🔍 Files selected:', files.map(f => `${f.name} (${(f.size / 1024).toFixed(2)} KB)`));
                                    setAddComponentData({ 
                                      ...addComponentData, 
                                      packagingEvidence: files,
                                      componentDimensions: addComponentData.componentDimensions 
                                    });
                                  }}
                                  style={{ 
                                    padding: '8px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                  }}
                                />
                                {addComponentData.packagingEvidence.length > 0 && (
                                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                                    Selected files: {addComponentData.packagingEvidence.map(file => file.name).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                    </div>

                    

                  </div>
                </div>
              </div>

              {/* Display Uploaded Files Table INSIDE modal-body for single scroll */}
              {uploadedFiles.length > 0 && (
                <div className="row" style={{ marginTop: '24px' }}>
                  <div className="col-12">
                    {/* Upload Summary */}
                    <div style={{
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      padding: '16px 20px',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <i className="ri-file-list-line" style={{ fontSize: '18px', color: '#30ea03' }} />
                        <span style={{ fontWeight: '600', color: '#333' }}>File Upload Summary</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        Total files: <strong>{uploadedFiles.reduce((total, upload) => total + upload.files.length, 0)}</strong> | 
                        Categories: <strong>{uploadedFiles.map(upload => {
                          const catMap = {
                            '1': 'Weight Evidence',
                            '2': 'Weight UoM Evidence',
                            '3': 'Packaging Type Evidence',
                            '4': 'Material Type Evidence'
                          };
                          return upload.categories.map(cat => catMap[cat as keyof typeof catMap] || `Category ${cat}`).join(', ');
                        }).join(', ')}</strong>
                      </div>
                    </div>
                    
                    <div style={{ 
                      background: '#fff', 
                      borderRadius: '8px', 
                      border: '1px solid #e9ecef',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ padding: '0 24px 24px 24px' }}>
                        <div className="table-responsive">
                          <table style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            backgroundColor: '#fff'
                          }}>
                            <thead>
                              <tr style={{ backgroundColor: '#000' }}>
                                <th style={{ 
                                  padding: '16px 20px', 
                                  fontSize: '14px', 
                                  fontWeight: '600',
                                  textAlign: 'left',
                                  borderBottom: '1px solid #e9ecef',
                                  color: '#fff'
                                }}>
                                  📁 File Category
                                </th>
                                <th style={{ 
                                  padding: '16px 20px', 
                                  fontSize: '14px', 
                                  fontWeight: '600',
                                  textAlign: 'left',
                                  borderBottom: '1px solid #e9ecef',
                                  color: '#fff'
                                }}>
                                  📄 Files
                                </th>
                                <th style={{ 
                                  padding: '16px 20px', 
                                  fontSize: '14px', 
                                  fontWeight: '600',
                                  textAlign: 'center',
                                  borderBottom: '1px solid #e9ecef',
                                  width: '100px',
                                  color: '#fff'
                                }}>
                                  🗑️ Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {uploadedFiles.map((upload, index) => (
                                <tr key={upload.id} style={{ 
                                  backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                                  transition: 'background-color 0.2s ease'
                                }}>
                                  <td style={{ 
                                    padding: '16px 20px', 
                                    fontSize: '14px',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#333'
                                  }}>
                                    {upload.categoryName || upload.categories.map(cat => {
                                      // Map category number to category name with icons
                                      const categoryMap = {
                                        '1': '📏 Weight Evidence',
                                        '2': '⚖️ Weight UoM Evidence',
                                        '3': '📦 Packaging Type Evidence',
                                        '4': '🧱 Material Type Evidence'
                                      };
                                      return categoryMap[cat as keyof typeof categoryMap] || `Category ${cat}`;
                                    }).join(', ')}
                                  </td>
                                  <td style={{ 
                                    padding: '16px 20px', 
                                    fontSize: '14px',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#333'
                                  }}>
                                    {upload.files.map((file, fileIndex) => (
                                      <div key={fileIndex} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: fileIndex < upload.files.length - 1 ? '4px' : '0',
                                        padding: '4px 8px',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '4px',
                                        fontSize: '12px'
                                      }}>
                                        <i className="ri-file-line" style={{ color: '#666' }} />
                                        <span style={{ color: '#333' }}>{file.name}</span>
                                        {file.size && (
                                          <span style={{ color: '#888', fontSize: '11px' }}>
                                            ({(file.size / 1024).toFixed(1)} KB)
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </td>
                                  <td style={{ 
                                    padding: '16px 20px', 
                                    textAlign: 'center',
                                    borderBottom: '1px solid #e9ecef'
                                  }}>
                                    <button
                                      type="button"
                                      style={{
                                        backgroundColor: '#dc3545',
                                        border: 'none',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        fontSize: '13px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: '40px'
                                      }}
                                      onClick={() => {
                                        setUploadedFiles(prev => prev.filter(item => item.id !== upload.id));
                                      }}
                                      title="Delete"
                                    >
                                      <i className="ri-delete-bin-line" style={{ fontSize: '14px' }}></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Validity Date Fields - Above Save Button */}
              <div className="row" style={{ marginTop: '24px', marginBottom: '20px' }}>
                <div className="col-12">
                  <div style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: '#f8f9fa'
                  }}>

                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ 
                background: '#fff', 
                borderTop: '2px solid #000', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 25px',
                borderRadius: '0 0 12px 12px'
              }}>
                {/* Left side - Component validity date fields */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  {/* Component validity date - From */}
                  <div>
                    <label style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#333',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Component validity date - From <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input 
                      type="date" 
                      className={`form-control${addComponentErrors.validityFrom ? ' is-invalid' : ''}`}
                      name="validityFrom"
                      data-field="validityFrom"
                      value={addComponentData.validityFrom} 
                      onChange={e => {
                        setAddComponentData({ ...addComponentData, validityFrom: e.target.value });
                        if (addComponentErrors.validityFrom) {
                          setAddComponentErrors(prev => ({ ...prev, validityFrom: '' }));
                        }
                      }} 
                      style={{
                        width: '160px',
                        padding: '5px 8px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: '#fff'
                      }}
                    />
                    {addComponentErrors.validityFrom && <div style={{ color: 'red', fontSize: '10px', marginTop: '1px' }}>{addComponentErrors.validityFrom}</div>}
                  </div>

                  {/* Component validity date - To */}
                  <div>
                    <label style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#333',
                      marginBottom: '4px',
                      display: 'block'
                    }}>
                      Component validity date - To <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input 
                      type="date" 
                      className={`form-control${addComponentErrors.validityTo ? ' is-invalid' : ''}`}
                      name="validityTo"
                      data-field="validityTo"
                      value={addComponentData.validityTo} 
                      onChange={e => {
                        setAddComponentData({ ...addComponentData, validityTo: e.target.value });
                        if (addComponentErrors.validityTo) {
                          setAddComponentErrors(prev => ({ ...prev, validityTo: '' }));
                        }
                      }} 
                      style={{
                        width: '160px',
                        padding: '5px 8px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: '#fff'
                      }}
                    />
                    {addComponentErrors.validityTo && <div style={{ color: 'red', fontSize: '10px', marginTop: '1px' }}>{addComponentErrors.validityTo}</div>}
                  </div>
                </div>

                {/* Right side - Save button */}
                <button
                  type="button"
                  className="btn"
                  style={{ 
                    backgroundColor: 'rgb(48, 234, 3)', 
                    border: 'none', 
                    color: '#000', 
                    fontWeight: 600,
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 14px'
                  }}
                  onClick={handleAddComponentSave}
                >
                  Save
                  <i className="ri-save-line" style={{ fontSize: '14px' }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={showConfirm}
        message={pendingSkuStatus ? 'Are you sure you want to deactivate this SKU?' : 'Are you sure you want to activate this SKU?'}
        onConfirm={handleConfirmStatusChange}
        onCancel={handleCancelStatusChange}
      />

      {/* Inactive SKU Modal */}
      {showInactiveModal && (
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
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <button
              onClick={handleInactiveModalClose}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
            <div style={{ textAlign: 'center', paddingTop: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
                First activate the SKU
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ConfirmModal
        show={showErrorModal}
        message={errorMessage}
        onConfirm={handleErrorModalClose}
        onCancel={handleErrorModalClose}
      />

      {/* Component Confirmation Modal */}
      <ConfirmModal
        show={showComponentConfirm}
        message={pendingComponentStatus ? 'Are you sure you want to activate this component?' : 'Are you sure you want to deactivate this component?'}
        onConfirm={handleComponentConfirmStatusChange}
        onCancel={handleComponentCancelStatusChange}
      />







      {/* Edit Component Modal */}
      <EditComponentModal
        show={showEditComponentModal}
        onClose={() => setShowEditComponentModal(false)}
        component={editingComponent}
        onSuccess={() => {
          // Refresh component data after successful edit
          if (editingComponent) {
            // You can add refresh logic here
            console.log('Component updated successfully');
          }
        }}
      />

      {/* Enhanced Component History Log Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            width: '95%',
            maxWidth: '1400px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
              color: '#000',
              padding: '20px 30px',
              borderRadius: '12px 12px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #000'
            }}>
              <h5 style={{ margin: 0, fontWeight: '600', fontSize: '18px' }}>
                <i className="ri-history-line me-2"></i>
                Component History Log
              </h5>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#000',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '24px 30px',
              flex: 1,
              overflow: 'auto'
            }}>


              {/* Audit Log Data Table */}
              {loadingHistory ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '40px',
                  color: '#666'
                }}>
                  <div className="spinner-border text-primary" role="status" style={{ marginBottom: '10px' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p style={{ margin: 0 }}>Loading audit logs...</p>
                </div>
              ) : componentHistory.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '40px',
                  color: '#666'
                }}>
                  <i className="ri-inbox-line" style={{ fontSize: '3rem', marginBottom: '10px' }}></i>
                  <p style={{ margin: 0 }}>No audit logs found for this component</p>
                </div>
              ) : (
                <div style={{
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  maxHeight: '70vh',
                  overflowY: 'auto'
                }}>
                  <div className="table-responsive">
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      backgroundColor: '#fff',
                      fontSize: '12px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#000', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Date
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Component Code
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '120px'
                          }}>
                            Description
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            SKU Code
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Formulation Ref
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Material Type
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Components Ref
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Valid From
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Valid To
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Material Group
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Quantity
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            UOM
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Base Qty
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Base UOM
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % W/W
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Packaging Type
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Packaging Material
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Unit Weight
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Weight UOM
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % PCR
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % PIR
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % Chemical
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % Bio
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Material Structure
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Packaging Color
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Packaging Level
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Dimensions
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Status
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            User
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Signed Off By
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Document Status
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Year
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            CM Code
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedData(componentHistory).map((log, index) => (
                          <tr key={log.id || index} style={{
                            backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                            transition: 'background-color 0.2s ease'
                          }}>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              whiteSpace: 'nowrap'
                            }}>
                              {formatDate(log.created_date || log.changed_date)}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              fontWeight: '600'
                            }}>
                              {log.component_code || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              maxWidth: '150px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {log.component_description || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.sku_code || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.formulation_reference || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.material_type_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.components_reference || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_valid_from || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_valid_to || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_material_group || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.component_quantity || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_uom_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.component_base_quantity || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_base_uom_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_w_w || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_packaging_type_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_packaging_material || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.component_unit_weight || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.weight_unit_measure_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_mechanical_pcr_content || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_mechanical_pir_content || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_chemical_recycled_content || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_bio_sourced || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.material_structure_multimaterials || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_packaging_color_opacity || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_packaging_level_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_dimensions || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600',
                                backgroundColor: log.is_active ? '#28a745' : '#dc3545',
                                color: '#fff'
                              }}>
                                {log.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.created_by || log.changed_by || 'System'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.signed_off_by || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.document_status || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.year || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.cm_code || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {componentHistory.length > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '15px 20px',
                      borderTop: '1px solid #e9ecef',
                      backgroundColor: '#f8f9fa'
                    }}>
                      {/* Items per page selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>Show:</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <span style={{ fontSize: '12px', color: '#666' }}>entries</span>
                      </div>
                      
                      {/* Page info */}
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                      </div>
                      
                      {/* Pagination buttons */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                            color: currentPage === 1 ? '#999' : '#333',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          First
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                            color: currentPage === 1 ? '#999' : '#333',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          Previous
                        </button>
                        
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                          const page = Math.max(1, Math.min(getTotalPages() - 4, currentPage - 2)) + i;
                          if (page > getTotalPages()) return null;
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              style={{
                                padding: '6px 10px',
                                border: '1px solid #ddd',
                                backgroundColor: currentPage === page ? '#007bff' : '#fff',
                                color: currentPage === page ? '#fff' : '#333',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            >
                              {page}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === getTotalPages()}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            backgroundColor: currentPage === getTotalPages() ? '#f5f5f5' : '#fff',
                            color: currentPage === getTotalPages() ? '#999' : '#333',
                            cursor: currentPage === getTotalPages() ? 'not-allowed' : 'pointer',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          Next
                        </button>
                        <button
                          onClick={() => handlePageChange(getTotalPages())}
                          disabled={currentPage === getTotalPages()}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            backgroundColor: currentPage === getTotalPages() ? '#f5f5f5' : '#fff',
                            color: currentPage === getTotalPages() ? '#999' : '#333',
                            cursor: currentPage === getTotalPages() ? 'not-allowed' : 'pointer',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '15px 30px',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Data Modal */}
      {showCopyDataModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: 'rgb(48, 234, 3)', color: '#000', borderBottom: '2px solid #000', alignItems: 'center' }}>
                <h5 className="modal-title" style={{ color: '#000', fontWeight: 700, flex: 1 }}>Copy Data</h5>
                <button
                  type="button"
                  onClick={handleCopyDataModalClose}
                  aria-label="Close"
                  style={{
                    background: '#000',
                    border: 'none',
                    color: '#fff',
                    fontSize: 32,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: 'pointer',
                    marginLeft: 8,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body" style={{ background: '#fff', padding: '30px' }}>
                <div className="container-fluid">
                  {/* Period Selection Section */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 style={{ color: '#000', marginBottom: '16px', fontWeight: 600 }}>Select Periods for Copy Data</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: '600', 
                            color: '#333',
                            fontSize: '14px'
                          }}>
                            From Reporting Period <span style={{ color: 'red' }}>*</span>
                          </label>
                          <select
                            value={copyFromPeriod}
                            onChange={(e) => setCopyFromPeriod(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                              backgroundColor: '#fff'
                            }}
                            disabled={uploadLoading}
                          >
                            <option value="">Select From Reporting Period</option>
                            {years.map(year => (
                              <option key={year.id} value={year.id}>
                                {year.period}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: '600', 
                            color: '#333',
                            fontSize: '14px'
                          }}>
                            To Reporting Period <span style={{ color: 'red' }}>*</span>
                          </label>
                          <select
                            value={copyToPeriod}
                            onChange={(e) => setCopyToPeriod(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                              backgroundColor: '#fff'
                            }}
                            disabled={uploadLoading}
                          >
                            <option value="">Select To Reporting Period</option>
                            {years.map(year => (
                              <option key={year.id} value={year.id}>
                                {year.period}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-12">
                      <div style={{ 
                        padding: '20px', 
                        border: '2px dashed #30ea03', 
                        borderRadius: '8px', 
                        textAlign: 'center',
                        backgroundColor: '#f8fff8'
                      }}>
                        <i className="ri-upload-cloud-2-line" style={{ fontSize: '48px', color: '#30ea03', marginBottom: '16px' }}></i>
                        <h6 style={{ color: '#000', marginBottom: '12px', fontWeight: 600 }}>Upload the SKU</h6>
                        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                          Select a file to upload and copy data. Supported formats: Excel (.xlsx, .xls), CSV (.csv)
                        </p>
                        
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          style={{
                            backgroundColor: '#30ea03',
                            color: '#000',
                            padding: '12px 24px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'inline-block',
                            border: 'none',
                            fontSize: '14px'
                          }}
                        >
                          <i className="ri-folder-open-line" style={{ marginRight: '8px' }}></i>
                          Choose File
                        </label>
                        
                        {uploadedFile && (
                          <div style={{ 
                            marginTop: '16px', 
                            padding: '12px', 
                            backgroundColor: '#e8f5e8', 
                            borderRadius: '6px',
                            border: '1px solid #30ea03'
                          }}>
                            <i className="ri-file-text-line" style={{ color: '#30ea03', marginRight: '8px' }}></i>
                            <strong>{uploadedFile.name}</strong>
                            <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                              ({(uploadedFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {uploadError && (
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '12px 16px', 
                          backgroundColor: '#f8d7da', 
                          color: '#721c24', 
                          border: '1px solid #f5c6cb', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <i className="ri-error-warning-line" style={{ fontSize: '16px' }} />
                          {uploadError}
                        </div>
                      )}
                      
                      {uploadSuccess && (
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '12px 16px', 
                          backgroundColor: '#d4edda', 
                          color: '#155724', 
                          border: '1px solid #c3e6cb', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <i className="ri-check-line" style={{ fontSize: '16px' }} />
                          {uploadSuccess}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ 
                background: '#fff', 
                borderTop: '2px solid #000', 
                display: 'flex', 
                justifyContent: 'flex-end',
                padding: '20px 30px',
                borderRadius: '0 0 12px 12px'
              }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopyDataModalClose}
                  style={{
                    background: '#000',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '12px'
                  }}
                >
                 
                  Cancel
                  <i className="ri-close-fill" style={{ fontSize: '16px', color: '#fff', marginLeft: 6 }} />
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ 
                    backgroundColor: 'rgb(48, 234, 3)', 
                    border: 'none', 
                    color: '#000', 
                    minWidth: 120, 
                    fontWeight: 600,
                    padding: '8px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: uploadLoading ? 'not-allowed' : 'pointer',
                    opacity: uploadLoading ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={handleCopyDataUpload}
                  disabled={uploadLoading || !uploadedFile || !copyFromPeriod || !copyToPeriod}
                >
                  {uploadLoading ? (
                    <>
                      <i className="ri-loader-4-line" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      
                      Upload & Copy Data
                      <i className="ri-upload-line" style={{ fontSize: '16px' }} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Tooltip */}
      {tooltipInfo.show && (
        <div
          style={{
            position: 'fixed',
            top: tooltipInfo.y - 10,
            left: tooltipInfo.x + 10,
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            maxWidth: '300px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            zIndex: 10000,
            pointerEvents: 'none',
            animation: 'tooltipFadeIn 0.2s ease-out',
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '-6px',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid #2c3e50'
          }}></div>
          {tooltipInfo.text}
        </div>
      )}

      {/* Responsive styles for button layout */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .filters ul li[style*="marginLeft: auto"] {
            margin-left: 0 !important;
            margin-top: 10px !important;
            width: 100% !important;
            justify-content: center !important;
          }
          .filters ul li[style*="marginLeft: auto"] button {
            min-width: 100px !important;
            font-size: 0.9rem !important;
            padding: 6px 12px !important;
          }
        }
        @media (max-width: 480px) {
          .filters ul li[style*="marginLeft: auto"] {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .filters ul li[style*="marginLeft: auto"] button {
            width: 100% !important;
            min-width: auto !important;
          }
        }
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Ensure Save button is always visible */
        .modal-footer {
          position: sticky !important;
          bottom: 0 !important;
          background: white !important;
          z-index: 1000 !important;
          border-top: 2px solid #000 !important;
        }
        
        /* Make modal content scrollable but keep footer visible */
        .modal-body {
          max-height: 70vh !important;
          overflow-y: auto !important;
        }
        
        /* Ensure modal has proper height */
        .modal-dialog {
          max-height: 95vh !important;
          height: 90vh !important;
        }
      `}</style>
    </Layout>
  );
};

export default AdminCmSkuDetail; 