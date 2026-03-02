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
    clearAllTooltips(); // Clear tooltips when empty content is loaded
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
    clearAllTooltips(); // Clear tooltips on XML parse error
    initializeFields(); 
    if (elements.editor) elements.editor.setValue(''); 
    return;
  }
  
  // Clear all tooltips before loading new file
  clearAllTooltips();
  
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
        elements.campaignIdInput.title = TOOLTIP_MESSAGES.warning.past;
      }
      if (fieldContainer) {
        fieldContainer.classList.add('past-date-warning');
        const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
        if (tooltip) {
          tooltip.textContent = TOOLTIP_MESSAGES.warning.past;
          tooltip.style.opacity = '1'; // Ensure tooltip is visible
        }
      }
    } else if (formatValidation.isToday) {
      if (elements.campaignIdInput) {
        elements.campaignIdInput.title = TOOLTIP_MESSAGES.warning.today;
      }
      if (fieldContainer) {
        fieldContainer.classList.add('past-date-warning');
        fieldContainer.classList.add('today-warning'); // Add green class for today
        const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
        if (tooltip) {
          tooltip.textContent = TOOLTIP_MESSAGES.warning.today;
          tooltip.style.opacity = '1'; // Ensure tooltip is visible
        }
      }
    }
    
    // Campaign ID and Link validation removed
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
      icon.className = 'fa-solid fa-check';
      el.classList.add('show');
      const wrapper = el.closest('.input-wrapper');
      if (wrapper) wrapper.classList.add('checkmark-visible');
    } else {
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

/* Campaign ID vs Link Mismatch Validation */
function validateCampaignLinkMismatch(campaignId, link) {
  if (!campaignId || !link) {
    return { hasMismatch: false, expected: null, found: null };
  }
  
  // Extract 3-4 digit numbers from campaign ID (after underscore)
  const campaignMatch = campaignId.match(/_(\d{3,4})$/);
  if (!campaignMatch) {
    return { hasMismatch: false, expected: null, found: null };
  }
  
  const campaignDigits = campaignMatch[1];
  
  // Extract 3-4 digit numbers from link URL
  let linkDigits = null;
  try {
    const url = new URL(link);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastSegment = pathParts[pathParts.length - 1] || '';
    const linkMatch = lastSegment.match(/^(\d{3,4})/);
    if (linkMatch) {
      linkDigits = linkMatch[1];
    }
  } catch {
    // Fallback for malformed URLs
    const parts = link.split('/').filter(Boolean);
    const lastSegment = parts[parts.length - 1] || '';
    const linkMatch = lastSegment.match(/^(\d{3,4})/);
    if (linkMatch) {
      linkDigits = linkMatch[1];
    }
  }
  
  if (!linkDigits) {
    return { hasMismatch: false, expected: campaignDigits, found: null };
  }
  
  // Check for mismatch (prefer 4-digit match, fallback to 3-digit)
  const hasMismatch = campaignDigits !== linkDigits;
  
  return {
    hasMismatch,
    expected: campaignDigits,
    found: linkDigits
  };
}

/* Link Format Validation */
function validateLinkFormat(link) {
  if (!link || link.trim() === '') return { valid: false, error: '' };
  
  const trimmedLink = link.trim();
  const requiredPrefix = 'http://mail.hsbc.com.hk';
  const requiredSuffix = '.html';
  
  // Check if link starts with correct prefix
  if (!trimmedLink.startsWith(requiredPrefix)) {
    if (!trimmedLink.startsWith('http://')) {
      return { 
        valid: false, 
        error: 'Link harus dimulai dengan http://mail.hsbc.com.hk' 
      };
    } else if (trimmedLink.startsWith('http://mail.hsbc.com')) {
      return { 
        valid: false, 
        error: 'Link harus menggunakan domain lengkap: http://mail.hsbc.com.hk' 
      };
    } else {
      return { 
        valid: false, 
        error: 'Link harus dimulai dengan http://mail.hsbc.com.hk' 
      };
    }
  }
  
  // Check if link ends with .html
  if (!trimmedLink.endsWith(requiredSuffix)) {
    if (trimmedLink.includes('.html')) {
      return { 
        valid: false, 
        error: 'Link harus diakhiri dengan .html (pastikan tidak ada karakter setelah .html)' 
      };
    } else {
      return { 
        valid: false, 
        error: 'Link harus diakhiri dengan .html' 
      };
    }
  }
  
  // Check if link has content between prefix and suffix
  const middleContent = trimmedLink.slice(requiredPrefix.length, -requiredSuffix.length);
  if (middleContent.trim() === '') {
    return { 
      valid: false, 
      error: 'Link harus memiliki path setelah domain (contoh: http://mail.hsbc.com.hk/path/file.html)' 
    };
  }
  
  // Check if link has valid path structure
  if (!middleContent.startsWith('/')) {
    return { 
      valid: false, 
      error: 'Link harus memiliki path yang valid (contoh: http://mail.hsbc.com.hk/1450-campaign.html)' 
    };
  }
  
  return { valid: true };
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
    if (campaignIdField) {
      campaignIdField.classList.remove('validation-error', 'past-date-warning', 'mismatch-error', 'today-warning');
    }
    const linkField = document.querySelector('.field.link-field');
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

// Apply form field changes to XML before saving
async function applyFormChangesToXML() {
  console.log('=== applyFormChangesToXML START ===');
  
  if (!xmlDoc) {
    console.log('No xmlDoc, returning');
    return;
  }
  
  let hasChanges = false;
  let updateCount = 0;
  
  // Get current values from XML
  let currentCampaignId = xmlDoc.querySelector('AudienceModel')?.getAttribute('name') || '';
  const currentSubject = xmlDoc.querySelector('MessageContent')?.getAttribute('subject') || '';
  const currentLink = xmlDoc.querySelector('MessageBody')?.getAttribute('content') || '';
  
  console.log('Current XML values:', { currentCampaignId, currentSubject, currentLink });
  
  // Get input values
  const campaignIdValue = elements.campaignIdInput ? elements.campaignIdInput.value.trim() : '';
  const subjectValue = elements.subjectInput ? elements.subjectInput.value.trim() : '';
  const linkValue = elements.linkInput ? elements.linkInput.value.trim() : '';
  
  console.log('Input values:', { campaignIdValue, subjectValue, linkValue });
  
  // Check if Campaign ID has changes
  if (campaignIdValue && campaignIdValue !== currentCampaignId) {
    console.log('Campaign ID has changes, validating...');
    hasChanges = true;
    const hasSpace = /\s/.test(campaignIdValue);
    const formatValidation = validateCampaignIdFormat(campaignIdValue);
    
    console.log('Campaign ID validation:', { hasSpace, formatValidation });
    
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
        if (el.getAttribute('name') === currentCampaignId) {
          el.setAttribute('name', campaignIdValue);
        }
        if (el.getAttribute('message') === currentCampaignId) {
          el.setAttribute('message', campaignIdValue);
        }
      });
      
      // Update MessageContent elements
      xmlDoc.querySelectorAll('MessageContent').forEach(el => {
        if (el.getAttribute('name') === currentCampaignId) {
          el.setAttribute('name', campaignIdValue);
        }
      });
      
      // Update FilterValue elements
      xmlDoc.querySelectorAll('FilterValue').forEach(el => {
        if (el.getAttribute('value') === currentCampaignId) {
          el.setAttribute('value', campaignIdValue);
        }
      });
      
      currentCampaignId = campaignIdValue;
      updateCount++;
      console.log('Campaign ID updated successfully');
    } else {
      console.log('Campaign ID validation failed, not updating');
    }
  }
  
  // Check if Subject has changes
  if (subjectValue && subjectValue !== currentSubject) {
    console.log('Subject has changes, processing...');
    hasChanges = true;
    const result = normalizeKrhredTokens(subjectValue);
    const normalized = (result.text || '').trim();
    
    console.log('Subject normalization result:', result);
    
    if (!result.missingDetected && normalized !== '') {
      const messageContent = xmlDoc.querySelector('MessageContent');
      if (messageContent) {
        messageContent.setAttribute('subject', normalized);
        if (elements.subjectInput) elements.subjectInput.value = normalized;
        updateCount++;
        console.log('Subject updated successfully');
      }
    } else {
      console.log('Subject validation failed, not updating');
    }
  }
  
  // Check if Link has changes
  if (linkValue && linkValue !== currentLink) {
    console.log('Link has changes, validating...');
    hasChanges = true;
    
    // Validate link format
    const linkValidation = validateLinkFormat(linkValue);
    console.log('Link validation:', linkValidation);
    
    if (linkValidation.valid) {
      const urlPattern = /^(http:\/\/|https:\/\/).+/i;
      if (urlPattern.test(linkValue)) {
        let finalLink = linkValue;
        if (finalLink.startsWith('https://')) finalLink = 'http://' + finalLink.substring(8);
        
        const messageBody = xmlDoc.querySelector('MessageBody');
        if (messageBody) {
          messageBody.setAttribute('content', finalLink);
          if (elements.linkInput) elements.linkInput.value = finalLink;
          updateCount++;
          console.log('Link updated successfully');
        }
      }
    } else {
      console.log('Link validation failed, not updating');
    }
  }
  
  console.log('Update summary:', { hasChanges, updateCount });
  
  // Update editor if there were changes
  if (hasChanges && updateCount > 0) {
    console.log('Updating editor with changes...');
    updateEditor();
    saveState();
    initializeFields(); // Re-sync form fields with updated XML
    updateAllCharCounts();
    console.log('Editor updated successfully');
  } else {
    console.log('No changes to apply');
  }
  
  console.log('=== applyFormChangesToXML END ===');
}

