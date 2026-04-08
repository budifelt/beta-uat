// Campaign Counter Script with Supabase Integration

const supabaseClient = window.supabase.createClient('https://neuyjcotcmjnndjyzbcq.supabase.co', 'sb_publishable_BGon7fPsvXNe59meFE9F4Q_SbjCa-Dp');

const counters = {
  campaign1: { value: 1, color: 'primary', name: 'Name 1' },
  campaign2: { value: 1, color: 'success', name: 'Name 2' },
  campaign3: { value: 1, color: 'warning', name: 'Name 3' },
  campaign4: { value: 1, color: 'info', name: 'Name 4' }
};

let currentTab = 'campaign1';
let currentEditCounter = null;
let currentEditTab = null;

async function loadCounterFromSupabase(campaignType) {
  try {
    const { data, error } = await supabaseClient
      .from('campaign_counters')
      .select('value, name')
      .eq('campaign_type', campaignType)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? { value: data.value, name: data.name } : null;
  } catch (error) {
    console.error('Error loading counter:', error);
    return null;
  }
}

async function saveCounterToSupabase(campaignType, value) {
  try {
    const { error } = await supabaseClient
      .from('campaign_counters')
      .upsert({ campaign_type: campaignType, value: value, name: counters[campaignType].name, updated_at: new Date().toISOString() }, { onConflict: 'campaign_type' });
    if (error) throw error;
  } catch (error) {
    console.error('Error saving counter:', error);
  }
}

async function saveTabNameToSupabase(campaignType, name) {
  try {
    const { error } = await supabaseClient
      .from('campaign_counters')
      .upsert({ campaign_type: campaignType, name: name, value: counters[campaignType].value, updated_at: new Date().toISOString() }, { onConflict: 'campaign_type' });
    if (error) throw error;
  } catch (error) {
    console.error('Error saving tab name:', error);
  }
}

async function saveHistoryToSupabase(campaignType, action, value) {
  try {
    const { error } = await supabaseClient
      .from('campaign_history')
      .insert({ campaign_type: campaignType, action: action, value: value, created_at: new Date().toISOString() });
    if (error) throw error;
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

async function loadHistoryFromSupabase(campaignType) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data, error } = await supabaseClient
      .from('campaign_history')
      .select('*')
      .eq('campaign_type', campaignType)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    for (const type of Object.keys(counters)) {
      const savedData = await loadCounterFromSupabase(type);
      if (savedData) {
        if (savedData.value !== null) counters[type].value = savedData.value;
        if (savedData.name) counters[type].name = savedData.name;
      }
    }
  } catch (error) {
    console.error('Error loading from Supabase, using defaults:', error);
  }
  setupTabs();
  loadTabNames();
  Object.keys(counters).forEach(type => {
    updateCounterDisplay(type);
    updateHistoryDisplay(type);
  });
});

function loadTabNames() {
  Object.keys(counters).forEach(type => {
    document.querySelectorAll(`[data-tab="${type}"] .tab-name`).forEach(tabName => {
      tabName.textContent = counters[type].name;
    });
    document.querySelectorAll(`#${type}-tab .counter-container h2`).forEach(counterTitle => {
      counterTitle.innerHTML = `${counters[type].name} Counter
        <button class="edit-icon" onclick="editCounter('${type}')" title="Edit manually">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>`;
    });
    document.querySelectorAll(`[data-tab="${type}"]`).forEach(tabBtn => {
      tabBtn.title = `${counters[type].name} - Double click to edit`;
    });
  });
}

function openTabNameModal(type) {
  currentEditTab = type;
  const modal = document.getElementById('tab-name-modal');
  const input = document.getElementById('tab-name-input');
  input.value = counters[type].name;
  modal.style.display = 'flex';
  input.focus();
  input.select();
}

function closeTabNameModal() {
  document.getElementById('tab-name-modal').style.display = 'none';
  currentEditTab = null;
}

