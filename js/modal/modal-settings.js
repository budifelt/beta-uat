// ===================================
// SETTINGS MODAL JAVASCRIPT
// ===================================

// Settings Modal Class
class SettingsModal {
  constructor() {
    this.currentSection = 'general';
    this.hasUnsavedChanges = false;
    this.settings = this.loadSettings();
  }
  
  // Load settings from localStorage
  loadSettings() {
    const defaultSettings = {
      language: 'en',
      timezone: 'wib',
      dateFormat: 'yyyy-mm-dd',
      autosave: true,
      theme: 'auto',
      fontSize: 'medium',
      fontFamily: 'system',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      soundNotifications: true,
      desktopNotifications: true,
      analyticsSharing: true,
      crashReports: true,
      showOnlineStatus: true,
      twoFactorAuth: false,
      betaFeatures: false,
      hardwareAcceleration: true,
      profileVisibility: 'private'
    };
    
    const saved = localStorage.getItem('userSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  }
  
  // Save settings to localStorage
  saveSettings() {
    localStorage.setItem('userSettings', JSON.stringify(this.settings));
  }
  
  // Show settings modal
  show() {
    window.modalManager.showModal('settings');
    this.loadSettingsToForm();
    
    // Set initial section
    setTimeout(() => {
      this.showSettingsSection('general');
    }, 100);
  }
  
  // Hide settings modal
  hide() {
    if (this.hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        window.modalManager.hideModal('settings');
        this.hasUnsavedChanges = false;
      }
    } else {
      window.modalManager.hideModal('settings');
    }
  }
  
  // Show specific settings section
  showSettingsSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.settings-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.settings-tab-btn').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${sectionName}-section`);
    if (selectedSection) {
      selectedSection.classList.add('active');
    }
    
    // Add active class to selected tab
    const selectedTab = document.getElementById(`tab-${sectionName}`);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }
    
    // Update header title
    const titleElement = document.getElementById('settings-title');
    const titles = {
      general: '<i class="fa-solid fa-globe"></i> General Settings',
      appearance: '<i class="fa-solid fa-palette"></i> Appearance',
      account: '<i class="fa-solid fa-user"></i> Account',
      notifications: '<i class="fa-solid fa-bell"></i> Notifications',
      privacy: '<i class="fa-solid fa-shield-halved"></i> Privacy',
      advanced: '<i class="fa-solid fa-cog"></i> Advanced'
    };
    
    if (titleElement && titles[sectionName]) {
      titleElement.innerHTML = titles[sectionName];
    }
    
