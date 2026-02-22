// ===================================
// LOGOUT MODAL JAVASCRIPT
// ===================================

// Show/Hide Logout Modal
window.showLogoutModal = () => {
  // Ensure profile dropdown menu is closed before opening modal
  const profileMenu = document.querySelector('.profile-menu');
  if (profileMenu) {
    profileMenu.classList.remove('active');
  }
  
  // Load and show modal
  window.modalManager.showModal('logout').then(() => {
    // Update user info in modal
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    const userNameElement = document.getElementById('logout-username');
    const userEmailElement = document.getElementById('logout-email');
    
    if (userNameElement) {
      userNameElement.textContent = currentUser.name || currentUser.username || 'User';
    }
    
    if (userEmailElement) {
      userEmailElement.textContent = currentUser.email || '';
    }
    
    // Update status indicator
    const statusIndicator = document.querySelector('.logout-status-indicator');
    if (statusIndicator) {
      // Could be based on actual user status
      statusIndicator.className = 'logout-status-indicator online';
    }
  });
};

window.hideLogoutModal = () => {
  window.modalManager.hideModal('logout');
};

// Confirm logout
window.confirmLogout = async () => {
  const logoutBtn = document.getElementById('logout-btn');
  const originalText = logoutBtn.innerHTML;
  
  // Show loading state
  logoutBtn.disabled = true;
  logoutBtn.classList.add('loading');
  logoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing out...';
  
  try {
    // Simulate logout process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clear session
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    
    // Clear any cached data
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    }
    
    // Show success message
    if (typeof toastSuccess === 'function') {
      toastSuccess('Logged out successfully');
    }
    
    // Close modal
    window.modalManager.hideModal('logout');
    
    // Update UI
    if (typeof updateUserUI === 'function') {
      updateUserUI();
    }
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
  } catch (error) {
    console.error('Logout error:', error);
    
    if (typeof toastError === 'function') {
      toastError('Failed to logout. Please try again.');
    }
    
    // Restore button state
    logoutBtn.disabled = false;
    logoutBtn.classList.remove('loading');
    logoutBtn.innerHTML = originalText;
  }
};

// Cancel logout
window.cancelLogout = () => {
  window.hideLogoutModal();
};

// Show confirmation dialog (alternative method)
window.showLogoutConfirmation = () => {
  window.modalManager.showConfirmModal({
    title: 'Confirm Logout',
    message: 'Are you sure you want to sign out? Any unsaved work will be lost.',
    onConfirm: () => {
      confirmLogout();
    },
    onCancel: () => {
      // Do nothing
    }
  });
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add keyboard shortcut for logout (Ctrl + Shift + L)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      showLogoutModal();
    }
  });
  
  // Update session time display
  const updateSessionTime = () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.loginTime) {
      const loginTime = new Date(currentUser.loginTime);
      const now = new Date();
      const diff = now - loginTime;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      const sessionTimeElement = document.getElementById('session-time');
      if (sessionTimeElement) {
        if (hours > 0) {
          sessionTimeElement.textContent = `Active for ${hours}h ${minutes}m`;
        } else {
          sessionTimeElement.textContent = `Active for ${minutes}m`;
        }
      }
    }
  };
  
  // Update session time every minute
  setInterval(updateSessionTime, 60000);
  updateSessionTime(); // Initial update
  
  // Add hover effects to logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('mouseenter', () => {
      if (!logoutBtn.disabled) {
        logoutBtn.style.transform = 'translateY(-2px) scale(1.02)';
      }
    });
    
    logoutBtn.addEventListener('mouseleave', () => {
      if (!logoutBtn.disabled) {
        logoutBtn.style.transform = 'translateY(0) scale(1)';
      }
    });
  }
  
  // Track logout attempts for analytics
  const logoutModal = document.getElementById('modal-logout');
  if (logoutModal) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (logoutModal.classList.contains('active')) {
            // Track modal open
            if (typeof gtag === 'function') {
              gtag('event', 'logout_modal_open', {
                event_category: 'engagement'
              });
            }
          }
        }
      });
    });
    
    observer.observe(logoutModal, { attributes: true });
  }
});

// Auto-logout after inactivity
let inactivityTimer;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.id) {
      if (typeof toastWarning === 'function') {
        toastWarning('You have been logged out due to inactivity');
      }
      confirmLogout();
    }
  }, INACTIVITY_TIMEOUT);
}

// Reset timer on user activity
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('scroll', resetInactivityTimer);

// Initialize inactivity timer
resetInactivityTimer();
