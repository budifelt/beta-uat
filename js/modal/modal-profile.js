// ===================================
// PROFILE MODAL JAVASCRIPT
// ===================================

// Show/Hide Profile Modal
window.showProfileModal = () => {
  window.modalManager.showModal('profile');
  
  // Load user data
  setTimeout(() => {
    loadProfileData();
  }, 100);
};

window.hideProfileModal = () => {
  window.modalManager.hideModal('profile');
};

// Load profile data
window.loadProfileData = () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Update basic info
  const fullNameElement = document.getElementById('profile-fullname');
  if (fullNameElement) {
    fullNameElement.textContent = currentUser.name || currentUser.username || 'User';
  }
  
  // Update email
  const emailElements = document.querySelectorAll('.info-value');
  emailElements.forEach(element => {
    if (element.textContent.includes('john.doe@example.com')) {
      element.textContent = currentUser.email || 'No email set';
    }
  });
  
  // Update avatar
  const avatarElements = document.querySelectorAll('.profile-avatar-img, .ep-avatar');
  if (currentUser.avatar) {
    avatarElements.forEach(element => {
      element.innerHTML = `<img src="${currentUser.avatar}" alt="Profile avatar">`;
    });
  }
  
  // Update stats (in real app, fetch from server)
  updateProfileStats();
  
  // Update activity timeline
  loadActivityTimeline();
};

// Update profile statistics
window.updateProfileStats = () => {
  // In real app, fetch from server
  const stats = {
    projects: Math.floor(Math.random() * 200) + 50,
    followers: Math.floor(Math.random() * 2000) + 500,
    following: Math.floor(Math.random() * 1500) + 300
  };
  
  const statValues = document.querySelectorAll('.profile-stat-value');
  statValues.forEach((element, index) => {
    const keys = ['projects', 'followers', 'following'];
    const key = keys[index];
    if (key && stats[key]) {
      // Animate number
      animateValue(element, 0, stats[key], 1000);
    }
  });
};

// Animate number counting
function animateValue(element, start, end, duration) {
  const range = end - start;
  const minTimer = 50;
  let stepTime = Math.abs(Math.floor(duration / range));
  stepTime = Math.max(stepTime, minTimer);
  const startTime = new Date().getTime();
  const endTime = startTime + duration;
  
  function run() {
    const now = new Date().getTime();
    const remaining = Math.max((endTime - now) / duration, 0);
    const value = Math.round(end - (remaining * range));
    
    if (value >= 1000) {
      element.textContent = (value / 1000).toFixed(1) + 'k';
    } else {
      element.textContent = value;
    }
    
    if (value < end) {
      requestAnimationFrame(run);
    }
  }
  
  requestAnimationFrame(run);
}

// Load activity timeline
window.loadActivityTimeline = () => {
  const timeline = document.getElementById('activity-timeline');
  if (!timeline) return;
  
  // In real app, fetch from server
  const activities = [
    {
      icon: 'fa-user-edit',
      color: 'var(--accent-primary)',
      title: 'Profile Updated',
      description: 'You updated your profile information',
      time: '2 hours ago'
    },
    {
      icon: 'fa-key',
      color: 'var(--success)',
      title: 'Password Changed',
      description: 'You successfully changed your password',
      time: '3 days ago'
    },
    {
      icon: 'fa-camera',
      color: 'var(--toast-warning)',
      title: 'Avatar Updated',
      description: 'You changed your profile picture',
      time: '1 week ago'
    },
    {
      icon: 'fa-shield-halved',
      color: 'var(--info)',
      title: 'Security Settings',
      description: 'You enabled two-factor authentication',
      time: '2 weeks ago'
    }
  ];
  
  // Clear existing activities
  const activityList = document.querySelector('.activity-list');
  if (activityList) {
    activityList.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon" style="color: ${activity.color}">
          <i class="fa-solid ${activity.icon}"></i>
        </div>
        <div class="activity-content">
          <p class="activity-text">
            <strong>${activity.title}</strong> - ${activity.description}
          </p>
          <span class="activity-time">${activity.time}</span>
        </div>
      </div>
    `).join('');
  }
};

// Edit profile from profile modal
window.editProfileFromModal = () => {
  hideProfileModal();
  setTimeout(() => {
    showEditProfileModal();
  }, 300);
};

// Share profile
window.shareProfile = () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const profileUrl = `${window.location.origin}/profile/${currentUser.username}`;
  
  if (navigator.share) {
    navigator.share({
      title: `${currentUser.name || currentUser.username}'s Profile`,
      text: 'Check out my profile!',
      url: profileUrl
    }).catch(err => console.log('Error sharing:', err));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(profileUrl).then(() => {
      if (typeof toastSuccess === 'function') {
        toastSuccess('Profile link copied to clipboard!');
      }
    }).catch(err => {
      console.error('Failed to copy:', err);
      if (typeof toastError === 'function') {
        toastError('Failed to copy profile link');
      }
    });
  }
};

