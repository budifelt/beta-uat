// ===================================
// HELP MODAL JAVASCRIPT
// ===================================

// Show/Hide Help Modal
window.showHelpModal = () => {
  window.modalManager.showModal('help');
  // Add keyboard shortcuts info
  setTimeout(() => {
    const searchInput = document.querySelector('.help-search input');
    if (searchInput) {
      searchInput.focus();
    }
  }, 300);
};

window.hideHelpModal = () => {
  window.modalManager.hideModal('help');
};

// Search help content
window.searchHelp = (query) => {
  const searchResults = document.getElementById('search-results');
  const helpSections = document.querySelectorAll('.help-section');
  
  if (!query) {
    // Show all sections if query is empty
    helpSections.forEach(section => {
      section.style.display = 'block';
    });
    
    if (searchResults) {
      searchResults.innerHTML = '';
      searchResults.style.display = 'none';
    }
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  const results = [];
  
  // Search through help sections
  helpSections.forEach(section => {
    const title = section.querySelector('h4');
    const items = section.querySelectorAll('li');
    
    let hasMatch = false;
    
    // Check title
    if (title && title.textContent.toLowerCase().includes(lowerQuery)) {
      hasMatch = true;
    }
    
    // Check list items
    items.forEach(item => {
      if (item.textContent.toLowerCase().includes(lowerQuery)) {
        hasMatch = true;
        results.push({
          section: title ? title.textContent : 'Unknown',
          text: item.textContent,
          element: item
        });
      }
    });
    
    // Show/hide section based on match
    section.style.display = hasMatch ? 'block' : 'none';
  });
  
  // Display search results
  if (searchResults && results.length > 0) {
    searchResults.innerHTML = `
      <h4>Search Results</h4>
      ${results.map(result => `
        <div class="search-result-item" onclick="scrollToHelpItem(this)">
          <div class="search-result-title">${result.section}</div>
          <div class="search-result-description">${result.text}</div>
        </div>
      `).join('')}
    `;
    searchResults.style.display = 'block';
  } else if (searchResults && query) {
    searchResults.innerHTML = `
      <div class="no-results">
        <i class="fa-solid fa-search"></i>
        <h3>No results found</h3>
        <p>Try searching with different keywords</p>
      </div>
    `;
    searchResults.style.display = 'block';
  }
};

// Scroll to help item
window.scrollToHelpItem = (resultElement) => {
  const searchResults = document.getElementById('search-results');
  if (searchResults) {
    searchResults.style.display = 'none';
  }
  
  // Clear search
  const searchInput = document.querySelector('.help-search input');
  if (searchInput) {
    searchInput.value = '';
    searchHelp('');
  }
  
  // Scroll to the section
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl + / to open help
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault();
    window.showHelpModal();
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add search functionality
  const searchInput = document.querySelector('.help-search input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchHelp(e.target.value);
      }, 300);
    });
    
    // Clear search on Escape
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchHelp('');
      }
    });
  }
  
  // Add click handlers for quick action buttons
  const quickActionButtons = document.querySelectorAll('.help-quick-actions .btn');
  quickActionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const buttonText = e.currentTarget.textContent.trim();
      
      // Track which help links are clicked
      if (typeof gtag === 'function') {
        gtag('event', 'help_link_click', {
          link_name: buttonText
        });
      }
    });
  });
  
  // Add expandable sections for mobile
  if (window.innerWidth <= 768) {
    const sectionTitles = document.querySelectorAll('.help-section h4');
    sectionTitles.forEach(title => {
      title.style.cursor = 'pointer';
      title.addEventListener('click', () => {
        const section = title.parentElement;
        const list = section.querySelector('ul');
        
        if (list) {
          const isExpanded = list.style.display !== 'none';
          list.style.display = isExpanded ? 'none' : 'block';
          
          // Toggle icon
          const icon = title.querySelector('i');
          if (icon) {
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-right');
          }
        }
      });
    });
  }
});

// Help content data (can be moved to a separate JSON file)
const helpContent = {
  shortcuts: [
    { key: 'Ctrl + K', description: 'Quick search' },
    { key: 'Ctrl + /', description: 'Open help' },
    { key: 'Esc', description: 'Close active modal' }
  ],
  account: [
    'Use Edit Profile to update your personal details',
    'Check Notifications for updates and mentions',
    'Open Settings to customize app behavior'
  ],
  settings: [
    'Appearance: theme, font size, and font family',
    'Notifications: email, desktop, and sound preferences',
    'Privacy: analytics sharing and online status options'
  ]
};