/* Save / Load XML - Show modal first before saving */

// Actual save function called by modal
async function performSave() {
  // Use window.fileHandle instead of local fileHandle
  const currentFileHandle = window.fileHandle || fileHandle;
  
  if (!currentFileHandle) {
    console.log("No file opened");
    alert("Tidak ada file yang dibuka. Silakan buka file terlebih dahulu.");
    return;
  }
  
  if (!elements.editor || !elements.editor.getValue) {
    console.log("Editor not available");
    return;
  }
  
  if (!elements.editor.getValue().trim()) {
    console.log("Editor is empty, cannot save");
    return;
  }

  try {
    console.log('=== performSave START ===');
    console.log('File handle:', currentFileHandle);
    console.log('Editor available:', !!elements.editor);
    console.log('Editor content length:', elements.editor.getValue().length);
    
    // First apply any pending form field changes to XML
    console.log('Calling applyFormChangesToXML...');
    await applyFormChangesToXML();
    console.log('applyFormChangesToXML completed');
    
    console.log('Parsing XML...');
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(elements.editor.getValue(), "application/xml");
    const hasError = parsedDoc.getElementsByTagName('parsererror').length > 0;
    
    console.log('XML parsing result:', { hasError, parserErrorCount: parsedDoc.getElementsByTagName('parsererror').length });
    
    if (hasError) {
      throw new Error('Invalid XML format');
    }

    xmlDoc = parsedDoc;
    console.log('XML document updated');

    console.log('Creating writable file...');
    // Performance: Write file with timeout
    const writable = await currentFileHandle.createWritable();
    await writable.write(elements.editor.getValue());
    await writable.close();
    console.log('File written successfully');

    console.log('File saved successfully');

    // Set indicator to saved state
    setCampaignIndicatorState('saved');
  } catch (err) {
    console.error("Error saving file:", err);
    throw err; // Re-throw error to be handled by caller
  }
}

let currentCampaignId = '';
const TOOLTIP_MESSAGES = {
  validation: {
    space: 'Campaign ID tidak boleh mengandung spasi',
    date: 'Tanggal tidak valid (YYYYMMDD)',
    format: 'Format harus: YYYYMMDD_NAMA-CAMPAIGN_XXXX'
  },
  warning: {
    today: 'Campaign tanggal hari ini',
    past: 'reminder: tanggal sudah jatuh tempo',
    future: 'info: campaign masa depan'
  },
  mismatch: {
    campaign: 'Campaign ID dan Link tidak match',
    link: 'Campaign ID dan Link tidak match',
    details: (expected, found) => 'Campaign ID dan Link berbeda'
  }
};

// Tooltip cache for performance
const tooltipCache = {
  campaignId: {
    warning: null,
    validation: null
  },
  link: {}
};

// Initialize tooltip cache
function initializeTooltipCache() {
  tooltipCache.campaignId.warning = document.getElementById('campaignIdWarningTooltip');
  tooltipCache.campaignId.validation = document.getElementById('campaignIdValidationTooltip');
  
  // Debug: Check for duplicate tooltips
  const warningTooltips = document.querySelectorAll('.warning-tooltip');
  const validationTooltips = document.querySelectorAll('.validation-tooltip');
  const mismatchTooltips = document.querySelectorAll('.mismatch-tooltip');
  
  console.log('=== TOOLTIP DUPLICATE CHECK ===');
  console.log('Warning tooltips found:', warningTooltips.length);
  warningTooltips.forEach((t, i) => console.log(`  Warning ${i}:`, t.id, t.textContent));
  console.log('Validation tooltips found:', validationTooltips.length);
  validationTooltips.forEach((t, i) => console.log(`  Validation ${i}:`, t.id, t.textContent));
  
  // Debug logging
  console.log('Tooltip cache initialized:', {
    warning: tooltipCache.campaignId.warning,
    validation: tooltipCache.campaignId.validation
  });
}

// Optimized tooltip management
function showTooltip(type, field, message) {
  // ...
  const tooltip = tooltipCache[field][type];
  if (tooltip) {
    tooltip.textContent = message;
    tooltip.style.opacity = '1';
  }
}

function hideTooltip(type, field) {
  const tooltip = tooltipCache[field][type];
  if (tooltip) {
    tooltip.style.opacity = '0';
    tooltip.textContent = '';
  }
}

function hideAllTooltips(field) {
  Object.keys(tooltipCache[field]).forEach(type => {
    hideTooltip(type, field);
  });
}

