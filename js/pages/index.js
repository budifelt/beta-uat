// ---- Extracted scripts from inline <script> blocks ----
// Initialize on page load
window.addEventListener('load', () => {
  // Initialize login state
  checkLoginState();
});

// Other Modal Fallbacks - these are handled by their respective modal JS files
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
      }
    };
  }
});

// Settings Modal Functions - handled by modal-settings.js
// These are only fallbacks if modal-settings hasn't loaded yet
if (!window.showSettingsModal) {
  window.showSettingsModal = function() {
    if (window.modalManager) {
      window.modalManager.showModal('settings');
    }
  };
}

if (!window.hideSettingsModal) {
  window.hideSettingsModal = function() {
    if (window.modalManager) {
      window.modalManager.hideModal('settings');
    }
  };
};

function saveSettings() {
  // Get form values
  const language = document.getElementById('language-select')?.value;
  const timeFormat = document.getElementById('time-format-select')?.value;
  const theme = document.getElementById('theme-select')?.value;
  const fontSize = document.getElementById('font-size-select')?.value;
  const username = document.getElementById('profile-username-input')?.value;
  const displayName = document.getElementById('profile-displayname-input')?.value;
  
  // Save to localStorage (dummy implementation)
  const settings = {
    language,
    timeFormat,
    theme,
    fontSize,
    username,
    displayName,
    savedAt: new Date().toISOString()
  };
  
  localStorage.setItem('edmSettings', JSON.stringify(settings));
  
  // Show success message (you can implement a toast notification)
  alert('Pengaturan berhasil disimpan!');
  
  // Apply theme if changed
  if (theme) {
    applyTheme(theme);
  }
  
  // Apply font size if changed
  if (fontSize) {
    applyFontSize(fontSize);
  }
}

function applyTheme(theme) {
  const body = document.body;
  body.classList.remove('theme-light', 'theme-dark');
  
  if (theme === 'dark') {
    body.classList.add('theme-dark');
  } else if (theme === 'light') {
    body.classList.add('theme-light');
  } else {
    // Auto theme based on system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      body.classList.add('theme-dark');
    } else {
      body.classList.add('theme-light');
    }
  }
}

function applyFontSize(fontSize) {
  const body = document.body;
  body.classList.remove('font-small', 'font-medium', 'font-large');
  body.classList.add('font-' + fontSize);
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modal-settings');
  if (modal && modal.classList.contains('active')) {
    if (e.target === modal) {
      hideSettingsModal();
    }
  }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideSettingsModal();
  }
});

// Sort tool-cards by title (A→Z)
(function(){
  const grid = document.querySelector('.grid');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('a.tool-card'));
  if (cards.length === 0) return;

  cards.sort((a, b) => {
    const ta = a.querySelector('.tool-title')?.textContent?.trim() ?? '';
    const tb = b.querySelector('.tool-title')?.textContent?.trim() ?? '';
    return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
  });

  // Re-append in sorted order
  cards.forEach(card => grid.appendChild(card));
})();

// Card ripple + page transition
const transitionEl = document.getElementById('transition');
document.querySelectorAll('a.tool-card').forEach(card=>{
  card.addEventListener('click', e=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0) return;
    e.preventDefault();
    const href = card.getAttribute('href');
    const rect = card.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    const x = (e.clientX ?? (rect.left + rect.width/2)) - rect.left - size/2;
    const y = (e.clientY ?? (rect.top + rect.height/2)) - rect.top - size/2;
    ripple.style.left = x + 'px';
    ripple.style.top  = y + 'px';
    card.appendChild(ripple);
    setTimeout(()=>{
      transitionEl.classList.add('active');
      setTimeout(()=>window.location.href = href, 480);
    }, 180);
  });
  card.addEventListener('animationend', ev=>{
    if(ev.target.classList.contains('ripple')) ev.target.remove();
  });
});

// ---- Form Handlers for index.html ----

