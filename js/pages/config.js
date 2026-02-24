﻿/** Ambil subject saat ini dari XML (kalau ada) */
function getXmlSubject() {
  if (!xmlDoc) return '';
  const mc = xmlDoc.querySelector('MessageContent');
  return mc ? (mc.getAttribute('subject') || '') : '';
}

function loadXmlFromText(xmlText, { suppressAlert = false } = {}) {
  const raw = (xmlText || '').trim();
  
  if (!raw) {
    xmlDoc = null; 
    initializeFields(); 
    updateEditor(); 
    return;
  }
  
  const parser = new DOMParser();
  const parsed = parser.parseFromString(raw, "application/xml");
  const hasError = parsed.getElementsByTagName('parsererror').length > 0;
  
  if (hasError) {
    if (!suppressAlert) console.warn('XML parse error on load; UI cleared.');
    xmlDoc = null; 
    initializeFields(); 
    if (elements.editor) elements.editor.setValue(''); 
    return;
  }
  
  xmlDoc = parsed; 
  initializeFields(); 
  updateEditor(); 

  // Reset indicator to default state when loading new file
  setCampaignIndicatorState('default');
}

/* Initialize form fields from XML */
function initializeFields() {
  if (!xmlDoc) {
    if (elements.campaignIdInput) elements.campaignIdInput.value = '';
    if (elements.subjectInput) elements.subjectInput.value = '';
    if (elements.linkInput) elements.linkInput.value = '';
    updateCampaignCountIndicator('');
    currentCampaignId = ''; // Reset current campaign ID
    // Update character counts to 0 when no XML
    updateAllCharCounts();
    return;
  }
  
  // Get current campaign ID from XML
  let xmlCampaignId = '';
  const audienceModel = xmlDoc.querySelector('AudienceModel');
  if (audienceModel) {
    const audienceName = audienceModel.getAttribute('name');
    xmlCampaignId = audienceName || '';
  }
  if (!xmlCampaignId) {
    const campaign = xmlDoc.querySelector('Campaign');
    if (campaign) {
      const campaignName = campaign.getAttribute('name');
      xmlCampaignId = campaignName || '';
    }
  }
  
  // Update input field and currentCampaignId variable
  if (elements.campaignIdInput) elements.campaignIdInput.value = xmlCampaignId;
  currentCampaignId = xmlCampaignId; // Set current campaign ID
  updateCampaignCountIndicator(xmlCampaignId);

  const messageContent = xmlDoc.querySelector('MessageContent');
  const subject = messageContent ? messageContent.getAttribute('subject') : '';
  if (elements.subjectInput) elements.subjectInput.value = subject;

  const messageBody = xmlDoc.querySelector('MessageBody');
  const link = messageBody ? messageBody.getAttribute('content') : '';
  if (elements.linkInput) elements.linkInput.value = link;
  
  // Update character counts after loading values
  updateAllCharCounts();
  
  // Validate and show tooltips after loading XML
  if (xmlCampaignId) {
    // Validate Campaign ID format
    const formatValidation = validateCampaignIdFormat(xmlCampaignId);
    const fieldContainer = document.querySelector('.field.campaign-id-field');
    
    if (!formatValidation.valid) {
      if (elements.campaignIdInput) {
        elements.campaignIdInput.classList.add('error');
        elements.campaignIdInput.title = formatValidation.error;
      }
      if (fieldContainer) {
        fieldContainer.classList.add('validation-error');
        const tooltip = document.querySelector('.field.campaign-id-field .validation-tooltip');
        if (tooltip) {
          tooltip.textContent = formatValidation.error;
        }
      }
    } else if (formatValidation.isPastDate) {
      const campaignDateStr = formatValidation.campaignDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (elements.campaignIdInput) {
        elements.campaignIdInput.title = `Peringatan: Tanggal campaign (${campaignDateStr}) sudah lewat dari hari ini`;
      }
      if (fieldContainer) {
        fieldContainer.classList.add('past-date-warning');
        const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
        if (tooltip) {
          tooltip.textContent = `Campaign tanggal ${campaignDateStr} sudah lewat!`;
        }
      }
    }
    
    // Validate Campaign ID and Link pair
    if (link) {
      liveValidatePair();
    }
  }
}

// ---- State & element refs ----
let fileHandle;
let xmlDoc;
let currentDirfileHandle = null;
let currentDirHandle = null;

// Performance: Cache DOM elements
const elements = {
  saveFileBtn: document.getElementById('saveFileBtn'),
  editor: null, // Will be initialized as CodeMirror
  campaignIdInput: document.getElementById('campaignId'),
  subjectInput: document.getElementById('subject'),
  linkInput: document.getElementById('link'),
  campaignCountIndicator: document.getElementById('campaignCountIndicator'),
  breadcrumb: document.getElementById('breadcrumb'),
  overlay: document.getElementById('overlay'),
  spinner: document.querySelector('.spinner')
};

// Initialize CodeMirror editor
let editor;
function initializeCodeMirror() {
  const textarea = document.getElementById('editor');
  if (textarea) {
    editor = CodeMirror.fromTextArea(textarea, {
      mode: 'xml',
      theme: 'monokai',
      lineNumbers: true,
      lineWrapping: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      autoCloseTags: true,
      matchTags: true,
      extraKeys: {
        'Ctrl-F': 'findPersistent',
        'Ctrl-H': 'replace',
        'F11': function(cm) {
          cm.setOption('fullScreen', !cm.getOption('fullScreen'));
        },
        'Esc': function(cm) {
          if (cm.getOption('fullScreen')) cm.setOption('fullScreen', false);
        }
      }
    });
    
    // Hide the original textarea
    textarea.style.display = 'none';
    
    // Update elements.editor to reference CodeMirror instance
    elements.editor = editor;
    
    // Add change event listener for save state
    editor.on('change', () => {
      debouncedSaveState();
    });
  }
}

// Util: label tombol dengan ikon FA - Optimized
function setStatusIcon(id, status) {
  const el = document.getElementById(id);
  if (!el) return;
  let icon = el.querySelector('i');
  if (!icon) {
    icon = document.createElement('i');
    icon.setAttribute('aria-hidden', 'true');
    el.appendChild(icon);
  }
  // Use requestAnimationFrame for smooth updates
  requestAnimationFrame(() => {
    if (el.classList.contains('checkmark')) {
      // For inline checkmarks
      icon.className = 'fa-solid fa-check';
      el.classList.add('show');
      // Add class to wrapper for padding adjustment
      const wrapper = el.closest('.input-wrapper');
      if (wrapper) wrapper.classList.add('checkmark-visible');
    } else {
      // For status indicators
      icon.className = (status === 'error')
      ? 'fa-solid fa-circle-xmark'
      : 'fa-solid fa-circle-check';
      el.style.display = 'inline';
    }
  });
}
function clearStatusIcon(id) {
  const el = document.getElementById(id);
  if (el) {
    if (el.classList.contains('checkmark')) {
      el.classList.remove('show');
      // Remove class from wrapper
      const wrapper = el.closest('.input-wrapper');
      if (wrapper) wrapper.classList.remove('checkmark-visible');
    } else {
      el.style.display = 'none';
    }
  }
}

