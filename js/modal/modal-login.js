// ===================================
// LOGIN MODAL JAVASCRIPT
// ===================================

// Show/Hide Login Modal
window.showLoginModal = () => {
  window.modalManager.showModal('login');
  // Focus on email input
  setTimeout(() => {
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.focus();
    }
  }, 300);
};

window.hideLoginModal = () => {
  window.modalManager.hideModal('login');
};

// Toggle password visibility
window.togglePassword = () => {
  const passwordInput = document.getElementById('password');
  const passwordIcon = document.getElementById('password-icon');
  
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
};

// Handle login form submission
window.handleLogin = async (event) => {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const email = formData.get('email');
  const password = formData.get('password');
  const remember = formData.get('remember');
  
  // Clear previous errors
  const errorElement = document.getElementById('login-error');
  if (errorElement) {
    errorElement.classList.remove('show');
  }
  
  // Clear input error states
  document.querySelectorAll('.login-input').forEach(input => {
    input.classList.remove('error', 'success');
  });
  
  // Validation
  if (!email || !password) {
    if (errorElement) {
      errorElement.textContent = 'Please fill in all fields';
      errorElement.classList.add('show');
    }
    return;
  }
  
  // Show loading state
  const submitBtn = form.querySelector('.btn-login');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check credentials (in real app, this would be server-side)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    let user = users.find(u => 
      (u.email === email || u.username === email) && u.password === password
    );
    
    // Dummy login if no users exist or credentials not found
    if (!user) {
      // Check for dummy credentials
      if (email === 'admin' && password === 'admin') {
        user = {
          id: 'dummy-admin',
          username: 'admin',
          email: 'admin@example.com',
          name: 'Administrator',
          role: 'Administrator',
          level: 2
        };
      } else if (email === 'user' && password === 'user') {
        user = {
          id: 'dummy-user',
          username: 'user',
          email: 'user@example.com',
          name: 'Demo User',
          role: 'User',
          level: 1
        };
      } else if (email === 'demo' && password === 'demo') {
        user = {
          id: 'dummy-demo',
          username: 'demo',
          email: 'demo@example.com',
          name: 'Demo Account',
          role: 'Demo',
          level: 1
        };
      }
    }
    
    if (!user) {
      throw new Error('Invalid email/username or password. Try: admin/admin, user/user, or demo/demo');
    }
    
    // Remember me functionality
    if (remember) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }
    
    // Store current user session
    const sessionData = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name || user.username,
      role: user.role || 'User',
      level: user.level || 1,
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('currentUser', JSON.stringify(sessionData));
    
    // Success
    if (typeof toastSuccess === 'function') {
      toastSuccess(`Welcome back, ${user.name || user.username}!`);
    }
    
    // Close modal
    window.hideLoginModal();
    
    // Update UI
    if (typeof updateUserUI === 'function') {
      updateUserUI();
    }
    
    // Redirect if needed
    const redirectUrl = sessionStorage.getItem('loginRedirect');
    if (redirectUrl) {
      sessionStorage.removeItem('loginRedirect');
      window.location.href = redirectUrl;
    }
    
    // Reset form
    form.reset();
    
    // Add success state to inputs
    document.querySelectorAll('.login-input').forEach(input => {
      input.classList.add('success');
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Show error message
    if (errorElement) {
      errorElement.textContent = error.message || 'Login failed. Please try again.';
      errorElement.classList.add('show');
    }
    
    // Add error state to inputs
    document.querySelectorAll('.login-input').forEach(input => {
      input.classList.add('error');
    });
    
    if (typeof toastError === 'function') {
      toastError('Login failed. Please check your credentials.');
    }
    
  } finally {
    // Restore button state
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = originalText;
  }
};

// Social login handlers
window.handleSocialLogin = async (provider) => {
  if (typeof toastInfo === 'function') {
    toastInfo(`${provider} login coming soon!`);
  }
  
  // In a real implementation, this would open OAuth popup
  console.log(`Initiating ${provider} login...`);
};

// Forgot password handler
window.handleForgotPassword = () => {
  const email = document.getElementById('email')?.value;
  
  if (!email) {
    if (typeof toastError === 'function') {
      toastError('Please enter your email address first');
    }
    return;
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (typeof toastError === 'function') {
      toastError('Please enter a valid email address');
    }
    return;
  }
  
  // Show confirmation
  if (typeof toastInfo === 'function') {
    toastInfo('Password reset link sent to your email');
  }
  
  // In a real app, this would send an API request
  console.log('Password reset requested for:', email);
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check for remember me
  const rememberMe = localStorage.getItem('rememberMe');
  if (rememberMe) {
    const rememberCheckbox = document.getElementById('remember');
    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }
  }
  
  // Add input validation
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  
  if (emailInput) {
    emailInput.addEventListener('blur', (e) => {
      const value = e.target.value;
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
        e.target.classList.add('error');
        e.target.setCustomValidity('Please enter a valid email or username');
      } else {
        e.target.classList.remove('error');
        e.target.setCustomValidity('');
      }
    });
    
    emailInput.addEventListener('input', (e) => {
      if (e.target.classList.contains('error')) {
        e.target.classList.remove('error');
        e.target.setCustomValidity('');
      }
    });
  }
  
  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      if (e.target.classList.contains('error')) {
        e.target.classList.remove('error');
        e.target.setCustomValidity('');
      }
    });
  }
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl + L to focus login
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      showLoginModal();
    }
  });
  
  // Auto-focus on modal open
  const loginModal = document.getElementById('modal-login');
  if (loginModal) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (loginModal.classList.contains('active')) {
            setTimeout(() => {
              emailInput?.focus();
            }, 300);
          }
        }
      });
    });
    
    observer.observe(loginModal, { attributes: true });
  }
});
