// Campaign Counter Page JavaScript

// Initialize Supabase client as global variable
window.supabaseClient = null;

function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    try {
      // Supabase credentials
      const SUPABASE_URL = 'https://neuyjcotcmjnndjyzbcq.supabase.co';
      const SUPABASE_ANON_KEY = 'sb_publishable_BGon7fPsvXNe59meFE9F4Q_SbjCa-Dp';
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase client initialized');
      return window.supabaseClient;
    } catch (e) {
      console.error('Failed to initialize Supabase:', e);
      return null;
    }
  } else {
    console.log('Supabase library not loaded yet, will retry');
    return null;
  }
}

// Initialize with retry
function initSupabaseWithRetry(attempts = 10) {
  window.supabaseClient = initSupabase();
  if (!window.supabaseClient && attempts > 0) {
    setTimeout(() => initSupabaseWithRetry(attempts - 1), 500);
  }
}

// Initialize immediately
initSupabaseWithRetry();

// Initialize variables only if not already declared
if (typeof counters === 'undefined') {
  var counters = {};
}

if (typeof currentTab === 'undefined') {
  // Try to get saved tab from localStorage, otherwise default to campaign1
  var currentTab = localStorage.getItem('campaign_counter_active_tab') || 'campaign1';
}
if (typeof currentEditCounter === 'undefined') {
  var currentEditCounter = null;
}
if (typeof currentEditTab === 'undefined') {
  var currentEditTab = null;
}
if (typeof usedCampaignIds === 'undefined') {
  var usedCampaignIds = new Set(); // Store campaign IDs that exist in folders
}

// Initialize immediately or when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCampaignCounter);
} else {
  // DOM is already loaded
  initializeCampaignCounter();
}

// Also initialize when called from SPA
window.addEventListener('load', function() {
  setTimeout(initializeCampaignCounter, 200);
});

function initializeCampaignCounter() {
  // Wait for DOM to be ready
  setTimeout(() => {
    // Initialize Supabase (only if not already initialized)
    if (!window.supabaseClient) {
      initSupabase();
    }
    
    // Clear any existing event listeners by removing and re-adding elements
    const oldTabButtons = document.querySelectorAll('.tab-btn');
    oldTabButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Initialize event listeners with null checks
    const editModal = document.getElementById('edit-modal');
    if (editModal) {
      editModal.addEventListener('click', function(e) {
        if (e.target === this) closeEditModal();
      });
    }

    const tabNameModal = document.getElementById('tab-name-modal');
    if (tabNameModal) {
      tabNameModal.addEventListener('click', function(e) {
        if (e.target === this) closeTabNameModal();
      });
    }

    // Initialize tabs
    initializeTabs();
    
    // Activate the saved tab after a short delay
    setTimeout(() => {
      if (currentTab && currentTab !== 'campaign1') {
        console.log('Activating saved tab:', currentTab);
        switchTab(currentTab);
      }
    }, 200);
    
    // Load initial data
    loadCounters();
    // Load saved folders from localStorage
    loadFoldersFromStorage();
  }, 100); // 100ms delay to ensure DOM is ready
}

// Tab functionality
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  console.log('initializeTabs called - Found tab buttons:', tabButtons.length);
  console.log('Tab buttons:', tabButtons);
  
  tabButtons.forEach((btn, index) => {
    console.log(`Adding event listeners to button ${index}:`, btn.dataset.tab);
    btn.addEventListener('click', function() {
      console.log('Tab button clicked:', this.dataset.tab);
      const tabName = this.dataset.tab;
      switchTab(tabName);
    });
    
    // Add double-click to edit tab name
    btn.addEventListener('dblclick', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const tabName = this.dataset.tab;
      console.log('Double-clicked tab:', tabName);
      editTabName(tabName);
    });
  });
  
  // Retry if no buttons found (SPA might still be loading)
  if (tabButtons.length === 0) {
    console.log('No tab buttons found, retrying in 500ms...');
    setTimeout(initializeTabs, 500);
  }
}

function switchTab(tabName) {
  console.log('switchTab called with:', tabName);
  
  // Hide all tabs
  const allPanes = document.querySelectorAll('.tab-pane');
  console.log('Found tab panes:', allPanes.length);
  allPanes.forEach(pane => {
    pane.classList.remove('active');
  });
  
  // Remove active class from all buttons
  const allBtns = document.querySelectorAll('.tab-btn');
  console.log('Found all tab buttons:', allBtns.length);
  allBtns.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  const selectedPane = document.getElementById(`${tabName}-tab`);
  console.log('Selected pane:', selectedPane);
  if (selectedPane) {
    selectedPane.classList.add('active');
    console.log('Added active class to pane:', tabName);
  }
  
  // Add active class to clicked button
  const activeBtns = document.querySelectorAll(`[data-tab="${tabName}"]`);
  console.log('Found buttons for tab:', activeBtns.length);
  activeBtns.forEach(btn => {
    btn.classList.add('active');
  });
  
  currentTab = tabName;
  localStorage.setItem('campaign_counter_active_tab', tabName);
  console.log('Current tab set to:', currentTab);
}

