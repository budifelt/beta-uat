// ===================================
// EDIT PROFILE MODAL JAVASCRIPT
// ===================================

// Show/Hide Edit Profile Modal
window.showEditProfileModal = () => {
  try {
    console.log('showEditProfileModal called');
    
    // Hide profile menu first
    const profileMenu = document.querySelector('.profile-menu');
    if (profileMenu) {
      profileMenu.classList.remove('active');
    }
    
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) {
      console.log('User not logged in, showing login modal');
      window.showLoginModal();
      if (typeof toastError === 'function') {
        toastError('Please login to edit your profile');
      }
      return;
    }
    
    console.log('User is logged in, loading edit profile modal...');
    window.modalManager.showModal('edit-profile');
    
    // Pre-fill form with user data
    setTimeout(() => {
      // Ensure header/title always matches selected sidebar section on open
      window.showEditProfileSection('basic');

      const form = document.getElementById('edit-profile-form');
      if (form && currentUser) {
        // Basic info
        if (form.fullname) form.fullname.value = currentUser.name || '';
        if (form.username) form.username.value = currentUser.username || '';
        if (form.email) form.email.value = currentUser.email || '';
        if (form.bio) {
          form.bio.value = currentUser.bio || '';
          // Update bio character count
          const bioCount = document.getElementById('bio-count');
          if (bioCount) bioCount.textContent = form.bio.value.length;
        }
        
        // Additional info
        const phoneForm = document.getElementById('edit-profile-form-2');
        if (phoneForm) {
          if (phoneForm.phone) phoneForm.phone.value = currentUser.phone || '';
          if (phoneForm.birthday) phoneForm.birthday.value = currentUser.birthday || '';
          if (phoneForm.location) phoneForm.location.value = currentUser.location || '';
          if (phoneForm.website) phoneForm.website.value = currentUser.website || '';
          if (phoneForm.gender) phoneForm.gender.value = currentUser.gender || '';
          if (phoneForm.languages) phoneForm.languages.value = currentUser.languages || '';
        }
        
        // Professional info
        const profForm = document.getElementById('edit-profile-form-3');
        if (profForm) {
          if (profForm.company) profForm.company.value = currentUser.company || '';
          if (profForm.jobtitle) profForm.jobtitle.value = currentUser.jobtitle || '';
          if (profForm.experience) profForm.experience.value = currentUser.experience || '';
          if (profForm.skills) profForm.skills.value = currentUser.skills || '';
        }
        
        // Social links
        const socialForm = document.getElementById('edit-profile-form-4');
        if (socialForm) {
          if (socialForm.linkedin) socialForm.linkedin.value = currentUser.linkedin || '';
          if (socialForm.github) socialForm.github.value = currentUser.github || '';
          if (socialForm.twitter) socialForm.twitter.value = currentUser.twitter || '';
          if (socialForm.instagram) socialForm.instagram.value = currentUser.instagram || '';
        }
        
        // Privacy settings
        const privacyForm = document.getElementById('edit-profile-form-5');
        if (privacyForm) {
          if (privacyForm['profile-public']) privacyForm['profile-public'].checked = currentUser.profilePublic || false;
          if (privacyForm['show-email']) privacyForm['show-email'].checked = currentUser.showEmail || false;
          if (privacyForm['show-phone']) privacyForm['show-phone'].checked = currentUser.showPhone || false;
        }
      }
    }, 100);
    
  } catch (error) {
    console.error('Error showing edit profile modal:', error);
    if (typeof toastError === 'function') {
      toastError('Failed to open profile editor');
    }
  }
};

window.hideEditProfileModal = () => {
  // Check if there are unsaved changes
  const saveStatus = document.getElementById('save-status');
  if (saveStatus && saveStatus.textContent.includes('unsaved')) {
    if (confirm('You have unsaved changes. Are you sure you want to close?')) {
      window.modalManager.hideModal('edit-profile');
    }
  } else {
    window.modalManager.hideModal('edit-profile');
  }
};

