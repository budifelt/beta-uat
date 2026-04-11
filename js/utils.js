/**
 * UTILS.JS - Shared utility functions across all pages
 */

// ===================================
// DOM HELPERS
// ===================================

/**
 * Create element with attributes
 */
function createElement(tag, attributes = {}, children = []) {
  const el = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'innerHTML') {
      el.innerHTML = value;
    } else if (key === 'textContent') {
      el.textContent = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  });
  
  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  });
  
  return el;
}

/**
 * Query selector with error handling
 */
function qs(selector, parent = document) {
  const el = parent.querySelector(selector);
  if (!el) {
    console.warn(`Element not found: ${selector}`);
    return null;
  }
  return el;
}

/**
 * Query selector all
 */
function qsa(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

// ===================================
// STRING HELPERS
// ===================================

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string
 */
function truncate(str, length, suffix = '...') {
  return str.length > length ? str.slice(0, length) + suffix : str;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===================================
// DATE HELPERS
// ===================================

/**
 * Format date
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * Get relative time
 */
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// ===================================
// VALIDATION HELPERS
// ===================================

/**
 * Validate email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate URL
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate campaign ID format
 */
function isValidCampaignId(id) {
  // Format: YYYYMMDD-XXX
  const re = /^\d{8}-\d{3}$/;
  return re.test(id);
}

// ===================================
// FILE HELPERS
// ===================================

/**
 * Get file extension
 */
function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Download file
 */
function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===================================
// ARRAY HELPERS
// ===================================

/**
 * Remove duplicates from array
 */
function unique(array) {
  return [...new Set(array)];
}

/**
 * Group array by key
 */
function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
}

/**
 * Sort array by key
 */
function sortBy(array, key, direction = 'asc') {
  return array.sort((a, b) => {
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// ===================================
// DEBOUNCE & THROTTLE
// ===================================

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ===================================
// COLOR HELPERS
// ===================================

/**
 * Convert hex to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Get contrasting color
 */
function getContrastColor(hexcolor) {
  const rgb = hexToRgb(hexcolor);
  if (!rgb) return '#000000';
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

// ===================================
// EXPORT GLOBAL FUNCTIONS
// ===================================
window.createElement = createElement;
window.qs = qs;
window.qsa = qsa;
window.capitalize = capitalize;
window.truncate = truncate;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.getRelativeTime = getRelativeTime;
window.isValidEmail = isValidEmail;
window.isValidUrl = isValidUrl;
window.isValidCampaignId = isValidCampaignId;
window.getFileExtension = getFileExtension;
window.formatFileSize = formatFileSize;
window.downloadFile = downloadFile;
window.unique = unique;
window.groupBy = groupBy;
window.sortBy = sortBy;
window.debounce = debounce;
window.throttle = throttle;
window.hexToRgb = hexToRgb;
window.getContrastColor = getContrastColor;