function clearAllTooltips() {
  // Clear campaign ID tooltips
  if (tooltipCache.campaignId) {
    Object.keys(tooltipCache.campaignId).forEach(type => {
      hideTooltip(type, 'campaignId');
    });
  }
  
  // Clear link tooltips
  if (tooltipCache.link) {
    Object.keys(tooltipCache.link).forEach(type => {
      hideTooltip(type, 'link');
    });
  }
  
  // Remove visual validation states from form fields
  const campaignField = document.querySelector('.field.campaign-id-field');
  const linkField = document.querySelector('.field.link-field');
  
  if (campaignField) {
    campaignField.classList.remove('validation-error', 'past-date-warning', 'today-warning', 'mismatch-error');
  }
  
  if (linkField) {
    linkField.classList.remove('validation-error', 'mismatch-error');
  }
  
  // Clear input field titles and error states
  if (elements.campaignIdInput) {
    elements.campaignIdInput.classList.remove('error');
    elements.campaignIdInput.title = '';
  }
  
  if (elements.linkInput) {
    elements.linkInput.classList.remove('error');
    elements.linkInput.title = '';
  }
  
  console.log('All tooltips cleared');
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

    // Debug logging
    console.log('Input changed:', campaignId);
    console.log('Has space:', hasSpace);
    console.log('Is empty:', isEmpty);

    // Format validation
    const formatValidation = validateCampaignIdFormat(campaignId);
    console.log('Format validation result:', formatValidation);
    
    // Enhanced character count
    const cc = document.getElementById('campaignIdCharCount');
    
    if (cc) {
      const length = campaignId.length;
      cc.textContent = length;
    }
    
    if (hasSpace || isEmpty || (campaignId && !formatValidation.valid)) {
      console.log('Setting error state');
      elements.campaignIdInput.classList.add('error');
      // Show format error if applicable
      if (campaignId && !formatValidation.valid && formatValidation.error) {
        elements.campaignIdInput.title = formatValidation.error;
        
        // Add tooltip for validation error
        let fieldContainer = document.querySelector('.field.campaign-id-field');
        let tooltip = document.querySelector('.field.campaign-id-field .validation-tooltip');
        if (fieldContainer) {
          fieldContainer.classList.add('validation-error');
        }
        if (tooltip) {
          tooltip.textContent = formatValidation.error;
        }
        // Manage tooltip collision
        manageTooltipCollision(fieldContainer);
      } else if (hasSpace) {
        elements.campaignIdInput.title = TOOLTIP_MESSAGES.validation.space;
        
        fieldContainer = document.querySelector('.field.campaign-id-field');
        tooltip = document.querySelector('.field.campaign-id-field .validation-tooltip');
        if (fieldContainer) {
          fieldContainer.classList.add('validation-error');
        }
        if (tooltip) {
          tooltip.textContent = TOOLTIP_MESSAGES.validation.space;
        }
      }
    } else {
      console.log('Removing error state - input is valid');
      elements.campaignIdInput.classList.remove('error');
      elements.campaignIdInput.title = '';
      
      // Remove validation error tooltip
      let fieldContainer = document.querySelector('.field.campaign-id-field');
      if (fieldContainer) {
        fieldContainer.classList.remove('validation-error');
        fieldContainer.classList.remove('past-date-warning');
        fieldContainer.classList.remove('today-warning'); // Also remove today-warning
        fieldContainer.classList.remove('mismatch-error'); // Also remove mismatch
        
        // Clear ALL tooltip text
        const validationTooltip = fieldContainer.querySelector('.validation-tooltip');
        const warningTooltip = fieldContainer.querySelector('.warning-tooltip');
        
        if (validationTooltip) validationTooltip.textContent = '';
        if (warningTooltip) warningTooltip.textContent = '';
      }

      // Show warning if date is today, past date, OR future date
      if (campaignId && formatValidation.valid && (formatValidation.isToday || formatValidation.isPastDate || formatValidation.isFutureDate)) {
        console.log('Showing warning for date:', formatValidation.isToday ? 'today' : formatValidation.isPastDate ? 'past date' : 'future date');
        console.log('Field container classes before adding:', fieldContainer ? fieldContainer.className : 'null');
        
        // Build warning message
        let warningMessage;
        if (formatValidation.isToday) {
          warningMessage = TOOLTIP_MESSAGES.warning.today;
        } else if (formatValidation.isPastDate) {
          warningMessage = TOOLTIP_MESSAGES.warning.past;
        } else {
          warningMessage = TOOLTIP_MESSAGES.warning.future;
        }
        
        elements.campaignIdInput.title = warningMessage;
        
        // Update warning tooltip
        let tooltip = tooltipCache.campaignId.warning || document.querySelector('.field.campaign-id-field .warning-tooltip');
        let inputWrapper = document.querySelector('.input-wrapper.campaign-id-field');
        
        // Hide other tooltips first
        const validationTooltip = document.querySelector('.field.campaign-id-field .validation-tooltip');
        if (validationTooltip) {
          validationTooltip.style.opacity = '0';
        }
        
        console.log('Warning tooltip element:', tooltip);
        console.log('Warning tooltip text before:', tooltip ? tooltip.textContent : 'null');
        
        if (tooltip) {
          tooltip.textContent = warningMessage;
          tooltip.style.opacity = '1'; // Explicitly show
          console.log('Warning tooltip text after:', tooltip.textContent);
          
          // Set color based on date type
          if (formatValidation.isToday) {
            tooltip.style.background = '#22c55e'; // Green for today
          } else if (formatValidation.isFutureDate) {
            tooltip.style.background = '#eab308'; // Yellow for future
          } else {
            tooltip.style.background = '#eab308'; // Yellow for past
          }
        }
        
        // Add visual warning indicator
        if (fieldContainer) {
          fieldContainer.classList.add('past-date-warning');
          // Add specific class for today's date to make it green
          if (formatValidation.isToday) {
            fieldContainer.classList.add('today-warning');
          } else {
            fieldContainer.classList.remove('today-warning');
          }
          // Add specific class for future date
          if (formatValidation.isFutureDate) {
            fieldContainer.classList.add('future-date-warning');
          } else {
            fieldContainer.classList.remove('future-date-warning');
          }
          console.log('Field container classes after adding:', fieldContainer.className);
        }
        if (inputWrapper) {
          inputWrapper.classList.add('past-date-warning');
        }
        // Manage tooltip collision - this will handle mismatch if present
        console.log('Calling manageTooltipCollision with fieldContainer:', fieldContainer);
        manageTooltipCollision(fieldContainer);
        console.log('manageTooltipCollision completed');
      } else {
        console.log('Removing warning indicator');
        // Remove visual warning indicator if not today, past, or future date
        inputWrapper = document.querySelector('.input-wrapper.campaign-id-field');
        if (fieldContainer) {
          fieldContainer.classList.remove('past-date-warning');
          fieldContainer.classList.remove('today-warning'); // Also remove today-warning class
          fieldContainer.classList.remove('future-date-warning'); // Also remove future-date-warning class
        }
        if (inputWrapper) {
          inputWrapper.classList.remove('past-date-warning');
        }
        
        // Clear ALL tooltips
        const allTooltips = document.querySelectorAll('.field.campaign-id-field .validation-tooltip, .field.campaign-id-field .warning-tooltip');
        allTooltips.forEach(t => {
          t.textContent = '';
          t.style.opacity = '0';
        });
      }
      
      // Perform mismatch validation if both campaign ID and link have values
      const linkValue = elements.linkInput ? elements.linkInput.value.trim() : '';
      if (campaignId && linkValue) {
        console.log('Performing mismatch validation...');
        const mismatchResult = validateCampaignLinkMismatch(campaignId, linkValue);
        console.log('Mismatch result:', mismatchResult);
        
        const campaignFieldContainer = document.querySelector('.field.campaign-id-field');
        const linkFieldContainer = document.querySelector('.field.link-field');
        
        if (mismatchResult.hasMismatch) {
          console.log('MISMATCH DETECTED - showing mismatch tooltips');
          
          // Add mismatch error class to both fields
          if (campaignFieldContainer) {
            campaignFieldContainer.classList.add('mismatch-error');
            const mismatchTooltip = campaignFieldContainer.querySelector('.mismatch-tooltip');
            if (mismatchTooltip) {
              mismatchTooltip.textContent = TOOLTIP_MESSAGES.mismatch.details(mismatchResult.expected, mismatchResult.found);
              mismatchTooltip.style.opacity = '1';
              mismatchTooltip.style.background = '#eab308';
            }
          }
          
          if (linkFieldContainer) {
            linkFieldContainer.classList.add('mismatch-error');
            const mismatchTooltip = linkFieldContainer.querySelector('.mismatch-tooltip');
            if (mismatchTooltip) {
              mismatchTooltip.textContent = TOOLTIP_MESSAGES.mismatch.details(mismatchResult.expected, mismatchResult.found);
              mismatchTooltip.style.opacity = '1';
              mismatchTooltip.style.background = '#eab308';
            }
          }
        } else {
          console.log('NO MISMATCH - clearing mismatch tooltips');
          
          // Remove mismatch error class and tooltips
          if (campaignFieldContainer) {
            campaignFieldContainer.classList.remove('mismatch-error');
            const mismatchTooltip = campaignFieldContainer.querySelector('.mismatch-tooltip');
            if (mismatchTooltip) {
              mismatchTooltip.style.opacity = '0';
            }
          }
          
          if (linkFieldContainer) {
            linkFieldContainer.classList.remove('mismatch-error');
            const mismatchTooltip = linkFieldContainer.querySelector('.mismatch-tooltip');
            if (mismatchTooltip) {
              mismatchTooltip.style.opacity = '0';
            }
          }
        }
        
        // Manage tooltip collision for campaign field
        if (campaignFieldContainer) {
          manageTooltipCollision(campaignFieldContainer);
        }
      }
    }
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
if (elements.subjectInput) elements.subjectInput.addEventListener('input', saveState);
if (elements.linkInput) elements.linkInput.addEventListener('input', saveState);
window.addEventListener('beforeunload', saveState);

/* Campaign ID Format Validation */
function validateCampaignIdFormat(campaignId) {
  if (!campaignId || campaignId.trim() === '') return { valid: false, error: '' };
  
  // Regex for YYYYMMDD_NAMA-CAMPAIGN_XXXX format
  // YYYYMMDD_ = 8 digits + underscore
  // NAMA-CAMPAIGN = letters, numbers, hyphens, underscores (at least 1 char)
  // _XXXX = underscore + 4 digits
  const formatRegex = /^\d{8}_[A-Za-z0-9\-_]+_\d{4}$/;
  
  // Debug regex
  console.log('Testing regex for:', campaignId);
  console.log('Regex test result:', formatRegex.test(campaignId));
  
  if (!formatRegex.test(campaignId)) {
    return { 
      valid: false, 
      error: 'Format harus: YYYYMMDD_NAMA-CAMPAIGN_XXXX' 
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
  
  // Check if date is before today (past date) or after today (future date)
  const campaignDate = new Date(year, month - 1, day);
  const today = new Date();
  
  // Normalize both dates to midnight to avoid timezone issues
  const campaignDateNormalized = new Date(campaignDate.getFullYear(), campaignDate.getMonth(), campaignDate.getDate());
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const isPastDate = campaignDateNormalized < todayNormalized;
  const isToday = campaignDateNormalized.getTime() === todayNormalized.getTime();
  const isFutureDate = campaignDateNormalized > todayNormalized;
  
  // Debug logging
  console.log('Campaign ID:', campaignId);
  console.log('Campaign Date:', campaignDateNormalized.toDateString());
  console.log('Today:', todayNormalized.toDateString());
  console.log('Is Past Date:', isPastDate);
  console.log('Is Today:', isToday);
  console.log('Is Future Date:', isFutureDate);
  
  // Past dates and future dates both show warnings
  if (isPastDate) {
    return { 
      valid: true,  
      error: '',
      isPastDate: true,  
      isToday: isToday,
      isFutureDate: false,
      campaignDate: campaignDate
    };
  }
  
  if (isFutureDate) {
    return { 
      valid: true,  
      error: '',
      isPastDate: false,  
      isToday: false,
      isFutureDate: true,
      campaignDate: campaignDate
    };
  }
  
  return { 
    valid: true, 
    error: '',
    isToday: isToday,
    campaignDate: campaignDate
  };
}

/* Live validation CampaignID → Link - Optimized */
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
    const linkValue = elements.linkInput.value.trim();
    const isEmpty = linkValue === '';
    
    // Clear previous states
    elements.linkInput.classList.remove('error');
    elements.linkInput.title = '';
    
    // Clear link field validation states
    const linkFieldContainer = document.querySelector('.field.link-field');
    if (linkFieldContainer) {
      linkFieldContainer.classList.remove('validation-error', 'mismatch-error');
      const validationTooltip = linkFieldContainer.querySelector('.validation-tooltip');
      const mismatchTooltip = linkFieldContainer.querySelector('.mismatch-tooltip');
      if (validationTooltip) {
        validationTooltip.textContent = '';
        validationTooltip.style.opacity = '0';
      }
      if (mismatchTooltip) {
        mismatchTooltip.textContent = '';
        mismatchTooltip.style.opacity = '0';
      }
    }
    
    // Validate link format if not empty
    if (!isEmpty) {
      const linkValidation = validateLinkFormat(linkValue);
      if (!linkValidation.valid) {
        elements.linkInput.classList.add('error');
        elements.linkInput.title = linkValidation.error;
        
        // Show validation tooltip
        if (linkFieldContainer) {
          linkFieldContainer.classList.add('validation-error');
          const validationTooltip = linkFieldContainer.querySelector('.validation-tooltip');
          if (validationTooltip) {
            validationTooltip.textContent = linkValidation.error;
            validationTooltip.style.opacity = '1';
          }
        }
      }
      
      // Perform mismatch validation if both campaign ID and link have values
      const campaignId = elements.campaignIdInput ? elements.campaignIdInput.value.trim() : '';
      if (campaignId && linkValue) {
        console.log('Performing mismatch validation from link input...');
        const mismatchResult = validateCampaignLinkMismatch(campaignId, linkValue);
        console.log('Mismatch result:', mismatchResult);
        
        const campaignFieldContainer = document.querySelector('.field.campaign-id-field');
        
        if (mismatchResult.hasMismatch) {
          console.log('MISMATCH DETECTED - showing mismatch tooltips');
          
          // Add mismatch error class to both fields
          if (campaignFieldContainer) {
            campaignFieldContainer.classList.add('mismatch-error');
            const mismatchTooltip = campaignFieldContainer.querySelector('.mismatch-tooltip');
            if (mismatchTooltip) {
              mismatchTooltip.textContent = TOOLTIP_MESSAGES.mismatch.details(mismatchResult.expected, mismatchResult.found);
              mismatchTooltip.style.opacity = '1';
              mismatchTooltip.style.background = '#eab308';
            }
          }
          
          if (linkFieldContainer) {
            linkFieldContainer.classList.add('mismatch-error');
            const mismatchTooltip = linkFieldContainer.querySelector('.mismatch-tooltip');
            if (mismatchTooltip) {
              mismatchTooltip.textContent = TOOLTIP_MESSAGES.mismatch.details(mismatchResult.expected, mismatchResult.found);
              mismatchTooltip.style.opacity = '1';
              mismatchTooltip.style.background = '#eab308';
            }
          }
          
          // Manage tooltip collision for campaign field
          if (campaignFieldContainer) {
            manageTooltipCollision(campaignFieldContainer);
          }
        } else {
          console.log('NO MISMATCH - clearing mismatch tooltips');
          
          // Remove mismatch error class and tooltips
          if (campaignFieldContainer) {
            campaignFieldContainer.classList.remove('mismatch-error');
            const mismatchTooltip = campaignFieldContainer.querySelector('.mismatch-tooltip');
            if (mismatchTooltip) {
              mismatchTooltip.style.opacity = '0';
            }
            manageTooltipCollision(campaignFieldContainer);
          }
          
          if (linkFieldContainer) {
            linkFieldContainer.classList.remove('mismatch-error');
            const mismatchTooltip = linkFieldContainer.querySelector('.mismatch-tooltip');
            if (mismatchTooltip) {
              mismatchTooltip.style.opacity = '0';
            }
          }
        }
      }
    } else {
      // Also clear mismatch from campaign field when link is empty
      const campaignFieldContainer = document.querySelector('.field.campaign-id-field');
      if (campaignFieldContainer) {
        campaignFieldContainer.classList.remove('mismatch-error');
        const mismatchTooltip = campaignFieldContainer.querySelector('.mismatch-tooltip');
        if (mismatchTooltip) {
          mismatchTooltip.style.opacity = '0';
        }
        manageTooltipCollision(campaignFieldContainer);
      }
    }
    
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
    
    // Always load form values even without xmlDoc
    if (elements.campaignIdInput) {
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
          if (elements.campaignIdInput) {
            elements.campaignIdInput.title = TOOLTIP_MESSAGES.warning.past;
          }
          if (fieldContainer) {
            fieldContainer.classList.add('past-date-warning');
            const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
            if (tooltip) {
              tooltip.textContent = TOOLTIP_MESSAGES.warning.past;
              tooltip.style.background = '#eab308'; // Yellow for past
              tooltip.style.opacity = '1';
            }
          }
        } else if (formatValidation.isFutureDate) {
          if (elements.campaignIdInput) {
            elements.campaignIdInput.title = TOOLTIP_MESSAGES.warning.future;
          }
          if (fieldContainer) {
            fieldContainer.classList.add('past-date-warning');
            fieldContainer.classList.add('future-date-warning');
            const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
            if (tooltip) {
              tooltip.textContent = TOOLTIP_MESSAGES.warning.future;
              tooltip.style.background = '#eab308'; // Yellow for future
              tooltip.style.opacity = '1';
            }
          }
        } else if (formatValidation.isToday) {
          if (elements.campaignIdInput) {
            elements.campaignIdInput.title = TOOLTIP_MESSAGES.warning.today;
          }
          if (fieldContainer) {
            fieldContainer.classList.add('past-date-warning');
            fieldContainer.classList.add('today-warning');
            const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
            if (tooltip) {
              tooltip.textContent = TOOLTIP_MESSAGES.warning.today;
              tooltip.style.background = '#22c55e'; // Green for today
              tooltip.style.opacity = '1';
            }
          }
        }
        
        // Validate Link format
        if (link) {
          const linkValidation = validateLinkFormat(link);
          const linkFieldContainer = document.querySelector('.field.link-field');
          
          if (!linkValidation.valid) {
            if (elements.linkInput) {
              elements.linkInput.classList.add('error');
              elements.linkInput.title = linkValidation.error;
            }
            if (linkFieldContainer) {
              linkFieldContainer.classList.add('validation-error');
              const validationTooltip = linkFieldContainer.querySelector('.validation-tooltip');
              if (validationTooltip) {
                validationTooltip.textContent = linkValidation.error;
                validationTooltip.style.opacity = '1';
              }
            }
          }
        }
        
        // Perform mismatch validation if both campaign ID and link have values
        if (campaignId && link) {
          console.log('Performing mismatch validation from loadState...');
          const mismatchResult = validateCampaignLinkMismatch(campaignId, link);
          console.log('Mismatch result:', mismatchResult);
          
          const campaignFieldContainer = document.querySelector('.field.campaign-id-field');
          const linkFieldContainer = document.querySelector('.field.link-field');
          
          if (mismatchResult.hasMismatch) {
            console.log('MISMATCH DETECTED - showing mismatch tooltips');
            
            // Add mismatch error class to both fields
            if (campaignFieldContainer) {
              campaignFieldContainer.classList.add('mismatch-error');
              const mismatchTooltip = campaignFieldContainer.querySelector('.mismatch-tooltip');
              if (mismatchTooltip) {
                mismatchTooltip.textContent = TOOLTIP_MESSAGES.mismatch.details(mismatchResult.expected, mismatchResult.found);
                mismatchTooltip.style.opacity = '1';
                mismatchTooltip.style.background = '#eab308';
              }
            }
            
            if (linkFieldContainer) {
              linkFieldContainer.classList.add('mismatch-error');
              const mismatchTooltip = linkFieldContainer.querySelector('.mismatch-tooltip');
              if (mismatchTooltip) {
                mismatchTooltip.textContent = TOOLTIP_MESSAGES.mismatch.details(mismatchResult.expected, mismatchResult.found);
                mismatchTooltip.style.opacity = '1';
                mismatchTooltip.style.background = '#eab308';
              }
            }
            
            // Manage tooltip collision for both fields
            manageTooltipCollision(campaignFieldContainer);
            if (linkFieldContainer) {
              manageTooltipCollision(linkFieldContainer);
            }
          }
        }
        
        // Manage tooltip collision after all validations
        manageTooltipCollision(fieldContainer);
      }
    }
  } catch (e) {
    console.log('Error loading state', 'error');
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

// === Tooltip Collision Management ===
function manageTooltipCollision(fieldContainer) {
  console.log('=== manageTooltipCollision START ===');
  if (!fieldContainer) {
    console.log('No fieldContainer, returning');
    return;
  }
  
  // Get all tooltips in the field
  const validationTooltip = fieldContainer.querySelector('.validation-tooltip');
  const warningTooltip = fieldContainer.querySelector('.warning-tooltip');
  const mismatchTooltip = fieldContainer.querySelector('.mismatch-tooltip');
  
  console.log('Tooltips found:', {
    validation: validationTooltip ? validationTooltip.textContent : 'null',
    warning: warningTooltip ? warningTooltip.textContent : 'null',
    mismatch: mismatchTooltip ? mismatchTooltip.textContent : 'null'
  });
  
  // Check which tooltips are visible
  const hasValidation = fieldContainer.classList.contains('validation-error');
  const hasWarning = fieldContainer.classList.contains('past-date-warning');
  const hasToday = fieldContainer.classList.contains('today-warning');
  const hasMismatch = fieldContainer.classList.contains('mismatch-error');
  
  console.log('Field classes:', fieldContainer.className);
  console.log('Has states:', { hasValidation, hasWarning, hasToday, hasMismatch });
  
  // Priority: 1. Validation Error (Merah) - Prioritas tertinggi
  if (hasValidation) {
    console.log('HAS VALIDATION - showing validation, hiding others');
    if (validationTooltip) validationTooltip.style.opacity = '1';
    if (warningTooltip) warningTooltip.style.opacity = '0';
    if (mismatchTooltip) mismatchTooltip.style.opacity = '0';
  } 
  // Priority: 2. Warning tanggal + Mismatch (Kuning) - Pesan gabungan
  else if ((hasWarning || hasToday) && hasMismatch) {
    console.log('HAS WARNING + MISMATCH - showing combined message');
    
    // Hide warning tooltip, show mismatch with combined message
    if (warningTooltip) warningTooltip.style.opacity = '0';
    
    if (mismatchTooltip) {
      mismatchTooltip.style.opacity = '1';
      mismatchTooltip.style.background = '#eab308';
      
      // Build combined message
      let combinedMessage = 'Campaign ID dan Link berbeda';
      
      // Add date warning if present
      if (hasToday) {
        combinedMessage += ' - Campaign tanggal hari ini';
      } else if (hasWarning) {
        // Get the warning message from tooltip content
        const warningText = warningTooltip ? warningTooltip.textContent : '';
        if (warningText && warningText.includes('jatuh tempo')) {
          combinedMessage += ' - reminder: tanggal sudah jatuh tempo';
        } else if (warningText && warningText.includes('masa depan')) {
          combinedMessage += ' - info: campaign masa depan';
        }
      }
      
      mismatchTooltip.textContent = combinedMessage;
    }
  }
  // Priority: 3. Warning tanggal saja (tanpa mismatch)
  else if (hasToday || hasWarning) {
    console.log('HAS WARNING ONLY - showing warning');
    if (warningTooltip) {
      warningTooltip.style.opacity = '1';
      
      if (hasToday) {
        warningTooltip.textContent = 'Campaign tanggal hari ini';
        warningTooltip.style.background = '#22c55e';
      } else if (hasWarning) {
        // Keep original warning message
        const warningText = warningTooltip.textContent || '';
        if (warningText.includes('jatuh tempo')) {
          warningTooltip.textContent = 'reminder: tanggal sudah jatuh tempo';
        } else if (warningText.includes('masa depan')) {
          warningTooltip.textContent = 'info: campaign masa depan';
        }
        warningTooltip.style.background = '#eab308';
      }
    }
    if (mismatchTooltip) mismatchTooltip.style.opacity = '0';
  }
  // Priority: 4. Mismatch saja (tanpa warning)
  else if (hasMismatch) {
    console.log('HAS MISMATCH ONLY - showing mismatch');
    if (mismatchTooltip) {
      mismatchTooltip.style.opacity = '1';
      mismatchTooltip.style.background = '#eab308';
      mismatchTooltip.textContent = 'Campaign ID dan Link berbeda';
    }
    if (warningTooltip) warningTooltip.style.opacity = '0';
  }
  // Clear all tooltips if no states
  else {
    console.log('NO STATES - hiding all tooltips');
    if (validationTooltip) validationTooltip.style.opacity = '0';
    if (warningTooltip) warningTooltip.style.opacity = '0';
    if (mismatchTooltip) mismatchTooltip.style.opacity = '0';
  }
}

// === Apply Update combo button ===
(function(){
  const applyUpdateBtn = document.getElementById('applyUpdateBtn');
  if (applyUpdateBtn) {
    applyUpdateBtn.addEventListener('click', async () => {
      // Check if XML is loaded before applying updates
      if (!xmlDoc) {
        console.log("No XML loaded");
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
      const currentSubject = xmlDoc.querySelector('MessageContent')?.getAttribute('subject') || '';
      const currentLink = xmlDoc.querySelector('MessageBody')?.getAttribute('content') || '';
      
      // Get input values
      const campaignIdValue = elements.campaignIdInput ? elements.campaignIdInput.value.trim() : '';
      const subjectValue = elements.subjectInput ? elements.subjectInput.value.trim() : '';
      const linkValue = elements.linkInput ? elements.linkInput.value.trim() : '';
      
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
            if (el.getAttribute('name') === currentCampaignId) {
              el.setAttribute('name', campaignIdValue);
            }
            if (el.getAttribute('message') === currentCampaignId) {
              el.setAttribute('message', campaignIdValue);
            }
          });
          
          // Update MessageContent elements
          xmlDoc.querySelectorAll('MessageContent').forEach(el => {
            if (el.getAttribute('name') === currentCampaignId) {
              el.setAttribute('name', campaignIdValue);
            }
          });
          
          // Update FilterValue elements
          xmlDoc.querySelectorAll('FilterValue').forEach(el => {
            if (el.getAttribute('value') === currentCampaignId) {
              el.setAttribute('value', campaignIdValue);
            }
          });
          
          currentCampaignId = campaignIdValue;
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
        
        // Validate link format
        const linkValidation = validateLinkFormat(linkValue);
        if (!linkValidation.valid) {
          allValid = false;
          if (elements.linkInput) {
            elements.linkInput.classList.add('error');
            elements.linkInput.title = linkValidation.error;
          }
          // Show validation tooltip
          const linkFieldContainer = document.querySelector('.field.link-field');
          if (linkFieldContainer) {
            linkFieldContainer.classList.add('validation-error');
            const validationTooltip = linkFieldContainer.querySelector('.validation-tooltip');
            if (validationTooltip) {
              validationTooltip.textContent = linkValidation.error;
              validationTooltip.style.opacity = '1';
            }
          }
        } else {
          const urlPattern = /^(http:\/\/|https:\/\/).+/i;
          if (urlPattern.test(linkValue)) {
            let finalLink = linkValue;
            if (finalLink.startsWith('https://')) finalLink = 'http://' + finalLink.substring(8);
            
            const messageBody = xmlDoc.querySelector('MessageBody');
            if (messageBody) {
              messageBody.setAttribute('content', finalLink);
              if (elements.linkInput) elements.linkInput.value = finalLink;
              setStatusIcon('linkCheckmark', 'ok');
              updateCount++;
            }
          }
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
          
          // Update button states after re-initializing fields
          updateSaveAndApplyButtons();
          
          // Show notification after XML is updated
          console.log(`Successfully applied ${updateCount} update(s)!`);
          setCampaignIndicatorState('applied');
          
          // Update character counts after applying changes
          updateAllCharCounts();
        } else {
          console.log('No valid updates to apply');
        }
      } else {
        console.log('No changes detected');
      }
      
      // Re-enable button and restore original content
      setTimeout(() => {
        applyUpdateBtn.disabled = false;
        applyUpdateBtn.innerHTML = originalContent;
      }, 500);
    });
  }
})();

