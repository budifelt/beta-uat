// Navigation System - Handles header, profile dropdown, and auth modals

// Check login state and update UI
function checkLoginState() {
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
  
  if (user) {
    showProfileState();
  } else {
    showLoginState();
  }
}

// Update user UI (for external calls)
function updateUserUI() {
  checkLoginState();
}

// Get current user info (for other components)
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

// Check if user is logged in
function isUserLoggedIn() {
  return !!localStorage.getItem('currentUser');
}

// Get user role
function getUserRole() {
  const user = getCurrentUser();
  return user ? user.role : null;
}

// Modal functions with fallbacks
function showModal(modalName) {
  return new Promise((resolve, reject) => {
    const tryShow = (attempts = 0) => {
      if (window.modalManager) {
        window.modalManager.showModal(modalName)
          .then(resolve)
          .catch(reject);
      } else if (attempts < 50) { // Try for 5 seconds
        setTimeout(() => tryShow(attempts + 1), 100);
      } else {
        reject(new Error('Modal manager not available after 5 seconds'));
      }
    };
    tryShow();
  });
}

function showLoginModal() {
  showModal('login').catch(e => console.error('Failed to show login modal:', e));
}

function showRegisterModal() {
  showModal('register').catch(e => console.error('Failed to show register modal:', e));
}

function hideLoginModal() {
  if (window.modalManager) {
    window.modalManager.hideModal('login');
  }
}

function hideRegisterModal() {
  if (window.modalManager) {
    window.modalManager.hideModal('register');
  }
}

function showProfileModal() {
  console.log('showProfileModal called');
  // Prevent menu from staying open
  const profileDropdown = document.getElementById('profile-dropdown');
  if (profileDropdown) {
    profileDropdown.classList.remove('active');
  }
  
  showModal('profile').catch(e => console.error('Failed to show profile modal:', e));
}

function showSettingsModal() {
  showModal('settings').catch(e => console.error('Failed to show settings modal:', e));
}

function showEditProfileModal() {
  // This function is handled by modal-edit-profile.js
  // Just ensure the modal can be shown
  if (window.modalManager) {
    window.modalManager.showModal('edit-profile');
  }
}

function showNotificationsModal() {
  showModal('notifications').catch(e => console.error('Failed to show notifications modal:', e));
}

function showHelpModal() {
  showModal('help').catch(e => console.error('Failed to show help modal:', e));
}

function showLogoutModal() {
  if (window.modalManager) {
    window.modalManager.showModal('logout');
  } else {
    const modal = document.getElementById('modal-logout');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }
}

