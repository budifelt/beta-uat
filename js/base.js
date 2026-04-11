/**
 * BASE.JS - Core JavaScript functionality shared across all pages
 */

// ===================================
// GLOBAL VARIABLES
// ===================================
window.eDMHelper = window.eDMHelper || {
  version: '1.0.0',
  currentPage: '',
  initialized: false
};

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', function() {
  // Set current page from URL
  const path = window.location.pathname;
  const pageName = path.split('/').pop().replace('.html', '');
  window.eDMHelper.currentPage = pageName;
  
  // Run common initialization
  initializeCommon();
  
  // Mark as initialized
  window.eDMHelper.initialized = true;
});

/**
 * Common initialization tasks
 */
function initializeCommon() {
  // Add smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  
  // Add keyboard navigation support
  document.addEventListener('keydown', handleKeyboardNavigation);
  
  // Initialize tooltips
  initializeTooltips();
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Handle keyboard navigation
 */
function handleKeyboardNavigation(e) {
  // ESC to close modals
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal.active, .footer-modal.active');
    if (activeModal) {
      activeModal.classList.remove('active');
    }
  }
}

/**
 * Initialize tooltips
 */
function initializeTooltips() {
  document.querySelectorAll('[data-tooltip]').forEach(element => {
    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
  });
}

/**
 * Show tooltip
 */
function showTooltip(e) {
  const tooltip = e.target.dataset.tooltip;
  if (!tooltip) return;
  
  const tooltipEl = document.createElement('div');
  tooltipEl.className = 'tooltip-popup';
  tooltipEl.textContent = tooltip;
  tooltipEl.style.cssText = `
    position: absolute;
    background: var(--text);
    color: white;
    padding: 4px 8px;
    border-radius: 0;
    font-size: 12px;
    z-index: 10000;
    pointer-events: none;
    white-space: nowrap;
  `;
  
  document.body.appendChild(tooltipEl);
  
  const rect = e.target.getBoundingClientRect();
  tooltipEl.style.top = `${rect.top - tooltipEl.offsetHeight - 5}px`;
  tooltipEl.style.left = `${rect.left + (rect.width - tooltipEl.offsetWidth) / 2}px`;
  
  e.target._tooltip = tooltipEl;
}

/**
 * Hide tooltip
 */
function hideTooltip(e) {
  if (e.target._tooltip) {
    e.target._tooltip.remove();
    delete e.target._tooltip;
  }
}

// ===================================
// MODAL FUNCTIONS
// ===================================

/**
 * Open modal
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus first focusable element
    const focusable = modal.querySelector('button, input, select, textarea, a[href]');
    if (focusable) focusable.focus();
  }
}

/**
 * Close modal
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ===================================
// STORAGE HELPERS
// ===================================

/**
 * Get item from localStorage
 */
function storageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return defaultValue;
  }
}

/**
 * Set item in localStorage
 */
function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing to localStorage:', e);
  }
}

/**
 * Remove item from localStorage
 */
function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Error removing from localStorage:', e);
  }
}

// ===================================
// EXPORT GLOBAL FUNCTIONS
// ===================================
window.openModal = openModal;
window.closeModal = closeModal;
window.storageGet = storageGet;
window.storageSet = storageSet;
window.storageRemove = storageRemove;