// === Auto Save with Toast ===
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 2000; // 2 seconds after change

// Track campaign count indicator state
let campaignIndicatorState = 'default'; // 'default' | 'applied' | 'saved'

function setCampaignIndicatorState(state) {
  campaignIndicatorState = state;
  // Update indicator immediately if we have a campaign ID
  if (elements.campaignIdInput && elements.campaignIdInput.value) {
    updateCampaignCountIndicator(elements.campaignIdInput.value);
  }
}

// Auto save function with toast notification
async function autoSave() {
  if (!window.fileHandle) {
    console.log('No file handle, skipping auto save');
    return;
  }
  
  try {
    console.log('Auto saving...');
    await performSave();
    
    // Show success toast
    if (window.toastManager) {
      window.toastManager.success('File berhasil disimpan otomatis', {
        duration: 3000,
        position: 'bottom-right'
      });
    } else {
      // Fallback to alert if toast not available
      console.log('File berhasil disimpan otomatis');
    }
    
    setCampaignIndicatorState('saved');
  } catch (error) {
    console.error('Auto save failed:', error);
    
    // Show error toast
    if (window.toastManager) {
      window.toastManager.error('Gagal menyimpan file: ' + error.message, {
        duration: 5000,
        position: 'bottom-right'
      });
    } else {
      // Fallback to alert if toast not available
      alert('Gagal menyimpan file: ' + error.message);
    }
  }
}

