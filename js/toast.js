/* ===================================
   SHARED TOAST UTILITY
   =================================== */

// Global Toast Manager Class
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }
  
  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      // Append to layout area
      const layoutArea = document.querySelector('main.layout');
      if (layoutArea) {
        layoutArea.appendChild(this.container);
      } else {
        // Fallback to body
        document.body.appendChild(this.container);
      }
    } else {
      this.container = document.getElementById('toast-container');
    }
  }
  
  show(message, type = 'info', options = {}) {
    const {
      duration = 3000,
      position = 'top-right'
    } = options;
    
    // Update container position
    this.updatePosition(position);
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#eab308' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      pointer-events: auto;
      cursor: pointer;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;
    toast.textContent = message;
    
    this.container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });
    
    // Remove on click
    toast.addEventListener('click', () => {
      this.remove(toast);
    });
    
    // Auto remove
    setTimeout(() => {
      this.remove(toast);
    }, duration);
  }
  
  updatePosition(position) {
    const positions = {
      'top-right': 'top: 80px; right: 20px;',
      'top-left': 'top: 80px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;'
    };
    
    this.container.style.cssText = `
      position: fixed;
      z-index: 10000;
      pointer-events: none;
      ${positions[position] || positions['top-right']}
    `;
  }
  
  remove(toast) {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
  
  success(message, options = {}) {
    this.show(message, 'success', options);
  }
  
  error(message, options = {}) {
    this.show(message, 'error', options);
  }
  
  warning(message, options = {}) {
    this.show(message, 'warning', options);
  }
  
  info(message, options = {}) {
    this.show(message, 'info', options);
  }
}

// Shared showToast function
function showToast(message, type = 'info', title = '') {
  // Use global toast system if available
  if (type === 'success' && window.toastSuccess) {
    window.toastSuccess(message, title);
    return;
  } else if (type === 'error' && window.toastError) {
    window.toastError(message, title);
    return;
  } else if (type === 'warning' && window.toastWarning) {
    window.toastWarning(message, title);
    return;
  } else if (window.toastInfo) {
    window.toastInfo(message, title);
    return;
  }
  
  // Fallback - create simple toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.style.opacity = '1', 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Initialize global toast manager
window.toastManager = new ToastManager();

// Global toast functions for compatibility
window.toastSuccess = function(message, title = '') {
  if (window.toastManager) {
    window.toastManager.success(message);
  }
};

window.toastError = function(message, title = '') {
  if (window.toastManager) {
    window.toastManager.error(message);
  }
};

window.toastWarning = function(message, title = '') {
  if (window.toastManager) {
    window.toastManager.warning(message);
  }
};

window.toastInfo = function(message, title = '') {
  if (window.toastManager) {
    window.toastManager.info(message);
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ToastManager, showToast };
}
