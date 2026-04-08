// Toast Utility
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
  
  // Fallback to console
  console.log(`[${type.toUpperCase()}] ${title ? title + ': ' : ''}${message}`);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = showToast;
} else {
  window.showToast = showToast;
}
