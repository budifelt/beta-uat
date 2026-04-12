/**
 * Sidebar Menu Component
 * Handles sidebar toggle and navigation functionality
 * Supports lazy loading for better performance
 */

class SidebarMenu {
  constructor() {
    this.sidebar = null;
    this.overlay = null;
    this.toggleBtn = null;
    this.isFullWidth = true;
    this.currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    this.isLoaded = false;
    
    // Defer initialization
    this.initLazy();
  }

  initLazy() {
    // Wait for first user interaction before loading sidebar
    const initOnInteraction = () => {
      this.init();
      this.isLoaded = true;
      // Remove event listeners after initialization
      document.removeEventListener('click', initOnInteraction);
      document.removeEventListener('touchstart', initOnInteraction);
      document.removeEventListener('keydown', initOnInteraction);
    };

    // Initialize on first interaction
    document.addEventListener('click', initOnInteraction, { once: true });
    document.addEventListener('touchstart', initOnInteraction, { once: true });
    document.addEventListener('keydown', initOnInteraction, { once: true });

    // Also initialize after a delay if no interaction
    setTimeout(() => {
      if (!this.isLoaded) {
        initOnInteraction();
      }
    }, 3000);
  }

  init() {
    // Get references
    this.sidebar = document.querySelector('.sidebar-menu');
    this.overlay = document.querySelector('.sidebar-overlay');
    this.mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    this.sidebarCollapseToggle = document.querySelector('.sidebar-collapse-toggle');
    
    // Add event listeners
    this.bindEvents();
    
    // Set active menu item
    this.setActiveMenuItem();
    
    // Load sidebar content if not already in DOM
    if (!this.sidebar) {
      this.createSidebar();
    }
  }

  createSidebar() {
    // Create sidebar HTML
    const sidebarHTML = `
      <!-- Sidebar Toggle Button -->
      <button class="sidebar-toggle" aria-label="Toggle menu" aria-expanded="true">
        <i class="fa-solid fa-bars"></i>
      </button>

      <!-- Sidebar Menu -->
      <aside class="sidebar-menu active" role="navigation" aria-label="Main navigation" aria-hidden="false">
        <div class="sidebar-header">
          <h2 class="sidebar-title">eDM Helper</h2>
        </div>
        
        <nav class="sidebar-nav">
          <div class="sidebar-section">
            <h3 class="sidebar-section-title">Tools</h3>
            <a href="index.html" class="sidebar-item" data-page="index" data-tooltip="Home">
              <i class="fa-solid fa-home"></i>
              <span class="sidebar-item-text">Home</span>
            </a>
            <a href="config.html" class="sidebar-item" data-page="config" data-tooltip="Config eDM">
              <i class="fa-solid fa-cog"></i>
              <span class="sidebar-item-text">Config eDM</span>
            </a>
            <a href="bookmarklet.html" class="sidebar-item" data-page="bookmarklet" data-tooltip="Bookmarklet">
              <i class="fa-solid fa-bookmark"></i>
              <span class="sidebar-item-text">Bookmarklet</span>
            </a>
            <a href="campaign-counter.html" class="sidebar-item" data-page="campaign-counter" data-tooltip="Campaign Counter">
              <i class="fa-solid fa-chart-line"></i>
              <span class="sidebar-item-text">Campaign Counter</span>
            </a>
            <a href="database-checker.html" class="sidebar-item" data-page="database-checker" data-tooltip="Database Checker">
              <i class="fa-solid fa-check-circle"></i>
              <span class="sidebar-item-text">Database Checker</span>
            </a>
            <a href="database-generator.html" class="sidebar-item" data-page="database-generator" data-tooltip="Database Generator">
              <i class="fa-solid fa-database"></i>
              <span class="sidebar-item-text">Database Generator</span>
            </a>
            <a href="layout-checker.html" class="sidebar-item" data-page="layout-checker" data-tooltip="Layout Checker">
              <i class="fa-solid fa-ruler-combined"></i>
              <span class="sidebar-item-text">Layout Checker</span>
            </a>
            <a href="link-checker.html" class="sidebar-item" data-page="link-checker" data-tooltip="Link Checker">
              <i class="fa-solid fa-link"></i>
              <span class="sidebar-item-text">Link Checker</span>
            </a>
            <a href="wfh-tracker.html" class="sidebar-item" data-page="wfh-tracker" data-tooltip="WFH Tracker">
              <i class="fa-solid fa-calendar"></i>
              <span class="sidebar-item-text">WFH Tracker</span>
            </a>
          </div>
          
          <div class="sidebar-section">
            <h3 class="sidebar-section-title">Resources</h3>
            <a href="https://github.com/budife" target="_blank" class="sidebar-item">
              <i class="fa-brands fa-github"></i>
              <span class="sidebar-item-text">GitHub</span>
            </a>
            <a href="https://www.instagram.com/budife.psd/" target="_blank" class="sidebar-item">
              <i class="fa-brands fa-instagram"></i>
              <span class="sidebar-item-text">Instagram</span>
            </a>
            <a href="https://www.linkedin.com/in/budife/" target="_blank" class="sidebar-item">
              <i class="fa-brands fa-linkedin"></i>
              <span class="sidebar-item-text">LinkedIn</span>
            </a>
                      </div>
        </nav>
      </aside>

      <!-- Sidebar Overlay -->
      <div class="sidebar-overlay"></div>
    `;

    // Insert sidebar at the beginning of body
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
  }

