/**
 * SPA Router Component
 * Handles dynamic content loading without page refreshes
 */

class SPARouter {
  constructor() {
    this.contentContainer = null;
    this.currentTool = null;
    this.loadedScripts = new Map();
    this.loadedStyles = new Map();
    this.loadingIndicator = null;
    
    // Detect base path for GitHub Pages
    this.basePath = window.location.pathname.replace(/\/[^\/]*$/, '');
    if (this.basePath === '/') {
      this.basePath = '';
    }
    
    this.init();
  }

  init() {
    // Get main content container
    this.contentContainer = document.getElementById('main-content');
    
    if (!this.contentContainer) {
      console.error('Main content container not found');
      return;
    }

    // Create loading indicator
    this.createLoadingIndicator();
    
    // Intercept navigation clicks
    this.interceptLinks();
    
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.tool) {
        this.loadTool(e.state.tool, false);
      }
    });

    // Check initial URL and load appropriate content
    const hash = window.location.hash.substring(1);
    if (hash) {
      // Load tool from hash
      this.loadTool(hash, false);
    } else {
      // Load home content by default
      this.loadTool('index', false);
    }
  }

  createLoadingIndicator() {
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.className = 'spa-loading';
    this.loadingIndicator.innerHTML = `
      <div class="loading-spinner">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Loading...</span>
      </div>
    `;
    document.body.appendChild(this.loadingIndicator);
  }

  showLoading() {
    this.loadingIndicator.classList.add('active');
  }

  hideLoading() {
    this.loadingIndicator.classList.remove('active');
  }

  interceptLinks() {
    // Intercept sidebar links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*=".html"], a[href^="#"]');
      if (link && !link.target) {
        e.preventDefault();
        const href = link.getAttribute('href');
        let tool;
        
        // Handle hash links (sidebar navigation)
        if (href.startsWith('#')) {
          tool = href.substring(1);
        } else {
          // Handle .html links
          tool = href.split('/').pop().replace('.html', '');
        }
        
        // Handle home page specially
        if (tool === 'index' || href === '/' || href === './index.html') {
          tool = 'index';
        }
        
        // Update sidebar active state
        if (window.sidebarMenu) {
          window.sidebarMenu.updateActivePage(tool);
        }
        
        this.navigate(tool);
      }
    });
  }

  navigate(tool) {
    // Update URL without refresh using hash
    const hash = tool === 'index' ? '' : `#${tool}`;
    history.pushState({ tool }, '', `/${hash}`);
    
    // Load tool content
    this.loadTool(tool, true);
  }

  async loadTool(tool, addToHistory = true) {
    // Don't reload if already loaded
    if (this.currentTool === tool) {
      return;
    }

    // Show loading
    this.showLoading();
    
    try {
      // Clean up previous tool
      await this.cleanupCurrentTool();
      
      // Load tool content
      const content = await this.fetchToolContent(tool);
      
      // Load tool-specific CSS
      await this.loadToolCSS(tool);
      
      // Update content
      this.contentContainer.innerHTML = content;
      
      // Load tool-specific JS
      await this.loadToolJS(tool);
      
      // Initialize page if initialization function exists
      this.initializePage(tool);
      
      // Update current tool
      this.currentTool = tool;
      
      // Update page title
      this.updatePageTitle(tool);
      
      // Scroll to top
      window.scrollTo(0, 0);
      
    } catch (error) {
      console.error('Error loading tool:', error);
      this.showError('Failed to load tool. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  async fetchToolContent(tool) {
    if (tool === 'index' || tool === '') {
      // Return home content
      return await this.fetchFile(`${this.basePath}/fragments/home.html`);
    }
    
    // Fetch tool content fragment
    return await this.fetchFile(`${this.basePath}/fragments/${tool}.html`);
  }

  async fetchFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return await response.text();
  }

  async loadToolCSS(tool) {
    // Only unload previous page CSS if we're switching to a different tool
    if (this.currentTool && this.currentTool !== tool) {
      this.unloadPreviousPageCSS();
    }
    
    if (tool === 'index') {
      // Ensure index.css is loaded for home
      const cssUrl = `${this.basePath}/css/pages/index.css`;
      if (!this.loadedStyles.has(cssUrl)) {
        return new Promise((resolve) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = cssUrl;
          link.onload = () => {
            this.loadedStyles.set(cssUrl, link);
            resolve();
          };
          link.onerror = () => {
            console.warn(`Failed to load CSS: ${cssUrl}`);
            resolve();
          };
          document.head.appendChild(link);
        });
      }
      return;
    }
    
    const cssUrl = `${this.basePath}/css/pages/${tool}.css`;
    
    // Skip if already loaded
    if (this.loadedStyles.has(cssUrl)) {
      return;
    }
    
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl;
      link.onload = () => {
        this.loadedStyles.set(cssUrl, link);
        resolve();
      };
      link.onerror = () => {
        console.warn(`Failed to load CSS: ${cssUrl}`);
        resolve(); // Continue even if CSS fails
      };
      document.head.appendChild(link);
    });
  }

  unloadPreviousPageCSS() {
    // Remove all page-specific CSS except the current one
    for (const [url, link] of this.loadedStyles) {
      if (url.includes('/css/pages/') && !url.includes('index.css')) {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        this.loadedStyles.delete(url);
      }
    }
  }

  async loadToolJS(tool) {
    if (tool === 'index') {
      // Load home JS
      await this.loadScript(`${this.basePath}/js/pages/index.js`);
      return;
    }
    
    // Load tool-specific JS with pages- prefix
    await this.loadScript(`${this.basePath}/js/pages/pages-${tool}.js`);
  }

  loadScript(url) {
    // Skip if already loaded
    if (this.loadedScripts.has(url)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        this.loadedScripts.set(url, script);
        resolve();
      };
      script.onerror = () => {
        console.warn(`Failed to load script: ${url}`);
        resolve(); // Continue even if script fails
      };
      document.head.appendChild(script);
    });
  }

  async cleanupCurrentTool() {
    if (!this.currentTool) {
      return;
    }
    
    // Call cleanup function if exists
    if (window[`cleanup_${this.currentTool}`]) {
      try {
        await window[`cleanup_${this.currentTool}`]();
      } catch (error) {
        console.warn(`Cleanup error for ${this.currentTool}:`, error);
      }
    }
    
    // Remove event listeners from old content
    const oldContent = this.contentContainer.cloneNode(true);
    this.contentContainer.innerHTML = '';
    
    // Force garbage collection hint
    if (window.gc) {
      window.gc();
    }
  }

  initializePage(tool) {
    // Call page-specific initialization function if it exists
    const initFunctionName = `init${tool.charAt(0).toUpperCase() + tool.slice(1)}Page`;
    if (typeof window[initFunctionName] === 'function') {
      window[initFunctionName]();
    }
  }

  updatePageTitle(tool) {
    const titles = {
      index: 'eDM Helper - Tools for Email Marketing & Productivity',
      config: 'Config eDM - eDM Helper',
      bookmarklet: 'Bookmarklet - eDM Helper',
      'campaign-counter': 'Campaign Counter - eDM Helper',
      'database-checker': 'Database Checker - eDM Helper',
      'database-generator': 'Database Generator - eDM Helper',
      'layout-checker': 'Layout Checker - eDM Helper',
      'link-checker': 'Link Checker - eDM Helper',
      'wfh-tracker': 'WFH Tracker - eDM Helper'
    };
    
    const toolNames = {
      index: 'eDM Helper',
      config: 'Config eDM',
      bookmarklet: 'Bookmarklet',
      'campaign-counter': 'Campaign Counter',
      'database-checker': 'Database Checker',
      'database-generator': 'Database Generator',
      'layout-checker': 'Layout Checker',
      'link-checker': 'Link Checker',
      'wfh-tracker': 'WFH Tracker'
    };
    
    document.title = titles[tool] || titles.index;
    
    // Update nav-brand text
    const navTitleElement = document.querySelector('.nav-title');
    if (navTitleElement) {
      navTitleElement.textContent = toolNames[tool] || toolNames.index;
    }
    
    // Update nav-page-title
    const navPageTitleElement = document.getElementById('nav-page-title');
    if (navPageTitleElement) {
      navPageTitleElement.textContent = tool === 'index' ? 'v8.1.0 - Optime' : 'v8.1.0';
    }
  }

  showError(message) {
    this.contentContainer.innerHTML = `
      <div class="error-container" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        padding: var(--space-6);
        text-align: center;
      ">
        <i class="fa-solid fa-exclamation-triangle" style="
          font-size: 3rem;
          color: var(--warning);
          margin-bottom: var(--space-4);
        "></i>
        <h2 style="font-size: 1.5rem; margin-bottom: var(--space-2);">Oops!</h2>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">${message}</p>
        <button onclick="window.spaRouter.navigate('index')" class="btn btn-primary">
          <i class="fa-solid fa-home"></i>
          Back to Home
        </button>
      </div>
    `;
  }
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing SPA Router...');
  window.spaRouter = new SPARouter();
  console.log('SPA Router initialized');
});

