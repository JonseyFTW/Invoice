import { format, parseISO, isValid, differenceInDays } from 'date-fns';

// Date formatting utilities
export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, formatString);
};

export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }).format(number);
};

export const formatPercent = (decimal, decimals = 1) => {
  if (decimal === null || decimal === undefined) return '0%';
  
  return `${(decimal * 100).toFixed(decimals)}%`;
};

// String utilities
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str, length = 50, suffix = '...') => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

export const slugify = (str) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Array utilities
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const filterBy = (array, filters) => {
  return array.filter(item => {
    return Object.keys(filters).every(key => {
      const filterValue = filters[key];
      const itemValue = item[key];
      
      if (filterValue === '' || filterValue === null || filterValue === undefined) {
        return true;
      }
      
      if (typeof filterValue === 'string') {
        return itemValue?.toString().toLowerCase().includes(filterValue.toLowerCase());
      }
      
      return itemValue === filterValue;
    });
  });
};

export const unique = (array, key) => {
  if (!key) return [...new Set(array)];
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

// Object utilities
export const pick = (obj, keys) => {
  return keys.reduce((result, key) => {
    if (key in obj) result[key] = obj[key];
    return result;
  }, {});
};

export const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

export const isEmpty = (value) => {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    Object.keys(obj).forEach(key => {
      clonedObj[key] = deepClone(obj[key]);
    });
    return clonedObj;
  }
};

// Validation utilities
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)\.]/g, ''));
};

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateInvoiceNumber = (invoiceNumber) => {
  const regex = /^INV-\d{4}-\d{4}$/;
  return regex.test(invoiceNumber);
};

// File utilities
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

export const isImageFile = (filename) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  return imageExtensions.includes(getFileExtension(filename));
};

export const isPDFFile = (filename) => {
  return getFileExtension(filename) === 'pdf';
};

// Download utilities
export const downloadFile = (data, filename, type = 'application/octet-stream') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadJSON = (data, filename) => {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, filename, 'application/json');
};

export const downloadCSV = (data, filename) => {
  if (!data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const cell = row[header];
      // Escape commas and quotes
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');
  
  downloadFile(csvContent, filename, 'text/csv');
};

// Business logic utilities
export const calculateInvoiceTotal = (lineItems, taxRate = 0) => {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice));
  }, 0);
  
  const taxAmount = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + taxAmount;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

export const getInvoiceStatus = (invoice) => {
  if (invoice.status === 'Paid') return 'paid';
  if (invoice.status === 'Draft') return 'draft';
  
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  
  if (now > dueDate) return 'overdue';
  
  const daysUntilDue = differenceInDays(dueDate, now);
  if (daysUntilDue <= 3) return 'due-soon';
  
  return 'unpaid';
};

export const getStatusColor = (status) => {
  const colors = {
    paid: 'bg-green-100 text-green-800 border-green-200',
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    'due-soon': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    unpaid: 'bg-blue-100 text-blue-800 border-blue-200'
  };
  
  return colors[status] || colors.unpaid;
};

export const getDaysUntilDue = (dueDate) => {
  if (!dueDate) return null;
  return differenceInDays(new Date(dueDate), new Date());
};

// URL utilities
export const buildApiUrl = (endpoint, params = {}) => {
  const baseUrl = process.env.REACT_APP_API_URL || '/api';
  const url = new URL(endpoint, window.location.origin + baseUrl);
  
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });
  
  return url.toString();
};

export const getQueryParams = (search = window.location.search) => {
  return Object.fromEntries(new URLSearchParams(search));
};

export const setQueryParams = (params) => {
  const url = new URL(window.location);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      url.searchParams.set(key, params[key]);
    } else {
      url.searchParams.delete(key);
    }
  });
  window.history.pushState({}, '', url);
};

// Theme utilities
export const getTheme = () => {
  return localStorage.getItem('theme') || 'light';
};

export const setTheme = (theme) => {
  localStorage.setItem('theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

export const toggleTheme = () => {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
};

// Error handling utilities
export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
};

export const isNetworkError = (error) => {
  return error?.code === 'NETWORK_ERROR' || 
         error?.message?.includes('Network Error') ||
         !navigator.onLine;
};

// Performance utilities
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Map and location utilities
export const formatAddressForMaps = (address) => {
  if (!address) return null;
  // Remove extra whitespace and newlines, encode for URL
  return encodeURIComponent(address.replace(/\s+/g, ' ').trim());
};

export const openAddressInMaps = (address) => {
  if (!address) return;
  
  const encodedAddress = formatAddressForMaps(address);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMac = /Mac/.test(navigator.userAgent);
  
  // Detect if Google Maps is available (mobile)
  const googleMapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
  const appleMapsUrl = `http://maps.apple.com/?q=${encodedAddress}`;
  
  if (isIOS || isMac) {
    // Try Apple Maps first on iOS/Mac, fallback to Google Maps
    window.open(appleMapsUrl, '_blank');
  } else {
    // Use Google Maps on other platforms
    window.open(googleMapsUrl, '_blank');
  }
};

export const getMapDirectionsUrl = (fromAddress, toAddress) => {
  if (!toAddress) return null;
  
  const encodedTo = formatAddressForMaps(toAddress);
  const encodedFrom = fromAddress ? formatAddressForMaps(fromAddress) : '';
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMac = /Mac/.test(navigator.userAgent);
  
  if (isIOS || isMac) {
    return `http://maps.apple.com/?${encodedFrom ? `saddr=${encodedFrom}&` : ''}daddr=${encodedTo}`;
  } else {
    return `https://www.google.com/maps/dir/${encodedFrom}/${encodedTo}`;
  }
};

// Local storage utilities with error handling
export const safeLocalStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage: ${key}`, error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage: ${key}`, error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage: ${key}`, error);
      return false;
    }
  }
};