import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import { apiGet } from '../utils/api';
import * as ExcelJS from 'exceljs';

/**
 * Audit Log Entry Interface
 * Defines the structure of audit log data
 */
interface AuditLogEntry {
  id: number;
  action: string;
  entity_type: 'sku' | 'component';
  entity_id: number;
  entity_code: string;
  entity_description: string;
  old_value?: string;
  new_value?: string;
  user_id: number;
  created_by: string;
  created_date: string;
  cm_code: string;
  cm_description?: string;
  sku_code?: string;
  component_code?: string;
  details?: any;
}

/**
 * Audit Log Response Interface
 * Defines the structure of API response
 */
interface AuditLogResponse {
  success: boolean;
  message: string;
  data: AuditLogEntry[];
  count: number;
  total_pages: number;
  current_page: number;
}

/**
 * Filter Options Interface
 */
interface FilterOptions {
  dateFrom: string;
  dateTo: string;
  actionType: string;
  entityType: string;
  user: string;
  cmCode: string;
  skuCode: string;
  componentCode: string;
}

/**
 * Audit Log Page Component
 * Displays comprehensive audit trail for SKUs and components
 */
const AuditLog: React.FC = () => {
  // ===== STATE MANAGEMENT =====
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Filter states
  const [filters, setFilters] = useState<FilterOptions>({
    dateFrom: '',
    dateTo: '',
    actionType: '',
    entityType: '',
    user: '',
    cmCode: '',
    skuCode: '',
    componentCode: ''
  });

  // Master data states
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [cmCodes, setCmCodes] = useState<string[]>([]);

  // ===== INITIAL DATA LOADING =====
  useEffect(() => {
    fetchAuditLogs();
    loadMasterData();
  }, [currentPage, itemsPerPage]);

  // ===== API FUNCTIONS =====
  
  /**
   * Fetch audit log data from API
   */
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      // Add filters
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.actionType) params.append('action_type', filters.actionType);
      if (filters.entityType) params.append('entity_type', filters.entityType);
      if (filters.user) params.append('user', filters.user);
      if (filters.cmCode) params.append('cm_code', filters.cmCode);
      if (filters.skuCode) params.append('sku_code', filters.skuCode);
      if (filters.componentCode) params.append('component_code', filters.componentCode);

      const response = await apiGet(`/audit-logs?${params}`);
      
      if (response.success) {
        setAuditLogs(response.data || []);
        setTotalItems(response.count || 0);
        setTotalPages(response.total_pages || 0);
      } else {
        throw new Error(response.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load master data for filters
   */
  const loadMasterData = async () => {
    try {
      // Load action types
      setActionTypes(['CREATE', 'UPDATE', 'STATUS_CHANGE', 'DELETE']);
      
      // Load entity types
      setEntityTypes(['SKU', 'Component']);
      
      // Load users (you can replace this with actual API call)
      setUsers(['admin', 'user1', 'user2', 'system']);
      
      // Load CM codes (you can replace this with actual API call)
      setCmCodes(['DEAMA', 'CM001', 'CM002', 'CM003']);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  // ===== FILTER HANDLERS =====
  
  const handleFilterChange = (field: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page
    fetchAuditLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      actionType: '',
      entityType: '',
      user: '',
      cmCode: '',
      skuCode: '',
      componentCode: ''
    });
    setCurrentPage(1);
  };

  // ===== EXPORT FUNCTIONALITY =====
  
  const exportToExcel = async () => {
    if (auditLogs.length === 0) return;

    const exportData = auditLogs.map(log => ({
      'Action': log.action,
      'Entity Type': log.entity_type,
      'Entity Code': log.entity_code,
      'Entity Description': log.entity_description,
      'Old Value': log.old_value || 'N/A',
      'New Value': log.new_value || 'N/A',
      'User': log.created_by,
      'Date': new Date(log.created_date).toLocaleString(),
      'CM Code': log.cm_code,
      'SKU Code': log.sku_code || 'N/A',
      'Component Code': log.component_code || 'N/A'
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');
    
    // Add headers
    const headers = Object.keys(exportData[0]);
    worksheet.addRow(headers);
    
    // Add data rows
    exportData.forEach(row => {
      worksheet.addRow(Object.values(row));
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    const fileName = `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // ===== PAGINATION =====
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // ===== HELPER FUNCTIONS =====
  
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return 'ri-add-circle-line';
      case 'UPDATE': return 'ri-edit-line';
      case 'STATUS_CHANGE': return 'ri-toggle-line';
      case 'DELETE': return 'ri-delete-bin-line';
      default: return 'ri-file-list-line';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return '#28a745';
      case 'UPDATE': return '#007bff';
      case 'STATUS_CHANGE': return '#ffc107';
      case 'DELETE': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ===== RENDER FUNCTIONS =====
  
  const renderFilters = () => (
    <div style={{ 
      background: '#f8f9fa', 
      padding: '20px', 
      borderRadius: '8px', 
      marginBottom: '20px',
      border: '1px solid #e9ecef'
    }}>
      <h5 style={{ marginBottom: '20px', color: '#333' }}>Filter Audit Logs</h5>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
        {/* Date Range */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Date From:</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Date To:</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Action Type */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Action Type:</label>
          <select
            value={filters.actionType}
            onChange={(e) => handleFilterChange('actionType', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Actions</option>
            {actionTypes.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        {/* Entity Type */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Entity Type:</label>
          <select
            value={filters.entityType}
            onChange={(e) => handleFilterChange('entityType', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Entities</option>
            {entityTypes.map(entity => (
              <option key={entity} value={entity}>{entity}</option>
            ))}
          </select>
        </div>

        {/* User */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>User:</label>
          <select
            value={filters.user}
            onChange={(e) => handleFilterChange('user', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Users</option>
            {users.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>

        {/* CM Code */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>CM Code:</label>
          <select
            value={filters.cmCode}
            onChange={(e) => handleFilterChange('cmCode', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All CM Codes</option>
            {cmCodes.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>

        {/* SKU Code */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>SKU Code:</label>
          <input
            type="text"
            placeholder="Enter SKU code"
            value={filters.skuCode}
            onChange={(e) => handleFilterChange('skuCode', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Component Code */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Component Code:</label>
          <input
            type="text"
            placeholder="Enter component code"
            value={filters.componentCode}
            onChange={(e) => handleFilterChange('componentCode', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      {/* Filter Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button
          onClick={handleApplyFilters}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Apply Filters
        </button>
        
        <button
          onClick={handleClearFilters}
          style={{
            background: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );

  const renderAuditTable = () => (
    <div style={{ 
      background: 'white', 
      borderRadius: '8px', 
      overflow: 'hidden',
      border: '1px solid #e9ecef',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* Table Header */}
      <div style={{ 
        background: '#000', 
        color: 'white', 
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h5 style={{ margin: 0, fontSize: '18px' }}>Audit Log Entries</h5>
        
        <button
          onClick={exportToExcel}
          disabled={auditLogs.length === 0}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: auditLogs.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            opacity: auditLogs.length > 0 ? 1 : 0.6
          }}
        >
          <i className="ri-file-excel-line" style={{ marginRight: '5px' }}></i>
          Export to Excel
        </button>
      </div>

      {/* Table */}
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          backgroundColor: '#fff'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600' }}>
                Action
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600' }}>
                Entity
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600' }}>
                Details
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600' }}>
                Changes
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600' }}>
                User
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600' }}>
                Date
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: '600' }}>
                CM Code
              </th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log, index) => (
              <tr key={log.id} style={{ 
                backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                borderBottom: '1px solid #e9ecef'
              }}>
                {/* Action */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i 
                      className={getActionIcon(log.action)} 
                      style={{ 
                        color: getActionColor(log.action), 
                        fontSize: '18px' 
                      }}
                    />
                    <span style={{ 
                      color: getActionColor(log.action), 
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      {log.action}
                    </span>
                  </div>
                </td>

                {/* Entity */}
                <td style={{ padding: '12px 16px' }}>
                  <div>
                    <div style={{ fontWeight: '500', color: '#333' }}>
                      {log.entity_type.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {log.entity_code}
                    </div>
                    {log.entity_description && (
                      <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                        {log.entity_description}
                      </div>
                    )}
                  </div>
                </td>

                {/* Details */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '13px' }}>
                    {log.sku_code && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>SKU:</strong> {log.sku_code}
                      </div>
                    )}
                    {log.component_code && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Component:</strong> {log.component_code}
                      </div>
                    )}
                    {log.cm_description && (
                      <div style={{ color: '#666' }}>
                        {log.cm_description}
                      </div>
                    )}
                  </div>
                </td>

                {/* Changes */}
                <td style={{ padding: '12px 16px' }}>
                  {log.old_value && log.new_value ? (
                    <div style={{ fontSize: '13px' }}>
                      <div style={{ color: '#dc3545', marginBottom: '4px' }}>
                        <strong>From:</strong> {log.old_value}
                      </div>
                      <div style={{ color: '#28a745' }}>
                        <strong>To:</strong> {log.new_value}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#6c757d', fontSize: '13px', fontStyle: 'italic' }}>
                      {log.action === 'CREATE' ? 'New entry created' : 'Details updated'}
                    </div>
                  )}
                </td>

                {/* User */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '500', color: '#333' }}>
                    {log.created_by}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    ID: {log.user_id}
                  </div>
                </td>

                {/* Date */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '13px', color: '#333' }}>
                    {formatDate(log.created_date)}
                  </div>
                </td>

                {/* CM Code */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ 
                    background: '#e9ecef', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#495057'
                  }}>
                    {log.cm_code}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* No Data Message */}
      {auditLogs.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: '#666',
          fontSize: '16px'
        }}>
          <i className="ri-file-list-line" style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}></i>
          <p>No audit log entries found</p>
        </div>
      )}
    </div>
  );

  const renderPagination = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginTop: '20px',
      padding: '20px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      {/* Items per page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '14px', color: '#666' }}>Items per page:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          style={{
            padding: '6px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Page info */}
      <div style={{ fontSize: '14px', color: '#666' }}>
        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
      </div>

      {/* Pagination controls */}
      <div style={{ display: 'flex', gap: '5px' }}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            background: currentPage === 1 ? '#f8f9fa' : 'white',
            color: currentPage === 1 ? '#ccc' : '#333',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          Previous
        </button>

        {/* Page numbers */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
          if (pageNum > totalPages) return null;
          
          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                background: pageNum === currentPage ? '#007bff' : 'white',
                color: pageNum === currentPage ? 'white' : '#333',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '40px'
              }}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            background: currentPage === totalPages ? '#f8f9fa' : 'white',
            color: currentPage === totalPages ? '#ccc' : '#333',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );

  // ===== MAIN RENDER =====
  
  if (loading && auditLogs.length === 0) {
    return (
      <Layout>
        <Loader />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mainInternalPages">
        {/* Page Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '20px 0',
          borderBottom: '1px solid #e9ecef',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#333', fontSize: '28px' }}>
              <i className="ri-file-list-line" style={{ marginRight: '12px', color: '#007bff' }}></i>
              Audit Log
            </h2>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '16px' }}>
              Track all changes and activities in the system
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <i className="ri-refresh-line" style={{ marginRight: '5px' }}></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '15px', 
            borderRadius: '4px', 
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            <i className="ri-error-warning-line" style={{ marginRight: '8px' }}></i>
            {error}
          </div>
        )}

        {/* Filters */}
        {renderFilters()}

        {/* Audit Table */}
        {renderAuditTable()}

        {/* Pagination */}
        {totalPages > 1 && renderPagination()}
      </div>
    </Layout>
  );
};

export default AuditLog;