async function confirmTabName() {
  const input = document.getElementById('tab-name-input');
  const newName = input.value.trim();
  if (newName && currentEditTab) {
    counters[currentEditTab].name = newName;
    await saveTabNameToSupabase(currentEditTab, newName);
    document.querySelectorAll(`[data-tab="${currentEditTab}"] .tab-name`).forEach(tabName => {
      tabName.textContent = newName;
    });
    document.querySelectorAll(`#${currentEditTab}-tab .counter-container h2`).forEach(counterTitle => {
      counterTitle.innerHTML = `${newName} Counter
        <button class="edit-icon" onclick="editCounter('${currentEditTab}')" title="Edit manually">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>`;
    });
    document.querySelectorAll(`[data-tab="${currentEditTab}"]`).forEach(tabBtn => {
      tabBtn.title = `${newName} - Double click to edit`;
    });
    closeTabNameModal();
  }
}

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      switchTab(tabName);
      document.querySelectorAll('.counter-tabs').forEach(container => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
      });
    });
    btn.addEventListener('dblclick', function(e) {
      e.stopPropagation();
      openTabNameModal(this.dataset.tab);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  document.getElementById(`${tabName}-tab`).classList.add('active');
  currentTab = tabName;
}

async function updateCounterDisplay(type) {
  const counter = counters[type];
  document.getElementById(`${type}-number`).textContent = String(counter.value).padStart(4, '0');
  const progress = ((counter.value % 100) / 100) * 100;
  document.getElementById(`${type}-progress`).style.width = progress + '%';
  const updatedEl = document.getElementById(`${type}-updated`);
  if (updatedEl) {
    updatedEl.textContent = 'Last updated: ' + formatDateTime(new Date());
  }
  try {
    const history = await loadHistoryFromSupabase(type);
    const cacheEl = document.getElementById(`${type}-cache`);
    if (cacheEl) {
      cacheEl.textContent = history.length;
    }
  } catch (error) {
    console.error('Error loading history count:', error);
  }
}

async function addCounter(type) {
  try {
    counters[type].value++;
    await saveCounterToSupabase(type, counters[type].value);
    await updateCounterDisplay(type);
    await addToHistory(type, counters[type].value, 'generated');
    console.log(`New ${type} ID: ` + String(counters[type].value).padStart(4, '0'));
  } catch (error) {
    console.error('Error in addCounter:', error);
    counters[type].value--;
  }
}

async function decrementCounter(type) {
  if (counters[type].value > 1) {
    try {
      counters[type].value--;
      await saveCounterToSupabase(type, counters[type].value);
      await updateCounterDisplay(type);
      await addToHistory(type, counters[type].value, 'reverted');
      console.log(`${type} ID reverted to: ` + String(counters[type].value).padStart(4, '0'));
    } catch (error) {
      console.error('Error in decrementCounter:', error);
      counters[type].value++;
    }
  }
}

function editCounter(type) {
  if (!counters[type]) {
    console.error('Counter type not found:', type);
    return;
  }
  currentEditCounter = type;
  const modal = document.getElementById('edit-modal');
  const input = document.getElementById('modal-input');
  const title = document.getElementById('modal-title');
  input.value = counters[type].value;
  title.textContent = `Edit ${counters[type].name} ID`;
  modal.style.display = 'flex';
  input.focus();
  input.select();
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  currentEditCounter = null;
}

async function confirmEditCounter() {
  const input = document.getElementById('modal-input');
  const newValue = parseInt(input.value);
  if (newValue >= 1 && newValue <= 9999 && currentEditCounter && counters[currentEditCounter]) {
    try {
      counters[currentEditCounter].value = newValue;
      await saveCounterToSupabase(currentEditCounter, counters[currentEditCounter].value);
      await updateCounterDisplay(currentEditCounter);
      await addToHistory(currentEditCounter, counters[currentEditCounter].value, 'manual_edit');
      console.log(`${counters[currentEditCounter].name} ID updated to ` + String(counters[currentEditCounter].value).padStart(4, '0'));
      closeEditModal();
    } catch (error) {
      console.error('Error in confirmEditCounter:', error);
    }
  } else {
    alert('Please enter a valid number (1-9999)');
    input.focus();
  }
}

async function addToHistory(type, value, action) {
  await saveHistoryToSupabase(type, action, value);
  await updateHistoryDisplay(type);
}

async function updateHistoryDisplay(type) {
  const historyList = document.getElementById(`${type}-history`);
  if (!historyList) return;
  try {
    const history = await loadHistoryFromSupabase(type);
    historyList.innerHTML = history.slice(0, 10).map(entry => `
      <div class="history-item">
        <i class="fa-solid fa-${entry.action === 'generated' ? 'plus-circle' : entry.action === 'reverted' ? 'rotate-left' : 'edit'}"></i>
        <div>
          <strong>${String(entry.value).padStart(4, '0')}</strong>
          <time>${formatTime(entry.created_at)}</time>
        </div>
      </div>
    `).join('');
    const cacheEl = document.getElementById(`${type}-cache`);
    if (cacheEl) {
      cacheEl.textContent = history.length;
    }
  } catch (error) {
    console.error('Error updating history display:', error);
    historyList.innerHTML = '<p style="color: #666;">Unable to load history</p>';
  }
}

function formatDateTime(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatTime(timestamp) {
  return formatDateTime(timestamp);
}

async function loadMoreHistory(type) {
  const historyList = document.getElementById(`${type}-history`);
  const currentCount = historyList.children.length;
  const history = await loadHistoryFromSupabase(type);
  const moreItems = history.slice(currentCount, currentCount + 10);
  moreItems.forEach(entry => {
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
  if (currentCount + 10 >= history.length) {
    event.target.style.display = 'none';
  }
}

document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

document.getElementById('tab-name-modal').addEventListener('click', function(e) {
  if (e.target === this) closeTabNameModal();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeEditModal();
    closeTabNameModal();
  }
});

document.getElementById('modal-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') confirmEditCounter();
});

document.getElementById('tab-name-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') confirmTabName();
});

