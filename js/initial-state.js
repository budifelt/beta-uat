// Initial State Handler - Handles immediate UI state to prevent flash
(function() {
  // Check login state immediately to prevent UI flash
  let user = null;
  const rawUser = localStorage.getItem('currentUser');
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch (e) {
      user = null;
    }
  }

  // Update UI immediately when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileName = document.getElementById('profile-name');
    const profileNameDisplay = document.getElementById('profile-name-display');
    const displayName = user?.name || user?.fullName || user?.fullname || user?.username || 'User';

    if (user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (profileDropdown) profileDropdown.style.display = 'inline-block';
      if (profileName) profileName.textContent = displayName;
      if (profileNameDisplay) profileNameDisplay.textContent = displayName;
    } else {
      if (loginBtn) {
        loginBtn.style.display = 'flex';
      }
      if (profileDropdown) profileDropdown.style.display = 'none';
    }
  });
})();