/* Campaign vs Link validator (4-digit prefer, then 3-digit) */
function extractDigitsFromCampaignId(id) {
  if (!id) return null;
  let m = id.match(/_(\d{4})$/);
  if (m) return m[1];
  m = id.match(/_(\d{3})$/);
  return m ? m[1] : null;
}
function extractDigitsFromLink(urlStr) {
  if (!urlStr) return null;
  let lastSeg = '';
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.split('/').filter(Boolean);
    lastSeg = parts[parts.length - 1] || '';
  } catch {
    const parts = urlStr.split('/').filter(Boolean);
    lastSeg = parts[parts.length - 1] || '';
  }
  let m = lastSeg.match(/^(\d{4})(?=\W|_|-)/);
  if (m) return m[1];
  m = lastSeg.match(/^(\d{3})(?=\W|_|-)/);
  return m ? m[1] : null;
}
function validateCampaignLinkPair(campaignId, link) {
  const cid = extractDigitsFromCampaignId(campaignId);
  const lnk = extractDigitsFromLink(link);
  if (!campaignId || !link) return { ok: true, expected: cid, found: lnk };
  if (!cid || !lnk) return { ok: false, expected: cid || '(3â€“4 digit)', found: lnk || '(?)' };
  return { ok: cid === lnk, expected: cid, found: lnk };
}

/* KRHRED normalizer (toleran)
   ============================

   - Mendeteksi:
     krhred_XX, krhred-unit-XX, <krhred_XX>, <%[KRHRED_Unit_XX]|>, dst.
   - Mengoreksi OCR-like: Oâ†’0, l/Iâ†’1
   - Melengkapi bagian yang kurang â†’ <%[KRHRED_Unit_XX]|%>
*/
const KRHRED_FAST_RE = /(\s*)<?%?\s*\[?\s*KRHRED(?:_Unit)?[_\s-]*([0-9oOlLiI]{1,2})\s*\]?\s*\|?\s*%?>?/gi;

function normalizeKrhredTokens(text) {
  if (!text) return { text, missingDetected: false };
  if (!/krhred/i.test(text)) return { text, missingDetected: false };

  const toDigits2 = (raw) => {
    if (!raw) return null;
    const d = String(raw)
      .replace(/[oO]/g, '0')
      .replace(/[lI]/g, '1')
      .replace(/\D/g, '');
    return d ? d.padStart(2, '0').slice(-2) : null;
  };

  // Invalid jika ada "KRHRED" tanpa angka
  let missingDetected = /\bKRHRED\b(?![_\s-]*[0-9oOlLiI]{1,2})/i.test(text);

  // Ganti semua variasi menjadi format final, preserve space before
  const replaced = text.replace(KRHRED_FAST_RE, (m, spaceBefore, num) => {
    const d2 = toDigits2(num) || '00';
    
    // Preserve the original spacing before the token
    return spaceBefore + `<%[KRHRED_Unit_${d2}]|%>`;
  });

  // Lengkapi jadi format persis <%[KRHRED_Unit_XX]|%>
  const completed = replaced
    .replace(/<\s*KRHRED_Unit_(\d{2})\s*>/gi, '<%[KRHRED_Unit_$1]|%>')       // <KRHRED_Unit_39>
    .replace(/<%\s*\[?\s*KRHRED_Unit_(\d{2})\]?\s*\|?\s*%?>?/gi, '<%[KRHRED_Unit_$1]|%>'); // variasi kurang/salah

  return { text: completed, missingDetected };
}

/* CLEAR / RESET - Optimized with cached elements */
function clearAllUI(opts = { clearStorage: false }) {
  xmlDoc = null; filefileHandle = null;
  
  // Batch DOM updates with requestAnimationFrame
  requestAnimationFrame(() => {
    const inputs = [elements.campaignIdInput, elements.subjectInput, elements.linkInput];
    inputs.forEach(inp => {
      if (inp) {
        inp.value = '';
        inp.classList.remove('error');
        inp.style.borderColor = '';
      }
    });
    
    // Clear tooltip classes
    const campaignIdField = document.querySelector('.field.campaign-id-field');
    const linkField = document.querySelector('.field.link-field');
    if (campaignIdField) {
      campaignIdField.classList.remove('validation-error', 'past-date-warning', 'mismatch-error');
    }
    if (linkField) {
      linkField.classList.remove('mismatch-error');
    }
    
    updateCampaignCountIndicator('');
    
    const charCounts = ['campaignIdCharCount', 'subjectCharCount', 'linkCharCount'];
    charCounts.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
    
    ['campaignIdCheckmark','subjectCheckmark','linkCheckmark'].forEach(clearStatusIcon);
    
    if (elements.saveFileBtn) {
      elements.saveFileBtn.style.borderColor = '';
      elements.saveFileBtn.style.backgroundColor = '';
    }
    
    if (opts.clearStorage) {
      localStorage.removeItem('config_state');
    }
  });
}

/* Save / Load XML - Show modal first before saving */

// Actual save function called by modal
async function performSave() {
  // Use window.fileHandle instead of local fileHandle
  const currentFileHandle = window.fileHandle || fileHandle;
  
  if (!currentFileHandle) {
    showNotification("Belum ada file yang dibuka.", 'error');
    return;
  }
  
  if (!elements.editor || !elements.editor.getValue) {
    showNotification("Editor tidak tersedia.", 'error');
    return;
  }
  
  if (!elements.editor.getValue().trim()) {
    showNotification("Editor kosong, tidak bisa disimpan.", 'error');
    return;
  }

  // Performance: Disable button and show loading state
  const saveBtn = document.getElementById('saveFileBtn');
  let originalText = 'Save';
  let originalIcon = null;
  
  if (saveBtn) {
    originalText = saveBtn.textContent;
    originalIcon = saveBtn.querySelector('i')?.className;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(elements.editor.getValue(), "application/xml");
    const hasError = parsedDoc.getElementsByTagName('parsererror').length > 0;
    
    if (hasError) {
      throw new Error('Invalid XML format');
    }

    xmlDoc = parsedDoc;

    // Performance: Write file with timeout
    const writable = await currentFileHandle.createWritable();
    await writable.write(elements.editor.getValue());
    await writable.close();

    // Success feedback
    if (saveBtn) {
      saveBtn.style.borderColor = 'var(--success)';
      saveBtn.style.backgroundColor = 'var(--success)';
      // Reset button after 2 seconds
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="${originalIcon || 'fa-solid fa-save'}"></i> ${originalText}`;
        saveBtn.style.borderColor = '';
        saveBtn.style.backgroundColor = '';
      }, 2000);
    }
    showNotification('File saved successfully!', 'success');

    // Reset unsaved changes tracking after successful save
    initializeOriginalValues();

    // Set indicator to saved state
    setCampaignIndicatorState('saved');

  } catch (err) {
    showNotification("Error saving file: " + err.message, 'error');
    // Reset button on error
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="${originalIcon || 'fa-solid fa-save'}"></i> ${originalText}`;
    }
  }
}