document.getElementById('modal-input').addEventListener('input', function(e) {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
});

// ===================================
// FOLDER BROWSER FUNCTIONALITY
// ===================================

// Folder storage key for localStorage
const FOLDER_STORAGE_KEY = 'campaign_folders';

// Initialize folder browser
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - initializing folder browser'); // Debug log
  loadFoldersFromStorage();
  
  // Setup folder input listener
  const folderInput = document.getElementById('folder-input');
  console.log('Folder input element:', folderInput); // Debug log
  if (folderInput) {
    folderInput.addEventListener('change', handleFolderSelection);
    console.log('Folder input listener attached'); // Debug log
  }
});

// Test function for folder selection
function testFolderSelection() {
  console.log('Test folder selection clicked!'); // Debug log
  const folderInput = document.getElementById('folder-input');
  console.log('Folder input element:', folderInput); // Debug log
  
  if (folderInput) {
    console.log('Triggering click on folder input'); // Debug log
    folderInput.click();
  } else {
    console.log('Folder input not found!'); // Debug log
  }
}

// Show folder input textarea
function showFolderInput() {
  const textarea = document.getElementById('folder-input-text');
  const addBtn = document.getElementById('add-folders-btn');
  
  if (textarea.style.display === 'none') {
    textarea.style.display = 'block';
    addBtn.style.display = 'flex';
    textarea.focus();
  } else {
    textarea.style.display = 'none';
    addBtn.style.display = 'none';
  }
}

// Open directory using File System Access API
async function openDirectory() {
  if (!window.showDirectoryPicker) {
    alert('Your browser does not support directory picker. Please use Chrome, Edge, or Opera.');
    return;
  }
  
  try {
    const dirHandle = await window.showDirectoryPicker();
    const folderNames = [];
    
    // Recursively get all folder names
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'directory') {
        folderNames.push(name);
        
        // Also get subdirectories if needed
        // await getSubfolders(handle, name, folderNames);
      }
    }
    
    if (folderNames.length === 0) {
      alert('No folders found in the selected directory.');
      return;
    }
    
    // Parse folder names
    const folders = folderNames.map(folderName => {
      const parsed = parseFolderName(folderName);
      return {
        original: folderName,
        parsed: parsed
      };
    }).filter(folder => folder.parsed); // Only keep successfully parsed folders
    
    if (folders.length === 0) {
      alert('No valid folder names found. Make sure folder names follow the format: CampaignID CampaignName CampaignManager MM-DD');
      return;
    }
    
    // Get existing folders
    const existingFolders = JSON.parse(localStorage.getItem(FOLDER_STORAGE_KEY) || '[]');
    
    // Merge with existing folders (avoid duplicates)
    const existingKeys = new Set(existingFolders.map(f => 
      `${f.parsed.campaignId}-${f.parsed.campaignName}-${f.parsed.campaignManager}-${f.parsed.date}`
    ));
    const newFolders = folders.filter(f => 
      !existingKeys.has(`${f.parsed.campaignId}-${f.parsed.campaignName}-${f.parsed.campaignManager}-${f.parsed.date}`)
    );
    
    const allFolders = [...existingFolders, ...newFolders];
    
    // Save and display
    saveFoldersToStorage(allFolders);
    displayFolders(allFolders);
    
    alert(`Found ${folderNames.length} folders. Added ${newFolders.length} new folders (${folderNames.length - newFolders.length} were duplicates).`);
    
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled
      console.log('Folder selection cancelled');
    } else {
      console.error('Error reading directory:', error);
      alert('Error reading directory: ' + error.message);
    }
  }
}

