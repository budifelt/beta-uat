// ===================================
// REGISTER MODAL JAVASCRIPT
// ===================================

// Show/Hide Register Modal
window.showRegisterModal = () => {
  window.modalManager.showModal('register');
  // Focus on username input
  setTimeout(() => {
    const usernameInput = document.getElementById('register-username');
    if (usernameInput) {
      usernameInput.focus();
    }
  }, 300);
};

window.hideRegisterModal = () => {
  window.modalManager.hideModal('register');
};

// Toggle password visibility
window.toggleRegisterPassword = (inputId) => {
  const passwordInput = document.getElementById(inputId);
  const iconId = inputId + '-icon';
  const passwordIcon = document.getElementById(iconId);
  
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

// Check password strength
window.checkPasswordStrength = (password) => {
  const strengthFill = document.getElementById('password-strength-fill');
  const strengthText = document.getElementById('password-strength-text');
  
  if (!strengthFill || !strengthText) return;
  
  let strength = 0;
  
  // Check length
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  
  // Check for mixed case
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  
  // Check for numbers
  if (/\d/.test(password)) strength++;
  
  // Check for special characters
  if (/[^a-zA-Z\d]/.test(password)) strength++;
  
  // Update UI
  strengthFill.className = 'password-strength-fill';
  
  if (strength <= 2) {
    strengthFill.classList.add('weak');
    strengthText.textContent = 'Weak password';
    strengthText.style.color = 'var(--danger, #dc3545)';
  } else if (strength <= 3) {
    strengthFill.classList.add('medium');
    strengthText.textContent = 'Medium strength';
    strengthText.style.color = 'var(--warning, #ffc107)';
  } else {
    strengthFill.classList.add('strong');
    strengthText.textContent = 'Strong password';
    strengthText.style.color = 'var(--success, #28a745)';
  }
};

// Handle register form submission
window.handleRegister = async (event) => {
  event.preventDefault();
  
  const form = event.target;
  const submitBtn = form.querySelector('.btn-register');
  const originalText = submitBtn.innerHTML;
  
  // Get form values
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const accountType = document.getElementById('register-account-type').value;
  const agreeTerms = document.getElementById('register-agree-terms').checked;
  
  // Validation
  if (password !== confirmPassword) {
    if (typeof toastError === 'function') {
      toastError('Passwords do not match');
    } else {
      alert('Passwords do not match');
    }
    return;
  }
  
  if (!agreeTerms) {
    if (typeof toastError === 'function') {
      toastError('Please agree to the terms and conditions');
    } else {
      alert('Please agree to the terms and conditions');
    }
    return;
  }
  
  // Show loading state
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Store user data (in real app, this would be sent to server)
    const userData = {
      username,
      email,
      password, // In real app, never store plain text password
      accountType,
      createdAt: new Date().toISOString()
    };
    
    // Store in localStorage for demo
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    // Show success message
    if (typeof toastSuccess === 'function') {
      toastSuccess('Account created successfully!');
    } else {
      alert('Account created successfully!');
    }
    
    // Close modal and redirect to login or auto-login
    hideRegisterModal();
    
    // Option 1: Show login modal
    setTimeout(() => {
      if (typeof showLoginModal === 'function') {
        showLoginModal();
      }
    }, 500);
    
    // Option 2: Auto-login (uncomment if preferred)
    // localStorage.setItem('isLoggedIn', 'true');
    // window.location.reload();
    
  } catch (error) {
    console.error('Registration error:', error);
    if (typeof toastError === 'function') {
      toastError('Registration failed. Please try again.');
    } else {
      alert('Registration failed. Please try again.');
    }
  } finally {
    // Reset button state
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
};

// Check if username is available (debounced)
let checkUsernameTimeout;
window.checkUsernameAvailability = (username) => {
  clearTimeout(checkUsernameTimeout);
  
  checkUsernameTimeout = setTimeout(() => {
    if (username.length < 3) return;
    
    const input = document.getElementById('register-username');
    
    // Simulate API call to check username
    // In real app, this would be an actual API request
    const takenUsernames = ['admin', 'user', 'test', 'demo'];
    
    if (takenUsernames.includes(username.toLowerCase())) {
      input.classList.add('error');
      input.classList.remove('success');
      // Show error message
      let hint = input.parentNode.nextElementSibling;
      if (hint && hint.classList.contains('form-hint')) {
        hint.textContent = 'Username is already taken';
        hint.style.color = 'var(--danger, #dc3545)';
      }
    } else {
      input.classList.add('success');
      input.classList.remove('error');
      // Show success message
      let hint = input.parentNode.nextElementSibling;
      if (hint && hint.classList.contains('form-hint')) {
        hint.textContent = 'Username is available';
        hint.style.color = 'var(--success, #28a745)';
      }
    }
  }, 500);
};

// Add input listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Username availability check
  const usernameInput = document.getElementById('register-username');
  if (usernameInput) {
    usernameInput.addEventListener('input', (e) => {
      checkUsernameAvailability(e.target.value);
    });
  }
  
  // Real-time password confirmation check
  const confirmPasswordInput = document.getElementById('register-confirm-password');
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', (e) => {
      const password = document.getElementById('register-password').value;
      
      if (e.target.value !== password) {
        e.target.classList.add('error');
        e.target.classList.remove('success');
      } else if (e.target.value === password && e.target.value.length > 0) {
        e.target.classList.add('success');
        e.target.classList.remove('error');
      } else {
        e.target.classList.remove('error', 'success');
      }
    });
  }
});