// Show specific section in edit profile modal
window.showEditProfileSection = (sectionName) => {
  // Hide all sections
  document.querySelectorAll('.edit-profile-content-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Remove active class from all tabs
  document.querySelectorAll('.edit-profile-tab-btn').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected section
  const selectedSection = document.getElementById(`${sectionName}-section`);
  if (selectedSection) {
    selectedSection.style.display = 'block';
  }
  
  // Add active class to selected tab
  const selectedTab = document.getElementById(`tab-${sectionName}`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Update header title
  const titleElement = document.getElementById('edit-profile-title');
  const titles = {
    basic: '<i class="fa-solid fa-user"></i> Basic Info',
    additional: '<i class="fa-solid fa-info-circle"></i> Additional',
    professional: '<i class="fa-solid fa-briefcase"></i> Professional',
    social: '<i class="fa-solid fa-share-alt"></i> Social Links',
    privacy: '<i class="fa-solid fa-lock"></i> Privacy'
  };
  
  if (titleElement && titles[sectionName]) {
    titleElement.innerHTML = titles[sectionName];
  }
};

// Handle edit profile form submission
window.handleEditProfile = async (event) => {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  // Get current user data
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Update user data with form values
  const updatedData = { ...currentUser };
  
  // Basic info
  if (form.fullname) updatedData.name = formData.get('fullname');
  if (form.username) updatedData.username = formData.get('username');
  if (form.email) updatedData.email = formData.get('email');
  if (form.bio) updatedData.bio = formData.get('bio');
  
  // Additional info
  const phoneForm = document.getElementById('edit-profile-form-2');
  if (phoneForm) {
    if (phoneForm.phone) updatedData.phone = phoneForm.phone.value;
    if (phoneForm.birthday) updatedData.birthday = phoneForm.birthday.value;
    if (phoneForm.location) updatedData.location = phoneForm.location.value;
    if (phoneForm.website) updatedData.website = phoneForm.website.value;
    if (phoneForm.gender) updatedData.gender = phoneForm.gender.value;
    if (phoneForm.languages) updatedData.languages = phoneForm.languages.value;
  }
  
  // Professional info
  const profForm = document.getElementById('edit-profile-form-3');
  if (profForm) {
    if (profForm.company) updatedData.company = profForm.company.value;
    if (profForm.jobtitle) updatedData.jobtitle = profForm.jobtitle.value;
    if (profForm.experience) updatedData.experience = profForm.experience.value;
    if (profForm.skills) updatedData.skills = profForm.skills.value;
  }
  
  // Social links
  const socialForm = document.getElementById('edit-profile-form-4');
  if (socialForm) {
    if (socialForm.linkedin) updatedData.linkedin = socialForm.linkedin.value;
    if (socialForm.github) updatedData.github = socialForm.github.value;
    if (socialForm.twitter) updatedData.twitter = socialForm.twitter.value;
    if (socialForm.instagram) updatedData.instagram = socialForm.instagram.value;
  }
  
  // Privacy settings
  const privacyForm = document.getElementById('edit-profile-form-5');
  if (privacyForm) {
    updatedData.profilePublic = privacyForm['profile-public']?.checked || false;
    updatedData.showEmail = privacyForm['show-email']?.checked || false;
    updatedData.showPhone = privacyForm['show-phone']?.checked || false;
  }
  
  // Show loading state
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');
  const originalBtnText = saveBtn.innerHTML;
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  saveStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(updatedData));
    
    // Success
    saveStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> All changes saved';
    saveStatus.style.color = 'var(--success)';
    
    if (typeof toastSuccess === 'function') {
      toastSuccess('Profile updated successfully!');
    }
    
    // Update UI if function exists
    if (typeof updateUserUI === 'function') {
      updateUserUI();
    }
    
  } catch (error) {
    console.error('Update profile error:', error);
    saveStatus.innerHTML = '<i class="fa-solid fa-exclamation-circle"></i> Save failed';
    saveStatus.style.color = 'var(--danger)';
    
    if (typeof toastError === 'function') {
      toastError('Failed to update profile. Please try again.');
    }
  } finally {
    // Restore button state
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalBtnText;
    
    // Reset status after 3 seconds
    setTimeout(() => {
      saveStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> All changes saved';
      saveStatus.style.color = 'var(--success)';
    }, 3000);
  }
};

// Save all edit profile sections
window.saveAllEditProfileSections = async () => {
  // Trigger form submission for each visible form
  const activeSection = document.querySelector('.edit-profile-content-section[style*="block"]');
  if (activeSection) {
    const form = activeSection.querySelector('form');
    if (form) {
      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);
    }
  }
};

// Avatar functions
window.previewAvatar = (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const avatarPreview = document.getElementById('avatar-preview');
      if (avatarPreview) {
        avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Avatar preview">`;
      }
    };
    reader.readAsDataURL(file);
  }
};

window.removeAvatar = () => {
  const avatarPreview = document.getElementById('avatar-preview');
  const avatarInput = document.getElementById('avatar-input');
  
  if (avatarPreview) {
    avatarPreview.innerHTML = '<i class="fa-solid fa-user"></i>';
  }
  if (avatarInput) {
    avatarInput.value = '';
  }
  
  if (typeof toastInfo === 'function') {
    toastInfo('Avatar removed');
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Bio character counter
  const bioTextarea = document.getElementById('edit-bio');
  const bioCount = document.getElementById('bio-count');
  
  if (bioTextarea && bioCount) {
    bioTextarea.addEventListener('input', (e) => {
      const count = e.target.value.length;
      bioCount.textContent = count;
      
      if (count > 180) {
        bioCount.style.color = 'var(--toast-warning)';
      } else if (count >= 200) {
        bioCount.style.color = 'var(--danger)';
      } else {
        bioCount.style.color = 'var(--text-muted)';
      }
    });
  }
  
  // Set max date for birthday (must be at least 13 years old)
  const birthdayInput = document.getElementById('edit-birthday');
  if (birthdayInput) {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    birthdayInput.max = minDate.toISOString().split('T')[0];
  }
  
  // Mark form as dirty when changed
  document.querySelectorAll('#edit-profile-modal input, #edit-profile-modal textarea, #edit-profile-modal select').forEach(field => {
    field.addEventListener('change', () => {
      const saveStatus = document.getElementById('save-status');
      if (saveStatus && !saveStatus.textContent.includes('unsaved')) {
        saveStatus.innerHTML = '<i class="fa-solid fa-exclamation-circle"></i> Unsaved changes';
        saveStatus.style.color = 'var(--toast-warning)';
      }
    });
  });
});