// Add folders from text input
function addFolders() {
  const textarea = document.getElementById('folder-input-text');
  const text = textarea.value.trim();
  
  if (!text) {
    alert('Please enter folder names');
    return;
  }
  
  // Split by lines and filter empty lines
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    alert('Please enter valid folder names');
    return;
  }
  
  // Parse each line as a folder
  const folders = lines.map(line => {
    const folderName = line.trim();
    const parsed = parseFolderName(folderName);
    return {
      original: folderName,
      parsed: parsed
    };
  }).filter(folder => folder.parsed); // Only keep successfully parsed folders
  
  if (folders.length === 0) {
    alert('No valid folder names found. Use format: CampaignID CampaignName CampaignManager MM-DD');
    return;
  }
  
  // Get existing folders
  const existingFolders = JSON.parse(localStorage.getItem(FOLDER_STORAGE_KEY) || '[]');
  
  // Merge with existing folders (avoid duplicates)
  const existingKeys = new Set(existingFolders.map(f => `${f.parsed.campaignId}-${f.parsed.campaignName}-${f.parsed.campaignManager}-${f.parsed.date}`));
  const newFolders = folders.filter(f => !existingKeys.has(`${f.parsed.campaignId}-${f.parsed.campaignName}-${f.parsed.campaignManager}-${f.parsed.date}`));
  
  const allFolders = [...existingFolders, ...newFolders];
  
  // Save and display
  saveFoldersToStorage(allFolders);
  displayFolders(allFolders);
  
  // Clear input and hide
  textarea.value = '';
  showFolderInput();
  
  alert(`Added ${newFolders.length} new folders (${folders.length - newFolders.length} were duplicates)`);
}

// Also initialize immediately in case DOMContentLoaded already fired
(function initFolderBrowser() {
  console.log('Initializing folder browser immediately'); // Debug log
  loadFoldersFromStorage();
  
  const folderInput = document.getElementById('folder-input');
  if (folderInput) {
    folderInput.addEventListener('change', handleFolderSelection);
    // Also add input event as fallback
    folderInput.addEventListener('input', handleFolderSelection);
    console.log('Folder input listener attached (immediate)'); // Debug log
    
    // Test if we can manually trigger it
    setTimeout(() => {
      console.log('Checking if folder input has files:', folderInput.files.length);
    }, 1000);
  }
  
  // Also setup file input for testing
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelection);
    console.log('File input listener attached'); // Debug log
  }
})();

// Handle folder selection
function handleFolderSelection(event) {
  console.log('Folder selection triggered!'); // Debug log
  console.log('Files selected:', event.target.files.length); // Debug log
  
  const files = event.target.files;
  if (!files || files.length === 0) {
    console.log('No files selected'); // Debug log
    return;
  }
  
  console.log('First file:', files[0]); // Debug log
  console.log('First file webkitRelativePath:', files[0].webkitRelativePath); // Debug log
  
  const folderSet = new Set();
  
  // Extract unique folder paths
  for (let file of files) {
    const path = file.webkitRelativePath;
    if (!path) continue;
    
    const folderName = path.split('/')[0];
    console.log('Found folder:', folderName); // Debug log
    
    // Parse folder name (format: CampaignID CampaignName CampaignManager MM-DD)
    const parsed = parseFolderName(folderName);
    if (parsed) {
      folderSet.add(JSON.stringify({
        original: folderName,
        parsed: parsed
      }));
    }
  }
  
  // Convert Set to Array and save
  const folders = Array.from(folderSet).map(item => JSON.parse(item));
  console.log('Parsed folders:', folders); // Debug log
  saveFoldersToStorage(folders);
  displayFolders(folders);
  
  // Clear input to allow re-selection of same folder
  event.target.value = '';
}

