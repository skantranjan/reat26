// API utility functions with Authorization Bearer token
const API_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'Qw8!zR2@pL6';

// Helper function to create headers with Authorization
const createHeaders = (contentType?: string): HeadersInit => {
  const headers: HeadersInit = {};
  
  headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  return headers;
};

// GET request helper
export const apiGet = async (endpoint: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: createHeaders()
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// POST request helper
export const apiPost = async (endpoint: string, data: any, contentType: string = 'application/json'): Promise<any> => {
  const body = contentType === 'application/json' ? JSON.stringify(data) : data;
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: createHeaders(contentType),
    body
  });
  
  if (!response.ok) {
    // Try to get the error message from the response
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = `${errorMessage} - ${errorData.message}`;
      }
    } catch (e) {
      // If we can't parse the response, use the status text
      errorMessage = `${errorMessage} - ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
};

// PUT request helper
export const apiPut = async (endpoint: string, data: any, contentType: string = 'application/json'): Promise<any> => {
  const body = contentType === 'application/json' ? JSON.stringify(data) : data;
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: createHeaders(contentType),
    body
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// PATCH request helper
export const apiPatch = async (endpoint: string, data: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: createHeaders('application/json'),
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// DELETE request helper
export const apiDelete = async (endpoint: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: createHeaders()
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// For FormData requests (no Content-Type header needed)
export const apiPostFormData = async (endpoint: string, formData: FormData): Promise<Response> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: formData
  });
  
  // Return the response object instead of throwing an error
  // This allows the calling code to handle validation errors properly
  return response;
};

export const apiPutFormData = async (endpoint: string, formData: FormData): Promise<Response> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: formData
  });
  
  // Return the response object instead of throwing an error
  // This allows the calling code to handle validation errors properly
  return response;
}; 