// Trigger auto save with delay
function triggerAutoSave() {
  // Clear existing timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  // Set new timer
  autoSaveTimer = setTimeout(() => {
    autoSave();
  }, AUTO_SAVE_DELAY);
}

// === Button State Management ===
function updateSaveAndApplyButtons() {
  const saveBtn = document.getElementById('saveFileBtn');
  const applyBtn = document.getElementById('applyUpdateBtn');
  
  // Check if any field has validation errors
  const hasCampaignIdError = elements.campaignIdInput ? elements.campaignIdInput.classList.contains('error') : false;
  const hasSubjectError = elements.subjectInput ? elements.subjectInput.classList.contains('error') : false;
  const hasLinkError = elements.linkInput ? elements.linkInput.classList.contains('error') : false;
  
  // Check if fields are empty (optional - remove if you want to allow empty)
  const isCampaignIdEmpty = elements.campaignIdInput ? !elements.campaignIdInput.value.trim() : true;
  const isSubjectEmpty = elements.subjectInput ? !elements.subjectInput.value.trim() : true;
  const isLinkEmpty = elements.linkInput ? !elements.linkInput.value.trim() : true;
  
  // Disable buttons if there are errors OR if all fields are empty
  const hasErrors = hasCampaignIdError || hasSubjectError || hasLinkError;
  const allEmpty = isCampaignIdEmpty && isSubjectEmpty && isLinkEmpty;
  const shouldDisable = hasErrors || allEmpty;
  
  if (saveBtn) {
    saveBtn.disabled = shouldDisable;
    if (shouldDisable) {
      saveBtn.style.opacity = '0.5';
      saveBtn.style.cursor = 'not-allowed';
    } else {
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
    }
  }
  
  if (applyBtn) {
    applyBtn.disabled = shouldDisable;
    if (shouldDisable) {
      applyBtn.style.opacity = '0.5';
      applyBtn.style.cursor = 'not-allowed';
    } else {
      applyBtn.style.opacity = '1';
      applyBtn.style.cursor = 'pointer';
    }
  }
}

