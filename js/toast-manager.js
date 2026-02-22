// Toast Notification System
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.init();
  }

  init() {
    // Create toast container
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(options) {
    const {
      id = Date.now(),
      type = 'info',
      title,
      message,
      duration = 5000,
      action
    } = options;

    // Remove existing toast with same ID
    if (this.toasts.has(id)) {
      this.remove(id);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.dataset.toastId = id;

    // Icon based on type
    const icons = {
      success: 'fa-solid fa-check-circle',
      error: 'fa-solid fa-exclamation-circle',
      warning: 'fa-solid fa-exclamation-triangle',
      info: 'fa-solid fa-info-circle'
    };

    toast.innerHTML = `
      <i class="${icons[type]} toast-icon"></i>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      ${action ? `<button class="toast-action" onclick="${action.handler}">${action.label}</button>` : ''}
      <button class="toast-close" onclick="toastManager.remove(${id})">
        <i class="fa-solid fa-times"></i>
      </button>
    `;

    // Add to container
    this.container.appendChild(toast);

    // Store reference
    this.toasts.set(id, toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  remove(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;

    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(id);
    }, 300);
  }

  clear() {
    this.toasts.forEach((toast, id) => this.remove(id));
  }

  // Convenience methods
  success(message, title = 'Success') {
    return this.show({ type: 'success', title, message });
  }

  error(message, title = 'Error') {
    return this.show({ type: 'error', title, message, duration: 0 });
  }

  warning(message, title = 'Warning') {
    return this.show({ type: 'warning', title, message });
  }

  info(message, title = 'Info') {
    return this.show({ type: 'info', title, message });
  }
}

// Create global instance
const toastManager = new ToastManager();

// Global functions
window.showToast = (options) => toastManager.show(options);
window.toastSuccess = (message, title) => toastManager.success(message, title);
window.toastError = (message, title) => toastManager.error(message, title);
window.toastWarning = (message, title) => toastManager.warning(message, title);
window.toastInfo = (message, title) => toastManager.info(message, title);