// Handle file selection (for testing)
function handleFileSelection(event) {
  console.log('File selection triggered!'); // Debug log
  console.log('Files selected:', event.target.files.length); // Debug log
  
  const files = event.target.files;
  if (!files || files.length === 0) {
    console.log('No files selected'); // Debug log
    return;
  }
  
  console.log('First file:', files[0]); // Debug log
  
  // Create test folders from file names
  const testFolders = [
    '0001 Ramadan Vivi 04-04',
    '0002 Eid Rattri 04-05',
    '0003 Special Bianca 04-06'
  ];
  
  const folders = testFolders.map(folderName => {
    const parsed = parseFolderName(folderName);
    return {
      original: folderName,
      parsed: parsed
    };
  });
  
  console.log('Test folders created:', folders); // Debug log
  saveFoldersToStorage(folders);
  displayFolders(folders);
  
  // Clear input
  event.target.value = '';
}

// Parse folder name to extract components
function parseFolderName(folderName) {
  console.log('Parsing folder:', folderName); // Debug log
  
  // Match pattern: CampaignID CampaignName CampaignManager MM-DD (and ignore anything after)
  // Example: "2901 Portfolio asset Bianca 03-21 |- Copy"
  // Strategy: Find the date first, then work backwards
  const dateRegex = /(\d{2}-\d{2})(?:\s+|$)/;
  const dateMatch = folderName.match(dateRegex);
  
  if (dateMatch) {
    const dateIndex = folderName.lastIndexOf(dateMatch[1]);
    const beforeDate = folderName.substring(0, dateIndex).trim();
    
    // Split the part before date
    const parts = beforeDate.split(' ');
    
    if (parts.length >= 3) {
      const campaignId = parts[0];
      const campaignManager = parts[parts.length - 1];
      const campaignName = parts.slice(1, -1).join(' ');
      
      return {
        campaignId: campaignId,
        campaignName: campaignName,
        campaignManager: campaignManager,
        date: dateMatch[1]
      };
    }
  }
  
  // Fallback: Try to extract at least campaign ID and name
  const fallbackRegex = /^(\d{4})\s+(.+?)\s+(.+?)(?:\s+|$)/;
  const fallbackMatch = folderName.match(fallbackRegex);
  
  if (fallbackMatch) {
    return {
      campaignId: fallbackMatch[1],
      campaignName: fallbackMatch[2],
      campaignManager: fallbackMatch[3],
      date: null
    };
  }
  
  // Last resort - just return the folder name as campaign name
  console.log('Using last resort parsing');
  return {
    campaignId: '',
    campaignName: folderName,
    campaignManager: '',
    date: '',
    fullMatch: folderName
  };
}

// Save folders to localStorage
function saveFoldersToStorage(folders) {
  try {
    localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
  } catch (error) {
    console.error('Error saving folders to localStorage:', error);
  }
}

// Load folders from localStorage
function loadFoldersFromStorage() {
  try {
    const stored = localStorage.getItem(FOLDER_STORAGE_KEY);
    const folders = stored ? JSON.parse(stored) : [];
    displayFolders(folders);
  } catch (error) {
    console.error('Error loading folders from localStorage:', error);
    displayFolders([]);
  }
}

// Display folders in the UI
function displayFolders(folders) {
  const folderItems = document.getElementById('folder-items');
  if (!folderItems) {
    console.log('folder-items element not found!'); // Debug log
    return;
  }
  
  if (folders.length === 0) {
    folderItems.innerHTML = '<p class="folder-empty">No folders selected</p>';
    return;
  }
  
  // Group folders by campaign (ID + Name + Manager)
  const groupedFolders = {};
  folders.forEach(folder => {
    const key = `${folder.parsed.campaignId}-${folder.parsed.campaignName}-${folder.parsed.campaignManager}`;
    if (!groupedFolders[key]) {
      groupedFolders[key] = {
        campaignId: folder.parsed.campaignId,
        campaignName: folder.parsed.campaignName,
        campaignManager: folder.parsed.campaignManager,
        dates: new Set() // Use Set to avoid duplicate dates
      };
    }
    if (folder.parsed.date) {
      groupedFolders[key].dates.add(folder.parsed.date);
    }
  });
  
  // Sort groups by campaign ID
  const sortedGroups = Object.values(groupedFolders).sort((a, b) => 
    a.campaignId.localeCompare(b.campaignId)
  );
  
  // Generate compact HTML
  const html = sortedGroups.map(group => {
    // Convert Set to array and sort dates
    const sortedDates = Array.from(group.dates).sort();
    const multipleDatesClass = sortedDates.length > 1 ? 'multiple-dates' : '';
    
    return `
      <div class="folder-item-compact ${multipleDatesClass}" 
           onclick="showFolderDetails(event, '${group.campaignId}', '${group.campaignName}', '${group.campaignManager}', [${sortedDates.map(d => `'${d}'`).join(',')}])">
        <span class="campaign-id">${group.campaignId}</span>
      </div>
    `;
  }).join('');
  
  folderItems.innerHTML = html;
}

