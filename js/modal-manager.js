// Initialize modal manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if modal manager already exists
  if (!window.modalManager) {
    window.modalManager = new ModalManager();
    console.log('Modal Manager initialized');
  }
  
  // Global click handler for modal backdrop (fallback)
  document.addEventListener('click', (e) => {
    // Check if any modal is active
    const activeModal = document.querySelector('.modal.active');
    if (activeModal && !e.defaultPrevented) { // Check if event wasn't already handled
      // Check if click is on modal backdrop (not on content)
      const modalContent = activeModal.querySelector('.modal-content');
      if (modalContent && !modalContent.contains(e.target) && e.target === activeModal) {
        console.log('Global handler: Closing modal due to outside click');
        window.modalManager.hideModal(activeModal.id);
      }
    }
  });
});

// Modal Manager - Handles all modals in the application
class ModalManager {
  constructor() {
    this.modals = {};
    this.loadedModals = new Set();
    this.loadingModals = new Set();
    this.loadedAssets = new Set();
  }

  // Show loading skeleton for modal
  showLoading(modalName) {
    if (this.loadingModals.has(modalName)) return;

    const loadingHTML = `
      <div id="${modalName}-loading" class="modal-loading" style="display: none;">
        <div class="modal-loading-spinner">
          <span class="dot"></span>
        </div>
        <div class="modal-loading-text">Loading...</div>
      </div>
    `;
    
    // Insert loading state
    const temp = document.createElement('div');
    temp.innerHTML = loadingHTML;
    document.body.appendChild(temp.firstElementChild);
    
    this.loadingModals.add(modalName);
  }

  // Hide loading skeleton
  hideLoading(modalName) {
    const loadingElement = document.getElementById(`${modalName}-loading`);
    if (loadingElement) {
      loadingElement.remove();
    }
    this.loadingModals.delete(modalName);
  }

  // Load a modal from partials
  async loadModal(modalName) {
    console.log(`loadModal called for: ${modalName}`);
    console.log(`Already loaded: ${this.loadedModals.has(modalName)}`);
    
    if (this.loadedModals.has(modalName)) {
      console.log(`Modal ${modalName} already loaded`);
      return;
    }

    // Show loading state
    this.showLoading(modalName);

    try {
      console.log(`Fetching modal/modal-${modalName}.html`);
      const response = await fetch(`modal/modal-${modalName}.html`);
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`Failed to load modal: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to load modal: ${response.status}`);
      }
      
      const html = await response.text();
      console.log(`Modal HTML fetched successfully, length: ${html.length}`);
      
      // Hide loading state
      this.hideLoading(modalName);
      
      // Create a temporary div to hold the HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;
      