  bindEvents() {
    // Sidebar collapse toggle (desktop)
    this.sidebarCollapseToggle?.addEventListener('click', () => this.toggleSidebarCollapse());
    
    // Mobile menu toggle
    this.mobileMenuToggle?.addEventListener('click', () => this.toggleMobileSidebar());
    
    // Overlay click to close sidebar on mobile
    this.overlay?.addEventListener('click', () => this.closeMobileSidebar());
    
    // Handle menu item clicks
    document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page;
        if (page === this.currentPage) {
          e.preventDefault();
        }
        // Close mobile sidebar after navigation
        if (window.innerWidth < 768) {
          this.closeMobileSidebar();
        }
      });
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) {
        // Ensure sidebar is visible on desktop
        this.sidebar?.classList.remove('mobile-hidden');
        document.body.classList.remove('mobile-sidebar-open');
      }
    });
  }

  toggleSidebarCollapse() {
    if (this.sidebar?.classList.contains('collapsed')) {
      this.expandSidebar();
    } else {
      this.collapseSidebar();
    }
  }
  
  collapseSidebar() {
    this.sidebar?.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
    this.sidebarCollapseToggle?.querySelector('i')?.classList.replace('fa-bars', 'fa-chevron-right');
    // Update aria label
    this.sidebarCollapseToggle?.setAttribute('aria-label', 'Expand sidebar');
  }
  
  expandSidebar() {
    this.sidebar?.classList.remove('collapsed');
    document.body.classList.remove('sidebar-collapsed');
    this.sidebarCollapseToggle?.querySelector('i')?.classList.replace('fa-chevron-right', 'fa-bars');
    // Update aria label
    this.sidebarCollapseToggle?.setAttribute('aria-label', 'Collapse sidebar');
  }
  
  toggleMobileSidebar() {
    if (this.sidebar?.classList.contains('mobile-hidden')) {
      this.openMobileSidebar();
    } else {
      this.closeMobileSidebar();
    }
  }
  
  openMobileSidebar() {
    this.sidebar?.classList.remove('mobile-hidden');
    this.overlay?.classList.add('active');
    document.body.classList.add('mobile-sidebar-open');
  }
  
  closeMobileSidebar() {
    this.sidebar?.classList.add('mobile-hidden');
    this.overlay?.classList.remove('active');
    document.body.classList.remove('mobile-sidebar-open');
  }

  setFullWidth() {
    this.isFullWidth = true;
    this.sidebar?.classList.add('full-width');
    this.sidebar?.classList.remove('icon-only');
    this.toggleBtn?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('sidebar-full');
    document.body.classList.remove('sidebar-icon');
  }

  setIconOnly() {
    this.isFullWidth = false;
    this.sidebar?.classList.remove('full-width');
    this.sidebar?.classList.add('icon-only');
    this.toggleBtn?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sidebar-full');
    document.body.classList.add('sidebar-icon');
  }

  setActiveMenuItem() {
    document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
      const page = item.dataset.page;
      if (page === this.currentPage || (page === 'index' && this.currentPage === '')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // Public method to update active page
  updateActivePage(page) {
    this.currentPage = page;
    this.setActiveMenuItem();
  }
}

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing Sidebar Menu...');
  window.sidebarMenu = new SidebarMenu();
  
  // Connect top sidebar toggle button
  const topSidebarToggle = document.getElementById('top-sidebar-toggle');
  if (topSidebarToggle) {
    topSidebarToggle.addEventListener('click', () => {
      window.sidebarMenu.toggle();
    });
  }
  
  console.log('Sidebar Menu initialized');
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SidebarMenu;
}