// Performance: Notification system with stacking (newest on top)
let activeToasts = [];
const MAX_TOASTS = 5;
const TOAST_HEIGHT = 60; // Approximate height per toast
const TOAST_SPACING = 10;

// Track current campaign ID for updates
let currentCampaignId = '';

function showNotification(message, type = 'info') {
  // Limit maximum stacked toasts
  if (activeToasts.length >= MAX_TOASTS) {
    const oldestToast = activeToasts.shift();
    if (oldestToast && oldestToast.parentNode) {
      oldestToast.parentNode.removeChild(oldestToast);
    }
  }

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Insert at beginning of array so newest is on top
  activeToasts.unshift(notification);

  // Calculate position based on existing toasts (newest gets index 0)
  const toastIndex = 0; // Always position newest on top
  const topPosition = 80 + (toastIndex * (TOAST_HEIGHT + TOAST_SPACING));

  notification.style.cssText = `
    position: fixed !important;
    top: ${topPosition}px !important;
    right: 20px !important;
    left: auto !important;
    bottom: auto !important;
    z-index: ${10000 + toastIndex} !important;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    opacity: 1;
  `;

  const colors = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
  };

  notification.style.background = colors[type] || colors.info;
  document.body.appendChild(notification);

  // Reposition all existing toasts down
  repositionToasts();

  // Trigger animation
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(0)';
  });

  // Auto-remove after 3 seconds
  setTimeout(() => {
    // Animate out
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      // Remove from active toasts array
      const index = activeToasts.indexOf(notification);
      if (index > -1) {
        activeToasts.splice(index, 1);
        // Reposition remaining toasts
        repositionToasts();
      }
    }, 300);
  }, 3000);
}

// Reposition all toasts (newest on top, oldest at bottom)
function repositionToasts() {
  activeToasts.forEach((toast, index) => {
    const newTop = 80 + (index * (TOAST_HEIGHT + TOAST_SPACING));
    toast.style.top = `${newTop}px`;
    toast.style.zIndex = 10000 + index;
  });
}

// Performance: Debounced input handlers
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Track last shown past date warning to avoid spam
// Removed this line: let lastShownPastDateWarning = null;

// Performance: Optimized input event listeners
const debouncedSaveState = debounce(saveState, 300);
const debouncedUpdateCampaignCount = debounce(updateCampaignCountIndicator, 100);

// Single event listener for campaignIdInput
if (elements.campaignIdInput) {
  elements.campaignIdInput.addEventListener('input', () => {
    const campaignId = elements.campaignIdInput.value.trim();
    const hasSpace = /\s/.test(campaignId);
    const isEmpty = campaignId.trim() === '';

    // Format validation
    const formatValidation = validateCampaignIdFormat(campaignId);
    
    // Enhanced character count
    const cc = document.getElementById('campaignIdCharCount');
    
    if (cc) {
      const length = campaignId.length;
      cc.textContent = length;
    }
    
    if (hasSpace || isEmpty || (campaignId && !formatValidation.valid)) {
      elements.campaignIdInput.classList.add('error');
      // Show format error if applicable
      if (campaignId && !formatValidation.valid && formatValidation.error) {
        elements.campaignIdInput.title = formatValidation.error;
        
        // Add tooltip for validation error
        const fieldContainer = document.querySelector('.field.campaign-id-field');
        const tooltip = document.querySelector('.field.campaign-id-field .validation-tooltip');
        if (fieldContainer) {
          fieldContainer.classList.add('validation-error');
        }
        if (tooltip) {
          tooltip.textContent = formatValidation.error;
        }
      } else if (hasSpace) {
        elements.campaignIdInput.title = 'Campaign ID tidak boleh mengandung spasi';
        
        const fieldContainer = document.querySelector('.field.campaign-id-field');
        const tooltip = document.querySelector('.field.campaign-id-field .validation-tooltip');
        if (fieldContainer) {
          fieldContainer.classList.add('validation-error');
        }
        if (tooltip) {
          tooltip.textContent = 'Campaign ID tidak boleh mengandung spasi';
        }
      }
    } else {
      elements.campaignIdInput.classList.remove('error');
      elements.campaignIdInput.title = '';
      
      // Remove validation error tooltip
      const fieldContainer = document.querySelector('.field.campaign-id-field');
      if (fieldContainer) {
        fieldContainer.classList.remove('validation-error');
      }

      // Show past date warning (but allow input)
      if (campaignId && formatValidation.valid && formatValidation.isPastDate) {
        const campaignDateStr = formatValidation.campaignDate.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const pastDateWarning = `Peringatan: Tanggal campaign (${campaignDateStr}) sudah lewat dari hari ini`;
        elements.campaignIdInput.title = pastDateWarning;
        
        // Update tooltip text
        const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
        const inputWrapper = document.querySelector('.input-wrapper.campaign-id-field');
        
        if (tooltip) {
          tooltip.textContent = `Campaign tanggal ${campaignDateStr} sudah lewat!`;
          console.log('Tooltip updated:', tooltip.textContent);
        }
        
        // Add visual warning indicator to field container
        if (fieldContainer) {
          fieldContainer.classList.add('past-date-warning');
          console.log('Added past-date-warning to field container');
        }
        if (inputWrapper) {
          inputWrapper.classList.add('past-date-warning');
        }
      } else {
        // Remove visual warning indicator if not past date
        const inputWrapper = document.querySelector('.input-wrapper.campaign-id-field');
        if (fieldContainer) {
          fieldContainer.classList.remove('past-date-warning');
        }
        if (inputWrapper) {
          inputWrapper.classList.remove('past-date-warning');
        }
      }
    }

    clearStatusIcon('campaignIdCheckmark');
    saveState();

    // Show link checkmark when valid
    showLinkCheckmarkWhenValid();
    liveValidatePair();
  });

  // Add focus effects
  elements.campaignIdInput.addEventListener('focus', () => {
    const wrapper = document.querySelector('.input-wrapper.campaign-id-field');
    if (wrapper) {
      wrapper.classList.add('focused');
    }
  });

  elements.campaignIdInput.addEventListener('blur', () => {
    const wrapper = document.querySelector('.input-wrapper.campaign-id-field');
    if (wrapper) {
      wrapper.classList.remove('focused');
    }
  });
}

