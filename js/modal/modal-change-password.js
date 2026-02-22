// ===================================
// CHANGE PASSWORD MODAL JAVASCRIPT
// ===================================

// Show/Hide Change Password Modal
window.showChangePasswordModal = () => {
  // Hide edit profile modal first
  window.modalManager.hideModal('edit-profile');
  // Then show change password modal
  window.modalManager.showModal('change-password');
};

window.hideChangePasswordModal = () => {
  window.modalManager.hideModal('change-password');
};

// Toggle password visibility
window.togglePasswordVisibility = (inputId) => {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(`${inputId}-icon`);
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
};

// Check password strength
window.checkPasswordStrength = (password) => {
  const strengthIndicator = document.getElementById('password-strength-indicator');
  const strengthText = document.getElementById('password-strength-text');
  
  if (!strengthIndicator || !strengthText) return;
  
  let strength = 0;
  const requirements = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  // Update requirement indicators
  Object.keys(requirements).forEach(req => {
    const element = document.getElementById(`req-${req}`);
    if (element) {
      const icon = element.querySelector('i');
      if (requirements[req]) {
        element.classList.add('met');
        icon.classList.remove('fa-circle');
        icon.classList.add('fa-check-circle');
      } else {
        element.classList.remove('met');
        icon.classList.remove('fa-check-circle');
        icon.classList.add('fa-circle');
      }
    }
    if (requirements[req]) strength++;
  });
  
  // Update strength indicator
  strengthIndicator.className = 'password-strength-indicator';
  
  if (password.length === 0) {
    strengthIndicator.style.width = '0%';
    strengthText.textContent = 'Enter a password';
  } else if (strength <= 2) {
    strengthIndicator.classList.add('weak');
    strengthIndicator.style.width = '25%';
    strengthText.textContent = 'Weak password';
  } else if (strength <= 3) {
    strengthIndicator.classList.add('fair');
    strengthIndicator.style.width = '50%';
    strengthText.textContent = 'Fair password';
  } else if (strength <= 4) {
    strengthIndicator.classList.add('good');
    strengthIndicator.style.width = '75%';
    strengthText.textContent = 'Good password';
  } else {
    strengthIndicator.classList.add('strong');
    strengthIndicator.style.width = '100%';
    strengthText.textContent = 'Strong password';
  }
};

// Handle change password form submission
window.handleChangePassword = async (event) => {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const currentPassword = formData.get('currentPassword');
  const newPassword = formData.get('newPassword');
  const confirmNewPassword = formData.get('confirmNewPassword');
  
  // Validation
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    if (typeof toastError === 'function') {
      toastError('Please fill in all fields');
    }
    return;
  }
  
  if (newPassword.length < 6) {
    if (typeof toastError === 'function') {
      toastError('Password must be at least 6 characters');
    }
    return;
  }
  
  if (newPassword !== confirmNewPassword) {
    if (typeof toastError === 'function') {
      toastError('New passwords do not match');
    }
    return;
  }
  
  // Check password strength
  const strengthIndicator = document.getElementById('password-strength-indicator');
  if (strengthIndicator && strengthIndicator.classList.contains('weak')) {
    if (typeof toastWarning === 'function') {
      toastWarning('Consider using a stronger password');
    }
  }
  
  // Show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Changing...';
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Success
    if (typeof toastSuccess === 'function') {
      toastSuccess('Password changed successfully');
    }
    
    // Close modals
    window.modalManager.hideModal('change-password');
    window.modalManager.showModal('edit-profile');
    
    // Reset form
    form.reset();
    document.getElementById('password-strength-indicator').style.width = '0%';
    document.getElementById('password-strength-text').textContent = 'Enter a password';
    
    // Reset requirement indicators
    document.querySelectorAll('.requirement').forEach(req => {
      req.classList.remove('met');
      const icon = req.querySelector('i');
      icon.classList.remove('fa-check-circle');
      icon.classList.add('fa-circle');
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    if (typeof toastError === 'function') {
      toastError('Failed to change password. Please try again.');
    }
  } finally {
    // Restore button state
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add input event listeners for real-time validation
  const newPasswordInput = document.getElementById('new-password');
  const confirmNewPasswordInput = document.getElementById('confirm-new-password');
  
  if (newPasswordInput) {
    newPasswordInput.addEventListener('input', (e) => {
      checkPasswordStrength(e.target.value);
    });
  }
  
  if (confirmNewPasswordInput) {
    confirmNewPasswordInput.addEventListener('input', (e) => {
      const newPassword = newPasswordInput?.value;
      if (newPassword && e.target.value !== newPassword) {
        e.target.setCustomValidity('Passwords do not match');
      } else {
        e.target.setCustomValidity('');
      }
    });
  }
});