// Counter functions
async function addCounter(type) {
  console.log('addCounter called with type:', type);
  console.log('counters object:', counters);
  console.log('counters[type] before:', counters[type]);
  console.log('window.addCounter exists:', typeof window.addCounter);
  
  try {
    const counter = counters[type] || { value: 0, history: [] };
    console.log('counter object before increment:', counter);
    counter.value++;
    console.log('counter object after increment:', counter);
    
    console.log('Current value:', counter.value - 1, 'New value:', counter.value);
    
    // Save back to counters object
    counters[type] = counter;
    console.log('Saved to counters object');
    
    // Update display
    updateCounterDisplay(type, counter.value);
    
    // Add to history
    const historyEntry = {
      action: 'generated',
      value: counter.value,
      created_at: new Date().toISOString()
    };
    counter.history.unshift(historyEntry);
    
    // Update history display
    updateHistoryDisplay(type);
    
    // Save to storage
    counters[type] = counter;
    console.log('About to save to localStorage');
    saveToLocalStorage(type, counter);
    console.log('Saved to localStorage');
    
    // Save to Supabase
    if (window.supabaseClient) {
      saveCounterToSupabase(type, counter.value);
      saveHistoryToSupabase(type, 'generated', counter.value);
    }
    
    console.log('Counter incremented successfully');
    console.log('Final counters[type]:', counters[type]);
    updateProgressBar(type, counter.value);
    
  } catch (error) {
    console.error('Error adding counter:', error);
  }
}

async function decrementCounter(type) {
  try {
    const counter = counters[type] || { value: 0, history: [] };
    if (counter.value > 0) {
      counter.value--;
      
      // Update display
      updateCounterDisplay(type, counter.value);
      
      // Add to history
      const historyEntry = {
        action: 'reverted',
        value: counter.value,
        created_at: new Date().toISOString()
      };
      counter.history.unshift(historyEntry);
      
      // Update history display
      updateHistoryDisplay(type);
      
      // Save to storage
      counters[type] = counter;
      saveToLocalStorage(type, counter);
      
      // Save to Supabase
      if (window.supabaseClient) {
        saveCounterToSupabase(type, counter.value);
        saveHistoryToSupabase(type, 'reverted', counter.value);
      }
      
      // Update progress bar
      updateProgressBar(type, counter.value);
    }
  } catch (error) {
    console.error('Error decrementing counter:', error);
  }
}

function editCounter(type) {
  currentEditCounter = type;
  const counter = counters[type] || { value: 0 };
  
  // Remove any existing edit modals first
  const existingEditModals = document.querySelectorAll('[data-counter-edit-modal]');
  existingEditModals.forEach(m => {
    if (m.parentNode) m.parentNode.removeChild(m);
  });
  
  // Create modal dynamically
  const modal = document.createElement('div');
  modal.setAttribute('data-counter-edit-modal', 'true');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 30px; max-width: 450px; width: 90%; border: 1px solid #ddd;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0;">
        <h3 style="margin: 0; color: #333; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.13em;">Edit Campaign ID</h3>
        <button onclick="this.closest('[data-counter-edit-modal]').remove()" style="background: none; border: none; color: #999; cursor: pointer; font-size: 18px;">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #333;">Campaign ID for ${type}:</label>
        <input type="number" id="edit-counter-input" value="${counter.value}" min="1" 
               style="width: 100%; padding: 10px; border: 1px solid #ddd; font-size: 16px;">
        <small style="color: #999; font-size: 12px; margin-top: 5px; display: block;">Minimum value: 1</small>
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button onclick="this.closest('[data-counter-edit-modal]').remove()" 
                style="padding: 8px 16px; background: white; color: #666; border: 1px solid #ddd; cursor: pointer;">
          <i class="fa-solid fa-xmark"></i> Cancel
        </button>
        <button onclick="confirmEditCounterDynamic('${type}', this)" 
                style="padding: 8px 16px; background: #333; color: white; border: 1px solid #333; cursor: pointer;">
          <i class="fa-solid fa-check"></i> Update
        </button>
      </div>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(modal);
  
  // Focus input
  const input = modal.querySelector('#edit-counter-input');
  input.focus();
  input.select();
}

function confirmEditCounterDynamic(type, button) {
  const modal = button.closest('[data-counter-edit-modal]');
  const input = modal.querySelector('#edit-counter-input');
  
  if (modal && input) {
    const newValue = parseInt(input.value);
    if (newValue && newValue > 0) {
      // Update counter
      counters[type] = counters[type] || { value: 0, history: [] };
      counters[type].value = newValue;
      
      // Add to history
      const historyEntry = {
        action: 'edited',
        value: newValue,
        created_at: new Date().toISOString()
      };
      counters[type].history.unshift(historyEntry);
      
      // Update display
      updateCounterDisplay(type, newValue);
      updateHistoryDisplay(type);
      updateProgressBar(type, newValue);
      
      // Save to localStorage
      saveToLocalStorage(type, counters[type]);
      
      // Save to Supabase
      if (window.supabaseClient) {
        saveCounterToSupabase(type, newValue);
        saveHistoryToSupabase(type, 'edited', newValue);
      }
      
      // Remove modal
      modal.remove();
    }
  }
}