// Add saveState event listeners
if (elements.campaignIdInput) elements.campaignIdInput.addEventListener('input', saveState);
if (elements.subjectInput) elements.subjectInput.addEventListener('input', saveState);
if (elements.linkInput) elements.linkInput.addEventListener('input', saveState);
window.addEventListener('beforeunload', saveState);

// Show linkCheckmark when Campaign ID is valid and has content
function showLinkCheckmarkWhenValid() {
  const cid = elements.campaignIdInput ? elements.campaignIdInput.value.trim() : '';
  const lnk = elements.linkInput ? elements.linkInput.value.trim() : '';
  
  if (cid && lnk) {
    const res = validateCampaignLinkPair(cid, lnk);
    if (res.ok) {
      setStatusIcon('linkCheckmark', 'ok');
    } else {
      clearStatusIcon('linkCheckmark');
    }
  }
}

/* Campaign ID Format Validation */
function validateCampaignIdFormat(campaignId) {
  if (!campaignId || campaignId.trim() === '') return { valid: false, error: '' };
  
  // Regex for YYYYMMDD_nama-campaign_XXXX format
  // YYYYMMDD_ = 8 digits + underscore
  // nama-campaign = anything (non-empty)
  // _XXXX = underscore + 4 digits
  const formatRegex = /^\d{8}_.+_\d{4}$/;
  
  if (!formatRegex.test(campaignId)) {
    return { 
      valid: false, 
      error: 'Format harus: YYYYMMDD_nama-campaign_XXXX' 
    };
  }
  
  // Extract and validate date part (YYYYMMDD)
  const datePart = campaignId.substring(0, 8);
  const year = parseInt(datePart.substring(0, 4));
  const month = parseInt(datePart.substring(4, 6));
  const day = parseInt(datePart.substring(6, 8));
  
  if (year < 2020 || year > 2030 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { 
      valid: false, 
      error: 'Tanggal tidak valid (YYYYMMDD)' 
    };
  }
  
  // Check if date is in the past
  const campaignDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison
  
  const isPastDate = campaignDate < today;
  
  return { 
    valid: true, 
    error: '',
    isPastDate: isPastDate,
    campaignDate: campaignDate
  };
}

/* Live validation CampaignID â†" Link - Optimized */
function extractCountByCampaignId(campaignId) {
  if (!xmlDoc || !campaignId || campaignId.trim() === '') return 0;
  let count = 0;
  
  xmlDoc.querySelectorAll('AudienceModel').forEach((el) => {
    const name = el.getAttribute('name');
    if (name === campaignId) count++;
  });
  
  xmlDoc.querySelectorAll('Campaign').forEach((el) => {
    const name = el.getAttribute('name');
    const audience = el.getAttribute('audience');
    if (name === campaignId) count++;
    if (audience === campaignId) count++;
  });
  
  xmlDoc.querySelectorAll('Interaction').forEach((el) => {
    const name = el.getAttribute('name');
    const message = el.getAttribute('message');
    if (name === campaignId) count++;
    if (message === campaignId) count++;
  });
  
  xmlDoc.querySelectorAll('MessageContent').forEach((el) => {
    const name = el.getAttribute('name');
    if (name === campaignId) count++;
  });
  
  xmlDoc.querySelectorAll('FilterValue').forEach((el) => {
    const value = el.getAttribute('value');
    if (value === campaignId) count++;
  });
  
  return count;
}

function updateCampaignCountIndicator(campaignId) {
  const n = extractCountByCampaignId(campaignId);
  let color;

  // Determine color based on state and count
  if (!campaignId || !xmlDoc) {
    // No campaign loaded - show default state color
    color = '#ef4444'; // red
  } else {
    // Campaign loaded - use state-based colors
    switch (campaignIndicatorState) {
      case 'saved':
        color = '#22c55e'; // green - saved
        break;
      case 'applied':
        color = '#eab308'; // yellow - applied but not saved
        break;
      case 'default':
      default:
        color = '#ef4444'; // red - default state
        break;
    }
  }

  if (elements.campaignCountIndicator) {
    elements.campaignCountIndicator.style.backgroundColor = color;
    // Show the actual count (n/7)
    elements.campaignCountIndicator.textContent = `${n}/7`;
    elements.campaignCountIndicator.title = `${n}/7 - State: ${campaignIndicatorState}`;
  }
}

function liveValidatePair() {
  const cid = elements.campaignIdInput ? elements.campaignIdInput.value.trim() : '';
  const lnk = elements.linkInput ? elements.linkInput.value.trim() : '';
  const res = validateCampaignLinkPair(cid, lnk);
  const mismatchWarning = document.getElementById('mismatchWarning');

  if (elements.campaignIdInput) {
    elements.campaignIdInput.classList.remove('error');
    elements.campaignIdInput.style.borderColor = '';
  }
  if (elements.linkInput) {
    elements.linkInput.classList.remove('error');
    elements.linkInput.style.borderColor = '';
  }
  if (mismatchWarning) mismatchWarning.style.display = 'none';
  
  // Remove mismatch-error class from both fields
  const campaignIdFieldContainer = document.querySelector('.field.campaign-id-field');
  const linkFieldContainer = document.querySelector('.field.link-field');
  if (campaignIdFieldContainer) {
    campaignIdFieldContainer.classList.remove('mismatch-error');
  }
  if (linkFieldContainer) {
    linkFieldContainer.classList.remove('mismatch-error');
  }

  if (cid && lnk && !res.ok) {
    if (mismatchWarning) {
      mismatchWarning.style.display = 'inline';
      mismatchWarning.textContent = '';
      mismatchWarning.title = `Mismatch!\nCampaign ID ends with: ${res.expected}\nLink ends with: ${res.found}`;
    }
    if (elements.campaignIdInput) {
      elements.campaignIdInput.classList.add('error');
      elements.campaignIdInput.title = `Mismatch!\nCampaign ID ends with: ${res.expected}\nLink ends with: ${res.found}`;
    }
    if (elements.linkInput) {
      elements.linkInput.classList.add('error');
      elements.linkInput.title = `Mismatch!\nCampaign ID ends with: ${res.expected}\nLink ends with: ${res.found}`;
    }
    
    // Add mismatch-error class and update tooltip for both fields
    if (campaignIdFieldContainer) {
      campaignIdFieldContainer.classList.add('mismatch-error');
      const tooltip = document.querySelector('.field.campaign-id-field .mismatch-tooltip');
      if (tooltip) {
        tooltip.textContent = `Campaign ID berakhir: ${res.expected}, Link berakhir: ${res.found}`;
      }
    }
    if (linkFieldContainer) {
      linkFieldContainer.classList.add('mismatch-error');
      const tooltip = document.querySelector('.field.link-field .mismatch-tooltip');
      if (tooltip) {
        tooltip.textContent = `Campaign ID berakhir: ${res.expected}, Link berakhir: ${res.found}`;
      }
    }
  } else if (cid && lnk && res.ok) {
    // Show success tooltip
    if (elements.campaignIdInput) {
      elements.campaignIdInput.title = 'Campaign ID and Link match!';
    }
    if (elements.linkInput) {
      elements.linkInput.title = 'Campaign ID and Link match!';
    }
  }
}

