/* ===================================
   TOAST UTILITY - Merged from toast.js
   =================================== */

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


// Initialize Toast Manager
document.addEventListener('DOMContentLoaded', () => {
  window.toastManager = new ToastManager();
});

/* ===================================
   ORIGINAL CODE
   =================================== */

// Bookmarklet Tools - Regular JavaScript Version
class BookmarkletTools {
    constructor() {
        this.init();
    }
    
    init() {
        // Add event listeners for bookmarklet buttons
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Copy Page Source
        document.getElementById('copy-source')?.addEventListener('click', () => {
            this.copyPageSource();
        });
        
        // Extract Links
        document.getElementById('extract-links')?.addEventListener('click', () => {
            this.extractLinks();
        });
        
        // Extract Images
        document.getElementById('extract-images')?.addEventListener('click', () => {
            this.extractImages();
        });
        
        // View Meta Tags
        document.getElementById('view-meta')?.addEventListener('click', () => {
            this.viewMetaTags();
        });
        
        // Remove Element
        document.getElementById('remove-element')?.addEventListener('click', () => {
            this.enableRemoveElement();
        });
        
        // Page Info
        document.getElementById('page-info')?.addEventListener('click', () => {
            this.showPageInfo();
        });
    }
    
    // Copy Page Source
    async copyPageSource() {
        try {
            const response = await fetch(location.href);
            const source = await response.text();
            
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(source);
                this.showToast('Source code copied to clipboard!', 'success');
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = source;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showToast('Source code copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Error copying source:', error);
            this.showToast('Failed to copy source code', 'error');
        }
    }
    
    // Extract All Links
    extractLinks() {
        const links = Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.innerText.trim(),
            href: a.href,
            target: a.target || '_self'
        }));
        
        const result = links.map((link, i) => 
            `${i+1}. ${link.text}\n   URL: ${link.href}\n   Target: ${link.target}`
        ).join('\n\n');
        
        this.showResult('Extracted Links', result);
    }
    
    // Extract Images
    extractImages() {
        const images = Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src);
        
        const result = images.map((src, i) => 
            `${i+1}. ${src}`
        ).join('\n');
        
        this.showResult('Extracted Images', result);
    }
    
    // View Meta Tags
    viewMetaTags() {
        const metas = Array.from(document.querySelectorAll('meta'));
        let output = '=== META TAGS ===\n\n';
        
        metas.forEach(meta => {
            const name = meta.name || meta.property || meta.httpEquiv || 'charset';
            const content = meta.content || meta.charset || '';
            output += `${name}: ${content}\n`;
        });
        
        this.showResult('Meta Tags', output);
    }
    
    // Enable Remove Element Mode
    enableRemoveElement() {
        document.body.style.cursor = 'crosshair';
        
        function removeElement(e) {
            e.stopPropagation();
            e.preventDefault();
            
            if (e.target === document.body) return;
            
            e.target.remove();
            
            // Clean up
            document.body.style.cursor = '';
            document.removeEventListener('click', removeElement, true);
            
            if (window.showToast) {
                window.showToast('success', 'Element Removed', 'Element removed successfully!');
            } else {
                alert('Element removed!');
            }
        }
        
        document.addEventListener('click', removeElement, true);
        
        // Add cancel instruction
        const instruction = document.createElement('div');
        instruction.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
        `;
        instruction.textContent = 'Click any element to remove it';
        document.body.appendChild(instruction);
        
        setTimeout(() => instruction.remove(), 3000);
    }
    
    // Show Page Info
    showPageInfo() {
        const info = {
            title: document.title,
            url: location.href,
            domain: location.hostname,
            protocol: location.protocol,
            path: location.pathname,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookies: document.cookie ? 'Enabled' : 'Disabled',
            localStorage: Object.keys(localStorage).length + ' items',
            sessionStorage: Object.keys(sessionStorage).length + ' items'
        };
        
        const output = Object.entries(info)
            .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
            .join('\n');
        
        this.showResult('Page Information', output);
    }
    
    // Show result in modal or alert
    showResult(title, content) {
        // Check if modal exists
        const modal = document.getElementById('result-modal');
        if (modal) {
            document.getElementById('result-title').textContent = title;
            document.getElementById('result-content').textContent = content;
            modal.classList.add('active');
        } else {
            // Fallback to console
            console.log(`${title}:\n\n${content}`);
            
            // Try to copy to clipboard
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(content);
                this.showToast('Result copied to clipboard!', 'success');
            } else {
                // Show in alert as last resort
                alert(`${title}:\n\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}`);
            }
        }
    }
    
    // Show toast notification - using global toast manager
    showToast(message, type = 'info') {
        // Use global toast system if available
        if (type === 'success' && window.toastSuccess) {
            window.toastSuccess(message, 'Bookmarklet');
            return;
        } else if (type === 'error' && window.toastError) {
            window.toastError(message, 'Bookmarklet');
            return;
        } else if (type === 'warning' && window.toastWarning) {
            window.toastWarning(message, 'Bookmarklet');
            return;
        } else if (window.toastInfo) {
            window.toastInfo(message, 'Bookmarklet');
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
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize bookmarklet tools
    window.bookmarkletTools = new BookmarkletTools();
    
    // Track bookmarklet usage analytics
    const trackBookmarkletClick = (toolName) => {
        console.log(`Bookmarklet tool clicked: ${toolName}`);
    };
    
    // Add click tracking to bookmarklet buttons
    const bookmarkletBtns = document.querySelectorAll('.bookmarklet-btn, .tool-btn');
    bookmarkletBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const toolName = this.getAttribute('data-tool') || this.closest('.bookmarklet-card, .tool-card')?.querySelector('h3')?.textContent || 'Unknown';
            trackBookmarkletClick(toolName);
        });
        
        // Prevent default drag behavior
        btn.addEventListener('dragstart', function(e) {
            // Allow default drag behavior for bookmarklets
        });
    });
});