function editTabName(type) {
  currentEditTab = type;
  const tabBtn = document.querySelector(`[data-tab="${type}"] .tab-name`);
  
  if (!tabBtn) return;
  
  // Remove any existing modals first to prevent duplicates
  const existingModals = document.querySelectorAll('[data-edit-modal]');
  existingModals.forEach(m => {
    if (m.parentNode) m.parentNode.removeChild(m);
  });
  
  // Create simple modal
  const modal = document.createElement('div');
  modal.setAttribute('data-edit-modal', 'true');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 30px; max-width: 400px; width: 90%; border: 1px solid #ddd;">
      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.13em;">Edit Tab Name</h3>
      <input type="text" id="quick-edit-input" value="${tabBtn.textContent}" 
             style="width: 100%; padding: 10px; border: 1px solid #ddd; font-size: 16px;">
      <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
        <button id="quick-cancel" style="padding: 8px 16px; background: white; color: #666; border: 1px solid #ddd; cursor: pointer;">Cancel</button>
        <button id="quick-save" style="padding: 8px 16px; background: #333; color: white; border: 1px solid #333; cursor: pointer;">Save</button>
      </div>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(modal);
  
  // Focus input
  const input = modal.querySelector('#quick-edit-input');
  input.focus();
  input.select();
  
  // Handle save
  modal.querySelector('#quick-save').onclick = function() {
    const newName = input.value.trim();
    if (newName) {
      // Update ALL tab names (in all 10 tab panes)
      const allTabBtns = document.querySelectorAll(`[data-tab="${type}"] .tab-name`);
      allTabBtns.forEach(btn => {
        btn.textContent = newName;
      });
      
      // Update ALL tab button titles
      const allTabButtons = document.querySelectorAll(`[data-tab="${type}"]`);
      allTabButtons.forEach(btn => {
        btn.title = `${newName} - Double click to edit`;
      });
      
      // Update counter title
      const counterTitle = document.querySelector(`#${type}-tab h2`);
      if (counterTitle) {
        const editIcon = counterTitle.querySelector('.edit-icon');
        counterTitle.textContent = `${newName} Counter`;
        if (editIcon) {
          counterTitle.appendChild(editIcon);
        }
      }
      
      // Save to localStorage (fallback)
      localStorage.setItem(`tab_name_${type}`, newName);
      
      // Save to Supabase if available
      if (window.supabaseClient) {
        saveTabNameToSupabase(type, newName);
      }
    }
    
    // Remove modal
    document.body.removeChild(modal);
  };
  
  // Handle cancel
  modal.querySelector('#quick-cancel').onclick = function() {
    document.body.removeChild(modal);
  };
  
  // Close on backdrop click
  modal.onclick = function(e) {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
  
  // Close on Escape
  const handleEscape = function(e) {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

function updateCounterDisplay(type, value) {
  console.log('updateCounterDisplay called for:', type, 'value:', value);
  const span = document.querySelector(`#${type}-number`);
  if (span) {
    span.textContent = value.toString().padStart(4, '0');
    console.log('Updated span text to:', value.toString().padStart(4, '0'));
    // Check if this value is used in folders
    const valueStr = value.toString().padStart(4, '0');
    if (usedCampaignIds.has(valueStr)) {
      span.classList.add('used');
      console.log('Added used class to', type);
    } else {
      span.classList.remove('used');
    }
  } else {
    console.error('Could not find span for:', type, 'with selector:', `#${type}-number`);
  }
}

function updateAllCounterDisplays() {
  ['campaign1', 'campaign2', 'campaign3', 'campaign4', 'campaign5', 'campaign6', 'campaign7', 'campaign8', 'campaign9', 'campaign10'].forEach(type => {
    const counter = counters[type];
    if (counter) {
      updateCounterDisplay(type, counter.value);
    }
  });
}

function updateHistoryDisplay(type) {
  const historyList = document.getElementById(`${type}-history`);
  if (!historyList) return;
  
  const counter = counters[type] || { history: [] };
  const history = counter.history || [];
  
  // Clear existing history
  historyList.innerHTML = '';
  
  // Add history items
  history.slice(0, 10).forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <i class="fa-solid fa-${entry.action === 'generated' ? 'plus-circle' : entry.action === 'reverted' ? 'rotate-left' : 'edit'}"></i>
      <div>
        <strong>${String(entry.value).padStart(4, '0')}</strong>
        <time>${formatTime(entry.created_at)}</time>
      </div>
    `;
    historyList.appendChild(item);
  });
}

function updateProgressBar(type, value) {
  const progressBar = document.getElementById(`${type}-progress`);
  if (progressBar) {
    const percentage = Math.min((value / 100) * 100, 100);
    progressBar.style.width = `${percentage}%`;
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Storage functions
function saveToLocalStorage(type, data) {
  localStorage.setItem(`counter_${type}`, JSON.stringify(data));
  // Update cache count display
  updateCacheCount(type);
}

function updateCacheCount(type) {
  // Count only actual campaign data items in localStorage
  let count = 0;
  
  // Count the main counter data
  const counterData = localStorage.getItem(`counter_${type}`);
  if (counterData) {
    const counter = JSON.parse(counterData);
    // Count the counter value as 1 item
    count = 1;
    // Count history items
    if (counter.history && Array.isArray(counter.history)) {
      count += counter.history.length;
    }
  }
  
  // Update the cache display
  const cacheElement = document.getElementById(`${type}-cache`);
  if (cacheElement) {
    cacheElement.textContent = count;
  }
}

function loadFromLocalStorage(type) {
  const data = localStorage.getItem(`counter_${type}`);
  return data ? JSON.parse(data) : null;
}

function loadCounters() {
  ['campaign1', 'campaign2', 'campaign3', 'campaign4', 'campaign5', 'campaign6', 'campaign7', 'campaign8', 'campaign9', 'campaign10'].forEach(type => {
    const counter = loadFromLocalStorage(type) || { value: 0, history: [] };
    counters[type] = counter;
    updateCounterDisplay(type, counter.value);
    updateHistoryDisplay(type);
    updateCacheCount(type);
    updateProgressBar(type, counter.value);
  });
  
  // Always load localStorage names first (priority)
  ['campaign1', 'campaign2', 'campaign3', 'campaign4', 'campaign5', 'campaign6', 'campaign7', 'campaign8', 'campaign9', 'campaign10'].forEach(type => {
    const savedTabName = localStorage.getItem(`tab_name_${type}`);
    if (savedTabName) {
      updateTabName(type, savedTabName);
    } else {
      // Set default name if not saved
      const defaultName = 'Name ' + type.replace('campaign', '');
      updateTabName(type, defaultName);
    }
  });
  
  // Load from Supabase if available (only for counter values, not names)
  if (window.supabaseClient) {
    // First initialize rows, then load counters and history
    initializeCampaignRows().then(() => {
      loadCountersFromSupabase().then((data) => {
        // Load history after counters
        loadHistoryFromSupabase().then((historyData) => {
          console.log('Supabase counter values and history loaded');
        });
      });
    });
  }
}

function updateTabName(type, name) {
  // Update ALL tab names (in all 10 tab panes)
  const allTabBtns = document.querySelectorAll(`[data-tab="${type}"] .tab-name`);
  allTabBtns.forEach(btn => {
    btn.textContent = name;
  });
  
  // Update all campaign titles
  const allTitles = document.querySelectorAll(`#${type}-tab .campaign-title`);
  allTitles.forEach(title => {
    title.textContent = name + ' Counter';
  });
  
  // Update counter title
  const counterTitle = document.querySelector(`#${type}-tab h2`);
  if (counterTitle) {
    const editIcon = counterTitle.querySelector('.edit-icon');
    counterTitle.textContent = `${name} Counter`;
    if (editIcon) {
      counterTitle.appendChild(editIcon);
    }
  }
  
  // Update tab button titles
  const allTabBtnsFull = document.querySelectorAll(`[data-tab="${type}"]`);
  allTabBtnsFull.forEach(btn => {
    btn.setAttribute('title', `${name} - Double click to edit`);
  });
}

// Initialize campaign rows in Supabase if they don't exist
async function initializeCampaignRows() {
  if (!window.supabaseClient) return;
  
  const campaigns = ['campaign1', 'campaign2', 'campaign3', 'campaign4', 'campaign5', 'campaign6', 'campaign7', 'campaign8', 'campaign9', 'campaign10'];
  
  for (const campaignType of campaigns) {
    try {
      // Check if row exists
      const { data: existing } = await window.supabaseClient
        .from('campaign_counters')
        .select('id')
        .eq('campaign_type', campaignType)
        .single();
      
      if (!existing) {
        // Insert new row with default values
        const defaultNames = {
          'campaign1': 'Name 1', 'campaign2': 'Name 2', 'campaign3': 'Name 3', 'campaign4': 'Name 4',
          'campaign5': 'Name 5', 'campaign6': 'Name 6', 'campaign7': 'Name 7', 'campaign8': 'Name 8',
          'campaign9': 'Name 9', 'campaign10': 'Name 10'
        };
        
        await window.supabaseClient
          .from('campaign_counters')
          .insert({ 
            campaign_type: campaignType, 
            name: defaultNames[campaignType],
            value: 0
          });
        console.log(`Created row for ${campaignType}`);
      }
    } catch (e) {
      console.log(`Row check/insert for ${campaignType}:`, e.message);
    }
  }
}

// Save tab name to Supabase
async function saveTabNameToSupabase(campaignType, name) {
  if (!window.supabaseClient) {
    console.log('Supabase not available, using localStorage only');
    return;
  }
  
  try {
    // First ensure the row exists
    await initializeCampaignRows();
    
    // Then update the name
    const { data, error } = await window.supabaseClient
      .from('campaign_counters')
      .update({ 
        name: name,
        updated_at: new Date().toISOString()
      })
      .eq('campaign_type', campaignType)
      .select();
    
    if (error) {
      console.error('Error saving tab name to Supabase:', error);
    } else {
      console.log('Tab name saved to Supabase:', data);
    }
  } catch (e) {
    console.error('Failed to save tab name to Supabase:', e);
  }
}

// Load tab names from Supabase
async function loadTabNamesFromSupabase() {
  if (!window.supabaseClient) {
    console.log('Supabase not available, using localStorage only');
    return null;
  }
  
  try {
    // First ensure all rows exist
    await initializeCampaignRows();
    
    // Then load the data
    const { data, error } = await window.supabaseClient
      .from('campaign_counters')
      .select('campaign_type, name')
      .in('campaign_type', ['campaign1', 'campaign2', 'campaign3', 'campaign4', 'campaign5', 'campaign6', 'campaign7', 'campaign8', 'campaign9', 'campaign10']);
    
    if (error) {
      console.error('Error loading tab names from Supabase:', error);
      return null;
    }
    
    if (data) {
      data.forEach(item => {
        updateTabName(item.campaign_type, item.name);
        // Also save to localStorage as fallback
        localStorage.setItem(`tab_name_${item.campaign_type}`, item.name);
      });
    }
    
    return data;
  } catch (e) {
    console.error('Failed to load tab names from Supabase:', e);
    return null;
  }
}

// Save counter value to Supabase
async function saveCounterToSupabase(campaignType, value) {
  if (!window.supabaseClient) {
    console.log('Supabase not available, using localStorage only');
    return;
  }
  
  try {
    const { data, error } = await window.supabaseClient
      .from('campaign_counters')
      .update({ 
        value: value,
        updated_at: new Date().toISOString()
      })
      .eq('campaign_type', campaignType)
      .select();
    
    if (error) {
      console.error('Error saving counter to Supabase:', error);
    } else {
      console.log('Counter saved to Supabase:', data);
    }
  } catch (e) {
    console.error('Failed to save counter to Supabase:', e);
  }
}

// Save history entry to Supabase
async function saveHistoryToSupabase(campaignType, action, value) {
  if (!window.supabaseClient) {
    console.log('Supabase not available, using localStorage only');
    return;
  }
  
  try {
    const { data, error } = await window.supabaseClient
      .from('campaign_history')
      .insert({
        campaign_type: campaignType,
        action: action,
        value: value,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving history to Supabase:', error);
    } else {
      console.log('History saved to Supabase:', data);
    }
  } catch (e) {
    console.error('Failed to save history to Supabase:', e);
  }
}

// Load history from Supabase
async function loadHistoryFromSupabase() {
  if (!window.supabaseClient) {
    console.log('Supabase not available, using localStorage only');
    return null;
  }
  
  try {
    const { data, error } = await window.supabaseClient
      .from('campaign_history')
      .select('campaign_type, action, value, created_at')
      .in('campaign_type', ['campaign1', 'campaign2', 'campaign3', 'campaign4', 'campaign5', 'campaign6', 'campaign7', 'campaign8', 'campaign9', 'campaign10'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading history from Supabase:', error);
      return null;
    }
    
    if (data) {
      // Group history by campaign type
      const historyByCampaign = {};
      data.forEach(entry => {
        if (!historyByCampaign[entry.campaign_type]) {
          historyByCampaign[entry.campaign_type] = [];
        }
        historyByCampaign[entry.campaign_type].push(entry);
      });
      
      // Merge with localStorage history (localStorage takes priority)
      Object.keys(historyByCampaign).forEach(campaignType => {
        if (counters[campaignType]) {
          // Get existing history from localStorage
          const existingHistory = counters[campaignType].history || [];
          
          // Only add Supabase history if localStorage is empty
          if (existingHistory.length === 0) {
            counters[campaignType].history = historyByCampaign[campaignType];
            updateHistoryDisplay(campaignType);
          }
        }
      });
    }
    
    return data;
  } catch (e) {
    console.error('Failed to load history from Supabase:', e);
    return null;
  }
}

// Load counter values from Supabase
async function loadCountersFromSupabase() {
  if (!window.supabaseClient) {
    console.log('Supabase not available, using localStorage only');
    return null;
  }
  
  try {
    const { data, error } = await window.supabaseClient
      .from('campaign_counters')
      .select('campaign_type, value, name')
      .in('campaign_type', ['campaign1', 'campaign2', 'campaign3', 'campaign4', 'campaign5', 'campaign6', 'campaign7', 'campaign8', 'campaign9', 'campaign10']);
    
    if (error) {
      console.error('Error loading counters from Supabase:', error);
      return null;
    }
    
    if (data) {
      data.forEach(item => {
        // Update counter value
        counters[item.campaign_type] = { 
          value: item.value || 0, 
          history: counters[item.campaign_type]?.history || [] 
        };
        updateCounterDisplay(item.campaign_type, item.value || 0);
        updateProgressBar(item.campaign_type, item.value || 0);
        
        // Update tab name only if it's not a default name
        if (item.name && !item.name.startsWith('Name ')) {
          updateTabName(item.campaign_type, item.name);
          localStorage.setItem(`tab_name_${item.campaign_type}`, item.name);
        }
      });
    }
    
    return data;
  } catch (e) {
    console.error('Failed to load counters from Supabase:', e);
    return null;
  }
}


// Folder browser functions
function openDirectory() {
  console.log('Open directory clicked');
  
  // Check if File System Access API is available
  if ('showDirectoryPicker' in window) {
    showDirectoryPicker({
      mode: 'read'
    }).then(async dirHandle => {
      console.log('Directory selected:', dirHandle.name);
      
      // Get and display all subfolders
      const folderItems = document.querySelector('#folder-items');
      if (folderItems) {
        folderItems.innerHTML = '';
        
        // Add folder name header
        const header = document.createElement('div');
        header.className = 'folder-header';
        header.innerHTML = `
          <i class="fa-solid fa-folder-open"></i>
          <span>Selected folder: <strong>${dirHandle.name}</strong></span>
        `;
        folderItems.appendChild(header);
        
        // Create grid container for folders
        const folderGrid = document.createElement('div');
        folderGrid.className = 'folder-grid';
        
        // Collect all folders first
        const folders = [];
        
        for await (const [name, handle] of dirHandle.entries()) {
          // Only show directories
          if (handle.kind === 'directory') {
            console.log('Folder name:', name);
            
            // Extract campaign ID from folder name - Smart parsing
            let campaignId = '';
            let campaignName = '';
            let campaignManager = '';
            let blastDate = '';
            
            // Step 1: Find campaign ID (first 4-digit number, include range if present)
            // Handle both "9000-9200" and "9000 - 9200" formats
            const idMatch = name.match(/(\d{4})(?:\s*-\s*\d{4})?/);
            if (idMatch) {
              campaignId = idMatch[0]; // Include the full range if present
              // Normalize to remove spaces around dash
              campaignId = campaignId.replace(/\s*-\s*/, '-');
            }
            
            // Step 2: Find date (MM-DD format) - look after campaign ID
            // First find all MM-DD patterns in the name
            const allDateMatches = [...name.matchAll(/(\d{2}-\d{2})/g)];
            let actualDate = null;
            
            if (allDateMatches.length > 0) {
              // If we found dates, check which one is likely the real date
              // Real dates are usually at the end or have names before them
              for (let i = allDateMatches.length - 1; i >= 0; i--) {
                const match = allDateMatches[i];
                const index = match.index;
                
                // Check if there's text before this date that could be a name
                const beforeDate = name.substring(0, index).trim();
                const words = beforeDate.split(/\s+/);
                
                // If the last "word" before date is not just numbers, this is likely the real date
                if (words.length > 0 && !/^\d+$/.test(words[words.length - 1])) {
                  actualDate = match[1];
                  break;
                }
              }
              
              // If we didn't find a good candidate, use the last date
              if (!actualDate && allDateMatches.length > 0) {
                actualDate = allDateMatches[allDateMatches.length - 1][1];
              }
            }
            
            if (actualDate) {
              blastDate = actualDate;
            }
            
            // Step 3: Find manager (name before the date)
            if (actualDate) {
              const dateIndex = name.lastIndexOf(actualDate);
              const beforeDate = name.substring(0, dateIndex).trim();
              
              // Find the last word before the date that's not a number
              const wordsBeforeDate = beforeDate.split(/\s+/);
              for (let i = wordsBeforeDate.length - 1; i >= 0; i--) {
                const word = wordsBeforeDate[i];
                if (!/^\d+$/.test(word) && word !== '-' && word !== 'Copy') {
                  campaignManager = word;
                  break;
                }
              }
            }
            
            // Step 4: Campaign name is between campaign ID and manager
            if (campaignId && campaignManager) {
              const idIndex = name.indexOf(campaignId);
              const managerIndex = name.indexOf(campaignManager);
              
              if (idIndex !== -1 && managerIndex !== -1 && managerIndex > idIndex) {
                // Use the actual length of campaignId (handles ranges like "2111-2222")
                campaignName = name.substring(idIndex + campaignId.length, managerIndex).trim();
                
                // Remove any leading symbols or dashes
                campaignName = campaignName.replace(/^[-_\s|]+/, '');
              }
            }
            
            // Fallback if no campaign ID found
            if (!campaignId) {
              campaignId = 'NO-ID';
            }
            
            console.log('Extracted campaign ID:', campaignId);
            console.log('Extracted details:', { campaignName, campaignManager, blastDate });
            
            folders.push({
              name: name,
              campaignId: campaignId,
              campaignName: campaignName,
              campaignManager: campaignManager,
              blastDate: blastDate,
              numericId: parseInt(campaignId.split('-')[0]) || 0
            });
          }
        }
        
        // Group folders by campaign ID (handle ranges)
        const groupedFolders = {};
        const campaignIdToFolders = {}; // Maps each individual campaign ID to its folders
        
        folders.forEach(folder => {
          // Check if campaign ID has a range
          if (folder.campaignId.includes('-')) {
            const parts = folder.campaignId.split('-').map(id => id.trim());
            const startId = parseInt(parts[0]);
            const endId = parseInt(parts[parts.length - 1]);
            
            // Generate all campaign IDs in the range
            for (let id = startId; id <= endId; id++) {
              const idStr = id.toString().padStart(4, '0');
              if (!campaignIdToFolders[idStr]) {
                campaignIdToFolders[idStr] = [];
              }
              campaignIdToFolders[idStr].push(folder);
            }
          } else {
            // Single campaign ID
            if (!campaignIdToFolders[folder.campaignId]) {
              campaignIdToFolders[folder.campaignId] = [];
            }
            campaignIdToFolders[folder.campaignId].push(folder);
          }
        });
        
        // Sort campaign IDs numerically
        const sortedCampaignIds = Object.keys(campaignIdToFolders).sort((a, b) => parseInt(a) - parseInt(b));
        
        // Create folder items for each unique campaign ID
        sortedCampaignIds.forEach(campaignId => {
          const folderList = campaignIdToFolders[campaignId];
          const folderItem = document.createElement('div');
          folderItem.className = 'folder-item';
          
          // Add green background if multiple folders
          if (folderList.length > 1) {
            folderItem.classList.add('multiple-folders');
          }
          
          folderItem.innerHTML = `
            <span>${campaignId}</span>
          `;
          
          // Add click handler to show folder list
          folderItem.onclick = () => showFolderList(campaignId, folderList);
          folderItem.title = folderList.length > 1 
            ? `${folderList.length} folders for campaign ${campaignId}` 
            : folderList[0].name;
          
          folderGrid.appendChild(folderItem);
        });
        
        folderItems.appendChild(folderGrid);
        
        if (folderGrid.children.length === 0) {
          folderGrid.innerHTML = '<p class="no-folders">No subfolders found</p>';
        }
        
        // Save folders to localStorage
        localStorage.setItem('campaign_counter_folders', JSON.stringify(folders));
        localStorage.setItem('campaign_counter_selected_directory', dirHandle.name);
      }
    }).catch(err => {
      console.error('Directory selection cancelled or failed:', err);
    });
  } else {
    // Fallback for browsers that don't support File System Access API
    alert('Your browser does not support folder selection. Please use Chrome, Edge, or Opera for this feature.');
  }
}

function selectFolder(folderName) {
  console.log('Selected folder:', folderName);
}

function clearFolders() {
  console.log('Clear folders clicked');
  
  // Clear the folder display
  const folderItems = document.querySelector('#folder-items');
  if (folderItems) {
    folderItems.innerHTML = `
      <div class="folder-empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <h3>No folders selected</h3>
        <p>Click "Open Folder" to select a directory containing campaign folders</p>
        <p class="folder-hint">Folders should follow the format: 0001 Campaign Name Manager MM-DD</p>
      </div>
    `;
  }
  
  // Clear localStorage
  localStorage.removeItem('campaign_counter_folders');
  localStorage.removeItem('campaign_counter_selected_directory');
  
  console.log('Folders cleared from display and localStorage');
}

function loadFoldersFromStorage() {
  const savedFolders = localStorage.getItem('campaign_counter_folders');
  const savedDirectory = localStorage.getItem('campaign_counter_selected_directory');
  
  if (savedFolders && savedDirectory) {
    try {
      const folders = JSON.parse(savedFolders);
      console.log('Loading folders from storage:', folders.length, 'folders from', savedDirectory);
      
      // Extract campaign IDs from saved folders
      usedCampaignIds.clear();
      folders.forEach(folder => {
        if (folder.campaignId.includes('-')) {
          const parts = folder.campaignId.split('-').map(id => id.trim());
          const startId = parseInt(parts[0]);
          const endId = parseInt(parts[parts.length - 1]);
          
          for (let id = startId; id <= endId; id++) {
            const idStr = id.toString().padStart(4, '0');
            usedCampaignIds.add(idStr);
          }
        } else {
          usedCampaignIds.add(folder.campaignId);
        }
      });
      
      // Update counter displays
      updateAllCounterDisplays();
      
      // Display saved folders
      displayFolders(folders, savedDirectory);
    } catch (e) {
      console.error('Failed to load folders from storage:', e);
    }
  }
}

function displayFolders(folders, directoryName) {
  const folderItems = document.querySelector('#folder-items');
  if (!folderItems) return;
  
  folderItems.innerHTML = '';
  
  // Add folder name header
  const header = document.createElement('div');
  header.className = 'folder-header';
  header.innerHTML = `
    <i class="fa-solid fa-folder-open"></i>
    <span>Selected folder: <strong>${directoryName}</strong></span>
  `;
  folderItems.appendChild(header);
  
  // Clear and update used campaign IDs
  usedCampaignIds.clear();
  
  // Group folders by campaign ID (handle ranges)
  const campaignIdToFolders = {};
  
  folders.forEach(folder => {
    // Check if campaign ID has a range
    if (folder.campaignId.includes('-')) {
      const parts = folder.campaignId.split('-').map(id => id.trim());
      const startId = parseInt(parts[0]);
      const endId = parseInt(parts[parts.length - 1]);
      
      // Generate all campaign IDs in the range
      for (let id = startId; id <= endId; id++) {
        const idStr = id.toString().padStart(4, '0');
        if (!campaignIdToFolders[idStr]) {
          campaignIdToFolders[idStr] = [];
        }
        campaignIdToFolders[idStr].push(folder);
        // Add to used campaign IDs
        usedCampaignIds.add(idStr);
      }
    } else {
      // Single campaign ID
      if (!campaignIdToFolders[folder.campaignId]) {
        campaignIdToFolders[folder.campaignId] = [];
      }
      campaignIdToFolders[folder.campaignId].push(folder);
      // Add to used campaign IDs
      usedCampaignIds.add(folder.campaignId);
    }
  });
  
  // Update counter displays to show used IDs in red
  updateAllCounterDisplays();
  
  // Sort campaign IDs numerically
  const sortedCampaignIds = Object.keys(campaignIdToFolders).sort((a, b) => parseInt(a) - parseInt(b));
  
  // Create grid container for folders
  const folderGrid = document.createElement('div');
  folderGrid.className = 'folder-grid';
  
  // Create folder items for each unique campaign ID
  sortedCampaignIds.forEach(campaignId => {
    const folderList = campaignIdToFolders[campaignId];
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    
    // Add green background if multiple folders
    if (folderList.length > 1) {
      folderItem.classList.add('multiple-folders');
    }
    
    folderItem.innerHTML = `
      <span>${campaignId}</span>
    `;
    
    // Add click handler to show folder list
    folderItem.onclick = (e) => showFolderList(campaignId, folderList, e);
    folderItem.title = folderList.length > 1 
      ? `${folderList.length} folders for campaign ${campaignId}` 
      : folderList[0].name;
    
    folderGrid.appendChild(folderItem);
  });
  
  folderItems.appendChild(folderGrid);
}

function showFolderList(campaignId, folders, clickEvent) {
  console.log('Showing folders for campaign:', campaignId, folders);
  
  // Remove any existing folder list popup
  const existingPopup = document.querySelector('.folder-list-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create popup
  const popup = document.createElement('div');
  popup.className = 'folder-list-popup';
  
  // Build folder list HTML
  let folderListHTML = `<h3>Campaign ${campaignId} - ${folders.length} folder(s)</h3>`;
  folderListHTML += '<div class="folder-list-items">';
  
  // Sort folders by date (MM-DD format)
  const sortedFolders = folders.sort((a, b) => {
    if (!a.blastDate && !b.blastDate) return 0;
    if (!a.blastDate) return 1;
    if (!b.blastDate) return -1;
    
    // Parse MM-DD format
    const [aMonth, aDay] = a.blastDate.split('-').map(Number);
    const [bMonth, bDay] = b.blastDate.split('-').map(Number);
    
    // Compare by month first, then day
    if (aMonth !== bMonth) {
      return aMonth - bMonth;
    }
    return aDay - bDay;
  });
  
  sortedFolders.forEach(folder => {
    const displayName = `${folder.blastDate || 'No-Date'} ${folder.campaignName || 'No-Name'} ${folder.campaignManager || 'No-Manager'}`;
    folderListHTML += `
      <div class="folder-list-item" data-folder-name="${folder.name.replace(/'/g, "\\'")}">
        <div class="folder-item-info">
          <div class="folder-item-name">${displayName}</div>
        </div>
      </div>
    `;
  });
  
  folderListHTML += '</div>';
  popup.innerHTML = folderListHTML;
  
  // Position popup near the clicked element
  const clickedElement = clickEvent.currentTarget;
  const rect = clickedElement.getBoundingClientRect();
  popup.style.position = 'fixed';
  
  // Calculate position to avoid going off screen
  const popupWidth = 350; // Approximate width
  let left = rect.left;
  let top = rect.bottom + 5;
  
  // Adjust if popup would go off right edge
  if (left + popupWidth > window.innerWidth) {
    left = window.innerWidth - popupWidth - 10;
  }
  
  // Adjust if popup would go off bottom edge
  if (top + 300 > window.innerHeight) {
    top = rect.top - 5 - 300; // Show above instead
  }
  
  popup.style.left = Math.max(10, left) + 'px';
  popup.style.top = Math.max(10, top) + 'px';
  popup.style.zIndex = '1000';
  
  // Add to document
  document.body.appendChild(popup);
  
  // Add click handlers to folder items
  const folderItems = popup.querySelectorAll('.folder-list-item');
  folderItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      const folderName = this.getAttribute('data-folder-name');
      selectFolder(folderName);
      popup.remove();
    });
  });
  
  // Close popup when clicking outside or pressing Escape
  function closePopup(e) {
    if (!popup.contains(e.target) && e.target !== clickedElement) {
      popup.remove();
      document.removeEventListener('click', closePopup);
      document.removeEventListener('keydown', handleEscape);
    }
  }
  
  function handleEscape(e) {
    if (e.key === 'Escape') {
      popup.remove();
      document.removeEventListener('click', closePopup);
      document.removeEventListener('keydown', handleEscape);
    }
  }
  
  setTimeout(() => {
    document.addEventListener('click', closePopup);
    document.addEventListener('keydown', handleEscape);
  }, 100);
}

function selectFolderWithDate(campaignId, campaignName, campaignManager, date) {
  console.log('Selected folder with date:', { campaignId, campaignName, campaignManager, date });
}

function saveCounterName() {
  console.log('Save counter name clicked');
}

function saveTabName() {
  if (!currentEditTab) return;
  
  const input = document.getElementById('tab-modal-input');
  const tabBtn = document.querySelector(`[data-tab="${currentEditTab}"] .tab-name`);
  
  if (input && tabBtn && input.value.trim()) {
    const newName = input.value.trim();
    
    // Update tab name
    tabBtn.textContent = newName;
    
    // Update tab button title
    const tabButton = document.querySelector(`[data-tab="${currentEditTab}"]`);
    if (tabButton) {
      tabButton.title = `${newName} - Double click to edit`;
    }
    
    // Update counter title
    const counterTitle = document.querySelector(`#${currentEditTab}-tab h2`);
    if (counterTitle) {
      const editIcon = counterTitle.querySelector('.edit-icon');
      counterTitle.textContent = `${newName} Counter`;
      if (editIcon) {
        counterTitle.appendChild(editIcon);
      }
    }
    
    // Save to localStorage
    localStorage.setItem(`tab_name_${currentEditTab}`, newName);
  }
}


// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    // Close any dynamic modals
    const editModals = document.querySelectorAll('[data-edit-modal]');
    editModals.forEach(m => m.remove());
    
    const counterEditModals = document.querySelectorAll('[data-counter-edit-modal]');
    counterEditModals.forEach(m => m.remove());
  }
});

// Expose functions globally for onclick handlers
window.addCounter = addCounter;
window.decrementCounter = decrementCounter;
window.editCounter = editCounter;
window.confirmEditCounterDynamic = confirmEditCounterDynamic;
window.openDirectory = openDirectory;
window.selectFolder = selectFolder;
window.selectFolderWithDate = selectFolderWithDate;
window.saveCounterName = saveCounterName;
window.saveTabName = saveTabName;

// Also expose init function for SPA
window.initializeCampaignCounter = initializeCampaignCounter;

// SPA router expects initCampaign-counterPage
window['initCampaign-counterPage'] = initializeCampaignCounter;