if (elements.subjectInput) {
  elements.subjectInput.addEventListener('input', () => {
    // Sembunyikan ikon ketika user mengubah input
    clearStatusIcon('subjectCheckmark');
    const cc = document.getElementById('subjectCharCount');
    const wrapper = document.querySelector('.input-wrapper.subject-field');
    
    if (cc) {
      const length = (elements.subjectInput.value || '').length;
      cc.textContent = length;
    }
  });
  
  // Add focus effects
  elements.subjectInput.addEventListener('focus', () => {
    const wrapper = document.querySelector('.input-wrapper.subject-field');
    if (wrapper) {
      wrapper.classList.add('focused');
    }
  });
  
  elements.subjectInput.addEventListener('blur', () => {
    const wrapper = document.querySelector('.input-wrapper.subject-field');
    if (wrapper) {
      wrapper.classList.remove('focused');
    }
  });
}

if (elements.linkInput) {
  elements.linkInput.addEventListener('input', () => {
    liveValidatePair();
    clearStatusIcon('linkCheckmark');
    showLinkCheckmarkWhenValid();
    
    // Update character count
    const cc = document.getElementById('linkCharCount');
    if (cc) {
      const length = elements.linkInput.value.length;
      cc.textContent = length;
    }
    
    // Update checkmark visibility
    const wrapper = document.querySelector('.input-wrapper.link-field');
    if (wrapper) {
      const length = elements.linkInput.value.length;
      if (length > 0) {
        wrapper.classList.add('checkmark-visible');
      } else {
        wrapper.classList.remove('checkmark-visible');
      }
    }
  });
  
  // Add focus effects
  elements.linkInput.addEventListener('focus', () => {
    const wrapper = document.querySelector('.input-wrapper.link-field');
    if (wrapper) {
      wrapper.classList.add('focused');
    }
  });
  
  elements.linkInput.addEventListener('blur', () => {
    const wrapper = document.querySelector('.input-wrapper.link-field');
    if (wrapper) {
      wrapper.classList.remove('focused');
    }
  });
}

/* Editor helper */
function updateEditor() {
  if (!xmlDoc) { 
    if (elements.editor) elements.editor.setValue(''); 
    return; 
  }
  const serializer = new XMLSerializer();
  let updatedXmlStr = serializer.serializeToString(xmlDoc);
  updatedXmlStr = formatXml(updatedXmlStr);
  if (elements.editor) elements.editor.setValue(updatedXmlStr);
}