// Track changes on input - save state only
[elements.campaignIdInput, elements.subjectInput, elements.linkInput].forEach(inp => {
  if (inp) {
    inp.addEventListener('input', () => {
      // Performance: Batch DOM updates
      requestAnimationFrame(() => {
        if (elements.saveFileBtn) {
          elements.saveFileBtn.style.borderColor = '';
          elements.saveFileBtn.style.backgroundColor = '';
        }
        debouncedSaveState();
        updateSaveAndApplyButtons(); // Update button states
      });
    });
  }
});

// Track editor changes - save state only
if (elements.editor) {
  elements.editor.on('change', () => {
    debouncedSaveState();
  });
}

// Initialize on page load
window.addEventListener('load', () => {
  // Initialize CodeMirror first
  initializeCodeMirror();
  
  // Check if no folder is active BEFORE loading state
  if (typeof currentDirHandle === 'undefined' || currentDirHandle === null) {
    clearContentWhenNoFolder();
  }
  
  // Load state after folder check
  loadState();
  updateSaveAndApplyButtons();
  initializeFileTree();

  // Add save button event listener after DOM is loaded
  const saveFileBtn = document.getElementById('saveFileBtn');
  if (saveFileBtn) {
    saveFileBtn.addEventListener('click', async () => {
      console.log('=== SAVE BUTTON CLICKED ===');
      
      // Check if file is opened
      if (!window.fileHandle) {
        if (window.toastWarning) {
          window.toastWarning('Tidak ada file yang dibuka. Silakan buka file terlebih dahulu.', 'Warning');
        } else if (window.toastManager) {
          window.toastManager.warning('Tidak ada file yang dibuka. Silakan buka file terlebih dahulu.', {
            duration: 3000,
            position: 'bottom-right'
          });
        } else {
          alert("Tidak ada file yang dibuka. Silakan buka file terlebih dahulu.");
        }
        return;
      }
      
      // Show loading state on save button
      const originalContent = saveFileBtn.innerHTML;
      saveFileBtn.disabled = true;
      saveFileBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
      
      // Perform save immediately
      try {
        await performSave();
        
        // Show success toast
        if (window.toastSuccess) {
          window.toastSuccess('File berhasil disimpan!', 'Success');
        } else if (window.toastManager) {
          window.toastManager.success('File berhasil disimpan!', {
            duration: 3000,
            position: 'bottom-right'
          });
        } else {
          alert("File berhasil disimpan!");
        }
        
        setCampaignIndicatorState('saved');
      } catch (error) {
        console.error("Error saving file:", error);
        
        // Show error toast
        if (window.toastError) {
          window.toastError('Gagal menyimpan file: ' + error.message, 'Error');
        } else if (window.toastManager) {
          window.toastManager.error('Gagal menyimpan file: ' + error.message, {
            duration: 5000,
            position: 'bottom-right'
          });
        } else {
          alert("Gagal menyimpan file: " + error.message);
        }
      } finally {
        // Always reset button
        saveFileBtn.disabled = false;
        saveFileBtn.innerHTML = originalContent;
      }
    });
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
  
  // Clear localStorage to prevent reload of old values
  localStorage.removeItem('config_state');
  
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
      console.log(`Folder "${dirHandle.name}" opened successfully`);
    } else {
      console.log('File System Access API not supported in this browser');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.log('Failed to open folder');
    }
  }
}