// Show folder details tooltip
function showFolderDetails(event, campaignId, campaignName, campaignManager, dates) {
  const tooltip = document.getElementById('folder-tooltip');
  const folderItems = document.getElementById('folder-items');
  const rect = event.target.getBoundingClientRect();
  const folderItemsRect = folderItems.getBoundingClientRect();
  
  // Set content
  document.getElementById('tooltip-campaign-id').textContent = campaignId;
  document.getElementById('tooltip-campaign-name').textContent = campaignName;
  document.getElementById('tooltip-campaign-manager').textContent = campaignManager;
  
  const datesContainer = document.getElementById('tooltip-dates');
  if (dates && dates.length > 0) {
    datesContainer.innerHTML = dates.map(date => 
      `<span class="date-item" onclick="selectFolderWithDate('${campaignId}', '${campaignName}', '${campaignManager}', '${date}')">${date}</span>`
    ).join('');
  } else {
    datesContainer.innerHTML = '<span style="color: rgba(255,255,255,0.5); font-size: 11px;">No dates</span>';
  }
  
  // Append tooltip to folder-items container
  folderItems.style.position = 'relative';
  folderItems.appendChild(tooltip);
  
  // Show tooltip first to get its dimensions
  tooltip.style.display = 'block';
  const tooltipRect = tooltip.getBoundingClientRect();
  
  // Calculate position relative to folder-items container
  let left = rect.left - folderItemsRect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.top - folderItemsRect.top - tooltipRect.height - 10;
  
  // Adjust horizontal position if tooltip goes off container
  if (left < 10) left = 10;
  if (left + tooltipRect.width > folderItemsRect.width - 10) {
    left = folderItemsRect.width - tooltipRect.width - 10;
  }
  
  // Check if tooltip would go above container
  if (top < 10) {
    top = rect.bottom - folderItemsRect.top + 10;
    // Flip arrow to point down
    const arrow = tooltip.querySelector('.tooltip-arrow');
    arrow.style.top = 'auto';
    arrow.style.bottom = '-8px';
    arrow.style.borderBottom = 'none';
    arrow.style.borderTop = '8px solid var(--primary)';
  } else {
    // Arrow points up (default)
    const arrow = tooltip.querySelector('.tooltip-arrow');
    arrow.style.top = '-8px';
    arrow.style.bottom = 'auto';
    arrow.style.borderBottom = '8px solid var(--primary)';
    arrow.style.borderTop = 'none';
  }
  
  // Set final position
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  
  // Store reference
  window.currentTooltip = tooltip;
}

// Close folder tooltip
function closeFolderTooltip() {
  const tooltip = document.getElementById('folder-tooltip');
  tooltip.style.display = 'none';
}

// Close tooltip when clicking outside
document.addEventListener('click', function(event) {
  const tooltip = document.getElementById('folder-tooltip');
  if (!tooltip.contains(event.target) && !event.target.closest('.folder-item-compact')) {
    tooltip.style.display = 'none';
  }
});

// Handle folder click (legacy - kept for reference)
function selectFolder(folderName) {
  // You can add functionality here when a folder is clicked
  console.log('Selected folder:', folderName);
  
  // Example: Copy to clipboard
  const text = folderName;
  navigator.clipboard.writeText(text).then(() => {
    // You could show a toast notification here
    console.log('Copied to clipboard:', text);
  });
}

// Handle folder with date click
function selectFolderWithDate(campaignId, campaignName, campaignManager, date) {
  const text = `${campaignId} - ${campaignName} - ${campaignManager} (${date})`;
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard:', text);
  });
}

// Clear all folders
function clearFolders() {
  if (confirm('Are you sure you want to clear all folders?')) {
    localStorage.removeItem(FOLDER_STORAGE_KEY);
    displayFolders([]);
  }
}
