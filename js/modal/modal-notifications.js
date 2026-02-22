// ===================================
// NOTIFICATIONS MODAL JAVASCRIPT
// ===================================

// Show/Hide Notifications Modal
window.showNotificationsModal = () => {
  window.modalManager.showModal('notifications');
  // Initialize notification count
  updateNotificationCount();
  
  // Mark notifications as seen
  setTimeout(() => {
    markNotificationsAsSeen();
  }, 1000);
};

window.hideNotificationsModal = () => {
  window.modalManager.hideModal('notifications');
};

// Update notification count
window.updateNotificationCount = () => {
  const countElement = document.getElementById('notification-count');
  const unreadNotifications = document.querySelectorAll('.notification-item.unread');
  
  if (countElement) {
    const count = unreadNotifications.length;
    if (count > 0) {
      countElement.textContent = count;
      countElement.style.display = 'inline-flex';
    } else {
      countElement.style.display = 'none';
    }
  }
  
  // Update header notification badge if it exists
  const headerBadge = document.querySelector('.notification-badge');
  if (headerBadge) {
    const count = unreadNotifications.length;
    if (count > 0) {
      headerBadge.textContent = count;
      headerBadge.style.display = 'inline-flex';
    } else {
      headerBadge.style.display = 'none';
    }
  }
};

// Mark notification as read
window.markAsRead = (button) => {
  const notificationItem = button.closest('.notification-item');
  if (notificationItem && notificationItem.classList.contains('unread')) {
    notificationItem.classList.remove('unread');
    
    // Remove the read button
    button.remove();
    
    // Update count
    updateNotificationCount();
    
    // Save to localStorage
    const notificationId = notificationItem.dataset.id || Date.now();
    const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
    }
  }
};

// Mark all notifications as read
window.markAllAsRead = () => {
  const unreadNotifications = document.querySelectorAll('.notification-item.unread');
  const readButtons = document.querySelectorAll('.notification-read-btn');
  
  unreadNotifications.forEach(notification => {
    notification.classList.remove('unread');
  });
  
  readButtons.forEach(button => {
    button.remove();
  });
  
  // Update count
  updateNotificationCount();
  
  // Save all to localStorage
  const allNotifications = document.querySelectorAll('.notification-item');
  const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
  
  allNotifications.forEach(notification => {
    const notificationId = notification.dataset.id || Date.now();
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
    }
  });
  
  localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
  
  if (typeof toastSuccess === 'function') {
    toastSuccess('All notifications marked as read');
  }
};

// Clear all notifications
window.clearAllNotifications = () => {
  window.modalManager.showConfirmModal({
    title: 'Clear All Notifications?',
    message: 'This will remove all notifications from your list. This action cannot be undone.',
    onConfirm: () => {
      const notificationsList = document.querySelector('.notifications-list');
      if (notificationsList) {
        notificationsList.innerHTML = `
          <div class="notifications-empty">
            <i class="fa-solid fa-bell-slash"></i>
            <h3>No notifications</h3>
            <p>You're all caught up! New notifications will appear here.</p>
          </div>
        `;
      }
      
      // Clear from localStorage
      localStorage.removeItem('notifications');
      localStorage.setItem('readNotifications', JSON.stringify([]));
      
      // Update count
      updateNotificationCount();
      
      if (typeof toastSuccess === 'function') {
        toastSuccess('All notifications cleared');
      }
    }
  });
};

// Load more notifications
window.loadMoreNotifications = async () => {
  const loadMoreBtn = document.querySelector('.load-more-btn');
  const notificationsList = document.querySelector('.notifications-list');
  
  if (!loadMoreBtn || !notificationsList) return;
  
  // Show loading state
  loadMoreBtn.disabled = true;
  loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate more notifications (in real app, fetch from server)
    const moreNotifications = generateMoreNotifications(5);
    
    // Insert before load more button
    const loadMoreContainer = document.querySelector('.load-more');
    moreNotifications.forEach(notificationHtml => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = notificationHtml;
      notificationsList.insertBefore(tempDiv.firstElementChild, loadMoreContainer);
    });
    
    // Add click handlers to new notifications
    addNotificationClickHandlers();
    
    // Hide load more if no more notifications
    if (Math.random() > 0.5) {
      loadMoreContainer.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Load more notifications error:', error);
    if (typeof toastError === 'function') {
      toastError('Failed to load more notifications');
    }
  } finally {
    // Restore button state
    loadMoreBtn.disabled = false;
    loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner"></i> Load More Notifications';
  }
};