// Download profile data
window.downloadProfileData = () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Create a comprehensive profile data object
  const profileData = {
    personal: {
      name: currentUser.name || '',
      username: currentUser.username || '',
      email: currentUser.email || '',
      bio: currentUser.bio || '',
      phone: currentUser.phone || '',
      birthday: currentUser.birthday || '',
      location: currentUser.location || '',
      website: currentUser.website || '',
      gender: currentUser.gender || '',
      languages: currentUser.languages || ''
    },
    professional: {
      company: currentUser.company || '',
      jobTitle: currentUser.jobtitle || '',
      experience: currentUser.experience || '',
      skills: currentUser.skills || ''
    },
    social: {
      linkedin: currentUser.linkedin || '',
      github: currentUser.github || '',
      twitter: currentUser.twitter || '',
      instagram: currentUser.instagram || ''
    },
    privacy: {
      profilePublic: currentUser.profilePublic || false,
      showEmail: currentUser.showEmail || false,
      showPhone: currentUser.showPhone || false
    },
    account: {
      level: currentUser.level || 1,
      memberSince: currentUser.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }
  };
  
  // Convert to JSON and download
  const dataStr = JSON.stringify(profileData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `profile-data-${currentUser.username}-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  if (typeof toastSuccess === 'function') {
    toastSuccess('Profile data downloaded successfully!');
  }
};

// View profile stats
window.viewProfileStats = () => {
  // In a real app, this could open a detailed stats modal
  if (typeof toastInfo === 'function') {
    toastInfo('Detailed stats coming soon!');
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add hover effect to avatar
  const avatarSection = document.querySelector('.profile-avatar-section');
  if (avatarSection) {
    avatarSection.addEventListener('mouseenter', () => {
      const editIcon = avatarSection.querySelector('.profile-avatar-edit i');
      if (editIcon) {
        editIcon.classList.add('fa-bounce');
      }
    });
    
    avatarSection.addEventListener('mouseleave', () => {
      const editIcon = avatarSection.querySelector('.profile-avatar-edit i');
      if (editIcon) {
        editIcon.classList.remove('fa-bounce');
      }
    });
  }
  
  // Add click handler to stat items
  const statItems = document.querySelectorAll('.profile-stat');
  statItems.forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const label = item.querySelector('.profile-stat-label').textContent;
      if (typeof toastInfo === 'function') {
        toastInfo(`${label} details coming soon!`);
      }
    });
  });
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl + P to open profile
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      showProfileModal();
    }
  });
  
  // Track profile views
  const profileModal = document.getElementById('modal-profile');
  if (profileModal) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (profileModal.classList.contains('active')) {
            // Track profile view
            if (typeof gtag === 'function') {
              gtag('event', 'profile_view', {
                event_category: 'engagement'
              });
            }
          }
        }
      });
    });
    
    observer.observe(profileModal, { attributes: true });
  }
  
  // Add smooth scroll to activity items
  const activityItems = document.querySelectorAll('.activity-item');
  activityItems.forEach(item => {
    item.addEventListener('click', () => {
      item.style.animation = 'pulse 0.3s ease';
      setTimeout(() => {
        item.style.animation = '';
      }, 300);
    });
  });
});