// Helper functions for hero buttons
window.scrollToTools = function() {
  const toolsSection = document.querySelector('.content');
  if (toolsSection) {
    toolsSection.scrollIntoView({ behavior: 'smooth' });
  }
};

window.showQuickGuide = function() {
  // Create a simple modal for quick guide
  const modal = document.createElement('div');
  modal.className = 'quick-guide-modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <h3>Quick Guide</h3>
      <p>Welcome to eDM Helper! Here's how to get started:</p>
      <ol>
        <li>Use the sidebar to navigate between tools</li>
        <li>Click the hamburger menu to toggle sidebar width</li>
        <li>All tools work instantly without page reloads</li>
        <li>Each tool is designed to be simple and efficient</li>
      </ol>
      <button class="btn btn-primary" onclick="this.closest('.quick-guide-modal').remove()">Got it!</button>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Add modal styles if not exists
  if (!document.querySelector('#quick-guide-styles')) {
    const styles = document.createElement('style');
    styles.id = 'quick-guide-styles';
    styles.textContent = `
      .quick-guide-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
      }
      .modal-content {
        background: var(--surface);
        padding: var(--space-6);
        border-radius: var(--border-radius-xl);
        max-width: 500px;
        width: 90%;
        position: relative;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: modalFadeIn 0.3s ease;
      }
      @keyframes modalFadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      .modal-content h3 {
        margin-bottom: var(--space-4);
        color: var(--text);
      }
      .modal-content p {
        margin-bottom: var(--space-4);
        color: var(--text-secondary);
      }
      .modal-content ol {
        margin-bottom: var(--space-4);
        padding-left: var(--space-6);
        color: var(--text);
      }
      .modal-content li {
        margin-bottom: var(--space-2);
      }
    `;
    document.head.appendChild(styles);
  }
};

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SPARouter;
}