// Generate more notifications (mock data)
function generateMoreNotifications(count) {
  const types = ['system', 'mentions', 'security'];
  const messages = [
    { type: 'system', icon: 'fa-info-circle', text: 'System maintenance scheduled', time: '5 hours ago' },
    { type: 'mentions', icon: 'fa-at', text: 'Someone mentioned you in a comment', time: '6 hours ago' },
    { type: 'security', icon: 'fa-shield-halved', text: 'New security feature available', time: '7 hours ago' },
    { type: 'system', icon: 'fa-download', text: 'Your backup is ready', time: '8 hours ago' },
    { type: 'mentions', icon: 'fa-comment', text: 'New reply to your post', time: '9 hours ago' }
  ];
  
  const notifications = [];
  for (let i = 0; i < count; i++) {
    const message = messages[Math.floor(Math.random() * messages.length)];
    const isUnread = Math.random() > 0.7;
    
    notifications.push(`
      <div class="notification-item ${isUnread ? 'unread' : ''}" data-type="${message.type}" data-id="${Date.now() + i}">
        <div class="notification-icon ${message.type === 'security' ? 'warning' : ''}">
          <i class="fa-solid ${message.icon}"></i>
        </div>
        <div class="notification-content">
          <p class="notification-text">
            <strong>${message.type.charAt(0).toUpperCase() + message.type.slice(1)}</strong> - ${message.text}
          </p>
          <span class="notification-time">${message.time}</span>
        </div>
        ${isUnread ? `
          <button onclick="markAsRead(this)" class="notification-read-btn">
            <i class="fa-solid fa-check"></i>
          </button>
        ` : ''}
      </div>
    `);
  }
  
  return notifications;
}

// Filter notifications
window.filterNotifications = (filter) => {
  const notifications = document.querySelectorAll('.notification-item');
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // Update active filter button
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    }
  });
  
  // Filter notifications
  notifications.forEach(notification => {
    const type = notification.dataset.type;
    
    if (filter === 'all') {
      notification.style.display = 'flex';
    } else if (filter === 'unread') {
      notification.style.display = notification.classList.contains('unread') ? 'flex' : 'none';
    } else {
      notification.style.display = type === filter ? 'flex' : 'none';
    }
  });
  
  // Check if any notifications are visible
  const visibleNotifications = document.querySelectorAll('.notification-item[style*="flex"], .notification-item:not([style*="none"])');
  const emptyState = document.querySelector('.notifications-empty');
  
  if (visibleNotifications.length === 0 && !emptyState) {
    const notificationsList = document.querySelector('.notifications-list');
    if (notificationsList) {
      notificationsList.innerHTML = `
        <div class="notifications-empty">
          <i class="fa-solid fa-filter"></i>
          <h3>No ${filter} notifications</h3>
          <p>Try selecting a different filter</p>
        </div>
      `;
    }
  } else if (visibleNotifications.length > 0 && emptyState) {
    location.reload(); // Simple reload to restore notifications
  }
};

// Open notification settings
window.openNotificationSettings = () => {
  window.modalManager.hideModal('notifications');
  window.showSettingsModal();
  setTimeout(() => {
    showSettingsSection('notifications');
  }, 300);
};

// Mark notifications as seen (different from read)
window.markNotificationsAsSeen = () => {
  const unseenNotifications = document.querySelectorAll('.notification-item:not(.seen)');
  unseenNotifications.forEach(notification => {
    notification.classList.add('seen');
  });
  
  // Update server (in real app)
  console.log('Marking notifications as seen');
};

// Add click handlers to notifications
function addNotificationClickHandlers() {
  const notifications = document.querySelectorAll('.notification-item');
  
  notifications.forEach(notification => {
    notification.addEventListener('click', (e) => {
      // Don't trigger if clicking on the read button
      if (e.target.closest('.notification-read-btn')) return;
      
      // Mark as read if unread
      if (notification.classList.contains('unread')) {
        const readBtn = notification.querySelector('.notification-read-btn');
        if (readBtn) {
          markAsRead(readBtn);
        }
      }
      
      // Handle notification click (e.g., navigate to relevant page)
      const type = notification.dataset.type;
      console.log('Notification clicked:', type);
      
      // Close modal after clicking
      setTimeout(() => {
        hideNotificationsModal();
      }, 300);
    });
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize notification count
  updateNotificationCount();
  
  // Add filter button handlers
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterNotifications(btn.dataset.filter);
    });
  });
  
  // Add notification click handlers
  addNotificationClickHandlers();
  
  // Auto-refresh notifications every 30 seconds
  setInterval(() => {
    const notificationsModal = document.getElementById('modal-notifications');
    if (notificationsModal && notificationsModal.classList.contains('active')) {
      // In real app, fetch new notifications from server
      console.log('Checking for new notifications...');
    }
  }, 30000);
  
  // Keyboard shortcut (Ctrl + N)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      showNotificationsModal();
    }
  });
  
  // Initialize notification filters
  filterButtons.forEach(btn => {
    if (btn.dataset.filter === 'all') {
      btn.classList.add('active');
    }
  });
});