// Refresh file tree
async function refreshFileTree() {
  if (currentDirHandle) {
    await loadFileTree(currentDirHandle);
    console.log('File tree refreshed');
  } else {
    console.log('No folder opened');
    // Clear content when refreshing with no folder
    clearContentWhenNoFolder();
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
      console.log(`Showing contents of folder "X"`);
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
    console.log('Failed to load file tree');
  }
} // Added closing brace here

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
    
    // Trigger validation after loading file
    setTimeout(() => {
      validateFormFields();
    }, 100);

  } catch (error) {
    console.error('Error loading file:', error);
    console.log('Failed to load file: ' + error.message);
  }
}

// Validate form fields and show tooltips
function validateFormFields() {
  // Get current values from inputs
  const campaignId = elements.campaignIdInput ? elements.campaignIdInput.value.trim() : '';
  const subject = elements.subjectInput ? elements.subjectInput.value.trim() : '';
  const link = elements.linkInput ? elements.linkInput.value.trim() : '';
  
  console.log('=== validateFormFields START ===');
  console.log('Validating:', { campaignId, subject, link });
  
  // Validate Campaign ID
  if (campaignId) {
    const formatValidation = validateCampaignIdFormat(campaignId);
    const fieldContainer = document.querySelector('.field.campaign-id-field');
    
    // Clear previous states
    if (elements.campaignIdInput) {
      elements.campaignIdInput.classList.remove('error');
      elements.campaignIdInput.title = '';
    }
    if (fieldContainer) {
      fieldContainer.classList.remove('validation-error', 'past-date-warning', 'today-warning', 'mismatch-error');
    }
    
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
          tooltip.style.opacity = '1';
        }
      }
    } else if (formatValidation.isPastDate) {
      if (elements.campaignIdInput) {
        elements.campaignIdInput.title = TOOLTIP_MESSAGES.warning.past;
      }
      if (fieldContainer) {
        fieldContainer.classList.add('past-date-warning');
        const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
        if (tooltip) {
          tooltip.textContent = TOOLTIP_MESSAGES.warning.past;
          tooltip.style.background = '#eab308';
          tooltip.style.opacity = '1';
        }
      }
    } else if (formatValidation.isFutureDate) {
      if (elements.campaignIdInput) {
        elements.campaignIdInput.title = TOOLTIP_MESSAGES.warning.future;
      }
      if (fieldContainer) {
        fieldContainer.classList.add('past-date-warning', 'future-date-warning');
        const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
        if (tooltip) {
          tooltip.textContent = TOOLTIP_MESSAGES.warning.future;
          tooltip.style.background = '#eab308';
          tooltip.style.opacity = '1';
        }
      }
    } else if (formatValidation.isToday) {
      if (elements.campaignIdInput) {
        elements.campaignIdInput.title = TOOLTIP_MESSAGES.warning.today;
      }
      if (fieldContainer) {
        fieldContainer.classList.add('past-date-warning', 'today-warning');
        const tooltip = document.querySelector('.field.campaign-id-field .warning-tooltip');
        if (tooltip) {
          tooltip.textContent = TOOLTIP_MESSAGES.warning.today;
          tooltip.style.background = '#22c55e';
          tooltip.style.opacity = '1';
        }
      }
    }
    
    // Manage tooltip collision for campaign field
    if (fieldContainer) {
      manageTooltipCollision(fieldContainer);
    }
  }
  
  // Validate Link
  if (link) {
    const linkValidation = validateLinkFormat(link);
    const linkFieldContainer = document.querySelector('.field.link-field');
    
    // Clear previous states
    if (elements.linkInput) {
      elements.linkInput.classList.remove('error');
      elements.linkInput.title = '';
    }
    if (linkFieldContainer) {
      linkFieldContainer.classList.remove('validation-error', 'mismatch-error');
    }
    
    if (!linkValidation.valid) {
      if (elements.linkInput) {
        elements.linkInput.classList.add('error');
        elements.linkInput.title = linkValidation.error;
      }
      if (linkFieldContainer) {
        linkFieldContainer.classList.add('validation-error');
        const validationTooltip = linkFieldContainer.querySelector('.validation-tooltip');
        if (validationTooltip) {
          validationTooltip.textContent = linkValidation.error;
          validationTooltip.style.opacity = '1';
        }
      }
    }
    
    // Manage tooltip collision for link field
    if (linkFieldContainer) {
      manageTooltipCollision(linkFieldContainer);
    }
  }
  
  // Validate mismatch if both have values
  if (campaignId && link) {
    const mismatchResult = validateCampaignLinkMismatch(campaignId, link);
    const campaignFieldContainer = document.querySelector('.field.campaign-id-field');
    const linkFieldContainer = document.querySelector('.field.link-field');
    
    if (mismatchResult.hasMismatch) {
      if (campaignFieldContainer) {
        campaignFieldContainer.classList.add('mismatch-error');
        const mismatchTooltip = campaignFieldContainer.querySelector('.mismatch-tooltip');
        if (mismatchTooltip) {
          mismatchTooltip.textContent = TOOLTIP_MESSAGES.mismatch.details(mismatchResult.expected, mismatchResult.found);
          mismatchTooltip.style.opacity = '1';
          mismatchTooltip.style.background = '#eab308';
        }
      }
      
      if (linkFieldContainer) {
        linkFieldContainer.classList.add('mismatch-error');
        const mismatchTooltip = linkFieldContainer.querySelector('.mismatch-tooltip');
        if (mismatchTooltip) {
          mismatchTooltip.textContent = TOOLTIP_MESSAGES.mismatch.details(mismatchResult.expected, mismatchResult.found);
          mismatchTooltip.style.opacity = '1';
          mismatchTooltip.style.background = '#eab308';
        }
      }
      
      // Manage tooltip collision for both fields
      if (campaignFieldContainer) manageTooltipCollision(campaignFieldContainer);
      if (linkFieldContainer) manageTooltipCollision(linkFieldContainer);
    }
  }
  
  console.log('=== validateFormFields END ===');
  
  // Update button states after validation
  updateSaveAndApplyButtons();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeTooltipCache(); // Initialize tooltip cache
  loadState();
  if (typeof decorateButtons === 'function') decorateButtons();
});