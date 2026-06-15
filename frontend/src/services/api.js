// =========================================================================
// BACKEND REST API CLIENT SERVICE
// Purpose: Handles all network requests to the backend server (Auth, POS, Admin, Reports),
//          including automatically adding JWT authentication headers.
// Used in: Almost all views/components to fetch or save data.
// =========================================================================

const BASE_URL = 'http://localhost:8000/api';

// Core fetch wrapper
// Purpose: Helper that appends the JWT bearer token from localStorage and parses response JSON.
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  // Set headers, appending token if available
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    
    // Handle unauthorized response (e.g. token expired)
    // Purpose: Automatically logs the user out and reloads to login page if token is invalid.
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-change'));
      throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  } catch (error) {
    console.error(`[API Client] Error on ${endpoint}:`, error.message);
    throw error;
  }
};

// Exported API controllers mapping directly to our Backend routing endpoints
const api = {
  // Authentication services
  auth: {
    login: (email, password) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    signup: (name, email, password) => 
      request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      })
  },

  // User management (Admin only)
  users: {
    getUsers: () => request('/users'),
    createUser: (data) => 
      request('/users', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    changePassword: (id, newPassword) => 
      request(`/users/${id}/change-password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword })
      }),
    toggleArchive: (id) => 
      request(`/users/${id}/archive`, {
        method: 'PUT'
      }),
    deleteUser: (id) => 
      request(`/users/${id}`, {
        method: 'DELETE'
      })
  },

  // Product categories
  categories: {
    getCategories: () => request('/categories'),
    createCategory: (data) => 
      request('/categories', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateCategory: (id, data) => 
      request(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    deleteCategory: (id) => 
      request(`/categories/${id}`, {
        method: 'DELETE'
      })
  },

  // Products catalog
  products: {
    getProducts: () => request('/products'),
    createProduct: (data) => 
      request('/products', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateProduct: (id, data) => 
      request(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    deleteProduct: (id) => 
      request(`/products/${id}`, {
        method: 'DELETE'
      })
  },

  // Floors & Dining Tables
  tables: {
    // POS tables layout (only fetches active tables)
    getFloors: () => request('/tables/floors'),
    // Admin layout setup (fetches all tables, including deactivated ones)
    getAdminTables: () => request('/tables/admin'),
    createFloor: (name) => 
      request('/tables/floors', {
        method: 'POST',
        body: JSON.stringify({ name })
      }),
    updateFloor: (id, name) => 
      request(`/tables/floors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      }),
    deleteFloor: (id) => 
      request(`/tables/floors/${id}`, {
        method: 'DELETE'
      }),
    createTable: (data) => 
      request('/tables', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateTable: (id, data) => 
      request(`/tables/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    deleteTable: (id) => 
      request(`/tables/${id}`, {
        method: 'DELETE'
      })
  },

  // Coupons & Promotions
  promotions: {
    getPromotions: () => request('/promotions'),
    createPromotion: (data) => 
      request('/promotions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updatePromotion: (id, data) => 
      request(`/promotions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    deletePromotion: (id) => 
      request(`/promotions/${id}`, {
        method: 'DELETE'
      }),
    validateCoupon: (code) => 
      request('/promotions/validate-coupon', {
        method: 'POST',
        body: JSON.stringify({ code })
      })
  },

  // Customer profiling
  customers: {
    getCustomers: (search = '') => request(`/customers?search=${search}`),
    createCustomer: (data) => 
      request('/customers', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateCustomer: (id, data) => 
      request(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    deleteCustomer: (id) => 
      request(`/customers/${id}`, {
        method: 'DELETE'
      })
  },

  // Transactional orders
  orders: {
    getOrders: () => request('/orders'),
    getOrderDetails: (id) => request(`/orders/${id}`),
    createOrder: (data) => 
      request('/orders', {
        method: 'POST',
        body: JSON.stringify(data) // data contains: { tableId, customerId, items, couponCode }
      }),
    updateOrder: (id, data) => 
      request(`/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    processPayment: (id, data) => 
      request(`/orders/${id}/payment`, {
        method: 'POST',
        body: JSON.stringify(data) // data contains: { paymentMethod, paymentReference }
      }),
    emailReceipt: (id, email) => 
      request(`/orders/${id}/email-receipt`, {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    updateKdsStatus: (id, status) => 
      request(`/orders/${id}/kds-status`, {
        method: 'PUT',
        body: JSON.stringify({ status }) // status is: 'To Cook' | 'Preparing' | 'Completed'
      }),
    toggleKdsItem: (itemId) => 
      request(`/orders/items/${itemId}/kds-complete`, {
        method: 'PUT'
      })
  },

  // Analytics & reporting charts (filters: ?period=Today&employeeId=2)
  reports: {
    getSummary: (params = '') => request(`/reports/summary${params}`),
    getSalesTrend: (params = '') => request(`/reports/sales-trend${params}`),
    getTopOrders: (params = '') => request(`/reports/top-orders${params}`),
    getTopProducts: (params = '') => request(`/reports/top-products${params}`),
    getCategorySales: (params = '') => request(`/reports/category-sales${params}`)
  }
};

export default api;
