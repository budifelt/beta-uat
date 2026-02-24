// Campaign Counter - Optimized Implementation
let campaignCounterId = 1;
let history = [];

// Initialize on page load - Optimized
document.addEventListener('DOMContentLoaded', function() {
  // Use requestAnimationFrame for non-blocking initialization
  requestAnimationFrame(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('campaignCounter');
    if (saved) {
      const data = JSON.parse(saved);
      campaignCounterId = data.campaignCounterId || 1;
      history = data.history || [];
    }
    
    updateDisplay();
    updateHistory();
    
    // Simplified user check - removed excessive logging
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
      const loginBtn = document.getElementById('login-btn');
      const profileDropdown = document.getElementById('profile-dropdown');
      const profileName = document.getElementById('profile-name');
      const profileNameDisplay = document.getElementById('profile-name-display');
      
      if (loginBtn) loginBtn.style.display = 'none';
      if (profileDropdown) {
        profileDropdown.classList.add('show-profile');
      }
      if (profileName) {
        profileName.textContent = rememberedUser.split('@')[0];
      }
      if (profileNameDisplay) {
        profileNameDisplay.textContent = rememberedUser.split('@')[0];
      }
    }
  });
});

// Modal close on escape key - Optimized with passive listener
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeEditModal();
    closeLogoutModal();
    hideSettingsModal();
  }
}, { passive: true });

// Modal close on outside click - Optimized
const editModal = document.getElementById('edit-modal');
if (editModal) {
  editModal.addEventListener('click', function(e) {
    if (e.target === this) {
      closeEditModal();
    }
  }, { passive: true });
}

// Generate new Campaign ID (+1)
function addCampaignID() {
  campaignCounterId++;
  saveToLocalStorage();
  addToHistory('Generated', campaignCounterId);
  updateDisplay();
  window.toastSuccess('New Campaign ID generated');
}

// Revert Campaign ID (-1)
function decrementCampaignID() {
  if (campaignCounterId > 1) {
    campaignCounterId--;
    saveToLocalStorage();
    addToHistory('Reverted', campaignCounterId);
    updateDisplay();
    window.toastWarning('Campaign ID reverted');
  } else {
    window.toastError('Cannot go below 1');
  }
}

// Edit Campaign ID manually
function editCampaignID() {
  const modal = document.getElementById('edit-modal');
  const input = document.getElementById('modal-input');
  input.value = campaignCounterId;
  modal.classList.add('active');
  input.focus();
  input.select();
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
}

// Confirm edit Campaign ID
function confirmEditCampaignID() {
  const input = document.getElementById('modal-input');
  const newValue = parseInt(input.value);
  const oldValue = campaignCounterId;
  
  if (newValue && newValue > 0) {
    campaignCounterId = newValue;
    saveToLocalStorage();
    addToHistory('Edited', campaignCounterId);
    updateDisplay();
    closeEditModal();
    window.toastSuccess(`Campaign ID changed from ${oldValue} to ${campaignCounterId}`);
  } else {
    window.toastError('Please enter a valid number greater than 0');
  }
}

// Update display
function updateDisplay() {
  const counterElement = document.getElementById('counter-number');
  if (counterElement) {
    counterElement.textContent = String(campaignCounterId).padStart(4, '0');
  }
  
  // Update progress bar
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    const progress = (campaignCounterId % 100) / 100 * 100;
    progressBar.style.width = progress + '%';
  }
  
  // Update last updated
  const lastUpdated = document.getElementById('last-updated');
  const now = new Date();
  lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

// Add to history
function addToHistory(action, value) {
  const item = {
    action: action,
    value: value,
    timestamp: new Date().toISOString()
  };
  
  history.unshift(item);
  
  // Keep only last 50 items
  if (history.length > 50) {
    history = history.slice(0, 50);
  }
}

// Update history display
function updateHistory() {
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';
  
  history.slice(0, 10).forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    const icon = item.action === 'Generated' ? 'fa-plus' : 
                 item.action === 'Reverted' ? 'fa-rotate-left' : 
                 'fa-edit';
    
    const time = new Date(item.timestamp);
    const timeString = time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    div.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${item.action}: <strong>${String(item.value).padStart(4, '0')}</strong></span>
      <time>${timeString}</time>
    `;
    
    historyList.appendChild(div);
  });
  
  // Show load more button if there are more items
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (history.length > 10) {
    loadMoreBtn.style.display = 'block';
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

// Load more history
function loadMoreHistory() {
  const historyList = document.getElementById('history-list');
  const currentItems = historyList.children.length;
  const moreItems = history.slice(currentItems, currentItems + 10);
  
  moreItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    const icon = item.action === 'Generated' ? 'fa-plus' : 
                 item.action === 'Reverted' ? 'fa-rotate-left' : 
                 'fa-edit';
    
    const time = new Date(item.timestamp);
    const timeString = time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    div.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${item.action}: <strong>${String(item.value).padStart(4, '0')}</strong></span>
      <time>${timeString}</time>
    `;
    
    historyList.appendChild(div);
  });
  
  // Hide button if all items are loaded
  if (historyList.children.length >= history.length) {
    document.getElementById('load-more-btn').style.display = 'none';
  }
}

// Save to localStorage
function saveToLocalStorage() {
  const data = {
    campaignCounterId: campaignCounterId,
    history: history
  };
  localStorage.setItem('campaignCounter', JSON.stringify(data));
}

// Note: Auth Modal functions are now handled by nav.js and modal-manager.js

// Add comprehensive debug function
function debugProfileVisibility() {
  const profileSection = document.querySelector('.profile-section');
  const profileDropdown = document.getElementById('profile-dropdown');
  const loginBtn = document.getElementById('login-btn');
  
  console.group('🔍 Profile Visibility Debug');
  
  // Check elements exist
  console.log('Elements exist:', {
    profileSection: !!profileSection,
    profileDropdown: !!profileDropdown,
    loginBtn: !!loginBtn
  });
  
  if (profileSection) {
    // Check all computed styles
    const computed = getComputedStyle(profileSection);
    console.log('Profile Section Styles:', {
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      position: computed.position,
      zIndex: computed.zIndex,
      transform: computed.transform,
      width: computed.width,
      height: computed.height,
      offsetWidth: profileSection.offsetWidth,
      offsetHeight: profileSection.offsetHeight,
      clientWidth: profileSection.clientWidth,
      clientHeight: profileSection.clientHeight
    });
    
    // Check parent elements
    let parent = profileSection.parentElement;
    let level = 0;
    while (parent && level < 5) {
      const parentComputed = getComputedStyle(parent);
      console.log(`Parent Level ${level}:`, {
        tagName: parent.tagName,
        display: parentComputed.display,
        visibility: parentComputed.visibility,
        opacity: parentComputed.opacity,
        overflow: parentComputed.overflow
      });
      parent = parent.parentElement;
      level++;
    }
    
    // Check if element is in viewport
    const rect = profileSection.getBoundingClientRect();
    console.log('Bounding Rect:', {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
    });
  }
  
  console.groupEnd();
}

// Note: togglePassword, handleLogin, and other auth functions are now handled by nav.js and modal-login.js