function closeLogoutModal() {
  if (window.modalManager) {
    window.modalManager.hideModal('logout');
  } else {
    const modal = document.getElementById('modal-logout');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
}

// Toggle profile menu
function toggleProfileMenu() {
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileMenu = document.getElementById('profile-menu');
  
  if (profileDropdown && profileMenu) {
    const isOpen = profileDropdown.classList.contains('active');
    
    if (isOpen) {
      profileDropdown.classList.remove('active');
      profileMenu.classList.add('hidden');
    } else {
      profileDropdown.classList.add('active');
      profileMenu.classList.remove('hidden');
    }
  } else {
    console.error('Profile dropdown or menu element not found!');
  }
}

// Show login button state
function showLoginState() {
  const loginBtn = document.getElementById('login-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  
  if (loginBtn) {
    loginBtn.style.display = 'flex';
  }
  if (profileDropdown) {
    profileDropdown.classList.add('hidden');
    profileDropdown.classList.remove('show');
    profileDropdown.style.display = 'none';
  }
}

// Show profile dropdown state
function showProfileState() {
  const loginBtn = document.getElementById('login-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileName = document.getElementById('profile-name');
  const profileNameDisplay = document.getElementById('profile-name-display');
  const profileEmailDisplay = document.getElementById('profile-email-display');
  const profileRoleDisplay = document.getElementById('profile-role-display');
  
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const displayName = user.name || user.fullName || user.fullname || user.username || 'User';
  const email = user.email || 'user@example.com';
  const role = user.role || 'User';

  if (loginBtn) {
    loginBtn.style.display = 'none';
  }
  if (profileDropdown) {
    profileDropdown.style.display = 'inline-block';
    profileDropdown.classList.remove('hidden');
    profileDropdown.classList.add('show');
  }
  if (profileName) {
    profileName.textContent = displayName;
  }
  if (profileNameDisplay) {
    profileNameDisplay.textContent = displayName;
  }
  if (profileEmailDisplay) {
    profileEmailDisplay.textContent = email;
  }
  if (profileRoleDisplay) {
    profileRoleDisplay.textContent = role;
  }
}

// Update user UI (for external calls)
function updateUserUI() {
  checkLoginState();
}

// Logout function
function logout() {
  // Show logout modal if available
  if (typeof window.showLogoutModal === 'function') {
    window.showLogoutModal();
    return;
  }

  // Minimal fallback
  if (confirm('Are you sure you want to logout?')) {
    confirmLogout();
  }
}

// Hide logout modal
function hideLogoutModal() {
  if (window.modalManager && typeof window.modalManager.hideModal === 'function') {
    window.modalManager.hideModal('logout');
    return;
  }

  const modal = document.getElementById('modal-logout');
  if (modal) modal.remove();
  document.body.style.overflow = '';
}

// Confirm logout
function confirmLogout() {
  // Delegate to modal-manager implementation when available
  if (window.modalManager && typeof window.modalManager.confirmLogout === 'function') {
    const mmConfirm = window.modalManager.confirmLogout;
    if (typeof mmConfirm === 'function' && mmConfirm !== confirmLogout) {
      mmConfirm();
      return;
    }
  }
  
  // Simulate logout process with delay for better UX
  setTimeout(() => {
    const userName = JSON.parse(localStorage.getItem('currentUser') || '{}').name || 'User';
    
    // Clear user data
    localStorage.removeItem('currentUser');
    
    // Update UI
    showLoginState();
    
    // Close modal
    hideLogoutModal();
    
    // Show success message
    if (window.toastSuccess) {
      window.toastSuccess(`Goodbye, ${userName}!`);
    }
    
    // Reload page after short delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, 300);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Close profile menu when clicking outside
  document.addEventListener('click', function(e) {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown && 
        !profileDropdown.contains(e.target)) {
      profileDropdown.classList.remove('active');
    }
  });
});

// Initialize on window load
window.addEventListener('load', () => {
  // Initialize login state
  checkLoginState();
});

// Modal Fallbacks - these provide fallbacks if modal functions aren't defined
const modalFunctions = [
  'showLoginModal',
  'showRegisterModal',
  'showProfileModal',
  'showNotificationsModal',
  'showHelpModal',
  'showLogoutModal',
  'showChangePasswordModal'
];

modalFunctions.forEach(funcName => {
  if (!window[funcName]) {
    const modalName = funcName.replace('show', '').replace('Modal', '').toLowerCase();
    window[funcName] = function() {
      if (window.modalManager) {
        window.modalManager.showModal(modalName);
      } else {
        console.error('Modal manager not available for', modalName);
        if (typeof window.toastError === 'function') {
          window.toastError(`${modalName} temporarily unavailable`);
        }
      }
    };
  }
});

// Edit Profile Modal fallback
if (!window.showEditProfileModal) {
  window.showEditProfileModal = function() {
    if (window.modalManager) {
      window.modalManager.showModal('edit-profile');
    } else {
      console.error('Modal manager not available');
      if (typeof window.toastError === 'function') {
        window.toastError('Edit profile temporarily unavailable');
      }
    }
  };
}

// Settings Modal Functions fallback
if (!window.showSettingsModal) {
  window.showSettingsModal = function() {
    if (window.modalManager) {
      window.modalManager.showModal('settings');
    } else {
      console.error('Modal manager not available');
      if (typeof window.toastError === 'function') {
        window.toastError('Settings temporarily unavailable');
      }
    }
  };
}

if (!window.hideSettingsModal) {
  window.hideSettingsModal = function() {
    if (window.modalManager) {
      window.modalManager.hideModal('settings');
    }
  };
}

// Make functions globally available
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.hideLoginModal = hideLoginModal;
window.hideRegisterModal = hideRegisterModal;
window.showProfileModal = showProfileModal;
window.showSettingsModal = showSettingsModal;
window.showNotificationsModal = showNotificationsModal;
window.showHelpModal = showHelpModal;
window.showLogoutModal = showLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.toggleProfileMenu = toggleProfileMenu;
window.logout = logout;
window.updateUserUI = updateUserUI;
window.getCurrentUser = getCurrentUser;
window.isUserLoggedIn = isUserLoggedIn;
window.getUserRole = getUserRole;