/* Pretty-print XML */
function formatXml(xml) {
  let formatted = '';
  xml = xml.replace(/(>)(<)(\/*)/g, '$1\r\n$2$3');
  let pad = 0;
  xml.split('\r\n').forEach((node) => {
    let indent = 0;
    if (/.+<\/\w[^>]*>$/.test(node)) indent = 0;
    else if (/^<\/\w/.test(node)) { if (pad !== 0) pad -= 1; }
    else if (/^<\w[^>]*[^\/]?>.*$/.test(node)) indent = 1;
    let padding = ''; for (let i = 0; i < pad; i++) padding += '  ';
    formatted += padding + node + '\r\n'; pad += indent;
  });
  return formatted.trim();
}

// Enhanced save/load state with search persistence
function saveState() {
  const state = {
    campaignId: elements.campaignIdInput ? elements.campaignIdInput.value : '',
    subject: elements.subjectInput ? elements.subjectInput.value : '',
    link: elements.linkInput ? elements.linkInput.value : '',
    xmlContent: elements.editor ? elements.editor.getValue() : '',
    folderOpened: typeof currentDirHandle !== 'undefined' && currentDirHandle !== null
  };
  localStorage.setItem('config_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('config_state');
  if (!saved) { 
    if (typeof decorateButtons === 'function') decorateButtons(); 
    return; 
  }
  try {
    const state = JSON.parse(saved);
    if (state.xmlContent) loadXmlFromText(state.xmlContent, { suppressAlert: true });
    if (xmlDoc && elements.campaignIdInput) {
      elements.campaignIdInput.value = state.campaignId || '';
      elements.subjectInput.value = state.subject || '';
      elements.linkInput.value = state.link || '';
      updateCampaignCountIndicator(elements.campaignIdInput.value);
      
      // Update character counts on load
      updateAllCharCounts();
      
      // Validate and show tooltips after loading state
      const campaignId = state.campaignId || '';
      const link = state.link || '';
      
      if (campaignId) {
        // Validate Campaign ID format
        const formatValidation = validateCampaignIdFormat(campaignId);
        const fieldContainer = document.querySelector('.field.campaign-id-field');
        
        if (!formatValidation.valid) {
          if (elements.campaignIdInput) {
            elements.campaignIdInput.classList.add('error');
            elements.campaignIdInput.title = formatValidation.error;
          }
          if (fieldContainer) {
            fieldContainer.classList.add('validation-error');
            const tooltip = document.querySelector('.field.campaign-id-field .validation-tooltip');
            if (tooltip) {
              tooltip.textContent = formatValidation.error;
            }
          }
        } else if (formatValidation.isPastDate) {
          const campaignDateStr = formatValidation.campaignDate.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          if (elements.campaignIdInput) {
            elements.campaignIdInput.title = `Peringatan: Tanggal campaign (${campaignDateStr}) sudah lewat dari hari ini`;
          }
          if (fieldContainer) {
            fieldContainer.classList.add('past-date-warning');
            const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
            if (tooltip) {
              tooltip.textContent = `Campaign tanggal ${campaignDateStr} sudah lewat!`;
            }
          }
        }
        
        // Validate Campaign ID and Link pair
        if (link) {
          liveValidatePair();
        }
      }
    }
  } catch (e) {
    showNotification('Error loading state', 'error');
  } finally {
    if (typeof decorateButtons === 'function') decorateButtons(); // ensure emojis added
  }
}

// Function to update all character counts
function updateAllCharCounts() {
  // Update Campaign ID count
  const campaignIdCC = document.getElementById('campaignIdCharCount');
  if (campaignIdCC && elements.campaignIdInput) {
    const length = elements.campaignIdInput.value.length;
    campaignIdCC.textContent = length;
  }
  
  // Update Subject count
  const subjectCC = document.getElementById('subjectCharCount');
  if (subjectCC && elements.subjectInput) {
    const length = elements.subjectInput.value.length;
    subjectCC.textContent = length;
  }
  
  // Update Link count
  const linkCC = document.getElementById('linkCharCount');
  if (linkCC && elements.linkInput) {
    const length = elements.linkInput.value.length;
    linkCC.textContent = length;
  }
}

// === Apply Update combo button ===
(function(){
  const applyUpdateBtn = document.getElementById('applyUpdateBtn');
  if (applyUpdateBtn) {
    applyUpdateBtn.addEventListener('click', async () => {
      // Check if XML is loaded before applying updates
      if (!xmlDoc) {
        showNotification("Tidak ada XML yang dimuat. Silakan buka file terlebih dahulu.", 'error');
        return;
      }
      
      // Disable button and show loading state
      applyUpdateBtn.disabled = true;
      const originalContent = applyUpdateBtn.innerHTML;
      applyUpdateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Applying...';
      
      let allValid = true;
      let updateCount = 0;
      let hasChanges = false;
      
      // Get current values from XML
      let currentCampaignId = xmlDoc.querySelector('AudienceModel')?.getAttribute('name') || '';
      let currentSubject = xmlDoc.querySelector('MessageContent')?.getAttribute('subject') || '';
      let currentLink = xmlDoc.querySelector('MessageBody')?.getAttribute('content') || '';
      
      // Get input values
      let campaignIdValue = elements.campaignIdInput ? elements.campaignIdInput.value.trim() : '';
      let subjectValue = elements.subjectInput ? elements.subjectInput.value.trim() : '';
      let linkValue = elements.linkInput ? elements.linkInput.value.trim() : '';
      
      // Variable to track the campaign ID for updates
      let campaignIdForUpdate = currentCampaignId;
      
      // Check if Campaign ID has changes
      if (campaignIdValue && campaignIdValue !== currentCampaignId) {
        hasChanges = true;
        const hasSpace = /\s/.test(campaignIdValue);
        const formatValidation = validateCampaignIdFormat(campaignIdValue);
        
        if (!hasSpace && formatValidation.valid) {
          // Update AudienceModel
          const audienceModel = xmlDoc.querySelector('AudienceModel');
          if (audienceModel) audienceModel.setAttribute('name', campaignIdValue);
          
          // Update Campaign
          const campaign = xmlDoc.querySelector('Campaign');
          if (campaign) {
            campaign.setAttribute('name', campaignIdValue);
            campaign.setAttribute('audience', campaignIdValue);
          }
          
          // Update Interaction elements
          xmlDoc.querySelectorAll('Interaction').forEach(el => {
            if (el.getAttribute('name') === campaignIdForUpdate) {
              el.setAttribute('name', campaignIdValue);
            }
            if (el.getAttribute('message') === campaignIdForUpdate) {
              el.setAttribute('message', campaignIdValue);
            }
          });
          
          // Update MessageContent elements
          xmlDoc.querySelectorAll('MessageContent').forEach(el => {
            if (el.getAttribute('name') === campaignIdForUpdate) {
              el.setAttribute('name', campaignIdValue);
            }
          });
          
          // Update FilterValue elements
          xmlDoc.querySelectorAll('FilterValue').forEach(el => {
            if (el.getAttribute('value') === campaignIdForUpdate) {
              el.setAttribute('value', campaignIdValue);
            }
          });
          
          campaignIdForUpdate = campaignIdValue;
          setStatusIcon('campaignIdCheckmark', 'ok');
          updateCount++;
        } else {
          allValid = false;
          if (elements.campaignIdInput) elements.campaignIdInput.classList.add('error');
        }
      }
      
      // Check if Subject has changes
      if (subjectValue && subjectValue !== currentSubject) {
        hasChanges = true;
        const result = normalizeKrhredTokens(subjectValue);
        const normalized = (result.text || '').trim();
        
        if (!result.missingDetected && normalized !== '') {
          const messageContent = xmlDoc.querySelector('MessageContent');
          if (messageContent) {
            messageContent.setAttribute('subject', normalized);
            if (elements.subjectInput) elements.subjectInput.value = normalized;
            setStatusIcon('subjectCheckmark', 'ok');
            updateCount++;
          }
        } else {
          allValid = false;
          if (elements.subjectInput) elements.subjectInput.classList.add('error');
          setStatusIcon('subjectCheckmark', 'error');
        }
      }
      
      // Check if Link has changes
      if (linkValue && linkValue !== currentLink) {
        hasChanges = true;
        const urlPattern = /^(http:\/\/|https:\/\/).+/i;
        if (urlPattern.test(linkValue)) {
          let finalLink = linkValue;
          if (finalLink.startsWith('https://')) finalLink = 'http://' + finalLink.substring(8);
          
          const messageBody = xmlDoc.querySelector('MessageBody');
          if (messageBody) {
            messageBody.setAttribute('content', finalLink);
            setStatusIcon('linkCheckmark', 'ok');
            updateCount++;
          }
        } else {
          allValid = false;
          if (elements.linkInput) elements.linkInput.classList.add('error');
        }
      }
      
      // Update editor first, then show notification only if there were changes
      if (hasChanges) {
        if (updateCount > 0) {
          // Update xmlDoc and editor first
          updateEditor();
          
          // Update the xmlContent in saveState to reflect changes
          saveState();
          
          // Re-initialize fields to sync with updated XML
          initializeFields();
          
          // Show notification after XML is updated
          showNotification(`Successfully applied ${updateCount} update(s)!`, 'success');
          setCampaignIndicatorState('applied');
          
          // Update character counts after applying changes
          updateAllCharCounts();
        } else {
          showNotification('No valid updates to apply', 'info');
        }
      } else {
        showNotification('No changes detected', 'info');
      }
      
      // Re-enable button and restore original content
      setTimeout(() => {
        applyUpdateBtn.disabled = false;
        applyUpdateBtn.innerHTML = originalContent;
      }, 500);
    });
  }
})();

// === Save Changes Modal ===
// Track unsaved changes
let hasUnsavedChanges = false;
let originalValues = {};

// Track campaign count indicator state
let campaignIndicatorState = 'default'; // 'default' | 'applied' | 'saved'

function setCampaignIndicatorState(state) {
  campaignIndicatorState = state;
  // Update indicator immediately if we have a campaign ID
  if (elements.campaignIdInput && elements.campaignIdInput.value) {
    updateCampaignCountIndicator(elements.campaignIdInput.value);
  }
}

// Initialize original values on page load
function initializeOriginalValues() {
  originalValues = {
    campaignId: elements.campaignIdInput ? elements.campaignIdInput.value : '',
    subject: elements.subjectInput ? elements.subjectInput.value : '',
    link: elements.linkInput ? elements.linkInput.value : '',
    editorContent: elements.editor ? elements.editor.getValue() : ''
  };
  hasUnsavedChanges = false;
}

// Check if there are unsaved changes
function checkUnsavedChanges() {
  if (!originalValues.campaignId && !originalValues.subject && !originalValues.link && !originalValues.editorContent) return false; // Not initialized yet

  const currentValues = {
    campaignId: elements.campaignIdInput ? elements.campaignIdInput.value : '',
    subject: elements.subjectInput ? elements.subjectInput.value : '',
    link: elements.linkInput ? elements.linkInput.value : '',
    editorContent: elements.editor ? elements.editor.getValue() : ''
  };

  const hasChanges = 
    currentValues.campaignId !== originalValues.campaignId ||
    currentValues.subject !== originalValues.subject ||
    currentValues.link !== originalValues.link ||
    currentValues.editorContent !== originalValues.editorContent;

  hasUnsavedChanges = hasChanges;
  return hasChanges;
}

// Show save changes modal
function showSaveChangesModal() {
  const modal = document.getElementById('saveChangesModal');
  if (modal) {
    modal.hidden = false;
    modal.style.display = 'flex !important';
    modal.style.zIndex = '9999';
  }
}

// Hide save changes modal
function hideSaveChangesModal() {
  const modal = document.getElementById('saveChangesModal');
  if (modal) {
    modal.hidden = true;
    modal.style.display = 'none !important';
    modal.style.zIndex = '-1';
  }
}

// Modal event handlers
function initializeModalHandlers() {
  const modal = document.getElementById('saveChangesModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  const saveBtn = document.getElementById('saveChangesBtn');

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideSaveChangesModal();
      }
    });
  }

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', hideSaveChangesModal);
  }

  // Cancel button - just close modal
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideSaveChangesModal);
  }

  // Save button - save changes and close
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      // Check if file is opened before proceeding
      if (!window.fileHandle) {
        showNotification("Belum ada file yang dibuka. Silakan buka file terlebih dahulu.", 'error');
        hideSaveChangesModal();
        return;
      }
      
      // Disable save button during save
      saveBtn.disabled = true;
      const originalText = saveBtn.textContent;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
      
      hideSaveChangesModal(); // Hide modal immediately

      // Trigger save
      try {
        await performSave();
      } catch (error) {
        showNotification("Error saving file: " + error.message, 'error');
      }

      // Re-enable save button and reset text after a delay
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }, 500);
    });
  }
}

// Prevent page unload with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (checkUnsavedChanges()) {
    // Only show modal if file is actually opened AND not in applied state
    if (window.fileHandle && campaignIndicatorState !== 'applied') {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      showSaveChangesModal();
      return e.returnValue;
    }
  }
});

// Track changes on input
[elements.campaignIdInput, elements.subjectInput, elements.linkInput].forEach(inp => {
  if (inp) {
    inp.addEventListener('input', () => {
      // Performance: Batch DOM updates
      requestAnimationFrame(() => {
        if (elements.saveFileBtn) {
          elements.saveFileBtn.style.borderColor = '';
          elements.saveFileBtn.style.backgroundColor = '';
        }
        checkUnsavedChanges();
        debouncedSaveState();
      });
    });
  }
});

// Track editor changes - handled in CodeMirror initialization

// Initialize modal on page load
window.addEventListener('load', () => {
  // Initialize CodeMirror first
  initializeCodeMirror();
  
  loadState();
  initializeOriginalValues();
  initializeModalHandlers();
  initializeFileTree();

  // Add save button event listener after DOM is loaded
  const saveFileBtn = document.getElementById('saveFileBtn');
  if (saveFileBtn) {
    saveFileBtn.addEventListener('click', async () => {
      // Check if file is opened before showing modal
      if (!window.fileHandle) {
        showNotification("Belum ada file yang dibuka. Silakan buka file terlebih dahulu.", 'error');
        return;
      }
      
      // Show save confirmation modal instead of saving directly
      showSaveChangesModal();
    });
  }

  // Clear content if no folder is active
  if (typeof currentDirHandle === 'undefined' || currentDirHandle === null) {
    clearContentWhenNoFolder();
  }
});

// Clear content section when no folder/file is active
function clearContentWhenNoFolder() {
  // Clear form inputs
  if (elements.campaignIdInput) elements.campaignIdInput.value = '';
  if (elements.subjectInput) elements.subjectInput.value = '';
  if (elements.linkInput) elements.linkInput.value = '';
  if (elements.editor) elements.editor.setValue('');
  
  // Update character counts to 0
  updateAllCharCounts();
  
  // Clear XML document
  xmlDoc = null;
  
  // Update breadcrumb
  updateBreadcrumb('No folder');
  
  // Reset indicator
  setCampaignIndicatorState('default');
}

// === File Tree Functionality ===
let selectedFileItem = null;

// Initialize file tree
function initializeFileTree() {
  const openFolderBtn = document.getElementById('openFolderBtn');
  const refreshTreeBtn = document.getElementById('refreshTreeBtn');
  const resizeHandle = document.getElementById('resizeHandle');
  const fileTree = document.getElementById('fileTree');
  
  // Show empty state initially
  if (fileTree && !fileTree.hasChildNodes()) {
    fileTree.innerHTML = '<div class="file-tree-empty">No folder opened. Click "Open Folder" to begin.</div>';
  }
  
  if (openFolderBtn) {
    openFolderBtn.addEventListener('click', openFolder);
  }
  
  if (refreshTreeBtn) {
    refreshTreeBtn.addEventListener('click', refreshFileTree);
  }
  
  // Initialize resizable sidebar
  if (resizeHandle) {
    initializeResizableSidebar();
  }

  // Simple event delegation that should work
  if (fileTree) {
    fileTree.addEventListener('click', function(e) {
      // Find the closest li element (could be nested)
      const li = e.target.closest('li');
      if (!li) {
        return;
      }
      
      if (li.classList.contains('folder')) {
        e.stopPropagation();
        e.preventDefault();
        toggleFolder(li);
      } else if (li.classList.contains('file')) {
        e.stopPropagation();
        e.preventDefault();
        selectFile(li, li._fileHandle);
      }
    });
  }
}

// Handle tree click events using event delegation
function handleTreeClick(e) {
  const target = e.target;
  const li = target.closest('li');
  
  if (!li) return;
  
  e.stopPropagation();
  
  if (li.classList.contains('folder')) {
    toggleFolder(li);
  } else if (li.classList.contains('file')) {
    selectFile(li, li._fileHandle);
  }
}

// Initialize resizable sidebar functionality
function initializeResizableSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const resizeHandle = document.getElementById('resizeHandle');
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;
    
    // Apply min and max width constraints
    if (newWidth >= 200 && newWidth <= 500) {
      sidebar.style.width = newWidth + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// Open folder using File System Access API
async function openFolder() {
  try {
    if ('showDirectoryPicker' in window) {
      const dirHandle = await window.showDirectoryPicker();
      currentDirHandle = dirHandle;
      updateBreadcrumb(dirHandle.name);
      await loadFileTree(dirHandle);
      showNotification(`Folder "${dirHandle.name}" opened successfully`, 'success');
    } else {
      showNotification('File System Access API not supported in this browser', 'error');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      showNotification('Failed to open folder', 'error');
    }
  }
}

// Refresh file tree
async function refreshFileTree() {
  if (currentDirHandle) {
    await loadFileTree(currentDirHandle);
    showNotification('File tree refreshed', 'info');
  } else {
    showNotification('No folder opened', 'error');
  }
}

// Update breadcrumb
function updateBreadcrumb(folderName) {
  if (elements.breadcrumb) {
    elements.breadcrumb.textContent = folderName || 'No folder';
    elements.breadcrumb.title = folderName || 'No folder';
  }
}

// Load file tree from directory handle
async function loadFileTree(dirHandle) {
  const fileTree = document.getElementById('fileTree');
  if (!fileTree) return;
  
  fileTree.innerHTML = '';
  
  try {
    // Check if this is folder 'X' - if so, show its contents directly
    if (dirHandle.name.toLowerCase() === 'x') {
      const treeContainer = document.createElement('ul');
      treeContainer.className = 'tree';
      await loadDirectoryChildren(dirHandle, treeContainer);
      fileTree.appendChild(treeContainer);
      
      // Update breadcrumb to show 'X' instead of the actual folder name
      updateBreadcrumb('X');
      showNotification(`Showing contents of folder "X"`, 'info');
    } else {
      // Normal folder - show folder and its contents
      const treeContainer = document.createElement('ul');
      treeContainer.className = 'tree';
      
      const rootItem = createTreeItem(dirHandle.name, 'folder', dirHandle, true);
      treeContainer.appendChild(rootItem);
      
      // Load children
      const childrenContainer = document.createElement('ul');
      await loadDirectoryChildren(dirHandle, childrenContainer);
      rootItem.appendChild(childrenContainer);
      
      // Auto-expand root folder
      rootItem.classList.add('open');
      
      fileTree.appendChild(treeContainer);
      
      // Update breadcrumb normally
      updateBreadcrumb(dirHandle.name);
    }

    // Removed event delegation setup since we're using direct onclick handlers

  } catch (error) {
    showNotification('Failed to load file tree', 'error');
  }
}

// Setup event listeners for the tree after it's built
function setupTreeEventListeners() {
  // Add click handlers for folders
  document.querySelectorAll('.tree li.folder').forEach(li => {
    li.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleFolder(this);
    });
  });
  
  // Add click handlers for files
  document.querySelectorAll('.tree li.file').forEach(li => {
    li.addEventListener('click', function(e) {
      e.stopPropagation();
      selectFile(this, this._fileHandle);
    });
  });
}

// Load directory children recursively
async function loadDirectoryChildren(dirHandle, container) {
  try {
    const entries = [];
    for await (const [name, handle] of dirHandle.entries()) {
      entries.push({ name, handle });
    }

    // Sort: folders first, then files, both alphabetically
    entries.sort((a, b) => {
      const aIsDir = a.handle.kind === 'directory';
      const bIsDir = b.handle.kind === 'directory';
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const item = createTreeItem(entry.name, entry.handle.kind, entry.handle, false);
      container.appendChild(item);

      if (entry.handle.kind === 'directory') {
        const childrenContainer = document.createElement('ul');
        await loadDirectoryChildren(entry.handle, childrenContainer);
        item.appendChild(childrenContainer);
      }
    }
  } catch (error) {
    console.error('Error loading directory children:', error);
  }
}

// Create tree item element
function createTreeItem(name, type, handle, isRoot = false) {
  const item = document.createElement('li');
  // Fix class name - use 'folder' instead of 'directory' for consistency
  item.className = type === 'directory' ? 'folder' : type;

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = name;

  // Add file extension as data attribute for styling
  if (type === 'file') {
    const ext = name.split('.').pop().toLowerCase();
    item.setAttribute('data-ext', ext);
  }

  item.appendChild(label);

  // Only root folder gets expanded by default
  if (type === 'directory' && isRoot) {
    item.classList.add('open');
  }

  // Store handle for files (used by event delegation)
  if (type === 'file') {
    item._fileHandle = handle;
  }

  return item;
}

// Toggle folder expansion
function toggleFolder(folderItem) {
  folderItem.classList.toggle('open');
}

// Select and load file
async function selectFile(fileItem, fileHandle) {
  const sidebar = document.querySelector('.sidebar');

  // Remove previous selection
  if (selectedFileItem) {
    selectedFileItem.classList.remove('selected');
  }

  // Add selection to current file
  fileItem.classList.add('selected');
  selectedFileItem = fileItem;

  // Load file content
  try {
    const file = await fileHandle.getFile();
    const content = await file.text();

    // Update global file handle
    window.fileHandle = fileHandle;

    // Load XML content
    loadXmlFromText(content);

    // Update breadcrumb with file name - reset to folder + file instead of concatenating
    const folderName = elements.breadcrumb ? elements.breadcrumb.textContent.split('\\')[0] : 'No folder';
    updateBreadcrumb(`${folderName}\\${file.name}`);

  } catch (error) {
    console.error('Error loading file:', error);
    showNotification('Failed to load file: ' + error.message, 'error');
  }
}