      // Load stylesheet assets from modal fragment once
      temp.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const absoluteHref = new URL(href, window.location.href).href;
        const assetKey = `css:${absoluteHref}`;
        if (this.loadedAssets.has(assetKey)) return;
        const cssEl = document.createElement('link');
        cssEl.rel = 'stylesheet';
        cssEl.href = absoluteHref;
        document.head.appendChild(cssEl);
        this.loadedAssets.add(assetKey);
      });

      // Load script assets from modal fragment once
      temp.querySelectorAll('script').forEach(script => {
        const src = script.getAttribute('src');
        if (src) {
          const absoluteSrc = new URL(src, window.location.href).href;
          const assetKey = `js:${absoluteSrc}`;
          if (this.loadedAssets.has(assetKey)) return;
          const scriptEl = document.createElement('script');
          scriptEl.src = absoluteSrc;
          scriptEl.defer = true;
          document.body.appendChild(scriptEl);
          this.loadedAssets.add(assetKey);
          return;
        }

        const inline = (script.textContent || '').trim();
        if (!inline) return;
        const assetKey = `inline:${inline}`;
        if (this.loadedAssets.has(assetKey)) return;
        const inlineScript = document.createElement('script');
        inlineScript.textContent = inline;
        document.body.appendChild(inlineScript);
        this.loadedAssets.add(assetKey);
      });

      // Find the modal element in the fragment
      const candidateIds = [
        `modal-${modalName}`,
        `modal-${modalName}-modal`,
        `${modalName}-modal`,
        modalName
      ];

      let modal = null;
      for (const id of candidateIds) {
        modal = temp.querySelector(`#${id}`);
        if (modal) break;
      }

      if (!modal) {
        modal = temp.querySelector('.settings-modal, .modal');
      }

      if (!modal) {
        throw new Error('Modal element not found in HTML');
      }
      
      // Add to DOM
      document.body.appendChild(modal);
      
      // Store reference with modal- prefix
      const modalId = `modal-${modalName}`;
      this.modals[modalName] = modal;
      this.loadedModals.add(modalName);
      
      console.log(`Modal ${modalName} loaded and added to DOM`);
      
    } catch (error) {
      this.hideLoading(modalName);
      console.error(`Failed to load ${modalName}:`, error);
      throw error;
    }
  }

  // Show a specific modal
  async showModal(modalName) {
    await this.loadModal(modalName);
    
    const modal = this.modals[modalName];
    if (!modal) {
      throw new Error(`Modal ${modalName} not found`);
    }

    // Close any other open modals
    this.hideAllModals();

    // Show modal
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    
    // Add escape key listener
    this.addEscapeListener(modalName);
    
    // Add click listener for backdrop
    this.addClickListener(modalName);
    
    // Focus first input
    const firstInput = modal.querySelector('input, textarea, button');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }

    console.log(`Modal ${modalName} shown`);
  }

  // Hide a specific modal
  hideModal(modalName) {
    const modal = this.modals[modalName];
    if (!modal) return;

    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    
    // Remove listeners
    this.removeEscapeListener(modalName);
    this.removeClickListener(modalName);

    console.log(`Modal ${modalName} hidden`);
  }

  // Hide all modals
  hideAllModals() {
    Object.keys(this.modals).forEach(modalName => {
      this.hideModal(modalName);
    });
  }

  // Add escape key listener
  addEscapeListener(modalName) {
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        const modal = this.modals[modalName];
        if (modal && modal.classList.contains('active')) {
          // Use specific modal hide function for edit-profile-modal
          if (modalName === 'edit-profile-modal') {
            if (typeof hideEditProfileModal === 'function') {
              hideEditProfileModal();
            } else {
              this.hideModal(modalName);
            }
          } else {
            this.hideModal(modalName);
          }
        }
      }
    };
    
    document.addEventListener('keydown', escapeHandler);
    this.escapeHandler = escapeHandler;
  }

  // Remove escape key listener
  removeEscapeListener(modalName) {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  // Add click listener for backdrop
  addClickListener(modalName) {
    const clickHandler = (e) => {
      const modal = this.modals[modalName];
      if (modal && modal.classList.contains('active')) {
        // Check if click is on backdrop (not on content)
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent && !modalContent.contains(e.target) && e.target === modal) {
          // Use specific modal hide function for edit-profile-modal
          if (modalName === 'edit-profile-modal') {
            if (typeof hideEditProfileModal === 'function') {
              hideEditProfileModal();
            } else {
              this.hideModal(modalName);
            }
          } else {
            this.hideModal(modalName);
          }
        }
      }
    };
    
    document.addEventListener('click', clickHandler);
    this.clickHandler = clickHandler;
  }

  // Remove click listener
  removeClickListener(modalName) {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
  }

  // Create a confirmation modal dynamically
  showConfirmModal(options) {
    const { title, message, onConfirm, onCancel } = options;
    
    // Create modal HTML
    const modalHTML = `
      <div id="confirm-modal" class="modal active">
        <div class="modal-content confirm-modal">
          <div class="modal-header">
            <h3 class="confirm-title">${title}</h3>
            <button onclick="window.modalManager.hideConfirmModal()" class="confirm-close-btn">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <p class="confirm-message">${message}</p>
          </div>
          <div class="modal-footer">
            <button onclick="window.modalManager.hideConfirmModal(); (onCancel && onCancel())" class="confirm-btn cancel">
              Cancel
            </button>
            <button onclick="window.modalManager.hideConfirmModal(); (onConfirm && onConfirm())" class="confirm-btn confirm">
              Confirm
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add to DOM
    const temp = document.createElement('div');
    temp.innerHTML = modalHTML;
    const modal = temp.firstElementChild;
    document.body.appendChild(modal);
    
    // Store reference
    this.modals['confirm'] = modal;
    
    // Show modal
    document.body.classList.add('modal-open');
    
    // Add escape key listener
    this.addEscapeListener('confirm');
    
    // Add click listener for backdrop
    this.addClickListener('confirm');
  }

  // Hide confirm modal
  hideConfirmModal() {
    const modal = this.modals['confirm'];
    if (modal) {
      modal.remove();
      delete this.modals['confirm'];
      document.body.classList.remove('modal-open');
      this.removeEscapeListener('confirm');
      this.removeClickListener('confirm');
    }
  }

  // Show help modal
  showHelpModal() {
    this.showModal('help');
  }

  // Show theme switcher modal
  showThemeModal() {
    this.showConfirmModal({
      title: 'Theme Settings',
      message: 'Theme settings will be available in the next update.',
      onConfirm: () => console.log('Theme confirmed'),
      onCancel: () => console.log('Theme cancelled')
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModalManager;
}