// Dummy users for testing
const dummyUsers = [
  { id: 1, name: 'Admin', email: 'admin@edmhelper.com', role: 'admin' },
  { id: 2, name: 'John Doe', email: 'john@example.com', role: 'user' },
  { id: 3, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  { id: 4, name: 'Marketing Team', email: 'marketing@edmhelper.com', role: 'manager' },
  { id: 5, name: 'Demo User', email: 'demo@edmhelper.com', role: 'demo' }
];

// Handle login form submission
function handleLogin(event) {
  event.preventDefault();
  
  const emailOrUsername = document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;
  const submitBtn = document.querySelector('#login-form .login-btn');
  
  if (!emailOrUsername || !password) {
    window.toastError('Please enter both email/username and password', 'Login Failed');
    return;
  }
  
  // Show loading state
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
    submitBtn.disabled = true;
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.style.opacity = '0.7';
  }
  
  // Disable inputs
  const inputs = document.querySelectorAll('#login-form input');
  inputs.forEach(input => {
    input.disabled = true;
    input.style.cursor = 'not-allowed';
  });
  
  // Simulate authentication delay
  setTimeout(() => {
    const isEmail = emailOrUsername.includes('@');
    let user = dummyUsers.find(u => 
      (isEmail ? u.email.toLowerCase() === emailOrUsername.toLowerCase() 
               : u.name.toLowerCase() === emailOrUsername.toLowerCase())
    );
    
    if (user) {
      // Store user session
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Update UI using nav.js
      if (window.updateUserUI) {
        window.updateUserUI();
      }
      
      // Close modal
      if (window.hideLoginModal) {
        window.hideLoginModal();
      }
      
      window.toastSuccess(`Welcome back, ${user.name}! 👋`, 'Login Successful');
    } else {
      window.toastError('Invalid credentials', 'Login Failed');
    }
    
    // Reset form state
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login';
      submitBtn.disabled = false;
      submitBtn.style.cursor = 'pointer';
      submitBtn.style.opacity = '1';
    }
    
    inputs.forEach(input => {
      input.disabled = false;
      input.style.cursor = 'text';
    });
  }, 1200);
}

// Handle register form submission
function handleRegister(event) {
  event.preventDefault();
  
  const name = document.getElementById('register-name')?.value;
  const email = document.getElementById('register-email')?.value;
  const username = document.getElementById('register-username')?.value;
  const password = document.getElementById('register-password')?.value;
  const confirmPassword = document.getElementById('register-confirm-password')?.value;
  const agreeTerms = document.getElementById('agree-terms')?.checked;
  
  // Validation
  if (!name || !email || !username || !password || !confirmPassword) {
    window.toastError('Please fill in all required fields', 'Registration Failed');
    return;
  }
  
  if (password !== confirmPassword) {
    window.toastError('Passwords do not match', 'Registration Failed');
    return;
  }
  
  if (password.length < 6) {
    window.toastError('Password must be at least 6 characters long', 'Registration Failed');
    return;
  }
  
  if (!agreeTerms) {
    window.toastError('You must agree to the Terms and Conditions', 'Registration Failed');
    return;
  }
  
  // Check if email or username already exists
  const emailExists = dummyUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
  const usernameExists = dummyUsers.some(u => u.name.toLowerCase() === username.toLowerCase());
  
  if (emailExists) {
    window.toastError('Email already registered', 'Registration Failed');
    return;
  }
  
  if (usernameExists) {
    window.toastError('Username already taken', 'Registration Failed');
    return;
  }
  
  // Create new user
  const newUser = {
    id: Date.now(),
    name: username,
    email: email,
    role: 'user'
  };
  
  // Add to dummy users
  dummyUsers.push(newUser);
  
  // Store user session
  localStorage.setItem('currentUser', JSON.stringify(newUser));
  
  // Update UI
  if (window.updateUserUI) {
    window.updateUserUI();
  }
  
  // Close modal
  if (window.hideRegisterModal) {
    window.hideRegisterModal();
  }
  
  window.toastSuccess(`Welcome to eDM Helper, ${newUser.name}! 🎉`, 'Account Created Successfully');
  
  // Reset form
  document.getElementById('register-form')?.reset();
}

// Toggle password visibility
function togglePassword() {
  const passwordInput = document.getElementById('login-password');
  const passwordIcon = document.getElementById('login-password-icon');
  
  if (passwordInput && passwordIcon) {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      passwordIcon.classList.remove('fa-eye');
      passwordIcon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      passwordIcon.classList.remove('fa-eye-slash');
      passwordIcon.classList.add('fa-eye');
    }
  }
}

// Toggle register password visibility
function toggleRegisterPassword() {
  const passwordInput = document.getElementById('register-password');
  const passwordIcon = document.getElementById('register-password-icon');
  
  if (passwordInput && passwordIcon) {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      passwordIcon.classList.remove('fa-eye');
      passwordIcon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      passwordIcon.classList.remove('fa-eye-slash');
      passwordIcon.classList.add('fa-eye');
    }
  }
}

// Toggle confirm password visibility
function toggleConfirmPassword() {
  const passwordInput = document.getElementById('register-confirm-password');
  const passwordIcon = document.getElementById('register-confirm-password-icon');
  
  if (passwordInput && passwordIcon) {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      passwordIcon.classList.remove('fa-eye');
      passwordIcon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      passwordIcon.classList.remove('fa-eye-slash');
      passwordIcon.classList.add('fa-eye');
    }
  }
}

// Make functions globally available
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.togglePassword = togglePassword;
window.toggleRegisterPassword = toggleRegisterPassword;
window.toggleConfirmPassword = toggleConfirmPassword;
window.saveSettings = saveSettings;
window.applyTheme = applyTheme;
window.applyFontSize = applyFontSize;