    this.currentSection = sectionName;
  }
  
  // Load settings into form
  loadSettingsToForm() {
    // General settings
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) languageSelect.value = this.settings.language;
    
    const timezoneSelect = document.getElementById('timezone-select');
    if (timezoneSelect) timezoneSelect.value = this.settings.timezone;
    
    const dateFormatSelect = document.getElementById('date-format-select');
    if (dateFormatSelect) dateFormatSelect.value = this.settings.dateFormat;
    
    const autosaveToggle = document.getElementById('autosave-toggle');
    if (autosaveToggle) autosaveToggle.checked = this.settings.autosave;
    
    // Appearance settings
    const themeRadios = document.getElementsByName('theme');
    themeRadios.forEach(radio => {
      if (radio.value === this.settings.theme) {
        radio.checked = true;
      }
    });
    
    const fontSizeSelect = document.getElementById('font-size-select');
    if (fontSizeSelect) fontSizeSelect.value = this.settings.fontSize;
    
    const fontFamilySelect = document.getElementById('font-family-select');
    if (fontFamilySelect) fontFamilySelect.value = this.settings.fontFamily;
    
    // Notification settings
    const emailNotif = document.getElementById('notif-updates');
    if (emailNotif) emailNotif.checked = this.settings.emailNotifications;
    
    const securityNotif = document.getElementById('notif-security');
    if (securityNotif) securityNotif.checked = this.settings.emailNotifications;
    
    const soundNotif = document.getElementById('notif-sounds');
    if (soundNotif) soundNotif.checked = this.settings.soundNotifications;
    
    const desktopNotif = document.getElementById('notif-desktop');
    if (desktopNotif) desktopNotif.checked = this.settings.desktopNotifications;
    
    // Privacy settings
    const analyticsToggle = document.getElementById('privacy-analytics');
    if (analyticsToggle) analyticsToggle.checked = this.settings.analyticsSharing;
    
    const crashReportsToggle = document.getElementById('privacy-crashreports');
    if (crashReportsToggle) crashReportsToggle.checked = this.settings.crashReports;
    
    const onlineStatusToggle = document.getElementById('privacy-online');
    if (onlineStatusToggle) onlineStatusToggle.checked = this.settings.showOnlineStatus;
    
    // Advanced settings
    const hardwareAccelToggle = document.getElementById('hardware-acceleration');
    if (hardwareAccelToggle) hardwareAccelToggle.checked = this.settings.hardwareAcceleration;
    
    const betaFeaturesToggle = document.getElementById('beta-features');
    if (betaFeaturesToggle) betaFeaturesToggle.checked = this.settings.betaFeatures;
  }
  
  // Save current settings
  saveCurrentSettings() {
    // General settings
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) this.settings.language = languageSelect.value;
    
    const timezoneSelect = document.getElementById('timezone-select');
    if (timezoneSelect) this.settings.timezone = timezoneSelect.value;
    
    const dateFormatSelect = document.getElementById('date-format-select');
    if (dateFormatSelect) this.settings.dateFormat = dateFormatSelect.value;
    
    const autosaveToggle = document.getElementById('autosave-toggle');
    if (autosaveToggle) this.settings.autosave = autosaveToggle.checked;
    
    // Appearance settings
    const themeRadios = document.getElementsByName('theme');
    themeRadios.forEach(radio => {
      if (radio.checked) {
        this.settings.theme = radio.value;
        this.applyTheme(radio.value);
      }
    });
    
    const fontSizeSelect = document.getElementById('font-size-select');
    if (fontSizeSelect) this.settings.fontSize = fontSizeSelect.value;
    
    const fontFamilySelect = document.getElementById('font-family-select');
    if (fontFamilySelect) this.settings.fontFamily = fontFamilySelect.value;
    
    // Apply font settings
    this.applyFontSettings();
    
    // Notification settings
    const emailNotif = document.getElementById('notif-updates');
    if (emailNotif) this.settings.emailNotifications = emailNotif.checked;
    
    const soundNotif = document.getElementById('notif-sounds');
    if (soundNotif) this.settings.soundNotifications = soundNotif.checked;
    
    const desktopNotif = document.getElementById('notif-desktop');
    if (desktopNotif) this.settings.desktopNotifications = desktopNotif.checked;
    
    // Request notification permission if enabled
    if (this.settings.desktopNotifications && 'Notification' in window) {
      Notification.requestPermission();
    }
    
    // Privacy settings
    const analyticsToggle = document.getElementById('privacy-analytics');
    if (analyticsToggle) this.settings.analyticsSharing = analyticsToggle.checked;
    
    const crashReportsToggle = document.getElementById('privacy-crashreports');
    if (crashReportsToggle) this.settings.crashReports = crashReportsToggle.checked;
    
    const onlineStatusToggle = document.getElementById('privacy-online');
    if (onlineStatusToggle) this.settings.showOnlineStatus = onlineStatusToggle.checked;
    
    // Advanced settings
    const hardwareAccelToggle = document.getElementById('hardware-acceleration');
    if (hardwareAccelToggle) this.settings.hardwareAcceleration = hardwareAccelToggle.checked;
    
    const betaFeaturesToggle = document.getElementById('beta-features');
    if (betaFeaturesToggle) this.settings.betaFeatures = betaFeaturesToggle.checked;
    
    // Save to localStorage
    this.saveSettings();
    this.hasUnsavedChanges = false;
    
    // Show success message
    if (typeof toastSuccess === 'function') {
      toastSuccess('Settings saved successfully!');
    }
  }
  
  // Apply theme
  applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else if (theme === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    } else {
      // Auto - use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark-theme');
        root.classList.remove('light-theme');
      } else {
        root.classList.add('light-theme');
        root.classList.remove('dark-theme');
      }
    }
  }
  
  // Apply font settings
  applyFontSettings() {
    const root = document.documentElement;
    
    // Font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    
    root.style.setProperty('--font-size-base', fontSizes[this.settings.fontSize] || '16px');
    
    // Font family
    const fontFamilies = {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'sans-serif': '"Helvetica Neue", Arial, sans-serif',
      serif: 'Georgia, "Times New Roman", serif',
      monospace: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace'
    };
    
    root.style.setProperty('--font-family-primary', fontFamilies[this.settings.fontFamily] || fontFamilies.system);
  }
  
  // Reset all settings
  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      // Clear settings
      localStorage.removeItem('userSettings');
      this.settings = this.loadSettings();
      
      // Reload form
      this.loadSettingsToForm();
      
      // Apply default theme
      this.applyTheme(this.settings.theme);
      this.applyFontSettings();
      
      // Show success message
      if (typeof toastSuccess === 'function') {
        toastSuccess('Settings reset to defaults');
      }
    }
  }
  
  // Clear cache
  clearCache() {
    if (confirm('Clear cache will remove temporary data and may slow down the app initially. Continue?')) {
      // Clear browser cache
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Clear localStorage except for important data
      const currentUser = localStorage.getItem('currentUser');
      const users = localStorage.getItem('users');
      
      localStorage.clear();
      
      if (currentUser) localStorage.setItem('currentUser', currentUser);
      if (users) localStorage.setItem('users', users);
      
      // Show success message
      if (typeof toastSuccess === 'function') {
        toastSuccess('Cache cleared successfully');
      }
      
      // Reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }
  
  // Delete profile
  deleteProfile() {
    const confirmation = prompt('This action cannot be undone. Type "DELETE" to confirm:');
    if (confirmation === 'DELETE') {
      // Get current user
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      // Remove from users list
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const updatedUsers = users.filter(u => u.id !== currentUser.id);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      // Logout
      localStorage.removeItem('currentUser');
      
      // Show message
      if (typeof toastSuccess === 'function') {
        toastSuccess('Account deleted successfully');
      }
      
      // Redirect to home
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else if (confirmation) {
      if (typeof toastError === 'function') {
        toastError('Confirmation text does not match');
      }
    }
  }
}

// Initialize settings modal
let settingsModal;

// Initialize immediately when script loads
function initSettingsModal() {
  if (!settingsModal) {
    settingsModal = new SettingsModal();
    
    // Global functions
    window.showSettingsModal = () => {
      settingsModal.show();
    };
    
    window.hideSettingsModal = () => {
      settingsModal.hide();
    };
    
    window.showSettingsSection = (section) => {
      settingsModal.showSettingsSection(section);
    };
    
    window.saveSettings = () => {
      settingsModal.saveCurrentSettings();
    };
    
    window.resetSettings = () => {
      settingsModal.resetSettings();
    };
    
    window.clearCache = () => {
      settingsModal.clearCache();
    };
    
    window.deleteProfile = () => {
      settingsModal.deleteProfile();
    };
  }
}

// Try to initialize immediately
initSettingsModal();

// Also initialize on DOMContentLoaded in case script runs before DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsModal);
} else {
  // DOM is already ready, initialize now
  initSettingsModal();
}

// Mark form as dirty when changed
function setupFormListeners() {
  if (settingsModal && document.getElementById('modal-settings')) {
    document.querySelectorAll('#modal-settings input, #modal-settings select').forEach(field => {
      field.addEventListener('change', () => {
        settingsModal.hasUnsavedChanges = true;
      });
    });
  }
}

// Setup listeners when modal is shown
const originalShow = SettingsModal.prototype.show;
SettingsModal.prototype.show = function() {
  originalShow.call(this);
  setTimeout(setupFormListeners, 100);
};

// Add keyboard shortcut (Ctrl + ,)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === ',') {
    e.preventDefault();
    showSettingsModal();
  }
});
